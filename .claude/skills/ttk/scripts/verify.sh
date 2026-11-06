#!/usr/bin/env bash
# Confere o MP4 renderizado: duração, tamanho e uma folha de quadros (2 por segundo).
# Uso: bash verify.sh <video.mp4> [saida.png]
set -euo pipefail
V="${1:?video}"; OUT="${2:-${V%.mp4}_folha.png}"
ffprobe -v error -show_entries format=duration:stream=width,height,r_frame_rate -of default=nw=1 "$V"
DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$V")
COLS=$(python3 -c "import math;print(math.ceil(float('$DUR')*2/2))")
ffmpeg -v error -y -i "$V" -vf "fps=2,scale=135:-1,drawtext=text='%{eif\:t\:d}.%{eif\:mod(t*10\,10)\:d}':x=3:y=3:fontsize=16:fontcolor=yellow:box=1:boxcolor=black,tile=${COLS}x2" -frames:v 1 "$OUT"
echo "Folha de quadros: $OUT"
