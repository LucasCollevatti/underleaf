#!/usr/bin/env bash

set -euo pipefail

image=${UNDERLEAF_COMPILER_IMAGE:-underleaf/compiler:local}

docker run --rm --entrypoint /bin/bash "$image" -s <<'CONTAINER_SCRIPT'
set -euo pipefail

workdir=$(mktemp -d)
trap 'rm -rf "$workdir"' EXIT
export TEXMFVAR="$workdir/texmf-var"
mkdir -p "$TEXMFVAR"

cat >"$workdir/references.bib" <<'BIB'
@book{knuth,
  author = {Donald Knuth},
  title = {The TeXbook},
  year = {1984},
  publisher = {Addison-Wesley}
}
BIB

cat >"$workdir/document.tex" <<'TEX'
\documentclass{article}
\usepackage{fontspec}
\usepackage{tikz}
\usepackage{pgfplots}
\usepackage{circuitikz}
\usepackage{minted}
\usepackage{chemfig}
\usepackage[backend=biber]{biblatex}
\addbibresource{references.bib}
\begin{document}
Supported packages: \cite{knuth}.

\begin{tikzpicture}
  \draw (0,0) -- (1,1);
\end{tikzpicture}

\begin{circuitikz}
  \draw (0,0) to[R] (2,0);
\end{circuitikz}

\chemfig{H_3C-CH_2-OH}

\begin{minted}{text}
minted is available in the compiler image.
\end{minted}

\printbibliography
\end{document}
TEX

cd "$workdir"
pdflatex -interaction=nonstopmode -halt-on-error -shell-escape document.tex >/dev/null
biber document >/dev/null
pdflatex -interaction=nonstopmode -halt-on-error -shell-escape document.tex >/dev/null
pdflatex -interaction=nonstopmode -halt-on-error -shell-escape document.tex >/dev/null
test -s document.pdf

cat >"$workdir/engine.tex" <<'TEX'
\documentclass{article}
\begin{document}
All supported TeX engines can compile this document.
\end{document}
TEX

for engine in xelatex lualatex; do
  "$engine" -interaction=nonstopmode -halt-on-error -output-directory "$workdir" "$workdir/engine.tex" >/dev/null
done

latexmk -pdf -interaction=nonstopmode -halt-on-error -outdir="$workdir" "$workdir/engine.tex" >/dev/null
test -s "$workdir/engine.pdf"
CONTAINER_SCRIPT

printf '%s\n' "Underleaf compiler smoke test passed."
