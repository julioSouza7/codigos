# Spotify ttk em 3 cores (roxo, laranja, azul)

Variações do vídeo do Spotify feito com a skill `ttk` (branch `claude/ttk-skill`, `examples/spotify`).
Formato 1080×1920, 60 fps, 16 s, HyperFrames. Peça conceitual: publicar como anúncio oficial exige autorização da marca.

| Pasta | Destaque | Negação | Luz 2 da parede |
| --- | --- | --- | --- |
| `roxo/` | `#A970FF` | `#FFC23D` | `#FF4FD8` |
| `laranja/` | `#FF7A1A` | `#3DD6FF` | `#FF2E63` |
| `azul/` | `#2EC5FF` | `#FF4F8B` | `#7B61FF` |

O logo do Spotify continua o oficial, em verde, sobre fundo escuro.

## Como foi feito

1. Copiar `template/` e depois `examples/spotify/` da skill `ttk` para um projeto novo.
2. `python3 <ttk>/scripts/theme.py <pasta> <destaque> <negação> "" <luz2>`
3. `python3 theme_extra.py <pasta> <destaque>`: troca os verdes do exemplo do Spotify que o `theme.py` não cobre
   (parede de ripas, luz do monitor, linhas, brilho do anel do logo).
4. Legendas encurtadas em `compositions/caps.html` para a narração caber em cada cena (mesmo texto de `narracao-spotify.txt`).

## Áudio

`assets/mix.wav` não está no git. Para gerar de novo (música + efeitos, sem voz):

```bash
python3 <ttk>/scripts/sfx.py events.json sfx.wav 16
python3 <ttk>/scripts/synth.py music_raw.wav 16 13.54 1.8
ffmpeg -y -i music_raw.wav -i sfx.wav -filter_complex "[0:a]volume=0.55[m];[1:a]volume=1.0[s];[m][s]amix=inputs=2:normalize=0[o]" -map "[o]" -ar 48000 bed.wav
ffmpeg -y -i bed.wav -af loudnorm=I=-14:TP=-1.5 -ar 48000 assets/mix.wav
```

## Narração (voz Carla, ElevenLabs)

Texto e tempos em `narracao-spotify.txt`. Com o MP3 (skill `motion-video`, `scripts/common`):

```bash
python3 narration_sync.py voz.mp3 narracao.wav --duration 16 --min-silence 0.5 \
  --starts 0.05,1.85,3.85,5.85,7.65,9.25,11.45,13.25
bash mix_narration.sh bed.wav narracao.wav mix.wav
# o vídeo não muda: só troca o áudio
ffmpeg -y -i spotify-roxo.mp4 -i mix.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -shortest spotify-roxo-narrado.mp4
```

## Renderizar

```bash
npx hyperframes lint && npx hyperframes render --quality looks --fps 60 -o spotify-<cor>.mp4
```
