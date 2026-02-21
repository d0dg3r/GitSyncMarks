# GitHub Discussions — Setup Guide

This document describes recommended categories and starter topics for the GitSyncMarks Discussions.

**Before creating the new structure:** Delete any existing discussions and categories manually (Discussions → select category → manage → delete). Start fresh so the new structure is clean.

Create categories in the repo: **Settings → General → Discussions** (enable Discussions if needed), then **Discussions → New category**.

**Release workflow:** The `.github/workflows/release.yml` automatically creates an Announcements discussion when a release is tagged. Changelog is extracted from `CHANGELOG.md` and posted. Requires the **Announcements** category to exist.

---

## Recommended Categories

| Category | Description | Emoji |
|----------|-------------|-------|
| **Announcements** | Release notes, major updates, deprecations. Only maintainers post. | 📢 |
| **General** | Welcome, introductions, off-topic, community chat | 💬 |
| **Ideas** | Feature requests, enhancement suggestions — discuss before opening issues | 💡 |
| **Q&A** | How-to questions, troubleshooting, setup help | ❓ |
| **Show and Tell** | Share your setup, workflows, repo structure, automation | ✨ |
| **Polls** | Community votes on backlog priorities — what comes next? | 🗳️ |
| **Development** | Contribution guides, architecture, technical discussion for contributors | 🔧 |

---

## Starter Topics (create manually)

### Announcements

**v2.3.0 Data — Released**

