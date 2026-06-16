# GitSyncMarks — Release & Store Reference

Extended notes for agents. Read when implementing store fixes, automation changes, or release branches.

## CWS rejection timeline (3.0.x)

| Version | Issue | Fix |
|---------|-------|-----|
| 3.0.0 | Keyword stuffing — excessive Git provider name repetition | Generic language in store listings |
| 3.0.2 | Still rejected — same policy, stricter reading | Further reduced explicit provider names in descriptions + manifest `extDescription` (12 locales) |
| 3.0.3 | **Platform name limit** — more than 5 supported platform names in a field | Cap names per field; link to `docs/PROVIDERS.md`; generic browsers/OS; rewrite **dashboard permission justifications** |

Violation ID cited: **Yellow Argon** (Spam and Placement / Keyword Stuffing).

### What counts as a "platform name"

Git hosts (GitHub, GitLab, Codeberg, Gitea, Forgejo, Gogs), browsers, operating systems, and repeated brand names in bullets. Count across the whole field, not just one sentence.

### Permission justifications pattern (3.0.3)

Prefer: "configured Git provider API" / "user's Git repository" instead of listing six host names in one justification block. Host-specific rows in `chrome-meta.md` may remain if each row is one host and total visible enumeration stays within policy — when in doubt, generic + optional_host_permissions explanation.

---

## Store asset layout

```
store-assets/
  chrome-en.md … chrome-pl.md     # Per-locale listing (short + detailed description)
  firefox-en.md … firefox-pl.md
  chrome-meta.md                  # Shared CWS metadata, permissions, checklist
  firefox-meta.md                 # AMO reviewer notes
  screenshots/                    # Regenerated via npm run screenshots
```

Manifest descriptions: `_locales/{lang}/messages.json` → `extDescription`, `extDescriptionFirefox`.

---

## AMO innerHTML refactor (3.0.1)

Files touched pattern: replace `element.innerHTML = ''` with `clearElement(element)`; trusted i18n HTML with `setTrustedHtml(element, html)`; rebuild complex UI (e.g. `options/mirrors.js`) with DOM APIs.

Do **not** reintroduce raw `innerHTML` assignments in extension pages — AMO linter will flag them.

---

## Bookmark serializer ↔ automation parity

Python `scripts/add-bookmark-to-repo.py` must stay in sync with:

| JS (`lib/bookmark-serializer.js`) | Python |
|-----------------------------------|--------|
| `slugify()` | `slugify()` — NFD strip, lowercase, non-alnum → `-`, max 40 |
| `shortHash()` FNV-1a 32-bit | `short_hash()` — include UTF-16 code units for astral chars |
| `generateFilename(title, url)` | `generate_filename(title, url)` |

Verify with:

```bash
node -e "import('./lib/bookmark-serializer.js').then(m=>console.log(m.generateFilename('GitHub','https://github.com')))"
python3 -c "from scripts.add_bookmark_to_repo import generate_filename; print(generate_filename('GitHub','https://github.com'))"
# Both should print: github_1chl.json
```

Unit test `test/add-bookmark-script.test.js` runs the script and asserts `fileMapToBookmarkTree` sees the bookmark.

---

## add-bookmark.yml workflow inputs

| Input | Default | Maps to |
|-------|---------|---------|
| `url` | required | bookmark URL |
| `title` | optional | display title (URL if empty) |
| `base-path` | `bookmarks` | profile File Path setting |
| `folder` | `toolbar` | `toolbar` or `other` |
| `path` | optional | subfolder under role (e.g. `dev-tools`) |

Workflow copies template to user repo; script fetched from upstream `main` at run time.

**Trade-off:** Pinning to `main` keeps user workflows self-contained (only `.yml` copied). Alternative: embed script inline in workflow to avoid network dependency — not current design.

---

## What's New implementation details

- `background.js`: on `chrome.runtime.onInstalled` with `details.reason === 'update'`, sets `showWhatsNewForVersion` to current manifest version
- `popup.js` / `options.js`: call `mountWhatsNewIfNeeded()` from `lib/whats-new-ui.js`
- Dismiss clears storage key
- Adding a version: edit `WHATS_NEW_BY_VERSION`, add test in `test/whats-new.test.js`, document in `CHANGELOG.md` and `docs/ARCHITECTURE.md` (Post-update release notes)

---

## Release branch workflow (observed 3.0.x)

1. Work on `release/vX.Y.Z` branch
2. Open PR to `main` (e.g. PR #170 for 3.0.3)
3. CI must pass; CodeQL may block direct push to `main`
4. Merge PR, then tag `vX.Y.Z` on `main` after user approval
5. `release.yml` publishes GitHub Release with ZIPs

Combine related fixes in one patch when user wants single store submission (e.g. CWS fix + What's New catch-up + automation fix → all 3.0.3, no extra bump).

---

## Documentation cross-links

| Topic | Location |
|-------|----------|
| External bookmark add | `docs/DATA-FLOW.md` § External bookmark add |
| Orphan subfolders / `_order.json` | `docs/DATA-FLOW.md`, `docs/SYNC-LOGIC.md` |
| Workflow file tree | `docs/ARCHITECTURE.md` |
| FAQ automation | `docs/GITHUB-DISCUSSIONS.md` |
| In-app Git Add UI | `options.html` subtab `subtab-files-git-add`, `options/settings.js` |

---

## Common mistakes to avoid

1. **Claiming "CLI tools"** — no first-party CLI; only git + GitHub Action template
2. **Writing bookmark JSON without `_order.json`** in empty repos — imports fail silently
3. **Shipping manifest version without `WHATS_NEW_BY_VERSION` entry** — no overlay
4. **Listing all Git hosts in CWS description** — rejection risk
5. **Fixing store markdown but not dashboard permission text** — still rejected
6. **Non-matching automation filenames** — unnecessary rename commit on next extension sync
