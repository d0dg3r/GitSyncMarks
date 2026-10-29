# GitSyncMarks E2E Tests

Automated end-to-end tests for the GitSyncMarks browser extension. Runs on **Chrome only** (Playwright does not support Firefox extension loading).

**Note:** The extension fixture uses headed Chromium (no headless) because the service worker does not start reliably in headless mode. On machines without a display (e.g. SSH), use `xvfb-run -a npm run test:e2e:smoke`.

```bash
npm run test:e2e:smoke    # Smoke tests (no credentials)
npm run test:e2e:options  # Options page UI only: tabs, language dropdown, Help links, sub-tabs (no credentials)
```

## Settings file for manual tests

`npm run test:settings-file` writes `build/test-settings/gitsyncmarks-test-settings.json` from the `.env` values above (`--password <pw>` writes an encrypted `.enc` instead). Import it in each test browser (Options → Files → Import, type "Settings"): the profile points at the test repo, auto-sync is off and the debug log is on. The file lives in the ignored `build/` folder; the plain variant contains the token, so delete it after importing. Importing replaces that browser's profiles, so use dedicated test browser profiles.

## Automated sync integration test (no credentials, no browser)

`test/integration-sync-conflict.test.js` runs the real sync code with two simulated browsers against an in-memory GitHub (`test/helpers/fake-browser.js`, `test/helpers/fake-github.js`). It covers the first push and pull, a per-file conflict, and both "keep" choices. It runs with `npm run test:unit`.

## Sync Tests (Connection, Push, Pull)

Sync tests require a private GitHub repo and a Personal Access Token.

1. **Create the test repo** (once):
   ```bash
   npm run create:test-repo -- --host=github
   # or: GITSYNCMARKS_GITHUB_PAT=ghp_xxx node scripts/create-test-repo.js --host=github
   ```

2. **Set environment variables** (see `.env.example`):
   - `GITSYNCMARKS_GITHUB_PAT` — GitHub PAT with `repo` (+ `delete_repo` for ephemeral cleanup)
   - `GITSYNCMARKS_GITHUB_OWNER` — Your username or org
   - `GITSYNCMARKS_GITHUB_REPO` — `GitSyncMarks-test-sync`

3. **Run sync tests:**
   ```bash
   npm run test:e2e:sync
   ```

## Dual-host onboarding (GitHub + Forgejo)

Two layers:

| Layer | Repo | Lifetime |
|-------|------|----------|
| Stable fixture | `GitSyncMarks-test-sync` on each host | Long-lived; contents may be reset; **never** deleted by E2E |
| Ephemeral | `gitsyncmarks-e2e-<scenario>-<random>` | Create → assert → delete (prefix cleanup); includes autoCreate and zero-commit (`auto_init: false`) |

### Wizard bootstrap matrix (A–D)

| ID | Setup | Wizard flow | Spec |
|----|--------|-------------|------|
| **A** | Ephemeral repo via wizard **autoCreate** (`auto_init: false` from extension) | Create + seed (+ Push if local bookmarks) | `connection.spec` A0/A; `onboarding-hosts` autoCreate |
| **B** | Stable fixture, **new empty path** (repo already has commits) | Manual / use existing | `connection.spec` B |
| **C** | Stable fixture + **`ensureMinimalStructure`** (folder ready) | Manual / use existing | `connection.spec` C; `onboarding-hosts` manual fixture |
| **D** | Ephemeral **`createEmptyRepo`** (`auto_init: false`, zero commits) | Manual / use existing → seed + Push | `connection.spec` D; `onboarding-hosts` manual zero-commit |

B is not the same as D: B has a branch/history; D is «Git Repository is empty».

1. **Create fixtures** (once per host):
   ```bash
   npm run create:test-repo -- --host=github
   npm run create:test-repo -- --host=forgejo
   # or both: npm run create:test-repo -- --host=all
   ```

2. **Env** (see `.env.example`):
   - GitHub: `GITSYNCMARKS_GITHUB_PAT`, `GITSYNCMARKS_GITHUB_OWNER`, `GITSYNCMARKS_GITHUB_REPO`
   - Forgejo: `GITSYNCMARKS_FORGEJO_TOKEN`, `GITSYNCMARKS_FORGEJO_OWNER`, `GITSYNCMARKS_FORGEJO_SERVER_URL` (default `https://forgejo.lan`), `GITSYNCMARKS_FORGEJO_REPO`
   - Forgejo token needs repo create/delete + contents write. Homelab Forgejo is for **local** runs (not GitHub Actions unless the runner can reach `.lan`).

