# Open Points

Open items and next steps for further development. Updated each session.

---

## Current Status (v2.2.0)

- **GitHub Repos folder** – Implemented (toggle, position, refresh; synced via normal bookmark sync)
- **Multiple Sync Profiles** – Implemented (profile manager, migration, CRUD, switchProfile, options UI, loading indicator, profile limit display)
- **Profile Onboarding** – Implemented: Test Connection checks path; offers create folder when empty, pull when bookmarks exist
- **Profile Add** – Auto-switch to new profile on add
- **Profile Switch UX** – Inline confirmation, toggle "Switch without confirmation", redesigned layout
- **Popup Overhaul** – Header with profile dropdown; simplified status area; theme-aware spinner; compact footer; shorter pull success message ("Loaded from GitHub.")
- **Keyboard Shortcuts** – Quick sync (Ctrl+Shift+.), open options (Ctrl+Shift+,)
- **Help Tab** – Shortcuts and main features in options (before About)
- **Options Header** – Language label removed, dropdown only

---

## Open Points

### Backup (Import/Export)

- **Settings export/import:** Round-trip fixed – import now restores `profileSwitchWithoutConfirm` and per-profile GitHub Repos fields. Legacy format migration supported.
- **Bookmark export/import:** Exports all browser bookmarks; import replaces local bookmarks. Clarify whether per-profile export (e.g. "export current profile only") is needed, and how import interacts with multiple profiles.
- **UI:** Consider indicating which profile's data is affected when importing bookmarks.

### Other (optional)

- ~~**Profile limit:** Currently 10 profiles. Consider displaying in options.~~ Done: Shows X/10 in Profile card; Add button disabled at limit.

---

## Next Steps

1. [ ] Test on Chrome, Firefox Desktop, Firefox Android
2. [ ] Prepare release branch `release/v2.2.0` (bump version in manifest, docs/RELEASE.md already updated)
3. [ ] Tag v2.2.0, publish release

---

## Usage

- When continuing: read this file as entry point.
- Move completed items to a "Done" section or remove them.
- Add new open points here.
