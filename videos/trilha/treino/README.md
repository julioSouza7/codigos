# Kit TREINO — vídeos "disputa final EGO x OBSESSÃO" (@stick.obsessao)

Formato aprovado pelo usuário (28/11). Cada vídeo tem 25 s, é 1080x1920 e tem paleta minimalista (branco/cinza, vermelho só na obsessão). As regras completas estão em `videos/REGRAS.md`; leia antes de começar.

## Roteiro fixo (os tempos já estão no motor)
1. **0–2,9 s**: plano aberto com os 4. Gancho "QUATRO X. / SÓ **UM** ...". Todos fazem 1 repetição juntos em 1,5 s.
2. **2,9–6,6 s**, zoom na **1 · MOTIVAÇÃO**: "A MOTIVAÇÃO / COMEÇA A MIL." e "E PARA NO / PRIMEIRO CANSAÇO." (para em 5,6 s e senta).
3. **6,6–10,6 s**, zoom na **2 · DISCIPLINA**: "FAZ NO RITMO." e "BATE A META / E PARA." (meta 1.000 em 10 s).
4. **10,6–19,6 s**, **disputa**: o **3 · EGO** e a **4 · OBSESSÃO** lado a lado, com o placar dos dois embaixo.
   - Uma plateia filma o ego.
   - Os braços ou as pernas dela ficam vermelhos ("... DOEM.").
   - Ela **para primeiro** (cai em 13,8 s) e "O EGO PASSA NA FRENTE.".
   - "MAS ELA VOLTA MAIS RÁPIDO." (15,4 s, repetições muito mais rápidas).
   - "E PASSA O EGO." (cerca de 16,4 s). A plateia vai embora: "SEM PLATEIA, O EGO PARA." (17,3 s).
   - "ELA NÃO PARA." e o **clímax em 19,0 s** (flash, DIA 365 em vermelho).
5. **19,6–25 s**: plano aberto, frase final simples em branco (ex.: "DOEU? CONTINUA.") e a chamada "QUAL DOS 4 É VOCÊ?".
   **A obsessão continua fazendo o exercício até o último quadro.**

## Como gerar
```bash
bash videos/trilha/treino/treino.sh <tema> snap          # fotos de conferência ($TREINO_WORK/<tema>4/snap/contact-sheet*.jpg)
bash videos/trilha/treino/treino.sh <tema> 8301          # trilha + efeitos + render (~10 min); dá para rodar 4 em paralelo com portas diferentes
```
- A pasta de trabalho padrão é `/tmp/treino_work`; dá para trocar com `TREINO_WORK=...`. Na primeira vez o script instala o HyperFrames.
- O MP4 sai em `$TREINO_WORK/<tema>4/<tema>4.mp4`.
- Depois, copie para `videos/quatro-<slug>/` o `quatro-<slug>.mp4`, o `index.html` e o `assets/<tema>4.js`, e escreva o `LEGENDA.txt`.

