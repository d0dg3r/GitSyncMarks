// Portfolio PDF theme — Bronze Cinema palette (see docs/UI_STYLE.md).

#let doc-title = "GitSyncMarks Architecture Overview"
#let doc-footer = "Bookmark sync to your Git repo · MIT · github.com/d0dg3r/GitSyncMarks"

#let bg-dark = rgb("#0d0b09")
#let bg-panel = rgb("#161310")
#let bg-panel-alt = rgb("#1e1a16")
#let bronze = rgb("#c9a962")
#let bronze-dim = rgb("#8a7344")
#let text-primary = rgb("#f2ece4")
#let text-secondary = rgb("#b8aea2")
#let text-muted = rgb("#7a7268")
#let accent-live = rgb("#4caf7a")
#let accent-vod = rgb("#5b8fd9")
#let border-subtle = rgb("#2a2520")

#let font-sans = "DejaVu Sans"
#let font-mono = "DejaVu Sans Mono"

#let page-setup(body) = {
  set page(
    paper: "a4",
    margin: (top: 1.7cm, bottom: 1.5cm, left: 1.7cm, right: 1.7cm),
    fill: bg-dark,
    header: context {
      if counter(page).get().first() > 1 [
        #set text(size: 8pt, fill: text-muted)
        #grid(
          columns: (1fr, 1fr),
          align(left)[#doc-title],
          align(right)[#counter(page).display()],
        )
        #line(length: 100%, stroke: 0.5pt + border-subtle)
      ]
    },
    footer: context {
      if counter(page).get().first() > 1 [
        #set text(size: 7.5pt, fill: text-muted)
        #align(center)[#doc-footer]
      ]
    },
  )
  set text(font: font-sans, size: 10pt, fill: text-primary, lang: "en")
  set par(justify: true, leading: 0.58em, spacing: 0.65em)
  set heading(numbering: "1.")
  show heading.where(level: 1): it => {
    v(0.4em)
    block(
      width: 100%,
      inset: (bottom: 6pt),
      stroke: (bottom: 1.5pt + bronze),
    )[
      #set text(size: 16pt, weight: "bold", fill: bronze, hyphenate: false)
      #it
    ]
    v(0.35em)
  }
  show heading.where(level: 2): it => {
    v(0.25em)
    text(size: 12pt, weight: "semibold", fill: text-primary, hyphenate: false)[#it]
    v(0.2em)
  }
  show link: set text(fill: bronze)
  body
}

#let section-kicker(title) = {
  text(size: 9pt, weight: "semibold", fill: bronze, tracking: 0.08em, hyphenate: false)[#upper(title)]
  v(0.15em)
}

#let callout(body) = block(
  width: 100%,
  fill: bg-panel,
  inset: 12pt,
  radius: 4pt,
  stroke: 0.75pt + border-subtle,
)[
  #set par(justify: true)
  #body
]

#let mono(s) = text(font: font-mono, size: 9pt, fill: bronze)[#s]

#let pill(label, color: bronze) = box(
  fill: color.transparentize(85%),
  inset: (x: 6pt, y: 2pt),
  radius: 3pt,
  stroke: 0.5pt + color,
)[
  #set text(size: 8pt, weight: "medium", fill: color)
  #label
]

#let styled-table(columns, ..rows) = {
  table(
    columns: columns,
    stroke: none,
    inset: 8pt,
    fill: (x, y) => if y == 0 {
      bg-panel
    } else if calc.rem(y, 2) == 0 {
      bg-panel-alt
    } else {
      bg-dark
    },
    ..rows,
  )
}

#let table-header(..cells) = table.header(
  ..cells.map(c => text(weight: "semibold", fill: bronze, hyphenate: false)[#c]),
)

#let diagram-box(body) = block(
  width: 100%,
  fill: bg-panel,
  inset: 14pt,
  radius: 4pt,
  stroke: 0.75pt + border-subtle,
)[#body]

#let bullet-list(..items) = {
  set list(marker: text(fill: bronze)[•])
  list(..items)
}

#let diagram-node(label, sub: none, accent: bronze) = block(
  width: 100%,
  fill: bg-panel-alt,
  inset: (x: 10pt, y: 8pt),
  radius: 3pt,
  stroke: 0.75pt + accent,
)[
  #align(center)[
    #set text(hyphenate: false)
    #text(size: 9pt, weight: "semibold")[#label]
    #if sub != none [
      #v(2pt)
      #text(size: 7.5pt, fill: text-muted, weight: "regular")[#sub]
    ]
  ]
]

#let arrow-right = align(center)[#text(size: 12pt, fill: bronze-dim)[→]]

#let arrow-down = align(center)[#text(size: 14pt, fill: bronze-dim)[↓]]

#let flow-three(left, mid, right) = grid(
  columns: (1fr, auto, 1fr, auto, 1fr),
  column-gutter: 10pt,
  align: horizon,
  left,
  arrow-right,
  mid,
  arrow-right,
  right,
)

#let feature-block(title, ..items) = callout[
  #section-kicker[#title]
  #v(0.15em)
  #bullet-list(..items)
]
