#!/usr/bin/env node
/**
 * Build index.html from template and structured App content.
 * Generates end-user product page: intro, features, installation, screenshots, configure.
 * Output: _site/index.html
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const SITE_DIR = path.join(ROOT, "_site");
const TEMPLATE = path.join(ROOT, "website", "index.in.html");
const APP_SRC = path.join(ROOT, "website", "_app-src");

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function extractSection(md, startHeading, endHeading) {
  const start = md.indexOf(startHeading);
  if (start === -1) return "";
  const afterStart = md.indexOf("\n", start) + 1;
  const end = endHeading ? md.indexOf(endHeading, afterStart) : md.length;
  return md.slice(afterStart, end === -1 ? md.length : end).trim();
}

function parseFeatures(md) {
  const section = extractSection(md, "## Features", "## Beta testing");
  const lines = section.split("\n").filter((l) => l.trim().startsWith("- "));
  return lines.map((l) => {
    const match = l.match(/^-\s*\*\*(.+?)\*\*[:\s]*(.*)$/);
    if (match) {
      const title = match[1].trim();
      const desc = match[2].trim();
      return { title, desc: desc || title };
    }
    const text = l.replace(/^-\s*/, "");
    return { title: "", desc: text };
  });
}

function buildAppContent() {
  const readmePath = path.join(APP_SRC, "README.md");
  const fullDescPath = path.join(APP_SRC, "full_description.txt");

  let intro =
    "Cross-platform app (Android, iOS, Windows, macOS, Linux) that syncs bookmarks from your GitHub repo. Companion to the GitSyncMarks browser extension. View bookmarks on mobile, move, reorder, add via share. Sync once, browse offline.";
  let features = [];
  let hasBadges = false;
  let hasScreenshots = false;

  if (fs.existsSync(fullDescPath)) {
    const txt = fs.readFileSync(fullDescPath, "utf8");
    const firstPara = txt.split(/\n\n+/)[0]?.trim();
    if (firstPara) intro = firstPara;
  }

  if (fs.existsSync(readmePath)) {
    const md = fs.readFileSync(readmePath, "utf8");
    features = parseFeatures(md);
  }

  hasBadges =
    fs.existsSync(path.join(APP_SRC, "images", "badges", "badge_fdroid.png")) ||
    fs.existsSync(path.join(APP_SRC, "images", "badges", "badge_github.png"));
  hasScreenshots = fs.existsSync(
    path.join(APP_SRC, "images", "screenshots", "1_bookmarks.png")
  );

  const releasesUrl = "https://github.com/d0dg3r/GitSyncMarks-App/releases";
  const fdroidUrl = "https://f-droid.org/packages/com.d0dg3r.gitsyncmarks/";
  const obtainiumUrl = "https://obtainium.tenzyu.dev/?source=github&repo=d0dg3r/GitSyncMarks-App";

  let html = "";

  // Intro
  html += `
    <section class="intro">
      <p class="lead">${escapeHtml(intro)}</p>
    </section>`;

  // Badges (installation)
  html += `
    <section class="installation" id="app-installation">
      <h2>Get the App</h2>
      <div class="badges app-store-badges">`;
  if (fs.existsSync(path.join(APP_SRC, "images", "badges", "badge_fdroid.png"))) {
    html += `
        <a href="${fdroidUrl}" class="badge badge-app"><img src="assets/app/badges/badge_fdroid.png" alt="Get it on F-Droid" height="40"></a>`;
  }
  if (fs.existsSync(path.join(APP_SRC, "images", "badges", "badge_github.png"))) {
    html += `
        <a href="${releasesUrl}" class="badge badge-app"><img src="assets/app/badges/badge_github.png" alt="GitHub Releases" height="40"></a>`;
  }
  if (fs.existsSync(path.join(APP_SRC, "images", "badges", "badge_obtainium.png"))) {
    html += `
        <a href="${obtainiumUrl}" class="badge badge-app"><img src="assets/app/badges/badge_obtainium.png" alt="Obtainium" height="40"></a>`;
  }
  html += `
      </div>
      <p>Or download APK, Flatpak, or ZIP from <a href="${releasesUrl}">Releases</a>.</p>
    </section>`;

  // Features
  html += `
    <section class="features" id="app-features">
      <h2>Features</h2>
      <div class="feature-grid">`;
  for (const f of features.slice(0, 12)) {
    html += `
        <article class="feature-card">
          <h3>${escapeHtml(f.title)}</h3>
          <p>${escapeHtml(f.desc)}</p>
        </article>`;
  }
  html += `
      </div>
    </section>`;

  // Screenshots
  if (hasScreenshots) {
    const shots = [
      { file: "1_bookmarks.png", alt: "Bookmarks view", cap: "Bookmarks" },
      { file: "2_empty_state.png", alt: "Empty state", cap: "Empty state" },
      { file: "3_settings.png", alt: "Settings", cap: "Settings" },
    ];
    html += `
    <section class="screenshots" id="app-screenshots">
      <h2>Screenshots</h2>
      <div class="screenshot-grid">`;
    for (const s of shots) {
      if (fs.existsSync(path.join(APP_SRC, "images", "screenshots", s.file))) {
        html += `
        <figure>
          <img src="assets/app/screenshots/${s.file}" alt="${escapeHtml(s.alt)}" width="220">
          <figcaption>${escapeHtml(s.cap)}</figcaption>
        </figure>`;
      }
    }
    html += `
      </div>
    </section>`;
  }

  // Configure
  html += `
    <section class="how-it-works">
      <h2>Configure the App</h2>
      <ol class="steps">
        <li>Open the app and go to <strong>Settings</strong></li>
        <li>Enter your <a href="https://github.com/settings/tokens/new?scopes=repo&description=GitSyncMarks+Sync">Personal Access Token</a> with <code>repo</code> scope</li>
        <li>Enter <strong>Repository Owner</strong> and <strong>Repository Name</strong> (your bookmark repo)</li>
        <li>Set <strong>Branch</strong> (usually <code>main</code>) and <strong>Base Path</strong> (default <code>bookmarks</code>)</li>
        <li>Click <strong>Test Connection</strong>, then <strong>Save</strong></li>
        <li>Use <strong>Sync Bookmarks</strong> to fetch your bookmarks</li>
      </ol>
    </section>`;

  return html;
}

function main() {
  const template = fs.readFileSync(TEMPLATE, "utf8");
  const appContent = buildAppContent();
  const output = template.replace("{{APP_CONTENT}}", appContent);
  fs.writeFileSync(path.join(SITE_DIR, "index.html"), output);
  console.log("  _site/index.html");
}

main();
