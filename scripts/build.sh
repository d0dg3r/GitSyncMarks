#!/usr/bin/env bash
#
# Build script for GitSyncMarks browser extension.
# Creates distributable ZIP packages for Chrome and Firefox.
#
# Usage:
#   ./scripts/build.sh              # Build both Chrome and Firefox
#   ./scripts/build.sh chrome       # Build Chrome only
#   ./scripts/build.sh firefox      # Build Firefox only
#   ./scripts/build.sh chrome --no-zip  # Build Chrome dir only, no ZIP (for E2E)
#

set -euo pipefail

# ---- Configuration ----

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
BUILD_DIR="$ROOT_DIR/build"

# Read version from manifest.json
VERSION=$(grep '"version"' "$ROOT_DIR/manifest.json" | head -1 | sed 's/.*: *"\(.*\)".*/\1/')

# Resolve display version: tag (v2.2.0-pre.8 → 2.2.0-pre.8), or manifest + -dev
if [[ -n "${RELEASE:-}" ]]; then
  : # VERSION stays from manifest
elif TAG=$(cd "$ROOT_DIR" && git describe --tags --exact-match 2>/dev/null); then
  VERSION="${TAG#v}"
else
  VERSION="${VERSION}-dev"
fi

# Shared files to include in both packages
SHARED_FILES=(
  background.js
  popup.html
  popup.js
  popup.css
  options.html
  options.js
  options.css
  LICENSE
  PRIVACY.md
  README.md
)

SHARED_DIRS=(
  lib
  icons
  _locales
)

# ---- Helper functions ----

log() {
  echo "[build] $*"
}

# Copy shared files into a target directory
copy_shared() {
  local target="$1"

  for file in "${SHARED_FILES[@]}"; do
    if [[ -f "$ROOT_DIR/$file" ]]; then
      cp "$ROOT_DIR/$file" "$target/"
    else
      echo "  Warning: $file not found, skipping"
    fi
  done

  for dir in "${SHARED_DIRS[@]}"; do
    if [[ -d "$ROOT_DIR/$dir" ]]; then
      cp -r "$ROOT_DIR/$dir" "$target/"
    else
      echo "  Warning: $dir/ not found, skipping"
    fi
  done
}

# ---- Build Chrome ----

build_chrome() {
  local chrome_dir="$BUILD_DIR/chrome"
  local zip_name="GitSyncMarks-v${VERSION}-chrome.zip"

  log "Building Chrome extension v${VERSION}..."

  rm -rf "$chrome_dir"
  mkdir -p "$chrome_dir"

  # Copy shared files
  copy_shared "$chrome_dir"

  # Chrome uses the standard manifest.json
  cp "$ROOT_DIR/manifest.json" "$chrome_dir/manifest.json"
  sed -i 's/"version": "[^"]*"/"version": "'"$VERSION"'"/' "$chrome_dir/manifest.json"

  # Create ZIP (unless --no-zip)
  if [[ -z "${NO_ZIP:-}" ]]; then
    (cd "$chrome_dir" && zip -r "$BUILD_DIR/$zip_name" . -x ".*") > /dev/null
    log "Chrome package: build/$zip_name"
  else
    log "Chrome dir: build/chrome/ (no ZIP)"
  fi
}

# ---- Build Firefox ----

build_firefox() {
  local firefox_dir="$BUILD_DIR/firefox"
  local zip_name="GitSyncMarks-v${VERSION}-firefox.zip"

  log "Building Firefox extension v${VERSION}..."

  rm -rf "$firefox_dir"
  mkdir -p "$firefox_dir"

  # Copy shared files
  copy_shared "$firefox_dir"

  # Firefox uses the Firefox-specific manifest
  cp "$ROOT_DIR/manifest.firefox.json" "$firefox_dir/manifest.json"
  sed -i 's/"version": "[^"]*"/"version": "'"$VERSION"'"/' "$firefox_dir/manifest.json"

  # Create ZIP (unless --no-zip)
  if [[ -z "${NO_ZIP:-}" ]]; then
    (cd "$firefox_dir" && zip -r "$BUILD_DIR/$zip_name" . -x ".*") > /dev/null
    log "Firefox package: build/$zip_name"
  else
    log "Firefox dir: build/firefox/ (no ZIP)"
  fi
}

# ---- Main ----

TARGET="${1:-all}"
NO_ZIP=""
[[ "${2:-}" == "--no-zip" ]] && NO_ZIP=1

mkdir -p "$BUILD_DIR"

case "$TARGET" in
  chrome)
    build_chrome
    ;;
  firefox)
    build_firefox
    ;;
  all|"")
    build_chrome
    build_firefox
    ;;
  *)
    echo "Usage: $0 [chrome|firefox|all]"
    exit 1
    ;;
esac

log "Done!"
