#!/usr/bin/env bash
# Creates GitHub Discussions from GITHUB-DISCUSSIONS.md content
# Requires: gh cli, write:discussion scope
set -e
REPO_ID="R_kgDORLqm_w"
ANN="DIC_kwDORLqm_84C2fI-"
GEN="DIC_kwDORLqm_84C2fI_"
IDEA="DIC_kwDORLqm_84C2fJB"
QA="DIC_kwDORLqm_84C2fJA"
SHOW="DIC_kwDORLqm_84C2fJC"

create() {
  local cat_id="$1" title="$2" body="$3"
  gh api graphql -F repositoryId="$REPO_ID" -F categoryId="$cat_id" -F title="$title" -F body="$body" -f query='
    mutation($repositoryId: ID!, $categoryId: ID!, $title: String!, $body: String!) {
      createDiscussion(input: {repositoryId: $repositoryId, categoryId: $categoryId, title: $title, body: $body}) {
        discussion { id url }
      }
    }
  '
}

# Announcements
create "$ANN" "v2.3.0 Data — Released" $'> GitSyncMarks v2.3.0 (*Data*) is out. Highlights:
- Full auto-save: no Save buttons in GitHub and Sync tabs
- Theme cycle button (A → Dark → Light → A)
- GitHub Repos folder moved to Sync tab
- Encrypted settings export (.enc) for secure backup
- Save feedback integrated into cards

[Release notes](https://github.com/d0dg3r/GitSyncMarks/releases/tag/v2.3.0) · [Changelog](https://github.com/d0dg3r/GitSyncMarks/blob/main/CHANGELOG.md)'
echo "Created: v2.3.0 Data — Released"

# General
create "$GEN" "Welcome to GitSyncMarks Discussions" $'> Use this space to:
- Introduce yourself
- Share how you use GitSyncMarks
- Ask questions that do not fit Ideas or Q&A
- Discuss the project

Links: [Documentation](https://github.com/d0dg3r/GitSyncMarks/tree/main/docs) · [Report a bug](https://github.com/d0dg3r/GitSyncMarks/issues) · [Releases](https://github.com/d0dg3r/GitSyncMarks/releases)'
echo "Created: Welcome to GitSyncMarks Discussions"

# Ideas - How to suggest
create "$IDEA" "How to suggest a feature" $'> Before opening an issue:
1. Search existing [Ideas](https://github.com/d0dg3r/GitSyncMarks/discussions/categories/ideas) and [Issues](https://github.com/d0dg3r/GitSyncMarks/issues)
2. Open a Discussion here to discuss the idea
3. If there is support, we can create an issue for tracking

See [ROADMAP.md](https://github.com/d0dg3r/GitSyncMarks/blob/main/ROADMAP.md) for planned features (v2.4.0 R2-D2: context menu, favicon, settings sync to Git; v3.0 GLaDOS: AI features).'
echo "Created: How to suggest a feature"

# Ideas - Planned v2.4.0
create "$IDEA" "Planned for v2.4.0 (R2-D2)" $'> Features planned for the next release:
- Context menu: Add to GitSyncMarks, favicon (copy URL, download, save to Git)
- Settings sync to Git (encrypted only)
- Browser import files (e.g. Netscape HTML)

What would you like to see first? Any feedback on these?'
echo "Created: Planned for v2.4.0 (R2-D2)"

# Q&A: question in post, answer as reply (two-step structure)
qaa() {
  local title="$1" qbody="$2" abody="$3"
  local did
  did=$(gh api graphql -F repositoryId="$REPO_ID" -F categoryId="$QA" -F title="$title" -F body="$qbody" -f query='
    mutation($repositoryId: ID!, $categoryId: ID!, $title: String!, $body: String!) {
      createDiscussion(input: {repositoryId: $repositoryId, categoryId: $categoryId, title: $title, body: $body}) {
        discussion { id }
      }
    }
  ' --jq '.data.createDiscussion.discussion.id')
  gh api graphql -F discussionId="$did" -F body="$abody" -f query='
    mutation($discussionId: ID!, $body: String!) {
      addDiscussionComment(input: {discussionId: $discussionId, body: $body}) { comment { id } }
    }
  ' >/dev/null
  echo "Created: $title"
}

qaa "Getting started — setup checklist" \
  "I want to sync my bookmarks with GitHub. What do I need to do to get started?" \
  $'1. Create a GitHub repository (can be private)\n2. Create a [Personal Access Token](https://github.com/settings/tokens/new?scopes=repo&description=GitSyncMarks) with `repo` scope\n3. In the extension: GitHub tab → enter token, owner, repo name\n4. Click **Test Connection** — create folder or pull existing bookmarks\n5. Click **Sync Now** in the popup\n\nAll settings auto-save. Profiles let you separate work/personal bookmark sets.'

qaa "Why does sync sometimes take long?" \
  "Sync is taking a long time. Why is that, and is it normal?" \
  'Each changed bookmark triggers an API call. Many changes = many calls. See Options → Help → "Why does sync sometimes take long?" for details.'

qaa "Conflict detected — what should I do?" \
  'GitSyncMarks shows "Conflict detected". What does that mean and how do I resolve it?' \
  'Choose **Push** (your local bookmarks win) or **Pull** (remote wins). There is no automatic merge for conflicts. Pick the side you want to keep.'

qaa "How do multiple profiles work?" \
  "What are profiles, and how do I use them to separate work and personal bookmarks?" \
  "Each profile has its own repo config (token, owner, repo, branch) and its own bookmark set. Switching profiles replaces your local bookmarks with the target profile's bookmarks. Useful for separating work vs personal."

qaa "Can I add bookmarks without the browser?" \
  "I want to add or edit bookmarks without opening the browser. Is that possible?" \
  $'Yes. Use the [GitHub Action add-bookmark.yml](https://github.com/d0dg3r/GitSyncMarks/blob/main/.github/workflows/add-bookmark.yml) to add bookmarks via CLI or GitHub UI. You can also create/edit JSON files directly in the repo. See Options → Automation tab for details.'

# Show and Tell - Share your structure
create "$SHOW" "Share your bookmark repo structure" $'> How do you organize your bookmarks? Share your folder structure, automation setup, or workflows. Example:

```
bookmarks/
  toolbar/
    dev-tools/
    reading/
  other/
    archive/
```'
echo "Created: Share your bookmark repo structure"

# Show and Tell - Automation
create "$SHOW" "Automation: add-bookmark.yml in action" $'> Using the GitHub Action to add bookmarks via CLI or GitHub UI? Share your workflow, scripts, or integrations.'
echo "Created: Automation: add-bookmark.yml in action"

echo ""
echo "Done. 11 discussions created (Announcements 1, General 1, Ideas 2, Q&A 5, Show and Tell 2)."
echo "Development category: Create in GitHub Settings → Discussions → New category (name: Development, emoji: wrench)."
echo "  Then run: ./scripts/create-discussions-dev.sh (or add those two topics manually from docs/GITHUB-DISCUSSIONS.md)."
