#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC="${ROOT}/docs/portfolio/gitsyncmarks-architecture.typ"
OUT="${ROOT}/docs/portfolio/GitSyncMarks-Architecture.pdf"

if ! command -v typst >/dev/null 2>&1; then
  echo "error: typst CLI not found." >&2
  echo "Install: pacman -S typst   (Arch)  or  https://typst.app/" >&2
  exit 1
fi

if [[ ! -f "${SRC}" ]]; then
  echo "error: source not found: ${SRC}" >&2
  exit 1
fi

echo "Compiling ${SRC} → ${OUT}"
typst compile "${SRC}" "${OUT}" --root "${ROOT}"

pages="$(pdfinfo "${OUT}" 2>/dev/null | awk '/Pages:/ {print $2}')"
if [[ -n "${pages:-}" ]]; then
  echo "Done: ${OUT} (${pages} pages)"
else
  echo "Done: ${OUT}"
fi
