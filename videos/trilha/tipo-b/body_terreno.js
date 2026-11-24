
  // ================= ESTRATÉGIA "MESMO X / DIA N" (layout B, clean): "MESMO TERRENO" (17 s) =================
  const GT = 13.5, FL = C_FL, END = 12.4;
  const dayOf = (t) => Math.max(1, Math.min(60, Math.round(1 + 59 * Math.pow(clamp(t / END), 1.25))));
  const prog = (t) => (dayOf(t) - 1) / 59;
  const LOT0 = 560, LOT1 = 800;                                   // terreno marcado (igual nos dois)
  const BRICK = [201, 162, 122], PER = 0.9;

  // ---------- 1 · FAZ: assenta tijolo, a casa sobe ----------
  const WX = 500;
  const work = (t) => {
    const u = (((t - 0.3) / PER) % 1 + 1) % 1, down = u < 0.45 ? smooth(u / 0.3) : 1 - smooth((u - 0.45) / 0.25);
    const rows = Math.floor(prog(t) * 11), topY = FL - 8 - Math.min(rows, 8) * 22, bx = LOT0 + 30 + ((Math.floor((t - 0.3) / PER) * 47) % 180);
    const legs = mixL(STAND_L, CROUCH_L, down), st = pose(WX, FL, legs, lerp(0.15, 0.7, down), lerp(0.1, 0.5, down), handsDown(WX, C_HY), { gesture: false, noWalk: true });
    const pile = [WX + 50, FL - 24], place = [Math.min(bx, WX + 70), topY - 10];
    st.hands = [toRig(st, P2(place, pile, down)), toRig(st, P2([place[0] - 16, place[1] + 6], [pile[0] - 18, pile[1]], down))];
    return st;
  };
  const admire = (t) => cStandW(430, 1, -0.05, -0.1, [[470, FL - 104], [400, FL - 100]], { prefF: 'down' })(t);
  const fazKeys = [[0, cStand(WX)], [0.3, work, 0.3], [END, cWalk(WX, 430, END, END + 0.6, -1), 0.3], [END + 0.6, admire, 0.3], [END + 0.9, cStandW(430, 1, -0.05, -0.15, (t) => [[480, FL - 230 + 10 * Math.sin(t * 9)], [400, FL - 100]], { prefF: 'down' }), 0.3]];
  const fazState = (t) => seq(fazKeys, t);

  // ---------- 2 · PENSA DEMAIS: redesenha a planta sem parar ----------
  const EX = 600, PX = 520;
  const draw = (t) => { const u = ((t - 0.85) / PER) % 1, slot = Math.floor((t - 0.85) / PER), crumple = slot % 3 === 2 && u < 0.6;
    const st = cStandW(PX, 1, 0.12, 0.25, crumple ? [[EX - 10 + 40 * smooth(u / 0.6), FL - 170 + 60 * smooth(u / 0.6)], [EX - 24, FL - 160]] : [[EX - 12 + 10 * Math.sin(t * 13), FL - 176 + 8 * Math.sin(t * 9.3)], [PX + 20, FL - 120]])(t); return st; };
  const sigh = (t) => cStandW(PX, 1, 0.3, 0.55, [[PX + 30, FL - 96], [PX + 10, FL - 92]])(t);
  const pensaKeys = [[0, cStandW(PX, 1, 0.05, 0.2, [[PX + 36, FL - 140], [PX + 22, FL - 130]])], [0.85, draw, 0.3], [END, sigh, 0.5]];
  const pensaState = (t) => seq(pensaKeys, t);
  const sheets = (t) => Math.max(0, Math.floor((t - 0.85) / PER / 3 + 0.34));   // papéis amassados
  const version = (t) => 1 + Math.round(36 * clamp(t / END));

  // ---------- cenário ----------
  function lot(c) { c.strokeStyle = 'rgba(201,162,122,0.5)'; c.lineWidth = 2; c.beginPath(); c.moveTo(LOT0, FL - 26); c.lineTo(LOT1, FL - 26); c.stroke();
    c.fillStyle = '#6b4a30'; for (const x of [LOT0, LOT1]) c.fillRect(x - 3, FL - 34, 6, 34); }
  function house(c, t) {
    const p = prog(t), rows = Math.min(8, Math.floor(p * 11));
    c.strokeStyle = '#0e0e10'; c.lineWidth = 2.5;
    for (let r = 0; r < rows; r++) for (let i = 0; i < 10; i++) { const x = LOT0 + i * 24 + (r % 2 ? 12 : 0); if (x + 22 > LOT1) continue; c.fillStyle = rgb(mixC(BRICK, [170, 130, 95], ((i * 7 + r * 3) % 5) / 8)); c.fillRect(x, FL - 22 - r * 22, 22, 20); c.strokeRect(x, FL - 22 - r * 22, 22, 20); }
    // pilha de tijolos
    const left = Math.max(0, 6 - Math.floor(p * 6)); for (let i = 0; i < left; i++) { c.fillStyle = rgb(BRICK); c.fillRect(WX + 30 + (i % 3) * 24, FL - 14 - Math.floor(i / 3) * 14, 22, 12); c.strokeRect(WX + 30 + (i % 3) * 24, FL - 14 - Math.floor(i / 3) * 14, 22, 12); }
    const roof = smooth(seg(p, 0.74, 0.9)); if (roof > 0) { const top = FL - 22 - 8 * 22 + 20; c.save(); c.globalAlpha = roof; c.fillStyle = '#7a4a34'; c.beginPath(); c.moveTo(LOT0 - 16, top); c.lineTo((LOT0 + LOT1) / 2, top - 90 * roof); c.lineTo(LOT1 + 16, top); c.closePath(); c.fill(); c.lineWidth = 4; c.stroke(); c.restore(); }
    const det = smooth(seg(p, 0.9, 1)); if (det > 0) { c.save(); c.globalAlpha = det; c.fillStyle = '#3a2a1c'; c.fillRect(LOT0 + 40, FL - 110, 50, 110); c.strokeRect(LOT0 + 40, FL - 110, 50, 110);
      const on = t > END + 0.5 ? 1 : 0.25; c.fillStyle = `rgba(255,214,140,${on})`; c.fillRect(LOT0 + 130, FL - 120, 60, 50); c.strokeRect(LOT0 + 130, FL - 120, 60, 50);
      if (on > 0.5) { c.globalCompositeOperation = 'lighter'; c.filter = 'blur(14px)'; c.fillStyle = 'rgba(255,214,140,0.35)'; c.beginPath(); c.ellipse(LOT0 + 160, FL - 95, 70, 50, 0, 0, Math.PI * 2); c.fill(); } c.restore(); }
  }
  function easel(c, t) {
    c.strokeStyle = '#3a3a40'; c.lineWidth = 6; c.lineCap = 'round'; c.beginPath(); c.moveTo(EX - 40, FL); c.lineTo(EX, FL - 210); c.lineTo(EX + 40, FL); c.moveTo(EX, FL - 210); c.lineTo(EX + 8, FL); c.stroke();
    c.fillStyle = '#efe6d6'; c.strokeStyle = '#0e0e10'; c.lineWidth = 3; c.fillRect(EX - 50, FL - 220, 100, 90); c.strokeRect(EX - 50, FL - 220, 100, 90);
    // planta da casa (sempre recomeçando)
    const u = ((t - 0.85) / PER / 3) % 1, k = clamp(u * 1.4);
    c.strokeStyle = 'rgba(60,80,110,0.85)'; c.lineWidth = 2;
    c.beginPath(); c.rect(EX - 38, FL - 200, 76 * Math.min(1, k * 2), 56 * Math.min(1, Math.max(0, k * 2 - 0.4))); c.stroke();
    if (k > 0.6) { c.beginPath(); c.moveTo(EX - 38, FL - 172); c.lineTo(EX - 38 + 76 * (k - 0.6) / 0.4, FL - 172); c.stroke(); }
    c.fillStyle = 'rgba(229,72,59,0.85)'; c.font = '700 11px "Space Mono"'; c.textAlign = 'right'; c.fillText(`V${version(t)}`, EX + 46, FL - 136);
  }
  function drawBack(c, k, t, P) {
    cDark(c, P); cHangLamp(c, 600, 30, FL, 260); lot(c);
    if (k === 'faz') house(c, t); else easel(c, t);
  }
  function drawFront(c, k, t, P, drawn) {
    if (k === 'faz') { const u = (((t - 0.3) / PER) % 1 + 1) % 1; if (t > 0.3 && t < END && u > 0.15 && u < 0.92) { const hp = drawn.main.hand; c.fillStyle = rgb(BRICK); c.strokeStyle = '#0e0e10'; c.lineWidth = 2.5; c.fillRect(hp[0] - 11, hp[1] - 14, 22, 12); c.strokeRect(hp[0] - 11, hp[1] - 14, 22, 12); } }
    else {
      // bolinhas de papel amassado acumulando no chão
      const n = Math.min(30, sheets(t)); for (let i = 0; i < n; i++) { const x = 650 + (i * 37) % 130, y = FL - 8 - Math.floor(i / 6) * 9; c.fillStyle = '#efe6d6'; c.strokeStyle = '#0e0e10'; c.lineWidth = 2; c.beginPath(); c.arc(x, y, 8, 0, Math.PI * 2); c.fill(); c.stroke(); }
      // bolinha voando quando amassa
      const slot = Math.floor((t - 0.85) / PER), u = ((t - 0.85) / PER) % 1; if (t > 0.85 && t < END && slot % 3 === 2 && u > 0.55) { const a = (u - 0.55) / 0.45, x = lerp(EX + 30, 650 + ((sheets(t)) * 37) % 130, a), y = lerp(FL - 120, FL - 8, a) - 60 * Math.sin(Math.PI * a); c.fillStyle = '#efe6d6'; c.beginPath(); c.arc(x, y, 8, 0, Math.PI * 2); c.fill(); c.stroke(); }
    }
  }

  const bricks = Array.from({ length: Math.floor((END - 0.3) / PER) }, (_, j) => 0.3 + j * PER + 0.42);
  const pensaFx = Array.from({ length: Math.floor((END - 0.85) / PER) }, (_, j) => [0.85 + j * PER + 0.05, j % 3 === 2 ? 'crumple' : 'scribble']);
  const SCENE = {
    minimal: true, layoutB: true, noMonitor: true, metricLabel: '', totalLabel: '', reportT: GT, noReport: true,
    labels: ['FAZ', 'PENSA DEMAIS'], midLabel: (t) => ['MESMO TERRENO', `DIA ${dayOf(Math.min(t, GT))}`],
    secsText: (n) => `${n}`,
    state: { faz: fazState, pensa: pensaState },
    drawBack, drawFront,
    cam: (k, t) => ({ x: 610, y: 180, z: 1.08 }),
    pain: { faz: () => 0, pensa: () => 0 },
    bubbles: {
      faz: [{ t0: END + 0.9, t1: GT - 0.05, text: 'PRONTO.', col: PAL.faz }],
      pensa: [
        { t0: 3.0, t1: 4.3, text: 'E SE A JANELA FOR AQUI?' },
        { t0: 8.2, t1: 9.4, text: 'AINDA NÃO TÁ PERFEITO.' },
        { t0: END + 0.3, t1: GT - 0.05, text: 'AMANHÃ EU COMEÇO.' },
      ],
    },
    shake: () => 0,
    caps: [{ s: GT + 0.1, e: 99, center: true, lines: [[GT + 0.3, [['60 DIAS: '], ['UMA CASA.', 'faz']]], [GT + 0.9, [['O OUTRO: '], ['37 PLANTAS.', 'dor']]]] }],
    sched: {
      noBips: true, noPops: true, music: 0.16,
      fx: [
        ...bricks.map((x) => [x, 'brick', 0.5, 0.35]),
        ...pensaFx.map(([x, ty]) => (ty === 'scribble' ? [x, 'scribble', 0.3, -0.35, 0.38] : [x, 'foley/pagina_2', 0.4, -0.35, 1.4])),
        [END + 0.5, 'chime', 0.14, 0.35],
      ],
    },
  };
