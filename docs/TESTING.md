# GitSyncMarks – Testing Guide

This document describes how to test the extension on Chrome and Firefox (desktop) as well as Firefox for Android.

---

## Automated E2E Tests (Chrome)

GitSyncMarks uses Playwright for automated end-to-end tests. **Chrome only** — Firefox extension loading is not supported by Playwright.

```bash
npm run test:e2e              # All tests (smoke + connection + sync)
npm run test:e2e:smoke        # Smoke tests only (no GitHub config)
npm run test:e2e:options      # Options page UI only (tabs, language, Help; no GitHub config)
npm run test:e2e:sync         # Connection and sync tests (GitHub)
npm run test:e2e:onboarding   # Dual-host onboarding matrix (GitHub + Forgejo; skips incomplete env)
npm run test:e2e:report       # Open HTML report after a run
npm run create:test-repo -- --host=all   # Create stable GitSyncMarks-test-sync fixtures
npm run cleanup:e2e-repos                # Delete orphaned gitsyncmarks-e2e-* on both hosts
```

**Prerequisites:** `npm run build:chrome` (run automatically by test scripts).

**Sync tests** require a private GitHub test repo and credentials — see [e2e/README.md](../e2e/README.md) or `.env.example`.

**Dual-host onboarding** uses a stable fixture repo (`GitSyncMarks-test-sync`) on GitHub and Homelab Forgejo (`GITSYNCMARKS_FORGEJO_*`, default `https://forgejo.lan`), plus ephemeral `gitsyncmarks-e2e-*` repos (autoCreate and zero-commit `createEmptyRepo`). Forgejo runs locally (or on a runner that reaches `.lan`); CI smoke stays secret-free. Details and **wizard matrix A–D**: [e2e/README.md](../e2e/README.md).

**Wizard empty remotes:** both autoCreate and “use existing” seed the minimal `bookmarks/` structure when the remote has no commits (branch + `_index.json` / `_order.json`), including when the browser already has bookmarks. With local bookmarks, environment check still leaves a Push step; without local bookmarks, the wizard can finish after auto-seed. Empty-repo HTTP 409 must surface as “no commits yet” (not a concurrent-edit conflict), and Push/Sync must fall back to the Contents API instead of failing after git-data retries. E2E covers structure-ready (C), path-empty on fixture (B), autoCreate (A), and zero-commit existing (D).

**CI (Forgejo Actions on forgejo.lan):** Smoke and options-UI E2E run on every push/PR to `main` (`.forgejo/workflows/ci.yml`, no secrets). Full E2E + dual-host onboarding run via `.forgejo/workflows/test-e2e.yml` with `GITSYNCMARKS_GITHUB_*` / `GITSYNCMARKS_FORGEJO_*` secrets and variables (see `.env.example`). Build/E2E/release/screenshots are Forgejo-only (no GitHub duplicates).

### Chrome DevTools MCP (optional, Cursor)

