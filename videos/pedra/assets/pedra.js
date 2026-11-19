// Quebrar a pedra: Disciplina x Obsessão x Ego — 2D vetorial (bonecos de perfil com contorno), função pura do tempo.
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
  const rnd = mulberry32(6611);
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
  const HX = { disc: 60, obs: 405, ego: 750 };
  const BR = 86;
  const BCX = (k) => HX[k] + 215, BCY = FLOOR - 83;

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
  function drawHammer(c, g, a) {
    const { end, head, d } = hammerPts(g, a);
    strokePts(c, [end, head], 10 + 8, OUT); strokePts(c, [end, head], 10, '#9a9aa2');
    c.save(); c.translate(head[0], head[1]); c.rotate(Math.atan2(d[1], d[0]));
    c.beginPath(); c.roundRect(-16, -27, 36, 54, 6); c.fillStyle = '#c4c4cc'; c.fill(); c.lineWidth = 4.5; c.strokeStyle = OUT; c.stroke();
    c.fillStyle = 'rgba(255,255,255,0.45)'; c.fillRect(-11, -22, 6, 44);
    c.restore();
  }
  function drawFigure(c, R, light, hammer) {
    const f = rgb(mixC(DARK, WHITE, light)), b = rgb(mixC(DARKB, BACK, light));
    limb(c, R.legB, D.limb, b);
    limb(c, R.armB, D.limb, b);
    strokePts(c, [R.hip, R.sh], D.torsoW + 2 * D.ol, OUT);
    strokePts(c, R.legF, D.limb + 2 * D.ol, OUT);
    strokePts(c, [R.hip, R.sh], D.torsoW, f);
    strokePts(c, R.legF, D.limb, f);
    if (hammer) drawHammer(c, hammer.g, hammer.a);
    limb(c, R.armF, D.limb, f);
    disc(c, R.head, D.headR + D.ol, OUT); disc(c, R.head, D.headR, f);
  }

  // ---------- golpes ----------
  const SWING_L = { fT: 0.3, fS: -0.04, bT: -0.24, bS: -0.16 };
  const STAND_L = { fT: 0.06, fS: -0.02, bT: -0.1, bS: -0.06 };
  const SIT_L = { fT: 2.3, fS: 0.8, bT: 2.15, bS: 0.7 };
  const mixL = (a, b, u) => ({ fT: lerp(a.fT, b.fT, u), fS: lerp(a.fS, b.fS, u), bT: lerp(a.bT, b.bT, u), bS: lerp(a.bS, b.bS, u) });
  const KEYS = {
    READY: (hx, hy) => ({ g: [hx + 56, hy + 18], a: 2.5, lean: 0.12, dip: 0 }),
    WIND: (hx, hy) => ({ g: [hx - 4, hy - 186], a: -0.75, lean: -0.15, dip: -3 }),
    STRIKE: (hx, hy) => ({ g: [hx + 70, hy - 50], a: 2.1, lean: 0.4, dip: 10 }),
    RECOIL: (hx, hy) => ({ g: [hx + 60, hy - 56], a: 2.3, lean: 0.3, dip: 5 }),
  };
  const CYCLE = [[0, 'READY'], [0.36, 'WIND'], [0.5, 'STRIKE'], [0.68, 'RECOIL'], [1.0, 'READY']];
  // ângulo interpolado pelo caminho de cima (a marreta passa por cima da cabeça)
  const mixKey = (a, b, u) => ({ g: P2(a.g, b.g, u), a: lerp(a.a, b.a, u), lean: lerp(a.lean, b.lean, u), dip: lerp(a.dip, b.dip, u) });
  function cyclePose(hx, ph) {
    const hy = standHipY(SWING_L);
    let i = 0; while (i < CYCLE.length - 2 && ph >= CYCLE[i + 1][0]) i++;
    const [p0, k0] = CYCLE[i], [p1, k1] = CYCLE[i + 1];
    const raw = (ph - p0) / (p1 - p0);
    const u = k1 === 'STRIKE' ? easeIn(raw) : easeInOut(raw);
    let A = KEYS[k0](hx, hy), B = KEYS[k1](hx, hy);
    if (k0 === 'READY' && k1 === 'WIND') { B = Object.assign({}, B, { a: B.a + 0 }); A = Object.assign({}, A, { a: A.a - 2 * Math.PI }); }
    if (k0 === 'RECOIL' && k1 === 'READY') { /* direto */ }
    return mixKey(A, B, u);
  }
  function swingState(hx, key) {
    const hy = standHipY(SWING_L) + key.dip;
    const d = dirA(key.a);
    const hands = [[key.g[0] + d[0] * 14, key.g[1] + d[1] * 14], [key.g[0] - d[0] * 14, key.g[1] - d[1] * 14]];
    return { x: hx, hipY: hy, lean: key.lean, head: 0.1, legs: SWING_L, hands, hammer: { g: key.g, a: key.a }, prefF: 'down', prefB: 'down' };
  }

  const T0 = 3.0;
  const RUN = {
    ego: { P: 0.48, end: 6.2, rate: 240 },
    disc: { P: 0.8, end: 12.4, rate: 1000 / 9.4 },
    obs: { P: 0.6, end: 19.2, rate: 175 },
  };
  const BREAK_T = 19.2;
  const hits = (k, t) => RUN[k].rate * clamp(t - T0, 0, RUN[k].end - T0);
  const TOTAL = RUN.obs.rate * (BREAK_T - T0);
  const crackP = (k, t) => clamp(hits(k, t) / TOTAL);

  function hookKey(hx, t) {
    const hy = standHipY(SWING_L), K = (n) => KEYS[n](hx, hy);
    const R0 = K('READY'), Wn = Object.assign({}, K('WIND'), {}), Rr = Object.assign({}, R0, { a: R0.a - 2 * Math.PI });
    if (t < 1.15) return mixKey(Rr, Wn, easeInOut(t / 1.15));
    if (t < 1.38) return Wn;
    if (t < 1.5) return mixKey(Wn, K('STRIKE'), easeIn(seg(t, 1.38, 1.5)));
    if (t < 2.2) return mixKey(K('STRIKE'), R0, easeInOut(seg(t, 1.5, 2.2)));
    return R0;
  }
  function swinging(k, t) {
    if (t < T0) return swingState(HX[k], hookKey(HX[k], t));
    const ph = ((t - T0) / RUN[k].P) % 1;
    return swingState(HX[k], cyclePose(HX[k], ph));
  }
  const atRest = (k) => { const last = swinging(k, RUN[k].end - 1e-3); return last; };

  function egoState(t) {
    const end = RUN.ego.end;
    if (t < end) return swinging('ego', t);
    const x = HX.ego, last = atRest('ego');
    const u = easeInOut(seg(t, end, end + 0.5));
    const hy0 = standHipY(STAND_L);
    const slump = { x, hipY: lerp(last.hipY, hy0, u), lean: lerp(last.lean, 0.38, u), head: lerp(0.1, 0.5, u), legs: mixL(SWING_L, STAND_L, u),
      hands: [P2(last.hands[0], [x + 18, hy0 + 40], u), P2(last.hands[1], [x + 6, hy0 + 44], u)], prefF: 'down', prefB: 'down' };
    const s = easeInOut(seg(t, 6.8, 7.6));
    if (s <= 0) return slump;
    const legs = mixL(STAND_L, SIT_L, s), hipSit = FLOOR - 17;
    return { x: x - 40 * s, hipY: lerp(slump.hipY, hipSit, s), lean: lerp(0.38, 0.42, s), head: lerp(0.5, 0.75, s), legs,
      hands: [P2(slump.hands[0], [x + 60 - 40 * s, FLOOR - 62], s), P2(slump.hands[1], [x + 48 - 40 * s, FLOOR - 58], s)], prefF: 'down', prefB: 'down' };
  }
  function egoHammer(t) {
    const end = RUN.ego.end; if (t < end) return null;
    const last = atRest('ego').hammer;
    const rest = { g: [HX.ego + 70, FLOOR - 50], a: Math.PI * 0.58 };
    const u = easeIn(seg(t, end, end + 0.4));
    return { g: P2(last.g, rest.g, u), a: lerp(last.a, rest.a, u) };
  }
  function discState(t) {
    const end = RUN.disc.end;
    if (t < end) return swinging('disc', t);
    const x = HX.disc, last = atRest('disc');
    const u = easeInOut(seg(t, end, end + 0.45));
    const hy0 = standHipY(STAND_L);
    const rest = { g: [x + 72, FLOOR - 118], a: Math.PI * 0.98 };
    const hammer = { g: P2(last.hammer.g, rest.g, u), a: lerp(last.hammer.a, rest.a, u) };
    const hipsU = easeInOut(seg(t, end + 0.5, end + 0.9));
    const d = dirA(hammer.a);
    const onHandle = [[hammer.g[0] - d[0] * 22, hammer.g[1] - d[1] * 22], [hammer.g[0] - d[0] * 30, hammer.g[1] - d[1] * 30]];
    const hips = [[x + 16, hy0 - 16], [x + 6, hy0 - 20]];
    const hands = hipsU > 0 ? [P2(onHandle[0], hips[0], hipsU), P2(onHandle[1], hips[1], hipsU)] : [P2(last.hands[0], onHandle[0], u), P2(last.hands[1], onHandle[1], u)];
    return { x, hipY: lerp(last.hipY, hy0, u), lean: lerp(last.lean, -0.03, u), head: lerp(0.1, -0.1, u), legs: mixL(SWING_L, STAND_L, u), hands, hammer,
      prefF: hipsU > 0.3 ? 'back' : 'down', prefB: hipsU > 0.3 ? 'back' : 'down' };
  }
  function obsState(t) {
    if (t < BREAK_T) return swinging('obs', t);
    const x = HX.obs, last = atRest('obs');
    const u = easeOut(seg(t, BREAK_T + 0.15, BREAK_T + 0.6));
    const hy0 = standHipY(STAND_L) - 6 * Math.sin(Math.PI * seg(t, BREAK_T + 0.25, BREAK_T + 0.65));
    const up = [[x + 96, hy0 - 232], [x - 58, hy0 - 226]];
    const sway = 0.04 * Math.sin((t - BREAK_T) * 5);
    const fall = easeIn(seg(t, BREAK_T + 0.1, BREAK_T + 0.45));
    const rest = { g: [x + 40, FLOOR - 40], a: Math.PI * 0.62 };
    return { x, hipY: lerp(last.hipY, hy0, u), lean: lerp(last.lean, -0.08 + sway, u), head: lerp(0.1, -0.25, u), legs: mixL(SWING_L, STAND_L, u),
      hands: [P2(last.hands[0], up[0], u), P2(last.hands[1], up[1], u)], prefF: 'fwd', prefB: 'back',
      hammer: { g: P2(last.hammer.g, rest.g, fall), a: lerp(last.hammer.a, rest.a, fall), loose: true } };
  }
  const stateOf = { disc: discState, obs: obsState, ego: egoState };

  // golpes (para poeira, rachaduras e sons)
  const STRIKES = { ego: [], disc: [], obs: [] };
  for (const k of ['ego', 'disc', 'obs']) for (let n = 0; ; n++) { const ts = T0 + RUN[k].P * (n + 0.5); if (ts >= RUN[k].end) break; STRIKES[k].push(ts); }
  const IMPACT_Y = FLOOR - 160;
  const impact = (k) => [HX[k] + 178, IMPACT_Y];

  // ---------- rocha com rachaduras e diamante ----------
  const SHAPE = (() => { const r = mulberry32(77), out = []; for (let i = 0; i < 14; i++) out.push(0.88 + r() * 0.16); return out; })();
  const rockPath = (c, cx, cy, rad, from, to) => {
    c.beginPath();
    const n = SHAPE.length;
    for (let i = 0; i <= n; i++) { const a = from + (to - from) * (i / n), rr2 = rad * SHAPE[i % n]; const x = cx + Math.cos(a) * rr2, y = cy + Math.sin(a) * rr2 * 0.95; if (i === 0) c.moveTo(x, y); else c.lineTo(x, y); }
    c.closePath();
  };
  function crackTree(seed) {
    const r = mulberry32(seed), out = [];
    const walk = (p, ang, gen, depth) => {
      if (depth > 7 || out.length > 70) return;
      const len = 26 + r() * 30, a2 = ang + (r() - 0.5) * 0.9;
      const q = [p[0] + Math.cos(a2) * len, p[1] + Math.sin(a2) * len];
      out.push({ a: p, b: q, gen });
      walk(q, a2, gen + 1, depth + 1);
      if (r() < 0.45) walk(q, a2 + (r() < 0.5 ? 1 : -1) * (0.7 + r() * 0.6), gen + 1, depth + 1);
    };
    for (let i = 0; i < 6; i++) walk([0, 0], -Math.PI / 2 + (i / 6) * Math.PI * 2 + r() * 0.5, 0, 0);
    return out.sort((x, y) => x.gen - y.gen);
  }
  const CRACKS = { disc: crackTree(11), obs: crackTree(23), ego: crackTree(37) };
  const CHUNKS = []; for (let i = 0; i < 14; i++) CHUNKS.push({ dy: rr(-110, 110), dx: rr(0, 60), vx: rr(160, 520), vy: rr(-520, -80), r: rr(12, 26), rot: rr(0, 6), sp: rr(-8, 8) });
  const progressK = (k, t) => clamp(hits(k, t) / TOTAL);
  function drawBoulder(c, k, t, lv) {
    const cx = BCX(k), cy = BCY, lit = 0.6 + 0.4 * Math.min(1, lv);
    const split = k === 'obs' ? easeOut(seg(t, BREAK_T, BREAK_T + 0.45)) : 0;
    const halves = split > 0 ? [[-1, Math.PI / 2 + 0.25, Math.PI * 1.5 + 0.25], [1, -Math.PI / 2 + 0.25, Math.PI / 2 + 0.25]] : [[0, 0, Math.PI * 2]];
    for (const [side, a0, a1] of halves) {
      c.save(); c.translate(cx + side * 70 * split, cy + 18 * split * Math.abs(side)); c.rotate(side * 0.35 * split); c.translate(-cx, -cy);
      if (side === 0) { c.beginPath(); c.ellipse(cx, cy, BR * 1.03, BR * 0.98, 0, 0, Math.PI * 2); }
      else { c.beginPath(); c.moveTo(cx + Math.cos(a0) * BR * 0.3, cy + Math.sin(a0) * BR); for (let i = 0; i <= 16; i++) { const a = a0 + (a1 - a0) * (i / 16); c.lineTo(cx + Math.cos(a) * BR, cy + Math.sin(a) * BR * 0.97); } for (let i = 0; i <= 6; i++) c.lineTo(cx + side * (i % 2 ? 10 : -6) + 0, cy + BR - (i / 6) * BR * 2); c.closePath(); }
      const g = c.createLinearGradient(0, cy - BR, 0, cy + BR); g.addColorStop(0, rgb([104, 103, 109], lit)); g.addColorStop(1, rgb([66, 65, 71], lit));
      c.fillStyle = g; c.fill(); c.lineWidth = 5; c.strokeStyle = OUT; c.stroke();
      c.save(); c.clip();
      c.fillStyle = 'rgba(255,255,255,0.12)'; c.beginPath(); c.ellipse(cx - 30, cy - 50, 40, 16, -0.5, 0, Math.PI * 2); c.fill();
      for (let i = 0; i < 18; i++) { const r2 = mulberry32(i + 9); const x = cx - BR + r2() * BR * 2, y = cy - BR + r2() * BR * 2; c.fillStyle = 'rgba(0,0,0,0.18)'; c.beginPath(); c.arc(x, y, 2 + r2() * 4, 0, Math.PI * 2); c.fill(); }
      // rachaduras partindo do ponto do golpe
      const p = progressK(k, t), cr = CRACKS[k], n = Math.floor(p * cr.length), I = impact(k);
      c.translate(I[0] + 6, I[1] + 4); c.lineCap = 'round';
      for (let i = 0; i < n; i++) { const sg = cr[i]; c.strokeStyle = OUT; c.lineWidth = Math.max(2.5, 5.5 - sg.gen * 0.6); c.beginPath(); c.moveTo(sg.a[0] * 1.15, sg.a[1]); c.lineTo(sg.b[0] * 1.15, sg.b[1]); c.stroke(); }
      if (k === 'obs' && split === 0 && p > 0.5) { c.save(); c.globalCompositeOperation = 'lighter'; for (let i = 0; i < n; i += 3) { const sg = cr[i]; c.strokeStyle = rgb(RED, 1, 0.35 * (p - 0.5) * 2); c.lineWidth = 3; c.beginPath(); c.moveTo(sg.a[0] * 1.15, sg.a[1]); c.lineTo(sg.b[0] * 1.15, sg.b[1]); c.stroke(); } c.restore(); }
      c.restore();
      c.restore();
    }
    if (split > 0) {
      const d = t - BREAK_T;
      for (const ch of CHUNKS) {
        if (d > 1.3) continue;
        const px = cx + ch.dx - 30 + (ch.vx - 340) * d * 0.7, py = cy - 40 + ch.dy * 0.4 + ch.vy * d + 0.5 * 1600 * d * d;
        if (py > FLOOR - ch.r * 0.6) continue;
        c.save(); c.translate(px, py); c.rotate(ch.rot + ch.sp * d);
        c.beginPath(); c.moveTo(-ch.r, -ch.r * 0.5); c.lineTo(ch.r * 0.3, -ch.r * 0.8); c.lineTo(ch.r, ch.r * 0.3); c.lineTo(-ch.r * 0.2, ch.r * 0.8); c.closePath();
        c.fillStyle = '#5c5b60'; c.fill(); c.lineWidth = 3.5; c.strokeStyle = OUT; c.stroke(); c.restore();
      }
    }
  }
  function drawGem(c, t) {
    const u = easeOut(seg(t, BREAK_T + 0.1, BREAK_T + 0.8)); if (u <= 0) return;
    const cx = BCX('obs'), cy = lerp(BCY, BCY - 190, u) + 8 * Math.sin((t - BREAK_T) * 3), s = 0.4 + 0.6 * u;
    c.save(); c.globalCompositeOperation = 'lighter';
    const g = c.createRadialGradient(cx, cy, 0, cx, cy, 300); g.addColorStop(0, rgb(RED, 1, 0.55 * u)); g.addColorStop(0.4, rgb(RED, 1, 0.18 * u)); g.addColorStop(1, rgb(RED, 1, 0));
    c.fillStyle = g; c.fillRect(cx - 300, cy - 300, 600, 600);
    c.filter = 'blur(6px)'; c.fillStyle = `rgba(255,240,236,${0.18 * u})`;
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2 + (t - BREAK_T) * 0.4; c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx + Math.cos(a - 0.08) * 360, cy + Math.sin(a - 0.08) * 360); c.lineTo(cx + Math.cos(a + 0.08) * 360, cy + Math.sin(a + 0.08) * 360); c.closePath(); c.fill(); }
    c.restore();
    c.save(); c.translate(cx, cy); c.scale(s, s); c.rotate(0.06 * Math.sin((t - BREAK_T) * 2));
    const P = [[-46, -18], [-24, -40], [24, -40], [46, -18], [0, 50]];
    c.beginPath(); c.moveTo(...P[0]); for (const q of P.slice(1)) c.lineTo(...q); c.closePath();
    c.fillStyle = rgb(RED); c.fill(); c.lineWidth = 5; c.lineJoin = 'round'; c.strokeStyle = OUT; c.stroke();
    c.lineWidth = 3; c.strokeStyle = 'rgba(0,0,0,0.35)';
    c.beginPath(); c.moveTo(-46, -18); c.lineTo(46, -18); c.moveTo(-24, -40); c.lineTo(-12, -18); c.lineTo(0, 50); c.lineTo(12, -18); c.lineTo(24, -40); c.stroke();
    c.fillStyle = 'rgba(255,255,255,0.6)'; c.beginPath(); c.moveTo(-20, -34); c.lineTo(-8, -34); c.lineTo(-16, -22); c.closePath(); c.fill();
    const tw = ((t - BREAK_T) * 1.3) % 1; c.fillStyle = `rgba(255,255,255,${0.9 * (1 - tw)})`; c.beginPath(); c.arc(28 - 56 * tw, -28, 5, 0, Math.PI * 2); c.fill();
    c.restore();
  }
  function drawRubble(c, k, t) {
    const p = progressK(k, t) + (k === 'obs' && t >= BREAK_T ? 0.6 * easeOut(seg(t, BREAK_T + 0.3, BREAK_T + 1.0)) : 0);
    const x0 = BCX(k) - BR, cnt = Math.floor(p * 9);
    const r = mulberry32(k.length * 97 + 5);
    for (let i = 0; i < cnt; i++) {
      const sz = 7 + r() * 10, x = x0 - 6 - r() * 50 + (k === 'obs' && i > 5 ? BR * 2 + 40 + r() * 40 : 0);
      c.beginPath(); c.ellipse(x, FLOOR - sz * 0.5, sz, sz * 0.6, r() * 0.6, 0, Math.PI * 2);
      c.fillStyle = '#4a494e'; c.fill(); c.lineWidth = 3; c.strokeStyle = OUT; c.stroke();
    }
  }
  // plateia do ego
  const crowdX = [700, 975, 1015, 1055];
  function drawCrowd(c, t) {
    for (let i = 0; i < crowdX.length; i++) {
      const show = smooth(seg(t, 3.0 + i * 0.07, 3.3 + i * 0.07)) * (1 - smooth(seg(t, 5.95 + i * 0.06, 6.2 + i * 0.06)));
      if (show <= 0.01) continue;
      const ph = i * 1.7, cheer = t < 6.0 ? Math.abs(Math.sin((t + ph) * 7)) * 8 : 0;
      c.save(); c.globalAlpha = show; c.translate(crowdX[i], FLOOR - 4 - cheer);
      c.lineWidth = 3; c.strokeStyle = 'rgba(255,255,255,0.75)'; c.fillStyle = '#121214';
      c.beginPath(); c.arc(0, -40, 11, 0, Math.PI * 2); c.fill(); c.stroke();
      c.beginPath(); c.moveTo(-17, 0); c.quadraticCurveTo(-17, -24, 0, -24); c.quadraticCurveTo(17, -24, 17, 0); c.fill(); c.stroke();
      if (t < 6.0 && Math.sin((t + ph) * 3) > 0.2) { c.beginPath(); c.arc(0, -66, 7, 0.15 * Math.PI, 0.85 * Math.PI); c.stroke(); }
      c.restore();
    }
  }
  function drawMeta(c, t) {
    const hit = t >= RUN.disc.end;
    const flash = hit ? Math.exp(-(t - RUN.disc.end) * 4) : 0;
    const label = hit ? 'META ✓' : 'META 1.000';
    c.font = '700 22px "Space Mono", monospace'; const tw = c.measureText(label).width;
    const px = BCX('disc') - (tw + 26) / 2, py = BCY - BR - 70;
    c.fillStyle = `rgba(${Math.round(20 + 200 * flash)},${Math.round(20 + 200 * flash)},${Math.round(22 + 200 * flash)},0.92)`;
    c.beginPath(); c.roundRect(px, py, tw + 26, 36, 18); c.fill();
    c.lineWidth = 2.5; c.strokeStyle = 'rgba(255,255,255,0.8)'; c.stroke();
    c.fillStyle = flash > 0.5 ? '#111' : '#f2f2f2'; c.textAlign = 'left'; c.textBaseline = 'middle'; c.fillText(label, px + 13, py + 19);
  }

  // ---------- luz ----------
  const level = {
    disc: track([[0, 0.9], [3.0, 0.9], [3.25, 0.6], [8.3, 0.6], [8.6, 1.0], [13.6, 1.0], [14.1, 0.45]]),
    obs: track([[0, 0.9], [3.0, 0.9], [3.25, 0.6], [13.6, 0.6], [13.9, 1.1], [19.1, 1.1], [19.25, 1.5], [20.6, 1.25]]),
    ego: track([[0, 0.9], [3.0, 0.9], [3.25, 1.1], [6.1, 1.1], [6.2, 1.0], [6.9, 0.08]]),
  };

  // ---------- câmera ----------
  function camAt(t) {
    const hookU = easeOut(seg(t, 1.5, 2.4));
    let s = lerp(1.08, 1.0, hookU);
    const f = P2([540, 900], [540, 960], hookU), sf = P2([540, 960], [540, 960], hookU);
    let ox = sf[0] - f[0] * s, oy = sf[1] - f[1] * s;
    const w = easeInOut(seg(t, 19.4, 21.0));
    if (w > 0) { const s2 = 1.04, fx = 520, fy = 960; ox = lerp(ox, 540 - fx * s2, w); oy = lerp(oy, 1000 - fy * s2, w); s = lerp(s, s2, w); }
    const k1 = t >= 1.5 ? Math.exp(-(t - 1.5) * 9) : 0, k2 = t >= BREAK_T ? Math.exp(-(t - BREAK_T) * 6) : 0;
    ox += 15 * k1 * Math.sin((t - 1.5) * 70) + 18 * k2 * Math.sin((t - BREAK_T) * 64);
    oy += 10 * k1 * Math.cos((t - 1.5) * 83) + 14 * k2 * Math.cos((t - BREAK_T) * 77);
    return { s, ox, oy };
  }
  const toScreen = (p, C) => [p[0] * C.s + C.ox, p[1] * C.s + C.oy];

  // ---------- texto digitando ----------
  const CPS = 26;
  const CAPS = [
    { s: -1, e: 2.85, lines: [[-1, [['TRÊS QUEBRAM PEDRA.']]], [0.32, [['SÓ '], ['UM', 1], [' ACHA O DIAMANTE.']]]] },
    { s: 3.0, e: 5.6, lines: [[3.0, [['O EGO BATE']]], [3.5, [['PRA SER VISTO.']]]] },
    { s: 5.7, e: 8.3, lines: [[5.7, [['SEM PLATEIA,']]], [6.2, [['LARGA A MARRETA.']]]] },
    { s: 8.4, e: 10.9, lines: [[8.4, [['A DISCIPLINA']]], [8.9, [['BATE NO RITMO.']]]] },
    { s: 11.0, e: 13.6, lines: [[11.0, [['BATE A META']]], [11.5, [['E PARA.']]]] },
    { s: 13.7, e: 16.3, lines: [[13.7, [['A '], ['OBSESSÃO', 1]]], [14.2, [['PASSA DA META.']]]] },
    { s: 16.4, e: 19.1, lines: [[16.4, [['E DÁ MAIS']]], [16.9, [['UM GOLPE.']]]] },
    { s: 19.25, e: 99, big: true, lines: [[19.25, [['QUEM PARA NA META']]], [19.85, [['NÃO VÊ O '], ['BRILHO.', 1]]]] },
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
    // chão
    c.fillStyle = '#1b1b1e'; c.fillRect(-300, FLOOR, W + 600, 900);
    c.fillStyle = 'rgba(255,255,255,0.2)'; c.fillRect(-300, FLOOR - 2, W + 600, 4);
    for (const k of ['disc', 'obs', 'ego']) { drawRubble(c, k, t); drawBoulder(c, k, t, lv[k]); }
    drawGem(c, t);
    drawMeta(c, t);
    drawCrowd(c, t);
    // aura vermelha da obsessão
    const aura = smooth(seg(t, 13.7, 15.0)) * 0.5 + 0.5 * smooth(seg(t, BREAK_T, BREAK_T + 0.6));
    if (aura > 0) {
      const R0 = rigP(obsState(t));
      c.save(); c.globalCompositeOperation = 'lighter';
      const g = c.createRadialGradient(R0.sh[0], R0.sh[1] + 30, 0, R0.sh[0], R0.sh[1] + 30, 300);
      g.addColorStop(0, rgb(RED, 1, 0.3 * aura)); g.addColorStop(1, rgb(RED, 1, 0));
      c.fillStyle = g; c.beginPath(); c.arc(R0.sh[0], R0.sh[1] + 30, 300, 0, Math.PI * 2); c.fill(); c.restore();
    }
    const eh = egoHammer(t); if (eh) drawHammer(c, eh.g, eh.a);
    for (const k of ['disc', 'ego', 'obs']) {
      const st = stateOf[k](t);
      const light = clamp(0.3 + 0.7 * Math.min(1, lv[k] / 0.85));
      // sombra
      c.save(); c.translate(st.x + 10, FLOOR + 2); c.scale(1, 0.16);
      const sg = c.createRadialGradient(0, 0, 0, 0, 0, 80); sg.addColorStop(0, 'rgba(0,0,0,0.5)'); sg.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = sg; c.beginPath(); c.arc(0, 0, 80, 0, Math.PI * 2); c.fill(); c.restore();
      const R = rigP(st);
      if (st.hammer && st.hammer.loose) { drawHammer(c, st.hammer.g, st.hammer.a); drawFigure(c, R, light, null); }
      else drawFigure(c, R, light, st.hammer);
    }
    // poeira dos golpes
    for (const k of ['disc', 'obs', 'ego']) for (const t0 of [1.5, ...STRIKES[k]]) {
      const a = t - t0; if (a < 0 || a > 0.5) continue;
      const I = impact(k), r = 18 + 70 * easeOut(a / 0.5);
      c.save(); c.globalAlpha = 0.38 * (1 - a / 0.5);
      const g = c.createRadialGradient(I[0], I[1], 0, I[0], I[1], r); g.addColorStop(0, 'rgba(210,210,215,0.9)'); g.addColorStop(1, 'rgba(210,210,215,0)');
      c.fillStyle = g; c.beginPath(); c.arc(I[0], I[1], r, 0, Math.PI * 2); c.fill(); c.restore();
      for (let i = 0; i < 4; i++) {
        const ang = Math.PI * (0.7 + i * 0.2), sp = 260 + i * 60;
        const px = I[0] + Math.cos(ang) * sp * a, py = I[1] + Math.sin(ang) * sp * a + 0.5 * 1400 * a * a;
        if (a > 0.4) continue;
        c.fillStyle = '#5a595e'; c.beginPath(); c.arc(px, py, 4.5, 0, Math.PI * 2); c.fill();
      }
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
      const fl = toScreen([HX[k] + 150, FLOOR + 10], C);
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
    if (hud.disc) hud.disc.textContent = t >= RUN.disc.end ? `${fmt(hits('disc', t))} ✓` : fmt(hits('disc', t));
    if (hud.obs) hud.obs.textContent = fmt(hits('obs', t));
    if (hud.ego) hud.ego.textContent = fmt(hits('ego', t));
    const egoLab = document.getElementById('lab-ego'); if (egoLab) egoLab.style.opacity = String(1 - 0.6 * smooth(seg(t, 6.4, 7.0)));
    const discLab = document.getElementById('lab-disc'); if (discLab) discLab.style.opacity = String(1 - 0.4 * smooth(seg(t, 13.6, 14.2)));
  }

  const typing = [];
  for (const cap of CAPS) for (const [ls, segs] of cap.lines) { const total = lenOf(segs); const txt = segs.map((s) => s[0]).join(''); for (let i = 0; i < total; i++) { const tt = ls + (i + 1) / CPS; if (tt >= 0 && tt < cap.e && txt[i] !== ' ') typing.push(+tt.toFixed(3)); } }
  window.__schedule = { slam: 1.5, egoQuit: RUN.ego.end, egoSit: 7.6, meta: RUN.disc.end, payoff: BREAK_T, strikes: STRIKES, crowd: [3.0, 5.95], typing };
  window.__renderAt = renderAt;
  window.addEventListener('hf-seek', (e) => renderAt(e.detail.time));
  renderAt(0);
})();