## Como criar um TEMA novo
1. Em `treino_body.js`, crie `function NOVO() { ... return {...} }` seguindo os modelos `AGACH`, `CORDA`, `HALTER` (de frente) e `SACO` (de lado). Registre em `const TH = { ..., novo: NOVO }`.
   Os campos que o tema devolve:
   - `view`: `'front'` | `'side'`.
   - `part`: `'arms'` | `'legs'` (o que fica vermelho).
   - `HX` e `CX(k)`: posições dos 4. De frente use `FRONT_HX`.
   - `P`: período de cada um. `PER2`: período rápido depois da volta, `3.1 / N`.
   - `repPh`: fase da repetição no ciclo (som, dor e soco de câmera).
   - `payRep`: instante do esforço do clímax.
   - `contT`, `cont0`: onde ela **continua** depois do clímax, e a origem da fase.
   - `stateOf.{motiv,disc,ego,obs}`: poses no tempo, montadas com `seqSt([[t, fn, dur, ease], ...])`.
     - Motivação e ego: param, desabam e sentam (`slumpF`/`sitF` de frente, `slumpP`/`sitP` de lado).
     - Disciplina: para e põe as mãos na cintura.
     - Obsessão: ciclo → queda em `FALL_T` (de joelhos) → levanta → ciclo rápido a partir de `REGRAB_T` → clímax em `CLIMB_T`..19,0 → **ciclo rápido de novo a partir de `contT` até 25 s**.
   - `cam`: planos `wide`, `single`, `duel`. Copie `FRONT_CAM` ou ajuste.
   - `crowdX`, `crowdSc`: posição da plateia, atrás ou ao lado do ego. `metaY`: altura da placa META.
   - `drawBack(c,k,t,lv,st,R)` / `drawFront(...)`: o objeto (barra, corda, halteres, saco...). Para ele acompanhar as transições, use `st.prop`, que é interpolado.
   - `painSpots(R)`: onde saem os tracinhos de dor. `burst(c,t,stateOf)`: faíscas do clímax (opcional).
   - `thuds` e `clanks`: tombos e batidas de metal, que viram som.
2. Em `mk_treino.py`, adicione em `CFG` os textos do tema: `head`, `hook1`, `hook2`, `part`, `quit`, `final`. As posições dos rótulos usam as mesmas do tema; ajuste se for de lado.
3. Em `sfx_treino.py`, adicione o som de repetição em `rep_snd()` e, se quiser, o do clímax.
4. Confira as fotos (`snap`), principalmente:
   - nada passa da borda no plano aberto;
   - o objeto encosta onde deve (o soco chega, as mãos seguram);
   - ela continua se mexendo no fim (compare 24,0 e 24,2 s).
   Depois renderize.

## Legenda do post (`LEGENDA.txt`)
- 1ª linha: o gancho + 1 emoji.
- Um parágrafo curto com a história (motivação, disciplina, ego, obsessão).
- "Qual dos 4 é você? Comenta 1, 2, 3 ou 4 👇"
- **No máximo 5 hashtags, nunca #fyp**. Base: `#obsessão #disciplina #treino #mentalidade #foco`.

## Temas já feitos (não repetir)
barra (`quatro-barras`, motor antigo `reps_*`), flexão (`quatro-flexoes`, `reps_*`), agach (`quatro-agachamentos`), corda (`quatro-cordas`), halter (`quatro-halteres`), saco (`quatro-sacos`). Machado e paredes: outros formatos.

## Ideias para os próximos (escolha 4 por rodada; temas da mesma rodada formam uma série)
- **Remo** (máquina de remo, de lado, braços+pernas; clímax: ela puxa tão forte que o monitor estoura no recorde).
- **Bicicleta ergométrica** (de lado, pernas; clímax: a roda solta faísca e o painel chega a 365 km).
- **Escalada** (parede com agarras, de frente; dói nos braços, ela escorrega e volta; clímax: toca o topo e toca o sino).
- **Esteira/corrida** (de lado, pernas; ela tropeça e cai da esteira, volta correndo mais rápido; clímax: sprint e a esteira solta fumaça).
- **Abdominal** (de lado, barriga/tronco; clímax: senta-se e dá um soco no ar).
- **Burpee** (de frente; clímax: salto altíssimo com palma em cima).
- **Kettlebell** (de frente; clímax: o kettlebell sobe acima da cabeça e trava).
- **Corda naval / battle rope** (de lado, braços; clímax: a onda da corda derruba um cone).
- **Supino** (de lado, deitada no banco; clímax: a barra enverga ao travar).
- **Levantamento terra** (de lado; clímax: tira do chão uma barra com mais anilhas que todos).
- **Subir escada/caixote** (box jump, de lado, pernas; clímax: pula na caixa mais alta).
- **Natação** (de lado na raia; braços; clímax: toca a borda e a água espirra).
