
  // ================= "MESMA ESTANTE" (layout B, 17 s) =================
  const GT = 13.5, FL = C_FL, END = 12.4, MAXD = 365;
  const dayOf = (t) => Math.max(1, Math.min(MAXD, Math.round(1 + (MAXD - 1) * Math.pow(clamp(t / END), 1.3))));
  const prog = (t) => (dayOf(t) - 1) / (MAXD - 1);
  const AX = 500, SH0 = 650, SH1 = 870, PER = 0.9;
  const SPINES = [[201, 162, 122], [170, 130, 95], [222, 205, 180], [140, 110, 80]];

  const readP = (t) => { const flip = Math.max(0, Math.sin(t * 5)); return cSeat(AX, 1, 0.12, 0.45, [[AX + 60 + 10 * flip, FL - 128 - 8 * flip], [AX + 44, FL - 122]])(t); };
  const fazKeys = [[0, readP], [END, cSeat(AX, 1, -0.1, -0.1, (t) => [[AX + 40, FL - 240 + 10 * Math.sin(t * 9)], [AX + 30, FL - 104]], { prefF: 'down' }), 0.4]];
  const fazState = (t) => seq(fazKeys, t);
  const scroll = (t) => cSeat(AX, 1, 0.22, 0.42, (t2) => [[AX + 36, FL - 132 + 2 * Math.sin(t2 * 6)], [AX + 26, FL - 128]])(t);
  const pensaKeys = [[0, scroll], [END, cSeat(AX, 1, 0.4, 0.6, [[AX + 30, FL - 150], [AX + 22, FL - 146]]), 0.5]];
  const pensaState = (t) => seq(pensaKeys, t);
  const nBooks = (t) => Math.round(24 * prog(t));

  function shelf(c, k, t) {
    c.fillStyle = '#3a2a1c'; c.strokeStyle = '#0e0e10'; c.lineWidth = 4; c.fillRect(SH0, 60, SH1 - SH0, FL - 60); c.strokeRect(SH0, 60, SH1 - SH0, FL - 60);
    for (const y of [130, 200, 270]) { c.fillStyle = '#5a3c26'; c.fillRect(SH0, y, SH1 - SH0, 8); }
    if (k !== 'faz') return; const n = nBooks(t);
    for (let i = 0; i < n; i++) { const row = Math.floor(i / 8), col = i % 8, x = SH0 + 12 + col * 25, h = 52 + ((i * 7) % 4) * 4; c.fillStyle = rgb(SPINES[i % 4]); c.fillRect(x, 130 + row * 70 - h, 20, h); c.strokeRect(x, 130 + row * 70 - h, 20, h); }
  }
  function armchair(c) { c.fillStyle = '#4a3a30'; c.strokeStyle = '#0e0e10'; c.lineWidth = 4; c.beginPath(); c.roundRect(AX - 60, FL - 150, 40, 150, 10); c.fill(); c.stroke(); c.beginPath(); c.roundRect(AX - 50, FL - 66, 110, 30, 8); c.fill(); c.stroke(); c.fillRect(AX + 40, FL - 36, 12, 36); c.strokeRect(AX + 40, FL - 36, 12, 36); }
  function boxes(c, t) { const n = Math.min(8, Math.round(8 * prog(t)) + (t > 0.3 ? 1 : 0)); for (let i = 0; i < n; i++) { const x = 330 + (i % 3) * 52, y = FL - Math.floor(i / 3) * 40; c.fillStyle = '#b08850'; c.strokeStyle = '#0e0e10'; c.lineWidth = 3; c.fillRect(x - 24, y - 38, 48, 38); c.strokeRect(x - 24, y - 38, 48, 38); c.beginPath(); c.moveTo(x - 24, y - 28); c.lineTo(x + 24, y - 28); c.stroke(); } }
  function drawBack(c, k, t, P) { cDark(c, P); cHangLamp(c, 600, 30, FL, 270); shelf(c, k, t); armchair(c); if (k === 'pensa') boxes(c, t); }
  function drawFront(c, k, t, P, drawn) {
    const hp = drawn.main.hand;
    if (k === 'faz' && t < END) { const fl = (t * 5 / Math.PI) % 2 < 1; c.save(); c.translate(hp[0] - 8, hp[1] - 6); c.fillStyle = rgb(SPINES[Math.floor(t / PER) % 4]); c.strokeStyle = '#0e0e10'; c.lineWidth = 3; c.beginPath(); c.moveTo(-26, -18); c.lineTo(0, -12); c.lineTo(26, -18); c.lineTo(26, 14); c.lineTo(0, 20); c.lineTo(-26, 14); c.closePath(); c.fill(); c.stroke();
      c.fillStyle = '#f4ead8'; c.beginPath(); c.moveTo(-22, -15); c.lineTo(0, -9); c.lineTo(22, -15); c.lineTo(22, 11); c.lineTo(0, 17); c.lineTo(-22, 11); c.closePath(); c.fill(); if (fl) { c.fillStyle = '#fffaf0'; c.beginPath(); c.moveTo(0, -9); c.lineTo(14, -20); c.lineTo(14, 8); c.lineTo(0, 17); c.closePath(); c.fill(); c.stroke(); } c.restore(); }
    if (k === 'pensa' && t < END) cPhone(c, hp, t);
  }
  const fxF = Array.from({ length: Math.floor(END / PER) }, (_, j) => j * PER + 0.2);
  const SCENE = {
    minimal: true, layoutB: true, noMonitor: true, metricLabel: '', totalLabel: '', reportT: GT, noReport: true,
    labels: ['FAZ', 'PENSA DEMAIS'], midLabel: (t) => ['MESMA ESTANTE', `DIA ${dayOf(Math.min(t, GT))}`],
    secsText: (n) => `${n}`, state: { faz: fazState, pensa: pensaState }, drawBack, drawFront,
    cam: () => ({ x: 610, y: 175, z: 1.08 }), pain: { faz: () => 0, pensa: () => 0 },
    bubbles: {
      faz: [{ t0: END + 0.5, t1: GT - 0.05, text: 'LIVRO 24.', col: PAL.faz }],
      pensa: [{ t0: 2.4, t1: 3.7, text: 'QUAL EU LEIO PRIMEIRO?' }, { t0: 7.2, t1: 8.4, text: 'COMPREI MAIS 3.' }, { t0: END + 0.4, t1: GT - 0.05, text: 'UM DIA EU LEIO.' }],
    },
    shake: () => 0,
    caps: [{ s: GT + 0.1, e: 99, center: true, lines: [[GT + 0.3, [['1 ANO: '], ['24 LIVROS LIDOS.', 'faz']]], [GT + 0.9, [['O OUTRO: '], ['24 NA CAIXA.', 'dor']]]] }],
    sched: { noBips: true, noPops: true, music: 0.16, fx: [
      ...fxF.map((x, j) => [x, 'foley/pagina_' + (1 + (j % 2)), 0.32, 0.35, 2.0]),
      ...fxF.map((x, j) => (j % 3 === 2 ? [x + 0.47, 'box', 0.28, -0.35] : [x + 0.47, 'scroll', 0.1, -0.35])), [END + 0.5, 'chime', 0.14, 0.35],
    ] },
  };
