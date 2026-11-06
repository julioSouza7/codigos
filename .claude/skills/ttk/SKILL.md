---
name: ttk
description: Faz um vídeo vertical estilo TikTok/Reels no formato "monitor na mesa" — parece um celular filmando um monitor numa mesa (parede de ripas iluminada, barra de luz, mouses, teclado, câmera na mão) enquanto na tela roda motion design por código: uma faísca incandescente que desenha linhas, escreve os títulos e corta as palavras, letras em brasa, mergulho pela letra O, painel que tomba em 3D e é fatiado, fluxograma com carimbo, prompt sendo digitado, legenda karaokê e efeitos sonoros. 9:16, 60 fps, ~16 s, feito com HyperFrames (HTML + GSAP → MP4), sem MCP. Use quando o usuário pedir /ttk, "vídeo ttk", ou um vídeo nesse estilo para uma marca ou tema ("faça um ttk do Spotify").
---

# /ttk — monitor na mesa, motion design por código

Formato: **1080×1920, 60 fps, 16 s, PT-BR, trilha sintetizada + efeitos sonoros**. Sem MCP, sem Higgsfield.
`<skill>` = a pasta desta skill. `<skill>/template` é o vídeo do Spotify aprovado: copie e troque textos, cor e logo.

## O que faz esse estilo NÃO parecer genérico (não pule nada)

1. **Cenário filmado**: o vídeo é um celular filmando um monitor numa mesa (`env.html`): parede de ripas com luz
   da marca passando por persiana, barra de luz sobre o monitor, mouses, teclado, luz da tela que pisca no ambiente
   a cada impacto. A animação roda **dentro do monitor** em espaço de tela 1920×1080 (`.tk-scr`, escala 0,5417).
2. **Câmera na mão** em tudo que está dentro de `#camera` (`TTK.camera`, com "kicks" nos impactos).
   Etiqueta do topo (`ui.html`) e granulado ficam fora da câmera.
3. **A faísca é a protagonista**: entra no quadro 0, vira o "O" (aqui, o ícone oficial do Spotify), desenha a régua,
   escreve os títulos (`TTK.write`), percorre os conectores, corta painéis e palavras, vira o cursor do prompt.
4. **Cortes de verdade** (`TTK.slice`): toda linha que cruza algo corta em duas metades na diagonal exata.
   Variações: metades voam/caem, ou escorregam e **se juntam de novo** (`rejoin: true`, usado no "CODE").
5. **Transições com causa**: tudo esmaga numa linha que vira a próxima cena; mergulho de câmera pelo furo do "O";
   a linha que sobra se divide nas bordas da caixa de prompt.
6. **Detalhes de interface**: legenda karaokê no canto da tela com a palavra atual numa caixa da cor da marca
   (`caps.html`), cantos com informações (`glass.html`), grade de pixels + reflexo do vidro.
7. **Som**: `scripts/sfx.py` gera um efeito por evento (whoosh, impacto, chiado, zap, pop, clique de tecla, carimbo,
   sub-grave no drop) a partir de `events.json`, mixado com a trilha de `synth.py`.

## Cenas do template (tempos globais)

| Cena | Arquivo | Tempo | O que acontece |
| --- | --- | --- | --- |
| Gancho | `hook.html` | 0–1,8 | Quadro 0 com "SOLTA O"; faísca entra, explode e vira o ícone como "O" de "S●M"; esmaga numa linha. |
| Pronto | `ready.html` | 1,8–3,6 | Letras saltam uma a uma; faísca estaciona no último "O"; câmera mergulha pelo furo. |
| Escrita | `write.html` | 3,6–5,5 | Faísca sai do centro, desenha régua com marcas, sobe, escreve "ANÚNCIO / DO SPOTIFY", contorna. |
| Painel | `ae.html` | 5,5–7,4 | Painel de editor com camadas; tomba em 3D; faísca corta, metades caem. |
| Negação | `andno.html` | 7,4–8,6 | "E NÃO," (rosa), ponto quicando, borrão horizontal + risco, esmaga. |
| Fluxo | `flow.html` | 8,6–10,6 | Nós ligados pela faísca; o do meio é fatiado; carimbo "NÃO." com tremida. |
| Revelação | `code.html` | 10,6–12,4 | "ISSO É" digitado, faísca pousa no ✳ de "Claude", **drop**: "CODE" em brasa, cortado e reunido. |
| Prompt | `prompt.html` | 12,4–16 | As duas linhas viram a caixa; texto digitado com a faísca como cursor e trechos destacados; barra de render no final. |

