# Linkwarden Integration – Specification

**Status:** Planned for next version (v2.6.0)  
**Reference:** [Linkwarden Browser Extension](https://github.com/linkwarden/browser-extension) (official extension)  
**Created:** February 2026

---

## Goal

Integrate Linkwarden into GitSyncMarks so users can save links directly to their Linkwarden instance from the context menu. Feature parity with the official Linkwarden extension: **Options** (instance URL, auth), **Tags** (per-link tagging), and **Screenshots** (capture and upload page screenshots).

---

## Reference: Official Linkwarden Extension

The [official Linkwarden browser extension](https://github.com/linkwarden/browser-extension) provides:

| Feature | Description |
|---------|-------------|
| **Save link** | Add current page or selected link to Linkwarden with one click |
| **Options** | Instance URL, sign-in via API key or username/password |
| **Tags** | Assign tags when saving (keywords for filtering) |
| **Screenshots** | Capture and upload page screenshot to Linkwarden archive |
| **Save all tabs** | Save all open tabs in the current window |

GitSyncMarks will implement: **Save link**, **Options**, **Tags**, and **Screenshots**. "Save all tabs" is out of scope (see backlog: "Context Menu: Save All Tabs to Folder" for GitSyncMarks bookmarks).

---

## Linkwarden API Overview

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/v1/links` | POST | Create a new link (url, name, collectionId, tags) |
| `/api/v1/links/:id/archive` | PUT | Update link archive metadata |
| `/api/v1/archives/:linkId` | POST | Upload file (PNG, JPEG, PDF) to link archive |
| `/api/v1/collections` | GET | List collections (for dropdown) |
| `/api/v1/tags` | GET | List tags (for autocomplete) |

**Authentication:** Bearer JWT (API key or login token).

**Docs:** [Linkwarden API](https://docs.linkwarden.app/api/api-introduction)

---

## What: Feature Scope

### 1. Context Menu

- **Save to Linkwarden** — Save current page or right-clicked link
- **Save to Linkwarden (with screenshot)** — Same, plus capture visible viewport and upload as archive

Both entries appear under the GitSyncMarks parent. Contexts: `page`, `link`.

### 2. Options Tab: Linkwarden

New tab in options (between Files and Help):

| Field | Type | Description |
|-------|------|-------------|
| Instance URL | text | Base URL (e.g. `https://cloud.linkwarden.app` or self-hosted) |
| API Key | password | JWT / API token (from Linkwarden Settings → API) |
| Default collection | dropdown | Optional; pre-select collection when saving |
| Default tags | text | Comma-separated tags applied by default |
| Enable Linkwarden | checkbox | Master switch; hides context menu if off |

**Test connection** button: `GET /api/v1/user` or similar to verify auth.

### 3. Save Flow (with Options)

When user clicks "Save to Linkwarden":

- **Quick save:** Use URL + title from context; apply default collection and tags from options
- **Optional dialog:** Popup/side-panel to edit title, add/remove tags, pick collection before save (like official extension)

Decision: Start with **quick save** (no dialog); add optional "Edit before save" in a later iteration.

### 4. Tags

- **Default tags:** Stored in options, applied to every save
- **Per-save tags:** If "Edit before save" dialog is implemented, user can add/remove tags per link
- **Tag API:** `GET /api/v1/tags` to fetch existing tags for autocomplete (optional enhancement)

### 5. Screenshots

- **Capture:** Use `chrome.tabs.captureVisibleTab()` (requires `activeTab`; already present)
- **Flow:** 1) Create link via `POST /api/v1/links`; 2) Upload screenshot via `POST /api/v1/archives/:linkId` (multipart/form-data, PNG)
- **Scope:** Visible viewport only (no full-page scroll capture in MVP)

---

## How: Technical Implementation

### File Structure

```
lib/
  linkwarden-api.js    # API client: saveLink, uploadScreenshot, getCollections, getTags
  context-menu.js      # Add Save to Linkwarden, Save with Screenshot handlers
options.html           # New tab: Linkwarden
options.js             # Linkwarden tab logic, storage, test connection
manifest.json          # optional_host_permissions for user's Linkwarden URL
_locales/*/messages.json  # linkwarden_*, contextMenu_saveToLinkwarden, etc.
```

