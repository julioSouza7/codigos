
  // ================= MÉTODO MINIMALISTA: "O SALTO" (17 s) =================
  // piada visual: para quem pensa demais, a prancha de 3 m sobe até as nuvens e a piscina vira um balde com tubarão.
  const GT = 13.5, FL = C_FL;
  const BOARD = 150, EDGEX = 500, WATER = 300;           // altura da prancha, ponta, linha d'água (real)
  const POOL0 = 560, POOL1 = 1080;
  const fear = (t) => (smooth(seg(t, 4.8, 7.2)) * 0.6 + smooth(seg(t, 7.2, 8.6)) * 0.4) * (1 - smooth(seg(t, 9.55, 9.9)));
  const JUMP = 0.85, SPL = 1.35, SLIP = 10.2, SPL_P = 10.65;
  const BL = { fT: 0.06, fS: -0.02, bT: -0.08, bS: -0.05 };
  const onBoard = (x, face = 1, extra) => () => pose(x, BOARD, STAND_L, 0.03, 0.15, handsDown(x, hipOn(BOARD, STAND_L)), Object.assign({ face, gesture: false }, extra || {}));
  const runBoard = (t) => { const x = lerp(380, EDGEX, easeIn(seg(t, 0.3, JUMP))); return pose(x, BOARD, STAND_L, 0.15, 0, handsDown(x, hipOn(BOARD, STAND_L)), { run: 1 }); };
  const jump = (t) => { const u = seg(t, JUMP, SPL), x = lerp(EDGEX, 700, u), y = lerp(hipOn(BOARD, STAND_L), WATER + 30, u) - 120 * 4 * u * (1 - u);
    return { x, hipY: y, ay: lerp(BOARD, WATER, u), lean: lerp(0.2, 1.3, u), head: 0.1, legs: { fT: -0.2, fS: -0.3, bT: -0.25, bS: -0.35 }, hands: [[x + 60, y - 230], [x + 40, y - 226]], prefF: 'up', prefB: 'up', grounded: false, face: 1, gesture: false, noWalk: true }; };
  const swim = (t) => { const ph = t * 3.2, x = 720 + 10 * Math.sin(t * 0.8), hy = WATER + 22 + 4 * Math.sin(t * 3);
    return { x, hipY: hy, ay: WATER, lean: 0.9, head: -0.6, legs: { fT: -0.9, fS: -1.0, bT: -1.2, bS: -1.3 }, hands: [[x + 120 + 30 * Math.cos(ph), hy - 60 + 20 * Math.sin(ph)], [x + 100 - 30 * Math.cos(ph), hy - 60 - 20 * Math.sin(ph)]], prefF: 'down', prefB: 'down', grounded: false, face: 1, gesture: false, noWalk: true }; };
  const float = (t) => { const x = 740, hy = WATER - 6 + 4 * Math.sin(t * 1.6);
    return { x, hipY: hy, ay: WATER, lean: -1.5, head: -0.25, legs: { fT: 1.45, fS: 1.55, bT: 1.4, bS: 1.5 }, hands: [[x - 120, hy - 50], [x - 130, hy - 40]], prefF: 'back', prefB: 'back', grounded: false, face: 1, gesture: false, noWalk: true }; };
  const fazKeys = [[0, onBoard(380)], [0.3, runBoard, 0.15], [JUMP, jump, 0.05], [SPL, swim, 0.2], [3.6, float, 0.8]];
  const fazState = (t) => seq(fazKeys, t);
  // pensa demais: na ponta da prancha, olhando para baixo, tremendo
  const lookDown = (tr) => (t) => { const st = onBoard(EDGEX - 10)(t); st.lean = 0.22 + 0.06 * Math.sin(t * 2.1) * tr; st.head = 0.55; st.hands = [[EDGEX + 10 + tr * 3 * Math.sin(t * 41), st.hipY - 20], [EDGEX - 20, st.hipY - 10]]; return st; };
  const backAway = () => (t) => { const st = onBoard(EDGEX - 40)(t); st.lean = -0.2; st.head = 0.3; st.hands = [[EDGEX - 10, st.hipY - 160], [EDGEX - 50, st.hipY - 150]]; return st; };
  const fall = (t) => { const u = easeIn(seg(t, SLIP, SPL_P)), x = lerp(EDGEX, 560, u), y = lerp(hipOn(BOARD, STAND_L), WATER + 40, u);
    return { x, hipY: y, ay: lerp(BOARD, WATER, u), lean: lerp(0.1, -0.6, u), head: -0.3, legs: { fT: 0.5, fS: 0.1, bT: -0.3, bS: -0.5 }, hands: [[x + 60 + 30 * Math.sin(t * 30), y - 200], [x - 50 - 30 * Math.sin(t * 30), y - 190]], prefF: 'up', prefB: 'up', grounded: false, face: 1, gesture: false, noWalk: true }; };
  const waist = () => (t) => pose(580, WATER + 110, STAND_L, 0.05, 0.2, [[580 + 50, WATER - 30], [580 - 30, WATER - 26]], { gesture: false, noWalk: true });
  const pensaKeys = [[0, lookDown(1)], [5.0, lookDown(2)], [8.0, backAway(), 0.5], [9.6, lookDown(1), 0.4], [SLIP, fall, 0.05], [SPL_P, waist(), 0.2]];
  const pensaState = (t) => seq(pensaKeys, t);

  // ---------- cenário ----------
  function drawBack(c, k, t, P) {
    const g = k === 'pensa' ? fear(t) : 0;
    cStage(c, P, [300, 20], [620, 360], 4000);
    // nuvens passando (só no medo): parece que a prancha está nas alturas
    if (g > 0.15) { const u = smooth(seg(g, 0.15, 0.6)); c.save(); c.globalAlpha = 0.5 * u;
      for (let i = 0; i < 4; i++) { const x = ((i * 290 - t * 60) % 1300 + 1300) % 1300 - 100, y = 200 + i * 40; c.fillStyle = '#d8d4cc'; c.beginPath(); c.arc(x, y, 28, 0, Math.PI * 2); c.arc(x + 30, y - 10, 34, 0, Math.PI * 2); c.arc(x + 64, y, 26, 0, Math.PI * 2); c.fill(); }
      c.restore(); }
    // torre e prancha
    c.fillStyle = '#2a2a30'; c.fillRect(300, BOARD, 30, 400); c.strokeStyle = '#3a3a40'; c.lineWidth = 4; for (let y = BOARD + 20; y < 420; y += 30) { c.beginPath(); c.moveTo(340, y); c.lineTo(370, y); c.stroke(); }
    c.fillStyle = '#d9cdb8'; c.strokeStyle = '#0e0e10'; c.lineWidth = 4; c.beginPath(); c.roundRect(300, BOARD - 2, EDGEX - 300 + 30, 12, 4); c.fill(); c.stroke();
    // placa de altura
    const h = Math.round(3 + 97 * g); c.fillStyle = '#e8dcc6'; c.beginPath(); c.roundRect(345, BOARD - 64, 70, 36, 6); c.fill(); c.stroke();
    c.fillStyle = g > 0.3 ? rgb(PAL.dor) : '#1a1a1a'; c.font = '800 20px "Space Mono", monospace'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(`${h} M`, 380, BOARD - 46);
    // piscina: real (larga) ou imaginada (lá embaixo, do tamanho de um balde)
    const yW = lerp(WATER, 470, g), x0 = lerp(POOL0, 700, g), x1 = lerp(POOL1, 760, g);
    const wg = c.createLinearGradient(0, yW, 0, yW + 200); wg.addColorStop(0, '#3f6f86'); wg.addColorStop(1, '#16303c');
    c.fillStyle = wg; c.fillRect(x0, yW, x1 - x0, 260); c.strokeStyle = 'rgba(230,240,250,0.7)'; c.lineWidth = 3;
    c.beginPath(); for (let x = x0; x <= x1; x += 10) { const y = yW + 3 * Math.sin(x * 0.04 + t * 3); if (x === x0) c.moveTo(x, y); else c.lineTo(x, y); } c.stroke();
    c.fillStyle = '#2a2a30'; c.fillRect(x0 - 8, yW - 4, 8, 260); c.fillRect(x1, yW - 4, 8, 260);
    // barbatana de tubarão no balde
    if (g > 0.55) { const u = smooth(seg(g, 0.55, 0.8)), fx = (x0 + x1) / 2 + 14 * Math.sin(t * 2); c.fillStyle = '#5a6670'; c.strokeStyle = '#0e0e10'; c.lineWidth = 3;
      c.beginPath(); c.moveTo(fx - 26 * u, yW + 2); c.lineTo(fx + 8 * u, yW - 58 * u); c.lineTo(fx + 22 * u, yW + 2); c.closePath(); c.fill(); c.stroke(); }
  }
  function drawFront(c, k, t, P, drawn) {
    // respingos
    for (const [t0, x, s] of k === 'faz' ? [[SPL, 700, 1.6]] : [[SPL_P, 570, 0.6]]) { const a = t - t0; if (a < 0 || a > 0.8) continue;
      c.save(); c.globalAlpha = 1 - a / 0.8; c.fillStyle = '#e6f1f6';
      for (let i = 0; i < 12 * s; i++) { const ang = Math.PI * (1.1 + 0.8 * i / (12 * s)), sp = 300 * Math.sqrt(s); c.beginPath(); c.arc(x + Math.cos(ang) * sp * a, WATER + Math.sin(ang) * sp * a + 900 * a * a, 3 + 2 * s, 0, Math.PI * 2); c.fill(); } c.restore(); }
    // água na frente de quem está dentro
    if ((k === 'faz' && t > SPL) || (k === 'pensa' && t > SPL_P - 0.05)) { c.save(); c.globalAlpha = 0.55; c.fillStyle = '#3f6f86'; c.fillRect(POOL0, WATER + 2, POOL1 - POOL0, 260); c.restore(); }
    // óculos escuros boiando
    if (k === 'faz' && t > 3.8) { const hd = drawn.main.head; c.fillStyle = '#111'; c.beginPath(); c.roundRect(hd[0] - 4, hd[1] - 22, 22, 10, 3); c.fill(); }
    if (k === 'pensa' && fear(t) > 0.3) cSweat(c, drawn.main.head, t);
  }

  const SCENE = {
    minimal: true, noMonitor: true, metricLabel: '', totalLabel: '', reportT: GT, noReport: true,
    tint: (k, t) => (k === 'pensa' ? 0.55 * fear(t) : 0), tintCol: [150, 205, 150],
    secsText: (n) => `${n}`,
    state: { faz: fazState, pensa: pensaState },
    drawBack, drawFront,
    cam: (k, t) => { const g = k === 'pensa' ? fear(t) : 0, u = k === 'faz' ? smooth(seg(t, 1.0, 1.9)) : smooth(seg(t, SLIP, SPL_P + 0.5));
      const a = { x: 560, y: 135 + 80 * g, z: 1 - 0.22 * g }, b = { x: 640, y: 225, z: 1.1 };
      return { x: lerp(a.x, b.x, u), y: lerp(a.y, b.y, u), z: lerp(a.z, b.z, u) }; },
    pain: { faz: () => 0, pensa: () => 0 },
    bubbles: {
      faz: [{ t0: 2.2, t1: 3.3, text: 'VEM! TÁ ÓTIMA.', col: PAL.faz }],
      pensa: [
        { t0: 1.5, t1: 2.8, text: 'É ALTO, NÉ?' },
        { t0: 6.4, t1: 7.5, text: 'TEM TUBARÃO?' },
        { t0: 8.2, t1: 9.3, text: 'TÔ TONTO...' },
        { t0: 11.3, t1: 12.6, text: '...TÁ RASO.' },
      ],
    },
    shake: (k, t) => 0,
    caps: [
      { s: GT + 0.1, e: 99, center: true, lines: [[GT + 0.3, [['O SALTO ERA DE '], ['3 METROS.', 'faz']]], [GT + 0.9, [['O MEDO ERA DE '], ['100.', 'dor']]]] },
    ],
    sched: {
      noBips: true, noPops: true, music: 0.18, focusKeys: [[0, 'faz'], [4.6, 'pensa']],
      fx: [
        // FAZ (0–4,5)
        [JUMP, 'whoosh', 0.25, 0.35], [SPL, 'splash', 0.55, 0.35], [SPL, 'thud', 0.2, 0.35], [2.5, 'paddle', 0.3, 0.35, 1.6],
        // PENSA (4,8–13,4)
        [4.8, 'wind', 0.35, -0.35, 2.4], [7.2, 'ominous', 0.45, -0.35, 1.0], [9.6, 'pop', 0.25, -0.35], [SLIP, 'whoosh', 0.22, -0.35], [SPL_P, 'splash_s', 0.45, -0.35],
        [11.3, 'voz_pensa/dor_02', 0.2, -0.35, 1.2], [12.2, 'crickets', 0.3, -0.35, 1.1],
      ],
      heartReal: [[8.1, 9.5, -0.35]],
    },
  };
