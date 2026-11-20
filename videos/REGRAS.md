# Regras fixas dos vídeos

- **A obsessão sempre vence.** Em todo vídeo comparando disciplina, ego e obsessão, a obsessão é a melhor
  dos três e termina na frente. Ordem fixa: obsessão > disciplina > ego.
- **Estilo da imagem de referência:** animação 2D vetorial; bonecos brancos com contorno preto grosso e cabeça
  redonda; palco cinza-escuro com lâmpadas penduradas e feixes de luz; chão espelhado com reflexo. Quem perde
  a luz fica cinza.
- Roteiro novo a cada vídeo (cenário diferente), sem copiar o vídeo de referência.
- Vertical 1080×1920, 30 fps, PT-BR, texto entre y=168 e y=1330 e fora da coluna de botões.
- **Gancho nos 3 primeiros segundos:** abre com uma frase que todo mundo acredita sobre a disciplina (câmera fechada
  nela) e corta para a negação em vermelho ("errado." / "não.") com impacto, flash e tremor; a câmera abre no cenário.
- **Trilha de suspense** gerada por `trilha/suspense.py` (drone grave, relógio, coração acelerando, ostinato,
  riser, impacto no gancho e no final) + efeitos sincronizados de cada vídeo.

## Decisões da entrevista (vale para todos os vídeos daqui pra frente)

- **Final:** NÃO usar "a obsessão vence". Cada vídeo fecha com uma frase própria, ligada ao tema (ex.: "A META ERA SÓ O COMEÇO.").
- **Canal:** @stick.obsessao. Todo vídeo termina com a pílula "COMENTE OBSESSÃO" + o @, e vem com legenda do post
  (punchline + "Comente OBSESSÃO" + 5–6 hashtags) (sem capa).
- **Formato:** 9:16 pronto para TikTok (1080×1920, 30 fps, MP4 H.264 + AAC), **25 s por padrão**, PT-BR, sem narração.
- **Núcleo:** disciplina × ego × obsessão, com a obsessão no centro e sempre vencendo.
- **Séries:** A = bonecos em palco (comparativos dos três); B = ícones e diagramas minimalistas (metáforas e mitos,
  como os vídeos de GPS/salário/chefe) — a série B ainda será definida antes do primeiro vídeo dela.
- **Visual:** 2D chapado com contorno preto; fundo preto/cinza; **uma cor de destaque só: vermelho = obsessão**
  (disciplina e ego em branco/cinza; quem perde a luz fica cinza). Contadores ao vivo (dia, metros) como no Stick to It.
- **Texto:** digitando em maiúsculas (Montserrat 800) com cursor; nomes em pílulas (Space Mono); palavra-chave em vermelho.
- **Trilha:** grave e lenta (~80 BPM) por `trilha/grave.py`: drone, relógio, pulso sub-grave, motivo sombrio,
  coração acelerando, impacto no gancho e no clímax; efeitos sincronizados de cada vídeo (inclui teclas do texto).

## O que tirei das 5 referências
- moneyinmono: boneco branco de perfil com contorno, palco com lâmpadas, potes brilhando, contador de idade.
- Stick to It (corrida / same pay): rótulos EGO/OBSESSION, contadores de distância ao vivo, tela dividida, mês a mês.
- Degrau Mental (GPS): metáfora contada só com ícones de linha branca e pílulas pequenas.
- Jotaa.ino (salário): feixes de luz do alto, números grandes, texto digitando, mito "a maioria acha" desmontado.
- Itski (chefe): silhuetas, um único brilho de destaque, plateia em ícones, "3 semanas depois".

## Aprendizado com os números (dia 1)
- "Quebrar a parede" foi o melhor: ~3 mil views, mas só ~2,3% de curtidas. Priorizar temas de **impacto** (bater,
  quebrar, martelar) com um clímax de "uau" bem visível.
- Chamada final nova: "QUAL DOS 3 É VOCÊ? COMENTA 1, 2 OU 3", com os nomes numerados no HUD
  (1 · DISCIPLINA, 2 · OBSESSÃO, 3 · EGO). Na hora da chamada, os números do HUD somem e a chamada entra embaixo.

## Atualização: mais chamativo, motivação e energia (a partir de "Derrubar a árvore")
- **Uma cor viva para cada um:** disciplina = azul #2F9BFF, obsessão = vermelho #FF3B30, ego = roxo #B85CFF.
  Cor no contorno de luz do boneco, na ferramenta, no feixe de luz, no rótulo/contador e na palavra-chave da legenda.
- **Motivação:** frases de impacto no meio ("CANSADA, BATE DE NOVO.") e no final ("NÃO PARA NA META.").
- **Mais animado:** palavras pulando na tela (pop + leve quique) em vez de texto digitando; câmera dá um soco a cada
  golpe de quem está em foco; tremor forte no clímax.
- **Trilha:** `trilha/energia.py` (124 BPM, batida 4/4, baixo pulsante, respiro quando o ego desiste, drop no clímax).
- **Duração:** 25 s.

## Fixo a partir de agora
- **Motivação sempre:** todo vídeo tem frase de superação no meio (a obsessão cansada/doendo e continuando) e
  fecha com 2 frases motivacionais próprias do tema (ex.: "PAROU DE REMAR, A CORRENTE LEVA." / "REMA MAIS UM POUCO.").
- **Variar o tema:** não repetir o mesmo tipo de ação seguida (ex.: depois de machado, nada de bater/cortar).

## 4 personagens (a partir de "A corda")
- Elenco fixo: **1 · DISCIPLINA (azul #2F9BFF), 2 · OBSESSÃO (vermelho #FF3B30), 3 · MOTIVAÇÃO (amarelo #FFCC00), 4 · EGO (roxo #B85CFF)**.
- Ordem da história: a **motivação sai na frente e apaga primeiro** (cansa e desiste cedo), o ego desiste quando a
  plateia vai embora, a disciplina bate a meta e para, a **obsessão vence**.
- Chamada: "QUAL DOS 4 É VOCÊ? COMENTA 1, 2, 3 OU 4".
