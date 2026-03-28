#!/usr/bin/env node
/**
 * Onboarding Rate-Limit Diagnostic Script
 *
 * Simulates the GitSyncMarks onboarding flow against a real (empty) GitHub repo
 * and measures how many API calls are made, how rate-limit headroom is consumed,
 * and whether the flow succeeds without hitting limits.
 *
 * This reproduces the scenario from GitHub Issue #51.
 *
 * USAGE:
 *   GITSYNCMARKS_TEST_PAT=ghp_xxx \
 *   GITSYNCMARKS_TEST_REPO_OWNER=your-username \
 *   GITSYNCMARKS_TEST_REPO=my-empty-repo \
 *   node scripts/test-onboarding-rate-limit.js [--bookmark-count 50] [--reset]
 *
 * OPTIONS:
 *   --ensure-repo        DELETE the repo if it exists, then CREATE it (npm run test:onboarding-scale passes this by default)
 *   --no-ensure-repo     Skip delete/create even when the npm script adds --ensure-repo
 *   --bookmark-count N   Number of synthetic bookmarks to simulate (default: 50)
 *   --reset              Delete all content from the repo before the test (fresh start)
 *   --parallel-only      Run only the extension-style path: layered POST /git/trees with inline file content (~few calls per 400 files)
 *   --sequential-only    Run only the sequential POST /git/blobs strategy (reproduces pre-#51 bottleneck)
 *   --no-color           Disable color output
 *
 * Large collections (e.g. 5000 bookmarks ≈ 5003 files → ~5006 API calls per pass):
 *   Use --parallel-only (or --sequential-only) so you do not run two full passes and burn ~10k calls
 *   against the hourly REST limit (5000 for standard PAT).
 *
 * WHAT IT DOES:
 *   0. With --ensure-repo: DELETE repo if it exists, then CREATE a fresh private repo (same name as GITSYNCMARKS_TEST_REPO)
 *   1. Checks current rate-limit headroom
 *   2. Optionally resets the repo to empty (--reset; one commit to Git’s canonical empty tree)
 *   3. Simulates generating N bookmark files (like the onboarding push would)
 *   4. Runs the atomic commit flow (sequential: createBlob × N; extension-style: layered createTree + content, commit, ref)
 *   5. Reports: calls made, rate-limit consumed, time taken, success/failure
 *
 * REQUIREMENTS:
 *   - Node.js 18+ (native fetch)
 *   - PAT with `repo` scope; `--ensure-repo` also needs **`delete_repo`** on classic PATs (or equivalent on fine-grained tokens)
 *   - Without `--ensure-repo`, the repo must already exist (see node scripts/create-test-repo.js)
 */

'use strict';

const path = require('path');
const { pathToFileURL } = require('url');

const API_BASE = 'https://api.github.com';

// ---- CLI Args ----
const args = process.argv.slice(2);
const bookmarkCount = (() => {
    const idx = args.indexOf('--bookmark-count');
    return idx !== -1 ? parseInt(args[idx + 1], 10) || 50 : 50;
})();
const doReset = args.includes('--reset');
const ensureRepo = args.includes('--ensure-repo') && !args.includes('--no-ensure-repo');
const noColor = args.includes('--no-color');
const parallelOnly = args.includes('--parallel-only');
const sequentialOnly = args.includes('--sequential-only');
if (parallelOnly && sequentialOnly) {
    console.error('Use only one of --parallel-only or --sequential-only.');
    process.exit(1);
}
const strategy = sequentialOnly ? 'sequential' : parallelOnly ? 'parallel' : 'both';

// ---- Color helpers ----
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

// ---- Stats tracking ----
let totalCalls = 0;
let rateLimitStart = null;
let rateLimitEnd = null;
const callLog = [];

