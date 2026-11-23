
  // ================= ROTEIRO: "O CURRÍCULO" (32 s) — índice de ansiedade =================
  const GT = 27.0, FL = C_FL;
  const FOCUS = [[0, null], [2.8, 'faz'], [7.0, 'pensa'], [11.0, 'faz'], [13.5, 'pensa'], [16.0, 'faz'], [18.5, 'pensa'], [21.0, 'faz'], [23.5, 'pensa'], [GT, null]];
  const dimOf = focusTrack(FOCUS);
  const DAYS = [[0, 1], [11.0, 5], [16.0, 8], [21.0, 12]];
  const dayOf = (t) => { let d = 1; for (const [a, n] of DAYS) if (t >= a) d = n; return d; };
  const CH = 548, D0 = 572, D1 = 820, DT = FL - 92, LAP = 700;
  const INT = [16.0, 18.5];                      // entrevista (faz)
  const inOffice = (k, t) => k === 'faz' && t >= INT[0] && t < INT[1];

  // ---------- poses ----------
  const typing = cSeat(CH, 1, 0.3, 0.28, (t) => [[LAP - 4 + 5 * Math.sin(t * 23), DT - 8 + 3 * Math.abs(Math.sin(t * 17))], [LAP - 22 + 5 * Math.sin(t * 19 + 1), DT - 7 + 3 * Math.abs(Math.sin(t * 21))]]);
  const mouse = cSeat(CH, 1, 0.25, 0.3, (t) => [[LAP + 40, DT - 6], [CH + 30, FL - 100]]);
  const callP = cSeat(CH, 1, 0.05, -0.05, [[CH + 6, FL - 152], [CH + 30, FL - 100]]);
  const cheer = cSeat(CH, 1, -0.1, -0.2, [[CH + 50, FL - 260], [CH - 10, FL - 250]], { prefF: 'up', prefB: 'up' });
  const headHands = cSeat(CH, 1, 0.5, 0.7, [[CH + 30, FL - 150], [CH + 22, FL - 146]]);
  // entrevista: faz sentado de frente para o entrevistador
  const interview = cSeat(CH, 1, 0.08, 0.05, (t) => t > 17.5 && t < 18.2 ? [[680, FL - 112], [CH + 30, FL - 100]] : [[CH + 40, FL - 104], [CH + 30, FL - 100]]);
  const IVX = 820;
  const interviewer = (k) => (t) => { if (!inOffice(k, t)) return pose(-600, FL, STAND_L, 0, 0, handsDown(-600, C_HY), { noWalk: true });
    return cSeat(IVX, -1, 0.08, 0.05, t > 17.5 && t < 18.2 ? [[688, FL - 112], [IVX - 30, FL - 100]] : [[IVX - 40, FL - 104], [IVX - 30, FL - 100]], { gesture: true })(t); };

  const fazKeys = [[0, mouse], [2.9, typing, 0.3], [6.6, mouse, 0.3],
    [11.0, typing, 0.3], [11.4, callP, 0.3], [13.3, mouse, 0.4],
    [INT[0], interview, 0.01], [INT[1], mouse, 0.01],
    [21.2, callP, 0.3], [22.5, cheer, 0.25], [23.4, mouse, 0.5]];
  const fazState = (t) => seq(fazKeys, t);
  const pensaKeys = [[0, mouse], [7.0, mouse, 0.3], [9.4, typing, 0.3], [10.6, mouse, 0.3],
    [13.5, mouse, 0.3], [14.8, typing, 0.3], [15.6, mouse, 0.3],
    [18.5, mouse, 0.3], [19.6, cSeat(CH, 1, -0.15, -0.3, [[CH + 40, FL - 170], [CH - 10, FL - 160]]), 0.2],
    [23.5, typing, 0.35], [24.8, headHands, 0.45]];
  const pensaState = (t) => seq(pensaKeys, t);

  // contadores
  const SENDS = [4.0, 4.6, 5.2, 5.8, 6.4];
  const sent = (t) => (t >= 11 ? 20 : SENDS.filter((x) => t >= x).length);
  const versions = (t) => (t < 7.4 ? 1 : t < 13.5 ? 1 + Math.min(3, Math.floor((t - 7.4) / 0.8)) : t < 23.5 ? Math.min(9, 4 + Math.floor((t - 13.5) / 0.5)) : Math.min(14, 9 + Math.floor((t - 23.5) / 0.6)));

  // ---------- cenários ----------
  function drawHome(c, k, t, P) {
    cRoom(c, P, false, [330, 40, 150, 110]);
    // estante
    c.fillStyle = '#5a3c26'; c.strokeStyle = OUT; c.lineWidth = 4; for (const y of [90, 150]) { c.fillRect(120, y, 150, 10); c.strokeRect(120, y, 150, 10); }
    for (let i = 0; i < 9; i++) { c.fillStyle = ['#2f6fb3', '#b85c3a', '#e8c547', '#4f8f5a'][i % 4]; c.fillRect(126 + i * 15, (i < 5 ? 90 : 150) - 34 + (i % 3) * 3, 12, 34 - (i % 3) * 3); }
    cChair(c, CH); cTable(c, D0, D1, DT); cFloor(c, P);
  }
  function drawOffice(c, k, t, P) {
    const h = P.h; c.fillStyle = '#2a2620'; c.fillRect(-300, -100, W + 600, h + 200);
    c.fillStyle = 'rgba(255,255,255,0.05)'; for (let x = -280; x < W + 300; x += 140) c.fillRect(x, -100, 4, FL + 100);
    c.fillStyle = '#e8dcc6'; c.font = '900 30px Montserrat, sans-serif'; c.textAlign = 'center'; c.fillText('ENTREVISTA', 690, 80);
    c.fillStyle = '#4f8f5a'; c.strokeStyle = OUT; c.lineWidth = 4; c.beginPath(); c.arc(300, FL - 90, 34, 0, Math.PI * 2); c.fill(); c.stroke(); c.fillStyle = '#6b4a30'; c.fillRect(286, FL - 60, 28, 60); c.strokeRect(286, FL - 60, 28, 60);
    cChair(c, CH); c.save(); c.translate(2 * IVX, 0); c.scale(-1, 1); cChair(c, IVX); c.restore();
    cTable(c, 610, 770, FL - 92); cFloor(c, P, '#1c1916');
  }
  function drawBack(c, k, t, P) { if (inOffice(k, t)) drawOffice(c, k, t, P); else drawHome(c, k, t, P); }

  // telas do notebook
  function screenFaz(t) { return (c, x, y, w, h) => {
    c.fillStyle = '#2f6fb3'; c.fillRect(x, y, w, 10); c.fillStyle = '#fff'; c.font = '800 7px Montserrat'; c.textAlign = 'left'; c.fillText('EMAIL', x + 3, y + 7);
    c.fillStyle = '#3a3a40'; c.font = '700 6px "Space Mono", monospace'; c.fillText('PARA: VAGAS@...', x + 3, y + 18); c.fillText('ANEXO: CV.PDF', x + 3, y + 27);
    const last = SENDS.filter((s) => t >= s).pop(); const a = last !== undefined ? t - last : 9;
    c.fillStyle = '#4fbf6a'; c.fillRect(x + w - 30, y + h - 14, 26, 10); c.fillStyle = '#fff'; c.font = '800 6px Montserrat'; c.fillText('ENVIAR', x + w - 28, y + h - 7);
    if (a < 0.5) { const u = a / 0.5; c.save(); c.translate(x + 20 + u * 80, y + 34 - u * 40); c.fillStyle = '#fff'; c.strokeStyle = '#3a3a40'; c.lineWidth = 1.5; c.fillRect(-9, -6, 18, 12); c.strokeRect(-9, -6, 18, 12); c.beginPath(); c.moveTo(-9, -6); c.lineTo(0, 1); c.lineTo(9, -6); c.stroke(); c.restore(); } }; }
  const FONTS = ['900 9px Montserrat', 'italic 700 9px Georgia', '700 9px "Space Mono"', '800 10px Arial', 'italic 400 10px Times'];
  function screenPensa(t) { return (c, x, y, w, h) => {
    if (t >= 19.4 && t < 23.5) { c.fillStyle = '#fff'; c.fillRect(x, y, w, h); c.fillStyle = '#d03a2e'; c.fillRect(x + 4, y + 18, w - 8, 22); c.fillStyle = '#fff'; c.font = '900 6px Montserrat'; c.textAlign = 'center'; c.fillText('VAGA ENCERRADA', x + w / 2, y + 32); return; }
    c.fillStyle = '#fff'; c.fillRect(x + 6, y + 3, w - 12, h - 6);
    const v = versions(t); c.fillStyle = '#1a1a1a'; c.font = FONTS[v % FONTS.length]; c.textAlign = 'left'; c.fillText('CURRÍCULO', x + 10, y + 14);
    const px = x + w - 24 + ((v * 7) % 5) - 2, py = y + 6 + ((v * 3) % 4); c.fillStyle = '#9aa8b8'; c.fillRect(px, py, 12, 14);
    c.fillStyle = 'rgba(0,0,0,0.25)'; for (let i = 0; i < 5; i++) c.fillRect(x + 10, y + 22 + i * 6, 30 + ((i * 13 + v * 5) % 18), 2);
    c.fillStyle = 'rgba(229,72,59,0.9)'; c.font = '800 6px "Space Mono"'; c.fillText(`V${v}`, x + 10, y + h - 6); }; }
  function drawFront(c, k, t, P, drawn) {
    if (!inOffice(k, t)) cLaptop(c, LAP, DT, k === 'faz' ? screenFaz(t) : screenPensa(t));
    if (k === 'faz' && ((t >= 11.4 && t < 13.3) || (t >= 21.2 && t < 22.5))) cPhone(c, drawn.main.hand, t, '#4fbf6a', false);
    if (k === 'pensa' && t > 24.8 && t < GT) cSweat(c, drawn.main.head, t);
  }
  function drawOverlay(c, k, t, P, drawn, toS) {
    if (t > GT) return;
    const d = dayOf(t), d0 = DAYS.find(([, n]) => n === d)[0]; cCorner(c, `DIA ${d}`, t, d > 1 ? d0 : null);
    if (k === 'faz') cStack(c, t, [[4.0, () => `ENVIADOS: ${sent(t)}`, PAL.faz, true], [12.2, () => `ENTREVISTAS: ${t < 16 ? 1 : 3}`, PAL.faz, true], [22.5, 'CONTRATADO', PAL.faz, true]]);
    else cStack(c, t, [[7.4, () => `VERSÕES DO CV: ${versions(t)}`, PAL.pensa, null], [7.4, 'ENVIADOS: 0', PAL.dor, false]]);
    if (k === 'faz') cFlash(c, P, t, [INT[0], INT[1]]);
  }

  const painFaz = (t) => 30 + 3 * Math.sin(t * 2) + spike(t, 11.4, 15, 1.5) + 10 * smooth(seg(t, 16, 16.5)) * (1 - smooth(seg(t, 18.0, 18.6))) - 22 * smooth(seg(t, 22.4, 23.4));
  const painPensa = (t) => Math.min(100, 30 + 3 * Math.sin(t * 2.4) + 35 * smooth(seg(t, 7, 24)) + spike(t, 19.5, 35, 0.6) + (t > 20 ? 15 : 0));

  const SCENE = {
    metricLabel: 'ÍNDICE DE ANSIEDADE', totalLabel: 'ANSIEDADE TOTAL', reportT: GT, noReport: true, dimOf, bubbleMaxX: 780,
    secsText: (n) => `${n}`,
    state: { faz: fazState, pensa: pensaState },
    others: { faz: [{ id: 'other', fn: interviewer('faz'), col: PAL.azul, seed: 41, glow: 0.35 }] },
    drawBack, drawFront, drawOverlay,
    cam: (k, t) => (k === 'faz' ? cCam([[0, 620, 190, 1.1], [2.8, 660, 170, 1.7], [7.0, 620, 190, 1.1], [11.0, 600, 175, 1.5], [13.5, 620, 190, 1.1], [INT[0], 690, 185, 1.25, 0.01], [INT[1], 620, 190, 1.1, 0.01], [21.0, 600, 175, 1.5]])(t)
      : cCam([[0, 620, 190, 1.1], [7.0, 680, 165, 1.8], [11.0, 620, 190, 1.1], [13.5, 680, 165, 1.8], [16.0, 620, 190, 1.1], [18.5, 670, 170, 1.6], [23.5, 620, 180, 1.4]])(t)),
    pain: { faz: painFaz, pensa: painPensa },
    bubbles: {
      faz: [
        { t0: 2.9, t1: 3.8, text: 'ENVIA LOGO.', col: PAL.faz },
        { t0: 11.7, t1: 13.2, text: 'ENTREVISTA? CLARO!', col: PAL.faz },
        { t0: 16.3, t1: 17.3, text: 'CONTA SOBRE VOCÊ.', col: PAL.azul, who: 'other' },
        { t0: 21.4, t1: 22.4, text: 'VOCÊ FOI CONTRATADO!', col: PAL.azul },
      ],
      pensa: [
        { t0: 7.2, t1: 8.8, text: 'ESSA FONTE NÃO TÁ BOA...' },
        { t0: 13.7, t1: 15.0, text: 'SERÁ QUE TÁ BOM?' },
        { t0: 19.65, t1: 20.9, text: 'ENCERRADA?!', col: PAL.dor },
        { t0: 23.7, t1: 24.8, text: 'VOU MELHORAR O CV...' },
      ],
    },
    shake: (k, t) => (k === 'pensa' ? 6 * (t >= 19.5 ? Math.exp(-(t - 19.5) * 7) : 0) : 0),
    caps: [
      { s: -1, e: 2.8, lines: [[-1, [['PROCURAR EMPREGO.']]], [0.3, [['DOIS JEITOS DE '], ['TENTAR.', 'dor']]]] },
      { s: 2.9, e: 7.0, lines: [[2.9, [['QUEM '], ['FAZ', 'faz']]], [3.25, [['ENVIA O CURRÍCULO.']]]] },
      { s: 7.05, e: 11.0, lines: [[7.05, [['QUEM '], ['PENSA DEMAIS', 'pensa']]], [7.45, [['TROCA A FONTE.']]]] },
      { s: 11.05, e: 13.5, lines: [[11.05, [['DIA 5:']]], [11.4, [['O TELEFONE '], ['TOCA.', 'faz']]]] },
      { s: 13.55, e: 16.0, lines: [[13.55, [['DIA 5:']]], [13.9, [['VERSÃO '], ['9.', 'dor']]]] },
      { s: 16.05, e: 18.5, lines: [[16.05, [['DIA 8:']]], [16.4, [['ENTREVISTA.', 'faz']]]] },
      { s: 18.55, e: 21.0, lines: [[18.55, [['DIA 8:']]], [18.9, [['A VAGA '], ['FECHOU.', 'dor']]]] },
      { s: 21.05, e: 23.5, lines: [[21.05, [['DIA 12:']]], [21.4, [['CONTRATADO.', 'faz']]]] },
      { s: 23.55, e: GT, lines: [[23.55, [['DIA 12:']]], [23.9, [['AINDA NA '], ['VERSÃO 14.', 'dor']]]] },
      { s: GT + 0.1, e: 99, center: true, lines: [[GT + 0.3, [['QUEM FAZ: '], ['CONTRATADO.', 'faz']]], [GT + 0.9, [['PENSA DEMAIS: '], ['0 ENVIOS.', 'dor']]]] },
    ],
    sched: {
      noBips: true, noPops: true, music: 0.42, focusKeys: FOCUS,
      fx: [
        [3.0, 'typing', 0.32, 0.35, 0.9], ...SENDS.map((x) => [x, 'swish', 0.22, 0.35]),
        [11.1, 'ring', 0.14, 0.35], [11.5, 'foley/cloth_05', 0.25, 0.35],
        [16.1, 'foley/cadeira', 0.4, 0.35], [17.55, 'foley/cloth_04', 0.3, 0.35],
        [21.05, 'ring', 0.12, 0.35], [22.55, 'chime', 0.18, 0.35],
        // pensa
        ...[7.5, 8.3, 9.1].map((x) => [x, 'foley/toque_tela', 0.4, -0.35]), [9.45, 'typing', 0.3, -0.35, 1.0],
        ...[13.7, 14.2].map((x) => [x, 'foley/toque_tela', 0.4, -0.35]), [14.85, 'typing', 0.3, -0.35, 0.7], [15.4, 'exhale', 0.2, -0.35],
        [18.7, 'foley/toque_tela', 0.4, -0.35], [19.4, 'thud', 0.18, -0.35], [19.75, 'voz_pensa/dor_02', 0.35, -0.35],
        [23.6, 'typing', 0.28, -0.35, 1.0], [25.0, 'exhale', 0.24, -0.35], [25.8, 'voz_pensa/dor_14', 0.3, -0.35],
      ],
    },
  };
