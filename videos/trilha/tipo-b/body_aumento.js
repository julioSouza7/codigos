
  // ================= MÉTODO MINIMALISTA: "O AUMENTO" (17 s) =================
  // piada visual: para quem pensa demais, a porta do chefe vira um portão gigante com cadeados e a sombra de um monstro.
  const GT = 13.5, FL = C_FL, DOORX = 700;
  const fear = (t) => (smooth(seg(t, 3.0, 4.8)) * 0.5 + smooth(seg(t, 5.0, 7.4)) * 0.5) * (1 - smooth(seg(t, 9.55, 9.9)));
  const OPEN_F = 1.5, OPEN_P = 11.35;
  const openAmt = (k, t) => (k === 'faz' ? smooth(seg(t, OPEN_F, OPEN_F + 0.3)) * (1 - smooth(seg(t, 4.0, 4.3))) : smooth(seg(t, OPEN_P, OPEN_P + 0.3)));

  const knock = (x) => (t) => cStandW(x, 1, 0.05, 0.05, [[x + 70 + 8 * Math.max(0, Math.sin(t * 20)), FL - 160], [x + 20, FL - 110]])(t);
  const shake = (x) => cStandW(x, 1, 0.08, 0.05, [[x + 66, FL - 118], [x + 40, FL - 112]]);
  const scared = (x, tr) => (t) => cStandW(x, 1, -0.05, 0.2, [[x + 30 + tr * 3 * Math.sin(t * 41), FL - 140], [x + 14, FL - 132]])(t);
  const fazKeys = [[0, cStand(420)], [0.2, cWalk(420, 620, 0.2, 1.0), 0.2], [1.0, knock(620), 0.25], [1.5, cStand(620), 0.3], [3.4, shake(620), 0.3], [4.1, cStand(620, -1), 0.25], [4.2, cWalk(620, -150, 4.2, 5.3, -1), 0.2]];
  const fazState = (t) => seq(fazKeys, t);
  const pensaKeys = [[0, scared(430, 1)], [5.0, scared(430, 2)], [9.6, scared(430, 1), 0.3], [10.0, cWalk(430, 620, 10.0, 10.9), 0.2], [10.9, knock(620), 0.25], [11.4, cStand(620), 0.3]];
  const pensaState = (t) => seq(pensaKeys, t);
  // chefe (azul)
  const boss = (k) => (t) => {
    const o = openAmt(k, t);
    if (k === 'faz') { if (o < 0.5) return pose(-600, FL, STAND_L, 0, 0, handsDown(-600, C_HY), { noWalk: true });
      return t > 3.4 && t < 4.0 ? cStandW(760, -1, 0.08, 0.05, [[690, FL - 112], [740, FL - 100]])(t) : cStand(760, -1)(t); }
    if (t < OPEN_P + 0.15) return pose(-600, FL, STAND_L, 0, 0, handsDown(-600, C_HY), { noWalk: true });
    if (t < 12.6) return cStandW(760, -1, 0.02, 0.05, [[730, FL - 100], [748, FL - 96]])(t);
    return cWalk(760, 1250, 12.6, 13.6, 1)(t);
  };

  function drawDoor(c, k, t) {
    const g = k === 'pensa' ? fear(t) : 0, s = 1 + 1.6 * g, o = openAmt(k, t);
    c.save(); c.translate(DOORX, FL); c.scale(s, s);
    // vão escuro e batente
    c.fillStyle = '#0b0b0d'; c.fillRect(-10, -230, 120, 230); c.strokeStyle = '#3a3a40'; c.lineWidth = 8; c.strokeRect(-10, -230, 120, 230);
    // porta (abre girando)
    const w = 100 * (1 - 0.85 * o); c.fillStyle = mixC([92, 64, 40], [60, 40, 30], g).map(Math.round).reduce((a, v, i) => a + (i ? ',' : '') + v, 'rgb(') + ')';
    c.fillRect(0, -222, w, 222); c.strokeStyle = '#0e0e10'; c.lineWidth = 4; c.strokeRect(0, -222, w, 222);
    if (o < 0.3) {
      c.fillStyle = '#e8c547'; c.beginPath(); c.arc(w - 14, -110, 5, 0, Math.PI * 2); c.fill();
      // janelinha fosca com a sombra do "monstro"
      c.fillStyle = 'rgba(220,220,200,0.25)'; c.fillRect(20, -200, 60, 60);
      if (g > 0.2) { c.save(); c.beginPath(); c.rect(20, -200, 60, 60); c.clip(); const u = smooth(seg(g, 0.2, 0.9)); c.fillStyle = 'rgba(10,10,12,0.9)'; c.beginPath(); c.arc(50, -150 + 30 * (1 - u), 24 + 30 * u, 0, Math.PI * 2); c.fill();
        c.fillStyle = rgb(PAL.dor); c.beginPath(); c.arc(42, -162, 3 + 2 * u, 0, Math.PI * 2); c.arc(58, -162, 3 + 2 * u, 0, Math.PI * 2); c.fill(); c.restore(); }
      // placa e cadeados
      c.fillStyle = '#e8dcc6'; c.fillRect(25, -130, 50, 16); c.fillStyle = '#1a1a1a'; c.font = '800 10px Montserrat'; c.textAlign = 'center'; c.fillText('CHEFE', 50, -118);
      if (g > 0.5) { const u = smooth(seg(g, 0.5, 1)); for (let i = 0; i < 3; i++) { c.save(); c.globalAlpha = u; c.strokeStyle = '#9a9aa2'; c.lineWidth = 4; c.beginPath(); c.moveTo(-6, -40 - i * 50); c.lineTo(106, -60 - i * 50); c.stroke();
        c.fillStyle = '#e8c547'; c.strokeStyle = '#0e0e10'; c.lineWidth = 2; c.fillRect(42, -62 - i * 50, 16, 14); c.strokeRect(42, -62 - i * 50, 16, 14); c.restore(); } }
    }
    c.restore();
  }
  function drawBack(c, k, t, P) { cStage(c, P, [330, 30], [600, 330]); drawDoor(c, k, t); }
  function drawFront(c, k, t, P, drawn) {
    if (k === 'faz' && t > 3.7 && t < 6) { const hd = drawn.main.head, a = t - 3.7; c.save(); c.globalAlpha = Math.min(1, a * 3) * (1 - smooth(seg(t, 5.3, 6))); c.fillStyle = rgb(PAL.faz); c.font = '900 30px Montserrat'; c.textAlign = 'center'; c.fillText('+20%', hd[0] + 40, hd[1] - 20 - a * 12); c.restore(); }
    if (k === 'pensa' && fear(t) > 0.3) cSweat(c, drawn.main.head, t);
    // casaco do chefe indo embora
    if (k === 'pensa' && t > OPEN_P + 0.15 && drawn.other) { const hp = drawn.other.hand; c.fillStyle = '#4a4a52'; c.strokeStyle = '#0e0e10'; c.lineWidth = 3; c.beginPath(); c.roundRect(hp[0] - 12, hp[1] - 4, 24, 34, 5); c.fill(); c.stroke(); }
  }

  const SCENE = {
    minimal: true, noMonitor: true, metricLabel: '', totalLabel: '', reportT: GT, noReport: true,
    tint: (k, t) => (k === 'pensa' ? 0.55 * fear(t) : 0), tintCol: [150, 205, 150],
    secsText: (n) => `${n}`,
    state: { faz: fazState, pensa: pensaState },
    others: { faz: [{ id: 'other', fn: boss('faz'), col: PAL.azul, seed: 51, glow: 0 }], pensa: [{ id: 'other', fn: boss('pensa'), col: PAL.azul, seed: 53, glow: 0 }] },
    drawBack, drawFront,
    cam: (k, t) => ({ x: 600, y: 185, z: k === 'pensa' ? 1.15 - 0.3 * fear(t) : 1.15 }),
    pain: { faz: () => 0, pensa: () => 0 },
    bubbles: {
      faz: [
        { t0: 1.8, t1: 2.8, text: 'QUERO UM AUMENTO.' },
        { t0: 2.95, t1: 3.6, text: 'FECHADO.', col: PAL.azul, who: 'other' },
      ],
      pensa: [
        { t0: 1.6, t1: 2.8, text: 'E SE ELE GRITAR?' },
        { t0: 5.2, t1: 6.3, text: 'E SE ME DEMITIR?' },
        { t0: 7.6, t1: 8.8, text: 'VOU AMANHÃ...' },
        { t0: 11.7, t1: 12.8, text: 'FALA AMANHÃ, TÔ INDO.', col: PAL.azul, who: 'other' },
      ],
    },
    shake: () => 0,
    caps: [
      { s: GT + 0.1, e: 99, center: true, lines: [[GT + 0.3, [['O SIM VEIO EM '], ['2 SEGUNDOS.', 'faz']]], [GT + 0.9, [['O MEDO DUROU '], ['MESES.', 'dor']]]] },
    ],
    sched: {
      noBips: true, noPops: true, music: 0.18, focusKeys: [[0, 'faz'], [5.4, 'pensa']],
      fx: [
        [1.05, 'knock', 0.6, 0.35], [OPEN_F, 'foley/porta', 0.5, 0.35], [3.45, 'foley/cloth_04', 0.3, 0.35], [3.8, 'chime', 0.14, 0.35],
        [5.5, 'ominous', 0.42, -0.35, 1.4], [7.5, 'exhale', 0.2, -0.35], [9.6, 'pop', 0.25, -0.35], [10.95, 'knock', 0.6, -0.35], [OPEN_P, 'foley/porta', 0.5, -0.35], [13.0, 'exhale', 0.22, -0.35],
      ],
      heartReal: [[8.0, 9.5, -0.35]],
    },
  };
