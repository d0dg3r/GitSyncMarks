#!/usr/bin/env bash
# Creates Development discussions. Run AFTER creating the Development category in GitHub Settings.
set -e
REPO_ID="R_kgDORLqm_w"

# Get Development category ID
DEV_ID=$(gh api graphql -f query='
  query { repository(owner: "d0dg3r", name: "GitSyncMarks") {
    discussionCategories(first: 20) { nodes { id name } }
  }}' --jq '.data.repository.discussionCategories.nodes[] | select(.name=="Development") | .id')

if [[ -z "$DEV_ID" ]]; then
  echo "Error: Development category not found. Create it in Settings → Discussions → New category first."
  exit 1
fi

create() {
  local title="$1" body="$2"
  gh api graphql -F repositoryId="$REPO_ID" -F categoryId="$DEV_ID" -F title="$title" -F body="$body" -f query='
    mutation($repositoryId: ID!, $categoryId: ID!, $title: String!, $body: String!) {
      createDiscussion(input: {repositoryId: $repositoryId, categoryId: $categoryId, title: $title, body: $body}) {
        discussion { url }
      }
    }
  '
}

create "How to contribute" $'> - Read [CONTRIBUTING.md](https://github.com/d0dg3r/GitSyncMarks/blob/main/CONTRIBUTING.md)
- Architecture: [docs/ARCHITECTURE.md](https://github.com/d0dg3r/GitSyncMarks/blob/main/docs/ARCHITECTURE.md)
- Testing: [docs/TESTING.md](https://github.com/d0dg3r/GitSyncMarks/blob/main/docs/TESTING.md)
- Release process: [docs/RELEASE.md](https://github.com/d0dg3r/GitSyncMarks/blob/main/docs/RELEASE.md)

For bugs, use [Issues](https://github.com/d0dg3r/GitSyncMarks/issues). For ideas, use Ideas discussions first.'
echo "Created: How to contribute"

create "Release codenames" $'> GitSyncMarks uses cult nerd figure codenames for releases:
- 2.3 *Data* (Star Trek) — logical, data
- 2.4 *R2-D2* (Star Wars) — handy helper
- 3.0 *GLaDOS* (Portal) — AI

See [docs/RELEASE.md](https://github.com/d0dg3r/GitSyncMarks/blob/main/docs/RELEASE.md#release-codenames-cult-nerd-figures).'
echo "Created: Release codenames"

echo "Done. Development discussions created."
