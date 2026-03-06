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
 *   --bookmark-count N   Number of synthetic bookmarks to simulate (default: 50)
 *   --reset              Delete all content from the repo before the test (fresh start)
 *   --no-color           Disable color output
 *
 * WHAT IT DOES:
 *   1. Checks current rate-limit headroom
 *   2. Optionally resets the repo to empty (--reset)
 *   3. Simulates generating N bookmark files (like the onboarding push would)
 *   4. Runs the atomic commit flow (createBlob × N, createTree, createCommit, updateRef/createRef)
 *   5. Reports: calls made, rate-limit consumed, time taken, success/failure
 *
 * REQUIREMENTS:
 *   - Node.js 18+ (native fetch)
 *   - PAT with `repo` scope
 *   - The repo must already exist (create with: node scripts/create-test-repo.js)
 */

'use strict';

const API_BASE = 'https://api.github.com';

// ---- CLI Args ----
const args = process.argv.slice(2);
const bookmarkCount = (() => {
    const idx = args.indexOf('--bookmark-count');
    return idx !== -1 ? parseInt(args[idx + 1], 10) || 50 : 50;
})();
const doReset = args.includes('--reset');
const noColor = args.includes('--no-color');

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
            '  node scripts/create-test-repo.js\n'
        );
        process.exit(1);
    }
    return { token, owner, repo };
}