This is **not** a substitute for Playwright. Use **`npm run test:e2e*`** for repeatable regression; use [Chrome DevTools MCP](https://github.com/ChromeDevTools/chrome-devtools-mcp) when you want an AI agent in **Cursor** to drive or inspect a live **Google Chrome** session (console, network, performance traces, screenshots, navigation).

- **Config (Cursor):** Register the `mcpServers` block in **one** place: either the **user-wide** file (`~/.cursor/mcp.json` on Linux and macOS, `%USERPROFILE%\.cursor\mcp.json` on Windows) so it applies to all projects, or [`.cursor/mcp.json`](../.cursor/mcp.json) in this repository only. See [Cursor](https://cursor.com/docs) (*MCP*). **Restart Cursor** after changes. The committed project [`.cursor/mcp.json`](../.cursor/mcp.json) has an **empty** `mcpServers` by default; use the **reference JSON** below (or the same in `~/.cursor/mcp.json`) to avoid double-registering if you also keep a user-wide config.

Reference (copy into `~/.cursor/mcp.json` or a project’s `.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "chrome-devtools": {
      "command": "npx",
      "args": [
        "-y",
        "chrome-devtools-mcp@latest",
        "--no-usage-statistics"
      ]
    },
    "firefox-devtools": {
      "command": "npx",
      "args": ["-y", "firefox-devtools-mcp@latest"]
    }
  }
}
```

See the Firefox subsection below for `firefox-devtools` behavior.
- **Checklist:** Node.js 20.19+ (as required by upstream), current Chrome, `npm` available to `npx`.
- **Smoke test prompt** (in Cursor chat, with MCP enabled): e.g. *Check the performance of https://developers.chrome.com* — confirms the server starts Chrome and tools run.

**Extension / GitSyncMarks development**

- The default MCP config launches a dedicated Chrome profile. To work with **your** normal Chrome, use **`--autoConnect`** (Chrome 144+, enable remote debugging at `chrome://inspect/#remote-debugging`) or start Chrome with `--remote-debugging-port=9222` and pass **`--browserUrl=http://127.0.0.1:9222`** in the `args` array. Remote debugging has security implications; do not leave the port open on untrusted networks.
- To load the **unpacked** extension in the instance Chrome DevTools MCP starts, either open `chrome://extensions` manually in that window after launch or use extension-related tools. Upstream exposes tools such as `install_extension` / `reload_extension` only when **`--categoryExtensions` is true**; at the time of writing they are **limited to a pipe-launched** session—**`--browserUrl` / `autoConnect` and extension tools are not used together** until a future Chrome (see [upstream help](https://github.com/ChromeDevTools/chrome-devtools-mcp) and `npx -y chrome-devtools-mcp@latest --help`). For most cases, `npm run build:chrome` and load `build/chrome/` in that Chrome, then use MCP for the options page and popup URLs under `chrome-extension://…`.
- **This server is Chrome-only** for extension URLs. For agent-assisted **Firefox** debugging, use [Firefox DevTools MCP](#firefox-devtools-mcp-optional-cursor) below (separate Cursor MCP entry).

### Firefox DevTools MCP (optional, Cursor)

This is **not** a substitute for Playwright. **`npm run test:e2e*`** is **Chrome only**; use [Firefox DevTools MCP](https://github.com/mozilla/firefox-devtools-mcp) when you want an AI agent in **Cursor** to drive or inspect a local **Mozilla Firefox** session (snapshots, network, console, screenshots, navigation, optional script evaluation) via WebDriver BiDi.

- **Config (Cursor):** `firefox-devtools` is part of the same `mcpServers` **reference** as Chrome (see the JSON block [above](#chrome-devtools-mcp-optional-cursor) or your `~/.cursor/mcp.json`). Restart Cursor after changes. A local **Firefox 100+** must be installed (or pass a custom path via upstream flags).
- **Checklist:** Node.js 20.19+ (as required by upstream), `npm` for `npx`. The server is **not** for remote/cloud-only environments without a local Firefox; see the [project README](https://github.com/mozilla/firefox-devtools-mcp/blob/main/README.md).
- **Smoke test** (in Cursor, with the Firefox MCP enabled): e.g. navigate to `https://example.com` and take a snapshot (or an equivalent one-shot flow) so you confirm the server launches Firefox and tools respond.

**Extension / manual parity**

- The usual hand test remains: `npm run build:firefox` and [Load Temporary Add-on from `build/`](#firefox--manual-testing) in `about:debugging` (see below). The Firefox MCP can automate pages under `moz-extension://…` when your add-on is loaded; WebExtension tools such as `install_extension` and privileged helpers may require extra upstream flags and **`MOZ_REMOTE_ALLOW_SYSTEM_ACCESS=1`** / `--enable-privileged-context` (see [upstream `firefox-devtools-mcp` README](https://github.com/mozilla/firefox-devtools-mcp/blob/main/README.md), `npx -y firefox-devtools-mcp@latest --help`). Do **not** enable those globally unless you understand the security and fingerprint implications.
- **`--connect-existing`** can attach to **Firefox** you started with Marionette (e.g. `firefox --marionette`); in that mode some BiDi-driven features (e.g. some console or network event streams) are limited. Upstream warns: do not leave Marionette on for day-to-day browsing.

---

## Unit and Integration Tests (no browser)

```bash
npm run test:unit      # all node:test files in test/
npm run typecheck
npm run check:i18n     # every i18n key used in code exists in _locales/en
npm run lint
npm run build:firefox && npm run lint:amo   # Mozilla addons-linter (also in CI)
```

- **Integration tests** run the real sync code against in-memory fakes, with no credentials and no browser: `test/helpers/fake-browser.js` (storage and bookmarks; `moveSemantics: 'chrome' | 'firefox'`) and `test/helpers/fake-github.js` (Git Data API, request log, `failNext()` for forced HTTP errors).
- `test/integration-sync-conflict.test.js`: two browsers and one repository. Covers the first push and pull, per-file conflicts, rename conflicts, stable bookmark IDs on pull, the preview reusing the base, and a plain 409 that does not retry.
- `test/bookmark-reconcile.test.js`: `replaceLocalBookmarks` reconcile rules, plus a property test over random trees with Chrome and Firefox move semantics.

These tests do **not** click the popup or options UI, and they do not run in a real browser. Use the manual checklist below for that.

---

## Manual Sync Test (Checklist)

Use this checklist before a release, or after changes to sync, conflicts or `replaceLocalBookmarks`. It needs two browser profiles (A and B), for example two Chrome profiles, or Chrome and Firefox.

### 1. Setup

1. **Build with a visible pre-release version.** The browser's extensions page shows the manifest version. The About tab shows the display version.
   ```bash
   VERSION_FOR_DISPLAY=3.1.0-beta.1 npm run build   # build/chrome/ and build/firefox/
   ```
   Load `build/chrome/` (chrome://extensions → Load unpacked) or `build/firefox/manifest.json` (about:debugging → Load Temporary Add-on). Disable the store version in the same profile, otherwise both sync against the same repository.
2. **Test repository:** `.env` holds `GITSYNCMARKS_GITHUB_PAT`, `GITSYNCMARKS_GITHUB_OWNER`, `GITSYNCMARKS_GITHUB_REPO` (see `.env.example`). Never use a repository with real bookmarks.
3. **Reset the test repository** to the empty layout (git clone, replace `bookmarks/`, force-push):
   ```bash
   node -r dotenv/config -e "require('./e2e/helpers/repo-reset.js').resetTestRepo().then(() => console.log('reset done'))"
   node -r dotenv/config scripts/verify-test-repo.js     # expect: 0 toolbar bookmark files
   ```
4. **Generate the settings file** for both browsers:
   ```bash
   npm run test:settings-file                      # build/test-settings/gitsyncmarks-test-settings.json
   npm run test:settings-file -- --password <pw>   # encrypted .enc instead
   ```
   The profile "Test repo" points at the test repository, with auto-sync off, the debug log on and the wizard skipped. The plain file contains the token: it is written to the git-ignored `build/` folder with mode 600, but delete it after importing. Import it in A and B via Options → Files → Import, type **Settings**. Importing replaces that browser's profiles.
5. In both browsers, check that the About tab shows the pre-release version. Keep **Options → Sync → Debug log** open: every apply logs `replaceLocalBookmarks() created=… removed=… updated=… moved=… skipped=…`.

### 2. Checklist

Blocks 1–3 cover the sync core. Do them first.

| # | Step | Expected |
|---|---|---|
| **1 Basics** | | |
| 1.1 | A: add 5–10 bookmarks in the bookmarks bar, including a folder with a subfolder. Sync Now | Success; `bookmarks/` exists in the repository |
| 1.2 | B (empty): Sync Now | All of A's bookmarks appear in B, in the same order |
| **2 Incremental apply** | | |
| 2.1 | A: rename a bookmark, sync. B: sync | B shows the new title; log `updated=1 created=0 removed=0` |
| 2.2 | A: reorder by drag and drop, sync. B: sync | Same order in B; log `moved>0 created=0 removed=0` |
| 2.3 | B: set a bookmark as a context-menu quick folder, then repeat 2.1 | Quick folder still works (the ID stays the same) |
| 2.4 | A: move a bookmark into the subfolder, sync. B: sync | It appears in the subfolder in B, exactly once |
| 2.5 | A: delete one bookmark and add one, sync. B: sync | B equals A |
| 2.6 | No change, sync in A and B | Log shows all counters `0` |
| 2.7 | Chrome + Firefox only: Firefox adds a `place:` bookmark, sync. Chrome: sync | Chrome applies the rest; log `skipped=1`, no abort |
| **3 Conflicts** | | |
| 3.1 | A: rename "Test" to "test", sync. B: rename "Test" to "TEST", sync | Popup in B lists one conflict with both versions |
| 3.2 | B: "Keep this browser's version" | Conflict clears; after syncing A, both show "TEST" |
| 3.3 | A: rename a bookmark to "Alpha", sync. B: rename the same one to "Beta", sync | Exactly **one** conflict, not two bookmarks |
| 3.4 | B: "Keep repository version" | B shows "Alpha" once; the repository has one file for it |
| **4 Preview and confirmations** | | |
| 4.1 | A: add 2 bookmarks, Push ↑ | "Checking changes…", then "2 added, 0 removed" |
| 4.2 | Cancel | Nothing changes in the repository |
| 4.3 | B: Pull ↓ | Confirmation with counts; nothing changes before Confirm |
| 4.4 | Double-click Push | Only one confirmation |
| 4.5 | With 2+ profiles: switch the profile in the popup | Confirmation, unless "Switch without confirmation" is on |
| **5 Local backups** | | |
| 5.1 | After a pull in B: Restore local backup | The question names date and time; the state before the pull returns |
| 5.2 | Restore again | The state before 5.1 returns (restore is undoable) |
| **6 Bulk-deletion guard** | | |
| 6.1 | A: rename a folder with ≥10 bookmarks, sync | Goes through, **no** bulk-delete warning |
| 6.2 | A: delete ≥10 bookmarks (≥15 %), sync | Bulk-delete warning; nothing is deleted |
| **7 Other** | | |
| 7.1 | Disconnect the network, open the popup | Offline note; sync buttons disabled |
| 7.2 | Auto-sync on: start a sync and add a bookmark meanwhile | Bookmark stays and is pushed shortly after |
| 7.3 | Popup footer → Copy diagnostics | No token and no repository or mirror names in the text |
| 7.4 | Export settings as plain JSON | The file contains no token |
| 7.5 | Settings sync with password | Works; devices on 3.0.10 or older cannot read the v2 `settings.enc` |

### 3. Reporting a failure

Note the block and step, what you expected and what you saw. Attach the debug log lines around the step (Options → Sync → Debug log → Export) and, if useful, the copied diagnostics.

---

## Firefox — Manual Testing

Automated E2E tests run only on Chrome. **Test Firefox manually** before each release:

1. Build: `npm run build:firefox`
2. Load: `about:debugging` → Load Temporary Add-on → select `build/GitSyncMarks-vX.X.X-firefox.zip`
3. Run the same flows as Chrome: configure GitHub, Test Connection, Push, Pull, Sync
4. Verify: popup, options tabs, sync status, conflict handling

The extension code is shared; Chrome E2E validates core logic. Firefox-specific checks: manifest differences, storage, background script (non–service-worker).

---

## “What’s new” overlay (manual)

After an **update** (not a fresh install), the background script sets `showWhatsNewForVersion` in `chrome.storage.local`. The next time the user opens the **toolbar popup** or **Settings**, a dismissible overlay appears if the stored version matches the manifest and release notes exist for that version.

**Manual check:** Load a dev build, open the service worker console, run `chrome.storage.local.set({ showWhatsNewForVersion: chrome.runtime.getManifest().version })`, then open the popup or Settings — the overlay should appear once; **Close** clears the key.

---

## Store Screenshots

Screenshots for Chrome Web Store and Firefox AMO are generated automatically. Run after building the Chrome extension:

```bash
npm run build:chrome && npm run generate-screenshots
```

Or use the combined command:

```bash
npm run screenshots
```

Output: `store-assets/{en,de,fr,es,pt_BR,it,ja,zh_CN,ko,ru,tr,pl}/` — each with `chrome-*.png` (GitHub-Profile, Connection, Sync, Files-Generated, Export-Import, Popup, Wizard-Welcome, Wizard-Token, Wizard-Repo) and `firefox-*.png` (copied from Chrome; UI is identical). Each screenshot shows light and dark mode side by side (1280x800 total). 12 languages, 9 screenshots each = 108 Chrome + 108 Firefox = 216 images.

**Prerequisites:** Playwright with Chromium (`npx playwright install chromium` — run once).

### CI Screenshot Generation

Screenshots can also be generated via Forgejo Actions (`.forgejo/workflows/screenshots.yml`): builds the extension, generates store screenshots, and commits them back to the repo.

**Trigger manually:**

1. Go to Actions → Generate Screenshots → Run workflow
2. Optionally specify a branch (defaults to current)
3. The workflow commits updated images to `store-assets/` and pushes

**Typical release flow:** Run the screenshot workflow on the development branch before tagging a release, so the latest screenshots are included.

---

## Chrome (Desktop)

### Build

```bash
npm run build:chrome
```

Output: `build/chrome/` (unpacked) and `build/GitSyncMarks-vX.X.X-chrome.zip`.

### Load Unpacked Extension

1. Open `chrome://extensions/`
2. Enable **Developer mode** (top right)
3. Click **Load unpacked**
4. Select the `build/chrome/` folder

### Test

- **Popup:** Click the extension icon in the toolbar
- **Options:** Right-click the icon → **Options**, or open `chrome://extensions/` → GitSyncMarks → **Details** → **Extension options**
- **Debug:** Right-click the popup → **Inspect** to open DevTools

### Responsive Layout Check

To simulate mobile viewport for the options page:

1. Open the options page in a tab (via the extension)
2. Press **F12** → toggle **Device toolbar** (Ctrl+Shift+M)
3. Choose a phone preset or set 360×640 px

---

## Firefox (Desktop)

### Build

```bash
npm run build:firefox
```

Output: `build/firefox/` and `build/GitSyncMarks-vX.X.X-firefox.zip`.

### Load Temporary Add-on

1. Open `about:debugging`
2. Select **This Firefox**
3. Click **Load Temporary Add-on**
4. Choose `build/GitSyncMarks-vX.X.X-firefox.zip` or the `manifest.json` in `build/firefox/`

**Note:** Temporary add-ons are removed when Firefox restarts. Reload after code changes via the **Reload** button in `about:debugging`.

### Test

- **Popup:** Click the extension icon in the toolbar
- **Options:** Click the icon → **Open Settings**, or open `about:addons` → GitSyncMarks → **Preferences**
- **Debug:** Right-click the popup → **Inspect** to open DevTools

### Responsive Layout Check

1. Open the options page (it loads in a tab)
2. Press **Ctrl+Shift+M** for Responsive Design Mode
3. Set viewport to 360×640 px or a phone preset

For the popup: Open `moz-extension://<EXTENSION-ID>/popup.html` in a tab (ID from `about:debugging`), then use Responsive Design Mode.

---

## Mobile Layout Test on Desktop

To verify responsive layout changes without an Android device, use the browser’s responsive/device mode:

**Chrome:** Load the extension (see Chrome section), open options in a tab, press **Ctrl+Shift+M** (Device toolbar), set viewport to 360×640 px.

**Firefox:** Load the extension (see Firefox section). For the options page: open it in a tab, press **Ctrl+Shift+M**. For the popup: open `moz-extension://<EXTENSION-ID>/popup.html` in a tab (ID from `about:debugging`), then use Responsive Design Mode.

Responsive mode only simulates viewport size. Final verification should be done on real Firefox for Android.

---

## Full Test on Firefox for Android

For full compatibility testing on real Firefox for Android.

### Prerequisites

- **adb** (Android Debug Bridge) in your PATH
- **web-ext** version 7.12.0 or later

**Install on Arch Linux / CachyOS:**
```bash
# Android tools (includes adb)
sudo pacman -S android-tools

# web-ext
npm install -g web-ext
```

### Android Device Setup

1. Enable **Developer options** (tap Build number 7 times in Settings → About)
2. Enable **USB debugging**
3. Install Firefox from the Play Store (or Firefox Nightly/Beta)
4. In Firefox: Settings → **Enable “Remote debugging via USB”**
5. Connect the device via USB and approve the debugging prompt

### Verify Connection

```bash
adb devices
```

### Run the Extension on Android

```bash
# 1. Build the Firefox extension
npm run build:firefox

# 2. Run from the unpacked build directory
cd build/firefox
web-ext run --target=firefox-android
```

**Select Firefox variant** (if multiple are installed):
```bash
# Release Firefox
web-ext run --target=firefox-android --firefox-apk org.mozilla.firefox

# Firefox Nightly
web-ext run --target=firefox-android --firefox-apk org.mozilla.fenix

# Firefox Beta
web-ext run --target=firefox-android --firefox-apk org.mozilla.firefox_beta
```

**If multiple devices are connected:**
```bash
web-ext run --target=firefox-android --adb-device <device-id>
```

### Debugging (Firefox Android)

- Use `about:debugging` on your desktop Firefox, connect to the Android device, then inspect processes
- For popup HTML/CSS: temporarily open the popup in a tab to use the Inspector (see [Extension Workshop](https://extensionworkshop.com/documentation/develop/developing-extensions-for-firefox-for-android/))
- Check `adb logcat` filtered by your extension ID for manifest and runtime messages

> [!IMPORTANT]
> **Bookmark Visibility:** On Firefox for Android, synced bookmarks will **not** appear in the native browser bookmark menu. This is a limitation of the Firefox for Android extension API. Use the **GitSyncMarks-App** to view and manage your bookmarks on mobile.

---

## Android Emulator (Without a Physical Device)

If you do not have an Android phone:

1. Install **Android Studio** (or at least the Android SDK)
2. Create an **Android Virtual Device (AVD)** with a phone profile
3. Start the emulator
4. Install Firefox from the Play Store (or sideload an APK)
5. `adb` will connect to the emulator; use the same `web-ext run` commands as above

---

## Sync Troubleshooting

- **Debug Log**: Options → Sync tab — enable the debug log, reproduce the sync issue, then export and share the log for support or analysis

---

## Quick Reference

| Platform | Load | Effort |
|----------|------|--------|
| Chrome Desktop | `chrome://extensions/` → Load unpacked → `build/chrome/` | Low |
| Firefox Desktop | `about:debugging` → Load Temporary Add-on → `build/GitSyncMarks-vX.X.X-firefox.zip` | Low |
| Firefox Android (device) | `web-ext run --target=firefox-android` from `build/firefox/` | Medium |
| Firefox Android (emulator) | Same as above, with AVD running | High |

**Recommendation:** Test on both Chrome and Firefox desktop before each release. Use the desktop Responsive Mode for mobile layout checks, then verify on real Firefox for Android.
