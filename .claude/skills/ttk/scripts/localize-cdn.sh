#!/usr/bin/env bash
# Troca o GSAP do CDN (jsdelivr, bloqueado em ambientes na nuvem) pela cópia local.
# Rode depois de cada `npx hyperframes add`. Uso: bash localize-cdn.sh <pasta-do-projeto>
set -euo pipefail
P="${1:?pasta do projeto}"
find "$P" -name '*.html' -not -path '*/node_modules/*' -print0 | xargs -0 sed -i \
  's#https://cdn.jsdelivr.net/npm/gsap@[0-9.]*/dist/gsap.min.js#assets/vendor/gsap.min.js#g'
left=$(grep -rl "cdn.jsdelivr.net" "$P" --include='*.html' || true)
[ -z "$left" ] && echo "GSAP local em todos os arquivos." || { echo "Ainda há CDN em:"; echo "$left"; }
