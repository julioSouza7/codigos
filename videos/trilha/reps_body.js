
  // ================= TREINO (barra / flexão) — corpo do tema =================
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

  // ---------- tempos ----------
  const T0 = 3.0, BREAK_T = 19.0;
  const RUN = {
    motiv: { P: 0.42, end: 5.6, rate: 300 },
    ego: { P: 0.62, end: 10.0, rate: 120 },
    disc: { P: 0.85, end: 14.0, rate: 1000 / 11 },
    obs: { P: 0.66, end: BREAK_T, rate: 170 },
  };
  const FALL_T = 16.95;                                   // a obsessão cai (braços falham)
  const FALL_HIT = BAR ? 17.27 : 17.15;                   // impacto no chão
  const REGRAB_T = BAR ? 18.15 : 17.5;                    // volta a fazer
  const PAIN0 = 15.7, PAIN1 = 16.9;
  const hurtOf = (t) => smooth(seg(t, PAIN0, PAIN1));
  const hits = (k, t) => (k !== 'obs' ? RUN[k].rate * clamp(t - T0, 0, RUN[k].end - T0)
    : RUN.obs.rate * (clamp(t, T0, FALL_T) - T0 + clamp(t - REGRAB_T, 0, BREAK_T - REGRAB_T)));

  // ---------- poses comuns ----------
  const STAND_L = { fT: 0.06, fS: -0.02, bT: -0.1, bS: -0.06 };
  const SIT_L = { fT: 2.3, fS: 0.8, bT: 2.15, bS: 0.7 };
  const LAND_L = { fT: 0.75, fS: -0.62, bT: 0.6, bS: -0.78 };
  const mixL = (a, b, u) => ({ fT: lerp(a.fT, b.fT, u), fS: lerp(a.fS, b.fS, u), bT: lerp(a.bT, b.bT, u), bS: lerp(a.bS, b.bS, u) });
  const mixSt = (A, B, u) => ({ x: lerp(A.x, B.x, u), hipY: lerp(A.hipY, B.hipY, u), lean: lerp(A.lean, B.lean, u), head: lerp(A.head || 0, B.head || 0, u),
    legs: mixL(A.legs, B.legs, u), hands: [P2(A.hands[0], B.hands[0], u), P2(A.hands[1], B.hands[1], u)],
    prefF: u < 0.5 ? A.prefF : B.prefF, prefB: u < 0.5 ? A.prefB : B.prefB });
  // keys: [[t, fn(t), dur, ease]] — em cada chave mistura do estado anterior (congelado na troca) para o novo
  function seqSt(keys, t) {
    let i = 0; while (i < keys.length - 1 && t >= keys[i + 1][0]) i++;
    const cur = keys[i][1](t);
    if (i === 0) return cur;
    const t1 = keys[i][0], dur = keys[i][2] || 0.3, ease = keys[i][3] || easeInOut, u = ease(seg(t, t1, t1 + dur));
    if (u >= 1) return cur;
    return mixSt(keys[i - 1][1](t1), cur, u);
  }
  const breathe = (t, ph) => 2.5 * Math.sin(t * 2.2 + ph);
  function standSt(x, o = {}) { const hy = standHipY(STAND_L) + (o.dy || 0); return { x, hipY: hy, lean: o.lean ?? 0.03, head: o.head ?? 0, legs: o.legs || STAND_L, hands: o.hands || [[x + 16, hy + 20], [x + 4, hy + 22]], prefF: o.prefF || 'down', prefB: o.prefB || 'down' }; }
  function landSt(x) { const hy = standHipY(LAND_L); return { x, hipY: hy, lean: 0.3, head: 0.2, legs: LAND_L, hands: [[x + 40, hy + 10], [x + 26, hy + 14]], prefF: 'down', prefB: 'down' }; }
  function slumpSt(x) { const hy = standHipY(STAND_L); return { x, hipY: hy, lean: 0.38, head: 0.5, legs: STAND_L, hands: [[x + 18, hy + 40], [x + 6, hy + 44]], prefF: 'down', prefB: 'down' }; }
  function sitSt(x) { return { x: x - 40, hipY: FLOOR - 17, lean: 0.42, head: 0.75, legs: SIT_L, hands: [[x + 20, FLOOR - 62], [x + 8, FLOOR - 58]], prefF: 'down', prefB: 'down' }; }
  const hipsSt = (x) => { const hy = standHipY(STAND_L); return standSt(x, { lean: -0.03, head: -0.1, hands: [[x + 16, hy - 16], [x + 6, hy - 20]], prefF: 'back', prefB: 'back' }); };
  // de joelhos (joelho no chão em kx); lean grande = de quatro
  function kneelAt(kx, o = {}) {
    const hip = [kx, FLOOR - 13 - 82], lean = o.lean ?? 0.04;
    const hands = o.hands || (o.hips ? [[kx + 16, hip[1] - 16], [kx + 6, hip[1] - 20]] : [[kx + 30, hip[1] + 10], [kx + 18, hip[1] + 14]]);
    return { x: hip[0], hipY: hip[1] + (o.dy || 0), lean, head: o.head ?? 0, legs: { fT: 0, fS: -1.85, bT: 0.04, bS: -1.82 }, hands, prefF: o.prefF || 'down', prefB: o.prefB || 'down' };
  }

  // ---------- BARRA FIXA ----------
  const BAR_Y = FLOOR - 400;
  const BX = (k) => HX[k] + 110;
  const HANG_L = { fT: 0.1, fS: -0.5, bT: -0.06, bS: -0.68 };
  const KICK_L = { fT: 0.32, fS: -0.2, bT: 0.12, bS: -0.42 };
  function hangSt(k, p, o = {}) {   // p: 0 = braços estendidos, 1 = queixo acima da barra
    const bx = BX(k), lean = 0.05 + 0.08 * p + (o.lean || 0), L = D.torso - 12;
    const ay = BAR_Y + lerp(106, 12, p) + (o.dy || 0), ax = bx - 34 - 8 * p + (o.dx || 0);
    return { x: ax - Math.sin(lean) * L, hipY: ay + Math.cos(lean) * L, lean, head: -0.14 * p + (o.head || 0),
      legs: mixL(HANG_L, KICK_L, o.kick || 0), hands: [[bx + 7, BAR_Y + 1], [bx - 5, BAR_Y + 1]], prefF: 'fdown', prefB: 'fdown' };
  }
  const pullP = (ph) => (ph < 0.38 ? easeInOut(ph / 0.38) : ph < 0.48 ? 1 : 1 - easeInOut((ph - 0.48) / 0.52));
  const hookP = (t) => (t < 0.85 ? 0 : t < 1.5 ? easeInOut(seg(t, 0.85, 1.5)) : t < 1.7 ? 1 : 1 - easeInOut(seg(t, 1.7, 2.5)));
  function supportSt(k, lean, ay, head, dx = 0) {
    const bx = BX(k), L = D.torso - 12, ax = bx - 6 + dx;
    return { x: ax - Math.sin(lean) * L, hipY: ay + Math.cos(lean) * L, lean, head, legs: { fT: 0.28, fS: -0.62, bT: 0.12, bS: -0.8 },
      hands: [[bx + 7, BAR_Y + 1], [bx - 5, BAR_Y + 1]], prefF: 'back', prefB: 'back' };
  }

  // ---------- FLEXÃO ----------
  const TH_TOP = 0.385, TH_BOT = 0.12;
  const TOE = (k) => HX[k];
  function plankSt(k, th, o = {}) {   // th = ângulo do corpo acima do chão, pivô nos dedos do pé
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
  // flexão com palma (clímax): desce, explode, bate palma no ar em BREAK_T, aterrissa
  function clapSt(k, t) {
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
  function cycleSt(k, t) {
    if (BAR) {
      if (t < T0) return hangSt(k, hookP(t), { dy: t < 0.85 ? 0.6 * breathe(t, HX[k]) : 0 });
      const ph = (((t - T0) / RUN[k].P) % 1 + 1) % 1;
      return hangSt(k, pullP(ph), { kick: 0.5 * Math.sin(Math.PI * Math.min(1, ph / 0.5)), dx: 5 * Math.sin(2 * Math.PI * ph) });
    }
    if (t < T0) return plankSt(k, hookTh(t), { dy: t < 0.8 ? 0.5 * breathe(t, HX[k]) : 0 });
    const ph = (((t - T0) / RUN[k].P) % 1 + 1) % 1;
    return plankSt(k, pushTh(ph));
  }
  const cyc = (k) => (t) => cycleSt(k, t);
  const hangX = (k) => hangSt(k, 0).x;
  const lvl = (st, t, ph, a = 1) => Object.assign({}, st, { hipY: st.hipY + a * breathe(t, ph) });
  let stateOf;
  if (BAR) {
    const quit = (k, sitAt) => { const x = hangX(k), e = RUN[k].end; return (t) => seqSt([[0, cyc(k)], [e, () => landSt(x), 0.26, easeIn], [e + 0.3, (tt) => lvl(slumpSt(x), tt, 1), 0.4], [sitAt, () => sitSt(x), 0.8]], t); };
    const xo = hangX('obs');
    const obs = (t) => seqSt([
      [0, cyc('obs')],
      [FALL_T, () => { const h = hangSt('obs', 0); return Object.assign({}, h, { hipY: h.hipY + 30, hands: [[xo + 40, h.hipY - 250], [xo + 20, h.hipY - 240]], prefF: 'fwd', prefB: 'fwd' }); }, 0.14, easeIn],
      [FALL_T + 0.16, () => landSt(xo), 0.12, easeIn],
      [FALL_T + 0.28, (tt) => kneelAt(xo + 20, { lean: 1.1, head: 0.55, hands: [[xo + 128, FLOOR - 13], [xo + 112, FLOOR - 13]], dy: 1.5 * Math.sin(tt * 9) }), 0.12, easeIn],
      [17.65, () => standSt(xo, { lean: 0.08, head: -0.1 }), 0.33],
      [17.98, () => { const s = standSt(xo + 10, { lean: 0.02, head: -0.25 }); s.hipY -= 34; s.legs = { fT: 0.02, fS: -0.04, bT: -0.06, bS: -0.1 }; s.hands = [[BX('obs') + 7, BAR_Y + 1], [BX('obs') - 5, BAR_Y + 1]]; s.prefF = 'fdown'; s.prefB = 'fdown'; return s; }, 0.17, easeOut],
      [REGRAB_T, (tt) => hangSt('obs', easeInOut(seg(tt, 18.22, 18.6))), 0.1],
      [18.6, (tt) => (tt < 18.82 ? mixSt(hangSt('obs', 1), supportSt('obs', 0.75, BAR_Y - 25, 0.15, 11), easeIn(seg(tt, 18.6, 18.82)))
        : tt < BREAK_T ? mixSt(supportSt('obs', 0.75, BAR_Y - 25, 0.15, 11), supportSt('obs', 0.22, BAR_Y - 102, -0.22), easeOut(seg(tt, 18.82, BREAK_T)))
        : lvl(supportSt('obs', 0.22, BAR_Y - 102, -0.22), tt, 0, 0.6)), 0.01],
    ], t);
    const xd = hangX('disc');
    stateOf = {
      motiv: quit('motiv', 6.2), ego: quit('ego', 10.6), obs,
      disc: (t) => seqSt([[0, cyc('disc')], [RUN.disc.end, () => landSt(xd), 0.26, easeIn], [RUN.disc.end + 0.3, () => standSt(xd), 0.3], [RUN.disc.end + 0.62, () => hipsSt(xd), 0.35]], t),
    };
  } else {
    const kx = (k) => TOE(k) + 70;
    stateOf = {
      motiv: (t) => seqSt([[0, cyc('motiv')], [RUN.motiv.end, (tt) => proneSt('motiv', { dy: 0.8 * breathe(tt, 0) }), 0.24, easeIn]], t),
      ego: (t) => seqSt([[0, cyc('ego')], [RUN.ego.end, () => kneelAt(kx('ego'), { lean: 0.2, head: 0.35 }), 0.45], [10.6, () => seizaSt('ego'), 0.7]], t),
      disc: (t) => seqSt([[0, cyc('disc')], [RUN.disc.end, () => kneelAt(kx('disc')), 0.45], [RUN.disc.end + 0.5, () => kneelAt(kx('disc'), { hips: true, lean: -0.02, head: -0.1, prefF: 'back', prefB: 'back' }), 0.35]], t),
      obs: (t) => seqSt([
        [0, cyc('obs')],
        [FALL_T, (tt) => proneSt('obs', { head: 0.3, dy: 1.2 * Math.sin(tt * 10) }), 0.2, easeIn],
        [REGRAB_T, (tt) => { const u = seg(tt, 17.55, 18.2); return plankSt('obs', lerp(0.035, TH_TOP, easeInOut(u)), { head: lerp(0.3, -0.12, u), dy: 3 * Math.sin(tt * 57) * (1 - 0.6 * u) }); }, 0.05],
        [18.3, (tt) => clapSt('obs', tt), 0.01],
        [19.5, (tt) => lvl(kneelAt(kx('obs'), { head: -0.28, lean: -0.02, hands: [[kx('obs') + 74, FLOOR - 95 - 88 - 92], [kx('obs') - 52, FLOOR - 95 - 88 - 98]], prefF: 'fwd', prefB: 'back' }), tt, 0, 0.6), 0.5],
      ], t),
    };
  }

  // eventos de repetição (som, soco de câmera, dor)
  const REP_PH = BAR ? 0.38 : 0.55;
  const REPS = { motiv: [], ego: [], disc: [], obs: [] };
  for (const k of KS) { const end = k === 'obs' ? FALL_T : RUN[k].end; for (let n = 0; ; n++) { const ts = T0 + RUN[k].P * (n + REP_PH); if (ts >= end) break; REPS[k].push(+ts.toFixed(3)); } }
  REPS.obs.push(BAR ? 18.6 : 18.6);
  const PAIN_EV = [...REPS.obs.filter((x) => x < FALL_T), FALL_HIT, BAR ? 18.6 : 18.75];
  const lastOf = (arr, t) => { let ls = -9; for (const x of arr) if (x <= t) ls = x; return ls; };
  const MOANS = [lastOf(REPS.obs, 16.55) + 0.02, FALL_HIT + 0.04, BAR ? 17.9 : 17.78];
  const THUDS = BAR
    ? [[RUN.motiv.end + 0.24, 0.5, 'motiv'], [6.9, 0.35, 'motiv'], [RUN.ego.end + 0.24, 0.5, 'ego'], [11.3, 0.35, 'ego'], [RUN.disc.end + 0.24, 0.5, 'disc'], [FALL_T + 0.16, 0.6, 'obs'], [FALL_HIT, 1.0, 'obs']]
    : [[RUN.motiv.end + 0.22, 0.7, 'motiv'], [RUN.ego.end + 0.3, 0.4, 'ego'], [RUN.disc.end + 0.3, 0.35, 'disc'], [FALL_HIT, 1.0, 'obs'], [19.25, 0.7, 'obs']];

  // ---------- cenário ----------
  function drawGear(c, k, t, lv) {
    const lit = clamp(0.35 + 0.65 * Math.min(1, lv / 0.85));
    if (BAR) {   // barra fixa: dois postes e a barra
      const bx = BX(k), x0 = bx - 100, x1 = bx + 70;
      c.strokeStyle = OUT; c.lineWidth = 4; c.fillStyle = rgb([58, 58, 62], lit);
      for (const x of [x0, x1]) { c.fillRect(x - 7, BAR_Y, 14, FLOOR - BAR_Y); c.strokeRect(x - 7, BAR_Y, 14, FLOOR - BAR_Y); c.fillRect(x - 26, FLOOR - 10, 52, 10); c.strokeRect(x - 26, FLOOR - 10, 52, 10); }
      strokePts(c, [[x0 - 4, BAR_Y], [x1 + 4, BAR_Y]], 12 + 8, OUT); strokePts(c, [[x0 - 4, BAR_Y], [x1 + 4, BAR_Y]], 12, rgb([190, 190, 194], lit));
    } else {     // colchonete
      c.fillStyle = rgb([44, 44, 48], lit); c.strokeStyle = OUT; c.lineWidth = 3;
      c.beginPath(); c.roundRect(TOE(k) - 40, FLOOR - 7, 360, 9, 4); c.fill(); c.stroke();
    }
  }
  function drawBarTop() {}
  // plateia do ego (de pé, filmando)
  const crowdX = BAR ? [1262, 1330, 1398] : [1125, 1185, 1245];
  function drawCrowd(c, t) {
    for (let i = 0; i < crowdX.length; i++) {
      const show = smooth(seg(t, 7.8 + i * 0.07, 8.1 + i * 0.07)) * (1 - smooth(seg(t, 9.7 + i * 0.06, 9.95 + i * 0.06)));
      if (show <= 0.01) continue;
      const x = crowdX[i] + (1 - show) * 50, sc = BAR ? 0.95 : 0.78, ph = Math.sin((t + i * 1.3) * 2.4) * 3;
      c.save(); c.globalAlpha = show * (BAR ? 0.9 : 0.7); c.translate(x, FLOOR); c.scale(-sc, sc);   // olhando para a esquerda
      c.lineWidth = 4; c.strokeStyle = 'rgba(214,212,206,0.5)'; c.fillStyle = '#141416'; c.lineJoin = 'round';
      c.beginPath(); c.moveTo(-22, 0); c.lineTo(-24, -150); c.quadraticCurveTo(-26, -196, 0, -198); c.quadraticCurveTo(26, -196, 24, -150); c.lineTo(22, 0); c.closePath(); c.fill(); c.stroke();
      c.beginPath(); c.arc(2, -226, 22, 0, Math.PI * 2); c.fill(); c.stroke();
      c.lineCap = 'round'; c.lineWidth = 14; c.strokeStyle = '#141416'; c.beginPath(); c.moveTo(14, -182); c.lineTo(40, -160); c.lineTo(46 + 0.3 * ph, -214 + ph); c.stroke();
      c.lineWidth = 4; c.strokeStyle = 'rgba(214,212,206,0.5)'; c.stroke();
      c.fillStyle = '#e8e6e0'; c.fillRect(40 + 0.3 * ph, -236 + ph, 14, 24);
      c.globalCompositeOperation = 'lighter'; const g = c.createRadialGradient(47, -224 + ph, 0, 47, -224 + ph, 40); g.addColorStop(0, 'rgba(255,255,255,0.22)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(7, -264 + ph, 80, 80);
      c.restore();
    }
  }
  function drawMeta(c, t) {
    const MA = 1 - shotAt(t).amt; if (MA <= 0.01) return;
    const hit = t >= RUN.disc.end, flash = hit ? Math.exp(-(t - RUN.disc.end) * 4) : 0;
    const label = hit ? 'META ✓' : 'META 1.000';
    c.save(); c.globalAlpha = MA; c.font = '700 22px "Space Mono", monospace'; const tw = c.measureText(label).width;
    const px = CX('disc') - tw / 2 - 13, py = BAR ? BAR_Y - 190 : FLOOR - 330;
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
    disc: track([[0, 1.0], [3.0, 1.0], [3.3, 0.7], [12.8, 0.7], [13.0, 1.1], [14.6, 1.1], [15.3, 0.55]]),
    obs: track([[0, 1.0], [3.0, 1.0], [3.3, 0.7], [15.3, 0.7], [15.5, 1.2], [18.9, 1.2], [19.05, 1.6], [20.4, 1.3]]),
    motiv: track([[0, 1.0], [3.0, 1.0], [3.2, 1.3], [5.5, 1.3], [6.2, 0.5], [6.9, 0.08]]),
    ego: track([[0, 1.0], [3.0, 1.0], [7.8, 1.0], [8.0, 1.2], [9.9, 1.2], [10.4, 0.5], [11.0, 0.08]]),
  };

  // ---------- câmera por planos ----------
  const SHOTS = [[0, 'wide'], [2.9, 'motiv'], [6.9, 'ego'], [11.2, 'disc'], [15.0, 'obs'], [19.6, 'wide']];
  const WIDE = BAR ? { cx: 667, cy: 960, s: 0.86, sy: 950 } : { cx: 692, cy: 960, s: 0.64, sy: 985 };
  const frameOf = (n, t = 0) => (n === 'wide' ? WIDE : BAR ? { cx: CX(n), cy: FLOOR - 232 - (n === 'obs' ? 125 * easeInOut(seg(t, 18.5, 19.0)) : 0), s: 1.45, sy: 960 } : { cx: CX(n) + 10, cy: FLOOR - 112, s: 2.4, sy: 905 });
  function shotAt(t) {
    let i = 0; while (i < SHOTS.length - 1 && t >= SHOTS[i + 1][0]) i++;
    const cur = SHOTS[i], prev = i > 0 ? SHOTS[i - 1] : cur, u = i > 0 ? easeInOut(seg(t, cur[0], cur[0] + 0.55)) : 1;
    const A = frameOf(prev[1], t), B = frameOf(cur[1], t);
    const f = { cx: lerp(A.cx, B.cx, u), cy: lerp(A.cy, B.cy, u), s: Math.exp(lerp(Math.log(A.s), Math.log(B.s), u)), sy: lerp(A.sy, B.sy, u) };
    const za = (n) => (n === 'wide' ? 0 : 1), amt = lerp(za(prev[1]), za(cur[1]), u);
    const k = cur[1] !== 'wide' ? cur[1] : prev[1] !== 'wide' ? prev[1] : null;
    return { f, amt, k };
  }
  function camAt(t) {
    const S = shotAt(t), f = S.f;
    let s = f.s * (t < 2.9 ? lerp(1.08, 1.0, easeOut(seg(t, 1.5, 2.4))) : 1);
    let punch = 0; if (S.k) for (const ts of REPS[S.k]) { const d = t - ts; if (d >= 0 && d < 0.4) punch += 0.018 * Math.exp(-d * 13) * S.amt; }
    s *= 1 + punch;
    let ox = 540 - f.cx * s, oy = f.sy - f.cy * s;
    const k1 = t >= 1.5 ? Math.exp(-(t - 1.5) * 9) : 0, k2 = t >= BREAK_T ? Math.exp(-(t - BREAK_T) * 5) : 0, k3 = t >= FALL_HIT ? Math.exp(-(t - FALL_HIT) * 8) : 0;
    ox += 15 * k1 * Math.sin((t - 1.5) * 70) + 24 * k2 * Math.sin((t - BREAK_T) * 60) + 16 * k3 * Math.sin((t - FALL_HIT) * 66);
    oy += 10 * k1 * Math.cos((t - 1.5) * 83) + 18 * k2 * Math.cos((t - BREAK_T) * 73) + 14 * k3 * Math.cos((t - FALL_HIT) * 79);
    return { s, ox, oy };
  }
  const toScreen = (p, C) => [p[0] * C.s + C.ox, p[1] * C.s + C.oy];
