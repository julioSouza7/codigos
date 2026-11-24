
  // ================= MÉTODO MINIMALISTA: "A LIGAÇÃO" (17 s) =================
  // piada visual: para quem pensa demais, o celular cresce até ficar maior que ele e o roteiro do ensaio desenrola até o chão.
  const GT = 13.5, FL = C_FL, SX = 520;
  const fear = (t) => (smooth(seg(t, 2.5, 4.5)) * 0.5 + smooth(seg(t, 5.0, 7.5)) * 0.5) * (1 - smooth(seg(t, 9.55, 9.9)));
  // poses sentado no banquinho (de frente para a direita)
  const STOOL_Y = FL - 66;
  const seatSt = (lean, head, hands, extra) => (t) => { const st = Object.assign(cSeatSt(SX, 1, lean, head), extra || {}); const hw = typeof hands === 'function' ? hands(t) : hands; st.hands = hw.map((p) => toRig(st, p)); return st; };
  const EAR = [SX + 8, FL - 152], LAP = [SX + 44, FL - 104];
  const dial = seatSt(0.25, 0.4, (t) => [[SX + 50 + 3 * Math.sin(t * 20), FL - 118], [SX + 44, FL - 112]]);
  const onEar = seatSt(0.05, -0.05, [EAR, [SX + 30, FL - 100]]);
  const relax = seatSt(-0.15, -0.1, [[SX - 20, FL - 166], [SX - 34, FL - 160]], { prefF: 'back', prefB: 'back' });
  const holdFar = (tr) => seatSt(-0.1, 0.25, (t) => [[SX + 84 + tr * 3 * Math.sin(t * 41), FL - 128], [SX + 50, FL - 100 + tr * 2 * Math.sin(t * 37)]]);
  const fazKeys = [[0, seatSt(0.1, 0.1, [LAP, [SX + 30, FL - 100]])], [0.4, dial, 0.25], [1.3, onEar, 0.3], [3.7, relax, 0.35]];
  const fazState = (t) => seq(fazKeys, t);
  const pensaKeys = [[0, holdFar(1)], [5.0, holdFar(2)], [9.6, holdFar(1), 0.3], [10.0, dial, 0.3], [10.6, onEar, 0.3], [12.3, seatSt(0.45, 0.6, [[SX + 30, FL - 150], [SX + 22, FL - 146]]), 0.35]];
  const pensaState = (t) => seq(pensaKeys, t);

  function drawBack(c, k, t, P) { cStage(c, P, [330, 30], [540, 330]); cStool(c, SX + 10, STOOL_Y); }
  function phone(c, p, s, ring) {
    c.save(); c.translate(p[0], p[1]); c.scale(s, s); c.rotate(ring ? 0.06 * Math.sin(ring * 60) : 0);
    c.fillStyle = '#16161a'; c.strokeStyle = '#0e0e10'; c.lineWidth = 3 / Math.sqrt(s); c.beginPath(); c.roundRect(-9, -16, 18, 32, 4); c.fill(); c.stroke();
    c.fillStyle = '#6fa8ff'; c.fillRect(-7, -13, 14, 24); c.restore();
  }
  function drawFront(c, k, t, P, drawn) {
    const hp = drawn.main.hand, g = k === 'pensa' ? fear(t) : 0;
    // celular: cresce no medo (ancorado na mão)
    const s = 1 + 6 * g;
    phone(c, [hp[0] + 2 + 30 * g, hp[1] - 8 - 120 * g], s, g > 0.2 ? t : 0);
    if (g > 0.4) { c.strokeStyle = `rgba(255,255,255,${0.6 * g})`; c.lineWidth = 4; const cx = hp[0] + 30 * g, cy = hp[1] - 120 * g; for (let i = 1; i <= 2; i++) { c.beginPath(); c.arc(cx, cy, 70 * s / 4 + i * 18, -0.6, 0.6); c.stroke(); c.beginPath(); c.arc(cx, cy, 70 * s / 4 + i * 18, Math.PI - 0.6, Math.PI + 0.6); c.stroke(); } }
    // roteiro de ensaio desenrolando até o chão
    if (k === 'pensa' && t > 5.0 && t < 9.8) { const u = smooth(seg(t, 5.0, 7.5)) * (1 - smooth(seg(t, 9.5, 9.8))), hb = drawn.main.toP(drawn.main.R.armB[2]);
      const len = 30 + 260 * u; c.fillStyle = '#f4ead8'; c.strokeStyle = '#0e0e10'; c.lineWidth = 3; c.beginPath(); c.moveTo(hb[0] - 14, hb[1]); c.lineTo(hb[0] + 14, hb[1]); c.lineTo(hb[0] + 30 + len * 0.2, Math.min(FL, hb[1] + len)); c.lineTo(hb[0] + 2 + len * 0.2, Math.min(FL, hb[1] + len)); c.closePath(); c.fill(); c.stroke();
      if (hb[1] + len > FL) { c.beginPath(); c.roundRect(hb[0] + len * 0.2, FL - 10, (hb[1] + len - FL) * 0.8 + 10, 10, 4); c.fill(); c.stroke(); }
      c.strokeStyle = 'rgba(0,0,0,0.3)'; c.lineWidth = 2; for (let i = 12; i < len; i += 14) { const y = Math.min(FL - 4, hb[1] + i); c.beginPath(); c.moveTo(hb[0] + i * 0.2, y); c.lineTo(hb[0] + 18 + i * 0.2, y); c.stroke(); } }
    if (k === 'pensa' && g > 0.3) cSweat(c, drawn.main.head, t);
  }

  const SCENE = {
    minimal: true, noMonitor: true, metricLabel: '', totalLabel: '', reportT: GT, noReport: true,
    tint: (k, t) => (k === 'pensa' ? 0.55 * fear(t) : 0), tintCol: [150, 205, 150],
    secsText: (n) => `${n}`,
    state: { faz: fazState, pensa: pensaState },
    drawBack, drawFront,
    cam: (k, t) => ({ x: 560, y: 185, z: k === 'pensa' ? 1.2 - 0.25 * fear(t) : 1.2 }),
    pain: { faz: () => 0, pensa: () => 0 },
    bubbles: {
      faz: [
        { t0: 1.6, t1: 2.9, text: 'OI! QUERO MARCAR.' },
        { t0: 3.0, t1: 3.6, text: 'FECHADO!', col: PAL.azul },
        { t0: 4.0, t1: 4.8, text: 'PRONTO.', col: PAL.faz },
      ],
      pensa: [
        { t0: 1.6, t1: 2.9, text: 'E SE ATENDEREM?' },
        { t0: 5.2, t1: 6.3, text: 'VOU ENSAIAR.' },
        { t0: 7.0, t1: 8.2, text: 'PÁGINA 47...' },
        { t0: 11.0, t1: 12.2, text: 'JÁ FECHAMOS.', col: PAL.azul },
      ],
    },
    shake: () => 0,
    caps: [
      { s: GT + 0.1, e: 99, center: true, lines: [[GT + 0.3, [['A LIGAÇÃO: '], ['30 SEGUNDOS.', 'faz']]], [GT + 0.9, [['O ENSAIO: '], ['O DIA TODO.', 'dor']]]] },
    ],
    sched: {
      noBips: true, noPops: true, music: 0.18, focusKeys: [[0, 'faz'], [4.9, 'pensa']],
      fx: [
        ...[0.5, 0.65, 0.8, 0.95, 1.1].map((x) => [x, 'foley/toque_tela', 0.45, 0.35]), [1.3, 'tuu', 0.4, 0.35], [3.75, 'foley/cloth_05', 0.3, 0.35], [4.1, 'exhale', 0.18, 0.35],
        [5.2, 'foley/pagina_1', 0.45, -0.35], [6.0, 'foley/pagina_2', 0.45, -0.35], [6.6, 'ominous', 0.4, -0.35, 1.0], [9.6, 'pop', 0.25, -0.35],
        ...[10.05, 10.2, 10.35, 10.5].map((x) => [x, 'foley/toque_tela', 0.45, -0.35]), [10.7, 'busy', 0.4, -0.35], [12.4, 'exhale', 0.22, -0.35],
      ],
      heartReal: [[7.8, 9.5, -0.35]],
    },
  };
