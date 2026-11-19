// Regar até dar fruto: Disciplina x Obsessão x Ego — 2D vetorial (bonecos de perfil com contorno), função pura do tempo.
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
  const rnd = mulberry32(3301);
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

  // ---------- regador ----------
  const TREE_X = { disc: 260, obs: 600, ego: 935 };
  const canRot = (p, a) => [p[0] * Math.cos(a) - p[1] * Math.sin(a), p[0] * Math.sin(a) + p[1] * Math.cos(a)];
  const canPt = (C, a, p) => add(C, canRot(p, a));
  function drawCan(c, C, a) {
    c.save(); c.translate(C[0], C[1]); c.rotate(a);
    c.lineCap = 'round'; c.lineJoin = 'round';
    // bico
    c.lineWidth = 11 + 8; c.strokeStyle = OUT; c.beginPath(); c.moveTo(22, 4); c.lineTo(72, -34); c.stroke();
    c.lineWidth = 11; c.strokeStyle = '#a8a8b0'; c.beginPath(); c.moveTo(22, 4); c.lineTo(72, -34); c.stroke();
    c.beginPath(); c.ellipse(74, -36, 9, 6, -0.65, 0, Math.PI * 2); c.fillStyle = '#c4c4cc'; c.fill(); c.lineWidth = 4; c.strokeStyle = OUT; c.stroke();
    // alça
    c.lineWidth = 8 + 8; c.strokeStyle = OUT; c.beginPath(); c.moveTo(-26, -20); c.quadraticCurveTo(-10, -60, 14, -20); c.stroke();
    c.lineWidth = 8; c.strokeStyle = '#a8a8b0'; c.beginPath(); c.moveTo(-26, -20); c.quadraticCurveTo(-10, -60, 14, -20); c.stroke();
    // corpo
    c.beginPath(); c.roundRect(-32, -24, 62, 50, 9); c.fillStyle = '#c4c4cc'; c.fill(); c.lineWidth = 4.5; c.strokeStyle = OUT; c.stroke();
    c.fillStyle = 'rgba(255,255,255,0.45)'; c.fillRect(-25, -17, 7, 36);
    c.restore();
  }
  function drawFigure(c, R, light, can) {
    const f = rgb(mixC(DARK, WHITE, light)), b = rgb(mixC(DARKB, BACK, light));
    limb(c, R.legB, D.limb, b);
    limb(c, R.armB, D.limb, b);
    strokePts(c, [R.hip, R.sh], D.torsoW + 2 * D.ol, OUT);
    strokePts(c, R.legF, D.limb + 2 * D.ol, OUT);
    strokePts(c, [R.hip, R.sh], D.torsoW, f);
    strokePts(c, R.legF, D.limb, f);
    if (can) drawCan(c, can.C, can.a);
    limb(c, R.armF, D.limb, f);
    disc(c, R.head, D.headR + D.ol, OUT); disc(c, R.head, D.headR, f);
  }

  // ---------- regando ----------
  const POUR_L = { fT: 0.2, fS: -0.03, bT: -0.18, bS: -0.12 };
  const STAND_L = { fT: 0.06, fS: -0.02, bT: -0.1, bS: -0.06 };
  const SIT_L = { fT: 2.3, fS: 0.8, bT: 2.15, bS: 0.7 };
  const mixL = (a, b, u) => ({ fT: lerp(a.fT, b.fT, u), fS: lerp(a.fS, b.fS, u), bT: lerp(a.bT, b.bT, u), bS: lerp(a.bS, b.bS, u) });
  const T0 = 2.6;
  const RUN = {
    ego: { P: 0.7, end: 5.0, rate: 0.5 },
    disc: { P: 1.1, end: 9.4, rate: 4 / 6.8 },
    obs: { P: 0.9, end: 14.8, rate: 0.9 },
  };
  const PAY = 14.8, PXM = 42;
  const meters = (k, t) => RUN[k].rate * clamp(t - T0, 0, RUN[k].end - T0);
  // inclinação do regador: sobe, segura despejando, volta
  function tiltAt(k, t) {
    if (t < T0) return 0.12 * Math.sin(t * 2.2);
    if (t >= RUN[k].end) return 0;
    const ph = ((t - T0) / RUN[k].P) % 1;
    if (ph < 0.25) return 0.85 * easeInOut(ph / 0.25);
    if (ph < 0.7) return 0.85 + 0.05 * Math.sin((ph - 0.25) * 30);
    return 0.85 * (1 - easeInOut((ph - 0.7) / 0.3));
  }
  function pourState(k, t) {
    const x = HX[k], hy = standHipY(POUR_L);
    const a = tiltAt(k, t);
    const C = [x + 78 + 10 * a, hy - 46 - 12 * a];
    const handle = canPt(C, a, [-6, -50]), bottom = canPt(C, a, [-30, 22]);
    return { x, hipY: hy, lean: 0.12 + 0.12 * a, head: 0.18, legs: POUR_L, hands: [handle, bottom], can: { C, a }, prefF: 'down', prefB: 'down' };
  }
  function egoState(t) {
    const end = RUN.ego.end;
    if (t < end) return pourState('ego', t);
    const x = HX.ego, last = pourState('ego', end - 1e-3);
    const u = easeInOut(seg(t, end, end + 0.5));
    const hy0 = standHipY(STAND_L);
    const slump = { x, hipY: lerp(last.hipY, hy0, u), lean: lerp(last.lean, 0.38, u), head: lerp(0.18, 0.5, u), legs: mixL(POUR_L, STAND_L, u),
      hands: [P2(last.hands[0], [x + 18, hy0 + 40], u), P2(last.hands[1], [x + 6, hy0 + 44], u)], prefF: 'down', prefB: 'down' };
    const s = easeInOut(seg(t, 5.6, 6.4));
    if (s <= 0) return slump;
    const legs = mixL(STAND_L, SIT_L, s);
    return { x: x - 40 * s, hipY: lerp(slump.hipY, FLOOR - 17, s), lean: lerp(0.38, 0.42, s), head: lerp(0.5, 0.75, s), legs,
      hands: [P2(slump.hands[0], [x + 60 - 40 * s, FLOOR - 62], s), P2(slump.hands[1], [x + 48 - 40 * s, FLOOR - 58], s)], prefF: 'down', prefB: 'down' };
  }
  function egoCan(t) {
    const end = RUN.ego.end; if (t < end) return null;
    const last = pourState('ego', end - 1e-3).can;
    const u = easeIn(seg(t, end, end + 0.38));
    const bounce = t > end + 0.38 ? 8 * Math.sin(Math.PI * seg(t, end + 0.38, end + 0.56)) : 0;
    return { C: P2(last.C, [HX.ego + 92, FLOOR - 26 - bounce], u), a: lerp(last.a, 1.45, u) };
  }
  function discState(t) {
    const end = RUN.disc.end;
    if (t < end) return pourState('disc', t);
    const x = HX.disc, last = pourState('disc', end - 1e-3);
    const u = easeInOut(seg(t, end, end + 0.5));
    const hy0 = standHipY(STAND_L);
    const restC = [x + 84, FLOOR - 27];
    const can = { C: P2(last.can.C, restC, u), a: lerp(last.can.a, 0, u) };
    const onCan = [canPt(can.C, can.a, [-6, -50]), canPt(can.C, can.a, [-30, 22])];
    const hipsU = easeInOut(seg(t, end + 0.55, end + 0.95));
    const hips = [[x + 16, hy0 - 16], [x + 6, hy0 - 20]];
    const hands = hipsU > 0 ? [P2(onCan[0], hips[0], hipsU), P2(onCan[1], hips[1], hipsU)] : onCan;
    return { x, hipY: lerp(last.hipY, hy0 + 10 * Math.sin(Math.PI * u), u), lean: lerp(last.lean, -0.03, u) + 0.5 * Math.sin(Math.PI * u) * (1 - hipsU),
      head: lerp(0.18, -0.1, u), legs: mixL(POUR_L, STAND_L, u), hands, can, prefF: hipsU > 0.3 ? 'back' : 'down', prefB: hipsU > 0.3 ? 'back' : 'down' };
  }
  function obsState(t) {
    if (t < PAY) return pourState('obs', t);
    const x = HX.obs, last = pourState('obs', PAY - 1e-3);
    const u = easeOut(seg(t, PAY + 0.15, PAY + 0.6));
    const hy0 = standHipY(STAND_L) - 6 * Math.sin(Math.PI * seg(t, PAY + 0.25, PAY + 0.65));
    const up = [[x + 96, hy0 - 232], [x - 58, hy0 - 226]];
    const fall = easeIn(seg(t, PAY + 0.05, PAY + 0.4));
    return { x, hipY: lerp(last.hipY, hy0, u), lean: lerp(last.lean, -0.08 + 0.04 * Math.sin((t - PAY) * 5), u), head: lerp(0.18, -0.25, u), legs: mixL(POUR_L, STAND_L, u),
      hands: [P2(last.hands[0], up[0], u), P2(last.hands[1], up[1], u)], prefF: 'fwd', prefB: 'back',
      can: { C: P2(last.can.C, [x + 96, FLOOR - 26], fall), a: lerp(last.can.a, 0.3, fall), loose: true } };
  }
  const stateOf = { disc: discState, obs: obsState, ego: egoState };
  const POURS = { ego: [], disc: [], obs: [] };
  for (const k of ['ego', 'disc', 'obs']) for (let n = 0; ; n++) { const ts = T0 + RUN[k].P * (n + 0.2); if (ts >= RUN[k].end) break; POURS[k].push(+ts.toFixed(3)); }

  // água saindo do bico até a base da árvore
  function drawWater(c, k, t, st) {
    if (!st.can || st.can.loose) return;
    const a = st.can.a; if (a < 0.45 || t >= RUN[k].end) return;
    const s = canPt(st.can.C, a, [78, -38]), e = [TREE_X[k] - 22, FLOOR - 8];
    const m = [(s[0] + e[0]) / 2 + 14, Math.min(s[1], e[1]) - 10];
    const q = (u) => [(1 - u) * (1 - u) * s[0] + 2 * (1 - u) * u * m[0] + u * u * e[0], (1 - u) * (1 - u) * s[1] + 2 * (1 - u) * u * m[1] + u * u * e[1]];
    const alpha = smooth((a - 0.45) / 0.25);
    c.save(); c.globalAlpha = alpha;
    c.lineCap = 'round'; c.strokeStyle = 'rgba(225,235,242,0.85)'; c.lineWidth = 6;
    c.setLineDash([16, 12]); c.lineDashOffset = -t * 260;
    c.beginPath(); for (let i = 0; i <= 20; i++) { const p = q(i / 20); if (i === 0) c.moveTo(p[0], p[1]); else c.lineTo(p[0], p[1]); } c.stroke();
    c.setLineDash([]);
    for (let i = 0; i < 3; i++) { const ph = (t * 3 + i / 3) % 1; c.fillStyle = `rgba(225,235,242,${0.8 * (1 - ph)})`; c.beginPath(); c.arc(e[0] + (i - 1) * 14 * ph * 2, e[1] - 18 * Math.sin(Math.PI * ph), 4, 0, Math.PI * 2); c.fill(); }
    c.restore();
  }

  // ---------- árvore ----------
  function buildTree(seed) {
    const r = mulberry32(seed), segs = [];
    const grow = (p, ang, len, w, d) => {
      const q = [p[0] + Math.sin(ang) * len, p[1] - Math.cos(ang) * len];
      segs.push({ a: p, b: q, w, d });
      if (d >= 6) return;
      const n = d < 1 ? 2 : (r() < 0.35 ? 3 : 2);
      for (let i = 0; i < n; i++) {
        const spread = (i - (n - 1) / 2) * (0.5 + r() * 0.25) + (r() - 0.5) * 0.2;
        grow(q, ang + spread * (d < 1 ? 0.8 : 1), len * (0.72 + r() * 0.1), w * 0.68, d + 1);
      }
    };
    grow([0, 0], (r() - 0.5) * 0.08, 0.34, 0.075, 0);
    return segs;
  }
  const TREES = { disc: buildTree(7), obs: buildTree(19), ego: buildTree(31) };
  const FRUITS = (() => { const r = mulberry32(5), out = []; for (const s of TREES.obs) if (s.d >= 4 && r() < 0.55) out.push({ s, f: 0.4 + r() * 0.6, delay: r() * 0.6 }); return out; })();
  // h em px; progresso p = quanto da estrutura apareceu
  function treeH(k, t) {
    let h = meters(k, t) * PXM;
    if (k === 'obs' && t >= PAY) h += 90 * easeOut(seg(t, PAY, PAY + 0.6));
    return h;
  }
  function drawTree(c, k, t) {
    const h = treeH(k, t); if (h < 2) return;
    const base = [TREE_X[k], FLOOR - 6];
    const scale = Math.max(h, 1) / 0.95;
    const p = clamp(Math.pow(h / 580, 0.55)) * 7;
    const wilt = k === 'ego' ? easeInOut(seg(t, 5.3, 6.6)) : 0;
    const burst = k === 'obs' ? easeOut(seg(t, PAY, PAY + 0.8)) : 0;
    const lit = k === 'ego' ? lerp(1, 0.45, wilt) : 1;
    c.save(); c.translate(base[0], base[1]); c.rotate(-0.0 + wilt * 0.35);
    const vis = [];
    for (const s of TREES[k]) {
      const g = clamp(p - s.d); if (g <= 0) continue;
      const b = [s.a[0] + (s.b[0] - s.a[0]) * g, s.a[1] + (s.b[1] - s.a[1]) * g];
      const droop = wilt * s.d * 0.04;
      const A = [s.a[0] * scale, s.a[1] * scale * (1 - droop)], B = [b[0] * scale + wilt * s.d * 6, b[1] * scale * (1 - droop * 1.5)];
      vis.push({ A, B, w: Math.max(5, s.w * scale), d: s.d, g });
    }
    for (const sgm of vis) { c.lineCap = 'round'; c.lineWidth = sgm.w + 9; c.strokeStyle = OUT; c.beginPath(); c.moveTo(...sgm.A); c.lineTo(...sgm.B); c.stroke(); }
    for (const sgm of vis) { c.lineWidth = sgm.w; c.strokeStyle = rgb([118, 116, 122], lit); c.beginPath(); c.moveTo(...sgm.A); c.lineTo(...sgm.B); c.stroke(); }
    // folhas nas pontas
    const leafR = Math.max(7, Math.min(26, scale * 0.03)) * (1 + 1.1 * burst);
    for (const sgm of vis) {
      if (sgm.d < 2 && h > 120) continue;
      if (sgm.g < 0.6) continue;
      const n = sgm.d >= 4 ? 2 : 1;
      for (let i = 0; i < n; i++) {
        const lx = sgm.B[0] + (i ? leafR * 0.7 : -leafR * 0.2), ly = sgm.B[1] - (i ? leafR * 0.5 : 0) + wilt * 10;
        c.beginPath(); c.ellipse(lx, ly, leafR, leafR * 0.72, -0.5 + i, 0, Math.PI * 2);
        c.fillStyle = rgb([84, 83, 88], lit * (k === 'obs' ? 1 + 0.25 * burst : 1)); c.fill(); c.lineWidth = 3.5; c.strokeStyle = OUT; c.stroke();
      }
    }
    // frutos vermelhos da obsessão
    if (burst > 0) {
      for (const fr of FRUITS) {
        const u = easeOut(seg(t, PAY + 0.2 + fr.delay, PAY + 0.55 + fr.delay)); if (u <= 0) continue;
        const s = fr.s, P = [(s.a[0] + (s.b[0] - s.a[0]) * fr.f) * scale, (s.a[1] + (s.b[1] - s.a[1]) * fr.f) * scale + 16];
        const rad = 13 * u * (1 + 0.15 * Math.sin((t - PAY) * 6 + fr.f * 9));
        c.beginPath(); c.arc(P[0], P[1], rad + 4, 0, Math.PI * 2); c.fillStyle = OUT; c.fill();
        c.beginPath(); c.arc(P[0], P[1], rad, 0, Math.PI * 2); c.fillStyle = rgb(RED); c.fill();
        c.fillStyle = 'rgba(255,255,255,0.55)'; c.beginPath(); c.arc(P[0] - rad * 0.35, P[1] - rad * 0.35, rad * 0.28, 0, Math.PI * 2); c.fill();
      }
    }
    c.restore();
    // monte de terra
    c.beginPath(); c.ellipse(base[0], FLOOR, 52, 16, 0, Math.PI, 0); c.fillStyle = '#2a2a2e'; c.fill(); c.lineWidth = 4; c.strokeStyle = OUT; c.stroke();
  }
  function drawMound(c, k) { const x = TREE_X[k]; c.beginPath(); c.ellipse(x, FLOOR, 52, 16, 0, Math.PI, 0); c.fillStyle = '#2a2a2e'; c.fill(); c.lineWidth = 4; c.strokeStyle = OUT; c.stroke(); }

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
    const y = FLOOR - 4 * PXM - 6, x0 = TREE_X.disc + 10, x1 = TREE_X.disc + 74;
    c.lineCap = 'round'; c.lineWidth = 6 + 8; c.strokeStyle = OUT; c.beginPath(); c.moveTo(x1, FLOOR); c.lineTo(x1, y - 4); c.stroke();
    c.lineWidth = 6; c.strokeStyle = '#8a8a92'; c.beginPath(); c.moveTo(x1, FLOOR); c.lineTo(x1, y - 4); c.stroke();
    c.save(); c.setLineDash([14, 10]); c.lineWidth = 3; c.strokeStyle = hit ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.45)';
    c.beginPath(); c.moveTo(x0, y); c.lineTo(x1, y); c.stroke(); c.restore();
    const flash = hit ? Math.exp(-(t - RUN.disc.end) * 4) : 0;
    const label = hit ? 'META ✓' : 'META 4 M';
    c.font = '700 22px "Space Mono", monospace'; const tw = c.measureText(label).width;
    const px = x1 - (tw + 26) / 2, py = y - 44;
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
    if (w > 0) { const s2 = 0.7, fx = 540, fy = FLOOR; ox = lerp(ox, 540 - fx * s2, w); oy = lerp(oy, 1100 - fy * s2, w); s = lerp(s, s2, w); }
    const k1 = t >= 1.5 ? Math.exp(-(t - 1.5) * 9) : 0, k2 = t >= PAY ? Math.exp(-(t - PAY) * 6) : 0;
    ox += 15 * k1 * Math.sin((t - 1.5) * 70) + 18 * k2 * Math.sin((t - PAY) * 64);
    oy += 10 * k1 * Math.cos((t - 1.5) * 83) + 14 * k2 * Math.cos((t - PAY) * 77);
    return { s, ox, oy };
  }
  const toScreen = (p, C) => [p[0] * C.s + C.ox, p[1] * C.s + C.oy];

  // ---------- texto digitando ----------
  const CPS = 26;
  const CAPS = [
    { s: -1, e: 2.45, lines: [[-1, [['TRÊS PLANTAM.']]], [0.32, [['SÓ '], ['UMA', 1], [' DÁ FRUTO.']]]] },
    { s: 2.6, e: 4.55, lines: [[2.6, [['O EGO REGA']]], [3.05, [['PRA SER VISTO.']]]] },
    { s: 4.65, e: 6.55, lines: [[4.65, [['SEM PLATEIA,']]], [5.15, [['ABANDONA.']]]] },
    { s: 6.65, e: 8.6, lines: [[6.65, [['A DISCIPLINA']]], [7.15, [['REGA NO RITMO.']]]] },
    { s: 8.7, e: 10.5, lines: [[8.7, [['BATE A META']]], [9.2, [['E PARA.']]]] },
    { s: 10.6, e: 12.6, lines: [[10.6, [['A '], ['OBSESSÃO', 1]]], [11.1, [['PASSA DA META.']]]] },
    { s: 12.7, e: 14.7, lines: [[12.7, [['E CONTINUA']]], [13.15, [['REGANDO.']]]] },
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
    c.fillStyle = '#1b1b1e'; c.fillRect(-400, FLOOR, W + 800, 900);
    c.fillStyle = 'rgba(255,255,255,0.2)'; c.fillRect(-400, FLOOR - 2, W + 800, 4);
    drawCrowd(c, t);
    // aura vermelha atrás da árvore da obsessão
    const aura = smooth(seg(t, 10.6, 12.0)) * 0.45 + 0.55 * smooth(seg(t, PAY, PAY + 0.6));
    if (aura > 0) {
      const cy = FLOOR - treeH('obs', t) * 0.7;
      c.save(); c.globalCompositeOperation = 'lighter';
      const g = c.createRadialGradient(TREE_X.obs, cy, 0, TREE_X.obs, cy, 380);
      g.addColorStop(0, rgb(RED, 1, 0.3 * aura)); g.addColorStop(1, rgb(RED, 1, 0));
      c.fillStyle = g; c.beginPath(); c.arc(TREE_X.obs, cy, 380, 0, Math.PI * 2); c.fill(); c.restore();
    }
    for (const k of ['disc', 'obs', 'ego']) { drawMound(c, k); drawTree(c, k, t); }
    drawMeta(c, t);
    const ec = egoCan(t); if (ec) drawCan(c, ec.C, ec.a);
    for (const k of ['disc', 'ego', 'obs']) {
      const st = stateOf[k](t);
      const light = clamp(0.3 + 0.7 * Math.min(1, lv[k] / 0.85));
      c.save(); c.translate(st.x + 10, FLOOR + 2); c.scale(1, 0.16);
      const sg = c.createRadialGradient(0, 0, 0, 0, 0, 80); sg.addColorStop(0, 'rgba(0,0,0,0.5)'); sg.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = sg; c.beginPath(); c.arc(0, 0, 80, 0, Math.PI * 2); c.fill(); c.restore();
      const R = rigP(st);
      if (st.can && st.can.loose) { drawCan(c, st.can.C, st.can.a); drawFigure(c, R, light, null); }
      else drawFigure(c, R, light, st.can);
      drawWater(c, k, t, st);
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
      const fl = toScreen([(HX[k] + TREE_X[k]) / 2, FLOOR + 10], C);
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
    if (hud.disc) hud.disc.textContent = t >= RUN.disc.end ? `${fmt(meters('disc', t) + 1e-6)} M ✓` : `${fmt(meters('disc', t) + 1e-6)} M`;
    if (hud.obs) hud.obs.textContent = `${fmt(treeH('obs', t) / PXM + 1e-6)} M`;
    if (hud.ego) hud.ego.textContent = `${fmt(meters('ego', t) + 1e-6)} M`;
    const egoLab = document.getElementById('lab-ego'); if (egoLab) egoLab.style.opacity = String(1 - 0.6 * smooth(seg(t, 5.2, 5.8)));
    const discLab = document.getElementById('lab-disc'); if (discLab) discLab.style.opacity = String(1 - 0.4 * smooth(seg(t, 10.6, 11.2)));
  }

  const typing = [];
  for (const cap of CAPS) for (const [ls, segs] of cap.lines) { const total = lenOf(segs); const txt = segs.map((s) => s[0]).join(''); for (let i = 0; i < total; i++) { const tt = ls + (i + 1) / CPS; if (tt >= 0 && tt < cap.e && txt[i] !== ' ') typing.push(+tt.toFixed(3)); } }
  window.__schedule = { slam: 1.5, egoQuit: RUN.ego.end, egoSit: 6.4, meta: RUN.disc.end, payoff: PAY, pours: POURS, crowd: [2.6, 4.75], typing };
  window.__renderAt = renderAt;
  window.addEventListener('hf-seek', (e) => renderAt(e.detail.time));
  renderAt(0);
})();
