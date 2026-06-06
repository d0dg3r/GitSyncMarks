#!/usr/bin/env node
/**
 * Gitea-family sync performance benchmark.
 *
 * Compares Contents API vs Git Data API (tree/blob) for reads and writes.
 * Used to decide whether try-first + fallback is viable (see docs/GITEA-PERFORMANCE.md).
 *
 * USAGE:
 *   GITSYNCMARKS_GITEA_TOKEN=... \
 *   GITSYNCMARKS_GITEA_OWNER=d0dg3r \
 *   GITSYNCMARKS_GITEA_REPO=my-bookmarks \
 *   node scripts/benchmark-gitea-sync.js
 *
 * Optional env:
 *   GITSYNCMARKS_GITEA_SERVER_URL=https://codeberg.org
 *   GITSYNCMARKS_GITEA_PROVIDER=codeberg
 *   GITSYNCMARKS_GITEA_BRANCH=main
 *   GITSYNCMARKS_GITEA_BASE_PATH=bookmarks
 *
 * OPTIONS:
 *   --read-only          Skip write benchmarks (default when --write-count 0)
 *   --write-only         Skip read benchmarks
 *   --write-count N      Synthetic files for write test (default: 10; 0 = skip writes)
 *   --base-path PATH     Bookmark root (default: bookmarks or env)
 *   --delta-ratio R      Fraction of files treated as changed for delta read sim (default: 0.05)
 *   --estimate-only      Print analytical request estimates; no network
 *   --output FILE        Write JSON report to FILE
 *   --no-color           Plain text output
 */

'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const fs = require('fs');
const path = require('path');
const os = require('os');
const { pathToFileURL } = require('url');

/**
 * Load GITSYNCMARKS_GITEA_* from a shell file (e.g. ~/.secrets.sh).
 * Only sets keys not already in process.env. Handles `export KEY=value` and bare assignments.
 * @param {string} filePath
 */
function loadGiteaSecretsFromShellFile(filePath) {
  if (!filePath || !fs.existsSync(filePath)) return false;
  const content = fs.readFileSync(filePath, 'utf8');
  let loaded = 0;
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const match = trimmed.match(/^(?:export\s+)?(GITSYNCMARKS_GITEA_[A-Z0-9_]+)=(.*)$/);
    if (!match) continue;
    const [, key, rawVal] = match;
    if (process.env[key]) continue;
    let val = rawVal.trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    process.env[key] = val;
    loaded += 1;
  }
  return loaded > 0;
}

const secretsFile =
  process.env.GITSYNCMARKS_SECRETS_FILE ||
  path.join(os.homedir(), '.secrets.sh');
loadGiteaSecretsFromShellFile(secretsFile);

const BLOB_FETCH_CONCURRENCY = 5;

const args = process.argv.slice(2);
const readOnly = args.includes('--read-only');
const writeOnly = args.includes('--write-only');
const estimateOnly = args.includes('--estimate-only');
const noColor = args.includes('--no-color');
const outputIdx = args.indexOf('--output');
const outputFile = outputIdx !== -1 ? args[outputIdx + 1] : null;
const writeCountIdx = args.indexOf('--write-count');
const writeCount =
  writeCountIdx !== -1 ? parseInt(args[writeCountIdx + 1], 10) : readOnly ? 0 : 10;
const basePathIdx = args.indexOf('--base-path');
const deltaRatioIdx = args.indexOf('--delta-ratio');
const deltaRatio =
  deltaRatioIdx !== -1 ? parseFloat(args[deltaRatioIdx + 1]) : 0.05;

const c = {
  reset: noColor ? '' : '\x1b[0m',
  bold: noColor ? '' : '\x1b[1m',
  green: noColor ? '' : '\x1b[32m',
  yellow: noColor ? '' : '\x1b[33m',
  red: noColor ? '' : '\x1b[31m',
  cyan: noColor ? '' : '\x1b[36m',
  gray: noColor ? '' : '\x1b[90m',
};

const ok = (msg) => console.log(`${c.green}✓${c.reset} ${msg}`);
const warn = (msg) => console.log(`${c.yellow}⚠${c.reset} ${msg}`);
const fail = (msg) => console.log(`${c.red}✗${c.reset} ${msg}`);
const info = (msg) => console.log(`${c.cyan}ℹ${c.reset} ${msg}`);
const step = (msg) => console.log(`\n${c.bold}${msg}${c.reset}`);

