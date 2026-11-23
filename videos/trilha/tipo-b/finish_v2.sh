#!/usr/bin/env bash
# Uso: bash fp/finish_v2.sh <projeto> <body.js> <porta> <grave|energia>  (tela única; duração em <projeto>/durgt.txt)
set -euo pipefail
HF=/tmp/claude-0/-home-user-codigos/189b9105-0dc8-5112-bff7-a7c6ce878b44/scratchpad/hf
P=$1; B=$2; PORT=$3; M=${4:-grave}; read DUR GT < $HF/$P/durgt.txt
cd $HF && bash fp/build.sh $P $B
if [ "$M" = energia ]; then python3 energia.py $P/assets/music_raw.wav $DUR 0.02 1.2 4.0 $(python3 -c "print($GT-5)") $GT >/dev/null;
else python3 grave.py $P/assets/music_raw.wav $DUR 0.02 3.0 $(python3 -c "print($GT-4)") $GT >/dev/null; fi
cd $HF/$P && (python3 -m http.server $PORT >/dev/null 2>&1 &) ; sleep 1.5
cd $HF && NODE_PATH=$(npm root -g) node ../tools/dump_schedule.js http://localhost:$PORT/index.html $P/assets/schedule.json 2>&1 | grep -v "setting 'main'" || true
pkill -f "http.server $PORT" || true
cd $HF/$P/assets && python3 $HF/fp/sfx_fp.py schedule.json music_raw.wav mix_raw.wav && ffmpeg -v error -y -i mix_raw.wav -af loudnorm=I=-14:TP=-1.5 -ar 48000 music.wav
cd $HF/$P && export HYPERFRAMES_NO_TELEMETRY=1 && npx hyperframes render --quality looks --fps 30 -o $P.mp4 > render.log 2>&1
echo "exit $?"
