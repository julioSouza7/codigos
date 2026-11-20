// Saco de pancada (4 personagens): Disciplina x Obsessão x Ego — 2D vetorial, função pura do tempo.
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
  const rnd = mulberry32(3434);
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
  const COL = { disc: [47, 155, 255], obs: [255, 59, 48], motiv: [255, 204, 0], ego: [184, 92, 255] };
  const KS = ['disc', 'obs', 'motiv', 'ego'];
  const HX = { disc: 70, obs: 405, motiv: 740, ego: 1075 };
  const WALL_T = 66;

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

  // ---------- golpes ----------
  const SWING_L = { fT: 0.3, fS: -0.04, bT: -0.24, bS: -0.16 };
  const STAND_L = { fT: 0.06, fS: -0.02, bT: -0.1, bS: -0.06 };
  const SIT_L = { fT: 2.3, fS: 0.8, bT: 2.15, bS: 0.7 };
  const mixL = (a, b, u) => ({ fT: lerp(a.fT, b.fT, u), fS: lerp(a.fS, b.fS, u), bT: lerp(a.bT, b.bT, u), bS: lerp(a.bS, b.bS, u) });
  const BX = (k) => HX[k] + 205;
  const wallFace = (k) => BX(k) - 56;
  const envP = (ph, a, pk, e) => (ph < a || ph > e ? 0 : ph < pk ? easeIn((ph - a) / (pk - a)) : 1 - easeOut((ph - pk) / (e - pk)));
  function punchKey(hx, ph, big) {
    const hy = standHipY(SWING_L);
    const gF = [hx + 46, hy - 150], gB = [hx + 22, hy - 140];
    const tF = [hx + 205 - 60, hy - 158], tB = [hx + 205 - 60, hy - 132];
    const f = big ? ph : envP(ph, 0.04, 0.17, 0.34), b = big ? ph : envP(ph, 0.54, 0.67, 0.84);
    const m = Math.max(f, b);
    return { hands: [P2(gF, tF, f), P2(gB, tB, b)], lean: 0.12 + 0.14 * m, dip: 6 * m };
  }
  const mixKey = (a, b, u) => ({ hands: [P2(a.hands[0], b.hands[0], u), P2(a.hands[1], b.hands[1], u)], lean: lerp(a.lean, b.lean, u), dip: lerp(a.dip, b.dip, u) });
  function cyclePose(hx, ph) { return punchKey(hx, ph, false); }
  function swingState(hx, key) {
    const hy = standHipY(SWING_L) + key.dip;
    return { x: hx, hipY: hy, lean: key.lean, head: 0.05, legs: SWING_L, hands: key.hands, hammer: null, prefF: 'down', prefB: 'down' };
  }
  const T0 = 3.0;
  const RUN = {
    motiv: { P: 0.5, end: 5.6, rate: 300 },
    ego: { P: 0.7, end: 10.0, rate: 120 },
    disc: { P: 0.9, end: 14.0, rate: 1000 / 11 },
    obs: { P: 0.66, end: 19.0, rate: 170 },
  };
  const BREAK_T = 19.0;
  const hits = (k, t) => RUN[k].rate * clamp(t - T0, 0, RUN[k].end - T0);
  const TOTAL = RUN.obs.rate * (BREAK_T - T0);
  const crackP = (k, t) => clamp(hits(k, t) / TOTAL);

  function hookKey(hx, t) {
    const guard = punchKey(hx, 0, true), out = punchKey(hx, 1, true);
    const back = Object.assign({}, guard, { lean: -0.05 });
    if (t < 1.2) return mixKey(guard, back, easeInOut(t / 1.2));
    if (t < 1.5) return mixKey(back, out, easeIn(seg(t, 1.38, 1.5)));
    if (t < 2.2) return mixKey(out, guard, easeInOut(seg(t, 1.6, 2.2)));
    return guard;
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
    return null;
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
    const u = easeInOut(seg(t, end, end + 0.6));
    const hy0 = standHipY(STAND_L);
    const hips = [[x + 16, hy0 - 16], [x + 6, hy0 - 20]];
    return { x, hipY: lerp(last.hipY, hy0, u), lean: lerp(last.lean, -0.03, u), head: lerp(0.05, -0.1, u), legs: mixL(SWING_L, STAND_L, u),
      hands: [P2(last.hands[0], hips[0], u), P2(last.hands[1], hips[1], u)], prefF: u > 0.3 ? 'back' : 'down', prefB: u > 0.3 ? 'back' : 'down' };
  }
  function obsState(t) {
    if (t < BREAK_T) return swinging('obs', t);
    const x = HX.obs, last = atRest('obs');
    const u = easeOut(seg(t, BREAK_T + 0.2, BREAK_T + 0.65));
    const hy0 = standHipY(STAND_L) - 8 * Math.sin(Math.PI * seg(t, BREAK_T + 0.3, BREAK_T + 0.7));
    const up = [[x + 96, hy0 - 232], [x - 58, hy0 - 226]];
    return { x, hipY: lerp(last.hipY, hy0, u), lean: lerp(last.lean, -0.08 + 0.04 * Math.sin((t - BREAK_T) * 5), u), head: lerp(0.05, -0.25, u), legs: mixL(SWING_L, STAND_L, u),
      hands: [P2(last.hands[0], up[0], u), P2(last.hands[1], up[1], u)], prefF: 'fwd', prefB: 'back' };
  }
  const stateOf = { disc: discState, obs: obsState, motiv: motivState, ego: egoState };

  // golpes (para poeira, rachaduras e sons)
  const STRIKES = { motiv: [], ego: [], disc: [], obs: [] };
  for (const k of KS) for (let n = 0; ; n++) { const ts = T0 + RUN[k].P * (n + 0.17), t2 = T0 + RUN[k].P * (n + 0.67); if (ts >= RUN[k].end) break; STRIKES[k].push(ts); if (t2 < RUN[k].end) STRIKES[k].push(t2); }
  const IMPACT_Y = standHipY(SWING_L) - 150;
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
  const BAG_TOP = FLOOR - 600, BAG_Y0 = FLOOR - 470, BAG_H = 330, BAG_W = 116;
  function bagAngle(k, t) {
    let a = 0;
    for (const ts of STRIKES[k]) { const d = t - ts; if (d > 0 && d < 1.6) a += 0.07 * Math.exp(-d * 2.6) * Math.sin(d * 8); }
    return -a;
  }
  function drawWall(c, k, t, lv) {
    const cx = BX(k), lit = 0.6 + 0.4 * Math.min(1, lv), p = crackP(k, t);
    // trave do teto
    c.fillStyle = '#2b2a2e'; c.strokeStyle = OUT; c.lineWidth = 4; c.beginPath(); c.rect(cx - 70, BAG_TOP - 22, 140, 22); c.fill(); c.stroke();
    const d = t - BREAK_T, flying = k === 'obs' && d > 0;
    c.save();
    let ang = bagAngle(k, t);
    if (flying) {
      // corrente arrebenta: o saco voa para a direita girando e cai
      c.translate(cx + 520 * d, BAG_TOP - 160 * d + 0.5 * 1500 * d * d); c.rotate(-0.4 * d * 4); c.translate(-cx, -BAG_TOP);
    } else { c.translate(cx, BAG_TOP); c.rotate(ang); c.translate(-cx, -BAG_TOP); }
    // corrente
    c.strokeStyle = '#9a9aa2'; c.lineWidth = 5;
    for (let y = BAG_TOP + 6; y < BAG_Y0 - 6; y += 22) { c.beginPath(); c.ellipse(cx, y + 9, 7, 11, 0, 0, Math.PI * 2); c.stroke(); }
    // saco
    const x0 = cx - BAG_W / 2;
    c.beginPath(); c.roundRect(x0, BAG_Y0, BAG_W, BAG_H, 30);
    const g = c.createLinearGradient(x0, 0, x0 + BAG_W, 0); g.addColorStop(0, rgb([70, 66, 72], lit)); g.addColorStop(0.45, rgb([120, 114, 122], lit)); g.addColorStop(1, rgb([52, 50, 56], lit));
    c.fillStyle = g; c.fill(); c.lineWidth = 5; c.strokeStyle = OUT; c.stroke();
    // faixas na cor do personagem
    c.fillStyle = rgb(COL[k], lit * 0.9); c.fillRect(x0 + 3, BAG_Y0 + 60, BAG_W - 6, 18); c.fillRect(x0 + 3, BAG_Y0 + BAG_H - 78, BAG_W - 6, 18);
    c.fillStyle = 'rgba(255,255,255,0.18)'; c.fillRect(x0 + 18, BAG_Y0 + 20, 10, BAG_H - 40);
    // costura rasgando com os golpes
    const n = Math.floor(p * 9);
    c.strokeStyle = OUT; c.lineWidth = 3.5;
    for (let i = 0; i < n; i++) { const yy = BAG_Y0 + 110 + i * 14; c.beginPath(); c.moveTo(x0 + 6, yy); c.lineTo(x0 + 22, yy + 6); c.stroke(); }
    if (k === 'obs' && p > 0.6) { c.fillStyle = `rgba(255,59,48,${0.5 * (p - 0.6) / 0.4})`; c.fillRect(x0 + 4, BAG_Y0 + 120, 12, n * 14); }
    c.restore();
    // areia explodindo
    if (flying && d < 1.4) {
      const r = mulberry32(5);
      for (let i = 0; i < 46; i++) {
        const vx = 200 + r() * 600, vy = -500 + r() * 520, px = cx - 30 + vx * d, py = BAG_Y0 + 140 + vy * d + 800 * d * d;
        if (py > FLOOR) continue;
        c.fillStyle = i % 3 ? '#e2b77a' : rgb(COL.obs); c.globalAlpha = 1 - d / 1.4; c.beginPath(); c.arc(px, py, 4 + r() * 5, 0, Math.PI * 2); c.fill();
      }
      c.globalAlpha = 1;
      // elos da corrente soltos
      c.strokeStyle = '#c4c4cc'; c.lineWidth = 5;
      for (let i = 0; i < 4; i++) { c.beginPath(); c.ellipse(cx - 20 + i * 18 - 90 * d * (i % 2 ? 1 : -1), BAG_TOP + 40 + 300 * d * d + i * 6, 7, 11, i, 0, Math.PI * 2); c.stroke(); }
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
      c.fillStyle = '#d9a86c'; c.fill(); c.lineWidth = 3; c.strokeStyle = OUT; c.stroke();
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
    const hit = t >= RUN.disc.end;
    const flash = hit ? Math.exp(-(t - RUN.disc.end) * 4) : 0;
    const label = hit ? 'META ✓' : 'META 1.000';
    c.font = '700 22px "Space Mono", monospace'; const tw = c.measureText(label).width;
    const px = BX('disc') - (tw + 26) / 2, py = BAG_TOP - 70;
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
  const GS = 0.8, WCX = 668;
  function camAt(t) {
    const hookU = easeOut(seg(t, 1.5, 2.4));
    let s = GS * lerp(1.08, 1.0, hookU);
    const focus = t < 5.6 ? 'motiv' : t < 10.0 ? 'ego' : t < 14.0 ? 'disc' : 'obs';
    let punch = 0; for (const ts of STRIKES[focus]) { const d = t - ts; if (d >= 0 && d < 0.4) punch += 0.02 * Math.exp(-d * 13); }
    s *= 1 + punch;
    let ox = 540 - WCX * s, oy = 960 - 960 * s;
    const k1 = t >= 1.5 ? Math.exp(-(t - 1.5) * 9) : 0, k2 = t >= BREAK_T ? Math.exp(-(t - BREAK_T) * 5) : 0;
    ox += 15 * k1 * Math.sin((t - 1.5) * 70) + 22 * k2 * Math.sin((t - BREAK_T) * 60);
    oy += 10 * k1 * Math.cos((t - 1.5) * 83) + 16 * k2 * Math.cos((t - BREAK_T) * 73);
    return { s, ox, oy };
  }
  const toScreen = (p, C) => [p[0] * C.s + C.ox, p[1] * C.s + C.oy];

  // ---------- texto: palavras pulando, palavra-chave na cor do personagem ----------
  const CAPS = [
    { s: -1, e: 2.85, lines: [[-1, [['QUATRO NO TREINO.']]], [0.3, [['SÓ '], ['UM', 'obs'], [' ESTOURA O SACO.']]]] },
    { s: 3.0, e: 5.5, lines: [[3.0, [['A '], ['MOTIVAÇÃO', 'motiv']]], [3.35, [['SOCA COM RAIVA.']]]] },
    { s: 5.6, e: 8.0, lines: [[5.6, [['MAS NO 3º ROUND']]], [5.95, [['ELA SENTA.']]]] },
    { s: 8.1, e: 10.5, lines: [[8.1, [['O '], ['EGO', 'ego'], [' SOCA']]], [8.45, [['PRA SER VISTO.']]]] },
    { s: 10.6, e: 12.9, lines: [[10.6, [['SEM PLATEIA,']]], [11.0, [['TIRA A LUVA.']]]] },
    { s: 13.0, e: 15.4, lines: [[13.0, [['A '], ['DISCIPLINA', 'disc']]], [13.35, [['BATE A META E PARA.']]]] },
    { s: 15.5, e: 18.9, lines: [[15.5, [['SEM AR,']]], [15.9, [['A '], ['OBSESSÃO', 'obs'], [' SOCA.']]]] },
    { s: 19.1, e: 21.7, big: true, lines: [[19.2, [['CAMPEÃO TREINA']]], [19.6, [['ATÉ '], ['VENCER.', 'obs']]]] },
    { s: 21.8, e: 99, big: true, lines: [[21.8, [['MOTIVAÇÃO', 'motiv'], [' SENTA.']]], [22.15, [['OBSESSÃO', 'obs'], [' LEVANTA.']]]] },
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
      const R = rigP(st);
      drawFigure(c, R, light, null, COL[k]);
      for (const hp of [R.armB[2], R.armF[2]]) { disc(c, hp, 24, OUT); disc(c, hp, 19, rgb(COL[k], 0.45 + 0.55 * light)); c.fillStyle = 'rgba(255,255,255,0.45)'; c.beginPath(); c.arc(hp[0] - 6, hp[1] - 7, 6, 0, Math.PI * 2); c.fill(); }
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
        c.fillStyle = i % 2 ? '#ffffff' : rgb(COL[k]); c.fillRect(-6, -3, 12, 6); c.lineWidth = 2; c.strokeStyle = OUT; c.strokeRect(-6, -3, 12, 6); c.restore();
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
    const C = camAt(t);
    const lv = { disc: level.disc(t), obs: level.obs(t), motiv: level.motiv(t), ego: level.ego(t) };
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
    const fadeLab = (id, a, b, d) => { const el = document.getElementById(id); if (el) el.style.opacity = String(1 - d * smooth(seg(t, a, b))); };
    fadeLab('lab-motiv', 6.2, 6.8, 0.6); fadeLab('lab-ego', 10.6, 11.2, 0.6); fadeLab('lab-disc', 15.4, 16.0, 0.4);
  }

  const typing = [];
  for (const cap of CAPS) for (const [ls, segs] of cap.lines) wordsOf(segs).forEach((w, j) => { const tt = ls + j * WSTEP; if (tt >= 0 && tt < cap.e) typing.push(+tt.toFixed(3)); });
  window.__schedule = { slam: 1.5, motivQuit: RUN.motiv.end, egoQuit: RUN.ego.end, motivSit: 6.6, egoSit: 11.0, meta: RUN.disc.end, payoff: BREAK_T, strikes: STRIKES, crowd: [7.8, 9.7], words: typing };
  window.__renderAt = renderAt;
  window.addEventListener('hf-seek', (e) => renderAt(e.detail.time));
  renderAt(0);
})();
