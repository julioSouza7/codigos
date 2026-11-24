
  // ================= MÉTODO MINIMALISTA 2.0: "O AUMENTO" (20 s) — mais interação e animação =================
  const GT = 16.5, FL = C_FL, DOORX = 700, PLANT = 330;
  const fear = (t) => (smooth(seg(t, 2.7, 4.6)) * 0.5 + smooth(seg(t, 8.2, 10.0)) * 0.5) * (1 - smooth(seg(t, 11.9, 12.2)));
  const OPEN_F = 1.6, OPEN_P = 13.5;
  const openAmt = (k, t) => (k === 'faz' ? smooth(seg(t, OPEN_F, OPEN_F + 0.3)) * (1 - smooth(seg(t, 4.2, 4.5))) : smooth(seg(t, OPEN_P, OPEN_P + 0.3)));
  const knockP = (x) => (t) => cStandW(x, 1, 0.05, 0.05, [[x + 70 + 8 * Math.max(0, Math.sin(t * 20)), FL - 160], [x + 20, FL - 110]])(t);

  // ---------- 2 · FAZ ----------
  const JUMP0 = 4.45, REACH0 = 6.45, REACH1 = 7.9;
  const heelClick = (t) => { const u = seg(t, JUMP0, JUMP0 + 0.5); const st = cStandW(600, 1, -0.05, -0.2, [[640, FL - 250], [560, FL - 240]], { prefF: 'down', prefB: 'down' })(t);
    st.grounded = false; st.hipY = hipOn(FL, STAND_L) - 90 * Math.sin(Math.PI * u); st.legs = { fT: 0.5 * Math.sin(Math.PI * u), fS: 0.6 * Math.sin(Math.PI * u), bT: -0.5 * Math.sin(Math.PI * u), bS: -0.6 * Math.sin(Math.PI * u) }; return st; };
  const countMoney = (t) => { const u = 0.5 - 0.5 * Math.cos(t * 7); const st = cSeatSt(560, 1, 0.2, 0.35); st.hands = [toRig(st, [610 + 6 * u, FL - 108 - 10 * u]), toRig(st, [596, FL - 104])]; return st; };
  const textBuddy = (t) => { const st = cSeatSt(560, 1, 0.22, 0.42); st.hands = [toRig(st, [598 + 3 * Math.sin(t * 22), FL - 126]), toRig(st, [590, FL - 122])]; return st; };
  const fazKeys = [
    [0, cStandW(420, 1, 0.02, 0.0, [[452, FL - 176], [440, FL - 170]])],   // ajeita a gravata
    [0.4, cWalk(420, 620, 0.4, 1.2), 0.2], [1.2, knockP(620), 0.2], [1.6, cStand(620), 0.3],
    [3.4, cStandW(620, 1, 0.08, 0.05, [[676, FL - 116], [640, FL - 110]]), 0.25],   // pega o envelope / aperto de mão
    [4.25, cStand(620, -1), 0.2], [4.35, cWalk(620, 600, 4.35, 4.45, -1), 0.05], [JUMP0, heelClick, 0.08], [JUMP0 + 0.55, cStand(600, 1), 0.2],
    [5.2, cStandW(600, 1, -0.05, -0.55, [[630, FL - 110], [586, FL - 106]]), 0.3],   // olha pra cima
    [REACH0, (t) => { const st = pose(600, FL, STAND_L, -0.05, -0.5, handsDown(600, C_HY), { gesture: false, noWalk: true }); st.hands = [toRig(st, [660, -60]), toRig(st, [580, FL - 110])]; return st; }, 0.3],
    [REACH1, cStand(600, -1), 0.3], [8.1, cWalk(600, 560, 8.1, 8.5, -1), 0.2], [8.5, countMoney, 0.4],
    [10.05, textBuddy, 0.3], [10.7, countMoney, 0.4],
  ];
  const fazState = (t) => { const st = seq(fazKeys, t); if (t > JUMP0 + 0.45 && t < JUMP0 + 0.7) st.sq = 0.1 * Math.sin(Math.PI * (t - JUMP0 - 0.45) / 0.25); return st; };

  // ---------- 1 · PENSA DEMAIS ----------
  const wring = (x) => (t) => cStandW(x, 1, 0.06, 0.2, [[x + 34 + 6 * Math.sin(t * 9), FL - 128], [x + 22 - 6 * Math.sin(t * 9), FL - 124]])(t);
  const hide = (t) => { const peek = 0.5 + 0.5 * Math.sin((t - 5.0) * 2.4); const st = cStandW(PLANT - 70, 1, 0.1 + 0.35 * peek, 0.25, [[PLANT - 20, FL - 150], [PLANT - 30, FL - 120]])(t); return st; };
  const count = (t) => { const n = Math.floor((t - 8.3) * 2) % 4; return cStandW(470, 1, 0.02, 0.15, [[520, FL - 170 + n * 4], [500, FL - 150]], { gesture: true })(t); };
  const jumpScare = (t) => { const st = cStandW(470, 1, -0.2, -0.3, [[520, FL - 220], [430, FL - 210]], { prefF: 'up', prefB: 'up' })(t); st.grounded = false; st.hipY = hipOn(FL, STAND_L) - 45 * Math.sin(Math.PI * clamp((t - 10.75) / 0.35)); return st; };
  const pensaKeys = [
    [0, wring(430)], [1.0, cWalk(430, 560, 1.0, 1.6), 0.2], [1.6, knockP(560), 0.2], [1.95, cStand(560, -1), 0.15], [2.05, cWalk(560, 430, 2.05, 2.6, -1), 0.15], [2.6, wring(430), 0.25],
    [5.0, hide, 0.35],
    [6.45, cStandW(460, 1, -0.05, -0.4, [[480, FL - 150], [450, FL - 140]]), 0.3],
    [7.2, cStandW(470, 1, -0.1, -0.35, (t) => [[488 + 3 * Math.sin(t * 40), FL - 176], [500, FL - 120]]), 0.3],   // bebe o café tremendo
    [8.3, count, 0.3],
    [10.7, jumpScare, 0.08], [11.1, cStandW(470, 1, 0.15, 0.4, [[510, FL - 128], [495, FL - 124]]), 0.25],   // lê a mensagem
    [12.2, cWalk(470, 560, 12.2, 13.0), 0.3], [13.0, knockP(560), 0.2], [13.4, cStand(560), 0.3],
    [15.6, cStandW(560, 1, 0.35, 0.6, [[580, FL - 70], [540, FL - 66]]), 0.5],
  ];
  const pensaState = (t) => seq(pensaKeys, t);

  // chefe (azul)
  const off = () => pose(-600, FL, STAND_L, 0, 0, handsDown(-600, C_HY), { noWalk: true });
  const boss = (k) => (t) => {
    if (k === 'faz') { if (openAmt(k, t) < 0.5) return off();
      if (t > 2.6 && t < 3.0) return cStandW(760, -1, 0.05, 0.25, [[742, FL - 150], [740, FL - 120]])(t);   // coça o queixo
      if (t > 3.3 && t < 4.2) return cStandW(760, -1, 0.08, 0.05, [[684, FL - 116], [740, FL - 100]])(t);
      return cStand(760, -1)(t); }
    if (t < OPEN_P + 0.15) return off();
    if (t < 14.6) return cStandW(760, -1, 0.02, 0.05, [[730, FL - 100], [748, FL - 96]])(t);
    return cWalk(760, 1250, 14.6, 15.6, 1)(t);
  };

  // ---------- desenho ----------
  function drawDoor(c, k, t) {
    const g = k === 'pensa' ? fear(t) : 0, s = 1 + 1.5 * g, o = openAmt(k, t);
    c.save(); c.translate(DOORX, FL); c.scale(s, s);
    c.fillStyle = '#0b0b0d'; c.fillRect(-10, -230, 120, 230); c.strokeStyle = '#3a3a40'; c.lineWidth = 8; c.strokeRect(-10, -230, 120, 230);
    const w = 100 * (1 - 0.85 * o); c.fillStyle = g > 0.3 ? '#3c281c' : '#5c4028'; c.fillRect(0, -222, w, 222); c.strokeStyle = '#0e0e10'; c.lineWidth = 4; c.strokeRect(0, -222, w, 222);
    if (o < 0.3) {
      c.fillStyle = '#e8c547'; c.beginPath(); c.arc(w - 14, -110, 5, 0, Math.PI * 2); c.fill();
      c.fillStyle = 'rgba(220,220,200,0.25)'; c.fillRect(20, -200, 60, 60);
      if (g > 0.2) { const u = smooth(seg(g, 0.2, 0.9)), blink = Math.abs(Math.sin(t * 1.3)) > 0.08 ? 1 : 0.1; c.save(); c.beginPath(); c.rect(20, -200, 60, 60); c.clip(); c.fillStyle = 'rgba(10,10,12,0.92)'; c.beginPath(); c.arc(50, -150 + 30 * (1 - u), 24 + 30 * u, 0, Math.PI * 2); c.fill();
        c.fillStyle = rgb(PAL.dor); c.beginPath(); c.ellipse(42, -162, 3 + 2 * u, (3 + 2 * u) * blink, 0, 0, Math.PI * 2); c.ellipse(58, -162, 3 + 2 * u, (3 + 2 * u) * blink, 0, 0, Math.PI * 2); c.fill(); c.restore(); }
      c.fillStyle = '#e8dcc6'; c.fillRect(25, -130, 50, 16); c.fillStyle = '#1a1a1a'; c.font = '800 10px Montserrat'; c.textAlign = 'center'; c.fillText('CHEFE', 50, -118);
      const ch = smooth(seg(t, 8.4, 9.6)) * (k === 'pensa' ? 1 - smooth(seg(t, 11.9, 12.2)) : 0);
      if (ch > 0) for (let i = 0; i < 3; i++) { c.save(); c.globalAlpha = ch; c.strokeStyle = '#9a9aa2'; c.lineWidth = 4; c.beginPath(); c.moveTo(-6, -40 - i * 50); c.lineTo(106, -60 - i * 50); c.stroke();
        c.fillStyle = '#e8c547'; c.strokeStyle = '#0e0e10'; c.lineWidth = 2; c.fillRect(42, -62 - i * 50 + 4 * Math.sin(t * 3 + i), 16, 14); c.strokeRect(42, -62 - i * 50 + 4 * Math.sin(t * 3 + i), 16, 14); c.restore(); }
    }
    c.restore();
  }
  function plant(c) { c.fillStyle = '#2f4a2c'; c.strokeStyle = '#0e0e10'; c.lineWidth = 4; for (const [dx, dy, r] of [[0, -150, 46], [-30, -120, 36], [30, -118, 38], [0, -95, 34]]) { c.beginPath(); c.arc(PLANT + dx, FL + dy, r, 0, Math.PI * 2); c.fill(); c.stroke(); }
    c.fillStyle = '#8a5a3a'; c.beginPath(); c.moveTo(PLANT - 34, FL - 70); c.lineTo(PLANT + 34, FL - 70); c.lineTo(PLANT + 24, FL); c.lineTo(PLANT - 24, FL); c.closePath(); c.fill(); c.stroke(); }
  function drawBack(c, k, t, P) {
    cStage(c, P, [330, 30], [600, 330]); drawDoor(c, k, t);
    if (k === 'pensa') { cWallClock(c, 520, 70, t, t > 8.3 && t < 10.0 ? 1 : 0); }
    if (k === 'faz' && t > 8.0) { c.fillStyle = '#3a3a40'; c.fillRect(520, FL - 66, 80, 10); c.fillRect(526, FL - 56, 8, 56); c.fillRect(586, FL - 56, 8, 56); }   // banquinho
  }
  function drawFront(c, k, t, P, drawn) {
    const hp = drawn.main.hand;
    if (k === 'pensa' && t >= 5.0 && t < 6.45) plant(c);   // ele se esconde atrás do vaso
    if (k === 'faz') {
      // envelope do chefe para o faz
      if (t > 3.3) { let p; if (t < 3.8 && drawn.other) p = P2(drawn.other.hand, hp, smooth(seg(t, 3.4, 3.8))); else p = t < 8.5 ? hp : drawn.main.toP(drawn.main.R.armB[2]);
        if (!(t > REACH0 && t < REACH1)) { c.fillStyle = '#f4ead8'; c.strokeStyle = '#0e0e10'; c.lineWidth = 3; c.fillRect(p[0] - 14, p[1] - 10, 28, 18); c.strokeRect(p[0] - 14, p[1] - 10, 28, 18); c.beginPath(); c.moveTo(p[0] - 14, p[1] - 10); c.lineTo(p[0], p[1]); c.lineTo(p[0] + 14, p[1] - 10); c.stroke(); } }
      if (t > 8.5) { for (let i = 0; i < 3; i++) { const a = ((t * 1.2 + i / 3) % 1); c.save(); c.globalAlpha = 1 - a; c.translate(hp[0] + 10, hp[1] - 10 - a * 50); c.rotate(a * 2); c.fillStyle = '#7fbf7f'; c.strokeStyle = '#0e0e10'; c.lineWidth = 2; c.fillRect(-12, -6, 24, 12); c.strokeRect(-12, -6, 24, 12); c.restore(); } }
      if (t > 10.05 && t < 10.7) cPhone(c, hp, t, '#4fbf6a', false);
      cConfetti(c, 600, FL - 220, JUMP0 + 0.2, t);
      if (t > JUMP0 && t < 6.0) { const hd = drawn.main.head, a = t - JUMP0; c.save(); c.globalAlpha = Math.min(1, a * 3) * (1 - smooth(seg(t, 5.5, 6.0))); c.fillStyle = rgb(PAL.faz); c.font = '900 34px Montserrat'; c.textAlign = 'center'; c.fillText('+20%', hd[0] + 60, hd[1] - 10 - a * 12); c.restore(); }
      if (t > 5.2 && t < 6.4) { const hd = drawn.main.head; c.fillStyle = '#f4f2ee'; c.font = '900 40px Montserrat'; c.textAlign = 'center'; c.fillText('?', hd[0] + 10, hd[1] - 50 - 6 * Math.sin(t * 8)); }
    } else {
      // café que veio de baixo
      if (t > 7.0 && t < 8.3) { const p = add(hp, [4, -6]); c.fillStyle = '#e8dcc6'; c.strokeStyle = '#0e0e10'; c.lineWidth = 3; c.beginPath(); c.roundRect(p[0] - 10 + 2 * Math.sin(t * 40), p[1] - 12, 20, 24, 3); c.fill(); c.stroke();
        for (let i = 0; i < 3; i++) { const a = ((t * 2 + i / 3) % 1); c.fillStyle = 'rgba(110,70,40,0.9)'; c.beginPath(); c.arc(p[0] + 10, p[1] + a * 100, 3, 0, Math.PI * 2); c.fill(); } }
      // celular vibrando no bolso com a mensagem do faz
      if (t > 10.7 && t < 12.0) { const p = drawn.main.toP(drawn.main.R.armB[2]); cPhone(c, p, t, '#4fbf6a', true); c.strokeStyle = 'rgba(255,255,255,0.8)'; c.lineWidth = 3; for (let i = 1; i <= 2; i++) { c.beginPath(); c.arc(p[0], p[1] - 10, 14 + i * 8, -0.7, 0.7); c.stroke(); } }
      // pasta do chefe indo embora
      if (t > OPEN_P + 0.15 && drawn.other) { const bp = drawn.other.hand; c.fillStyle = '#4a3220'; c.strokeStyle = '#0e0e10'; c.lineWidth = 3; c.beginPath(); c.roundRect(bp[0] - 16, bp[1] - 2, 32, 24, 4); c.fill(); c.stroke(); }
      cBurst(c, drawn.main.head, 10.75, t);
      if (fear(t) > 0.3 || (t > 5 && t < 6.4)) cSweat(c, drawn.main.head, t);
      // luz apagando no fim
      const lo = smooth(seg(t, 15.6, 15.75)); if (lo > 0) { c.save(); c.fillStyle = `rgba(0,0,0,${0.8 * lo})`; c.fillRect(-400, -200, 2000, 1000); c.globalCompositeOperation = 'lighter'; c.filter = 'blur(20px)'; c.fillStyle = `rgba(255,214,160,${0.18 * lo})`; c.beginPath(); c.ellipse(drawn.main.head[0], FL - 60, 90, 160, 0, 0, Math.PI * 2); c.fill(); c.restore(); }
    }
  }
  // braço do FAZ subindo com o café
  function drawGlobal(c, t, LM, dim) {
    const u = smooth(seg(t, REACH0 + 0.2, REACH0 + 0.6)) * (1 - smooth(seg(t, REACH1 - 0.5, REACH1 - 0.1)));
    if (u <= 0) return; const x0 = 650, y0 = 860, x1 = 640, y1 = lerp(860, 700, u);
    c.save(); c.beginPath(); c.rect(0, 150, W, 860 - 150); c.clip(); cArm(c, [[x0, y0], [lerp(x0, 660, u), lerp(y0, 770, u)], [x1, y1]], 30);
    c.fillStyle = '#f7f7f5'; c.strokeStyle = '#0e0e10'; c.lineWidth = 5; c.beginPath(); c.arc(x1, y1, 20, 0, Math.PI * 2); c.fill(); c.stroke();
    if (t < 7.05) { c.fillStyle = '#e8dcc6'; c.beginPath(); c.roundRect(x1 - 18, y1 - 58, 36, 44, 5); c.fill(); c.stroke(); c.strokeStyle = 'rgba(240,230,220,0.6)'; c.lineWidth = 3; for (let i = 0; i < 2; i++) { c.beginPath(); for (let j = 0; j < 6; j++) { const yy = y1 - 64 - j * 6, xx = x1 - 6 + i * 12 + 3 * Math.sin(t * 3 + j); if (!j) c.moveTo(xx, yy); else c.lineTo(xx, yy); } c.stroke(); } }
    c.restore();
  }

  const SCENE = {
    minimal: true, noMonitor: true, metricLabel: '', totalLabel: '', reportT: GT, noReport: true, drawGlobal,
    tint: (k, t) => (k === 'pensa' ? 0.55 * fear(t) : 0), tintCol: [150, 205, 150],
    secsText: (n) => `${n}`,
    state: { faz: fazState, pensa: pensaState },
    others: { faz: [{ id: 'other', fn: boss('faz'), col: PAL.azul, seed: 51, glow: 0 }], pensa: [{ id: 'other', fn: boss('pensa'), col: PAL.azul, seed: 53, glow: 0 }] },
    drawBack, drawFront,
    cam: (k, t) => (k === 'faz' ? { x: 610, y: 185, z: 1.12 + 0.08 * Math.exp(-Math.max(0, t - JUMP0) * 4) * (t > JUMP0 ? 1 : 0) } : { x: 580, y: 185, z: 1.12 - 0.28 * fear(t) + 0.1 * Math.exp(-Math.max(0, t - 10.75) * 6) * (t > 10.75 ? 1 : 0) }),
    pain: { faz: () => 0, pensa: () => 0 },
    bubbles: {
      faz: [
        { t0: 1.9, t1: 2.6, text: 'QUERO UM AUMENTO.' },
        { t0: 3.0, t1: 3.7, text: 'FECHADO.', col: PAL.azul, who: 'other' },
      ],
      pensa: [
        { t0: 3.0, t1: 4.4, text: 'E SE ELE GRITAR?' },
        { t0: 5.3, t1: 6.3, text: 'E SE ME DEMITIR?' },
        { t0: 6.55, t1: 7.1, text: 'TOMA, CORAGEM.', col: PAL.faz, x: 420 },
        { t0: 8.5, t1: 9.8, text: '1: BOM DIA. 2: ...' },
        { t0: 11.1, t1: 11.9, text: '"E AÍ? FOI?"', col: PAL.faz },
        { t0: 13.8, t1: 14.9, text: 'FALA AMANHÃ, TÔ INDO.', col: PAL.azul, who: 'other' },
      ],
    },
    shake: (k, t) => (k === 'pensa' ? 6 * (t >= 10.75 ? Math.exp(-(t - 10.75) * 8) : 0) : 0),
    caps: [
      { s: GT + 0.1, e: 99, center: true, lines: [[GT + 0.3, [['O SIM VEIO EM '], ['2 SEGUNDOS.', 'faz']]], [GT + 0.9, [['O MEDO DUROU '], ['MESES.', 'dor']]]] },
    ],
    sched: {
      noBips: true, noPops: true, music: 0.18, focusKeys: [[0, 'faz'], [2.65, 'pensa'], [3.95, 'faz'], [7.1, 'pensa'], [10.05, 'faz'], [10.65, 'pensa']],
      fx: [
        [1.25, 'knock', 0.6, 0.35], [OPEN_F, 'foley/porta', 0.5, 0.35],
        [2.7, 'ominous', 0.4, -0.35, 1.2],
        [4.0, 'foley/notas_1', 0.45, 0.35], [JUMP0, 'whoosh', 0.22, 0.35], [JUMP0 + 0.5, 'thud', 0.15, 0.35], [4.6, 'chime', 0.16, 0.35], [6.5, 'foley/cloth_04', 0.3, 0.35],
        [7.3, 'foley/gole_1', 0.5, -0.35], [7.7, 'foley/gole_2', 0.5, -0.35], ...Array.from({ length: 17 }, (_, i) => [8.3 + i * 0.1, 'tick', 0.08, -0.35]),
        [10.1, 'typing', 0.3, 0.35, 0.45],
        [10.7, 'ding', 0.25, -0.35], [10.75, 'thud', 0.18, -0.35], [12.0, 'pop', 0.25, -0.35], [13.05, 'knock', 0.6, -0.35], [OPEN_P, 'foley/porta', 0.5, -0.35], [15.7, 'tick', 0.4, -0.35], [16.0, 'exhale', 0.22, -0.35],
      ],
      heartReal: [[8.3, 10.0, -0.35]],
    },
  };
