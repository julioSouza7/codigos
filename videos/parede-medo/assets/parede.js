// Quebrar a parede: Disciplina x Obsessão x Ego — 2D vetorial (bonecos de perfil com contorno), função pura do tempo.
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
  const rnd = mulberry32(2119);
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
  const HX = { disc: 95, obs: 430, ego: 765 };
  const WALL_T = 62;
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

  const T0 = 2.6;
  const RUN = {
    ego: { P: 0.46, end: 5.0, rate: 260 },
    disc: { P: 0.8, end: 9.4, rate: 1000 / 6.8 },
    obs: { P: 0.6, end: 14.8, rate: 196 },
  };
  const BREAK_T = 14.8;
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
    const s = easeInOut(seg(t, 5.6, 6.4));
    if (s <= 0) return slump;
    const legs = mixL(STAND_L, SIT_L, s), hipSit = FLOOR - 17;
    return { x: x - 40 * s, hipY: lerp(slump.hipY, hipSit, s), lean: lerp(0.38, 0.42, s), head: lerp(0.5, 0.75, s), legs,
      hands: [P2(slump.hands[0], [x + 60 - 40 * s, FLOOR - 62], s), P2(slump.hands[1], [x + 48 - 40 * s, FLOOR - 58], s)], prefF: 'down', prefB: 'down' };
  }
  function egoHammer(t) {
    const end = RUN.ego.end; if (t < end) return null;
    const last = atRest('ego').hammer;
    const rest = { g: [HX.ego + 110, FLOOR - 92], a: Math.PI * 0.86 };
    const u = easeIn(seg(t, end, end + 0.4));
    return { g: P2(last.g, rest.g, u), a: lerp(last.a, rest.a, u) };
  }
  function discState(t) {
    const end = RUN.disc.end;
    if (t < end) return swinging('disc', t);
    const x = HX.disc, last = atRest('disc');
    const u = easeInOut(seg(t, end, end + 0.45));
    const hy0 = standHipY(STAND_L);
    const rest = { g: [x + 72, FLOOR - 118], a: Math.PI };
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
    const rest = { g: [x + 130, FLOOR - 70], a: Math.PI * 0.7 };
    return { x, hipY: lerp(last.hipY, hy0, u), lean: lerp(last.lean, -0.08 + sway, u), head: lerp(0.1, -0.25, u), legs: mixL(SWING_L, STAND_L, u),
      hands: [P2(last.hands[0], up[0], u), P2(last.hands[1], up[1], u)], prefF: 'fwd', prefB: 'back',
      hammer: { g: P2(last.hammer.g, rest.g, fall), a: lerp(last.hammer.a, rest.a, fall), loose: true } };
  }
  const stateOf = { disc: discState, obs: obsState, ego: egoState };

  // golpes (para poeira, rachaduras e sons)
  const STRIKES = { ego: [], disc: [], obs: [] };
  for (const k of ['ego', 'disc', 'obs']) for (let n = 0; ; n++) { const ts = T0 + RUN[k].P * (n + 0.5); if (ts >= RUN[k].end) break; STRIKES[k].push(ts); }
  const IMPACT_Y = standHipY(SWING_L) + 8 - 112;
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
  const CRACKS = { disc: crackTree(11), obs: crackTree(23), ego: crackTree(37) };
  const CHUNKS = []; for (let i = 0; i < 14; i++) CHUNKS.push({ dy: rr(-110, 110), dx: rr(0, WALL_T), vx: rr(160, 520), vy: rr(-520, -80), r: rr(12, 26), rot: rr(0, 6), sp: rr(-8, 8) });
  const GAP = 118;
  function drawWall(c, k, t, lv) {
    const x0 = wallFace(k), x1 = x0 + WALL_T;
    const broken = k === 'obs' && t >= BREAK_T;
    const I = impact(k);
    const lit = 0.55 + 0.45 * Math.min(1, lv);
    c.save();
    if (broken) { const open = GAP * easeOut(seg(t, BREAK_T, BREAK_T + 0.25)); c.beginPath(); c.rect(x0 - 10, -600, WALL_T + 20, I[1] - open - -600); c.rect(x0 - 10, I[1] + open * 0.95, WALL_T + 20, FLOOR - I[1] - open * 0.95); c.clip(); }
    for (let y = FLOOR - BRICK_H, row = 0; y > -600; y -= BRICK_H, row++) {
      const cuts = row % 2 ? [x0, x0 + WALL_T * 0.45, x1] : [x0, x0 + WALL_T * 0.7, x1];
      for (let i = 0; i < cuts.length - 1; i++) {
        c.beginPath(); c.roundRect(cuts[i] + 2, y + 2, cuts[i + 1] - cuts[i] - 4, BRICK_H - 4, 6);
        c.fillStyle = rgb([70 + (row * 13 + i * 7) % 9, 69 + (row * 13 + i * 7) % 9, 74 + (row * 13 + i * 7) % 9], lit); c.fill();
        c.lineWidth = 3; c.strokeStyle = OUT; c.stroke();
      }
    }
    c.lineWidth = 5; c.strokeStyle = OUT; c.strokeRect(x0, -600, WALL_T, FLOOR + 600);
    c.fillStyle = 'rgba(255,255,255,0.1)'; c.fillRect(x0 + 3, -600, 4, FLOOR + 600);
    // rachaduras proporcionais aos golpes
    const p = crackP(k, t), cr = CRACKS[k], n = Math.floor(p * cr.length);
    c.save(); c.beginPath(); c.rect(x0, -600, WALL_T + 40, FLOOR + 600); c.clip();
    c.translate(I[0], I[1]);
    c.lineCap = 'round';
    for (let i = 0; i < n; i++) { const s = cr[i]; c.strokeStyle = OUT; c.lineWidth = Math.max(2.5, 5.5 - s.gen * 0.6); c.beginPath(); c.moveTo(s.a[0] * 0.55, s.a[1]); c.lineTo(s.b[0] * 0.55, s.b[1]); c.stroke(); }
    c.restore();
    c.save(); c.translate(x0 + WALL_T / 2 + 2, FLOOR - 420); c.rotate(-Math.PI / 2); c.font = '900 34px Montserrat, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = 'rgba(230,228,222,0.55)'; c.fillText('MEDO', 0, 0); c.restore();
    c.restore();
    // luz atravessando a parede quebrada
    if (broken) {
      const d = t - BREAK_T, open = GAP * easeOut(seg(d, 0, 0.25));
      c.save(); c.globalCompositeOperation = 'lighter';
      const g = c.createRadialGradient(x0, I[1], 0, x0, I[1], 300);
      g.addColorStop(0, `rgba(255,255,255,${0.95 * smooth(d / 0.2)})`); g.addColorStop(0.3, 'rgba(255,250,240,0.35)'); g.addColorStop(1, 'rgba(255,250,240,0)');
      c.fillStyle = g; c.fillRect(x0 - 300, I[1] - 300, 300 + WALL_T, 600);
      c.fillStyle = `rgba(255,255,255,${0.9 * smooth(d / 0.15)})`; c.fillRect(x0 - 2, I[1] - open, WALL_T + 4, open * 1.95);
      // raios de luz saindo pelo buraco em direção à obsessão
      c.filter = 'blur(10px)';
      c.fillStyle = `rgba(255,252,246,${0.22 * smooth(d / 0.3)})`;
      c.beginPath(); c.moveTo(x0, I[1] - open); c.lineTo(x0 - 520, I[1] - 330); c.lineTo(x0 - 520, I[1] + 330); c.lineTo(x0, I[1] + open); c.closePath(); c.fill();
      c.restore();
      for (const ch of CHUNKS) {
        const a = d; if (a > 1.3) continue;
        const px = x0 + ch.dx + ch.vx * a, py = I[1] + ch.dy + ch.vy * a + 0.5 * 1600 * a * a;
        if (py > FLOOR - ch.r * 0.6) continue;
        c.save(); c.translate(px, py); c.rotate(ch.rot + ch.sp * a);
        c.beginPath(); c.moveTo(-ch.r, -ch.r * 0.5); c.lineTo(ch.r * 0.3, -ch.r * 0.8); c.lineTo(ch.r, ch.r * 0.3); c.lineTo(-ch.r * 0.2, ch.r * 0.8); c.closePath();
        c.fillStyle = '#4c4b50'; c.fill(); c.lineWidth = 3.5; c.strokeStyle = OUT; c.stroke(); c.restore();
      }
    }
  }
  // entulho no chão ao pé de cada parede (cresce com os golpes)
  function drawRubble(c, k, t) {
    const p = crackP(k, t) + (k === 'obs' && t >= BREAK_T ? 0.6 * easeOut(seg(t, BREAK_T + 0.3, BREAK_T + 1.0)) : 0);
    const x0 = wallFace(k), cnt = Math.floor(p * 9);
    const r = mulberry32(k.length * 97 + 5);
    for (let i = 0; i < cnt; i++) {
      const s = 7 + r() * 10, x = x0 - 12 - r() * 70 + (k === 'obs' && i > 5 ? 120 + r() * 60 : 0);
      c.beginPath(); c.ellipse(x, FLOOR - s * 0.5, s, s * 0.6, r() * 0.6, 0, Math.PI * 2);
      c.fillStyle = '#4a494e'; c.fill(); c.lineWidth = 3; c.strokeStyle = OUT; c.stroke();
    }
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
    const w = easeInOut(seg(t, 15.0, 16.6));
    if (w > 0) { const s2 = 1.06, fx = 540, fy = 960; ox = lerp(ox, 540 - fx * s2, w); oy = lerp(oy, 1010 - fy * s2, w); s = lerp(s, s2, w); }
    const k1 = t >= 1.5 ? Math.exp(-(t - 1.5) * 9) : 0, k2 = t >= BREAK_T ? Math.exp(-(t - BREAK_T) * 6) : 0;
    ox += 15 * k1 * Math.sin((t - 1.5) * 70) + 18 * k2 * Math.sin((t - BREAK_T) * 64);
    oy += 10 * k1 * Math.cos((t - 1.5) * 83) + 14 * k2 * Math.cos((t - BREAK_T) * 77);
    return { s, ox, oy };
  }
  const toScreen = (p, C) => [p[0] * C.s + C.ox, p[1] * C.s + C.oy];

  // ---------- texto digitando ----------
  const CPS = 26;
  const CAPS = [
    { s: -1, e: 2.45, lines: [[-1, [['TRÊS BATEM NO MEDO.']]], [0.36, [['SÓ '], ['UM', 1], [' ATRAVESSA.']]]] },
    { s: 2.6, e: 4.55, lines: [[2.6, [['O EGO BATE']]], [3.05, [['PRA SER VISTO.']]]] },
    { s: 4.65, e: 6.55, lines: [[4.65, [['SEM PLATEIA,']]], [5.15, [['LARGA A MARRETA.']]]] },
    { s: 6.65, e: 8.6, lines: [[6.65, [['A DISCIPLINA']]], [7.15, [['BATE NO RITMO.']]]] },
    { s: 8.7, e: 10.5, lines: [[8.7, [['BATE A META']]], [9.2, [['E PARA.']]]] },
    { s: 10.6, e: 12.6, lines: [[10.6, [['A '], ['OBSESSÃO', 1]]], [11.1, [['PASSA DA META.']]]] },
    { s: 12.7, e: 14.7, lines: [[12.7, [['E CONTINUA']]], [13.15, [['BATENDO.']]]] },
    { s: 14.85, e: 99, big: true, lines: [[14.85, [['O MEDO '], ['CEDEU.', 1]]]] },
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
    for (const k of ['disc', 'obs', 'ego']) drawWall(c, k, t, lv[k]);
    drawMeta(c, t);
    drawCrowd(c, t);
    for (const k of ['disc', 'obs', 'ego']) drawRubble(c, k, t);
    // aura vermelha da obsessão
    const aura = smooth(seg(t, 10.6, 12.0)) * 0.5 + 0.5 * smooth(seg(t, BREAK_T, BREAK_T + 0.6));
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
      const fl = toScreen([HX[k] + 60, FLOOR + 10], C);
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
    const egoLab = document.getElementById('lab-ego'); if (egoLab) egoLab.style.opacity = String(1 - 0.6 * smooth(seg(t, 5.2, 5.8)));
    const discLab = document.getElementById('lab-disc'); if (discLab) discLab.style.opacity = String(1 - 0.4 * smooth(seg(t, 10.6, 11.2)));
  }

  const typing = [];
  for (const cap of CAPS) for (const [ls, segs] of cap.lines) { const total = lenOf(segs); const txt = segs.map((s) => s[0]).join(''); for (let i = 0; i < total; i++) { const tt = ls + (i + 1) / CPS; if (tt >= 0 && tt < cap.e && txt[i] !== ' ') typing.push(+tt.toFixed(3)); } }
  window.__schedule = { slam: 1.5, egoQuit: RUN.ego.end, egoSit: 6.4, meta: RUN.disc.end, payoff: BREAK_T, strikes: STRIKES, crowd: [2.6, 4.75], typing };
  window.__renderAt = renderAt;
  window.addEventListener('hf-seek', (e) => renderAt(e.detail.time));
  renderAt(0);
})();
