# GitSyncMarks E2E Tests

Automated end-to-end tests for the GitSyncMarks browser extension. Runs on **Chrome only** (Playwright does not support Firefox extension loading).

**Note:** The extension fixture uses headed Chromium (no headless) because the service worker does not start reliably in headless mode. On machines without a display (e.g. SSH), use `xvfb-run -a npm run test:e2e:smoke`.

```bash
npm run test:e2e:smoke    # Smoke tests (no credentials)
npm run test:e2e:options  # Options page UI only: tabs, language dropdown, Help links, sub-tabs (no credentials)
```

## Sync Tests (Connection, Push, Pull)

Sync tests require a private GitHub repo and a Personal Access Token.

1. **Create the test repo** (once):
   ```bash
   GITSYNCMARKS_TEST_PAT=ghp_xxx node scripts/create-test-repo.js
   ```

2. **Set environment variables** (see `.env.example`):
   - `GITSYNCMARKS_TEST_PAT` — GitHub PAT with `repo` scope
   - `GITSYNCMARKS_TEST_REPO_OWNER` — Your username or org
   - `GITSYNCMARKS_TEST_REPO` — `GitSyncMarks-test-sync`

3. **Run sync tests:**
   ```bash
   npm run test:e2e:sync
   ```

## Large onboarding simulation (many bookmarks → GitHub API)

This is **not** a Playwright test: it drives the same Git Data API flow as an initial push (`createBlob` × N, `createTree`, `createCommit`, update/create ref). Use a **dedicated disposable repo name** in `GITSYNCMARKS_TEST_REPO` plus the same env vars as sync tests.

**`npm run test:onboarding-scale`** passes **`--ensure-repo`**: it **deletes** that repository if it already exists, then **creates** it again (private, `auto_init`). Your PAT needs permission to delete the repo (classic: **`delete_repo`** scope). To keep an existing repo:  
`npm run test:onboarding-scale -- --no-ensure-repo …` or use `npm run test:rate-limit` / `node scripts/test-onboarding-rate-limit.js` without `--ensure-repo`.

- **~5000 bookmarks** ≈ ~5003 JSON files → extension-style push uses **layered `POST /git/trees`** with inline `content` (~13 tree calls + commit + ref for 5003 files), not thousands of `POST /git/blobs`. The default PAT hourly limit (**5000** REST calls) is usually sufficient for one such push; use `--parallel-only` for a **single** pass at that scale (avoid default two-pass mode).
- **Secondary rate limits:** Still possible with extreme traffic; the tree-based path is much less bursty than per-blob uploads. If GitHub returns **403** secondary limit, wait a few minutes and retry.
- Reproducing the **old** per-blob bottleneck: `--sequential-only`.
- Matching **current extension** behavior (layered trees + inline content): `--parallel-only`.

```bash
# Empty the test repo, then simulate first push with 5000 bookmarks (extension-style)
GITSYNCMARKS_TEST_PAT=… GITSYNCMARKS_TEST_REPO_OWNER=… GITSYNCMARKS_TEST_REPO=… \
  npm run test:onboarding-scale -- --bookmark-count 5000 --reset --parallel-only
```

Optional flags: `--ensure-repo` / `--no-ensure-repo`, `--sequential-only`, `--no-color`. See `scripts/test-onboarding-rate-limit.js`.

### Verify test repo contents (GitHub API)

Lists all blobs on `main` and checks that the minimal GitSyncMarks paths exist (`bookmarks/_index.json`, `toolbar/_order.json`, `other/_order.json`). Optional: require a minimum number of toolbar bookmark JSON files (after onboarding-scale with `--bookmark-count 5000`, use `--min-bookmarks 5000`).

```bash
GITSYNCMARKS_TEST_PAT=… GITSYNCMARKS_TEST_REPO_OWNER=… GITSYNCMARKS_TEST_REPO=… \
  npm run verify-test-repo -- --verbose --min-bookmarks 5000
```

## CI (GitHub Actions)

**E2E in CI is currently disabled** (see [ROADMAP.md](../ROADMAP.md) backlog). Tests run **locally only**. The E2E workflow (`.github/workflows/test-e2e.yml`) can be triggered manually via Actions → E2E Tests → Run workflow. The release workflow no longer runs E2E.

## Test Reports

After a run:
```bash
npm run test:e2e:report
```
Opens the HTML report with screenshots and traces for failed tests.
