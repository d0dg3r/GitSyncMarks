#!/usr/bin/env bash
# Extract release notes from CHANGELOG.md for a tag (vX.Y.Z or X.Y.Z).
# Prefers ## [X.Y.Z]; falls back to ## [Unreleased].
set -euo pipefail

VERSION="${1:?usage: extract-changelog-notes.sh vX.Y.Z}"
VER="${VERSION#v}"
FILE="${2:-CHANGELOG.md}"

if grep -qE "^## \[${VER}\]" "$FILE"; then
  awk -v ver="$VER" '
    $0 ~ "^## \\[" ver "\\]" { p = 1; next }
    p && /^## \[/ { exit }
    p { print }
  ' "$FILE"
else
  awk '
    /^## \[Unreleased\]/ { p = 1; next }
    p && /^## \[/ { exit }
    p { print }
  ' "$FILE"
fi
