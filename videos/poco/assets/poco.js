// Cavar até achar água: Disciplina x Obsessão x Ego — 2D vetorial (bonecos de perfil com contorno), função pura do tempo.
// Regras do canal: a OBSESSÃO sempre vence; preto + vermelho só na obsessão; texto digitando em maiúsculas.
(function () {
  const W = 1080, H = 1920, G = 900, PXM = 50, DUR = 18;
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
  const rnd = mulberry32(1918);
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

  // ---------- boneco de perfil (mesma linguagem da referência) ----------
  const D = { headR: 31, limb: 26, torsoW: 30, ol: 5, torso: 100, uArm: 60, fArm: 56, thigh: 82, shin: 78, foot: 20 };
  const OUT = '#0e0e10';
  const WHITE = [247, 247, 245], BACK = [196, 196, 200], DARK = [88, 88, 94], DARKB = [62, 62, 68];
  const RED = [255, 74, 58];
  const LANES = { disc: { x: 200 }, obs: { x: 540 }, ego: { x: 860 } };
  const figX = (k) => LANES[k].x - 34;

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
  const PREF = {
    down: (c) => c[1] - 0.3 * c[0],
    back: (c) => -c[0] + 0.2 * c[1],
    fwd: (c) => c[0] - 0.2 * c[1],
  };
  const legH = (L) => D.thigh * Math.cos(L.fT) + D.shin * Math.cos(L.fS);
  const standHipY = (floor, L) => floor - D.limb * 0.5 - 2 - legH(L);

  function rigP(st) {
    const L = st.legs;
    const hip = [st.x, st.hipY];
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

  // pá: ponta da lâmina (tip) → topo do cabo (top)
  function drawShovel(c, tip, top) {
    const dx = top[0] - tip[0], dy = top[1] - tip[1], len = Math.hypot(dx, dy), ux = dx / len, uy = dy / len;
    const px = -uy, py = ux;
    const bladeL = 46, bw = 19;
    const bTop = [tip[0] + ux * bladeL, tip[1] + uy * bladeL];
    strokePts(c, [bTop, top], 9 + 8, OUT); strokePts(c, [bTop, top], 9, '#9a9aa2');
    const cross = [[top[0] + px * 14, top[1] + py * 14], [top[0] - px * 14, top[1] - py * 14]];
    strokePts(c, cross, 8 + 8, OUT); strokePts(c, cross, 8, '#9a9aa2');
    c.beginPath();
    c.moveTo(bTop[0] + px * bw * 0.75, bTop[1] + py * bw * 0.75);
    c.lineTo(tip[0] + ux * 12 + px * bw, tip[1] + uy * 12 + py * bw);
    c.quadraticCurveTo(tip[0], tip[1], tip[0] + ux * 12 - px * bw, tip[1] + uy * 12 - py * bw);
    c.lineTo(bTop[0] - px * bw * 0.75, bTop[1] - py * bw * 0.75);
    c.closePath();
    c.fillStyle = '#c4c4cc'; c.fill(); c.lineWidth = 4.5; c.strokeStyle = OUT; c.stroke();
  }
  function drawFigure(c, R, light, shovel) {
    const f = rgb(mixC(DARK, WHITE, light)), b = rgb(mixC(DARKB, BACK, light));
    limb(c, R.legB, D.limb, b);
    limb(c, R.armB, D.limb, b);
    strokePts(c, [R.hip, R.sh], D.torsoW + 2 * D.ol, OUT);
    strokePts(c, R.legF, D.limb + 2 * D.ol, OUT);
    strokePts(c, [R.hip, R.sh], D.torsoW, f);
    strokePts(c, R.legF, D.limb, f);
    if (shovel) drawShovel(c, shovel.tip, shovel.top);
    limb(c, R.armF, D.limb, f);
    disc(c, R.head, D.headR + D.ol, OUT); disc(c, R.head, D.headR, f);
  }

  // ---------- cavando ----------
  const DIG_L = { fT: 0.28, fS: -0.04, bT: -0.22, bS: -0.16 };
  const STAND_L = { fT: 0.06, fS: -0.02, bT: -0.1, bS: -0.06 };
  const SIT_L = { fT: 2.3, fS: 0.8, bT: 2.15, bS: 0.7 };
  const mixL = (a, b, u) => ({ fT: lerp(a.fT, b.fT, u), fS: lerp(a.fS, b.fS, u), bT: lerp(a.bT, b.bT, u), bS: lerp(a.bS, b.bS, u) });
  // chaves da pá relativas ao quadril (hx, hy) e ao chão (F)
  const KEYS = {
    READY: (hx, hy, F) => ({ tip: [hx + 74, F - 4], top: [hx + 16, hy - 120], lean: 0.22, dip: 0 }),
    WIND: (hx, hy, F) => ({ tip: [hx + 96, F - 96], top: [hx + 6, hy - 150], lean: 0.1, dip: -2 }),
    STRIKE: (hx, hy, F) => ({ tip: [hx + 80, F + 16], top: [hx + 52, hy - 116], lean: 0.42, dip: 9 }),
    SCOOP: (hx, hy, F) => ({ tip: [hx + 70, F - 44], top: [hx - 26, hy - 72], lean: 0.3, dip: 4 }),
    TOSS: (hx, hy, F) => ({ tip: [hx + 44, hy - 150], top: [hx - 22, hy - 24], lean: -0.02, dip: -3 }),
  };
  const CYCLE = [[0, 'READY'], [0.3, 'WIND'], [0.42, 'STRIKE'], [0.62, 'SCOOP'], [0.82, 'TOSS'], [1.0, 'READY']];
  function mixKey(a, b, u) { return { tip: P2(a.tip, b.tip, u), top: P2(a.top, b.top, u), lean: lerp(a.lean, b.lean, u), dip: lerp(a.dip, b.dip, u) }; }
  function cyclePose(x, F, ph, L) {
    const hx = x, hy = standHipY(F, L);
    let i = 0; while (i < CYCLE.length - 2 && ph >= CYCLE[i + 1][0]) i++;
    const [p0, k0] = CYCLE[i], [p1, k1] = CYCLE[i + 1];
    const raw = (ph - p0) / (p1 - p0);
    const u = k1 === 'STRIKE' ? easeIn(raw) : easeInOut(raw);
    return mixKey(KEYS[k0](hx, hy, F), KEYS[k1](hx, hy, F), u);
  }
  function digState(x, F, key, L, extra) {
    const hy = standHipY(F, L) + key.dip;
    const hands = [P2(key.tip, key.top, 0.55), P2(key.tip, key.top, 0.93)];
    return Object.assign({ x, hipY: hy, lean: key.lean, head: 0.12, legs: L, hands, shovel: { tip: key.tip, top: key.top }, prefF: 'down', prefB: 'down' }, extra || {});
  }

  // agenda: profundidade (m) e ritmo de cada um
  const T0 = 2.6;
  const RUN = {
    ego: { P: 0.45, end: 5.0, rate: 2.5 },
    disc: { P: 0.8, end: 9.4, rate: 10 / 6.8 },
    obs: { P: 0.6, end: 14.8, rate: 1.6 },
  };
  const depthM = (k, t) => RUN[k].rate * clamp(t - T0, 0, RUN[k].end - T0);
  const floorY = (k, t) => G + depthM(k, t) * PXM;
  const WATER_T = 14.8, META_M = 10;

  // gancho: todos erguem a pá e golpeiam o chão juntos em 1,5 s
  function hookKey(x, t) {
    const F = G, L = DIG_L, hy = standHipY(F, L);
    const K = (n) => KEYS[n](x, hy, F);
    if (t < 1.15) return mixKey(K('READY'), K('WIND'), easeInOut(t / 1.15));
    if (t < 1.38) return K('WIND');
    if (t < 1.5) return mixKey(K('WIND'), K('STRIKE'), easeIn(seg(t, 1.38, 1.5)));
    if (t < 2.2) return mixKey(K('STRIKE'), K('READY'), easeInOut(seg(t, 1.5, 2.2)));
    return K('READY');
  }
  function digging(k, t) {
    const x = figX(k), F = floorY(k, t);
    if (t < T0) return digState(x, G, hookKey(x, t), DIG_L);
    const ph = ((t - T0) / RUN[k].P) % 1;
    return digState(x, F, cyclePose(x, F, ph, DIG_L), DIG_L);
  }

  function egoState(t) {
    const end = RUN.ego.end;
    if (t < end) return digging('ego', t);
    const x = figX('ego'), F = floorY('ego', t);
    const last = digging('ego', end - 1e-3);
    const u = easeInOut(seg(t, end, end + 0.5));
    const hy0 = standHipY(F, STAND_L);
    const slump = { x, hipY: lerp(last.hipY, hy0, u), lean: lerp(last.lean, 0.38, u), head: lerp(0.12, 0.5, u), legs: mixL(DIG_L, STAND_L, u),
      hands: [P2(last.hands[0], [x + 18, hy0 + 40], u), P2(last.hands[1], [x + 6, hy0 + 44], u)], prefF: 'down', prefB: 'down' };
    const s = easeInOut(seg(t, 5.6, 6.4));
    if (s <= 0) return slump;
    const legs = mixL(STAND_L, SIT_L, s);
    const hipSit = F - 17;
    return { x: x - 30 * s, hipY: lerp(slump.hipY, hipSit, s), lean: lerp(0.38, 0.42, s), head: lerp(0.5, 0.75, s), legs,
      hands: [P2(slump.hands[0], [x + 70 - 30 * s, F - 62], s), P2(slump.hands[1], [x + 58 - 30 * s, F - 58], s)], prefF: 'down', prefB: 'down', sitting: true };
  }
  function discState(t) {
    const end = RUN.disc.end;
    if (t < end) return digging('disc', t);
    const x = figX('disc'), F = floorY('disc', t);
    const last = digging('disc', end - 1e-3);
    const u = easeInOut(seg(t, end, end + 0.45));
    const hy0 = standHipY(F, STAND_L);
    const plant = { tip: [x + 84, F + 18], top: [x + 80, F - 168] };
    const shovel = { tip: P2(last.shovel.tip, plant.tip, u), top: P2(last.shovel.top, plant.top, u) };
    const hipsU = easeInOut(seg(t, end + 0.45, end + 0.85));
    const handsPlant = [P2(plant.tip, plant.top, 0.88), P2(plant.tip, plant.top, 0.95)];
    const handsHips = [[x + 16, hy0 - 16], [x + 6, hy0 - 20]];
    const hands = hipsU > 0 ? [P2(handsPlant[0], handsHips[0], hipsU), P2(handsPlant[1], handsHips[1], hipsU)] : [P2(last.hands[0], handsPlant[0], u), P2(last.hands[1], handsPlant[1], u)];
    return { x, hipY: lerp(last.hipY, hy0, u), lean: lerp(last.lean, -0.03, u), head: lerp(0.12, -0.1, u), legs: mixL(DIG_L, STAND_L, u), hands, shovel,
      prefF: hipsU > 0.3 ? 'back' : 'down', prefB: hipsU > 0.3 ? 'back' : 'down' };
  }
  function obsState(t) {
    if (t < WATER_T) return digging('obs', t);
    const x = figX('obs'), F = floorY('obs', t);
    const last = digging('obs', WATER_T - 1e-3);
    const u = easeOut(seg(t, WATER_T, WATER_T + 0.4));
    const hy0 = standHipY(F, STAND_L) - 6 * Math.sin(Math.PI * seg(t, WATER_T + 0.1, WATER_T + 0.5));
    const up = [[x + 96, hy0 - 232], [x - 58, hy0 - 226]];
    const sway = 0.04 * Math.sin((t - WATER_T) * 5);
    const lean = [0.06, -0.08 + sway];
    const fall = easeIn(seg(t, WATER_T, WATER_T + 0.35));
    const shovel = { tip: P2(last.shovel.tip, [x + 130, F - 6], fall), top: P2(last.shovel.top, [x + 118, F - 196], fall) };
    return { x, hipY: lerp(last.hipY, hy0, u), lean: lerp(last.lean, lean[1], u), head: lerp(0.12, -0.25, u), legs: mixL(DIG_L, STAND_L, u),
      hands: [P2(last.hands[0], up[0], u), P2(last.hands[1], up[1], u)], prefF: 'fwd', prefB: 'back', shovel: t > WATER_T + 0.36 ? { tip: [x + 130, F - 6], top: [x + 118, F - 196], loose: true } : { ...shovel, loose: true } };
  }
  // a pá do ego cai e fica encostada na parede
  function egoShovel(t) {
    const end = RUN.ego.end, F = floorY('ego', t), x = figX('ego');
    if (t < end) return null;
    const last = digging('ego', end - 1e-3).shovel;
    const u = easeIn(seg(t, end, end + 0.38));
    const bounce = t > end + 0.38 ? 6 * Math.sin(Math.PI * seg(t, end + 0.38, end + 0.55)) : 0;
    return { tip: P2(last.tip, [x + 108, F - 4 - bounce], u), top: P2(last.top, [x + 126, F - 192 - bounce], u) };
  }
  const stateOf = { disc: discState, obs: obsState, ego: egoState };

  // golpes e terra jogada (para partículas e efeitos sonoros)
  const STRIKES = { ego: [], disc: [], obs: [] }, TOSSES = { ego: [], disc: [], obs: [] };
  for (const k of ['ego', 'disc', 'obs']) {
    const { P, end } = RUN[k];
    for (let n = 0; ; n++) {
      const ts = T0 + P * (n + 0.42), tt = T0 + P * (n + 0.82);
      if (ts < end) STRIKES[k].push(ts);
      if (tt < end) TOSSES[k].push(tt);
      if (ts >= end && tt >= end) break;
    }
  }
  const dirt = [];
  for (const k of ['ego', 'disc', 'obs']) {
    for (const t0 of TOSSES[k]) {
      const sh = stateOf[k](t0).shovel;
      for (let i = 0; i < 6; i++) dirt.push({ t0, p: [sh.tip[0] + rr(-10, 10), sh.tip[1] + rr(-8, 8)], vx: rr(-140, 60), vy: rr(-760, -520), r: rr(5, 10), rot: rr(0, 6) });
    }
  }
  const dust = [];
  for (const k of ['ego', 'disc', 'obs']) for (const t0 of [1.5, ...STRIKES[k]]) dust.push({ k, t0 });

  // ---------- terra (corte lateral) ----------
  const STRATA = [];
  { let y = G; let i = 0; while (y < G + 2600) { const hgt = rr(150, 300); const k = Math.max(0, 52 - i * 1.6 - (i % 2) * 3); STRATA.push({ y, h: hgt, c: [k, k - 1, k + 2] }); y += hgt; i++; } }
  const SPECK = []; for (let i = 0; i < 560; i++) SPECK.push({ x: rr(0, W), y: rr(G + 10, G + 2600), r: rr(1, 2.8), a: rr(0.08, 0.22), dark: rnd() < 0.6 });
  const ROCKS = []; for (let i = 0; i < 46; i++) ROCKS.push({ x: rr(0, W), y: rr(G + 60, G + 2600), rx: rr(9, 22), ry: rr(6, 14), a: rr(0, 3) });
  const SHAFT_W = 172;
  const inShaft = (x) => Object.values(LANES).some((L) => Math.abs(x - L.x) < SHAFT_W / 2 + 26);

  function drawEarth(c, t, y0, y1) {
    // superfície e céu escuro ficam no fundo; aqui só o subsolo
    for (const s of STRATA) {
      if (s.y > y1 || s.y + s.h < y0) continue;
      c.fillStyle = rgb(s.c); c.fillRect(-400, s.y, W + 800, s.h + 1);
      c.fillStyle = 'rgba(255,255,255,0.035)'; c.fillRect(-400, s.y, W + 800, 2);
    }
    for (const p of SPECK) { if (p.y < y0 || p.y > y1 || inShaft(p.x)) continue; c.fillStyle = p.dark ? `rgba(0,0,0,${p.a * 1.6})` : `rgba(255,255,255,${p.a * 0.6})`; c.beginPath(); c.arc(p.x, p.y, p.r, 0, Math.PI * 2); c.fill(); }
    for (const r of ROCKS) {
      if (r.y < y0 - 30 || r.y > y1 + 30 || inShaft(r.x)) continue;
      c.save(); c.translate(r.x, r.y); c.rotate(r.a);
      c.beginPath(); c.ellipse(0, 0, r.rx, r.ry, 0, 0, Math.PI * 2); c.fillStyle = '#262629'; c.fill(); c.lineWidth = 3; c.strokeStyle = OUT; c.stroke();
      c.restore();
    }
    // linha da superfície
    c.fillStyle = 'rgba(255,255,255,0.22)'; c.fillRect(-400, G - 2, W + 800, 4);
  }
  function drawShaft(c, k, t, lv) {
    const L = LANES[k], d = depthM(k, t) * PXM;
    const x0 = L.x - SHAFT_W / 2, x1 = L.x + SHAFT_W / 2, yB = G + d + 4;
    if (d < 2) return;
    const g = c.createLinearGradient(0, G, 0, yB);
    const lit = 0.55 + 0.45 * Math.min(1, lv);
    g.addColorStop(0, rgb([20, 20, 23], lit)); g.addColorStop(1, rgb([13, 13, 15], lit));
    c.fillStyle = g; c.fillRect(x0, G, SHAFT_W, yB - G);
    // marcas de pá na parede do fundo
    c.strokeStyle = 'rgba(0,0,0,0.25)'; c.lineWidth = 3;
    for (let y = G + 30; y < yB - 10; y += 46) { const o = ((y * 7) % 23) - 11; c.beginPath(); c.moveTo(x0 + 26 + o, y); c.lineTo(x0 + 44 + o, y + 20); c.stroke(); c.beginPath(); c.moveTo(x1 - 40 - o, y + 12); c.lineTo(x1 - 22 - o, y + 30); c.stroke(); }
    // paredes com contorno
    c.lineWidth = 5; c.strokeStyle = OUT;
    c.beginPath(); c.moveTo(x0, G - 2); c.lineTo(x0, yB); c.lineTo(x1, yB); c.lineTo(x1, G - 2); c.stroke();
    c.fillStyle = 'rgba(255,255,255,0.07)'; c.fillRect(x0 + 3, G, 4, yB - G); c.fillRect(x1 - 7, G, 4, yB - G);
  }
  function drawMounds(c, k, t) {
    const L = LANES[k], d = depthM(k, t);
    const h = Math.min(64, 6 + d * 5.5);
    if (d < 0.05) return;
    for (const s of [-1, 1]) {
      const cx = L.x + s * (SHAFT_W / 2 + 46), w = 66 + h * 0.6;
      c.beginPath(); c.moveTo(cx - w, G); c.quadraticCurveTo(cx - w * 0.3, G - h * 1.3, cx + s * 4, G - h); c.quadraticCurveTo(cx + w * 0.4, G - h * 1.1, cx + w, G); c.closePath();
      c.fillStyle = '#3e3d41'; c.fill(); c.lineWidth = 4; c.strokeStyle = OUT; c.stroke();
    }
  }
  function drawMeta(c, t) {
    const L = LANES.disc, y = G + META_M * PXM;
    const hit = t >= RUN.disc.end;
    c.save(); c.setLineDash([14, 10]); c.lineWidth = 3; c.strokeStyle = hit ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.45)';
    c.beginPath(); c.moveTo(L.x - SHAFT_W / 2 - 10, y); c.lineTo(L.x + SHAFT_W / 2 + 70, y); c.stroke(); c.restore();
    const flash = hit ? Math.exp(-(t - RUN.disc.end) * 4) : 0;
    const label = hit ? 'META ✓' : 'META 10 M';
    c.font = '700 22px "Space Mono", monospace'; const tw = c.measureText(label).width;
    const px = L.x + SHAFT_W / 2 + 14, py = y - 18;
    c.fillStyle = `rgba(${Math.round(20 + 200 * flash)},${Math.round(20 + 200 * flash)},${Math.round(22 + 200 * flash)},0.92)`;
    c.beginPath(); c.roundRect(px, py, tw + 26, 36, 18); c.fill();
    c.lineWidth = 2.5; c.strokeStyle = 'rgba(255,255,255,0.8)'; c.stroke();
    c.fillStyle = flash > 0.5 ? '#111' : '#f2f2f2'; c.textAlign = 'left'; c.textBaseline = 'middle'; c.fillText(label, px + 13, py + 19);
  }
  function drawRuler(c, y0, y1) {
    c.font = '700 20px "Space Mono", monospace'; c.textAlign = 'left'; c.textBaseline = 'middle';
    for (let m = 1; m <= 40; m++) {
      const y = G + m * PXM; if (y < y0 - 20 || y > y1 + 20) continue;
      const big = m % 5 === 0;
      c.fillStyle = `rgba(255,255,255,${big ? 0.42 : 0.2})`; c.fillRect(20, y - 1, big ? 30 : 16, 3);
      if (big) c.fillText(`${m} M`, 56, y + 1);
    }
  }
  // plateia do ego: cabecinhas na superfície
  const CROWD = []; for (let i = 0; i < 7; i++) CROWD.push({ x: 640 + i * 56 + (i > 2 ? 210 : 0) * 0, y: G - 4, ph: rr(0, 6) });
  const crowdX = [668, 716, 1000, 1046, 760, 952, 1092];
  function drawCrowd(c, t) {
    for (let i = 0; i < CROWD.length; i++) {
      const p = CROWD[i];
      const show = smooth(seg(t, 2.6 + i * 0.07, 2.9 + i * 0.07)) * (1 - smooth(seg(t, 4.75 + i * 0.06, 5.0 + i * 0.06)));
      if (show <= 0.01) continue;
      const x = crowdX[i], cheer = t < 4.8 ? Math.abs(Math.sin((t + p.ph) * 7)) * 8 : 0;
      c.save(); c.globalAlpha = show; c.translate(x, p.y - cheer);
      c.lineWidth = 3; c.strokeStyle = 'rgba(255,255,255,0.75)'; c.fillStyle = '#121214';
      c.beginPath(); c.arc(0, -40, 11, 0, Math.PI * 2); c.fill(); c.stroke();
      c.beginPath(); c.moveTo(-17, 0); c.quadraticCurveTo(-17, -24, 0, -24); c.quadraticCurveTo(17, -24, 17, 0); c.fill(); c.stroke();
      if (t < 4.8 && Math.sin((t + p.ph) * 3) > 0.2) { c.beginPath(); c.arc(0, -66, 7, 0.15 * Math.PI, 0.85 * Math.PI); c.stroke(); }
      c.restore();
    }
  }

  // água da obsessão
  const SPRAY = []; for (let i = 0; i < 46; i++) SPRAY.push({ t0: WATER_T + rr(0, 2.6), vx: rr(-260, 260), vy: rr(-980, -560), r: rr(4, 9) });
  function drawWater(c, t, k) {
    if (t < WATER_T) return;
    const L = LANES.obs, F = floorY('obs', t), x0 = L.x - SHAFT_W / 2 + 3, x1 = L.x + SHAFT_W / 2 - 3;
    const d = t - WATER_T;
    if (k === 'back') {
      // jato (atrás do boneco): coluna com bordas onduladas e espuma no topo
      const jh = 470 * easeOut(seg(d, 0, 0.45)) * (0.93 + 0.07 * Math.sin(d * 13));
      const jx = L.x + 48, w = 62 + 8 * Math.sin(d * 9);
      const edge = (side) => { const pts = []; for (let i = 0; i <= 18; i++) { const f = i / 18, y = F - jh * f, ww = w * (0.5 - 0.22 * f) + 6 * Math.sin(f * 14 + d * 16 + side); pts.push([jx + side * ww, y]); } return pts; };
      const R1 = edge(1), L1 = edge(-1).reverse();
      c.beginPath(); c.moveTo(R1[0][0], R1[0][1]); for (const p of R1) c.lineTo(p[0], p[1]); for (const p of L1) c.lineTo(p[0], p[1]); c.closePath();
      const g = c.createLinearGradient(0, F - jh, 0, F); g.addColorStop(0, 'rgba(255,255,255,0.75)'); g.addColorStop(1, 'rgba(232,238,243,0.95)');
      c.fillStyle = g; c.fill(); c.lineWidth = 4; c.strokeStyle = OUT; c.stroke();
      c.strokeStyle = 'rgba(0,0,0,0.18)'; c.lineWidth = 3;
      for (let i = 1; i < 7; i++) { const y = F - jh * (i / 7) + ((d * 260) % (jh / 7)); c.beginPath(); c.moveTo(jx - 14, y); c.lineTo(jx + 10, y - 16); c.stroke(); }
      for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2 + d * 3; disc(c, [jx + Math.cos(a) * 22, F - jh + Math.sin(a) * 10], 15, OUT); }
      for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2 + d * 3; disc(c, [jx + Math.cos(a) * 22, F - jh + Math.sin(a) * 10], 11, '#f4f6f8'); }
      for (const s of SPRAY) {
        const a = t - s.t0; if (a < 0 || a > 0.9) continue;
        const x = jx + s.vx * a, y = F - jh * 0.9 + s.vy * a + 0.5 * 1500 * a * a;
        c.save(); c.globalAlpha = 1 - smooth(seg(a, 0.5, 0.9)); c.beginPath(); c.arc(x, y, s.r, 0, Math.PI * 2);
        c.fillStyle = '#eef2f5'; c.fill(); c.lineWidth = 2.5; c.strokeStyle = OUT; c.stroke(); c.restore();
      }
    } else {
      // nível da água subindo pelos pés
      const lvl = 70 * easeOut(seg(d, 0.1, 1.2));
      if (lvl < 1) return;
      const yT = F - lvl;
      c.beginPath(); c.moveTo(x0, F + 4);
      for (let x = x0; x <= x1; x += 8) c.lineTo(x, yT + 5 * Math.sin(x * 0.07 + d * 7));
      c.lineTo(x1, F + 4); c.closePath();
      c.fillStyle = 'rgba(232,238,243,0.82)'; c.fill();
      c.lineWidth = 4; c.strokeStyle = OUT; c.beginPath();
      for (let x = x0; x <= x1; x += 8) { const y = yT + 5 * Math.sin(x * 0.07 + d * 7); if (x === x0) c.moveTo(x, y); else c.lineTo(x, y); }
      c.stroke();
    }
  }

  // ---------- luz ----------
  const level = {
    disc: track([[0, 0.9], [2.6, 0.9], [2.85, 0.6], [6.5, 0.6], [6.8, 1.0], [10.4, 1.0], [10.9, 0.45]]),
    obs: track([[0, 0.9], [2.6, 0.9], [2.85, 0.6], [10.4, 0.6], [10.7, 1.1], [14.7, 1.1], [14.85, 1.5], [16.2, 1.25]]),
    ego: track([[0, 0.9], [2.6, 0.9], [2.85, 1.1], [4.9, 1.1], [5.0, 1.0], [5.7, 0.08]]),
  };

  // ---------- câmera ----------
  const soft = (x) => 0.5 * (x + Math.sqrt(x * x + 80 * 80));
  const FIN = { s: 0.626, oy: 530 - 900 * 0.626 };
  function camAt(t) {
    const hookU = easeOut(seg(t, 1.5, 2.4));
    const scroll = soft(depthM('obs', t) * PXM - 120) - soft(-120);
    let s = lerp(1.22, 1.0, hookU);
    const f = P2([540, 790], [540, 960 + scroll], hookU), sf = P2([540, 860], [540, 960], hookU);
    let ox = sf[0] - f[0] * s, oy = sf[1] - f[1] * s;
    // plano aberto final mostrando as três profundidades
    const w = easeInOut(seg(t, 15.2, 16.5));
    if (w > 0) { const s2 = FIN.s, ox2 = 540 - 540 * s2; ox = lerp(ox, ox2, w); oy = lerp(oy, FIN.oy, w); s = lerp(s, s2, w); }
    const k1 = t >= 1.5 ? Math.exp(-(t - 1.5) * 9) : 0, k2 = t >= WATER_T ? Math.exp(-(t - WATER_T) * 7) : 0;
    ox += 15 * k1 * Math.sin((t - 1.5) * 70) + 12 * k2 * Math.sin((t - WATER_T) * 64);
    oy += 10 * k1 * Math.cos((t - 1.5) * 83) + 14 * k2 * Math.cos((t - WATER_T) * 77);
    return { s, ox, oy };
  }
  const toScreen = (p, C) => [p[0] * C.s + C.ox, p[1] * C.s + C.oy];
  const toWorldY = (y, C) => (y - C.oy) / C.s;

  // ---------- texto digitando ----------
  const CPS = 26;
  const CAPS = [
    { s: -1, e: 2.45, lines: [[-1, [['TRÊS CAVAM.']]], [0.32, [['SÓ '], ['UM', 1], [' CHEGA NA ÁGUA.']]]] },
    { s: 2.6, e: 4.55, lines: [[2.6, [['O EGO CAVA']]], [3.05, [['PRA SER VISTO.']]]] },
    { s: 4.65, e: 6.55, lines: [[4.65, [['SEM PLATEIA,']]], [5.15, [['ELE LARGA A PÁ.']]]] },
    { s: 6.65, e: 8.6, lines: [[6.65, [['A DISCIPLINA']]], [7.15, [['CAVA NO RITMO.']]]] },
    { s: 8.7, e: 10.5, lines: [[8.7, [['BATE A META']]], [9.2, [['E PARA.']]]] },
    { s: 10.6, e: 12.6, lines: [[10.6, [['A '], ['OBSESSÃO', 1]]], [11.1, [['PASSA DA META.']]]] },
    { s: 12.7, e: 14.7, lines: [[12.7, [['E CONTINUA']]], [13.15, [['CAVANDO.']]]] },
    { s: 14.85, e: 99, big: true, lines: [[14.85, [['A '], ['OBSESSÃO', 1], [' VENCE.']]]] },
  ];
  const capEl = document.getElementById('cap');
  const capLines = capEl ? [capEl.querySelector('.l1'), capEl.querySelector('.l2')] : [];
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  function typeLine(segs, n) {
    let out = '', left = n;
    for (const [txt, red] of segs) {
      if (left <= 0) break;
      const part = esc(txt.slice(0, left)); left -= txt.length;
      out += red ? `<span class="hl">${part}</span>` : part;
    }
    return out;
  }
  const lenOf = (segs) => segs.reduce((a, s) => a + s[0].length, 0);
  function renderCaptions(t) {
    if (!capEl) return;
    const cap = CAPS.find((c) => t >= c.s && t < c.e) || null;
    if (!cap) { capEl.style.opacity = '0'; return; }
    capEl.style.opacity = String(1 - smooth(seg(t, cap.e - 0.18, cap.e)));
    capEl.className = cap.big ? 'cap big' : 'cap';
    let cursorLine = -1;
    cap.lines.forEach(([ls, segs], i) => {
      const n = Math.floor((t - ls) * CPS);
      const total = lenOf(segs);
      const shown = clamp(n, 0, total);
      if (n >= 0 && n < total + 12) cursorLine = i;
      capLines[i].innerHTML = typeLine(segs, shown);
    });
    for (let i = cap.lines.length; i < capLines.length; i++) capLines[i].innerHTML = '';
    if (cursorLine >= 0 && Math.floor(t * 3.2) % 2 === 0) capLines[cursorLine].innerHTML += '<span class="cur"></span>';
  }

  // ---------- rótulos do HUD ----------
  const hud = {}; for (const k of ['disc', 'obs', 'ego']) hud[k] = document.getElementById('n-' + k);

  // ---------- desenho ----------
  function drawObjects(c, t, lv, C) {
    const y0 = toWorldY(0, C), y1 = toWorldY(H, C);
    drawEarth(c, t, y0, y1);
    drawRuler(c, y0, y1);
    for (const k of ['disc', 'obs', 'ego']) drawShaft(c, k, t, lv[k]);
    drawMeta(c, t);
    for (const k of ['disc', 'obs', 'ego']) drawMounds(c, k, t);
    drawCrowd(c, t);
    drawWater(c, t, 'back');
    // aura vermelha da obsessão
    const aura = smooth(seg(t, 10.6, 12.0)) * 0.5 + 0.5 * smooth(seg(t, WATER_T, WATER_T + 0.6));
    if (aura > 0) {
      const R0 = rigP(obsState(t));
      c.save(); c.globalCompositeOperation = 'lighter';
      const g = c.createRadialGradient(R0.sh[0], R0.sh[1] + 30, 0, R0.sh[0], R0.sh[1] + 30, 300);
      g.addColorStop(0, rgb(RED, 1, 0.3 * aura)); g.addColorStop(1, rgb(RED, 1, 0));
      c.fillStyle = g; c.beginPath(); c.arc(R0.sh[0], R0.sh[1] + 30, 300, 0, Math.PI * 2); c.fill(); c.restore();
    }
    const es = egoShovel(t); if (es) drawShovel(c, es.tip, es.top);
    for (const k of ['disc', 'ego', 'obs']) {
      const st = stateOf[k](t);
      const light = clamp(0.3 + 0.7 * Math.min(1, lv[k] / 0.85));
      const R = rigP(st);
      if (st.shovel && st.shovel.loose) { drawShovel(c, st.shovel.tip, st.shovel.top); drawFigure(c, R, light, null); }
      else drawFigure(c, R, light, st.shovel);
    }
    drawWater(c, t, 'front');
    // terra voando e poeira dos golpes
    for (const p of dirt) {
      const a = t - p.t0; if (a < 0 || a > 0.75) continue;
      const x = p.p[0] + p.vx * a, y = p.p[1] + p.vy * a + 0.5 * 1700 * a * a;
      c.save(); c.globalAlpha = 1 - smooth(seg(a, 0.45, 0.75)); c.translate(x, y); c.rotate(p.rot + a * 6);
      c.beginPath(); c.moveTo(-p.r, -p.r * 0.4); c.lineTo(p.r * 0.2, -p.r * 0.8); c.lineTo(p.r, p.r * 0.2); c.lineTo(-p.r * 0.3, p.r * 0.7); c.closePath();
      c.fillStyle = '#3a3a40'; c.fill(); c.lineWidth = 2.5; c.strokeStyle = OUT; c.stroke(); c.restore();
    }
    for (const d of dust) {
      const a = t - d.t0; if (a < 0 || a > 0.5) continue;
      const tip = d.t0 < T0 ? KEYS.STRIKE(figX(d.k), standHipY(G, DIG_L), G).tip : KEYS.STRIKE(figX(d.k), standHipY(floorY(d.k, d.t0), DIG_L), floorY(d.k, d.t0)).tip;
      const r = 20 + 70 * easeOut(a / 0.5);
      c.save(); c.globalAlpha = 0.35 * (1 - a / 0.5);
      const g = c.createRadialGradient(tip[0], tip[1], 0, tip[0], tip[1], r); g.addColorStop(0, 'rgba(200,200,205,0.9)'); g.addColorStop(1, 'rgba(200,200,205,0)');
      c.fillStyle = g; c.beginPath(); c.arc(tip[0], tip[1], r, 0, Math.PI * 2); c.fill(); c.restore();
    }
  }
  function beamS(c, x, yb, a) {
    c.save(); c.filter = 'blur(12px)';
    const g = c.createLinearGradient(0, -60, 0, yb); g.addColorStop(0, `rgba(255,252,246,${a})`); g.addColorStop(1, `rgba(255,252,246,${a * 0.35})`);
    c.fillStyle = g; c.beginPath(); c.moveTo(x - 26, -60); c.lineTo(x + 26, -60); c.lineTo(x + 170, yb); c.lineTo(x - 170, yb); c.closePath(); c.fill(); c.restore();
  }

  function renderAt(t) {
    const C = camAt(t);
    const lv = { disc: level.disc(t), obs: level.obs(t), ego: level.ego(t) };
    const cam = (c) => c.setTransform(C.s, 0, 0, C.s, C.ox, C.oy);
    lc.setTransform(1, 0, 0, 1, 0, 0); lc.clearRect(0, 0, W, H); cam(lc);
    drawObjects(lc, t, lv, C);

    const c = ctx;
    c.setTransform(1, 0, 0, 1, 0, 0);
    const bg = c.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#060607'); bg.addColorStop(0.4, '#1a1919'); bg.addColorStop(1, '#0c0c0d');
    c.fillStyle = bg; c.fillRect(0, 0, W, H);
    // feixes cruzados de ambiente (do alto, como nas referências)
    cam(c);
    c.save(); c.filter = 'blur(22px)'; c.fillStyle = 'rgba(255,250,240,0.035)';
    c.beginPath(); c.moveTo(-300, -900); c.lineTo(-120, -900); c.lineTo(760, G); c.lineTo(140, G); c.closePath(); c.fill();
    c.beginPath(); c.moveTo(1200, -900); c.lineTo(1380, -900); c.lineTo(940, G); c.lineTo(320, G); c.closePath(); c.fill(); c.restore();
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.drawImage(layer, 0, 0);
    // canhões de luz entrando em cada poço
    c.save(); c.globalCompositeOperation = 'lighter';
    for (const k of ['disc', 'obs', 'ego']) {
      const fl = toScreen([LANES[k].x, floorY(k, t) + 10], C);
      const a = 0.11 * Math.min(1.4, lv[k]);
      if (a > 0.004) beamS(c, fl[0], fl[1], a);
    }
    c.restore();
    // faixas escuras atrás do texto (topo) e do HUD (base)
    const top = c.createLinearGradient(0, 120, 0, 560); top.addColorStop(0, 'rgba(0,0,0,0.6)'); top.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = top; c.fillRect(0, 0, W, 560);
    const bot = c.createLinearGradient(0, 1080, 0, 1340); bot.addColorStop(0, 'rgba(0,0,0,0)'); bot.addColorStop(0.5, 'rgba(0,0,0,0.6)'); bot.addColorStop(1, 'rgba(0,0,0,0.75)');
    c.fillStyle = bot; c.fillRect(0, 1080, W, H - 1080);
    const ui = c.createLinearGradient(0, 1300, 0, 1420); ui.addColorStop(0, 'rgba(4,4,5,0)'); ui.addColorStop(1, 'rgba(4,4,5,0.94)');
    c.fillStyle = ui; c.fillRect(0, 1300, W, H - 1300);

    renderCaptions(t);
    const m = { disc: Math.floor(depthM('disc', t) + 1e-6), obs: Math.floor(depthM('obs', t) + 1e-6), ego: Math.floor(depthM('ego', t) + 1e-6) };
    if (hud.disc) hud.disc.textContent = t >= RUN.disc.end ? `${m.disc} M ✓` : `${m.disc} M`;
    if (hud.obs) hud.obs.textContent = `${m.obs} M`;
    if (hud.ego) hud.ego.textContent = `${m.ego} M`;
    const egoLab = document.getElementById('lab-ego'); if (egoLab) egoLab.style.opacity = String(1 - 0.6 * smooth(seg(t, 5.2, 5.8)));
    const discLab = document.getElementById('lab-disc'); if (discLab) discLab.style.opacity = String(1 - 0.4 * smooth(seg(t, 10.6, 11.2)));
  }

  // agenda para trilha e efeitos
  const typing = [];
  for (const cap of CAPS) for (const [ls, segs] of cap.lines) { const total = lenOf(segs); const txt = segs.map((s) => s[0]).join(''); for (let i = 0; i < total; i++) { const tt = ls + (i + 1) / CPS; if (tt >= 0 && tt < cap.e && txt[i] !== ' ') typing.push(+tt.toFixed(3)); } }
  window.__schedule = {
    slam: 1.5, egoQuit: RUN.ego.end, egoSit: 6.4, meta: RUN.disc.end, water: WATER_T,
    strikes: STRIKES, tosses: TOSSES, crowd: [2.6, 4.75], typing,
  };
  window.__renderAt = renderAt;
  window.addEventListener('hf-seek', (e) => renderAt(e.detail.time));
  renderAt(0);
})();