### Storage Keys

| Key | Type | Description |
|-----|------|-------------|
| `linkwardenUrl` | string | Instance base URL |
| `linkwardenToken` | string | Encrypted API key (reuse `encryptToken`/`decryptToken` from crypto.js) |
| `linkwardenEnabled` | boolean | Feature on/off |
| `linkwardenDefaultCollectionId` | string | Optional default collection |
| `linkwardenDefaultTags` | string | Comma-separated default tags |

### API Client (`lib/linkwarden-api.js`)

```javascript
// saveLink(baseUrl, token, { url, name, collectionId?, tags? })
// uploadScreenshot(baseUrl, token, linkId, blob)
// getCollections(baseUrl, token)
// getTags(baseUrl, token)
// testConnection(baseUrl, token)
```

### Context Menu Handler

In `handleContextMenuClick`:

- `gitsyncmarks-save-linkwarden` → `saveToLinkwarden(info, tab, { withScreenshot: false })`
- `gitsyncmarks-save-linkwarden-screenshot` → `saveToLinkwarden(info, tab, { withScreenshot: true })`

`saveToLinkwarden`:

1. Get URL from `info.linkUrl || tab.url`, title from `tab.title` or derived
2. If `withScreenshot`: `chrome.tabs.captureVisibleTab()` → PNG blob
3. `POST /api/v1/links` with url, name, collectionId, tags
4. If screenshot: `POST /api/v1/archives/:linkId` with blob
5. Notify success/failure

### Host Permissions

Linkwarden is self-hosted; users have different instance URLs. Use `optional_host_permissions`:

```json
"optional_host_permissions": ["https://*/*", "http://*/*"]
```

On first save or when user configures Linkwarden: `chrome.permissions.request({ origins: [baseUrl + '/*'] })`.

### Screenshot Capture

```javascript
const dataUrl = await chrome.tabs.captureVisibleTab(null, { format: 'png' });
// Convert data URL to Blob for fetch
const blob = await (await fetch(dataUrl)).blob();
```

---

## Where: UI and Entry Points

| Location | What |
|----------|------|
| **Context menu** | GitSyncMarks → Save to Linkwarden; Save to Linkwarden (with screenshot) |
| **Options** | New tab "Linkwarden" (tab bar) |
| **Options → Linkwarden** | Instance URL, API Key, Default collection, Default tags, Enable checkbox, Test connection |
| **Notifications** | Success: "Link saved to Linkwarden"; Error: "Linkwarden: [reason]" |

---

## Permissions

| Permission | Purpose |
|------------|---------|
| `optional_host_permissions: ["https://*/*", "http://*/*"]` | Access user's Linkwarden instance |
| `activeTab` | Already present; used for `captureVisibleTab` |
| `scripting` | Already present |

---

## Documentation Updates (on Implementation)

- [ARCHITECTURE.md](ARCHITECTURE.md) — Add `lib/linkwarden-api.js`, context menu entries, options tab
- [DATA-FLOW.md](DATA-FLOW.md) — Linkwarden save flow
- [PRIVACY.md](../PRIVACY.md) — optional_host_permissions, Linkwarden data
- [store-assets/chrome-meta.md](../store-assets/chrome-meta.md) — Permission justification
- [scripts/generate-screenshots.js](../scripts/generate-screenshots.js) — Add Linkwarden tab to OPTIONS_TABS

---

## Effort Estimate

| Component | Effort |
|-----------|--------|
| lib/linkwarden-api.js | Medium |
| Context menu + handlers | Small |
| Options tab (Linkwarden) | Medium |
| Screenshot capture + upload | Medium |
| i18n (12 locales) | Small |
| Docs, store assets | Small |
| **Total** | **Medium–Large** (~2–3 days) |

---

## Out of Scope (MVP)

- Save all tabs to Linkwarden
- Username/password login (API key only for MVP)
- Full-page screenshot (scroll capture)
- AI tagging (official extension has this; not planned for GitSyncMarks)