/** @type {{ count: number, byMethod: Record<string, number> }} */
let fetchStats = { count: 0, byMethod: {} };

function resetFetchStats() {
  fetchStats = { count: 0, byMethod: {} };
}

function installFetchCounter() {
  const original = globalThis.fetch;
  globalThis.fetch = async (url, options = {}) => {
    const method = options.method || 'GET';
    fetchStats.count += 1;
    fetchStats.byMethod[method] = (fetchStats.byMethod[method] || 0) + 1;
    return original(url, options);
  };
  return () => {
    globalThis.fetch = original;
  };
}

/**
 * Verify token, repo, and branch before benchmarking; surface real API errors (401 vs 404).
 * @param {{ token: string, owner: string, repo: string, branch: string, serverUrl: string }} env
 */
async function preflightGiteaConnection(env) {
  const apiBase = `${env.serverUrl.replace(/\/+$/, '')}/api/v1`;
  const headers = {
    Authorization: `token ${env.token}`,
    Accept: 'application/json',
  };

  const repoUrl = `${apiBase}/repos/${env.owner}/${env.repo}`;
  const repoRes = await fetch(repoUrl, { headers });
  const repoBody = await repoRes.json().catch(() => ({}));
  const repoMsg = typeof repoBody.message === 'string' ? repoBody.message : '';

  if (repoRes.status === 401) {
    fail('Codeberg/Gitea rejected the token (HTTP 401).');
    if (repoMsg) info(`API: ${repoMsg}`);
    info('Create a new token: Codeberg → User Settings → Applications (repository read/write).');
    info('Update GITSYNCMARKS_GITEA_TOKEN in ~/.secrets.sh (with export) or .env.');
    process.exit(1);
  }
  if (repoRes.status === 404) {
    fail(`Repository not found: ${env.owner}/${env.repo} (HTTP 404).`);
    process.exit(1);
  }
  if (!repoRes.ok) {
    fail(`Cannot access repository (HTTP ${repoRes.status})${repoMsg ? `: ${repoMsg}` : ''}.`);
    process.exit(1);
  }

  const branchUrl = `${apiBase}/repos/${env.owner}/${env.repo}/branches/${encodeURIComponent(env.branch)}`;
  const branchRes = await fetch(branchUrl, { headers });
  if (branchRes.ok) {
    ok(`Token and branch "${env.branch}" OK`);
    return;
  }

  const branchBody = await branchRes.json().catch(() => ({}));
  const branchMsg = typeof branchBody.message === 'string' ? branchBody.message : '';

  if (branchRes.status === 401) {
    fail('Token invalid when reading branch (HTTP 401).');
    if (branchMsg) info(`API: ${branchMsg}`);
    process.exit(1);
  }

  fail(`Branch "${env.branch}" not found (HTTP ${branchRes.status})${branchMsg ? `: ${branchMsg}` : ''}.`);

  const listRes = await fetch(
    `${apiBase}/repos/${env.owner}/${env.repo}/branches?limit=20`,
    { headers }
  );
  if (listRes.ok) {
    const list = await listRes.json();
    const names = Array.isArray(list) ? list.map((b) => b.name).filter(Boolean) : [];
    if (names.length) {
      info(`Available branches: ${names.join(', ')}`);
      info(`Set GITSYNCMARKS_GITEA_BRANCH=<name> in ~/.secrets.sh or .env.`);
    }
  }
  process.exit(1);
}

