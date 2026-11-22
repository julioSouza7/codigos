
  // ================= ROTEIRO: "A LOUÇA" (32 s) — índice de estresse =================
  const FL = 300, CT = FL - 100;                 // piso e tampo da bancada
  const SINK0 = 530, SINK1 = 650, SINKX = 590;   // cuba
  const RACK0 = 676;                              // escorredor
  const SOFA = 905;
  const HY = hipOn(FL, STAND_L);
  const GT = 27.0;
  const DAYS = [[0, 1], [11.0, 2], [13.7, 3], [16.4, 4], [19.0, 5]];
  const dayOf = (t) => { let d = 1; for (const [a, n] of DAYS) if (t >= a) d = n; return d; };
  const FOCUS = [[0, null], [2.8, 'faz'], [7.0, 'pensa'], [11.0, 'faz'], [12.35, 'pensa'], [13.7, 'faz'], [15.05, 'pensa'], [16.4, 'faz'], [17.7, 'pensa'], [19.0, 'faz'], [21.0, 'pensa'], [GT, null]];
  const dimOf = focusTrack(FOCUS);

  // ---------- quantidade de louça ----------
  const FAZ_WASH = [[3.2, 6.2, 2], [11.05, 12.2, 1], [13.75, 14.9, 1], [16.45, 17.6, 1]];   // [início, fim, pratos]
  const PENSA_ADD = [[7.3, 1], [12.45, 3], [15.15, 3], [17.8, 3]];
  const pileFaz = (t) => { let n = 2; for (const [a, b, k] of FAZ_WASH) { if (t >= a - 0.6 && a > 4) n += k; if (t >= a) n -= Math.min(k, Math.floor(((t - a) / (b - a)) * k + (t >= b ? 1 : 0))); } return Math.max(0, n); };
  const rackFaz = (t) => { let n = 0; for (const [a, b, k] of FAZ_WASH) if (t >= a) n += Math.min(k, Math.floor(((t - a) / (b - a)) * k + (t >= b ? 1 : 0))); return Math.min(n, 6); };
  const PWASH0 = 23.8;
  const pilePensa = (t) => { let n = 2; for (const [a, k] of PENSA_ADD) if (t >= a) n += Math.min(k, Math.floor((t - a) / 0.22) + 1); if (t > PWASH0) n -= Math.floor((t - PWASH0) / 0.75); return Math.max(0, n); };
  const fazMin = (t) => { let m = 0; for (const [a, b, k] of FAZ_WASH) if (t >= a) m += k === 2 ? 2 * smooth(seg(t, a, b)) : smooth(seg(t, a, b)); return Math.round(m); };
  const pensaMin = (t) => Math.round(60 * smooth(seg(t, PWASH0, GT - 0.2)));

  // ---------- poses ----------
  const SEAT_L = { fT: 1.45, fS: 0.02, bT: 1.38, bS: -0.06 };
  const stand = (x, face = 1, extra) => () => pose(x, FL, STAND_L, 0.03, 0.02, handsDown(x, HY), Object.assign({ face }, extra || {}));
  const walkTo = (x0, x1, t0, t1, face = 1) => (t) => { const x = lerp(x0, x1, easeInOut(seg(t, t0, t1))); return pose(x, FL, STAND_L, 0.04, 0.02, handsDown(x, HY), { face, run: 0 }); };
  const SX = 502;   // onde fica de pé na pia
  // lavando: mão da frente esfrega, a de trás segura o prato
  const wash = (on = true) => (t) => { const st = pose(SX, FL, STAND_L, 0.32, 0.35, handsDown(SX, HY), { gesture: false });
    const a = on ? t * 11 : 0; st.hands = [toRig(st, [SINKX - 8 + 12 * Math.sin(a), CT - 26 + 7 * Math.cos(a)]), toRig(st, [SINKX - 24, CT - 30])]; st.prefF = 'down'; st.prefB = 'down'; return st; };
  const toRack = () => (t) => { const st = pose(SX, FL, STAND_L, 0.3, 0.2, handsDown(SX, HY), { gesture: false }); st.hands = [toRig(st, [RACK0 - 6, CT - 30]), toRig(st, [SINKX - 30, CT - 20])]; return st; };
  const faucet = () => (t) => { const st = pose(SX, FL, STAND_L, 0.3, 0.1, handsDown(SX, HY), { gesture: false }); st.hands = [toRig(st, [626, CT - 46]), st.hands[1]]; return st; };
  const SOFA_HY = hipOn(FL, SEAT_L);
  const sofa = (phone) => (t) => ({ x: SOFA, hipY: SOFA_HY, ay: FL, lean: phone ? 0.22 : -0.12, head: phone ? 0.38 : 0.0, legs: SEAT_L,
    hands: phone ? [[SOFA + 44, SOFA_HY - 96 + 2 * Math.sin(t * 5)], [SOFA + 34, SOFA_HY - 88]] : [[SOFA - 20, SOFA_HY - 150], [SOFA - 34, SOFA_HY - 140]],
    prefF: phone ? 'down' : 'back', prefB: phone ? 'down' : 'back', grounded: false, face: -1, gesture: false, noWalk: true });
  const eat = () => (t) => { const u = 0.5 - 0.5 * Math.cos((t - 19.4) * Math.PI * 2 / 1.0); const hy = SOFA_HY;
    return { x: SOFA, hipY: hy, ay: FL, lean: lerp(0.32, 0.12, u), head: lerp(0.35, -0.05, u), legs: SEAT_L, hands: [P2([SOFA + 60, hy - 50], [SOFA + 40, hy - 128], u), [SOFA + 50, hy - 46]], prefF: 'down', prefB: 'down', grounded: false, face: -1, gesture: false, noWalk: true }; };

  // ---------- 2 · FAZ ----------
  const fazKeys = [
    [0, () => { const st = stand(SX)(); st.lean = 0.12; st.head = 0.3; return st; }],
    [2.8, faucet(), 0.3],
    [3.2, wash(), 0.3], [4.6, toRack(), 0.2], [4.85, wash(), 0.2], [6.0, toRack(), 0.2], [6.25, faucet(), 0.2],
    [6.6, () => pose(SX, FL, STAND_L, -0.05, -0.1, [[SX + 40, HY - 250], [SX - 20, HY + 20]], {}), 0.25],
    [7.2, walkTo(SX, SOFA, 7.2, 8.4, 1), 0.3], [8.4, stand(SOFA, -1), 0.25], [8.65, sofa(false), 0.4],
    [9.9, stand(SOFA, -1), 0.4], [10.1, walkTo(SOFA, SX, 10.1, 10.95, -1), 0.3], [10.95, stand(SX, 1), 0.25],
  ];
  for (const [a, b] of FAZ_WASH.slice(1)) fazKeys.push([a, wash(), 0.15], [b - 0.15, toRack(), 0.15], [b + 0.1, stand(SX, 1, { lean: 0.1 }), 0.3]);
  fazKeys.push([17.9, walkTo(SX, SOFA, 17.9, 18.8, 1), 0.3], [18.8, stand(SOFA, -1), 0.2], [19.05, sofa(false), 0.35], [19.4, eat(), 0.3], [23.0, sofa(false), 0.5]);
  fazKeys.sort((a, b) => a[0] - b[0]);
  const fazState = (t) => seq(fazKeys, t);

  // ---------- 1 · PENSA DEMAIS ----------
  const think = (x) => () => pose(x, FL, STAND_L, 0.04, 0.25, handsChin(x, HY), { gesture: false });
  const pensaKeys = [
    [0, think(SX)],
    [7.25, () => { const st = pose(SX, FL, STAND_L, 0.25, 0.25, handsDown(SX, HY)); st.hands = [toRig(st, [SINKX + 10, CT - 40]), st.hands[1]]; return st; }, 0.2],   // larga o prato
    [7.7, stand(SX, 1), 0.3],
    [7.85, walkTo(SX, SOFA, 7.85, 9.0, 1), 0.3], [9.0, stand(SOFA, -1), 0.2], [9.25, sofa(true), 0.4],
    [20.9, stand(SOFA, -1), 0.4],
    [21.05, walkTo(SOFA, 560, 21.05, 21.85, -1), 0.3], [21.85, stand(560, 1), 0.25],
    [22.0, () => { const st = pose(560, FL, STAND_L, -0.05, -0.35, handsDown(560, HY)); st.hands = [toRig(st, [610, 80]), st.hands[1]]; st.prefF = 'down'; return st; }, 0.3],   // abre o armário
    [22.6, () => { const st = pose(560, FL, STAND_L, -0.1, -0.45, [[560 + 40, HY - 160], [560 - 10, HY - 150]]); st.prefF = 'down'; return st; }, 0.25],   // vazio!
    [23.3, () => { const st = think(SX)(); st.head = 0.5; st.lean = 0.2; return st; }, 0.35],
    [PWASH0, wash(), 0.3],
  ];
  const pensaState = (t) => { const st = seq(pensaKeys, t); if (t > PWASH0) { st.lean += 0.06; st.head += 0.1; } return st; };

  // ---------- cenário: cozinha + sala ----------
  function drawBack(c, k, t, P) {
    const h = P.h, day = dayOf(t);
    const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#1b130e'); g.addColorStop(0.7, '#33251b'); g.addColorStop(1, '#241a13');
    c.fillStyle = g; c.fillRect(-300, -100, W + 600, h + 200);
    // azulejos atrás da pia
    c.strokeStyle = 'rgba(0,0,0,0.2)'; c.lineWidth = 2;
    for (let y = 130; y < CT; y += 30) { c.beginPath(); c.moveTo(470, y); c.lineTo(760, y); c.stroke(); }
    for (let x = 470; x < 760; x += 36) { c.beginPath(); c.moveTo(x, 130); c.lineTo(x, CT); c.stroke(); }
    // janela (sempre noite: depois do jantar)
    c.fillStyle = '#4a3524'; c.fillRect(150, 40, 180, 130); c.strokeStyle = OUT; c.lineWidth = 5; c.strokeRect(150, 40, 180, 130);
    c.fillStyle = '#1c2134'; c.fillRect(156, 46, 168, 118); c.fillStyle = '#e8e4d0'; c.beginPath(); c.arc(290, 76, 12, 0, Math.PI * 2); c.fill();
    c.strokeStyle = 'rgba(0,0,0,0.45)'; c.lineWidth = 4; c.beginPath(); c.moveTo(240, 46); c.lineTo(240, 164); c.stroke();
    // armário de cima
    const open = k === 'pensa' ? smooth(seg(t, 22.1, 22.5)) : 0;
    c.fillStyle = '#5a3c26'; c.strokeStyle = OUT; c.lineWidth = 4; c.fillRect(480, 30, 270, 90); c.strokeRect(480, 30, 270, 90);
    if (open > 0) { c.fillStyle = '#1a120c'; c.fillRect(612, 36, 130, 78); c.strokeStyle = 'rgba(255,214,160,0.25)'; c.beginPath(); c.moveTo(612, 76); c.lineTo(742, 76); c.stroke(); }
    c.fillStyle = '#6b4a30'; c.strokeStyle = OUT;
    c.fillRect(486, 36, 120, 78); c.strokeRect(486, 36, 120, 78);
    const dw = 124 * (1 - open * 0.85); c.fillRect(612 + (124 - dw) * 0, 36, dw, 78); c.strokeRect(612, 36, dw, 78);
    // luz quente da cozinha
    c.save(); c.globalCompositeOperation = 'lighter'; c.filter = 'blur(16px)';
    const bg = c.createLinearGradient(0, 0, 0, h); bg.addColorStop(0, rgb(PAL.luz, 1, 0.18)); bg.addColorStop(1, rgb(PAL.luz, 1, 0.04));
    c.fillStyle = bg; c.beginPath(); c.moveTo(560, 120); c.lineTo(640, 120); c.lineTo(820, h); c.lineTo(380, h); c.closePath(); c.fill(); c.restore();
    // bancada
    c.fillStyle = '#6b4a30'; c.strokeStyle = OUT; c.lineWidth = 4; c.fillRect(470, CT, 290, FL - CT); c.strokeRect(470, CT, 290, FL - CT);
    c.fillStyle = '#d9cdb8'; c.fillRect(464, CT - 8, 302, 12); c.strokeRect(464, CT - 8, 302, 12);
    c.strokeStyle = 'rgba(0,0,0,0.35)'; c.lineWidth = 3; for (const x of [565, 660]) { c.beginPath(); c.moveTo(x, CT + 14); c.lineTo(x, FL - 6); c.stroke(); }
    // cuba (vista em corte, escura)
    c.fillStyle = '#2a2a2e'; c.fillRect(SINK0, CT - 8, SINK1 - SINK0, 10);
    // torneira
    c.strokeStyle = OUT; c.lineWidth = 10; c.beginPath(); c.moveTo(640, CT - 8); c.lineTo(640, CT - 66); c.quadraticCurveTo(640, CT - 80, 622, CT - 80); c.lineTo(606, CT - 80); c.lineTo(606, CT - 66); c.stroke();
    c.strokeStyle = '#b8bcc4'; c.lineWidth = 5; c.stroke();
    // sofá
    c.fillStyle = '#7a3f34'; c.strokeStyle = OUT; c.lineWidth = 4;
    c.beginPath(); c.roundRect(830, FL - 130, 170, 70, 14); c.fill(); c.stroke();
    c.beginPath(); c.roundRect(820, FL - 68, 190, 40, 10); c.fill(); c.stroke();
    c.fillRect(830, FL - 28, 14, 28); c.strokeRect(830, FL - 28, 14, 28); c.fillRect(986, FL - 28, 14, 28); c.strokeRect(986, FL - 28, 14, 28);
    // piso
    c.fillStyle = '#2a1d14'; c.fillRect(-300, FL, W + 600, h); c.strokeStyle = 'rgba(0,0,0,0.5)'; c.lineWidth = 4; c.beginPath(); c.moveTo(-300, FL); c.lineTo(W + 300, FL); c.stroke();
    drawPile(c, k, t);
  }
  // um item de louça suja
  function dish(c, x, y, kind, dirty, s = 1) {
    c.save(); c.translate(x, y); c.scale(s, s); c.strokeStyle = OUT; c.lineWidth = 3;
    if (kind === 0) { c.fillStyle = '#efe6d6'; c.beginPath(); c.ellipse(0, 0, 34, 7, 0, 0, Math.PI * 2); c.fill(); c.stroke(); }
    else if (kind === 1) { c.fillStyle = '#e8c547'; c.beginPath(); c.roundRect(-10, -20, 20, 22, 3); c.fill(); c.stroke(); }
    else if (kind === 2) { c.fillStyle = '#5a5a62'; c.beginPath(); c.ellipse(0, -2, 30, 10, 0, 0, Math.PI * 2); c.fill(); c.stroke(); c.lineWidth = 6; c.beginPath(); c.moveTo(26, -4); c.lineTo(56, -12); c.stroke(); }
    else { c.fillStyle = '#2f9bff'; c.beginPath(); c.ellipse(0, -4, 22, 10, 0, 0, Math.PI); c.fill(); c.stroke(); }
    if (dirty) { c.fillStyle = 'rgba(110,70,30,0.85)'; c.beginPath(); c.arc(-8, -2, 4, 0, Math.PI * 2); c.arc(9, -1, 3, 0, Math.PI * 2); c.fill(); }
    c.restore();
  }
  const KIND = [0, 0, 1, 0, 2, 3, 0, 1, 0, 0, 3, 0, 2, 1, 0];
  function drawPile(c, k, t) {
    const n = k === 'faz' ? pileFaz(t) : pilePensa(t);
    // pilha na pia (cresce com balanço quando chega louça nova)
    for (let i = 0; i < n; i++) {
      const kind = KIND[i % KIND.length], jx = ((i * 37) % 13) - 6;
      let y = CT - 6 - i * 10, x = SINKX + jx;
      if (k === 'pensa') for (const [a, kk] of PENSA_ADD) { const j = i - (PENSA_ADD.filter(([b]) => b < a).reduce((s, [, q]) => s + q, 2)); if (j >= 0 && j < kk) { const tt = t - (a + j * 0.22); if (tt < 0.25) y -= 80 * (1 - easeIn(clamp(tt / 0.25))); } }
      dish(c, x, y, kind, true);
    }
    // moscas e cheiro
    if (k === 'pensa' && n > 6) {
      const top = CT - 6 - n * 10, nf = Math.min(6, n - 6);
      for (let i = 0; i < nf; i++) { const a = t * (3 + i * 0.7) + i * 2.1, fx = SINKX + Math.cos(a) * (30 + i * 6), fy = top - 20 + Math.sin(a * 1.3) * 18;
        c.fillStyle = '#111'; c.beginPath(); c.arc(fx, fy, 3.5, 0, Math.PI * 2); c.fill(); c.fillStyle = 'rgba(220,230,240,0.7)'; const wv = Math.sin(t * 60 + i) * 3; c.beginPath(); c.ellipse(fx - 2, fy - 4, 3, 1.5 + wv * 0.2, -0.5, 0, Math.PI * 2); c.ellipse(fx + 2, fy - 4, 3, 1.5, 0.5, 0, Math.PI * 2); c.fill(); }
      c.strokeStyle = 'rgba(140,190,90,0.6)'; c.lineWidth = 3;
      for (let i = 0; i < 3; i++) { const ph = (t * 0.6 + i / 3) % 1; c.globalAlpha = Math.sin(Math.PI * ph); c.beginPath(); for (let j = 0; j < 10; j++) { const yy = top - 10 - ph * 60 - j * 5, xx = SINKX - 20 + i * 20 + 5 * Math.sin(j * 0.9 + t * 3); if (!j) c.moveTo(xx, yy); else c.lineTo(xx, yy); } c.stroke(); }
      c.globalAlpha = 1;
    }
    // escorredor do faz
    if (k === 'faz') {
      c.strokeStyle = OUT; c.lineWidth = 3; c.fillStyle = 'rgba(200,200,206,0.5)'; c.fillRect(RACK0, CT - 18, 80, 10); c.strokeRect(RACK0, CT - 18, 80, 10);
      for (let i = 0; i < rackFaz(t); i++) { c.fillStyle = '#efe6d6'; c.beginPath(); c.ellipse(RACK0 + 10 + i * 12, CT - 34, 5, 18, 0.1, 0, Math.PI * 2); c.fill(); c.stroke(); }
    }
  }
  function drawFront(c, k, t, P, drawn) {
    // prato na mão + espuma + água correndo
    const washing = k === 'faz' ? FAZ_WASH.some(([a, b]) => t >= a && t < b) : t >= PWASH0 && t < GT;
    const water = k === 'faz' ? (t >= 3.0 && t < 6.3) || FAZ_WASH.slice(1).some(([a, b]) => t >= a && t < b) : t >= PWASH0 - 0.2 && t < GT;
    if (water) { c.strokeStyle = 'rgba(170,210,240,0.85)'; c.lineWidth = 5; c.beginPath(); for (let j = 0; j <= 8; j++) { const yy = CT - 64 + j * 7, xx = 606 + 1.5 * Math.sin(t * 40 + j); if (!j) c.moveTo(xx, yy); else c.lineTo(xx, yy); } c.stroke(); }
    if (washing) {
      const R = drawn.main.R, toP = drawn.main.toP, hb = toP(R.armB[2]), hf = toP(R.armF[2]);
      c.save(); c.translate(hb[0] + 6, hb[1] - 4); c.rotate(-1.2); c.fillStyle = '#efe6d6'; c.strokeStyle = OUT; c.lineWidth = 3; c.beginPath(); c.ellipse(0, 0, 26, 6, 0, 0, Math.PI * 2); c.fill(); c.stroke(); c.restore();
      c.fillStyle = '#e8c547'; c.strokeStyle = OUT; c.lineWidth = 2.5; c.beginPath(); c.roundRect(hf[0] - 8, hf[1] - 6, 16, 10, 3); c.fill(); c.stroke();
      for (let i = 0; i < 7; i++) { const a = (t * 1.7 + i / 7) % 1; c.fillStyle = `rgba(255,255,255,${0.85 * (1 - a)})`; c.beginPath(); c.arc(hf[0] - 10 + (i * 9) % 26, hf[1] - 6 - a * 26, 3 + (i % 3), 0, Math.PI * 2); c.fill(); }
    }
    // prato e garfo no jantar do faz
    if (k === 'faz' && t >= 19.4 && t < 23.2) { const hf = drawn.main.hand; c.strokeStyle = '#d8d8dc'; c.lineWidth = 3; c.beginPath(); c.moveTo(hf[0], hf[1]); c.lineTo(hf[0] - 12, hf[1] - 10); c.stroke();
      const hb = drawn.main.toP(drawn.main.R.armB[2]); dish(c, hb[0] - 10, hb[1] - 2, 0, false, 0.8); }
    // celular no sofá do pensa demais
    if (k === 'pensa' && t >= 9.3 && t < 20.9) { const hf = drawn.main.hand; c.save(); c.translate(hf[0], hf[1] - 6);
      c.save(); c.globalCompositeOperation = 'lighter'; c.filter = 'blur(10px)'; c.fillStyle = 'rgba(120,170,255,0.4)'; c.beginPath(); c.arc(4, -6, 20, 0, Math.PI * 2); c.fill(); c.restore();
      c.fillStyle = '#111'; c.strokeStyle = OUT; c.lineWidth = 3; c.beginPath(); c.roundRect(-7, -14, 14, 24, 3); c.fill(); c.stroke(); c.fillStyle = '#6fa8ff'; c.fillRect(-5, -11, 10, 18); c.restore(); }
    // suor lavando a pilha
    if (k === 'pensa' && t > PWASH0 + 0.5) { const hd = drawn.main.head; for (let i = 0; i < 3; i++) { const a = ((t * 1.3 + i / 3) % 1); c.fillStyle = `rgba(200,230,255,${0.9 * (1 - a)})`; c.beginPath(); c.arc(hd[0] - 20 - i * 6, hd[1] - 12 + a * 44, 4.5, 0, Math.PI * 2); c.fill(); } }
  }

  // ---------- placas (tela) ----------
  function pill(c, x, y, txt, col, ok, sc = 1, big = false) {
    c.save(); c.translate(x, y); c.scale(sc, sc);
    c.font = `700 ${big ? 26 : 18}px "Space Mono", monospace`; const tw = c.measureText(txt).width; const ic = ok === null ? 0 : 24, hh = big ? 40 : 30;
    c.beginPath(); c.roundRect(0, -hh / 2, tw + ic + 24, hh, hh / 2); c.fillStyle = 'rgba(15,10,7,0.88)'; c.fill(); c.lineWidth = 3; c.strokeStyle = rgb(col); c.stroke();
    if (ok === true) { c.strokeStyle = rgb(PAL.faz); c.lineWidth = 4; c.beginPath(); c.moveTo(12, 0); c.lineTo(17, 6); c.lineTo(27, -6); c.stroke(); }
    if (ok === false) { c.strokeStyle = rgb(PAL.dor); c.lineWidth = 4; c.beginPath(); c.moveTo(13, -6); c.lineTo(25, 6); c.moveTo(25, -6); c.lineTo(13, 6); c.stroke(); }
    c.fillStyle = rgb(col); c.textAlign = 'left'; c.textBaseline = 'middle'; c.fillText(txt, 12 + ic, 1); c.restore();
  }
  function drawOverlay(c, k, t, P, drawn, toS) {
    if (t > GT) return;
    // dia (time-lapse)
    const d = dayOf(t), dt0 = DAYS.find(([, n]) => n === d)[0];
    c.save(); c.translate(870, 40); const pop = 1 + 0.3 * Math.exp(-Math.max(0, t - dt0) * 8) * (d > 1 ? 1 : 0); c.scale(pop, pop);
    c.fillStyle = 'rgba(12,8,6,0.9)'; c.strokeStyle = 'rgba(255,214,160,0.6)'; c.lineWidth = 3; c.beginPath(); c.roundRect(-74, -24, 148, 48, 10); c.fill(); c.stroke();
    c.fillStyle = rgb(PAL.luz); c.font = '800 30px "Space Mono", monospace'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(`DIA ${d}`, 0, 2); c.restore();
    const n = k === 'faz' ? pileFaz(t) : pilePensa(t);
    pill(c, 18, 74, `NA PIA: ${n}`, k === 'faz' || n < 4 ? PAL.faz : PAL.dor, k === 'faz' ? (n === 0 ? true : null) : n < 4 ? null : false);
    if (k === 'faz' && t >= 3.2) pill(c, 18, 110, `LAVANDO: ${fazMin(t)} MIN NO TOTAL`, PAL.faz, null);
    if (k === 'pensa' && t >= PWASH0) pill(c, 18, 110, `LAVANDO: ${pensaMin(t)} MIN`, PAL.dor, null, 1 + 0.08 * Math.sin(t * 8));
  }

  // ---------- índice de estresse ----------
  const painFaz = (t) => 6 + 2 * Math.sin(t * 1.7) + FAZ_WASH.reduce((s, [a, b]) => s + 8 * smooth(seg(t, a, a + 0.3)) * (1 - smooth(seg(t, b, b + 0.4))), 0) - 3 * smooth(seg(t, 19, 20));
  const painPensa = (t) => { const n = pilePensa(t); let p = 8 + n * 4.5 + 3 * Math.sin(t * 2.3); p += spike(t, 22.4, 40, 0.8); if (t > PWASH0) p = Math.max(p, 78 + 5 * Math.sin(t * 6)); return Math.min(100, p); };

  const SCENE = {
    metricLabel: 'ÍNDICE DE ESTRESSE', totalLabel: 'ESTRESSE TOTAL', reportT: GT, noReport: true, dimOf, bubbleMaxX: 780,
    secsText: (n) => `${n}`,
    state: { faz: fazState, pensa: pensaState },
    drawBack, drawFront, drawOverlay,
    cam: (k, t) => {
      const keys = k === 'faz' ? [[0, 540, 200, 1], [2.8, 560, 170, 1.45], [6.8, 640, 200, 1.0], [11.0, 560, 170, 1.4], [17.8, 700, 200, 1.05], [19.2, 880, 200, 1.4], [GT - 1, 640, 200, 1.0]]
        : [[0, 540, 200, 1], [7.0, 560, 180, 1.3], [7.9, 700, 200, 1.0], [12.35, 590, 150, 1.45], [13.7, 650, 190, 1.05], [15.05, 590, 140, 1.5], [16.4, 650, 190, 1.05], [17.7, 590, 140, 1.5], [19.0, 680, 200, 1.0], [21.9, 600, 120, 1.35], [23.3, 570, 160, 1.4]];
      let v = { x: keys[0][1], y: keys[0][2], z: keys[0][3] };
      for (let i = 1; i < keys.length; i++) { const [kt, x, y, z] = keys[i]; if (t < kt) break; const u = easeInOut(seg(t, kt, kt + 0.6)); v = { x: lerp(v.x, x, u), y: lerp(v.y, y, u), z: lerp(v.z, z, u) }; }
      return v;
    },
    pain: { faz: painFaz, pensa: painPensa },
    bubbles: {
      faz: [
        { t0: 2.85, t1: 3.6, text: 'BORA.', col: PAL.faz },
        { t0: 6.35, t1: 7.0, text: 'PRONTO. 2 MIN.', col: PAL.faz },
        { t0: 19.5, t1: 20.9, text: 'JANTAR EM PAZ.', col: PAL.faz },
      ],
      pensa: [
        { t0: 7.05, t1: 7.85, text: 'DEPOIS EU LAVO.' },
        { t0: 12.6, t1: 13.6, text: 'AMANHÃ EU LAVO.' },
        { t0: 15.3, t1: 16.3, text: 'TÁ TRANQUILO...' },
        { t0: 17.9, t1: 18.95, text: 'QUE CHEIRO É ESSE?', col: PAL.dor },
        { t0: 22.6, t1: 23.5, text: 'CADÊ OS PRATOS?!', col: PAL.dor },
        { t0: 23.6, t1: 24.6, text: 'AH NÃO...' },
      ],
    },
    shake: (k, t) => (k === 'pensa' ? 6 * (t >= 22.5 ? Math.exp(-(t - 22.5) * 7) : 0) : 0),
    energy: (k, t) => (k === 'pensa' && t > PWASH0 ? 1.8 : 1),
    caps: [
      { s: -1, e: 2.8, lines: [[-1, [['LOUÇA NA PIA.']]], [0.3, [['DOIS JEITOS DE '], ['LIDAR.', 'dor']]]] },
      { s: 2.9, e: 7.0, lines: [[2.9, [['QUEM '], ['FAZ', 'faz']]], [3.25, [['LAVA NA HORA.']]]] },
      { s: 7.05, e: 11.0, lines: [[7.05, [['QUEM '], ['PENSA DEMAIS', 'pensa']]], [7.45, [['DEIXA PRA DEPOIS.']]]] },
      { s: 11.05, e: 15.0, lines: [[11.05, [['TODO DIA:']]], [11.4, [['1 PRATO, '], ['1 MINUTO.', 'faz']]]] },
      { s: 15.05, e: 19.0, lines: [[15.05, [['E A PIA DO OUTRO']]], [15.45, [['SÓ '], ['CRESCE.', 'dor']]]] },
      { s: 19.05, e: 21.0, lines: [[19.05, [['DIA 5: QUEM FAZ']]], [19.4, [['JANTA EM '], ['PAZ.', 'faz']]]] },
      { s: 21.05, e: 24.0, lines: [[21.05, [['QUEM PENSA DEMAIS']]], [21.45, [['FICOU '], ['SEM PRATO.', 'dor']]]] },
      { s: 24.05, e: GT, lines: [[24.05, [['AGORA É']]], [24.4, [['1 HORA '], ['DE PIA.', 'dor']]]] },
      { s: GT + 0.1, e: 99, center: true, lines: [[GT + 0.3, [['QUEM FAZ: '], ['5 MINUTOS.', 'faz']]], [GT + 0.9, [['PENSA DEMAIS: '], ['1 HORA.', 'dor']]]] },
    ],
    sched: {
      noBips: true, noPops: true, music: 0.42, focusKeys: FOCUS,
      fx: [
        // FAZ — dia 1 (2,8–7,0)
        [2.95, 'foley/cloth_04', 0.3, 0.35], [3.0, 'water', 0.28, 0.35, 3.3], [3.3, 'scrub', 0.35, 0.35, 1.25], [4.65, 'foley/talher_3', 0.45, 0.35],
        [4.9, 'scrub', 0.35, 0.35, 1.05], [6.05, 'foley/talher_1', 0.45, 0.35], [6.25, 'exhale', 0.2, 0.35],
        // PENSA — dia 1 (7,0–11,0)
        [7.3, 'foley/talher_2', 0.6, -0.35], [7.45, 'foley/talher_3', 0.4, -0.35], [9.3, 'foley/cloth_05', 0.3, -0.35],
        ...Array.from({ length: 6 }, (_, i) => [9.7 + i * 0.22, 'scroll', 0.1, -0.35]),
        // dias 2–4, alternando
        ...FAZ_WASH.slice(1).flatMap(([a, b]) => [[a, 'water', 0.25, 0.35, b - a], [a + 0.1, 'scrub', 0.3, 0.35, b - a - 0.25], [b - 0.25, 'foley/talher_1', 0.4, 0.35, 1.3]]),
        ...PENSA_ADD.slice(1).flatMap(([a, kk]) => Array.from({ length: kk }, (_, j) => [a + 0.05 + j * 0.2, 'foley/talher_' + (1 + (j % 3)), 0.5, -0.35, 1.3])),
        [15.9, 'buzz', 0.16, -0.35, 0.45], [18.3, 'buzz', 0.22, -0.35, 0.6],
        // FAZ — dia 5 (19,0–21,0)
        [19.25, 'foley/talher_3', 0.4, 0.35], [19.95, 'foley/talher_2', 0.3, 0.35], [20.05, 'exhale', 0.2, 0.35],
        // PENSA — dia 5 (21,0–27,0)
        [21.2, 'buzz', 0.2, -0.35, 0.7], [22.1, 'foley/porta', 0.5, -0.35], [22.55, 'voz_pensa/dor_02', 0.4, -0.35], [23.5, 'voz_pensa/dor_14', 0.38, -0.35],
        [PWASH0 - 0.2, 'water', 0.28, -0.35, GT - PWASH0], [PWASH0 + 0.1, 'scrub', 0.32, -0.35, GT - PWASH0 - 0.4],
        [25.0, 'foley/talher_1', 0.35, -0.35], [25.6, 'voz_pensa/dor_10', 0.38, -0.35], [26.3, 'foley/talher_3', 0.35, -0.35],
      ],
    },
  };
