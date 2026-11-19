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
- **Formato:** 9:16 pronto para TikTok (1080×1920, 30 fps, MP4 H.264 + AAC), **23 s por padrão** (era 18 s; +5 s pedido), PT-BR, sem narração.
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