function getEnv() {
  const token = process.env.GITSYNCMARKS_GITEA_TOKEN;
  const owner = process.env.GITSYNCMARKS_GITEA_OWNER;
  const repo = process.env.GITSYNCMARKS_GITEA_REPO;
  if (!token || !owner || !repo) {
    console.error(
      `${c.red}Missing Gitea benchmark environment.${c.reset}\n\n` +
        'Required:\n' +
        '  GITSYNCMARKS_GITEA_TOKEN=...\n' +
        '  GITSYNCMARKS_GITEA_OWNER=...\n' +
        '  GITSYNCMARKS_GITEA_REPO=...\n\n' +
        'Optional:\n' +
        '  GITSYNCMARKS_GITEA_SERVER_URL=https://codeberg.org\n' +
        '  GITSYNCMARKS_GITEA_PROVIDER=codeberg\n' +
        '  GITSYNCMARKS_GITEA_BRANCH=main\n' +
        '  GITSYNCMARKS_GITEA_BASE_PATH=bookmarks\n\n' +
        'Or run with --estimate-only (no credentials).\n\n' +
        'Tip: set GITSYNCMARKS_GITEA_* in `.env`, or in `~/.secrets.sh` with `export` ' +
        '(npm only inherits exported vars). This script also reads ~/.secrets.sh directly.\n'
    );
    process.exit(1);
  }
  return {
    token,
    owner,
    repo,
    serverUrl: process.env.GITSYNCMARKS_GITEA_SERVER_URL || 'https://codeberg.org',
    provider: process.env.GITSYNCMARKS_GITEA_PROVIDER || 'codeberg',
    branch: process.env.GITSYNCMARKS_GITEA_BRANCH || 'main',
    basePath:
      basePathIdx !== -1 && args[basePathIdx + 1]
        ? args[basePathIdx + 1].replace(/\/+$/, '')
        : (process.env.GITSYNCMARKS_GITEA_BASE_PATH || 'bookmarks').replace(/\/+$/, ''),
  };
}

/**
 * @param {number} fileCount
 * @param {number} dirDepth approx directory listings for contents walk
 */
function estimateReadRequests(fileCount, dirDepth = Math.max(1, Math.ceil(fileCount / 20))) {
  const contentsSequential = dirDepth + fileCount;
  const treeRecursive = 1;
  const blobBatches = Math.ceil(fileCount / BLOB_FETCH_CONCURRENCY);
  const treeBlobTotal = treeRecursive + blobBatches * BLOB_FETCH_CONCURRENCY;
  const deltaChanged = Math.max(1, Math.ceil(fileCount * deltaRatio));
  const treeDelta = 1 + Math.ceil(deltaChanged / BLOB_FETCH_CONCURRENCY) * BLOB_FETCH_CONCURRENCY;
  return {
    contentsFull: contentsSequential,
    treeBlobFull: Math.min(treeBlobTotal, 1 + fileCount),
    treeBlobDeltaWarmCache: treeDelta,
    blobConcurrency: BLOB_FETCH_CONCURRENCY,
    assumedDirListings: dirDepth,
  };
}

/**
 * @param {number} n
 * @param {number} [treeBatchCount]
 */
function estimateWriteRequests(n, treeBatchCount = Math.ceil(n / 400) || 1) {
  return {
    contentsSequential: n,
    contentsCommits: n,
    /** Gitea blob+tree: N POST /git/blobs + layered trees + commit + ref + ~2 reads */
    giteaBlobTree: n + treeBatchCount + 4,
    giteaBlobTreeCommits: 1,
    /** GitHub inline-content trees (404 on Codeberg) */
    githubInlineTree: treeBatchCount + 2,
    treeBatchCount,
  };
}

async function estimateWriteRequestsExact(n) {
  const { chunkAtomicCommitShaTreeBatches } = await import(
    pathToFileURL(path.join(__dirname, '..', 'lib', 'github-tree-batch.js')).href
  );
  const uploads = Array.from({ length: n }, (_, i) => ({
    path: `bookmarks/_bench/file_${i}.json`,
    sha: `sha${i}`,
  }));
  const batches = chunkAtomicCommitShaTreeBatches([], uploads);
  return estimateWriteRequests(n, batches.length);
}

/**
 * @param {import('../lib/providers/gitea-api.js').GiteaAPI} api
 * @param {Array<[string, string]>} pathBlobPairs
 * @param {Record<string, { sha: string, content: string }>|null} baseFiles
 */
/**
 * @param {import('../lib/providers/gitea-api.js').GiteaAPI} api
 * @param {Array<[string, string]>} pathBlobPairs
 * @param {Record<string, { sha: string, content: string }>|null} baseFiles
 * @returns {Promise<{ fileMap: Record<string, string>, blobErrors: Array<{ path: string, sha: string, statusCode?: number, message: string }> }>}
 */
