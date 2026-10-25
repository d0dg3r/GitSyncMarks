#import "theme.typ": *
#import "my-role.typ": author_name, author_role

#let repo-root = "../.."

#show: page-setup

#align(center)[
  #v(0.5cm)
  #text(size: 24pt, weight: "bold", fill: bronze)[GitSyncMarks]
  #v(0.15cm)
  #text(size: 12pt, fill: text-secondary)[Architecture Overview]
  #v(0.1cm)
  #text(size: 9.5pt, fill: text-muted)[Your bookmarks, safe in your Git repository]
  #v(0.45cm)
]

#figure(
  image(repo-root + "/store-assets/promo-marquee.png", width: 92%),
  caption: [Bidirectional bookmark sync — no middleman, no third-party servers.],
)

#v(0.25cm)

#grid(
  columns: (1fr, 1fr, 1fr),
  gutter: 10pt,
  callout[
    #section-kicker[Problem]
    Browser bookmark sync often routes through vendor clouds with opaque storage and privacy trade-offs.
  ],
  callout[
    #section-kicker[Solution]
    A browser extension talks directly to your Git provider API; bookmarks live as JSON files in your repo.
  ],
  callout[
    #section-kicker[Platforms]
    Chrome · Firefox · Edge · Brave · Companion Flutter app
  ],
)

#pagebreak()

= Extension UI

Store-style views from the Chrome Web Store listing — popup, search, sync dashboard, and history.

#grid(
  columns: (1fr, 1fr),
  gutter: 10pt,
  figure(
    image(repo-root + "/store-assets/en/chrome-7-popup.png", width: 100%),
    caption: [Toolbar popup — quick access to folders and sync status],
  ),
  figure(
    image(repo-root + "/store-assets/en/chrome-6-search.png", width: 100%),
    caption: [Smart Search — keyboard navigation and themes],
  ),
  figure(
    image(repo-root + "/store-assets/en/chrome-2-sync.png", width: 100%),
    caption: [Sync dashboard — profiles, progress, and provider connection],
  ),
  figure(
    image(repo-root + "/store-assets/en/chrome-5-history.png", width: 100%),
    caption: [Sync history — diff preview and restore any commit],
  ),
)

#pagebreak()

= Product Features

GitSyncMarks turns Git into your bookmark backend — with production-grade sync and power-user workflows beyond simple upload/download.

#grid(
  columns: (1fr, 1fr),
  gutter: 12pt,
  feature-block("Sync & Reliability",
    [Bidirectional automatic sync with three-way merge across devices],
    [Up to 10 profiles — work, personal, research — each with its own repo],
    [Multi-provider Git: GitHub, GitLab, Codeberg, Gitea, Forgejo, Gogs],
    [Live sync progress, sync history, diff preview, and restore any commit],
  ),
  feature-block("Privacy & Data Ownership",
    [Direct API to your Git host — no relay server, no analytics],
    [Human-readable JSON per bookmark; full Git audit trail],
    [Encrypted #mono("settings.enc") backup in repo for cross-device config],
    [Push mirrors for backup remotes after each successful primary push],
  ),
  feature-block("Integrations",
    [Linkwarden save with auto-screenshots and collection sync],
    [Bitwarden vault export to Git — versioned, password-protected backups],
    [GitHub Repos folder — auto-sync your own repositories as bookmarks],
    [Profile transfer: migrate or merge bookmarks between profiles/providers],
  ),
  feature-block("Daily Use",
    [Smart Search popup with keyboard navigation and themes],
    [Context menus: quick folders, open all, favicon copy/download],
    [Generated exports: README index, Netscape HTML, RSS, Dashy YAML],
    [Guided onboarding wizard; clean remote orphan preview and delete],
  ),
  feature-block("Companion & i18n",
    [GitSyncMarks-App parity on Android, iOS, desktop, and Linux],
    [12 languages; UI density and nested-card settings layout],
    [Automation-friendly: add JSON via git or GitHub Action template],
  ),
)

#pagebreak()

= Executive Summary

