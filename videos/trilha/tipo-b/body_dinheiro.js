
  // ================= ROTEIRO: "O DINHEIRO" (32 s) — índice de preocupação =================
  const GT = 27.0, FL = C_FL;
  const FOCUS = [[0, null], [2.8, 'faz'], [7.0, 'pensa'], [11.0, 'faz'], [13.5, 'pensa'], [16.0, 'faz'], [18.5, 'pensa'], [21.0, 'faz'], [23.5, 'pensa'], [GT, null]];
  const dimOf = focusTrack(FOCUS);
  const DAYS = [[0, 1], [11.0, 10], [16.0, 20], [21.0, 30]];
  const dayOf = (t) => { let d = 1; for (const [a, n] of DAYS) if (t >= a) d = n; return d; };
  const CHX = 600, TB0 = 640, TB1 = 790, TT = FL - 82;
  const PIG = [672, TT - 16];

  // ---------- 2 · FAZ: moedas no cofrinho ----------
  const COINS = [[3.3, 6.1, 4], [11.2, 13.0, 2], [16.2, 17.6, 2], [21.1, 22.0, 1]];   // [início, fim, moedas]
  const coinTimes = COINS.flatMap(([a, b, n]) => Array.from({ length: n }, (_, i) => a + (i + 0.6) * ((b - a) / n)));
  const dropCoin = ([a, b, n]) => (t) => { const per = (b - a) / n, u = ((t - a) % per) / per; const up = [PIG[0] - 4, PIG[1] - 42], slot = [PIG[0], PIG[1] - 18];
    const hp = u < 0.5 ? P2([CHX + 36, FL - 104], up, smooth(u / 0.5)) : P2(up, slot, smooth((u - 0.5) / 0.3));
    return cSeat(CHX, 1, 0.3, 0.32, [hp, [CHX + 34, FL - 96]])(t); };
  const sitIdle = cSeat(CHX, 1, 0.1, 0.1, [[CHX + 40, FL - 98], [CHX + 30, FL - 96]]);
  const OPEN = 22.1;
  const countMoney = cSeat(CHX, 1, 0.25, 0.35, (t) => [[PIG[0] + 4 + 6 * Math.sin(t * 9), TT - 30], [PIG[0] - 20, TT - 24]]);
  const fazKeys = [[0, sitIdle]];
  for (const w of COINS) fazKeys.push([w[0], dropCoin(w), 0.3], [w[1], sitIdle, 0.35]);
  fazKeys.push([OPEN, countMoney, 0.3], [23.3, cSeat(CHX, 1, -0.08, -0.15, [[CHX + 50, FL - 250], [CHX - 10, FL - 110]], { prefF: 'up' }), 0.3]);
  fazKeys.sort((p, q) => p[0] - q[0]);
  const fazState = (t) => seq(fazKeys, t);
  const saved = (t) => { const n = coinTimes.filter((x) => t >= x + 0.25).length; return n === 0 ? 0 : t >= OPEN + 0.6 ? 600 : Math.min(500, n * 20 + (t >= 11 ? 160 : 0) + (t >= 16 ? 180 : 0)); };

  // ---------- 1 · PENSA DEMAIS: delivery e compras ----------
  const phoneSit = cSeat(CHX, 1, 0.22, 0.42, (t) => [[CHX + 34, FL - 132 + 2 * Math.sin(t * 9)], [CHX + 26, FL - 128]]);
  const eatBag = cSeat(CHX, 1, 0.2, 0.1, (t) => { const u = 0.5 - 0.5 * Math.cos(t * 5); return [P2([716, TT - 26], [CHX + 26, FL - 140], u), [CHX + 34, FL - 100]]; });
  const shop = cSeat(CHX, 1, 0.25, 0.3, (t) => [[700 + 6 * Math.sin(t * 7), TT - 8], [690, TT - 6]]);
  const wallet = cSeat(CHX, 1, 0.3, 0.45, [[CHX + 42, FL - 120], [CHX + 30, FL - 118]]);
  const pensaKeys = [[0, sitIdle], [7.0, phoneSit, 0.35], [9.5, eatBag, 0.35], [13.5, shop, 0.35], [18.5, phoneSit, 0.35], [20.0, eatBag, 0.35], [23.5, phoneSit, 0.3], [25.2, wallet, 0.35]];
  const pensaState = (t) => seq(pensaKeys, t);
  const SPENDS = [[9.4, 60], [14.4, 180], [14.9, 220], [15.4, 180], [19.6, 90], [20.4, 470]];
  const spent = (t) => SPENDS.filter(([x]) => t >= x).reduce((s, [, v]) => s + v, 0);

  // ---------- cenário ----------
  function drawBack(c, k, t, P) {
    cRoom(c, P, false, [380, 40, 150, 110]);
    cSofa(c, 830); cChair(c, CHX); cTable(c, TB0, TB1, TT);
    cFloor(c, P);
  }
  function piggy(c, x, y, s, broken) {
    c.save(); c.translate(x, y); c.scale(s, s); c.fillStyle = '#f2a0b4'; c.strokeStyle = OUT; c.lineWidth = 3.5;
    if (!broken) { c.beginPath(); c.ellipse(0, 0, 26, 18, 0, 0, Math.PI * 2); c.fill(); c.stroke(); c.beginPath(); c.ellipse(24, 2, 7, 6, 0, 0, Math.PI * 2); c.fill(); c.stroke();
      c.fillStyle = '#111'; c.fillRect(-6, -19, 12, 3); c.beginPath(); c.arc(14, -6, 2, 0, Math.PI * 2); c.fill();
      for (const lx of [-14, 10]) { c.fillStyle = '#f2a0b4'; c.fillRect(lx, 14, 7, 8); c.strokeRect(lx, 14, 7, 8); } }
    else { for (const [a, b] of [[-1, 0.3], [1, -0.2]]) { c.save(); c.translate(a * 18, 6); c.rotate(b); c.fillStyle = '#f2a0b4'; c.beginPath(); c.moveTo(-14, -10); c.lineTo(12, -14); c.lineTo(16, 8); c.lineTo(-10, 10); c.closePath(); c.fill(); c.stroke(); c.restore(); } }
    c.restore();
  }
  function bill(c, x, y, r, col = '#7fbf7f') { c.save(); c.translate(x, y); c.rotate(r); c.fillStyle = col; c.strokeStyle = OUT; c.lineWidth = 2.5; c.fillRect(-18, -9, 36, 18); c.strokeRect(-18, -9, 36, 18); c.fillStyle = 'rgba(0,0,0,0.25)'; c.beginPath(); c.arc(0, 0, 5, 0, Math.PI * 2); c.fill(); c.restore(); }
  function boxAt(c, x, y, w = 50, h = 38) { c.fillStyle = '#b08850'; c.strokeStyle = OUT; c.lineWidth = 3; c.fillRect(x - w / 2, y - h, w, h); c.strokeRect(x - w / 2, y - h, w, h); c.strokeStyle = 'rgba(0,0,0,0.3)'; c.beginPath(); c.moveTo(x - w / 2, y - h + 10); c.lineTo(x + w / 2, y - h + 10); c.stroke(); }
  function drawFront(c, k, t, P, drawn) {
    if (k === 'faz') {
      const broken = t >= OPEN + 0.3;
      piggy(c, PIG[0], PIG[1], 1 + 0.06 * Math.sin(t * 2), broken);
      // moeda caindo no cofrinho
      for (const x of coinTimes) { const a = t - x; if (a >= -0.2 && a < 0.25) { const hp = drawn.main.hand; const p = a < 0 ? hp : P2(hp, [PIG[0], PIG[1] - 16], a / 0.25); c.fillStyle = '#e8c547'; c.strokeStyle = OUT; c.lineWidth = 2; c.beginPath(); c.ellipse(p[0], p[1], 6, 6, 0, 0, Math.PI * 2); c.fill(); c.stroke(); } }
      if (broken) { const u = smooth(seg(t, OPEN + 0.3, OPEN + 0.9)); for (let i = 0; i < 12; i++) { const ang = i * 0.53; c.fillStyle = '#e8c547'; c.strokeStyle = OUT; c.lineWidth = 2; c.beginPath(); c.arc(PIG[0] + Math.cos(ang) * 40 * u, PIG[1] + 14 - Math.abs(Math.sin(ang)) * 6 * u, 5, 0, Math.PI * 2); c.fill(); c.stroke(); }
        for (let i = 0; i < 5; i++) bill(c, PIG[0] + 30 + i * 8, PIG[1] + 6 - i * 3, -0.2 + i * 0.1); }
    } else {
      // celular
      if ((t >= 7.0 && t < 9.5) || (t >= 18.5 && t < 20.0) || (t >= 23.5 && t < 25.2)) cPhone(c, drawn.main.hand, t, t >= 23.6 ? '#ff6b5e' : '#6fa8ff');
      // sacola de delivery na mesa
      if ((t >= 9.2 && t < 13.5) || t >= 19.6) { c.fillStyle = '#c99a5b'; c.strokeStyle = OUT; c.lineWidth = 3; c.beginPath(); c.moveTo(728, TT - 2); c.lineTo(760, TT - 2); c.lineTo(756, TT - 44); c.lineTo(732, TT - 44); c.closePath(); c.fill(); c.stroke(); c.fillStyle = rgb(PAL.dor); c.font = '900 10px Montserrat'; c.textAlign = 'center'; c.fillText('FOOD', 744, TT - 20); }
      // notebook com o carrinho
      if (t >= 13.5 && t < 18.5) cLaptop(c, 720, TT, (cc, x, y, w, h) => { cc.fillStyle = '#e5483b'; cc.fillRect(x, y, w, 12); cc.fillStyle = '#fff'; cc.font = '800 8px Montserrat'; cc.textAlign = 'center'; cc.fillText('COMPRAR', x + w / 2, y + 8);
        for (let i = 0; i < 3; i++) { cc.fillStyle = ['#2f9bff', '#e8c547', '#4fbf6a'][i]; cc.fillRect(x + 6 + i * 22, y + 20, 16, 16); } cc.fillStyle = '#e5483b'; cc.fillRect(x + 8, y + 42, w - 16, 10); });
      // caixas chegando no chão
      const nb = t < 14.4 ? 0 : t < 14.9 ? 1 : t < 15.4 ? 2 : 3;
      for (let i = 0; i < nb; i++) { const t0 = [14.4, 14.9, 15.4][i], dy = -60 * (1 - easeIn(clamp((t - t0) / 0.2))); boxAt(c, 860 + (i % 2) * 52, FL + dy - (i === 2 ? 38 : 0)); }
      // carteira vazia com traças
      if (t >= 25.2) { const hp = drawn.main.hand; c.fillStyle = '#4a3220'; c.strokeStyle = OUT; c.lineWidth = 3; c.beginPath(); c.roundRect(hp[0] - 18, hp[1] - 16, 36, 22, 4); c.fill(); c.stroke();
        for (let i = 0; i < 3; i++) { const a = (t - 25.4 - i * 0.2); if (a < 0) continue; const x = hp[0] + 10 + a * 40 + 6 * Math.sin(a * 12 + i), y = hp[1] - 20 - a * 50; c.fillStyle = '#c8bca8'; c.beginPath(); c.ellipse(x - 4, y, 5, 3, Math.sin(a * 30), 0, Math.PI * 2); c.ellipse(x + 4, y, 5, 3, -Math.sin(a * 30), 0, Math.PI * 2); c.fill(); } }
    }
  }
  // fatura grande na tela
  function billCard(c, t) { const t0 = 23.9; if (t < t0) return; const s = backE(seg(t, t0, t0 + 0.4));
    c.save(); c.translate(W / C_UI - 300, 200); c.rotate(0.05); c.scale(s, s); c.fillStyle = '#f7f0e2'; c.strokeStyle = OUT; c.lineWidth = 4; c.beginPath(); c.roundRect(-120, -64, 240, 128, 8); c.fill(); c.stroke();
    c.fillStyle = '#3a3a40'; c.font = '700 16px "Space Mono", monospace'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('FATURA DO CARTÃO', 0, -38);
    c.fillStyle = '#d03a2e'; c.font = '900 40px Montserrat, sans-serif'; c.fillText('R$ 1.800', 0, 8); c.font = '700 14px "Space Mono", monospace'; c.fillText('VENCE HOJE', 0, 44); c.restore(); }
  const brl = (v) => v.toLocaleString('pt-BR');
  function drawOverlay(c, k, t, P, drawn, toS) {
    if (t > GT) return;
    const d = dayOf(t), d0 = DAYS.find(([, n]) => n === d)[0]; cCorner(c, `DIA ${d}`, t, d > 1 ? d0 : null);
    if (k === 'faz') { cStack(c, t, [[3.5, () => `COFRINHO: R$ ${brl(saved(t))}`, PAL.faz, true]]);
      if (t >= OPEN + 0.6) cPill(c, 330, 56, `R$ ${brl(600)} GUARDADOS`, PAL.faz, true, backE(seg(t, OPEN + 0.6, OPEN + 1.0)), true); }
    else { cStack(c, t, [[9.4, () => `GASTOS: R$ ${brl(spent(t))}`, PAL.dor, false], [13.6, () => `PEDIDOS: ${t < 14.4 ? 1 : t < 19.6 ? 4 : 6}`, PAL.pensa, null]]); billCard(c, t); }
  }

  // ---------- índice ----------
  const painFaz = (t) => 25 - 18 * smooth(seg(t, 3, 22)) + 2 * Math.sin(t * 2);
  const painPensa = (t) => Math.min(100, 20 + 3 * Math.sin(t * 2.2) + 2.2 * (spent(t) / 60) + spike(t, 23.9, 45, 0.6) + (t > 24 ? 30 : 0));

  const SCENE = {
    metricLabel: 'ÍNDICE DE PREOCUPAÇÃO', totalLabel: 'PREOCUPAÇÃO TOTAL', reportT: GT, noReport: true, dimOf, bubbleMaxX: 780,
    secsText: (n) => `${n}`,
    state: { faz: fazState, pensa: pensaState },
    drawBack, drawFront, drawOverlay,
    cam: (k, t) => (k === 'faz' ? cCam([[0, 640, 190, 1.1], [2.8, 650, 175, 1.6], [7.0, 640, 190, 1.1], [11.0, 650, 175, 1.6], [13.5, 640, 190, 1.1], [16.0, 650, 175, 1.6], [18.5, 640, 190, 1.1], [21.0, 650, 180, 1.55]])(t)
      : cCam([[0, 640, 190, 1.1], [7.0, 640, 170, 1.55], [9.3, 680, 180, 1.4], [13.5, 760, 190, 1.25], [18.5, 660, 175, 1.5], [23.5, 640, 180, 1.4]])(t)),
    pain: { faz: painFaz, pensa: painPensa },
    bubbles: {
      faz: [
        { t0: 2.9, t1: 3.6, text: 'R$ 20 POR DIA.', col: PAL.faz },
      ],
      pensa: [
        { t0: 7.2, t1: 8.6, text: 'SÓ HOJE...' },
        { t0: 13.7, t1: 15.0, text: 'TÁ EM PROMOÇÃO!' },
        { t0: 18.6, t1: 20.0, text: 'MÊS QUE VEM EU GUARDO.', col: PAL.pensa },
        { t0: 25.4, t1: 26.8, text: '...', col: PAL.dor },
      ],
    },
    shake: (k, t) => (k === 'pensa' ? 6 * (t >= 23.9 ? Math.exp(-(t - 23.9) * 7) : 0) : 0),
    caps: [
      { s: -1, e: 2.8, lines: [[-1, [['GUARDAR DINHEIRO.']]], [0.3, [['DOIS JEITOS DE '], ['TENTAR.', 'dor']]]] },
      { s: 2.9, e: 7.0, lines: [[2.9, [['QUEM '], ['FAZ', 'faz']]], [3.25, [['GUARDA UM POUCO TODO DIA.']]]] },
      { s: 7.05, e: 11.0, lines: [[7.05, [['QUEM '], ['PENSA DEMAIS', 'pensa']]], [7.45, [['"SÓ HOJE".']]]] },
      { s: 11.05, e: 13.5, lines: [[11.05, [['DIA 10:']]], [11.4, [['R$ 200 NO '], ['COFRINHO.', 'faz']]]] },
      { s: 13.55, e: 16.0, lines: [[13.55, [['DIA 10:']]], [13.9, [['3 CAIXAS NA '], ['PORTA.', 'dor']]]] },
      { s: 16.05, e: 18.5, lines: [[16.05, [['DIA 20:']]], [16.4, [['MOEDA POR '], ['MOEDA.', 'faz']]]] },
      { s: 18.55, e: 21.0, lines: [[18.55, [['DIA 20:']]], [18.9, [['"MÊS QUE VEM '], ['EU GUARDO."', 'dor']]]] },
      { s: 21.05, e: 23.5, lines: [[21.05, [['DIA 30:']]], [21.4, [['QUEBRA O '], ['COFRINHO.', 'faz']]]] },
      { s: 23.55, e: GT, lines: [[23.55, [['DIA 30:']]], [23.9, [['CHEGA A '], ['FATURA.', 'dor']]]] },
      { s: GT + 0.1, e: 99, center: true, lines: [[GT + 0.3, [['QUEM FAZ: '], ['+R$ 600.', 'faz']]], [GT + 0.9, [['PENSA DEMAIS: '], ['−R$ 1.800.', 'dor']]]] },
    ],
    sched: {
      noBips: true, noPops: true, music: 0.42, focusKeys: FOCUS,
      fx: [
        ...coinTimes.map((x, i) => [x + 0.2, 'foley/moeda_' + (1 + (i % 3)), 0.45, 0.35]),
        [OPEN + 0.3, 'thud', 0.18, 0.35], [OPEN + 0.32, 'foley/moedas_varias', 0.55, 0.35], [22.8, 'foley/notas_1', 0.45, 0.35],
        // pensa
        ...[7.3, 7.55, 7.8, 8.05].map((x) => [x, 'foley/toque_tela', 0.45, -0.35]), [8.6, 'doorbell', 0.25, -0.35], [9.2, 'box', 0.3, -0.35], [9.4, 'cardbeep', 0.25, -0.35],
        [9.9, 'crunch', 0.3, -0.35], [10.5, 'crunch', 0.3, -0.35],
        ...[13.7, 13.95].map((x) => [x, 'foley/toque_tela', 0.45, -0.35]), [14.4, 'box', 0.45, -0.35], [14.9, 'box', 0.45, -0.35], [15.4, 'box', 0.45, -0.35],
        ...[18.7, 18.95].map((x) => [x, 'foley/toque_tela', 0.45, -0.35]), [19.3, 'doorbell', 0.22, -0.35], [19.6, 'cardbeep', 0.25, -0.35], [20.4, 'cardbeep', 0.25, -0.35],
        [23.9, 'ding', 0.25, -0.35], [24.6, 'voz_pensa/dor_02', 0.35, -0.35], [25.3, 'foley/cloth_05', 0.3, -0.35], [25.9, 'exhale', 0.22, -0.35],
      ],
    },
  };