async function fetchBlobsBatched(api, pathBlobPairs, baseFiles) {
  const fileMap = {};
  const blobErrors = [];
  const toFetch = [];
  for (const [p, blobSha] of pathBlobPairs) {
    if (baseFiles?.[p]?.sha === blobSha) {
      fileMap[p] = baseFiles[p].content;
    } else {
      toFetch.push([p, blobSha]);
    }
  }
  for (let i = 0; i < toFetch.length; i += BLOB_FETCH_CONCURRENCY) {
    const batch = toFetch.slice(i, i + BLOB_FETCH_CONCURRENCY);
    await Promise.all(
      batch.map(async ([p, blobSha]) => {
        try {
          fileMap[p] = await api.getBlob(blobSha);
        } catch (err) {
          blobErrors.push({
            path: p,
            sha: blobSha,
            statusCode: err?.statusCode,
            message: err?.message || String(err),
          });
        }
      })
    );
  }
  return { fileMap, blobErrors };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * @param {import('../lib/providers/gitea-api.js').GiteaAPI} api
 * @param {string} basePath
 * @param {string} commitSha
 */
async function benchmarkRead(api, basePath, commitSha) {
  step('Read benchmark: Contents API');
  resetFetchStats();
  const contentsStart = Date.now();
  let contentsOk = true;
  let contentsError = null;
  /** @type {{ shaMap: object, fileMap: object }} */
  let contentsResult = { shaMap: {}, fileMap: {} };
  try {
    contentsResult = await api.fetchFileMapViaContents(basePath, commitSha);
  } catch (err) {
    contentsOk = false;
    contentsError = err?.message || String(err);
  }
  const contentsStats = {
    strategy: 'contents',
    ok: contentsOk,
    error: contentsError,
    requests: fetchStats.count,
    ms: Date.now() - contentsStart,
    fileCount: Object.keys(contentsResult.fileMap).length,
  };
  info(
    `Contents: ${contentsStats.requests} requests, ${(contentsStats.ms / 1000).toFixed(2)}s, ` +
      `${contentsStats.fileCount} files`
  );

  step('Read benchmark: Tree + batched blobs');
  resetFetchStats();
  const treeStart = Date.now();
  let treeOk = true;
  let treeError = null;
  let treeFileCount = 0;
  let truncated = false;
  /** @type {Record<string, string>} */
  let treeFileMap = {};
  try {
    const recursive = await api.getRecursiveTreeForCommit(commitSha);
    if (!recursive?.tree?.length) {
      throw new Error('getRecursiveTreeForCommit returned no tree');
    }
    truncated = recursive.truncated === true;
    const { gitTreeToShaMap } = await import(
      pathToFileURL(path.join(__dirname, '..', 'lib', 'bookmark-serializer.js')).href
    );
    const shaMap = gitTreeToShaMap(recursive.tree, basePath);
    const blobResult = await fetchBlobsBatched(api, Object.entries(shaMap), null);
    treeFileMap = blobResult.fileMap;
    treeFileCount = Object.keys(treeFileMap).length;
    if (blobResult.blobErrors.length > 0) {
      treeOk = treeFileCount > 0;
      treeError = `${blobResult.blobErrors.length} blob GET(s) failed; first: ${blobResult.blobErrors[0].message}`;
      warn(
        `Tree+blob: ${blobResult.blobErrors.length} blob error(s) — e.g. ${blobResult.blobErrors[0].path}`
      );
    }
  } catch (err) {
    treeOk = false;
    treeError = err?.message || String(err);
  }
  const treeStats = {
    strategy: 'tree_blob',
    ok: treeOk,
    error: treeError,
    truncated,
    requests: fetchStats.count,
    ms: Date.now() - treeStart,
    fileCount: treeFileCount,
    shaMapSize: treeFileCount,
  };
  info(
    `Tree+blob: ${treeStats.requests} requests, ${(treeStats.ms / 1000).toFixed(2)}s, ` +
      `${treeStats.fileCount} files${truncated ? ' (TRUNCATED)' : ''}`
  );

  step('Read benchmark: Tree + delta (warm cache simulation)');
  resetFetchStats();
  const deltaStart = Date.now();
  let deltaOk = true;
  let deltaError = null;
  let deltaBlobFetches = 0;
  try {
    const recursive = await api.getRecursiveTreeForCommit(commitSha);
    if (!recursive?.tree?.length) {
      throw new Error('getRecursiveTreeForCommit returned no tree');
    }
    const { gitTreeToShaMap } = await import(
      pathToFileURL(path.join(__dirname, '..', 'lib', 'bookmark-serializer.js')).href
    );
    const shaMap = gitTreeToShaMap(recursive.tree, basePath);
    const paths = Object.keys(shaMap);
    const changeCount = Math.max(1, Math.ceil(paths.length * deltaRatio));
    const baseFiles = {};
    for (let i = 0; i < paths.length; i++) {
      const p = paths[i];
      const sha = shaMap[p];
      if (i < paths.length - changeCount) {
        baseFiles[p] = { sha, content: treeFileMap[p] || '{}' };
      } else {
        baseFiles[p] = { sha: 'stale_' + sha, content: '{}' };
      }
    }
    const beforeCount = fetchStats.count;
    const deltaResult = await fetchBlobsBatched(api, Object.entries(shaMap), baseFiles);
    deltaBlobFetches = fetchStats.count - beforeCount;
    deltaOk = deltaResult.blobErrors.length === 0;
    if (deltaResult.blobErrors.length) {
      deltaError = `${deltaResult.blobErrors.length} blob GET(s) failed`;
    }
  } catch (err) {
    deltaOk = false;
    deltaError = err?.message || String(err);
  }
  const deltaStats = {
    strategy: 'tree_blob_delta',
    ok: deltaOk,
    error: deltaError,
    deltaRatio,
    requests: fetchStats.count,
    blobFetchRequests: deltaBlobFetches,
    ms: Date.now() - deltaStart,
    simulatedChangedFiles: treeFileCount > 0 ? Math.max(1, Math.ceil(treeFileCount * deltaRatio)) : 0,
  };
  info(
    `Tree+delta (${(deltaRatio * 100).toFixed(0)}% changed): ${deltaStats.requests} requests ` +
      `(${deltaBlobFetches} blob GETs), ${(deltaStats.ms / 1000).toFixed(2)}s`
  );

  if (contentsStats.ok && treeStats.ok && treeStats.fileCount > 0) {
    const speedup = contentsStats.ms / Math.max(treeStats.ms, 1);
    ok(`Read wall-clock ratio (contents/tree): ${speedup.toFixed(1)}×`);
    ok(
      `Request ratio (contents/tree): ${(contentsStats.requests / Math.max(treeStats.requests, 1)).toFixed(1)}×`
    );
  }

  return { contents: contentsStats, treeBlob: treeStats, treeDelta: deltaStats };
}

/**
 * @param {import('../lib/providers/gitea-api.js').GiteaAPI} api
 * @param {import('../lib/providers/github-api.js').GitHubAPI} GitHubAPI
 * @param {number} count
 */
async function benchmarkWrite(api, GitHubAPI, count) {
  const runId = Date.now();
  const treePrefix = `bookmarks/_gitsyncmarks_bench_tree_${runId}`;
  const contentsPrefix = `bookmarks/_gitsyncmarks_bench_contents_${runId}`;

  const makeChanges = (prefix) => {
    /** @type {Record<string, string>} */
    const changes = {};
    for (let i = 0; i < count; i++) {
      changes[`${prefix}/file_${String(i).padStart(4, '0')}.json`] = JSON.stringify({
        title: `benchmark ${i}`,
        url: `https://example.com/bench/${i}`,
      });
    }
    return changes;
  };

  step(`Write benchmark: Gitea blob+tree (production atomicCommit), ${count} files`);
  resetFetchStats();
  const blobTreeStart = Date.now();
  let blobTreeOk = false;
  let blobTreeError = null;
  let blobTreeCommitSha = null;
  try {
    blobTreeCommitSha = await api.atomicCommit(
      `[gitsyncmarks-benchmark] blob+tree write ${count} files`,
      makeChanges(treePrefix)
    );
    blobTreeOk = !!blobTreeCommitSha;
  } catch (err) {
    blobTreeError = err?.message || String(err);
  }
  const blobTreeWrite = {
    strategy: 'gitea_blob_tree',
    ok: blobTreeOk,
    error: blobTreeError,
    requests: fetchStats.count,
    ms: Date.now() - blobTreeStart,
    fileCount: count,
    commits: blobTreeOk ? 1 : 0,
    commitSha: blobTreeCommitSha,
  };
  if (blobTreeOk) {
    ok(
      `Blob+tree write: ${blobTreeWrite.requests} requests, ${(blobTreeWrite.ms / 1000).toFixed(2)}s, 1 commit`
    );
  } else {
    fail(`Blob+tree write failed: ${blobTreeError}`);
  }

  step(`Write benchmark: GitHub inline tree (expected 404 on Gitea), ${count} files`);
  resetFetchStats();
  const inlineTreeStart = Date.now();
  let inlineTreeOk = false;
  let inlineTreeError = null;
  try {
    await GitHubAPI.prototype.atomicCommit.call(
      api,
      `[gitsyncmarks-benchmark] inline-tree write ${count} files`,
      makeChanges(`bookmarks/_gitsyncmarks_bench_inline_${Date.now()}`)
    );
    inlineTreeOk = true;
  } catch (err) {
    inlineTreeError = err?.message || String(err);
  }
  const inlineTreeWrite = {
    strategy: 'github_inline_tree',
    ok: inlineTreeOk,
    error: inlineTreeError,
    requests: fetchStats.count,
    ms: Date.now() - inlineTreeStart,
    fileCount: count,
    commits: inlineTreeOk ? 1 : 0,
  };
  if (inlineTreeOk) {
    ok(`Inline tree write unexpectedly succeeded (${inlineTreeWrite.requests} requests)`);
  } else {
    info(`Inline tree write failed as expected: ${inlineTreeError}`);
  }

  step(`Write benchmark: Contents API sequential fallback (_atomicCommitSequential), ${count} files`);
  resetFetchStats();
  const contentsStart = Date.now();
  let contentsOk = false;
  let contentsError = null;
  let contentsCommitSha = null;
  try {
    contentsCommitSha = await api._atomicCommitSequential(
      `[gitsyncmarks-benchmark] contents write ${count} files`,
      makeChanges(contentsPrefix),
      {},
      null
    );
    contentsOk = !!contentsCommitSha;
  } catch (err) {
    contentsError = err?.message || String(err);
  }
  const contentsWrite = {
    strategy: 'contents_sequential',
    ok: contentsOk,
    error: contentsError,
    requests: fetchStats.count,
    ms: Date.now() - contentsStart,
    fileCount: count,
    commits: contentsOk ? count : 0,
    commitSha: contentsCommitSha,
  };
  if (contentsOk) {
    ok(
      `Contents write: ${contentsWrite.requests} requests, ${(contentsWrite.ms / 1000).toFixed(2)}s, ` +
        `~${count} commits`
    );
  } else {
    fail(`Contents write failed: ${contentsError}`);
  }

  if (blobTreeOk && contentsOk) {
    ok(
      `Write wall-clock ratio (contents/blob+tree): ${(contentsWrite.ms / Math.max(blobTreeWrite.ms, 1)).toFixed(1)}×`
    );
    ok(
      `Write request ratio (contents/blob+tree): ${(contentsWrite.requests / Math.max(blobTreeWrite.requests, 1)).toFixed(1)}×`
    );
  }

  step('Cleanup benchmark files');
  const cleanup = {};
  for (const p of Object.keys(makeChanges(treePrefix))) cleanup[p] = null;
  for (const p of Object.keys(makeChanges(contentsPrefix))) cleanup[p] = null;
  try {
    await api.atomicCommit('[gitsyncmarks-benchmark] cleanup', cleanup);
    ok('Cleanup commit succeeded');
  } catch (err) {
    warn(`Cleanup failed (remove bookmarks/_gitsyncmarks_bench_* manually): ${err?.message || err}`);
  }

  return { blobTree: blobTreeWrite, inlineTree: inlineTreeWrite, contents: contentsWrite };
}

async function printEstimateTable(fileCounts) {
  step('Analytical request estimates (no network)');
  console.log('');
  console.log(
    'fileCount | contentsRead | treeBlobRead | treeDelta(5%) | contentsWrite | blob+treeWrite | treeBatches'
  );
  console.log('-'.repeat(95));
  for (const n of fileCounts) {
    const r = estimateReadRequests(n);
    const w = await estimateWriteRequestsExact(n);
    console.log(
      `${String(n).padStart(9)} | ${String(r.contentsFull).padStart(12)} | ${String(r.treeBlobFull).padStart(12)} | ` +
        `${String(r.treeBlobDeltaWarmCache).padStart(13)} | ${String(w.contentsSequential).padStart(18)} | ` +
        `${String(w.giteaBlobTree).padStart(14)} | ${String(w.treeBatchCount).padStart(11)}`
    );
  }
  console.log('');
  info('Contents write also creates ~1 git commit per file (tree write: 1 commit total).');
}

async function main() {
  console.log(`\n${c.bold}GitSyncMarks — Gitea-family sync performance benchmark${c.reset}\n`);

  if (estimateOnly) {
    const counts = [10, 100, 500, 1000, 5000];
    await printEstimateTable(counts);
    const estimates = [];
    for (const n of counts) {
      estimates.push({
        fileCount: n,
        read: estimateReadRequests(n),
        write: await estimateWriteRequestsExact(n),
      });
    }
    const report = {
      mode: 'estimate_only',
      generatedAt: new Date().toISOString(),
      estimates,
    };
    if (outputFile) {
      fs.writeFileSync(outputFile, JSON.stringify(report, null, 2));
      ok(`Wrote ${outputFile}`);
    }
    return;
  }

  const env = getEnv();
  installFetchCounter();

  const { GiteaAPI } = await import(
    pathToFileURL(path.join(__dirname, '..', 'lib', 'providers', 'gitea-api.js')).href
  );
  const { GitHubAPI } = await import(
    pathToFileURL(path.join(__dirname, '..', 'lib', 'providers', 'github-api.js')).href
  );

  const api = new GiteaAPI({
    provider: env.provider,
    token: env.token,
    owner: env.owner,
    repo: env.repo,
    branch: env.branch,
    serverUrl: env.serverUrl,
  });

  info(`Host: ${env.serverUrl} (${env.provider})`);
  info(`Repo: ${env.owner}/${env.repo} @ ${env.branch}`);
  info(`Base path: ${env.basePath}`);

  await preflightGiteaConnection(env);

  /** @type {object} */
  const report = {
    mode: 'live',
    generatedAt: new Date().toISOString(),
    host: env.serverUrl,
    provider: env.provider,
    owner: env.owner,
    repo: env.repo,
    branch: env.branch,
    basePath: env.basePath,
    writeCount,
    deltaRatio,
  };

  if (!writeOnly) {
    let commitSha;
    try {
      commitSha = await api.getLatestCommitSha();
    } catch (err) {
      const code = err?.statusCode ? ` (HTTP ${err.statusCode})` : '';
      fail(`Cannot read HEAD${code}: ${err?.message || err}`);
      if (err?.statusCode === 401) {
        info('Token invalid or revoked — update GITSYNCMARKS_GITEA_TOKEN.');
      }
      process.exit(1);
    }
    report.commitSha = commitSha;
    report.read = await benchmarkRead(api, env.basePath, commitSha);

    const fc = report.read.treeBlob?.fileCount || report.read.contents?.fileCount || 0;
    if (fc > 0) {
      report.estimatesFromMeasuredFileCount = {
        fileCount: fc,
        read: estimateReadRequests(fc),
        write: await estimateWriteRequestsExact(writeCount || 10),
      };
    }
  }

  if (!readOnly && writeCount > 0) {
    warn(`Write benchmark creates ${writeCount * 2} temporary files (cleaned up when possible).`);
    if (!writeOnly) {
      info('Pausing 5s before write tests (avoids rate limits after read burst)…');
      await sleep(5000);
      await preflightGiteaConnection(env);
    }
    report.write = await benchmarkWrite(api, GitHubAPI, writeCount);
  }

  await printEstimateTable(
    [report.read?.treeBlob?.fileCount || 100, 500, 1000, 5000].filter(
      (n, i, a) => n > 0 && a.indexOf(n) === i
    )
  );

  console.log(`\n${c.bold}JSON report${c.reset}`);
  console.log(JSON.stringify(report, null, 2));

  if (outputFile) {
    fs.writeFileSync(outputFile, JSON.stringify(report, null, 2));
    ok(`Wrote ${outputFile}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
