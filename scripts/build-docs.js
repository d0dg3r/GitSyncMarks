#!/usr/bin/env node
/**
 * Build documentation pages from Markdown.
 * Converts docs/*.md and ROADMAP.md to HTML with Mermaid diagram support.
 * Output: _site/docs/*.html
 */

const fs = require("fs");
const path = require("path");
const { marked } = require("marked");

const ROOT = path.resolve(__dirname, "..");
const SITE_DIR = path.join(ROOT, "_site");
const DOCS_OUT = path.join(SITE_DIR, "docs");

const DOC_SOURCES = [
  { src: "docs/ARCHITECTURE.md", out: "architecture.html", title: "Architecture" },
  { src: "docs/SYNC-LOGIC.md", out: "sync-logic.html", title: "Sync Logic" },
  { src: "docs/DATA-FLOW.md", out: "data-flow.html", title: "Data Flow" },
  { src: "ROADMAP.md", out: "roadmap.html", title: "Roadmap" },
];

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function extractMermaidBlocks(md) {
  const parts = [];
  const regex = /^```mermaid\n([\s\S]*?)```$/gm;
  let lastIndex = 0;
  let match;
  while ((match = regex.exec(md)) !== null) {
    parts.push({ type: "md", content: md.slice(lastIndex, match.index) });
    parts.push({ type: "mermaid", content: match[1].trim() });
    lastIndex = regex.lastIndex;
  }
  parts.push({ type: "md", content: md.slice(lastIndex) });
  return parts;
}

function processMarkdown(md) {
  const parts = extractMermaidBlocks(md);
  let html = "";
  for (const part of parts) {
    if (part.type === "md") {
      html += marked.parse(part.content);
    } else {
      html += `<div class="mermaid">\n${part.content}\n</div>`;
    }
  }
  return html;
}

function buildDocTemplate(title, content, currentSlug) {
  const docNav = DOC_SOURCES
    .map((d) => {
      const slug = d.out.replace(".html", "");
      const active = slug === currentSlug ? ' class="active"' : "";
      return `        <a href="${d.out}"${active}>${d.title}</a>`;
    })
    .join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)} — GitSyncMarks</title>
  <link rel="icon" href="../assets/favicon.ico" sizes="any">
  <link rel="icon" href="../assets/favicon-32x32.png" type="image/png" sizes="32x32">
  <link rel="stylesheet" href="../styles.css">
  <link rel="stylesheet" href="../docs.css">
</head>
<body class="docs-page">
  <header class="docs-header">
    <a href="../" class="docs-home">GitSyncMarks</a>
    <nav class="docs-nav">
      <a href="../">Home</a>
      <a href=".">Docs</a>
    </nav>
  </header>

  <div class="docs-layout">
    <aside class="docs-sidebar">
      <nav class="docs-sidebar-nav">
${docNav}
      </nav>
    </aside>

    <main class="docs-content">
      <article class="doc-article">
${content}
      </article>
    </main>
  </div>

  <footer class="docs-footer">
    <a href="https://github.com/d0dg3r/GitSyncMarks">GitHub</a>
    <a href="https://gitsyncmarks.com">Website</a>
  </footer>

  <script type="module">
    import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.esm.min.mjs';
    mermaid.initialize({ startOnLoad: false, theme: 'dark' });
    await mermaid.run();
  </script>
</body>
</html>`;
}

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildIndex() {
  const links = DOC_SOURCES.map(
    (d) =>
      `      <li><a href="${d.out}">${d.title}</a></li>`
  ).join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Documentation — GitSyncMarks</title>
  <link rel="icon" href="../assets/favicon.ico" sizes="any">
  <link rel="icon" href="../assets/favicon-32x32.png" type="image/png" sizes="32x32">
  <link rel="stylesheet" href="../styles.css">
  <link rel="stylesheet" href="../docs.css">
</head>
<body class="docs-page">
  <header class="docs-header">
    <a href="../" class="docs-home">GitSyncMarks</a>
    <nav class="docs-nav">
      <a href="../">Home</a>
      <a href=".">Docs</a>
    </nav>
  </header>

  <div class="docs-layout">
    <main class="docs-content docs-index">
      <h1>Documentation</h1>
      <p>Technical documentation for GitSyncMarks.</p>
      <ul class="docs-index-list">
${links}
      </ul>
    </main>
  </div>

  <footer class="docs-footer">
    <a href="https://github.com/d0dg3r/GitSyncMarks">GitHub</a>
    <a href="https://gitsyncmarks.com">Website</a>
  </footer>
</body>
</html>`;
}

function main() {
  ensureDir(DOCS_OUT);

  marked.setOptions({
    gfm: true,
    breaks: false,
  });

  for (const { src, out, title } of DOC_SOURCES) {
    const srcPath = path.join(ROOT, src);
    if (!fs.existsSync(srcPath)) {
      console.warn(`  [skip] ${src} not found`);
      continue;
    }
    const md = fs.readFileSync(srcPath, "utf8");
    const html = processMarkdown(md);
    const fullHtml = buildDocTemplate(title, html, out.replace(".html", ""));
    fs.writeFileSync(path.join(DOCS_OUT, out), fullHtml);
    console.log(`  docs/${out}`);
  }

  fs.writeFileSync(path.join(DOCS_OUT, "index.html"), buildIndex());
  console.log("  docs/index.html");
  console.log("Done.");
}

main();
