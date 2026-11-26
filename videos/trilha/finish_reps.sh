#!/usr/bin/env bash
# Uso: bash finish_reps.sh <pasta-do-projeto> <porta>
# Gera trilha enérgica + efeitos (sfx4.py), mixa e renderiza o MP4 em <pasta>/<pasta>.mp4
set -euo pipefail
HF=/tmp/claude-0/-home-user-codigos/189b9105-0dc8-5112-bff7-a7c6ce878b44/scratchpad/hf
P=$1; PORT=$2
cd $HF && python3 energia.py $P/assets/music_raw.wav 25 1.5 3.0 5.6 14.0 19.0 >/dev/null
cd $HF/$P && (python3 -m http.server $PORT >/dev/null 2>&1 &) ; sleep 1.5
cd $HF && NODE_PATH=$(npm root -g) node ../tools/dump_schedule.js http://localhost:$PORT/index.html $P/assets/schedule.json 2>&1 | grep -v "setting 'main'" || true
pkill -f "http.server $PORT" || true
cd $HF/$P/assets && python3 $HF/sfx_reps.py schedule.json music_raw.wav mix_raw.wav >/dev/null && ffmpeg -v error -y -i mix_raw.wav -af loudnorm=I=-14:TP=-1.5 -ar 48000 music.wav
cd $HF/$P && export HYPERFRAMES_NO_TELEMETRY=1 && npx hyperframes render --quality looks --fps 30 -o $P.mp4 > render.log 2>&1
echo "exit $?"