async function ghFetch(url, options = {}) {
    const { token } = getEnv();
    const label = `${options.method || 'GET'} ${url.replace(API_BASE, '')}`;
    const t0 = Date.now();

    const res = await fetch(url, {
        ...options,
        headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/vnd.github+json',
            'Content-Type': 'application/json',
            'X-GitHub-Api-Version': '2022-11-28',
            ...options.headers,
        },
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
    const { repo: repoBranch } = getEnv();
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

// ---- Reset repo to empty (delete all files via API) ----
async function resetRepoToEmpty() {
    step('Resetting repo to empty state...');

    const commitSha = await getLatestCommitSha();
    if (!commitSha) {
        info('Repo is already empty (no branch/commit).');
        return;
    }

    const commit = await getCommit(commitSha);
    const treeData = await ghFetch(repoUrl(`/git/trees/${commit.treeSha}?recursive=1`));
    const items = (treeData.tree || []).filter(e => e.type === 'blob');

    if (items.length === 0) {
        info('Repo tree is already empty.');
        return;
    }

    info(`Found ${items.length} file(s) to delete.`);

    // Delete all blobs by creating a tree with sha=null for each
    const deleteItems = items.map(e => ({ path: e.path, mode: '100644', type: 'blob', sha: null }));
    const newTreeSha = await createTree(null, deleteItems);
    const newCommitSha = await createCommit('Reset: empty repo for onboarding test', newTreeSha, commitSha);
    await updateRef(newCommitSha);

    ok(`Repo reset to empty. All ${items.length} file(s) deleted.`);
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

// ---- SEQUENTIAL blob creation (current behavior — the bug) ----
async function atomicCommitSequential(fileChanges, commitSha, treeSha) {
    step('Strategy A: SEQUENTIAL blob creation (current behavior)');
    info(`Creating ${Object.keys(fileChanges).length} blobs one by one...`);

    const t0 = Date.now();
    const treeItems = [];

    for (const [path, content] of Object.entries(fileChanges)) {
        const blobSha = await createBlob(content);
        treeItems.push({ path, mode: '100644', type: 'blob', sha: blobSha });
    }

    const newTreeSha = await createTree(treeSha, treeItems);
    const newCommitSha = await createCommit(
        `[TEST-SEQUENTIAL] Onboarding push — ${new Date().toISOString()}`,
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

// ---- PARALLEL blob creation (proposed fix) ----
async function atomicCommitParallel(fileChanges, commitSha, treeSha, concurrency = 5) {
    step(`Strategy B: PARALLEL blob creation (proposed fix, concurrency=${concurrency})`);
    info(`Creating ${Object.keys(fileChanges).length} blobs in batches of ${concurrency}...`);

    const t0 = Date.now();
    const entries = Object.entries(fileChanges);
    const treeItems = [];

    for (let i = 0; i < entries.length; i += concurrency) {
        const batch = entries.slice(i, i + concurrency);
        const settled = await Promise.all(
            batch.map(async ([path, content]) => {
                const blobSha = await createBlob(content);
                return { path, mode: '100644', type: 'blob', sha: blobSha };
            })
        );
        treeItems.push(...settled);
    }

    const newTreeSha = await createTree(treeSha, treeItems);
    const newCommitSha = await createCommit(
        `[TEST-PARALLEL] Onboarding push — ${new Date().toISOString()}`,
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
    console.log(`\n${c.bold}GitSyncMarks Onboarding Rate-Limit Test${c.reset}`);
    console.log(`Simulating onboarding with ${c.bold}${bookmarkCount}${c.reset} bookmarks\n`);

    const { owner, repo } = getEnv();
    info(`Repo: ${owner}/${repo}`);

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

    // 5. Run SEQUENTIAL test (current behavior)
    const callsBefore_seq = totalCalls;
    const rateBefore_seq = rateLimitEnd ?? initialRate.remaining;
    let seqResult;
    try {
        seqResult = await atomicCommitSequential(bookmarkFiles, currentCommitSha, currentTreeSha);
        const rateAfter_seq = rateLimitEnd;
        printSummary('Sequential (current behavior)', {
            callsBefore: callsBefore_seq,
            callsAfter: totalCalls,
            rateBefore: rateBefore_seq,
            rateAfter: rateAfter_seq,
            elapsed: seqResult.elapsed,
            commitSha: seqResult.commitSha,
        });
        // Update state for next test
        currentCommitSha = seqResult.commitSha;
        const updatedCommit = await getCommit(currentCommitSha);
        currentTreeSha = updatedCommit.treeSha;
    } catch (err) {
        fail(`Sequential test FAILED: ${err.message}`);
    }

    // 6. Run PARALLEL test (proposed fix) — push on top of what we just created
    console.log(`\n${c.gray}(Generating a fresh set of modified bookmarks for parallel test...)${c.reset}`);
    const modifiedFiles = generateSyntheticBookmarks(bookmarkCount, basePath);
    // Slightly modify content so blobs are different (forces re-upload)
    for (const key of Object.keys(modifiedFiles)) {
        if (key.endsWith('.json') && !key.endsWith('_index.json') && !key.endsWith('_order.json')) {
            const obj = JSON.parse(modifiedFiles[key]);
            obj.title = obj.title + ' (v2)';
            modifiedFiles[key] = JSON.stringify(obj, null, 2);
        }
    }

    const callsBefore_par = totalCalls;
    const rateBefore_par = rateLimitEnd ?? initialRate.remaining;
    let parResult;
    try {
        parResult = await atomicCommitParallel(modifiedFiles, currentCommitSha, currentTreeSha, 5);
        const rateAfter_par = rateLimitEnd;
        printSummary('Parallel (proposed fix, concurrency=5)', {
            callsBefore: callsBefore_par,
            callsAfter: totalCalls,
            rateBefore: rateBefore_par,
            rateAfter: rateAfter_par,
            elapsed: parResult.elapsed,
            commitSha: parResult.commitSha,
        });
    } catch (err) {
        fail(`Parallel test FAILED: ${err.message}`);
    }

    // 7. Final summary
    console.log(`\n${'═'.repeat(60)}`);
    console.log(`${c.bold}TOTAL API CALLS: ${totalCalls}${c.reset}`);
    console.log(`${c.bold}TOTAL RATE LIMIT CONSUMED: ${initialRate.remaining - rateLimitEnd}${c.reset}`);

    if (seqResult && parResult) {
        const speedup = (seqResult.elapsed / parResult.elapsed).toFixed(2);
        console.log(`\n${c.bold}Comparison:${c.reset}`);
        console.log(`  Sequential time: ${(seqResult.elapsed / 1000).toFixed(2)}s`);
        console.log(`  Parallel time:   ${(parResult.elapsed / 1000).toFixed(2)}s`);
        console.log(`  Speedup:         ${c.green}${speedup}×${c.reset} faster`);
    }
    console.log(`${'═'.repeat(60)}\n`);
}

main().catch((err) => {
    console.error(`\n${c.red}Fatal error: ${err.message}${c.reset}`);
    process.exit(1);
});
