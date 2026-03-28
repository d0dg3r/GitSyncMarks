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
cp store-assets/marquee_promo_tile_linkwarden.png _site/assets/
cp favicon.ico favicon-32x32.png apple-touch-icon.png _site/assets/
cp store-assets/en/chrome-1-connection.png \
   store-assets/en/chrome-2-sync.png \
   store-assets/en/chrome-3-menu.png \
   store-assets/en/chrome-4-linkwarden.png \
   store-assets/en/chrome-5-history.png \
   store-assets/en/chrome-6-search.png \
   store-assets/en/chrome-7-popup.png \
   store-assets/en/chrome-8-linkwarden-save.png \
   store-assets/en/chrome-9-wizard-welcome.png \
   store-assets/en/chrome-10-wizard-token.png \
   store-assets/en/chrome-11-wizard-repo.png _site/assets/screenshots/

echo "Website prepared in _site/"
