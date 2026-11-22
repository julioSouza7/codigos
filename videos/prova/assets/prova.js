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

  // ================= ROTEIRO: "A PROVA" (34 s) — índice de ansiedade =================
  const FL = 300, DT = FL - 92;                  // piso e tampo da escrivaninha
  const DESK0 = 572, DESK1 = 820, CH = 548;      // mesa e cadeira
  const BOOK = [618, DT - 6];
  const BEDX = 250;
  const HY = hipOn(FL, STAND_L);
  const GT = 29.0, MORNING = 25.8;
  const FOCUS = [[0, null], [2.8, 'faz'], [6.8, 'pensa'], [10.8, 'faz'], [14.0, 'pensa'], [17.2, 'faz'], [19.8, 'pensa'], [MORNING, 'faz'], [27.4, 'pensa'], [GT, null]];
  const dimOf = focusTrack(FOCUS);
  // relógio: minutos depois das 19:00
  const MK = [[0, -1], [2.8, 0], [6.8, 30], [10.8, 90], [14.0, 150], [17.2, 210], [19.0, 240], [19.79, 255], [19.8, 360], [MORNING - 0.01, 480]];
  const mins = (t) => { if (t >= MORNING) return 780; for (let i = 1; i < MK.length; i++) if (t <= MK[i][0]) { const [a, va] = MK[i - 1], [b, vb] = MK[i]; return Math.floor(lerp(va, vb, (t - a) / (b - a))); } return 480; };
  const hhmm = (t) => { const m = (19 * 60 + mins(t)) % 1440; return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`; };

  // ---------- poses ----------
  const SEAT_L = { fT: 1.45, fS: 0.02, bT: 1.38, bS: -0.06 };
  const SHY = hipOn(FL, SEAT_L);
  const seat = (lean, head, hands, extra) => (t) => Object.assign({ x: CH, hipY: SHY, ay: FL, lean, head, legs: SEAT_L, hands, prefF: 'down', prefB: 'down', grounded: false, face: 1, noWalk: true, gesture: false }, extra || {});
  const W2R = (x, y) => toRig({ x: CH, ay: FL, face: 1 }, [x, y]);
  const write = (fast = 1) => (t) => { const a = t * 13 * fast; return seat(0.42, 0.45, [W2R(BOOK[0] + 10 + 8 * Math.sin(a) + 6 * Math.sin(a * 0.31), BOOK[1] - 6 + 3 * Math.cos(a)), W2R(BOOK[0] - 22, BOOK[1] - 2)])(t); };
  const read = () => (t) => seat(0.38, 0.5, [W2R(BOOK[0] + 6, BOOK[1] - 4), W2R(BOOK[0] - 20, BOOK[1] - 2)])(t);
  const stand = (x, face = 1, extra) => () => pose(x, FL, STAND_L, 0.03, 0.02, handsDown(x, HY), Object.assign({ face }, extra || {}));
  const walkTo = (x0, x1, t0, t1, face = 1) => (t) => { const x = lerp(x0, x1, easeInOut(seg(t, t0, t1))); return pose(x, FL, STAND_L, 0.04, 0.02, handsDown(x, HY), { face, run: 0 }); };
  const LIE_L = { fT: 1.5, fS: 1.56, bT: 1.44, bS: 1.54 };
  const BMT = FL - 62;
  const lie = () => () => { const hy = BMT - 16; return { x: BEDX, hipY: hy, ay: BMT, lean: -1.5, head: -0.16, legs: LIE_L, hands: [[BEDX - 46, hy - 30], [BEDX - 66, hy - 26]], prefF: 'down', prefB: 'down', grounded: false, face: 1, gesture: false, noWalk: true }; };
  const phoneSeat = () => (t) => seat(0.25, 0.45, [[CH + 52, SHY - 92 + 2 * Math.sin(t * 5)], [CH + 40, SHY - 86]])(t);

  // ---------- 2 · FAZ ----------
  const fazKeys = [
    [0, stand(CH + 40, 1)],
    [2.9, () => { const st = pose(CH + 40, FL, STAND_L, 0.35, 0.4, handsDown(CH + 40, HY)); st.hands = [toRig(st, [690, DT + 24]), st.hands[1]]; return st; }, 0.3],   // guarda o celular na gaveta
    [3.55, seat(0.15, 0.2, [W2R(BOOK[0] - 4, BOOK[1] - 10), W2R(BOOK[0] - 24, BOOK[1] - 6)]), 0.4],
    [4.1, write(), 0.3], [6.6, read(), 0.4],
    [10.9, read(), 0.3], [11.3, write(1.2), 0.25], [12.8, read(), 0.25], [13.1, write(), 0.25],
    [14.0, read(), 0.4],
    [17.3, write(), 0.3], [17.9, seat(-0.12, -0.2, [[CH + 40, SHY - 250], [CH - 10, SHY - 240]], { prefF: 'up', prefB: 'up' }), 0.35],   // espreguiça
    [18.35, stand(CH + 20, -1), 0.3], [18.55, walkTo(CH + 20, BEDX + 80, 18.55, 19.2, -1), 0.3],
    [19.25, lie(), 0.4],
    [MORNING, seat(0.1, 0.15, [W2R(BOOK[0] + 4, BOOK[1] - 10), W2R(BOOK[0] - 24, BOOK[1] - 6)]), 0.01],
    [26.2, seat(-0.1, -0.2, [[CH + 40, SHY - 250], [CH - 10, SHY - 20]], { prefF: 'up' }), 0.25],   // comemora
  ];
  const fazState = (t) => seq(fazKeys, t);

  // ---------- 1 · PENSA DEMAIS ----------
  const arrange = () => (t) => { const a = Math.floor(t * 2.6), x = BOOK[0] + 40 + ((a * 37) % 70); return seat(0.32, 0.4, [W2R(x, DT - 8 - 4 * Math.abs(Math.sin(t * 8.2))), W2R(BOOK[0] - 10, DT - 4)])(t); };
  const laptop = () => (t) => seat(0.22, 0.25, [W2R(700, DT - 10 + 2 * Math.sin(t * 9)), W2R(684, DT - 8)])(t);
  const sleepDesk = () => (t) => seat(1.0, 0.55, [W2R(BOOK[0] + 26, DT - 6), W2R(BOOK[0] + 4, DT - 4)])(t);
  const pensaKeys = [
    [0, stand(CH + 40, 1)],
    [6.9, seat(0.15, 0.2, [W2R(BOOK[0] - 4, BOOK[1] - 10), W2R(BOOK[0] - 24, BOOK[1] - 6)]), 0.4],
    [7.3, arrange(), 0.3],
    [9.2, laptop(), 0.35],
    [14.0, laptop(), 0.3],
    [16.35, phoneSeat(), 0.35],
    [19.9, seat(-0.1, -0.3, [[CH + 40, SHY - 170], [CH - 10, SHY - 160]], { prefF: 'down' }), 0.12],   // susto
    [20.35, read(), 0.3], [20.8, write(1.8), 0.25],
    [22.9, seat(0.05, -0.15, [W2R(CH + 30, FL - 142), W2R(BOOK[0] - 20, BOOK[1] - 2)]), 0.3],   // café
    [23.5, write(1.6), 0.3],
    [24.4, (t) => { const u = smooth(seg(t, 24.4, 25.2)); const s1 = write(0.6)(t), s2 = sleepDesk()(t); return mixPose(s1, s2, u); }, 0.3],
    [25.2, sleepDesk(), 0.3],
    [MORNING, seat(0.1, 0.15, [W2R(BOOK[0] + 4, BOOK[1] - 10), W2R(BOOK[0] - 24, BOOK[1] - 6)]), 0.01],
    [27.6, seat(0.45, 0.7, [W2R(CH + 30, FL - 150), W2R(CH + 20, FL - 146)]), 0.35],   // mão na cara
  ];
  const pensaState = (t) => seq(pensaKeys, t);

  // ---------- cenário ----------
  function drawRoom(c, k, t, P) {
    const h = P.h;
    const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#17100c'); g.addColorStop(0.7, '#2c2018'); g.addColorStop(1, '#201710');
    c.fillStyle = g; c.fillRect(-300, -100, W + 600, h + 200);
    c.strokeStyle = 'rgba(0,0,0,0.22)'; c.lineWidth = 3; for (let x = -280; x < W + 300; x += 96) { c.beginPath(); c.moveTo(x, -100); c.lineTo(x, FL); c.stroke(); }
    // janela de noite
    c.fillStyle = '#4a3524'; c.fillRect(380, 40, 150, 110); c.strokeStyle = OUT; c.lineWidth = 5; c.strokeRect(380, 40, 150, 110);
    c.fillStyle = '#151a2c'; c.fillRect(386, 46, 138, 98); c.fillStyle = '#e8e4d0'; c.beginPath(); c.arc(495, 72, 11, 0, Math.PI * 2); c.fill();
    // cama
    c.fillStyle = '#5a3c26'; c.strokeStyle = OUT; c.lineWidth = 4;
    c.fillRect(110, BMT - 80, 20, FL - BMT + 80); c.strokeRect(110, BMT - 80, 20, FL - BMT + 80);
    c.fillRect(128, BMT + 16, 250, FL - BMT - 30); c.strokeRect(128, BMT + 16, 250, FL - BMT - 30);
    c.fillStyle = '#d9cdb8'; c.beginPath(); c.roundRect(128, BMT - 2, 250, 20, 8); c.fill(); c.stroke();
    c.fillStyle = '#efe6d6'; c.beginPath(); c.roundRect(134, BMT - 22, 74, 24, 10); c.fill(); c.stroke();
    // luminária e luz (apaga quando o faz dorme)
    const lampOn = k === 'faz' ? 1 - smooth(seg(t, 19.3, 19.5)) : 1;
    if (lampOn > 0) { c.save(); c.globalCompositeOperation = 'lighter'; c.filter = 'blur(16px)'; c.fillStyle = rgb(PAL.luz, 1, 0.2 * lampOn); c.beginPath(); c.moveTo(770, DT - 70); c.lineTo(800, DT - 70); c.lineTo(820, DT); c.lineTo(560, DT); c.closePath(); c.fill(); c.restore(); }
    // mesa, gaveta, cadeira
    c.fillStyle = '#6b4a30'; c.strokeStyle = OUT; c.lineWidth = 4;
    c.fillRect(DESK0, DT, DESK1 - DESK0, 14); c.strokeRect(DESK0, DT, DESK1 - DESK0, 14);
    const drawer = k === 'faz' ? 22 * Math.sin(Math.PI * seg(t, 2.95, 3.5)) : 0;
    c.fillRect(660 + drawer, DT + 14, 120, 34); c.strokeRect(660 + drawer, DT + 14, 120, 34); c.fillStyle = '#c9a26a'; c.fillRect(712 + drawer, DT + 28, 18, 5);
    c.fillStyle = '#6b4a30'; for (const lx of [DESK0 + 6, DESK1 - 18]) { c.fillRect(lx, DT + 14, 12, FL - DT - 14); c.strokeRect(lx, DT + 14, 12, FL - DT - 14); }
    c.fillStyle = '#5a3c26'; c.fillRect(CH - 40, FL - 64, 70, 12); c.strokeRect(CH - 40, FL - 64, 70, 12);
    c.fillRect(CH - 44, FL - 150, 12, 150); c.strokeRect(CH - 44, FL - 150, 12, 150); c.fillRect(CH + 18, FL - 52, 10, 52); c.strokeRect(CH + 18, FL - 52, 10, 52);
    // luminária
    c.strokeStyle = OUT; c.lineWidth = 6; c.beginPath(); c.moveTo(800, DT); c.lineTo(800, DT - 60); c.lineTo(776, DT - 76); c.stroke();
    c.fillStyle = lampOn > 0.5 ? '#ffe2a8' : '#5a5a62'; c.beginPath(); c.moveTo(760, DT - 70); c.lineTo(790, DT - 86); c.lineTo(796, DT - 66); c.closePath(); c.fill(); c.lineWidth = 3; c.stroke();
    c.fillStyle = '#241911'; c.fillRect(-300, FL, W + 600, h); c.strokeStyle = 'rgba(0,0,0,0.5)'; c.lineWidth = 4; c.beginPath(); c.moveTo(-300, FL); c.lineTo(W + 300, FL); c.stroke();
  }
  function drawClass(c, k, t, P) {
    const h = P.h;
    c.fillStyle = '#2a1f18'; c.fillRect(-300, -100, W + 600, h + 200);
    c.fillStyle = '#23382c'; c.strokeStyle = '#6b4a30'; c.lineWidth = 10; c.fillRect(230, 30, 520, 140); c.strokeRect(230, 30, 520, 140);
    c.fillStyle = 'rgba(240,240,230,0.85)'; c.font = '800 40px Montserrat, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('PROVA HOJE', 490, 100);
    c.save(); c.globalCompositeOperation = 'lighter'; c.filter = 'blur(18px)'; c.fillStyle = rgb(PAL.luz, 1, 0.12); c.fillRect(160, 0, 700, FL); c.restore();
    c.fillStyle = '#6b4a30'; c.strokeStyle = OUT; c.lineWidth = 4; c.fillRect(DESK0, DT, DESK1 - DESK0, 14); c.strokeRect(DESK0, DT, DESK1 - DESK0, 14);
    for (const lx of [DESK0 + 6, DESK1 - 18]) { c.fillRect(lx, DT + 14, 12, FL - DT - 14); c.strokeRect(lx, DT + 14, 12, FL - DT - 14); }
    c.fillStyle = '#5a3c26'; c.fillRect(CH - 40, FL - 64, 70, 12); c.strokeRect(CH - 40, FL - 64, 70, 12); c.fillRect(CH - 44, FL - 150, 12, 150); c.strokeRect(CH - 44, FL - 150, 12, 150);
    c.fillStyle = '#241911'; c.fillRect(-300, FL, W + 600, h); c.strokeStyle = 'rgba(0,0,0,0.5)'; c.lineWidth = 4; c.beginPath(); c.moveTo(-300, FL); c.lineTo(W + 300, FL); c.stroke();
  }
  function drawBack(c, k, t, P) { if (t >= MORNING) drawClass(c, k, t, P); else drawRoom(c, k, t, P); }

  // livro aberto deitado na mesa (um pouco inclinado para o público ver)
  function openBook(c, x, y, t, hl, flipT) {
    c.save(); c.translate(x, y);
    c.fillStyle = '#2f6fb3'; c.strokeStyle = OUT; c.lineWidth = 3; c.beginPath(); c.moveTo(-34, 4); c.lineTo(0, 8); c.lineTo(34, 4); c.lineTo(30, -12); c.lineTo(0, -8); c.lineTo(-30, -12); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = '#f4ead8'; c.beginPath(); c.moveTo(-30, 1); c.lineTo(0, 5); c.lineTo(30, 1); c.lineTo(27, -10); c.lineTo(0, -6); c.lineTo(-27, -10); c.closePath(); c.fill();
    c.strokeStyle = 'rgba(0,0,0,0.3)'; c.lineWidth = 1.5; for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(-24, -7 + i * 3); c.lineTo(-4, -4 + i * 3); c.moveTo(4, -4 + i * 3); c.lineTo(24, -7 + i * 3); c.stroke(); }
    if (hl > 0) { c.strokeStyle = 'rgba(255,230,60,0.75)'; c.lineWidth = 3; c.beginPath(); c.moveTo(4, -4); c.lineTo(4 + 20 * hl, -7 * hl - 4 * (1 - hl)); c.stroke(); }
    if (flipT !== null && flipT >= 0 && flipT < 0.4) { const ang = Math.PI * easeInOut(flipT / 0.4); c.fillStyle = '#fffaf0'; c.beginPath(); c.moveTo(0, 5); c.lineTo(28 * Math.cos(ang), 1 - 20 * Math.sin(ang)); c.lineTo(28 * Math.cos(ang) - 2, -10 - 20 * Math.sin(ang)); c.lineTo(0, -6); c.closePath(); c.fill(); c.strokeStyle = 'rgba(0,0,0,0.35)'; c.stroke(); }
    c.restore();
  }
  const PAGES = { faz: [4.1, 10.95, 12.85, 17.35], pensa: [20.4] };
  function drawFront(c, k, t, P, drawn) {
    if (t < MORNING) {
      // livro
      const flips = PAGES[k].map((p) => t - p).filter((d) => d >= 0 && d < 0.4);
      const showBook = k === 'faz' ? t > 3.6 && t < 18.3 : t > 20.3;
      if (showBook) openBook(c, BOOK[0], BOOK[1], t, k === 'faz' ? smooth(seg(t, 11.3, 12.6)) : 0, flips.length ? flips[0] : null);
      else if (!(k === 'faz' && t > 18.3)) { c.fillStyle = '#2f6fb3'; c.strokeStyle = OUT; c.lineWidth = 3; c.fillRect(BOOK[0] - 26, DT - 14, 52, 12); c.strokeRect(BOOK[0] - 26, DT - 14, 52, 12); }
      // lápis na mão quando escreve
      const writing = k === 'faz' ? (t >= 4.1 && t < 6.6) || (t >= 11.3 && t < 12.8) || (t >= 13.1 && t < 14.0) || (t >= 17.3 && t < 17.9) : (t >= 20.8 && t < 22.9) || (t >= 23.5 && t < 25.0);
      if (writing) { const hp = drawn.main.hand; c.strokeStyle = k === 'faz' && t > 11.3 && t < 12.8 ? '#ffe23c' : '#e8c547'; c.lineWidth = 4; c.beginPath(); c.moveTo(hp[0] - 2, hp[1] + 2); c.lineTo(hp[0] + 10, hp[1] - 14); c.stroke(); }
      // canetas que o pensa demais arruma
      if (k === 'pensa') {
        const cols = ['#e5483b', '#2f9bff', '#4fbf6a', '#e8c547', '#b85cff'];
        for (let i = 0; i < 5; i++) { const ord = t > 7.3 && t < 9.2 ? (i + Math.floor(t * 2.6)) % 5 : i; c.strokeStyle = cols[ord]; c.lineWidth = 4; const x = BOOK[0] + 44 + i * 9; c.beginPath(); c.moveTo(x, DT - 2); c.lineTo(x + 3, DT - 22); c.stroke(); }
        // notebook com vídeo
        if (t > 9.0 && t < 19.9) { c.fillStyle = '#26262c'; c.strokeStyle = OUT; c.lineWidth = 3; c.beginPath(); c.moveTo(670, DT); c.lineTo(760, DT); c.lineTo(752, DT - 4); c.lineTo(678, DT - 4); c.closePath(); c.fill(); c.stroke();
          c.beginPath(); c.roundRect(688, DT - 66, 74, 62, 4); c.fill(); c.stroke();
          const vid = t > 9.6 && t < 16.4; c.fillStyle = vid ? ['#e5483b', '#2f9bff', '#e8c547', '#4fbf6a', '#b85cff', '#f2a23a'][Math.floor(t * 0.9) % 6] : '#1d2230'; c.fillRect(693, DT - 61, 64, 52);
          if (vid) { c.fillStyle = 'rgba(255,255,255,0.9)'; c.beginPath(); c.moveTo(718, DT - 44); c.lineTo(734, DT - 35); c.lineTo(718, DT - 26); c.closePath(); c.fill(); c.fillStyle = 'rgba(255,255,255,0.8)'; c.fillRect(696, DT - 14, 58 * ((t * 0.9) % 1), 3); }
          c.save(); c.globalCompositeOperation = 'lighter'; c.filter = 'blur(14px)'; c.fillStyle = 'rgba(120,170,255,0.25)'; c.beginPath(); c.arc(700, DT - 40, 50, 0, Math.PI * 2); c.fill(); c.restore(); }
        // celular na mão
        if (t > 16.35 && t < 19.9) { const hf = drawn.main.hand; c.save(); c.translate(hf[0], hf[1] - 6); c.save(); c.globalCompositeOperation = 'lighter'; c.filter = 'blur(10px)'; c.fillStyle = 'rgba(120,170,255,0.4)'; c.beginPath(); c.arc(4, -6, 20, 0, Math.PI * 2); c.fill(); c.restore();
          c.fillStyle = '#111'; c.strokeStyle = OUT; c.lineWidth = 3; c.beginPath(); c.roundRect(-7, -14, 14, 24, 3); c.fill(); c.stroke(); c.fillStyle = '#6fa8ff'; c.fillRect(-5, -11, 10, 18); c.restore(); }
        // café
        if (t > 20.0) { const cp = t >= 22.95 && t < 23.45 ? add(drawn.main.hand, [4, -4]) : [790, DT - 12]; c.fillStyle = '#e8dcc6'; c.strokeStyle = OUT; c.lineWidth = 3; c.beginPath(); c.roundRect(cp[0] - 9, cp[1] - 11, 18, 22, 3); c.fill(); c.stroke(); }
      }
      // Z z z
      const sleeping = (k === 'faz' && t > 19.6) || (k === 'pensa' && t > 25.1);
      if (sleeping) { const hd = drawn.main.head; for (let i = 0; i < 3; i++) { const a = (t * 0.55 + i / 3) % 1; c.save(); c.globalAlpha = Math.sin(Math.PI * a) * 0.9; c.fillStyle = '#e8dcc6'; c.font = `800 ${16 + 12 * a}px Montserrat, sans-serif`; c.textAlign = 'center'; c.fillText('Z', hd[0] + 20 + a * 50, hd[1] - 20 - a * 70); c.restore(); } }
      // gotas de suor e olheira do pensa na madrugada
      if (k === 'pensa' && t > 19.9 && t < 24.6) { const hd = drawn.main.head; for (let i = 0; i < 3; i++) { const a = ((t * 1.4 + i / 3) % 1); c.fillStyle = `rgba(200,230,255,${0.9 * (1 - a)})`; c.beginPath(); c.arc(hd[0] - 18 - i * 7, hd[1] - 10 + a * 40, 4.5, 0, Math.PI * 2); c.fill(); } }
    } else {
      // folha da prova na mesa
      c.fillStyle = '#f4ead8'; c.strokeStyle = OUT; c.lineWidth = 3; c.beginPath(); c.moveTo(600, DT - 2); c.lineTo(660, DT - 2); c.lineTo(656, DT - 10); c.lineTo(604, DT - 10); c.closePath(); c.fill(); c.stroke();
    }
  }

  // ---------- placas ----------
  function pill(c, x, y, txt, col, ok, sc = 1, big = false) {
    c.save(); c.translate(x, y); c.scale(sc, sc);
    c.font = `700 ${big ? 26 : 18}px "Space Mono", monospace`; const tw = c.measureText(txt).width; const ic = ok === null ? 0 : 24, hh = big ? 40 : 30;
    c.beginPath(); c.roundRect(0, -hh / 2, tw + ic + 24, hh, hh / 2); c.fillStyle = 'rgba(15,10,7,0.88)'; c.fill(); c.lineWidth = 3; c.strokeStyle = rgb(col); c.stroke();
    if (ok === true) { c.strokeStyle = rgb(PAL.faz); c.lineWidth = 4; c.beginPath(); c.moveTo(12, 0); c.lineTo(17, 6); c.lineTo(27, -6); c.stroke(); }
    if (ok === false) { c.strokeStyle = rgb(PAL.dor); c.lineWidth = 4; c.beginPath(); c.moveTo(13, -6); c.lineTo(25, 6); c.moveTo(25, -6); c.lineTo(13, 6); c.stroke(); }
    c.fillStyle = rgb(col); c.textAlign = 'left'; c.textBaseline = 'middle'; c.fillText(txt, 12 + ic, 1); c.restore();
  }
  // folha com a nota, grande na tela
  function gradeCard(c, x, y, grade, good, t0, t) {
    if (t < t0) return; const s = backE(seg(t, t0, t0 + 0.4));
    c.save(); c.translate(x, y); c.rotate(-0.06); c.scale(s, s);
    c.fillStyle = '#f7f0e2'; c.strokeStyle = OUT; c.lineWidth = 4; c.beginPath(); c.roundRect(-110, -70, 220, 140, 8); c.fill(); c.stroke();
    c.fillStyle = '#3a3a40'; c.font = '700 16px "Space Mono", monospace'; c.textAlign = 'left'; c.textBaseline = 'middle'; c.fillText('PROVA', -94, -48);
    c.strokeStyle = 'rgba(0,0,0,0.2)'; c.lineWidth = 2; for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(-94, -24 + i * 16); c.lineTo(-10, -24 + i * 16); c.stroke(); }
    const col = good ? '#2f9b4a' : '#d03a2e'; c.strokeStyle = col; c.lineWidth = 5; c.beginPath(); c.arc(48, 6, 48, 0, Math.PI * 2); c.stroke();
    c.fillStyle = col; c.font = '900 44px Montserrat, sans-serif'; c.textAlign = 'center'; c.fillText(grade, 48, 8);
    c.restore();
  }
  function drawOverlay(c, k, t, P, drawn, toS) {
    if (t > GT) return;
    { const late = k === 'pensa' && t >= 19.8 && t < MORNING; c.save(); c.translate(870, 40); const pop = late ? 1 + 0.3 * Math.exp(-(t - 19.8) * 8) : 1; c.scale(pop, pop);
      c.fillStyle = 'rgba(12,8,6,0.9)'; c.strokeStyle = late ? rgb(PAL.dor) : 'rgba(255,214,160,0.6)'; c.lineWidth = 3; c.beginPath(); c.roundRect(-74, -24, 148, 48, 10); c.fill(); c.stroke();
      c.fillStyle = late ? rgb(PAL.dor) : rgb([255, 120, 90]); c.font = '800 34px "Space Mono", monospace'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(t < 2.8 ? '18:59' : hhmm(t), 0, 2); c.restore(); }
    if (k === 'faz') {
      const items = [[3.4, 'CELULAR NA GAVETA'], [11.0, 'CAPÍTULO 1'], [13.9, 'CAPÍTULO 2'], [17.85, 'CAPÍTULO 3'], [MORNING + 0.1, '8H DE SONO']];
      items.forEach(([t0, txt], i) => { if (t >= t0) pill(c, 18, 74 + i * 36, txt, PAL.faz, true, backE(seg(t, t0, t0 + 0.3))); });
      gradeCard(c, 790, 205, '9,5', true, 26.0, t);
    } else {
      const vids = t < 9.7 ? 0 : t < 14.0 ? 1 : Math.min(6, 1 + Math.floor((t - 14.0) / 0.4));
      let y = 74;
      if (vids > 0) { pill(c, 18, y, `"SÓ UM VÍDEO": ${vids}`, PAL.pensa, false); y += 36; }
      if (t > 16.4) { pill(c, 18, y, `PÁGINAS: ${t < 20.4 ? 0 : Math.min(12, Math.floor((t - 20.4) * 2.6))}`, PAL.dor, false); y += 36; }
      if (t >= MORNING) pill(c, 18, y, 'SONO: 3H', PAL.dor, false, backE(seg(t, MORNING + 0.1, MORNING + 0.4)));
      gradeCard(c, 790, 205, '4,0', false, 27.55, t);
    }
    // corte para a manhã
    const a = t - MORNING; if (a >= 0 && a < 0.25) { c.fillStyle = `rgba(255,245,230,${0.7 * (1 - a / 0.25)})`; c.fillRect(0, 0, W, P.h); }
  }

  // ---------- índice de ansiedade ----------
  const painFaz = (t) => { let p = 22 - 12 * smooth(seg(t, 3, 18)) + 2 * Math.sin(t * 1.9); p += 10 * smooth(seg(t, MORNING - 0.1, MORNING + 0.2)) * (1 - smooth(seg(t, 26.0, 26.6))); return p; };
  const painPensa = (t) => { let p = 22 + 22 * smooth(seg(t, 6.8, 19.5)) + 3 * Math.sin(t * 2.4); p += spike(t, 19.85, 45, 0.5); if (t > 19.85 && t < MORNING) p = Math.max(p, 70 + 6 * Math.sin(t * 5)); p += spike(t, 27.55, 30, 1); if (t > MORNING) p = Math.max(p, 72); return Math.min(100, p); };

  const SCENE = {
    metricLabel: 'ÍNDICE DE ANSIEDADE', totalLabel: 'ANSIEDADE TOTAL', reportT: GT, noReport: true, dimOf, bubbleMaxX: 780,
    secsText: (n) => `${n}`,
    state: { faz: fazState, pensa: pensaState },
    drawBack, drawFront, drawOverlay,
    cam: (k, t) => {
      const keys = k === 'faz' ? [[0, 540, 200, 1], [2.8, 620, 190, 1.45], [6.8, 600, 200, 1.1], [10.8, 610, 185, 1.55], [14.0, 600, 200, 1.1], [17.2, 560, 200, 1.25], [18.5, 420, 210, 1.15], [MORNING, 600, 200, 1.1, 0.01]]
        : [[0, 540, 200, 1], [6.8, 640, 185, 1.45], [9.2, 690, 175, 1.55], [11.0, 620, 200, 1.1], [14.0, 690, 175, 1.6], [16.3, 610, 180, 1.5], [17.4, 620, 200, 1.1], [19.8, 615, 185, 1.55], [MORNING, 600, 200, 1.1, 0.01]];
      let v = { x: keys[0][1], y: keys[0][2], z: keys[0][3] };
      for (let i = 1; i < keys.length; i++) { const [kt, x, y, z, d] = keys[i]; if (t < kt) break; const u = easeInOut(seg(t, kt, kt + (d || 0.6))); v = { x: lerp(v.x, x, u), y: lerp(v.y, y, u), z: lerp(v.z, z, u) }; }
      return v;
    },
    pain: { faz: painFaz, pensa: painPensa },
    bubbles: {
      faz: [
        { t0: 2.85, t1: 3.5, text: 'FOCO.', col: PAL.faz },
        { t0: 18.0, t1: 18.6, text: 'FEITO.', col: PAL.faz },
        { t0: 26.3, t1: 27.3, text: 'ISSO!', col: PAL.faz },
      ],
      pensa: [
        { t0: 7.0, t1: 8.5, text: 'PRIMEIRO, A MESA...' },
        { t0: 9.4, t1: 10.7, text: 'SÓ UM VÍDEO...' },
        { t0: 16.4, t1: 17.1, text: 'NOTIFICAÇÃO!' },
        { t0: 19.95, t1: 21.2, text: 'A PROVA É AMANHÃ!!', col: PAL.dor },
        { t0: 23.9, t1: 24.8, text: 'SÓ 5 MINUTINHOS...' },
      ],
    },
    shake: (k, t) => (k === 'pensa' ? 7 * (t >= 19.85 ? Math.exp(-(t - 19.85) * 7) : 0) : 0),
    energy: (k, t) => (k === 'pensa' && t > 19.85 && t < 24.4 ? 2.0 : 1),
    caps: [
      { s: -1, e: 2.8, lines: [[-1, [['PROVA AMANHÃ.']]], [0.3, [['DOIS JEITOS DE '], ['ESTUDAR.', 'dor']]]] },
      { s: 2.9, e: 6.8, lines: [[2.9, [['QUEM '], ['FAZ', 'faz']]], [3.25, [['GUARDA O CELULAR.']]]] },
      { s: 6.85, e: 10.8, lines: [[6.85, [['QUEM '], ['PENSA DEMAIS', 'pensa']]], [7.25, [['ARRUMA A MESA ANTES.']]]] },
      { s: 10.85, e: 14.0, lines: [[10.85, [['UM CAPÍTULO']]], [11.2, [['DE CADA '], ['VEZ.', 'faz']]]] },
      { s: 14.05, e: 17.2, lines: [[14.05, [['"SÓ UM VÍDEO"']]], [14.45, [['VIRARAM '], ['SEIS.', 'dor']]]] },
      { s: 17.25, e: 19.8, lines: [[17.25, [['23:00: QUEM FAZ']]], [17.6, [['VAI '], ['DORMIR.', 'faz']]]] },
      { s: 19.85, e: 22.8, lines: [[19.85, [['01:00: QUEM PENSA DEMAIS']]], [20.25, [['LEMBROU DA '], ['PROVA.', 'dor']]]] },
      { s: 22.85, e: MORNING, lines: [[22.85, [['CAFÉ, DESESPERO']]], [23.2, [['E '], ['SONO.', 'dor']]]] },
      { s: MORNING + 0.05, e: GT, lines: [[MORNING + 0.05, [['08:00.']]], [MORNING + 0.4, [['O RESULTADO.']]]] },
      { s: GT + 0.1, e: 99, center: true, lines: [[GT + 0.3, [['QUEM FAZ: '], ['NOTA 9,5.', 'faz']]], [GT + 0.9, [['PENSA DEMAIS: '], ['NOTA 4.', 'dor']]]] },
    ],
    sched: {
      noBips: true, noPops: true, music: 0.42, focusKeys: FOCUS,
      fx: [
        // FAZ (2,8–6,8)
        [2.95, 'foley/porta', 0.45, 0.35, 1.3], [3.6, 'foley/cadeira', 0.45, 0.35], [4.1, 'foley/pagina_1', 0.5, 0.35], [4.5, 'scribble', 0.4, 0.35, 2.0],
        // PENSA (6,8–10,8)
        [6.95, 'foley/cadeira', 0.45, -0.35], ...[7.5, 7.9, 8.3, 8.7].map((x) => [x, 'foley/talher_3', 0.25, -0.35, 1.3]), [9.3, 'foley/cloth_05', 0.3, -0.35], [9.75, 'typing', 0.3, -0.35, 0.7],
        // FAZ (10,8–14,0)
        [10.95, 'foley/pagina_2', 0.5, 0.35], [11.35, 'scribble', 0.35, 0.35, 1.3], [12.85, 'foley/pagina_1', 0.5, 0.35], [13.15, 'scribble', 0.4, 0.35, 0.75],
        // PENSA (14,0–17,2)
        ...[14.3, 14.7, 15.1, 15.5, 15.9].map((x) => [x, 'foley/toque_tela', 0.45, -0.35]), [16.3, 'ding', 0.25, -0.35], ...Array.from({ length: 5 }, (_, i) => [16.65 + i * 0.1, 'scroll', 0.1, -0.35]),
        // FAZ (17,2–19,8)
        [17.35, 'foley/pagina_2', 0.5, 0.35], [17.95, 'exhale', 0.22, 0.35], [18.4, 'foley/cadeira', 0.4, 0.35], [19.3, 'foley/cloth_03', 0.35, 0.35],
        // PENSA (19,8–25,8)
        [19.9, 'thud', 0.2, -0.35], [20.0, 'voz_pensa/dor_02', 0.35, -0.35, 1.08], [20.45, 'foley/pagina_1', 0.5, -0.35], [20.85, 'scribble', 0.45, -0.35, 2.0],
        [23.0, 'foley/gole_cafe', 0.55, -0.35], [23.55, 'scribble', 0.4, -0.35, 0.8], [24.45, 'exhale', 0.28, -0.35], [25.2, 'foley/cloth_02', 0.3, -0.35],
        // manhã
        [26.0, 'foley/pagina_2', 0.45, 0.35], [26.5, 'exhale', 0.2, 0.35],
        [27.55, 'foley/pagina_1', 0.45, -0.35], [27.9, 'voz_pensa/dor_14', 0.35, -0.35],
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
