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

// Border color for toolbar icon frame (#3fb950 GitSyncMarks green)
const ICON_BORDER = { r: 63, g: 185, b: 80 };

async function ensureDir(dir) {
  await fs.promises.mkdir(dir, { recursive: true });
}

/**
 * Create extension icon with a colored border/frame only (no fill).
 * Logo centered with equal padding to all edges.
 */
async function createIconWithBorder(logo, size, outputPath) {
  const borderWidth = Math.max(1, Math.round(size * 0.04));
  const innerSize = size - 2 * borderWidth;
  // Logo smaller than inner area, centered for equal spacing on all sides
  const logoSize = Math.max(8, Math.round(innerSize * 0.85));
  const offset = Math.round((innerSize - logoSize) / 2);
  const left = borderWidth + offset;
  const top = borderWidth + offset;

  const logoBuf = await logo
    .clone()
    .resize(logoSize, logoSize)
    .toBuffer();

  // Transparent background with logo centered
  const base = await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: logoBuf, left, top }])
    .png()
    .toBuffer();

  // Draw border: overlay colored rects on the four edges
  const borderRects = [
    { left: 0, top: 0, width: size, height: borderWidth },
    { left: 0, top: size - borderWidth, width: size, height: borderWidth },
    { left: 0, top: 0, width: borderWidth, height: size },
    { left: size - borderWidth, top: 0, width: borderWidth, height: size },
  ];

  const composites = await Promise.all(
    borderRects.map(async (rect) => {
      const rectBuf = await sharp({
        create: {
          width: rect.width,
          height: rect.height,
          channels: 4,
          background: { ...ICON_BORDER, alpha: 1 },
        },
      })
        .png()
        .toBuffer();
      return { input: rectBuf, left: rect.left, top: rect.top };
    })
  );

  await sharp(base)
    .composite(composites)
    .png()
    .toFile(outputPath);
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

  // Extension toolbar icons (browser action) — green border, separate from app UI
  for (const size of [16, 48, 128]) {
    await createIconWithBorder(
      logo,
      size,
      path.join(ROOT, "icons", `icon${size}.png`)
    );
    console.log(`  icons/icon${size}.png (toolbar)`);
  }

  // App UI icons (popup, options) — plain logo, no border
  await logo
    .clone()
    .resize(48, 48)
    .toFile(path.join(ROOT, "icons", "icon48-plain.png"));
  console.log("  icons/icon48-plain.png (app)");
  await logo
    .clone()
    .resize(128, 128)
    .toFile(path.join(ROOT, "icons", "icon128-plain.png"));
  console.log("  icons/icon128-plain.png (app)");

  // Store icon — plain logo (no border)
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
