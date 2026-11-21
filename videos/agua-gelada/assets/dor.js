// Água gelada — FAZ x PENSA DEMAIS, com índice de dor. 2D vetorial, função pura do tempo (25 s).
(function () {
  const W = 1080, H = 1920, FLOOR = 1080;
  const cv = document.getElementById('gl');
  const ctx = cv.getContext('2d');
  const layer = document.createElement('canvas'); layer.width = W; layer.height = H;
  const lc = layer.getContext('2d');

  // ---------- utilidades ----------
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const lerp = (a, b, u) => a + (b - a) * u;
  const seg = (t, a, b) => clamp((t - a) / (b - a));
  const smooth = (u) => { u = clamp(u); return u * u * (3 - 2 * u); };
  const easeIn = (u) => { u = clamp(u); return u * u; };
  const easeOut = (u) => 1 - Math.pow(1 - clamp(u), 3);
  const easeInOut = (u) => { u = clamp(u); return u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2; };
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const rnd = mulberry32(7711);
  const rr = (a, b) => a + (b - a) * rnd();
  const track = (keys) => (t) => {
    if (t <= keys[0][0]) return keys[0][1];
    for (let i = 1; i < keys.length; i++) {
      const [t1, v1] = keys[i], [t0, v0] = keys[i - 1];
      if (t <= t1) return lerp(v0, v1, smooth((t - t0) / (t1 - t0)));
    }
    return keys[keys.length - 1][1];
  };
  const rgb = (c, k = 1, a = 1) => `rgba(${Math.round(c[0] * k)},${Math.round(c[1] * k)},${Math.round(c[2] * k)},${a})`;
  const mixC = (a, b, u) => [lerp(a[0], b[0], u), lerp(a[1], b[1], u), lerp(a[2], b[2], u)];
  const P2 = (a, b, u) => [lerp(a[0], b[0], u), lerp(a[1], b[1], u)];
  const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
  const v = (a, len) => [Math.sin(a) * len, Math.cos(a) * len];
  const dirA = (a) => [Math.sin(a), -Math.cos(a)]; // 0 = para cima, π/2 = para a frente

  // ---------- boneco de perfil ----------
  const D = { headR: 31, limb: 26, torsoW: 30, ol: 5, torso: 100, uArm: 60, fArm: 56, thigh: 82, shin: 78, foot: 20 };
  const OUT = '#0e0e10';
  const WHITE = [247, 247, 245], BACK = [196, 196, 200], DARK = [88, 88, 94], DARKB = [62, 62, 68];
  const RED = [255, 59, 48];
  const COL = { disc: [47, 155, 255], obs: [255, 59, 48], ego: [184, 92, 255] };
  const HX = { disc: 95, obs: 430, ego: 765 };
  const WALL_T = 66;
  const wallFace = (k) => HX[k] + 186;

  function ikP(S, T, a, b, pref) {
    const dx = T[0] - S[0], dy = T[1] - S[1], d = Math.max(1e-3, Math.hypot(dx, dy));
    const dd = clamp(d, Math.abs(a - b) + 1, a + b - 0.5);
    const ux = dx / d, uy = dy / d;
    const A = Math.acos(clamp((a * a + dd * dd - b * b) / (2 * a * dd), -1, 1));
    const c1 = [ux * Math.cos(A) - uy * Math.sin(A), ux * Math.sin(A) + uy * Math.cos(A)];
    const c2 = [ux * Math.cos(A) + uy * Math.sin(A), -ux * Math.sin(A) + uy * Math.cos(A)];
    const e = pref(c1) >= pref(c2) ? c1 : c2;
    const E = [S[0] + e[0] * a, S[1] + e[1] * a];
    const hx = T[0] - E[0], hy = T[1] - E[1], hl = Math.max(1e-3, Math.hypot(hx, hy));
    return { E, H: [E[0] + (hx / hl) * b, E[1] + (hy / hl) * b] };
  }
  const PREF = { down: (c) => c[1] - 0.3 * c[0], back: (c) => -c[0] + 0.2 * c[1], fwd: (c) => c[0] - 0.2 * c[1] };
  const legH = (L) => D.thigh * Math.cos(L.fT) + D.shin * Math.cos(L.fS);
  const standHipY = (L) => FLOOR - D.limb * 0.5 - 2 - legH(L);

  function rigP(st) {
    const L = st.legs, hip = [st.x, st.hipY];
    const tv = [Math.sin(st.lean), -Math.cos(st.lean)];
    const sh = add(hip, [tv[0] * D.torso, tv[1] * D.torso]);
    const arm = add(hip, [tv[0] * (D.torso - 12), tv[1] * (D.torso - 12)]);
    const ha = st.lean + st.head;
    const head = add(sh, [Math.sin(ha) * (D.headR + 9), -Math.cos(ha) * (D.headR + 9)]);
    const aF = ikP(arm, st.hands[0], D.uArm, D.fArm, PREF[st.prefF || 'down']);
    const aB = ikP(arm, st.hands[1], D.uArm, D.fArm, PREF[st.prefB || 'down']);
    const kF = add(hip, v(L.fT, D.thigh)), anF = add(kF, v(L.fS, D.shin)), tF = add(anF, v(L.fS + Math.PI / 2, D.foot));
    const kB = add(hip, v(L.bT, D.thigh)), anB = add(kB, v(L.bS, D.shin)), tB = add(anB, v(L.bS + Math.PI / 2, D.foot));
    return { hip, sh, arm, head, armF: [arm, aF.E, aF.H], armB: [arm, aB.E, aB.H], legF: [hip, kF, anF, tF], legB: [hip, kB, anB, tB] };
  }
  function strokePts(c, pts, w, col) {
    c.lineWidth = w; c.strokeStyle = col; c.lineCap = 'round'; c.lineJoin = 'round';
    c.beginPath(); c.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]);
    c.stroke();
  }
  const limb = (c, pts, w, col) => { strokePts(c, pts, w + 2 * D.ol, OUT); strokePts(c, pts, w, col); };
  const disc = (c, p, r, col) => { c.fillStyle = col; c.beginPath(); c.arc(p[0], p[1], r, 0, Math.PI * 2); c.fill(); };

  // marreta: g = ponto entre as mãos, a = direção do cabo (das mãos para a cabeça)
  const HL = 118;
  const hammerPts = (g, a) => { const d = dirA(a); return { end: [g[0] - d[0] * 30, g[1] - d[1] * 30], head: [g[0] + d[0] * HL, g[1] + d[1] * HL], d }; };
  function drawHammer(c, g, a, col) {
    const { end, head, d } = hammerPts(g, a);
    strokePts(c, [end, head], 10 + 8, OUT); strokePts(c, [end, head], 10, '#a0765a');
    c.save(); c.translate(head[0], head[1]); c.rotate(Math.atan2(d[1], d[0]));
    // lâmina do machado (para a frente) na cor do personagem
    c.beginPath(); c.moveTo(-14, -12); c.lineTo(10, -14); c.quadraticCurveTo(26, -40, 34, -46); c.quadraticCurveTo(52, -2, 34, 44); c.quadraticCurveTo(26, 38, 10, 14); c.lineTo(-14, 12); c.closePath();
    c.save(); c.rotate(Math.PI / 2); c.restore();
    c.fillStyle = rgb(col || [200, 200, 206]); c.fill(); c.lineWidth = 4.5; c.strokeStyle = OUT; c.stroke();
    c.fillStyle = 'rgba(255,255,255,0.5)'; c.beginPath(); c.moveTo(36, -36); c.quadraticCurveTo(48, -2, 36, 34); c.lineTo(32, 30); c.quadraticCurveTo(42, -2, 31, -32); c.closePath(); c.fill();
    c.restore();
  }
  function drawFigure(c, R, light, hammer, col) {
    const f = rgb(mixC(DARK, WHITE, light)), b = rgb(mixC(DARKB, BACK, light));
    if (col && light > 0.5) {
      c.save(); c.globalAlpha = 0.55 * (light - 0.5) * 2; c.filter = 'blur(8px)';
      for (const L of [R.legB, R.armB, R.legF, R.armF, [R.hip, R.sh]]) strokePts(c, L, D.limb + 22, rgb(col));
      disc(c, R.head, D.headR + 12, rgb(col)); c.restore();
    }
    limb(c, R.legB, D.limb, b);
    limb(c, R.armB, D.limb, b);
    strokePts(c, [R.hip, R.sh], D.torsoW + 2 * D.ol, OUT);
    strokePts(c, R.legF, D.limb + 2 * D.ol, OUT);
    strokePts(c, [R.hip, R.sh], D.torsoW, f);
    strokePts(c, R.legF, D.limb, f);
    if (hammer) drawHammer(c, hammer.g, hammer.a, hammer.col);
    limb(c, R.armF, D.limb, f);
    disc(c, R.head, D.headR + D.ol, OUT); disc(c, R.head, D.headR, f);
  }

  // ---------- paleta das novas referências (palco sépia, luz âmbar) ----------
  const PAL = { faz: [79, 191, 106], pensa: [242, 162, 58], dor: [229, 72, 59], luz: [255, 214, 160] };
  const SC = 0.6;
  const PANELS = { pensa: { top: 470, h: 405 }, faz: { top: 885, h: 405 } };
  const FL = 268;            // piso do píer (y local do painel)
  const EDGE = 470;          // borda do píer
  const SURF = FL + 22;      // superfície da água
  const RAMP0 = EDGE + 20;   // rampa submersa (para o "pensa demais" ir entrando aos poucos)
  const rampY = (x) => FL + clamp((x - RAMP0) / 330) * 230;

  // ---------- poses ----------
  const STAND_L = { fT: 0.06, fS: -0.02, bT: -0.1, bS: -0.06 };
  const CROUCH_L = { fT: 0.9, fS: -0.7, bT: 0.7, bS: -0.8 };
  const TUCK_L = { fT: 1.5, fS: -0.2, bT: 1.3, bS: -0.3 };
  const TOE_L = { fT: 0.75, fS: 0.85, bT: -0.12, bS: -0.1 };
  const SWIM_L = { fT: 0.5, fS: 0.2, bT: -0.4, bS: -0.2 };
  const mixL = (a, b, u) => ({ fT: lerp(a.fT, b.fT, u), fS: lerp(a.fS, b.fS, u), bT: lerp(a.bT, b.bT, u), bS: lerp(a.bS, b.bS, u) });
  const hipOn = (floor, L) => floor - D.limb * 0.5 - 2 - (D.thigh * Math.cos(L.fT) + D.shin * Math.cos(L.fS));
  const pose = (x, floor, L, lean, head, hands, extra) => Object.assign({ x, hipY: hipOn(floor, L), ay: floor, lean, head, legs: L, hands, prefF: 'down', prefB: 'down' }, extra || {});
  const handsDown = (x, hy) => [[x + 18, hy + 40], [x + 6, hy + 44]];
  const handsHug = (x, hy, j) => [[x + 26 + j, hy - 92], [x + 12 - j, hy - 86]];
  const handsChin = (x, hy) => [[x + 40, hy - 128], [x + 22, hy - 58]];
  const mixPose = (a, b, u) => ({ x: lerp(a.x, b.x, u), hipY: lerp(a.hipY, b.hipY, u), ay: lerp(a.ay ?? FL, b.ay ?? FL, u), lean: lerp(a.lean, b.lean, u), head: lerp(a.head, b.head, u), legs: mixL(a.legs, b.legs, u),
    hands: [P2(a.hands[0], b.hands[0], u), P2(a.hands[1], b.hands[1], u)], prefF: u > 0.5 ? b.prefF : a.prefF, prefB: u > 0.5 ? b.prefB : a.prefB });
  // trilha de poses por tempo: [[t, fn(t) -> pose], ...] com transições suaves de 0,35 s
  function seq(keys, t, tr = 0.35) {
    let i = 0; while (i < keys.length - 1 && t >= keys[i + 1][0]) i++;
    const cur = keys[i][1](t);
    if (i > 0 && t - keys[i][0] < tr) return mixPose(keys[i - 1][1](t), cur, easeInOut((t - keys[i][0]) / tr));
    return cur;
  }

  // ---------- FAZ: corre, pula, afunda, volta e nada tranquilo ----------
  const X0 = 300, JUMP_T = 3.25, SPLASH_F = 3.82, DEEP_X = 720;
  function fazState(t) {
    const stand = (tt) => { const hy = hipOn(FL, STAND_L); return pose(X0, FL, STAND_L, 0.03 + 0.01 * Math.sin(tt * 2), 0.05, handsDown(X0, hy)); };
    if (t < JUMP_T - 0.3) return stand(t);
    if (t < JUMP_T) { const u = easeInOut(seg(t, JUMP_T - 0.3, JUMP_T)); const p = mixPose(stand(t), pose(X0 + 20, FL, CROUCH_L, 0.45, 0.1, [[X0 - 30, hipOn(FL, CROUCH_L) - 10], [X0 - 50, hipOn(FL, CROUCH_L) - 4]]), u); return p; }
    if (t < SPLASH_F) {
      const u = seg(t, JUMP_T, SPLASH_F), x = lerp(X0 + 20, DEEP_X, u);
      const y = lerp(hipOn(FL, CROUCH_L), SURF + 40, u) - 150 * 4 * u * (1 - u);
      const L = mixL(CROUCH_L, TUCK_L, smooth(u * 1.6));
      return { x, hipY: y, ay: lerp(FL, SURF, u), lean: lerp(0.3, -0.1, u), head: 0, legs: L, hands: [[x + 40, y - 250], [x - 10, y - 240]], prefF: 'fwd', prefB: 'fwd' };
    }
    const d = t - SPLASH_F;
    // afunda e volta
    const sink = d < 0.5 ? 60 * Math.sin(Math.PI * d / 0.5) : 0;
    const bob = 4 * Math.sin(t * 3);
    const hy = SURF + 24 + sink + bob;
    const flail = smooth(seg(d, 0.4, 0.6)) * (1 - smooth(seg(d, 1.3, 1.8)));
    const stroke = smooth(seg(d, 1.6, 2.2));
    const ph = t * 3.2;
    const swimHands = [[DEEP_X + 70 + 30 * Math.cos(ph), hy - 108 + 18 * Math.sin(ph)], [DEEP_X + 50 + 30 * Math.cos(ph + Math.PI), hy - 104 + 18 * Math.sin(ph + Math.PI)]];
    const flailHands = [[DEEP_X + 60 + 20 * Math.sin(t * 22), hy - 190], [DEEP_X - 20 - 20 * Math.sin(t * 22), hy - 180]];
    const hands = d < 0.4 ? [[DEEP_X + 20, hy - 60], [DEEP_X, hy - 60]] : [P2(flailHands[0], swimHands[0], stroke), P2(flailHands[1], swimHands[1], stroke)];
    return { x: DEEP_X, hipY: hy, ay: SURF, lean: 0.05 - 0.15 * stroke, head: -0.05, legs: mixL(TUCK_L, SWIM_L, smooth(seg(d, 0.2, 0.8))), hands, prefF: 'down', prefB: 'down' };
  }

  // ---------- PENSA DEMAIS: pensa, molha o dedo, recua, conta até 3, entra em prestações ----------
  const PX = 400;
  const STEPS = [[9.5, 560, 'JOELHO'], [11.5, 640, 'CINTURA'], [14.0, 700, 'PEITO'], [16.6, 750, 'OMBRO']];
  const DIPS = [4.6, 7.9];
  function pensaState(t) {
    const at = (x) => rampY(x);
    const hyS = (x) => hipOn(at(x), STAND_L);
    const think = (x) => (tt) => pose(x, at(x), STAND_L, 0.02, 0.18 + 0.05 * Math.sin(tt * 1.7), handsChin(x, hyS(x)));
    const hug = (x) => (tt) => { const j = 4 * Math.sin(tt * 40) * (x > EDGE ? 1 : 0.3); return pose(x + 1.5 * Math.sin(tt * 37), at(x), STAND_L, 0.12, 0.25, handsHug(x, hyS(x), j)); };
    const toe = (x) => () => { const hy = hipOn(FL, TOE_L); return pose(x, FL, TOE_L, -0.05, 0.25, [[x + 20, hy - 40], [x - 30, hy - 20]], { prefB: 'back' }); };
    const recoil = (x) => () => pose(x - 40, FL, STAND_L, -0.25, -0.1, [[x - 10, hyS(x) - 170], [x - 70, hyS(x) - 160]], { prefF: 'fwd', prefB: 'back' });
    const keys = [[0, think(PX)], [DIPS[0] - 0.45, toe(PX + 40)], [DIPS[0] + 0.05, recoil(PX)], [DIPS[0] + 0.6, think(PX - 30)],
      [6.2, hug(PX - 30)], [DIPS[1] - 0.45, toe(PX + 40)], [DIPS[1] + 0.05, recoil(PX)], [DIPS[1] + 0.6, hug(PX)]];
    let prev = PX;
    for (const [ts, x] of STEPS) {
      keys.push([ts - 0.9, (tt) => { const u = easeInOut(seg(tt, ts - 0.9, ts)); const xx = lerp(prev, x, u); return pose(xx, at(xx), STAND_L, 0.15, 0.2, handsHug(xx, hyS(xx), 0)); }]);
      keys.push([ts, hug(x)]);
      prev = x;
    }
    return seq(keys, t);
  }

  // ---------- índice de dor (sinal 0..100) ----------
  const spike = (t, t0, a, k) => (t >= t0 ? a * Math.exp(-(t - t0) * k) : 0);
  function painFaz(t) { return spike(t, SPLASH_F, 100, 2.4) + (t >= SPLASH_F ? 3 * Math.exp(-(t - SPLASH_F) * 0.8) : 0); }
  function painPensa(t) {
    let p = t > 3.0 ? 7 + 1.5 * Math.sin(t * 2.3) : 4;
    for (const d of DIPS) p += spike(t, d, 28, 1.8);
    STEPS.forEach(([ts], i) => { p += spike(t, ts, 34 + i * 5, 1.4); });
    p += 14 * smooth(seg(t, 9.5, 17.5));
    return Math.min(100, p);
  }
  const PAINS = { faz: painFaz, pensa: painPensa };
  const GT1 = 19.0, NS = 760;
  const SERIES = {}, TOTAL = {};
  for (const k of ['faz', 'pensa']) {
    const arr = []; let acc = 0, accArr = [];
    for (let i = 0; i <= NS; i++) { const tt = (i / NS) * GT1; const v = PAINS[k](tt); arr.push(v); if (i) acc += v * (GT1 / NS); accArr.push(acc); }
    SERIES[k] = arr; TOTAL[k] = accArr;
  }
  const totalAt = (k, t) => TOTAL[k][Math.round(clamp(t / GT1) * NS)] * 1.0;
  const FINAL = { faz: TOTAL.faz[NS], pensa: TOTAL.pensa[NS] };
  const painSecs = (k) => { let n = 0; for (const v of SERIES[k]) if (v > 15) n++; return (n / NS) * GT1; };
  const SECS = { faz: painSecs('faz'), pensa: painSecs('pensa') };

  // ---------- desenho do painel ----------
  function drawStage(c, k, t, P) {
    const w = W, h = P.h;
    // fundo sépia + parede de madeira
    const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#1b130e'); g.addColorStop(0.6, '#33251b'); g.addColorStop(1, '#241a13');
    c.fillStyle = g; c.fillRect(0, 0, w, h);
    c.strokeStyle = 'rgba(0,0,0,0.25)'; c.lineWidth = 3;
    for (let x = -20; x < w; x += 92) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, FL); c.stroke(); }
    // holofote quente vindo do canto
    c.save(); c.globalCompositeOperation = 'lighter'; c.filter = 'blur(14px)';
    const bx = k === 'faz' ? DEEP_X - 120 : PX + 40;
    const bg = c.createLinearGradient(0, 0, 0, h); bg.addColorStop(0, rgb(PAL.luz, 1, 0.22)); bg.addColorStop(1, rgb(PAL.luz, 1, 0.05));
    c.fillStyle = bg; c.beginPath(); c.moveTo(bx - 40, -20); c.lineTo(bx + 40, -20); c.lineTo(bx + 220, h); c.lineTo(bx - 220, h); c.closePath(); c.fill();
    c.restore();
    // lâmpada
    c.fillStyle = '#e9cf9e'; c.beginPath(); c.ellipse(bx, 10, 44, 9, 0, 0, Math.PI * 2); c.fill();
    // píer
    c.fillStyle = '#6b4a30'; c.fillRect(-10, FL, EDGE + 10, 26); c.strokeStyle = OUT; c.lineWidth = 4; c.strokeRect(-10, FL, EDGE + 10, 26);
    for (let x = 30; x < EDGE; x += 70) { c.beginPath(); c.moveTo(x, FL); c.lineTo(x, FL + 26); c.stroke(); }
    c.fillStyle = '#4a3220'; for (const x of [60, 260, EDGE - 30]) { c.fillRect(x, FL + 26, 18, h); c.strokeRect(x, FL + 26, 18, h); }
    // placa de temperatura
    c.fillStyle = '#e8dcc6'; c.fillRect(150, FL - 110, 92, 46); c.strokeRect(150, FL - 110, 92, 46); c.fillRect(192, FL - 64, 8, 64); c.strokeRect(192, FL - 64, 8, 64);
    c.fillStyle = '#2b5c8a'; c.font = '800 26px Montserrat, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('4°C', 196, FL - 86);
  }
  function drawWaterBack(c, t) {
    const g = c.createLinearGradient(0, SURF, 0, SURF + 200); g.addColorStop(0, '#3f5f6e'); g.addColorStop(1, '#1d2b33');
    c.fillStyle = g; c.fillRect(EDGE, SURF, W - EDGE + 10, 220);
  }
  function drawWaterFront(c, t, k) {
    c.save(); c.globalAlpha = 0.78;
    const g = c.createLinearGradient(0, SURF, 0, SURF + 140); g.addColorStop(0, '#5a8494'); g.addColorStop(1, '#22343c');
    c.fillStyle = g;
    c.beginPath(); c.moveTo(EDGE, SURF + 4);
    for (let x = EDGE; x <= W + 10; x += 12) c.lineTo(x, SURF + 4 * Math.sin(x * 0.035 + t * 3));
    c.lineTo(W + 10, SURF + 240); c.lineTo(EDGE, SURF + 240); c.closePath(); c.fill();
    c.restore();
    c.strokeStyle = 'rgba(235,245,250,0.75)'; c.lineWidth = 3;
    c.beginPath(); for (let x = EDGE; x <= W + 10; x += 12) { const y = SURF + 4 * Math.sin(x * 0.035 + t * 3); if (x === EDGE) c.moveTo(x, y); else c.lineTo(x, y); } c.stroke();
    // respingos
    const hits = k === 'faz' ? [[SPLASH_F, DEEP_X + 40, 2.2]] : [...DIPS.map((d) => [d, PX + 120, 0.6]), ...STEPS.map(([ts, x]) => [ts, x + 60, 0.7])];
    for (const [t0, x, s] of hits) {
      const a = t - t0; if (a < 0 || a > 0.8) continue;
      c.save(); c.globalAlpha = 1 - a / 0.8; c.strokeStyle = '#e6f1f6'; c.lineWidth = 3;
      const r = (16 + 110 * easeOut(a / 0.8)) * s; c.beginPath(); c.ellipse(x, SURF + 4, r, r * 0.22, 0, 0, Math.PI * 2); c.stroke();
      for (let i = 0; i < 9 * s; i++) { const ang = Math.PI * (1.08 + 0.84 * i / (9 * s)), sp = 300 * Math.sqrt(s); c.fillStyle = '#e6f1f6'; c.beginPath(); c.arc(x + Math.cos(ang) * sp * a, SURF + Math.sin(ang) * sp * a + 1100 * a * a, 3 + 2 * s, 0, Math.PI * 2); c.fill(); }
      c.restore();
    }
  }
  function drawFig(c, k, t) {
    const st = k === 'faz' ? fazState(t) : pensaState(t);
    const col = PAL[k];
    c.save(); c.translate(0, 0);
    // escala do boneco em torno do pé
    const fx = st.x, fy = st.ay ?? FL;
    c.translate(fx, fy); c.scale(SC, SC); c.translate(-fx, -fy);
    const R = rigP(st);
    c.save(); c.globalAlpha = 0.5; c.filter = 'blur(9px)';
    for (const L of [R.legB, R.armB, R.legF, R.armF, [R.hip, R.sh]]) strokePts(c, L, D.limb + 22, rgb(col));
    disc(c, R.head, D.headR + 12, rgb(col)); c.restore();
    drawFigure(c, R, 1, null, null);
    // arrepio/suor do pensa demais
    if (k === 'pensa' && t > 9.5) for (let i = 0; i < 3; i++) { const a = ((t * 1.3 + i / 3) % 1); c.fillStyle = `rgba(200,230,255,${0.9 * (1 - a)})`; c.beginPath(); c.arc(R.head[0] + 34 + i * 6, R.head[1] - 20 + a * 60, 6, 0, Math.PI * 2); c.fill(); }
    c.restore();
    return { st, R, fx, fy };
  }
  function bubble(c, x, y, text, col, t0, t1, t) {
    if (t < t0 || t > t1) return;
    const a = smooth(seg(t, t0, t0 + 0.15)) * (1 - smooth(seg(t, t1 - 0.15, t1)));
    const sc = 1 + 0.35 * Math.exp(-(t - t0) * 14) * Math.cos((t - t0) * 30);
    c.save(); c.globalAlpha = a; c.translate(x, y); c.scale(sc, sc);
    c.font = '800 28px "Space Mono", monospace'; const tw = c.measureText(text).width;
    c.beginPath(); c.roundRect(-tw / 2 - 18, -26, tw + 36, 52, 12); c.fillStyle = '#f4ead8'; c.fill(); c.lineWidth = 4; c.strokeStyle = OUT; c.stroke();
    c.beginPath(); c.moveTo(-8, 24); c.lineTo(4, 44); c.lineTo(12, 24); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = '#f4ead8'; c.fillRect(-10, 20, 24, 6);
    c.fillStyle = col ? rgb(col) : '#1a120c'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(text, 0, 1);
    c.restore();
  }
  // monitor do índice de dor no pé do painel
  function drawMonitor(c, k, t, P) {
    const y0 = P.h - 66, hh = 56, x0 = 30, x1 = W - 30;
    c.fillStyle = 'rgba(10,7,5,0.82)'; c.fillRect(0, y0 - 8, W, hh + 16);
    c.strokeStyle = 'rgba(255,255,255,0.08)'; c.lineWidth = 1;
    for (let i = 1; i < 4; i++) { c.beginPath(); c.moveTo(x0, y0 + hh * i / 4); c.lineTo(x1, y0 + hh * i / 4); c.stroke(); }
    c.font = '700 18px "Space Mono", monospace'; c.textAlign = 'left'; c.textBaseline = 'top'; c.fillStyle = rgb(PAL.dor); c.fillText('ÍNDICE DE DOR', x0 + 4, y0 - 2);
    const n = Math.round(clamp(t / GT1) * NS);
    c.lineWidth = 4; c.strokeStyle = rgb(PAL.dor); c.lineJoin = 'round';
    c.beginPath();
    for (let i = 0; i <= n; i++) { const x = lerp(x0 + 210, x1 - 150, i / NS), y = y0 + hh - (SERIES[k][i] / 100) * (hh - 6); if (i === 0) c.moveTo(x, y); else c.lineTo(x, y); }
    c.stroke();
    if (n > 0 && t < GT1) { const x = lerp(x0 + 210, x1 - 150, n / NS), y = y0 + hh - (SERIES[k][n] / 100) * (hh - 6); c.save(); c.globalCompositeOperation = 'lighter'; disc(c, [x, y], 10, rgb(PAL.dor, 1, 0.6)); c.restore(); disc(c, [x, y], 5, '#fff'); }
    c.textAlign = 'right'; c.fillStyle = 'rgba(255,255,255,0.6)'; c.font = '700 16px "Space Mono", monospace'; c.fillText('DOR TOTAL', x1, y0 - 2);
    c.fillStyle = '#fff'; c.font = '800 30px Montserrat, sans-serif'; c.fillText(String(Math.round(totalAt(k, Math.min(t, GT1)))), x1, y0 + 20);
  }
  function drawPanel(c, k, t) {
    const P = PANELS[k];
    c.save(); c.translate(0, P.top); c.beginPath(); c.rect(0, 0, W, P.h); c.clip();
    // tremor no impacto
    const sh = k === 'faz' ? 10 * (t >= SPLASH_F ? Math.exp(-(t - SPLASH_F) * 8) : 0) : 0;
    c.translate(sh * Math.sin(t * 70), sh * Math.cos(t * 83));
    drawStage(c, k, t, P);
    drawWaterBack(c, t);
    const F = drawFig(c, k, t);
    drawWaterFront(c, t, k);
    // falas
    const hx = (x) => x + 10, hy = F.fy - 330 * SC;
    if (k === 'faz') {
      bubble(c, 400, 80, 'BORA.', PAL.faz, 2.75, 3.3, t);
      bubble(c, DEEP_X + 120, 150, 'AAAH!', PAL.dor, 4.05, 5.0, t);
      bubble(c, DEEP_X + 120, 150, 'TÁ ÓTIMA.', PAL.faz, 6.4, 9.0, t);
      bubble(c, DEEP_X + 120, 150, 'VEM!', PAL.faz, 12.0, 14.0, t);
    } else {
      bubble(c, 640, 60, 'E SE TIVER MUITO FRIA?', null, 3.1, 4.3, t);
      bubble(c, 640, 60, 'AI!', PAL.dor, DIPS[0] + 0.05, DIPS[0] + 0.9, t);
      bubble(c, 640, 60, 'VOU CONTAR ATÉ 3...', null, 5.6, 7.3, t);
      bubble(c, 640, 60, 'AI!', PAL.dor, DIPS[1] + 0.05, DIPS[1] + 0.9, t);
      STEPS.forEach(([ts, x, nm], i) => bubble(c, Math.min(900, x + 140), 110, i % 2 ? 'AI AI AI.' : `AI... ${nm}.`, PAL.dor, ts + 0.05, ts + 1.4, t));
    }
    drawMonitor(c, k, t, P);
    // rótulo do painel
    const nm = k === 'faz' ? '2 · FAZ' : '1 · PENSA DEMAIS';
    c.font = '700 22px "Space Mono", monospace'; const tw = c.measureText(nm).width;
    c.beginPath(); c.roundRect(18, 16, tw + 32, 38, 19); c.fillStyle = 'rgba(15,10,7,0.85)'; c.fill(); c.lineWidth = 3; c.strokeStyle = rgb(PAL[k]); c.stroke();
    c.fillStyle = rgb(PAL[k]); c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(nm, 34 + tw / 2, 36);
    // escurece quando vira relatório
    const dim = smooth(seg(t, GT1, GT1 + 0.5));
    if (dim > 0) { c.fillStyle = `rgba(8,5,3,${0.78 * dim})`; c.fillRect(0, 0, W, P.h); }
    c.restore();
    c.lineWidth = 5; c.strokeStyle = OUT; c.strokeRect(0, P.top, W, P.h);
  }
  // relatório final: as duas curvas lado a lado + dor total contando
  function drawReport(c, t) {
    const u = easeOut(seg(t, GT1 + 0.2, GT1 + 0.8)); if (u <= 0) return;
    const x0 = 70, x1 = W - 70, top = 520, h = 680;
    c.save(); c.globalAlpha = u; c.translate(0, 40 * (1 - u));
    c.beginPath(); c.roundRect(x0, top, x1 - x0, h, 26); c.fillStyle = 'rgba(22,15,10,0.96)'; c.fill(); c.lineWidth = 4; c.strokeStyle = rgb(PAL.luz, 0.8); c.stroke();
    c.font = '700 26px "Space Mono", monospace'; c.fillStyle = rgb(PAL.dor); c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('ÍNDICE DE DOR · RESULTADO', W / 2, top + 50);
    const rows = [['pensa', '1 · PENSA DEMAIS'], ['faz', '2 · FAZ']];
    rows.forEach(([k, nm], r) => {
      const ry = top + 110 + r * 290, gx0 = x0 + 40, gx1 = x1 - 40, gh = 130;
      c.textAlign = 'left'; c.fillStyle = rgb(PAL[k]); c.font = '700 24px "Space Mono", monospace'; c.fillText(nm, gx0, ry);
      c.strokeStyle = 'rgba(255,255,255,0.12)'; c.lineWidth = 1; c.strokeRect(gx0, ry + 24, gx1 - gx0, gh);
      const draw = easeInOut(seg(t, GT1 + 0.5 + r * 0.2, GT1 + 1.6 + r * 0.2));
      c.beginPath(); const n = Math.round(draw * NS);
      for (let i = 0; i <= n; i++) { const x = lerp(gx0, gx1, i / NS), y = ry + 24 + gh - (SERIES[k][i] / 100) * (gh - 8); if (i === 0) c.moveTo(x, y); else c.lineTo(x, y); }
      c.lineTo(lerp(gx0, gx1, n / NS), ry + 24 + gh); c.lineTo(gx0, ry + 24 + gh); c.closePath();
      c.fillStyle = rgb(PAL.dor, 1, 0.28); c.fill();
      c.beginPath(); for (let i = 0; i <= n; i++) { const x = lerp(gx0, gx1, i / NS), y = ry + 24 + gh - (SERIES[k][i] / 100) * (gh - 8); if (i === 0) c.moveTo(x, y); else c.lineTo(x, y); }
      c.lineWidth = 4; c.strokeStyle = rgb(PAL.dor); c.stroke();
      const cnt = Math.round(FINAL[k] * easeOut(seg(t, GT1 + 0.6 + r * 0.2, GT1 + 2.0 + r * 0.2)));
      c.textAlign = 'left'; c.fillStyle = 'rgba(255,255,255,0.65)'; c.font = '700 20px "Space Mono", monospace';
      { const n = Math.max(1, Math.round(SECS[k])); c.fillText(`DOEU ${n} SEGUNDO${n > 1 ? 'S' : ''}`, gx0, ry + gh + 56); }
      c.textAlign = 'right'; c.fillStyle = '#fff'; c.font = '900 54px Montserrat, sans-serif'; c.fillText(String(cnt), gx1, ry + gh + 60);
      c.font = '700 16px "Space Mono", monospace'; c.fillStyle = 'rgba(255,255,255,0.55)'; c.fillText('DOR TOTAL', gx1, ry + gh + 18);
    });
    c.restore();
  }

  // ---------- texto: palavras pulando ----------
  const CAPS = [
    { s: -1, e: 2.85, lines: [[-1, [['ÁGUA A 4 GRAUS.']]], [0.3, [['DOIS JEITOS DE '], ['ENTRAR.', 'dor']]]] },
    { s: 3.0, e: 5.5, lines: [[3.0, [['QUEM '], ['FAZ', 'faz']]], [3.3, [['PULA DE UMA VEZ.']]]] },
    { s: 5.6, e: 8.0, lines: [[5.6, [['DÓI MUITO.']]], [5.95, [['POR UM INSTANTE.']]]] },
    { s: 8.1, e: 10.5, lines: [[8.1, [['QUEM '], ['PENSA DEMAIS', 'pensa']]], [8.5, [['ENTRA EM PRESTAÇÕES.']]]] },
    { s: 10.6, e: 13.2, lines: [[10.6, [['CADA PASSO,']]], [10.95, [['UMA DOR NOVA.']]]] },
    { s: 13.3, e: 15.8, lines: [[13.3, [['O ÍNDICE DE '], ['DOR', 'dor']]], [13.7, [['NÃO MENTE.']]]] },
    { s: 15.9, e: 18.9, lines: [[15.9, [['QUEM PENSA DEMAIS']]], [16.3, [['SOFRE '], ['DUAS VEZES.', 'dor']]]] },
    { s: 19.1, e: 21.7, big: true, lines: [[19.2, [['PENSAR DEMAIS']]], [19.6, [['DÓI '], ['MAIS.', 'dor']]]] },
    { s: 21.8, e: 99, big: true, lines: [[21.8, [['PULA LOGO.']]], [22.15, [['O FRIO '], ['PASSA.', 'faz']]]] },
  ];
  const capEl = document.getElementById('cap');
  const capLines = capEl ? [capEl.querySelector('.l1'), capEl.querySelector('.l2')] : [];
  const WSTEP = 0.11;
  const wordsOf = (segs) => { const out = []; for (const [txt, col] of segs) for (const w of txt.split(' ')) if (w) out.push([w, col || '']); return out; };
  function renderCaptions(t) {
    if (!capEl) return;
    const cap = CAPS.find((c) => t >= c.s && t < c.e) || null;
    if (!cap) { capEl.style.opacity = '0'; return; }
    capEl.style.opacity = String(1 - smooth(seg(t, cap.e - 0.15, cap.e)));
    capEl.className = cap.big ? 'cap big' : 'cap';
    cap.lines.forEach(([ls, segs], i) => {
      capLines[i].innerHTML = wordsOf(segs).map(([w, col], j) => {
        const age = t - (ls + j * WSTEP);
        if (age < 0) return '';
        const sc = 1 + 0.55 * Math.exp(-age * 16) * Math.cos(age * 30), op = clamp(age / 0.06), y = 22 * Math.exp(-age * 18);
        return `<span class="w ${col ? 'c-' + col : ''}" style="opacity:${op.toFixed(3)};transform:translateY(${y.toFixed(1)}px) scale(${sc.toFixed(3)})">${w}</span>`;
      }).join(' ');
    });
    for (let i = cap.lines.length; i < capLines.length; i++) capLines[i].innerHTML = '';
  }

  function renderAt(t) {
    const c = ctx;
    c.setTransform(1, 0, 0, 1, 0, 0);
    const bg = c.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#0f0a07'); bg.addColorStop(0.5, '#1a120c'); bg.addColorStop(1, '#0a0705');
    c.fillStyle = bg; c.fillRect(0, 0, W, H);
    // gancho: zoom leve e tremor
    const k1 = t >= 1.5 ? Math.exp(-(t - 1.5) * 9) : 0;
    const z = lerp(1.06, 1, easeOut(seg(t, 1.5, 2.3)));
    c.setTransform(z, 0, 0, z, 540 - 540 * z + 12 * k1 * Math.sin(t * 70), 880 - 880 * z + 8 * k1 * Math.cos(t * 80));
    drawPanel(c, 'pensa', t);
    drawPanel(c, 'faz', t);
    c.setTransform(1, 0, 0, 1, 0, 0);
    drawReport(c, t);
    const top = c.createLinearGradient(0, 120, 0, 480); top.addColorStop(0, 'rgba(0,0,0,0.5)'); top.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = top; c.fillRect(0, 0, W, 480);
    renderCaptions(t);
  }

  const words = [];
  for (const cap of CAPS) for (const [ls, segs] of cap.lines) wordsOf(segs).forEach((w, j) => { const tt = ls + j * WSTEP; if (tt >= 0 && tt < cap.e) words.push(+tt.toFixed(3)); });
  window.__schedule = { slam: 1.5, jump: JUMP_T, splash: SPLASH_F, dips: DIPS, steps: STEPS.map((s) => s[0]), report: GT1, words,
    painFaz: SERIES.faz.filter((_, i) => i % 19 === 0).map((v) => +v.toFixed(1)), painPensa: SERIES.pensa.filter((_, i) => i % 19 === 0).map((v) => +v.toFixed(1)) };
  window.__renderAt = renderAt;
  window.addEventListener('hf-seek', (e) => renderAt(e.detail.time));
  renderAt(0);
})();
