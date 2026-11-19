// Pescar o peixe grande: Disciplina x Obsessão x Ego — 2D vetorial (bonecos de perfil com contorno), função pura do tempo.
// Regras do canal (@stick.obsessao): a OBSESSÃO sempre vence; preto + vermelho só na obsessão; texto digitando.
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
  const rnd = mulberry32(4411);
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
  const RED = [255, 74, 58];
  const HX = { disc: 105, obs: 445, ego: 780 };

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

  // ---------- vara de pesca ----------
  const WATER = FLOOR + 92;
  const BOB_X = { disc: 330, obs: 670, ego: 1000 };
  const BUCKET_X = { disc: 40, obs: 375, ego: 710 };
  const ROD = 235;
  const rodTip = (g, a) => { const d = dirA(a); return [g[0] + d[0] * ROD, g[1] + d[1] * ROD]; };
  function drawRod(c, g, a, bend) {
    const d = dirA(a), tip = rodTip(g, a), butt = [g[0] - d[0] * 40, g[1] - d[1] * 40];
    const mid = [(butt[0] + tip[0]) / 2 + (bend || 0) * 0.6 * d[1] * -1 * 0, (butt[1] + tip[1]) / 2 + (bend || 0) * 0.5];
    c.lineCap = 'round';
    c.lineWidth = 7 + 8; c.strokeStyle = OUT; c.beginPath(); c.moveTo(...butt); c.quadraticCurveTo(...mid, ...tip); c.stroke();
    c.lineWidth = 7; c.strokeStyle = '#a8a8b0'; c.beginPath(); c.moveTo(...butt); c.quadraticCurveTo(...mid, ...tip); c.stroke();
    // carretilha
    const rl = [g[0] - d[0] * 8 + d[1] * 14, g[1] - d[1] * 8 - d[0] * 14];
    disc(c, rl, 15, OUT); disc(c, rl, 10, '#c4c4cc');
    return tip;
  }
  function drawFigure(c, R, light, rod) {
    const f = rgb(mixC(DARK, WHITE, light)), b = rgb(mixC(DARKB, BACK, light));
    limb(c, R.legB, D.limb, b);
    limb(c, R.armB, D.limb, b);
    strokePts(c, [R.hip, R.sh], D.torsoW + 2 * D.ol, OUT);
    strokePts(c, R.legF, D.limb + 2 * D.ol, OUT);
    strokePts(c, [R.hip, R.sh], D.torsoW, f);
    strokePts(c, R.legF, D.limb, f);
    if (rod) drawRod(c, rod.g, rod.a, rod.bend);
    limb(c, R.armF, D.limb, f);
    disc(c, R.head, D.headR + D.ol, OUT); disc(c, R.head, D.headR, f);
  }
  function drawFish(c, p, ang, size, red, lit) {
    c.save(); c.translate(p[0], p[1]); c.rotate(ang); c.scale(size, size);
    c.beginPath(); c.moveTo(34, 0); c.quadraticCurveTo(10, -22, -22, -6); c.lineTo(-40, -18); c.lineTo(-36, 0); c.lineTo(-40, 18); c.lineTo(-22, 6); c.quadraticCurveTo(10, 22, 34, 0); c.closePath();
    c.fillStyle = red ? rgb(RED) : rgb([200, 200, 206], lit); c.fill(); c.lineWidth = 4 / size + 1.5; c.strokeStyle = OUT; c.stroke();
    c.beginPath(); c.arc(20, -4, 3.5, 0, Math.PI * 2); c.fillStyle = OUT; c.fill();
    c.fillStyle = 'rgba(255,255,255,0.4)'; c.beginPath(); c.ellipse(4, -7, 12, 3.5, -0.2, 0, Math.PI * 2); c.fill();
    c.restore();
  }
  function drawBucket(c, k, n, lit) {
    const x = BUCKET_X[k], y = FLOOR;
    c.beginPath(); c.moveTo(x - 34, y - 70); c.lineTo(x + 34, y - 70); c.lineTo(x + 27, y); c.lineTo(x - 27, y); c.closePath();
    c.fillStyle = rgb([150, 150, 156], lit); c.fill(); c.lineWidth = 4.5; c.strokeStyle = OUT; c.stroke();
    c.lineWidth = 4; c.beginPath(); c.arc(x, y - 70, 34, Math.PI, 0); c.stroke();
    for (let i = 0; i < Math.min(n, 5); i++) drawFish(c, [x - 16 + i * 8, y - 76 - (i % 2) * 6], -1.2 + i * 0.5, 0.45, false, lit);
  }

  // ---------- pescando ----------
  const FISH_L = { fT: 0.14, fS: -0.03, bT: -0.16, bS: -0.1 };
  const STAND_L = { fT: 0.06, fS: -0.02, bT: -0.1, bS: -0.06 };
  const SIT_L = { fT: 2.3, fS: 0.8, bT: 2.15, bS: 0.7 };
  const mixL = (a, b, u) => ({ fT: lerp(a.fT, b.fT, u), fS: lerp(a.fS, b.fS, u), bT: lerp(a.bT, b.bT, u), bS: lerp(a.bS, b.bS, u) });
  const T0 = 2.6;
  const RUN = { ego: { P: 0.6, end: 5.0 }, disc: { P: 0.68, end: 9.4 }, obs: { P: 0.55, end: 14.8 } };
  const PAY = 14.8;
  const catches = (k, t) => Math.max(0, Math.floor((Math.min(t, RUN[k].end) - T0) / RUN[k].P + 0.08));
  // ciclo: recolhe para trás → arremessa → espera → puxa (peixe sai)
  function rodKey(hx, hy, ph) {
    const keys = [[0, -0.15, 0.55], [0.22, -0.55, 0.0], [0.38, 1.05, 0.9], [0.84, 0.95, 0.9], [1.0, 0.55, 0.55]];
    let i = 0; while (i < keys.length - 2 && ph >= keys[i + 1][0]) i++;
    const [p0, a0, c0] = keys[i], [p1, a1, c1] = keys[i + 1];
    const raw = (ph - p0) / (p1 - p0), u = i === 1 ? easeIn(raw) : easeInOut(raw);
    const a = lerp(a0, a1, u) + (ph > 0.38 && ph < 0.84 ? 0.03 * Math.sin(ph * 60) : 0);
    return { a, cast: lerp(c0, c1, u) };
  }
  function fishState(k, t) {
    const x = HX[k], hy = standHipY(FISH_L);
    let a = 0.55, cast = 0.55, lean = 0.08;
    if (t >= T0 && t < RUN[k].end) { const ph = ((t - T0) / RUN[k].P) % 1; const r = rodKey(x, hy, ph); a = r.a; cast = r.cast; lean = 0.06 - 0.12 * Math.min(0, a) + 0.08 * (a > 0.8 ? 1 : 0); }
    else if (t < T0) { a = 0.55 + 0.05 * Math.sin(t * 2.4); }
    const g = [x + 46, hy - 62 - 30 * Math.max(0, -a)];
    const d = dirA(a);
    return { x, hipY: hy, lean, head: 0.15, legs: FISH_L, hands: [[g[0] + d[0] * 12, g[1] + d[1] * 12], [g[0] - d[0] * 26, g[1] - d[1] * 26]], rod: { g, a, cast }, prefF: 'down', prefB: 'down' };
  }
  function egoState(t) {
    const end = RUN.ego.end;
    if (t < end) return fishState('ego', t);
    const x = HX.ego, last = fishState('ego', end - 1e-3);
    const u = easeInOut(seg(t, end, end + 0.5)), hy0 = standHipY(STAND_L);
    const slump = { x, hipY: lerp(last.hipY, hy0, u), lean: lerp(last.lean, 0.38, u), head: lerp(0.15, 0.5, u), legs: mixL(FISH_L, STAND_L, u),
      hands: [P2(last.hands[0], [x + 18, hy0 + 40], u), P2(last.hands[1], [x + 6, hy0 + 44], u)], prefF: 'down', prefB: 'down' };
    const s = easeInOut(seg(t, 5.6, 6.4));
    if (s <= 0) return slump;
    return { x: x - 40 * s, hipY: lerp(slump.hipY, FLOOR - 17, s), lean: lerp(0.38, 0.42, s), head: lerp(0.5, 0.75, s), legs: mixL(STAND_L, SIT_L, s),
      hands: [P2(slump.hands[0], [x + 60 - 40 * s, FLOOR - 62], s), P2(slump.hands[1], [x + 48 - 40 * s, FLOOR - 58], s)], prefF: 'down', prefB: 'down' };
  }
  function egoRod(t) {
    const end = RUN.ego.end; if (t < end) return null;
    const last = fishState('ego', end - 1e-3).rod, u = easeIn(seg(t, end, end + 0.4));
    return { g: P2(last.g, [HX.ego + 80, FLOOR - 14], u), a: lerp(last.a, 1.48, u), cast: 0 };
  }
  function discState(t) {
    const end = RUN.disc.end;
    if (t < end) return fishState('disc', t);
    const x = HX.disc, last = fishState('disc', end - 1e-3);
    const u = easeInOut(seg(t, end, end + 0.5)), hy0 = standHipY(STAND_L);
    const rod = { g: P2(last.rod.g, [x + 62, FLOOR - 40], u), a: lerp(last.rod.a, 0.05, u), cast: lerp(last.rod.cast, 0, u) };
    const d = dirA(rod.a), onRod = [[rod.g[0] + d[0] * 12, rod.g[1] + d[1] * 12], [rod.g[0] - d[0] * 26, rod.g[1] - d[1] * 26]];
    const hipsU = easeInOut(seg(t, end + 0.55, end + 0.95));
    const hips = [[x + 16, hy0 - 16], [x + 6, hy0 - 20]];
    return { x, hipY: lerp(last.hipY, hy0, u), lean: lerp(last.lean, -0.03, u), head: lerp(0.15, -0.1, u), legs: mixL(FISH_L, STAND_L, u),
      hands: hipsU > 0 ? [P2(onRod[0], hips[0], hipsU), P2(onRod[1], hips[1], hipsU)] : [P2(last.hands[0], onRod[0], u), P2(last.hands[1], onRod[1], u)],
      rod: hipsU > 0.02 ? Object.assign({}, rod, { loose: true }) : rod, prefF: hipsU > 0.3 ? 'back' : 'down', prefB: hipsU > 0.3 ? 'back' : 'down' };
  }
  // obsessão: fisga o peixe gigante e ergue a vara
  function obsState(t) {
    if (t < PAY - 0.6) return fishState('obs', t);
    const x = HX.obs, hy = standHipY(FISH_L);
    const pull = easeInOut(seg(t, PAY - 0.6, PAY)), up = easeOut(seg(t, PAY, PAY + 0.5));
    const a = lerp(lerp(0.95, 0.15, pull), -0.05, up);
    const g = [x + 46 - 14 * pull, hy - 62 - 120 * up];
    const d = dirA(a);
    const shake = t < PAY ? 0.04 * Math.sin(t * 50) : 0;
    return { x, hipY: hy - 6 * Math.sin(Math.PI * seg(t, PAY + 0.1, PAY + 0.5)), lean: lerp(0.15, -0.12, Math.max(pull, up)) + shake, head: lerp(0.15, -0.3, up), legs: FISH_L,
      hands: [[g[0] + d[0] * 12, g[1] + d[1] * 12], [g[0] - d[0] * 26, g[1] - d[1] * 26]], rod: { g, a, cast: 1, bend: 60 * pull * (1 - 0.6 * up) }, prefF: 'down', prefB: 'down', big: true };
  }
  const stateOf = { disc: discState, obs: obsState, ego: egoState };
  const PULLS = { ego: [], disc: [], obs: [] };
  for (const k of ['ego', 'disc', 'obs']) for (let n = 0; ; n++) { const ts = T0 + RUN[k].P * (n + 0.9); if (ts >= RUN[k].end) break; PULLS[k].push(+ts.toFixed(3)); }
  const CASTS = { ego: [], disc: [], obs: [] };
  for (const k of ['ego', 'disc', 'obs']) for (let n = 0; ; n++) { const ts = T0 + RUN[k].P * (n + 0.38); if (ts >= RUN[k].end) break; CASTS[k].push(+ts.toFixed(3)); }

  // linha, boia e peixes pulando para o balde
  function drawLine(c, k, t, st) {
    if (!st.rod || st.rod.loose) return null;
    const tip = rodTip(st.rod.g, st.rod.a);
    const water = [BOB_X[k], WATER + 4 + 4 * Math.sin(t * 3 + BOB_X[k])];
    const hang = [tip[0] + 6, tip[1] + 46];
    let end = P2(hang, water, clamp(st.rod.cast));
    if (st.big) end = bigFishPos(t);
    const m = [(tip[0] + end[0]) / 2, Math.max(tip[1], end[1]) + (st.big ? -20 : 30) * (1 - clamp(st.rod.cast) * 0.5)];
    c.lineWidth = 2.5; c.strokeStyle = 'rgba(235,235,240,0.85)'; c.beginPath(); c.moveTo(...tip); c.quadraticCurveTo(...m, ...end); c.stroke();
    if (!st.big && st.rod.cast > 0.85) { disc(c, end, 9, OUT); disc(c, end, 6, '#f2f2f2'); c.fillStyle = rgb(RED, 1, k === 'obs' ? 1 : 0); }
    return end;
  }
  function bigFishPos(t) {
    const u = easeOut(seg(t, PAY - 0.15, PAY + 0.5));
    const x = HX.obs + 46 + 200 * (1 - u) + 60 * u, y = lerp(WATER + 30, FLOOR - 470, u) + 10 * Math.sin((t - PAY) * 5) * smooth(seg(t, PAY + 0.5, PAY + 0.8));
    return [x, y];
  }
  function drawJumps(c, k, t, lit) {
    for (const t0 of PULLS[k]) {
      const a = t - t0; if (a < 0 || a > 0.5) continue;
      const u = a / 0.5;
      const p = [lerp(BOB_X[k], BUCKET_X[k], u), lerp(WATER, FLOOR - 80, u) - 260 * 4 * u * (1 - u)];
      drawFish(c, p, -0.6 + u * 4.5, 0.7, false, lit);
    }
  }
  function drawSplash(c, k, t) {
    const list = [...CASTS[k].map((x) => [x + 0.06, 1]), ...PULLS[k].map((x) => [x, 0.7])];
    if (k === 'obs') list.push([PAY - 0.1, 3]);
    for (const [t0, s] of list) {
      const a = t - t0; if (a < 0 || a > 0.6) continue;
      const x = BOB_X[k], r = (16 + 90 * easeOut(a / 0.6)) * s;
      c.save(); c.globalAlpha = 1 - a / 0.6; c.lineWidth = 3; c.strokeStyle = 'rgba(230,236,242,0.8)';
      c.beginPath(); c.ellipse(x, WATER + 6, r, r * 0.22, 0, 0, Math.PI * 2); c.stroke();
      for (let i = 0; i < 5 * s; i++) { const ang = Math.PI * (1.15 + i * 0.7 / (5 * s)), sp = 260 * Math.sqrt(s); disc(c, [x + Math.cos(ang) * sp * a, WATER + Math.sin(ang) * sp * a + 900 * a * a], 4 * Math.sqrt(s), 'rgba(230,236,242,0.9)'); }
      c.restore();
    }
  }
  function drawWaterBand(c, t) {
    const g = c.createLinearGradient(0, WATER, 0, WATER + 500); g.addColorStop(0, '#2a2c31'); g.addColorStop(1, '#0c0d10');
    c.fillStyle = g; c.fillRect(-400, WATER, W + 800, 900);
    c.lineWidth = 3; c.strokeStyle = 'rgba(255,255,255,0.22)';
    c.beginPath(); for (let x = -400; x <= W + 400; x += 12) { const y = WATER + 4 * Math.sin(x * 0.03 + t * 2.4); if (x === -400) c.moveTo(x, y); else c.lineTo(x, y); } c.stroke();
    c.strokeStyle = 'rgba(255,255,255,0.08)';
    for (let r = 1; r < 5; r++) { c.beginPath(); for (let x = -400; x <= W + 400; x += 16) { const y = WATER + r * 48 + 3 * Math.sin(x * 0.025 - t * 1.8 + r); if (x === -400) c.moveTo(x, y); else c.lineTo(x, y); } c.stroke(); }
    // píer
    c.fillStyle = '#3a393e'; c.fillRect(-400, FLOOR, W + 800, 22);
    c.lineWidth = 4; c.strokeStyle = OUT; c.strokeRect(-400, FLOOR, W + 800, 22);
    for (let x = -380; x < W + 400; x += 64) { c.lineWidth = 3; c.beginPath(); c.moveTo(x, FLOOR); c.lineTo(x, FLOOR + 22); c.stroke(); }
    for (const x of [20, 250, 470, 690, 900]) { c.fillStyle = '#2e2d32'; c.fillRect(x - 10, FLOOR + 22, 20, WATER - FLOOR + 40); c.strokeRect(x - 10, FLOOR + 22, 20, WATER - FLOOR + 40); }
  }

  // plateia do ego
  const crowdX = [612, 660, 708, 1020, 1060];
  function drawCrowd(c, t) {
    for (let i = 0; i < crowdX.length; i++) {
      const show = smooth(seg(t, 2.6 + i * 0.07, 2.9 + i * 0.07)) * (1 - smooth(seg(t, 4.75 + i * 0.06, 5.0 + i * 0.06)));
      if (show <= 0.01) continue;
      const ph = i * 1.7, cheer = t < 4.8 ? Math.abs(Math.sin((t + ph) * 7)) * 8 : 0;
      c.save(); c.globalAlpha = show; c.translate(crowdX[i], FLOOR - 4 - cheer);
      c.lineWidth = 3; c.strokeStyle = 'rgba(255,255,255,0.75)'; c.fillStyle = '#121214';
      c.beginPath(); c.arc(0, -40, 11, 0, Math.PI * 2); c.fill(); c.stroke();
      c.beginPath(); c.moveTo(-17, 0); c.quadraticCurveTo(-17, -24, 0, -24); c.quadraticCurveTo(17, -24, 17, 0); c.fill(); c.stroke();
      if (t < 4.8 && Math.sin((t + ph) * 3) > 0.2) { c.beginPath(); c.arc(0, -66, 7, 0.15 * Math.PI, 0.85 * Math.PI); c.stroke(); }
      c.restore();
    }
  }
  function drawMeta(c, t) {
    const hit = t >= RUN.disc.end;
    const flash = hit ? Math.exp(-(t - RUN.disc.end) * 4) : 0;
    const label = hit ? 'META ✓' : 'META 10';
    c.font = '700 22px "Space Mono", monospace'; const tw = c.measureText(label).width;
    const px = BOB_X.disc - (tw + 26) / 2 - 4, py = FLOOR - 220;
    c.fillStyle = `rgba(${Math.round(20 + 200 * flash)},${Math.round(20 + 200 * flash)},${Math.round(22 + 200 * flash)},0.92)`;
    c.beginPath(); c.roundRect(px, py, tw + 26, 36, 18); c.fill();
    c.lineWidth = 2.5; c.strokeStyle = 'rgba(255,255,255,0.8)'; c.stroke();
    c.fillStyle = flash > 0.5 ? '#111' : '#f2f2f2'; c.textAlign = 'left'; c.textBaseline = 'middle'; c.fillText(label, px + 13, py + 19);
  }

  // ---------- luz ----------
  const level = {
    disc: track([[0, 0.9], [2.6, 0.9], [2.85, 0.6], [6.5, 0.6], [6.8, 1.0], [10.4, 1.0], [10.9, 0.45]]),
    obs: track([[0, 0.9], [2.6, 0.9], [2.85, 0.6], [10.4, 0.6], [10.7, 1.1], [14.7, 1.1], [14.85, 1.5], [16.2, 1.25]]),
    ego: track([[0, 0.9], [2.6, 0.9], [2.85, 1.1], [4.9, 1.1], [5.0, 1.0], [5.7, 0.08]]),
  };

  // ---------- câmera ----------
  function camAt(t) {
    const hookU = easeOut(seg(t, 1.5, 2.4));
    let s = lerp(1.08, 1.0, hookU);
    const f = P2([540, 900], [540, 960], hookU), sf = P2([540, 960], [540, 960], hookU);
    let ox = sf[0] - f[0] * s, oy = sf[1] - f[1] * s;
    const w = easeInOut(seg(t, 14.9, 16.1));
    if (w > 0) { const s2 = 0.94, fx = 540, fy = FLOOR; ox = lerp(ox, 540 - fx * s2, w); oy = lerp(oy, 1090 - fy * s2, w); s = lerp(s, s2, w); }
    const k1 = t >= 1.5 ? Math.exp(-(t - 1.5) * 9) : 0, k2 = t >= PAY ? Math.exp(-(t - PAY) * 6) : 0;
    ox += 15 * k1 * Math.sin((t - 1.5) * 70) + 18 * k2 * Math.sin((t - PAY) * 64);
    oy += 10 * k1 * Math.cos((t - 1.5) * 83) + 14 * k2 * Math.cos((t - PAY) * 77);
    return { s, ox, oy };
  }
  const toScreen = (p, C) => [p[0] * C.s + C.ox, p[1] * C.s + C.oy];

  // ---------- texto digitando ----------
  const CPS = 26;
  const CAPS = [
    { s: -1, e: 2.45, lines: [[-1, [['TRÊS PESCAM.']]], [0.32, [['SÓ '], ['UM', 1], [' PEGA O GIGANTE.']]]] },
    { s: 2.6, e: 4.55, lines: [[2.6, [['O EGO PESCA']]], [3.05, [['PRA SER VISTO.']]]] },
    { s: 4.65, e: 6.55, lines: [[4.65, [['SEM PLATEIA,']]], [5.15, [['DESISTE.']]]] },
    { s: 6.65, e: 8.6, lines: [[6.65, [['A DISCIPLINA']]], [7.15, [['PESCA NO RITMO.']]]] },
    { s: 8.7, e: 10.5, lines: [[8.7, [['BATE A META']]], [9.2, [['E PARA.']]]] },
    { s: 10.6, e: 12.6, lines: [[10.6, [['A '], ['OBSESSÃO', 1]]], [11.1, [['PASSA DA META.']]]] },
    { s: 12.7, e: 14.7, lines: [[12.7, [['E CONTINUA']]], [13.15, [['PESCANDO.']]]] },
    { s: 14.85, e: 99, big: true, lines: [[14.85, [['A '], ['OBSESSÃO', 1], [' VENCE.']]]] },
  ];
  const capEl = document.getElementById('cap');
  const capLines = capEl ? [capEl.querySelector('.l1'), capEl.querySelector('.l2')] : [];
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const lenOf = (segs) => segs.reduce((a, s) => a + s[0].length, 0);
  function typeLine(segs, n) {
    let out = '', left = n;
    for (const [txt, red] of segs) { if (left <= 0) break; const part = esc(txt.slice(0, left)); left -= txt.length; out += red ? `<span class="hl">${part}</span>` : part; }
    return out;
  }
  function renderCaptions(t) {
    if (!capEl) return;
    const cap = CAPS.find((c) => t >= c.s && t < c.e) || null;
    if (!cap) { capEl.style.opacity = '0'; return; }
    capEl.style.opacity = String(1 - smooth(seg(t, cap.e - 0.18, cap.e)));
    capEl.className = cap.big ? 'cap big' : 'cap';
    let cursorLine = -1;
    cap.lines.forEach(([ls, segs], i) => {
      const n = Math.floor((t - ls) * CPS), total = lenOf(segs);
      if (n >= 0 && n < total + 12) cursorLine = i;
      capLines[i].innerHTML = typeLine(segs, clamp(n, 0, total));
    });
    for (let i = cap.lines.length; i < capLines.length; i++) capLines[i].innerHTML = '';
    if (cursorLine >= 0 && Math.floor(t * 3.2) % 2 === 0) capLines[cursorLine].innerHTML += '<span class="cur"></span>';
  }
  const hud = {}; for (const k of ['disc', 'obs', 'ego']) hud[k] = document.getElementById('n-' + k);
  const fmt = (n) => Math.floor(n).toLocaleString('pt-BR');

  // ---------- desenho ----------
  function drawObjects(c, t, lv) {
    drawWaterBand(c, t);
    drawCrowd(c, t);
    const aura = smooth(seg(t, 10.6, 12.0)) * 0.45 + 0.55 * smooth(seg(t, PAY, PAY + 0.6));
    if (aura > 0) {
      const R0 = rigP(obsState(t));
      c.save(); c.globalCompositeOperation = 'lighter';
      const g = c.createRadialGradient(R0.sh[0] + 60, R0.sh[1], 0, R0.sh[0] + 60, R0.sh[1], 340);
      g.addColorStop(0, rgb(RED, 1, 0.3 * aura)); g.addColorStop(1, rgb(RED, 1, 0));
      c.fillStyle = g; c.beginPath(); c.arc(R0.sh[0] + 60, R0.sh[1], 340, 0, Math.PI * 2); c.fill(); c.restore();
    }
    for (const k of ['disc', 'obs', 'ego']) { const lit = k === 'ego' ? lerp(1, 0.5, smooth(seg(t, 5.2, 5.8))) : 1; drawBucket(c, k, catches(k, t), lit); drawSplash(c, k, t); }
    drawMeta(c, t);
    const er = egoRod(t); if (er) drawRod(c, er.g, er.a, 0);
    for (const k of ['disc', 'ego', 'obs']) {
      const st = stateOf[k](t);
      const light = clamp(0.3 + 0.7 * Math.min(1, lv[k] / 0.85));
      c.save(); c.translate(st.x + 10, FLOOR + 2); c.scale(1, 0.16);
      const sg = c.createRadialGradient(0, 0, 0, 0, 0, 80); sg.addColorStop(0, 'rgba(0,0,0,0.5)'); sg.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = sg; c.beginPath(); c.arc(0, 0, 80, 0, Math.PI * 2); c.fill(); c.restore();
      const R = rigP(st);
      if (st.rod && st.rod.loose) { drawRod(c, st.rod.g, st.rod.a, 0); drawFigure(c, R, light, null); }
      else drawFigure(c, R, light, st.rod);
      drawLine(c, k, t, st);
      drawJumps(c, k, t, light);
      if (st.big && t > PAY - 0.15) { const p = bigFishPos(t); drawFish(c, [p[0], p[1] + 96], Math.PI / 2 + 0.15 * Math.sin((t - PAY) * 4), 3.3 * easeOut(seg(t, PAY - 0.15, PAY + 0.3)) + 0.01, true, 1); }
    }
  }
  function beamS(c, x, yb, a) {
    c.save(); c.filter = 'blur(12px)';
    const g = c.createLinearGradient(0, -60, 0, yb); g.addColorStop(0, `rgba(255,252,246,${a})`); g.addColorStop(1, `rgba(255,252,246,${a * 0.35})`);
    c.fillStyle = g; c.beginPath(); c.moveTo(x - 26, -60); c.lineTo(x + 26, -60); c.lineTo(x + 175, yb); c.lineTo(x - 175, yb); c.closePath(); c.fill(); c.restore();
  }

  function renderAt(t) {
    const C = camAt(t);
    const lv = { disc: level.disc(t), obs: level.obs(t), ego: level.ego(t) };
    lc.setTransform(1, 0, 0, 1, 0, 0); lc.clearRect(0, 0, W, H); lc.setTransform(C.s, 0, 0, C.s, C.ox, C.oy);
    drawObjects(lc, t, lv);

    const c = ctx;
    c.setTransform(1, 0, 0, 1, 0, 0);
    const bg = c.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#060607'); bg.addColorStop(0.45, '#232224'); bg.addColorStop(1, '#0c0c0d');
    c.fillStyle = bg; c.fillRect(0, 0, W, H);
    c.setTransform(C.s, 0, 0, C.s, C.ox, C.oy);
    c.save(); c.filter = 'blur(22px)'; c.fillStyle = 'rgba(255,250,240,0.04)';
    c.beginPath(); c.moveTo(-300, -500); c.lineTo(-120, -500); c.lineTo(760, FLOOR); c.lineTo(140, FLOOR); c.closePath(); c.fill();
    c.beginPath(); c.moveTo(1200, -500); c.lineTo(1380, -500); c.lineTo(940, FLOOR); c.lineTo(320, FLOOR); c.closePath(); c.fill(); c.restore();
    // reflexo no chão
    c.setTransform(1, 0, 0, 1, 0, 0);
    const floorS = toScreen([0, FLOOR], C)[1];
    c.save(); c.beginPath(); c.rect(0, floorS, W, H - floorS); c.clip();
    c.globalAlpha = 0.16; c.translate(0, 2 * floorS); c.scale(1, -1); c.drawImage(layer, 0, 0); c.restore();
    c.drawImage(layer, 0, 0);
    c.save(); c.globalCompositeOperation = 'lighter';
    for (const k of ['disc', 'obs', 'ego']) {
      const fl = toScreen([HX[k] + 120, FLOOR + 10], C);
      const a = 0.12 * Math.min(1.4, lv[k]);
      if (a > 0.004) beamS(c, fl[0], fl[1], a);
    }
    c.restore();
    const top = c.createLinearGradient(0, 120, 0, 560); top.addColorStop(0, 'rgba(0,0,0,0.6)'); top.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = top; c.fillRect(0, 0, W, 560);
    const bot = c.createLinearGradient(0, 1100, 0, 1340); bot.addColorStop(0, 'rgba(0,0,0,0)'); bot.addColorStop(0.5, 'rgba(0,0,0,0.6)'); bot.addColorStop(1, 'rgba(0,0,0,0.75)');
    c.fillStyle = bot; c.fillRect(0, 1100, W, H - 1100);
    const ui = c.createLinearGradient(0, 1300, 0, 1420); ui.addColorStop(0, 'rgba(4,4,5,0)'); ui.addColorStop(1, 'rgba(4,4,5,0.94)');
    c.fillStyle = ui; c.fillRect(0, 1300, W, H - 1300);

    renderCaptions(t);
    if (hud.disc) hud.disc.textContent = t >= RUN.disc.end ? `${catches('disc', t)} ✓` : `${catches('disc', t)}`;
    if (hud.obs) hud.obs.textContent = t >= PAY ? `${catches('obs', t)} + 1` : `${catches('obs', t)}`;
    if (hud.ego) hud.ego.textContent = `${catches('ego', t)}`;
    const egoLab = document.getElementById('lab-ego'); if (egoLab) egoLab.style.opacity = String(1 - 0.6 * smooth(seg(t, 5.2, 5.8)));
    const discLab = document.getElementById('lab-disc'); if (discLab) discLab.style.opacity = String(1 - 0.4 * smooth(seg(t, 10.6, 11.2)));
  }

  const typing = [];
  for (const cap of CAPS) for (const [ls, segs] of cap.lines) { const total = lenOf(segs); const txt = segs.map((s) => s[0]).join(''); for (let i = 0; i < total; i++) { const tt = ls + (i + 1) / CPS; if (tt >= 0 && tt < cap.e && txt[i] !== ' ') typing.push(+tt.toFixed(3)); } }
  window.__schedule = { slam: 1.5, egoQuit: RUN.ego.end, egoSit: 6.4, meta: RUN.disc.end, payoff: PAY, pulls: PULLS, casts: CASTS, crowd: [2.6, 4.75], typing };
  window.__renderAt = renderAt;
  window.addEventListener('hf-seek', (e) => renderAt(e.detail.time));
  renderAt(0);
})();
