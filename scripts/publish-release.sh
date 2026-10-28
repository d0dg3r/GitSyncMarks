#!/usr/bin/env bash
# Create a Forgejo release with ZIPs, then copy the same assets to GitHub.
# Intended for .forgejo/workflows/release.yml (forgejo.lan SoT).
#
# Env:
#   VERSION                 tag name, e.g. v3.1.0
#   FORGEJO_TOKEN           API token for forgejo.lan (job token OK)
#   FORGEJO_API             default https://forgejo.lan/api/v1
#   FORGEJO_OWNER / FORGEJO_REPO  default from GITHUB_REPOSITORY
#   GITSYNCMARKS_RELEASE_PAT      GitHub PAT (contents:write) for d0dg3r/GitSyncMarks
#   GITHUB_RELEASE_OWNER/REPO     default d0dg3r / GitSyncMarks
#   PRERELEASE              true|false
set -euo pipefail

VERSION="${VERSION:?VERSION required}"
PRERELEASE="${PRERELEASE:-false}"
FORGEJO_API="${FORGEJO_API:-https://forgejo.lan/api/v1}"
FORGEJO_TOKEN="${FORGEJO_TOKEN:?FORGEJO_TOKEN required}"

if [[ -n "${GITHUB_REPOSITORY:-}" ]]; then
  FORGEJO_OWNER="${FORGEJO_OWNER:-${GITHUB_REPOSITORY%%/*}}"
  FORGEJO_REPO="${FORGEJO_REPO:-${GITHUB_REPOSITORY##*/}}"
else
  FORGEJO_OWNER="${FORGEJO_OWNER:?FORGEJO_OWNER required}"
  FORGEJO_REPO="${FORGEJO_REPO:?FORGEJO_REPO required}"
fi

GITHUB_RELEASE_OWNER="${GITHUB_RELEASE_OWNER:-d0dg3r}"
GITHUB_RELEASE_REPO="${GITHUB_RELEASE_REPO:-GitSyncMarks}"
GITSYNCMARKS_RELEASE_PAT="${GITSYNCMARKS_RELEASE_PAT:?GITSYNCMARKS_RELEASE_PAT required}"

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

CHROME_ZIP="build/GitSyncMarks-${VERSION}-chrome.zip"
FIREFOX_ZIP="build/GitSyncMarks-${VERSION}-firefox.zip"
[[ -f "$CHROME_ZIP" && -f "$FIREFOX_ZIP" ]] || {
  echo "Missing ZIPs: $CHROME_ZIP $FIREFOX_ZIP" >&2
  exit 1
}

NOTES_FILE="$(mktemp)"
INSTALL_NOTES="$(mktemp)"
trap 'rm -f "$NOTES_FILE" "$INSTALL_NOTES"' EXIT

bash scripts/extract-changelog-notes.sh "$VERSION" >"$NOTES_FILE"
{
  cat "$NOTES_FILE"
  cat <<EOF

---

## Installation

### Chrome / Chromium / Edge / Brave

1. Download \`GitSyncMarks-${VERSION}-chrome.zip\`
2. Extract the ZIP
3. Open \`chrome://extensions/\`
4. Enable **Developer mode**
5. Click **Load unpacked**
6. Select the extracted folder

### Firefox

1. Download \`GitSyncMarks-${VERSION}-firefox.zip\`
2. Open \`about:debugging#/runtime/this-firefox\`
3. Click **Load Temporary Add-on...**
4. Select the ZIP or \`manifest.json\` inside

More info: https://github.com/${GITHUB_RELEASE_OWNER}/${GITHUB_RELEASE_REPO}/blob/main/README.md
EOF
} >"$INSTALL_NOTES"

echo "[publish] Creating Forgejo release ${VERSION} on ${FORGEJO_OWNER}/${FORGEJO_REPO}"
CREATE_PAYLOAD="$(jq -n \
  --arg tag "$VERSION" \
  --arg name "GitSyncMarks ${VERSION}" \
  --arg body "$(cat "$INSTALL_NOTES")" \
  --argjson pre "$( [[ "$PRERELEASE" == true ]] && echo true || echo false )" \
  '{tag_name:$tag, name:$name, body:$body, prerelease:$pre, draft:false}')"

CREATE_RESP="$(curl -fsS -X POST \
  -H "Authorization: token ${FORGEJO_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "$CREATE_PAYLOAD" \
  "${FORGEJO_API}/repos/${FORGEJO_OWNER}/${FORGEJO_REPO}/releases")"

RELEASE_ID="$(echo "$CREATE_RESP" | jq -r '.id')"
[[ -n "$RELEASE_ID" && "$RELEASE_ID" != null ]] || {
  echo "Forgejo release create failed: $CREATE_RESP" >&2
  exit 1
}

upload_forgejo_asset() {
  local file="$1"
  local name
  name="$(basename "$file")"
  echo "[publish] Upload Forgejo asset ${name}"
  curl -fsS -X POST \
    -H "Authorization: token ${FORGEJO_TOKEN}" \
    -H "Content-Type: application/octet-stream" \
    --data-binary @"${file}" \
    "${FORGEJO_API}/repos/${FORGEJO_OWNER}/${FORGEJO_REPO}/releases/${RELEASE_ID}/assets?name=${name}" \
    >/dev/null
}

upload_forgejo_asset "$CHROME_ZIP"
upload_forgejo_asset "$FIREFOX_ZIP"

echo "[publish] Creating GitHub release ${VERSION} on ${GITHUB_RELEASE_OWNER}/${GITHUB_RELEASE_REPO}"
export GH_TOKEN="$GITSYNCMARKS_RELEASE_PAT"
GH_ARGS=(
  release create "$VERSION"
  --repo "${GITHUB_RELEASE_OWNER}/${GITHUB_RELEASE_REPO}"
  --title "GitSyncMarks ${VERSION}"
  --notes-file "$INSTALL_NOTES"
  "$CHROME_ZIP"
  "$FIREFOX_ZIP"
)
if [[ "$PRERELEASE" == true ]]; then
  GH_ARGS+=(--prerelease)
fi
gh "${GH_ARGS[@]}"

echo "[publish] Done: Forgejo #${RELEASE_ID} + GitHub ${VERSION}"
