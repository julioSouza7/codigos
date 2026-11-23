
  // ================= ROTEIRO: "O TREINO" (32 s) — índice de culpa =================
  const GT = 27.0, FL = C_FL;
  const FOCUS = [[0, null], [2.8, 'faz'], [7.0, 'pensa'], [11.0, 'faz'], [13.5, 'pensa'], [16.0, 'faz'], [18.5, 'pensa'], [21.0, 'faz'], [23.5, 'pensa'], [GT, null]];
  const dimOf = focusTrack(FOCUS);
  const WEEKS = [[0, 1], [11.0, 4], [16.0, 8], [21.0, 12]];
  const weekOf = (t) => { let w = 1; for (const [a, n] of WEEKS) if (t >= a) w = n; return w; };
  const KG = (t) => (t < 11 ? 5 : t < 16 ? 10 : t < 21 ? 15 : 20);
  const GX = 520;                          // faz na academia
  const SOFA = 905;

  // ---------- 2 · FAZ: rosca com halteres, o peso sobe a cada fase ----------
  const CURL = [[3.2, 6.8], [11.2, 13.3], [16.2, 18.3], [21.2, 22.6]];
  const curling = (t) => CURL.some(([a, b]) => t >= a && t < b);
  const curlPose = (t) => { const per = 1.0, u = 0.5 - 0.5 * Math.cos(((t - 3.2) / per) * Math.PI * 2), alt = Math.floor((t - 3.2) / per) % 2;
    const down = (dx) => [GX + 12 + dx, FL - 88], up = (dx) => [GX + 36 + dx, FL - 182];
    return cStandW(GX, 1, 0.06 - 0.04 * u, -0.05, [alt ? down(6) : P2(down(6), up(6), u), alt ? P2(down(-6), up(-6), u) : down(-6)], { prefF: 'down', prefB: 'down' })(t); };
  const rest = (t) => cStandW(GX, 1, 0.08, 0.1, [[GX + 16, FL - 92], [GX + 4, FL - 90]])(t);
  const flex = (t) => cStandW(GX, 1, -0.05, -0.1, [[GX + 46, FL - 196], [GX - 34, FL - 196]], { prefF: 'down', prefB: 'down' })(t);
  const fazKeys = [[0, rest]];
  for (const [a, b] of CURL) fazKeys.push([a, curlPose, 0.3], [b, rest, 0.35]);
  fazKeys.push([22.7, flex, 0.35]);
  fazKeys.sort((p, q) => p[0] - q[0]);
  const fazState = (t) => seq(fazKeys, t);

  // ---------- 1 · PENSA DEMAIS: sofá, celular, suplemento, salgadinho ----------
  const sofaPhone = cSeat(SOFA, -1, 0.2, 0.38, (t) => [[SOFA - 26, FL - 160 + 2 * Math.sin(t * 5)], [SOFA - 18, FL - 150]]);
  const sofaChips = cSeat(SOFA, -1, 0.1, 0.1, (t) => { const u = 0.5 - 0.5 * Math.cos(t * 5.5); return [P2([SOFA - 40, FL - 100], [SOFA - 18, FL - 146], u), [SOFA - 44, FL - 98]]; });
  const sofaRelax = cSeat(SOFA, -1, -0.15, 0.0, [[SOFA + 22, FL - 158], [SOFA + 34, FL - 150]], { prefF: 'back', prefB: 'back' });
  const pushTry = (t) => { const X = 640, th = lerp(0.42, 0.08, smooth(seg(t, 19.6, 20.4))); const toe = [X - 135, FL - 10];
    const hip = [toe[0] + 160 * Math.cos(th), toe[1] - 160 * Math.sin(th)], sh = [hip[0] + 100 * Math.cos(th), hip[1] - 100 * Math.sin(th)], a = -(Math.PI / 2 - th);
    return { x: hip[0], ax: X, hipY: hip[1], ay: FL, lean: Math.PI / 2 - th, head: -0.35 + 0.4 * smooth(seg(t, 20.2, 20.6)), legs: { fT: a, fS: a, bT: a - 0.03, bS: a - 0.03 },
      hands: [[sh[0] + 6, FL - 13], [sh[0] - 6, FL - 13]], prefF: 'back', prefB: 'back', grounded: false, face: 1, gesture: false, noWalk: true }; };
  const pensaKeys = [
    [0, sofaRelax],
    [7.0, sofaPhone, 0.35],
    [13.5, cStandW(SOFA - 60, -1, 0.15, 0.2, [[SOFA - 120, FL - 120], [SOFA - 110, FL - 116]]), 0.4],   // recebe a caixa
    [14.6, sofaChips, 0.45],
    [18.6, cStand(700, -1), 0.4], [19.0, cWalk(700, 640, 19.0, 19.3, -1), 0.2], [19.3, pushTry, 0.4],
    [21.0, sofaRelax, 0.6],
    [23.5, cSeat(SOFA, -1, 0.35, 0.5, [[SOFA - 20, FL - 150], [SOFA - 6, FL - 146]]), 0.4],
  ];
  const pensaState = (t) => seq(pensaKeys, t);

  // ---------- cenários ----------
  function drawGym(c, k, t, P) {
    const h = P.h; c.fillStyle = '#1e1713'; c.fillRect(-300, -100, W + 600, h + 200);
    c.fillStyle = 'rgba(255,255,255,0.04)'; for (let x = -280; x < W + 300; x += 120) c.fillRect(x, -100, 60, FL + 100);
    // espelho
    c.fillStyle = '#3d4a4f'; c.strokeStyle = OUT; c.lineWidth = 5; c.fillRect(640, 30, 260, 180); c.strokeRect(640, 30, 260, 180);
    c.fillStyle = 'rgba(255,255,255,0.1)'; c.beginPath(); c.moveTo(660, 40); c.lineTo(710, 40); c.lineTo(670, 200); c.lineTo(660, 200); c.closePath(); c.fill();
    // suporte de halteres
    c.fillStyle = '#3a3a40'; c.fillRect(160, FL - 110, 220, 12); c.strokeRect(160, FL - 110, 220, 12); c.fillRect(160, FL - 60, 220, 12); c.strokeRect(160, FL - 60, 220, 12);
    for (const lx of [166, 366]) { c.fillRect(lx, FL - 110, 10, 110); c.strokeRect(lx, FL - 110, 10, 110); }
    for (let i = 0; i < 6; i++) { const r = 8 + i * 1.5; for (const yy of [FL - 120, FL - 70]) { c.fillStyle = '#1b1b1f'; c.beginPath(); c.arc(184 + i * 34, yy, r, 0, Math.PI * 2); c.fill(); c.stroke(); } }
    c.fillStyle = '#e8dcc6'; c.font = '900 34px Montserrat, sans-serif'; c.textAlign = 'center'; c.fillText('ACADEMIA', 270, 150);
    c.save(); c.globalCompositeOperation = 'lighter'; c.filter = 'blur(16px)'; const bg = c.createLinearGradient(0, 0, 0, h); bg.addColorStop(0, rgb(PAL.luz, 1, 0.22)); bg.addColorStop(1, rgb(PAL.luz, 1, 0.04));
    c.fillStyle = bg; c.beginPath(); c.moveTo(GX - 30, -20); c.lineTo(GX + 40, -20); c.lineTo(GX + 240, h); c.lineTo(GX - 220, h); c.closePath(); c.fill(); c.restore();
    cFloor(c, P, '#151515');
  }
  function drawLiving(c, k, t, P) {
    cRoom(c, P, false, [380, 40, 150, 110]);
    // calendário com as segundas riscadas
    c.fillStyle = '#efe6d6'; c.strokeStyle = OUT; c.lineWidth = 4; c.beginPath(); c.roundRect(600, 40, 150, 120, 6); c.fill(); c.stroke();
    c.fillStyle = rgb(PAL.dor); c.fillRect(600, 40, 150, 22); c.fillStyle = '#fff'; c.font = '800 14px "Space Mono", monospace'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('SEGUNDAS', 675, 51);
    const n = mondays(t); c.strokeStyle = rgb(PAL.dor); c.lineWidth = 3;
    for (let i = 0; i < 12; i++) { const x = 612 + (i % 4) * 34, y = 74 + Math.floor(i / 4) * 28; c.strokeStyle = 'rgba(0,0,0,0.25)'; c.lineWidth = 2; c.strokeRect(x, y, 26, 22);
      if (i < n) { c.strokeStyle = rgb(PAL.dor); c.lineWidth = 3; c.beginPath(); c.moveTo(x + 3, y + 3); c.lineTo(x + 23, y + 19); c.moveTo(x + 23, y + 3); c.lineTo(x + 3, y + 19); c.stroke(); } }
    // estante com o pote de suplemento (fechado)
    c.fillStyle = '#5a3c26'; c.strokeStyle = OUT; c.lineWidth = 4; c.fillRect(160, FL - 150, 150, 12); c.strokeRect(160, FL - 150, 150, 12);
    if (t > 14.4) { c.fillStyle = '#2b2b30'; c.beginPath(); c.roundRect(200, FL - 200, 44, 50, 6); c.fill(); c.stroke(); c.fillStyle = rgb(PAL.ouro); c.fillRect(204, FL - 186, 36, 16); c.fillStyle = '#111'; c.font = '800 9px Montserrat'; c.fillText('WHEY', 222, FL - 177); }
    cSofa(c, 820);
    cFloor(c, P);
  }
  const mondays = (t) => (t < 9.0 ? 0 : t < 13.5 ? 1 : t < 18.5 ? 4 : t < 23.5 ? 8 : 12);
  function drawBack(c, k, t, P) { if (k === 'faz') drawGym(c, k, t, P); else drawLiving(c, k, t, P); }
  // halter: placas maiores conforme o peso
  function dumbbell(c, p, kg) { const r = 6 + kg * 0.7; c.save(); c.translate(p[0], p[1]); c.strokeStyle = OUT; c.lineWidth = 3;
    c.fillStyle = '#9a9aa2'; c.fillRect(-16, -3, 32, 6); c.strokeRect(-16, -3, 32, 6);
    for (const s of [-1, 1]) { c.fillStyle = '#1b1b1f'; c.beginPath(); c.roundRect(s * 16 - (s > 0 ? 0 : 8), -r, 8, r * 2, 2); c.fill(); c.stroke(); } c.restore(); }
  function drawFront(c, k, t, P, drawn) {
    if (k === 'faz') {
      const R = drawn.main.R, toP = drawn.main.toP, kg = KG(t);
      dumbbell(c, toP(R.armB[2]), kg); dumbbell(c, toP(R.armF[2]), kg);
      if (curling(t) && t > 12) cSweat(c, drawn.main.head, t);
    } else {
      // celular
      if (t >= 7.2 && t < 13.5) cPhone(c, drawn.main.hand, t);
      // caixa do suplemento chegando
      if (t >= 13.5 && t < 14.6) { const hp = drawn.main.hand; c.fillStyle = '#b08850'; c.strokeStyle = OUT; c.lineWidth = 3; c.fillRect(hp[0] - 26, hp[1] - 34, 50, 38); c.strokeRect(hp[0] - 26, hp[1] - 34, 50, 38); }
      // salgadinho
      if (t >= 14.6 && t < 18.6) { const hb = drawn.main.toP(drawn.main.R.armB[2]); c.fillStyle = '#e5483b'; c.strokeStyle = OUT; c.lineWidth = 3; c.beginPath(); c.roundRect(hb[0] - 16, hb[1] - 26, 32, 40, 4); c.fill(); c.stroke();
        c.fillStyle = '#e8c547'; c.font = '900 9px Montserrat'; c.textAlign = 'center'; c.fillText('CHIPS', hb[0], hb[1] - 4); }
      if (t > 20.3 && t < 21.0) cSweat(c, drawn.main.head, t, 1);
    }
  }
  function drawOverlay(c, k, t, P, drawn, toS) {
    if (t > GT) return;
    const w = weekOf(t), w0 = WEEKS.find(([, n]) => n === w)[0];
    cCorner(c, `SEMANA ${w}`, t, w > 1 ? w0 : null);
    if (k === 'faz') {
      const tr = t < 3.2 ? 0 : t < 11 ? 1 : t < 16 ? 12 : t < 21 ? 24 : 36;
      cStack(c, t, [[3.2, () => `TREINOS: ${tr}`, PAL.faz, true], [3.2, () => `PESO: ${KG(t)} KG`, PAL.faz, null]]);
      if (curling(t)) { const hs = toS(drawn.main.hand); cPill(c, clamp(hs[0] + 40, 300, 760), 56, `${KG(t)} KG`, PAL.ouro, null, 1 + 0.2 * Math.exp(-Math.max(0, t - CURL.find(([a, b]) => t >= a && t < b)[0]) * 6), true); }
    } else {
      cStack(c, t, [[9.0, () => `SEGUNDAS ADIADAS: ${mondays(t)}`, PAL.dor, false], [14.4, 'SUPLEMENTO: FECHADO', PAL.pensa, false]]);
    }
  }

  // ---------- índice de culpa ----------
  const painFaz = (t) => 30 - 22 * smooth(seg(t, 3, 12)) + 3 * Math.sin(t * 2);
  const painPensa = (t) => Math.min(100, 30 + 4 * Math.sin(t * 2.3) + spike(t, 9.0, 18, 1) + 50 * smooth(seg(t, 9, 25)) + spike(t, 20.3, 20, 1.2));

  const SCENE = {
    metricLabel: 'ÍNDICE DE CULPA', totalLabel: 'CULPA TOTAL', reportT: GT, noReport: true, dimOf, bubbleMaxX: 780,
    secsText: (n) => `${n}`,
    state: { faz: fazState, pensa: pensaState },
    drawBack, drawFront, drawOverlay,
    cam: (k, t) => (k === 'faz' ? cCam([[0, 540, 200, 1.05], [2.8, 520, 175, 1.45], [7.0, 560, 200, 1.1], [11.0, 520, 170, 1.5], [13.5, 560, 200, 1.1], [16.0, 520, 168, 1.55], [18.5, 560, 200, 1.1], [21.0, 520, 168, 1.6]])(t)
      : cCam([[0, 640, 190, 1.05], [7.0, 860, 170, 1.55], [11.0, 760, 190, 1.1], [13.5, 820, 180, 1.4], [16.0, 760, 190, 1.1], [18.5, 640, 220, 1.4], [21.0, 760, 190, 1.1], [23.5, 780, 160, 1.4]])(t)),
    pain: { faz: painFaz, pensa: painPensa },
    bubbles: {
      faz: [
        { t0: 2.9, t1: 3.6, text: 'COMEÇA LEVE.', col: PAL.faz },
        { t0: 22.8, t1: 23.5, text: 'SEMANA 12.', col: PAL.faz },
      ],
      pensa: [
        { t0: 7.3, t1: 8.6, text: 'VOU ACHAR O TREINO PERFEITO...' },
        { t0: 9.0, t1: 10.6, text: 'SEGUNDA EU COMEÇO.', col: PAL.pensa },
        { t0: 13.6, t1: 14.5, text: 'AGORA VAI!', col: PAL.pensa },
        { t0: 15.2, t1: 16.0, text: 'SEGUNDA EU COMEÇO.', col: PAL.pensa },
        { t0: 20.5, t1: 21.0, text: 'AI...', col: PAL.dor },
        { t0: 23.7, t1: 25.2, text: 'SEGUNDA EU COMEÇO...' },
      ],
    },
    shake: (k, t) => (k === 'pensa' ? 5 * (t >= 20.3 ? Math.exp(-(t - 20.3) * 8) : 0) : 0),
    caps: [
      { s: -1, e: 2.8, lines: [[-1, [['ENTRAR EM FORMA.']]], [0.3, [['DOIS JEITOS DE '], ['COMEÇAR.', 'dor']]]] },
      { s: 2.9, e: 7.0, lines: [[2.9, [['QUEM '], ['FAZ', 'faz']]], [3.25, [['COMEÇA COM 5 KG.']]]] },
      { s: 7.05, e: 11.0, lines: [[7.05, [['QUEM '], ['PENSA DEMAIS', 'pensa']]], [7.45, [['PROCURA O TREINO PERFEITO.']]]] },
      { s: 11.05, e: 13.5, lines: [[11.05, [['SEMANA 4:']]], [11.4, [['10 KG.', 'faz']]]] },
      { s: 13.55, e: 16.0, lines: [[13.55, [['SEMANA 4:']]], [13.9, [['COMPROU '], ['SUPLEMENTO.', 'pensa']]]] },
      { s: 16.05, e: 18.5, lines: [[16.05, [['SEMANA 8:']]], [16.4, [['15 KG.', 'faz']]]] },
      { s: 18.55, e: 21.0, lines: [[18.55, [['SEMANA 8:']]], [18.9, [['UMA FLEXÃO. '], ['UMA.', 'dor']]]] },
      { s: 21.05, e: 23.5, lines: [[21.05, [['SEMANA 12:']]], [21.4, [['20 KG.', 'faz']]]] },
      { s: 23.55, e: GT, lines: [[23.55, [['SEMANA 12:']]], [23.9, [['"SEGUNDA EU '], ['COMEÇO."', 'dor']]]] },
      { s: GT + 0.1, e: 99, center: true, lines: [[GT + 0.3, [['QUEM FAZ: '], ['36 TREINOS.', 'faz']]], [GT + 0.9, [['PENSA DEMAIS: '], ['12 SEGUNDAS.', 'dor']]]] },
    ],
    sched: {
      noBips: true, noPops: true, music: 0.42, focusKeys: FOCUS,
      fx: [
        ...CURL.flatMap(([a, b], i) => [[a, 'clank', 0.18, 0.35], ...Array.from({ length: Math.floor((b - a) / 1.0) }, (_, j) => [a + 0.55 + j * 1.0, 'voz_faz/grunt' + (1 + ((i + j) % 3)), 0.14 + 0.03 * i, 0.35]), [b - 0.8, 'clank', 0.22, 0.35]]),
        // pensa
        ...Array.from({ length: 6 }, (_, i) => [7.4 + i * 0.25, 'scroll', 0.1, -0.35]), [9.1, 'exhale', 0.18, -0.35],
        [13.6, 'doorbell', 0.25, -0.35], [14.45, 'box', 0.4, -0.35], ...[14.9, 15.45, 16.0 - 0.3].map((x) => [x, 'crunch', 0.35, -0.35]),
        [18.7, 'foley/cloth_05', 0.3, -0.35], [19.4, 'foley/cloth_04', 0.3, -0.35], [20.3, 'thud', 0.2, -0.35], [20.4, 'voz_pensa/dor_10', 0.35, -0.35],
        [23.7, 'exhale', 0.22, -0.35], [24.5, 'foley/cloth_05', 0.25, -0.35],
      ],
    },
  };