// ---- GitHub API wrapper with call counting ----
function getEnv() {
    const token = process.env.GITSYNCMARKS_TEST_PAT;
    const owner = process.env.GITSYNCMARKS_TEST_REPO_OWNER;
    const repo = process.env.GITSYNCMARKS_TEST_REPO;
    if (!token || !owner || !repo) {
        console.error(
            `${c.red}Missing environment variables.${c.reset}\n` +
            'Required:\n' +
            '  GITSYNCMARKS_TEST_PAT=ghp_xxx\n' +
            '  GITSYNCMARKS_TEST_REPO_OWNER=your-username\n' +
            '  GITSYNCMARKS_TEST_REPO=empty-repo-name\n\n' +
            'Create the repo first:\n' +
            '  node scripts/create-test-repo.js\n' +
            'Or run with --ensure-repo (needs delete_repo on the PAT).\n'
        );
        process.exit(1);
    }
    return { token, owner, repo };
}

async function githubCountedFetch(url, options = {}) {
    const { token } = getEnv();
    const label = `${options.method || 'GET'} ${url.replace(API_BASE, '')}`;
    const t0 = Date.now();

    const headers = {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        ...options.headers,
    };
    if (options.body !== undefined) {
        headers['Content-Type'] = 'application/json';
    }

    const res = await fetch(url, {
        ...options,
        headers,
    });

    totalCalls++;
    const ms = Date.now() - t0;
    const remaining = parseInt(res.headers.get('x-ratelimit-remaining') || '9999', 10);
    const limit = parseInt(res.headers.get('x-ratelimit-limit') || '5000', 10);
    const reset = parseInt(res.headers.get('x-ratelimit-reset') || '0', 10);

    if (rateLimitStart === null) rateLimitStart = remaining;
    rateLimitEnd = remaining;

    callLog.push({ label, status: res.status, ms, remaining });
    console.log(
        `  ${c.gray}[${totalCalls.toString().padStart(3)}]${c.reset} ${label} → ${res.ok ? c.green : c.red
        }${res.status}${c.reset} (${ms}ms, remaining: ${remaining}/${limit})`
    );

    if (remaining <= 10) {
        const resetAt = new Date(reset * 1000).toLocaleTimeString();
        warn(`Rate limit critically low! Only ${remaining} requests left. Resets at ${resetAt}`);
    }

    if (res.status === 403) {
        const body = await res.json().catch(() => ({}));
        if (body.message?.includes('rate limit')) {
            throw new Error(`RATE LIMIT EXCEEDED: ${body.message}`);
        }
        throw new Error(`403 Forbidden: ${body.message || res.statusText}`);
    }
    if (res.status === 404) {
        return { _status: 404, _body: await res.json().catch(() => ({})) };
    }
    if (res.status === 409) {
        return { _status: 409, _body: await res.json().catch(() => ({})) };
    }
    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(`GitHub API ${res.status}: ${body.message || JSON.stringify(body)}`);
    }
    if (res.status === 204) return null;
    return res.json();
}

