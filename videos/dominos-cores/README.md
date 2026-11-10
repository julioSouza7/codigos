# Vídeo dos dominós em 3 cores (azul, roxo, verde)

O vídeo original (vermelho, 1080×1920, 60 fps, 23,8 s) recolorido sem renderizar de novo: um LUT 3D troca só os tons
de vermelho pela cor nova. Preto, branco, cinza e o movimento ficam idênticos. Saída sem áudio.

| Versão | Matiz OKLCH | Clarear | Croma | Vermelho principal vira |
| --- | --- | --- | --- | --- |
| azul | 262 | 0.04 | 1.0 | `rgb(42,112,247)` |
| roxo | 300 | 0.0 | 1.15 | `rgb(137,52,230)` |
| verde | 150 | 0.12 | 1.0 | `rgb(0,176,80)` |

```bash
python3 make_lut.py azul.cube 262 0.04
python3 make_lut.py roxo.cube 300 0.0 1.15
python3 make_lut.py verde.cube 150 0.12
ffmpeg -i original.mov -an -vf "lut3d=azul.cube:interp=tetrahedral,format=yuv420p" \
  -c:v libx264 -preset slow -crf 16 -r 60 -colorspace bt470bg -color_range tv -movflags +faststart dominos-azul.mp4
```

Outra cor: troque o matiz (0–360). Cores claras como amarelo ou laranja pedem um "clarear" maior (0.1–0.2).
O clarear só atua nos vermelhos médios e claros; o brilho escuro do fundo mantém a intensidade original.
