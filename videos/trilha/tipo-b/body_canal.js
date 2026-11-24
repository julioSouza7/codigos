
  // ================= "MESMO CANAL" (layout B, 17 s) =================
  const GT = 13.5, FL = C_FL, END = 12.4, MAXD = 100;
  const dayOf = (t) => Math.max(1, Math.min(MAXD, Math.round(1 + (MAXD - 1) * Math.pow(clamp(t / END), 1.25))));
  const prog = (t) => (dayOf(t) - 1) / (MAXD - 1);
  const CH = 520, D0 = 560, D1 = 800, DT = FL - 92, LAP = 640, PER = 1.2;
  const BLUE = [111, 168, 255];

  const typing = (x) => cSeat(x, 1, 0.3, 0.28, (t) => [[LAP - 4 + 5 * Math.sin(t * 23), DT - 8 + 3 * Math.abs(Math.sin(t * 17))], [LAP - 22 + 5 * Math.sin(t * 19 + 1), DT - 7 + 3 * Math.abs(Math.sin(t * 21))]]);
  const record = (x) => cSeat(x, 1, 0.02, -0.05, (t) => [[x + 66 + 12 * Math.sin(t * 6), FL - 150 + 12 * Math.sin(t * 8.4)], [x + 30, FL - 104]], { gesture: true });
  const fazWork = (t) => { const u = (((t - 0.3) / PER) % 1 + 1) % 1; return u < 0.5 ? typing(CH)(t) : record(CH)(t); };
  const fazKeys = [[0, typing(CH)], [0.3, fazWork, 0.25], [END, cStandW(CH + 20, 1, -0.05, -0.1, (t) => [[CH + 70, FL - 230 + 10 * Math.sin(t * 9)], [CH, FL - 100]], { prefF: 'down' }), 0.4]];
  const fazState = (t) => { const st = seq(fazKeys, t); return st; };
  const tweak = (t) => { const u = ((t / 2.4) % 1); return u < 0.6 ? typing(CH)(t) : cSeat(CH, 1, 0.1, 0.4, [[CH + 36, FL - 140], [CH + 22, FL - 132]])(t); };   // edita, para, coça o queixo
  const pensaKeys = [[0, typing(CH)], [0.5, tweak, 0.3], [END, cSeat(CH, 1, 0.45, 0.6, [[CH + 30, FL - 150], [CH + 22, FL - 146]]), 0.5]];
  const pensaState = (t) => seq(pensaKeys, t);

  // quadro de vídeos postados na parede + contador de seguidores
  function board(c, k, t) {
    c.fillStyle = '#1a1a1e'; c.strokeStyle = '#3a3a40'; c.lineWidth = 4; c.fillRect(560, 22, 300, 150); c.strokeRect(560, 22, 300, 150);
    const n = k === 'faz' ? Math.min(32, Math.floor(prog(t) * 32 + (t > 0.5 ? 1 : 0))) : 0;
    for (let i = 0; i < 32; i++) { const x = 572 + (i % 8) * 35, y = 58 + Math.floor(i / 8) * 27; if (i < n) { c.fillStyle = rgb(BLUE, 0.6 + 0.4 * ((i * 7) % 5) / 5); c.fillRect(x, y, 30, 21); c.fillStyle = '#fff'; c.beginPath(); c.moveTo(x + 12, y + 6); c.lineTo(x + 20, y + 10.5); c.lineTo(x + 12, y + 15); c.closePath(); c.fill(); } }
    if (k === 'pensa') { c.setLineDash([5, 4]); c.strokeStyle = 'rgba(244,242,238,0.5)'; c.lineWidth = 2; c.strokeRect(572, 58, 30, 21); c.setLineDash([]); c.fillStyle = 'rgba(244,242,238,0.6)'; c.font = '800 14px Montserrat'; c.textAlign = 'center'; c.fillText('?', 587, 73); }
    const f = k === 'faz' ? Math.round(10400 * Math.pow(prog(t), 2.4)) : 0;
    c.fillStyle = '#f4f2ee'; c.font = '700 14px "Space Mono"'; c.textAlign = 'left'; c.fillText('SEGUIDORES', 572, 44); c.textAlign = 'right'; c.font = '800 18px "Space Mono"'; c.fillStyle = k === 'faz' ? rgb(BLUE) : 'rgba(244,242,238,0.6)'; c.fillText(f.toLocaleString('pt-BR'), 848, 45);
  }
  function drawBack(c, k, t, P) { cDark(c, P); cHangLamp(c, 600, 30, FL, 260); board(c, k, t); cChair(c, CH); cTable(c, D0, D1, DT); }
  function drawFront(c, k, t, P, drawn) {
    // celular no tripé (faz) e notebook (os dois)
    c.strokeStyle = '#3a3a40'; c.lineWidth = 4; c.beginPath(); c.moveTo(740, DT); c.lineTo(740, DT - 70); c.stroke(); c.fillStyle = '#16161a'; c.strokeStyle = '#0e0e10'; c.lineWidth = 3; c.beginPath(); c.roundRect(726, DT - 104, 28, 40, 4); c.fill(); c.stroke();
    const rec = k === 'faz' && t > 0.3 && t < END && ((((t - 0.3) / PER) % 1 + 1) % 1) >= 0.5; if (rec) { c.fillStyle = rgb(PAL.dor); c.beginPath(); c.arc(748, DT - 98, 3.5, 0, Math.PI * 2); c.fill(); }
    cLaptop(c, LAP + 10, DT, (cc, x, y, w, h) => {
      if (k === 'faz') { const u = (((t - 0.3) / PER) % 1 + 1) % 1; cc.fillStyle = '#20242c'; cc.fillRect(x, y, w, h); cc.fillStyle = rgb(BLUE); cc.fillRect(x + 8, y + 18, (w - 16) * clamp(u / 0.5), 8); cc.fillStyle = '#fff'; cc.font = '700 7px "Space Mono"'; cc.textAlign = 'center'; cc.fillText(u < 0.5 ? 'ENVIANDO...' : 'POSTADO ✓', x + w / 2, y + 42); }
      else { cc.fillStyle = '#20242c'; cc.fillRect(x, y, w, h); for (let i = 0; i < 4; i++) { cc.fillStyle = ['#6fa8ff', '#e8c547', '#9a9aa2', '#6fa8ff'][i]; cc.fillRect(x + 6 + i * 16, y + 30, 14, 8); } const ph = x + 6 + (w - 12) * (0.5 + 0.45 * Math.sin(t * 2.2)); cc.fillStyle = rgb(PAL.dor); cc.fillRect(ph, y + 24, 2, 20);
        cc.fillStyle = '#fff'; cc.font = '700 7px "Space Mono"'; cc.textAlign = 'center'; cc.fillText(`VÍDEO 1 · V${1 + Math.round(39 * clamp(t / END))}`, x + w / 2, y + 14); } });
  }
  const fxF = Array.from({ length: Math.floor((END - 0.3) / PER) }, (_, j) => 0.3 + j * PER);
  const SCENE = {
    minimal: true, layoutB: true, noMonitor: true, metricLabel: '', totalLabel: '', reportT: GT, noReport: true,
    labels: ['FAZ', 'PENSA DEMAIS'], midLabel: (t) => ['MESMO CANAL', `DIA ${dayOf(Math.min(t, GT))}`],
    secsText: (n) => `${n}`, state: { faz: fazState, pensa: pensaState }, drawBack, drawFront,
    cam: () => ({ x: 640, y: 170, z: 1.1 }), pain: { faz: () => 0, pensa: () => 0 },
    bubbles: {
      faz: [{ t0: END + 0.5, t1: GT - 0.05, text: 'VALEU, GALERA!', col: PAL.faz }],
      pensa: [{ t0: 3.0, t1: 4.3, text: 'SÓ MAIS UM AJUSTE.' }, { t0: 8.0, t1: 9.2, text: 'A COR TÁ ESTRANHA...' }, { t0: END + 0.4, t1: GT - 0.05, text: 'AMANHÃ EU POSTO.' }],
    },
    shake: () => 0,
    caps: [{ s: GT + 0.1, e: 99, center: true, lines: [[GT + 0.3, [['100 DIAS: '], ['100 VÍDEOS.', 'faz']]], [GT + 0.9, [['O OUTRO: '], ['VÍDEO 1, V40.', 'dor']]]] }],
    sched: { noBips: true, noPops: true, music: 0.16, fx: [
      ...fxF.map((x) => [x + 0.05, 'typing', 0.28, 0.35, 0.35]), ...fxF.map((x) => [x + 0.62, 'pop', 0.12, 0.35]),
      ...fxF.map((x) => [x + 0.85, 'foley/toque_tela', 0.35, -0.35]), [END + 0.5, 'chime', 0.14, 0.35],
    ] },
  };