async function ghFetch(url, options = {}) {
    return githubCountedFetch(url, options);
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Delete GITSYNCMARKS_TEST_REPO if present, then create it (private, auto_init).
 * Requires PAT scope delete_repo for user-owned repos (classic PAT).
 */
async function ensureFreshTestRepository() {
    step('Provisioning repository (--ensure-repo): delete if exists, then create...');

    const meta = await githubCountedFetch(repoUrl(''));
    if (meta?._status === 404) {
        info('Repository does not exist yet.');
    } else {
        info(`Deleting existing ${getEnv().owner}/${getEnv().repo}...`);
        await githubCountedFetch(repoUrl(''), { method: 'DELETE' });
        ok('Repository deleted.');
        await sleep(2500);
    }

    const { owner, repo } = getEnv();
    const user = await githubCountedFetch(`${API_BASE}/user`);
    const createUrl =
        user.login.toLowerCase() === owner.toLowerCase()
            ? `${API_BASE}/user/repos`
            : `${API_BASE}/orgs/${encodeURIComponent(owner)}/repos`;

    const createBody = JSON.stringify({
        name: repo,
        private: true,
        description: 'Disposable test repo for GitSyncMarks onboarding-scale / E2E',
        auto_init: true,
    });

    let lastErr;
    for (let attempt = 0; attempt < 6; attempt++) {
        try {
            const created = await githubCountedFetch(createUrl, {
                method: 'POST',
                body: createBody,
            });
            ok(`Created repository: ${created.full_name || `${owner}/${repo}`}`);
            return;
        } catch (err) {
            lastErr = err;
            const msg = err.message || '';
            const nameStillInUse =
                msg.includes('422') &&
                (msg.includes('already exists') || msg.includes('name already'));
            if (nameStillInUse && attempt < 5) {
                warn(`Create failed (name may still be reserved); waiting ${2 * (attempt + 1)}s before retry...`);
                await sleep(2000 * (attempt + 1));
                continue;
            }
            throw err;
        }
    }
    throw lastErr;
}

// ---- Repo helpers ----
function repoUrl(path = '') {
    const { owner, repo } = getEnv();
    return `${API_BASE}/repos/${owner}/${repo}${path}`;
}

async function getRateLimit() {
    const res = await ghFetch(`${API_BASE}/rate_limit`);
    return res.resources.core;
}

async function getLatestCommitSha() {
    const data = await ghFetch(repoUrl(`/git/ref/heads/main`));
    if (data?._status === 404 || data?._status === 409) return null;
    return data.object.sha;
}

async function getCommit(sha) {
    const data = await ghFetch(repoUrl(`/git/commits/${sha}`));
    return { sha: data.sha, treeSha: data.tree.sha };
}

async function createBlob(content) {
    const data = await ghFetch(repoUrl('/git/blobs'), {
        method: 'POST',
        body: JSON.stringify({ content, encoding: 'utf-8' }),
    });
    return data.sha;
}

async function createTree(baseTreeSha, items) {
    const body = { tree: items };
    if (baseTreeSha) body.base_tree = baseTreeSha;
    const data = await ghFetch(repoUrl('/git/trees'), {
        method: 'POST',
        body: JSON.stringify(body),
    });
    return data.sha;
}

async function createCommit(message, treeSha, parentSha = null) {
    const data = await ghFetch(repoUrl('/git/commits'), {
        method: 'POST',
        body: JSON.stringify({
            message,
            tree: treeSha,
            parents: parentSha ? [parentSha] : [],
        }),
    });
    return data.sha;
}

async function updateRef(commitSha) {
    await ghFetch(repoUrl('/git/refs/heads/main'), {
        method: 'PATCH',
        body: JSON.stringify({ sha: commitSha }),
    });
}

async function createRef(commitSha) {
    await ghFetch(repoUrl('/git/refs'), {
        method: 'POST',
        body: JSON.stringify({ ref: 'refs/heads/main', sha: commitSha }),
    });
}

/** Canonical empty tree object in Git (no files). One commit wipes all paths; avoids huge POST /git/trees bodies (422 BadObjectState). */
const EMPTY_TREE_SHA = '4b825dc642cb6eb9a060e54bf8d69288fbee4904';

// ---- Reset repo to empty (single commit to empty tree) ----
async function resetRepoToEmpty() {
    step('Resetting repo to empty state...');

    const commitSha = await getLatestCommitSha();
    if (!commitSha) {
        info('Repo is already empty (no branch/commit).');
        return;
    }

    const commit = await getCommit(commitSha);
    if (commit.treeSha === EMPTY_TREE_SHA) {
        info('Repo tree is already empty.');
        return;
    }

    const newCommitSha = await createCommit(
        'Reset: empty repo for onboarding test',
        EMPTY_TREE_SHA,
        commitSha
    );
    await updateRef(newCommitSha);

    ok('Repo reset to empty (empty-tree commit).');
}

// ---- Generate synthetic bookmarks (simulating a user's bookmarks) ----
function generateSyntheticBookmarks(count, basePath = 'bookmarks') {
    const files = {};

    // Minimal structure files
    files[`${basePath}/_index.json`] = JSON.stringify({ version: 2 }, null, 2);
    files[`${basePath}/other/_order.json`] = JSON.stringify([], null, 2);

    // Toolbar bookmarks
    const order = [];
    for (let i = 1; i <= count; i++) {
        const slug = `bookmark-${i.toString().padStart(4, '0')}`;
        const hash = (i * 0x01000193).toString(36).substring(0, 4).padStart(4, '0');
        const filename = `${slug}_${hash}.json`;
        const path = `${basePath}/toolbar/${filename}`;
        files[path] = JSON.stringify(
            {
                title: `Test Bookmark ${i}`,
                url: `https://example.com/page/${i}`,
            },
            null,
            2
        );
        order.push(filename);
    }
    files[`${basePath}/toolbar/_order.json`] = JSON.stringify(order, null, 2);

    return files;
}

// ---- SEQUENTIAL blob creation (legacy — reproduces #51-style pressure) ----
async function atomicCommitSequential(fileChanges, commitSha, treeSha) {
    step('Strategy A: SEQUENTIAL blob creation (legacy)');
    info(`Creating ${Object.keys(fileChanges).length} blobs one by one...`);

    const t0 = Date.now();
    const treeItems = [];

    for (const [path, content] of Object.entries(fileChanges)) {
        const blobSha = await createBlob(content);
        treeItems.push({ path, mode: '100644', type: 'blob', sha: blobSha });
    }

    const newTreeSha = await createTree(treeSha, treeItems);
    const newCommitSha = await createCommit(
        `[TEST-SEQUENTIAL] Onboarding push (legacy) — ${new Date().toISOString()}`,
        newTreeSha,
        commitSha
    );

    if (commitSha) {
        await updateRef(newCommitSha);
    } else {
        await createRef(newCommitSha);
    }

    const elapsed = Date.now() - t0;
    return { elapsed, commitSha: newCommitSha };
}

// ---- Layered tree + inline content (matches lib/github-api.js atomicCommit) ----
async function atomicCommitLayeredTrees(fileChanges, commitSha, treeSha, chunkAtomicCommitTreeBatches) {
    const n = Object.keys(fileChanges).length;
    const uploads = [];
    for (const [p, content] of Object.entries(fileChanges)) {
        if (content !== null) uploads.push({ path: p, content });
    }
    const batches = chunkAtomicCommitTreeBatches([], uploads);
    step(
        `Strategy B: Layered trees (extension-style, ${batches.length}× POST /git/trees, inline content)`
    );
    info(`Uploading ${n} files via tree API (GitHub creates blobs server-side)...`);

    const t0 = Date.now();
    let nextTreeSha = treeSha;
    for (const batch of batches) {
        nextTreeSha = await createTree(nextTreeSha, batch);
    }
    const newCommitSha = await createCommit(
        `[TEST-LAYERED-TREE] Onboarding push — ${new Date().toISOString()}`,
        nextTreeSha,
        commitSha
    );

    if (commitSha) {
        await updateRef(newCommitSha);
    } else {
        await createRef(newCommitSha);
    }

    const elapsed = Date.now() - t0;
    return { elapsed, commitSha: newCommitSha };
}

// ---- Print summary ----
function printSummary(label, { callsBefore, callsAfter, rateBefore, rateAfter, elapsed, commitSha }) {
    const callsMade = callsAfter - callsBefore;
    const rateUsed = rateBefore - rateAfter;

    console.log(`\n${'─'.repeat(60)}`);
    console.log(`${c.bold}Summary: ${label}${c.reset}`);
    console.log(`${'─'.repeat(60)}`);
    console.log(`  API calls made:        ${c.bold}${callsMade}${c.reset}`);
    console.log(`  Rate limit consumed:   ${c.bold}${rateUsed}${c.reset}  (${rateBefore} → ${rateAfter})`);
    console.log(`  Time elapsed:          ${c.bold}${(elapsed / 1000).toFixed(2)}s${c.reset}`);
    console.log(`  Commit SHA:            ${c.gray}${commitSha?.substring(0, 12) ?? 'n/a'}${c.reset}`);
    if (rateAfter < 100) {
        warn(`Rate limit is LOW after this operation (${rateAfter} remaining)!`);
    } else {
        ok(`Rate limit is healthy (${rateAfter} remaining).`);
    }
}

// ---- Main ----
async function main() {
    const { chunkAtomicCommitTreeBatches } = await import(
        pathToFileURL(path.join(__dirname, '..', 'lib', 'github-tree-batch.js')).href
    );

    console.log(`\n${c.bold}GitSyncMarks Onboarding Rate-Limit Test${c.reset}`);
    console.log(`Simulating onboarding with ${c.bold}${bookmarkCount}${c.reset} bookmarks\n`);

    const { owner, repo } = getEnv();
    info(`Repo: ${owner}/${repo}`);

    if (ensureRepo) {
        await ensureFreshTestRepository();
    }

    // 1. Check initial rate limit
    step('Checking initial rate limit...');
    const initialRate = await getRateLimit();
    ok(
        `Rate limit: ${initialRate.remaining}/${initialRate.limit} remaining ` +
        `(resets at ${new Date(initialRate.reset * 1000).toLocaleTimeString()})`
    );

    if (initialRate.remaining < 200) {
        warn(
            `Rate limit is low (${initialRate.remaining} remaining). ` +
            `Results may be distorted or test may fail. Consider waiting until reset.`
        );
    }

    // 2. Optionally reset repo
    if (doReset) {
        await resetRepoToEmpty();
    }

    // 3. Generate synthetic bookmarks
    step('Generating synthetic bookmark files...');
    const basePath = 'bookmarks';
    const bookmarkFiles = generateSyntheticBookmarks(bookmarkCount, basePath);
    const fileCount = Object.keys(bookmarkFiles).length;
    ok(`Generated ${fileCount} files (${bookmarkCount} bookmarks + structure files)`);

    const treeLayers = Math.max(1, Math.ceil(fileCount / 400));
    const approxCallsLayered = treeLayers + 4; // tree POSTs + commit + ref + overhead
    const approxCallsSequential = fileCount + 3;
    if (strategy === 'both' && bookmarkCount > 1500) {
        warn(
            `Default mode runs sequential blobs then layered trees (~${approxCallsSequential + approxCallsLayered} API calls). ` +
                `For large repos use --parallel-only (extension behavior) or --sequential-only.`
        );
    }
    const needRemaining =
        strategy === 'sequential' || strategy === 'both'
            ? approxCallsSequential + (strategy === 'both' ? approxCallsLayered : 0)
            : approxCallsLayered;
    if (initialRate.remaining < needRemaining + 20) {
        warn(
            `Roughly ${needRemaining} calls may be needed; only ${initialRate.remaining} remaining. ` +
                `Test may fail with rate limit or 403.`
        );
    }

    // 4. Get current repo state
    step('Getting current repo state...');
    let currentCommitSha = null;
    let currentTreeSha = null;

    currentCommitSha = await getLatestCommitSha();
    if (!currentCommitSha) {
        info('Repo is empty (no commits yet) — will create initial commit.');
    } else {
        const commit = await getCommit(currentCommitSha);
        currentTreeSha = commit.treeSha;
        info(`Current commit: ${currentCommitSha.substring(0, 12)}`);
    }

    let seqResult;
    let parResult;
    let hadFailure = false;

    const runSequential = async () => {
        const callsBefore_seq = totalCalls;
        const rateBefore_seq = rateLimitEnd ?? initialRate.remaining;
        try {
            seqResult = await atomicCommitSequential(bookmarkFiles, currentCommitSha, currentTreeSha);
            printSummary('Sequential (legacy / pre-#51 style)', {
                callsBefore: callsBefore_seq,
                callsAfter: totalCalls,
                rateBefore: rateBefore_seq,
                rateAfter: rateLimitEnd,
                elapsed: seqResult.elapsed,
                commitSha: seqResult.commitSha,
            });
            currentCommitSha = seqResult.commitSha;
            const updatedCommit = await getCommit(currentCommitSha);
            currentTreeSha = updatedCommit.treeSha;
        } catch (err) {
            hadFailure = true;
            fail(`Sequential test FAILED: ${err.message}`);
        }
    };

    const runParallel = async (files, label) => {
        const callsBefore_par = totalCalls;
        const rateBefore_par = rateLimitEnd ?? initialRate.remaining;
        try {
            parResult = await atomicCommitLayeredTrees(
                files,
                currentCommitSha,
                currentTreeSha,
                chunkAtomicCommitTreeBatches
            );
            printSummary(label, {
                callsBefore: callsBefore_par,
                callsAfter: totalCalls,
                rateBefore: rateBefore_par,
                rateAfter: rateLimitEnd,
                elapsed: parResult.elapsed,
                commitSha: parResult.commitSha,
            });
            currentCommitSha = parResult.commitSha;
            const updatedCommit = await getCommit(currentCommitSha);
            currentTreeSha = updatedCommit.treeSha;
        } catch (err) {
            hadFailure = true;
            fail(`Parallel test FAILED: ${err.message}`);
        }
    };

    info(`Strategy: ${c.bold}${strategy}${c.reset}`);

    // 5–6. Run selected strategy(ies)
    if (strategy === 'sequential' || strategy === 'both') {
        await runSequential();
    }

    if (strategy === 'both' && hadFailure) {
        fail('Skipping parallel pass because sequential run failed.');
        process.exit(1);
    }

    if (strategy === 'parallel') {
        await runParallel(bookmarkFiles, 'Layered trees (extension-style)');
    } else if (strategy === 'both') {
        console.log(`\n${c.gray}(Generating modified bookmarks for second pass — parallel comparison...)${c.reset}`);
        const modifiedFiles = generateSyntheticBookmarks(bookmarkCount, basePath);
        for (const key of Object.keys(modifiedFiles)) {
            if (key.endsWith('.json') && !key.endsWith('_index.json') && !key.endsWith('_order.json')) {
                const obj = JSON.parse(modifiedFiles[key]);
                obj.title = `${obj.title} (v2)`;
                modifiedFiles[key] = JSON.stringify(obj, null, 2);
            }
        }
        await runParallel(modifiedFiles, 'Layered trees (extension-style)');
    }

    // 7. Final summary
    console.log(`\n${'═'.repeat(60)}`);
    console.log(`${c.bold}TOTAL API CALLS: ${totalCalls}${c.reset}`);
    console.log(`${c.bold}TOTAL RATE LIMIT CONSUMED: ${initialRate.remaining - rateLimitEnd}${c.reset}`);

    if (seqResult && parResult && strategy === 'both') {
        const speedup = (seqResult.elapsed / parResult.elapsed).toFixed(2);
        console.log(`\n${c.bold}Comparison:${c.reset}`);
        console.log(`  Sequential time: ${(seqResult.elapsed / 1000).toFixed(2)}s`);
        console.log(`  Layered-tree time: ${(parResult.elapsed / 1000).toFixed(2)}s`);
        console.log(`  Speedup:           ${c.green}${speedup}×${c.reset} faster`);
    }
    console.log(`${'═'.repeat(60)}\n`);

    if (hadFailure) process.exit(1);
}

main().catch((err) => {
    console.error(`\n${c.red}Fatal error: ${err.message}${c.reset}`);
    process.exit(1);
});
