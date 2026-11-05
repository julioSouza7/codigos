#!/usr/bin/env bash
# Desenha por cima de quadros do vídeo as áreas que o Reels/TikTok cobrem (topo, faixa de legenda/usuário,
# coluna de botões à direita) e monta uma folha para conferir se algum texto cai nelas.
# Uso: bash safe_zone.sh video.mp4 saida.png "0,3,6,9,12"
set -euo pipefail
V="${1:?video}"; OUT="${2:?png}"; TIMES="${3:-0,3,6,9,12}"
TMP="$(mktemp -d)"; i=0
IFS=',' read -ra TS <<< "$TIMES"
for t in "${TS[@]}"; do
  ffmpeg -v error -y -ss "$t" -i "$V" -frames:v 1 -vf "scale=1080:1920,\
drawbox=x=0:y=0:w=1080:h=168:color=red@0.35:t=fill,\
drawbox=x=0:y=1330:w=1080:h=590:color=red@0.35:t=fill,\
drawbox=x=950:y=880:w=130:h=450:color=orange@0.45:t=fill,\
drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf:text='${t}s':x=20:y=20:fontsize=56:fontcolor=white:box=1:boxcolor=black,\
scale=270:480" "$TMP/f$(printf %02d $i).png"; i=$((i+1))
done
ffmpeg -v error -y -pattern_type glob -i "$TMP/f*.png" -vf "tile=${#TS[@]}x1" -frames:v 1 "$OUT"
rm -rf "$TMP"; echo "Folha: $OUT  (vermelho = coberto pela interface; laranja = botões curtir/comentar)"
