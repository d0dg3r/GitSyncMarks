# Tab-Profile – Idea for Future Implementation

**Status:** Idea documented, no implementation planned.  
**Created:** February 2025

---

## Goal

**Tab-Profiles** = named sets of URLs (e.g. "Work", "Morning routine"). When selected: open all URLs as tabs – either **in the current window** (replace or append) or **in a new window**.

---

## Decided Design Choices

| Decision | Choice |
|----------|--------|
| **Source** | All three: Bookmark folder, Save current tabs, Manual |
| **Scope** | Tab-profiles are global (independent of sync profile) |
| **Storage** | In repo (`tab-profiles.json`) – sync with GitHub |
| **In current window** | Both selectable: Replace or Append |
| **Permissions** | `tabs` will be added (acceptable) |
| **Folder picker** | Tree view |

### Sources in Detail

- **Bookmark folder**: Tree picker → User selects folder, all URLs within it (recursive) = tab set. When opening: read URLs fresh from `chrome.bookmarks.getChildren()` (folder may have changed).
- **Save current tabs**: Button "Save current tabs" – stores all URLs of open tabs as a fixed profile. Requires `tabs` permission.
- **Manual**: Add URLs one by one or paste, edit the list.

### In Current Window – Both Modes

- **Replace**: Close all tabs in the window → open tab-profile tabs.
- **Append**: Add tab-profile tabs at the end (existing tabs remain).

UI: On "Open in current window" click → sub-dialog or dropdown: "Replace" / "Append".

---

## Technical Components

### Permissions

- **tabs**: For "In current window" (query/close tabs) and "Save current tabs".
- **windows**: For `chrome.windows.create()` – often implicit already.

Currently in manifest.json: `bookmarks`, `storage`, `alarms`, `notifications` – `tabs` needs to be added.

### Browser APIs

```javascript
// New window with multiple tabs
chrome.windows.create({ url: ['https://a.com', 'https://b.com', 'https://c.com'] });

// In current window (with tabs permission)
const win = await chrome.windows.getCurrent();
const tabs = await chrome.tabs.query({ windowId: win.id });
await chrome.tabs.remove(tabs.map(t => t.id));
for (const u of urls) {
  await chrome.tabs.create({ windowId: win.id, url: u });
}
```

### Data Model (in repo: tab-profiles.json)

File in bookmark root, e.g. `bookmarks/tab-profiles.json` (depends on `filePath` setting).

```json
{
  "version": 1,
  "profiles": [
    {
      "id": "uuid",
      "name": "Work",
      "source": "bookmarkFolder",
      "bookmarkFolderId": "xyz",
      "urls": []
    },
    {
      "id": "uuid2",
      "name": "Morning",
      "source": "manual",
      "urls": [
        { "url": "https://news.example.com", "title": "News" },
        { "url": "https://reddit.com", "title": "Reddit" }
      ]
    },
    {
      "id": "uuid3",
      "name": "Saved yesterday",
      "source": "savedTabs",
      "urls": [...]
    }
  ]
}
```

- `source: "bookmarkFolder"`: `bookmarkFolderId` present. When opening: read URLs from `chrome.bookmarks.getChildren()`. Firefox: folder ID may differ – consider path as fallback.
- `source: "manual"` / `"savedTabs"`: fixed `urls` list.

### Sync Logic

- Tab-profiles in the same push/pull cycle as bookmarks.
- `tab-profiles.json` as separate file in the same commit.
- Three-way merge: `lastSyncFiles` includes `tab-profiles.json`.

### Folder Picker: Tree View

- `chrome.bookmarks.getTree()` → recursive tree.
- UI: Indented list (ul/li). Each folder clickable, shows children.
- Root folders (toolbar, other) per `lib/bookmark-serializer.js`.

---

## UI Components

### Options Page

- New tab "Tab-Profiles" next to GitHub, Sync, Backup, …
- Profile list: name, URL count, actions (Edit, Delete, Open).
- "+ Add tab profile": Name, source (3 options), for bookmark folder: tree picker.
- Per profile: "Open in current window" (Replace/Append) / "Open in new window".

### Popup (optional)

- Dropdown "Open tab profile" with favorites + "More in settings" link.

---

## Implementation Steps (when implementing)

1. Manifest: add `tabs` to manifest.json and manifest.firefox.json
2. `lib/tab-profiles.js`: loadTabProfiles, saveTabProfiles (repo), openInCurrentWindow, openInNewWindow
3. Sync engine: include tab-profiles.json in file map and three-way merge
4. Options: New "Tab-Profiles" tab with tree picker, 3 sources, open buttons
5. background.js: Message handlers openTabProfile, saveTabProfilesFromCurrentTabs
6. i18n: EN, DE, FR, ES
7. Optional: Popup quick access
