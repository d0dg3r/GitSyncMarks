# Architecture PDF (Portfolio)

English architecture overview (~4–5 pages) for job applications.

## Build

```bash
./scripts/build_architecture_pdf.sh
```

Output: `docs/portfolio/GitSyncMarks-Architecture.pdf`

**Dependency:** [Typst](https://typst.app/) CLI (`pacman -S typst` on Arch).

## Customize

Edit [`my-role.typ`](my-role.typ) — name and role line before sending.

Do not commit the generated PDF if it contains personal application data.
