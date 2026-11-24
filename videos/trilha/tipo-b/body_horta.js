
  // ================= "MESMA HORTA" (layout B, 17 s) =================
  const GT = 13.5, FL = C_FL, END = 12.4, MAXD = 90;
  const dayOf = (t) => Math.max(1, Math.min(MAXD, Math.round(1 + (MAXD - 1) * Math.pow(clamp(t / END), 1.2))));
  const prog = (t) => (dayOf(t) - 1) / (MAXD - 1);
  const B0 = 560, B1 = 820, BT = FL - 40, PER = 1.4, GX = 500;
  const GREEN = [96, 170, 90];

  // faz: rega (de pé) e cuida (agachado), alternando
  const water = (t) => cStandW(GX, 1, 0.2, 0.35, [[GX + 80, FL - 150], [GX + 50, FL - 140]])(t);
  const tend = (t) => { const st = pose(GX + 20, FL, CROUCH_L, 0.6, 0.5, handsDown(GX + 20, C_HY), { gesture: false, noWalk: true }); st.hands = [toRig(st, [B0 + 20 + 10 * Math.sin(t * 8), BT - 6]), toRig(st, [B0 + 4, BT - 2])]; return st; };
  const fazWork = (t) => { const u = (((t - 0.3) / PER) % 1 + 1) % 1; return u < 0.55 ? water(t) : tend(t); };
  const fazKeys = [[0, cStand(GX)], [0.3, fazWork, 0.3], [END, cStandW(GX, 1, -0.05, -0.1, [[GX + 40, FL - 104], [GX - 30, FL - 100]], { prefF: 'down' }), 0.4]];
  const fazState = (t) => seq(fazKeys, t);
  // pensa: compara pacotes de semente e lê
  const compare = (t) => { const s = Math.sin(t * 2.4); return cStandW(GX, 1, 0.05, 0.35, [[GX + 50, FL - 150 + 20 * s], [GX + 20, FL - 150 - 20 * s]])(t); };
  const read = (t) => cStandW(GX, 1, 0.15, 0.5, [[GX + 50, FL - 130], [GX + 34, FL - 126]])(t);
  const pensaW = (t) => ((t / 3.0) % 1 < 0.55 ? compare(t) : read(t));
  const pensaKeys = [[0, compare], [0.5, pensaW, 0.4], [END, cStandW(GX, 1, 0.3, 0.6, [[GX + 30, FL - 96], [GX + 10, FL - 92]]), 0.5]];
  const pensaState = (t) => seq(pensaKeys, t);

  function bed(c) { c.fillStyle = '#5a3c26'; c.strokeStyle = '#0e0e10'; c.lineWidth = 4; c.fillRect(B0, BT, B1 - B0, 40); c.strokeRect(B0, BT, B1 - B0, 40); c.fillStyle = '#3a2a1c'; c.fillRect(B0 + 4, BT, B1 - B0 - 8, 8); }
  function plants(c, t) {
    const p = prog(t);
    for (let i = 0; i < 6; i++) { const x = B0 + 24 + i * 42, g = clamp(p * 1.4 - i * 0.05), h = 150 * g; if (g <= 0.02) continue;
      c.strokeStyle = rgb(GREEN, 0.8); c.lineWidth = 5; c.lineCap = 'round'; c.beginPath(); c.moveTo(x, BT); c.quadraticCurveTo(x + 6 * Math.sin(t * 1.5 + i), BT - h / 2, x, BT - h); c.stroke();
      c.fillStyle = rgb(GREEN); for (let l = 1; l <= Math.floor(g * 5); l++) { const y = BT - l * h / 6, s = (l % 2 ? 1 : -1); c.beginPath(); c.ellipse(x + s * 12, y, 12, 6, s * 0.5, 0, Math.PI * 2); c.fill(); }
      if (p > 0.7) { const r = smooth(seg(p, 0.7, 0.95)) * 9; c.fillStyle = '#d65a44'; c.beginPath(); c.arc(x + 10, BT - h * 0.6, r, 0, Math.PI * 2); c.arc(x - 9, BT - h * 0.45, r * 0.9, 0, Math.PI * 2); c.fill(); } }
  }
  function weed(c, t) { const g = smooth(seg(prog(t), 0.55, 1)); if (g <= 0) return; const x = B0 + 150; c.strokeStyle = '#7a8a5a'; c.lineWidth = 3; for (const a of [-0.5, 0, 0.45]) { c.beginPath(); c.moveTo(x, BT); c.lineTo(x + Math.sin(a) * 40 * g, BT - Math.cos(a) * 55 * g); c.stroke(); } }
  function drawBack(c, k, t, P) { cDark(c, P); cHangLamp(c, 640, 30, FL, 280); bed(c); if (k === 'faz') plants(c, t); else weed(c, t); }
  function drawFront(c, k, t, P, drawn) {
    const R = drawn.main.R, toP = drawn.main.toP, hp = drawn.main.hand;
    if (k === 'faz') { const u = (((t - 0.3) / PER) % 1 + 1) % 1; if (t > 0.3 && t < END && u < 0.55) { c.save(); c.translate(hp[0] + 6, hp[1]); c.rotate(0.5); c.fillStyle = '#6f8a9a'; c.strokeStyle = '#0e0e10'; c.lineWidth = 3; c.beginPath(); c.roundRect(-16, -14, 32, 26, 4); c.fill(); c.stroke(); c.beginPath(); c.moveTo(14, -8); c.lineTo(42, -20); c.stroke(); c.restore();
        for (let i = 0; i < 6; i++) { const a = ((t * 2 + i / 6) % 1); c.fillStyle = 'rgba(140,190,230,0.85)'; c.beginPath(); c.arc(hp[0] + 46 + (i % 3) * 6, hp[1] - 10 + a * (BT - hp[1] + 10), 3, 0, Math.PI * 2); c.fill(); } } }
    else { const sw = (t / 3.0) % 1 < 0.55 || t < 0.5; if (t < END) { if (sw) { for (const [hpx, col] of [[toP(R.armF[2]), '#e8c547'], [toP(R.armB[2]), '#d9cdb8']]) { c.fillStyle = col; c.strokeStyle = '#0e0e10'; c.lineWidth = 2.5; c.fillRect(hpx[0] - 10, hpx[1] - 14, 20, 26); c.strokeRect(hpx[0] - 10, hpx[1] - 14, 20, 26); } }
      else { c.fillStyle = '#2f6fb3'; c.strokeStyle = '#0e0e10'; c.lineWidth = 3; c.fillRect(hp[0] - 22, hp[1] - 16, 44, 30); c.strokeRect(hp[0] - 22, hp[1] - 16, 44, 30); c.fillStyle = '#fff'; c.font = '800 6px Montserrat'; c.textAlign = 'center'; c.fillText('SEMENTE', hp[0], hp[1] - 4); c.fillText('PERFEITA', hp[0], hp[1] + 4); } } }
  }
  const fxF = Array.from({ length: Math.floor((END - 0.3) / PER) }, (_, j) => 0.3 + j * PER);
  const SCENE = {
    minimal: true, layoutB: true, noMonitor: true, metricLabel: '', totalLabel: '', reportT: GT, noReport: true,
    labels: ['FAZ', 'PENSA DEMAIS'], midLabel: (t) => ['MESMA HORTA', `DIA ${dayOf(Math.min(t, GT))}`],
    secsText: (n) => `${n}`, state: { faz: fazState, pensa: pensaState }, drawBack, drawFront,
    cam: () => ({ x: 640, y: 175, z: 1.08 }), pain: { faz: () => 0, pensa: () => 0 },
    bubbles: {
      faz: [{ t0: END + 0.5, t1: GT - 0.05, text: 'TOMATE DE CASA.', col: PAL.faz }],
      pensa: [{ t0: 2.6, t1: 3.9, text: 'QUAL É A MELHOR?' }, { t0: 7.4, t1: 8.6, text: 'VOU PESQUISAR MAIS.' }, { t0: END + 0.4, t1: GT - 0.05, text: '...NASCEU UM MATO.' }],
    },
    shake: () => 0,
    caps: [{ s: GT + 0.1, e: 99, center: true, lines: [[GT + 0.3, [['90 DIAS: '], ['UMA HORTA.', 'faz']]], [GT + 0.9, [['O OUTRO: '], ['UM MATO.', 'dor']]]] }],
    sched: { noBips: true, noPops: true, music: 0.16, fx: [
      ...fxF.map((x) => [x + 0.1, 'water', 0.22, 0.35, 0.6]), ...fxF.map((x) => [x + 0.75, 'foley/cloth_05', 0.2, 0.35]),
      ...fxF.map((x) => [x + 1.17, 'foley/notas_2', 0.32, -0.35, 1.6]), [END + 0.5, 'chime', 0.14, 0.35],
    ] },
  };
