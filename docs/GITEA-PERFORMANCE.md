# Gitea-Family Sync Performance

Analysis of why Gitea / Forgejo / Codeberg / Gogs sync can issue thousands of HTTP requests, which faster API paths already exist in the codebase, and how to measure them before changing production behavior.

## Problem

GitSyncMarks uses the **Contents API** as the primary read/write path for Gitea-family providers (`writeStrategy: 'contents'` in [`lib/git-provider-common.js`](../lib/git-provider-common.js)):

| Operation | Current path | Request pattern |
|-----------|--------------|-----------------|
| **Read** | `fetchFileMapViaContents` → `_walkContentsForFileMap` | ~1 request per directory + ~1 per file (sequential) |
| **Write** | `GiteaAPI.atomicCommit` → `_atomicCommitViaGitData` (fallback: `_atomicCommitSequential`) | **1 commit** per push when git data succeeds; fallback ~1 request **and 1 commit per file** |

GitHub uses **Git Data API** instead: one recursive tree listing + batched blob GETs (reads), layered `POST /git/trees` + one commit (writes). See [`docs/SYNC-LOGIC.md`](SYNC-LOGIC.md) § Optimized Remote Fetching.

Large bookmark sets (thousands of JSON files) therefore feel slow on Codeberg even with good network connectivity.

## Why Contents API was chosen

Documented in [CHANGELOG.md](../CHANGELOG.md) (3.0.x):

1. **Reads:** `git/trees` metadata was unreliable on some self-hosted instances (`Commit … has no tree SHA`).
2. **Writes:** Batch “Change Files” endpoints returned misleading **401** on empty or older Forgejo builds.
3. After Contents writes, tree SHA in responses was sometimes missing → Contents reads stabilized post-push state.

The adapter still implements tree helpers (`getRecursiveTreeForCommit`, `_getPathShaMap`) for SHA lookup during writes; they are not used for pull/sync reads today.

## Benchmark tooling

Script: [`scripts/benchmark-gitea-sync.js`](../scripts/benchmark-gitea-sync.js)

```bash
# Analytical table only (no credentials)
npm run test:gitea-benchmark:estimate

# Live read + write — variables in `.env` (auto-loaded) or shell
# See .env.example for GITSYNCMARKS_GITEA_* keys (Codeberg token from extension profile).
npm run test:gitea-benchmark

# Read-only (no temporary write files)
node scripts/benchmark-gitea-sync.js --read-only --write-count 0

# Small write test (creates/cleans bookmarks/_gitsyncmarks_bench_*)
node scripts/benchmark-gitea-sync.js --write-count 10

# Save JSON report
node scripts/benchmark-gitea-sync.js --read-only --output gitea-bench-report.json
```

Environment variables are listed in [`.env.example`](../.env.example).

### What the benchmark compares

**Reads**

1. **Contents** — production path (`fetchFileMapViaContents`).
2. **Tree + blob** — `getRecursiveTreeForCommit` + `gitTreeToShaMap` + batched `getBlob` (5 concurrent, same as [`lib/remote-fetch.js`](../lib/remote-fetch.js)).
3. **Tree + delta** — warm-cache simulation: only ~5% of blob SHAs changed (typical incremental sync).

**Writes** (optional, `--write-count N`)

1. **Gitea blob+tree** — production `GiteaAPI.atomicCommit` (batched blobs + SHA tree layers, **one commit**).
2. **GitHub inline tree** — `GitHubAPI.prototype.atomicCommit` on a `GiteaAPI` instance (expected **404** on Codeberg).
3. **Contents sequential** — `_atomicCommitSequential` fallback (**N commits**).

Temporary benchmark files are removed via a final tree cleanup commit when possible.

## Analytical estimates (measured 2026-06-06)

From `npm run test:gitea-benchmark:estimate` (formulas in the script; no live host):

| Files | Contents read (req) | Tree+blob read (req) | Tree+delta 5% (req) | Contents write (req / commits) | Tree write (req / commits) |
|------:|--------------------:|---------------------:|--------------------:|-------------------------------:|---------------------------:|
| 10 | 11 | 11 | 6 | 10 / 10 | 3 / **1** |
| 100 | 105 | 101 | 6 | 100 / 100 | 3 / **1** |
| 500 | 525 | 501 | 26 | 500 / 500 | 4 / **1** |
| 1 000 | 1 050 | 1 001 | 51 | 1 000 / 1 000 | 5 / **1** |
| 5 000 | 5 250 | 5 001 | 251 | 5 000 / 5 000 | 15 / **1** |

Notes:

- **Read:** Tree+blob still downloads every blob on a cold cache (similar request count to Contents), but runs **batched parallel** GETs and a **single** tree listing — lower wall-clock time and simpler server load pattern.
- **Read delta:** With `lastSyncFiles` cache (real sync), tree path only fetches changed blobs → ~1 tree + O(changed) blob GETs.
- **Write:** Tree path is orders of magnitude fewer requests and **one commit** vs thousands of commits; this is the largest practical win for transfer, profile switch push, and first-time push.

Live numbers (requests, milliseconds, success/failure) should be recorded by running the script against each target host and appending to the “Live results” section below.

## Compatibility matrix

