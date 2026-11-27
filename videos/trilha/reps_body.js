
  // ================= TREINO v2 (barra de frente / flexão de lado) — disputa final EGO x OBSESSÃO =================
  // ---------- boneco de perfil (flexão) ----------
  function drawFigure(c, R, light, col, arm) {
    const f = rgb(mixC(DARK, WHITE, light)), b = rgb(mixC(DARKB, BACK, light));
    const ra = arm ? arm.a : 0;
    const fA = ra > 0.001 ? rgb(mixC(mixC(DARK, WHITE, light), mixC(DARK, ACC, light), ra)) : f;
    const bA = ra > 0.001 ? rgb(mixC(mixC(DARKB, BACK, light), mixC(DARKB, ACCB, light), ra)) : b;
    if (col && light > 0.5) {
      c.save(); c.globalAlpha = 0.55 * (light - 0.5) * 2; c.filter = 'blur(8px)';
      for (const L of [R.legB, R.armB, R.legF, R.armF, [R.hip, R.sh]]) strokePts(c, L, D.limb + 14, rgb(col));
      disc(c, R.head, D.headR + 9, rgb(col)); c.restore();
    }
    if (arm && arm.g > 0.01) { c.save(); c.globalAlpha = arm.g; c.filter = 'blur(10px)'; strokePts(c, R.armB, D.limb + 20, rgb(ACC)); strokePts(c, R.armF, D.limb + 20, rgb(ACC)); c.restore(); }
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
  // ---------- boneco de frente (barra) ----------
  const FW = { shW: 23, hipW: 11 };
  const PREF_OUT = [(c) => -c[0] + 0.25 * c[1], (c) => c[0] + 0.25 * c[1]];
  const PREF_UP = [(c) => -0.4 * c[0] - c[1], (c) => 0.4 * c[0] - c[1]];
  function rigF(st) {
    const tl = st.tilt || 0, up = [Math.sin(tl), -Math.cos(tl)], sd = [Math.cos(tl), Math.sin(tl)];
    const hip = [st.x, st.hipY], tk = st.torsoK ?? 1;
    const neck = add(hip, [up[0] * D.torso * tk, up[1] * D.torso * tk]);
    const shC = add(hip, [up[0] * (D.torso - 10) * tk, up[1] * (D.torso - 10) * tk]);
    const sh = [add(shC, [-sd[0] * FW.shW, -sd[1] * FW.shW]), add(shC, [sd[0] * FW.shW, sd[1] * FW.shW])];
    const hp = [add(hip, [-sd[0] * FW.hipW, -sd[1] * FW.hipW]), add(hip, [sd[0] * FW.hipW, sd[1] * FW.hipW])];
    const head = add(neck, [up[0] * (D.headR + 8), up[1] * (D.headR + 8) + (st.nod || 0)]);
    const arms = [0, 1].map((i) => { const r = ikP(sh[i], st.hands[i], D.uArm, D.fArm, PREF_OUT[i]); return [sh[i], r.E, r.H]; });
    const kp = st.kneeUp ? PREF_UP : PREF_OUT;
    const legs = [0, 1].map((i) => { const r = ikP(hp[i], st.ankles[i], D.thigh * (st.thighK ?? 1), D.shin * (st.shinK ?? 1), kp[i]); const s = i ? 1 : -1;
      return [hp[i], r.E, r.H, add(r.H, st.feetDown ? [s * 5, 13] : [s * 15, 4])]; });
    return { front: true, hip, neck, shC, sh, head, arms, legs, kneeUp: !!st.kneeUp };
  }
  function drawFigF(c, R, light, col, arm) {
    const f = rgb(mixC(DARK, WHITE, light)), ra = arm ? arm.a : 0;
    const fA = ra > 0.001 ? rgb(mixC(mixC(DARK, WHITE, light), mixC(DARK, ACC, light), ra)) : f;
    if (col && light > 0.5) {
      c.save(); c.globalAlpha = 0.55 * (light - 0.5) * 2; c.filter = 'blur(8px)';
      for (const L of [...R.legs, ...R.arms, [R.hip, R.neck], R.sh]) strokePts(c, L, D.limb + 14, rgb(col));
      disc(c, R.head, D.headR + 9, rgb(col)); c.restore();
    }
    if (arm && arm.g > 0.01) { c.save(); c.globalAlpha = arm.g; c.filter = 'blur(10px)'; for (const L of R.arms) strokePts(c, L, D.limb + 20, rgb(ACC)); c.restore(); }
    const legs = () => { for (const L of R.legs) strokePts(c, L, D.limb + 2 * D.ol, OUT); for (const L of R.legs) strokePts(c, L, D.limb, f); };
    if (!R.kneeUp) legs();
    strokePts(c, [R.hip, R.neck], D.torsoW + 2 * D.ol, OUT); strokePts(c, R.sh, D.limb + 2 * D.ol, OUT);
    strokePts(c, [R.hip, R.neck], D.torsoW, f); strokePts(c, R.sh, D.limb, f);
    if (R.kneeUp) legs();
    disc(c, R.head, D.headR + D.ol, OUT); disc(c, R.head, D.headR, f);
    for (const L of R.arms) limb(c, L, D.limb, fA);
  }

  // ---------- tempos ----------
  const T0 = 3.0, BREAK_T = 19.0;
  const RUN = {
    motiv: { P: 0.42, end: 5.6, rate: 300 },
    disc: { P: 0.85, end: 10.0, rate: 1000 / 7 },
    ego: { P: 0.62, end: 17.3, rate: 145 },
    obs: { P: 0.66, end: BREAK_T, rate: 150, rate2: 330 },
  };
  const FALL_T = 13.8;                                   // a obsessão para primeiro (dor)
  const FALL_HIT = BAR ? 14.1 : 14.0;                    // impacto no chão
  const REGRAB_T = 15.4;                    // volta a fazer
  const RESUME_T = BAR ? REGRAB_T : 15.75, PER2 = BAR ? 3.1 / 8 : 2.55 / 7, CLIMB_T = BAR ? 18.5 : 18.3;   // volta acelerada
  const SIT_EGO = 17.9, CROWD = [10.9, 16.5];
  const PAIN0 = 11.6, PAIN1 = 13.0;
  const hurtOf = (t) => smooth(seg(t, PAIN0, PAIN1));
  const hits = (k, t) => (k !== 'obs' ? RUN[k].rate * clamp(t - T0, 0, RUN[k].end - T0)
    : RUN.obs.rate * (clamp(t, T0, FALL_T) - T0) + RUN.obs.rate2 * clamp(t - REGRAB_T, 0, BREAK_T - REGRAB_T));
  const EGO_FINAL = hits('ego', 99);
  const EGO_PASS = T0 + hits('obs', FALL_T) / RUN.ego.rate;                                   // o ego passa na frente
  const PASS_T = (hits('obs', FALL_T) - RUN.obs.rate2 * REGRAB_T + RUN.ego.rate * T0) / (RUN.ego.rate - RUN.obs.rate2);   // a obsessão passa o ego (ele ainda puxando)

  // ---------- poses de perfil ----------
  const STAND_L = { fT: 0.06, fS: -0.02, bT: -0.1, bS: -0.06 };
  const mixL = (a, b, u) => ({ fT: lerp(a.fT, b.fT, u), fS: lerp(a.fS, b.fS, u), bT: lerp(a.bT, b.bT, u), bS: lerp(a.bS, b.bS, u) });
  const mixP = (A, B, u) => ({ x: lerp(A.x, B.x, u), hipY: lerp(A.hipY, B.hipY, u), lean: lerp(A.lean, B.lean, u), head: lerp(A.head || 0, B.head || 0, u),
    legs: mixL(A.legs, B.legs, u), hands: [P2(A.hands[0], B.hands[0], u), P2(A.hands[1], B.hands[1], u)],
    prefF: u < 0.5 ? A.prefF : B.prefF, prefB: u < 0.5 ? A.prefB : B.prefB });
  const mixF = (A, B, u) => ({ front: true, x: lerp(A.x, B.x, u), hipY: lerp(A.hipY, B.hipY, u), tilt: lerp(A.tilt || 0, B.tilt || 0, u), nod: lerp(A.nod || 0, B.nod || 0, u),
    torsoK: lerp(A.torsoK ?? 1, B.torsoK ?? 1, u), thighK: lerp(A.thighK ?? 1, B.thighK ?? 1, u), shinK: lerp(A.shinK ?? 1, B.shinK ?? 1, u),
    hands: [P2(A.hands[0], B.hands[0], u), P2(A.hands[1], B.hands[1], u)], ankles: [P2(A.ankles[0], B.ankles[0], u), P2(A.ankles[1], B.ankles[1], u)],
    kneeUp: u < 0.5 ? A.kneeUp : B.kneeUp, feetDown: u < 0.5 ? A.feetDown : B.feetDown });
  const mixSt = (A, B, u) => (A.front ? mixF(A, B, u) : mixP(A, B, u));
  function seqSt(keys, t) {
    let i = 0; while (i < keys.length - 1 && t >= keys[i + 1][0]) i++;
    const cur = keys[i][1](t);
    if (i === 0) return cur;
    const t1 = keys[i][0], dur = keys[i][2] || 0.3, ease = keys[i][3] || easeInOut, u = ease(seg(t, t1, t1 + dur));
    if (u >= 1) return cur;
    return mixSt(keys[i - 1][1](t1), cur, u);
  }
  const breathe = (t, ph) => 2.5 * Math.sin(t * 2.2 + ph);
  function kneelAt(kx, o = {}) {
    const hip = [kx, FLOOR - 13 - 82], lean = o.lean ?? 0.04;
    const hands = o.hands || (o.hips ? [[kx + 16, hip[1] - 16], [kx + 6, hip[1] - 20]] : [[kx + 30, hip[1] + 10], [kx + 18, hip[1] + 14]]);
    return { x: hip[0], hipY: hip[1] + (o.dy || 0), lean, head: o.head ?? 0, legs: { fT: 0, fS: -1.85, bT: 0.04, bS: -1.82 }, hands, prefF: o.prefF || 'down', prefB: o.prefB || 'down' };
  }

  // ---------- BARRA (de frente) ----------
  const BAR_Y = FLOOR - 380, GRIP = 72;
  function hangF(k, p, o = {}) {   // p: 0 = braços estendidos, 1 = queixo acima da barra
    const bx = HX[k], shY = BAR_Y + lerp(104, 8, p) + (o.dy || 0), sw = o.sw || 0, hy = shY + D.torso - 10;
    return { front: true, x: bx + sw, hipY: hy, tilt: o.tilt || 0, nod: o.nod || 0, hands: [[bx - GRIP, BAR_Y], [bx + GRIP, BAR_Y]],
      ankles: [[bx - 16 + 1.8 * sw, hy + 128], [bx + 16 + 1.8 * sw, hy + 128]], shinK: 0.62, feetDown: true };
  }
  const pullP = (ph) => (ph < 0.38 ? easeInOut(ph / 0.38) : ph < 0.48 ? 1 : 1 - easeInOut((ph - 0.48) / 0.52));
  const hookP = (t) => (t < 0.85 ? 0 : t < 1.5 ? easeInOut(seg(t, 0.85, 1.5)) : t < 1.7 ? 1 : 1 - easeInOut(seg(t, 1.7, 2.5)));
  function standF(x, o = {}) { const hy = FLOOR - 17 - 158 + (o.dy || 0); return { front: true, x, hipY: hy, tilt: o.tilt || 0, nod: o.nod || 0, torsoK: o.torsoK ?? 1, hands: o.hands || [[x - 38, hy + 22], [x + 38, hy + 22]], ankles: [[x - 20, FLOOR - 17], [x + 20, FLOOR - 17]] }; }
  function landF(x) { const hy = FLOOR - 17 - 112; return { front: true, x, hipY: hy, nod: 10, torsoK: 0.95, hands: [[x - 54, hy + 40], [x + 54, hy + 40]], ankles: [[x - 36, FLOOR - 17], [x + 36, FLOOR - 17]] }; }
  const slumpF = (x) => { const s = standF(x, { nod: 14, torsoK: 0.94 }); s.hands = [[x - 34, s.hipY + 30], [x + 34, s.hipY + 30]]; return s; };
  const hipsF = (x) => { const s = standF(x, { nod: -3 }); s.hands = [[x - 27, s.hipY - 4], [x + 27, s.hipY - 4]]; return s; };
  const sitF = (x) => ({ front: true, x, hipY: FLOOR - 24, torsoK: 0.86, nod: 16, kneeUp: true, hands: [[x - 32, FLOOR - 98], [x + 32, FLOOR - 98]], ankles: [[x - 42, FLOOR - 15], [x + 42, FLOOR - 15]] });
  const kneelF = (x, o = {}) => ({ front: true, x, hipY: FLOOR - 74 + (o.dy || 0), torsoK: 0.9, tilt: o.tilt || 0, nod: o.nod ?? 18, thighK: 0.75, shinK: 0.1,
    hands: [[x - 46, FLOOR - 30], [x + 46, FLOOR - 30]], ankles: [[x - 30, FLOOR - 14], [x + 30, FLOOR - 14]] });
  const reachF = (x) => { const s = standF(x, { nod: -8 }); s.hipY -= 32; s.hands = [[x - GRIP, BAR_Y], [x + GRIP, BAR_Y]]; s.ankles = [[x - 14, FLOOR - 44], [x + 14, FLOOR - 44]]; s.feetDown = true; return s; };
  const supportF = (k, shY, o = {}) => { const bx = HX[k], hy = shY + D.torso - 10; return { front: true, x: bx, hipY: hy, nod: o.nod ?? -4, torsoK: o.torsoK ?? 1, hands: [[bx - GRIP, BAR_Y], [bx + GRIP, BAR_Y]],
    ankles: [[bx - 18, hy + 128], [bx + 18, hy + 128]], shinK: 0.62, feetDown: true }; };

  // ---------- FLEXÃO (de lado) ----------
  const TH_TOP = 0.385, TH_BOT = 0.12;
  const TOE = (k) => HX[k];
  function plankSt(k, th, o = {}) {
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
  function clapSt(k, t) {   // flexão com palma no clímax: desce, explode, palma no ar em BREAK_T, aterrissa
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
  const phOf = (t, t0, P) => (((t - t0) / P) % 1 + 1) % 1;
  function cycleSt(k, t) {
    if (BAR) {
      if (t < T0) return hangF(k, hookP(t), { dy: t < 0.85 ? 0.6 * breathe(t, HX[k] * 0.01) : 0 });
      const ph = phOf(t, T0, RUN[k].P);
      return hangF(k, pullP(ph), { sw: 4 * Math.sin(2 * Math.PI * ph + HX[k]), tilt: 0.02 * Math.sin(2 * Math.PI * ph) });
    }
    if (t < T0) return plankSt(k, hookTh(t), { dy: t < 0.8 ? 0.5 * breathe(t, HX[k] * 0.01) : 0 });
    return plankSt(k, pushTh(phOf(t, T0, RUN[k].P)));
  }
  const cyc = (k) => (t) => cycleSt(k, t);
  let stateOf;
  if (BAR) {
    const x = (k) => HX[k];
    const quit = (k, sitAt) => { const e = RUN[k].end; return (t) => seqSt([[0, cyc(k)], [e, () => landF(x(k)), 0.26, easeIn], [e + 0.3, (tt) => Object.assign(slumpF(x(k)), {}), 0.4], [sitAt, () => sitF(x(k)), 0.8]], t); };
    const xo = x('obs');
    const obs2 = (t) => hangF('obs', pullP(phOf(t, RESUME_T, PER2)), { sw: 3 * Math.sin(2 * Math.PI * phOf(t, RESUME_T, PER2)) });
    const climb = (t) => {   // muscle-up: puxa explosivo, passa o peito e trava os braços acima da barra
      if (t < 18.72) return mixF(hangF('obs', 0), hangF('obs', 1), easeOut(seg(t, CLIMB_T, 18.72)));
      if (t < 18.86) return mixF(hangF('obs', 1), supportF('obs', BAR_Y - 40, { nod: 10, torsoK: 0.86 }), easeIn(seg(t, 18.72, 18.86)));
      if (t < BREAK_T) return mixF(supportF('obs', BAR_Y - 40, { nod: 10, torsoK: 0.86 }), supportF('obs', BAR_Y - 104), easeOut(seg(t, 18.86, BREAK_T)));
      const s = supportF('obs', BAR_Y - 104 + 1.5 * Math.sin((t - BREAK_T) * 3), { nod: -6 }); return s;
    };
    stateOf = {
      motiv: quit('motiv', 6.2), ego: quit('ego', SIT_EGO),
      disc: (t) => seqSt([[0, cyc('disc')], [RUN.disc.end, () => landF(x('disc')), 0.26, easeIn], [RUN.disc.end + 0.3, () => standF(x('disc')), 0.3], [RUN.disc.end + 0.62, () => hipsF(x('disc')), 0.35]], t),
      obs: (t) => seqSt([
        [0, cyc('obs')],
        [FALL_T, () => { const h = hangF('obs', 0); h.hipY += 40; h.ankles = h.ankles.map((a) => [a[0], a[1] + 40]); h.hands = [[xo - 70, h.hipY - 250], [xo + 70, h.hipY - 250]]; h.nod = 6; return h; }, 0.16, easeIn],
        [FALL_T + 0.18, () => landF(xo), 0.12, easeIn],
        [FALL_HIT, (tt) => kneelF(xo, { nod: 18 + 2 * Math.sin(tt * 5), dy: 1.5 * Math.sin(tt * 9) }), 0.16, easeIn],
        [14.85, () => standF(xo, { nod: -8 }), 0.4],
        [15.25, () => reachF(xo), 0.15, easeOut],
        [REGRAB_T, obs2, 0.1],
        [CLIMB_T, climb, 0.01],
      ], t),
    };
  } else {
    const kx = (k) => TOE(k) + 70;
    const victory = (tt) => { const s = kneelAt(kx('obs'), { head: -0.28, lean: -0.02, hands: [[kx('obs') + 74, FLOOR - 95 - 88 - 92], [kx('obs') - 52, FLOOR - 95 - 88 - 98]], prefF: 'fwd', prefB: 'back' }); s.hipY += 0.6 * breathe(tt, 0); return s; };
    stateOf = {
      motiv: (t) => seqSt([[0, cyc('motiv')], [RUN.motiv.end, (tt) => proneSt('motiv', { dy: 0.8 * breathe(tt, 0) }), 0.24, easeIn]], t),
      disc: (t) => seqSt([[0, cyc('disc')], [RUN.disc.end, () => kneelAt(kx('disc')), 0.45], [RUN.disc.end + 0.5, () => kneelAt(kx('disc'), { hips: true, lean: -0.02, head: -0.1, prefF: 'back', prefB: 'back' }), 0.35]], t),
      ego: (t) => seqSt([[0, cyc('ego')], [RUN.ego.end, () => kneelAt(kx('ego'), { lean: 0.2, head: 0.35 }), 0.45], [SIT_EGO, () => seizaSt('ego'), 0.7]], t),
      obs: (t) => seqSt([
        [0, cyc('obs')],
        [FALL_T, (tt) => proneSt('obs', { head: 0.3, dy: 1.2 * Math.sin(tt * 10) }), 0.2, easeIn],
        [REGRAB_T, (tt) => { const u = seg(tt, REGRAB_T + 0.05, RESUME_T); return plankSt('obs', lerp(0.035, TH_TOP, easeInOut(u)), { head: lerp(0.3, -0.12, u), dy: 3 * Math.sin(tt * 57) * (1 - 0.6 * u) }); }, 0.05],
        [RESUME_T, (tt) => plankSt('obs', pushTh(phOf(tt, RESUME_T, PER2))), 0.05],
        [CLIMB_T, (tt) => clapSt('obs', tt), 0.01],
        [19.5, victory, 0.5],
      ], t),
    };
  }

  // eventos de repetição (som, soco de câmera, dor)
  const REP_PH = BAR ? 0.38 : 0.55;
  const REPS = { motiv: [], ego: [], disc: [], obs: [] };
  for (const k of KS) { const end = k === 'obs' ? FALL_T : RUN[k].end; for (let n = 0; ; n++) { const ts = T0 + RUN[k].P * (n + REP_PH); if (ts >= end) break; REPS[k].push(+ts.toFixed(3)); } }
  if (!BAR) REPS.obs.push(RESUME_T - 0.1);
  for (let n = 0; ; n++) { const ts = RESUME_T + PER2 * (n + REP_PH); if (ts >= CLIMB_T) break; REPS.obs.push(+ts.toFixed(3)); }
  REPS.obs.push(BAR ? 18.72 : 18.75);
  const PAIN_EV = [...REPS.obs, FALL_HIT].sort((a, b) => a - b);
  const lastOf = (arr, t) => { let ls = -9; for (const x of arr) if (x <= t) ls = x; return ls; };
  const MOANS = [lastOf(REPS.obs, 13.35) + 0.02, FALL_HIT + 0.04, BAR ? 15.27 : 15.45, lastOf(REPS.obs, 18.4) + 0.02];
  const THUDS = BAR
    ? [[RUN.motiv.end + 0.24, 0.5, 'motiv'], [6.9, 0.35, 'motiv'], [RUN.disc.end + 0.24, 0.5, 'disc'], [FALL_T + 0.18, 0.6, 'obs'], [FALL_HIT, 1.0, 'obs'], [RUN.ego.end + 0.24, 0.5, 'ego']]
    : [[RUN.motiv.end + 0.22, 0.7, 'motiv'], [RUN.disc.end + 0.3, 0.35, 'disc'], [FALL_HIT, 1.0, 'obs'], [RUN.ego.end + 0.3, 0.4, 'ego'], [19.25, 0.7, 'obs']];

  // ---------- cenário ----------
  const litOf = (lv) => clamp(0.35 + 0.65 * Math.min(1, lv / 0.85));
  function drawGear(c, k, t, lv) {
    const lit = litOf(lv);
    if (BAR) {   // estação de barra de frente: dois postes
      const bx = HX[k];
      c.strokeStyle = OUT; c.lineWidth = 4; c.fillStyle = rgb([58, 58, 62], lit);
      for (const x of [bx - 115, bx + 115]) { c.fillRect(x - 8, BAR_Y - 8, 16, FLOOR - BAR_Y + 8); c.strokeRect(x - 8, BAR_Y - 8, 16, FLOOR - BAR_Y + 8); c.fillRect(x - 24, FLOOR - 10, 48, 10); c.strokeRect(x - 24, FLOOR - 10, 48, 10); }
    } else {
      c.fillStyle = rgb([44, 44, 48], lit); c.strokeStyle = OUT; c.lineWidth = 3;
      c.beginPath(); c.roundRect(TOE(k) - 40, FLOOR - 7, 360, 9, 4); c.fill(); c.stroke();
    }
  }
  function drawBarTop(c, k, lv) {   // a barra passa na frente das mãos (pegada)
    if (!BAR) return;
    const bx = HX[k], lit = litOf(lv);
    strokePts(c, [[bx - 123, BAR_Y], [bx + 123, BAR_Y]], 12 + 8, OUT); strokePts(c, [[bx - 123, BAR_Y], [bx + 123, BAR_Y]], 12, rgb([196, 196, 200], lit));
  }
  // plateia do ego: chega na disputa, vibra quando a obsessão cai, vai embora antes do ego soltar
  const crowdX = BAR ? [632, 690, 748] : [745, 810, 875];
  function drawCrowd(c, t) {
    for (let i = 0; i < crowdX.length; i++) {
      const show = smooth(seg(t, CROWD[0] + i * 0.07, CROWD[0] + 0.3 + i * 0.07)) * (1 - smooth(seg(t, CROWD[1] + i * 0.08, CROWD[1] + 0.3 + i * 0.08)));
      if (show <= 0.01) continue;
      const cheer = seg(t, FALL_HIT + 0.3, FALL_HIT + 0.5) * (1 - seg(t, 15.2, 15.5));
      const x = crowdX[i] - (1 - show) * 50, sc = BAR ? 0.78 : 0.78, ph = Math.sin((t + i * 1.3) * 2.4) * 3, jump = cheer * Math.abs(Math.sin((t + i * 0.7) * 9)) * 12;
      c.save(); c.globalAlpha = show * 0.75; c.translate(x, FLOOR - jump); c.scale(sc, sc);
      c.lineWidth = 4; c.strokeStyle = 'rgba(214,212,206,0.5)'; c.fillStyle = '#141416'; c.lineJoin = 'round';
      c.beginPath(); c.moveTo(-22, 0); c.lineTo(-24, -150); c.quadraticCurveTo(-26, -196, 0, -198); c.quadraticCurveTo(26, -196, 24, -150); c.lineTo(22, 0); c.closePath(); c.fill(); c.stroke();
      c.beginPath(); c.arc(2, -226, 22, 0, Math.PI * 2); c.fill(); c.stroke();
      c.lineCap = 'round'; c.lineWidth = 14; c.strokeStyle = '#141416'; c.beginPath(); c.moveTo(14, -182); c.lineTo(40, -160); c.lineTo(46 + 0.3 * ph, -214 + ph - 20 * cheer); c.stroke();
      c.lineWidth = 4; c.strokeStyle = 'rgba(214,212,206,0.5)'; c.stroke();
      c.fillStyle = '#e8e6e0'; c.fillRect(40 + 0.3 * ph, -236 + ph - 20 * cheer, 14, 24);
      c.globalCompositeOperation = 'lighter'; const g = c.createRadialGradient(47, -224 + ph - 20 * cheer, 0, 47, -224 + ph - 20 * cheer, 40); g.addColorStop(0, 'rgba(255,255,255,0.22)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(7, -264 + ph - 20 * cheer, 80, 80);
      c.restore();
    }
  }
  function drawMeta(c, t) {
    const MA = 1 - shotAt(t).amt; if (MA <= 0.01) return;
    const hit = t >= RUN.disc.end, flash = hit ? Math.exp(-(t - RUN.disc.end) * 4) : 0;
    const label = hit ? 'META ✓' : 'META 1.000';
    c.save(); c.globalAlpha = MA; c.font = '700 22px "Space Mono", monospace'; const tw = c.measureText(label).width;
    const px = CX('disc') - tw / 2 - 13, py = BAR ? BAR_Y - 150 : FLOOR - 330;
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
    motiv: track([[0, 1.0], [3.0, 1.0], [3.2, 1.3], [5.5, 1.3], [6.2, 0.5], [6.9, 0.08]]),
    disc: track([[0, 1.0], [3.0, 1.0], [3.3, 0.7], [6.5, 0.7], [6.7, 1.1], [10.4, 1.1], [11.0, 0.55]]),
    ego: track([[0, 1.0], [3.0, 1.0], [3.3, 0.7], [10.5, 0.7], [10.8, 1.15], [17.2, 1.15], [17.8, 0.45], [18.5, 0.2]]),
    obs: track([[0, 1.0], [3.0, 1.0], [3.3, 0.7], [10.5, 0.7], [10.8, 1.15], [13.9, 1.15], [14.2, 0.72], [15.1, 0.72], [15.5, 1.2], [18.9, 1.2], [19.05, 1.6], [20.4, 1.3]]),
  };

  // ---------- câmera por planos (o último é a disputa EGO x OBSESSÃO) ----------
  const SHOTS = [[0, 'wide'], [2.9, 'motiv'], [6.6, 'disc'], [10.6, 'duel'], [19.6, 'wide']];
  const FOCUS = { motiv: ['motiv'], disc: ['disc'], duel: ['ego', 'obs'] };
  const WIDE = BAR ? { cx: 660, cy: 960, s: 0.88, sy: 950 } : { cx: 692, cy: 960, s: 0.64, sy: 985 };
  const bias = track([[0, 0], [13.7, 0], [14.0, 1], [15.5, 1], [16.6, 0], [17.1, -1], [17.9, -1], [18.25, 0], [18.6, 1]]);
  function frameOf(n, t) {
    if (n === 'wide') return WIDE;
    if (n === 'duel') {
      const mid = (CX('ego') + CX('obs')) / 2;
      return BAR ? { cx: mid + 38 * bias(t), cy: FLOOR - 225 - 120 * easeInOut(seg(t, 18.5, 19.0)), s: 1.42, sy: 815 }
        : { cx: mid + 18 * bias(t), cy: FLOOR - 112, s: 1.4, sy: 960 };
    }
    return BAR ? { cx: CX(n), cy: FLOOR - 225, s: 1.45, sy: 845 } : { cx: CX(n) + 10, cy: FLOOR - 112, s: 2.4, sy: 905 };
  }
  function shotAt(t) {
    let i = 0; while (i < SHOTS.length - 1 && t >= SHOTS[i + 1][0]) i++;
    const cur = SHOTS[i], prev = i > 0 ? SHOTS[i - 1] : cur, u = i > 0 ? easeInOut(seg(t, cur[0], cur[0] + 0.55)) : 1;
    const A = frameOf(prev[1], t), B = frameOf(cur[1], t);
    const f = { cx: lerp(A.cx, B.cx, u), cy: lerp(A.cy, B.cy, u), s: Math.exp(lerp(Math.log(A.s), Math.log(B.s), u)), sy: lerp(A.sy, B.sy, u) };
    const za = (n) => (n === 'wide' ? 0 : 1), amt = lerp(za(prev[1]), za(cur[1]), u);
    const k = cur[1] !== 'wide' ? cur[1] : prev[1] !== 'wide' ? prev[1] : null;
    return { f, amt, k, foc: k ? FOCUS[k] : [], ts: cur[0], pk: prev[1] };
  }
  function camAt(t) {
    const S = shotAt(t), f = S.f;
    let s = f.s * (t < 2.9 ? lerp(1.08, 1.0, easeOut(seg(t, 1.5, 2.4))) : 1);
    const pk = S.k === 'duel' ? 'obs' : S.k;
    let punch = 0; if (pk) for (const ts of REPS[pk]) { const d = t - ts; if (d >= 0 && d < 0.4) punch += (S.k === 'duel' ? 0.012 : 0.018) * Math.exp(-d * 13) * S.amt; }
    s *= 1 + punch;
    let ox = 540 - f.cx * s, oy = f.sy - f.cy * s;
    const k1 = t >= 1.5 ? Math.exp(-(t - 1.5) * 9) : 0, k2 = t >= BREAK_T ? Math.exp(-(t - BREAK_T) * 5) : 0, k3 = t >= FALL_HIT ? Math.exp(-(t - FALL_HIT) * 8) : 0;
    ox += 15 * k1 * Math.sin((t - 1.5) * 70) + 24 * k2 * Math.sin((t - BREAK_T) * 60) + 16 * k3 * Math.sin((t - FALL_HIT) * 66);
    oy += 10 * k1 * Math.cos((t - 1.5) * 83) + 18 * k2 * Math.cos((t - BREAK_T) * 73) + 14 * k3 * Math.cos((t - FALL_HIT) * 79);
    return { s, ox, oy };
  }
  const toScreen = (p, C) => [p[0] * C.s + C.ox, p[1] * C.s + C.oy];
