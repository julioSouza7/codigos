// Treino (corda): Motivação x Disciplina x Ego x Obsessão — 2D vetorial, função pura do tempo.
// Disputa final EGO x OBSESSÃO: ela para primeiro (dor), o ego passa na frente, ela volta mais rápida e passa o ego. Paleta minimalista; 25 s.
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

  // ---------- boneco ----------
  const THEME = 'corda';
  const D = { headR: 30, limb: 22, torsoW: 25, ol: 5, torso: 100, uArm: 60, fArm: 56, thigh: 82, shin: 78, foot: 20 };
  const OUT = '#0e0e10';
  const WHITE = [247, 247, 245], BACK = [196, 196, 200], DARK = [88, 88, 94], DARKB = [62, 62, 68];
  const NEU = [214, 212, 206], ACC = [214, 80, 66], ACCB = [168, 62, 52];
  const COL = { disc: NEU, obs: NEU, motiv: NEU, ego: NEU };
  const KS = ['disc', 'obs', 'motiv', 'ego'];
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

  // ================= TREINO v3 — agachamento / corda / halteres / saco — disputa final EGO x OBSESSÃO =================
  // ---------- boneco de perfil ----------
  function drawFigure(c, R, light, col, hurt) {
    const f = rgb(mixC(DARK, WHITE, light)), b = rgb(mixC(DARKB, BACK, light));
    const ra = hurt ? hurt.a : 0;
    const fA = ra > 0.001 ? rgb(mixC(mixC(DARK, WHITE, light), mixC(DARK, ACC, light), ra)) : f;
    const bA = ra > 0.001 ? rgb(mixC(mixC(DARKB, BACK, light), mixC(DARKB, ACCB, light), ra)) : b;
    if (col && light > 0.5) {
      c.save(); c.globalAlpha = 0.55 * (light - 0.5) * 2; c.filter = 'blur(8px)';
      for (const L of [R.legB, R.armB, R.legF, R.armF, [R.hip, R.sh]]) strokePts(c, L, D.limb + 14, rgb(col));
      disc(c, R.head, D.headR + 9, rgb(col)); c.restore();
    }
    if (hurt && hurt.g > 0.01) { c.save(); c.globalAlpha = hurt.g; c.filter = 'blur(10px)'; strokePts(c, R.armB, D.limb + 20, rgb(ACC)); strokePts(c, R.armF, D.limb + 20, rgb(ACC)); c.restore(); }
    limb(c, R.legB, D.limb, b);
    limb(c, R.armB, D.limb, bA);
    strokePts(c, [R.hip, R.sh], D.torsoW + 2 * D.ol, OUT);
    strokePts(c, R.legF, D.limb + 2 * D.ol, OUT);
    strokePts(c, [R.hip, R.sh], D.torsoW, f);
    strokePts(c, R.legF, D.limb, f);
    const armUp = R.armF[2][1] < R.head[1] + 10;
    if (!armUp) limb(c, R.armF, D.limb, fA);
    disc(c, R.head, D.headR + D.ol, OUT); disc(c, R.head, D.headR, f);
    if (armUp) limb(c, R.armF, D.limb, fA);
  }
  // ---------- boneco de frente ----------
  const FW = { shW: 23, hipW: 11 };
  const PREF_OUT = [(c) => -c[0] + 0.25 * c[1], (c) => c[0] + 0.25 * c[1]];
  const PREF_UP = [(c) => -0.4 * c[0] - c[1], (c) => 0.4 * c[0] - c[1]];
  const PREF_IN = [(c) => c[0] + 0.6 * c[1], (c) => -c[0] + 0.6 * c[1]];
  function rigF(st) {
    const tl = st.tilt || 0, up = [Math.sin(tl), -Math.cos(tl)], sd = [Math.cos(tl), Math.sin(tl)];
    const hip = [st.x, st.hipY], tk = st.torsoK ?? 1;
    const neck = add(hip, [up[0] * D.torso * tk, up[1] * D.torso * tk]);
    const shC = add(hip, [up[0] * (D.torso - 10) * tk, up[1] * (D.torso - 10) * tk]);
    const sh = [add(shC, [-sd[0] * FW.shW, -sd[1] * FW.shW]), add(shC, [sd[0] * FW.shW, sd[1] * FW.shW])];
    const hp = [add(hip, [-sd[0] * FW.hipW, -sd[1] * FW.hipW]), add(hip, [sd[0] * FW.hipW, sd[1] * FW.hipW])];
    const head = add(neck, [up[0] * (D.headR + 8), up[1] * (D.headR + 8) + (st.nod || 0)]);
    const arms = [0, 1].map((i) => { const r = ikP(sh[i], st.hands[i], D.uArm, D.fArm, (st.elbIn ? PREF_IN : PREF_OUT)[i]); return [sh[i], r.E, r.H]; });
    const kp = st.kneeUp ? PREF_UP : PREF_OUT;
    const legs = [0, 1].map((i) => { const r = ikP(hp[i], st.ankles[i], D.thigh * (st.thighK ?? 1), D.shin * (st.shinK ?? 1), kp[i]); const s = i ? 1 : -1;
      return [hp[i], r.E, r.H, add(r.H, st.feetDown ? [s * 5, 13] : [s * 15, 4])]; });
    return { front: true, hip, neck, shC, sh, head, arms, legs, kneeUp: !!st.kneeUp };
  }
  function drawFigF(c, R, light, col, hurt) {
    const f = rgb(mixC(DARK, WHITE, light)), ra = hurt ? hurt.a : 0;
    const fR = ra > 0.001 ? rgb(mixC(mixC(DARK, WHITE, light), mixC(DARK, ACC, light), ra)) : f;
    const legsRed = PART === 'legs', fL = legsRed ? fR : f, fA = legsRed ? f : fR;
    if (col && light > 0.5) {
      c.save(); c.globalAlpha = 0.55 * (light - 0.5) * 2; c.filter = 'blur(8px)';
      for (const L of [...R.legs, ...R.arms, [R.hip, R.neck], R.sh]) strokePts(c, L, D.limb + 14, rgb(col));
      disc(c, R.head, D.headR + 9, rgb(col)); c.restore();
    }
    if (hurt && hurt.g > 0.01) { c.save(); c.globalAlpha = hurt.g; c.filter = 'blur(10px)'; for (const L of (legsRed ? R.legs : R.arms)) strokePts(c, L, D.limb + 20, rgb(ACC)); c.restore(); }
    const legs = () => { for (const L of R.legs) strokePts(c, L, D.limb + 2 * D.ol, OUT); for (const L of R.legs) strokePts(c, L, D.limb, fL); };
    if (!R.kneeUp) legs();
    strokePts(c, [R.hip, R.neck], D.torsoW + 2 * D.ol, OUT); strokePts(c, R.sh, D.limb + 2 * D.ol, OUT);
    strokePts(c, [R.hip, R.neck], D.torsoW, f); strokePts(c, R.sh, D.limb, f);
    if (R.kneeUp) legs();
    disc(c, R.head, D.headR + D.ol, OUT); disc(c, R.head, D.headR, f);
    for (const L of R.arms) limb(c, L, D.limb, fA);
  }

  // ---------- tempos (iguais nos 4 temas) ----------
  const T0 = 3.0, BREAK_T = 19.0, FALL_T = 13.8, FALL_HIT = 14.1, REGRAB_T = 15.4, CLIMB_T = 18.5, SIT_EGO = 17.9, CROWD = [10.9, 16.5];
  const PAIN0 = 11.6, PAIN1 = 13.0;
  const hurtOf = (t) => smooth(seg(t, PAIN0, PAIN1));
  const RUN = { motiv: { end: 5.6, rate: 300 }, disc: { end: 10.0, rate: 1000 / 7 }, ego: { end: 17.3, rate: 145 }, obs: { end: BREAK_T, rate: 150, rate2: 330 } };
  const hits = (k, t) => (k !== 'obs' ? RUN[k].rate * clamp(t - T0, 0, RUN[k].end - T0)
    : RUN.obs.rate * (clamp(t, T0, FALL_T) - T0) + RUN.obs.rate2 * clamp(t - REGRAB_T, 0, BREAK_T - REGRAB_T));
  const EGO_FINAL = hits('ego', 99);
  const EGO_PASS = T0 + hits('obs', FALL_T) / RUN.ego.rate;
  const PASS_T = (hits('obs', FALL_T) - RUN.obs.rate2 * REGRAB_T + RUN.ego.rate * T0) / (RUN.ego.rate - RUN.obs.rate2);

  // ---------- mistura de poses ----------
  const STAND_L = { fT: 0.06, fS: -0.02, bT: -0.1, bS: -0.06 };
  const SIT_L = { fT: 2.3, fS: 0.8, bT: 2.15, bS: 0.7 };
  const mixL = (a, b, u) => ({ fT: lerp(a.fT, b.fT, u), fS: lerp(a.fS, b.fS, u), bT: lerp(a.bT, b.bT, u), bS: lerp(a.bS, b.bS, u) });
  const mixProp = (A, B, u) => (A.prop && B.prop ? A.prop.map((v, i) => lerp(v, B.prop[i], u)) : u < 0.5 ? A.prop : B.prop);
  const mixP = (A, B, u) => ({ x: lerp(A.x, B.x, u), hipY: lerp(A.hipY, B.hipY, u), lean: lerp(A.lean, B.lean, u), head: lerp(A.head || 0, B.head || 0, u),
    legs: mixL(A.legs, B.legs, u), hands: [P2(A.hands[0], B.hands[0], u), P2(A.hands[1], B.hands[1], u)],
    prefF: u < 0.5 ? A.prefF : B.prefF, prefB: u < 0.5 ? A.prefB : B.prefB, prop: mixProp(A, B, u), glove: A.glove || B.glove });
  const mixF = (A, B, u) => ({ front: true, x: lerp(A.x, B.x, u), hipY: lerp(A.hipY, B.hipY, u), tilt: lerp(A.tilt || 0, B.tilt || 0, u), nod: lerp(A.nod || 0, B.nod || 0, u),
    torsoK: lerp(A.torsoK ?? 1, B.torsoK ?? 1, u), thighK: lerp(A.thighK ?? 1, B.thighK ?? 1, u), shinK: lerp(A.shinK ?? 1, B.shinK ?? 1, u),
    hands: [P2(A.hands[0], B.hands[0], u), P2(A.hands[1], B.hands[1], u)], ankles: [P2(A.ankles[0], B.ankles[0], u), P2(A.ankles[1], B.ankles[1], u)],
    kneeUp: u < 0.5 ? A.kneeUp : B.kneeUp, feetDown: u < 0.5 ? A.feetDown : B.feetDown, elbIn: u < 0.5 ? A.elbIn : B.elbIn, prop: mixProp(A, B, u) });
  const mixSt = (A, B, u) => (A.front ? mixF(A, B, u) : mixP(A, B, u));
  function seqSt(keys, t) {
    let i = 0; while (i < keys.length - 1 && t >= keys[i + 1][0]) i++;
    const cur = keys[i][1](t);
    if (i === 0) return cur;
    const t1 = keys[i][0], dur = keys[i][2] || 0.3, ease = keys[i][3] || easeInOut, u = ease(seg(t, t1, t1 + dur));
    if (u >= 1) return cur;
    return mixSt(keys[i - 1][1](t1), cur, u);
  }
  const breathe = (t, ph) => 2.5 * Math.sin(t * 2.2 + ph);
  const phOf = (t, t0, P) => (((t - t0) / P) % 1 + 1) % 1;
  const withProp = (s, p) => Object.assign(s, { prop: p });
  const litOf = (lv) => clamp(0.35 + 0.65 * Math.min(1, lv / 0.85));
  const metalC = (lit) => rgb([150, 150, 156], lit), plateC = (lit) => rgb([62, 62, 68], lit);

  // ---------- poses de frente comuns ----------
  const STAND_HY = FLOOR - 174;
  function standF(x, o = {}) { const hy = STAND_HY + (o.dy || 0); return { front: true, x, hipY: hy, tilt: o.tilt || 0, nod: o.nod || 0, torsoK: o.torsoK ?? 1, hands: o.hands || [[x - 38, hy + 22], [x + 38, hy + 22]], ankles: [[x - 20, FLOOR - 17], [x + 20, FLOOR - 17]] }; }
  function landF(x) { const hy = FLOOR - 17 - 112; return { front: true, x, hipY: hy, nod: 10, torsoK: 0.95, hands: [[x - 54, hy + 40], [x + 54, hy + 40]], ankles: [[x - 36, FLOOR - 17], [x + 36, FLOOR - 17]] }; }
  const slumpF = (x) => { const s = standF(x, { nod: 14, torsoK: 0.94 }); s.hands = [[x - 34, s.hipY + 30], [x + 34, s.hipY + 30]]; return s; };
  const hipsF = (x) => { const s = standF(x, { nod: -3 }); s.hands = [[x - 27, s.hipY - 4], [x + 27, s.hipY - 4]]; return s; };
  const sitF = (x) => ({ front: true, x, hipY: FLOOR - 24, torsoK: 0.86, nod: 16, kneeUp: true, hands: [[x - 32, FLOOR - 98], [x + 32, FLOOR - 98]], ankles: [[x - 42, FLOOR - 15], [x + 42, FLOOR - 15]] });
  const kneelF = (x, o = {}) => ({ front: true, x, hipY: FLOOR - 74 + (o.dy || 0), torsoK: 0.9, tilt: o.tilt || 0, nod: o.nod ?? 18, thighK: 0.75, shinK: 0.1,
    hands: o.hands || [[x - 46, FLOOR - 30], [x + 46, FLOOR - 30]], ankles: [[x - 30, FLOOR - 14], [x + 30, FLOOR - 14]] });
  const kneelBreath = (x, extra) => (tt) => Object.assign(kneelF(x, { nod: 18 + 2 * Math.sin(tt * 5), dy: 1.5 * Math.sin(tt * 9) }), extra || {});
  // ---------- poses de perfil comuns ----------
  const standP = (x, o = {}) => { const hy = standHipY(STAND_L); return { x, hipY: hy, lean: o.lean ?? 0.03, head: o.head ?? 0, legs: STAND_L, hands: o.hands || [[x + 16, hy + 20], [x + 4, hy + 22]], prefF: o.prefF || 'down', prefB: o.prefB || 'down' }; };
  const slumpP = (x) => { const hy = standHipY(STAND_L); return { x, hipY: hy, lean: 0.38, head: 0.5, legs: STAND_L, hands: [[x + 18, hy + 40], [x + 6, hy + 44]], prefF: 'down', prefB: 'down' }; };
  const sitP = (x) => ({ x: x - 40, hipY: FLOOR - 17, lean: 0.42, head: 0.75, legs: SIT_L, hands: [[x + 20, FLOOR - 62], [x + 8, FLOOR - 58]], prefF: 'down', prefB: 'down' });
  const hipsP = (x) => { const hy = standHipY(STAND_L); return standP(x, { lean: -0.03, head: -0.1, hands: [[x + 16, hy - 16], [x + 6, hy - 20]], prefF: 'back', prefB: 'back' }); };
  function kneelAt(kx, o = {}) {
    const hip = [kx, FLOOR - 13 - 82], lean = o.lean ?? 0.04;
    const hands = o.hands || [[kx + 30, hip[1] + 10], [kx + 18, hip[1] + 14]];
    return { x: hip[0], hipY: hip[1] + (o.dy || 0), lean, head: o.head ?? 0, legs: { fT: 0, fS: -1.85, bT: 0.04, bS: -1.82 }, hands, prefF: o.prefF || 'down', prefB: o.prefB || 'down' };
  }

  // =====================================================================================
  // TEMAS
  // =====================================================================================
  const FRONT_HX = { motiv: 210, disc: 510, ego: 810, obs: 1110 };
  const FRONT_CAM = { wide: { cx: 660, cy: 960, s: 0.88, sy: 950 }, single: { cy: FLOOR - 215, s: 1.5, sy: 845 }, duel: { cy: FLOOR - 215, s: 1.42, sy: 830, bias: 38 } };
  const sparks = (c, p, a, col, n = 8) => { if (a < 0 || a > 0.3) return; const u = a / 0.3; c.save(); c.strokeStyle = col || `rgba(255,255,255,${(1 - u).toFixed(3)})`; c.globalAlpha = 1 - u; c.lineWidth = 5; c.lineCap = 'round';
    for (let i = 0; i < n; i++) { const an = i * 2 * Math.PI / n + 0.2, r0 = 24 + 40 * easeOut(u), r1 = r0 + 20; c.beginPath(); c.moveTo(p[0] + Math.cos(an) * r0, p[1] + Math.sin(an) * r0); c.lineTo(p[0] + Math.cos(an) * r1, p[1] + Math.sin(an) * r1); c.stroke(); } c.restore(); };

  // ---------- AGACHAMENTO (de frente, barra nas costas; dói nas pernas) ----------
  function AGACH() {
    const HX = FRONT_HX, P = { motiv: 0.5, disc: 0.95, ego: 0.75, obs: 0.8 }, N2 = 8, PER2 = 3.1 / N2;
    const sqD = (ph) => (ph < 0.42 ? easeInOut(ph / 0.42) : ph < 0.5 ? 1 : ph < 0.82 ? 1 - easeOut((ph - 0.5) / 0.32) : 0);
    const hookD = (t) => (t < 0.6 ? 0 : t < 1.15 ? easeInOut(seg(t, 0.6, 1.15)) : t < 1.5 ? 1 - easeOut(seg(t, 1.15, 1.5)) : 0);
    function squatF(x, d, o = {}) {
      const air = o.air || 0, hy = lerp(STAND_HY, FLOOR - 100, d) - air + (o.dy || 0), tk = lerp(1, 0.9, d), shY = hy - (D.torso - 10) * tk, by = shY - 8;
      return { front: true, x, hipY: hy, torsoK: tk, nod: lerp(0, 6, d) + (o.nod || 0), hands: [[x - 64, by], [x + 64, by]],
        ankles: [[x - 36, FLOOR - 17 - air], [x + 36, FLOOR - 17 - air]], feetDown: air > 3, prop: [x, by, o.sag || 0] };
    }
    const floorBar = (x) => [x + 4, FLOOR - 44, 0];
    const cyc = (k) => (t) => (t < T0 ? squatF(HX[k], hookD(t), { dy: t < 0.6 ? 0.5 * breathe(t, HX[k] * 0.01) : 0 }) : squatF(HX[k], sqD(phOf(t, T0, P[k]))));
    const quit = (k, sitAt) => { const x = HX[k], e = RUN[k].end; return (t) => seqSt([[0, cyc(k)], [e, () => withProp(slumpF(x), floorBar(x)), 0.35, easeIn], [sitAt, () => withProp(sitF(x), floorBar(x)), 0.8]], t); };
    const xd = HX.disc, xo = HX.obs;
    const airOf = (t) => (Math.abs(t - 19.0) < 0.16 ? 74 * (1 - ((t - 19.0) / 0.16) ** 2) : 0);
    const jump = (t) => {
      let d;
      if (t < 18.72) d = easeInOut(seg(t, CLIMB_T, 18.72));
      else if (t < 18.86) d = 1 - easeOut(seg(t, 18.72, 18.86));
      else if (t < 19.16) d = 0.05;
      else if (t < 19.3) d = 0.45 * easeOut(seg(t, 19.16, 19.3));
      else d = 0.45 * (1 - easeInOut(seg(t, 19.3, 19.6)));
      const sag = t < 19.16 ? -7 * Math.sin(Math.PI * seg(t, 18.84, 19.16)) : 16 * Math.exp(-(t - 19.16) * 5) * Math.cos((t - 19.16) * 28);
      return squatF(xo, d, { air: airOf(t), sag, nod: t > 19.6 ? -6 : 0 });
    };
    const stateOf = {
      motiv: quit('motiv', 6.2), ego: quit('ego', SIT_EGO),
      disc: (t) => seqSt([[0, cyc('disc')], [RUN.disc.end, () => squatF(xd, 0), 0.3], [RUN.disc.end + 0.4, () => withProp(standF(xd), floorBar(xd)), 0.6], [RUN.disc.end + 1.05, () => withProp(hipsF(xd), floorBar(xd)), 0.35]], t),
      obs: (t) => seqSt([
        [0, cyc('obs')],
        [FALL_T, () => withProp(kneelF(xo, { nod: 10 }), floorBar(xo)), 0.3, easeIn],
        [FALL_HIT, kneelBreath(xo, { prop: floorBar(xo) }), 0.1],
        [14.85, () => withProp(standF(xo, { nod: -6 }), floorBar(xo)), 0.4],
        [15.05, () => squatF(xo, 0.35), 0.33],
        [REGRAB_T, (tt) => squatF(xo, sqD(phOf(tt, REGRAB_T, PER2))), 0.08],
        [CLIMB_T, jump, 0.01],
      ], t),
    };
    function drawBar(c, p, lit) {
      const [x, y, sag] = p, L = 128;
      c.lineCap = 'round';
      c.beginPath(); c.moveTo(x - L, y + sag); c.quadraticCurveTo(x, y - sag, x + L, y + sag); c.lineWidth = 11 + 8; c.strokeStyle = OUT; c.stroke(); c.lineWidth = 11; c.strokeStyle = metalC(lit); c.stroke();
      for (const s of [-1, 1]) { const px = x + s * 106, py = y + sag * 0.9; c.fillStyle = plateC(lit); c.strokeStyle = OUT; c.lineWidth = 4; c.beginPath(); c.roundRect(px - 13, py - 44, 26, 88, 6); c.fill(); c.stroke(); c.fillStyle = metalC(lit); c.fillRect(px - s * 22 - 4, py - 10, 8, 20); }
    }
    return {
      view: 'front', part: 'legs', HX, CX: (k) => HX[k], P, PER2, repPh: [0.55], payRep: 18.86, stateOf, cam: FRONT_CAM,
      crowdX: [632, 690, 748], crowdSc: 0.85, metaY: FLOOR - 470,
      drawBack(c, k, t, lv, st) { drawBar(c, st.prop, litOf(lv)); },
      drawFront() {},
      painSpots: (R) => [[R.legs[0][1], -2.6], [R.legs[1][1], -0.54]],
      burst() {},
      thuds: [[RUN.motiv.end + 0.35, 0.4, 'motiv'], [6.9, 0.3, 'motiv'], [FALL_HIT, 1.0, 'obs'], [RUN.ego.end + 0.35, 0.4, 'ego'], [19.16, 1.0, 'obs']],
      clanks: [[RUN.motiv.end + 0.33, 0.8], [RUN.disc.end + 1.0, 0.35], [FALL_T + 0.3, 1.0], [RUN.ego.end + 0.33, 0.8], [15.38, 0.3], [19.18, 0.7]],
    };
  }

  // ---------- PULAR CORDA (de frente; dói nas pernas) ----------
  function CORDA() {
    const HX = FRONT_HX, P = { motiv: 0.32, disc: 0.5, ego: 0.42, obs: 0.45 }, N2 = 12, PER2 = 3.1 / N2, TAU = 2 * Math.PI, REST = Math.PI + 0.9, SLACK = Math.PI - 0.25;
    const wrap = (a) => ((a % TAU) + TAU) % TAU;
    const hopOf = (th) => { const w = wrap(th - Math.PI), d = Math.min(w, TAU - w); return 26 * smooth(1 - d / 1.3); };
    function skipF(x, th, o = {}) {
      const hop = o.hop ?? hopOf(th), hy = STAND_HY - hop, sp = o.spin ?? 1;
      return { front: true, x, hipY: hy, nod: o.nod || 0, elbIn: !o.hands, hands: o.hands || [[x - 62 - 5 * Math.cos(th) * sp, hy + 8 + 7 * Math.sin(th) * sp], [x + 62 + 5 * Math.cos(th) * sp, hy + 8 + 7 * Math.sin(th) * sp]],
        ankles: [[x - 16, FLOOR - 17 - hop], [x + 16, FLOOR - 17 - hop]], feetDown: hop > 3, prop: [wrap(th), 0, 0] };
    }
    const hookTh = (t) => (t < 0.9 ? REST : t < 1.5 ? lerp(REST, 3 * Math.PI, (t - 0.9) / 0.6) : t < 2.1 ? lerp(3 * Math.PI, 3 * Math.PI + 0.9, easeOut(seg(t, 1.5, 2.1))) : REST + TAU);
    const thAt = (t, t0, per) => REST + TAU * (t - t0) / per;
    const cyc = (k) => (t) => (t < T0 ? skipF(HX[k], hookTh(t), { spin: t > 0.9 && t < 2.1 ? 1 : 0 }) : skipF(HX[k], thAt(t, T0, P[k])));
    const restF = (s) => withProp(s, [REST, 1, 0]);
    const quit = (k, sitAt) => { const x = HX[k], e = RUN[k].end; return (t) => seqSt([[0, cyc(k)], [e, () => restF(landF(x)), 0.3], [e + 0.6, () => restF(slumpF(x)), 0.4], [sitAt, () => restF(sitF(x)), 0.8]], t); };
    const xd = HX.disc, xo = HX.obs;
    const dbl = (t) => {   // pulo duplo: a corda passa duas vezes num pulo só
      const th0 = thAt(18.84, REGRAB_T, PER2);
      if (t < 18.84) return skipF(xo, thAt(t, REGRAB_T, PER2));
      const air = Math.abs(t - 19.0) < 0.16 ? 96 * (1 - ((t - 19.0) / 0.16) ** 2) : 0;
      if (t < 19.16) return skipF(xo, th0 + 2 * TAU * seg(t, 18.84, 19.16), { hop: air });
      const th1 = th0 + 2 * TAU, settle = easeOut(seg(t, 19.16, 19.5));
      if (t < 19.5) return skipF(xo, lerp(th1, th1 + (REST - wrap(th1) + TAU) % TAU, settle), { hop: 0, spin: 1 - settle });
      const hy = STAND_HY, up = easeOut(seg(t, 19.5, 19.85));
      return withProp(standF(xo, { nod: -6 * up, hands: [P2([xo - 56, hy + 2], [xo - 80, hy - 210], up), P2([xo + 56, hy + 2], [xo + 80, hy - 210], up)] }), [REST, 1, 0]);
    };
    const stateOf = {
      motiv: quit('motiv', 6.2), ego: quit('ego', SIT_EGO),
      disc: (t) => seqSt([[0, cyc('disc')], [RUN.disc.end, () => restF(standF(xd)), 0.3], [RUN.disc.end + 0.45, () => restF(hipsF(xd)), 0.35]], t),
      obs: (t) => seqSt([
        [0, cyc('obs')],
        [FALL_T, () => withProp(kneelF(xo, { nod: 10 }), [SLACK, 2, 0]), 0.3, easeIn],
        [FALL_HIT, kneelBreath(xo, { prop: [SLACK, 2, 0] }), 0.1],
        [14.85, () => restF(standF(xo, { nod: -6 })), 0.4],
        [15.15, () => restF(skipF(xo, REST, { hop: 0 })), 0.2],
        [REGRAB_T, (tt) => skipF(xo, thAt(tt, REGRAB_T, PER2)), 0.08],
        [CLIMB_T, dbl, 0.01],
      ], t),
    };
    function rope(c, R, th, lit, front, alpha = 1) {
      const w = wrap(th), isFront = w < Math.PI; if (isFront !== front) return;
      const H0 = R.arms[0][2], H1 = R.arms[1][2], hy = (H0[1] + H1[1]) / 2, x = (H0[0] + H1[0]) / 2;
      const Lup = hy - (R.head[1] - D.headR - 30), Ldn = FLOOR - 5 - hy, cs = Math.cos(w), apex = hy - (cs >= 0 ? Lup : Ldn) * cs;
      c.save(); c.globalAlpha = alpha; c.lineCap = 'round';
      c.beginPath(); c.moveTo(H0[0], H0[1]); c.quadraticCurveTo(x, 2 * apex - hy, H1[0], H1[1]); c.lineWidth = 6 + 7; c.strokeStyle = OUT; c.stroke(); c.lineWidth = 6; c.strokeStyle = rgb([236, 234, 228], lit); c.stroke(); c.restore();
    }
    const blur = (t, k) => (k === 'obs' && t > 18.84 && t < 19.16 ? [[-0.6, 0.35], [-1.2, 0.18]] : []);
    return {
      view: 'front', part: 'legs', HX, CX: (k) => HX[k], P, PER2, repPh: [(TAU - 0.9) / TAU], payRep: 19.0, stateOf, cam: FRONT_CAM,
      crowdX: [632, 690, 748], crowdSc: 0.85, metaY: FLOOR - 470,
      drawBack(c, k, t, lv, st, R) { const lit = litOf(lv); rope(c, R, st.prop[0], lit, false); for (const [d, a] of blur(t, k)) rope(c, R, st.prop[0] + d, lit, false, a); },
      drawFront(c, k, t, lv, st, R) { const lit = litOf(lv); rope(c, R, st.prop[0], lit, true); for (const [d, a] of blur(t, k)) rope(c, R, st.prop[0] + d, lit, true, a);
        for (const A of R.arms) { const h = A[2]; c.fillStyle = plateC(lit); c.strokeStyle = OUT; c.lineWidth = 3; c.beginPath(); c.roundRect(h[0] - 7, h[1] - 16, 14, 32, 5); c.fill(); c.stroke(); } },
      painSpots: (R) => [[R.legs[0][1], -2.6], [R.legs[1][1], -0.54]],
      burst() {},
      thuds: [[FALL_HIT, 1.0, 'obs'], [19.16, 0.8, 'obs'], [6.9, 0.3, 'motiv']],
      clanks: [],
    };
  }

  // ---------- HALTERES — desenvolvimento (de frente; dói nos braços) ----------
  function HALTER() {
    const HX = FRONT_HX, P = { motiv: 0.45, disc: 0.9, ego: 0.65, obs: 0.7 }, N2 = 8, PER2 = 3.1 / N2;
    const prU = (ph) => (ph < 0.36 ? easeInOut(ph / 0.36) : ph < 0.46 ? 1 : 1 - easeInOut((ph - 0.46) / 0.54));
    const hookU = (t) => (t < 0.85 ? 0 : t < 1.5 ? easeInOut(seg(t, 0.85, 1.5)) : t < 1.7 ? 1 : 1 - easeInOut(seg(t, 1.7, 2.5)));
    function pressF(x, u, o = {}) {
      const hy = STAND_HY + (o.dy || 0), shY = hy - 90, cl = o.clink || 0;
      const hl = [x - lerp(60, 48, u) + cl, shY - lerp(-2, 110, u)], hr = [x + lerp(60, 48, u) - cl, shY - lerp(-2, 110, u)];
      return { front: true, x, hipY: hy, nod: (o.nod || 0) - 4 * u, hands: [hl, hr], ankles: [[x - 22, FLOOR - 17], [x + 22, FLOOR - 17]], prop: [...hl, ...hr] };
    }
    const floorDB = (x) => [x - 74, FLOOR - 19, x + 74, FLOOR - 19];
    const cyc = (k) => (t) => (t < T0 ? pressF(HX[k], hookU(t), { dy: t < 0.85 ? 0.5 * breathe(t, HX[k] * 0.01) : 0 }) : pressF(HX[k], prU(phOf(t, T0, P[k]))));
    const quit = (k, sitAt) => { const x = HX[k], e = RUN[k].end; return (t) => seqSt([[0, cyc(k)], [e, () => withProp(slumpF(x), floorDB(x)), 0.35, easeIn], [sitAt, () => withProp(sitF(x), floorDB(x)), 0.8]], t); };
    const xd = HX.disc, xo = HX.obs;
    const sides = (x) => { const s = standF(x); return withProp(s, [...s.hands[0], ...s.hands[1]]); };
    const fin = (t) => {
      if (t < 18.7) return pressF(xo, 1 - easeInOut(seg(t, CLIMB_T, 18.7)));
      if (t < 18.95) return pressF(xo, easeInOut(seg(t, 18.7, 18.95)));
      const cl = t < 19.0 ? 22 * easeIn(seg(t, 18.95, 19.0)) : 22 * (1 - easeOut(seg(t, 19.0, 19.3))) + 2;
      return pressF(xo, 1, { clink: cl, nod: -4 });
    };
    const stateOf = {
      motiv: quit('motiv', 6.2), ego: quit('ego', SIT_EGO),
      disc: (t) => seqSt([[0, cyc('disc')], [RUN.disc.end, () => pressF(xd, 0), 0.3], [RUN.disc.end + 0.35, () => sides(xd), 0.45]], t),
      obs: (t) => seqSt([
        [0, cyc('obs')],
        [FALL_T, () => withProp(kneelF(xo, { nod: 10 }), floorDB(xo)), 0.3, easeIn],
        [FALL_HIT, kneelBreath(xo, { prop: floorDB(xo) }), 0.1],
        [14.85, () => withProp(standF(xo, { nod: -6 }), floorDB(xo)), 0.35],
        [15.05, () => { const s = landF(xo); return withProp(s, [...s.hands[0], ...s.hands[1]]); }, 0.18],
        [15.22, () => pressF(xo, 0), 0.18],
        [REGRAB_T, (tt) => pressF(xo, prU(phOf(tt, REGRAB_T, PER2))), 0.06],
        [CLIMB_T, fin, 0.01],
      ], t),
    };
    function dumbbell(c, p, lit) {
      const [x, y] = p; c.lineCap = 'round';
      strokePts(c, [[x - 24, y], [x + 24, y]], 8 + 8, OUT); strokePts(c, [[x - 24, y], [x + 24, y]], 8, metalC(lit));
      for (const s of [-1, 1]) { c.fillStyle = plateC(lit); c.strokeStyle = OUT; c.lineWidth = 4; c.beginPath(); c.roundRect(x + s * 22 - 8, y - 18, 16, 36, 5); c.fill(); c.stroke(); }
    }
    return {
      view: 'front', part: 'arms', HX, CX: (k) => HX[k], P, PER2, repPh: [0.3], payRep: 18.9, stateOf, cam: FRONT_CAM,
      crowdX: [632, 690, 748], crowdSc: 0.85, metaY: FLOOR - 470,
      drawBack() {},
      drawFront(c, k, t, lv, st) { const lit = litOf(lv), p = st.prop; dumbbell(c, [p[0], p[1]], lit); dumbbell(c, [p[2], p[3]], lit); },
      painSpots: (R) => [[R.sh[0], -2.45], [R.sh[1], -0.69]],
      burst(c, t, stateOf) { const st = stateOf.obs(BREAK_T); sparks(c, [(st.prop[0] + st.prop[2]) / 2, st.prop[1] - 4], t - BREAK_T); },
      thuds: [[FALL_HIT, 1.0, 'obs'], [6.9, 0.3, 'motiv']],
      clanks: [[RUN.motiv.end + 0.33, 0.7], [FALL_T + 0.3, 1.0], [RUN.ego.end + 0.33, 0.7], [15.2, 0.25]],
    };
  }

  // ---------- SACO DE PANCADA (de lado; dói nos braços; no fim a corrente arrebenta) ----------
  function SACO() {
    const HX = { motiv: 60, disc: 355, ego: 650, obs: 945 }, P = { motiv: 0.6, disc: 1.0, ego: 0.8, obs: 0.8 }, N2 = 7, PER2 = 3.1 / N2;
    const STANCE_L = { fT: 0.3, fS: -0.08, bT: -0.34, bS: -0.2 }, BXo = 213, BAG_TOP = FLOOR - 470, BAG_H = 240, BAG_W = 84, CHAIN_TOP = FLOOR - 1100;
    const armRoot = (x, hy, lean) => [x + Math.sin(lean) * (D.torso - 12), hy - Math.cos(lean) * (D.torso - 12)];
    const punch = (u) => (u < 0.22 ? easeOut(u / 0.22) : u < 0.32 ? 1 : 1 - easeInOut(clamp((u - 0.32) / 0.4)));
    function fightSt(k, jab, cross, o = {}) {
      const x = HX[k] + 6 * (jab + cross) + (o.dx || 0), hy = standHipY(STANCE_L) + 4 * Math.max(jab, cross) + (o.dy || 0), lean = 0.12 + 0.14 * cross + 0.06 * jab + (o.lean || 0);
      const ar = armRoot(x, hy, lean), face = HX[k] + BXo - BAG_W / 2 - 4, hit = [face - 14, ar[1] + 6];
      const gF = [ar[0] + 40, ar[1] + 8], gB = o.back || [ar[0] + 24, ar[1] + 20];
      return { x, hipY: hy, lean, head: 0.05 - 0.05 * cross, legs: STANCE_L, hands: [P2(gF, hit, jab), P2(gB, hit, cross)], prefF: 'down', prefB: 'down', glove: true };
    }
    const combo = (k, t, t0, per) => { const ph = phOf(t, t0, per); return ph < 0.5 ? fightSt(k, punch(ph / 0.5), 0) : fightSt(k, 0, punch((ph - 0.5) / 0.5)); };
    const hookJ = (t) => (t < 1.28 ? 0 : punch(seg(t, 1.28, 2.28)));
    const cyc = (k) => (t) => (t < T0 ? fightSt(k, 0, hookJ(t), { dy: t < 1.2 ? 0.5 * breathe(t, HX[k] * 0.01) : 0 }) : combo(k, t, T0, P[k]));
    const quit = (k, sitAt) => { const x = HX[k], e = RUN[k].end; return (t) => seqSt([[0, cyc(k)], [e, () => standP(x, { lean: 0.2, head: 0.3 }), 0.4], [e + 0.45, (tt) => slumpP(x), 0.4], [sitAt, () => sitP(x), 0.8]], t); };
    const xd = HX.disc, xo = HX.obs;
    const fin = (t) => {
      if (t < 18.85) { const w = easeInOut(seg(t, CLIMB_T, 18.85)), ar = armRoot(xo, standHipY(STANCE_L), 0.12); return fightSt('obs', 0, 0, { lean: -0.1 * w, dx: -8 * w, back: P2([ar[0] + 24, ar[1] + 20], [ar[0] - 26, ar[1] + 14], w) }); }
      if (t < 19.3) return fightSt('obs', 0, easeIn(seg(t, 18.85, 19.0)), { lean: 0.1, dx: 12 });
      const hy = standHipY(STAND_L), up = easeOut(seg(t, 19.4, 19.8));
      return mixP(fightSt('obs', 0, 1, { lean: 0.1, dx: 12 }), standP(xo + 18, { head: -0.25, lean: -0.04, hands: [[xo + 64, hy - 250], [xo - 6, hy - 240]], prefF: 'fwd', prefB: 'back' }), up);
    };
    const stateOf = {
      motiv: quit('motiv', 6.2), ego: quit('ego', SIT_EGO),
      disc: (t) => seqSt([[0, cyc('disc')], [RUN.disc.end, () => standP(xd), 0.4], [RUN.disc.end + 0.5, () => hipsP(xd), 0.35]], t),
      obs: (t) => seqSt([
        [0, cyc('obs')],
        [FALL_T, () => kneelAt(xo + 20, { lean: 1.1, head: 0.55, hands: [[xo + 128, FLOOR - 13], [xo + 112, FLOOR - 13]] }), 0.3, easeIn],
        [FALL_HIT, (tt) => kneelAt(xo + 20, { lean: 1.1, head: 0.55 + 0.04 * Math.sin(tt * 5), dy: 1.5 * Math.sin(tt * 9), hands: [[xo + 128, FLOOR - 13], [xo + 112, FLOOR - 13]] }), 0.1],
        [14.85, () => standP(xo, { head: -0.1 }), 0.4],
        [15.15, () => fightSt('obs', 0, 0), 0.22],
        [REGRAB_T, (tt) => combo('obs', tt, REGRAB_T, PER2), 0.06],
        [CLIMB_T, fin, 0.01],
      ], t),
    };
    let REPS_REF = null;
    const swing = (k, t) => { let a = 0; if (!REPS_REF) return 0; for (const e of REPS_REF[k]) { const d = t - e; if (d >= 0 && d < 3) a += 0.05 * Math.exp(-d * 2.4) * Math.sin(d * 6.5); } return a; };
    function bag(c, k, t, lv) {
      const lit = litOf(lv), bx = HX[k] + BXo;
      c.save(); c.lineCap = 'round';
      if (k === 'obs' && t >= BREAK_T) {   // corrente arrebenta e o saco voa e cai
        const u = seg(t, BREAK_T, 19.4), cy0 = BAG_TOP + BAG_H / 2, restY = FLOOR - BAG_H / 2 + 4;
        const cx = bx + 46 * easeOut(u), cy = lerp(cy0 - 24 * Math.sin(Math.PI * Math.min(1, u * 1.5)), restY, easeIn(u)), r = 0.42 * easeOut(seg(t, 19.25, 19.7)) + 0.2 * easeOut(u);
        const sw = 0.25 * Math.exp(-(t - BREAK_T) * 2) * Math.sin((t - BREAK_T) * 7);
        strokePts(c, [[bx, CHAIN_TOP], [bx + Math.sin(sw) * 200, BAG_TOP - 200 + 200 * (1 - Math.cos(sw))]], 6 + 6, OUT); strokePts(c, [[bx, CHAIN_TOP], [bx + Math.sin(sw) * 200, BAG_TOP - 200]], 6, metalC(lit));
        c.translate(cx, cy); c.rotate(r); c.fillStyle = rgb([78, 78, 84], lit); c.strokeStyle = OUT; c.lineWidth = 5; c.beginPath(); c.roundRect(-BAG_W / 2, -BAG_H / 2, BAG_W, BAG_H, 22); c.fill(); c.stroke();
        c.fillStyle = rgb([58, 58, 63], lit); c.fillRect(-BAG_W / 2 + 3, -18, BAG_W - 6, 36); c.restore(); return;
      }
      const a = swing(k, t);
      c.translate(bx, CHAIN_TOP); c.rotate(-a);
      strokePts(c, [[0, 0], [0, BAG_TOP - CHAIN_TOP]], 6 + 6, OUT); strokePts(c, [[0, 0], [0, BAG_TOP - CHAIN_TOP]], 6, metalC(lit));
      c.translate(0, BAG_TOP - CHAIN_TOP); c.fillStyle = rgb([78, 78, 84], lit); c.strokeStyle = OUT; c.lineWidth = 5; c.beginPath(); c.roundRect(-BAG_W / 2, 0, BAG_W, BAG_H, 22); c.fill(); c.stroke();
      c.fillStyle = rgb([58, 58, 63], lit); c.fillRect(-BAG_W / 2 + 3, BAG_H / 2 - 18, BAG_W - 6, 36); c.restore();
    }
    return {
      view: 'side', part: 'arms', HX, CX: (k) => HX[k] + 105, P, PER2, repPh: [0.11, 0.61], payRep: 19.0, stateOf,
      setReps(R) { REPS_REF = R; },
      cam: { wide: { cx: 650, cy: 960, s: 0.82, sy: 950 }, single: { cy: FLOOR - 230, s: 1.5, sy: 830 }, duel: { cy: FLOOR - 230, s: 1.42, sy: 820, bias: 30 } },
      crowdX: [625, 668, 735], crowdSc: 0.85, metaY: FLOOR - 540,
      drawBack(c, k, t, lv) { bag(c, k, t, lv); },
      drawFront(c, k, t, lv, st, R) {
        if (!st.glove) return; const lit = litOf(lv);
        for (const [h, col] of [[R.armB[2], rgb([92, 92, 98], lit)], [R.armF[2], rgb([120, 120, 126], lit)]]) { disc(c, h, 18 + D.ol, OUT); disc(c, h, 18, col); }
      },
      painSpots: (R) => [[R.arm, -2.5]],
      burst(c, t) { sparks(c, [HX.obs + BXo, BAG_TOP - 6], t - BREAK_T); },
      thuds: [[6.9, 0.3, 'motiv'], [FALL_HIT, 1.0, 'obs'], [19.4, 1.0, 'obs']],
      clanks: [[BREAK_T + 0.02, 0.6]],
    };
  }

  const TH = { agach: AGACH, corda: CORDA, halter: HALTER, saco: SACO }[THEME]();
  const PART = TH.part, HX = TH.HX, CX = TH.CX, PER2 = TH.PER2, stateOf = TH.stateOf;
  for (const k of KS) RUN[k].P = TH.P[k];

  // eventos de repetição (som, soco de câmera, dor)
  const REPS = { motiv: [], ego: [], disc: [], obs: [] };
  for (const k of KS) { const end = k === 'obs' ? FALL_T : RUN[k].end; for (let n = 0; n < 400; n++) { const ev = TH.repPh.map((ph) => T0 + RUN[k].P * (n + ph)).filter((x) => x < end); if (!ev.length) break; REPS[k].push(...ev.map((x) => +x.toFixed(3))); } }
  for (let n = 0; n < 400; n++) { const ev = TH.repPh.map((ph) => REGRAB_T + PER2 * (n + ph)).filter((x) => x < CLIMB_T); if (!ev.length) break; REPS.obs.push(...ev.map((x) => +x.toFixed(3))); }
  REPS.obs.push(TH.payRep);
  if (TH.setReps) TH.setReps(REPS);
  const PAIN_EV = [...REPS.obs, FALL_HIT].sort((a, b) => a - b);
  const lastOf = (arr, t) => { let ls = -9; for (const x of arr) if (x <= t) ls = x; return ls; };
  const MOANS = [lastOf(REPS.obs, 13.35) + 0.02, FALL_HIT + 0.04, 15.27, lastOf(REPS.obs, 18.4) + 0.02];
  const THUDS = TH.thuds;

  // ---------- cenário comum ----------
  function drawGear(c, k, t, lv) {   // colchonete de treino
    const lit = litOf(lv); c.fillStyle = rgb([44, 44, 48], lit); c.strokeStyle = OUT; c.lineWidth = 3;
    c.beginPath(); c.roundRect(CX(k) - 130, FLOOR - 7, 260, 9, 4); c.fill(); c.stroke();
  }
  function drawCrowd(c, t) {
    const X = TH.crowdX;
    for (let i = 0; i < X.length; i++) {
      const show = smooth(seg(t, CROWD[0] + i * 0.07, CROWD[0] + 0.3 + i * 0.07)) * (1 - smooth(seg(t, CROWD[1] + i * 0.08, CROWD[1] + 0.3 + i * 0.08)));
      if (show <= 0.01) continue;
      const cheer = seg(t, FALL_HIT + 0.3, FALL_HIT + 0.5) * (1 - seg(t, 15.2, 15.5));
      const x = X[i] - (1 - show) * 50, sc = TH.crowdSc, ph = Math.sin((t + i * 1.3) * 2.4) * 3, jump = cheer * Math.abs(Math.sin((t + i * 0.7) * 9)) * 12;
      c.save(); c.globalAlpha = show * 0.75; c.translate(x, FLOOR - jump); c.scale(sc, sc);
      c.lineWidth = 4; c.strokeStyle = 'rgba(214,212,206,0.5)'; c.fillStyle = '#141416'; c.lineJoin = 'round';
      c.beginPath(); c.moveTo(-22, 0); c.lineTo(-24, -150); c.quadraticCurveTo(-26, -196, 0, -198); c.quadraticCurveTo(26, -196, 24, -150); c.lineTo(22, 0); c.closePath(); c.fill(); c.stroke();
      c.beginPath(); c.arc(2, -226, 22, 0, Math.PI * 2); c.fill(); c.stroke();
      c.lineCap = 'round'; c.lineWidth = 14; c.strokeStyle = '#141416'; c.beginPath(); c.moveTo(14, -182); c.lineTo(40, -160); c.lineTo(46 + 0.3 * ph, -214 + ph - 20 * cheer); c.stroke();
      c.lineWidth = 4; c.strokeStyle = 'rgba(214,212,206,0.5)'; c.stroke();
      c.fillStyle = '#e8e6e0'; c.fillRect(40 + 0.3 * ph, -236 + ph - 20 * cheer, 14, 24);
      c.globalCompositeOperation = 'lighter'; const g = c.createRadialGradient(47, -224 + ph - 20 * cheer, 0, 47, -224 + ph - 20 * cheer, 40); g.addColorStop(0, 'rgba(255,255,255,0.22)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(7, -264 + ph - 20 * cheer, 80, 80);
      c.restore();
    }
  }
  function drawMeta(c, t) {
    const MA = 1 - shotAt(t).amt; if (MA <= 0.01) return;
    const hit = t >= RUN.disc.end, flash = hit ? Math.exp(-(t - RUN.disc.end) * 4) : 0;
    const label = hit ? 'META ✓' : 'META 1.000';
    c.save(); c.globalAlpha = MA; c.font = '700 22px "Space Mono", monospace'; const tw = c.measureText(label).width;
    const px = CX('disc') - tw / 2 - 13, py = TH.metaY;
    c.fillStyle = `rgba(${Math.round(20 + 200 * flash)},${Math.round(20 + 200 * flash)},${Math.round(22 + 200 * flash)},0.92)`;
    c.beginPath(); c.roundRect(px, py, tw + 26, 36, 18); c.fill(); c.lineWidth = 2.5; c.strokeStyle = 'rgba(255,255,255,0.8)'; c.stroke();
    c.fillStyle = flash > 0.5 ? '#111' : '#f2f2f2'; c.textAlign = 'left'; c.textBaseline = 'middle'; c.fillText(label, px + 13, py + 19); c.restore();
  }
  function dust(c, x, t0, t, big) {
    const a = t - t0; if (a < 0 || a > 0.7) return;
    const u = a / 0.7, r = (40 + 120 * easeOut(u)) * big;
    c.save(); c.globalAlpha = 0.35 * (1 - u);
    const g = c.createRadialGradient(x, FLOOR - 6, 0, x, FLOOR - 6, r); g.addColorStop(0, 'rgba(200,198,192,0.8)'); g.addColorStop(1, 'rgba(200,198,192,0)');
    c.fillStyle = g; c.beginPath(); c.ellipse(x, FLOOR - 6, r, r * 0.35, 0, 0, Math.PI * 2); c.fill(); c.restore();
  }

  // ---------- luz ----------
  const level = {
    motiv: track([[0, 1.0], [3.0, 1.0], [3.2, 1.3], [5.5, 1.3], [6.2, 0.5], [6.9, 0.08]]),
    disc: track([[0, 1.0], [3.0, 1.0], [3.3, 0.7], [6.5, 0.7], [6.7, 1.1], [10.4, 1.1], [11.0, 0.55]]),
    ego: track([[0, 1.0], [3.0, 1.0], [3.3, 0.7], [10.5, 0.7], [10.8, 1.15], [17.2, 1.15], [17.8, 0.45], [18.5, 0.2]]),
    obs: track([[0, 1.0], [3.0, 1.0], [3.3, 0.7], [10.5, 0.7], [10.8, 1.15], [13.9, 1.15], [14.2, 0.72], [15.1, 0.72], [15.5, 1.2], [18.9, 1.2], [19.05, 1.6], [20.4, 1.3]]),
  };

  // ---------- câmera por planos ----------
  const SHOTS = [[0, 'wide'], [2.9, 'motiv'], [6.6, 'disc'], [10.6, 'duel'], [19.6, 'wide']];
  const FOCUS = { motiv: ['motiv'], disc: ['disc'], duel: ['ego', 'obs'] };
  const bias = track([[0, 0], [13.7, 0], [14.0, 1], [15.5, 1], [16.6, 0], [17.1, -1], [17.9, -1], [18.25, 0], [18.6, 1]]);
  function frameOf(n, t) {
    const C0 = TH.cam;
    if (n === 'wide') return C0.wide;
    if (n === 'duel') { const mid = (CX('ego') + CX('obs')) / 2; return { cx: mid + C0.duel.bias * bias(t), cy: C0.duel.cy, s: C0.duel.s, sy: C0.duel.sy }; }
    return { cx: CX(n), cy: C0.single.cy, s: C0.single.s, sy: C0.single.sy };
  }
  function shotAt(t) {
    let i = 0; while (i < SHOTS.length - 1 && t >= SHOTS[i + 1][0]) i++;
    const cur = SHOTS[i], prev = i > 0 ? SHOTS[i - 1] : cur, u = i > 0 ? easeInOut(seg(t, cur[0], cur[0] + 0.55)) : 1;
    const A = frameOf(prev[1], t), B = frameOf(cur[1], t);
    const f = { cx: lerp(A.cx, B.cx, u), cy: lerp(A.cy, B.cy, u), s: Math.exp(lerp(Math.log(A.s), Math.log(B.s), u)), sy: lerp(A.sy, B.sy, u) };
    const za = (n) => (n === 'wide' ? 0 : 1), amt = lerp(za(prev[1]), za(cur[1]), u);
    const k = cur[1] !== 'wide' ? cur[1] : prev[1] !== 'wide' ? prev[1] : null;
    return { f, amt, k, foc: k ? FOCUS[k] : [], ts: cur[0], pk: prev[1] };
  }
  function camAt(t) {
    const S = shotAt(t), f = S.f;
    let s = f.s * (t < 2.9 ? lerp(1.08, 1.0, easeOut(seg(t, 1.5, 2.4))) : 1);
    const pk = S.k === 'duel' ? 'obs' : S.k;
    let punch = 0; if (pk) for (const ts of REPS[pk]) { const d = t - ts; if (d >= 0 && d < 0.4) punch += (S.k === 'duel' ? 0.01 : 0.016) * Math.exp(-d * 13) * S.amt; }
    s *= 1 + punch;
    let ox = 540 - f.cx * s, oy = f.sy - f.cy * s;
    const k1 = t >= 1.5 ? Math.exp(-(t - 1.5) * 9) : 0, k2 = t >= BREAK_T ? Math.exp(-(t - BREAK_T) * 5) : 0, k3 = t >= FALL_HIT ? Math.exp(-(t - FALL_HIT) * 8) : 0;
    ox += 15 * k1 * Math.sin((t - 1.5) * 70) + 24 * k2 * Math.sin((t - BREAK_T) * 60) + 16 * k3 * Math.sin((t - FALL_HIT) * 66);
    oy += 10 * k1 * Math.cos((t - 1.5) * 83) + 18 * k2 * Math.cos((t - BREAK_T) * 73) + 14 * k3 * Math.cos((t - FALL_HIT) * 79);
    return { s, ox, oy };
  }
  const toScreen = (p, C) => [p[0] * C.s + C.ox, p[1] * C.s + C.oy];
  // ---------- texto ----------
  const CAPS = [
    { s: -1, e: 2.85, lines: [[-1, [['QUATRO CORDAS.']]], [0.3, [['SÓ '], ['UM', 'obs'], [' ACELERA.']]]] },
    { s: 3.0, e: 5.5, lines: [[3.0, [['A MOTIVAÇÃO']]], [3.35, [['COMEÇA A MIL.']]]] },
    { s: 5.6, e: 6.5, lines: [[5.6, [['E PARA NO']]], [5.85, [['PRIMEIRO CANSAÇO.']]]] },
    { s: 6.8, e: 9.9, lines: [[6.8, [['A DISCIPLINA']]], [7.15, [['FAZ NO RITMO.']]]] },
    { s: 10.0, e: 10.75, lines: [[10.0, [['BATE A META']]], [10.25, [['E PARA.']]]] },
    { s: 10.9, e: 12.3, lines: [[10.9, [['O EGO E A OBSESSÃO']]], [11.4, [['PASSAM DA META.']]]] },
    { s: 12.4, e: 13.72, lines: [[12.4, [['AS PERNAS DELA']]], [12.8, [['DOEM.', 'obs']]]] },
    { s: 13.8, e: 14.6, lines: [[13.8, [['ELA PARA']]], [14.0, [['PRIMEIRO.']]]] },
    { s: 14.65, e: REGRAB_T - 0.1, lines: [[14.65, [['O EGO PASSA']]], [14.9, [['NA FRENTE.']]]] },
    { s: REGRAB_T - 0.05, e: PASS_T - 0.1, lines: [[REGRAB_T - 0.05, [['MAS ELA VOLTA']]], [REGRAB_T + 0.3, [['MAIS RÁPIDO.']]]] },
    { s: PASS_T - 0.05, e: 17.2, lines: [[PASS_T - 0.05, [['E PASSA']]], [PASS_T + 0.2, [['O EGO.']]]] },
    { s: 17.3, e: 18.2, lines: [[17.3, [['SEM PLATEIA,']]], [17.6, [['O EGO PARA.']]]] },
    { s: 18.25, e: 18.95, lines: [[18.25, [['ELA NÃO PARA.']]]] },
    { s: 21.0, e: 99, big: true, lines: [[21.0, [['TROPEÇOU? CONTINUA.']]]] },
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
    c.fillStyle = '#1b1b1e'; c.fillRect(-600, FLOOR, W + 1300, 900);
    c.fillStyle = 'rgba(255,255,255,0.2)'; c.fillRect(-600, FLOOR - 2, W + 1300, 4);
    for (const k of KS) {
      const a = 0.22 * Math.min(1.3, lv[k]) * (k === 'obs' ? 1 + 0.8 * smooth(seg(t, BREAK_T, BREAK_T + 0.5)) : 1), hy = FLOOR - 200;
      c.save(); c.globalCompositeOperation = 'lighter';
      const g = c.createRadialGradient(CX(k), hy, 0, CX(k), hy, 300); g.addColorStop(0, rgb(COL[k], 1, a)); g.addColorStop(1, rgb(COL[k], 1, 0));
      c.fillStyle = g; c.fillRect(CX(k) - 320, hy - 320, 640, 640); c.restore();
    }
    drawCrowd(c, t);
    for (const k of KS) drawGear(c, k, t, lv[k]);
    drawMeta(c, t);
    for (const k of ['motiv', 'disc', 'ego', 'obs']) {
      const st = stateOf[k](t);
      const light = clamp(0.3 + 0.7 * Math.min(1, lv[k] / 0.85));
      c.save(); c.translate(st.x + (st.front ? 0 : 10), FLOOR + 2); c.scale(1, 0.16);
      const sg = c.createRadialGradient(0, 0, 0, 0, 0, 80); sg.addColorStop(0, 'rgba(0,0,0,0.5)'); sg.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = sg; c.beginPath(); c.arc(0, 0, 80, 0, Math.PI * 2); c.fill(); c.restore();
      let hurt = null, sd = 9;
      if (k === 'obs') {
        const h = hurtOf(t); sd = t - lastOf(PAIN_EV, t); const th = sd < 1 ? Math.exp(-sd * 7) : 0;
        if (t < BREAK_T) { if (st.front) st.nod = (st.nod || 0) + 9 * h * th; else { st.head = (st.head || 0) + 0.24 * h * th; st.lean = (st.lean || 0) + 0.04 * h * th; } }
        hurt = { a: h * (0.8 + 0.2 * th), g: h * (0.1 + 0.32 * th) * clamp(light) };
      }
      const R = st.front ? rigF(st) : rigP(st);
      TH.drawBack(c, k, t, lv[k], st, R);
      if (st.front) drawFigF(c, R, light, COL[k], hurt); else drawFigure(c, R, light, COL[k], hurt);
      TH.drawFront(c, k, t, lv[k], st, R);
      if (hurt && hurt.a > 0.4 && sd >= 0 && sd < 0.34 && t < BREAK_T + 0.1) {   // tracinhos de dor
        const u = sd / 0.34; c.save(); c.strokeStyle = rgb(ACC, 1, (1 - u) * hurt.a * light); c.lineWidth = 6; c.lineCap = 'round';
        for (const [E, a0] of TH.painSpots(R)) for (let i = -1; i <= 1; i++) { const an = a0 + i * 0.42, r0 = 40 + 16 * easeOut(u), r1 = r0 + 18; c.beginPath(); c.moveTo(E[0] + Math.cos(an) * r0, E[1] + Math.sin(an) * r0); c.lineTo(E[0] + Math.cos(an) * r1, E[1] + Math.sin(an) * r1); c.stroke(); }
        c.restore();
      }
    }
    TH.burst(c, t, stateOf);
    for (const [tt, big, k] of THUDS) dust(c, k === 'obs' ? stateOf.obs(tt).x : CX(k), tt, t, 0.5 + 0.6 * big);
  }
  function beamS(c, x, yb, a, col) {
    c.save(); c.filter = 'blur(12px)';
    const cc = mixC([255, 252, 246], col || [255, 252, 246], 0.55);
    const g = c.createLinearGradient(0, -60, 0, yb); g.addColorStop(0, rgb(cc, 1, a * 1.3)); g.addColorStop(1, rgb(cc, 1, a * 0.4));
    c.fillStyle = g; c.beginPath(); c.moveTo(x - 26, -60); c.lineTo(x + 26, -60); c.lineTo(x + 175, yb); c.lineTo(x - 175, yb); c.closePath(); c.fill(); c.restore();
  }
  const NAMES = { motiv: '1 · MOTIVAÇÃO', disc: '2 · DISCIPLINA', ego: '3 · EGO', obs: '4 · OBSESSÃO' };
  function pill(c, x, k, t, alpha) {   // placar embaixo do personagem em foco
    const nm = NAMES[k];
    let n = fmt(hits(k, t)); if (k === 'disc') n = t >= RUN.disc.end ? `${n} ✓ META` : `${n} / 1.000`;
    const popT = k === 'obs' ? PASS_T : k === 'ego' ? EGO_PASS : -9, pop = t >= popT ? 1 + 0.35 * Math.exp(-(t - popT) * 7) : 1;
    const red = k === 'obs' ? smooth(seg(t, PASS_T, PASS_T + 0.2)) : 0, dim = k === 'ego' ? 1 - 0.5 * smooth(seg(t, RUN.ego.end, RUN.ego.end + 0.5)) : 1;
        c.save(); c.globalAlpha = alpha * dim; c.font = '700 24px "Space Mono", monospace'; const tw = c.measureText(nm).width;
    c.beginPath(); c.roundRect(x - tw / 2 - 16, 1178, tw + 32, 40, 20); c.fillStyle = 'rgba(12,12,14,0.85)'; c.fill(); c.lineWidth = 3; c.strokeStyle = 'rgba(244,242,238,0.8)'; c.stroke();
    c.fillStyle = '#f4f2ee'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(nm, x, 1199);
    c.translate(x, 1252); c.scale(pop, pop); c.font = '800 46px Montserrat, sans-serif'; c.fillStyle = rgb(mixC([244, 242, 238], [224, 86, 70], red)); c.fillText(n, 0, 0); c.restore();
  }

  function renderAt(t) {
    COL.obs = mixC(NEU, ACC, smooth(seg(t, BREAK_T - 0.2, BREAK_T + 0.4)));
    const C = camAt(t);
    const lv = { disc: level.disc(t), obs: level.obs(t), motiv: level.motiv(t), ego: level.ego(t) };
    const SH = shotAt(t); if (SH.k) for (const k of KS) if (!SH.foc.includes(k)) lv[k] *= 1 - 0.7 * SH.amt;
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
    c.setTransform(1, 0, 0, 1, 0, 0);
    const floorS = toScreen([0, FLOOR], C)[1];
    c.save(); c.beginPath(); c.rect(0, floorS, W, H - floorS); c.clip();
    c.globalAlpha = 0.16; c.translate(0, 2 * floorS); c.scale(1, -1); c.drawImage(layer, 0, 0); c.restore();
    c.drawImage(layer, 0, 0);
    c.save(); c.globalCompositeOperation = 'lighter';
    for (const k of KS) {
      const fl = toScreen([CX(k), FLOOR + 10], C);
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
    const fadeLab = (id, a, b, d) => { const el = document.getElementById(id); if (el) el.style.opacity = String((1 - SH.amt) * (1 - d * smooth(seg(t, a, b)))); };
    fadeLab('lab-obs', 99, 100, 0);
    const pills = (key, a) => { if (key === 'duel') { for (const k of ['ego', 'obs']) pill(c, clamp(toScreen([CX(k), FLOOR], C)[0], 190, 890), k, t, a); } else pill(c, 540, key, t, a); };
    if (SH.k && SH.amt > 0.02) {
      const fresh = SH.pk !== 'wide' && SH.pk !== SH.k;   // troca entre dois zooms: o placar antigo some, o novo entra
      if (fresh && t < SH.ts + 0.3) pills(SH.pk, SH.amt * (1 - smooth(seg(t, SH.ts, SH.ts + 0.25))));
      pills(SH.k, SH.amt * (fresh ? smooth(seg(t, SH.ts + 0.35, SH.ts + 0.6)) : 1));
    }
    fadeLab('lab-motiv', 6.2, 6.8, 0.6); fadeLab('lab-disc', 11.0, 11.6, 0.4); fadeLab('lab-ego', 17.9, 18.5, 0.6);
  }

  const typing = [];
  for (const cap of CAPS) for (const [ls, segs] of cap.lines) wordsOf(segs).forEach((w, j) => { const tt = ls + j * WSTEP; if (tt >= 0 && tt < cap.e) typing.push(+tt.toFixed(3)); });
  window.__schedule = { theme: THEME, shots: SHOTS, focus: FOCUS, slam: 1.5, motivQuit: RUN.motiv.end, egoQuit: RUN.ego.end, meta: RUN.disc.end, payoff: BREAK_T, fall: FALL_HIT, regrab: null,
    reps: REPS, thuds: THUDS, clanks: TH.clanks, moans: MOANS, crowd: CROWD, cheer: [FALL_HIT + 0.6, 15.2], words: typing };
  window.__renderAt = renderAt; window.__dbg = { stateOf, rigP, rigF, HX };
  window.addEventListener('hf-seek', (e) => renderAt(e.detail.time));
  renderAt(0);
})();
