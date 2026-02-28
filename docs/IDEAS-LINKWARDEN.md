# Linkwarden Integration – Specification

**Status:** Planned for v2.6.0  
**Reference:** [Linkwarden Browser Extension](https://github.com/linkwarden/browser-extension)  
**Created:** February 2026

---

## Scope

Context menu integration to save links to Linkwarden. Parity with the official extension: instance URL + API key, tags, screenshots. "Save all tabs" excluded (see backlog: Context Menu Save All Tabs to Folder).

---

## Official Extension Reference

| Feature | Description |
|---------|-------------|
| Save link | Add page or link to Linkwarden |
| Options | Instance URL, API key or username/password |
| Tags | Per-link keywords |
| Screenshots | Capture viewport, upload to archive |
| Save all tabs | Save all open tabs |

AI tagging runs on the Linkwarden server (Ollama, OpenAI, Anthropic). Links saved via the extension are tagged server-side if enabled in the instance. No extension implementation required.

---

## Linkwarden API

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/v1/links` | POST | Create link (url, name, collectionId, tags) |
| `/api/v1/links/:id/archive` | PUT | Update archive metadata |
| `/api/v1/archives/:linkId` | POST | Upload file (PNG, JPEG, PDF) |
| `/api/v1/collections` | GET | List collections |
| `/api/v1/tags` | GET | List tags |

Auth: Bearer JWT. [API docs](https://docs.linkwarden.app/api/api-introduction)

---

## Feature Scope

### Context Menu

- **Save to Linkwarden** — Current page or right-clicked link
- **Save to Linkwarden (with screenshot)** — Same + viewport capture, upload to archive

Both under GitSyncMarks parent. Contexts: `page`, `link`.

### Options Tab: Linkwarden

New tab (between Files and Help):

| Field | Type | Description |
|-------|------|-------------|
| Instance URL | text | Base URL (e.g. `https://cloud.linkwarden.app`) |
| API Key | password | JWT from Linkwarden Settings → API |
| Default collection | dropdown | Optional |
| Default tags | text | Comma-separated, applied to every save |
| Enable Linkwarden | checkbox | Master switch; hides context menu when off |

Test connection: `GET /api/v1/user` or equivalent.

### Save Flow

MVP: Quick save — URL + title from context, default collection and tags from options. Optional "Edit before save" dialog deferred.

### Tags

Default tags in options, applied on every save. Per-save editing if dialog added later. `GET /api/v1/tags` for autocomplete (optional).

### Screenshots

`chrome.tabs.captureVisibleTab()` → PNG blob. Flow: create link → upload via `POST /api/v1/archives/:linkId`. Viewport only; no full-page capture.

---

## Implementation

### File Structure

```
lib/linkwarden-api.js    # saveLink, uploadScreenshot, getCollections, getTags, testConnection
lib/context-menu.js      # Save to Linkwarden handlers
options.html             # Linkwarden tab
options.js               # Tab logic, storage, test connection
manifest.json            # optional_host_permissions
_locales/*/messages.json # linkwarden_*, contextMenu_saveToLinkwarden
```

### Storage Keys

| Key | Type | Description |
|-----|------|-------------|
| `linkwardenUrl` | string | Instance base URL |
| `linkwardenToken` | string | Encrypted (encryptToken/decryptToken from crypto.js) |
| `linkwardenEnabled` | boolean | Feature on/off |
| `linkwardenDefaultCollectionId` | string | Optional |
| `linkwardenDefaultTags` | string | Comma-separated |

### API Client

```javascript
saveLink(baseUrl, token, { url, name, collectionId?, tags? })
uploadScreenshot(baseUrl, token, linkId, blob)
getCollections(baseUrl, token)
getTags(baseUrl, token)
testConnection(baseUrl, token)
```

### Context Menu Handler

- `gitsyncmarks-save-linkwarden` → `saveToLinkwarden(info, tab, { withScreenshot: false })`
- `gitsyncmarks-save-linkwarden-screenshot` → `saveToLinkwarden(info, tab, { withScreenshot: true })`

`saveToLinkwarden`: URL from `info.linkUrl || tab.url`, title from `tab.title`; if screenshot: capture → create link → upload blob; notify.

### Host Permissions

Self-hosted instances → `optional_host_permissions: ["https://*/*", "http://*/*"]`. On config or first save: `chrome.permissions.request({ origins: [baseUrl + '/*'] })`.

### Screenshot Capture

```javascript
const dataUrl = await chrome.tabs.captureVisibleTab(null, { format: 'png' });
const blob = await (await fetch(dataUrl)).blob();
```

---

## UI Entry Points

| Location | Content |
|----------|---------|
| Context menu | GitSyncMarks → Save to Linkwarden; Save with screenshot |
| Options | Tab "Linkwarden" |
| Notifications | Success / error messages |

---

## Permissions

| Permission | Purpose |
|------------|---------|
| `optional_host_permissions` | User's Linkwarden instance |
| `activeTab` | captureVisibleTab |
| `scripting` | Already present |

---

## Docs to Update (on Implementation)

- [ARCHITECTURE.md](ARCHITECTURE.md) — linkwarden-api.js, context menu, options tab
- [DATA-FLOW.md](DATA-FLOW.md) — save flow
- [PRIVACY.md](../PRIVACY.md) — optional_host_permissions
- [store-assets/chrome-meta.md](../store-assets/chrome-meta.md) — permission justification
- [scripts/generate-screenshots.js](../scripts/generate-screenshots.js) — OPTIONS_TABS

---

## Effort

| Component | Effort |
|-----------|--------|
| linkwarden-api.js | Medium |
| Context menu | Small |
| Options tab | Medium |
| Screenshot | Medium |
| i18n | Small |
| **Total** | ~2–3 days |

---

## Phase 2: Sync Linkwarden ↔ Bookmarks

Sync selected collections or tags into dedicated bookmark folders.

### Option A: One-Way (Linkwarden → Bookmarks, Read-Only)

| Aspect | Description |
|--------|-------------|
| Direction | Linkwarden → bookmarks only |
| Folders | Dedicated (e.g. "Linkwarden" root, subfolders per collection/tag) |
| Read-only | Browser changes (delete, move) do not sync back |
| Mapping | Collections/tags → target folder(s) |
| Trigger | Periodic alarm or manual button |
| Effort | Medium |

### Option B: Two-Way Sync

| Aspect | Description |
|--------|-------------|
| Direction | Bidirectional |
| Browser → Linkwarden | Add → create link; delete → delete link; move → update collection |
| Linkwarden → Browser | Add/delete/update reflected in folder |
| Conflict resolution | Required (e.g. last-write-wins) |
| Effort | Large |

API: `POST/PUT/DELETE /api/v1/links`, `GET /api/v1/links` (filter by collection/tags).

Challenges: Data model mismatch (bookmarks vs collections+tags); identity by URL; merge logic.

### Phasing

1. **Phase 1 (v2.6.0):** Save to Linkwarden only
2. **Phase 2:** One-way sync
3. **Phase 3:** Two-way sync (optional)

### Storage for Sync (Phase 2+)

| Key | Type | Description |
|-----|------|-------------|
| `linkwardenSyncEnabled` | boolean | Enable sync |
| `linkwardenSyncMappings` | array | `[{ collectionId?, tagIds?, targetFolderId }]` |
| `linkwardenSyncReadOnly` | boolean | Option A: true |
| `linkwardenSyncInterval` | number | Minutes (0 = manual only) |

---

## Out of Scope (MVP)

- Save all tabs to Linkwarden
- Username/password login (API key only)
- Full-page screenshot (scroll capture)
