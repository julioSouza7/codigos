
  // ================= MÉTODO MINIMALISTA 2.0: "A LIGAÇÃO" (20 s) — mais interação e animação =================
  const GT = 16.5, FL = C_FL, SX = 520, STOOL_Y = FL - 66;
  const fear = (t) => (smooth(seg(t, 3.0, 4.6)) * 0.6 * (1 - smooth(seg(t, 6.4, 6.7))) + smooth(seg(t, 8.0, 10.5))) * (1 - smooth(seg(t, 11.9, 12.2)));
  const seatSt = (x, lean, head, hands, extra) => (t) => { const st = Object.assign(cSeatSt(x, 1, lean, head), extra || {}); const hw = typeof hands === 'function' ? hands(t) : hands; st.hands = hw.map((p) => toRig(st, p)); return st; };
  const EAR = [SX + 8, FL - 152];

  // ---------- 2 · FAZ ----------
  const TOSS1 = 0.4, TOSS2 = 4.0, REACH0 = 6.0, REACH1 = 7.9, POP0 = 8.4;
  const fazKeys = [
    [0, seatSt(SX, 0.1, 0.1, [[SX + 44, FL - 104], [SX + 30, FL - 100]])],
    [TOSS1, seatSt(SX, -0.05, -0.3, (t) => [[SX + 50, FL - 150 - 40 * Math.sin(Math.PI * seg(t, TOSS1, TOSS1 + 0.45))], [SX + 30, FL - 100]]), 0.15],   // joga o celular pro alto
    [0.9, seatSt(SX, 0.25, 0.4, (t) => [[SX + 50 + 3 * Math.sin(t * 20), FL - 118], [SX + 44, FL - 112]]), 0.2],   // disca
    [1.35, seatSt(SX, 0.05, -0.05, [EAR, [SX + 30, FL - 100]], { gesture: true }), 0.25],
    [3.3, seatSt(SX, -0.05, -0.1, [EAR, [SX + 60, FL - 170]], { prefB: 'down' }), 0.2],   // joinha
    [4.0, seatSt(SX, -0.15, -0.1, [[SX - 20, FL - 166], [SX - 34, FL - 160]], { prefF: 'back', prefB: 'back' }), 0.35],   // relaxa
    [5.4, seatSt(SX, -0.05, -0.6, [[SX - 20, FL - 166], [SX - 34, FL - 160]], { prefF: 'back', prefB: 'back' }), 0.4],   // olha pra cima: "?"
    [REACH0, (t) => { const st = pose(SX + 10, STOOL_Y, STAND_L, -0.05, -0.5, handsDown(SX + 10, C_HY), { gesture: false, noWalk: true }); st.hands = [toRig(st, [SX + 70, -40]), toRig(st, [SX - 10, STOOL_Y - 80])]; st.prefF = 'down'; return st; }, 0.3],
    [REACH1, seatSt(SX, 0.05, -0.2, [[SX + 44, FL - 104], [SX + 30, FL - 100]]), 0.35],
    [POP0, (t) => { const u = 0.5 - 0.5 * Math.cos((t - POP0) * Math.PI * 2 / 0.9); const laugh = t > 14.8 ? Math.abs(Math.sin(t * 16)) : 0;
      const st = seatSt(SX, 0.05 - 0.2 * laugh, -0.45 + 0.2 * u, [P2([SX + 40, FL - 112], [SX + 24, FL - 150], u), [SX + 34, FL - 100]])(t); st.hipY -= 6 * laugh; return st; }, 0.35],
  ];
  const fazState = (t) => seq(fazKeys, t);

  // ---------- 1 · PENSA DEMAIS ----------
  const poke = (t) => { const u = Math.max(0, Math.sin((t - 0.2) * 3.2)); return [[SX + 84 + 26 * u, FL - 128 - 4 * u], [SX + 50 + 20 * u + 3 * Math.sin(t * 41), FL - 104]]; };   // dedo vai e volta da tela
  const pace = (t) => { const x = 470 + 130 * Math.sin((t - 5.2) * 1.6); const st = pose(x, FL, STAND_L, 0.12, 0.3, handsDown(x, C_HY), { face: Math.cos((t - 5.2) * 1.6) >= 0 ? 1 : -1, run: 0, gesture: false }); st.hands = [toRig(st, [x + 40 * (st.face), FL - 140]), toRig(st, [x + 20 * st.face, FL - 120])]; st.armFree = 0.2; return st; };
  const startle = (t) => { const st = pose(560, FL, CROUCH_L, -0.3, -0.4, handsDown(560, C_HY), { gesture: false, noWalk: true }); st.hands = [toRig(st, [600, FL - 220]), toRig(st, [520, FL - 210])]; st.prefF = 'up'; st.prefB = 'up'; st.hipY -= 40 * Math.sin(Math.PI * clamp((t - 6.6) / 0.35)); return st; };
  const readScroll = (t) => cStandW(560, 1, 0.15, 0.45, [[620, FL - 130], [590, FL - 126]])(t);
  const drink = (t) => cStandW(560, 1, -0.05, -0.35, [[580 + 3 * Math.sin(t * 40), FL - 176], [590, FL - 120]])(t);
  const checkWatch = (t) => cStandW(560, -1, 0.1, 0.2, [[528, FL - 140], [540, FL - 132]])(t);
  const melt = (t) => { const u = smooth(seg(t, 14.3, 14.8)); const st = seatSt(SX, lerp(0.45, -0.3, u), lerp(0.6, 0.2, u), [[SX + 30, FL - 150 + 120 * u], [SX + 22, FL - 146 + 120 * u]])(t); st.hipY = lerp(st.hipY, FL - 15 - 16, u); st.ay = FL; st.x = lerp(SX, SX + 40, u); st.legs = { fT: 1.5, fS: 1.55, bT: 1.45, bS: 1.5 }; return st; };
  const pensaKeys = [
    [0, seatSt(SX, -0.1, 0.25, poke)],
    [3.0, seatSt(SX, -0.35, -0.1, (t) => [[SX + 90 + 3 * Math.sin(t * 41), FL - 128], [SX + 60, FL - 100]]), 0.3],   // se afasta do celular gigante
    [6.6, startle, 0.08], [7.1, cStandW(560, 1, -0.1, 0.1, (t) => [[610 + 20 * Math.sin(t * 9), FL - 150], [540, FL - 140]], { gesture: false }), 0.25],
    [8.0, seatSt(SX, -0.3, 0.1, (t) => [[SX + 90 + 3 * Math.sin(t * 41), FL - 128], [SX + 60, FL - 100]]), 0.4],   // volta a encarar o celular gigante
    [12.0, seatSt(SX, 0.25, 0.4, (t) => [[SX + 50 + 3 * Math.sin(t * 20), FL - 118], [SX + 44, FL - 112]]), 0.3],
    [12.6, seatSt(SX, 0.05, -0.05, [EAR, [SX + 30, FL - 100]]), 0.25],
    [14.0, seatSt(SX, 0.45, 0.6, [[SX + 30, FL - 150], [SX + 22, FL - 146]]), 0.3],
    [14.3, melt, 0.1],
  ];
  const pensaState = (t) => { const st = seq(pensaKeys, t); if (t >= 6.6 && t < 6.95) st.sq = -0.12 * Math.sin(Math.PI * (t - 6.6) / 0.35); return st; };

  // ---------- cenário ----------
  function drawBack(c, k, t, P) {
    cStage(c, P, [330, 30], [540, 330]); cStool(c, SX + 10, STOOL_Y);
  }
  function phone(c, p, s, ring) { c.save(); c.translate(p[0], p[1]); c.scale(s, s); c.rotate(ring ? 0.06 * Math.sin(ring * 60) : 0);
    c.fillStyle = '#16161a'; c.strokeStyle = '#0e0e10'; c.lineWidth = 3 / Math.sqrt(s); c.beginPath(); c.roundRect(-9, -16, 18, 32, 4); c.fill(); c.stroke(); c.fillStyle = '#6fa8ff'; c.fillRect(-7, -13, 14, 24); c.restore(); }
  function drawFront(c, k, t, P, drawn) {
    const hp = drawn.main.hand, R = drawn.main.R, toP = drawn.main.toP;
    if (k === 'faz') {
      // celular voando nas jogadas
      let pp = hp, rot = 0;
      for (const [t0, h] of [[TOSS1, 90]]) { const a = seg(t, t0 + 0.1, t0 + 0.55); if (a > 0 && a < 1) { pp = [hp[0], hp[1] - h * Math.sin(Math.PI * a)]; rot = a * Math.PI * 4; } }
      if (t < POP0 && !(t > REACH0 && t < REACH1)) { c.save(); c.translate(pp[0], pp[1] - 8); c.rotate(rot); phone(c, [0, 0], 1, 0); c.restore(); }
      if (t > 4.3 && t < 5.4) { const a = t - 4.3; c.save(); c.globalAlpha = Math.min(1, a * 4) * (1 - smooth(seg(t, 5.0, 5.4))); c.strokeStyle = rgb(PAL.faz); c.lineWidth = 10; c.lineCap = 'round'; const cx = SX + 120, cy = FL - 230 - a * 10;
        c.beginPath(); c.moveTo(cx - 22, cy); c.lineTo(cx - 6, cy + 16); c.lineTo(cx + 24, cy - 18); c.stroke(); c.restore(); }
      if (t > 5.4 && t < 6.0) { const hd = drawn.main.head; c.fillStyle = '#f4f2ee'; c.font = '900 40px Montserrat'; c.textAlign = 'center'; c.fillText('?', hd[0] + 10, hd[1] - 50 - 6 * Math.sin(t * 8)); }
      if (t >= POP0) { cPopcorn(c, toP(R.armB[2]), t); if (t > 14.8 && t < 16.4) { const hd = drawn.main.head; c.fillStyle = 'rgba(244,242,238,0.9)'; c.font = '800 20px "Space Mono"'; c.textAlign = 'center'; c.fillText('HAHA', hd[0] + 50, hd[1] - 30 - 10 * Math.abs(Math.sin(t * 8))); } }
      // atendente do outro lado da linha
      const ins = t < 1.6 ? 0 : t < 3.9 ? smooth(seg(t, 1.6, 1.9)) : 1 - smooth(seg(t, 3.9, 4.1));
      cCallInset(c, 755, 105, t, ins, t > 2.5 && t < 3.2 ? 1 : 0);
    } else {
      const g = fear(t), onPhone = !(t > 6.6 && t < 8.0);
      if (onPhone) { const s = 1 + 4.5 * g; phone(c, [hp[0] + 4 + 30 * g, hp[1] - 8 - 100 * g], s, g > 0.2 ? t : 0); }
      cBurst(c, drawn.main.head, 6.6, t);
      cCallInset(c, 740, 105, t, t < 13.0 ? 0 : t < 14.3 ? smooth(seg(t, 13.0, 13.3)) : 1 - smooth(seg(t, 14.3, 14.5)), t > 13.2 && t < 14.0 ? 1 : 0, smooth(seg(t, 13.9, 14.1)));
      if (g > 0.3) cSweat(c, drawn.main.head, t);
    }
  }
  // braço do FAZ atravessando a divisória para oferecer o celular
  function drawGlobal(c, t, LM, dim) {
    const u = smooth(seg(t, REACH0 + 0.2, REACH0 + 0.6)) * (1 - smooth(seg(t, REACH1 - 0.4, REACH1)));
    if (u <= 0) return; const x0 = 640, y0 = 860, x1 = 690, y1 = lerp(860, 690, u);
    c.save(); c.beginPath(); c.rect(0, 150, W, 860 - 150); c.clip(); cArm(c, [[x0, y0], [lerp(x0, 660, u), lerp(y0, 760, u)], [x1, y1]], 30);
    c.fillStyle = '#f7f7f5'; c.strokeStyle = '#0e0e10'; c.lineWidth = 5; c.beginPath(); c.arc(x1, y1, 20, 0, Math.PI * 2); c.fill(); c.stroke();
    c.save(); c.translate(x1 + 4, y1 - 30); c.rotate(0.2); c.fillStyle = '#16161a'; c.beginPath(); c.roundRect(-14, -26, 28, 50, 6); c.fill(); c.stroke(); c.fillStyle = '#6fa8ff'; c.fillRect(-11, -22, 22, 40); c.restore();
    c.restore();
  }

  const SCENE = {
    minimal: true, noMonitor: true, metricLabel: '', totalLabel: '', reportT: GT, noReport: true, drawGlobal,
    tint: (k, t) => (k === 'pensa' ? 0.55 * fear(t) : 0), tintCol: [150, 205, 150],
    secsText: (n) => `${n}`,
    state: { faz: fazState, pensa: pensaState },
    drawBack, drawFront,
    cam: (k, t) => (k === 'faz' ? { x: 590, y: 185, z: 1.15 + 0.08 * Math.exp(-Math.max(0, t - 4.3) * 5) * (t > 4.3 ? 1 : 0) } : { x: 580, y: 185, z: 1.15 - 0.2 * fear(t) + 0.1 * Math.exp(-Math.max(0, t - 6.6) * 6) * (t > 6.6 ? 1 : 0) }),
    pain: { faz: () => 0, pensa: () => 0 },
    bubbles: {
      faz: [
        { t0: 1.6, t1: 2.4, text: 'OI! QUERO MARCAR.' },
        { t0: 2.5, t1: 3.2, text: 'SEXTA, 10H?', col: PAL.azul, x: 600 },
        { t0: 3.3, t1: 3.95, text: 'PERFEITO.', col: PAL.faz },
      ],
      pensa: [
        { t0: 1.0, t1: 2.6, text: 'E SE ATENDEREM?' },
        { t0: 6.15, t1: 6.6, text: 'QUER QUE EU LIGUE?', col: PAL.faz, x: 430 },
        { t0: 7.1, t1: 7.9, text: 'NÃO! EU CONSIGO!' },
        { t0: 8.8, t1: 10.0, text: 'E SE EU GAGUEJAR?' },
        { t0: 13.2, t1: 14.1, text: 'JÁ FECHAMOS.', col: PAL.azul, x: 560 },
      ],
    },
    shake: (k, t) => (k === 'pensa' ? 7 * (t >= 6.6 ? Math.exp(-(t - 6.6) * 8) : 0) + 5 * (t >= 14.55 ? Math.exp(-(t - 14.55) * 8) : 0) : 0),
    caps: [
      { s: GT + 0.1, e: 99, center: true, lines: [[GT + 0.3, [['A LIGAÇÃO: '], ['30 SEGUNDOS.', 'faz']]], [GT + 0.9, [['O MEDO: '], ['O DIA TODO.', 'dor']]]] },
    ],
    sched: {
      noBips: true, noPops: true, music: 0.18, focusKeys: [[0, 'faz'], [2.65, 'pensa'], [4.0, 'faz'], [6.5, 'pensa']],
      fx: [
        // FAZ
        [TOSS1, 'whoosh', 0.22, 0.35], [0.85, 'foley/cloth_05', 0.2, 0.35], ...[0.95, 1.05, 1.15, 1.25].map((x) => [x, 'foley/toque_tela', 0.4, 0.35]), [1.35, 'tuu', 0.35, 0.35],
        // PENSA: celular cresce
        [2.7, 'ominous', 0.4, -0.35, 1.2],
        // FAZ: checa e sobe no banquinho
        [4.35, 'chime', 0.16, 0.35], [6.0, 'foley/cloth_04', 0.3, 0.35],
        // PENSA
        [6.6, 'thud', 0.22, -0.35], [6.62, 'voz_pensa/dor_02', 0.3, -0.35, 1.3], [8.1, 'ominous', 0.38, -0.35, 1.4],
        [12.0, 'pop', 0.25, -0.35], ...[12.15, 12.3, 12.45].map((x) => [x, 'foley/toque_tela', 0.4, -0.35]),
        [12.65, 'busy', 0.38, -0.35], [14.5, 'thud', 0.2, -0.35], [14.55, 'foley/cloth_05', 0.3, -0.35],
        // FAZ ri da cena
        [15.1, 'voz_faz/yell6', 0.3, 0.35],
      ],
      heartReal: [[10.0, 11.9, -0.35]],
    },
  };
