# GitSyncMarks E2E Tests

Automated end-to-end tests for the GitSyncMarks browser extension. Runs on **Chrome only** (Playwright does not support Firefox extension loading).

**Note:** The extension fixture uses headed Chromium (no headless) because the service worker does not start reliably in headless mode. On machines without a display (e.g. SSH), use `xvfb-run -a npm run test:e2e:smoke`.

```bash
npm run test:e2e:smoke   # Smoke tests (no credentials)
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

## CI (GitHub Actions)

**E2E in CI is currently disabled** (see [ROADMAP.md](../ROADMAP.md) backlog). Tests run **locally only**. The E2E workflow (`.github/workflows/test-e2e.yml`) can be triggered manually via Actions → E2E Tests → Run workflow. The release workflow no longer runs E2E.

## Test Reports

After a run:
```bash
npm run test:e2e:report
```
Opens the HTML report with screenshots and traces for failed tests.
