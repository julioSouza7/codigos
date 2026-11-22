
  // ================= ROTEIRO: "O DENTE" (32 s) — índice de dor =================
  const FL = 300, GT = 27.0;
  const CHX = 600, TB0 = 640, TB1 = 780, TT = FL - 82;     // cadeira e mesa
  const SOFA = 905, BLX = 250, BMT = FL - 62;
  const DX = 470, DAY = FL - 66;                           // cadeira do dentista
  const HY = hipOn(FL, STAND_L);
  const DAYS = [[0, 1], [11.0, 3], [17.0, 7]];
  const dayOf = (t) => { let d = 1; for (const [a, n] of DAYS) if (t >= a) d = n; return d; };
  const FOCUS = [[0, null], [2.8, 'faz'], [7.0, 'pensa'], [11.0, 'faz'], [13.0, 'pensa'], [17.0, 'faz'], [19.0, 'pensa'], [GT, null]];
  const dimOf = focusTrack(FOCUS);
  const DENT_F = [4.8, 7.0], DENT_P = [22.0, GT + 5];
  const atDentist = (k, t) => (k === 'faz' ? t >= DENT_F[0] && t < DENT_F[1] : t >= DENT_P[0]);
  const DRILL_F = [5.1, 6.4], DRILL_P = [23.8, 26.0];

  // ---------- poses ----------
  const SEAT_L = { fT: 1.45, fS: 0.02, bT: 1.38, bS: -0.06 };
  const SHY = hipOn(FL, SEAT_L);
  const seat = (lean, head, hands, extra) => () => Object.assign({ x: CHX, hipY: SHY, ay: FL, lean, head, legs: SEAT_L, hands, prefF: 'down', prefB: 'down', grounded: false, face: 1, noWalk: true, gesture: false }, extra || {});
  const W2R = (x, y) => toRig({ x: CHX, ay: FL, face: 1 }, [x, y]);
  const MOUTH = [CHX + 26, FL - 140], CHEEK = [CHX + 16, FL - 146], APPLE_T = [CHX + 64, TT - 10];
  const eatApple = (t0, per = 1.0) => (t) => { const u = 0.5 - 0.5 * Math.cos(((t - t0) / per) * Math.PI * 2); return seat(lerp(0.3, 0.1, u), lerp(0.25, -0.05, u), [P2(W2R(...APPLE_T), W2R(...MOUTH), u), W2R(TB0 + 20, TT - 4)])(); };
  const holdCheek = () => seat(0.25, 0.3, [W2R(...CHEEK), W2R(TB0 + 20, TT - 4)]);
  const callPhone = () => seat(0.05, -0.05, [W2R(CHX + 6, FL - 152), W2R(TB0 + 20, TT - 4)]);
  const chewSide = () => (t) => { const st = seat(0.1, 0.1 + 0.18 * Math.sin(t * 9), [W2R(...CHEEK), W2R(TB0 + 20, TT - 4)])(); return st; };
  const SEAT_SOFA = hipOn(FL, SEAT_L);
  const sofaIce = () => (t) => ({ x: SOFA, hipY: SEAT_SOFA, ay: FL, lean: 0.15, head: 0.35, legs: SEAT_L, hands: [[SOFA + 18, SEAT_SOFA - 140], [SOFA + 34, SEAT_SOFA - 60]], prefF: 'down', prefB: 'down', grounded: false, face: -1, noWalk: true, gesture: false });
  const sofaPill = () => (t) => ({ x: SOFA, hipY: SEAT_SOFA, ay: FL, lean: 0.0, head: -0.25, legs: SEAT_L, hands: [[SOFA + 26, SEAT_SOFA - 136], [SOFA + 34, SEAT_SOFA - 60]], prefF: 'down', prefB: 'down', grounded: false, face: -1, noWalk: true, gesture: false });
  const LIE_L = { fT: 1.5, fS: 1.56, bT: 1.44, bS: 1.54 };
  const bedCheek = () => (t) => { const hy = BMT - 16; return { x: BLX, hipY: hy, ay: BMT, lean: -1.5 + 0.06 * Math.sin(t * 1.3), head: -0.3, legs: LIE_L, hands: [[BLX - 118, hy - 52], [BLX - 66, hy - 26]], prefF: 'down', prefB: 'down', grounded: false, face: 1, gesture: false, noWalk: true }; };
  // na cadeira do dentista (reclinado)
  const REC_L = { fT: 1.35, fS: 1.05, bT: 1.3, bS: 1.0 };
  const recline = () => (t) => ({ x: DX, hipY: DAY - 16, ay: DAY, lean: -1.12, head: -0.25, legs: REC_L, hands: [[DX - 30, DAY - 56], [DX - 50, DAY - 50]], prefF: 'down', prefB: 'down', grounded: false, face: 1, gesture: false, noWalk: true });
  // boca do paciente reclinado (mundo)
  const MOUTH_D = (() => { const st = recline()(0); const R = rigP(st); const hw = [st.x + (R.head[0] - st.x) * SC, st.ay + (R.head[1] - st.ay) * SC]; return [hw[0] + 8, hw[1] + 10]; })();
  const HEAD_D = [MOUTH_D[0] - 8, MOUTH_D[1] - 10];
  // dentista (azul)
  const DENTX = HEAD_D[0] - 70;
  const dentist = (k) => (t) => {
    if (!atDentist(k, t)) return pose(-600, FL, STAND_L, 0, 0, handsDown(-600, HY), { noWalk: true });
    const drilling = k === 'faz' ? t >= DRILL_F[0] && t < DRILL_F[1] : t >= DRILL_P[0] && t < DRILL_P[1];
    const st = pose(DENTX, FL, STAND_L, 0.3, 0.35, handsDown(DENTX, HY), { gesture: true, noWalk: true });
    if (drilling || t > (k === 'faz' ? DENT_F[0] + 0.2 : DENT_P[0] + 0.2)) st.hands = [toRig(st, [MOUTH_D[0] - 14 + (drilling ? 2 * Math.sin(t * 50) : 0), MOUTH_D[1] - 16]), toRig(st, [MOUTH_D[0] - 30, MOUTH_D[1] - 6])];
    return st;
  };

  // ---------- 2 · FAZ ----------
  const fazKeys = [
    [0, eatApple(0)],
    [2.8, eatApple(2.8, 0.9), 0.2], [3.25, holdCheek(), 0.15],
    [3.9, callPhone(), 0.3],
    [DENT_F[0], recline(), 0.01],
    [DENT_F[1], eatApple(7.0), 0.01],
    [11.0, eatApple(11.0, 0.8), 0.3],
    [17.0, eatApple(17.0, 0.8), 0.3],
    [18.6, seat(-0.1, -0.15, [[CHX + 40, SHY - 250], [CHX - 10, SHY - 20]], { prefF: 'up' }), 0.3],
    [19.3, eatApple(19.3, 1.4), 0.4],
  ];
  const fazState = (t) => seq(fazKeys, t);

  // ---------- 1 · PENSA DEMAIS ----------
  const pensaKeys = [
    [0, eatApple(0.5)],
    [7.0, eatApple(7.0, 0.9), 0.2], [7.45, holdCheek(), 0.15],
    [8.0, seat(0.05, 0.2, [W2R(CHX + 40, FL - 120), W2R(TB0 + 20, TT - 4)]), 0.4],
    [9.5, chewSide(), 0.3],
    [11.0, holdCheek(), 0.4],
    [13.0, sofaIce(), 0.01],
    [14.6, sofaPill(), 0.25], [15.3, sofaIce(), 0.3],
    [17.0, sofaIce(), 0.3],
    [19.0, bedCheek(), 0.01],
    [DENT_P[0], recline(), 0.01],
  ];
  const pensaState = (t) => seq(pensaKeys, t);

  // ---------- cenários ----------
  function drawHome(c, k, t, P) {
    const h = P.h, night = k === 'pensa' && t >= 19 && t < DENT_P[0];
    const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, night ? '#0f0b09' : '#1b130e'); g.addColorStop(0.7, night ? '#1d1510' : '#33251b'); g.addColorStop(1, '#201710');
    c.fillStyle = g; c.fillRect(-300, -100, W + 600, h + 200);
    c.strokeStyle = 'rgba(0,0,0,0.22)'; c.lineWidth = 3; for (let x = -280; x < W + 300; x += 96) { c.beginPath(); c.moveTo(x, -100); c.lineTo(x, FL); c.stroke(); }
    c.fillStyle = '#4a3524'; c.fillRect(420, 40, 150, 110); c.strokeStyle = OUT; c.lineWidth = 5; c.strokeRect(420, 40, 150, 110);
    c.fillStyle = night ? '#121628' : '#8fa6c4'; c.fillRect(426, 46, 138, 98);
    if (!night) { c.save(); c.globalCompositeOperation = 'lighter'; c.filter = 'blur(18px)'; c.fillStyle = rgb(PAL.luz, 1, 0.14); c.beginPath(); c.moveTo(426, 60); c.lineTo(564, 60); c.lineTo(760, FL + 30); c.lineTo(430, FL + 30); c.closePath(); c.fill(); c.restore(); }
    // cama
    c.fillStyle = '#5a3c26'; c.strokeStyle = OUT; c.lineWidth = 4;
    c.fillRect(100, BMT - 80, 20, FL - BMT + 80); c.strokeRect(100, BMT - 80, 20, FL - BMT + 80);
    c.fillRect(118, BMT + 16, 250, FL - BMT - 30); c.strokeRect(118, BMT + 16, 250, FL - BMT - 30);
    c.fillStyle = '#d9cdb8'; c.beginPath(); c.roundRect(118, BMT - 2, 250, 20, 8); c.fill(); c.stroke();
    c.fillStyle = '#efe6d6'; c.beginPath(); c.roundRect(124, BMT - 22, 74, 24, 10); c.fill(); c.stroke();
    // mesa e cadeira
    c.fillStyle = '#6b4a30'; c.fillRect(TB0, TT, TB1 - TB0, 14); c.strokeRect(TB0, TT, TB1 - TB0, 14);
    for (const lx of [TB0 + 8, TB1 - 20]) { c.fillRect(lx, TT + 14, 12, FL - TT - 14); c.strokeRect(lx, TT + 14, 12, FL - TT - 14); }
    c.fillStyle = '#5a3c26'; c.fillRect(CHX - 40, FL - 64, 70, 12); c.strokeRect(CHX - 40, FL - 64, 70, 12); c.fillRect(CHX - 44, FL - 150, 12, 150); c.strokeRect(CHX - 44, FL - 150, 12, 150); c.fillRect(CHX + 18, FL - 52, 10, 52); c.strokeRect(CHX + 18, FL - 52, 10, 52);
    // sofá
    c.fillStyle = '#7a3f34'; c.beginPath(); c.roundRect(830, FL - 130, 170, 70, 14); c.fill(); c.stroke(); c.beginPath(); c.roundRect(820, FL - 68, 190, 40, 10); c.fill(); c.stroke();
    c.fillRect(830, FL - 28, 14, 28); c.strokeRect(830, FL - 28, 14, 28); c.fillRect(986, FL - 28, 14, 28); c.strokeRect(986, FL - 28, 14, 28);
    c.fillStyle = '#241911'; c.fillRect(-300, FL, W + 600, h); c.strokeStyle = 'rgba(0,0,0,0.5)'; c.lineWidth = 4; c.beginPath(); c.moveTo(-300, FL); c.lineTo(W + 300, FL); c.stroke();
  }
  function drawClinic(c, k, t, P) {
    const h = P.h;
    const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#22201c'); g.addColorStop(0.7, '#3a3428'); g.addColorStop(1, '#26211b');
    c.fillStyle = g; c.fillRect(-300, -100, W + 600, h + 200);
    c.strokeStyle = 'rgba(255,255,255,0.05)'; c.lineWidth = 2; for (let y = 40; y < FL; y += 40) { c.beginPath(); c.moveTo(-300, y); c.lineTo(W + 300, y); c.stroke(); }
    // quadro de dente na parede
    c.fillStyle = '#e8dcc6'; c.strokeStyle = OUT; c.lineWidth = 4; c.beginPath(); c.roundRect(170, 50, 110, 90, 8); c.fill(); c.stroke();
    c.fillStyle = '#fff'; c.beginPath(); c.moveTo(200, 72); c.quadraticCurveTo(225, 60, 250, 72); c.lineTo(246, 100); c.lineTo(236, 122); c.lineTo(226, 100); c.lineTo(216, 122); c.lineTo(206, 100); c.closePath(); c.fill(); c.lineWidth = 3; c.stroke();
    // luminária do dentista
    c.strokeStyle = OUT; c.lineWidth = 8; c.beginPath(); c.moveTo(HEAD_D[0] + 140, -40); c.lineTo(HEAD_D[0] + 140, 40); c.lineTo(HEAD_D[0] + 40, 70); c.stroke();
    c.fillStyle = '#e9e2cf'; c.beginPath(); c.ellipse(HEAD_D[0] + 36, 74, 30, 12, -0.3, 0, Math.PI * 2); c.fill(); c.lineWidth = 3; c.stroke();
    c.save(); c.globalCompositeOperation = 'lighter'; c.filter = 'blur(14px)'; c.fillStyle = 'rgba(255,250,230,0.35)'; c.beginPath(); c.moveTo(HEAD_D[0] + 10, 80); c.lineTo(HEAD_D[0] + 60, 80); c.lineTo(HEAD_D[0] + 50, HEAD_D[1] + 20); c.lineTo(HEAD_D[0] - 30, HEAD_D[1] + 20); c.closePath(); c.fill(); c.restore();
    // cadeira reclinada
    c.fillStyle = '#2f6f8f'; c.strokeStyle = OUT; c.lineWidth = 4;
    c.beginPath(); c.moveTo(HEAD_D[0] - 30, HEAD_D[1] + 26); c.lineTo(DX, DAY + 4); c.lineTo(DX + 150, DAY - 8); c.lineTo(DX + 150, DAY + 14); c.lineTo(DX, DAY + 26); c.lineTo(HEAD_D[0] - 36, HEAD_D[1] + 44); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = '#5a5a62'; c.fillRect(DX + 20, DAY + 24, 24, FL - DAY - 24); c.strokeRect(DX + 20, DAY + 24, 24, FL - DAY - 24); c.fillRect(DX - 30, FL - 10, 130, 10); c.strokeRect(DX - 30, FL - 10, 130, 10);
    c.fillStyle = '#241911'; c.fillRect(-300, FL, W + 600, h); c.strokeStyle = 'rgba(0,0,0,0.5)'; c.lineWidth = 4; c.beginPath(); c.moveTo(-300, FL); c.lineTo(W + 300, FL); c.stroke();
  }
  function drawBack(c, k, t, P) { if (atDentist(k, t)) drawClinic(c, k, t, P); else drawHome(c, k, t, P); }

  const swell = (k, t) => (k === 'faz' ? 0.15 * smooth(seg(t, 3.0, 4.0)) * (1 - smooth(seg(t, 6.4, 7.0))) : 0.15 * smooth(seg(t, 7.2, 8)) + 0.45 * smooth(seg(t, 11, 13.5)) + 0.4 * smooth(seg(t, 17, 19.5)));
  function drawFront(c, k, t, P, drawn) {
    const hd = drawn.main.head, f = (drawn.main.st.face ?? 1) < 0 ? -1 : 1;
    const dent = atDentist(k, t);
    // bochecha inchada
    const s = swell(k, t);
    if (s > 0.02) {
      const ang = dent ? -0.4 : 0.35; const cx = hd[0] + f * Math.cos(ang) * 12, cy = hd[1] + 10;
      c.save(); c.globalCompositeOperation = 'lighter'; c.filter = 'blur(8px)'; c.fillStyle = rgb(PAL.dor, 1, 0.5 * Math.min(1, s * 1.5)); c.beginPath(); c.arc(cx + f * 6, cy, 10 + 18 * s, 0, Math.PI * 2); c.fill(); c.restore();
      c.fillStyle = '#f7f7f5'; c.strokeStyle = OUT; c.lineWidth = 3; c.beginPath(); c.ellipse(cx + f * (4 + 6 * s), cy + 2, 6 + 14 * s, 5 + 11 * s, 0, 0, Math.PI * 2); c.fill(); c.stroke();
    }
    if (!dent) {
      // maçã (na mão comendo; mordida)
      const eating = k === 'faz' ? t < 3.25 || (t >= DENT_F[1] && t < 18.6) || t >= 19.3 : t < 7.45;
      const ap = eating ? add(drawn.main.hand, [4, -6]) : [TB0 + 30, TT - 10];
      if (!(k === 'pensa' && t >= 13)) { c.fillStyle = '#d03a2e'; c.strokeStyle = OUT; c.lineWidth = 3; c.beginPath(); c.arc(ap[0], ap[1], 11, 0, Math.PI * 2); c.fill(); c.stroke();
        c.fillStyle = '#f4ead8'; c.beginPath(); c.arc(ap[0] + 9, ap[1] - 3, 5, 0, Math.PI * 2); c.fill(); c.strokeStyle = '#4a3220'; c.beginPath(); c.moveTo(ap[0], ap[1] - 10); c.lineTo(ap[0] + 2, ap[1] - 17); c.stroke(); }
      // celular ligando para o dentista
      if (k === 'faz' && t >= 3.95 && t < DENT_F[0]) { const hp = drawn.main.hand; c.fillStyle = '#111'; c.strokeStyle = OUT; c.lineWidth = 3; c.beginPath(); c.roundRect(hp[0] - 4, hp[1] - 14, 10, 22, 3); c.fill(); c.stroke(); }
      // bolsa de gelo e remédio
      if (k === 'pensa' && t >= 13 && t < 19) { const hp = drawn.main.hand, pill_ = t >= 14.6 && t < 15.3;
        if (!pill_) { c.fillStyle = '#7fc4ff'; c.strokeStyle = OUT; c.lineWidth = 3; c.beginPath(); c.roundRect(hp[0] - 14, hp[1] - 12, 26, 20, 6); c.fill(); c.stroke(); }
        else { c.fillStyle = '#fff'; c.beginPath(); c.ellipse(hp[0], hp[1] - 4, 5, 3, 0.4, 0, Math.PI * 2); c.fill(); c.stroke(); }
        // caixas de remédio no braço do sofá
        const nbox = t < 14.8 ? 2 : t < 17 ? 3 : 4; for (let i = 0; i < nbox; i++) { c.fillStyle = i % 2 ? '#e8c547' : '#e5483b'; c.fillRect(828 + i * 2, FL - 150 - i * 12, 26, 12); c.strokeRect(828 + i * 2, FL - 150 - i * 12, 26, 12); } }
      // noite sem dormir
      if (k === 'pensa' && t >= 19 && t < DENT_P[0]) { for (let i = 0; i < 3; i++) { const a = ((t * 1.1 + i / 3) % 1); c.fillStyle = `rgba(229,72,59,${0.8 * (1 - a)})`; c.font = `800 ${18 + 10 * a}px Montserrat`; c.textAlign = 'center'; c.fillText('!', hd[0] + 30 + i * 12, hd[1] - 20 - a * 50); } }
    } else {
      // broca do dentista
      const drilling = k === 'faz' ? t >= DRILL_F[0] && t < DRILL_F[1] : t >= DRILL_P[0] && t < DRILL_P[1];
      const D2 = drawn.other; if (D2 && D2.st.x > 0) { const hp = D2.hand; c.strokeStyle = '#c8ccd4'; c.lineWidth = 5; c.beginPath(); c.moveTo(hp[0], hp[1]); c.lineTo(MOUTH_D[0] - 2, MOUTH_D[1] - 2); c.stroke(); c.strokeStyle = OUT; c.lineWidth = 2; c.stroke();
        if (drilling) for (let i = 0; i < 5; i++) { const a = ((t * 4 + i / 5) % 1); c.fillStyle = `rgba(255,255,255,${0.9 * (1 - a)})`; c.beginPath(); c.arc(MOUTH_D[0] + Math.cos(i * 1.3) * 14 * a, MOUTH_D[1] - 4 - Math.sin(i * 1.7) * 14 * a, 2.5, 0, Math.PI * 2); c.fill(); } }
      // pés mexendo de nervoso no pensa
      if (k === 'pensa' && drilling) { const hp = drawn.main.toP(drawn.main.R.legF[3]); c.strokeStyle = 'rgba(255,255,255,0.6)'; c.lineWidth = 3; for (let i = 0; i < 2; i++) { c.beginPath(); c.arc(hp[0] + 8, hp[1] - 6, 10 + i * 7, -1.2, -0.2); c.stroke(); } }
    }
  }

  // ---------- placas ----------
  function pill(c, x, y, txt, col, ok, sc = 1) {
    c.save(); c.translate(x, y); c.scale(sc, sc);
    c.font = '700 18px "Space Mono", monospace'; const tw = c.measureText(txt).width; const ic = ok === null ? 0 : 24, hh = 30;
    c.beginPath(); c.roundRect(0, -hh / 2, tw + ic + 24, hh, hh / 2); c.fillStyle = 'rgba(15,10,7,0.88)'; c.fill(); c.lineWidth = 3; c.strokeStyle = rgb(col); c.stroke();
    if (ok === true) { c.strokeStyle = rgb(PAL.faz); c.lineWidth = 4; c.beginPath(); c.moveTo(12, 0); c.lineTo(17, 6); c.lineTo(27, -6); c.stroke(); }
    if (ok === false) { c.strokeStyle = rgb(PAL.dor); c.lineWidth = 4; c.beginPath(); c.moveTo(13, -6); c.lineTo(25, 6); c.moveTo(25, -6); c.lineTo(13, 6); c.stroke(); }
    c.fillStyle = rgb(col); c.textAlign = 'left'; c.textBaseline = 'middle'; c.fillText(txt, 12 + ic, 1); c.restore();
  }
  function drawOverlay(c, k, t, P, drawn, toS) {
    if (t > GT) return;
    const d = dayOf(t), dt0 = DAYS.find(([, n]) => n === d)[0];
    c.save(); c.translate(870, 40); const pop = d > 1 ? 1 + 0.3 * Math.exp(-Math.max(0, t - dt0) * 8) : 1; c.scale(pop, pop);
    c.fillStyle = 'rgba(12,8,6,0.9)'; c.strokeStyle = 'rgba(255,214,160,0.6)'; c.lineWidth = 3; c.beginPath(); c.roundRect(-74, -24, 148, 48, 10); c.fill(); c.stroke();
    c.fillStyle = rgb(PAL.luz); c.font = '800 30px "Space Mono", monospace'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(`DIA ${d}`, 0, 2); c.restore();
    if (k === 'faz') {
      const items = [[4.4, 'LIGOU PRO DENTISTA', true], [6.45, 'OBTURAÇÃO: 20 MIN', true], [11.6, 'COMENDO SEM DOR', true]];
      items.forEach(([t0, txt, ok], i) => { if (t >= t0) pill(c, 18, 74 + i * 36, txt, PAL.faz, ok, backE(seg(t, t0, t0 + 0.3))); });
    } else {
      const dd = t < 7.1 ? 0 : d; let y = 74;
      if (dd > 0) { pill(c, 18, y, `DIAS COM DOR: ${dd}`, PAL.dor, false); y += 36; }
      if (t >= 13.2) { pill(c, 18, y, `REMÉDIOS: ${t < 14.8 ? 2 : t < 17 ? 3 : 9}`, PAL.dor, false); y += 36; }
      if (t >= 23.0) pill(c, 18, y, 'TRATAMENTO DE CANAL', PAL.dor, false, backE(seg(t, 23.0, 23.3)));
    }
    for (const tc of k === 'faz' ? [DENT_F[0], DENT_F[1]] : [DENT_P[0]]) { const a = t - tc; if (a >= 0 && a < 0.25) { c.fillStyle = `rgba(255,245,230,${0.7 * (1 - a / 0.25)})`; c.fillRect(0, 0, W, P.h); } }
  }

  // ---------- índice de dor ----------
  const painFaz = (t) => { let p = 4 + spike(t, 3.2, 50, 1.5); if (t > 3.6 && t < DRILL_F[1]) p = Math.max(p, 30); p += 15 * smooth(seg(t, DRILL_F[0], DRILL_F[0] + 0.3)) * (1 - smooth(seg(t, DRILL_F[1] - 0.2, DRILL_F[1] + 0.3))); return t > 6.6 ? lerp(p, 3, smooth(seg(t, 6.6, 7.2))) : p; };
  const painPensa = (t) => { let p = 4 + spike(t, 7.4, 50, 1.5); if (t > 7.8) p = Math.max(p, 30 + 40 * smooth(seg(t, 7.8, 21)) + 4 * Math.sin(t * 3)); p += spike(t, 15.2, 12, 2) + spike(t, 19.6, 15, 1.5) + spike(t, 20.5, 15, 1.5); p += 10 * smooth(seg(t, DRILL_P[0], DRILL_P[0] + 0.3)); return Math.min(100, p); };

  const SCENE = {
    metricLabel: 'ÍNDICE DE DOR', totalLabel: 'DOR TOTAL', reportT: GT, noReport: true, dimOf, bubbleMaxX: 780,
    secsText: (n) => `${n}`,
    state: { faz: fazState, pensa: pensaState },
    others: { faz: [{ id: 'other', fn: dentist('faz'), col: PAL.azul, seed: 31, glow: 0.35 }], pensa: [{ id: 'other', fn: dentist('pensa'), col: PAL.azul, seed: 33, glow: 0.35 }] },
    drawBack, drawFront, drawOverlay,
    cam: (k, t) => {
      const keys = k === 'faz' ? [[0, 640, 190, 1.1], [2.8, 640, 175, 1.55], [DENT_F[0], 470, 190, 1.4, 0.01], [DENT_F[1], 640, 180, 1.4, 0.01], [11.0, 640, 175, 1.5], [13.0, 600, 200, 1.1], [17.0, 640, 175, 1.5]]
        : [[0, 640, 190, 1.1], [7.0, 640, 175, 1.55], [11.0, 620, 190, 1.2], [13.0, 880, 190, 1.55, 0.01], [17.0, 760, 200, 1.1], [19.0, 230, 200, 1.5, 0.01], [DENT_P[0], 470, 190, 1.4, 0.01]];
      let v = { x: keys[0][1], y: keys[0][2], z: keys[0][3] };
      for (let i = 1; i < keys.length; i++) { const [kt, x, y, z, d] = keys[i]; if (t < kt) break; const u = easeInOut(seg(t, kt, kt + (d || 0.6))); v = { x: lerp(v.x, x, u), y: lerp(v.y, y, u), z: lerp(v.z, z, u) }; }
      return v;
    },
    pain: { faz: painFaz, pensa: painPensa },
    bubbles: {
      faz: [
        { t0: 3.3, t1: 3.9, text: 'AI... O DENTE.', col: PAL.dor },
        { t0: 4.0, t1: 4.75, text: 'TEM HORÁRIO HOJE?' },
        { t0: 6.45, t1: 6.95, text: 'PRONTO!', col: PAL.azul, who: 'other' },
        { t0: 11.5, t1: 12.8, text: 'NOVINHO.', col: PAL.faz },
        { t0: 17.4, t1: 18.5, text: 'TUDO CERTO.', col: PAL.faz },
      ],
      pensa: [
        { t0: 7.5, t1: 8.0, text: 'AI!', col: PAL.dor },
        { t0: 8.1, t1: 9.4, text: 'DEVE PASSAR SOZINHO.' },
        { t0: 9.6, t1: 10.9, text: 'MASTIGO DO OUTRO LADO.' },
        { t0: 13.3, t1: 14.5, text: 'SÓ MAIS UM REMÉDIO...' },
        { t0: 20.8, t1: 21.9, text: 'NÃO AGUENTO MAIS...', col: PAL.dor },
        { t0: 22.4, t1: 23.6, text: 'VAI TER QUE SER CANAL.', col: PAL.azul, who: 'other' },
      ],
    },
    shake: (k, t) => (k === 'faz' ? 4 * (t >= 3.2 ? Math.exp(-(t - 3.2) * 8) : 0) : 4 * (t >= 7.4 ? Math.exp(-(t - 7.4) * 8) : 0)),
    energy: (k, t) => (k === 'pensa' && t > 19 && t < DENT_P[0] ? 1.6 : 1),
    caps: [
      { s: -1, e: 2.8, lines: [[-1, [['DOR DE DENTE.']]], [0.3, [['DOIS JEITOS DE '], ['RESOLVER.', 'dor']]]] },
      { s: 2.9, e: 7.0, lines: [[2.9, [['QUEM '], ['FAZ', 'faz']]], [3.25, [['MARCA NO MESMO DIA.']]]] },
      { s: 7.05, e: 11.0, lines: [[7.05, [['QUEM '], ['PENSA DEMAIS', 'pensa']]], [7.45, [['ESPERA PASSAR.']]]] },
      { s: 11.05, e: 13.0, lines: [[11.05, [['DIA 3: UM COME']]], [11.4, [['SEM '], ['DOR.', 'faz']]]] },
      { s: 13.05, e: 17.0, lines: [[13.05, [['O OUTRO: GELO,']]], [13.45, [['REMÉDIO E '], ['INCHAÇO.', 'dor']]]] },
      { s: 17.05, e: 19.0, lines: [[17.05, [['DIA 7: QUEM FAZ']]], [17.4, [['NEM LEMBRA '], ['MAIS.', 'faz']]]] },
      { s: 19.05, e: 22.0, lines: [[19.05, [['QUEM PENSA DEMAIS']]], [19.45, [['NÃO '], ['DORME.', 'dor']]]] },
      { s: 22.05, e: GT, lines: [[22.05, [['E O QUE ERA SIMPLES']]], [22.45, [['VIROU '], ['CANAL.', 'dor']]]] },
      { s: GT + 0.1, e: 99, center: true, lines: [[GT + 0.3, [['QUEM FAZ: '], ['1 DIA DE DOR.', 'faz']]], [GT + 0.9, [['PENSA DEMAIS: '], ['7 DIAS.', 'dor']]]] },
    ],
    sched: {
      noBips: true, noPops: true, music: 0.42, focusKeys: FOCUS,
      fx: [
        // FAZ (2,8–7,0)
        [3.18, 'crunch', 0.5, 0.35], [3.3, 'voz_faz/grunt4', 0.45, 0.35], [3.95, 'foley/toque_tela', 0.5, 0.35], [4.25, 'foley/toque_tela', 0.4, 0.35],
        [DRILL_F[0], 'drill', 0.16, 0.35, DRILL_F[1] - DRILL_F[0]], [5.6, 'voz_faz/grunt5', 0.3, 0.35], [6.05, 'exhale', 0.2, 0.35],
        // PENSA (7,0–11,0)
        [7.35, 'crunch', 0.5, -0.35], [7.47, 'voz_pensa/dor_02', 0.42, -0.35], [9.6, 'crunch', 0.25, -0.35], [10.1, 'crunch', 0.22, -0.35], [10.35, 'voz_pensa/dor_10', 0.3, -0.35, 1.06],
        // FAZ (11,0–13,0)
        [11.2, 'crunch', 0.45, 0.35], [12.0, 'crunch', 0.45, 0.35], [12.0, 'exhale', 0.18, 0.35],
        // PENSA (13,0–17,0)
        [13.1, 'foley/cloth_05', 0.3, -0.35], [14.65, 'foley/talher_3', 0.35, -0.35, 1.4], [14.95, 'foley/gole_1', 0.55, -0.35], [15.4, 'voz_pensa/dor_10', 0.38, -0.35], [16.3, 'voz_pensa/dor_14', 0.32, -0.35],
        // FAZ (17,0–19,0)
        [17.2, 'crunch', 0.45, 0.35], [17.9, 'crunch', 0.45, 0.35],
        // PENSA (19,0–27,0)
        [19.2, 'foley/cloth_03', 0.3, -0.35], [19.6, 'voz_pensa/dor_14', 0.38, -0.35], [20.5, 'voz_pensa/dor_15', 0.36, -0.35], [21.5, 'voz_pensa/dor_02', 0.32, -0.35, 1.1],
        [DRILL_P[0], 'drill', 0.16, -0.35, DRILL_P[1] - DRILL_P[0]], [24.6, 'voz_pensa/dor_10', 0.38, -0.35], [25.4, 'voz_pensa/dor_02', 0.36, -0.35], [26.3, 'exhale', 0.22, -0.35],
      ],
    },
  };
