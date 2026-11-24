
  // ================= "MESMO IDIOMA" (layout B, 17 s) =================
  const GT = 13.5, FL = C_FL, END = 12.4, MAXD = 180;
  const dayOf = (t) => Math.max(1, Math.min(MAXD, Math.round(1 + (MAXD - 1) * Math.pow(clamp(t / END), 1.2))));
  const prog = (t) => (dayOf(t) - 1) / (MAXD - 1);
  const CH = 520, D0 = 560, D1 = 800, DT = FL - 92;
  const BLUE = [111, 168, 255];
  const LEVELS = ['A1', 'A2', 'B1', 'B2'];
  const levelOf = (t) => LEVELS[Math.min(3, Math.floor(prog(t) * 4))];
  const LEVEL_T = [1, 2, 3].map((i) => { for (let x = 0; x < END; x += 0.02) if (Math.floor(prog(x) * 4) >= i) return +x.toFixed(2); return END; });

  const speak = cSeat(CH, 1, 0.08, -0.02, (t) => [[CH + 62 + 12 * Math.sin(t * 6), FL - 150 + 12 * Math.sin(t * 8.4)], [CH + 36, FL - 104]], { gesture: true });
  const fazKeys = [[0, speak], [END, cSeat(CH, 1, -0.1, -0.1, (t) => [[CH + 50, FL - 240 + 10 * Math.sin(t * 9)], [CH + 30, FL - 104]], { prefF: 'down' }), 0.4]];
  const fazState = (t) => seq(fazKeys, t);
  const app = cSeat(CH, 1, 0.22, 0.42, (t) => [[CH + 36, FL - 132 + 2 * Math.sin(t * 6)], [CH + 26, FL - 128]]);
  const pensaKeys = [[0, app], [END, cSeat(CH, 1, 0.4, 0.6, [[CH + 30, FL - 150], [CH + 22, FL - 146]]), 0.5]];
  const pensaState = (t) => seq(pensaKeys, t);
  const courses = (t) => 1 + Math.min(5, Math.floor(prog(t) * 6));

  function sign(c, k, t) {
    c.fillStyle = '#1a1a1e'; c.strokeStyle = '#3a3a40'; c.lineWidth = 4; c.fillRect(700, 40, 220, 90); c.strokeRect(700, 40, 220, 90);
    c.fillStyle = 'rgba(244,242,238,0.7)'; c.font = '700 14px "Space Mono"'; c.textAlign = 'left'; c.fillText(k === 'faz' ? 'NÍVEL DE INGLÊS' : 'CURSOS COMPRADOS', 714, 62);
    c.font = '800 40px "Space Mono"'; c.textAlign = 'center'; c.fillStyle = k === 'faz' ? rgb(BLUE) : 'rgba(244,242,238,0.85)';
    const v = k === 'faz' ? levelOf(t) : String(courses(t)); const tl = k === 'faz' ? LEVEL_T.filter((x) => t >= x).pop() : null; const pop = tl ? 1 + 0.3 * Math.exp(-(t - tl) * 8) : 1;
    c.save(); c.translate(810, 108); c.scale(pop, pop); c.fillText(v, 0, 0); c.restore();
    if (k === 'faz') { for (let i = 0; i < 4; i++) { c.fillStyle = i <= LEVELS.indexOf(levelOf(t)) ? rgb(BLUE) : 'rgba(255,255,255,0.15)'; c.fillRect(860 + i * 12, 118 - i * 8, 9, 10 + i * 8); } }
  }
  function drawBack(c, k, t, P) { cDark(c, P); cHangLamp(c, 600, 30, FL, 260); sign(c, k, t); cChair(c, CH); cTable(c, D0, D1, DT); }
  function drawFront(c, k, t, P, drawn) {
    const hd = drawn.main.head;
    if (k === 'faz') { // fone de ouvido e cartões de estudo diminuindo
      c.strokeStyle = '#2b2b30'; c.lineWidth = 6; c.beginPath(); c.arc(hd[0], hd[1], 22, Math.PI * 1.1, Math.PI * 1.9); c.stroke(); c.fillStyle = '#2b2b30'; c.beginPath(); c.roundRect(hd[0] - 6, hd[1] - 6, 12, 18, 4); c.fill();
      const n = Math.max(0, 8 - Math.floor(prog(t) * 8)); for (let i = 0; i < n; i++) { c.fillStyle = '#efe6d6'; c.strokeStyle = '#0e0e10'; c.lineWidth = 2; c.fillRect(690, DT - 6 - i * 4, 50, 6); c.strokeRect(690, DT - 6 - i * 4, 50, 6); } }
    else { const hp = drawn.main.hand; if (t < END) { c.save(); c.translate(hp[0], hp[1] - 6); c.fillStyle = '#111'; c.strokeStyle = '#0e0e10'; c.lineWidth = 3; c.beginPath(); c.roundRect(-9, -18, 18, 30, 4); c.fill(); c.stroke(); c.fillStyle = '#efe6d6'; c.fillRect(-7, -15, 14, 24); c.fillStyle = '#1a1a1a'; c.font = '800 4.5px Montserrat'; c.textAlign = 'center'; c.fillText('LIÇÃO 1', 0, -2); c.restore();
      const n = courses(t); c.fillStyle = rgb(PAL.dor); c.beginPath(); c.arc(hp[0] + 10, hp[1] - 26, 7, 0, Math.PI * 2); c.fill(); c.fillStyle = '#fff'; c.font = '800 8px Montserrat'; c.textAlign = 'center'; c.fillText(String(n), hp[0] + 10, hp[1] - 23); } }
  }
  const SCENE = {
    minimal: true, layoutB: true, noMonitor: true, metricLabel: '', totalLabel: '', reportT: GT, noReport: true,
    labels: ['FAZ', 'PENSA DEMAIS'], midLabel: (t) => ['MESMO IDIOMA', `DIA ${dayOf(Math.min(t, GT))}`],
    secsText: (n) => `${n}`, state: { faz: fazState, pensa: pensaState }, drawBack, drawFront,
    cam: () => ({ x: 640, y: 170, z: 1.1 }), pain: { faz: () => 0, pensa: () => 0 },
    bubbles: {
      faz: [{ t0: 0.6, t1: 1.7, text: 'HELLO...' }, { t0: 3.6, t1: 4.8, text: 'HOW ARE YOU?' }, { t0: 6.8, t1: 8.0, text: 'I LIKE COFFEE.' }, { t0: 10.0, t1: 11.4, text: "LET'S TALK BUSINESS." }, { t0: END + 0.5, t1: GT - 0.05, text: 'B2!', col: PAL.faz }],
      pensa: [{ t0: 2.1, t1: 3.4, text: 'PRECISO DO MÉTODO CERTO.' }, { t0: 8.3, t1: 9.6, text: 'ESSE APP É MELHOR.' }, { t0: END + 0.4, t1: GT - 0.05, text: 'LIÇÃO 1... DE NOVO.' }],
    },
    shake: () => 0,
    caps: [{ s: GT + 0.1, e: 99, center: true, lines: [[GT + 0.3, [['180 DIAS: '], ['NÍVEL B2.', 'faz']]], [GT + 0.9, [['O OUTRO: '], ['6 CURSOS, LIÇÃO 1.', 'dor']]]] }],
    sched: { noBips: true, noPops: true, music: 0.16, fx: [
      ...LEVEL_T.map((x) => [x, 'ding', 0.2, 0.35]),
      ...[2.6, 5.4, 8.3, 10.9, 11.6].map((x) => [x, 'cardbeep', 0.22, -0.35]),
      [END + 0.5, 'chime', 0.14, 0.35],
    ] },
  };
