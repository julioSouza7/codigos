
  // ================= ROTEIRO: "CERA QUENTE" — índice de dor, com vozes reais =================
  const FL = 300;
  const X = 300;                              // quadril de quem está sentado
  const SIT_HY = FL - 118;                    // altura do quadril (referencial do boneco)
  const LEG = { fT: 1.35, fS: 1.5, bT: 1.38, bS: 0.05 };   // perna da frente esticada no banquinho
  const KICK = { fT: 1.62, fS: 1.2, bT: 1.38, bS: 0.05 };
  const RIP_F = 3.25, RIP_P = 16.6;           // puxões de uma vez
  // fração já descolada da fita (0 = colada, 1 = arrancada)
  const peelFaz = (t) => (t < RIP_F ? 0 : clamp((t - RIP_F) / 0.1));
  const PEELS = [[5.4, 5.8, 0, 0.08], [7.2, 9.4, 0.08, 0.3], [10.8, 12.8, 0.3, 0.5], [RIP_P, RIP_P + 0.1, 0.5, 1]];
  const peelPensa = (t) => { let p = 0; for (const [a, b, p0, p1] of PEELS) if (t >= a) p = lerp(p0, p1, t < b ? (b - a > 0.3 ? smooth(seg(t, a, b)) : seg(t, a, b)) : 1); return p; };

  // geometria da canela a partir do boneco (referencial do boneco)
  const shin = (st) => {
    const hip = [st.x, st.hipY], K = add(hip, v(st.legs.fT, D.thigh)), A = add(K, v(st.legs.fS, D.shin));
    const len = Math.hypot(A[0] - K[0], A[1] - K[1]), u = [(A[0] - K[0]) / len, (A[1] - K[1]) / len], n = [u[1], -u[0]];
    return { K, A, u, n, len };
  };
  const S0 = 0.16, S1 = 0.92;                 // trecho da canela coberto pela fita
  const stripPt = (sh, s) => add(add(sh.K, [sh.u[0] * sh.len * s, sh.u[1] * sh.len * s]), [sh.n[0] * 17, sh.n[1] * 17]);
  // ponto onde a fita ainda está grudada (a fita sai do tornozelo para o joelho)
  const peelPt = (sh, p) => stripPt(sh, lerp(S1, S0, p));

  // desenho da perna depilada: pelos, fita e vermelhidão
  function legProp(peel, held, ripT, hairOnStrip) {
    return (c, R) => {
      const K = R.legF[1], A = R.legF[2];
      const len = Math.hypot(A[0] - K[0], A[1] - K[1]), u = [(A[0] - K[0]) / len, (A[1] - K[1]) / len], n = [u[1], -u[0]];
      const sh = { K, A, u, n, len };
      const at = (s, off = 17) => add(add(K, [u[0] * len * s, u[1] * len * s]), [n[0] * off, n[1] * off]);
      // vermelhidão onde já arrancou
      if (peel > 0.01) {
        const red = ripT !== null ? 0.35 + 0.65 * Math.exp(-ripT * 0.5) : 0.6;
        c.save(); c.globalAlpha = red; strokePts(c, [at(S1, 6), at(lerp(S1, S0, peel), 6)], 16, rgb(PAL.dor)); c.restore();
      }
      // pelos fora da fita e embaixo da parte ainda colada (escondidos)
      c.strokeStyle = '#2a1d14'; c.lineWidth = 3; c.lineCap = 'round';
      const hair = (s) => { const b = at(s, 14), e = add(b, [n[0] * 10 + u[0] * 5, n[1] * 10 + u[1] * 5]); c.beginPath(); c.moveTo(b[0], b[1]); c.lineTo(e[0], e[1]); c.stroke(); };
      for (let s = 0.02; s < S0; s += 0.05) hair(s);
      for (let s = S1 + 0.02; s < 1; s += 0.05) hair(s);
      // coxa peluda também
      const H = R.legF[0];
      for (let s = 0.2; s < 0.95; s += 0.09) { const b = P2(H, K, s), e = add(b, [4, -11]); c.beginPath(); c.moveTo(b[0], b[1] - 12); c.lineTo(e[0], e[1] - 12); c.stroke(); }
      // fita: parte colada
      const P = peelPt(sh, peel);
      const tape = (pts) => { strokePts(c, pts, 22 + 8, OUT); strokePts(c, pts, 22, '#f1d9cf'); };
      if (peel < 0.999) tape([at(S0), P]);
      // parte solta: vai até a mão (segurando) ou fica caída
      const Lf = len * (S1 - S0) * peel;
      if (peel >= 0.999 && !held) {   // fita arrancada largada no chão
        const f0 = [X + 230, FL - 12], f1 = [X + 330, FL - 8];
        strokePts(c, [f0, f1], 30, OUT); strokePts(c, [f0, f1], 22, '#f1d9cf');
        c.strokeStyle = '#2a1d14'; c.lineWidth = 3; for (let i = 1; i < 8; i++) { const q = P2(f0, f1, i / 8); c.beginPath(); c.moveTo(q[0] - 4, q[1] - 2); c.lineTo(q[0] + 4, q[1] + 2); c.stroke(); }
        return;
      }
      if (peel > 0.01) {
        let end;
        if (held) end = R.armF[2];
        else end = add(P, [u[0] * Lf * 0.5 + n[0] * Lf * 0.1, Lf * 0.85]);
        const free = peel >= 0.999 && held ? [end, add(end, [-Lf * 0.25, Lf * 0.95])] : [P, P2(P, end, 0.5), end];
        if (peel >= 0.999 && held) tape(free); else tape(free);
        // pelos grudados na fita arrancada
        c.strokeStyle = '#2a1d14'; c.lineWidth = 3;
        const a0 = free[0], a1 = free[free.length - 1];
        for (let i = 1; i < 8 * peel; i++) { const q = P2(a0, a1, i / (8 * peel + 1)); c.beginPath(); c.moveTo(q[0] - 4, q[1]); c.lineTo(q[0] + 4, q[1] + 3); c.stroke(); }
      }
    };
  }

  // poses sentadas
  const sit = (o) => (t) => {
    const st = Object.assign({ x: X, hipY: SIT_HY, ay: FL, lean: 0.12, head: 0.12, legs: LEG, hands: [[X + 70, SIT_HY - 26], [X + 50, SIT_HY - 22]], prefF: 'down', prefB: 'down', grounded: false, face: 1, noWalk: true, gesture: false }, o.base || {});
    if (o.f) o.f(st, t);
    return st;
  };
  const sh0 = shin({ x: X, hipY: SIT_HY, legs: LEG });
  const handAt = (p, dy = -8) => add(peelPt(sh0, p), [6, dy]);

  // ---------- 2 · FAZ ----------
  const fazKeys = [
    [0, sit({})],
    [2.45, sit({ base: { lean: 0.42, head: 0.3 }, f: (st) => { st.hands = [handAt(0, -10), [X + 60, SIT_HY - 20]]; } }), 0.35],    // pega a ponta
    [3.0, sit({ base: { lean: 0.46, head: 0.25 }, f: (st, t) => { st.hands = [handAt(0, -2), [X + 60, SIT_HY - 20]]; st.hipY += 2 * Math.sin(t * 30); } }), 0.15],  // respira e trava
    [RIP_F, sit({ base: { lean: -0.32, head: -0.35, legs: KICK, prefF: 'up' }, f: (st) => { st.hands = [[X - 20, SIT_HY - 250], [X - 60, SIT_HY - 120]]; } }), 0.09],   // ARRANCA
    [RIP_F + 0.4, sit({ base: { lean: 0.12, head: 0.3, prefF: 'up' }, f: (st, t) => { st.hands = [[X + 34, SIT_HY - 190], [X + 40, SIT_HY - 40]]; } }), 0.3],  // careta, segura a fita
    [3.95, sit({ base: { lean: 0.6, head: 0.4 }, f: (st, t) => { st.hands = [add(stripPt(sh0, 0.6), [0, -22 + 8 * Math.sin(t * 10)]), add(stripPt(sh0, 0.45), [0, -14])]; } }), 0.35],  // assopra
    [5.3, sit({ base: { lean: 0.05, head: 0.0, prefF: 'up' }, f: (st) => { st.hands = [[X + 60, SIT_HY - 200], [X + 40, SIT_HY - 22]]; } }), 0.35],   // mostra a fita
    [7.0, sit({ base: { lean: -0.2, head: -0.05, prefF: 'back', prefB: 'back' }, f: (st) => { st.hands = [[X - 30, SIT_HY - 150], [X - 44, SIT_HY - 140]]; } }), 0.5],   // relaxa
    [12.0, sit({ base: { lean: 0.0, head: 0.05, prefF: 'up' }, f: (st) => { st.hands = [[X + 70, SIT_HY - 130], [X + 50, SIT_HY - 22]]; } }), 0.35],  // joinha
    [13.2, sit({ base: { lean: -0.2, head: -0.05, prefF: 'back', prefB: 'back' }, f: (st) => { st.hands = [[X - 30, SIT_HY - 150], [X - 44, SIT_HY - 140]]; } }), 0.5],
  ];
  const fazState = (t) => {
    const st = seq(fazKeys, t);
    const p = peelFaz(t), held = t >= RIP_F && t < 7.0;
    st.prop = legProp(p, held, t >= RIP_F ? t - RIP_F : null);
    if (t > 7.0) st.legs = Object.assign({}, st.legs, { bT: 1.38 + 0.12 * Math.sin(t * 2.4) });   // balança o pé, de boa
    if (t >= RIP_F && t < RIP_F + 0.25) st.sq = -0.06 * Math.sin(Math.PI * seg(t, RIP_F, RIP_F + 0.25));
    return st;
  };

  // ---------- 1 · PENSA DEMAIS ----------
  const tremble = (st, t, a = 1) => { st.hands = st.hands.map((h, i) => add(h, [a * 3 * Math.sin(t * 43 + i), a * 3 * Math.cos(t * 39 + i)])); };
  const pull = (base) => sit({ base: Object.assign({ lean: 0.5, head: 0.4 }, base || {}), f: (st, t) => { st.hands = [handAt(peelPensa(t), -6), [X + 40, SIT_HY - 40]]; tremble(st, t, 1.3); st.hipY += 2 * Math.sin(t * 27); } });
  const pensaKeys = [
    [0, sit({ f: (st, t) => { st.hands = [add(handAt(0, -60), [0, 6 * Math.sin(t * 2)]), [X + 50, SIT_HY - 22]]; } })],   // mão no ar, hesita
    [2.4, sit({ base: { lean: 0.2, head: 0.3 }, f: (st, t) => { st.hands = [[X + 36, SIT_HY - 128], [X + 22, SIT_HY - 60]]; } }), 0.4],   // mão no queixo
    [4.9, sit({ base: { lean: 0.42, head: 0.35 }, f: (st, t) => { st.hands = [handAt(0, -6), [X + 50, SIT_HY - 30]]; tremble(st, t); } }), 0.3],
    [5.4, pull(), 0.1],
    [5.8, sit({ base: { lean: -0.18, head: -0.2 }, f: (st) => { st.hands = [[X + 30, SIT_HY - 120], [X + 10, SIT_HY - 100]]; } }), 0.12],   // solta e recua
    [6.4, sit({ base: { lean: 0.1, head: 0.2 } }), 0.4],
    [6.8, sit({ base: { lean: 0.42, head: 0.35 }, f: (st, t) => { st.hands = [handAt(0.08, -6), [X + 50, SIT_HY - 30]]; tremble(st, t); } }), 0.35],
    [7.2, pull({ lean: 0.55, head: 0.5 }), 0.2],
    [9.4, sit({ base: { lean: -0.1, head: -0.1 }, f: (st, t) => { st.hands = [add(stripPt(sh0, 0.7), [10, -50 + 14 * Math.sin(t * 16)]), [X + 10, SIT_HY - 20]]; } }), 0.25],  // abana a perna
    [10.5, sit({ base: { lean: 0.45, head: 0.4 }, f: (st, t) => { st.hands = [handAt(0.3, -6), [X + 50, SIT_HY - 30]]; tremble(st, t); } }), 0.3],
    [10.8, pull({ lean: 0.58, head: 0.55 }), 0.2],
    [12.8, sit({ base: { lean: 0.55, head: 0.7 }, f: (st, t) => { st.hands = [[X + 44, SIT_HY - 140], [X + 30, SIT_HY - 132]]; st.hipY += 3 * Math.sin(t * 11); } }), 0.35],  // chora
    [14.9, sit({ base: { lean: 0.3, head: 0.15 }, f: (st) => { st.hands = [handAt(0.5, -10), [X + 50, SIT_HY - 30]]; } }), 0.35],   // decide
    [RIP_P - 0.25, sit({ base: { lean: 0.48, head: 0.3 }, f: (st, t) => { st.hands = [handAt(0.5, -2), [X + 50, SIT_HY - 30]]; st.hipY += 2 * Math.sin(t * 30); } }), 0.15],
    [RIP_P, sit({ base: { lean: -0.32, head: -0.35, legs: KICK, prefF: 'up' }, f: (st) => { st.hands = [[X - 20, SIT_HY - 250], [X - 60, SIT_HY - 120]]; } }), 0.09],
    [RIP_P + 0.5, sit({ base: { lean: -0.25, head: -0.5, prefF: 'up' }, f: (st, t) => { st.hands = [[X + 10 + 8 * Math.sin(t * 25), SIT_HY - 240], [X - 30, SIT_HY - 150]]; } }), 0.25],
    [17.6, sit({ base: { lean: -0.42, head: -0.4 }, f: (st) => { st.hands = [[X + 10, SIT_HY + 70], [X - 20, SIT_HY + 66]]; } }), 0.5],   // desaba
  ];
  const pensaState = (t) => {
    const st = seq(pensaKeys, t);
    const p = peelPensa(t);
    const held = (t >= 5.4 && t < 5.8) || (t >= 7.2 && t < 9.4) || (t >= 10.8 && t < 12.8) || (t >= RIP_P && t < 17.6);
    st.prop = legProp(p, held, t >= RIP_P ? t - RIP_P : null);
    if (t >= RIP_P && t < RIP_P + 0.25) st.sq = -0.06 * Math.sin(Math.PI * seg(t, RIP_P, RIP_P + 0.25));
    return st;
  };

  // ---------- cenário: banheiro sépia ----------
  function drawBack(c, k, t, P) {
    const h = P.h;
    const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#1b130e'); g.addColorStop(0.7, '#33251b'); g.addColorStop(1, '#241a13');
    c.fillStyle = g; c.fillRect(-60, -40, W + 120, h + 80);
    // azulejos
    c.strokeStyle = 'rgba(0,0,0,0.22)'; c.lineWidth = 2;
    for (let y = 120; y < FL; y += 46) { c.beginPath(); c.moveTo(-60, y); c.lineTo(W + 60, y); c.stroke(); }
    for (let y = 120, r = 0; y < FL; y += 46, r++) for (let x = -60 + (r % 2) * 30; x < W + 60; x += 60) { c.beginPath(); c.moveTo(x, y); c.lineTo(x, y + 46); c.stroke(); }
    // espelho
    c.fillStyle = '#3d4a4f'; c.strokeStyle = OUT; c.lineWidth = 5; c.beginPath(); c.roundRect(640, 40, 170, 120, 14); c.fill(); c.stroke();
    c.fillStyle = 'rgba(255,255,255,0.12)'; c.beginPath(); c.moveTo(660, 60); c.lineTo(700, 60); c.lineTo(670, 140); c.lineTo(660, 140); c.closePath(); c.fill();
    // holofote
    c.save(); c.globalCompositeOperation = 'lighter'; c.filter = 'blur(16px)';
    const bx = 380; const bg = c.createLinearGradient(0, 0, 0, h); bg.addColorStop(0, rgb(PAL.luz, 1, 0.22)); bg.addColorStop(1, rgb(PAL.luz, 1, 0.05));
    c.fillStyle = bg; c.beginPath(); c.moveTo(bx - 40, -20); c.lineTo(bx + 40, -20); c.lineTo(bx + 260, h); c.lineTo(bx - 240, h); c.closePath(); c.fill(); c.restore();
    c.fillStyle = '#e9cf9e'; c.beginPath(); c.ellipse(bx, 8, 46, 9, 0, 0, Math.PI * 2); c.fill();
    // mesinha com o pote de cera (fumegando)
    c.fillStyle = '#6b4a30'; c.strokeStyle = OUT; c.lineWidth = 4;
    c.fillRect(820, FL - 92, 140, 12); c.strokeRect(820, FL - 92, 140, 12); c.fillRect(884, FL - 80, 12, 80); c.strokeRect(884, FL - 80, 12, 80);
    c.fillStyle = '#c98a3a'; c.beginPath(); c.roundRect(856, FL - 132, 68, 40, 8); c.fill(); c.stroke();
    c.fillStyle = '#e8b04a'; c.fillRect(860, FL - 128, 60, 8);
    c.strokeStyle = 'rgba(240,230,220,0.45)'; c.lineWidth = 4;
    for (let i = 0; i < 3; i++) { const ph = t * 1.5 + i * 2.1; c.beginPath(); for (let j = 0; j < 12; j++) { const yy = FL - 140 - j * 6, xx = 872 + i * 18 + 6 * Math.sin(ph + j * 0.6); if (!j) c.moveTo(xx, yy); else c.lineTo(xx, yy); } c.stroke(); }
    // banco (sob o quadril) e banquinho (sob a canela)
    c.fillStyle = '#5a3c26'; c.strokeStyle = OUT; c.lineWidth = 4;
    c.fillRect(X - 50, FL - 66, 90, 14); c.strokeRect(X - 50, FL - 66, 90, 14);
    for (const lx of [X - 44, X + 24]) { c.fillRect(lx, FL - 52, 12, 52); c.strokeRect(lx, FL - 52, 12, 52); }
    c.fillRect(X + 60, FL - 46, 64, 12); c.strokeRect(X + 60, FL - 46, 64, 12);
    for (const lx of [X + 64, X + 108]) { c.fillRect(lx, FL - 34, 10, 34); c.strokeRect(lx, FL - 34, 10, 34); }
    // piso
    c.fillStyle = '#2a1d14'; c.fillRect(-60, FL, W + 120, h); c.strokeStyle = 'rgba(0,0,0,0.5)'; c.lineWidth = 4; c.beginPath(); c.moveTo(-60, FL); c.lineTo(W + 60, FL); c.stroke();
  }
  function drawFront(c, k, t, P, drawn) {
    // linhas de impacto no puxão
    const r = k === 'faz' ? RIP_F : RIP_P;
    const a = t - r;
    if (a >= 0 && a < 0.5) {
      const hp = drawn.main.toP(stripPt(sh0, 0.55));
      c.save(); c.globalAlpha = 1 - a / 0.5; c.strokeStyle = '#fff2d8'; c.lineWidth = 5;
      for (let i = 0; i < 10; i++) { const ang = (i / 10) * Math.PI * 2 + 0.3, r0 = 26 + 90 * easeOut(a / 0.5), r1 = r0 + 26; c.beginPath(); c.moveTo(hp[0] + Math.cos(ang) * r0, hp[1] + Math.sin(ang) * r0); c.lineTo(hp[0] + Math.cos(ang) * r1, hp[1] + Math.sin(ang) * r1); c.stroke(); }
      c.restore();
    }
    // lágrimas do pensa demais
    if (k === 'pensa' && t > 12.9 && t < 15.0) {
      const hd = drawn.main.head;
      for (let i = 0; i < 4; i++) { const q = ((t * 1.8 + i / 4) % 1); c.fillStyle = `rgba(170,215,255,${0.95 * (1 - q)})`; c.beginPath(); c.arc(hd[0] + 16 + (i % 2) * 10, hd[1] + 6 + q * 70, 5, 0, Math.PI * 2); c.fill(); }
    }
    // gotinhas de suor durante os puxões lentos
    if (k === 'pensa' && ((t > 7.2 && t < 9.6) || (t > 10.8 && t < 12.9))) {
      const hd = drawn.main.head;
      for (let i = 0; i < 3; i++) { const q = ((t * 1.3 + i / 3) % 1); c.fillStyle = `rgba(200,230,255,${0.9 * (1 - q)})`; c.beginPath(); c.arc(hd[0] - 22 - i * 6, hd[1] - 14 + q * 50, 5, 0, Math.PI * 2); c.fill(); }
    }
  }

  // ---------- índice de dor ----------
  const painFaz = (t) => 4 + spike(t, RIP_F, 100, 1.9) + (t > RIP_F ? 8 * Math.exp(-(t - RIP_F) * 0.5) : 0);
  const painPensa = (t) => {
    let p = 6 + 12 * smooth(seg(t, 2, 4));           // medo antes de começar
    p += spike(t, 5.4, 38, 2.2);
    p += 46 * smooth(seg(t, 7.2, 7.6)) * (1 - smooth(seg(t, 9.4, 10.2))) + 6 * Math.sin(t * 9) * (t > 7.2 && t < 9.4);
    p += 52 * smooth(seg(t, 10.8, 11.2)) * (1 - smooth(seg(t, 12.8, 13.8))) + 6 * Math.sin(t * 9) * (t > 10.8 && t < 12.8);
    p += 14 * smooth(seg(t, 9.4, 10.0)) + 10 * smooth(seg(t, 12.8, 13.6));   // ardência que fica
    p += spike(t, RIP_P, 90, 1.6);
    return Math.min(100, p);
  };

  const SCENE = {
    metricLabel: 'ÍNDICE DE DOR', totalLabel: 'DOR TOTAL', reportT: 19.0, noReport: true,
    secsWord: (n) => `${n} SEGUNDO${n > 1 ? 'S' : ''}`,
    secsText: (n) => `${n} SEGUNDO${n > 1 ? 'S' : ''} NO VERMELHO`,
    state: { faz: fazState, pensa: pensaState },
    drawBack, drawFront,
    pain: { faz: painFaz, pensa: painPensa },
    bubbles: {
      faz: [
        { t0: 2.5, t1: 3.15, text: 'BORA.', col: PAL.faz, y: 50 },
        { t0: RIP_F + 0.05, t1: RIP_F + 0.75, text: 'AI!', col: PAL.dor, y: 50 },
        { t0: 4.0, t1: 5.0, text: 'UFA...', y: 50 },
        { t0: 5.4, t1: 6.6, text: 'PRONTO.', col: PAL.faz, y: 50 },
        { t0: 12.0, t1: 13.2, text: 'LISINHA.', col: PAL.faz, y: 50 },
      ],
      pensa: [
        { t0: 2.5, t1: 3.9, text: 'E SE DOER MUITO?', y: 50 },
        { t0: 5.45, t1: 6.3, text: 'AI!', col: PAL.dor, y: 50 },
        { t0: 6.4, t1: 7.15, text: 'VOU DEVAGARINHO...', y: 50 },
        { t0: 7.3, t1: 9.3, text: 'AI AI AI AI AI', col: PAL.dor, y: 50 },
        { t0: 10.9, t1: 12.7, text: 'UM PELO POR VEZ...', col: PAL.dor, y: 50 },
        { t0: 13.0, t1: 14.7, text: 'NÃO AGUENTO...', y: 50 },
        { t0: 14.95, t1: RIP_P - 0.05, text: 'VAI DE UMA VEZ.', col: PAL.pensa, y: 50 },
        { t0: RIP_P + 0.05, t1: RIP_P + 1.2, text: 'AI... AI...', col: PAL.dor, y: 50 },
        { t0: 18.0, t1: 18.95, text: 'DOEU EM DOBRO.', col: PAL.dor, y: 50, dx: 200 },
      ],
    },
    shake: (k, t) => { const r = k === 'faz' ? RIP_F : RIP_P; return 9 * (t >= r ? Math.exp(-(t - r) * 7) : 0) + (k === 'pensa' && ((t > 7.2 && t < 9.4) || (t > 10.8 && t < 12.8)) ? 1.2 : 0); },
    energy: (k, t) => (k === 'pensa' && t > 4.9 && t < 16.6 ? 1.6 : 1),
    caps: [
      { s: -1, e: 2.85, lines: [[-1, [['CERA QUENTE NA PERNA.']]], [0.3, [['DOIS JEITOS DE '], ['PUXAR.', 'dor']]]] },
      { s: 3.0, e: 5.5, lines: [[3.0, [['QUEM '], ['FAZ', 'faz']]], [3.3, [['PUXA DE UMA VEZ.']]]] },
      { s: 5.6, e: 8.0, lines: [[5.6, [['DÓI.']]], [5.95, [['MAS SÓ POR '], ['1 SEGUNDO.', 'faz']]]] },
      { s: 8.1, e: 10.5, lines: [[8.1, [['QUEM '], ['PENSA DEMAIS', 'pensa']]], [8.5, [['PUXA DEVAGARINHO.']]]] },
      { s: 10.6, e: 13.2, lines: [[10.6, [['UM PELO']]], [10.95, [['DE CADA '], ['VEZ.', 'dor']]]] },
      { s: 13.3, e: 15.8, lines: [[13.3, [['E A DOR']]], [13.7, [['NÃO ACABA '], ['NUNCA.', 'dor']]]] },
      { s: 15.9, e: 18.9, lines: [[15.9, [['NO FIM, PUXOU']]], [16.3, [['DE UMA VEZ '], ['IGUAL.', 'dor']]]] },
      { s: 19.1, e: 99, center: true, lines: [[19.3, [['QUEM FAZ: '], ['{faz} DE DOR.', 'faz']]], [19.9, [['PENSA DEMAIS: '], ['{pensa}.', 'dor']]]] },
    ],
    sched: {
      noBips: true, music: 0.42,
      fx: [
        // 2 · FAZ (direita): tudo entre 2,4 s e 4,9 s
        [2.45, 'foley/cloth_04', 0.45, 0.35], [2.95, 'breath_in', 0.2, 0.35],
        [RIP_F - 0.02, 'foley/velcro_03', 0.8, 0.35, 1.25], [RIP_F, 'foley/papel_rasgando', 0.35, 0.35, 1.3],
        [RIP_F + 0.12, 'voz_faz/grunt5', 0.55, 0.35], [RIP_F + 0.08, 'beep', 0.05, 0.35],
        [3.95, 'exhale', 0.28, 0.35],
        // 1 · PENSA DEMAIS (esquerda): só começa depois do gemido do faz
        [5.0, 'breath_in', 0.2, -0.35],
        [5.4, 'slowrip', 0.45, -0.35, 0.4], [5.47, 'voz_pensa/dor_10', 0.5, -0.35], [5.85, 'foley/cloth_04', 0.3, -0.35],
        [6.8, 'breath_in', 0.22, -0.35],
        [7.2, 'slowrip', 0.5, -0.35, 2.2], [7.35, 'voz_pensa/dor_02', 0.45, -0.35], [8.1, 'voz_pensa/dor_14', 0.45, -0.35], [8.9, 'voz_pensa/dor_10', 0.45, -0.35, 1.05],
        [9.5, 'fan', 0.22, -0.35], [9.75, 'voz_pensa/dor_15', 0.4, -0.35],
        [10.55, 'breath_in', 0.22, -0.35],
        [10.8, 'slowrip', 0.55, -0.35, 2.0], [11.0, 'voz_pensa/dor_02', 0.45, -0.35, 0.95], [11.8, 'voz_pensa/dor_14', 0.45, -0.35, 1.04], [12.45, 'voz_pensa/dor_10', 0.45, -0.35],
        [13.3, 'voz_pensa/dor_15', 0.35, -0.35, 1.08], [14.05, 'voz_pensa/dor_02', 0.32, -0.35, 1.12],
        [16.1, 'breath_in', 0.25, -0.35],
        [RIP_P - 0.02, 'foley/velcro_03', 0.8, -0.35, 1.25], [RIP_P, 'foley/papel_rasgando', 0.35, -0.35, 1.3],
        [RIP_P + 0.12, 'voz_pensa/dor_10', 0.55, -0.35], [RIP_P + 0.75, 'voz_pensa/dor_02', 0.45, -0.35, 1.05],
        [17.65, 'foley/cloth_02', 0.3, -0.35], [17.95, 'exhale', 0.28, -0.35],
      ],
      heartReal: [[6.6, 16.5, -0.35]], noPops: true, noOverlap: true,
    },
  };

  // ===== versão tela única com gancho (≈18 s) =====
  SCENE.edit = [
    { k: 'pensa', a: 16.45, b: 17.7, sp: 1, cap: [[['ESSA CERA DOEU']], [['{pensa}.', 'dor']]] },
    { k: 'pensa', a: 17.7, b: 2.0, sp: -26, cap: [[['COMO ELE']], [['CHEGOU AQUI?', 'pensa']]] },
    { k: 'faz', a: 2.4, b: 5.0, sp: 1.1, cap: [[['QUEM '], ['FAZ', 'faz']], [['PUXA DE UMA VEZ.']]] },
    { k: 'pensa', a: 4.9, b: 6.4, sp: 1, cap: [[['QUEM '], ['PENSA DEMAIS', 'pensa']], [['PUXA DEVAGARINHO.']]] },
    { k: 'pensa', a: 7.2, b: 9.6, sp: 1.4 },
    { k: 'pensa', a: 10.8, b: 12.8, sp: 1.6, cap: [[['UM PELO']], [['DE CADA '], ['VEZ.', 'dor']]] },
    { k: 'faz', a: 11.6, b: 13.0, sp: 1, cap: [[['ENQUANTO ISSO...']], [['PRONTO HÁ '], ['8 SEGUNDOS.', 'faz']]] },
    { k: 'pensa', a: 13.0, b: 14.6, sp: 1.6, cap: [[['E A DOR']], [['NÃO '], ['ACABA.', 'dor']]] },
    { k: 'pensa', a: 14.9, b: 17.9, sp: 1, cap: [[['NO FIM, PUXOU']], [['DE UMA VEZ '], ['IGUAL.', 'dor']]] },
    { k: 'pensa', a: 17.9, dur: 3.6, sp: 0, end: true, cap: [[['QUEM FAZ: '], ['{faz} DE DOR.', 'faz']], [['PENSA DEMAIS: '], ['{pensa}.', 'dor']]] },
  ];
