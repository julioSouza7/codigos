
  // ================= ROTEIRO: "O VIOLÃO" (32 s) — índice de frustração =================
  const GT = 27.0, FL = C_FL;
  const FOCUS = [[0, null], [2.8, 'faz'], [7.0, 'pensa'], [11.0, 'faz'], [13.5, 'pensa'], [16.0, 'faz'], [18.5, 'pensa'], [21.0, 'faz'], [23.5, 'pensa'], [GT, null]];
  const dimOf = focusTrack(FOCUS);
  const DAYS = [[0, 1], [11.0, 15], [16.0, 30], [21.0, 60]];
  const dayOf = (t) => { let d = 1; for (const [a, n] of DAYS) if (t >= a) d = n; return d; };
  const CH = 520, SOFA = 905, STAND = [770, FL];

  // acordes (tempo, nome) — "!" = desafinado; "/d" = duração
  const STRUM_F = [[3.2, 'G!'], [4.6, 'C!/1.5'], [6.2, 'G!/0.7'], [11.2, 'G/0.9'], [12.0, 'C/1.3'], [16.2, 'G/0.75'], [16.9, 'D/0.75'], [17.6, 'Em/0.8'], [21.1, 'G/0.55'], [21.65, 'D/0.55'], [22.2, 'Em/0.55'], [22.75, 'C/0.7']];
  const STRUM_P = [[19.4, 'Em!/1.2']];
  const strumming = (list, t) => list.some(([a, n]) => t >= a - 0.05 && t < a + 0.25);

  // ---------- poses ----------
  const NECK = [CH + 84, FL - 104], HOLE = [CH + 34, FL - 86];
  const play = (list, fretMove) => cSeat(CH, 1, 0.25, 0.38, (t) => { const s = strumming(list, t) ? Math.sin(t * 40) * 10 : 0; const f = fretMove ? 6 * Math.sin(Math.floor(t * 1.6) * 2.1) : 0;
    return [[NECK[0] + f, NECK[1] + f * 0.4], [HOLE[0] + 2, HOLE[1] - 6 + s]]; }, { prefB: 'down' });
  const holdSad = cSeat(CH, 1, 0.35, 0.55, [[NECK[0], NECK[1]], [HOLE[0] - 4, HOLE[1] + 6]]);
  const sofaPhone = cSeat(SOFA, -1, 0.2, 0.38, (t) => [[SOFA - 26, FL - 160 + 2 * Math.sin(t * 5)], [SOFA - 18, FL - 150]]);
  const sofaLook = cSeat(SOFA, -1, 0.1, 0.15, [[SOFA - 30, FL - 100], [SOFA - 20, FL - 98]]);
  const chairPhone = cSeat(CH, 1, 0.2, 0.4, (t) => [[CH + 34, FL - 132 + 2 * Math.sin(t * 5)], [CH + 26, FL - 128]]);
  const fazKeys = [[0, play([], false)], [2.8, play(STRUM_F, false), 0.3], [5.4, cSeat(CH, 1, 0.3, 0.5, [[CH + 30, FL - 140], [HOLE[0], HOLE[1]]]), 0.2], [6.0, play(STRUM_F, false), 0.3],
    [11.0, play(STRUM_F, true), 0.3], [16.0, play(STRUM_F, true), 0.3], [21.0, play(STRUM_F, true), 0.3]];
  const fazState = (t) => seq(fazKeys, t);
  const pensaKeys = [[0, cSeat(CH, 1, 0.1, 0.1, [[CH + 40, FL - 98], [CH + 30, FL - 96]])],
    [7.2, cStandW(660, 1, 0.4, 0.4, [[720, FL - 40], [700, FL - 36]]), 0.01], [8.4, cStand(660, -1), 0.35], [8.7, chairPhone, 0.01],
    [13.3, sofaPhone, 0.01], [18.3, holdSad, 0.01], [19.2, play(STRUM_P, false), 0.25], [19.9, holdSad, 0.3], [21.0, sofaLook, 0.01]];
  const pensaState = (t) => seq(pensaKeys, t);
  const pensaHolds = (t) => t >= 18.3 && t < 21.0;

  // ---------- cenário ----------
  function drawBack(c, k, t, P) {
    cRoom(c, P, false, [330, 40, 150, 110]);
    // pôster de música
    c.fillStyle = '#2b2b30'; c.strokeStyle = OUT; c.lineWidth = 4; c.fillRect(560, 50, 90, 110); c.strokeRect(560, 50, 90, 110);
    c.fillStyle = rgb(PAL.ouro); c.font = '900 34px Montserrat'; c.textAlign = 'center'; c.fillText('♪', 605, 120);
    cChair(c, CH); cSofa(c, 830);
    // suporte do violão (do pensa demais, quando não está na mão)
    if (k === 'pensa' && t >= 7.9 && !pensaHolds(t)) guitarStand(c, t);
    cFloor(c, P);
  }
  function guitarBody(c, cx, cy, ang, s = 1, dusty = 0) {
    c.save(); c.translate(cx, cy); c.rotate(ang); c.scale(s, s); c.strokeStyle = OUT; c.lineWidth = 3.5;
    // braço
    c.fillStyle = '#4a3220'; c.fillRect(14, -5, 74, 10); c.strokeRect(14, -5, 74, 10); c.fillStyle = '#2b1d12'; c.fillRect(86, -8, 16, 16); c.strokeRect(86, -8, 16, 16);
    c.strokeStyle = 'rgba(230,220,200,0.6)'; c.lineWidth = 1; for (let i = 0; i < 6; i++) { c.beginPath(); c.moveTo(24 + i * 11, -5); c.lineTo(24 + i * 11, 5); c.stroke(); }
    // corpo
    c.fillStyle = mixC([201, 138, 74], [140, 130, 120], dusty).map(Math.round).reduce((a, v, i) => a + (i ? ',' : '') + v, 'rgb(') + ')';
    c.strokeStyle = OUT; c.lineWidth = 3.5; c.beginPath(); c.ellipse(-8, 0, 20, 17, 0, 0, Math.PI * 2); c.fill(); c.stroke(); c.beginPath(); c.ellipse(-34, 0, 24, 21, 0, 0, Math.PI * 2); c.fill(); c.stroke();
    c.fillStyle = '#1a120c'; c.beginPath(); c.arc(-14, 0, 6, 0, Math.PI * 2); c.fill();
    c.strokeStyle = 'rgba(240,230,210,0.7)'; c.lineWidth = 1; c.beginPath(); c.moveTo(-40, -2); c.lineTo(100, -2); c.moveTo(-40, 2); c.lineTo(100, 2); c.stroke();
    c.restore();
  }
  const dustOf = (t) => smooth(seg(t, 13.5, 26));
  function guitarStand(c, t) {
    const dusty = dustOf(t);
    c.strokeStyle = OUT; c.lineWidth = 5; c.beginPath(); c.moveTo(STAND[0] - 20, FL); c.lineTo(STAND[0], FL - 36); c.lineTo(STAND[0] + 20, FL); c.stroke();
    guitarBody(c, STAND[0] - 6, FL - 70, -1.62, 1, dusty);
    // poeira e teia
    for (let i = 0; i < Math.floor(24 * dusty); i++) { const a = (t * 0.15 + i * 0.37) % 1; c.fillStyle = `rgba(220,210,190,${0.6 * Math.sin(Math.PI * a)})`; c.beginPath(); c.arc(STAND[0] - 40 + (i * 23) % 80, FL - 150 + a * 120, 2, 0, Math.PI * 2); c.fill(); }
    if (t > 18) { const u = smooth(seg(t, 18, 20)); c.strokeStyle = `rgba(235,235,235,${0.7 * u})`; c.lineWidth = 1.5; const ox = STAND[0] - 10, oy = FL - 190;
      for (let r = 8; r <= 32; r += 8) { c.beginPath(); c.arc(ox, oy, r, 0.2, 1.4); c.stroke(); } for (let i = 0; i < 5; i++) { const a = 0.2 + i * 0.3; c.beginPath(); c.moveTo(ox, oy); c.lineTo(ox + Math.cos(a) * 34, oy + Math.sin(a) * 34); c.stroke(); } }
  }
  function drawFront(c, k, t, P, drawn) {
    const holding = k === 'faz' || pensaHolds(t);
    if (holding) { const lap = drawn.main.toP(drawn.main.R.legF[1]); guitarBody(c, HOLE[0] - 4, HOLE[1] + 2, -0.42, 1, k === 'pensa' ? dustOf(t) : 0); }
    if (k === 'faz' && t >= 11 && FOCUS.some(([a, w], i) => w === 'faz' && t >= a && t < (FOCUS[i + 1] || [99])[0])) cNotes(c, drawn.main.head[0] + 60, drawn.main.head[1] - 10, t);
    if (k === 'faz' && t >= 21.0 && t < 23.5) cNotes(c, drawn.main.head[0] + 130, drawn.main.head[1] + 10, t + 0.5, rgb(PAL.faz));
    if (k === 'pensa' && ((t >= 8.7 && t < 13.5) || (t >= 13.3 && t < 18.3))) cPhone(c, drawn.main.hand, t);
    // caixa chegando
    if (k === 'pensa' && t >= 7.3 && t < 8.6) { c.fillStyle = '#b08850'; c.strokeStyle = OUT; c.lineWidth = 3; c.beginPath(); c.moveTo(690, FL); c.lineTo(760, FL); c.lineTo(760, FL - 30); c.lineTo(690, FL - 30); c.closePath(); c.fill(); c.stroke(); }
  }
  function drawOverlay(c, k, t, P, drawn, toS) {
    if (t > GT) return;
    const d = dayOf(t), d0 = DAYS.find(([, n]) => n === d)[0]; cCorner(c, `DIA ${d}`, t, d > 1 ? d0 : null);
    // nome do acorde tocado
    const list = k === 'faz' ? STRUM_F : STRUM_P; const cur = list.filter(([a]) => t >= a && t < a + 0.6).pop();
    if (cur) { const nm = cur[1].split('/')[0], bad = nm.endsWith('!'); const hs = toS(drawn.main.head); cPill(c, clamp(hs[0] + 70, 300, 540), 56, bad ? `${nm.replace('!', '')} (DESAFINADO)` : `ACORDE ${nm}`, bad ? PAL.dor : PAL.ouro, null, 1 + 0.25 * Math.exp(-(t - cur[0]) * 10), true); }
    if (k === 'faz') cStack(c, t, [[3.0, '10 MIN POR DIA', PAL.faz, true], [11.2, () => `ACORDES: ${t < 16 ? 2 : t < 21 ? 4 : 6}`, PAL.faz, true], [21.1, '1ª MÚSICA', PAL.faz, true]]);
    else cStack(c, t, [[8.9, () => `VÍDEOS ASSISTIDOS: ${t < 13.5 ? 3 : t < 18.5 ? 12 : 20}`, PAL.pensa, null], [13.6, () => `DIAS SEM TOCAR: ${d - 1}`, PAL.dor, false]]);
  }

  const painFaz = (t) => 35 + spike(t, 3.2, 15, 1.2) + spike(t, 5.4, 25, 1.4) - 28 * smooth(seg(t, 7, 22)) + 2 * Math.sin(t * 2);
  const painPensa = (t) => Math.min(100, 25 + 3 * Math.sin(t * 2.3) + 40 * smooth(seg(t, 8, 26)) + spike(t, 19.4, 30, 0.8));

  const SCENE = {
    metricLabel: 'ÍNDICE DE FRUSTRAÇÃO', totalLabel: 'FRUSTRAÇÃO TOTAL', reportT: GT, noReport: true, dimOf, bubbleMaxX: 780,
    secsText: (n) => `${n}`,
    state: { faz: fazState, pensa: pensaState },
    drawBack, drawFront, drawOverlay,
    cam: (k, t) => (k === 'faz' ? cCam([[0, 560, 190, 1.2], [2.8, 580, 175, 1.65], [7.0, 600, 190, 1.15], [11.0, 580, 175, 1.6], [13.5, 600, 190, 1.15], [16.0, 580, 175, 1.6], [18.5, 600, 190, 1.15], [21.0, 590, 180, 1.5]])(t)
      : cCam([[0, 600, 190, 1.1], [7.0, 680, 190, 1.3], [8.6, 580, 175, 1.55], [11.0, 640, 190, 1.1], [13.4, 840, 175, 1.45, 0.01], [16.0, 760, 190, 1.1], [18.4, 600, 180, 1.55, 0.01], [21.0, 780, 190, 1.1, 0.01], [23.5, 820, 180, 1.3]])(t)),
    pain: { faz: painFaz, pensa: painPensa },
    bubbles: {
      faz: [
        { t0: 5.5, t1: 6.2, text: 'AI, O DEDO.', col: PAL.dor },
        { t0: 6.35, t1: 6.95, text: 'DE NOVO.', col: PAL.faz },
      ],
      pensa: [
        { t0: 8.9, t1: 10.4, text: 'VOU VER UNS VÍDEOS ANTES...' },
        { t0: 14.0, t1: 15.5, text: 'AMANHÃ EU TREINO.', col: PAL.pensa },
        { t0: 19.9, t1: 20.9, text: 'TÁ DESAFINADO...', col: PAL.dor },
        { t0: 24.0, t1: 25.6, text: 'NÃO TENHO DOM...' },
      ],
    },
    caps: [
      { s: -1, e: 2.8, lines: [[-1, [['APRENDER VIOLÃO.']]], [0.3, [['DOIS JEITOS DE '], ['COMEÇAR.', 'dor']]]] },
      { s: 2.9, e: 7.0, lines: [[2.9, [['QUEM '], ['FAZ', 'faz']]], [3.25, [['TOCA MAL. MAS TOCA.']]]] },
      { s: 7.05, e: 11.0, lines: [[7.05, [['QUEM '], ['PENSA DEMAIS', 'pensa']]], [7.45, [['ASSISTE TUTORIAL.']]]] },
      { s: 11.05, e: 13.5, lines: [[11.05, [['DIA 15:']]], [11.4, [['2 '], ['ACORDES.', 'faz']]]] },
      { s: 13.55, e: 16.0, lines: [[13.55, [['DIA 15:']]], [13.9, [['VIOLÃO NO '], ['CANTO.', 'dor']]]] },
      { s: 16.05, e: 18.5, lines: [[16.05, [['DIA 30:']]], [16.4, [['4 '], ['ACORDES.', 'faz']]]] },
      { s: 18.55, e: 21.0, lines: [[18.55, [['DIA 30:']]], [18.9, [['TENTA UMA '], ['VEZ.', 'dor']]]] },
      { s: 21.05, e: 23.5, lines: [[21.05, [['DIA 60:']]], [21.4, [['A PRIMEIRA '], ['MÚSICA.', 'faz']]]] },
      { s: 23.55, e: GT, lines: [[23.55, [['DIA 60:']]], [23.9, [['"NÃO TENHO '], ['DOM."', 'dor']]]] },
      { s: GT + 0.1, e: 99, center: true, lines: [[GT + 0.3, [['QUEM FAZ: '], ['TOCA 1 MÚSICA.', 'faz']]], [GT + 0.9, [['PENSA DEMAIS: '], ['0 ACORDES.', 'dor']]]] },
    ],
    sched: {
      noBips: true, noPops: true, music: 0.3, focusKeys: FOCUS,
      fx: [
        ...STRUM_F.map(([a, n]) => [a, 'strum', 0.9, 0.35, n]), [5.45, 'voz_faz/grunt4', 0.35, 0.35],
        [7.2, 'doorbell', 0.22, -0.35], [7.6, 'box', 0.35, -0.35], [7.95, 'foley/cloth_05', 0.3, -0.35], ...Array.from({ length: 5 }, (_, i) => [9.2 + i * 0.3, 'scroll', 0.1, -0.35]),
        ...Array.from({ length: 5 }, (_, i) => [14.0 + i * 0.3, 'scroll', 0.1, -0.35]), [15.0, 'exhale', 0.18, -0.35],
        [18.7, 'foley/cloth_04', 0.3, -0.35], ...STRUM_P.map(([a, n]) => [a, 'strum', 0.9, -0.35, n]), [20.0, 'exhale', 0.22, -0.35],
        [24.1, 'exhale', 0.22, -0.35], [25.0, 'voz_pensa/dor_14', 0.28, -0.35],
      ],
    },
  };
