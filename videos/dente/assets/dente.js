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

  // ================= ROTEIRO: "O DENTE" (32 s) — índice de dor =================
  const FL = 300, GT = 27.0;
  const CHX = 600, TB0 = 640, TB1 = 780, TT = FL - 82;     // cadeira e mesa
  const SOFA = 905, BLX = 250, BMT = FL - 62;
  const DX = 470, DAY = FL - 66;                           // cadeira do dentista
  const HY = hipOn(FL, STAND_L);
  const DAYS = [[0, 1], [11.0, 3], [17.0, 7]];
  const dayOf = (t) => { let d = 1; for (const [a, n] of DAYS) if (t >= a) d = n; return d; };
  const FOCUS = [[0, null], [2.8, 'faz'], [7.0, 'pensa'], [11.0, 'faz'], [13.0, 'pensa'], [17.0, 'faz'], [19.0, 'pensa'], [GT, null]];
  const dimOf = focusTrack(FOCUS);
  const DENT_F = [4.8, 7.0], DENT_P = [22.0, GT + 5];
  const atDentist = (k, t) => (k === 'faz' ? t >= DENT_F[0] && t < DENT_F[1] : t >= DENT_P[0]);
  const DRILL_F = [5.1, 6.4], DRILL_P = [23.8, 26.0];

  // ---------- poses ----------
  const SEAT_L = { fT: 1.45, fS: 0.02, bT: 1.38, bS: -0.06 };
  const SHY = hipOn(FL, SEAT_L);
  const seat = (lean, head, hands, extra) => () => Object.assign({ x: CHX, hipY: SHY, ay: FL, lean, head, legs: SEAT_L, hands, prefF: 'down', prefB: 'down', grounded: false, face: 1, noWalk: true, gesture: false }, extra || {});
  const W2R = (x, y) => toRig({ x: CHX, ay: FL, face: 1 }, [x, y]);
  const MOUTH = [CHX + 26, FL - 140], CHEEK = [CHX + 16, FL - 146], APPLE_T = [CHX + 64, TT - 10];
  const eatApple = (t0, per = 1.0) => (t) => { const u = 0.5 - 0.5 * Math.cos(((t - t0) / per) * Math.PI * 2); return seat(lerp(0.3, 0.1, u), lerp(0.25, -0.05, u), [P2(W2R(...APPLE_T), W2R(...MOUTH), u), W2R(TB0 + 20, TT - 4)])(); };
  const holdCheek = () => seat(0.25, 0.3, [W2R(...CHEEK), W2R(TB0 + 20, TT - 4)]);
  const callPhone = () => seat(0.05, -0.05, [W2R(CHX + 6, FL - 152), W2R(TB0 + 20, TT - 4)]);
  const chewSide = () => (t) => { const st = seat(0.1, 0.1 + 0.18 * Math.sin(t * 9), [W2R(...CHEEK), W2R(TB0 + 20, TT - 4)])(); return st; };
  const SEAT_SOFA = hipOn(FL, SEAT_L);
  const sofaIce = () => (t) => ({ x: SOFA, hipY: SEAT_SOFA, ay: FL, lean: 0.15, head: 0.35, legs: SEAT_L, hands: [[SOFA + 18, SEAT_SOFA - 140], [SOFA + 34, SEAT_SOFA - 60]], prefF: 'down', prefB: 'down', grounded: false, face: -1, noWalk: true, gesture: false });
  const sofaPill = () => (t) => ({ x: SOFA, hipY: SEAT_SOFA, ay: FL, lean: 0.0, head: -0.25, legs: SEAT_L, hands: [[SOFA + 26, SEAT_SOFA - 136], [SOFA + 34, SEAT_SOFA - 60]], prefF: 'down', prefB: 'down', grounded: false, face: -1, noWalk: true, gesture: false });
  const LIE_L = { fT: 1.5, fS: 1.56, bT: 1.44, bS: 1.54 };
  const bedCheek = () => (t) => { const hy = BMT - 16; return { x: BLX, hipY: hy, ay: BMT, lean: -1.5 + 0.06 * Math.sin(t * 1.3), head: -0.3, legs: LIE_L, hands: [[BLX - 118, hy - 52], [BLX - 66, hy - 26]], prefF: 'down', prefB: 'down', grounded: false, face: 1, gesture: false, noWalk: true }; };
  // na cadeira do dentista (reclinado)
  const REC_L = { fT: 1.35, fS: 1.05, bT: 1.3, bS: 1.0 };
  const recline = () => (t) => ({ x: DX, hipY: DAY - 16, ay: DAY, lean: -1.12, head: -0.25, legs: REC_L, hands: [[DX - 30, DAY - 56], [DX - 50, DAY - 50]], prefF: 'down', prefB: 'down', grounded: false, face: 1, gesture: false, noWalk: true });
  // boca do paciente reclinado (mundo)
  const MOUTH_D = (() => { const st = recline()(0); const R = rigP(st); const hw = [st.x + (R.head[0] - st.x) * SC, st.ay + (R.head[1] - st.ay) * SC]; return [hw[0] + 8, hw[1] + 10]; })();
  const HEAD_D = [MOUTH_D[0] - 8, MOUTH_D[1] - 10];
  // dentista (azul)
  const DENTX = HEAD_D[0] - 70;
  const dentist = (k) => (t) => {
    if (!atDentist(k, t)) return pose(-600, FL, STAND_L, 0, 0, handsDown(-600, HY), { noWalk: true });
    const drilling = k === 'faz' ? t >= DRILL_F[0] && t < DRILL_F[1] : t >= DRILL_P[0] && t < DRILL_P[1];
    const st = pose(DENTX, FL, STAND_L, 0.3, 0.35, handsDown(DENTX, HY), { gesture: true, noWalk: true });
    if (drilling || t > (k === 'faz' ? DENT_F[0] + 0.2 : DENT_P[0] + 0.2)) st.hands = [toRig(st, [MOUTH_D[0] - 14 + (drilling ? 2 * Math.sin(t * 50) : 0), MOUTH_D[1] - 16]), toRig(st, [MOUTH_D[0] - 30, MOUTH_D[1] - 6])];
    return st;
  };

  // ---------- 2 · FAZ ----------
  const fazKeys = [
    [0, eatApple(0)],
    [2.8, eatApple(2.8, 0.9), 0.2], [3.25, holdCheek(), 0.15],
    [3.9, callPhone(), 0.3],
    [DENT_F[0], recline(), 0.01],
    [DENT_F[1], eatApple(7.0), 0.01],
    [11.0, eatApple(11.0, 0.8), 0.3],
    [17.0, eatApple(17.0, 0.8), 0.3],
    [18.6, seat(-0.1, -0.15, [[CHX + 40, SHY - 250], [CHX - 10, SHY - 20]], { prefF: 'up' }), 0.3],
    [19.3, eatApple(19.3, 1.4), 0.4],
  ];
  const fazState = (t) => seq(fazKeys, t);

  // ---------- 1 · PENSA DEMAIS ----------
  const pensaKeys = [
    [0, eatApple(0.5)],
    [7.0, eatApple(7.0, 0.9), 0.2], [7.45, holdCheek(), 0.15],
    [8.0, seat(0.05, 0.2, [W2R(CHX + 40, FL - 120), W2R(TB0 + 20, TT - 4)]), 0.4],
    [9.5, chewSide(), 0.3],
    [11.0, holdCheek(), 0.4],
    [13.0, sofaIce(), 0.01],
    [14.6, sofaPill(), 0.25], [15.3, sofaIce(), 0.3],
    [17.0, sofaIce(), 0.3],
    [19.0, bedCheek(), 0.01],
    [DENT_P[0], recline(), 0.01],
  ];
  const pensaState = (t) => seq(pensaKeys, t);

  // ---------- cenários ----------
  function drawHome(c, k, t, P) {
    const h = P.h, night = k === 'pensa' && t >= 19 && t < DENT_P[0];
    const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, night ? '#0f0b09' : '#1b130e'); g.addColorStop(0.7, night ? '#1d1510' : '#33251b'); g.addColorStop(1, '#201710');
    c.fillStyle = g; c.fillRect(-300, -100, W + 600, h + 200);
    c.strokeStyle = 'rgba(0,0,0,0.22)'; c.lineWidth = 3; for (let x = -280; x < W + 300; x += 96) { c.beginPath(); c.moveTo(x, -100); c.lineTo(x, FL); c.stroke(); }
    c.fillStyle = '#4a3524'; c.fillRect(420, 40, 150, 110); c.strokeStyle = OUT; c.lineWidth = 5; c.strokeRect(420, 40, 150, 110);
    c.fillStyle = night ? '#121628' : '#8fa6c4'; c.fillRect(426, 46, 138, 98);
    if (!night) { c.save(); c.globalCompositeOperation = 'lighter'; c.filter = 'blur(18px)'; c.fillStyle = rgb(PAL.luz, 1, 0.14); c.beginPath(); c.moveTo(426, 60); c.lineTo(564, 60); c.lineTo(760, FL + 30); c.lineTo(430, FL + 30); c.closePath(); c.fill(); c.restore(); }
    // cama
    c.fillStyle = '#5a3c26'; c.strokeStyle = OUT; c.lineWidth = 4;
    c.fillRect(100, BMT - 80, 20, FL - BMT + 80); c.strokeRect(100, BMT - 80, 20, FL - BMT + 80);
    c.fillRect(118, BMT + 16, 250, FL - BMT - 30); c.strokeRect(118, BMT + 16, 250, FL - BMT - 30);
    c.fillStyle = '#d9cdb8'; c.beginPath(); c.roundRect(118, BMT - 2, 250, 20, 8); c.fill(); c.stroke();
    c.fillStyle = '#efe6d6'; c.beginPath(); c.roundRect(124, BMT - 22, 74, 24, 10); c.fill(); c.stroke();
    // mesa e cadeira
    c.fillStyle = '#6b4a30'; c.fillRect(TB0, TT, TB1 - TB0, 14); c.strokeRect(TB0, TT, TB1 - TB0, 14);
    for (const lx of [TB0 + 8, TB1 - 20]) { c.fillRect(lx, TT + 14, 12, FL - TT - 14); c.strokeRect(lx, TT + 14, 12, FL - TT - 14); }
    c.fillStyle = '#5a3c26'; c.fillRect(CHX - 40, FL - 64, 70, 12); c.strokeRect(CHX - 40, FL - 64, 70, 12); c.fillRect(CHX - 44, FL - 150, 12, 150); c.strokeRect(CHX - 44, FL - 150, 12, 150); c.fillRect(CHX + 18, FL - 52, 10, 52); c.strokeRect(CHX + 18, FL - 52, 10, 52);
    // sofá
    c.fillStyle = '#7a3f34'; c.beginPath(); c.roundRect(830, FL - 130, 170, 70, 14); c.fill(); c.stroke(); c.beginPath(); c.roundRect(820, FL - 68, 190, 40, 10); c.fill(); c.stroke();
    c.fillRect(830, FL - 28, 14, 28); c.strokeRect(830, FL - 28, 14, 28); c.fillRect(986, FL - 28, 14, 28); c.strokeRect(986, FL - 28, 14, 28);
    c.fillStyle = '#241911'; c.fillRect(-300, FL, W + 600, h); c.strokeStyle = 'rgba(0,0,0,0.5)'; c.lineWidth = 4; c.beginPath(); c.moveTo(-300, FL); c.lineTo(W + 300, FL); c.stroke();
  }
  function drawClinic(c, k, t, P) {
    const h = P.h;
    const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#22201c'); g.addColorStop(0.7, '#3a3428'); g.addColorStop(1, '#26211b');
    c.fillStyle = g; c.fillRect(-300, -100, W + 600, h + 200);
    c.strokeStyle = 'rgba(255,255,255,0.05)'; c.lineWidth = 2; for (let y = 40; y < FL; y += 40) { c.beginPath(); c.moveTo(-300, y); c.lineTo(W + 300, y); c.stroke(); }
    // quadro de dente na parede
    c.fillStyle = '#e8dcc6'; c.strokeStyle = OUT; c.lineWidth = 4; c.beginPath(); c.roundRect(170, 50, 110, 90, 8); c.fill(); c.stroke();
    c.fillStyle = '#fff'; c.beginPath(); c.moveTo(200, 72); c.quadraticCurveTo(225, 60, 250, 72); c.lineTo(246, 100); c.lineTo(236, 122); c.lineTo(226, 100); c.lineTo(216, 122); c.lineTo(206, 100); c.closePath(); c.fill(); c.lineWidth = 3; c.stroke();
    // luminária do dentista
    c.strokeStyle = OUT; c.lineWidth = 8; c.beginPath(); c.moveTo(HEAD_D[0] + 140, -40); c.lineTo(HEAD_D[0] + 140, 40); c.lineTo(HEAD_D[0] + 40, 70); c.stroke();
    c.fillStyle = '#e9e2cf'; c.beginPath(); c.ellipse(HEAD_D[0] + 36, 74, 30, 12, -0.3, 0, Math.PI * 2); c.fill(); c.lineWidth = 3; c.stroke();
    c.save(); c.globalCompositeOperation = 'lighter'; c.filter = 'blur(14px)'; c.fillStyle = 'rgba(255,250,230,0.35)'; c.beginPath(); c.moveTo(HEAD_D[0] + 10, 80); c.lineTo(HEAD_D[0] + 60, 80); c.lineTo(HEAD_D[0] + 50, HEAD_D[1] + 20); c.lineTo(HEAD_D[0] - 30, HEAD_D[1] + 20); c.closePath(); c.fill(); c.restore();
    // cadeira reclinada
    c.fillStyle = '#2f6f8f'; c.strokeStyle = OUT; c.lineWidth = 4;
    c.beginPath(); c.moveTo(HEAD_D[0] - 30, HEAD_D[1] + 26); c.lineTo(DX, DAY + 4); c.lineTo(DX + 150, DAY - 8); c.lineTo(DX + 150, DAY + 14); c.lineTo(DX, DAY + 26); c.lineTo(HEAD_D[0] - 36, HEAD_D[1] + 44); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = '#5a5a62'; c.fillRect(DX + 20, DAY + 24, 24, FL - DAY - 24); c.strokeRect(DX + 20, DAY + 24, 24, FL - DAY - 24); c.fillRect(DX - 30, FL - 10, 130, 10); c.strokeRect(DX - 30, FL - 10, 130, 10);
    c.fillStyle = '#241911'; c.fillRect(-300, FL, W + 600, h); c.strokeStyle = 'rgba(0,0,0,0.5)'; c.lineWidth = 4; c.beginPath(); c.moveTo(-300, FL); c.lineTo(W + 300, FL); c.stroke();
  }
  function drawBack(c, k, t, P) { if (atDentist(k, t)) drawClinic(c, k, t, P); else drawHome(c, k, t, P); }

  const swell = (k, t) => (k === 'faz' ? 0.15 * smooth(seg(t, 3.0, 4.0)) * (1 - smooth(seg(t, 6.4, 7.0))) : 0.15 * smooth(seg(t, 7.2, 8)) + 0.45 * smooth(seg(t, 11, 13.5)) + 0.4 * smooth(seg(t, 17, 19.5)));
  function drawFront(c, k, t, P, drawn) {
    const hd = drawn.main.head, f = (drawn.main.st.face ?? 1) < 0 ? -1 : 1;
    const dent = atDentist(k, t);
    // bochecha inchada
    const s = swell(k, t);
    if (s > 0.02) {
      const ang = dent ? -0.4 : 0.35; const cx = hd[0] + f * Math.cos(ang) * 12, cy = hd[1] + 10;
      c.save(); c.globalCompositeOperation = 'lighter'; c.filter = 'blur(8px)'; c.fillStyle = rgb(PAL.dor, 1, 0.5 * Math.min(1, s * 1.5)); c.beginPath(); c.arc(cx + f * 6, cy, 10 + 18 * s, 0, Math.PI * 2); c.fill(); c.restore();
      c.fillStyle = '#f7f7f5'; c.strokeStyle = OUT; c.lineWidth = 3; c.beginPath(); c.ellipse(cx + f * (4 + 6 * s), cy + 2, 6 + 14 * s, 5 + 11 * s, 0, 0, Math.PI * 2); c.fill(); c.stroke();
    }
    if (!dent) {
      // maçã (na mão comendo; mordida)
      const eating = k === 'faz' ? t < 3.25 || (t >= DENT_F[1] && t < 18.6) || t >= 19.3 : t < 7.45;
      const ap = eating ? add(drawn.main.hand, [4, -6]) : [TB0 + 30, TT - 10];
      if (!(k === 'pensa' && t >= 13)) { c.fillStyle = '#d03a2e'; c.strokeStyle = OUT; c.lineWidth = 3; c.beginPath(); c.arc(ap[0], ap[1], 11, 0, Math.PI * 2); c.fill(); c.stroke();
        c.fillStyle = '#f4ead8'; c.beginPath(); c.arc(ap[0] + 9, ap[1] - 3, 5, 0, Math.PI * 2); c.fill(); c.strokeStyle = '#4a3220'; c.beginPath(); c.moveTo(ap[0], ap[1] - 10); c.lineTo(ap[0] + 2, ap[1] - 17); c.stroke(); }
      // celular ligando para o dentista
      if (k === 'faz' && t >= 3.95 && t < DENT_F[0]) { const hp = drawn.main.hand; c.fillStyle = '#111'; c.strokeStyle = OUT; c.lineWidth = 3; c.beginPath(); c.roundRect(hp[0] - 4, hp[1] - 14, 10, 22, 3); c.fill(); c.stroke(); }
      // bolsa de gelo e remédio
      if (k === 'pensa' && t >= 13 && t < 19) { const hp = drawn.main.hand, pill_ = t >= 14.6 && t < 15.3;
        if (!pill_) { c.fillStyle = '#7fc4ff'; c.strokeStyle = OUT; c.lineWidth = 3; c.beginPath(); c.roundRect(hp[0] - 14, hp[1] - 12, 26, 20, 6); c.fill(); c.stroke(); }
        else { c.fillStyle = '#fff'; c.beginPath(); c.ellipse(hp[0], hp[1] - 4, 5, 3, 0.4, 0, Math.PI * 2); c.fill(); c.stroke(); }
        // caixas de remédio no braço do sofá
        const nbox = t < 14.8 ? 2 : t < 17 ? 3 : 4; for (let i = 0; i < nbox; i++) { c.fillStyle = i % 2 ? '#e8c547' : '#e5483b'; c.fillRect(828 + i * 2, FL - 150 - i * 12, 26, 12); c.strokeRect(828 + i * 2, FL - 150 - i * 12, 26, 12); } }
      // noite sem dormir
      if (k === 'pensa' && t >= 19 && t < DENT_P[0]) { for (let i = 0; i < 3; i++) { const a = ((t * 1.1 + i / 3) % 1); c.fillStyle = `rgba(229,72,59,${0.8 * (1 - a)})`; c.font = `800 ${18 + 10 * a}px Montserrat`; c.textAlign = 'center'; c.fillText('!', hd[0] + 30 + i * 12, hd[1] - 20 - a * 50); } }
    } else {
      // broca do dentista
      const drilling = k === 'faz' ? t >= DRILL_F[0] && t < DRILL_F[1] : t >= DRILL_P[0] && t < DRILL_P[1];
      const D2 = drawn.other; if (D2 && D2.st.x > 0) { const hp = D2.hand; c.strokeStyle = '#c8ccd4'; c.lineWidth = 5; c.beginPath(); c.moveTo(hp[0], hp[1]); c.lineTo(MOUTH_D[0] - 2, MOUTH_D[1] - 2); c.stroke(); c.strokeStyle = OUT; c.lineWidth = 2; c.stroke();
        if (drilling) for (let i = 0; i < 5; i++) { const a = ((t * 4 + i / 5) % 1); c.fillStyle = `rgba(255,255,255,${0.9 * (1 - a)})`; c.beginPath(); c.arc(MOUTH_D[0] + Math.cos(i * 1.3) * 14 * a, MOUTH_D[1] - 4 - Math.sin(i * 1.7) * 14 * a, 2.5, 0, Math.PI * 2); c.fill(); } }
      // pés mexendo de nervoso no pensa
      if (k === 'pensa' && drilling) { const hp = drawn.main.toP(drawn.main.R.legF[3]); c.strokeStyle = 'rgba(255,255,255,0.6)'; c.lineWidth = 3; for (let i = 0; i < 2; i++) { c.beginPath(); c.arc(hp[0] + 8, hp[1] - 6, 10 + i * 7, -1.2, -0.2); c.stroke(); } }
    }
  }

  // ---------- placas ----------
  function pill(c, x, y, txt, col, ok, sc = 1) {
    c.save(); c.translate(x, y); c.scale(sc, sc);
    c.font = '700 18px "Space Mono", monospace'; const tw = c.measureText(txt).width; const ic = ok === null ? 0 : 24, hh = 30;
    c.beginPath(); c.roundRect(0, -hh / 2, tw + ic + 24, hh, hh / 2); c.fillStyle = 'rgba(15,10,7,0.88)'; c.fill(); c.lineWidth = 3; c.strokeStyle = rgb(col); c.stroke();
    if (ok === true) { c.strokeStyle = rgb(PAL.faz); c.lineWidth = 4; c.beginPath(); c.moveTo(12, 0); c.lineTo(17, 6); c.lineTo(27, -6); c.stroke(); }
    if (ok === false) { c.strokeStyle = rgb(PAL.dor); c.lineWidth = 4; c.beginPath(); c.moveTo(13, -6); c.lineTo(25, 6); c.moveTo(25, -6); c.lineTo(13, 6); c.stroke(); }
    c.fillStyle = rgb(col); c.textAlign = 'left'; c.textBaseline = 'middle'; c.fillText(txt, 12 + ic, 1); c.restore();
  }
  function drawOverlay(c, k, t, P, drawn, toS) {
    if (t > GT) return;
    const d = dayOf(t), dt0 = DAYS.find(([, n]) => n === d)[0];
    c.save(); c.translate(870, 40); const pop = d > 1 ? 1 + 0.3 * Math.exp(-Math.max(0, t - dt0) * 8) : 1; c.scale(pop, pop);
    c.fillStyle = 'rgba(12,8,6,0.9)'; c.strokeStyle = 'rgba(255,214,160,0.6)'; c.lineWidth = 3; c.beginPath(); c.roundRect(-74, -24, 148, 48, 10); c.fill(); c.stroke();
    c.fillStyle = rgb(PAL.luz); c.font = '800 30px "Space Mono", monospace'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(`DIA ${d}`, 0, 2); c.restore();
    if (k === 'faz') {
      const items = [[4.4, 'LIGOU PRO DENTISTA', true], [6.45, 'OBTURAÇÃO: 20 MIN', true], [11.6, 'COMENDO SEM DOR', true]];
      items.forEach(([t0, txt, ok], i) => { if (t >= t0) pill(c, 18, 74 + i * 36, txt, PAL.faz, ok, backE(seg(t, t0, t0 + 0.3))); });
    } else {
      const dd = t < 7.1 ? 0 : d; let y = 74;
      if (dd > 0) { pill(c, 18, y, `DIAS COM DOR: ${dd}`, PAL.dor, false); y += 36; }
      if (t >= 13.2) { pill(c, 18, y, `REMÉDIOS: ${t < 14.8 ? 2 : t < 17 ? 3 : 9}`, PAL.dor, false); y += 36; }
      if (t >= 23.0) pill(c, 18, y, 'TRATAMENTO DE CANAL', PAL.dor, false, backE(seg(t, 23.0, 23.3)));
    }
    for (const tc of k === 'faz' ? [DENT_F[0], DENT_F[1]] : [DENT_P[0]]) { const a = t - tc; if (a >= 0 && a < 0.25) { c.fillStyle = `rgba(255,245,230,${0.7 * (1 - a / 0.25)})`; c.fillRect(0, 0, W, P.h); } }
  }

  // ---------- índice de dor ----------
  const painFaz = (t) => { let p = 4 + spike(t, 3.2, 50, 1.5); if (t > 3.6 && t < DRILL_F[1]) p = Math.max(p, 30); p += 15 * smooth(seg(t, DRILL_F[0], DRILL_F[0] + 0.3)) * (1 - smooth(seg(t, DRILL_F[1] - 0.2, DRILL_F[1] + 0.3))); return t > 6.6 ? lerp(p, 3, smooth(seg(t, 6.6, 7.2))) : p; };
  const painPensa = (t) => { let p = 4 + spike(t, 7.4, 50, 1.5); if (t > 7.8) p = Math.max(p, 30 + 40 * smooth(seg(t, 7.8, 21)) + 4 * Math.sin(t * 3)); p += spike(t, 15.2, 12, 2) + spike(t, 19.6, 15, 1.5) + spike(t, 20.5, 15, 1.5); p += 10 * smooth(seg(t, DRILL_P[0], DRILL_P[0] + 0.3)); return Math.min(100, p); };

  const SCENE = {
    metricLabel: 'ÍNDICE DE DOR', totalLabel: 'DOR TOTAL', reportT: GT, noReport: true, dimOf, bubbleMaxX: 780,
    secsText: (n) => `${n}`,
    state: { faz: fazState, pensa: pensaState },
    others: { faz: [{ id: 'other', fn: dentist('faz'), col: PAL.azul, seed: 31, glow: 0.35 }], pensa: [{ id: 'other', fn: dentist('pensa'), col: PAL.azul, seed: 33, glow: 0.35 }] },
    drawBack, drawFront, drawOverlay,
    cam: (k, t) => {
      const keys = k === 'faz' ? [[0, 640, 190, 1.1], [2.8, 640, 175, 1.55], [DENT_F[0], 470, 190, 1.4, 0.01], [DENT_F[1], 640, 180, 1.4, 0.01], [11.0, 640, 175, 1.5], [13.0, 600, 200, 1.1], [17.0, 640, 175, 1.5]]
        : [[0, 640, 190, 1.1], [7.0, 640, 175, 1.55], [11.0, 620, 190, 1.2], [13.0, 880, 190, 1.55, 0.01], [17.0, 760, 200, 1.1], [19.0, 230, 200, 1.5, 0.01], [DENT_P[0], 470, 190, 1.4, 0.01]];
      let v = { x: keys[0][1], y: keys[0][2], z: keys[0][3] };
      for (let i = 1; i < keys.length; i++) { const [kt, x, y, z, d] = keys[i]; if (t < kt) break; const u = easeInOut(seg(t, kt, kt + (d || 0.6))); v = { x: lerp(v.x, x, u), y: lerp(v.y, y, u), z: lerp(v.z, z, u) }; }
      return v;
    },
    pain: { faz: painFaz, pensa: painPensa },
    bubbles: {
      faz: [
        { t0: 3.3, t1: 3.9, text: 'AI... O DENTE.', col: PAL.dor },
        { t0: 4.0, t1: 4.75, text: 'TEM HORÁRIO HOJE?' },
        { t0: 6.45, t1: 6.95, text: 'PRONTO!', col: PAL.azul, who: 'other' },
        { t0: 11.5, t1: 12.8, text: 'NOVINHO.', col: PAL.faz },
        { t0: 17.4, t1: 18.5, text: 'TUDO CERTO.', col: PAL.faz },
      ],
      pensa: [
        { t0: 7.5, t1: 8.0, text: 'AI!', col: PAL.dor },
        { t0: 8.1, t1: 9.4, text: 'DEVE PASSAR SOZINHO.' },
        { t0: 9.6, t1: 10.9, text: 'MASTIGO DO OUTRO LADO.' },
        { t0: 13.3, t1: 14.5, text: 'SÓ MAIS UM REMÉDIO...' },
        { t0: 20.8, t1: 21.9, text: 'NÃO AGUENTO MAIS...', col: PAL.dor },
        { t0: 22.4, t1: 23.6, text: 'VAI TER QUE SER CANAL.', col: PAL.azul, who: 'other' },
      ],
    },
    shake: (k, t) => (k === 'faz' ? 4 * (t >= 3.2 ? Math.exp(-(t - 3.2) * 8) : 0) : 4 * (t >= 7.4 ? Math.exp(-(t - 7.4) * 8) : 0)),
    energy: (k, t) => (k === 'pensa' && t > 19 && t < DENT_P[0] ? 1.6 : 1),
    caps: [
      { s: -1, e: 2.8, lines: [[-1, [['DOR DE DENTE.']]], [0.3, [['DOIS JEITOS DE '], ['RESOLVER.', 'dor']]]] },
      { s: 2.9, e: 7.0, lines: [[2.9, [['QUEM '], ['FAZ', 'faz']]], [3.25, [['MARCA NO MESMO DIA.']]]] },
      { s: 7.05, e: 11.0, lines: [[7.05, [['QUEM '], ['PENSA DEMAIS', 'pensa']]], [7.45, [['ESPERA PASSAR.']]]] },
      { s: 11.05, e: 13.0, lines: [[11.05, [['DIA 3: UM COME']]], [11.4, [['SEM '], ['DOR.', 'faz']]]] },
      { s: 13.05, e: 17.0, lines: [[13.05, [['O OUTRO: GELO,']]], [13.45, [['REMÉDIO E '], ['INCHAÇO.', 'dor']]]] },
      { s: 17.05, e: 19.0, lines: [[17.05, [['DIA 7: QUEM FAZ']]], [17.4, [['NEM LEMBRA '], ['MAIS.', 'faz']]]] },
      { s: 19.05, e: 22.0, lines: [[19.05, [['QUEM PENSA DEMAIS']]], [19.45, [['NÃO '], ['DORME.', 'dor']]]] },
      { s: 22.05, e: GT, lines: [[22.05, [['E O QUE ERA SIMPLES']]], [22.45, [['VIROU '], ['CANAL.', 'dor']]]] },
      { s: GT + 0.1, e: 99, center: true, lines: [[GT + 0.3, [['QUEM FAZ: '], ['1 DIA DE DOR.', 'faz']]], [GT + 0.9, [['PENSA DEMAIS: '], ['7 DIAS.', 'dor']]]] },
    ],
    sched: {
      noBips: true, noPops: true, music: 0.42, focusKeys: FOCUS,
      fx: [
        // FAZ (2,8–7,0)
        [3.18, 'crunch', 0.5, 0.35], [3.3, 'voz_faz/grunt4', 0.45, 0.35], [3.95, 'foley/toque_tela', 0.5, 0.35], [4.25, 'foley/toque_tela', 0.4, 0.35],
        [DRILL_F[0], 'drill', 0.16, 0.35, DRILL_F[1] - DRILL_F[0]], [5.6, 'voz_faz/grunt5', 0.3, 0.35], [6.05, 'exhale', 0.2, 0.35],
        // PENSA (7,0–11,0)
        [7.35, 'crunch', 0.5, -0.35], [7.47, 'voz_pensa/dor_02', 0.42, -0.35], [9.6, 'crunch', 0.25, -0.35], [10.1, 'crunch', 0.22, -0.35], [10.35, 'voz_pensa/dor_10', 0.3, -0.35, 1.06],
        // FAZ (11,0–13,0)
        [11.2, 'crunch', 0.45, 0.35], [12.0, 'crunch', 0.45, 0.35], [12.0, 'exhale', 0.18, 0.35],
        // PENSA (13,0–17,0)
        [13.1, 'foley/cloth_05', 0.3, -0.35], [14.65, 'foley/talher_3', 0.35, -0.35, 1.4], [14.95, 'foley/gole_1', 0.55, -0.35], [15.4, 'voz_pensa/dor_10', 0.38, -0.35], [16.3, 'voz_pensa/dor_14', 0.32, -0.35],
        // FAZ (17,0–19,0)
        [17.2, 'crunch', 0.45, 0.35], [17.9, 'crunch', 0.45, 0.35],
        // PENSA (19,0–27,0)
        [19.2, 'foley/cloth_03', 0.3, -0.35], [19.6, 'voz_pensa/dor_14', 0.38, -0.35], [20.5, 'voz_pensa/dor_15', 0.36, -0.35], [21.5, 'voz_pensa/dor_02', 0.32, -0.35, 1.1],
        [DRILL_P[0], 'drill', 0.16, -0.35, DRILL_P[1] - DRILL_P[0]], [24.6, 'voz_pensa/dor_10', 0.38, -0.35], [25.4, 'voz_pensa/dor_02', 0.36, -0.35], [26.3, 'exhale', 0.22, -0.35],
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
