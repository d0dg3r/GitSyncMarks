---
name: gitsyncmarks-release-and-store
description: GitSyncMarks release, Chrome Web Store / Firefox AMO compliance, store listing copy, What's New overlay, and bookmark automation (_order.json). Use when preparing releases, fixing store rejections, updating store-assets or manifest descriptions, add-bookmark workflow, or aligning automation docs/copy.
---

# GitSyncMarks — Release, Store & Automation

Project-specific knowledge from store submissions (3.0.x), AMO validation, and automation fixes. Complements `.cursor/rules/` (release-pre-check, documentation-sync, english-only-default).

## Quick decision tree

| User asks about… | Start here |
|------------------|------------|
| Release / tag / version bump | [Release checklist](#release-checklist) |
| CWS rejection (keyword stuffing, platform names) | [Chrome Web Store](#chrome-web-store-cws) |
| AMO innerHTML / addons-linter | [Firefox AMO](#firefox-amo) |
| add-bookmark.yml / external JSON / greenfield repo | [Bookmark automation](#bookmark-automation) |
| Users missed 3.0 features after rejected store builds | [What's New overlay](#whats-new-overlay) |
| Store copy / README / Help / i18n | [Copy & docs sync](#copy-and-docs-sync) |

---

## Release checklist

Run **before** tagging (see also `.cursor/rules/release-pre-check.mdc`):

1. Same `"version"` in `manifest.json`, `manifest.firefox.json`, `package.json`
2. `CHANGELOG.md` + `docs/RELEASE.md` version history
3. Clean tree on `main`, tag `vX.Y.Z` not yet created
4. `npm run build` (Chrome + Firefox ZIPs)
5. UI changed → `npm run screenshots` → commit `store-assets/`
6. `npm run test:unit`; optional `npm run test:e2e:smoke`
7. **CWS**: re-scan store text + dashboard permission justifications (see below)
8. Ask user before commit/tag; push tag triggers `release.yml`

**Version assignment:** Released tags are fixed. Work on `develop/X.Y.Z` or `release/vX.Y.Z` belongs to the next patch/minor, not an already-tagged version.

---

## Chrome Web Store (CWS)

Google rejected 3.0.0–3.0.2 for **Keyword Stuffing** (Violation ID: Yellow Argon). Interpretation tightened over submissions:

### Rules (apply to **all** listing fields + developer dashboard)

1. **No more than five platform/product names** in any single field (description, single purpose, permission justifications, etc.)
2. **Do not enumerate Git hosts** in store copy — use generic wording ("your Git provider", "self-hosted Git server")
3. **Link out** for the full provider list: [docs/PROVIDERS.md](../../docs/PROVIDERS.md) (in repo README / store text where allowed)
4. **Avoid repeating** the same provider or brand names across bullets
5. **No browser or OS names** (Chrome, Firefox, Windows, …) — use "browser" / "operating system"
6. Permission justifications in the **developer console** count toward the same limits — rewrite those too, not only `store-assets/`

### Safe automation bullet (English reference)

> Automation: Add bookmark JSON to your repo via git or the included GitHub Action template; the extension imports them on the next sync.

- "git" covers GitLab, Codeberg, self-hosted
- "GitHub Action template" is accurate (users copy `.github/workflows/add-bookmark.yml`)
- **Do not** say "CLI tools" or vague "CI/CD workflows" — there is no bundled CLI

### Files to update for CWS copy changes

- `store-assets/chrome-{lang}.md` (12 locales)
- `_locales/*/messages.json` → `extDescription` (manifest description)
- `store-assets/chrome-meta.md` → Single Purpose, Permission Justifications

---

## Firefox AMO

AMO flagged **unsafe assignment to innerHTML** (3.0.1 fix).

- Use `lib/dom-utils.js`: `clearElement(el)`, `setTrustedHtml(el, htmlString)` for trusted HTML; prefer `createElement` for dynamic UI
- Gate: `npm run lint:amo` (Mozilla `addons-linter`)
- Update `store-assets/firefox-meta.md` reviewer notes when relevant

---

## Bookmark automation

### Repo structure (required for import)

```
bookmarks/
  _index.json          → {"version": 2}
  toolbar/_order.json  → [] or list of filenames + folder entries
  other/_order.json
  toolbar/my-site_a1b2.json → {"title": "...", "url": "..."}
```

### Critical behavior (`lib/bookmark-serializer.js`)

- `buildFolderChildren()` **returns `[]` if `_order.json` is missing** in that folder — sync imports nothing
- **Orphan JSON** (file exists but not listed in `_order.json`) **does import** when `_order.json` exists (even `[]`)
- Subfolder in parent `_order.json`: `{"dir": "dev-tools", "title": "Dev Tools"}`
- Filenames: `{slugify(title)}_{shortHash(url)}.json` — must match `generateFilename()` or extension renames on next push

### Minimal structure source of truth

`createMinimalBookmarkStructure()` in `lib/onboarding.js` — same as greenfield bootstrap.

### GitHub Action fix (3.0.3+)

- Script: `scripts/add-bookmark-to-repo.py` (ports slugify + FNV-1a hash from JS)
- Workflow: `.github/workflows/add-bookmark.yml` downloads script from `raw.githubusercontent.com/d0dg3r/GitSyncMarks/main/scripts/...` and runs it
- Script ensures: `_index.json`, role `_order.json`, target folder `_order.json`, appends filename, registers new subfolders in parent order
- Tests: `test/add-bookmark-script.test.js` (greenfield, subfolder, round-trip via `fileMapToBookmarkTree`)

### External add flow

```
git commit / add-bookmark.yml → repo (JSON + _order.json) → extension Sync → three-way merge → browser
```

Document in: `docs/DATA-FLOW.md` (External bookmark add), Options → Files → Git Add, Help `help_gitAdd*`.

---

## What's New overlay

**Files:** `lib/whats-new.js`, `lib/whats-new-ui.js`, `background.js` (`WHATS_NEW_STORAGE_KEY`), `test/whats-new.test.js`

### Rules

1. Every **shipped** manifest version needs an entry in `WHATS_NEW_BY_VERSION` or the overlay is silently skipped (`getWhatsNewContent` → null)
2. `shouldDisplayWhatsNew(pendingVersion, manifestVersion)` requires exact version match + non-null content
3. **Store catch-up:** If Google rejected 3.0.0–3.0.2 and users jump 2.8.x → 3.0.3, add **3.0.3** entry with 3.0 feature bullets (duplicate/adapt 3.0.0 copy) so users see multi-provider etc.

### Manual test

Set `chrome.storage.local.showWhatsNewForVersion = "3.0.3"`, open popup → overlay shows.

---

## Copy and docs sync

When changing behavior or store-facing text, update **in the same PR** (see `.cursor/rules/documentation-sync.mdc`):

| Change | Update |
|--------|--------|
| Automation / Git Add | `_locales/en/messages.json` (`options_automation*`, `help_gitAdd*`), `options.html`, README, 12× `store-assets/chrome-*.md` + `firefox-*.md`, `docs/DATA-FLOW.md`, `CHANGELOG.md` |
| New feature / UI | README, store en files, Help tab, `help_*` keys, screenshots if UI changed |
| Bug / behavior fix | `CHANGELOG.md`, relevant docs |
| Release | `CHANGELOG.md`, `docs/RELEASE.md` |

English first for new keys; other locales may fall back to English in patch releases (note in CHANGELOG).

---

## Verification commands

```bash
grep '"version"' manifest.json manifest.firefox.json package.json
npm run test:unit
npm run build
npm run lint:amo          # Firefox innerHTML / manifest
npm run lint              # ESLint
# Automation script smoke:
python3 scripts/add-bookmark-to-repo.py --url https://example.com --title Example --base-path /tmp/gsm-test/bookmarks
```

---

## Additional reference

- Detailed CWS rejection timeline and file map: [reference.md](reference.md)
- Architecture pointers: [docs/ARCHITECTURE.md](../../docs/ARCHITECTURE.md)
- Data format: [docs/DATA-FLOW.md](../../docs/DATA-FLOW.md)
