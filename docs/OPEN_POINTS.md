# Open Points

Open items and next steps for further development. Updated each session.

---

## Current Status (v2.3.0 *Data*)

- **v2.3.0** – Encrypted settings export (password-protected .enc); plain JSON and encrypted supported; import with password prompt; Sync tab shortened to "Sync"; store screenshots improved; import hints (bookmarks = active profile, settings = all profiles); theme cycle button; full auto-save (no Save buttons); GitHub Repos moved to Sync tab
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
- **Compact Options UI** – All tabs (GitHub, Sync, Backup, Automation, Help, About) use consistent compact styling
- **Backup tab** – Compact design (automation-block style), shorter i18n in all languages

---

## Open Points

### Backup (Import/Export)

- **Settings export/import:** Round-trip fixed – import now restores `profileSwitchWithoutConfirm` and per-profile GitHub Repos fields. Legacy format migration supported.
- **Bookmark export/import:** Exports all browser bookmarks; import replaces local bookmarks. Clarify whether per-profile export (e.g. "export current profile only") is needed, and how import interacts with multiple profiles.

---

## Next Steps

1. [ ] Test on Chrome, Firefox Desktop, Firefox Android
2. [ ] Tag v2.3.0, publish release (manifest, CHANGELOG, docs updated)
3. [ ] Submit to Chrome Web Store and Firefox Add-ons with updated store descriptions
4. [ ] Work on v2.4.0 (browser import files) or backlog

---

## Usage

- When continuing: read this file as entry point.
- Move completed items to a "Done" section or remove them.
- Add new open points here.
