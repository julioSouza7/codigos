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

  // ================= ROTEIRO: "A MANHÃ" (despertador, versão detalhada, 40 s) — índice de cansaço =================
  const FL = 300, MT = FL - 62;
  const BED0 = 190, BED1 = 600;
  const PHONE = [322, MT - 6];
  const TABLE0 = 770, TABLE1 = 910, TOP = FL - 82;   // mesa da cozinha (dentro do quarto)
  const CHAIR = 745;
  const HY = hipOn(FL, STAND_L);
  const GT = 32.0;                                   // fim da ação, entra o resultado
  const RINGS_P = [2.0, 9.0, 16.0, 23.0], PANIC = 28.0;
  const STREET0 = 8.0, STREET1 = 19.0;               // faz na rua
  const PUSH0 = 14.6, PUSHP = 0.42, PUSHN = 10;

  // ---------- relógio (o mesmo nos dois quartos) ----------
  const MIN_KEYS = [[2, 0], [8, 10], [14, 40], [19, 55], [25, 75], [PANIC - 0.01, 84], [PANIC, 100], [GT, 106]];
  const minutes = (t) => { if (t < 2) return -1; for (let i = 1; i < MIN_KEYS.length; i++) if (t <= MIN_KEYS[i][0]) { const [a, va] = MIN_KEYS[i - 1], [b, vb] = MIN_KEYS[i]; return Math.floor(lerp(va, vb, (t - a) / (b - a))); } return 106; };
  const hhmm = (t) => { const m = 300 + minutes(t); return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`; };

  // ---------- distância corrida (cenário rolando) ----------
  const runV = (t) => 430 * smooth(seg(t, STREET0, STREET0 + 0.4)) * (1 - smooth(seg(t, 13.3, 13.9)));
  const RUNTAB = []; { let d = 0; for (let i = 0; i <= 40 * 120; i++) { RUNTAB.push(d); d += runV(i / 120) / 120; } }
  const runD = (t) => RUNTAB[Math.round(clamp(t, 0, 40) * 120)];
  const RUN_TOTAL = runD(14.5);
  const km = (t) => 5 * runD(t) / RUN_TOTAL;

  // ---------- poses ----------
  const LIE_L = { fT: 1.5, fS: 1.56, bT: 1.44, bS: 1.54 };
  const EDGE_L = { fT: 1.45, fS: 0.1, bT: 1.38, bS: 0.04 };
  const SEAT_L = { fT: 1.45, fS: 0.02, bT: 1.38, bS: -0.06 };
  const LX = 340;
  const lie = (extra) => () => { const hy = MT - 16; return Object.assign({ x: LX, hipY: hy, ay: MT, lean: -1.5, head: -0.16, legs: LIE_L, hands: [[LX - 46, hy - 30], [LX - 66, hy - 26]], prefF: 'down', prefB: 'down', grounded: false, face: 1, gesture: false, noWalk: true }, extra || {}); };
  const reach = () => { const st = lie()(); st.hands = [toRig(st, [PHONE[0], PHONE[1] - 4]), st.hands[1]]; st.lean = -1.38; st.head = -0.05; return st; };
  // segurando o celular em cima do rosto
  const scroll = (tap) => (t) => { const hy = MT - 16; const th = tap ? 6 * Math.max(0, Math.sin(t * 9)) : 2 * Math.sin(t * 5); return Object.assign(lie()(), { head: -0.32, lean: -1.46, hands: [[LX - 120, hy - 96 + th], [LX - 132, hy - 92]], prefF: 'down', prefB: 'down' }); };
  const sitUp = (x = LX) => () => { const hy = MT - 16; return { x, hipY: hy, ay: MT, lean: 0.08, head: 0.1, legs: LIE_L, hands: [[x + 18, MT - 6], [x - 4, MT - 4]], prefF: 'back', prefB: 'back', grounded: false, face: 1, gesture: false, noWalk: true }; };
  const edge = (x) => () => pose(x, FL, EDGE_L, 0.12, 0.05, [[x + 26, hipOn(FL, EDGE_L) + 6], [x + 4, hipOn(FL, EDGE_L) + 8]], { noWalk: true, gesture: false });
  const stand = (x, face = 1, extra) => () => pose(x, FL, STAND_L, 0.03, 0.02, handsDown(x, HY), Object.assign({ face }, extra || {}));
  const walkTo = (x0, x1, t0, t1, face = 1, run = 0) => (t) => { const x = lerp(x0, x1, easeInOut(seg(t, t0, t1))); return pose(x, FL, STAND_L, run ? 0.1 : 0.04, 0.02, handsDown(x, HY), { face, run }); };
  // sentado na cadeira (olhando para a mesa)
  const SEAT_HY = hipOn(FL, SEAT_L);
  const seat = (lean, head, hands, extra) => () => Object.assign({ x: CHAIR, hipY: SEAT_HY, ay: FL, lean, head, legs: SEAT_L, hands, prefF: 'down', prefB: 'down', grounded: false, face: 1, noWalk: true, gesture: false }, extra || {});
  const W2R = (x, y, st) => toRig(st || { x: CHAIR, ay: FL, face: 1 }, [x, y]);   // ponto do mundo -> boneco sentado
  // flexão (corpo reto, mãos fixas)
  const push = (X, face, t0, per) => (t) => {
    const th = lerp(0.14, 0.42, 0.5 + 0.5 * Math.cos(((t - t0) / per) * Math.PI * 2));
    const toe = [X - 135, FL - 10];
    const hip = [toe[0] + 160 * Math.cos(th), toe[1] - 160 * Math.sin(th)];
    const sh = [hip[0] + 100 * Math.cos(th), hip[1] - 100 * Math.sin(th)];
    const a = -(Math.PI / 2 - th);
    return { x: hip[0], ax: X, hipY: hip[1], ay: FL, lean: Math.PI / 2 - th, head: -0.35, legs: { fT: a, fS: a, bT: a - 0.03, bS: a - 0.03 },
      hands: [[sh[0] + 6, FL - 13], [sh[0] - 6, FL - 13]], prefF: 'back', prefB: 'back', grounded: false, face, gesture: false, noWalk: true };
  };
  const STX = 430;   // posição do faz na rua (o cenário que anda)
  const runStreet = (t) => pose(STX, FL, STAND_L, 0.12, -0.05, handsDown(STX, HY), { run: 1, runDist: runD(t) });

  // pontos do mundo usados pelas mãos
  const GLASS = [800, TOP - 18];
  const MOUTH_ST = [768, FL - 180];
  const PLATE = [822, TOP - 6], CUP = [868, TOP - 14];
  const MOUTH_SEAT = [CHAIR + 22, FL - 140];
  const BOOK = [CHAIR + 62, FL - 118];

  // ---------- 2 · FAZ ----------
  const DRINK0 = 5.0, DRINK1 = 6.6, EAT0 = 20.6, EAT1 = 24.9, READ0 = 25.3, READ1 = 29.8;
  const forkPhase = (t) => 0.5 - 0.5 * Math.cos(((t - EAT0) / 1.1) * Math.PI * 2);   // 0 = prato, 1 = boca
  const fazKeys = [
    [0, lie()],
    [2.25, reach, 0.22],
    [2.5, sitUp(), 0.32],
    [3.05, edge(BED1 - 15), 0.38],
    [3.55, stand(640), 0.32],
    [3.9, walkTo(640, 752, 3.9, 4.6), 0.25],
    [4.6, () => { const st = pose(752, FL, STAND_L, 0.12, 0.1, handsDown(752, HY)); st.hands = [toRig(st, GLASS), st.hands[1]]; st.prefF = 'down'; return st; }, 0.3],   // pega o copo
    [DRINK0, (t) => { const st = pose(752, FL, STAND_L, -0.12, -0.42 * smooth(seg(t, DRINK0, DRINK0 + 0.4)), handsDown(752, HY)); st.hands = [toRig(st, MOUTH_ST), st.hands[1]]; st.prefF = 'down'; st.gesture = false; return st; }, 0.35],
    [DRINK1, () => { const st = pose(752, FL, STAND_L, 0.12, 0.1, handsDown(752, HY)); st.hands = [toRig(st, GLASS), st.hands[1]]; return st; }, 0.3],
    [7.0, walkTo(752, 1180, 7.0, 8.0, 1, 1), 0.2],
    // RUA
    [STREET0, runStreet, 0.01],
    [13.9, () => pose(STX, FL, CROUCH_L, 0.5, -0.2, [[STX + 60, HY + 70], [STX + 40, HY + 72]], { noWalk: true, gesture: false, runDist: runD(13.9) }), 0.3],  // ofegante
    [14.3, push(520, 1, PUSH0, PUSHP), 0.3],
    [18.85, () => pose(560, FL, STAND_L, -0.08, -0.15, [[560 + 40, HY - 250], [560 - 20, HY + 20]], { gesture: false }), 0.15],
    // VOLTA PARA CASA
    [STREET1, walkTo(1150, CHAIR, STREET1, 20.0, -1), 0.01],
    [20.0, seat(0.15, 0.2, [[CHAIR + 60, SEAT_HY - 30], [CHAIR + 40, SEAT_HY - 20]]), 0.35],
    [EAT0, (t) => { const st = seat(0.25, 0.25, [[0, 0], [0, 0]])(); const u = forkPhase(t); st.hands = [P2(W2R(PLATE[0] - 6, PLATE[1] - 10), W2R(MOUTH_SEAT[0], MOUTH_SEAT[1]), u), W2R(PLATE[0] - 30, PLATE[1] - 4)]; st.lean = lerp(0.35, 0.12, u); st.head = lerp(0.35, -0.05, u); return st; }, 0.3],
    [23.4, (t) => { const st = seat(0.1, -0.2, [[0, 0], [0, 0]])(); st.hands = [W2R(MOUTH_SEAT[0] + 6, MOUTH_SEAT[1] + 4), W2R(PLATE[0] - 30, PLATE[1] - 4)]; return st; }, 0.3],   // gole de café
    [24.1, (t) => { const st = seat(0.25, 0.25, [[0, 0], [0, 0]])(); const u = forkPhase(t); st.hands = [P2(W2R(PLATE[0] - 6, PLATE[1] - 10), W2R(MOUTH_SEAT[0], MOUTH_SEAT[1]), u), W2R(PLATE[0] - 30, PLATE[1] - 4)]; st.lean = lerp(0.35, 0.12, u); st.head = lerp(0.35, -0.05, u); return st; }, 0.3],
    [READ0, (t) => { const st = seat(-0.05, 0.28, [[0, 0], [0, 0]])(); st.hands = [W2R(BOOK[0] + 8, BOOK[1]), W2R(BOOK[0] - 6, BOOK[1] + 4)]; return st; }, 0.4],
    [30.0, stand(CHAIR + 10), 0.4],
    [30.5, () => pose(CHAIR + 10, FL, STAND_L, -0.08, -0.15, [[CHAIR + 50, HY - 250], [CHAIR - 10, HY + 20]], {}), 0.25],
  ];
  const fazState = (t) => seq(fazKeys, t);
  const fazLoc = (t) => (t >= STREET0 && t < STREET1 ? 'rua' : 'casa');

  // ---------- 1 · PENSA DEMAIS ----------
  const holding = (t) => t >= 4.6 && t < 17.6;          // celular na mão
  const scrolling = (t) => (t >= 5.0 && t < 8.9) || (t >= 10.8 && t < 15.9);
  const pensaKeys = [[0, lie()], [2.35, reach, 0.3], [2.75, lie({ head: -0.3 }), 0.4],
    [4.6, reach, 0.3], [5.0, scroll(false), 0.45],
    [RINGS_P[1] + 0.2, scroll(true), 0.15], [RINGS_P[1] + 0.8, scroll(false), 0.2],
    [RINGS_P[2] + 0.2, scroll(true), 0.15], [17.4, lie({ head: -0.25 }), 0.6],
    [RINGS_P[3] + 0.35, reach, 0.3], [RINGS_P[3] + 0.75, lie({ head: -0.3 }), 0.4],
    [PANIC, sitUp(), 0.14],
    [PANIC + 0.4, edge(BED1 - 15), 0.2],
    [PANIC + 0.7, stand(640), 0.18],
    [PANIC + 0.85, walkTo(640, 785, PANIC + 0.85, PANIC + 1.4, 1, 1), 0.12],
    [PANIC + 1.45, () => { const st = pose(785, FL, STAND_L, 0.3, 0.15, handsDown(785, HY)); st.hands = [toRig(st, [PLATE[0] + 10, PLATE[1] - 8]), st.hands[1]]; return st; }, 0.15],   // pega o pão
    [PANIC + 1.8, stand(785, -1, { gesture: false }), 0.15],
    [PANIC + 1.95, walkTo(785, 420, PANIC + 1.95, PANIC + 2.75, -1, 1), 0.12],
    [PANIC + 2.8, stand(420, 1, { gesture: false }), 0.15],
    [PANIC + 2.95, walkTo(420, 880, PANIC + 2.95, PANIC + 3.6, 1, 1), 0.12],
    [PANIC + 3.65, () => pose(880, FL, CROUCH_L, 0.55, -0.1, [[880 + 60, HY + 74], [880 + 40, HY + 76]], { gesture: false, noWalk: true }), 0.25],
  ];
  const pensaState = (t) => { const st = seq(pensaKeys, t); if (t > PANIC + 3.65) st.hipY += 5 * Math.sin(t * 16); return st; };
  const snoozes = (t) => RINGS_P.filter((r) => t > r + 0.5).length;
  const phoneMin = (t) => { let s = 0; for (const [a, b] of [[5.0, 8.9], [10.8, 15.9]]) s += clamp(t, a, b) - a; return Math.round(s * 4.6); };
  const ringing = (k, t) => { const rs = k === 'faz' ? [2.0] : RINGS_P; for (const x of rs) if (t >= x && t < x + 0.45) return 1; return 0; };

  // ---------- câmera (foco no que cada um está fazendo) ----------
  const camTrack = (keys) => (t) => {
    let v = { x: keys[0][1], y: keys[0][2], z: keys[0][3] };
    for (let i = 1; i < keys.length; i++) { const [kt, x, y, z, d] = keys[i]; if (t < kt) break; const u = easeInOut(seg(t, kt, kt + (d || 0.7))); v = { x: lerp(v.x, x, u), y: lerp(v.y, y, u), z: lerp(v.z, z, u) }; }
    return v;
  };
  const CAM = {
    faz: camTrack([[0, 540, 200, 1], [4.4, 745, 185, 1.55], [6.75, 620, 200, 1.05], [STREET0, 480, 195, 1.08, 0.01], [14.2, 470, 240, 1.45], [STREET1, 640, 200, 1, 0.01], [20.2, 770, 185, 1.5], [25.2, 750, 175, 1.55], [29.9, 640, 200, 1.05]]),
    pensa: camTrack([[0, 540, 200, 1], [5.1, 300, 170, 1.75], [8.7, 420, 190, 1.2], [10.7, 300, 170, 1.75], [15.8, 420, 195, 1.15], [PANIC - 0.4, 540, 200, 1.0, 0.3]]),
  };

  // ---------- cenários ----------
  function drawRoom(c, k, t, P) {
    const h = P.h;
    const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#17100c'); g.addColorStop(0.7, '#2c2018'); g.addColorStop(1, '#201710');
    c.fillStyle = g; c.fillRect(-300, -100, W + 600, h + 200);
    c.strokeStyle = 'rgba(0,0,0,0.22)'; c.lineWidth = 3; for (let x = -280; x < W + 300; x += 96) { c.beginPath(); c.moveTo(x, -100); c.lineTo(x, FL); c.stroke(); }
    const dawn = smooth(seg(t, 2.0, GT));
    // janela sobre a mesa
    c.save(); c.fillStyle = '#4a3524'; c.fillRect(730, 30, 200, 120); c.strokeStyle = OUT; c.lineWidth = 5; c.strokeRect(730, 30, 200, 120);
    const wg = c.createLinearGradient(0, 36, 0, 144); wg.addColorStop(0, rgb(mixC([20, 24, 44], [120, 140, 190], dawn))); wg.addColorStop(1, rgb(mixC([34, 30, 50], [255, 190, 120], dawn)));
    c.fillStyle = wg; c.fillRect(736, 36, 188, 108);
    c.fillStyle = rgb(mixC([235, 235, 220], [255, 220, 150], dawn)); c.beginPath(); c.arc(890, lerp(60, 128, dawn), lerp(9, 18, dawn), 0, Math.PI * 2); c.fill();
    c.strokeStyle = 'rgba(0,0,0,0.45)'; c.lineWidth = 4; c.beginPath(); c.moveTo(830, 36); c.lineTo(830, 144); c.stroke(); c.restore();
    c.save(); c.globalCompositeOperation = 'lighter'; c.filter = 'blur(18px)'; c.fillStyle = rgb(PAL.luz, 1, 0.04 + 0.14 * dawn);
    c.beginPath(); c.moveTo(736, 50); c.lineTo(924, 50); c.lineTo(880, FL + 40); c.lineTo(560, FL + 40); c.closePath(); c.fill(); c.restore();
    // porta
    c.fillStyle = '#0c0806'; c.fillRect(985, 60, 110, FL - 60); c.strokeStyle = OUT; c.lineWidth = 5; c.strokeRect(985, 60, 110, FL - 60);
    // cama
    c.fillStyle = '#5a3c26'; c.strokeStyle = OUT; c.lineWidth = 4;
    c.fillRect(BED0 - 18, MT - 90, 22, FL - MT + 90); c.strokeRect(BED0 - 18, MT - 90, 22, FL - MT + 90);
    c.fillRect(BED0, MT + 16, BED1 - BED0, FL - MT - 30); c.strokeRect(BED0, MT + 16, BED1 - BED0, FL - MT - 30);
    c.fillRect(BED1 - 14, MT + 16, 16, FL - MT - 16); c.strokeRect(BED1 - 14, MT + 16, 16, FL - MT - 16);
    c.fillStyle = '#d9cdb8'; c.beginPath(); c.roundRect(BED0, MT - 2, BED1 - BED0, 20, 8); c.fill(); c.stroke();
    c.fillStyle = '#efe6d6'; c.beginPath(); c.roundRect(BED0 + 6, MT - 22, 80, 24, 10); c.fill(); c.stroke();
    // celular na cama (quando não está na mão)
    const inHand = k === 'pensa' && holding(t);
    if (!inHand) {
      const rg = ringing(k, t);
      c.save(); c.translate(PHONE[0] + rg * 2.5 * Math.sin(t * 90), PHONE[1]);
      c.fillStyle = '#16161a'; c.beginPath(); c.roundRect(-16, -5, 32, 9, 3); c.fill(); c.stroke();
      if (rg) { c.save(); c.globalCompositeOperation = 'lighter'; c.fillStyle = 'rgba(160,210,255,0.55)'; c.filter = 'blur(6px)'; c.beginPath(); c.arc(0, -4, 22, 0, Math.PI * 2); c.fill(); c.restore();
        c.strokeStyle = 'rgba(230,240,250,0.9)'; c.lineWidth = 3; for (const s of [-1, 1]) for (let i = 1; i <= 2; i++) { c.beginPath(); c.arc(0, -4, 12 + i * 9, s > 0 ? -0.9 : Math.PI - 0.5, s > 0 ? -0.2 : Math.PI + 0.2); c.stroke(); } }
      c.restore();
    }
    // cadeira e mesa
    c.fillStyle = '#5a3c26'; c.strokeStyle = OUT; c.lineWidth = 4;
    c.fillRect(CHAIR - 40, FL - 64, 70, 12); c.strokeRect(CHAIR - 40, FL - 64, 70, 12);
    c.fillRect(CHAIR - 44, FL - 150, 12, 150); c.strokeRect(CHAIR - 44, FL - 150, 12, 150);
    c.fillRect(CHAIR + 18, FL - 52, 10, 52); c.strokeRect(CHAIR + 18, FL - 52, 10, 52);
    c.fillStyle = '#6b4a30'; c.fillRect(TABLE0, TOP, TABLE1 - TABLE0, 14); c.strokeRect(TABLE0, TOP, TABLE1 - TABLE0, 14);
    for (const lx of [TABLE0 + 8, TABLE1 - 20]) { c.fillRect(lx, TOP + 14, 12, FL - TOP - 14); c.strokeRect(lx, TOP + 14, 12, FL - TOP - 14); }
    // piso
    c.fillStyle = '#241911'; c.fillRect(-300, FL, W + 600, h); c.strokeStyle = 'rgba(0,0,0,0.5)'; c.lineWidth = 4; c.beginPath(); c.moveTo(-300, FL); c.lineTo(W + 300, FL); c.stroke();
  }
  function drawStreet(c, k, t, P) {
    const h = P.h, d = runD(t);
    const day = smooth(seg(t, STREET0, STREET1));
    const sky = c.createLinearGradient(0, -100, 0, FL); sky.addColorStop(0, rgb(mixC([40, 44, 70], [110, 130, 180], day))); sky.addColorStop(1, rgb(mixC([120, 80, 70], [255, 190, 120], day)));
    c.fillStyle = sky; c.fillRect(-300, -100, W + 600, FL + 100);
    // sol nascendo
    c.save(); c.globalCompositeOperation = 'lighter'; c.filter = 'blur(10px)'; c.fillStyle = 'rgba(255,200,120,0.5)'; c.beginPath(); c.arc(820, lerp(250, 120, day), 70, 0, Math.PI * 2); c.fill(); c.restore();
    c.fillStyle = '#ffd08a'; c.beginPath(); c.arc(820, lerp(250, 120, day), 34, 0, Math.PI * 2); c.fill();
    // prédios ao fundo (lentos)
    const rr = mulberry32(5);
    const bld = []; for (let i = 0; i < 30; i++) bld.push([i * 130 + rr() * 40, 90 + rr() * 120, 90 + rr() * 50]);
    c.fillStyle = 'rgba(40,28,24,0.85)';
    for (const [bx, bh, bw] of bld) { const x = ((bx - d * 0.25) % 3900 + 3900) % 3900 - 300; c.fillRect(x, FL - 30 - bh, bw, bh + 30);
      c.fillStyle = 'rgba(255,210,140,0.35)'; for (let wy = FL - bh; wy < FL - 40; wy += 26) for (let wx = x + 12; wx < x + bw - 14; wx += 22) if (((wx * 7 + wy * 3) | 0) % 5) c.fillRect(wx, wy, 8, 12); c.fillStyle = 'rgba(40,28,24,0.85)'; }
    // árvores e postes (mesma velocidade do chão)
    for (let i = 0; i < 14; i++) {
      const x = ((i * 320 - d) % 4480 + 4480) % 4480 - 300;
      if (i % 2) { c.fillStyle = '#3a2a1c'; c.strokeStyle = OUT; c.lineWidth = 4; c.fillRect(x, FL - 120, 16, 120); c.strokeRect(x, FL - 120, 16, 120);
        c.fillStyle = '#2f4a2c'; c.beginPath(); c.arc(x + 8, FL - 150, 50, 0, Math.PI * 2); c.fill(); c.stroke(); }
      else { c.strokeStyle = OUT; c.lineWidth = 8; c.beginPath(); c.moveTo(x, FL); c.lineTo(x, FL - 200); c.lineTo(x + 40, FL - 200); c.stroke(); c.fillStyle = '#ffe2a8'; c.beginPath(); c.arc(x + 40, FL - 192, 9, 0, Math.PI * 2); c.fill(); }
    }
    // calçada com juntas rolando
    c.fillStyle = '#4a3a30'; c.fillRect(-300, FL, W + 600, h); c.strokeStyle = 'rgba(0,0,0,0.45)'; c.lineWidth = 3;
    for (let x = -((d % 110) + 110) - 300; x < W + 300; x += 110) { c.beginPath(); c.moveTo(x, FL); c.lineTo(x - 26, h); c.stroke(); }
    c.strokeStyle = OUT; c.lineWidth = 4; c.beginPath(); c.moveTo(-300, FL); c.lineTo(W + 300, FL); c.stroke();
    // linhas de velocidade
    const v = runV(t); if (v > 50) { c.strokeStyle = `rgba(255,240,220,${0.25 * v / 430})`; c.lineWidth = 3; for (let i = 0; i < 6; i++) { const y = 120 + i * 28, x = ((i * 173 - d * 1.6) % 900 + 900) % 900; c.beginPath(); c.moveTo(x, y); c.lineTo(x + 60, y); c.stroke(); } }
  }
  function drawBack(c, k, t, P) { if (k === 'faz' && fazLoc(t) === 'rua') drawStreet(c, k, t, P); else drawRoom(c, k, t, P); }

  // objetos na frente: cobertor, copo, prato, livro, celular, pão
  function drawFront(c, k, t, P, drawn) {
    const home = !(k === 'faz' && fazLoc(t) === 'rua');
    if (home) {
      // cobertor
      const inBed = k === 'faz' ? 1 - smooth(seg(t, 2.5, 3.1)) : 1 - smooth(seg(t, PANIC, PANIC + 0.5));
      c.save(); c.fillStyle = '#7a3f34'; c.strokeStyle = OUT; c.lineWidth = 4;
      const x0 = lerp(BED0 + 175, BED0 + 230, 1 - inBed), top = MT - lerp(2, 20, inBed);
      c.beginPath(); c.moveTo(x0, MT + 18); c.quadraticCurveTo(x0 - 6, top - 6, x0 + 40, top);
      c.quadraticCurveTo(x0 + 140, top - 6 * inBed, BED1 - 4, MT - 2); c.lineTo(BED1 + 6, MT + 40); c.lineTo(x0 + 10, MT + 40); c.closePath(); c.fill(); c.stroke(); c.restore();
      // copo d'água (faz bebe; o do pensa fica cheio na mesa)
      const held = k === 'faz' && t >= 4.75 && t < 6.85;
      const level = k === 'faz' ? 1 - smooth(seg(t, DRINK0 + 0.3, DRINK1)) : 1;
      const gp = held ? drawn.main.hand : GLASS, tilt = held ? -1.1 * smooth(seg(t, DRINK0, DRINK0 + 0.4)) * (1 - smooth(seg(t, DRINK1 - 0.2, DRINK1))) : 0;
      c.save(); c.translate(gp[0] + (held ? 4 : 0), gp[1] + (held ? -6 : 0)); c.rotate(tilt);
      c.fillStyle = 'rgba(120,180,230,0.85)'; const wh = 30 * level; c.fillRect(-10, 16 - wh, 20, wh);
      c.strokeStyle = 'rgba(240,245,250,0.95)'; c.lineWidth = 3.5; c.beginPath(); c.moveTo(-12, -16); c.lineTo(-10, 16); c.lineTo(10, 16); c.lineTo(12, -16); c.stroke(); c.restore();
      // café da manhã: ovos, pão e café que vão sumindo
      const eaten = k === 'faz' ? smooth(seg(t, EAT0 + 0.5, EAT1)) : (t > PANIC + 1.5 ? 0.25 : 0);
      c.fillStyle = '#efe6d6'; c.strokeStyle = OUT; c.lineWidth = 3.5; c.beginPath(); c.ellipse(PLATE[0], PLATE[1] + 4, 34, 7, 0, 0, Math.PI * 2); c.fill(); c.stroke();
      if (eaten < 0.95) { const s = 1 - eaten; c.fillStyle = '#fff'; c.beginPath(); c.ellipse(PLATE[0] - 10, PLATE[1] - 2, 13 * s, 5 * s, 0, 0, Math.PI * 2); c.fill(); c.fillStyle = '#f2b52e'; c.beginPath(); c.arc(PLATE[0] - 10, PLATE[1] - 4, 4.5 * s, 0, Math.PI * 2); c.fill();
        if (!(k === 'pensa' && t > PANIC + 1.5)) { c.fillStyle = '#c98a4a'; c.beginPath(); c.roundRect(PLATE[0] + 6, PLATE[1] - 12, 18 * s + 4, 14, 4); c.fill(); c.stroke(); } }
      const sipping = k === 'faz' && t >= 23.6 && t < 24.0; const cp = sipping ? add(drawn.main.hand, [6, -6]) : CUP;
      c.fillStyle = '#e8dcc6'; c.beginPath(); c.roundRect(cp[0] - 10, cp[1] - 12, 20, 24, 3); c.fill(); c.stroke();
      if (k === 'faz' && t > 20 && t < 25) { c.strokeStyle = 'rgba(240,230,220,0.5)'; c.lineWidth = 3; for (let i = 0; i < 2; i++) { c.beginPath(); for (let j = 0; j < 8; j++) { const yy = CUP[1] - 16 - j * 5, xx = CUP[0] - 4 + i * 8 + 3 * Math.sin(t * 2 + j * 0.7 + i); if (!j) c.moveTo(xx, yy); else c.lineTo(xx, yy); } c.stroke(); } }
      // garfo na mão
      if (k === 'faz' && t >= EAT0 && t < READ0 && !(t >= 23.4 && t < 24.1)) { const hp = drawn.main.hand; c.strokeStyle = '#d8d8dc'; c.lineWidth = 3; c.beginPath(); c.moveTo(hp[0] + 2, hp[1]); c.lineTo(hp[0] + 16, hp[1] - 10); c.stroke(); }
      // livro aberto, página virando
      if (k === 'faz' && t >= READ0 + 0.2 && t < 30.1) {
        const bp = drawn.main.hand; c.save(); c.translate(bp[0] - 4, bp[1] - 6);
        c.fillStyle = '#2f6fb3'; c.strokeStyle = OUT; c.lineWidth = 4; c.beginPath(); c.moveTo(-26, -20); c.lineTo(0, -14); c.lineTo(26, -20); c.lineTo(26, 14); c.lineTo(0, 20); c.lineTo(-26, 14); c.closePath(); c.fill(); c.stroke();
        c.fillStyle = '#f4ead8'; c.beginPath(); c.moveTo(-22, -17); c.lineTo(0, -11); c.lineTo(22, -17); c.lineTo(22, 11); c.lineTo(0, 17); c.lineTo(-22, 11); c.closePath(); c.fill();
        c.strokeStyle = 'rgba(0,0,0,0.3)'; c.lineWidth = 2; for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(-18, -8 + i * 6); c.lineTo(-4, -5 + i * 6); c.moveTo(4, -5 + i * 6); c.lineTo(18, -8 + i * 6); c.stroke(); }
        const fp = ((t - READ0) % 1.1) / 0.35; if (fp < 1) { const ang = Math.PI * easeInOut(fp); c.fillStyle = '#fffaf0'; c.beginPath(); c.moveTo(0, -11); c.lineTo(22 * Math.cos(ang), -17 + 2 * Math.sin(ang)); c.lineTo(22 * Math.cos(ang), 11); c.lineTo(0, 17); c.closePath(); c.fill(); c.strokeStyle = 'rgba(0,0,0,0.35)'; c.stroke(); }
        c.restore();
      }
      // celular na mão do pensa demais, com o feed rolando e a luz azul no rosto
      if (k === 'pensa' && holding(t)) {
        const hp = drawn.main.hand, rg = ringing(k, t);
        c.save(); c.translate(hp[0] - 2 + rg * 2 * Math.sin(t * 90), hp[1] - 14);
        c.save(); c.globalCompositeOperation = 'lighter'; c.filter = 'blur(14px)'; c.fillStyle = rg ? 'rgba(255,200,160,0.5)' : 'rgba(120,170,255,0.45)'; c.beginPath(); c.ellipse(-6, 18, 36, 26, 0, 0, Math.PI * 2); c.fill(); c.restore();
        c.fillStyle = '#111'; c.strokeStyle = OUT; c.lineWidth = 3; c.beginPath(); c.roundRect(-13, -22, 26, 44, 5); c.fill(); c.stroke();
        c.save(); c.beginPath(); c.rect(-10, -18, 20, 36); c.clip(); c.fillStyle = '#20242c'; c.fillRect(-10, -18, 20, 36);
        const off = scrolling(t) ? (t * 38) % 24 : 0;
        const cols = ['#e5483b', '#f2a23a', '#2f9bff', '#e8c547', '#4fbf6a', '#b85cff'];
        for (let i = -1; i < 3; i++) { const y = -18 + i * 24 - off + 24; c.fillStyle = cols[((i + Math.floor((t * 38) / 24)) % 6 + 6) % 6]; c.fillRect(-8, y, 16, 14); c.fillStyle = 'rgba(255,255,255,0.7)'; c.fillRect(-8, y + 16, 12, 2); }
        if (rg) { c.fillStyle = 'rgba(255,255,255,0.92)'; c.fillRect(-10, -18, 20, 36); c.fillStyle = '#e5483b'; c.font = '800 7px Montserrat'; c.textAlign = 'center'; c.fillText('ALARME', 0, 2); }
        c.restore(); c.restore();
      }
      // pão na boca do pensa demais atrasado
      if (k === 'pensa' && t > PANIC + 1.75) { const hd = drawn.main.head, f = drawn.main.st.face < 0 ? -1 : 1; c.save(); c.translate(hd[0] + 20 * f, hd[1] + 6); c.rotate(0.2 * f); c.fillStyle = '#c98a4a'; c.strokeStyle = OUT; c.lineWidth = 3; c.beginPath(); c.roundRect(-4, -7, 22 * f, 14, 4); c.fill(); c.stroke(); c.restore(); }
      // Z z z
      const sleeping = k === 'faz' ? t < 2.0 : (t < PANIC && !holding(t) && !RINGS_P.some((r) => t > r - 0.1 && t < r + 1.6));
      if (sleeping) { const hd = drawn.main.head; for (let i = 0; i < 3; i++) { const a = (t * 0.55 + i / 3) % 1; c.save(); c.globalAlpha = Math.sin(Math.PI * a) * 0.9; c.fillStyle = '#e8dcc6'; c.font = `800 ${16 + 12 * a}px Montserrat, sans-serif`; c.textAlign = 'center'; c.fillText('Z', hd[0] + 20 + a * 50, hd[1] - 20 - a * 70 + 6 * Math.sin(t * 3 + i)); c.restore(); } }
    }
    // suor na corrida e depois
    if (k === 'faz' && t > 11 && t < 20.5) { const hd = drawn.main.head; for (let i = 0; i < 3; i++) { const a = ((t * 1.4 + i / 3) % 1); c.fillStyle = `rgba(200,230,255,${0.9 * (1 - a)})`; c.beginPath(); c.arc(hd[0] - 16 - i * 7, hd[1] - 10 + a * 40, 4.5, 0, Math.PI * 2); c.fill(); } }
  }

  // ---------- painel: placas e listinha do que cada um já fez (coordenadas de tela) ----------
  function pill(c, x, y, txt, col, ok, sc = 1, big = false) {
    c.save(); c.translate(x, y); c.scale(sc, sc);
    c.font = `700 ${big ? 26 : 18}px "Space Mono", monospace`; const tw = c.measureText(txt).width; const ic = ok === null ? 0 : 24, hh = big ? 40 : 30;
    c.beginPath(); c.roundRect(0, -hh / 2, tw + ic + 24, hh, hh / 2); c.fillStyle = 'rgba(15,10,7,0.88)'; c.fill(); c.lineWidth = 3; c.strokeStyle = rgb(col); c.stroke();
    if (ok === true) { c.strokeStyle = rgb(PAL.faz); c.lineWidth = 4; c.beginPath(); c.moveTo(12, 0); c.lineTo(17, 6); c.lineTo(27, -6); c.stroke(); }
    if (ok === false) { c.strokeStyle = rgb(PAL.dor); c.lineWidth = 4; c.beginPath(); c.moveTo(13, -6); c.lineTo(25, 6); c.moveTo(25, -6); c.lineTo(13, 6); c.stroke(); }
    c.fillStyle = rgb(col); c.textAlign = 'left'; c.textBaseline = 'middle'; c.fillText(txt, 12 + ic, 1); c.restore();
  }
  const DONE = [[6.75, 'ÁGUA'], [13.95, '5 KM'], [18.85, `${PUSHN} FLEXÕES`], [24.95, 'CAFÉ DA MANHÃ'], [29.85, 'LEITURA']];
  function drawOverlay(c, k, t, P, drawn, toS) {
    if (t > GT) return;
    // relógio fixo no canto do painel (sempre legível, mesmo com a câmera de perto)
    { const late = k === 'pensa' && t >= PANIC; const blink = late ? (Math.floor(t * 4) % 2 ? 1 : 0.4) : 1; const pop = late ? 1 + 0.3 * Math.exp(-(t - PANIC) * 8) : 1;
      c.save(); c.translate(870, 40); c.scale(pop, pop);
      c.fillStyle = 'rgba(12,8,6,0.9)'; c.strokeStyle = late ? rgb(PAL.dor) : 'rgba(255,214,160,0.6)'; c.lineWidth = 3; c.beginPath(); c.roundRect(-74, -24, 148, 48, 10); c.fill(); c.stroke();
      c.fillStyle = late ? rgb(PAL.dor, 1, blink) : rgb([255, 120, 90]); c.font = '800 34px "Space Mono", monospace'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText(t < 2.0 ? '04:59' : hhmm(t), 0, 2); c.restore(); }
    if (k === 'faz') {
      DONE.forEach(([t0, txt], i) => { if (t >= t0) pill(c, 18, 74 + i * 36, txt, PAL.faz, true, backE(seg(t, t0, t0 + 0.3))); });
      // contador de km na rua
      if (t >= STREET0 && t < 14.3) { const hs = toS(drawn.main.head); pill(c, clamp(hs[0] + 70, 300, 760), 52, `${km(t).toFixed(1).replace('.', ',')} KM`, PAL.faz, null, 1, true); }
      // contagem das flexões
      if (t >= PUSH0 && t < 18.85) { const n = clamp(Math.floor((t - PUSH0) / PUSHP) + 1, 1, PUSHN); const age = (t - PUSH0) % PUSHP; pill(c, 520, 52, `FLEXÃO ${n}`, PAL.faz, null, 1 + 0.25 * Math.exp(-age * 14), true); }
      // páginas lidas
      if (t >= READ0 + 0.2 && t < 30.0) { const n = Math.min(10, Math.floor((t - READ0) / 1.1) * 2 + 2); pill(c, 520, 52, `PÁGINA ${n}`, PAL.ouro, null, 1, true); }
      // corte de cena (flash)
      for (const tc of [STREET0, STREET1]) { const a = t - tc; if (a >= 0 && a < 0.25) { c.fillStyle = `rgba(255,245,230,${0.7 * (1 - a / 0.25)})`; c.fillRect(0, 0, W, P.h); } }
    } else {
      const n = snoozes(t), m = phoneMin(t);
      let y = 74;
      if (n > 0) { const t0 = RINGS_P[n - 1] + 0.5; pill(c, 18, y, `SONECAS: ${n}`, PAL.dor, false, backE(seg(t, t0, t0 + 0.3))); y += 36; }
      if (m > 0) pill(c, 18, y, `NO CELULAR: ${m} MIN`, PAL.pensa, false, 1);
    }
  }

  // ---------- cartão final 2: a manhã de cada um ----------
  const R2 = 35.5;
  function drawReport2(c, t, inU) {
    const u = easeOut(seg(t, R2 - 0.3, R2 + 0.3)); if (u <= 0) return;
    const x0 = 40, x1 = 935, top = 520, h = 680;
    c.save(); c.globalAlpha = u; c.translate(0, 30 * (1 - u));
    c.beginPath(); c.roundRect(x0, top, x1 - x0, h, 26); c.fillStyle = 'rgba(22,15,10,0.96)'; c.fill(); c.lineWidth = 4; c.strokeStyle = rgb(PAL.luz, 0.8); c.stroke();
    c.font = '700 26px "Space Mono", monospace'; c.fillStyle = rgb(PAL.luz); c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(`A MANHÃ DE CADA UM · 05:00 → ${hhmm(GT)}`, (x0 + x1) / 2, top + 50);
    const colX = [x0 + 34, (x0 + x1) / 2 + 14];
    c.textAlign = 'left'; c.font = '700 24px "Space Mono", monospace';
    c.fillStyle = rgb(PAL.pensa); c.fillText('1 · PENSA DEMAIS', colX[0], top + 110);
    c.fillStyle = rgb(PAL.faz); c.fillText('2 · FAZ', colX[1], top + 110);
    const itemsP = [['ÁGUA', false], ['CORRIDA', false], ['FLEXÕES', false], ['CAFÉ DA MANHÃ', false], ['LEITURA', false], ['4 SONECAS', null], [`${phoneMin(GT)} MIN NO CELULAR`, null]];
    const itemsF = [['ÁGUA', true], ['CORRIDA 5 KM', true], [`${PUSHN} FLEXÕES`, true], ['CAFÉ DA MANHÃ', true], ['LEITURA', true]];
    const row = (items, x, d0) => items.forEach(([txt, ok], i) => { const t0 = R2 + 0.3 + d0 + i * 0.16; if (t < t0) return; const s = backE(seg(t, t0, t0 + 0.25));
      c.save(); c.translate(x, top + 170 + i * 62); c.scale(s, s);
      if (ok === true) { c.strokeStyle = rgb(PAL.faz); c.lineWidth = 6; c.beginPath(); c.moveTo(0, 0); c.lineTo(9, 10); c.lineTo(26, -10); c.stroke(); }
      else if (ok === false) { c.strokeStyle = rgb(PAL.dor); c.lineWidth = 6; c.beginPath(); c.moveTo(2, -10); c.lineTo(22, 10); c.moveTo(22, -10); c.lineTo(2, 10); c.stroke(); }
      else { c.fillStyle = rgb(PAL.dor); c.beginPath(); c.arc(12, 0, 7, 0, Math.PI * 2); c.fill(); }
      c.fillStyle = ok === false ? 'rgba(255,255,255,0.4)' : '#fff'; c.font = '800 25px Montserrat, sans-serif'; c.textAlign = 'left'; c.textBaseline = 'middle'; c.fillText(txt, 40, 1);
      if (ok === false) { c.strokeStyle = 'rgba(255,255,255,0.4)'; c.lineWidth = 2; const tw = c.measureText(txt).width; c.beginPath(); c.moveTo(40, 1); c.lineTo(40 + tw, 1); c.stroke(); }
      c.restore(); });
    row(itemsP, colX[0], 0); row(itemsF, colX[1], 0.08);
    c.strokeStyle = 'rgba(255,255,255,0.12)'; c.lineWidth = 2; c.beginPath(); c.moveTo((x0 + x1) / 2, top + 90); c.lineTo((x0 + x1) / 2, top + h - 40); c.stroke();
    c.restore();
  }

  // ---------- índice de cansaço ----------
  const painFaz = (t) => {
    let p = 50 + spike(t, 2.0, 45, 1.3);
    p = lerp(p, 30, smooth(seg(t, 3.5, 5.0)));
    p += 10 * smooth(seg(t, STREET0, 9)) * (1 - smooth(seg(t, 13.9, 15))) + 3 * Math.sin(t * 5) * (t > STREET0 && t < 14);
    p = lerp(p, 18, smooth(seg(t, 15, 19)));
    return lerp(p, 6 + 1.5 * Math.sin(t * 2), smooth(seg(t, 20.5, 25)));
  };
  const painPensa = (t) => {
    let p = 50 + 26 * smooth(seg(t, 2, PANIC)) + 3 * Math.sin(t * 2.2);
    for (const r of RINGS_P) p += spike(t, r, 26, 1.4);
    p += spike(t, PANIC, 40, 0.6);
    return Math.min(100, lerp(p, 88 + 6 * Math.sin(t * 6), smooth(seg(t, PANIC + 1.5, PANIC + 2.5))));
  };

  const SCENE = {
    metricLabel: 'ÍNDICE DE CANSAÇO', totalLabel: 'CANSAÇO TOTAL', reportT: GT, bubbleMaxX: 780, report2T: R2, drawReport2,
    secsText: (n) => `${n} SEGUNDO${n > 1 ? 'S' : ''} NO VERMELHO`,
    state: { faz: fazState, pensa: pensaState },
    drawBack, drawFront, drawOverlay,
    cam: (k, t) => CAM[k](t),
    pain: { faz: painFaz, pensa: painPensa },
    bubbles: {
      faz: [
        { t0: 2.75, t1: 3.6, text: 'BORA.', col: PAL.faz },
        { t0: 30.6, t1: 31.9, text: 'BOM DIA!', col: PAL.faz },
      ],
      pensa: [
        { t0: RINGS_P[0] + 0.7, t1: RINGS_P[0] + 1.9, text: 'SÓ MAIS 5...' },
        { t0: 6.0, t1: 7.4, text: 'SÓ VOU VER UMA COISA...' },
        { t0: RINGS_P[1] + 0.6, t1: RINGS_P[1] + 1.9, text: 'AMANHÃ EU COMEÇO...' },
        { t0: 12.6, t1: 14.0, text: 'KKKKKK' },
        { t0: RINGS_P[2] + 0.6, t1: RINGS_P[2] + 1.9, text: 'HOJE TÁ FRIO...' },
        { t0: RINGS_P[3] + 0.7, t1: RINGS_P[3] + 1.9, text: 'SÓ MAIS 5...' },
        { t0: PANIC + 0.1, t1: PANIC + 1.3, text: 'ATRASADO!!', col: PAL.dor },
        { t0: PANIC + 1.9, t1: PANIC + 2.9, text: 'CADÊ A CHAVE?!', col: PAL.dor },
        { t0: PANIC + 3.7, t1: GT - 0.05, text: 'TÔ MORTO...' },
      ],
    },
    shake: (k, t) => (k === 'pensa' ? 8 * (t >= PANIC ? Math.exp(-(t - PANIC) * 6) : 0) + (ringing(k, t) ? 1.5 : 0) : (ringing(k, t) ? 1.5 : 0)),
    energy: (k, t) => (k === 'pensa' && t > PANIC ? 2.0 : k === 'faz' && t > STREET0 && t < 20 ? 1.4 : 1),
    caps: [
      { s: -1, e: 2.85, lines: [[-1, [['5 DA MANHÃ.']]], [0.3, [['DOIS JEITOS DE '], ['ACORDAR.', 'dor']]]] },
      { s: 3.0, e: 4.6, lines: [[3.0, [['QUEM '], ['FAZ', 'faz']]], [3.3, [['LEVANTA NO 1º TOQUE.']]]] },
      { s: 4.7, e: 6.9, lines: [[4.7, [['PRIMEIRO:']]], [5.0, [['UM COPO '], ["D'ÁGUA.", 'faz']]]] },
      { s: 7.0, e: 9.4, lines: [[7.0, [['QUEM '], ['PENSA DEMAIS', 'pensa']]], [7.4, [['PEGA O CELULAR.']]]] },
      { s: 9.5, e: 12.2, lines: [[9.5, [['UM CORRE '], ['5 KM.', 'faz']]], [9.9, [['O OUTRO ROLA O FEED.']]]] },
      { s: 12.3, e: 14.3, lines: [[12.3, [['SONECA.']]], [12.6, [['FEED. '], ['SONECA.', 'dor']]]] },
      { s: 14.4, e: 18.8, lines: [[14.4, [['FLEXÕES', 'faz']]], [14.7, [['ANTES DO SOL NASCER.']]]] },
      { s: 19.0, e: 22.0, lines: [[19.0, [['CAFÉ DA MANHÃ']]], [19.35, [['SEM '], ['PRESSA.', 'faz']]]] },
      { s: 22.1, e: 25.0, lines: [[22.1, [['ENQUANTO ISSO...']]], [22.5, [['4ª '], ['SONECA.', 'dor']]]] },
      { s: 25.1, e: 27.9, lines: [[25.1, [['10 PÁGINAS', 'faz']]], [25.45, [['ANTES DAS 7.']]]] },
      { s: 28.0, e: 31.9, lines: [[28.0, [['E QUEM '], ['PENSA DEMAIS', 'pensa']]], [28.4, [['ACORDA '], ['ATRASADO.', 'dor']]]] },
      { s: 32.1, e: 35.3, big: true, lines: [[32.2, [['A SONECA']]], [32.6, [['NÃO '], ['DESCANSA.', 'dor']]]] },
      { s: 35.5, e: 99, big: true, lines: [[35.5, [['A MANHÃ']]], [35.85, [['DECIDE O '], ['DIA.', 'faz']]]] },
    ],
    sched: { noBips: true, music: 0.45, fx: [
      // FAZ (direita)
      [2.0, 'ring', 0.14, 0.35], [2.45, 'foley/cloth_04', 0.4, 0.35], [2.55, 'foley/cloth_02', 0.35, 0.35], [3.6, 'exhale', 0.2, 0.35],
      [5.1, 'foley/gole_1', 0.7, 0.35], [5.55, 'foley/gole_2', 0.7, 0.35], [6.0, 'foley/gole_1', 0.7, 0.35], [6.65, 'exhale', 0.25, 0.35], [6.8, 'foley/copo_mesa', 0.6, 0.35],
      [7.0, 'foley/cloth_05', 0.35, 0.35], [7.6, 'foley/porta', 0.6, 0.35], [STREET0, 'swish', 0.25, 0.35], [STREET0, 'birds', 0.12, 0.35],
      [13.95, 'voz_faz/grunt5', 0.35, 0.35], [STREET1, 'swish', 0.25, 0.35], [STREET1 + 0.1, 'foley/porta', 0.5, 0.35],
      [20.05, 'foley/cadeira', 0.55, 0.35], [21.0, 'foley/talher_1', 0.5, 0.35], [22.1, 'foley/talher_2', 0.45, 0.35], [23.45, 'foley/gole_cafe', 0.6, 0.35], [24.3, 'foley/talher_3', 0.45, 0.35],
      [30.05, 'foley/cadeira', 0.55, 0.35], [30.4, 'foley/cloth_06', 0.3, 0.35],
      ...Array.from({ length: PUSHN }, (_, i) => [PUSH0 + i * PUSHP + PUSHP * 0.5, 'voz_faz/grunt' + (1 + (i % 3)), 0.22, 0.35]),
      ...Array.from({ length: 5 }, (_, i) => [READ0 + 0.2 + i * 1.1, 'foley/pagina_' + (1 + (i % 2)), 0.5, 0.35]),
      // PENSA DEMAIS (esquerda)
      ...RINGS_P.map((r) => [r, 'ring', 0.16, -0.35]), ...RINGS_P.map((r) => [r + 0.5, 'foley/toque_tela', 0.6, -0.35]),
      [4.6, 'foley/cloth_07', 0.3, -0.35], [17.4, 'foley/cloth_03', 0.3, -0.35],
      ...Array.from({ length: 16 }, (_, i) => [5.2 + i * 0.24, 'scroll', 0.1, -0.35]), ...Array.from({ length: 20 }, (_, i) => [10.9 + i * 0.25, 'scroll', 0.1, -0.35]),
      [PANIC, 'bigring', 0.18, -0.35], [PANIC, 'thud', 0.22, -0.35], [PANIC + 0.08, 'voz_pensa/dor_17', 0.6, -0.35], [PANIC + 0.4, 'foley/cloth_01', 0.35, -0.35],
      [PANIC + 1.5, 'foley/talher_2', 0.5, -0.35], [PANIC + 3.7, 'voz_pensa/dor_14', 0.5, -0.35], [PANIC + 4.0, 'voz_pensa/dor_15', 0.45, -0.35],
    ], heartReal: [[PANIC, GT, -0.35]] },
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
  const CAPS = SCENE.caps;
  const capEl = document.getElementById('cap');
  const capLines = capEl ? [capEl.querySelector('.l1'), capEl.querySelector('.l2')] : [];
  const WSTEP = 0.11;
  const wordsOf = (segs) => { const out = []; for (const [txt, col] of segs) for (const w of txt.split(' ')) if (w) out.push([w, col || '']); return out; };
  function renderCaptions(t) {
    if (!capEl) return;
    const cap = CAPS.find((cc) => t >= cc.s && t < cc.e) || null;
    if (!cap) { capEl.style.opacity = '0'; return; }
    capEl.style.opacity = String(1 - smooth(seg(t, cap.e - 0.15, cap.e)));
    capEl.className = cap.big ? 'cap big' : 'cap';
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
