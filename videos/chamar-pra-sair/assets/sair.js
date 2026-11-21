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
    const vx = ((st.x - pa.x) / 0.05) * face;
    const sp = Math.abs(vx);
    // atraso (follow-through): mãos e cabeça chegam um pouco depois do corpo
    st.hands = [P2(st.hands[0], pb.hands[0], 0.38), P2(st.hands[1], pb.hands[1], 0.45)];
    st.head = lerp(st.head, pb.head, 0.45) - (st.lean - pb.lean) * 0.6;
    const moving = st.noWalk ? 0 : smooth(clamp((sp - 20) / 110));
    if (moving > 0.001) {
      const run = st.run ?? clamp((sp - 260) / 260);
      const stride = lerp(150, 270, run);
      const ph = ((st.x * face) / stride) * Math.PI * 2 + (st.phase0 || 0);
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
  const toRig = (st, Q) => { const f = st.face || 1; return [st.x + (Q[0] - st.x) / (SC * f), st.ay + (Q[1] - st.ay) / SC]; };
  const spike = (t, t0, a, k) => (t >= t0 ? a * Math.exp(-(t - t0) * k) : 0);
  const bump = (t, a, b, h) => h * smooth(seg(t, a, a + 0.4)) * (1 - smooth(seg(t, b - 0.2, b + 0.6)));

  // ================= ROTEIRO: "A PERGUNTA" (chamar pra sair) — índice de ansiedade =================
  const FL = 300;
  const HY = hipOn(FL, STAND_L);
  const idle = (x, face = 1, extra) => () => pose(x, FL, STAND_L, 0.03, 0.02, handsDown(x, HY), Object.assign({ face }, extra || {}));
  const walk = (x0, x1, t0, t1, face = 1, extra) => (t) => { const x = lerp(x0, x1, easeInOut(seg(t, t0, t1))); return pose(x, FL, STAND_L, 0.04, 0.02, handsDown(x, HY), Object.assign({ face, run: 0 }, extra || {})); };
  const run = (x0, x1, t0, t1, face = 1) => (t) => { const x = lerp(x0, x1, easeInOut(seg(t, t0, t1))); return pose(x, FL, STAND_L, 0.1, -0.05, handsDown(x, HY), { face, run: 1 }); };

  // copo de café na mão da frente
  const cup = (c, R) => { const h = R.armF[2]; c.save(); c.translate(h[0] + 6, h[1] - 6); c.lineWidth = 5; c.strokeStyle = OUT;
    c.fillStyle = '#e8dcc6'; c.beginPath(); c.moveTo(-15, -26); c.lineTo(15, -26); c.lineTo(11, 22); c.lineTo(-11, 22); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = rgb(PAL.azul); c.fillRect(-14, -8, 28, 14); c.strokeRect(-14, -8, 28, 14);
    c.fillStyle = '#5a3a24'; c.fillRect(-18, -34, 36, 9); c.strokeRect(-18, -34, 36, 9); c.restore(); };

  // ---------- 2 · FAZ ----------
  const FX0 = 200, FX1 = 615;
  const fazKeys = [
    [0, idle(FX0)],
    [2.3, () => pose(FX0, FL, CROUCH_L, 0.25, 0.1, [[FX0 + 50, HY + 10], [FX0 - 20, HY + 20]], { sq: 0.04 }), 0.25],   // respira fundo, antecipação
    [2.75, walk(FX0, FX1, 2.75, 4.5), 0.3],
    [4.5, idle(FX1, 1, { hipOff: 0 }), 0.35],
    [6.05, () => pose(FX1, FL, STAND_L, -0.08, -0.15, [[FX1 + 40, HY - 250], [FX1 - 20, HY + 20]], { prefF: 'down' }), 0.2],   // comemora
    [6.75, idle(FX1), 0.4],
    [11.4, () => pose(FX1, FL, STAND_L, -0.12, -0.2, [[FX1 + 30, HY - 20], [FX1 - 10, HY - 10]]), 0.25],   // risada
    [12.5, idle(FX1), 0.4],
    [15.5, idle(FX1, 1), 0.3],
    [15.85, walk(FX1, 1260, 15.85, 18.9, 1), 0.3],
  ];
  const fazState = (t) => {
    const st = seq(fazKeys, t);
    if (t > 11.4 && t < 12.5) st.hipY -= 6 * Math.abs(Math.sin((t - 11.4) * 14));
    return st;
  };
  // pessoa (azul) no painel do FAZ
  const CX = 830;
  const crushIdle = (x, face) => () => pose(x, FL, STAND_L, -0.02, 0.06, [[x + 34, HY - 72], [x + 4, HY + 42]], { face, armFree: 0.25, prop: cup, gesture: false });
  const crushSip = (x, face) => () => pose(x, FL, STAND_L, -0.08, -0.22, [[x + 30, HY - 150], [x + 4, HY + 42]], { face, armFree: 0.25, prop: cup, gesture: false });
  const crushHop = (x, face) => () => pose(x, FL, STAND_L, -0.1, -0.2, [[x + 34, HY - 90], [x + 40, HY - 230]], { face, armFree: 0.25, prop: cup, gesture: false, prefB: 'down' });
  const crushFaz = [
    [0, crushIdle(CX, -1)], [1.0, crushSip(CX, -1), 0.35], [1.8, crushIdle(CX, -1), 0.45],
    [5.9, crushHop(CX, -1), 0.2], [6.7, crushIdle(CX, -1), 0.4],
    [9.0, crushSip(CX, -1), 0.35], [9.5, crushIdle(CX, -1), 0.4],
    [12.6, () => pose(CX, FL, STAND_L, 0.12, 0.25, [[CX + 40, HY - 40], [CX + 10, HY - 20]], { face: -1, armFree: 0.25, prop: cup, gesture: false }), 0.25],
    [13.5, crushIdle(CX, -1), 0.4],
    [15.35, crushIdle(CX, 1), 0.3],
    [15.8, walk(CX, 1420, 15.8, 18.9, 1, { prop: cup, armFree: 0.4 }), 0.3],
  ];
  const crushFazState = (t) => { const st = seq(crushFaz, t); if (t > 5.9 && t < 6.5) st.hipY -= 26 * Math.sin(Math.PI * seg(t, 5.9, 6.25)) * (t < 6.25 ? 1 : 0); return st; };

  // ---------- 1 · PENSA DEMAIS ----------
  const think = (x, face = 1) => () => pose(x, FL, STAND_L, 0.02, 0.2, handsChin(x, HY), { face, gesture: false });
  const nervous = (x) => (t) => pose(x + 2 * Math.sin(t * 41), FL, CROUCH_L.fT ? { fT: 0.25, fS: -0.12, bT: 0.05, bS: -0.2 } : STAND_L, 0.16, 0.3, [[x + 30 + 4 * Math.sin(t * 47), HY - 92], [x + 14 - 4 * Math.sin(t * 43), HY - 86]], { gesture: false, noWalk: true });
  const slump = (x) => () => pose(x, FL, { fT: 0.12, fS: -0.08, bT: -0.04, bS: -0.1 }, 0.32, 0.5, [[x + 30, HY + 62], [x + 14, HY + 66]], { gesture: false });
  const pensaKeys = [
    [0, think(200)],
    [3.8, walk(200, 400, 3.8, 4.85)],
    [4.85, () => pose(400, FL, STAND_L, -0.18, -0.12, [[400 + 30, HY - 40], [400 - 30, HY - 30]], { gesture: false }), 0.22],   // freia
    [5.45, idle(400, -1, { gesture: false }), 0.28],
    [5.75, walk(400, 190, 5.75, 6.85, -1)],
    [6.9, idle(190, -1), 0.3],
    [7.1, idle(190, 1), 0.28],   // vira e ensaia
    [9.15, walk(190, 450, 9.15, 10.2)],
    [10.2, nervous(450), 0.3],
    [11.45, idle(450, -1, { gesture: false }), 0.28],
    [11.75, walk(450, 260, 11.75, 12.75, -1)],
    [12.8, think(260, -1), 0.3],
    [13.25, think(260, 1), 0.3],
    [14.85, () => pose(260, FL, CROUCH_L, 0.35, 0.05, [[260 + 50, HY + 20], [260 - 30, HY + 30]], { sq: 0.05, gesture: false }), 0.2],
    [15.15, run(260, 680, 15.15, 16.2), 0.2],
    [16.2, () => pose(680, FL, STAND_L, -0.2, -0.1, [[680 + 40, HY - 60], [680 - 20, HY - 40]], { gesture: false }), 0.22],
    [16.75, slump(680), 0.6],
  ];
  const pensaState = (t) => seq(pensaKeys, t);
  const crushPensa = [
    [0, crushIdle(CX, -1)], [1.0, crushSip(CX, -1), 0.35], [1.8, crushIdle(CX, -1), 0.45],
    [7.6, crushSip(CX, -1), 0.35], [8.2, crushIdle(CX, -1), 0.45],
    [13.1, () => pose(CX, FL, STAND_L, 0.08, 0.35, [[CX + 34, HY - 72], [CX + 30, HY - 70]], { face: -1, armFree: 0.25, prop: cup, gesture: false }), 0.3],  // olha o relógio
    [14.0, crushIdle(CX, -1), 0.3],
    [14.3, crushIdle(CX, 1), 0.3],
    [14.6, walk(CX, 1350, 14.6, 17.0, 1, { prop: cup, armFree: 0.4 }), 0.3],
  ];
  const crushPensaState = (t) => seq(crushPensa, t);

  // ---------- cenário: café ----------
  function drawBack(c, k, t, P) {
    const h = P.h;
    const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#1b130e'); g.addColorStop(0.7, '#33251b'); g.addColorStop(1, '#241a13');
    c.fillStyle = g; c.fillRect(-60, -40, W + 120, h + 80);
    // lambris
    c.fillStyle = 'rgba(0,0,0,0.18)'; c.fillRect(-60, FL - 90, W + 120, 90);
    c.strokeStyle = 'rgba(0,0,0,0.28)'; c.lineWidth = 3;
    for (let x = -40; x < W + 60; x += 84) { c.beginPath(); c.moveTo(x, FL - 90); c.lineTo(x, FL); c.stroke(); }
    // janela com a rua (luz quente)
    c.save(); c.fillStyle = '#4a3524'; c.fillRect(330, 40, 300, 150); c.strokeStyle = OUT; c.lineWidth = 5; c.strokeRect(330, 40, 300, 150);
    const wg = c.createLinearGradient(0, 40, 0, 190); wg.addColorStop(0, '#6d5136'); wg.addColorStop(1, '#3a2a1c'); c.fillStyle = wg; c.fillRect(336, 46, 288, 138);
    c.strokeStyle = 'rgba(0,0,0,0.4)'; c.lineWidth = 4; c.beginPath(); c.moveTo(480, 46); c.lineTo(480, 184); c.moveTo(336, 115); c.lineTo(624, 115); c.stroke(); c.restore();
    // letreiro CAFÉ pintado no vidro
    c.fillStyle = 'rgba(232,220,198,0.85)'; c.font = '900 34px Montserrat, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('CAFÉ', 480, 150);
    // feixe de luz âmbar
    c.save(); c.globalCompositeOperation = 'lighter'; c.filter = 'blur(16px)';
    const bx = 620; const bg = c.createLinearGradient(0, 0, 0, h); bg.addColorStop(0, rgb(PAL.luz, 1, 0.2)); bg.addColorStop(1, rgb(PAL.luz, 1, 0.04));
    c.fillStyle = bg; c.beginPath(); c.moveTo(bx - 40, -20); c.lineTo(bx + 40, -20); c.lineTo(bx + 300, h); c.lineTo(bx - 260, h); c.closePath(); c.fill(); c.restore();
    c.fillStyle = '#e9cf9e'; c.beginPath(); c.ellipse(620, 8, 46, 9, 0, 0, Math.PI * 2); c.fill();
    // mesinha
    c.strokeStyle = OUT; c.lineWidth = 4; c.fillStyle = '#6b4a30';
    c.fillRect(940, FL - 70, 110, 12); c.strokeRect(940, FL - 70, 110, 12); c.fillRect(988, FL - 58, 12, 58); c.strokeRect(988, FL - 58, 12, 58);
    // piso
    c.fillStyle = '#2a1d14'; c.fillRect(-60, FL, W + 120, h); c.strokeStyle = 'rgba(0,0,0,0.5)'; c.lineWidth = 4; c.beginPath(); c.moveTo(-60, FL); c.lineTo(W + 60, FL); c.stroke();
    c.strokeStyle = 'rgba(255,214,160,0.06)'; c.lineWidth = 2; for (let x = -40; x < W + 60; x += 120) { c.beginPath(); c.moveTo(x, FL + 4); c.lineTo(x - 40, h); c.stroke(); }
  }
  function heart(c, x, y, s, a) {
    c.save(); c.globalAlpha = a; c.translate(x, y); c.scale(s, s);
    c.beginPath(); c.moveTo(0, 12); c.bezierCurveTo(-26, -8, -14, -30, 0, -14); c.bezierCurveTo(14, -30, 26, -8, 0, 12); c.closePath();
    c.fillStyle = rgb(PAL.dor); c.fill(); c.lineWidth = 4; c.strokeStyle = OUT; c.stroke(); c.restore();
  }
  function drawFront(c, k, t, P, drawn) {
    if (k === 'faz') {
      for (const [t0, x, dy] of [[6.0, 730, 0], [6.15, 690, 30], [6.3, 770, 20], [9.5, 735, 10], [12.7, 720, 0]]) {
        const a = t - t0; if (a < 0 || a > 1.6) continue;
        heart(c, x + 10 * Math.sin(a * 5), 160 + dy - 70 * easeOut(a / 1.6), 0.9 * backE(a / 0.3), 1 - smooth(seg(a, 1.1, 1.6)));
      }
    } else if (t > 16.6) {
      // nuvem de chuva em cima do pensa demais
      const hd = drawn.main.head, u = backE(seg(t, 16.6, 17.0));
      c.save(); c.translate(hd[0], hd[1] - 70); c.scale(u, u);
      c.fillStyle = '#5b5560'; c.strokeStyle = OUT; c.lineWidth = 4;
      c.beginPath(); c.arc(-26, 4, 20, 0, Math.PI * 2); c.arc(0, -8, 26, 0, Math.PI * 2); c.arc(28, 4, 20, 0, Math.PI * 2); c.fill(); c.stroke();
      c.fillRect(-40, 4, 82, 20);
      c.strokeStyle = 'rgba(160,200,235,0.9)'; c.lineWidth = 3;
      for (let i = 0; i < 6; i++) { const a = ((t * 2.2 + i * 0.37) % 1); const xx = -34 + i * 14; c.beginPath(); c.moveTo(xx, 26 + a * 70); c.lineTo(xx - 3, 38 + a * 70); c.stroke(); }
      c.restore();
    }
  }

  // ---------- índice de ansiedade ----------
  const painFaz = (t) => { const p = 8 + 46 * smooth(seg(t, 2.3, 4.6)) + 30 * smooth(seg(t, 4.6, 5.1)); return lerp(p, 4 + 1.5 * Math.sin(t * 3), smooth(seg(t, 5.95, 6.5))); };
  const painPensa = (t) => {
    let p = 18 + 30 * smooth(seg(t, 0, 14)) + 4 * Math.sin(t * 2.7);
    p += bump(t, 3.8, 5.3, 26) + bump(t, 7.2, 9.0, 10) + bump(t, 9.3, 11.5, 36) + bump(t, 15.1, 16.4, 16);
    return lerp(p, 93 + 3 * Math.sin(t * 5), smooth(seg(t, 16.2, 16.9)));
  };

  const BLUE = PAL.azul;
  const SCENE = {
    metricLabel: 'ÍNDICE DE ANSIEDADE', totalLabel: 'ANSIEDADE TOTAL', reportT: 19.0,
    secsText: (n) => `${n} SEGUNDO${n > 1 ? 'S' : ''} NO VERMELHO`,
    state: { faz: fazState, pensa: pensaState },
    others: { faz: [{ id: 'other', fn: crushFazState, col: BLUE, seed: 21, glow: 0.35 }], pensa: [{ id: 'other', fn: crushPensaState, col: BLUE, seed: 23, glow: 0.35 }] },
    drawBack, drawFront,
    pain: { faz: painFaz, pensa: painPensa },
    bubbles: {
      faz: [
        { t0: 2.4, t1: 2.95, text: 'BORA.', col: PAL.faz, y: 50 },
        { t0: 4.65, t1: 5.85, text: 'OI! BORA UM CAFÉ?', y: 50 },
        { t0: 5.9, t1: 7.0, text: 'BORA!', col: PAL.faz, who: 'other', y: 50 },
        { t0: 8.0, t1: 9.0, text: 'SÁBADO?', y: 50 },
        { t0: 9.25, t1: 10.4, text: 'FECHADO!', col: PAL.faz, who: 'other', y: 50 },
        { t0: 11.4, t1: 12.4, text: 'HAHAHA', y: 50 },
        { t0: 12.6, t1: 13.5, text: 'HAHA', who: 'other', y: 50 },
      ],
      pensa: [
        { t0: 2.5, t1: 3.7, text: 'E SE DISSER NÃO?', y: 50 },
        { t0: 4.95, t1: 5.95, text: 'NÃO... AINDA NÃO.', col: PAL.dor, y: 50 },
        { t0: 7.3, t1: 8.0, text: 'OI...', y: 50 },
        { t0: 8.1, t1: 9.0, text: 'NÃO. E AÍ?...', y: 50 },
        { t0: 10.35, t1: 11.35, text: 'VAI... VAI...', col: PAL.dor, y: 50 },
        { t0: 12.85, t1: 14.3, text: 'ESPERAR A HORA CERTA.', y: 50 },
        { t0: 14.9, t1: 15.7, text: 'AGORA VAI!', col: PAL.pensa, y: 50 },
        { t0: 16.5, t1: 18.6, text: '...FOI EMBORA.', col: PAL.dor, y: 50, dx: 320 },
      ],
    },
    shake: (k, t) => (k === 'pensa' ? 6 * (t >= 16.25 ? Math.exp(-(t - 16.25) * 8) : 0) : 0),
    energy: (k, t) => (k === 'pensa' && t > 9.3 && t < 11.4 ? 2.2 : 1),
    caps: [
      { s: -1, e: 2.85, lines: [[-1, [['UMA PERGUNTA SIMPLES.']]], [0.3, [['DOIS JEITOS DE '], ['FAZER.', 'dor']]]] },
      { s: 3.0, e: 5.5, lines: [[3.0, [['QUEM '], ['FAZ', 'faz']]], [3.3, [['VAI E PERGUNTA.']]]] },
      { s: 5.6, e: 8.0, lines: [[5.6, [['A RESPOSTA CHEGA']]], [5.95, [['EM '], ['2 SEGUNDOS.', 'faz']]]] },
      { s: 8.1, e: 10.5, lines: [[8.1, [['QUEM '], ['PENSA DEMAIS', 'pensa']]], [8.5, [['ENSAIA. RECUA. ENSAIA.']]]] },
      { s: 10.6, e: 13.2, lines: [[10.6, [['ESPERANDO O']]], [10.95, [['MOMENTO PERFEITO.']]]] },
      { s: 13.3, e: 15.8, lines: [[13.3, [['SÓ QUE O MOMENTO']]], [13.7, [['NÃO '], ['ESPERA.', 'dor']]]] },
      { s: 15.9, e: 18.9, lines: [[15.9, [['A ANSIEDADE']]], [16.3, [['VIROU '], ['ARREPENDIMENTO.', 'dor']]]] },
      { s: 19.1, e: 21.7, big: true, lines: [[19.2, [['A RESPOSTA LEVA']]], [19.6, [['2 '], ['SEGUNDOS.', 'faz']]]] },
      { s: 21.8, e: 99, big: true, lines: [[21.8, [['A DÚVIDA']]], [22.15, [['LEVA '], ['ANOS.', 'dor']]]] },
    ],
    sched: { fx: [[2.3, 'whoosh', 0.18, 0.35], [5.9, 'chime', 0.2, 0.35], [6.05, 'pop', 0.2, 0.35], [9.5, 'pop', 0.12, 0.35], [12.7, 'pop', 0.12, 0.35],
      [4.7, 'beep', 0.12, 0.35], [10.2, 'beep', 0.12, -0.35], [10.45, 'beep', 0.1, -0.35], [14.85, 'whoosh', 0.2, -0.35], [16.25, 'thud', 0.25, -0.35], [16.5, 'sad', 0.22, -0.35], [16.65, 'rain', 0.1, -0.35]],
      heart: [3.0, 19.0] },
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
    const fx = st.x, fy = st.ay;
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
    // câmera de mão: deriva lenta e leve zoom
    const cz = 1.03 + 0.012 * Math.sin(t * 0.37 + (k === 'faz' ? 1 : 0));
    const cx = 540 + 10 * noise(t * 0.25, k === 'faz' ? 2 : 5), cy = 200 + 6 * noise(t * 0.3, k === 'faz' ? 8 : 1);
    c.save(); c.translate(540, 200); c.scale(cz, cz); c.translate(-cx, -cy);
    SCENE.drawBack(c, k, t, P);
    const others = (SCENE.others && SCENE.others[k]) || [];
    const drawn = {};
    for (const o of others) if (!o.front) drawn[o.id] = drawActor(c, alive(o.fn, t, { seed: o.seed, talk: TALK[k].other, energy: o.energy }), o.col, o.glow ?? 0.4, o.tint);
    const main = drawActor(c, alive(SCENE.state[k], t, { seed: k === 'faz' ? 2 : 9, talk: TALK[k].main, energy: SCENE.energy ? SCENE.energy(k, t) : 1 }), PAL[k], 0.5);
    drawn.main = main;
    for (const o of others) if (o.front) drawn[o.id] = drawActor(c, alive(o.fn, t, { seed: o.seed, talk: TALK[k].other }), o.col, o.glow ?? 0.4, o.tint);
    if (SCENE.drawFront) SCENE.drawFront(c, k, t, P, drawn);
    for (const b of SCENE.bubbles[k]) {
      const sp = drawn[(b.who || 'main') === 'main' ? 'main' : (b.whoId || 'other')] || main;
      c.font = '800 28px "Space Mono", monospace'; const bw = c.measureText(b.text).width / 2 + 22;
      const bx = clamp(b.x ?? sp.head[0] + (b.dx ?? 60), 300 + bw, 1000 - bw);
      bubble(c, bx, b.y ?? clamp(sp.head[1] - 70, 60, 300), b.text, b.col, b.t0, b.t1, t, sp.head[0]);
    }
    c.restore();
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
    const u = easeOut(seg(t, GT1 + 0.2, GT1 + 0.8)); if (u <= 0) return;
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
