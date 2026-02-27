#!/usr/bin/env bash
# Prepare website for deployment or local preview.
# Copies website files and store assets into _site/.

set -e
cd "$(dirname "$0")/.."

mkdir -p _site/assets/screenshots _site/assets/app
touch _site/.nojekyll
bash scripts/fetch-app-content.sh
if [ -d website/_app-src/images ]; then
  cp -r website/_app-src/images/* _site/assets/app/
fi
node scripts/build-docs.js
node scripts/build-index.js
cp website/styles.css website/docs.css _site/
cp store-assets/marquee_promo_tile.png _site/assets/
cp favicon.ico favicon-32x32.png apple-touch-icon.png _site/assets/
cp store-assets/en/chrome-1-github.png \
   store-assets/en/chrome-2-connection.png \
   store-assets/en/chrome-3-sync.png \
   store-assets/en/chrome-4-files.png \
   store-assets/en/chrome-5-export-import.png \
   store-assets/en/chrome-6-popup.png \
   store-assets/en/chrome-7-wizard-welcome.png \
   store-assets/en/chrome-8-wizard-token.png \
   store-assets/en/chrome-9-wizard-repo.png _site/assets/screenshots/

echo "Website prepared in _site/"
