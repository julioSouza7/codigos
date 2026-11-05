#!/usr/bin/env bash
# Cria um projeto HyperFrames vertical pronto para uso offline.
# Uso: bash setup.sh <pasta-base> <nome-do-projeto>
set -euo pipefail
BASE="${1:?pasta base}"; NAME="${2:?nome do projeto}"
export HYPERFRAMES_NO_TELEMETRY=1 HYPERFRAMES_SKIP_SKILLS=1
mkdir -p "$BASE"; cd "$BASE"
[ -f package.json ] || npm init -y >/dev/null
npm install --no-fund --no-audit hyperframes@latest gsap@3.14.2 >/dev/null
npx hyperframes init "$NAME" --resolution portrait --non-interactive --skip-skills --skill hyperframes >/dev/null
mkdir -p "$NAME/assets/vendor" "$NAME/compositions/components"
cp node_modules/gsap/dist/gsap.min.js "$NAME/assets/vendor/"
bash "$(dirname "$0")/localize-cdn.sh" "$NAME"
npx hyperframes doctor --json | python3 -c 'import json,sys; d=json.load(sys.stdin); [print(("ok  " if c["ok"] else "FALHA ")+c["name"]+": "+c.get("detail","")) for c in d["checks"] if c["name"] in ("Node.js","FFmpeg","FFprobe","Chrome")]'
echo "Projeto pronto em: $(pwd)/$NAME"