## Passo a passo

```bash
export HYPERFRAMES_NO_TELEMETRY=1
B=<pasta-base>                                     # ex.: o scratchpad
bash <skill>/scripts/setup.sh $B <nome>            # instala HyperFrames + GSAP local
cd $B/<nome> && cp -r <skill>/template/* .         # cenas, ttk.js, fontes, logo, events.json
bash <skill>/scripts/get_logo.sh <marca> assets    # logo oficial + cor oficial (troque o template)
```

1. **Adapte**: cor da marca em `:root` do `index.html` e nos `rgba(30,215,96,…)` (luz da parede, brasa, faísca);
   textos de cada cena; falas do karaokê em `caps.html` (mesmos tempos das cenas); etiqueta em `ui.html`;
   nomes das camadas no painel; o prompt em `prompt.html` (quebre as linhas à mão, ≤ 46 caracteres, e recalcule os
   índices de destaque `hl`).
2. **Meça antes de posicionar** (faísca que pousa numa letra, mergulho pelo "O", limites de `TTK.write`):
   `NODE_PATH=$(npm root -g) node <skill>/scripts/measure.cjs '[{"f":"BC","px":300,"t":"PRONTO","ls":-0.01}]' assets/fonts`
   devolve largura e a posição de cada letra (BC = Barlow Condensed, IN = Inter, JB = JetBrains Mono). Texto
   centralizado começa em `(1920 - largura) / 2`.
3. **Som**: edite `events.json` (`[tempo, tipo, ganho]`, um evento por impacto/letra/tecla), depois
   ```bash
   python3 <skill>/scripts/sfx.py events.json sfx.wav 16
   python3 <skill>/scripts/synth.py music_raw.wav 16 <drop> <groove>
   ffmpeg -y -i music_raw.wav -i sfx.wav -filter_complex "[0:a]volume=0.55[m];[1:a]volume=1.0[s];[m][s]amix=inputs=2:normalize=0,loudnorm=I=-14:TP=-1.5[o]" -map "[o]" -ar 48000 assets/mix.wav
   ```
4. **Verifique**: `npx hyperframes lint` (0 erros) → `npx hyperframes check --json` → `npx hyperframes snapshot --at …`
   (um instante por cena, incluindo os cortes) e **olhe**. O aviso `first_frame_empty` aparece por causa de
   `data-layout-ignore` na tela; confira o quadro 0 no snapshot.
5. **Renderize**: `npx hyperframes render --quality looks --fps 60 -o <nome>.mp4` (~4 min).
6. **Área segura**: `bash <skill>/scripts/safe_zone.sh <nome>.mp4 folha.png "0.2,2.6,3.3,4.9,6.9,7.8,9.9,11.8,15"`.
   O lado direito do monitor fica sob os botões (como na referência): nada importante a mais de x≈1700 na metade
   de baixo da tela.

## Regras que já deram erro

- Espaço dentro de letras animadas some (span inline-block): `TTK.letters` usa ` `.
- Clone para corte (`TTK.slicePrepare`) **antes** de criar qualquer tween; elementos criados por JS e animados por
  referência não seguem a cópia — anime por classe.
- Vários `fromTo` no mesmo alvo → `immediateRender: false` nos seguintes; partículas e faísca começam com `opacity:0`
  no CSS e entram com `immediateRender: false`.
- Teclado em perspectiva com teclas grandes parece piso de azulejo: teclas pequenas (~34 px), teclado estreito, escuro.
- Listras de persiana duras parecem código de barras: máscara suave + `blur(6px)`.
- Marca real: logo oficial (nunca símbolo desenhado), regras da marca (Spotify: verde só sobre preto/branco, não
  esticar/recolorir). Sem números inventados. Peça conceitual: publicar como anúncio oficial exige autorização.
