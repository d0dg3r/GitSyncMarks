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
#   VERSION_FOR_DISPLAY=2.3.0-pre.1 ./scripts/build.sh  # Local pre-release GUI display
#

set -euo pipefail

# ---- Configuration ----

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
BUILD_DIR="$ROOT_DIR/build"

# Manifest version: always from source, never modified
MANIFEST_VERSION=$(grep '"version"' "$ROOT_DIR/manifest.json" | head -1 | sed 's/.*: *"\(.*\)".*/\1/')

# ZIP name / display: tag version or manifest + suffix
# Fallbacks: GITHUB_REF_NAME in CI; VERSION_FOR_DISPLAY for local pre-release (e.g. VERSION_FOR_DISPLAY=2.3.0-pre.1)
if [[ -n "${RELEASE:-}" ]]; then
  ZIP_VERSION="$MANIFEST_VERSION"
  DISPLAY_VERSION=""
elif TAG=$(cd "$ROOT_DIR" && git describe --tags --exact-match 2>/dev/null); then
  ZIP_VERSION="${TAG#v}"
  if [[ "$ZIP_VERSION" =~ -(pre|alpha|beta|rc)[.-][0-9]+$ ]]; then
    DISPLAY_VERSION="$ZIP_VERSION"
  else
    DISPLAY_VERSION=""
  fi
elif [[ -n "${GITHUB_REF_NAME:-}" && "$GITHUB_REF_NAME" =~ ^v[0-9] ]]; then
  ZIP_VERSION="${GITHUB_REF_NAME#v}"
  if [[ "$ZIP_VERSION" =~ -(pre|alpha|beta|rc)[.-][0-9]+$ ]]; then
    DISPLAY_VERSION="$ZIP_VERSION"
  else
    DISPLAY_VERSION=""
  fi
elif [[ -n "${VERSION_FOR_DISPLAY:-}" && "$VERSION_FOR_DISPLAY" =~ -(pre|alpha|beta|rc)[.-][0-9]+$ ]]; then
  ZIP_VERSION="$VERSION_FOR_DISPLAY"
  DISPLAY_VERSION="$VERSION_FOR_DISPLAY"
else
  ZIP_VERSION="${MANIFEST_VERSION}-dev"
  DISPLAY_VERSION=""
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
  local zip_name="GitSyncMarks-v${ZIP_VERSION}-chrome.zip"

  log "Building Chrome extension v${ZIP_VERSION}..."

  rm -rf "$chrome_dir"
  mkdir -p "$chrome_dir"

  # Copy shared files
  copy_shared "$chrome_dir"

  # Manifest: copy as-is (no version modification)
  cp "$ROOT_DIR/manifest.json" "$chrome_dir/manifest.json"

  # Display version for GUI: pre-release tag or null (use manifest)
  if [[ -n "$DISPLAY_VERSION" ]]; then
    echo 'export const DISPLAY_VERSION = "'"$DISPLAY_VERSION"'";' > "$chrome_dir/lib/display-version.js"
  else
    echo 'export const DISPLAY_VERSION = null;' > "$chrome_dir/lib/display-version.js"
  fi

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
  local zip_name="GitSyncMarks-v${ZIP_VERSION}-firefox.zip"

  log "Building Firefox extension v${ZIP_VERSION}..."

  rm -rf "$firefox_dir"
  mkdir -p "$firefox_dir"

  # Copy shared files
  copy_shared "$firefox_dir"

  # Manifest: copy as-is (no version modification)
  cp "$ROOT_DIR/manifest.firefox.json" "$firefox_dir/manifest.json"

  # Display version for GUI: pre-release tag or null (use manifest)
  if [[ -n "$DISPLAY_VERSION" ]]; then
    echo 'export const DISPLAY_VERSION = "'"$DISPLAY_VERSION"'";' > "$firefox_dir/lib/display-version.js"
  else
    echo 'export const DISPLAY_VERSION = null;' > "$firefox_dir/lib/display-version.js"
  fi

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
