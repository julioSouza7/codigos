
  // ================= ROTEIRO: "5 DA MANHÃ" (despertador) — índice de cansaço =================
  const FL = 300, MT = FL - 62;           // piso e topo do colchão
  const BED0 = 190, BED1 = 600;           // cama
  const PHONE = [322, MT - 6];            // celular em cima da cama
  const HY = hipOn(FL, STAND_L);
  const RINGS = [2.0, 5.2, 8.4, 11.6];    // o celular do pensa demais toca (soneca)
  const PANIC = 14.0;

  const LIE_L = { fT: 1.5, fS: 1.56, bT: 1.44, bS: 1.54 };
  const SIT_L = LIE_L;
  const EDGE_L = { fT: 1.45, fS: 0.1, bT: 1.38, bS: 0.04 };
  const LX = 340;
  const lie = (extra) => () => { const hy = MT - 16; return Object.assign({ x: LX, hipY: hy, ay: MT, lean: -1.5, head: -0.16, legs: LIE_L, hands: [[LX - 46, hy - 30], [LX - 66, hy - 26]], prefF: 'down', prefB: 'down', grounded: false, face: 1, gesture: false, noWalk: true }, extra || {}); };
  const reach = () => { const st = lie()(); st.hands = [toRig(st, [PHONE[0], PHONE[1] - 4]), st.hands[1]]; st.lean = -1.38; st.head = -0.05; return st; };
  const sitUp = (x = LX) => () => { const hy = MT - 16; return { x, hipY: hy, ay: MT, lean: 0.08, head: 0.1, legs: SIT_L, hands: [[x + 18, MT - 6], [x - 4, MT - 4]], prefF: 'back', prefB: 'back', grounded: false, face: 1, gesture: false, noWalk: true }; };
  const edge = (x) => () => pose(x, FL, EDGE_L, 0.12, 0.05, [[x + 26, hipOn(FL, EDGE_L) + 6], [x + 4, hipOn(FL, EDGE_L) + 8]], { noWalk: true, gesture: false });
  const stand = (x, face = 1, extra) => () => pose(x, FL, STAND_L, 0.03, 0.02, handsDown(x, HY), Object.assign({ face }, extra || {}));
  const runTo = (x0, x1, t0, t1, face = 1) => (t) => { const x = lerp(x0, x1, easeInOut(seg(t, t0, t1))); return pose(x, FL, STAND_L, 0.1, -0.05, handsDown(x, HY), { face, run: 1 }); };
  // flexão: corpo reto apoiado nos pés, mãos fixas no chão
  const PUSH_T0 = 12.55, PUSH_P = 0.9;
  const push = (X) => (t) => {
    const th = lerp(0.14, 0.42, 0.5 + 0.5 * Math.cos(((t - PUSH_T0) / PUSH_P) * Math.PI * 2));
    const toe = [X - 135, FL - 10];
    const hip = [toe[0] + 160 * Math.cos(th), toe[1] - 160 * Math.sin(th)];
    const sh = [hip[0] + 100 * Math.cos(th), hip[1] - 100 * Math.sin(th)];
    const a = -(Math.PI / 2 - th);
    return { x: hip[0], ax: X, hipY: hip[1], ay: FL, lean: Math.PI / 2 - th, head: -0.35, legs: { fT: a, fS: a, bT: a - 0.03, bS: a - 0.03 },
      hands: [[sh[0] + 6, FL - 13], [sh[0] - 6, FL - 13]], prefF: 'back', prefB: 'back', grounded: false, face: -1, gesture: false, noWalk: true };
  };

  // ---------- 2 · FAZ: levanta no 1º toque, sai pra correr, volta e faz flexão ----------
  const fazKeys = [
    [0, lie()],
    [2.25, reach, 0.22],
    [2.5, sitUp(), 0.32],
    [3.05, edge(BED1 - 15), 0.38],
    [3.55, stand(640), 0.32],
    [3.95, () => pose(640, FL, STAND_L, -0.12, -0.3, handsUp(640, HY), { gesture: false }), 0.3],   // espreguiça
    [4.75, stand(640), 0.3],
    [4.95, runTo(640, 1260, 4.95, 6.0), 0.25],
    [9.5, runTo(1260, 700, 9.5, 10.55, -1), 0.01],
    [10.55, () => pose(700, FL, CROUCH_L, 0.45, -0.2, [[700 + 60, HY + 70], [700 + 40, HY + 72]], { face: -1, gesture: false, noWalk: true }), 0.25],  // respira, mãos no joelho
    [11.9, stand(700, -1), 0.3],
    [12.25, push(700), 0.32],
    [17.6, stand(640, -1), 0.4],
    [17.95, () => pose(640, FL, STAND_L, -0.08, -0.15, [[640 + 40, HY - 250], [640 - 20, HY + 20]], { face: -1 }), 0.25],
  ];
  const fazState = (t) => seq(fazKeys, t);

  // ---------- 1 · PENSA DEMAIS: soneca, soneca, soneca... e acorda atrasado ----------
  const pensaKeys = [[0, lie()]];
  RINGS.forEach((r, i) => {
    pensaKeys.push([r + 0.35, reach, 0.3]);
    pensaKeys.push([r + 0.75, lie({ head: -0.3 }), 0.4]);
  });
  pensaKeys.push(
    [PANIC, sitUp(), 0.14],
    [PANIC + 0.45, edge(BED1 - 15), 0.22],
    [PANIC + 0.75, stand(640), 0.2],
    [PANIC + 0.95, runTo(640, 880, PANIC + 0.95, PANIC + 1.7), 0.12],
    [PANIC + 1.7, stand(880, -1, { gesture: false }), 0.18],
    [PANIC + 1.9, runTo(880, 420, PANIC + 1.9, PANIC + 2.8, -1), 0.12],
    [PANIC + 2.8, stand(420, 1, { gesture: false }), 0.18],
    [PANIC + 3.0, runTo(420, 760, PANIC + 3.0, PANIC + 3.7, 1), 0.12],
    [PANIC + 3.75, () => pose(760, FL, CROUCH_L, 0.55, -0.1, [[760 + 60, HY + 74], [760 + 40, HY + 76]], { gesture: false, noWalk: true }), 0.25],
  );
  const pensaState = (t) => {
    const st = seq(pensaKeys, t);
    if (t > PANIC + 3.75) st.hipY += 5 * Math.sin(t * 16);   // ofegante
    return st;
  };

  // ---------- relógio de parede (mesmo horário nos dois quartos) ----------
  const minutes = (t) => {
    if (t < 2.0) return -1;
    if (t < RINGS[3]) return Math.floor(((t - 2.0) / (RINGS[3] - 2.0)) * 27);
    if (t < PANIC) return 27 + Math.floor(easeIn(seg(t, RINGS[3], PANIC)) * 73);
    return 100 + Math.floor((t - PANIC) * 0.7);
  };
  const hhmm = (t) => { const m = 300 + minutes(t); return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`; };
  const ringing = (k, t) => { const rs = k === 'faz' ? [2.0] : RINGS; let r = 0; for (const x of rs) if (t >= x && t < x + (k === 'faz' ? 0.3 : 0.4)) r = 1; return r; };

  function drawBack(c, k, t, P) {
    const h = P.h;
    const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#17100c'); g.addColorStop(0.7, '#2c2018'); g.addColorStop(1, '#201710');
    c.fillStyle = g; c.fillRect(-60, -40, W + 120, h + 80);
    c.strokeStyle = 'rgba(0,0,0,0.22)'; c.lineWidth = 3; for (let x = -40; x < W + 60; x += 96) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, FL); c.stroke(); }
    // janela: noite -> amanhecer
    const dawn = smooth(seg(t, 2.0, PANIC + 1));
    c.save(); c.fillStyle = '#4a3524'; c.fillRect(640, 46, 220, 150); c.strokeStyle = OUT; c.lineWidth = 5; c.strokeRect(640, 46, 220, 150);
    const wg = c.createLinearGradient(0, 52, 0, 190); wg.addColorStop(0, rgb(mixC([20, 24, 44], [120, 140, 190], dawn))); wg.addColorStop(1, rgb(mixC([34, 30, 50], [255, 190, 120], dawn)));
    c.fillStyle = wg; c.fillRect(646, 52, 208, 138);
    c.fillStyle = rgb(mixC([235, 235, 220], [255, 220, 150], dawn), 1, 1); c.beginPath(); c.arc(820, lerp(80, 170, dawn), lerp(10, 22, dawn), 0, Math.PI * 2); c.fill();
    c.strokeStyle = 'rgba(0,0,0,0.45)'; c.lineWidth = 4; c.beginPath(); c.moveTo(750, 52); c.lineTo(750, 190); c.stroke(); c.restore();
    // luz da janela entrando
    c.save(); c.globalCompositeOperation = 'lighter'; c.filter = 'blur(18px)';
    c.fillStyle = rgb(PAL.luz, 1, 0.04 + 0.16 * dawn); c.beginPath(); c.moveTo(646, 60); c.lineTo(854, 60); c.lineTo(760, FL + 40); c.lineTo(420, FL + 40); c.closePath(); c.fill(); c.restore();
    // relógio digital de parede
    const late = k === 'pensa' && t >= PANIC;
    const blink = late ? (Math.floor(t * 4) % 2 ? 1 : 0.35) : 1;
    c.save(); c.translate(440, 112);
    const pop = t >= PANIC && k === 'pensa' ? 1 + 0.25 * Math.exp(-(t - PANIC) * 8) : 1; c.scale(pop, pop);
    c.fillStyle = '#100b08'; c.strokeStyle = OUT; c.lineWidth = 5; c.beginPath(); c.roundRect(-96, -32, 192, 64, 10); c.fill(); c.stroke();
    c.fillStyle = late ? rgb(PAL.dor, 1, blink) : rgb([255, 120, 90], 1, 0.95); c.font = '800 44px "Space Mono", monospace'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(t < 2.0 ? '04:59' : hhmm(t), 0, 3);
    c.restore();
    // porta
    c.fillStyle = '#0c0806'; c.fillRect(935, 70, 110, FL - 70); c.strokeStyle = OUT; c.lineWidth = 5; c.strokeRect(935, 70, 110, FL - 70);
    // cama (cabeceira, estrado, colchão, travesseiro)
    c.fillStyle = '#5a3c26'; c.strokeStyle = OUT; c.lineWidth = 4;
    c.fillRect(BED0 - 18, MT - 90, 22, FL - MT + 90); c.strokeRect(BED0 - 18, MT - 90, 22, FL - MT + 90);
    c.fillRect(BED0, MT + 16, BED1 - BED0, FL - MT - 30); c.strokeRect(BED0, MT + 16, BED1 - BED0, FL - MT - 30);
    c.fillRect(BED1 - 14, MT + 16, 16, FL - MT - 16); c.strokeRect(BED1 - 14, MT + 16, 16, FL - MT - 16);
    c.fillStyle = '#d9cdb8'; c.beginPath(); c.roundRect(BED0, MT - 2, BED1 - BED0, 20, 8); c.fill(); c.stroke();
    c.fillStyle = '#efe6d6'; c.beginPath(); c.roundRect(BED0 + 6, MT - 22, 80, 24, 10); c.fill(); c.stroke();
    // celular (vibra e acende quando toca)
    const rg = ringing(k, t);
    c.save(); c.translate(PHONE[0] + rg * 2.5 * Math.sin(t * 90), PHONE[1]);
    c.fillStyle = '#16161a'; c.beginPath(); c.roundRect(-16, -5, 32, 9, 3); c.fill(); c.stroke();
    if (rg) { c.save(); c.globalCompositeOperation = 'lighter'; c.fillStyle = 'rgba(160,210,255,0.55)'; c.filter = 'blur(6px)'; c.beginPath(); c.arc(0, -4, 22, 0, Math.PI * 2); c.fill(); c.restore();
      c.strokeStyle = 'rgba(230,240,250,0.9)'; c.lineWidth = 3; for (const s of [-1, 1]) for (let i = 1; i <= 2; i++) { c.beginPath(); c.arc(0, -4, 12 + i * 9, s > 0 ? -0.9 : Math.PI - 0.5, s > 0 ? -0.2 : Math.PI + 0.2); c.stroke(); } }
    c.restore();
    // piso
    c.fillStyle = '#241911'; c.fillRect(-60, FL, W + 120, h); c.strokeStyle = 'rgba(0,0,0,0.5)'; c.lineWidth = 4; c.beginPath(); c.moveTo(-60, FL); c.lineTo(W + 60, FL); c.stroke();
  }
  // cobertor por cima de quem está deitado
  function drawFront(c, k, t, P, drawn) {
    const inBed = k === 'faz' ? 1 - smooth(seg(t, 2.5, 3.1)) : 1 - smooth(seg(t, PANIC, PANIC + 0.5));
    const lift = k === 'pensa' ? 0 : 0;
    c.save(); c.fillStyle = '#7a3f34'; c.strokeStyle = OUT; c.lineWidth = 4;
    const x0 = lerp(BED0 + 175, BED0 + 230, 1 - inBed), top = MT - lerp(2, 20, inBed) - lift;
    c.beginPath(); c.moveTo(x0, MT + 18); c.quadraticCurveTo(x0 - 6, top - 6, x0 + 40, top);
    c.quadraticCurveTo(x0 + 140, top - 6 * inBed, BED1 - 4, MT - 2); c.lineTo(BED1 + 6, MT + 40); c.lineTo(x0 + 10, MT + 40); c.closePath(); c.fill(); c.stroke();
    c.strokeStyle = 'rgba(0,0,0,0.25)'; c.lineWidth = 3; for (let i = 1; i < 4; i++) { const xx = lerp(x0 + 40, BED1 - 10, i / 4); c.beginPath(); c.moveTo(xx, top + 4); c.lineTo(xx + 6, MT + 30); c.stroke(); }
    c.restore();
    // Z z z
    const sleeping = k === 'faz' ? t < 2.0 : (t < PANIC && !RINGS.some((r) => t > r - 0.1 && t < r + 1.9));
    if (sleeping || (k === 'pensa' && t < PANIC && RINGS.some((r) => t > r + 1.0 && t < r + 1.9))) {
      const hd = drawn.main.head;
      for (let i = 0; i < 3; i++) { const a = (t * 0.55 + i / 3) % 1; c.save(); c.globalAlpha = Math.sin(Math.PI * a) * 0.9; c.fillStyle = '#e8dcc6';
        c.font = `800 ${16 + 12 * a}px Montserrat, sans-serif`; c.textAlign = 'center'; c.fillText('Z', hd[0] + 20 + a * 50, hd[1] - 20 - a * 70 + 6 * Math.sin(t * 3 + i)); c.restore(); }
    }
    // suor / brilho de energia do faz depois da corrida
    if (k === 'faz' && t > 10.5 && t < 12.2) {
      const hd = drawn.main.head;
      for (let i = 0; i < 3; i++) { const a = ((t * 1.4 + i / 3) % 1); c.fillStyle = `rgba(200,230,255,${0.9 * (1 - a)})`; c.beginPath(); c.arc(hd[0] - 18 - i * 8, hd[1] - 12 + a * 40, 5, 0, Math.PI * 2); c.fill(); }
    }
  }

  // ---------- índice de cansaço ----------
  const painFaz = (t) => {
    let p = 50 + spike(t, 2.0, 45, 1.3);
    p = lerp(p, 26 + 4 * Math.sin(t * 4), smooth(seg(t, 3.5, 5.0)));
    return lerp(p, 7 + 2 * Math.sin(t * 2), smooth(seg(t, 10.5, 12.0)));
  };
  const painPensa = (t) => {
    let p = 50 + 22 * smooth(seg(t, 2, PANIC)) + 3 * Math.sin(t * 2.2);
    for (const r of RINGS) p += spike(t, r, 30, 1.4);
    p += spike(t, PANIC, 40, 0.6);
    return Math.min(100, lerp(p, 86 + 6 * Math.sin(t * 6), smooth(seg(t, PANIC + 1.5, PANIC + 2.5))));
  };

  const SCENE = {
    metricLabel: 'ÍNDICE DE CANSAÇO', totalLabel: 'CANSAÇO TOTAL', reportT: 19.0,
    secsText: (n) => `${n} SEGUNDO${n > 1 ? 'S' : ''} NO VERMELHO`,
    state: { faz: fazState, pensa: pensaState },
    drawBack, drawFront,
    pain: { faz: painFaz, pensa: painPensa },
    bubbles: {
      faz: [
        { t0: 2.75, t1: 3.6, text: 'BORA.', col: PAL.faz, y: 50 },
        { t0: 10.75, t1: 12.0, text: '5 KM. FEITO.', col: PAL.faz, y: 50 },
        { t0: PUSH_T0 + PUSH_P * 3, t1: PUSH_T0 + PUSH_P * 3 + 0.6, text: '18', y: 50 },
        { t0: PUSH_T0 + PUSH_P * 4, t1: PUSH_T0 + PUSH_P * 4 + 0.6, text: '19', y: 50 },
        { t0: PUSH_T0 + PUSH_P * 5, t1: PUSH_T0 + PUSH_P * 5 + 0.7, text: '20!', col: PAL.faz, y: 50 },
        { t0: 18.0, t1: 18.95, text: 'BOM DIA!', col: PAL.faz, y: 50 },
      ],
      pensa: [
        { t0: RINGS[0] + 0.7, t1: RINGS[0] + 1.9, text: 'SÓ MAIS 5...', y: 50 },
        { t0: RINGS[1] + 0.7, t1: RINGS[1] + 1.9, text: 'AMANHÃ EU COMEÇO...', y: 50 },
        { t0: RINGS[2] + 0.7, t1: RINGS[2] + 1.9, text: 'HOJE TÁ FRIO...', y: 50 },
        { t0: RINGS[3] + 0.7, t1: RINGS[3] + 1.9, text: 'SÓ MAIS 5...', y: 50 },
        { t0: PANIC + 0.1, t1: PANIC + 1.3, text: 'ATRASADO!!', col: PAL.dor, y: 50 },
        { t0: PANIC + 1.75, t1: PANIC + 2.9, text: 'CADÊ A CHAVE?!', col: PAL.dor, y: 50 },
        { t0: PANIC + 3.85, t1: 18.95, text: 'TÔ MORTO...', y: 50 },
      ],
    },
    shake: (k, t) => (k === 'pensa' ? 8 * (t >= PANIC ? Math.exp(-(t - PANIC) * 6) : 0) + (ringing(k, t) ? 1.5 : 0) : (ringing(k, t) ? 1.5 : 0)),
    energy: (k, t) => (k === 'pensa' && t > PANIC ? 2.0 : k === 'faz' && t > 10.5 ? 1.4 : 1),
    caps: [
      { s: -1, e: 2.85, lines: [[-1, [['5 DA MANHÃ.']]], [0.3, [['DOIS JEITOS DE '], ['ACORDAR.', 'dor']]]] },
      { s: 3.0, e: 5.5, lines: [[3.0, [['QUEM '], ['FAZ', 'faz']]], [3.3, [['LEVANTA NO 1º TOQUE.']]]] },
      { s: 5.6, e: 8.0, lines: [[5.6, [['OS 2 PRIMEIROS SEGUNDOS']]], [5.95, [['SÃO OS '], ['PIORES.', 'dor']]]] },
      { s: 8.1, e: 10.5, lines: [[8.1, [['QUEM '], ['PENSA DEMAIS', 'pensa']]], [8.5, [['NEGOCIA COM A CAMA.']]]] },
      { s: 10.6, e: 13.2, lines: [[10.6, [['SÓ MAIS 5.']]], [10.95, [['SÓ MAIS 5. SÓ MAIS 5.']]]] },
      { s: 13.3, e: 15.8, lines: [[13.3, [['E ACORDA']]], [13.7, [['ATRASADO.', 'dor']]]] },
      { s: 15.9, e: 18.9, lines: [[15.9, [['DORMIU MAIS']]], [16.3, [['E TÁ MAIS '], ['CANSADO.', 'dor']]]] },
      { s: 19.1, e: 21.7, big: true, lines: [[19.2, [['A SONECA']]], [19.6, [['NÃO '], ['DESCANSA.', 'dor']]]] },
      { s: 21.8, e: 99, big: true, lines: [[21.8, [['LEVANTA NO']]], [22.15, [['PRIMEIRO '], ['TOQUE.', 'faz']]]] },
    ],
    sched: { fx: [
      [2.0, 'ring', 0.16, 0.35], ...RINGS.map((r) => [r, 'ring', 0.16, -0.35]),
      [2.45, 'slap', 0.18, 0.35], ...RINGS.map((r) => [r + 0.55, 'slap', 0.16, -0.35]),
      [2.5, 'whoosh', 0.16, 0.35], [3.95, 'whoosh', 0.12, 0.35], [10.75, 'chime', 0.16, 0.35],
      ...[3, 4, 5].map((i) => [PUSH_T0 + PUSH_P * i, 'pop', 0.14, 0.35]),
      [PANIC, 'bigring', 0.2, -0.35], [PANIC, 'thud', 0.25, -0.35], [PANIC + 0.1, 'whoosh', 0.2, -0.35], [PANIC + 3.8, 'sad', 0.18, -0.35],
      ...Array.from({ length: 22 }, (_, i) => [RINGS[3] + 0.6 + i * 0.08, 'tick', 0.05, 0]),
    ], heart: [PANIC, 19.0] },
  };
