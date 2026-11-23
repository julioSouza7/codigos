#!/usr/bin/env bash
# Uso: bash fp/build.sh <projeto> <body.js>  -> monta <projeto>/assets/<projeto>.js (head + common_b + roteiro + tail)
D=$(cd "$(dirname "$0")" && pwd)
cat "$D/head.js" "$D/common_b.js" "$D/$2" "$D/tail.js" > "$D/../$1/assets/$1.js"
