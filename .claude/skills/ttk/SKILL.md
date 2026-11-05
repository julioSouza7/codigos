---
name: ttk
description: Faz um vídeo vertical estilo TikTok/Reels "hype" (tipografia cinética grande, linhas neon cruzando a tela, glitch, timeline com keyframes, prompt sendo digitado, revelação do logo no drop) em 9:16, 60 fps, 15 s, com trilha sintetizada, feito por código com HyperFrames (HTML + GSAP → MP4), sem MCP. Use quando o usuário pedir /ttk, "vídeo ttk", ou um vídeo nesse estilo para uma marca ou tema ("faça um ttk do Spotify").
---

# /ttk — vídeo vertical hype por código

Formato fixo: **1080×1920, 60 fps, 15 s, PT-BR, trilha sintetizada com drop no logo**. Sem MCP, sem Higgsfield.
`<skill>` = a pasta desta skill. O modelo pronto em `<skill>/template` é o vídeo do Spotify aprovado; copie e troque
texto, cores e logo.

## Estrutura (6 cenas, batidas de 0,5 s a 120 BPM)

| Cena | Arquivo | Tempo | O que faz |
| --- | --- | --- | --- |
| Gancho | `hook.html` | 0–2 s | Quadro 0 já legível: rótulo mono + palavra gigante; slam, tremida, linhas neon. |
| Glitch | `glitch.html` | 2–4 s | Palavra na cor da marca com cópias deslocadas e faixa cortada; barra neon + tag mono. |
| Timeline | `timeline.html` | 4–7,5 s | Painel tipo editor: trilhas, clipes, keyframes que acendem quando o cursor passa, forma de onda. 2 frases. |
| Prompt | `prompt.html` | 7,5–10,5 s | Caixa de prompt digitando + card de resultado. "VOCÊ PEDE." → "ELE TOCA.". Sai com X neon + flash. |
| Slam | `slam.html` | 10,5–12 s | 2 linhas de impacto, rastros de luz, pulsa no riser e é sugado. |
| CTA | `cta.html` | 12–15 s | Drop: anel explode, frase + **logo oficial** + subtítulo parados ≥ 2,5 s; equalizador abaixo da área segura. |

`grain.html` vai por cima de tudo. As durações ficam no `index.html` raiz (`data-fps="60"`, `data-duration="15"`).

## Passo a passo

```bash
export HYPERFRAMES_NO_TELEMETRY=1
B=<pasta-base>   # ex.: o scratchpad
bash <skill>/scripts/setup.sh $B <nome>                 # instala HyperFrames + GSAP local
cd $B/<nome> && cp -r <skill>/template/* .              # copia as cenas
bash <skill>/scripts/get_logo.sh <marca> assets         # logo oficial (lockup, ícone, glifo) + cor oficial
python3 <skill>/scripts/synth.py assets/music_raw.wav 15 12.0 2.0
ffmpeg -y -i assets/music_raw.wav -af loudnorm=I=-14:TP=-1.5 -ar 48000 assets/music.wav
```

1. **Adapte**: cores em `:root` do `index.html` (`--color-accent` etc.); textos em cada cena; `src` do logo em
   `cta.html` (ajuste `width/height` mantendo a proporção do SVG). Rótulos da timeline/prompt ligados ao tema.
2. **Verifique**: `npx hyperframes lint` (0 erros) → `npx hyperframes check --json` (`ok:true`) →
   `npx hyperframes snapshot --at 0,0.5,1.2,2.7,4.8,6.3,8.2,9.4,11,12.8,14.5` e **olhe** os contact-sheets.
3. **Renderize**: `npx hyperframes render --quality looks --fps 60 -o <nome>.mp4` (~2 min).
4. **Área segura**: `bash <skill>/scripts/safe_zone.sh <nome>.mp4 folha.png "0,1,3,5,6.5,8.2,9.5,11,13.5"` e olhe a folha.
5. Entregue o MP4 com a ferramenta de arquivo, com o roteiro cena a cena e as limitações.

## Regras que já deram erro

- Palavra gigante do gancho: ≤ 190 px e escala inicial ≤ 1,1 — com 230 px/1,22 o "PRONTO." saía cortado no quadro 0.
- Texto legível só entre y=168 e y=1330 e fora de x>950 entre y≈880–1330 (botões). Abaixo de 1330, só enfeite.
- Estado escondido no CSS (`opacity:0`); elemento com `transform` no CSS → use `tl.fromTo`, nunca `tl.to`.
- Segundo `fromTo` no mesmo alvo → `immediateRender: false`. Tween de fundo deve acabar antes da saída do mesmo alvo.
- Cópias do glitch sobrepostas: `data-layout-allow-overlap` no contêiner. Nada de `Math.random()`: use `mulberry32(seed)`.
- Marca real: logo oficial, nunca símbolo desenhado; respeite as regras (Spotify: verde só sobre preto/branco, sem
  esticar nem ampliar o logo como transição). Sem números inventados. Peça conceitual — publicar como anúncio oficial
  exige autorização da marca.
- `cdn.jsdelivr.net` costuma estar bloqueado: depois de qualquer `npx hyperframes add`, rode `<skill>/scripts/localize-cdn.sh`.
