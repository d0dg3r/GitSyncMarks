# Open Points

Open items and next steps for further development. Updated each session.

---

## Current Status (v2.4.0 *R2-D2*)

- **v2.4.0** *R2-D2* – Settings sync to Git (encrypted, Global or Individual mode with device config import); RSS feed export (`feed.xml`); generated files mode selector (Off/Manual/Auto per file with "Generate now" button); backlog voting awareness in Help tab and README; Debug Log moved to Sync tab
- **v2.3.0** *Data* – Encrypted settings export (password-protected .enc); plain JSON and encrypted supported; import with password prompt; Sync tab shortened to "Sync"; store screenshots improved; import hints (bookmarks = active profile, settings = all profiles); theme cycle button; full auto-save (no Save buttons); GitHub Repos moved to Sync tab
- **v2.2.1** – Sync feedback message fix; state regression fix (stale fetch guard, cache-busting); debug log extended with commit hashes
- **GitHub Repos folder** – Implemented (toggle, position, refresh; synced via normal bookmark sync)
- **Multiple Sync Profiles** – Implemented (profile manager, migration, CRUD, switchProfile, options UI, loading indicator, profile limit display)
- **Profile Onboarding** – Implemented: Test Connection checks path; offers create folder when empty, pull when bookmarks exist
- **Profile Add** – Auto-switch to new profile on add
- **Profile Switch UX** – Inline confirmation, toggle "Switch without confirmation", redesigned layout
- **Popup Overhaul** – Header with profile dropdown; simplified status area; theme-aware spinner; compact footer; shorter pull success message ("Loaded from GitHub.")
- **Keyboard Shortcuts** – Quick sync (Ctrl+Shift+.), open options (Ctrl+Shift+,)
- **Help Tab** – Collapsible accordion, "Why slow?" second, Getting Started + Links open by default; compact styling
- **Options Header** – Language label removed, dropdown only
- **Auto-save** – Switches save on change; Update GitHub Repos and Test Connection save before running
- **Compact Options UI** – All tabs (GitHub, Sync, Files, Help, About) use consistent compact styling
- **Tab reorganization** – Reduced from 6 tabs to 5; Backup and Automation merged into new Files tab with compact dropdown export/import UI; GitHub Repos moved to GitHub tab

---

## Open Points

### Backup (Import/Export)

- **Settings export/import:** Round-trip fixed – import now restores `profileSwitchWithoutConfirm` and per-profile GitHub Repos fields. Legacy format migration supported.
- **Bookmark export/import:** Exports all browser bookmarks; import replaces local bookmarks. Clarify whether per-profile export (e.g. "export current profile only") is needed, and how import interacts with multiple profiles.

---

## Next Steps

1. [x] RSS feed export (`feed.xml`) implemented
2. [x] Generated files mode selector (Off/Manual/Auto) implemented
3. [x] Backlog voting awareness (Help tab + README)
4. [x] Debug Log moved to Sync tab
5. [x] Settings sync to Git (encrypted `settings.enc`)
6. [ ] Test on Chrome, Firefox Desktop, Firefox Android
6. [ ] Tag v2.4.0, publish release (manifest, CHANGELOG, docs updated)
7. [ ] Submit to Chrome Web Store and Firefox Add-ons with updated store descriptions

---

## Usage

- When continuing: read this file as entry point.
- Move completed items to a "Done" section or remove them.
- Add new open points here.
