// Motor "FAZ × PENSA DEMAIS" (@stick.obsessao) — 2D vetorial, função pura do tempo.
// head.js: utilidades + boneco de perfil + camada de movimento orgânico (caminhada, respiração, atraso, gestos).
(function () {
  const W = 1080, H = 1920;
  const cv = document.getElementById('gl');
  const ctx = cv.getContext('2d');

  // ---------- utilidades ----------
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const lerp = (a, b, u) => a + (b - a) * u;
  const seg = (t, a, b) => clamp((t - a) / (b - a));
  const smooth = (u) => { u = clamp(u); return u * u * (3 - 2 * u); };
  const easeIn = (u) => { u = clamp(u); return u * u; };
  const easeOut = (u) => 1 - Math.pow(1 - clamp(u), 3);
  const easeInOut = (u) => { u = clamp(u); return u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2; };
  // passa um pouco do ponto e assenta (dá peso às transições)
  const backE = (u) => { u = clamp(u); const v = u - 1; return 1 + 2.3 * v * v * v + 1.3 * v * v; };
  const noise = (t, s) => 0.5 * Math.sin(t * 1.13 + s * 1.7) + 0.3 * Math.sin(t * 2.31 + s * 3.1) + 0.2 * Math.sin(t * 4.57 + s * 0.3);
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const rgb = (c, k = 1, a = 1) => `rgba(${Math.round(c[0] * k)},${Math.round(c[1] * k)},${Math.round(c[2] * k)},${a})`;
  const mixC = (a, b, u) => [lerp(a[0], b[0], u), lerp(a[1], b[1], u), lerp(a[2], b[2], u)];
  const P2 = (a, b, u) => [lerp(a[0], b[0], u), lerp(a[1], b[1], u)];
  const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
  const v = (a, len) => [Math.sin(a) * len, Math.cos(a) * len];

  // ---------- boneco de perfil ----------
  const D = { headR: 31, limb: 26, torsoW: 30, ol: 5, torso: 100, uArm: 60, fArm: 56, thigh: 82, shin: 78, foot: 20 };
  const OUT = '#0e0e10';
  const WHITE = [247, 247, 245], BACK = [196, 196, 200];
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
  const PREF = { down: (c) => c[1] - 0.3 * c[0], back: (c) => -c[0] + 0.2 * c[1], fwd: (c) => c[0] - 0.2 * c[1], up: (c) => -c[1] };
  const legH = (th, sh) => D.thigh * Math.cos(th) + D.shin * Math.cos(sh);
  // quadril apoiado no chão pela perna mais esticada (o quadril sobe e desce sozinho na caminhada)
  const hipOn = (floor, L) => floor - D.limb * 0.5 - 2 - Math.max(legH(L.fT, L.fS), legH(L.bT, L.bS));

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
  function drawFigure(c, R, col, glow = 0.5, tint = 0) {
    if (col && glow > 0) {
      c.save(); c.globalAlpha = glow; c.filter = 'blur(9px)';
      for (const L of [R.legB, R.armB, R.legF, R.armF, [R.hip, R.sh]]) strokePts(c, L, D.limb + 22, rgb(col));
      disc(c, R.head, D.headR + 12, rgb(col)); c.restore();
    }
    const f = rgb(mixC(WHITE, col || WHITE, tint)), b = rgb(mixC(BACK, col || BACK, tint * 0.8));
    limb(c, R.legB, D.limb, b);
    limb(c, R.armB, D.limb, b);
    strokePts(c, [R.hip, R.sh], D.torsoW + 2 * D.ol, OUT);
    strokePts(c, R.legF, D.limb + 2 * D.ol, OUT);
    strokePts(c, [R.hip, R.sh], D.torsoW, f);
    strokePts(c, R.legF, D.limb, f);
    limb(c, R.armF, D.limb, f);
    disc(c, R.head, D.headR + D.ol, OUT); disc(c, R.head, D.headR, f);
  }

  // ---------- poses ----------
  const STAND_L = { fT: 0.05, fS: -0.02, bT: -0.08, bS: -0.05 };
  const CROUCH_L = { fT: 0.95, fS: -0.65, bT: 0.75, bS: -0.8 };
  const mixL = (a, b, u) => ({ fT: lerp(a.fT, b.fT, u), fS: lerp(a.fS, b.fS, u), bT: lerp(a.bT, b.bT, u), bS: lerp(a.bS, b.bS, u) });
  // pose em pé (x/mãos no referencial do boneco, olhando para a direita; face = -1 espelha)
  const pose = (x, floor, L, lean, head, hands, extra) => Object.assign({ x, hipY: hipOn(floor, L), ay: floor, lean, head, legs: L, hands, prefF: 'down', prefB: 'down', grounded: true, face: 1 }, extra || {});
  const handsDown = (x, hy) => [[x + 16, hy + 40], [x + 4, hy + 44]];
  const handsChin = (x, hy) => [[x + 40, hy - 128], [x + 22, hy - 58]];
  const handsHips = (x, hy) => [[x + 34, hy - 6], [x - 26, hy - 4]];
  const handsUp = (x, hy) => [[x + 30, hy - 250], [x - 4, hy - 248]];
  const mixPose = (a, b, u) => Object.assign({}, b, {
    x: lerp(a.x, b.x, u), hipY: lerp(a.hipY, b.hipY, u), ay: lerp(a.ay, b.ay, u), lean: lerp(a.lean, b.lean, u), head: lerp(a.head, b.head, u),
    legs: mixL(a.legs, b.legs, u), hands: [P2(a.hands[0], b.hands[0], u), P2(a.hands[1], b.hands[1], u)], face: lerp(a.face ?? 1, b.face ?? 1, clamp(u * 1.6)),
    prefF: u > 0.5 ? b.prefF : a.prefF, prefB: u > 0.5 ? b.prefB : a.prefB, grounded: u > 0.5 ? b.grounded : a.grounded, sq: lerp(a.sq || 0, b.sq || 0, u),
    armFree: lerp(a.armFree ?? 1, b.armFree ?? 1, u), gesture: u > 0.5 ? b.gesture : a.gesture });
  // trilha de poses: [[t, fn(t)->pose, transição?], ...]; transição com leve passada do ponto
  function seq(keys, t, trD = 0.42) {
    let i = 0; while (i < keys.length - 1 && t >= keys[i + 1][0]) i++;
    const cur = keys[i][1](t);
    const tr = keys[i][2] ?? trD;
    if (i > 0 && t - keys[i][0] < tr) return mixPose(keys[i - 1][1](t), cur, backE((t - keys[i][0]) / tr));
    return cur;
  }
  // caminhada/corrida: ângulos das pernas a partir da fase
  function walkL(ph, run) {
    const s = Math.sin(ph), c = Math.cos(ph);
    const A = lerp(0.42, 0.78, run), K = lerp(0.65, 1.35, run);
    const fT = A * s, bT = -A * s;
    return { fT, fS: fT - 0.06 - K * Math.pow(Math.max(0, c), 1.4), bT, bS: bT - 0.06 - K * Math.pow(Math.max(0, -c), 1.4) };
  }
  // camada de vida: qualquer função de pose vira um boneco que respira, anda de verdade e tem atraso nas mãos/cabeça
  function alive(fn, t, o = {}) {
    const s = o.seed || 0, en = o.energy ?? 1;
    const st = Object.assign({}, fn(t));
    if (st.raw) return st;
    const pa = fn(t - 0.05), pb = fn(t - 0.11);
    const face = Math.sign(st.face || 1) || 1;
    const rd = st.runDist !== undefined;   // correndo no lugar (cenário rolando)
    const vx = rd ? (st.runDist - pa.runDist) / 0.05 : ((st.x - pa.x) / 0.05) * face;
    const sp = Math.abs(vx);
    // atraso (follow-through): mãos e cabeça chegam um pouco depois do corpo
    st.hands = [P2(st.hands[0], pb.hands[0], 0.38), P2(st.hands[1], pb.hands[1], 0.45)];
    st.head = lerp(st.head, pb.head, 0.45) - (st.lean - pb.lean) * 0.6;
    const moving = st.noWalk ? 0 : smooth(clamp((sp - 20) / 110));
    if (moving > 0.001) {
      const run = st.run ?? clamp((sp - 260) / 260);
      const stride = lerp(150, 270, run);
      const ph = (((rd ? st.runDist : st.x * face)) / stride) * Math.PI * 2 + (st.phase0 || 0);
      st.legs = mixL(st.legs, walkL(ph, run), moving); st._ph = ph; st._mv = moving; st._run = run;
      const s1 = Math.sin(ph), hy = st.hipY;
      const swF = run > 0.3 ? [st.x + 34 - 46 * s1, hy - 58 + 10 * s1] : [st.x + 12 - 40 * s1, hy + 36 - 8 * Math.abs(s1)];
      const swB = run > 0.3 ? [st.x + 34 + 46 * s1, hy - 58 - 10 * s1] : [st.x + 12 + 40 * s1, hy + 36 - 8 * Math.abs(s1)];
      const fr = (st.armFree ?? 1) * moving;
      st.hands = [P2(st.hands[0], swF, fr), P2(st.hands[1], swB, fr)];
      if (run > 0.3) { st.prefF = 'down'; st.prefB = 'down'; }
      st.lean += moving * (0.06 + 0.22 * run);
      st.head -= moving * 0.1 * run;
    }
    if (st.grounded) st.hipY = hipOn(st.ay, st.legs) + (st.hipOff || 0);
    // respiração e micro-movimentos (somem quando anda)
    const calm = 1 - moving;
    const br = Math.sin(t * (2.1 + 0.4 * en) + s);
    st.hipY += calm * 1.6 * br * (st.grounded ? 1 : 0.6);
    st.lean += calm * (0.024 * noise(t * 0.8, s) + 0.014 * br) * en;
    st.head += 0.07 * noise(t * 0.55, s + 3) * en;
    st.hands = [add(st.hands[0], [4 * noise(t * 1.1, s + 7), 5 * noise(t * 1.3, s + 9) + 3 * br]), add(st.hands[1], [4 * noise(t * 1.05, s + 11), 5 * noise(t * 1.2, s + 13) + 3 * br])];
    // fala: cabeça acompanha o ritmo e a mão da frente gesticula
    const talk = o.talk ? o.talk(t) : 0;
    if (talk > 0) {
      st.head += talk * (0.08 * Math.sin(t * 12.5) - 0.05);
      if (st.gesture !== false) {
        const g = [st.x + 74 + 14 * Math.sin(t * 6.3), st.hipY - 118 + 16 * Math.sin(t * 8.7)];
        st.hands[0] = P2(st.hands[0], g, talk * 0.85 * (st.armFree ?? 1));
      }
    }
    return st;
  }

  const PAL = { faz: [79, 191, 106], pensa: [242, 162, 58], dor: [229, 72, 59], luz: [255, 214, 160], azul: [47, 155, 255], ouro: [232, 197, 71] };
  const SC = 0.6;
  // ponto do painel -> coordenada do boneco (que é desenhado em escala SC em torno do pé)
  const toRig = (st, Q) => { const f = st.face || 1, ax = st.ax ?? st.x; return [ax + (Q[0] - ax) / (SC * f), st.ay + (Q[1] - st.ay) / SC]; };
  const spike = (t, t0, a, k) => (t >= t0 ? a * Math.exp(-(t - t0) * k) : 0);
  const bump = (t, a, b, h) => h * smooth(seg(t, a, a + 0.4)) * (1 - smooth(seg(t, b - 0.2, b + 0.6)));

  // foco alternado: o painel de quem está agindo fica aceso e o outro escurece (e só ele tem som)
  const focusTrack = (keys, tr = 0.3) => (k, t) => {
    let cur = keys[0][1], prev = null, ts = -9;
    for (const [kt, who] of keys) if (t >= kt) { prev = cur; cur = who; ts = kt; }
    const dimOf = (w) => (w && w !== k ? 1 : 0);
    return lerp(dimOf(prev), dimOf(cur), smooth(seg(t, ts, ts + tr)));
  };

  // ================= ROTEIRO: "A LOUÇA" (32 s) — índice de estresse =================
  const FL = 300, CT = FL - 100;                 // piso e tampo da bancada
  const SINK0 = 530, SINK1 = 650, SINKX = 590;   // cuba
  const RACK0 = 676;                              // escorredor
  const SOFA = 905;
  const HY = hipOn(FL, STAND_L);
  const GT = 27.0;
  const DAYS = [[0, 1], [11.0, 2], [13.7, 3], [16.4, 4], [19.0, 5]];
  const dayOf = (t) => { let d = 1; for (const [a, n] of DAYS) if (t >= a) d = n; return d; };
  const FOCUS = [[0, null], [2.8, 'faz'], [7.0, 'pensa'], [11.0, 'faz'], [12.35, 'pensa'], [13.7, 'faz'], [15.05, 'pensa'], [16.4, 'faz'], [17.7, 'pensa'], [19.0, 'faz'], [21.0, 'pensa'], [GT, null]];
  const dimOf = focusTrack(FOCUS);

  // ---------- quantidade de louça ----------
  const FAZ_WASH = [[3.2, 6.2, 2], [11.05, 12.2, 1], [13.75, 14.9, 1], [16.45, 17.6, 1]];   // [início, fim, pratos]
  const PENSA_ADD = [[7.3, 1], [12.45, 3], [15.15, 3], [17.8, 3]];
  const pileFaz = (t) => { let n = 2; for (const [a, b, k] of FAZ_WASH) { if (t >= a - 0.6 && a > 4) n += k; if (t >= a) n -= Math.min(k, Math.floor(((t - a) / (b - a)) * k + (t >= b ? 1 : 0))); } return Math.max(0, n); };
  const rackFaz = (t) => { let n = 0; for (const [a, b, k] of FAZ_WASH) if (t >= a) n += Math.min(k, Math.floor(((t - a) / (b - a)) * k + (t >= b ? 1 : 0))); return Math.min(n, 6); };
  const PWASH0 = 23.8;
  const pilePensa = (t) => { let n = 2; for (const [a, k] of PENSA_ADD) if (t >= a) n += Math.min(k, Math.floor((t - a) / 0.22) + 1); if (t > PWASH0) n -= Math.floor((t - PWASH0) / 0.75); return Math.max(0, n); };
  const fazMin = (t) => { let m = 0; for (const [a, b, k] of FAZ_WASH) if (t >= a) m += k === 2 ? 2 * smooth(seg(t, a, b)) : smooth(seg(t, a, b)); return Math.round(m); };
  const pensaMin = (t) => Math.round(60 * smooth(seg(t, PWASH0, GT - 0.2)));

  // ---------- poses ----------
  const SEAT_L = { fT: 1.45, fS: 0.02, bT: 1.38, bS: -0.06 };
  const stand = (x, face = 1, extra) => () => pose(x, FL, STAND_L, 0.03, 0.02, handsDown(x, HY), Object.assign({ face }, extra || {}));
  const walkTo = (x0, x1, t0, t1, face = 1) => (t) => { const x = lerp(x0, x1, easeInOut(seg(t, t0, t1))); return pose(x, FL, STAND_L, 0.04, 0.02, handsDown(x, HY), { face, run: 0 }); };
  const SX = 502;   // onde fica de pé na pia
  // lavando: mão da frente esfrega, a de trás segura o prato
  const wash = (on = true) => (t) => { const st = pose(SX, FL, STAND_L, 0.32, 0.35, handsDown(SX, HY), { gesture: false });
    const a = on ? t * 11 : 0; st.hands = [toRig(st, [SINKX - 8 + 12 * Math.sin(a), CT - 26 + 7 * Math.cos(a)]), toRig(st, [SINKX - 24, CT - 30])]; st.prefF = 'down'; st.prefB = 'down'; return st; };
  const toRack = () => (t) => { const st = pose(SX, FL, STAND_L, 0.3, 0.2, handsDown(SX, HY), { gesture: false }); st.hands = [toRig(st, [RACK0 - 6, CT - 30]), toRig(st, [SINKX - 30, CT - 20])]; return st; };
  const faucet = () => (t) => { const st = pose(SX, FL, STAND_L, 0.3, 0.1, handsDown(SX, HY), { gesture: false }); st.hands = [toRig(st, [626, CT - 46]), st.hands[1]]; return st; };
  const SOFA_HY = hipOn(FL, SEAT_L);
  const sofa = (phone) => (t) => ({ x: SOFA, hipY: SOFA_HY, ay: FL, lean: phone ? 0.22 : -0.12, head: phone ? 0.38 : 0.0, legs: SEAT_L,
    hands: phone ? [[SOFA + 44, SOFA_HY - 96 + 2 * Math.sin(t * 5)], [SOFA + 34, SOFA_HY - 88]] : [[SOFA - 20, SOFA_HY - 150], [SOFA - 34, SOFA_HY - 140]],
    prefF: phone ? 'down' : 'back', prefB: phone ? 'down' : 'back', grounded: false, face: -1, gesture: false, noWalk: true });
  const eat = () => (t) => { const u = 0.5 - 0.5 * Math.cos((t - 19.4) * Math.PI * 2 / 1.0); const hy = SOFA_HY;
    return { x: SOFA, hipY: hy, ay: FL, lean: lerp(0.32, 0.12, u), head: lerp(0.35, -0.05, u), legs: SEAT_L, hands: [P2([SOFA + 60, hy - 50], [SOFA + 40, hy - 128], u), [SOFA + 50, hy - 46]], prefF: 'down', prefB: 'down', grounded: false, face: -1, gesture: false, noWalk: true }; };

  // ---------- 2 · FAZ ----------
  const fazKeys = [
    [0, () => { const st = stand(SX)(); st.lean = 0.12; st.head = 0.3; return st; }],
    [2.8, faucet(), 0.3],
    [3.2, wash(), 0.3], [4.6, toRack(), 0.2], [4.85, wash(), 0.2], [6.0, toRack(), 0.2], [6.25, faucet(), 0.2],
    [6.6, () => pose(SX, FL, STAND_L, -0.05, -0.1, [[SX + 40, HY - 250], [SX - 20, HY + 20]], {}), 0.25],
    [7.2, walkTo(SX, SOFA, 7.2, 8.4, 1), 0.3], [8.4, stand(SOFA, -1), 0.25], [8.65, sofa(false), 0.4],
    [9.9, stand(SOFA, -1), 0.4], [10.1, walkTo(SOFA, SX, 10.1, 10.95, -1), 0.3], [10.95, stand(SX, 1), 0.25],
  ];
  for (const [a, b] of FAZ_WASH.slice(1)) fazKeys.push([a, wash(), 0.15], [b - 0.15, toRack(), 0.15], [b + 0.1, stand(SX, 1, { lean: 0.1 }), 0.3]);
  fazKeys.push([17.9, walkTo(SX, SOFA, 17.9, 18.8, 1), 0.3], [18.8, stand(SOFA, -1), 0.2], [19.05, sofa(false), 0.35], [19.4, eat(), 0.3], [23.0, sofa(false), 0.5]);
  fazKeys.sort((a, b) => a[0] - b[0]);
  const fazState = (t) => seq(fazKeys, t);

  // ---------- 1 · PENSA DEMAIS ----------
  const think = (x) => () => pose(x, FL, STAND_L, 0.04, 0.25, handsChin(x, HY), { gesture: false });
  const pensaKeys = [
    [0, think(SX)],
    [7.25, () => { const st = pose(SX, FL, STAND_L, 0.25, 0.25, handsDown(SX, HY)); st.hands = [toRig(st, [SINKX + 10, CT - 40]), st.hands[1]]; return st; }, 0.2],   // larga o prato
    [7.7, stand(SX, 1), 0.3],
    [7.85, walkTo(SX, SOFA, 7.85, 9.0, 1), 0.3], [9.0, stand(SOFA, -1), 0.2], [9.25, sofa(true), 0.4],
    [20.9, stand(SOFA, -1), 0.4],
    [21.05, walkTo(SOFA, 560, 21.05, 21.85, -1), 0.3], [21.85, stand(560, 1), 0.25],
    [22.0, () => { const st = pose(560, FL, STAND_L, -0.05, -0.35, handsDown(560, HY)); st.hands = [toRig(st, [610, 80]), st.hands[1]]; st.prefF = 'down'; return st; }, 0.3],   // abre o armário
    [22.6, () => { const st = pose(560, FL, STAND_L, -0.1, -0.45, [[560 + 40, HY - 160], [560 - 10, HY - 150]]); st.prefF = 'down'; return st; }, 0.25],   // vazio!
    [23.3, () => { const st = think(SX)(); st.head = 0.5; st.lean = 0.2; return st; }, 0.35],
    [PWASH0, wash(), 0.3],
  ];
  const pensaState = (t) => { const st = seq(pensaKeys, t); if (t > PWASH0) { st.lean += 0.06; st.head += 0.1; } return st; };

  // ---------- cenário: cozinha + sala ----------
  function drawBack(c, k, t, P) {
    const h = P.h, day = dayOf(t);
    const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#1b130e'); g.addColorStop(0.7, '#33251b'); g.addColorStop(1, '#241a13');
    c.fillStyle = g; c.fillRect(-300, -100, W + 600, h + 200);
    // azulejos atrás da pia
    c.strokeStyle = 'rgba(0,0,0,0.2)'; c.lineWidth = 2;
    for (let y = 130; y < CT; y += 30) { c.beginPath(); c.moveTo(470, y); c.lineTo(760, y); c.stroke(); }
    for (let x = 470; x < 760; x += 36) { c.beginPath(); c.moveTo(x, 130); c.lineTo(x, CT); c.stroke(); }
    // janela (sempre noite: depois do jantar)
    c.fillStyle = '#4a3524'; c.fillRect(150, 40, 180, 130); c.strokeStyle = OUT; c.lineWidth = 5; c.strokeRect(150, 40, 180, 130);
    c.fillStyle = '#1c2134'; c.fillRect(156, 46, 168, 118); c.fillStyle = '#e8e4d0'; c.beginPath(); c.arc(290, 76, 12, 0, Math.PI * 2); c.fill();
    c.strokeStyle = 'rgba(0,0,0,0.45)'; c.lineWidth = 4; c.beginPath(); c.moveTo(240, 46); c.lineTo(240, 164); c.stroke();
    // armário de cima
    const open = k === 'pensa' ? smooth(seg(t, 22.1, 22.5)) : 0;
    c.fillStyle = '#5a3c26'; c.strokeStyle = OUT; c.lineWidth = 4; c.fillRect(480, 30, 270, 90); c.strokeRect(480, 30, 270, 90);
    if (open > 0) { c.fillStyle = '#1a120c'; c.fillRect(612, 36, 130, 78); c.strokeStyle = 'rgba(255,214,160,0.25)'; c.beginPath(); c.moveTo(612, 76); c.lineTo(742, 76); c.stroke(); }
    c.fillStyle = '#6b4a30'; c.strokeStyle = OUT;
    c.fillRect(486, 36, 120, 78); c.strokeRect(486, 36, 120, 78);
    const dw = 124 * (1 - open * 0.85); c.fillRect(612 + (124 - dw) * 0, 36, dw, 78); c.strokeRect(612, 36, dw, 78);
    // luz quente da cozinha
    c.save(); c.globalCompositeOperation = 'lighter'; c.filter = 'blur(16px)';
    const bg = c.createLinearGradient(0, 0, 0, h); bg.addColorStop(0, rgb(PAL.luz, 1, 0.18)); bg.addColorStop(1, rgb(PAL.luz, 1, 0.04));
    c.fillStyle = bg; c.beginPath(); c.moveTo(560, 120); c.lineTo(640, 120); c.lineTo(820, h); c.lineTo(380, h); c.closePath(); c.fill(); c.restore();
    // bancada
    c.fillStyle = '#6b4a30'; c.strokeStyle = OUT; c.lineWidth = 4; c.fillRect(470, CT, 290, FL - CT); c.strokeRect(470, CT, 290, FL - CT);
    c.fillStyle = '#d9cdb8'; c.fillRect(464, CT - 8, 302, 12); c.strokeRect(464, CT - 8, 302, 12);
    c.strokeStyle = 'rgba(0,0,0,0.35)'; c.lineWidth = 3; for (const x of [565, 660]) { c.beginPath(); c.moveTo(x, CT + 14); c.lineTo(x, FL - 6); c.stroke(); }
    // cuba (vista em corte, escura)
    c.fillStyle = '#2a2a2e'; c.fillRect(SINK0, CT - 8, SINK1 - SINK0, 10);
    // torneira
    c.strokeStyle = OUT; c.lineWidth = 10; c.beginPath(); c.moveTo(640, CT - 8); c.lineTo(640, CT - 66); c.quadraticCurveTo(640, CT - 80, 622, CT - 80); c.lineTo(606, CT - 80); c.lineTo(606, CT - 66); c.stroke();
    c.strokeStyle = '#b8bcc4'; c.lineWidth = 5; c.stroke();
    // sofá
    c.fillStyle = '#7a3f34'; c.strokeStyle = OUT; c.lineWidth = 4;
    c.beginPath(); c.roundRect(830, FL - 130, 170, 70, 14); c.fill(); c.stroke();
    c.beginPath(); c.roundRect(820, FL - 68, 190, 40, 10); c.fill(); c.stroke();
    c.fillRect(830, FL - 28, 14, 28); c.strokeRect(830, FL - 28, 14, 28); c.fillRect(986, FL - 28, 14, 28); c.strokeRect(986, FL - 28, 14, 28);
    // piso
    c.fillStyle = '#2a1d14'; c.fillRect(-300, FL, W + 600, h); c.strokeStyle = 'rgba(0,0,0,0.5)'; c.lineWidth = 4; c.beginPath(); c.moveTo(-300, FL); c.lineTo(W + 300, FL); c.stroke();
    drawPile(c, k, t);
  }
  // um item de louça suja
  function dish(c, x, y, kind, dirty, s = 1) {
    c.save(); c.translate(x, y); c.scale(s, s); c.strokeStyle = OUT; c.lineWidth = 3;
    if (kind === 0) { c.fillStyle = '#efe6d6'; c.beginPath(); c.ellipse(0, 0, 34, 7, 0, 0, Math.PI * 2); c.fill(); c.stroke(); }
    else if (kind === 1) { c.fillStyle = '#e8c547'; c.beginPath(); c.roundRect(-10, -20, 20, 22, 3); c.fill(); c.stroke(); }
    else if (kind === 2) { c.fillStyle = '#5a5a62'; c.beginPath(); c.ellipse(0, -2, 30, 10, 0, 0, Math.PI * 2); c.fill(); c.stroke(); c.lineWidth = 6; c.beginPath(); c.moveTo(26, -4); c.lineTo(56, -12); c.stroke(); }
    else { c.fillStyle = '#2f9bff'; c.beginPath(); c.ellipse(0, -4, 22, 10, 0, 0, Math.PI); c.fill(); c.stroke(); }
    if (dirty) { c.fillStyle = 'rgba(110,70,30,0.85)'; c.beginPath(); c.arc(-8, -2, 4, 0, Math.PI * 2); c.arc(9, -1, 3, 0, Math.PI * 2); c.fill(); }
    c.restore();
  }
  const KIND = [0, 0, 1, 0, 2, 3, 0, 1, 0, 0, 3, 0, 2, 1, 0];
  function drawPile(c, k, t) {
    const n = k === 'faz' ? pileFaz(t) : pilePensa(t);
    // pilha na pia (cresce com balanço quando chega louça nova)
    for (let i = 0; i < n; i++) {
      const kind = KIND[i % KIND.length], jx = ((i * 37) % 13) - 6;
      let y = CT - 6 - i * 10, x = SINKX + jx;
      if (k === 'pensa') for (const [a, kk] of PENSA_ADD) { const j = i - (PENSA_ADD.filter(([b]) => b < a).reduce((s, [, q]) => s + q, 2)); if (j >= 0 && j < kk) { const tt = t - (a + j * 0.22); if (tt < 0.25) y -= 80 * (1 - easeIn(clamp(tt / 0.25))); } }
      dish(c, x, y, kind, true);
    }
    // moscas e cheiro
    if (k === 'pensa' && n > 6) {
      const top = CT - 6 - n * 10, nf = Math.min(6, n - 6);
      for (let i = 0; i < nf; i++) { const a = t * (3 + i * 0.7) + i * 2.1, fx = SINKX + Math.cos(a) * (30 + i * 6), fy = top - 20 + Math.sin(a * 1.3) * 18;
        c.fillStyle = '#111'; c.beginPath(); c.arc(fx, fy, 3.5, 0, Math.PI * 2); c.fill(); c.fillStyle = 'rgba(220,230,240,0.7)'; const wv = Math.sin(t * 60 + i) * 3; c.beginPath(); c.ellipse(fx - 2, fy - 4, 3, 1.5 + wv * 0.2, -0.5, 0, Math.PI * 2); c.ellipse(fx + 2, fy - 4, 3, 1.5, 0.5, 0, Math.PI * 2); c.fill(); }
      c.strokeStyle = 'rgba(140,190,90,0.6)'; c.lineWidth = 3;
      for (let i = 0; i < 3; i++) { const ph = (t * 0.6 + i / 3) % 1; c.globalAlpha = Math.sin(Math.PI * ph); c.beginPath(); for (let j = 0; j < 10; j++) { const yy = top - 10 - ph * 60 - j * 5, xx = SINKX - 20 + i * 20 + 5 * Math.sin(j * 0.9 + t * 3); if (!j) c.moveTo(xx, yy); else c.lineTo(xx, yy); } c.stroke(); }
      c.globalAlpha = 1;
    }
    // escorredor do faz
    if (k === 'faz') {
      c.strokeStyle = OUT; c.lineWidth = 3; c.fillStyle = 'rgba(200,200,206,0.5)'; c.fillRect(RACK0, CT - 18, 80, 10); c.strokeRect(RACK0, CT - 18, 80, 10);
      for (let i = 0; i < rackFaz(t); i++) { c.fillStyle = '#efe6d6'; c.beginPath(); c.ellipse(RACK0 + 10 + i * 12, CT - 34, 5, 18, 0.1, 0, Math.PI * 2); c.fill(); c.stroke(); }
    }
  }
  function drawFront(c, k, t, P, drawn) {
    // prato na mão + espuma + água correndo
    const washing = k === 'faz' ? FAZ_WASH.some(([a, b]) => t >= a && t < b) : t >= PWASH0 && t < GT;
    const water = k === 'faz' ? (t >= 3.0 && t < 6.3) || FAZ_WASH.slice(1).some(([a, b]) => t >= a && t < b) : t >= PWASH0 - 0.2 && t < GT;
    if (water) { c.strokeStyle = 'rgba(170,210,240,0.85)'; c.lineWidth = 5; c.beginPath(); for (let j = 0; j <= 8; j++) { const yy = CT - 64 + j * 7, xx = 606 + 1.5 * Math.sin(t * 40 + j); if (!j) c.moveTo(xx, yy); else c.lineTo(xx, yy); } c.stroke(); }
    if (washing) {
      const R = drawn.main.R, toP = drawn.main.toP, hb = toP(R.armB[2]), hf = toP(R.armF[2]);
      c.save(); c.translate(hb[0] + 6, hb[1] - 4); c.rotate(-1.2); c.fillStyle = '#efe6d6'; c.strokeStyle = OUT; c.lineWidth = 3; c.beginPath(); c.ellipse(0, 0, 26, 6, 0, 0, Math.PI * 2); c.fill(); c.stroke(); c.restore();
      c.fillStyle = '#e8c547'; c.strokeStyle = OUT; c.lineWidth = 2.5; c.beginPath(); c.roundRect(hf[0] - 8, hf[1] - 6, 16, 10, 3); c.fill(); c.stroke();
      for (let i = 0; i < 7; i++) { const a = (t * 1.7 + i / 7) % 1; c.fillStyle = `rgba(255,255,255,${0.85 * (1 - a)})`; c.beginPath(); c.arc(hf[0] - 10 + (i * 9) % 26, hf[1] - 6 - a * 26, 3 + (i % 3), 0, Math.PI * 2); c.fill(); }
    }
    // prato e garfo no jantar do faz
    if (k === 'faz' && t >= 19.4 && t < 23.2) { const hf = drawn.main.hand; c.strokeStyle = '#d8d8dc'; c.lineWidth = 3; c.beginPath(); c.moveTo(hf[0], hf[1]); c.lineTo(hf[0] - 12, hf[1] - 10); c.stroke();
      const hb = drawn.main.toP(drawn.main.R.armB[2]); dish(c, hb[0] - 10, hb[1] - 2, 0, false, 0.8); }
    // celular no sofá do pensa demais
    if (k === 'pensa' && t >= 9.3 && t < 20.9) { const hf = drawn.main.hand; c.save(); c.translate(hf[0], hf[1] - 6);
      c.save(); c.globalCompositeOperation = 'lighter'; c.filter = 'blur(10px)'; c.fillStyle = 'rgba(120,170,255,0.4)'; c.beginPath(); c.arc(4, -6, 20, 0, Math.PI * 2); c.fill(); c.restore();
      c.fillStyle = '#111'; c.strokeStyle = OUT; c.lineWidth = 3; c.beginPath(); c.roundRect(-7, -14, 14, 24, 3); c.fill(); c.stroke(); c.fillStyle = '#6fa8ff'; c.fillRect(-5, -11, 10, 18); c.restore(); }
    // suor lavando a pilha
    if (k === 'pensa' && t > PWASH0 + 0.5) { const hd = drawn.main.head; for (let i = 0; i < 3; i++) { const a = ((t * 1.3 + i / 3) % 1); c.fillStyle = `rgba(200,230,255,${0.9 * (1 - a)})`; c.beginPath(); c.arc(hd[0] - 20 - i * 6, hd[1] - 12 + a * 44, 4.5, 0, Math.PI * 2); c.fill(); } }
  }

  // ---------- placas (tela) ----------
  function pill(c, x, y, txt, col, ok, sc = 1, big = false) {
    c.save(); c.translate(x, y); c.scale(sc, sc);
    c.font = `700 ${big ? 26 : 18}px "Space Mono", monospace`; const tw = c.measureText(txt).width; const ic = ok === null ? 0 : 24, hh = big ? 40 : 30;
    c.beginPath(); c.roundRect(0, -hh / 2, tw + ic + 24, hh, hh / 2); c.fillStyle = 'rgba(15,10,7,0.88)'; c.fill(); c.lineWidth = 3; c.strokeStyle = rgb(col); c.stroke();
    if (ok === true) { c.strokeStyle = rgb(PAL.faz); c.lineWidth = 4; c.beginPath(); c.moveTo(12, 0); c.lineTo(17, 6); c.lineTo(27, -6); c.stroke(); }
    if (ok === false) { c.strokeStyle = rgb(PAL.dor); c.lineWidth = 4; c.beginPath(); c.moveTo(13, -6); c.lineTo(25, 6); c.moveTo(25, -6); c.lineTo(13, 6); c.stroke(); }
    c.fillStyle = rgb(col); c.textAlign = 'left'; c.textBaseline = 'middle'; c.fillText(txt, 12 + ic, 1); c.restore();
  }
  function drawOverlay(c, k, t, P, drawn, toS) {
    if (t > GT) return;
    // dia (time-lapse)
    const d = dayOf(t), dt0 = DAYS.find(([, n]) => n === d)[0];
    c.save(); c.translate(870, 40); const pop = 1 + 0.3 * Math.exp(-Math.max(0, t - dt0) * 8) * (d > 1 ? 1 : 0); c.scale(pop, pop);
    c.fillStyle = 'rgba(12,8,6,0.9)'; c.strokeStyle = 'rgba(255,214,160,0.6)'; c.lineWidth = 3; c.beginPath(); c.roundRect(-74, -24, 148, 48, 10); c.fill(); c.stroke();
    c.fillStyle = rgb(PAL.luz); c.font = '800 30px "Space Mono", monospace'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(`DIA ${d}`, 0, 2); c.restore();
    const n = k === 'faz' ? pileFaz(t) : pilePensa(t);
    pill(c, 18, 74, `NA PIA: ${n}`, k === 'faz' || n < 4 ? PAL.faz : PAL.dor, k === 'faz' ? (n === 0 ? true : null) : n < 4 ? null : false);
    if (k === 'faz' && t >= 3.2) pill(c, 18, 110, `LAVANDO: ${fazMin(t)} MIN NO TOTAL`, PAL.faz, null);
    if (k === 'pensa' && t >= PWASH0) pill(c, 18, 110, `LAVANDO: ${pensaMin(t)} MIN`, PAL.dor, null, 1 + 0.08 * Math.sin(t * 8));
  }

  // ---------- índice de estresse ----------
  const painFaz = (t) => 6 + 2 * Math.sin(t * 1.7) + FAZ_WASH.reduce((s, [a, b]) => s + 8 * smooth(seg(t, a, a + 0.3)) * (1 - smooth(seg(t, b, b + 0.4))), 0) - 3 * smooth(seg(t, 19, 20));
  const painPensa = (t) => { const n = pilePensa(t); let p = 8 + n * 4.5 + 3 * Math.sin(t * 2.3); p += spike(t, 22.4, 40, 0.8); if (t > PWASH0) p = Math.max(p, 78 + 5 * Math.sin(t * 6)); return Math.min(100, p); };

  const SCENE = {
    metricLabel: 'ÍNDICE DE ESTRESSE', totalLabel: 'ESTRESSE TOTAL', reportT: GT, noReport: true, dimOf, bubbleMaxX: 780,
    secsText: (n) => `${n}`,
    state: { faz: fazState, pensa: pensaState },
    drawBack, drawFront, drawOverlay,
    cam: (k, t) => {
      const keys = k === 'faz' ? [[0, 540, 200, 1], [2.8, 560, 170, 1.45], [6.8, 640, 200, 1.0], [11.0, 560, 170, 1.4], [17.8, 700, 200, 1.05], [19.2, 880, 200, 1.4], [GT - 1, 640, 200, 1.0]]
        : [[0, 540, 200, 1], [7.0, 560, 180, 1.3], [7.9, 700, 200, 1.0], [12.35, 590, 150, 1.45], [13.7, 650, 190, 1.05], [15.05, 590, 140, 1.5], [16.4, 650, 190, 1.05], [17.7, 590, 140, 1.5], [19.0, 680, 200, 1.0], [21.9, 600, 120, 1.35], [23.3, 570, 160, 1.4]];
      let v = { x: keys[0][1], y: keys[0][2], z: keys[0][3] };
      for (let i = 1; i < keys.length; i++) { const [kt, x, y, z] = keys[i]; if (t < kt) break; const u = easeInOut(seg(t, kt, kt + 0.6)); v = { x: lerp(v.x, x, u), y: lerp(v.y, y, u), z: lerp(v.z, z, u) }; }
      return v;
    },
    pain: { faz: painFaz, pensa: painPensa },
    bubbles: {
      faz: [
        { t0: 2.85, t1: 3.6, text: 'BORA.', col: PAL.faz },
        { t0: 6.35, t1: 7.0, text: 'PRONTO. 2 MIN.', col: PAL.faz },
        { t0: 19.5, t1: 20.9, text: 'JANTAR EM PAZ.', col: PAL.faz },
      ],
      pensa: [
        { t0: 7.05, t1: 7.85, text: 'DEPOIS EU LAVO.' },
        { t0: 12.6, t1: 13.6, text: 'AMANHÃ EU LAVO.' },
        { t0: 15.3, t1: 16.3, text: 'TÁ TRANQUILO...' },
        { t0: 17.9, t1: 18.95, text: 'QUE CHEIRO É ESSE?', col: PAL.dor },
        { t0: 22.6, t1: 23.5, text: 'CADÊ OS PRATOS?!', col: PAL.dor },
        { t0: 23.6, t1: 24.6, text: 'AH NÃO...' },
      ],
    },
    shake: (k, t) => (k === 'pensa' ? 6 * (t >= 22.5 ? Math.exp(-(t - 22.5) * 7) : 0) : 0),
    energy: (k, t) => (k === 'pensa' && t > PWASH0 ? 1.8 : 1),
    caps: [
      { s: -1, e: 2.8, lines: [[-1, [['LOUÇA NA PIA.']]], [0.3, [['DOIS JEITOS DE '], ['LIDAR.', 'dor']]]] },
      { s: 2.9, e: 7.0, lines: [[2.9, [['QUEM '], ['FAZ', 'faz']]], [3.25, [['LAVA NA HORA.']]]] },
      { s: 7.05, e: 11.0, lines: [[7.05, [['QUEM '], ['PENSA DEMAIS', 'pensa']]], [7.45, [['DEIXA PRA DEPOIS.']]]] },
      { s: 11.05, e: 15.0, lines: [[11.05, [['TODO DIA:']]], [11.4, [['1 PRATO, '], ['1 MINUTO.', 'faz']]]] },
      { s: 15.05, e: 19.0, lines: [[15.05, [['E A PIA DO OUTRO']]], [15.45, [['SÓ '], ['CRESCE.', 'dor']]]] },
      { s: 19.05, e: 21.0, lines: [[19.05, [['DIA 5: QUEM FAZ']]], [19.4, [['JANTA EM '], ['PAZ.', 'faz']]]] },
      { s: 21.05, e: 24.0, lines: [[21.05, [['QUEM PENSA DEMAIS']]], [21.45, [['FICOU '], ['SEM PRATO.', 'dor']]]] },
      { s: 24.05, e: GT, lines: [[24.05, [['AGORA É']]], [24.4, [['1 HORA '], ['DE PIA.', 'dor']]]] },
      { s: GT + 0.1, e: 99, center: true, lines: [[GT + 0.3, [['QUEM FAZ: '], ['5 MINUTOS.', 'faz']]], [GT + 0.9, [['PENSA DEMAIS: '], ['1 HORA.', 'dor']]]] },
    ],
    sched: {
      noBips: true, noPops: true, music: 0.42, focusKeys: FOCUS,
      fx: [
        // FAZ — dia 1 (2,8–7,0)
        [2.95, 'foley/cloth_04', 0.3, 0.35], [3.0, 'water', 0.28, 0.35, 3.3], [3.3, 'scrub', 0.35, 0.35, 1.25], [4.65, 'foley/talher_3', 0.45, 0.35],
        [4.9, 'scrub', 0.35, 0.35, 1.05], [6.05, 'foley/talher_1', 0.45, 0.35], [6.45, 'exhale', 0.2, 0.35],
        // PENSA — dia 1 (7,0–11,0)
        [7.3, 'foley/talher_2', 0.6, -0.35], [7.45, 'foley/talher_3', 0.4, -0.35], [9.3, 'foley/cloth_05', 0.3, -0.35],
        ...Array.from({ length: 6 }, (_, i) => [9.7 + i * 0.22, 'scroll', 0.1, -0.35]),
        // dias 2–4, alternando
        ...FAZ_WASH.slice(1).flatMap(([a, b]) => [[a, 'water', 0.25, 0.35, b - a], [a + 0.1, 'scrub', 0.3, 0.35, b - a - 0.25], [b - 0.1, 'foley/talher_1', 0.4, 0.35]]),
        ...PENSA_ADD.slice(1).flatMap(([a, kk]) => Array.from({ length: kk }, (_, j) => [a + j * 0.22 + 0.2, 'foley/talher_' + (1 + (j % 3)), 0.5, -0.35])),
        [15.9, 'buzz', 0.16, -0.35, 0.45], [18.3, 'buzz', 0.22, -0.35, 0.6],
        // FAZ — dia 5 (19,0–21,0)
        [19.25, 'foley/talher_3', 0.4, 0.35], [19.95, 'foley/talher_2', 0.3, 0.35], [20.4, 'exhale', 0.2, 0.35],
        // PENSA — dia 5 (21,0–27,0)
        [21.2, 'buzz', 0.2, -0.35, 0.7], [22.1, 'foley/porta', 0.5, -0.35], [22.55, 'voz_pensa/dor_02', 0.4, -0.35], [23.5, 'voz_pensa/dor_14', 0.38, -0.35],
        [PWASH0 - 0.2, 'water', 0.28, -0.35, GT - PWASH0], [PWASH0 + 0.1, 'scrub', 0.32, -0.35, GT - PWASH0 - 0.4],
        [25.0, 'foley/talher_1', 0.35, -0.35], [25.6, 'voz_pensa/dor_10', 0.38, -0.35], [26.3, 'foley/talher_3', 0.35, -0.35],
      ],
    },
  };

  // ---------- tail.js: painéis, índice, relatório, legendas (usa SCENE definido pelo roteiro) ----------
  const PANELS = { pensa: { top: 470, h: 405 }, faz: { top: 885, h: 405 } };
  const GT1 = SCENE.reportT || 19.0, NS = 760;

  // série do índice pré-calculada
  const SERIES = {}, TOTAL = {};
  for (const k of ['faz', 'pensa']) {
    const arr = []; let acc = 0; const accArr = [];
    for (let i = 0; i <= NS; i++) { const tt = (i / NS) * GT1; const val = clamp(SCENE.pain[k](tt), 0, 100); arr.push(val); if (i) acc += val * (GT1 / NS); accArr.push(acc); }
    SERIES[k] = arr; TOTAL[k] = accArr;
  }
  const totalAt = (k, t) => TOTAL[k][Math.round(clamp(t / GT1) * NS)];
  const FINAL = { faz: TOTAL.faz[NS], pensa: TOTAL.pensa[NS] };
  const redSecs = (k) => { let n = 0; for (const val of SERIES[k]) if (val > 40) n++; return (n / NS) * GT1; };
  const SECS = { faz: redSecs('faz'), pensa: redSecs('pensa') };

  // quanto cada personagem está falando agora (0..1)
  const talkOf = (k, who) => (t) => {
    let m = 0;
    for (const b of SCENE.bubbles[k]) if ((b.who || 'main') === who && t > b.t0 - 0.05 && t < b.t1 + 0.05) m = Math.max(m, smooth(seg(t, b.t0 - 0.05, b.t0 + 0.15)) * (1 - smooth(seg(t, b.t1 - 0.2, b.t1 + 0.05))));
    return m;
  };
  const TALK = { faz: { main: talkOf('faz', 'main'), other: talkOf('faz', 'other') }, pensa: { main: talkOf('pensa', 'main'), other: talkOf('pensa', 'other') } };

  function drawActor(c, st, col, glow, tint) {
    const fx = st.ax ?? st.x, fy = st.ay;
    const f = clamp(st.face ?? 1, -1, 1), sq = st.sq || 0;
    c.save();
    c.translate(fx, fy); c.scale(SC * f * (1 + sq * 0.45), SC * (1 - sq)); c.translate(-fx, -fy);
    const R = rigP(st);
    if (st.behind) st.behind(c, R);
    drawFigure(c, R, col, glow, tint || 0);
    if (st.prop) st.prop(c, R);
    c.restore();
    const toP = (p) => [fx + (p[0] - fx) * SC * f, fy + (p[1] - fy) * SC];
    return { st, R, head: toP(R.head), hand: toP(R.armF[2]), toP };
  }
  function bubble(c, x, y, text, col, t0, t1, t, tailX) {
    if (t < t0 || t > t1) return;
    const a = smooth(seg(t, t0, t0 + 0.12)) * (1 - smooth(seg(t, t1 - 0.15, t1)));
    const sc = (1 + 0.4 * Math.exp(-(t - t0) * 12) * Math.cos((t - t0) * 28)) * lerp(0.6, 1, smooth(seg(t, t0, t0 + 0.1)));
    c.save(); c.globalAlpha = a; c.translate(x, y + 2 * Math.sin((t - t0) * 5)); c.scale(sc, sc);
    c.font = '800 28px "Space Mono", monospace'; const tw = c.measureText(text).width;
    const tx = clamp((tailX ?? x) - x, -tw / 2 + 4, tw / 2 - 16);
    c.beginPath(); c.roundRect(-tw / 2 - 18, -26, tw + 36, 52, 12); c.fillStyle = '#f4ead8'; c.fill(); c.lineWidth = 4; c.strokeStyle = OUT; c.stroke();
    c.beginPath(); c.moveTo(tx - 8, 24); c.lineTo(tx + 2 * Math.sign(tx || 1), 44); c.lineTo(tx + 12, 24); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = '#f4ead8'; c.fillRect(tx - 10, 20, 24, 6);
    c.fillStyle = col ? rgb(col) : '#1a120c'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(text, 0, 1);
    c.restore();
  }
  function drawMonitor(c, k, t, P) {
    const y0 = P.h - 66, hh = 56, x0 = 30, x1 = 925;
    c.fillStyle = 'rgba(10,7,5,0.82)'; c.fillRect(0, y0 - 8, W, hh + 16);
    c.strokeStyle = 'rgba(255,255,255,0.08)'; c.lineWidth = 1;
    for (let i = 1; i < 4; i++) { c.beginPath(); c.moveTo(x0, y0 + hh * i / 4); c.lineTo(x1, y0 + hh * i / 4); c.stroke(); }
    c.font = '700 18px "Space Mono", monospace'; c.textAlign = 'left'; c.textBaseline = 'top'; c.fillStyle = rgb(PAL.dor); c.fillText(SCENE.metricLabel, x0 + 4, y0 - 2);
    const n = Math.round(clamp(t / GT1) * NS);
    const gx0 = x0 + 250, gx1 = x1 - 170;
    c.lineWidth = 4; c.strokeStyle = rgb(PAL.dor); c.lineJoin = 'round';
    c.beginPath();
    for (let i = 0; i <= n; i++) { const x = lerp(gx0, gx1, i / NS), y = y0 + hh - (SERIES[k][i] / 100) * (hh - 6); if (i === 0) c.moveTo(x, y); else c.lineTo(x, y); }
    c.stroke();
    if (n > 0 && t < GT1) { const x = lerp(gx0, gx1, n / NS), y = y0 + hh - (SERIES[k][n] / 100) * (hh - 6); const pu = 1 + 0.4 * Math.max(0, Math.sin(t * 9)); c.save(); c.globalCompositeOperation = 'lighter'; disc(c, [x, y], 10 * pu, rgb(PAL.dor, 1, 0.6)); c.restore(); disc(c, [x, y], 5, '#fff'); }
    c.textAlign = 'right'; c.fillStyle = 'rgba(255,255,255,0.6)'; c.font = '700 16px "Space Mono", monospace'; c.fillText(SCENE.totalLabel, x1, y0 - 2);
    const val = SERIES[k][Math.min(NS, n)];
    const hot = val > 40 ? 1 : 0;
    c.fillStyle = hot ? rgb(mixC([255, 255, 255], PAL.dor, 0.6)) : '#fff'; c.font = '800 30px Montserrat, sans-serif'; c.fillText(String(Math.round(totalAt(k, Math.min(t, GT1)))), x1, y0 + 20);
  }
  function drawPanel(c, k, t) {
    const P = PANELS[k];
    c.save(); c.translate(0, P.top); c.beginPath(); c.rect(0, 0, W, P.h); c.clip();
    const sh = SCENE.shake ? SCENE.shake(k, t) : 0;
    c.translate(sh * Math.sin(t * 70), sh * Math.cos(t * 83));
    // câmera: foco definido pelo roteiro (SCENE.cam) + leve câmera de mão
    const cam = SCENE.cam ? SCENE.cam(k, t) : { x: 540, y: 200, z: 1 };
    const cz = cam.z * (1.03 + 0.012 * Math.sin(t * 0.37 + (k === 'faz' ? 1 : 0)));
    const cx = cam.x + 10 * noise(t * 0.25, k === 'faz' ? 2 : 5), cy = cam.y + 6 * noise(t * 0.3, k === 'faz' ? 8 : 1);
    const toS = (p) => [540 + (p[0] - cx) * cz, 200 + (p[1] - cy) * cz];
    c.save(); c.translate(540, 200); c.scale(cz, cz); c.translate(-cx, -cy);
    SCENE.drawBack(c, k, t, P);
    const others = (SCENE.others && SCENE.others[k]) || [];
    const drawn = {};
    for (const o of others) if (!o.front) drawn[o.id] = drawActor(c, alive(o.fn, t, { seed: o.seed, talk: TALK[k].other, energy: o.energy }), o.col, o.glow ?? 0.4, o.tint);
    const main = drawActor(c, alive(SCENE.state[k], t, { seed: k === 'faz' ? 2 : 9, talk: TALK[k].main, energy: SCENE.energy ? SCENE.energy(k, t) : 1 }), PAL[k], 0.5);
    drawn.main = main;
    for (const o of others) if (o.front) drawn[o.id] = drawActor(c, alive(o.fn, t, { seed: o.seed, talk: TALK[k].other }), o.col, o.glow ?? 0.4, o.tint);
    if (SCENE.drawFront) SCENE.drawFront(c, k, t, P, drawn);
    c.restore();
    for (const b of SCENE.bubbles[k]) {
      const sp = drawn[(b.who || 'main') === 'main' ? 'main' : (b.whoId || 'other')] || main;
      const hs = toS(sp.head);
      c.font = '800 28px "Space Mono", monospace'; const bw = c.measureText(b.text).width / 2 + 22;
      const bx = clamp(b.x ?? hs[0] + (b.dx ?? 60), 300 + bw, (SCENE.bubbleMaxX || 1000) - bw);
      bubble(c, bx, b.y ?? 50, b.text, b.col, b.t0, b.t1, t, hs[0]);
    }
    if (SCENE.drawOverlay) SCENE.drawOverlay(c, k, t, P, drawn, toS);
    drawMonitor(c, k, t, P);
    { const fd = SCENE.dimOf && t < GT1 ? SCENE.dimOf(k, t) : 0; if (fd > 0) { c.fillStyle = `rgba(8,5,3,${0.5 * fd})`; c.fillRect(0, 0, W, P.h); } }
    const nm = k === 'faz' ? '2 · FAZ' : '1 · PENSA DEMAIS';
    c.font = '700 22px "Space Mono", monospace'; const tw = c.measureText(nm).width;
    c.beginPath(); c.roundRect(18, 16, tw + 32, 38, 19); c.fillStyle = 'rgba(15,10,7,0.85)'; c.fill(); c.lineWidth = 3; c.strokeStyle = rgb(PAL[k]); c.stroke();
    c.fillStyle = rgb(PAL[k]); c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(nm, 34 + tw / 2, 36);
    const dim = smooth(seg(t, GT1, GT1 + 0.5));
    if (dim > 0) { c.fillStyle = `rgba(8,5,3,${0.78 * dim})`; c.fillRect(0, 0, W, P.h); }
    c.restore();
    c.lineWidth = 5; c.strokeStyle = OUT; c.strokeRect(0, P.top, W, P.h);
  }
  function drawReport(c, t) {
    if (SCENE.noReport) return;
    const out = SCENE.report2T ? smooth(seg(t, SCENE.report2T - 0.3, SCENE.report2T)) : 0;
    if (SCENE.drawReport2 && t >= SCENE.report2T - 0.3) SCENE.drawReport2(c, t, out);
    if (out >= 1) return;
    const u = easeOut(seg(t, GT1 + 0.2, GT1 + 0.8)) * (1 - out); if (u <= 0) return;
    const x0 = 40, x1 = 935, top = 520, h = 680;
    const sc = lerp(0.9, 1, backE(seg(t, GT1 + 0.2, GT1 + 0.75)));
    c.save(); c.globalAlpha = u; c.translate((x0 + x1) / 2, top + h / 2); c.scale(sc, sc); c.translate(-(x0 + x1) / 2, -(top + h / 2));
    c.beginPath(); c.roundRect(x0, top, x1 - x0, h, 26); c.fillStyle = 'rgba(22,15,10,0.96)'; c.fill(); c.lineWidth = 4; c.strokeStyle = rgb(PAL.luz, 0.8); c.stroke();
    c.font = '700 26px "Space Mono", monospace'; c.fillStyle = rgb(PAL.dor); c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(SCENE.metricLabel + ' · RESULTADO', (x0 + x1) / 2, top + 50);
    const rows = [['pensa', '1 · PENSA DEMAIS'], ['faz', '2 · FAZ']];
    rows.forEach(([k, nm], r) => {
      const ry = top + 110 + r * 290, gx0 = x0 + 40, gx1 = x1 - 40, gh = 130;
      c.textAlign = 'left'; c.fillStyle = rgb(PAL[k]); c.font = '700 24px "Space Mono", monospace'; c.fillText(nm, gx0, ry);
      c.strokeStyle = 'rgba(255,255,255,0.12)'; c.lineWidth = 1; c.strokeRect(gx0, ry + 24, gx1 - gx0, gh);
      const draw = easeInOut(seg(t, GT1 + 0.5 + r * 0.2, GT1 + 1.6 + r * 0.2));
      const n = Math.round(draw * NS);
      const path = () => { c.beginPath(); for (let i = 0; i <= n; i++) { const x = lerp(gx0, gx1, i / NS), y = ry + 24 + gh - (SERIES[k][i] / 100) * (gh - 8); if (i === 0) c.moveTo(x, y); else c.lineTo(x, y); } };
      path(); c.lineTo(lerp(gx0, gx1, n / NS), ry + 24 + gh); c.lineTo(gx0, ry + 24 + gh); c.closePath(); c.fillStyle = rgb(PAL.dor, 1, 0.28); c.fill();
      path(); c.lineWidth = 4; c.strokeStyle = rgb(PAL.dor); c.stroke();
      const cnt = Math.round(FINAL[k] * easeOut(seg(t, GT1 + 0.6 + r * 0.2, GT1 + 2.0 + r * 0.2)));
      c.textAlign = 'left'; c.fillStyle = 'rgba(255,255,255,0.65)'; c.font = '700 20px "Space Mono", monospace';
      c.fillText(SCENE.secsText(Math.max(1, Math.round(SECS[k])), k), gx0, ry + gh + 56);
      const pop = 1 + 0.25 * Math.exp(-Math.max(0, t - (GT1 + 2.0 + r * 0.2)) * 10) * (t > GT1 + 2.0 + r * 0.2 ? 1 : 0);
      c.save(); c.translate(gx1, ry + gh + 60); c.scale(pop, pop);
      c.textAlign = 'right'; c.fillStyle = '#fff'; c.font = '900 54px Montserrat, sans-serif'; c.fillText(String(cnt), 0, 0); c.restore();
      c.font = '700 16px "Space Mono", monospace'; c.fillStyle = 'rgba(255,255,255,0.55)'; c.textAlign = 'right'; c.fillText(SCENE.totalLabel, gx1, ry + gh + 18);
    });
    c.restore();
  }

  // ---------- legendas: palavras pulando ----------
  // frase final com os segundos de dor de cada um ({faz} / {pensa})
  const SW = SCENE.secsWord || ((n) => `${n} SEGUNDO${n > 1 ? 'S' : ''}`);
  const CAPS = SCENE.caps.map((cp) => Object.assign({}, cp, { lines: cp.lines.map(([ls, segs]) => [ls, segs.map(([txt, col]) => [txt.replace('{faz}', SW(Math.max(1, Math.round(SECS.faz)))).replace('{pensa}', SW(Math.max(1, Math.round(SECS.pensa)))), col])]) }));
  const capEl = document.getElementById('cap');
  const capLines = capEl ? [capEl.querySelector('.l1'), capEl.querySelector('.l2')] : [];
  const WSTEP = 0.11;
  const wordsOf = (segs) => { const out = []; for (const [txt, col] of segs) for (const w of txt.split(' ')) if (w) out.push([w, col || '']); return out; };
  function renderCaptions(t) {
    if (!capEl) return;
    const cap = CAPS.find((cc) => t >= cc.s && t < cc.e) || null;
    if (!cap) { capEl.style.opacity = '0'; return; }
    capEl.style.opacity = String(1 - smooth(seg(t, cap.e - 0.15, cap.e)));
    capEl.className = cap.big ? 'cap big' : cap.center ? 'cap center' : 'cap';
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
  // passos (cruzamentos da fase da caminhada) e falas, para os efeitos sonoros
  const steps = [];
  for (const k of ['faz', 'pensa']) {
    const fns = [[SCENE.state[k], 1], ...(((SCENE.others || {})[k]) || []).map((o) => [o.fn, 0.6])];
    for (const [fn, g] of fns) { let prev = null; for (let i = 0; i < GT1 * 120; i++) { const tt = i / 120; const st = alive(fn, tt); if (st._mv > 0.5 && prev !== null && Math.sign(Math.sin(st._ph)) !== Math.sign(Math.sin(prev))) steps.push([+tt.toFixed(3), k, +(st._run || 0).toFixed(2), g]); prev = st._mv > 0.5 ? st._ph : null; } }
  }
  const talks = []; for (const k of ['faz', 'pensa']) for (const b of SCENE.bubbles[k]) talks.push([b.t0, k]);
  window.__schedule = Object.assign({ slam: 1.5, report: GT1, words, steps, talks,
    painFaz: SERIES.faz.filter((_, i) => i % 19 === 0).map((x) => +x.toFixed(1)), painPensa: SERIES.pensa.filter((_, i) => i % 19 === 0).map((x) => +x.toFixed(1)) }, SCENE.sched || {});
  window.__renderAt = renderAt;
  window.addEventListener('hf-seek', (e) => renderAt(e.detail.time));
  renderAt(0);
})();
