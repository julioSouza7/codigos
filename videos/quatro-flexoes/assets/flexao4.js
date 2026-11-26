// Treino (flexao): Disciplina x Obsessão x Motivação x Ego — 2D vetorial, função pura do tempo.
// Disputa final EGO x OBSESSÃO: ela para primeiro (dor), o ego passa na frente, ela volta e passa o ego. Paleta minimalista; 25 s.
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
  const THEME = 'flexao', BAR = THEME === 'barra';
  const D = { headR: 31, limb: 26, torsoW: 30, ol: 5, torso: 100, uArm: 60, fArm: 56, thigh: 82, shin: 78, foot: 20 };
  const OUT = '#0e0e10';
  const WHITE = [247, 247, 245], BACK = [196, 196, 200], DARK = [88, 88, 94], DARKB = [62, 62, 68];
  const NEU = [214, 212, 206], ACC = [214, 80, 66], ACCB = [168, 62, 52];
  const COL = { disc: NEU, obs: NEU, motiv: NEU, ego: NEU };
  const KS = ['disc', 'obs', 'motiv', 'ego'];
  const HX = BAR ? { motiv: 210, disc: 510, ego: 810, obs: 1110 } : { motiv: -45, disc: 340, ego: 725, obs: 1110 };
  const CX = (k) => HX[k] + (BAR ? 0 : 150);
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
  const PREF = { down: (c) => c[1] - 0.3 * c[0], back: (c) => -c[0] + 0.2 * c[1], fwd: (c) => c[0] - 0.2 * c[1], fdown: (c) => 0.6 * c[0] + c[1] };
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

  // ================= TREINO v2 (barra de frente / flexão de lado) — disputa final EGO x OBSESSÃO =================
  // ---------- boneco de perfil (flexão) ----------
  function drawFigure(c, R, light, col, arm) {
    const f = rgb(mixC(DARK, WHITE, light)), b = rgb(mixC(DARKB, BACK, light));
    const ra = arm ? arm.a : 0;
    const fA = ra > 0.001 ? rgb(mixC(mixC(DARK, WHITE, light), mixC(DARK, ACC, light), ra)) : f;
    const bA = ra > 0.001 ? rgb(mixC(mixC(DARKB, BACK, light), mixC(DARKB, ACCB, light), ra)) : b;
    if (col && light > 0.5) {
      c.save(); c.globalAlpha = 0.55 * (light - 0.5) * 2; c.filter = 'blur(8px)';
      for (const L of [R.legB, R.armB, R.legF, R.armF, [R.hip, R.sh]]) strokePts(c, L, D.limb + 22, rgb(col));
      disc(c, R.head, D.headR + 12, rgb(col)); c.restore();
    }
    if (arm && arm.g > 0.01) { c.save(); c.globalAlpha = arm.g; c.filter = 'blur(10px)'; strokePts(c, R.armB, D.limb + 26, rgb(ACC)); strokePts(c, R.armF, D.limb + 26, rgb(ACC)); c.restore(); }
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
  // ---------- boneco de frente (barra) ----------
  const FW = { shW: 26, hipW: 14 };
  const PREF_OUT = [(c) => -c[0] + 0.25 * c[1], (c) => c[0] + 0.25 * c[1]];
  const PREF_UP = [(c) => -0.4 * c[0] - c[1], (c) => 0.4 * c[0] - c[1]];
  function rigF(st) {
    const tl = st.tilt || 0, up = [Math.sin(tl), -Math.cos(tl)], sd = [Math.cos(tl), Math.sin(tl)];
    const hip = [st.x, st.hipY], tk = st.torsoK ?? 1;
    const neck = add(hip, [up[0] * D.torso * tk, up[1] * D.torso * tk]);
    const shC = add(hip, [up[0] * (D.torso - 10) * tk, up[1] * (D.torso - 10) * tk]);
    const sh = [add(shC, [-sd[0] * FW.shW, -sd[1] * FW.shW]), add(shC, [sd[0] * FW.shW, sd[1] * FW.shW])];
    const hp = [add(hip, [-sd[0] * FW.hipW, -sd[1] * FW.hipW]), add(hip, [sd[0] * FW.hipW, sd[1] * FW.hipW])];
    const head = add(neck, [up[0] * (D.headR + 8), up[1] * (D.headR + 8) + (st.nod || 0)]);
    const arms = [0, 1].map((i) => { const r = ikP(sh[i], st.hands[i], D.uArm, D.fArm, PREF_OUT[i]); return [sh[i], r.E, r.H]; });
    const kp = st.kneeUp ? PREF_UP : PREF_OUT;
    const legs = [0, 1].map((i) => { const r = ikP(hp[i], st.ankles[i], D.thigh * (st.thighK ?? 1), D.shin * (st.shinK ?? 1), kp[i]); const s = i ? 1 : -1;
      return [hp[i], r.E, r.H, add(r.H, st.feetDown ? [s * 5, 13] : [s * 15, 4])]; });
    return { front: true, hip, neck, shC, sh, head, arms, legs, kneeUp: !!st.kneeUp };
  }
  function drawFigF(c, R, light, col, arm) {
    const f = rgb(mixC(DARK, WHITE, light)), ra = arm ? arm.a : 0;
    const fA = ra > 0.001 ? rgb(mixC(mixC(DARK, WHITE, light), mixC(DARK, ACC, light), ra)) : f;
    if (col && light > 0.5) {
      c.save(); c.globalAlpha = 0.55 * (light - 0.5) * 2; c.filter = 'blur(8px)';
      for (const L of [...R.legs, ...R.arms, [R.hip, R.neck], R.sh]) strokePts(c, L, D.limb + 22, rgb(col));
      disc(c, R.head, D.headR + 12, rgb(col)); c.restore();
    }
    if (arm && arm.g > 0.01) { c.save(); c.globalAlpha = arm.g; c.filter = 'blur(10px)'; for (const L of R.arms) strokePts(c, L, D.limb + 26, rgb(ACC)); c.restore(); }
    const legs = () => { for (const L of R.legs) strokePts(c, L, D.limb + 2 * D.ol, OUT); for (const L of R.legs) strokePts(c, L, D.limb, f); };
    if (!R.kneeUp) legs();
    strokePts(c, [R.hip, R.neck], D.torsoW + 2 * D.ol, OUT); strokePts(c, R.sh, D.limb + 2 * D.ol, OUT);
    strokePts(c, [R.hip, R.neck], D.torsoW, f); strokePts(c, R.sh, D.limb, f);
    if (R.kneeUp) legs();
    disc(c, R.head, D.headR + D.ol, OUT); disc(c, R.head, D.headR, f);
    for (const L of R.arms) limb(c, L, D.limb, fA);
  }

  // ---------- tempos ----------
  const T0 = 3.0, BREAK_T = 19.0;
  const RUN = {
    motiv: { P: 0.42, end: 5.6, rate: 300 },
    disc: { P: 0.85, end: 10.0, rate: 1000 / 7 },
    ego: { P: 0.62, end: 16.8, rate: 145 },
    obs: { P: 0.66, end: BREAK_T, rate: 150 },
  };
  const FALL_T = 13.8;                                   // a obsessão para primeiro (dor)
  const FALL_HIT = BAR ? 14.1 : 14.0;                    // impacto no chão
  const REGRAB_T = 15.4;                    // volta a fazer
  const RESUME_T = BAR ? REGRAB_T : 16.0, PER2 = BAR ? 0.775 : 0.767, CLIMB_T = BAR ? 18.5 : 18.3;
  const SIT_EGO = 17.4, CROWD = [10.9, 16.1];
  const PAIN0 = 11.6, PAIN1 = 13.0;
  const hurtOf = (t) => smooth(seg(t, PAIN0, PAIN1));
  const hits = (k, t) => (k !== 'obs' ? RUN[k].rate * clamp(t - T0, 0, RUN[k].end - T0)
    : RUN.obs.rate * (clamp(t, T0, FALL_T) - T0 + clamp(t - REGRAB_T, 0, BREAK_T - REGRAB_T)));
  const EGO_FINAL = hits('ego', 99);
  const EGO_PASS = T0 + hits('obs', FALL_T) / RUN.ego.rate;                                   // o ego passa na frente
  const PASS_T = REGRAB_T + (EGO_FINAL - hits('obs', FALL_T)) / RUN.obs.rate;                  // a obsessão passa o ego

  // ---------- poses de perfil ----------
  const STAND_L = { fT: 0.06, fS: -0.02, bT: -0.1, bS: -0.06 };
  const mixL = (a, b, u) => ({ fT: lerp(a.fT, b.fT, u), fS: lerp(a.fS, b.fS, u), bT: lerp(a.bT, b.bT, u), bS: lerp(a.bS, b.bS, u) });
  const mixP = (A, B, u) => ({ x: lerp(A.x, B.x, u), hipY: lerp(A.hipY, B.hipY, u), lean: lerp(A.lean, B.lean, u), head: lerp(A.head || 0, B.head || 0, u),
    legs: mixL(A.legs, B.legs, u), hands: [P2(A.hands[0], B.hands[0], u), P2(A.hands[1], B.hands[1], u)],
    prefF: u < 0.5 ? A.prefF : B.prefF, prefB: u < 0.5 ? A.prefB : B.prefB });
  const mixF = (A, B, u) => ({ front: true, x: lerp(A.x, B.x, u), hipY: lerp(A.hipY, B.hipY, u), tilt: lerp(A.tilt || 0, B.tilt || 0, u), nod: lerp(A.nod || 0, B.nod || 0, u),
    torsoK: lerp(A.torsoK ?? 1, B.torsoK ?? 1, u), thighK: lerp(A.thighK ?? 1, B.thighK ?? 1, u), shinK: lerp(A.shinK ?? 1, B.shinK ?? 1, u),
    hands: [P2(A.hands[0], B.hands[0], u), P2(A.hands[1], B.hands[1], u)], ankles: [P2(A.ankles[0], B.ankles[0], u), P2(A.ankles[1], B.ankles[1], u)],
    kneeUp: u < 0.5 ? A.kneeUp : B.kneeUp, feetDown: u < 0.5 ? A.feetDown : B.feetDown });
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
  function kneelAt(kx, o = {}) {
    const hip = [kx, FLOOR - 13 - 82], lean = o.lean ?? 0.04;
    const hands = o.hands || (o.hips ? [[kx + 16, hip[1] - 16], [kx + 6, hip[1] - 20]] : [[kx + 30, hip[1] + 10], [kx + 18, hip[1] + 14]]);
    return { x: hip[0], hipY: hip[1] + (o.dy || 0), lean, head: o.head ?? 0, legs: { fT: 0, fS: -1.85, bT: 0.04, bS: -1.82 }, hands, prefF: o.prefF || 'down', prefB: o.prefB || 'down' };
  }

  // ---------- BARRA (de frente) ----------
  const BAR_Y = FLOOR - 380, GRIP = 72;
  function hangF(k, p, o = {}) {   // p: 0 = braços estendidos, 1 = queixo acima da barra
    const bx = HX[k], shY = BAR_Y + lerp(104, 8, p) + (o.dy || 0), sw = o.sw || 0, hy = shY + D.torso - 10;
    return { front: true, x: bx + sw, hipY: hy, tilt: o.tilt || 0, nod: o.nod || 0, hands: [[bx - GRIP, BAR_Y], [bx + GRIP, BAR_Y]],
      ankles: [[bx - 16 + 1.8 * sw, hy + 128], [bx + 16 + 1.8 * sw, hy + 128]], shinK: 0.62, feetDown: true };
  }
  const pullP = (ph) => (ph < 0.38 ? easeInOut(ph / 0.38) : ph < 0.48 ? 1 : 1 - easeInOut((ph - 0.48) / 0.52));
  const hookP = (t) => (t < 0.85 ? 0 : t < 1.5 ? easeInOut(seg(t, 0.85, 1.5)) : t < 1.7 ? 1 : 1 - easeInOut(seg(t, 1.7, 2.5)));
  function standF(x, o = {}) { const hy = FLOOR - 17 - 158 + (o.dy || 0); return { front: true, x, hipY: hy, tilt: o.tilt || 0, nod: o.nod || 0, torsoK: o.torsoK ?? 1, hands: o.hands || [[x - 38, hy + 22], [x + 38, hy + 22]], ankles: [[x - 20, FLOOR - 17], [x + 20, FLOOR - 17]] }; }
  function landF(x) { const hy = FLOOR - 17 - 112; return { front: true, x, hipY: hy, nod: 10, torsoK: 0.95, hands: [[x - 54, hy + 40], [x + 54, hy + 40]], ankles: [[x - 36, FLOOR - 17], [x + 36, FLOOR - 17]] }; }
  const slumpF = (x) => { const s = standF(x, { nod: 14, torsoK: 0.94 }); s.hands = [[x - 34, s.hipY + 30], [x + 34, s.hipY + 30]]; return s; };
  const hipsF = (x) => { const s = standF(x, { nod: -3 }); s.hands = [[x - 27, s.hipY - 4], [x + 27, s.hipY - 4]]; return s; };
  const sitF = (x) => ({ front: true, x, hipY: FLOOR - 24, torsoK: 0.86, nod: 16, kneeUp: true, hands: [[x - 32, FLOOR - 98], [x + 32, FLOOR - 98]], ankles: [[x - 42, FLOOR - 15], [x + 42, FLOOR - 15]] });
  const kneelF = (x, o = {}) => ({ front: true, x, hipY: FLOOR - 74 + (o.dy || 0), torsoK: 0.9, tilt: o.tilt || 0, nod: o.nod ?? 18, thighK: 0.75, shinK: 0.1,
    hands: [[x - 46, FLOOR - 30], [x + 46, FLOOR - 30]], ankles: [[x - 30, FLOOR - 14], [x + 30, FLOOR - 14]] });
  const reachF = (x) => { const s = standF(x, { nod: -8 }); s.hipY -= 32; s.hands = [[x - GRIP, BAR_Y], [x + GRIP, BAR_Y]]; s.ankles = [[x - 14, FLOOR - 44], [x + 14, FLOOR - 44]]; s.feetDown = true; return s; };
  const supportF = (k, shY, o = {}) => { const bx = HX[k], hy = shY + D.torso - 10; return { front: true, x: bx, hipY: hy, nod: o.nod ?? -4, torsoK: o.torsoK ?? 1, hands: [[bx - GRIP, BAR_Y], [bx + GRIP, BAR_Y]],
    ankles: [[bx - 18, hy + 128], [bx + 18, hy + 128]], shinK: 0.62, feetDown: true }; };

  // ---------- FLEXÃO (de lado) ----------
  const TH_TOP = 0.385, TH_BOT = 0.12;
  const TOE = (k) => HX[k];
  function plankSt(k, th, o = {}) {
    const s = Math.sin(th), c0 = Math.cos(th);
    const ank = [TOE(k) - 20 * s, FLOOR - 13 - 20 * c0];
    const hip = [ank[0] + c0 * 160, ank[1] - s * 160];
    const a = Math.atan2(-c0, s), hx = TOE(k) + 226;
    return { x: hip[0], hipY: hip[1] + (o.dy || 0), lean: Math.PI / 2 - th, head: o.head ?? -0.12, legs: { fT: a, fS: a, bT: a + 0.03, bS: a + 0.03 },
      hands: o.hands || [[hx + 4, FLOOR - 13], [hx - 8, FLOOR - 13]], prefF: o.prefF || 'back', prefB: o.prefB || 'back' };
  }
  const pushTh = (ph) => (ph < 0.45 ? lerp(TH_TOP, TH_BOT, easeInOut(ph / 0.45)) : ph < 0.55 ? TH_BOT : ph < 0.85 ? lerp(TH_BOT, TH_TOP, easeOut((ph - 0.55) / 0.3)) : TH_TOP);
  const hookTh = (t) => (t < 0.8 ? TH_TOP : t < 1.25 ? lerp(TH_TOP, TH_BOT, easeInOut(seg(t, 0.8, 1.25))) : t < 1.5 ? lerp(TH_BOT, TH_TOP, easeOut(seg(t, 1.25, 1.5))) : TH_TOP);
  const proneSt = (k, o = {}) => plankSt(k, 0.035, { head: o.head ?? 0.35, dy: o.dy || 0 });
  function seizaSt(k) {
    const kx = TOE(k) + 70, fT = 1.16, hip = [kx - Math.sin(fT) * 82, FLOOR - 13 - Math.cos(fT) * 82];
    return { x: hip[0], hipY: hip[1], lean: 0.32, head: 0.55, legs: { fT, fS: -1.85, bT: fT + 0.03, bS: -1.82 }, hands: [[kx - 6, FLOOR - 50], [kx - 18, FLOOR - 46]], prefF: 'down', prefB: 'down' };
  }
  function clapSt(k, t) {   // flexão com palma no clímax: desce, explode, palma no ar em BREAK_T, aterrissa
    let th;
    if (t < 18.6) th = lerp(TH_TOP, TH_BOT, easeInOut(seg(t, 18.3, 18.6)));
    else if (t < 18.85) th = lerp(TH_BOT, 0.62, easeOut(seg(t, 18.6, 18.85)));
    else if (t < 19.05) th = 0.62 + 0.02 * Math.sin(Math.PI * seg(t, 18.85, 19.05));
    else th = lerp(0.62, TH_TOP, easeIn(seg(t, 19.05, 19.25)));
    const st = plankSt(k, th), L = D.torso - 12, ar = [st.x + Math.sin(st.lean) * L, st.hipY - Math.cos(st.lean) * L];
    const air = smooth(seg(t, 18.68, 18.8)) * (1 - smooth(seg(t, 19.06, 19.22)));
    const cl = smooth(seg(t, 18.86, 19.0));
    const clapH = [[ar[0] + 64, ar[1] + 44], [ar[0] + 64 - 34 * (1 - cl), ar[1] + 50 + 6 * (1 - cl)]];
    st.hands = [P2(st.hands[0], clapH[0], air), P2(st.hands[1], clapH[1], air)];
    if (air > 0.5) { st.prefF = 'down'; st.prefB = 'down'; }
    return st;
  }

  // ---------- estados de cada personagem ----------
  const phOf = (t, t0, P) => (((t - t0) / P) % 1 + 1) % 1;
  function cycleSt(k, t) {
    if (BAR) {
      if (t < T0) return hangF(k, hookP(t), { dy: t < 0.85 ? 0.6 * breathe(t, HX[k] * 0.01) : 0 });
      const ph = phOf(t, T0, RUN[k].P);
      return hangF(k, pullP(ph), { sw: 4 * Math.sin(2 * Math.PI * ph + HX[k]), tilt: 0.02 * Math.sin(2 * Math.PI * ph) });
    }
    if (t < T0) return plankSt(k, hookTh(t), { dy: t < 0.8 ? 0.5 * breathe(t, HX[k] * 0.01) : 0 });
    return plankSt(k, pushTh(phOf(t, T0, RUN[k].P)));
  }
  const cyc = (k) => (t) => cycleSt(k, t);
  let stateOf;
  if (BAR) {
    const x = (k) => HX[k];
    const quit = (k, sitAt) => { const e = RUN[k].end; return (t) => seqSt([[0, cyc(k)], [e, () => landF(x(k)), 0.26, easeIn], [e + 0.3, (tt) => Object.assign(slumpF(x(k)), {}), 0.4], [sitAt, () => sitF(x(k)), 0.8]], t); };
    const xo = x('obs');
    const obs2 = (t) => hangF('obs', pullP(phOf(t, RESUME_T, PER2)), { sw: 3 * Math.sin(2 * Math.PI * phOf(t, RESUME_T, PER2)) });
    const climb = (t) => {   // muscle-up: puxa explosivo, passa o peito e trava os braços acima da barra
      if (t < 18.72) return mixF(hangF('obs', 0), hangF('obs', 1), easeOut(seg(t, CLIMB_T, 18.72)));
      if (t < 18.86) return mixF(hangF('obs', 1), supportF('obs', BAR_Y - 40, { nod: 10, torsoK: 0.86 }), easeIn(seg(t, 18.72, 18.86)));
      if (t < BREAK_T) return mixF(supportF('obs', BAR_Y - 40, { nod: 10, torsoK: 0.86 }), supportF('obs', BAR_Y - 104), easeOut(seg(t, 18.86, BREAK_T)));
      const s = supportF('obs', BAR_Y - 104 + 1.5 * Math.sin((t - BREAK_T) * 3), { nod: -6 }); return s;
    };
    stateOf = {
      motiv: quit('motiv', 6.2), ego: quit('ego', SIT_EGO),
      disc: (t) => seqSt([[0, cyc('disc')], [RUN.disc.end, () => landF(x('disc')), 0.26, easeIn], [RUN.disc.end + 0.3, () => standF(x('disc')), 0.3], [RUN.disc.end + 0.62, () => hipsF(x('disc')), 0.35]], t),
      obs: (t) => seqSt([
        [0, cyc('obs')],
        [FALL_T, () => { const h = hangF('obs', 0); h.hipY += 40; h.ankles = h.ankles.map((a) => [a[0], a[1] + 40]); h.hands = [[xo - 70, h.hipY - 250], [xo + 70, h.hipY - 250]]; h.nod = 6; return h; }, 0.16, easeIn],
        [FALL_T + 0.18, () => landF(xo), 0.12, easeIn],
        [FALL_HIT, (tt) => kneelF(xo, { nod: 18 + 2 * Math.sin(tt * 5), dy: 1.5 * Math.sin(tt * 9) }), 0.16, easeIn],
        [14.85, () => standF(xo, { nod: -8 }), 0.4],
        [15.25, () => reachF(xo), 0.15, easeOut],
        [REGRAB_T, obs2, 0.1],
        [CLIMB_T, climb, 0.01],
      ], t),
    };
  } else {
    const kx = (k) => TOE(k) + 70;
    const victory = (tt) => { const s = kneelAt(kx('obs'), { head: -0.28, lean: -0.02, hands: [[kx('obs') + 74, FLOOR - 95 - 88 - 92], [kx('obs') - 52, FLOOR - 95 - 88 - 98]], prefF: 'fwd', prefB: 'back' }); s.hipY += 0.6 * breathe(tt, 0); return s; };
    stateOf = {
      motiv: (t) => seqSt([[0, cyc('motiv')], [RUN.motiv.end, (tt) => proneSt('motiv', { dy: 0.8 * breathe(tt, 0) }), 0.24, easeIn]], t),
      disc: (t) => seqSt([[0, cyc('disc')], [RUN.disc.end, () => kneelAt(kx('disc')), 0.45], [RUN.disc.end + 0.5, () => kneelAt(kx('disc'), { hips: true, lean: -0.02, head: -0.1, prefF: 'back', prefB: 'back' }), 0.35]], t),
      ego: (t) => seqSt([[0, cyc('ego')], [RUN.ego.end, () => kneelAt(kx('ego'), { lean: 0.2, head: 0.35 }), 0.45], [SIT_EGO, () => seizaSt('ego'), 0.7]], t),
      obs: (t) => seqSt([
        [0, cyc('obs')],
        [FALL_T, (tt) => proneSt('obs', { head: 0.3, dy: 1.2 * Math.sin(tt * 10) }), 0.2, easeIn],
        [REGRAB_T, (tt) => { const u = seg(tt, REGRAB_T + 0.05, RESUME_T); return plankSt('obs', lerp(0.035, TH_TOP, easeInOut(u)), { head: lerp(0.3, -0.12, u), dy: 3 * Math.sin(tt * 57) * (1 - 0.6 * u) }); }, 0.05],
        [RESUME_T, (tt) => plankSt('obs', pushTh(phOf(tt, RESUME_T, PER2))), 0.05],
        [CLIMB_T, (tt) => clapSt('obs', tt), 0.01],
        [19.5, victory, 0.5],
      ], t),
    };
  }

  // eventos de repetição (som, soco de câmera, dor)
  const REP_PH = BAR ? 0.38 : 0.55;
  const REPS = { motiv: [], ego: [], disc: [], obs: [] };
  for (const k of KS) { const end = k === 'obs' ? FALL_T : RUN[k].end; for (let n = 0; ; n++) { const ts = T0 + RUN[k].P * (n + REP_PH); if (ts >= end) break; REPS[k].push(+ts.toFixed(3)); } }
  if (!BAR) REPS.obs.push(RESUME_T - 0.1);
  for (let n = 0; ; n++) { const ts = RESUME_T + PER2 * (n + REP_PH); if (ts >= CLIMB_T) break; REPS.obs.push(+ts.toFixed(3)); }
  REPS.obs.push(BAR ? 18.72 : 18.75);
  const PAIN_EV = [...REPS.obs, FALL_HIT].sort((a, b) => a - b);
  const lastOf = (arr, t) => { let ls = -9; for (const x of arr) if (x <= t) ls = x; return ls; };
  const MOANS = [lastOf(REPS.obs, 13.35) + 0.02, FALL_HIT + 0.04, BAR ? 15.27 : 15.5, lastOf(REPS.obs, 18.1) + 0.02];
  const THUDS = BAR
    ? [[RUN.motiv.end + 0.24, 0.5, 'motiv'], [6.9, 0.35, 'motiv'], [RUN.disc.end + 0.24, 0.5, 'disc'], [FALL_T + 0.18, 0.6, 'obs'], [FALL_HIT, 1.0, 'obs'], [RUN.ego.end + 0.24, 0.5, 'ego']]
    : [[RUN.motiv.end + 0.22, 0.7, 'motiv'], [RUN.disc.end + 0.3, 0.35, 'disc'], [FALL_HIT, 1.0, 'obs'], [RUN.ego.end + 0.3, 0.4, 'ego'], [19.25, 0.7, 'obs']];

  // ---------- cenário ----------
  const litOf = (lv) => clamp(0.35 + 0.65 * Math.min(1, lv / 0.85));
  function drawGear(c, k, t, lv) {
    const lit = litOf(lv);
    if (BAR) {   // estação de barra de frente: dois postes
      const bx = HX[k];
      c.strokeStyle = OUT; c.lineWidth = 4; c.fillStyle = rgb([58, 58, 62], lit);
      for (const x of [bx - 115, bx + 115]) { c.fillRect(x - 8, BAR_Y - 8, 16, FLOOR - BAR_Y + 8); c.strokeRect(x - 8, BAR_Y - 8, 16, FLOOR - BAR_Y + 8); c.fillRect(x - 24, FLOOR - 10, 48, 10); c.strokeRect(x - 24, FLOOR - 10, 48, 10); }
    } else {
      c.fillStyle = rgb([44, 44, 48], lit); c.strokeStyle = OUT; c.lineWidth = 3;
      c.beginPath(); c.roundRect(TOE(k) - 40, FLOOR - 7, 360, 9, 4); c.fill(); c.stroke();
    }
  }
  function drawBarTop(c, k, lv) {   // a barra passa na frente das mãos (pegada)
    if (!BAR) return;
    const bx = HX[k], lit = litOf(lv);
    strokePts(c, [[bx - 123, BAR_Y], [bx + 123, BAR_Y]], 12 + 8, OUT); strokePts(c, [[bx - 123, BAR_Y], [bx + 123, BAR_Y]], 12, rgb([196, 196, 200], lit));
  }
  // plateia do ego: chega na disputa, vibra quando a obsessão cai, vai embora antes do ego soltar
  const crowdX = BAR ? [632, 690, 748] : [745, 810, 875];
  function drawCrowd(c, t) {
    for (let i = 0; i < crowdX.length; i++) {
      const show = smooth(seg(t, CROWD[0] + i * 0.07, CROWD[0] + 0.3 + i * 0.07)) * (1 - smooth(seg(t, CROWD[1] + i * 0.08, CROWD[1] + 0.3 + i * 0.08)));
      if (show <= 0.01) continue;
      const cheer = seg(t, FALL_HIT + 0.3, FALL_HIT + 0.5) * (1 - seg(t, 15.2, 15.5));
      const x = crowdX[i] - (1 - show) * 50, sc = BAR ? 0.78 : 0.78, ph = Math.sin((t + i * 1.3) * 2.4) * 3, jump = cheer * Math.abs(Math.sin((t + i * 0.7) * 9)) * 12;
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
    const px = CX('disc') - tw / 2 - 13, py = BAR ? BAR_Y - 150 : FLOOR - 330;
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
    ego: track([[0, 1.0], [3.0, 1.0], [3.3, 0.7], [10.5, 0.7], [10.8, 1.15], [16.7, 1.15], [17.3, 0.45], [18.0, 0.2]]),
    obs: track([[0, 1.0], [3.0, 1.0], [3.3, 0.7], [10.5, 0.7], [10.8, 1.15], [13.9, 1.15], [14.2, 0.72], [15.1, 0.72], [15.5, 1.2], [18.9, 1.2], [19.05, 1.6], [20.4, 1.3]]),
  };

  // ---------- câmera por planos (o último é a disputa EGO x OBSESSÃO) ----------
  const SHOTS = [[0, 'wide'], [2.9, 'motiv'], [6.6, 'disc'], [10.6, 'duel'], [19.6, 'wide']];
  const FOCUS = { motiv: ['motiv'], disc: ['disc'], duel: ['ego', 'obs'] };
  const WIDE = BAR ? { cx: 660, cy: 960, s: 0.88, sy: 950 } : { cx: 692, cy: 960, s: 0.64, sy: 985 };
  const bias = track([[0, 0], [13.7, 0], [14.0, 1], [15.5, 1], [16.4, 0], [16.6, -1], [17.4, -1], [17.8, 0], [18.3, 0], [18.6, 1]]);
  function frameOf(n, t) {
    if (n === 'wide') return WIDE;
    if (n === 'duel') {
      const mid = (CX('ego') + CX('obs')) / 2;
      return BAR ? { cx: mid + 38 * bias(t), cy: FLOOR - 225 - 120 * easeInOut(seg(t, 18.5, 19.0)), s: 1.42, sy: 815 }
        : { cx: mid + 18 * bias(t), cy: FLOOR - 112, s: 1.4, sy: 960 };
    }
    return BAR ? { cx: CX(n), cy: FLOOR - 225, s: 1.45, sy: 845 } : { cx: CX(n) + 10, cy: FLOOR - 112, s: 2.4, sy: 905 };
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
    let punch = 0; if (pk) for (const ts of REPS[pk]) { const d = t - ts; if (d >= 0 && d < 0.4) punch += (S.k === 'duel' ? 0.012 : 0.018) * Math.exp(-d * 13) * S.amt; }
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
    { s: -1, e: 2.85, lines: [[-1, [['QUATRO FLEXÕES.']]], [0.3, [['SÓ '], ['UM', 'obs'], [' NÃO DESISTE.']]]] },
    { s: 3.0, e: 5.5, lines: [[3.0, [['A MOTIVAÇÃO']]], [3.35, [['COMEÇA A MIL.']]]] },
    { s: 5.6, e: 6.5, lines: [[5.6, [['E PARA NO']]], [5.85, [['PRIMEIRO CANSAÇO.']]]] },
    { s: 6.8, e: 9.9, lines: [[6.8, [['A DISCIPLINA']]], [7.15, [['FAZ NO RITMO.']]]] },
    { s: 10.0, e: 10.75, lines: [[10.0, [['BATE A META']]], [10.25, [['E PARA.']]]] },
    { s: 10.9, e: 12.3, lines: [[10.9, [['O EGO E A OBSESSÃO']]], [11.4, [['PASSAM DA META.']]]] },
    { s: 12.4, e: 13.72, lines: [[12.4, [['OS BRAÇOS DELA']]], [12.8, [['DOEM.', 'obs']]]] },
    { s: 13.8, e: 14.6, lines: [[13.8, [['ELA PARA']]], [14.0, [['PRIMEIRO.']]]] },
    { s: 14.65, e: REGRAB_T - 0.1, lines: [[14.65, [['O EGO PASSA']]], [14.9, [['NA FRENTE.']]]] },
    { s: REGRAB_T - 0.05, e: 16.6, lines: [[REGRAB_T - 0.05, [['MAS ELA']]], [REGRAB_T + 0.2, [['EMPURRA DE NOVO.']]]] },
    { s: 16.65, e: Math.min(17.6, PASS_T - 0.25), lines: [[16.65, [['SEM PLATEIA,']]], [16.95, [['O EGO DESISTE.']]]] },
    { s: Math.min(17.6, PASS_T - 0.25) + 0.05, e: 18.95, lines: [[Math.min(17.6, PASS_T - 0.25) + 0.05, [['E ELA']]], [PASS_T - 0.05, [['PASSA O EGO.']]]] },
    { s: 21.0, e: 99, big: true, lines: [[21.0, [['DOEU? CONTINUA.']]]] },
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
      const a = 0.22 * Math.min(1.3, lv[k]) * (k === 'obs' ? 1 + 0.8 * smooth(seg(t, BREAK_T, BREAK_T + 0.5)) : 1);
      const hy = BAR ? FLOOR - 260 : FLOOR - 90;
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
      c.save(); c.translate(st.x + (BAR ? 0 : 10), FLOOR + 2); c.scale(1, 0.16);
      const sg = c.createRadialGradient(0, 0, 0, 0, 0, 80); sg.addColorStop(0, 'rgba(0,0,0,0.5)'); sg.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = sg; c.beginPath(); c.arc(0, 0, 80, 0, Math.PI * 2); c.fill(); c.restore();
      let arm = null, sd = 9;
      if (k === 'obs') {
        const h = hurtOf(t); sd = t - lastOf(PAIN_EV, t); const th = sd < 1 ? Math.exp(-sd * 7) : 0;
        if (t < BREAK_T) { if (st.front) st.nod = (st.nod || 0) + 9 * h * th; else { st.head = (st.head || 0) + 0.24 * h * th; st.lean = (st.lean || 0) + 0.04 * h * th; } }
        arm = { a: h * (0.8 + 0.2 * th), g: h * (0.1 + 0.32 * th) * clamp(light) };
      }
      const R = st.front ? rigF(st) : rigP(st);
      if (st.front) drawFigF(c, R, light, COL[k], arm); else drawFigure(c, R, light, COL[k], arm);
      drawBarTop(c, k, lv[k]);
      if (arm && arm.a > 0.4 && sd >= 0 && sd < 0.34 && t < BREAK_T + 0.1) {   // tracinhos de dor nos ombros
        const u = sd / 0.34; c.save(); c.strokeStyle = rgb(ACC, 1, (1 - u) * arm.a * light); c.lineWidth = 6; c.lineCap = 'round';
        const spots = st.front ? [[R.sh[0], -2.45], [R.sh[1], -0.69]] : [[R.arm, -2.5]];
        for (const [E, a0] of spots) for (let i = -1; i <= 1; i++) { const an = a0 + i * 0.42, r0 = 44 + 16 * easeOut(u), r1 = r0 + 18; c.beginPath(); c.moveTo(E[0] + Math.cos(an) * r0, E[1] + Math.sin(an) * r0); c.lineTo(E[0] + Math.cos(an) * r1, E[1] + Math.sin(an) * r1); c.stroke(); }
        c.restore();
      }
    }
    if (!BAR) { const a = t - BREAK_T; if (a >= 0 && a < 0.3) { const R = rigP(stateOf.obs(BREAK_T)), hp = P2(R.armF[2], R.armB[2], 0.5), u = a / 0.3;   // estouro da palma
      c.save(); c.strokeStyle = `rgba(255,255,255,${(1 - u).toFixed(3)})`; c.lineWidth = 5; c.lineCap = 'round';
      for (let i = 0; i < 8; i++) { const an = i * Math.PI / 4 + 0.2, r0 = 26 + 40 * easeOut(u), r1 = r0 + 20; c.beginPath(); c.moveTo(hp[0] + Math.cos(an) * r0, hp[1] + Math.sin(an) * r0); c.lineTo(hp[0] + Math.cos(an) * r1, hp[1] + Math.sin(an) * r1); c.stroke(); }
      c.restore(); } }
    for (const [tt, big, k] of THUDS) dust(c, k === 'obs' ? stateOf.obs(tt).x + (BAR ? 0 : 40) : CX(k), tt, t, 0.5 + 0.6 * big);
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
    if (BAR && k === 'ego') alpha *= 1 - smooth(seg(t, 18.4, 18.65));
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
    fadeLab('lab-motiv', 6.2, 6.8, 0.6); fadeLab('lab-disc', 11.0, 11.6, 0.4); fadeLab('lab-ego', 17.4, 18.0, 0.6);
  }

  const typing = [];
  for (const cap of CAPS) for (const [ls, segs] of cap.lines) wordsOf(segs).forEach((w, j) => { const tt = ls + j * WSTEP; if (tt >= 0 && tt < cap.e) typing.push(+tt.toFixed(3)); });
  window.__schedule = { theme: THEME, shots: SHOTS, focus: FOCUS, slam: 1.5, motivQuit: RUN.motiv.end, egoQuit: RUN.ego.end, meta: RUN.disc.end, payoff: BREAK_T, fall: FALL_HIT, regrab: BAR ? REGRAB_T : null,
    reps: REPS, thuds: THUDS, moans: MOANS, crowd: CROWD, cheer: [FALL_HIT + 0.6, 15.2], words: typing };
  window.__renderAt = renderAt;
  window.addEventListener('hf-seek', (e) => renderAt(e.detail.time));
  renderAt(0);
})();
