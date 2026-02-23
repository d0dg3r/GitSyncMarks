# Dashy Import + Template-Merge – Idea for Future Implementation

**Status:** Idea documented, no implementation planned.  
**Created:** February 2025

---

## Goal

Two related features that improve the Dashy integration:

- **Feature A (Import):** Import a `dashy-conf.yml` file as a bookmark source — sections become bookmark folders, items become bookmarks.
- **Feature B (Template-Merge):** When generating `dashy-conf.yml` during sync/export, merge with the existing file in the repo instead of overwriting it. Preserves Dashy-specific metadata (icon URLs, descriptions, statusCheck, displayData, pageInfo, appConfig) that bookmarks cannot represent.

---

## Motivation

The current Dashy export (`fileMapToDashyYaml()` in `lib/bookmark-serializer.js`) generates a minimal YAML with only `{title, url, icon: favicon}` per item. Users who maintain a rich Dashy config with custom icons, descriptions, status checks, and layout settings lose all of that on every sync.

A real-world Dashy config contains per-item fields like `icon` (actual favicon URL), `description`, `target`, `statusCheck`, `statusCheckAllowInsecure`, `statusCheckAcceptCodes`, `id`, and per-section fields like `displayData` (sortBy, rows, cols, collapsed), plus global blocks (`pageInfo`, `appConfig`) with theme, language, auth, and layout settings.

---

## Feature A: Dashy Import

### Mapping

| Dashy | Bookmark |
|-------|----------|
| `sections[].name` | Bookmark folder |
| `sections[].items[].title` | Bookmark title |
| `sections[].items[].url` | Bookmark URL |
| `sections[].items[].description` | *(lost — bookmarks only store title + url)* |
| `sections[].items[].icon` | *(lost)* |
| `pageInfo`, `appConfig` | *(ignored)* |

### Implementation

- New function `dashyYamlToRoleMap(yamlString)` in `lib/bookmark-serializer.js`
- Returns a `roleMap` compatible with `replaceLocalBookmarks()`
- All sections map to folders under `toolbar` (Bookmarks Bar) by default
- Nested section names containing ` > ` separators could optionally create nested folders

### UI

- New import type "Dashy Config (YAML)" in the Files > Export/Import dropdown
- File input accepts `.yml` / `.yaml` in addition to `.json` / `.enc`
- Same "replaces all bookmarks" warning as JSON import

### Open Questions

- Should import replace all bookmarks (like JSON import) or merge additively?
- Where should sections land — under Bookmarks Bar (toolbar) or Other Bookmarks (other)?
- Handle `>` separator in section names: create nested folders or keep flat?
- `filteredItems` arrays in Dashy configs use YAML anchors (`*ref_0`) — the parser must handle or ignore them

---

## Feature B: Template-Merge on Export

### Merge Strategy

The merge uses **URL as the stable key** (normalized: lowercase host, trailing slash removed).

```
For each bookmark in the current sync:
  1. Normalize the URL
  2. Look up the URL in the existing dashy-conf.yml
  3. MATCH   → Take title from bookmark, keep all Dashy fields
               (icon, description, statusCheck, target, id, etc.)
  4. NO MATCH → New item with {title, url, icon: favicon}

For each item in the existing dashy-conf.yml:
  5. URL no longer exists in bookmarks → Remove the item

Section mapping:
  6. Match bookmark folders to Dashy sections by name
  7. New folders → new sections (minimal displayData)
  8. Existing sections keep their displayData (sortBy, rows, cols, collapsed)
  9. pageInfo and appConfig blocks pass through unchanged
```

### Implementation

- Extend `fileMapToDashyYaml(files, basePath, existingYaml = null)` with optional third parameter
- When `existingYaml` is provided: parse it, build a URL→metadata index, merge
- When `existingYaml` is `null`: current behavior (generate from scratch)

### Wiring in sync-engine.js

In `push()`, `sync()`, and `generateFilesNow()`, read the existing `dashy-conf.yml` from the remote file map or the `lastSyncFiles` cache and pass it to the export function:

