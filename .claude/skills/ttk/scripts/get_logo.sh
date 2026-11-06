#!/usr/bin/env bash
# Baixa o logo OFICIAL de uma marca (via npm, funciona mesmo com sites bloqueados).
# Fontes: @iconify-json/logos (logo completo e ícone) e simple-icons (glifo + cor oficial).
# Uso: bash get_logo.sh <marca> <pasta-saida>     ex.: bash get_logo.sh spotify public
set -euo pipefail
BRAND="${1:?marca (ex.: spotify)}"; OUT="${2:?pasta de saída}"
mkdir -p "$OUT"; OUT="$(cd "$OUT" && pwd)"
TMP="$(mktemp -d)"; cd "$TMP"
npm init -y >/dev/null; npm install --no-fund --no-audit @iconify-json/logos simple-icons >/dev/null
BRAND="$BRAND" OUT="$OUT" node -e '
const fs = require("fs"); const b = process.env.BRAND, out = process.env.OUT;
const set = JSON.parse(fs.readFileSync("node_modules/@iconify-json/logos/icons.json", "utf8"));
let n = 0;
for (const name of [b, b + "-icon", b + "-wordmark"]) {
  const ic = set.icons[name]; if (!ic) continue;
  const w = ic.width || set.width || 16, h = ic.height || set.height || 16;
  fs.writeFileSync(`${out}/${name}.svg`, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">${ic.body}</svg>`);
  console.log(`logos:${name} -> ${out}/${name}.svg (${w}x${h})`); n++;
}
const si = require("simple-icons");
const key = "si" + b.replace(/(^|[-_ ])(\w)/g, (_, __, c) => c.toUpperCase());
if (si[key]) {
  fs.writeFileSync(`${out}/${b}-glyph.svg`, si[key].svg);
  console.log(`simple-icons ${si[key].title}: cor oficial #${si[key].hex}; regras: ${si[key].guidelines || "-"}`); n++;
}
if (!n) { console.error("Marca não encontrada nos pacotes. Tente o nome em minúsculas, com hífen (ex.: google-drive)."); process.exit(1); }
'
rm -rf "$TMP"
