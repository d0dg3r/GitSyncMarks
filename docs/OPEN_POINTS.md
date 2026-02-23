# Open Points

Open items and next steps for further development. Updated each session.

---

## Current Status (v2.5.0 *Cortana*)

- **v2.5.0** *Cortana* – Context menu (Add to Toolbar/Other, Sync Now, Switch Profile, Copy Favicon URL, Download Favicon); profile switching via context menu (radio submenu); favicon tools (copy URL / download PNG with Google fallback); 8 new languages (PT-BR, IT, JA, ZH-CN, KO, RU, TR, PL — 12 total); auto-detection improved for regional locales; translation guide (`docs/TRANSLATING.md`); store files split into per-language files with meta files; screenshots for all 12 languages; dynamic keyboard shortcuts; factory reset button; feature lists reordered by user interest; "No middleman" replaces "No server needed"
- **v2.4.0** *R2-D2* – Settings sync to Git (encrypted, Global or Individual mode with device config import); RSS feed export (`feed.xml`); generated files mode selector (Off/Manual/Auto per file with "Generate now" button); backlog voting awareness in Help tab and README; Debug Log moved to Sync tab
- **v2.3.0** *Data* – Encrypted settings export (password-protected .enc); plain JSON and encrypted supported; import with password prompt; Sync tab shortened to "Sync"; store screenshots improved; import hints (bookmarks = active profile, settings = all profiles); theme cycle button; full auto-save (no Save buttons)
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
- **Tab reorganization** – Reduced from 6 tabs to 5; Backup and Automation merged into new Files tab with compact dropdown export/import UI; sub-tab navigation for GitHub (Profile, Connection, Repos) and Files (Generated, Settings, Export/Import, Git Add); Help quick links restyled as pill buttons; GitHub Repos in GitHub → Repos sub-tab

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
6. [x] Tab reorganization (5 tabs, sub-tabs for GitHub and Files)
7. [x] Store screenshots updated (6 per language)
8. [x] v2.4.0 released
9. [x] Context menu (Add to Toolbar/Other, Sync Now, Copy Favicon URL, Download Favicon)
10. [x] 8 new languages (12 total); regional locale auto-detection
11. [x] Store files split into per-language files with meta files
12. [x] Screenshots for all 12 languages (144 images)
13. [x] Translation guide (`docs/TRANSLATING.md`)
14. [x] Profile switching via context menu (radio submenu, dynamic refresh)
15. [x] Favicon tools documented as standalone feature
16. [x] Dynamic keyboard shortcuts (chrome.commands.getAll)
17. [x] Factory reset button (Files → Settings)
18. [x] Feature lists reordered by user interest; "No middleman" replaces "No server needed"
19. [ ] Test on Chrome, Firefox Desktop, Firefox Android
20. [ ] Tag v2.5.0, publish release
21. [ ] Submit to Chrome Web Store and Firefox Add-ons with updated store descriptions

---

## Usage

- When continuing: read this file as entry point.
- Move completed items to a "Done" section or remove them.
- Add new open points here.