```javascript
if (settings.generateDashyYml === 'auto') {
  const existingYaml = remoteFiles?.[`${basePath}/dashy-conf.yml`] || null;
  fileChanges[`${basePath}/dashy-conf.yml`] = fileMapToDashyYaml(localFiles, basePath, existingYaml);
}
```

For `push()`, where the remote file map is not available, read from `lastSyncFiles` cache or fetch the single file via the GitHub API.

---

## YAML Parsing

The extension has no build system and no bundler, so adding a dependency like `js-yaml` (~60 KB) needs consideration.

### Option 1: Minimal Custom Parser

Write a Dashy-specific parser that only extracts the structure needed:
- Top-level blocks: `pageInfo`, `appConfig`, `sections`
- Per section: `name`, `displayData`, `icon`, `items[]`
- Per item: `title`, `url`, `icon`, `description`, `target`, `statusCheck*`, `id`
- Everything else passed through as raw string blocks

**Pro:** No dependency, small footprint.  
**Con:** Fragile, YAML anchors (`&ref_0` / `*ref_0`) and multi-line strings (`>-`) are hard to handle correctly.

### Option 2: js-yaml Library

Add `js-yaml` as a vendored file or load it at parse time.

**Pro:** Correct YAML parsing including anchors, multi-line, and edge cases.  
**Con:** 60 KB additional code in the extension bundle.

### Recommendation

For **import** (Feature A), a proper YAML parser is strongly recommended because real-world Dashy configs use anchors extensively (e.g. `filteredItems` referencing `items` via `*ref_0`).

For **template-merge** (Feature B), the parser only needs to read the existing file; writing is done with the existing string builder. A hybrid approach could work: use `js-yaml` for reading, keep the custom string builder for writing.

---

## Affected Files

| File | Changes |
|------|---------|
| `lib/bookmark-serializer.js` | New `dashyYamlToRoleMap()`, extend `fileMapToDashyYaml()` with merge logic |
| `lib/sync-engine.js` | Pass existing YAML to export in `push()`, `sync()`, `generateFilesNow()` |
| `options.js` | Handle `type === 'dashy'` in import handler |
| `options.html` | New import type option, extend file input accept |
| `_locales/*/messages.json` | New i18n keys (12 languages) |
| `lib/yaml-parser.js` *(new)* | Minimal YAML parser or vendored `js-yaml` |

---

## Effort Estimate

| Part | Estimate |
|------|----------|
| YAML parser decision + implementation | 2–3 h |
| Feature A (import function + UI) | 2–3 h |
| Feature B (merge logic + sync wiring) | 3–4 h |
| i18n (12 languages) | 1 h |
| Testing | 1–2 h |
| **Total** | **9–13 h** |

---

## Example: Before and After Template-Merge

### Before (current export — overwrites everything)

```yaml
sections:
  - name: Infrastruktur
    items:
      - title: Tower
        url: "https://tower.lan"
        icon: favicon
      - title: Zerotier Master
        url: "https://my.zerotier.com/network/60ee7c034ae4a334"
        icon: favicon
```

### After (template-merge — preserves metadata)

```yaml
pageInfo:
  title: "d0dg3r's world"
  description: "WTF, where is everything?"
appConfig:
  theme: tiger
  layout: auto
  iconSize: small
sections:
  - name: Infrastruktur
    displayData:
      sortBy: alphabetical
      rows: 1
      cols: 1
    items:
      - title: Tower
        description: Ansible Semaphore
        icon: "https://docs.ansible.com/.../Ansible-Mark-RGB_Black.png"
        url: "https://tower.lan"
        target: newtab
        statusCheckAllowInsecure: true
        id: 0_1412_tower
      - title: Zerotier Master
        icon: "https://my.zerotier.com/img/favicon-32x32.png"
        url: "https://my.zerotier.com/network/60ee7c034ae4a334"
        target: newtab
        statusCheckAllowInsecure: true
        id: 1_1412_zerotiermaster
      - title: New Bookmark Added in Browser
        url: "https://example.com/new"
        icon: favicon
```
