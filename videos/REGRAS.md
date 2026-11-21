# Regras dos vídeos — @stick.obsessao (versão atual)

## Dois tipos de vídeo
### Tipo A — Obsessão × Disciplina × Motivação × Ego (4 personagens)
- Elenco e ordem fixa: **1 · DISCIPLINA, 2 · OBSESSÃO, 3 · MOTIVAÇÃO, 4 · EGO**. A **obsessão sempre vence**.
- História: a motivação sai na frente e apaga primeiro (~5,6 s), o ego desiste quando a plateia vai embora (~10 s),
  a disciplina bate a meta e para (~14 s), a obsessão passa da meta, sofre ("braço tremendo", "sem ar") e chega no clímax (19 s).
- Cenários variados, nunca o mesmo tipo de ação seguido. Impacto (bater/quebrar) foi o que mais rendeu views.
- Placar embaixo com os 4 números; chamada "QUAL DOS 4 É VOCÊ? COMENTA 1, 2, 3 OU 4".

### Tipo B — Faz × Pensa demais (2 personagens, tela dividida)
- Dois painéis empilhados: **1 · PENSA DEMAIS** (em cima) e **2 · FAZ** (embaixo), mesmo cenário nos dois.
- **Índice de dor**: monitor vermelho no pé de cada painel, com curva de dor e **DOR TOTAL** somando ao vivo.
  O "faz" tem um pico único e curto; o "pensa demais" tem vários picos e dor de fundo por muito mais tempo.
- Final: cartão "ÍNDICE DE DOR · RESULTADO" com as duas curvas e os totais; frase de impacto.
- Falas curtas em balão ("AI!", "VOU CONTAR ATÉ 3...") e chamada "QUAL DOS 2 É VOCÊ? COMENTA 1 OU 2".
- Cenário original a cada vídeo (não copiar vacina/curativo das referências).
- O índice muda conforme o tema: **dor**, **ansiedade**, **cansaço**… (sempre vermelho, com total somando ao vivo).
  O cartão final mostra "N SEGUNDOS NO VERMELHO" para cada um.
- Pode ter um 3º personagem neutro (azul) só como figurante, para dar contexto (ex.: a pessoa do café).

## Mostrar, não contar (o público precisa VER cada ação)
- Toda conquista aparece na tela: beber água (copo esvaziando), correr (rua rolando + contador de KM),
  flexões (contador a cada repetição), café da manhã (comida sumindo do prato), leitura (página virando + contador).
- Cada ação concluída vira uma **pílula com ✓** no canto do painel; os erros do "pensa demais" viram contadores
  (SONECAS: 3, NO CELULAR: 41 MIN). Nada de "5 KM. FEITO." só em balão.
- **Câmera com foco** (`SCENE.cam`): aproxima (1,4–1,75×) em quem está fazendo algo importante e abre quando muda de ação.
- Pode trocar de cenário (casa → rua) com corte e flash rápido.
- Relógio fixo no canto do painel quando o tempo importa.
- Duração: pode passar de 25 s quando a história pede (o despertador detalhado tem **40 s**). Cartão final 2 com a
  lista do que cada um fez (✓ × ✗).

## Animação (nada de boneco robótico)
- Motor do tipo B em `trilha/tipo-b/` (`head.js` + roteiro `body_*.js` + `tail.js`, montado com `build.sh`).
- Todo boneco passa pela camada `alive()`:
  - **caminhada e corrida de verdade**: pernas, braços e quadril calculados pela distância andada, sem deslizar;
  - **respiração** e micro-movimentos o tempo todo, mesmo parado;
  - **atraso** das mãos e da cabeça em relação ao corpo, para dar sensação de peso;
  - **gesto ao falar**: a cabeça acompanha o ritmo e a mão da frente gesticula.
- Transições entre poses passam um pouco do ponto e assentam (`backE`).
- Antecipação antes de cada ação grande (agachar antes de correr), virar de lado ao mudar de direção.
- Câmera de mão leve em cada painel.
- Efeitos sonoros automáticos (`sfx_fp.py`): passos sincronizados com a caminhada, "bips" de fala, toques, impacto no resultado.

## Visual (paleta das referências MindSet / Stick to It)
- Palco **sépia quente**: fundo marrom-escuro (#1a120c → #33251b), parede de madeira, **holofote âmbar** (#FFD6A0).
- Bonecos brancos com contorno preto grosso e brilho na cor do personagem; rótulos em **pílulas com contorno colorido**.
- Cores: vermelho #E5483B (dor / obsessão), laranja #F2A23A (pensa demais / motivação), verde #4FBF6A (faz / dinheiro),
  dourado #E8C547 (ego), azul #2F9BFF (disciplina). Gráficos de crescimento em dourado/laranja; dor sempre em vermelho.
- Texto em **português**, palavras **pulando** na tela (pop), palavra-chave na cor do personagem.

## Formato e som
- 9:16 (1080×1920), 30 fps, **25 s** (até ~40 s se a história tiver mais ações), sem narração, texto entre y=168 e y=1330 e **fora da coluna de botões** (x>950).
- Gancho nos 3 primeiros segundos com impacto (flash + tremor). Motivação sempre: frase de superação no meio e 2 frases finais próprias.
- Nunca usar "a obsessão vence" como frase final.
- **Sons realistas (tipo B)**: vozes e ruídos são **gravações reais CC0** em `trilha/sons/` (ver `LICENCAS.md`):
  gemidos/gritos de dor (`voz_pensa/`, `voz_faz/`, uma voz por personagem), velcro/papel para coisas arrancando,
  tecido nos movimentos, coração gravado acelerando. Sintetizado só o que é eletrônico (bipe do monitor) e respiração.
  Sem "bips" de desenho animado nas falas quando houver voz real. Trilha mais baixa (~0,42) para os efeitos aparecerem.
- Trilha por código: `trilha/energia.py` (tipo A, enérgica) ou `trilha/grave.py` (tipo B, tensão) + efeitos sincronizados.
- Sem capa. Legenda do post em `LEGENDA.txt` de cada pasta. Postar 1–3 por dia (ideal 2, ~12h e ~19h).

## Referências estudadas
- moneyinmono, Stick to It (corrida, same pay, overthinker × doer, curativo com PAIN), Degrau Mental (GPS),
  Jotaa.ino (salário), Itski (chefe), MindSet (escritório sépia com EGO/MOTIVATION/OBSESSION).
