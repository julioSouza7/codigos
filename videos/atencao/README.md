# Prenda a atenção: 3 vídeos (balão, copo d'água, pavio)

Três versões do vídeo "dominós até o gigante", cada uma com outro objeto na abertura e outra cor.
O resto segue a estrutura do original: palavras na tela, cronômetro, gráfico de vendas e frase final.
Formato 1080×1920, 60 fps, 24 s, HyperFrames (HTML + GSAP → MP4), sem áudio.

| Versão | Cor | Abertura (0–8,6 s) | Frase |
| --- | --- | --- | --- |
| `balao` | roxo `#9B4DFF` | "SOPROS ATÉ ESTOURAR" 28→0: o balão enche a cada sopro, treme e estoura em confete | VOCÊ FICOU 8 SEGUNDOS ESPERANDO UM BALÃO ESTOURAR. |
| `copo` | azul `#2F7BFF` | "GOTAS ATÉ TRANSBORDAR" 28→0: as gotas enchem o copo, a água sobe acima da borda e a última transborda | VOCÊ FICOU 8 SEGUNDOS VENDO UM COPO ENCHER. |
| `pavio` | laranja `#FF7A1A` | "CM DE PAVIO ATÉ OS FOGOS" 28→0: a faísca corre pelo pavio, o rojão sobe e explode | VOCÊ FICOU 8 SEGUNDOS VENDO UM PAVIO QUEIMAR. |

Depois: AINDA AQUI. → "VOCÊ ESTÁ AQUI HÁ 00:13" → ISSO É ATENÇÃO. → ISSO QUE IMPULSIONA ↑VENDAS → gráfico
(com um detalhe do tema: balãozinho, barra com água, linha que pega fogo) → PRENDA A ATENÇÃO. VENDA MAIS ↑.

## Estrutura

- `base/`: cenas comuns (`ambient`, `rec`, `chart`, `cta`, `grain`), `index.html` e o molde das palavras (`words.tpl.html`).
- `hooks/`: a abertura de cada versão.
- `build.py`: monta os 3 projetos com a cor e as palavras de cada um.

## Gerar e renderizar

```bash
npm install hyperframes gsap@3.14.2                     # numa pasta de trabalho <W>
cp node_modules/gsap/dist/gsap.min.js <W>/gsap.min.js
python3 build.py <W>                                     # cria <W>/balao, <W>/copo, <W>/pavio
cd <W>/balao && npx hyperframes lint && npx hyperframes render --quality looks --fps 60 -o atencao-balao.mp4
```
