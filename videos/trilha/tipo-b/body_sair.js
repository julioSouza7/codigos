
  // ================= ROTEIRO: "A PERGUNTA" (chamar pra sair) — índice de ansiedade =================
  const FL = 300;
  const HY = hipOn(FL, STAND_L);
  const idle = (x, face = 1, extra) => () => pose(x, FL, STAND_L, 0.03, 0.02, handsDown(x, HY), Object.assign({ face }, extra || {}));
  const walk = (x0, x1, t0, t1, face = 1, extra) => (t) => { const x = lerp(x0, x1, easeInOut(seg(t, t0, t1))); return pose(x, FL, STAND_L, 0.04, 0.02, handsDown(x, HY), Object.assign({ face, run: 0 }, extra || {})); };
  const run = (x0, x1, t0, t1, face = 1) => (t) => { const x = lerp(x0, x1, easeInOut(seg(t, t0, t1))); return pose(x, FL, STAND_L, 0.1, -0.05, handsDown(x, HY), { face, run: 1 }); };

  // copo de café na mão da frente
  const cup = (c, R) => { const h = R.armF[2]; c.save(); c.translate(h[0] + 6, h[1] - 6); c.lineWidth = 5; c.strokeStyle = OUT;
    c.fillStyle = '#e8dcc6'; c.beginPath(); c.moveTo(-15, -26); c.lineTo(15, -26); c.lineTo(11, 22); c.lineTo(-11, 22); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = rgb(PAL.azul); c.fillRect(-14, -8, 28, 14); c.strokeRect(-14, -8, 28, 14);
    c.fillStyle = '#5a3a24'; c.fillRect(-18, -34, 36, 9); c.strokeRect(-18, -34, 36, 9); c.restore(); };

  // ---------- 2 · FAZ ----------
  const FX0 = 200, FX1 = 615;
  const fazKeys = [
    [0, idle(FX0)],
    [2.3, () => pose(FX0, FL, CROUCH_L, 0.25, 0.1, [[FX0 + 50, HY + 10], [FX0 - 20, HY + 20]], { sq: 0.04 }), 0.25],   // respira fundo, antecipação
    [2.75, walk(FX0, FX1, 2.75, 4.5), 0.3],
    [4.5, idle(FX1, 1, { hipOff: 0 }), 0.35],
    [6.05, () => pose(FX1, FL, STAND_L, -0.08, -0.15, [[FX1 + 40, HY - 250], [FX1 - 20, HY + 20]], { prefF: 'down' }), 0.2],   // comemora
    [6.75, idle(FX1), 0.4],
    [11.4, () => pose(FX1, FL, STAND_L, -0.12, -0.2, [[FX1 + 30, HY - 20], [FX1 - 10, HY - 10]]), 0.25],   // risada
    [12.5, idle(FX1), 0.4],
    [15.5, idle(FX1, 1), 0.3],
    [15.85, walk(FX1, 1260, 15.85, 18.9, 1), 0.3],
  ];
  const fazState = (t) => {
    const st = seq(fazKeys, t);
    if (t > 11.4 && t < 12.5) st.hipY -= 6 * Math.abs(Math.sin((t - 11.4) * 14));
    return st;
  };
  // pessoa (azul) no painel do FAZ
  const CX = 830;
  const crushIdle = (x, face) => () => pose(x, FL, STAND_L, -0.02, 0.06, [[x + 34, HY - 72], [x + 4, HY + 42]], { face, armFree: 0.25, prop: cup, gesture: false });
  const crushSip = (x, face) => () => pose(x, FL, STAND_L, -0.08, -0.22, [[x + 30, HY - 150], [x + 4, HY + 42]], { face, armFree: 0.25, prop: cup, gesture: false });
  const crushHop = (x, face) => () => pose(x, FL, STAND_L, -0.1, -0.2, [[x + 34, HY - 90], [x + 40, HY - 230]], { face, armFree: 0.25, prop: cup, gesture: false, prefB: 'down' });
  const crushFaz = [
    [0, crushIdle(CX, -1)], [1.0, crushSip(CX, -1), 0.35], [1.8, crushIdle(CX, -1), 0.45],
    [5.9, crushHop(CX, -1), 0.2], [6.7, crushIdle(CX, -1), 0.4],
    [9.0, crushSip(CX, -1), 0.35], [9.5, crushIdle(CX, -1), 0.4],
    [12.6, () => pose(CX, FL, STAND_L, 0.12, 0.25, [[CX + 40, HY - 40], [CX + 10, HY - 20]], { face: -1, armFree: 0.25, prop: cup, gesture: false }), 0.25],
    [13.5, crushIdle(CX, -1), 0.4],
    [15.35, crushIdle(CX, 1), 0.3],
    [15.8, walk(CX, 1420, 15.8, 18.9, 1, { prop: cup, armFree: 0.4 }), 0.3],
  ];
  const crushFazState = (t) => { const st = seq(crushFaz, t); if (t > 5.9 && t < 6.5) st.hipY -= 26 * Math.sin(Math.PI * seg(t, 5.9, 6.25)) * (t < 6.25 ? 1 : 0); return st; };

  // ---------- 1 · PENSA DEMAIS ----------
  const think = (x, face = 1) => () => pose(x, FL, STAND_L, 0.02, 0.2, handsChin(x, HY), { face, gesture: false });
  const nervous = (x) => (t) => pose(x + 2 * Math.sin(t * 41), FL, CROUCH_L.fT ? { fT: 0.25, fS: -0.12, bT: 0.05, bS: -0.2 } : STAND_L, 0.16, 0.3, [[x + 30 + 4 * Math.sin(t * 47), HY - 92], [x + 14 - 4 * Math.sin(t * 43), HY - 86]], { gesture: false, noWalk: true });
  const slump = (x) => () => pose(x, FL, { fT: 0.12, fS: -0.08, bT: -0.04, bS: -0.1 }, 0.32, 0.5, [[x + 30, HY + 62], [x + 14, HY + 66]], { gesture: false });
  const pensaKeys = [
    [0, think(200)],
    [3.8, walk(200, 400, 3.8, 4.85)],
    [4.85, () => pose(400, FL, STAND_L, -0.18, -0.12, [[400 + 30, HY - 40], [400 - 30, HY - 30]], { gesture: false }), 0.22],   // freia
    [5.45, idle(400, -1, { gesture: false }), 0.28],
    [5.75, walk(400, 190, 5.75, 6.85, -1)],
    [6.9, idle(190, -1), 0.3],
    [7.1, idle(190, 1), 0.28],   // vira e ensaia
    [9.15, walk(190, 450, 9.15, 10.2)],
    [10.2, nervous(450), 0.3],
    [11.45, idle(450, -1, { gesture: false }), 0.28],
    [11.75, walk(450, 260, 11.75, 12.75, -1)],
    [12.8, think(260, -1), 0.3],
    [13.25, think(260, 1), 0.3],
    [14.85, () => pose(260, FL, CROUCH_L, 0.35, 0.05, [[260 + 50, HY + 20], [260 - 30, HY + 30]], { sq: 0.05, gesture: false }), 0.2],
    [15.15, run(260, 680, 15.15, 16.2), 0.2],
    [16.2, () => pose(680, FL, STAND_L, -0.2, -0.1, [[680 + 40, HY - 60], [680 - 20, HY - 40]], { gesture: false }), 0.22],
    [16.75, slump(680), 0.6],
  ];
  const pensaState = (t) => seq(pensaKeys, t);
  const crushPensa = [
    [0, crushIdle(CX, -1)], [1.0, crushSip(CX, -1), 0.35], [1.8, crushIdle(CX, -1), 0.45],
    [7.6, crushSip(CX, -1), 0.35], [8.2, crushIdle(CX, -1), 0.45],
    [13.1, () => pose(CX, FL, STAND_L, 0.08, 0.35, [[CX + 34, HY - 72], [CX + 30, HY - 70]], { face: -1, armFree: 0.25, prop: cup, gesture: false }), 0.3],  // olha o relógio
    [14.0, crushIdle(CX, -1), 0.3],
    [14.3, crushIdle(CX, 1), 0.3],
    [14.6, walk(CX, 1350, 14.6, 17.0, 1, { prop: cup, armFree: 0.4 }), 0.3],
  ];
  const crushPensaState = (t) => seq(crushPensa, t);

  // ---------- cenário: café ----------
  function drawBack(c, k, t, P) {
    const h = P.h;
    const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#1b130e'); g.addColorStop(0.7, '#33251b'); g.addColorStop(1, '#241a13');
    c.fillStyle = g; c.fillRect(-60, -40, W + 120, h + 80);
    // lambris
    c.fillStyle = 'rgba(0,0,0,0.18)'; c.fillRect(-60, FL - 90, W + 120, 90);
    c.strokeStyle = 'rgba(0,0,0,0.28)'; c.lineWidth = 3;
    for (let x = -40; x < W + 60; x += 84) { c.beginPath(); c.moveTo(x, FL - 90); c.lineTo(x, FL); c.stroke(); }
    // janela com a rua (luz quente)
    c.save(); c.fillStyle = '#4a3524'; c.fillRect(330, 40, 300, 150); c.strokeStyle = OUT; c.lineWidth = 5; c.strokeRect(330, 40, 300, 150);
    const wg = c.createLinearGradient(0, 40, 0, 190); wg.addColorStop(0, '#6d5136'); wg.addColorStop(1, '#3a2a1c'); c.fillStyle = wg; c.fillRect(336, 46, 288, 138);
    c.strokeStyle = 'rgba(0,0,0,0.4)'; c.lineWidth = 4; c.beginPath(); c.moveTo(480, 46); c.lineTo(480, 184); c.moveTo(336, 115); c.lineTo(624, 115); c.stroke(); c.restore();
    // letreiro CAFÉ pintado no vidro
    c.fillStyle = 'rgba(232,220,198,0.85)'; c.font = '900 34px Montserrat, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('CAFÉ', 480, 150);
    // feixe de luz âmbar
    c.save(); c.globalCompositeOperation = 'lighter'; c.filter = 'blur(16px)';
    const bx = 620; const bg = c.createLinearGradient(0, 0, 0, h); bg.addColorStop(0, rgb(PAL.luz, 1, 0.2)); bg.addColorStop(1, rgb(PAL.luz, 1, 0.04));
    c.fillStyle = bg; c.beginPath(); c.moveTo(bx - 40, -20); c.lineTo(bx + 40, -20); c.lineTo(bx + 300, h); c.lineTo(bx - 260, h); c.closePath(); c.fill(); c.restore();
    c.fillStyle = '#e9cf9e'; c.beginPath(); c.ellipse(620, 8, 46, 9, 0, 0, Math.PI * 2); c.fill();
    // mesinha
    c.strokeStyle = OUT; c.lineWidth = 4; c.fillStyle = '#6b4a30';
    c.fillRect(940, FL - 70, 110, 12); c.strokeRect(940, FL - 70, 110, 12); c.fillRect(988, FL - 58, 12, 58); c.strokeRect(988, FL - 58, 12, 58);
    // piso
    c.fillStyle = '#2a1d14'; c.fillRect(-60, FL, W + 120, h); c.strokeStyle = 'rgba(0,0,0,0.5)'; c.lineWidth = 4; c.beginPath(); c.moveTo(-60, FL); c.lineTo(W + 60, FL); c.stroke();
    c.strokeStyle = 'rgba(255,214,160,0.06)'; c.lineWidth = 2; for (let x = -40; x < W + 60; x += 120) { c.beginPath(); c.moveTo(x, FL + 4); c.lineTo(x - 40, h); c.stroke(); }
  }
  function heart(c, x, y, s, a) {
    c.save(); c.globalAlpha = a; c.translate(x, y); c.scale(s, s);
    c.beginPath(); c.moveTo(0, 12); c.bezierCurveTo(-26, -8, -14, -30, 0, -14); c.bezierCurveTo(14, -30, 26, -8, 0, 12); c.closePath();
    c.fillStyle = rgb(PAL.dor); c.fill(); c.lineWidth = 4; c.strokeStyle = OUT; c.stroke(); c.restore();
  }
  function drawFront(c, k, t, P, drawn) {
    if (k === 'faz') {
      for (const [t0, x, dy] of [[6.0, 730, 0], [6.15, 690, 30], [6.3, 770, 20], [9.5, 735, 10], [12.7, 720, 0]]) {
        const a = t - t0; if (a < 0 || a > 1.6) continue;
        heart(c, x + 10 * Math.sin(a * 5), 160 + dy - 70 * easeOut(a / 1.6), 0.9 * backE(a / 0.3), 1 - smooth(seg(a, 1.1, 1.6)));
      }
    } else if (t > 16.6) {
      // nuvem de chuva em cima do pensa demais
      const hd = drawn.main.head, u = backE(seg(t, 16.6, 17.0));
      c.save(); c.translate(hd[0], hd[1] - 70); c.scale(u, u);
      c.fillStyle = '#5b5560'; c.strokeStyle = OUT; c.lineWidth = 4;
      c.beginPath(); c.arc(-26, 4, 20, 0, Math.PI * 2); c.arc(0, -8, 26, 0, Math.PI * 2); c.arc(28, 4, 20, 0, Math.PI * 2); c.fill(); c.stroke();
      c.fillRect(-40, 4, 82, 20);
      c.strokeStyle = 'rgba(160,200,235,0.9)'; c.lineWidth = 3;
      for (let i = 0; i < 6; i++) { const a = ((t * 2.2 + i * 0.37) % 1); const xx = -34 + i * 14; c.beginPath(); c.moveTo(xx, 26 + a * 70); c.lineTo(xx - 3, 38 + a * 70); c.stroke(); }
      c.restore();
    }
  }

  // ---------- índice de ansiedade ----------
  const painFaz = (t) => { const p = 8 + 46 * smooth(seg(t, 2.3, 4.6)) + 30 * smooth(seg(t, 4.6, 5.1)); return lerp(p, 4 + 1.5 * Math.sin(t * 3), smooth(seg(t, 5.95, 6.5))); };
  const painPensa = (t) => {
    let p = 18 + 30 * smooth(seg(t, 0, 14)) + 4 * Math.sin(t * 2.7);
    p += bump(t, 3.8, 5.3, 26) + bump(t, 7.2, 9.0, 10) + bump(t, 9.3, 11.5, 36) + bump(t, 15.1, 16.4, 16);
    return lerp(p, 93 + 3 * Math.sin(t * 5), smooth(seg(t, 16.2, 16.9)));
  };

  const BLUE = PAL.azul;
  const SCENE = {
    metricLabel: 'ÍNDICE DE ANSIEDADE', totalLabel: 'ANSIEDADE TOTAL', reportT: 19.0,
    secsText: (n) => `${n} SEGUNDO${n > 1 ? 'S' : ''} NO VERMELHO`,
    state: { faz: fazState, pensa: pensaState },
    others: { faz: [{ id: 'other', fn: crushFazState, col: BLUE, seed: 21, glow: 0.35 }], pensa: [{ id: 'other', fn: crushPensaState, col: BLUE, seed: 23, glow: 0.35 }] },
    drawBack, drawFront,
    pain: { faz: painFaz, pensa: painPensa },
    bubbles: {
      faz: [
        { t0: 2.4, t1: 2.95, text: 'BORA.', col: PAL.faz, y: 50 },
        { t0: 4.65, t1: 5.85, text: 'OI! BORA UM CAFÉ?', y: 50 },
        { t0: 5.9, t1: 7.0, text: 'BORA!', col: PAL.faz, who: 'other', y: 50 },
        { t0: 8.0, t1: 9.0, text: 'SÁBADO?', y: 50 },
        { t0: 9.25, t1: 10.4, text: 'FECHADO!', col: PAL.faz, who: 'other', y: 50 },
        { t0: 11.4, t1: 12.4, text: 'HAHAHA', y: 50 },
        { t0: 12.6, t1: 13.5, text: 'HAHA', who: 'other', y: 50 },
      ],
      pensa: [
        { t0: 2.5, t1: 3.7, text: 'E SE DISSER NÃO?', y: 50 },
        { t0: 4.95, t1: 5.95, text: 'NÃO... AINDA NÃO.', col: PAL.dor, y: 50 },
        { t0: 7.3, t1: 8.0, text: 'OI...', y: 50 },
        { t0: 8.1, t1: 9.0, text: 'NÃO. E AÍ?...', y: 50 },
        { t0: 10.35, t1: 11.35, text: 'VAI... VAI...', col: PAL.dor, y: 50 },
        { t0: 12.85, t1: 14.3, text: 'ESPERAR A HORA CERTA.', y: 50 },
        { t0: 14.9, t1: 15.7, text: 'AGORA VAI!', col: PAL.pensa, y: 50 },
        { t0: 16.5, t1: 18.6, text: '...FOI EMBORA.', col: PAL.dor, y: 50, dx: 320 },
      ],
    },
    shake: (k, t) => (k === 'pensa' ? 6 * (t >= 16.25 ? Math.exp(-(t - 16.25) * 8) : 0) : 0),
    energy: (k, t) => (k === 'pensa' && t > 9.3 && t < 11.4 ? 2.2 : 1),
    caps: [
      { s: -1, e: 2.85, lines: [[-1, [['UMA PERGUNTA SIMPLES.']]], [0.3, [['DOIS JEITOS DE '], ['FAZER.', 'dor']]]] },
      { s: 3.0, e: 5.5, lines: [[3.0, [['QUEM '], ['FAZ', 'faz']]], [3.3, [['VAI E PERGUNTA.']]]] },
      { s: 5.6, e: 8.0, lines: [[5.6, [['A RESPOSTA CHEGA']]], [5.95, [['EM '], ['2 SEGUNDOS.', 'faz']]]] },
      { s: 8.1, e: 10.5, lines: [[8.1, [['QUEM '], ['PENSA DEMAIS', 'pensa']]], [8.5, [['ENSAIA. RECUA. ENSAIA.']]]] },
      { s: 10.6, e: 13.2, lines: [[10.6, [['ESPERANDO O']]], [10.95, [['MOMENTO PERFEITO.']]]] },
      { s: 13.3, e: 15.8, lines: [[13.3, [['SÓ QUE O MOMENTO']]], [13.7, [['NÃO '], ['ESPERA.', 'dor']]]] },
      { s: 15.9, e: 18.9, lines: [[15.9, [['A ANSIEDADE']]], [16.3, [['VIROU '], ['ARREPENDIMENTO.', 'dor']]]] },
      { s: 19.1, e: 21.7, big: true, lines: [[19.2, [['A RESPOSTA LEVA']]], [19.6, [['2 '], ['SEGUNDOS.', 'faz']]]] },
      { s: 21.8, e: 99, big: true, lines: [[21.8, [['A DÚVIDA']]], [22.15, [['LEVA '], ['ANOS.', 'dor']]]] },
    ],
    sched: { fx: [[2.3, 'whoosh', 0.18, 0.35], [5.9, 'chime', 0.2, 0.35], [6.05, 'pop', 0.2, 0.35], [9.5, 'pop', 0.12, 0.35], [12.7, 'pop', 0.12, 0.35],
      [4.7, 'beep', 0.12, 0.35], [10.2, 'beep', 0.12, -0.35], [10.45, 'beep', 0.1, -0.35], [14.85, 'whoosh', 0.2, -0.35], [16.25, 'thud', 0.25, -0.35], [16.5, 'sad', 0.22, -0.35], [16.65, 'rain', 0.1, -0.35]],
      heart: [3.0, 19.0] },
  };