GitSyncMarks is an open-source (MIT) browser extension that keeps bookmarks in *your* Git repository with industrial-grade merge logic.

#callout[
  *For non-technical readers:* Bookmarks version-controlled like source code — diff, restore, and audit every change.
]

= System Context

#diagram-box[
  #flow-three(
    diagram-node("Browser extension", sub: "MV3 service worker"),
    diagram-node("Git provider API", sub: "REST · tree API", accent: accent-vod),
    diagram-node("Your Git repo", sub: "JSON per bookmark", accent: accent-live),
  )
  #v(10pt)
  #align(center)[
    #box(width: 70%)[
      diagram-node("Companion app", sub: "Flutter · same format · three-way merge", accent: accent-live)
    ]
  ]
  #v(8pt)
  #set text(size: 9pt, fill: text-secondary)
  No sync relay server: credentials stay in extension storage; communication is direct to the Git host you configure.
]

= Extension Architecture

#styled-table(
  (1fr, 1.35fr, 2.65fr),
  table-header[Layer, Path, Role],
  [Sync core], [#mono("lib/sync-engine.js")], [Three-way merge, commit/push orchestration],
  [Providers], [#mono("lib/providers/")], [GitHub, GitLab, Gitea-family API adapters],
  [Profiles], [#mono("lib/profile-manager.js")], [Multi-profile storage and switching],
  [UI], [#mono("options/") + popup], [Wizard, nested-card settings, smart search],
  [Background], [#mono("background.js")], [Alarms, context menus, sync lifecycle],
)

== Technology Stack

#grid(
  columns: (1fr, 1fr),
  gutter: 12pt,
  styled-table(
    (1fr, 1.2fr),
    table-header[Area, Choice],
    [Runtime], [Browser MV3 · vanilla ES modules],
    [Dev toolchain], [Node 20+ · ESLint · Playwright E2E],
    [Storage], [chrome.storage / extension local storage],
    [Crypto], [Encrypted #mono("settings.enc") in repo],
    [i18n], [12 languages via #mono("_locales/")],
  ),
  [
    #section-kicker[Privacy by design]
    #v(0.2em)
    No analytics, no relay server. Tokens and repo settings never leave the browser except to your Git provider.

    #v(0.4em)
    #section-kicker[Companion parity]
    #v(0.2em)
    The Flutter GitSyncMarks-App reads the same on-disk bookmark format and encrypted settings wire format.
  ],
)

= Engineering & Quality

#styled-table(
  (1.2fr, 2.8fr),
  table-header[Gate, Practice],
  [Unit tests], [#mono("node --test") on sync and provider helpers],
  [E2E], [Playwright suite under #mono("e2e/")],
  [Store lint], [#mono("addons-linter") in CI for Firefox/Chrome packaging],
  [Wizard safety], [Connection test does not auto-sync — explicit user choice],
)

#v(0.3cm)
#grid(
  columns: (1fr, 1fr, 1fr),
  gutter: 8pt,
  align(center)[#pill("WebExtension", color: accent-vod)],
  align(center)[#pill("Git API", color: bronze)],
  align(center)[#pill("Three-way merge", color: accent-live)],
)

= My Role & Contributions

#callout[
  #grid(
    columns: (auto, 1fr),
    column-gutter: 16pt,
    align(top)[
      #block(
        width: 52pt,
        height: 52pt,
        fill: bg-panel-alt,
        radius: 50%,
        stroke: 1pt + bronze,
        align(center + horizon)[
          #text(size: 18pt, fill: bronze)[JM]
        ],
      )
    ],
    [
      #text(size: 14pt, weight: "bold")[#author_name]
      #v(2pt)
      #text(size: 11pt, fill: text-secondary)[#author_role]
    ],
  )
]

#v(0.35cm)
#line(length: 100%, stroke: 0.5pt + border-subtle)
#v(0.3cm)
#align(center)[
  #set text(size: 8.5pt, fill: text-muted)
  Document generated from repository sources · GitSyncMarks v3.x · MIT License\
  github.com/d0dg3r/GitSyncMarks
]
