#!/usr/bin/env bash
# Uso: bash fp/mkproj.sh <projeto> <duração> <fim-da-ação> "<primeira linha da legenda>"
HF=$(cd "$(dirname "$0")/.." && pwd); P=$1; DUR=$2; GT=$3; L1=$4
mkdir -p $HF/$P/assets && cp -r $HF/dor/assets/vendor $HF/$P/assets/ 2>/dev/null; cp $HF/dor/hyperframes.json $HF/$P/
sed "s/\"dor\"/\"$P\"/g" $HF/dor/meta.json > $HF/$P/meta.json
CTA=$(python3 -c "print(round($DUR-2.6,2))")
sed -e "s#assets/dor.js#assets/$P.js#" -e "s#<div class=\"l1\">ÁGUA A 4 GRAUS.</div>#<div class=\"l1\">$L1</div>#" -e "s/data-duration=\"25\"/data-duration=\"$DUR\"/g" \
    -e "s/, 22.4);/, $CTA);/" -e "s/, 19.0);/, $GT);/g" -e "s/, 19.08);/, $GT.08);/" -e "s/      .cap.big {/      .cap.center { top: 800px; font-size: 52px; }\n      .cap.big {/" \
    $HF/dor/index.html > $HF/$P/index.html