3. **Run matrix** (skips a host when its env is incomplete):
   ```bash
   npm run test:e2e:onboarding
   ```

4. **Cleanup orphans** (both hosts):
   ```bash
   npm run cleanup:e2e-repos
   ```

## Large onboarding simulation (many bookmarks → GitHub API)

This is **not** a Playwright test: it drives the same Git Data API flow as an initial push (`createBlob` × N, `createTree`, `createCommit`, update/create ref). Use a **dedicated disposable repo name** in `GITSYNCMARKS_GITHUB_REPO` plus the same env vars as sync tests.

**`npm run test:onboarding-scale`** passes **`--ensure-repo`**: it **deletes** that repository if it already exists, then **creates** it again (private, `auto_init`). Your PAT needs permission to delete the repo (classic: **`delete_repo`** scope). To keep an existing repo:  
`npm run test:onboarding-scale -- --no-ensure-repo …` or use `npm run test:rate-limit` / `node scripts/test-onboarding-rate-limit.js` without `--ensure-repo`.

- **~5000 bookmarks** ≈ ~5003 JSON files → extension-style push uses **layered `POST /git/trees`** with inline `content` (~13 tree calls + commit + ref for 5003 files), not thousands of `POST /git/blobs`. The default PAT hourly limit (**5000** REST calls) is usually sufficient for one such push; use `--parallel-only` for a **single** pass at that scale (avoid default two-pass mode).
- **Secondary rate limits:** Still possible with extreme traffic; the tree-based path is much less bursty than per-blob uploads. If GitHub returns **403** secondary limit, wait a few minutes and retry.
- Reproducing the **old** per-blob bottleneck: `--sequential-only`.
- Matching **current extension** behavior (layered trees + inline content): `--parallel-only`.

```bash
# Empty the test repo, then simulate first push with 5000 bookmarks (extension-style)
GITSYNCMARKS_GITHUB_PAT=… GITSYNCMARKS_GITHUB_OWNER=… GITSYNCMARKS_GITHUB_REPO=… \
  npm run test:onboarding-scale -- --bookmark-count 5000 --reset --parallel-only
```

Optional flags: `--ensure-repo` / `--no-ensure-repo`, `--sequential-only`, `--no-color`. See `scripts/test-onboarding-rate-limit.js`.

### Verify test repo contents (GitHub API)

Lists all blobs on `main` and checks that the minimal GitSyncMarks paths exist (`bookmarks/_index.json`, `toolbar/_order.json`, `other/_order.json`). Optional: require a minimum number of toolbar bookmark JSON files (after onboarding-scale with `--bookmark-count 5000`, use `--min-bookmarks 5000`).

```bash
GITSYNCMARKS_GITHUB_PAT=… GITSYNCMARKS_GITHUB_OWNER=… GITSYNCMARKS_GITHUB_REPO=… \
  npm run verify-test-repo -- --verbose --min-bookmarks 5000
```

## CI (Forgejo Actions on forgejo.lan)

SoT: [`.forgejo/workflows/`](../.forgejo/workflows/). On `main` / `workflow_dispatch`:

- **CI** — lint, unit, AMO, smoke + options UI (no secrets)
- **E2E** — `npm run test:e2e` (GitHub fixture, matrix A–D) and `npm run test:e2e:onboarding` (GitHub + Forgejo)

**Secrets** (tokens only): `GITSYNCMARKS_GITHUB_PAT`, `GITSYNCMARKS_FORGEJO_TOKEN`  
**Variables**: `GITSYNCMARKS_GITHUB_OWNER`, `GITSYNCMARKS_GITHUB_REPO`, `GITSYNCMARKS_FORGEJO_OWNER`, `GITSYNCMARKS_FORGEJO_REPO`, `GITSYNCMARKS_FORGEJO_SERVER_URL`

Same names as [`.env.example`](../.env.example). Local `.env` stays for workstation runs; Actions does not read it. E2E CI runs on forgejo.lan only.

## Test Reports

After a run:
```bash
npm run test:e2e:report
```
Opens the HTML report with screenshots and traces for failed tests.
