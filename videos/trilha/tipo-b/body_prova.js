
  // ================= ROTEIRO: "A PROVA" (34 s) — índice de ansiedade =================
  const FL = 300, DT = FL - 92;                  // piso e tampo da escrivaninha
  const DESK0 = 572, DESK1 = 820, CH = 548;      // mesa e cadeira
  const BOOK = [618, DT - 6];
  const BEDX = 250;
  const HY = hipOn(FL, STAND_L);
  const GT = 29.0, MORNING = 25.8;
  const FOCUS = [[0, null], [2.8, 'faz'], [6.8, 'pensa'], [10.8, 'faz'], [14.0, 'pensa'], [17.2, 'faz'], [19.8, 'pensa'], [MORNING, 'faz'], [27.4, 'pensa'], [GT, null]];
  const dimOf = focusTrack(FOCUS);
  // relógio: minutos depois das 19:00
  const MK = [[0, -1], [2.8, 0], [6.8, 30], [10.8, 90], [14.0, 150], [17.2, 210], [19.0, 240], [19.79, 255], [19.8, 360], [MORNING - 0.01, 480]];
  const mins = (t) => { if (t >= MORNING) return 780; for (let i = 1; i < MK.length; i++) if (t <= MK[i][0]) { const [a, va] = MK[i - 1], [b, vb] = MK[i]; return Math.floor(lerp(va, vb, (t - a) / (b - a))); } return 480; };
  const hhmm = (t) => { const m = (19 * 60 + mins(t)) % 1440; return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`; };

  // ---------- poses ----------
  const SEAT_L = { fT: 1.45, fS: 0.02, bT: 1.38, bS: -0.06 };
  const SHY = hipOn(FL, SEAT_L);
  const seat = (lean, head, hands, extra) => (t) => Object.assign({ x: CH, hipY: SHY, ay: FL, lean, head, legs: SEAT_L, hands, prefF: 'down', prefB: 'down', grounded: false, face: 1, noWalk: true, gesture: false }, extra || {});
  const W2R = (x, y) => toRig({ x: CH, ay: FL, face: 1 }, [x, y]);
  const write = (fast = 1) => (t) => { const a = t * 13 * fast; return seat(0.42, 0.45, [W2R(BOOK[0] + 10 + 8 * Math.sin(a) + 6 * Math.sin(a * 0.31), BOOK[1] - 6 + 3 * Math.cos(a)), W2R(BOOK[0] - 22, BOOK[1] - 2)])(t); };
  const read = () => (t) => seat(0.38, 0.5, [W2R(BOOK[0] + 6, BOOK[1] - 4), W2R(BOOK[0] - 20, BOOK[1] - 2)])(t);
  const stand = (x, face = 1, extra) => () => pose(x, FL, STAND_L, 0.03, 0.02, handsDown(x, HY), Object.assign({ face }, extra || {}));
  const walkTo = (x0, x1, t0, t1, face = 1) => (t) => { const x = lerp(x0, x1, easeInOut(seg(t, t0, t1))); return pose(x, FL, STAND_L, 0.04, 0.02, handsDown(x, HY), { face, run: 0 }); };
  const LIE_L = { fT: 1.5, fS: 1.56, bT: 1.44, bS: 1.54 };
  const BMT = FL - 62;
  const lie = () => () => { const hy = BMT - 16; return { x: BEDX, hipY: hy, ay: BMT, lean: -1.5, head: -0.16, legs: LIE_L, hands: [[BEDX - 46, hy - 30], [BEDX - 66, hy - 26]], prefF: 'down', prefB: 'down', grounded: false, face: 1, gesture: false, noWalk: true }; };
  const phoneSeat = () => (t) => seat(0.25, 0.45, [[CH + 52, SHY - 92 + 2 * Math.sin(t * 5)], [CH + 40, SHY - 86]])(t);

  // ---------- 2 · FAZ ----------
  const fazKeys = [
    [0, stand(CH + 40, 1)],
    [2.9, () => { const st = pose(CH + 40, FL, STAND_L, 0.35, 0.4, handsDown(CH + 40, HY)); st.hands = [toRig(st, [690, DT + 24]), st.hands[1]]; return st; }, 0.3],   // guarda o celular na gaveta
    [3.55, seat(0.15, 0.2, [W2R(BOOK[0] - 4, BOOK[1] - 10), W2R(BOOK[0] - 24, BOOK[1] - 6)]), 0.4],
    [4.1, write(), 0.3], [6.6, read(), 0.4],
    [10.9, read(), 0.3], [11.3, write(1.2), 0.25], [12.8, read(), 0.25], [13.1, write(), 0.25],
    [14.0, read(), 0.4],
    [17.3, write(), 0.3], [17.9, seat(-0.12, -0.2, [[CH + 40, SHY - 250], [CH - 10, SHY - 240]], { prefF: 'up', prefB: 'up' }), 0.35],   // espreguiça
    [18.35, stand(CH + 20, -1), 0.3], [18.55, walkTo(CH + 20, BEDX + 80, 18.55, 19.2, -1), 0.3],
    [19.25, lie(), 0.4],
    [MORNING, seat(0.1, 0.15, [W2R(BOOK[0] + 4, BOOK[1] - 10), W2R(BOOK[0] - 24, BOOK[1] - 6)]), 0.01],
    [26.2, seat(-0.1, -0.2, [[CH + 40, SHY - 250], [CH - 10, SHY - 20]], { prefF: 'up' }), 0.25],   // comemora
  ];
  const fazState = (t) => seq(fazKeys, t);

  // ---------- 1 · PENSA DEMAIS ----------
  const arrange = () => (t) => { const a = Math.floor(t * 2.6), x = BOOK[0] + 40 + ((a * 37) % 70); return seat(0.32, 0.4, [W2R(x, DT - 8 - 4 * Math.abs(Math.sin(t * 8.2))), W2R(BOOK[0] - 10, DT - 4)])(t); };
  const laptop = () => (t) => seat(0.22, 0.25, [W2R(700, DT - 10 + 2 * Math.sin(t * 9)), W2R(684, DT - 8)])(t);
  const sleepDesk = () => (t) => seat(1.0, 0.55, [W2R(BOOK[0] + 26, DT - 6), W2R(BOOK[0] + 4, DT - 4)])(t);
  const pensaKeys = [
    [0, stand(CH + 40, 1)],
    [6.9, seat(0.15, 0.2, [W2R(BOOK[0] - 4, BOOK[1] - 10), W2R(BOOK[0] - 24, BOOK[1] - 6)]), 0.4],
    [7.3, arrange(), 0.3],
    [9.2, laptop(), 0.35],
    [14.0, laptop(), 0.3],
    [16.35, phoneSeat(), 0.35],
    [19.9, seat(-0.1, -0.3, [[CH + 40, SHY - 170], [CH - 10, SHY - 160]], { prefF: 'down' }), 0.12],   // susto
    [20.35, read(), 0.3], [20.8, write(1.8), 0.25],
    [22.9, seat(0.05, -0.15, [W2R(CH + 30, FL - 142), W2R(BOOK[0] - 20, BOOK[1] - 2)]), 0.3],   // café
    [23.5, write(1.6), 0.3],
    [24.4, (t) => { const u = smooth(seg(t, 24.4, 25.2)); const s1 = write(0.6)(t), s2 = sleepDesk()(t); return mixPose(s1, s2, u); }, 0.3],
    [25.2, sleepDesk(), 0.3],
    [MORNING, seat(0.1, 0.15, [W2R(BOOK[0] + 4, BOOK[1] - 10), W2R(BOOK[0] - 24, BOOK[1] - 6)]), 0.01],
    [27.6, seat(0.45, 0.7, [W2R(CH + 30, FL - 150), W2R(CH + 20, FL - 146)]), 0.35],   // mão na cara
  ];
  const pensaState = (t) => seq(pensaKeys, t);

  // ---------- cenário ----------
  function drawRoom(c, k, t, P) {
    const h = P.h;
    const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#17100c'); g.addColorStop(0.7, '#2c2018'); g.addColorStop(1, '#201710');
    c.fillStyle = g; c.fillRect(-300, -100, W + 600, h + 200);
    c.strokeStyle = 'rgba(0,0,0,0.22)'; c.lineWidth = 3; for (let x = -280; x < W + 300; x += 96) { c.beginPath(); c.moveTo(x, -100); c.lineTo(x, FL); c.stroke(); }
    // janela de noite
    c.fillStyle = '#4a3524'; c.fillRect(380, 40, 150, 110); c.strokeStyle = OUT; c.lineWidth = 5; c.strokeRect(380, 40, 150, 110);
    c.fillStyle = '#151a2c'; c.fillRect(386, 46, 138, 98); c.fillStyle = '#e8e4d0'; c.beginPath(); c.arc(495, 72, 11, 0, Math.PI * 2); c.fill();
    // cama
    c.fillStyle = '#5a3c26'; c.strokeStyle = OUT; c.lineWidth = 4;
    c.fillRect(110, BMT - 80, 20, FL - BMT + 80); c.strokeRect(110, BMT - 80, 20, FL - BMT + 80);
    c.fillRect(128, BMT + 16, 250, FL - BMT - 30); c.strokeRect(128, BMT + 16, 250, FL - BMT - 30);
    c.fillStyle = '#d9cdb8'; c.beginPath(); c.roundRect(128, BMT - 2, 250, 20, 8); c.fill(); c.stroke();
    c.fillStyle = '#efe6d6'; c.beginPath(); c.roundRect(134, BMT - 22, 74, 24, 10); c.fill(); c.stroke();
    // luminária e luz (apaga quando o faz dorme)
    const lampOn = k === 'faz' ? 1 - smooth(seg(t, 19.3, 19.5)) : 1;
    if (lampOn > 0) { c.save(); c.globalCompositeOperation = 'lighter'; c.filter = 'blur(16px)'; c.fillStyle = rgb(PAL.luz, 1, 0.2 * lampOn); c.beginPath(); c.moveTo(770, DT - 70); c.lineTo(800, DT - 70); c.lineTo(820, DT); c.lineTo(560, DT); c.closePath(); c.fill(); c.restore(); }
    // mesa, gaveta, cadeira
    c.fillStyle = '#6b4a30'; c.strokeStyle = OUT; c.lineWidth = 4;
    c.fillRect(DESK0, DT, DESK1 - DESK0, 14); c.strokeRect(DESK0, DT, DESK1 - DESK0, 14);
    const drawer = k === 'faz' ? 22 * Math.sin(Math.PI * seg(t, 2.95, 3.5)) : 0;
    c.fillRect(660 + drawer, DT + 14, 120, 34); c.strokeRect(660 + drawer, DT + 14, 120, 34); c.fillStyle = '#c9a26a'; c.fillRect(712 + drawer, DT + 28, 18, 5);
    c.fillStyle = '#6b4a30'; for (const lx of [DESK0 + 6, DESK1 - 18]) { c.fillRect(lx, DT + 14, 12, FL - DT - 14); c.strokeRect(lx, DT + 14, 12, FL - DT - 14); }
    c.fillStyle = '#5a3c26'; c.fillRect(CH - 40, FL - 64, 70, 12); c.strokeRect(CH - 40, FL - 64, 70, 12);
    c.fillRect(CH - 44, FL - 150, 12, 150); c.strokeRect(CH - 44, FL - 150, 12, 150); c.fillRect(CH + 18, FL - 52, 10, 52); c.strokeRect(CH + 18, FL - 52, 10, 52);
    // luminária
    c.strokeStyle = OUT; c.lineWidth = 6; c.beginPath(); c.moveTo(800, DT); c.lineTo(800, DT - 60); c.lineTo(776, DT - 76); c.stroke();
    c.fillStyle = lampOn > 0.5 ? '#ffe2a8' : '#5a5a62'; c.beginPath(); c.moveTo(760, DT - 70); c.lineTo(790, DT - 86); c.lineTo(796, DT - 66); c.closePath(); c.fill(); c.lineWidth = 3; c.stroke();
    c.fillStyle = '#241911'; c.fillRect(-300, FL, W + 600, h); c.strokeStyle = 'rgba(0,0,0,0.5)'; c.lineWidth = 4; c.beginPath(); c.moveTo(-300, FL); c.lineTo(W + 300, FL); c.stroke();
  }
  function drawClass(c, k, t, P) {
    const h = P.h;
    c.fillStyle = '#2a1f18'; c.fillRect(-300, -100, W + 600, h + 200);
    c.fillStyle = '#23382c'; c.strokeStyle = '#6b4a30'; c.lineWidth = 10; c.fillRect(230, 30, 520, 140); c.strokeRect(230, 30, 520, 140);
    c.fillStyle = 'rgba(240,240,230,0.85)'; c.font = '800 40px Montserrat, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('PROVA HOJE', 490, 100);
    c.save(); c.globalCompositeOperation = 'lighter'; c.filter = 'blur(18px)'; c.fillStyle = rgb(PAL.luz, 1, 0.12); c.fillRect(160, 0, 700, FL); c.restore();
    c.fillStyle = '#6b4a30'; c.strokeStyle = OUT; c.lineWidth = 4; c.fillRect(DESK0, DT, DESK1 - DESK0, 14); c.strokeRect(DESK0, DT, DESK1 - DESK0, 14);
    for (const lx of [DESK0 + 6, DESK1 - 18]) { c.fillRect(lx, DT + 14, 12, FL - DT - 14); c.strokeRect(lx, DT + 14, 12, FL - DT - 14); }
    c.fillStyle = '#5a3c26'; c.fillRect(CH - 40, FL - 64, 70, 12); c.strokeRect(CH - 40, FL - 64, 70, 12); c.fillRect(CH - 44, FL - 150, 12, 150); c.strokeRect(CH - 44, FL - 150, 12, 150);
    c.fillStyle = '#241911'; c.fillRect(-300, FL, W + 600, h); c.strokeStyle = 'rgba(0,0,0,0.5)'; c.lineWidth = 4; c.beginPath(); c.moveTo(-300, FL); c.lineTo(W + 300, FL); c.stroke();
  }
  function drawBack(c, k, t, P) { if (t >= MORNING) drawClass(c, k, t, P); else drawRoom(c, k, t, P); }

  // livro aberto deitado na mesa (um pouco inclinado para o público ver)
  function openBook(c, x, y, t, hl, flipT) {
    c.save(); c.translate(x, y);
    c.fillStyle = '#2f6fb3'; c.strokeStyle = OUT; c.lineWidth = 3; c.beginPath(); c.moveTo(-34, 4); c.lineTo(0, 8); c.lineTo(34, 4); c.lineTo(30, -12); c.lineTo(0, -8); c.lineTo(-30, -12); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = '#f4ead8'; c.beginPath(); c.moveTo(-30, 1); c.lineTo(0, 5); c.lineTo(30, 1); c.lineTo(27, -10); c.lineTo(0, -6); c.lineTo(-27, -10); c.closePath(); c.fill();
    c.strokeStyle = 'rgba(0,0,0,0.3)'; c.lineWidth = 1.5; for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(-24, -7 + i * 3); c.lineTo(-4, -4 + i * 3); c.moveTo(4, -4 + i * 3); c.lineTo(24, -7 + i * 3); c.stroke(); }
    if (hl > 0) { c.strokeStyle = 'rgba(255,230,60,0.75)'; c.lineWidth = 3; c.beginPath(); c.moveTo(4, -4); c.lineTo(4 + 20 * hl, -7 * hl - 4 * (1 - hl)); c.stroke(); }
    if (flipT !== null && flipT >= 0 && flipT < 0.4) { const ang = Math.PI * easeInOut(flipT / 0.4); c.fillStyle = '#fffaf0'; c.beginPath(); c.moveTo(0, 5); c.lineTo(28 * Math.cos(ang), 1 - 20 * Math.sin(ang)); c.lineTo(28 * Math.cos(ang) - 2, -10 - 20 * Math.sin(ang)); c.lineTo(0, -6); c.closePath(); c.fill(); c.strokeStyle = 'rgba(0,0,0,0.35)'; c.stroke(); }
    c.restore();
  }
  const PAGES = { faz: [4.1, 10.95, 12.85, 17.35], pensa: [20.4] };
  function drawFront(c, k, t, P, drawn) {
    if (t < MORNING) {
      // livro
      const flips = PAGES[k].map((p) => t - p).filter((d) => d >= 0 && d < 0.4);
      const showBook = k === 'faz' ? t > 3.6 && t < 18.3 : t > 20.3;
      if (showBook) openBook(c, BOOK[0], BOOK[1], t, k === 'faz' ? smooth(seg(t, 11.3, 12.6)) : 0, flips.length ? flips[0] : null);
      else if (!(k === 'faz' && t > 18.3)) { c.fillStyle = '#2f6fb3'; c.strokeStyle = OUT; c.lineWidth = 3; c.fillRect(BOOK[0] - 26, DT - 14, 52, 12); c.strokeRect(BOOK[0] - 26, DT - 14, 52, 12); }
      // lápis na mão quando escreve
      const writing = k === 'faz' ? (t >= 4.1 && t < 6.6) || (t >= 11.3 && t < 12.8) || (t >= 13.1 && t < 14.0) || (t >= 17.3 && t < 17.9) : (t >= 20.8 && t < 22.9) || (t >= 23.5 && t < 25.0);
      if (writing) { const hp = drawn.main.hand; c.strokeStyle = k === 'faz' && t > 11.3 && t < 12.8 ? '#ffe23c' : '#e8c547'; c.lineWidth = 4; c.beginPath(); c.moveTo(hp[0] - 2, hp[1] + 2); c.lineTo(hp[0] + 10, hp[1] - 14); c.stroke(); }
      // canetas que o pensa demais arruma
      if (k === 'pensa') {
        const cols = ['#e5483b', '#2f9bff', '#4fbf6a', '#e8c547', '#b85cff'];
        for (let i = 0; i < 5; i++) { const ord = t > 7.3 && t < 9.2 ? (i + Math.floor(t * 2.6)) % 5 : i; c.strokeStyle = cols[ord]; c.lineWidth = 4; const x = BOOK[0] + 44 + i * 9; c.beginPath(); c.moveTo(x, DT - 2); c.lineTo(x + 3, DT - 22); c.stroke(); }
        // notebook com vídeo
        if (t > 9.0 && t < 19.9) { c.fillStyle = '#26262c'; c.strokeStyle = OUT; c.lineWidth = 3; c.beginPath(); c.moveTo(670, DT); c.lineTo(760, DT); c.lineTo(752, DT - 4); c.lineTo(678, DT - 4); c.closePath(); c.fill(); c.stroke();
          c.beginPath(); c.roundRect(688, DT - 66, 74, 62, 4); c.fill(); c.stroke();
          const vid = t > 9.6 && t < 16.4; c.fillStyle = vid ? ['#e5483b', '#2f9bff', '#e8c547', '#4fbf6a', '#b85cff', '#f2a23a'][Math.floor(t * 0.9) % 6] : '#1d2230'; c.fillRect(693, DT - 61, 64, 52);
          if (vid) { c.fillStyle = 'rgba(255,255,255,0.9)'; c.beginPath(); c.moveTo(718, DT - 44); c.lineTo(734, DT - 35); c.lineTo(718, DT - 26); c.closePath(); c.fill(); c.fillStyle = 'rgba(255,255,255,0.8)'; c.fillRect(696, DT - 14, 58 * ((t * 0.9) % 1), 3); }
          c.save(); c.globalCompositeOperation = 'lighter'; c.filter = 'blur(14px)'; c.fillStyle = 'rgba(120,170,255,0.25)'; c.beginPath(); c.arc(700, DT - 40, 50, 0, Math.PI * 2); c.fill(); c.restore(); }
        // celular na mão
        if (t > 16.35 && t < 19.9) { const hf = drawn.main.hand; c.save(); c.translate(hf[0], hf[1] - 6); c.save(); c.globalCompositeOperation = 'lighter'; c.filter = 'blur(10px)'; c.fillStyle = 'rgba(120,170,255,0.4)'; c.beginPath(); c.arc(4, -6, 20, 0, Math.PI * 2); c.fill(); c.restore();
          c.fillStyle = '#111'; c.strokeStyle = OUT; c.lineWidth = 3; c.beginPath(); c.roundRect(-7, -14, 14, 24, 3); c.fill(); c.stroke(); c.fillStyle = '#6fa8ff'; c.fillRect(-5, -11, 10, 18); c.restore(); }
        // café
        if (t > 20.0) { const cp = t >= 22.95 && t < 23.45 ? add(drawn.main.hand, [4, -4]) : [790, DT - 12]; c.fillStyle = '#e8dcc6'; c.strokeStyle = OUT; c.lineWidth = 3; c.beginPath(); c.roundRect(cp[0] - 9, cp[1] - 11, 18, 22, 3); c.fill(); c.stroke(); }
      }
      // Z z z
      const sleeping = (k === 'faz' && t > 19.6) || (k === 'pensa' && t > 25.1);
      if (sleeping) { const hd = drawn.main.head; for (let i = 0; i < 3; i++) { const a = (t * 0.55 + i / 3) % 1; c.save(); c.globalAlpha = Math.sin(Math.PI * a) * 0.9; c.fillStyle = '#e8dcc6'; c.font = `800 ${16 + 12 * a}px Montserrat, sans-serif`; c.textAlign = 'center'; c.fillText('Z', hd[0] + 20 + a * 50, hd[1] - 20 - a * 70); c.restore(); } }
      // gotas de suor e olheira do pensa na madrugada
      if (k === 'pensa' && t > 19.9 && t < 24.6) { const hd = drawn.main.head; for (let i = 0; i < 3; i++) { const a = ((t * 1.4 + i / 3) % 1); c.fillStyle = `rgba(200,230,255,${0.9 * (1 - a)})`; c.beginPath(); c.arc(hd[0] - 18 - i * 7, hd[1] - 10 + a * 40, 4.5, 0, Math.PI * 2); c.fill(); } }
    } else {
      // folha da prova na mesa
      c.fillStyle = '#f4ead8'; c.strokeStyle = OUT; c.lineWidth = 3; c.beginPath(); c.moveTo(600, DT - 2); c.lineTo(660, DT - 2); c.lineTo(656, DT - 10); c.lineTo(604, DT - 10); c.closePath(); c.fill(); c.stroke();
    }
  }

  // ---------- placas ----------
  function pill(c, x, y, txt, col, ok, sc = 1, big = false) {
    c.save(); c.translate(x, y); c.scale(sc, sc);
    c.font = `700 ${big ? 26 : 18}px "Space Mono", monospace`; const tw = c.measureText(txt).width; const ic = ok === null ? 0 : 24, hh = big ? 40 : 30;
    c.beginPath(); c.roundRect(0, -hh / 2, tw + ic + 24, hh, hh / 2); c.fillStyle = 'rgba(15,10,7,0.88)'; c.fill(); c.lineWidth = 3; c.strokeStyle = rgb(col); c.stroke();
    if (ok === true) { c.strokeStyle = rgb(PAL.faz); c.lineWidth = 4; c.beginPath(); c.moveTo(12, 0); c.lineTo(17, 6); c.lineTo(27, -6); c.stroke(); }
    if (ok === false) { c.strokeStyle = rgb(PAL.dor); c.lineWidth = 4; c.beginPath(); c.moveTo(13, -6); c.lineTo(25, 6); c.moveTo(25, -6); c.lineTo(13, 6); c.stroke(); }
    c.fillStyle = rgb(col); c.textAlign = 'left'; c.textBaseline = 'middle'; c.fillText(txt, 12 + ic, 1); c.restore();
  }
  // folha com a nota, grande na tela
  function gradeCard(c, x, y, grade, good, t0, t) {
    if (t < t0) return; const s = backE(seg(t, t0, t0 + 0.4));
    c.save(); c.translate(x, y); c.rotate(-0.06); c.scale(s, s);
    c.fillStyle = '#f7f0e2'; c.strokeStyle = OUT; c.lineWidth = 4; c.beginPath(); c.roundRect(-110, -70, 220, 140, 8); c.fill(); c.stroke();
    c.fillStyle = '#3a3a40'; c.font = '700 16px "Space Mono", monospace'; c.textAlign = 'left'; c.textBaseline = 'middle'; c.fillText('PROVA', -94, -48);
    c.strokeStyle = 'rgba(0,0,0,0.2)'; c.lineWidth = 2; for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(-94, -24 + i * 16); c.lineTo(-10, -24 + i * 16); c.stroke(); }
    const col = good ? '#2f9b4a' : '#d03a2e'; c.strokeStyle = col; c.lineWidth = 5; c.beginPath(); c.arc(48, 6, 48, 0, Math.PI * 2); c.stroke();
    c.fillStyle = col; c.font = '900 44px Montserrat, sans-serif'; c.textAlign = 'center'; c.fillText(grade, 48, 8);
    c.restore();
  }
  function drawOverlay(c, k, t, P, drawn, toS) {
    if (t > GT) return;
    { const late = k === 'pensa' && t >= 19.8 && t < MORNING; c.save(); c.translate(870, 40); const pop = late ? 1 + 0.3 * Math.exp(-(t - 19.8) * 8) : 1; c.scale(pop, pop);
      c.fillStyle = 'rgba(12,8,6,0.9)'; c.strokeStyle = late ? rgb(PAL.dor) : 'rgba(255,214,160,0.6)'; c.lineWidth = 3; c.beginPath(); c.roundRect(-74, -24, 148, 48, 10); c.fill(); c.stroke();
      c.fillStyle = late ? rgb(PAL.dor) : rgb([255, 120, 90]); c.font = '800 34px "Space Mono", monospace'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(t < 2.8 ? '18:59' : hhmm(t), 0, 2); c.restore(); }
    if (k === 'faz') {
      const items = [[3.4, 'CELULAR NA GAVETA'], [11.0, 'CAPÍTULO 1'], [13.9, 'CAPÍTULO 2'], [17.85, 'CAPÍTULO 3'], [MORNING + 0.1, '8H DE SONO']];
      items.forEach(([t0, txt], i) => { if (t >= t0) pill(c, 18, 74 + i * 36, txt, PAL.faz, true, backE(seg(t, t0, t0 + 0.3))); });
      gradeCard(c, W / C_UI - 290, 205, '9,5', true, 26.0, t);
    } else {
      const vids = t < 9.7 ? 0 : t < 14.0 ? 1 : Math.min(6, 1 + Math.floor((t - 14.0) / 0.4));
      let y = 74;
      if (vids > 0) { pill(c, 18, y, `"SÓ UM VÍDEO": ${vids}`, PAL.pensa, false); y += 36; }
      if (t > 16.4) { pill(c, 18, y, `PÁGINAS: ${t < 20.4 ? 0 : Math.min(12, Math.floor((t - 20.4) * 2.6))}`, PAL.dor, false); y += 36; }
      if (t >= MORNING) pill(c, 18, y, 'SONO: 3H', PAL.dor, false, backE(seg(t, MORNING + 0.1, MORNING + 0.4)));
      gradeCard(c, W / C_UI - 290, 205, '4,0', false, 27.55, t);
    }
    // corte para a manhã
    const a = t - MORNING; if (a >= 0 && a < 0.25) { c.fillStyle = `rgba(255,245,230,${0.7 * (1 - a / 0.25)})`; c.fillRect(0, 0, W, P.h); }
  }

  // ---------- índice de ansiedade ----------
  const painFaz = (t) => { let p = 22 - 12 * smooth(seg(t, 3, 18)) + 2 * Math.sin(t * 1.9); p += 10 * smooth(seg(t, MORNING - 0.1, MORNING + 0.2)) * (1 - smooth(seg(t, 26.0, 26.6))); return p; };
  const painPensa = (t) => { let p = 22 + 22 * smooth(seg(t, 6.8, 19.5)) + 3 * Math.sin(t * 2.4); p += spike(t, 19.85, 45, 0.5); if (t > 19.85 && t < MORNING) p = Math.max(p, 70 + 6 * Math.sin(t * 5)); p += spike(t, 27.55, 30, 1); if (t > MORNING) p = Math.max(p, 72); return Math.min(100, p); };

  const SCENE = {
    metricLabel: 'ÍNDICE DE ANSIEDADE', totalLabel: 'ANSIEDADE TOTAL', reportT: GT, noReport: true, dimOf, bubbleMaxX: 780,
    secsText: (n) => `${n}`,
    state: { faz: fazState, pensa: pensaState },
    drawBack, drawFront, drawOverlay,
    cam: (k, t) => {
      const keys = k === 'faz' ? [[0, 540, 200, 1], [2.8, 620, 190, 1.45], [6.8, 600, 200, 1.1], [10.8, 610, 185, 1.55], [14.0, 600, 200, 1.1], [17.2, 560, 200, 1.25], [18.5, 420, 210, 1.15], [MORNING, 600, 200, 1.1, 0.01]]
        : [[0, 540, 200, 1], [6.8, 640, 185, 1.45], [9.2, 690, 175, 1.55], [11.0, 620, 200, 1.1], [14.0, 690, 175, 1.6], [16.3, 610, 180, 1.5], [17.4, 620, 200, 1.1], [19.8, 615, 185, 1.55], [MORNING, 600, 200, 1.1, 0.01]];
      let v = { x: keys[0][1], y: keys[0][2], z: keys[0][3] };
      for (let i = 1; i < keys.length; i++) { const [kt, x, y, z, d] = keys[i]; if (t < kt) break; const u = easeInOut(seg(t, kt, kt + (d || 0.6))); v = { x: lerp(v.x, x, u), y: lerp(v.y, y, u), z: lerp(v.z, z, u) }; }
      return v;
    },
    pain: { faz: painFaz, pensa: painPensa },
    bubbles: {
      faz: [
        { t0: 2.85, t1: 3.5, text: 'FOCO.', col: PAL.faz },
        { t0: 18.0, t1: 18.6, text: 'FEITO.', col: PAL.faz },
        { t0: 26.3, t1: 27.3, text: 'ISSO!', col: PAL.faz },
      ],
      pensa: [
        { t0: 7.0, t1: 8.5, text: 'PRIMEIRO, A MESA...' },
        { t0: 9.4, t1: 10.7, text: 'SÓ UM VÍDEO...' },
        { t0: 16.4, t1: 17.1, text: 'NOTIFICAÇÃO!' },
        { t0: 19.95, t1: 21.2, text: 'A PROVA É AMANHÃ!!', col: PAL.dor },
        { t0: 23.9, t1: 24.8, text: 'SÓ 5 MINUTINHOS...' },
      ],
    },
    shake: (k, t) => (k === 'pensa' ? 7 * (t >= 19.85 ? Math.exp(-(t - 19.85) * 7) : 0) : 0),
    energy: (k, t) => (k === 'pensa' && t > 19.85 && t < 24.4 ? 2.0 : 1),
    caps: [
      { s: -1, e: 2.8, lines: [[-1, [['PROVA AMANHÃ.']]], [0.3, [['DOIS JEITOS DE '], ['ESTUDAR.', 'dor']]]] },
      { s: 2.9, e: 6.8, lines: [[2.9, [['QUEM '], ['FAZ', 'faz']]], [3.25, [['GUARDA O CELULAR.']]]] },
      { s: 6.85, e: 10.8, lines: [[6.85, [['QUEM '], ['PENSA DEMAIS', 'pensa']]], [7.25, [['ARRUMA A MESA ANTES.']]]] },
      { s: 10.85, e: 14.0, lines: [[10.85, [['UM CAPÍTULO']]], [11.2, [['DE CADA '], ['VEZ.', 'faz']]]] },
      { s: 14.05, e: 17.2, lines: [[14.05, [['"SÓ UM VÍDEO"']]], [14.45, [['VIRARAM '], ['SEIS.', 'dor']]]] },
      { s: 17.25, e: 19.8, lines: [[17.25, [['23:00: QUEM FAZ']]], [17.6, [['VAI '], ['DORMIR.', 'faz']]]] },
      { s: 19.85, e: 22.8, lines: [[19.85, [['01:00: QUEM PENSA DEMAIS']]], [20.25, [['LEMBROU DA '], ['PROVA.', 'dor']]]] },
      { s: 22.85, e: MORNING, lines: [[22.85, [['CAFÉ, DESESPERO']]], [23.2, [['E '], ['SONO.', 'dor']]]] },
      { s: MORNING + 0.05, e: GT, lines: [[MORNING + 0.05, [['08:00.']]], [MORNING + 0.4, [['O RESULTADO.']]]] },
      { s: GT + 0.1, e: 99, center: true, lines: [[GT + 0.3, [['QUEM FAZ: '], ['NOTA 9,5.', 'faz']]], [GT + 0.9, [['PENSA DEMAIS: '], ['NOTA 4.', 'dor']]]] },
    ],
    sched: {
      noBips: true, noPops: true, music: 0.42, focusKeys: FOCUS,
      fx: [
        // FAZ (2,8–6,8)
        [2.95, 'foley/porta', 0.45, 0.35, 1.3], [3.6, 'foley/cadeira', 0.45, 0.35], [4.1, 'foley/pagina_1', 0.5, 0.35], [4.5, 'scribble', 0.4, 0.35, 2.0],
        // PENSA (6,8–10,8)
        [6.95, 'foley/cadeira', 0.45, -0.35], ...[7.5, 7.9, 8.3, 8.7].map((x) => [x, 'foley/talher_3', 0.25, -0.35, 1.3]), [9.3, 'foley/cloth_05', 0.3, -0.35], [9.75, 'typing', 0.3, -0.35, 0.7],
        // FAZ (10,8–14,0)
        [10.95, 'foley/pagina_2', 0.5, 0.35], [11.35, 'scribble', 0.35, 0.35, 1.3], [12.85, 'foley/pagina_1', 0.5, 0.35], [13.15, 'scribble', 0.4, 0.35, 0.75],
        // PENSA (14,0–17,2)
        ...[14.3, 14.7, 15.1, 15.5, 15.9].map((x) => [x, 'foley/toque_tela', 0.45, -0.35]), [16.3, 'ding', 0.25, -0.35], ...Array.from({ length: 5 }, (_, i) => [16.65 + i * 0.1, 'scroll', 0.1, -0.35]),
        // FAZ (17,2–19,8)
        [17.35, 'foley/pagina_2', 0.5, 0.35], [17.95, 'exhale', 0.22, 0.35], [18.4, 'foley/cloth_04', 0.4, 0.35], [19.3, 'foley/cloth_05', 0.35, 0.35],
        // PENSA (19,8–25,8)
        [19.9, 'thud', 0.2, -0.35], [20.0, 'voz_pensa/dor_02', 0.35, -0.35, 1.08], [20.45, 'foley/pagina_1', 0.5, -0.35], [20.85, 'scribble', 0.45, -0.35, 2.0],
        [23.0, 'foley/gole_cafe', 0.55, -0.35], [23.55, 'scribble', 0.4, -0.35, 0.8], [24.45, 'exhale', 0.28, -0.35], [25.2, 'foley/cloth_05', 0.3, -0.35],
        // manhã
        [26.0, 'foley/pagina_2', 0.45, 0.35], [26.5, 'exhale', 0.2, 0.35],
        [27.55, 'foley/pagina_1', 0.45, -0.35], [27.9, 'voz_pensa/dor_14', 0.35, -0.35],
      ],
    },
  };
