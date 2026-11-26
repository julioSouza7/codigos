// Derrubar a árvore: Disciplina x Obsessão x Ego — 2D vetorial, função pura do tempo.
// Regras do canal (@stick.obsessao): a OBSESSÃO sempre vence; uma cor viva para cada um; mais animado (25 s).
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
  const NEU = [214, 212, 206], ACC = [214, 80, 66];
  const COL = { disc: NEU, obs: NEU, motiv: NEU, ego: NEU };
  const KS = ['disc', 'obs', 'motiv', 'ego'];
  const HX = { disc: 70, obs: 405, motiv: 740, ego: 1075 };
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
  function drawFigure(c, R, light, hammer, col, arm) {
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
    if (arm && arm.a > 0.001) {
      if (arm.g > 0.01) { c.save(); c.globalAlpha = arm.g; c.filter = 'blur(10px)'; strokePts(c, R.armF, D.limb + 26, rgb(ACC)); c.restore(); }
      limb(c, R.armF, D.limb, rgb(mixC(mixC(DARK, WHITE, light), mixC(DARK, ACC, light), arm.a)));
    } else limb(c, R.armF, D.limb, f);
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
    STRIKE: (hx, hy) => ({ g: [hx + 72, hy - 108], a: 1.53, lean: 0.3, dip: 8 }),
    RECOIL: (hx, hy) => ({ g: [hx + 56, hy - 82], a: 1.95, lean: 0.22, dip: 4 }),
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
    motiv: { P: 0.36, end: 5.6, rate: 300 },
    ego: { P: 0.46, end: 10.0, rate: 120 },
    disc: { P: 0.72, end: 14.0, rate: 1000 / 11 },
    obs: { P: 0.52, end: 19.0, rate: 170 },
  };
  const BREAK_T = 19.0;
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

  function quitState(k, sitAt) {
    return function (t) {
      const end = RUN[k].end;
      if (t < end) return swinging(k, t);
      const x = HX[k], last = atRest(k);
      const u = easeInOut(seg(t, end, end + 0.5));
      const hy0 = standHipY(STAND_L);
      const slump = { x, hipY: lerp(last.hipY, hy0, u), lean: lerp(last.lean, 0.38, u), head: lerp(0.1, 0.5, u), legs: mixL(SWING_L, STAND_L, u),
        hands: [P2(last.hands[0], [x + 18, hy0 + 40], u), P2(last.hands[1], [x + 6, hy0 + 44], u)], prefF: 'down', prefB: 'down' };
      const sv = easeInOut(seg(t, sitAt, sitAt + 0.8));
      if (sv <= 0) return slump;
      const legs = mixL(STAND_L, SIT_L, sv), hipSit = FLOOR - 17;
      return { x: x - 40 * sv, hipY: lerp(slump.hipY, hipSit, sv), lean: lerp(0.38, 0.42, sv), head: lerp(0.5, 0.75, sv), legs,
        hands: [P2(slump.hands[0], [x + 60 - 40 * sv, FLOOR - 62], sv), P2(slump.hands[1], [x + 48 - 40 * sv, FLOOR - 58], sv)], prefF: 'down', prefB: 'down' };
    };
  }
  const motivState = quitState('motiv', 6.2), egoState = quitState('ego', 10.6);
  function droppedTool(k, t) {
    const end = RUN[k].end; if (t < end) return null;
    const last = atRest(k).hammer;
    const rest = { g: [HX[k] + 70, FLOOR - 50], a: Math.PI * 0.58 };
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
  const stateOf = { disc: discState, obs: obsState, motiv: motivState, ego: egoState };

  // golpes (para poeira, rachaduras e sons)
  const STRIKES = { motiv: [], ego: [], disc: [], obs: [] };
  for (const k of KS) for (let n = 0; ; n++) { const ts = T0 + RUN[k].P * (n + 0.5); if (ts >= RUN[k].end) break; STRIKES[k].push(ts); }
  const IMPACT_Y = standHipY(SWING_L) + 8 - 112;
  const PAIN0 = 15.7, PAIN1 = 16.9;
  const hurtOf = (t) => smooth(seg(t, PAIN0, PAIN1));
  const lastStrike = (k, t) => { let ls = -9; for (const x of STRIKES[k]) if (x <= t) ls = x; return ls; };
  const MOANS = STRIKES.obs.filter((x) => x > 16.3 && x < 18.8).filter((_, i) => i % 2 === 0);
  const impact = (k) => [wallFace(k), IMPACT_Y];

  // ---------- parede de pedra com rachaduras ----------
  const BRICK_H = 50;
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
  const CRACKS = { disc: crackTree(11), obs: crackTree(23), motiv: crackTree(29), ego: crackTree(37) };
  const CHUNKS = []; for (let i = 0; i < 14; i++) CHUNKS.push({ dy: rr(-110, 110), dx: rr(0, WALL_T), vx: rr(160, 520), vy: rr(-520, -80), r: rr(12, 26), rot: rr(0, 6), sp: rr(-8, 8) });
  const GAP = 118;
  const FALL_DUR = 0.95;
  function drawWall(c, k, t, lv) {
    const x0 = wallFace(k), x1 = x0 + WALL_T, I = impact(k);
    const p = crackP(k, t);
    const depth = Math.min(WALL_T - 8, 6 + 54 * p), half = 10 + 26 * p;
    const fall = k === 'obs' ? easeIn(seg(t, BREAK_T, BREAK_T + FALL_DUR)) : 0;
    const lit = 0.65 + 0.35 * Math.min(1, lv);
    const bark = (yTop, yBot) => {
      const g = c.createLinearGradient(x0, 0, x1, 0); g.addColorStop(0, rgb([128, 116, 104], lit)); g.addColorStop(1, rgb([92, 84, 76], lit));
      c.fillStyle = g; c.fillRect(x0, yTop, WALL_T, yBot - yTop);
      c.strokeStyle = 'rgba(0,0,0,0.28)'; c.lineWidth = 3;
      for (let i = 0; i < 4; i++) { const bx = x0 + 10 + i * 14; c.beginPath(); for (let y = yTop; y < yBot; y += 40) { c.moveTo(bx + ((y * 13) % 7) - 3, y); c.lineTo(bx + ((y * 7) % 5) - 2, y + 26); } c.stroke(); }
    };
    // toco (abaixo do corte)
    c.save(); c.beginPath(); c.moveTo(x0, FLOOR); c.lineTo(x0, I[1] + half); c.lineTo(x0 + depth, I[1]); c.lineTo(x1, I[1]); c.lineTo(x1, FLOOR); c.closePath(); c.clip();
    bark(I[1] - 10, FLOOR); c.restore();
    c.beginPath(); c.moveTo(x0, FLOOR); c.lineTo(x0, I[1] + half); c.lineTo(x0 + depth, I[1]); c.lineTo(x1, I[1]); c.lineTo(x1, FLOOR); c.lineWidth = 5; c.strokeStyle = OUT; c.stroke();
    // raízes
    c.beginPath(); c.moveTo(x0 - 26, FLOOR); c.quadraticCurveTo(x0 - 4, FLOOR - 8, x0, FLOOR - 40); c.lineTo(x1, FLOOR - 40); c.quadraticCurveTo(x1 + 4, FLOOR - 8, x1 + 26, FLOOR); c.closePath();
    c.fillStyle = rgb([98, 90, 82], lit); c.fill(); c.lineWidth = 4; c.strokeStyle = OUT; c.stroke();
    // parte de cima (cai na vez da obsessão)
    c.save();
    if (fall > 0) { c.translate(x1, I[1]); c.rotate(fall * 1.45); c.translate(-x1, -I[1]); }
    c.save(); c.beginPath(); c.moveTo(x0, -900); c.lineTo(x0, I[1] - half); c.lineTo(x0 + depth, I[1]); c.lineTo(x1, I[1]); c.lineTo(x1, -900); c.closePath(); c.clip();
    bark(-900, I[1] + 10); c.restore();
    c.beginPath(); c.moveTo(x0, -900); c.lineTo(x0, I[1] - half); c.lineTo(x0 + depth, I[1]); c.lineTo(x1, I[1]); c.lineTo(x1, -900); c.lineWidth = 5; c.strokeStyle = OUT; c.stroke();
    // galhos com folhas aparecendo quando cai
    if (fall > 0) {
      for (let i = 0; i < 9; i++) { const yy = I[1] - 420 - i * 60, sx = i % 2 ? -1 : 1; c.beginPath(); c.ellipse(x0 + WALL_T / 2 + sx * 70, yy, 90, 54, sx * 0.3, 0, Math.PI * 2); c.fillStyle = rgb([88, 96, 90]); c.fill(); c.lineWidth = 4; c.strokeStyle = OUT; c.stroke(); }
    }
    c.restore();
    // miolo claro do corte
    c.beginPath(); c.moveTo(x0, I[1] - half * (1 - fall)); c.lineTo(x0 + depth, I[1]); c.lineTo(x0, I[1] + half); c.closePath();
    c.fillStyle = '#cfc6b8'; c.fill(); c.lineWidth = 3.5; c.strokeStyle = OUT; c.stroke();
    // poeira e lascas da queda
    if (k === 'obs' && t >= BREAK_T + FALL_DUR) {
      const d = t - BREAK_T - FALL_DUR;
      for (let i = 0; i < 6; i++) { const r = 40 + 160 * easeOut(d / 0.9) + i * 20; c.save(); c.globalAlpha = 0.4 * (1 - clamp(d / 1.2)); const g = c.createRadialGradient(x1 + 200 + i * 60, FLOOR - 20, 0, x1 + 200 + i * 60, FLOOR - 20, r); g.addColorStop(0, 'rgba(210,190,160,0.9)'); g.addColorStop(1, 'rgba(210,190,160,0)'); c.fillStyle = g; c.beginPath(); c.arc(x1 + 200 + i * 60, FLOOR - 20, r, 0, Math.PI * 2); c.fill(); c.restore(); }
    }
  }
  // entulho no chão ao pé de cada parede (cresce com os golpes)
  function drawRubble(c, k, t) {
    const p = crackP(k, t);
    const x0 = wallFace(k), cnt = Math.floor(p * 9);
    const r = mulberry32(k.length * 97 + 5);
    for (let i = 0; i < cnt; i++) {
      const s = 7 + r() * 10, x = x0 - 12 - r() * 70 + (k === 'obs' && i > 5 ? 120 + r() * 60 : 0);
      c.beginPath(); c.ellipse(x, FLOOR - s * 0.5, s, s * 0.6, r() * 0.6, 0, Math.PI * 2);
      c.fillStyle = '#b8b0a4'; c.fill(); c.lineWidth = 3; c.strokeStyle = OUT; c.stroke();
    }
  }
  // plateia do ego
  const crowdX = [1008, 1043, 1300, 1335];
  function drawCrowd(c, t) {
    for (let i = 0; i < crowdX.length; i++) {
      const show = smooth(seg(t, 7.8 + i * 0.07, 8.1 + i * 0.07)) * (1 - smooth(seg(t, 9.7 + i * 0.06, 9.95 + i * 0.06)));
      if (show <= 0.01) continue;
      const ph = i * 1.7, cheer = t < 9.7 ? Math.abs(Math.sin((t + ph) * 7)) * 10 : 0;
      c.save(); c.globalAlpha = show; c.translate(crowdX[i], FLOOR - 4 - cheer);
      c.lineWidth = 3; c.strokeStyle = rgb(COL.ego, 1, 0.9); c.fillStyle = '#121214';
      c.beginPath(); c.arc(0, -40, 11, 0, Math.PI * 2); c.fill(); c.stroke();
      c.beginPath(); c.moveTo(-17, 0); c.quadraticCurveTo(-17, -24, 0, -24); c.quadraticCurveTo(17, -24, 17, 0); c.fill(); c.stroke();
      if (t < 9.7 && Math.sin((t + ph) * 3) > 0.2) { c.beginPath(); c.arc(0, -66, 7, 0.15 * Math.PI, 0.85 * Math.PI); c.stroke(); }
      c.restore();
    }
  }
  function drawMeta(c, t) {
    const MA = 1 - shotAt(t).amt; if (MA <= 0.01) return; c.save(); c.globalAlpha = MA; drawMeta0(c, t); c.restore();
  }
  function drawMeta0(c, t) {
    const hit = t >= RUN.disc.end;
    const flash = hit ? Math.exp(-(t - RUN.disc.end) * 4) : 0;
    const label = hit ? 'META ✓' : 'META 1.000';
    c.font = '700 22px "Space Mono", monospace'; const tw = c.measureText(label).width;
    const px = wallFace('disc') - tw - 34, py = IMPACT_Y - 250;
    c.fillStyle = `rgba(${Math.round(20 + 200 * flash)},${Math.round(20 + 200 * flash)},${Math.round(22 + 200 * flash)},0.92)`;
    c.beginPath(); c.roundRect(px, py, tw + 26, 36, 18); c.fill();
    c.lineWidth = 2.5; c.strokeStyle = 'rgba(255,255,255,0.8)'; c.stroke();
    c.fillStyle = flash > 0.5 ? '#111' : '#f2f2f2'; c.textAlign = 'left'; c.textBaseline = 'middle'; c.fillText(label, px + 13, py + 19);
  }

  // ---------- luz ----------
  const level = {
    disc: track([[0, 1.0], [3.0, 1.0], [3.3, 0.7], [12.8, 0.7], [13.0, 1.1], [14.6, 1.1], [15.3, 0.55]]),
    obs: track([[0, 1.0], [3.0, 1.0], [3.3, 0.7], [15.3, 0.7], [15.5, 1.2], [18.9, 1.2], [19.05, 1.6], [20.4, 1.3]]),
    motiv: track([[0, 1.0], [3.0, 1.0], [3.2, 1.3], [5.5, 1.3], [6.2, 0.5], [6.9, 0.08]]),
    ego: track([[0, 1.0], [3.0, 1.0], [7.8, 1.0], [8.0, 1.2], [9.9, 1.2], [10.4, 0.5], [11.0, 0.08]]),
  };

  // ---------- câmera ----------
  const GS = 0.8, WCX = 668, ZS = 1.65;
  const SHOTS = [[0, 'wide'], [2.9, 'motiv'], [6.9, 'ego'], [11.2, 'disc'], [15.0, 'obs'], [19.6, 'wide']];
  const frameOf = (n) => (n === 'wide' ? { cx: WCX, cy: 960, s: GS, sy: 960 } : { cx: HX[n] + 110, cy: FLOOR - 255, s: ZS, sy: 905 });
  function shotAt(t) {
    let i = 0; while (i < SHOTS.length - 1 && t >= SHOTS[i + 1][0]) i++;
    const cur = SHOTS[i], prev = i > 0 ? SHOTS[i - 1] : cur, u = i > 0 ? easeInOut(seg(t, cur[0], cur[0] + 0.55)) : 1;
    const A = frameOf(prev[1]), B = frameOf(cur[1]);
    const f = { cx: lerp(A.cx, B.cx, u), cy: lerp(A.cy, B.cy, u), s: Math.exp(lerp(Math.log(A.s), Math.log(B.s), u)), sy: lerp(A.sy, B.sy, u) };
    const za = (n) => (n === 'wide' ? 0 : 1), amt = lerp(za(prev[1]), za(cur[1]), u);
    const k = cur[1] !== 'wide' ? cur[1] : prev[1] !== 'wide' ? prev[1] : null;
    return { f, amt, k };
  }
  function camAt(t) {
    const S = shotAt(t), f = S.f;
    let s = f.s * (t < 2.9 ? lerp(1.08, 1.0, easeOut(seg(t, 1.5, 2.4))) : 1);
    let punch = 0; if (S.k) for (const ts of STRIKES[S.k]) { const d = t - ts; if (d >= 0 && d < 0.4) punch += 0.025 * Math.exp(-d * 13) * S.amt; }
    s *= 1 + punch;
    let ox = 540 - f.cx * s, oy = f.sy - f.cy * s;
    const k1 = t >= 1.5 ? Math.exp(-(t - 1.5) * 9) : 0, k2 = t >= BREAK_T ? Math.exp(-(t - BREAK_T) * 5) : 0;
    ox += 15 * k1 * Math.sin((t - 1.5) * 70) + 24 * k2 * Math.sin((t - BREAK_T) * 60);
    oy += 10 * k1 * Math.cos((t - 1.5) * 83) + 18 * k2 * Math.cos((t - BREAK_T) * 73);
    return { s, ox, oy };
  }
  const toScreen = (p, C) => [p[0] * C.s + C.ox, p[1] * C.s + C.oy];

  // ---------- texto: palavras pulando, palavra-chave na cor do personagem ----------
  const CAPS = [
    { s: -1, e: 2.85, lines: [[-1, [['QUATRO MACHADOS.']]], [0.3, [['SÓ '], ['UMA', 'obs'], [' ÁRVORE CAI.']]]] },
    { s: 3.0, e: 5.5, lines: [[3.0, [['A MOTIVAÇÃO']]], [3.35, [['COMEÇA A MIL.']]]] },
    { s: 5.6, e: 6.85, lines: [[5.6, [['E APAGA NO']]], [5.95, [['PRIMEIRO CANSAÇO.']]]] },
    { s: 7.0, e: 9.7, lines: [[7.0, [['O EGO']]], [7.35, [['BATE PRA SER VISTO.']]]] },
    { s: 9.8, e: 11.1, lines: [[9.8, [['SEM PLATEIA,']]], [10.15, [['LARGA O MACHADO.']]]] },
    { s: 11.3, e: 13.9, lines: [[11.3, [['A DISCIPLINA']]], [11.65, [['BATE NO RITMO.']]]] },
    { s: 14.0, e: 14.95, lines: [[14.0, [['BATE A META']]], [14.3, [['E PARA.']]]] },
    { s: 15.1, e: 17.0, lines: [[15.1, [['A OBSESSÃO']]], [15.45, [['PASSA DA META.']]]] },
    { s: 17.1, e: 18.95, lines: [[17.1, [['O BRAÇO '], ['DÓI.', 'obs']]], [17.45, [['ELA BATE DE NOVO.']]]] },
    { s: 21.0, e: 99, big: true, lines: [[21.0, [['NÃO PARE NA META.']]]] },
  ];
  const capEl = document.getElementById('cap');
  const capLines = capEl ? [capEl.querySelector('.l1'), capEl.querySelector('.l2')] : [];
  const WSTEP = 0.11;
  const wordsOf = (segs) => { const out = []; for (const [txt, col] of segs) for (const w of txt.split(' ')) if (w) out.push([w, col || '']); return out; };
  const lenOf = (segs) => segs.reduce((a, s) => a + s[0].length, 0);
  function renderCaptions(t) {
    if (!capEl) return;
    const cap = CAPS.find((c) => t >= c.s && t < c.e) || null;
    if (!cap) { capEl.style.opacity = '0'; return; }
    capEl.style.opacity = String(1 - smooth(seg(t, cap.e - 0.15, cap.e)));
    capEl.className = cap.big ? 'cap big' : 'cap';
    cap.lines.forEach(([ls, segs], i) => {
      const ws = wordsOf(segs);
      capLines[i].innerHTML = ws.map(([w, col], j) => {
        const age = t - (ls + j * WSTEP);
        if (age < 0) return '';
        const sc = 1 + 0.55 * Math.exp(-age * 16) * Math.cos(age * 30), op = clamp(age / 0.06), y = 22 * Math.exp(-age * 18);
        return `<span class="w ${col ? 'c-' + col : ''}" style="opacity:${op.toFixed(3)};transform:translateY(${y.toFixed(1)}px) scale(${sc.toFixed(3)})">${w}</span>`;
      }).join(' ');
    });
    for (let i = cap.lines.length; i < capLines.length; i++) capLines[i].innerHTML = '';
  }
  const hud = {}; for (const k of KS) hud[k] = document.getElementById('n-' + k);
  const fmt = (n) => Math.floor(n).toLocaleString('pt-BR');

  // ---------- desenho ----------
  function drawObjects(c, t, lv) {
    // chão
    c.fillStyle = '#1b1b1e'; c.fillRect(-500, FLOOR, W + 1100, 900);
    c.fillStyle = 'rgba(255,255,255,0.2)'; c.fillRect(-500, FLOOR - 2, W + 1100, 4);
    // halo colorido de cada personagem
    for (const k of KS) {
      const a = 0.22 * Math.min(1.3, lv[k]) * (k === 'obs' ? 1 + 0.8 * smooth(seg(t, BREAK_T, BREAK_T + 0.5)) : 1);
      c.save(); c.globalCompositeOperation = 'lighter';
      const g = c.createRadialGradient(HX[k] + 60, FLOOR - 180, 0, HX[k] + 60, FLOOR - 180, 280); g.addColorStop(0, rgb(COL[k], 1, a)); g.addColorStop(1, rgb(COL[k], 1, 0));
      c.fillStyle = g; c.fillRect(HX[k] - 230, FLOOR - 470, 580, 560); c.restore();
    }
    for (const k of KS) drawWall(c, k, t, lv[k]);
    drawMeta(c, t);
    drawCrowd(c, t);
    for (const k of KS) drawRubble(c, k, t);
    const aura = 0;
    if (aura > 0) {
      const R0 = rigP(obsState(t));
      c.save(); c.globalCompositeOperation = 'lighter';
      const g = c.createRadialGradient(R0.sh[0], R0.sh[1] + 30, 0, R0.sh[0], R0.sh[1] + 30, 300);
      g.addColorStop(0, rgb(RED, 1, 0.3 * aura)); g.addColorStop(1, rgb(RED, 1, 0));
      c.fillStyle = g; c.beginPath(); c.arc(R0.sh[0], R0.sh[1] + 30, 300, 0, Math.PI * 2); c.fill(); c.restore();
    }
    for (const k of ['motiv', 'ego']) { const dt = droppedTool(k, t); if (dt) drawHammer(c, dt.g, dt.a, COL[k]); }
    for (const k of ['disc', 'motiv', 'ego', 'obs']) {
      const st = stateOf[k](t);
      const light = clamp(0.3 + 0.7 * Math.min(1, lv[k] / 0.85));
      // sombra
      c.save(); c.translate(st.x + 10, FLOOR + 2); c.scale(1, 0.16);
      const sg = c.createRadialGradient(0, 0, 0, 0, 0, 80); sg.addColorStop(0, 'rgba(0,0,0,0.5)'); sg.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = sg; c.beginPath(); c.arc(0, 0, 80, 0, Math.PI * 2); c.fill(); c.restore();
      let arm = null, sd = 9;
      if (k === 'obs') { const h = hurtOf(t); sd = t - lastStrike('obs', t); const th = sd < 1 ? Math.exp(-sd * 7) : 0;
        if (t < BREAK_T) { st.head = (st.head || 0) + 0.24 * h * th; st.lean = (st.lean || 0) + 0.05 * h * th; }
        arm = { a: h * (0.8 + 0.2 * th), g: h * (0.1 + 0.32 * th) * clamp(light) }; }
      const R = rigP(st);
      if (st.hammer) st.hammer.col = COL[k];
      if (st.hammer && st.hammer.loose) { drawHammer(c, st.hammer.g, st.hammer.a, COL[k]); drawFigure(c, R, light, null, COL[k], arm); }
      else drawFigure(c, R, light, st.hammer, COL[k], arm);
      if (arm && arm.a > 0.4 && sd >= 0 && sd < 0.34 && t < BREAK_T + 0.1) { const E = R.arm, u = sd / 0.34; c.save(); c.strokeStyle = rgb(ACC, 1, (1 - u) * arm.a * light); c.lineWidth = 6; c.lineCap = 'round';
        for (let i = -1; i <= 1; i++) { const an = -2.5 + i * 0.42, r0 = 44 + 16 * easeOut(u), r1 = r0 + 18; c.beginPath(); c.moveTo(E[0] + Math.cos(an) * r0, E[1] + Math.sin(an) * r0); c.lineTo(E[0] + Math.cos(an) * r1, E[1] + Math.sin(an) * r1); c.stroke(); } c.restore(); }
    }
    // poeira dos golpes
    for (const k of KS) for (const t0 of [1.5, ...STRIKES[k]]) {
      const a = t - t0; if (a < 0 || a > 0.5) continue;
      const I = impact(k), r = 18 + 70 * easeOut(a / 0.5);
      c.save(); c.globalAlpha = 0.38 * (1 - a / 0.5);
      const g = c.createRadialGradient(I[0], I[1], 0, I[0], I[1], r); g.addColorStop(0, rgb(COL[k], 1, 0.7)); g.addColorStop(1, rgb(COL[k], 1, 0));
      c.fillStyle = g; c.beginPath(); c.arc(I[0], I[1], r, 0, Math.PI * 2); c.fill(); c.restore();
      for (let i = 0; i < 7; i++) {
        const ang = Math.PI * (0.62 + i * 0.12), sp = 300 + i * 50;
        const px = I[0] + Math.cos(ang) * sp * a, py = I[1] + Math.sin(ang) * sp * a + 0.5 * 1400 * a * a;
        if (a > 0.4) continue;
        c.save(); c.translate(px, py); c.rotate(a * 12 + i);
        c.fillStyle = i % 2 ? '#cfc6b8' : rgb(COL[k]); c.fillRect(-6, -3, 12, 6); c.lineWidth = 2; c.strokeStyle = OUT; c.strokeRect(-6, -3, 12, 6); c.restore();
      }
    }
  }
  function beamS(c, x, yb, a, col) {
    c.save(); c.filter = 'blur(12px)';
    const cc = mixC([255, 252, 246], col || [255, 252, 246], 0.55);
    const g = c.createLinearGradient(0, -60, 0, yb); g.addColorStop(0, rgb(cc, 1, a * 1.3)); g.addColorStop(1, rgb(cc, 1, a * 0.4));
    c.fillStyle = g; c.beginPath(); c.moveTo(x - 26, -60); c.lineTo(x + 26, -60); c.lineTo(x + 175, yb); c.lineTo(x - 175, yb); c.closePath(); c.fill(); c.restore();
  }

  function renderAt(t) {
    COL.obs = mixC(NEU, ACC, smooth(seg(t, BREAK_T - 0.2, BREAK_T + 0.4)));
    const C = camAt(t);
    const lv = { disc: level.disc(t), obs: level.obs(t), motiv: level.motiv(t), ego: level.ego(t) };
    const SH = shotAt(t); if (SH.k) for (const k of KS) if (k !== SH.k) lv[k] *= 1 - 0.7 * SH.amt;
    lc.setTransform(1, 0, 0, 1, 0, 0); lc.clearRect(0, 0, W, H); lc.setTransform(C.s, 0, 0, C.s, C.ox, C.oy);
    drawObjects(lc, t, lv);

    const c = ctx;
    c.setTransform(1, 0, 0, 1, 0, 0);
    const bg = c.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#060607'); bg.addColorStop(0.45, '#232224'); bg.addColorStop(1, '#0c0c0d');
    c.fillStyle = bg; c.fillRect(0, 0, W, H);
    c.setTransform(C.s, 0, 0, C.s, C.ox, C.oy);
    c.save(); c.filter = 'blur(22px)'; c.fillStyle = 'rgba(255,250,240,0.04)';
    c.beginPath(); c.moveTo(-300, -500); c.lineTo(-120, -500); c.lineTo(900, FLOOR); c.lineTo(160, FLOOR); c.closePath(); c.fill();
    c.beginPath(); c.moveTo(1200, -500); c.lineTo(1380, -500); c.lineTo(940, FLOOR); c.lineTo(320, FLOOR); c.closePath(); c.fill(); c.restore();
    // reflexo no chão
    c.setTransform(1, 0, 0, 1, 0, 0);
    const floorS = toScreen([0, FLOOR], C)[1];
    c.save(); c.beginPath(); c.rect(0, floorS, W, H - floorS); c.clip();
    c.globalAlpha = 0.16; c.translate(0, 2 * floorS); c.scale(1, -1); c.drawImage(layer, 0, 0); c.restore();
    c.drawImage(layer, 0, 0);
    c.save(); c.globalCompositeOperation = 'lighter';
    for (const k of KS) {
      const fl = toScreen([HX[k] + 60, FLOOR + 10], C);
      const a = 0.12 * Math.min(1.4, lv[k]);
      if (a > 0.004) beamS(c, fl[0], fl[1], a, COL[k]);
    }
    c.restore();
    const top = c.createLinearGradient(0, 120, 0, 560); top.addColorStop(0, 'rgba(0,0,0,0.6)'); top.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = top; c.fillRect(0, 0, W, 560);
    const bot = c.createLinearGradient(0, 1100, 0, 1340); bot.addColorStop(0, 'rgba(0,0,0,0)'); bot.addColorStop(0.5, 'rgba(0,0,0,0.6)'); bot.addColorStop(1, 'rgba(0,0,0,0.75)');
    c.fillStyle = bot; c.fillRect(0, 1100, W, H - 1100);
    const ui = c.createLinearGradient(0, 1300, 0, 1420); ui.addColorStop(0, 'rgba(4,4,5,0)'); ui.addColorStop(1, 'rgba(4,4,5,0.94)');
    c.fillStyle = ui; c.fillRect(0, 1300, W, H - 1300);

    renderCaptions(t);
    for (const k of KS) if (hud[k]) hud[k].textContent = k === 'disc' && t >= RUN.disc.end ? `${fmt(hits(k, t))} ✓` : fmt(hits(k, t));
    const SHL = shotAt(t);
    const fadeLab = (id, a, b, d) => { const el = document.getElementById(id); if (el) el.style.opacity = String((1 - SHL.amt) * (1 - d * smooth(seg(t, a, b)))); };
    fadeLab('lab-obs', 99, 100, 0);
    if (SHL.k && SHL.amt > 0.02) { const k = SHL.k, nm = ({ disc: '1 · DISCIPLINA', obs: '2 · OBSESSÃO', motiv: '3 · MOTIVAÇÃO', ego: '4 · EGO' })[k], n = k === 'disc' ? (t >= RUN.disc.end ? `${fmt(hits(k, t))} ✓ META` : `${fmt(hits(k, t))} / 1.000`) : fmt(hits(k, t));
      c.save(); c.globalAlpha = SHL.amt; c.font = '700 26px "Space Mono", monospace'; const tw = c.measureText(nm).width; c.beginPath(); c.roundRect(540 - tw / 2 - 18, 488, tw + 36, 44, 22); c.fillStyle = 'rgba(12,12,14,0.85)'; c.fill(); c.lineWidth = 3; c.strokeStyle = rgb(COL[k]); c.stroke();
      c.fillStyle = rgb(COL[k]); c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(nm, 540, 511); c.font = '800 48px Montserrat, sans-serif'; c.fillText(n, 540, 572); c.restore(); }
    fadeLab('lab-motiv', 6.2, 6.8, 0.6); fadeLab('lab-ego', 10.6, 11.2, 0.6); fadeLab('lab-disc', 15.4, 16.0, 0.4);
  }

  const typing = [];
  for (const cap of CAPS) for (const [ls, segs] of cap.lines) wordsOf(segs).forEach((w, j) => { const tt = ls + j * WSTEP; if (tt >= 0 && tt < cap.e) typing.push(+tt.toFixed(3)); });
  window.__schedule = { moans: MOANS, shots: SHOTS, slam: 1.5, motivQuit: RUN.motiv.end, egoQuit: RUN.ego.end, motivSit: 6.6, egoSit: 11.0, meta: RUN.disc.end, payoff: BREAK_T, strikes: STRIKES, crowd: [7.8, 9.7], words: typing };
  window.__renderAt = renderAt;
  window.addEventListener('hf-seek', (e) => renderAt(e.detail.time));
  renderAt(0);
})();
