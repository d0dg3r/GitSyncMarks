#!/usr/bin/env bash
# Fetch content from GitSyncMarks-App repo for the unified website.
# Saves README, full_description, app icon, badges, and screenshots to website/_app-src/

set -e
cd "$(dirname "$0")/.."

BASE="https://raw.githubusercontent.com/d0dg3r/GitSyncMarks-App/main"
OUT_DIR="website/_app-src"
IMG_DIR="$OUT_DIR/images"
BADGES_DIR="$IMG_DIR/badges"
SCREENSHOTS_DIR="$IMG_DIR/screenshots"

mkdir -p "$OUT_DIR" "$BADGES_DIR" "$SCREENSHOTS_DIR"

# README and end-user copy
curl -sSfL "$BASE/README.md" -o "$OUT_DIR/README.md" || {
  echo "Warning: Could not fetch App README, using empty fallback"
  echo "<!-- App content unavailable -->" > "$OUT_DIR/README.md"
}
curl -sSfL "$BASE/metadata/en-US/full_description.txt" -o "$OUT_DIR/full_description.txt" || true

# App icon and badges
curl -sSfL "$BASE/assets/images/app_icon.png" -o "$IMG_DIR/app_icon.png" || true
curl -sSfL "$BASE/assets/badges/badge_fdroid.png" -o "$BADGES_DIR/badge_fdroid.png" || true
curl -sSfL "$BASE/assets/badges/badge_github.png" -o "$BADGES_DIR/badge_github.png" || true
curl -sSfL "$BASE/assets/badges/badge_obtainium.png" -o "$BADGES_DIR/badge_obtainium.png" || true

# Phone screenshots (light mode)
curl -sSfL "$BASE/metadata/en-US/images/phoneScreenshots/1_bookmarks.png" -o "$SCREENSHOTS_DIR/1_bookmarks.png" || true
curl -sSfL "$BASE/metadata/en-US/images/phoneScreenshots/2_empty_state.png" -o "$SCREENSHOTS_DIR/2_empty_state.png" || true
curl -sSfL "$BASE/metadata/en-US/images/phoneScreenshots/3_settings.png" -o "$SCREENSHOTS_DIR/3_settings.png" || true

echo "Fetched App content to $OUT_DIR/"
