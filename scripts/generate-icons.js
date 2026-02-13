#!/usr/bin/env node
/**
 * Generate all icons and favicons from the source logo.
 * Usage: node scripts/generate-icons.js [path-to-logo]
 * Default logo: assets/logo-source.png
 */

const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const pngToIco = require("png-to-ico");

const ROOT = path.resolve(__dirname, "..");
const LOGO_SOURCE =
  process.argv[2] || path.join(ROOT, "assets", "logo-source.png");

async function ensureDir(dir) {
  await fs.promises.mkdir(dir, { recursive: true });
}

async function createPromoTile(inputPath, outputPath, width, height) {
  const logoSize = Math.min(width, height) * 0.7;
  const logo = await sharp(inputPath)
    .resize(Math.round(logoSize), Math.round(logoSize))
    .toBuffer();
  const left = Math.round((width - logoSize) / 2);
  const top = Math.round((height - logoSize) / 2);

  await sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 1 },
    },
  })
    .composite([{ input: logo, left, top }])
    .png()
    .toFile(outputPath);
}

async function main() {
  if (!fs.existsSync(LOGO_SOURCE)) {
    console.error(`Logo not found: ${LOGO_SOURCE}`);
    process.exit(1);
  }

  await ensureDir(path.join(ROOT, "icons"));
  await ensureDir(path.join(ROOT, "store-assets"));

  const logo = sharp(LOGO_SOURCE);

  // Extension icons
  for (const size of [16, 48, 128]) {
    await logo
      .clone()
      .resize(size, size)
      .toFile(path.join(ROOT, "icons", `icon${size}.png`));
    console.log(`  icons/icon${size}.png`);
  }

  // Store icon
  await logo
    .clone()
    .resize(128, 128)
    .toFile(path.join(ROOT, "store-assets", "icon128-store.png"));
  console.log("  store-assets/icon128-store.png");

  // Promo tiles
  await createPromoTile(
    LOGO_SOURCE,
    path.join(ROOT, "store-assets", "promo-small.png"),
    440,
    280
  );
  console.log("  store-assets/promo-small.png (440x280)");
  await createPromoTile(
    LOGO_SOURCE,
    path.join(ROOT, "store-assets", "promo-large.png"),
    920,
    680
  );
  console.log("  store-assets/promo-large.png (920x680)");
  await createPromoTile(
    LOGO_SOURCE,
    path.join(ROOT, "store-assets", "promo-marquee.png"),
    1400,
    560
  );
  console.log("  store-assets/promo-marquee.png (1400x560)");

  // Favicons (project root)
  const favicon16 = path.join(ROOT, "favicon-16x16.png");
  const favicon32 = path.join(ROOT, "favicon-32x32.png");
  const appleTouch = path.join(ROOT, "apple-touch-icon.png");
  const faviconIco = path.join(ROOT, "favicon.ico");
  const favicon48Tmp = path.join(ROOT, ".favicon-48-tmp.png");

  await logo.clone().resize(16, 16).toFile(favicon16);
  await logo.clone().resize(32, 32).toFile(favicon32);
  await logo.clone().resize(180, 180).toFile(appleTouch);
  await logo.clone().resize(48, 48).toFile(favicon48Tmp);
  console.log("  favicon-16x16.png");
  console.log("  favicon-32x32.png");
  console.log("  apple-touch-icon.png (180x180)");

  const icoBuf = await pngToIco([favicon16, favicon32, favicon48Tmp]);
  fs.writeFileSync(faviconIco, icoBuf);
  fs.unlinkSync(favicon48Tmp);
  console.log("  favicon.ico");
  console.log("\nDone.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