> GitSyncMarks v2.3.0 (*Data*) is out. Highlights:
> - Full auto-save: no Save buttons in GitHub and Sync tabs
> - Theme cycle button (A → Dark → Light → A)
> - GitHub Repos folder moved to Sync tab
> - Encrypted settings export (.enc) for secure backup
> - Save feedback integrated into cards
>
> [Release notes](https://github.com/d0dg3r/GitSyncMarks/releases/tag/v2.3.0) · [Changelog](../CHANGELOG.md)

---

### General

**Welcome to GitSyncMarks Discussions**

> Use this space to:
> - Introduce yourself
> - Share how you use GitSyncMarks
> - Ask questions that don't fit Ideas or Q&A
> - Discuss the project
>
> Links: [Documentation](https://github.com/d0dg3r/GitSyncMarks/tree/main/docs) · [Report a bug](https://github.com/d0dg3r/GitSyncMarks/issues) · [Releases](https://github.com/d0dg3r/GitSyncMarks/releases)

---

### Ideas

**How to suggest a feature**

> Before opening an issue:
> 1. Search existing [Ideas](https://github.com/d0dg3r/GitSyncMarks/discussions/categories/ideas) and [Issues](https://github.com/d0dg3r/GitSyncMarks/issues)
> 2. Open a Discussion here to discuss the idea
> 3. If there's support, we can create an issue for tracking
>
> See [ROADMAP.md](../ROADMAP.md) for planned features (v3.0 GLaDOS: AI features, GitLab/Gitea support).

**What's new in v2.4.0 (R2-D2)**

> - RSS feed export (`feed.xml`) — subscribe in any RSS reader
> - Generated files mode selector (Off / Manual / Auto per file)
> - Backlog voting awareness in Help tab
> - Context menu and settings sync to Git still planned
>
> What would you like to see next? Vote in the [Backlog Poll](https://github.com/d0dg3r/GitSyncMarks/discussions/37).

---

### Q&A

Q&A entries use **two steps**: (1) create the discussion with the **question** in the body, (2) add a **reply** with the **answer**.

**Getting started — setup checklist**

- **Question (post body):** "I want to sync my bookmarks with GitHub. What do I need to do to get started?"
- **Answer (reply):** 1. Create a GitHub repository (can be private). 2. Create a [Personal Access Token](https://github.com/settings/tokens/new?scopes=repo&description=GitSyncMarks) with `repo` scope. 3. In the extension: GitHub tab → enter token, owner, repo name. 4. Click **Test Connection** — create folder or pull existing bookmarks. 5. Click **Sync Now** in the popup. All settings auto-save. Profiles let you separate work/personal bookmark sets.

**Why does sync sometimes take long?**

- **Question:** "Sync is taking a long time. Why is that, and is it normal?"
- **Answer:** Each changed bookmark triggers an API call. Many changes = many calls. See Options → Help → "Why does sync sometimes take long?" for details.

**Conflict detected — what should I do?**

- **Question:** "GitSyncMarks shows \"Conflict detected\". What does that mean and how do I resolve it?"
- **Answer:** Choose **Push** (your local bookmarks win) or **Pull** (remote wins). There is no automatic merge for conflicts. Pick the side you want to keep.

**How do multiple profiles work?**

- **Question:** "What are profiles, and how do I use them to separate work and personal bookmarks?"
- **Answer:** Each profile has its own repo config (token, owner, repo, branch) and its own bookmark set. Switching profiles replaces your local bookmarks with the target profile’s bookmarks. Useful for separating work vs personal.

**Can I add bookmarks without the browser?**

- **Question:** "I want to add or edit bookmarks without opening the browser. Is that possible?"
- **Answer:** Yes. Use the [GitHub Action add-bookmark.yml](https://github.com/d0dg3r/GitSyncMarks/blob/main/.github/workflows/add-bookmark.yml) to add bookmarks via CLI or GitHub UI. You can also create/edit JSON files directly in the repo. See Options → Files tab for details.

---

### Polls

**Note:** Polls must be created manually in the GitHub web UI. The API does not support creating polls (only voting).

**Backlog — Was interessiert euch?**

Create before release planning. Results inform ROADMAP prioritization.

- **Question:** Welches Backlog-Feature soll als nächstes angegangen werden?
- **Options (from [ROADMAP.md](../ROADMAP.md)):**
  - Folder browse/select
  - Open tabs sync
  - Automation: Bulk add from URLs
  - Selective folder sync
  - AI + Bookmarks (v3.0)
  - **Etwas anderes** — Eigene Idee in [Ideas](https://github.com/d0dg3r/GitSyncMarks/discussions/categories/ideas) posten oder hier als Kommentar vorschlagen

**Poll body (discussion text):**
> Stimm ab, was als Nächstes kommen soll. Eigene Vorschläge? Öffne eine Discussion in **Ideas** oder poste sie als Kommentar hier.

**Create:** [Discussions → Polls → New discussion](https://github.com/d0dg3r/GitSyncMarks/discussions/new?category=polls)

---

### Show and Tell

**Share your bookmark repo structure**

> How do you organize your bookmarks? Share your folder structure, automation setup, or workflows. Example:
>
> ```
> bookmarks/
>   toolbar/
>     dev-tools/
>     reading/
>   other/
>     archive/
> ```

**Automation: add-bookmark.yml in action**

> Using the GitHub Action to add bookmarks via CLI or GitHub UI? Share your workflow, scripts, or integrations.

---

### Development

**How to contribute**

> - Read [CONTRIBUTING.md](../CONTRIBUTING.md)
> - Architecture: [docs/ARCHITECTURE.md](ARCHITECTURE.md)
> - Testing: [docs/TESTING.md](TESTING.md)
> - Release process: [docs/RELEASE.md](RELEASE.md)
>
> For bugs, use [Issues](https://github.com/d0dg3r/GitSyncMarks/issues). For ideas, use Ideas discussions first.

**Release codenames**

> GitSyncMarks uses cult nerd figure codenames for releases:
> - 2.3 *Data* (Star Trek) — logical, data
> - 2.4 *R2-D2* (Star Wars) — handy helper
> - 3.0 *GLaDOS* (Portal) — AI
>
> See [docs/RELEASE.md](RELEASE.md#release-codenames-cult-nerd-figures).

---

## Category Creation in GitHub

1. **Delete existing** (if any): Discussions → manage categories → delete old categories and discussions
2. Go to **Settings** → **General** → **Features** → enable **Discussions**
3. Go to **Discussions** tab → **New category**
4. Create each category with the table above (including **Development**, which is not a default category)
5. Pin the relevant starter topic in each category (optional)
6. Set **Announcements** so only users with write access can post (if desired)

**Note:** The release workflow creates Announcements automatically. Ensure the Announcements category exists before the first tagged release.

**Scripts:** `scripts/create-discussions.sh` creates all starter topics (requires `gh` CLI with `write:discussion`). For **Development**, create the category in the UI first, then run `scripts/create-discussions-dev.sh`.

---

## Optional: Discussion Templates

GitHub supports [discussion templates](https://docs.github.com/en/discussions/managing-discussions-for-your-community/using-discussion-categories-and-templates). In `.github/DISCUSSION_TEMPLATE/` you can add:

- `ideas.yml` — Template for Ideas with prompts (problem, proposed solution, alternatives)
- `qanda.yml` — Template for Q&A with prompts (question, what you tried)

These are optional; the starter topics above provide enough structure to begin.
