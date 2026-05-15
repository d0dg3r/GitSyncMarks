# GitSyncMarks – Testing Guide

This document describes how to test the extension on Chrome and Firefox (desktop) as well as Firefox for Android.

---

## Automated E2E Tests (Chrome)

GitSyncMarks uses Playwright for automated end-to-end tests. **Chrome only** — Firefox extension loading is not supported by Playwright.

```bash
npm run test:e2e           # All tests (smoke + connection + sync)
npm run test:e2e:smoke    # Smoke tests only (no GitHub config)
npm run test:e2e:options  # Options page UI only (tabs, language, Help; no GitHub config)
npm run test:e2e:sync     # Connection and sync tests
npm run test:e2e:report   # Open HTML report after a run
```

**Prerequisites:** `npm run build:chrome` (run automatically by test scripts).

**Sync tests** require a private test repo and credentials — see [e2e/README.md](../e2e/README.md) if present, or `.env.example`.

**CI (GitHub Actions):** Smoke and options-UI E2E tests run automatically on every push/PR to `main` (in the `ci.yml` workflow). These tests require no secrets. Full E2E tests (connection + sync) require a PAT and test repo and can be triggered manually via Actions → E2E Tests → Run workflow.

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

Screenshots can also be generated via GitHub Actions. The `screenshots.yml` workflow runs on `ubuntu-latest`, builds the extension, generates all 144 screenshots, and commits them back to the repo.

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
