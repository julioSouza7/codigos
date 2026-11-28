#!/usr/bin/env bash
# Kit "treino" (@stick.obsessao): gera e renderiza um vídeo do formato TREINO (disputa final EGO x OBSESSÃO).
# Uso:   bash videos/trilha/treino/treino.sh <tema> [porta]          -> MP4 em $TREINO_WORK/<tema>4/<tema>4.mp4
#        bash videos/trilha/treino/treino.sh <tema> snap "1.5,8.5,14.3,19.0,22.0"   -> só fotos de conferência (sem render)
# Pasta de trabalho: $TREINO_WORK (padrão /tmp/treino_work). Na primeira vez instala o HyperFrames lá.
set -euo pipefail
KIT=$(cd "$(dirname "$0")" && pwd)
WORK=${TREINO_WORK:-/tmp/treino_work}
T=$1; MODE=${2:-8300}; P=${T}4
export TREINO_WORK=$WORK HYPERFRAMES_NO_TELEMETRY=1
mkdir -p "$WORK"
if [ ! -d "$WORK/node_modules/hyperframes" ]; then
  (cd "$WORK" && { [ -f package.json ] || npm init -y >/dev/null; } && npm i --silent hyperframes@0.9.64 >/dev/null)
fi
python3 "$KIT/mk_treino.py" "$T"
if [ "$MODE" = "snap" ]; then
  (cd "$WORK/$P" && rm -rf snap && npx hyperframes snapshot --at "${3:-0.5,1.5,4.2,8.5,12.6,14.3,15.6,16.5,17.6,18.75,19.0,19.3,20.5,24.0}" --no-end -o snap . >/dev/null 2>&1)
  echo "fotos: $WORK/$P/snap/contact-sheet*.jpg"; exit 0
fi
PORT=$MODE
python3 "$KIT/energia.py" "$WORK/$P/assets/music_raw.wav" 25 1.5 3.0 13.8 15.4 19.0 >/dev/null
(cd "$WORK/$P" && python3 -m http.server "$PORT" >/dev/null 2>&1 &) ; sleep 1.5
NODE_PATH=$(npm root -g) node "$KIT/dump_schedule.js" "http://localhost:$PORT/index.html" "$WORK/$P/assets/schedule.json" 2>&1 | grep -v "setting 'main'" || true
pkill -f "http.server $PORT" || true
(cd "$WORK/$P/assets" && python3 "$KIT/sfx_treino.py" schedule.json music_raw.wav mix_raw.wav >/dev/null && ffmpeg -v error -y -i mix_raw.wav -af loudnorm=I=-14:TP=-1.5 -ar 48000 music.wav)
(cd "$WORK/$P" && npx hyperframes render --quality looks --fps 30 -o "$P.mp4" > render.log 2>&1)
echo "ok $WORK/$P/$P.mp4 ($(ffprobe -v error -show_entries format=duration -of csv=p=0 "$WORK/$P/$P.mp4") s)"