| Host | Read Contents | Read Tree+Blob | Write Contents | Write Blob+Tree | Notes |
|------|:-------------:|:--------------:|:--------------:|:-------------:|-------|
| **codeberg.org** | Works | **Works** (Phase 1) | Works (fallback) | **Works** (Phase 2) — 10 files / 33 req / 18s / **1 commit** | Forgejo; primary user target |
| **Self-hosted Gitea ≥ 1.19** | Works | **Often yes** | Works (fallback) | **Verify live** | Same blob+tree path as Codeberg |
| **Self-hosted Forgejo** | Works | **Often yes** | Works (fallback) | **Verify live** | Same adapter as Gitea |
| **Gogs** | Works | **Variable** — older git metadata | Works | **Variable** | Fallback to Contents remains required |
| **Empty repo** | Works | Tree may be empty | Contents works | Tree `createRef` path — verify | Empty-repo edge cases motivated Contents writes |

Legend: **Works** = used in production today. **Expected yes** / **Verify live** = infrastructure exists in code; run benchmark script to confirm before switching default.

### Live results

_Add rows after running `npm run test:gitea-benchmark` with `--output`._

| Date | Host | Repo files | Contents read (req/ms) | Tree read (req/ms) | Tree+delta 5% (req/ms) | Blob+tree write 10 files | Contents write 10 files | Inline tree 10 files |
|------|------|------------|------------------------|--------------------|-------------------------|--------------------------|-------------------------|----------------------|
| 2026-06-06 (combined) | codeberg.org | 686 | 724 / 232s | 646 / 9.4s (1 blob fail) | — | rate-limited | rate-limited | — |
| 2026-06-06 (read-only) | codeberg.org | 686 | 724 / **223s** | 687 / **12s** | 36 / **0.8s** | — | — | — |
| 2026-06-06 (write-only, pre-Phase 2) | codeberg.org | — | — | — | — | — | 25 req / **11.6s**, 10 commits | **404** inline `content` |
| 2026-06-06 (write-only, Phase 2) | codeberg.org | — | — | — | — | **33 req / 18.2s, 1 commit** | 20 req / **18.6s**, 10 commits | **404** (4 req / 0.6s) |

**Interpretation (2026-06-06, confirmed):**

- **Reads — try-first tree+blob is viable on Codeberg:** same 686 files, **18.8× faster** wall-clock (223s → 12s). Request count similar (~724 vs ~687), but **5 parallel blob GETs** replace the sequential Contents directory walk.
- **Incremental read (warm cache):** simulated 5% change → **36 requests / 0.8s** vs full Contents pull 223s. Matches real sync when `lastSyncFiles` SHA cache is warm.
- **Writes (Phase 2) — blob+tree works on Codeberg:** `GiteaAPI.atomicCommit` → 10 files in **one commit** (33 requests / 18.2s). Contents sequential fallback: 20 requests / 18.6s / **10 commits**. At 10 files, wall-clock is similar (network-bound); the win is **commit count** (1 vs N), which matters for history, webhooks, and large pushes.
- **Writes — GitHub inline tree still fails:** `GitHubAPI.atomicCommit` with `content` on `POST /git/trees` → HTTP 404 on Codeberg (580ms, 4 requests before failure).

## Recommendation

**Git Data try-first + Contents fallback** — two phases:

### Phase 1 — Reads (shipped)

Implemented in [`lib/remote-fetch.js`](../lib/remote-fetch.js) `buildRemoteMaps()`:

1. `getRecursiveTreeForCommit` → `gitTreeToShaMap` → `fetchBlobsBatched` (same as GitHub/GitLab).
2. On failure, truncated tree, or empty `basePath` listing → `fetchFileMapViaContents` fallback.
3. Truncated-tree guard (`api_treeTruncated`) unchanged.

### Phase 2 — Writes (shipped)

**Benchmark result (Codeberg 2026-06-06):** inherited `GitHubAPI.atomicCommit()` (inline `content` on `POST /git/trees`) returns **HTTP 404**. Production path uses blob SHAs instead.

In [`lib/providers/gitea-api.js`](../lib/providers/gitea-api.js) `atomicCommit()`:

1. `_atomicCommitViaGitData()` — batched `POST /git/blobs` (concurrency 5) + `chunkAtomicCommitShaTreeBatches` + layered `POST /git/trees` + `POST /git/commits` + ref update (**one commit**).
2. On failure (401/404/405/422/501 or “modified in the meantime”) → `_atomicCommitSequential()` (Contents API).

Re-run `npm run test:gitea-benchmark --write-only --write-count 10` on Codeberg to record live blob+tree numbers in the matrix below.

### Not recommended as primary fix

| Option | Reason |
|--------|--------|
| Parallel Contents writes | Each Contents PUT still creates a separate git commit → polluted history |
| Archive zip download | One request but heavy parse/memory; no incremental delta |
| Parallel Contents reads only | Helps wall-clock slightly; still O(N) requests |

### Optional hardening

- Probe tree read/write during connection test; store `gitDataApiSupported` on profile.
- Log which path was used (`tree` vs `contents`) in debug mode for support. Shipped: `console.warn` on Contents API fallback in `GiteaAPI.atomicCommit` and `commitBookmarkChanges`.

## Success criteria (before shipping Phase 1+2)

- Push 1 000 files on Codeberg: wall-clock **&lt; 2 min** via tree, or clear fallback without data loss.
- Pull with warm cache: **&lt; 10** blob GETs for typical 5% change rate.
- Self-hosted instance without tree API: automatic Contents fallback, same as today.
- No regression on truncated-tree or empty-repo flows.

## Related docs

- [PROVIDERS.md](PROVIDERS.md) — Gitea-family write/read strategy
- [SYNC-LOGIC.md](SYNC-LOGIC.md) — GitHub optimized fetch (target model for Gitea)
- [ARCHITECTURE.md](ARCHITECTURE.md) — `github-tree-batch.js`, `remote-fetch.js`
