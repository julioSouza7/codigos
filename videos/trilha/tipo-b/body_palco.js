
  // ================= MÉTODO MINIMALISTA: "A APRESENTAÇÃO" (17 s) =================
  // piada visual: na cabeça de quem pensa demais, a plateia de 3 pessoas vira um estádio e o microfone vira um gigante.
  const GT = 13.5, FL = C_FL;
  const MIC = [612, FL];
  const grow = (t) => smooth(seg(t, 3.5, 4.5)) * 0.35 + smooth(seg(t, 5.6, 7.0)) * 0.65;   // 0 = real, 1 = estádio
  const real = (t) => 1 - smooth(seg(t, 9.55, 9.9));
  const fear = (t) => grow(t) * real(t);

  // ---------- poses ----------
  const holdPaper = (x, tremble = 0) => (t) => cStandW(x, 1, 0.05, 0.12, [[x + 40 + tremble * 3 * Math.sin(t * 40), FL - 128 + tremble * 3 * Math.cos(t * 37)], [x + 26, FL - 120]])(t);
  const talk = (x) => (t) => cStandW(x, 1, 0.02, -0.02, [[x + 64 + 12 * Math.sin(t * 6), FL - 150 + 12 * Math.sin(t * 8.4)], [x + 26, FL - 120]], { gesture: true })(t);
  const bow = (x) => cStandW(x, 1, 0.55, 0.4, [[x + 20, FL - 70], [x + 4, FL - 66]]);
  const dance = (x) => (t) => { const b = Math.sin(t * 9); const st = cStandW(x + 8 * Math.sin(t * 4.5), 1, 0.08 * b, -0.1, [[x + 40, FL - 200 - 40 * Math.max(0, b)], [x - 30, FL - 200 - 40 * Math.max(0, -b)]], { prefF: 'down', prefB: 'down' })(t); st.hipY -= 8 * Math.abs(b); return st; };
  const fazKeys = [[0, holdPaper(430)], [0.4, cWalk(430, 560, 0.4, 1.3), 0.2], [1.3, talk(560), 0.3], [2.95, bow(560), 0.3], [3.5, cStand(560, -1), 0.25],
    [3.6, cWalk(560, -150, 3.6, 4.8, -1), 0.2], [9.7, cWalk(-150, 430, 9.7, 10.5, 1), 0.01], [10.5, dance(430), 0.3]];
  const fazState = (t) => seq(fazKeys, t);
  const sway = (x) => (t) => { const st = holdPaper(x, 2.5)(t); st.lean += 0.12 * Math.sin(t * 2.2); st.head += 0.2 * Math.sin(t * 1.7); return st; };
  const pensaKeys = [[0, holdPaper(470, 1)], [4.6, holdPaper(470, 2)], [7.7, sway(470), 0.4], [9.6, holdPaper(470, 1), 0.3],
    [10.0, cWalk(470, 560, 10.0, 10.8), 0.2], [10.8, cStandW(560, 1, 0.1, 0.25, [[608, FL - 150], [586, FL - 120]]), 0.3]];
  const pensaState = (t) => seq(pensaKeys, t);

  // ---------- desenho ----------
  // plateia: 3 pessoas reais; o medo acrescenta fileiras e um estádio
  function person(c, x, y, s, a = 1) { c.save(); c.globalAlpha = a; c.fillStyle = '#c9c9ce'; c.strokeStyle = '#0e0e10'; c.lineWidth = 4; c.beginPath(); c.arc(x, y - 30 * s, 15 * s, 0, Math.PI * 2); c.fill(); c.stroke();
    c.beginPath(); c.roundRect(x - 16 * s, y - 14 * s, 32 * s, 30 * s, 10 * s); c.fill(); c.stroke(); c.restore(); }
  function drawAudience(c, k, t) {
    const g = k === 'pensa' ? fear(t) : 0, clapF = k === 'faz' && t > 2.9 && t < 3.6;
    // estádio ao fundo (só na imaginação)
    if (g > 0.4) { const u = smooth(seg(g, 0.4, 1)); c.save(); c.globalAlpha = u;
      for (let r = 0; r < 6; r++) { const y = 210 - r * 34, n = 14 + r * 3; for (let i = 0; i < n; i++) { const x = 700 + (i / n) * 460 + (r % 2) * 8; c.fillStyle = `rgba(200,200,210,${0.5 - r * 0.06})`; c.beginPath(); c.arc(x, y + 4 * Math.sin(t * 6 + i + r), 7 - r * 0.6, 0, Math.PI * 2); c.fill(); } }
      for (let i = 0; i < 3; i++) { c.save(); c.globalCompositeOperation = 'lighter'; c.filter = 'blur(10px)'; c.fillStyle = 'rgba(255,240,200,0.18)'; const lx = 760 + i * 140 + 30 * Math.sin(t * 1.3 + i); c.beginPath(); c.moveTo(lx, -40); c.lineTo(lx + 30, -40); c.lineTo(lx - 120, FL); c.lineTo(lx - 200, FL); c.closePath(); c.fill(); c.restore(); }
      c.restore(); }
    // fileiras extras
    if (g > 0.05) { const u = smooth(seg(g, 0.05, 0.35)); for (let r = 0; r < 2; r++) for (let i = 0; i < 4; i++) person(c, 715 + i * 52 + r * 24, FL - 50 - r * 40, 0.8 - r * 0.12, u * (0.9 - r * 0.2)); }
    // as 3 pessoas reais (sentadas, de costas para nós, olhando o palestrante)
    for (let i = 0; i < 3; i++) { const x = 735 + i * 62, bob = clapF ? 3 * Math.sin(t * 30 + i) : 0; person(c, x, FL - 8 + bob, 1); }
    if (k === 'pensa' && t > 11.9 && t < 12.6) { c.fillStyle = '#c9c9ce'; c.beginPath(); c.arc(797, FL - 70, 8, 0, Math.PI * 2); c.fill(); }   // uma palma
  }
  function drawMic(c, k, t) {
    const s = 1 + (k === 'pensa' ? 2.2 * fear(t) : 0);
    c.save(); c.translate(MIC[0], MIC[1]); c.scale(s, s);
    c.strokeStyle = '#3a3a40'; c.lineWidth = 7; c.lineCap = 'round'; c.beginPath(); c.moveTo(-22, 0); c.lineTo(22, 0); c.moveTo(0, 0); c.lineTo(0, -150); c.lineTo(-14, -172); c.stroke();
    c.fillStyle = rgb(PAL.dor); c.strokeStyle = '#0e0e10'; c.lineWidth = 3; c.beginPath(); c.ellipse(-18, -180, 11, 15, -0.6, 0, Math.PI * 2); c.fill(); c.stroke(); c.restore();
  }
  function drawBack(c, k, t, P) {
    cStage(c, P, [360, 30], [560, 330]);
    drawAudience(c, k, t);
  }
  function drawFront(c, k, t, P, drawn) {
    drawMic(c, k, t);
    // papel na mão
    const hp = drawn.main.hand, hasPaper = !(k === 'faz' && t > 2.9);
    if (hasPaper) { c.save(); c.translate(hp[0] + 4, hp[1] - 6); c.rotate(-0.15); c.fillStyle = '#f4ead8'; c.strokeStyle = '#0e0e10'; c.lineWidth = 3; c.fillRect(-14, -18, 28, 36); c.strokeRect(-14, -18, 28, 36); c.restore(); }
    if (k === 'faz' && t > 10.4) { c.fillStyle = '#e8dcc6'; c.strokeStyle = '#0e0e10'; c.lineWidth = 3; const cp = drawn.main.toP(drawn.main.R.armB[2]); c.beginPath(); c.roundRect(cp[0] - 9, cp[1] - 12, 18, 22, 3); c.fill(); c.stroke(); }
    if (k === 'pensa' && fear(t) > 0.3) cSweat(c, drawn.main.head, t);
    if (k === 'pensa' && t > 12.2 && t < 13.4) { c.fillStyle = 'rgba(220,220,230,0.8)'; c.font = '700 16px "Space Mono"'; c.textAlign = 'center'; c.fillText('cri cri', 830, FL - 110 - 8 * Math.sin(t * 6)); }
  }

  const SCENE = {
    minimal: true, noMonitor: true, metricLabel: '', totalLabel: '', reportT: GT, noReport: true,
    tint: (k, t) => (k === 'pensa' ? 0.55 * fear(t) : 0), tintCol: [150, 205, 150],
    secsText: (n) => `${n}`,
    state: { faz: fazState, pensa: pensaState },
    drawBack, drawFront,
    cam: (k, t) => ({ x: 600, y: 185, z: k === 'pensa' ? 1.2 - 0.15 * fear(t) : 1.2 }),
    pain: { faz: () => 0, pensa: () => 0 },
    bubbles: {
      faz: [
        { t0: 1.4, t1: 2.8, text: 'BOM DIA! VAMOS LÁ.' },
        { t0: 3.0, t1: 3.5, text: 'VALEU!', col: PAL.faz },
      ],
      pensa: [
        { t0: 1.5, t1: 2.8, text: 'E SE EU ESQUECER?' },
        { t0: 4.6, t1: 5.6, text: 'TEM MAIS GENTE?' },
        { t0: 6.4, t1: 7.4, text: 'É UM ESTÁDIO.' },
        { t0: 8.0, t1: 9.2, text: 'TÔ TONTO...' },
        { t0: 11.0, t1: 11.9, text: '...oi.' },
      ],
    },
    shake: (k, t) => 0,
    caps: [
      { s: GT + 0.1, e: 99, center: true, lines: [[GT + 0.3, [['A PLATEIA ERA DE '], ['3 PESSOAS.', 'faz']]], [GT + 0.9, [['O MEDO ERA DE UM '], ['ESTÁDIO.', 'dor']]]] },
    ],
    sched: {
      noBips: true, noPops: true, music: 0.18, focusKeys: [[0, 'faz'], [4.9, 'pensa']],
      fx: [
        // FAZ (0–4,8)
        [1.45, 'foley/pagina_2', 0.4, 0.35], [2.9, 'applause', 0.45, 0.35, 0.6],
        // PENSA (5,0–13,4)
        [5.0, 'murmur', 0.35, -0.35, 0.95], [6.0, 'roar', 0.4, -0.35, 1.6], [9.6, 'pop', 0.25, -0.35], [11.05, 'voz_pensa/dor_02', 0.18, -0.35, 1.25],
        [12.0, 'clap', 0.6, -0.35], [12.3, 'crickets', 0.35, -0.35, 1.1],
      ],
      heartReal: [[7.7, 9.5, -0.35]],
    },
  };
