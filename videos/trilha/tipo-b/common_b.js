
  // ---------- common_b.js: peças reaproveitadas pelos roteiros do tipo B (prefixo c / C_) ----------
  const C_FL = 300;
  const C_SEAT_L = { fT: 1.45, fS: 0.02, bT: 1.38, bS: -0.06 };
  const C_HY = hipOn(C_FL, STAND_L), C_SHY = hipOn(C_FL, C_SEAT_L);
  const cStand = (x, face = 1, extra) => () => pose(x, C_FL, STAND_L, 0.03, 0.02, handsDown(x, C_HY), Object.assign({ face }, extra || {}));
  const cWalk = (x0, x1, t0, t1, face = 1, run = 0) => (t) => { const x = lerp(x0, x1, easeInOut(seg(t, t0, t1))); return pose(x, C_FL, STAND_L, run ? 0.1 : 0.04, 0.02, handsDown(x, C_HY), { face, run }); };
  // sentado (x = quadril); mãos em coordenadas do mundo via cW (convertidas para o boneco)
  const cSeatSt = (x, face, lean, head) => ({ x, hipY: C_SHY, ay: C_FL, lean, head, legs: C_SEAT_L, hands: [[x + 50, C_SHY - 20], [x + 30, C_SHY - 14]], prefF: 'down', prefB: 'down', grounded: false, face, noWalk: true, gesture: false });
  const cSeat = (x, face, lean, head, handsW, extra) => (t) => { const st = Object.assign(cSeatSt(x, face, lean, head), extra || {}); if (handsW) { const hw = typeof handsW === 'function' ? handsW(t) : handsW; st.hands = hw.map((p) => toRig(st, p)); } return st; };
  const cStandW = (x, face, lean, head, handsW, extra) => (t) => { const st = pose(x, C_FL, STAND_L, lean, head, handsDown(x, C_HY), Object.assign({ face, gesture: false, noWalk: true }, extra || {})); if (handsW) { const hw = typeof handsW === 'function' ? handsW(t) : handsW; st.hands = hw.map((p) => toRig(st, p)); } return st; };
  const cCam = (keys) => (t) => {
    let v = { x: keys[0][1], y: keys[0][2], z: keys[0][3] };
    for (let i = 1; i < keys.length; i++) { const [kt, x, y, z, d] = keys[i]; if (t < kt) break; const u = easeInOut(seg(t, kt, kt + (d || 0.6))); v = { x: lerp(v.x, x, u), y: lerp(v.y, y, u), z: lerp(v.z, z, u) }; }
    return v;
  };
  function cPill(c, x, y, txt, col, ok, sc = 1, big = false) {
    c.save(); c.translate(x, y); c.scale(sc, sc);
    c.font = `700 ${big ? 26 : 18}px "Space Mono", monospace`; const tw = c.measureText(txt).width; const ic = ok === null || ok === undefined ? 0 : 24, hh = big ? 40 : 30;
    c.beginPath(); c.roundRect(0, -hh / 2, tw + ic + 24, hh, hh / 2); c.fillStyle = 'rgba(15,10,7,0.88)'; c.fill(); c.lineWidth = 3; c.strokeStyle = rgb(col); c.stroke();
    if (ok === true) { c.strokeStyle = rgb(PAL.faz); c.lineWidth = 4; c.beginPath(); c.moveTo(12, 0); c.lineTo(17, 6); c.lineTo(27, -6); c.stroke(); }
    if (ok === false) { c.strokeStyle = rgb(PAL.dor); c.lineWidth = 4; c.beginPath(); c.moveTo(13, -6); c.lineTo(25, 6); c.moveTo(25, -6); c.lineTo(13, 6); c.stroke(); }
    c.fillStyle = rgb(col); c.textAlign = 'left'; c.textBaseline = 'middle'; c.fillText(txt, 12 + ic, 1); c.restore();
  }
  // placa do canto superior direito (dia / semana / horário)
  function cCorner(c, txt, t, t0, col) {
    c.save(); c.translate(870, 40); const pop = t0 !== null ? 1 + 0.3 * Math.exp(-Math.max(0, t - t0) * 8) : 1; c.scale(pop, pop);
    c.fillStyle = 'rgba(12,8,6,0.9)'; c.strokeStyle = col ? rgb(col) : 'rgba(255,214,160,0.6)'; c.lineWidth = 3; c.beginPath(); c.roundRect(-78, -24, 156, 48, 10); c.fill(); c.stroke();
    c.fillStyle = col ? rgb(col) : rgb(PAL.luz); c.font = `800 ${txt.length > 8 ? 24 : 30}px "Space Mono", monospace`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(txt, 0, 2); c.restore();
  }
  // lista de pílulas empilhadas à esquerda: [[t0, texto, cor, ok], ...]
  function cStack(c, t, items, y0 = 74) { let y = y0; for (const [t0, txt, col, ok] of items) { if (t < t0) continue; cPill(c, 18, y, typeof txt === 'function' ? txt(t) : txt, col, ok, backE(seg(t, t0, t0 + 0.3))); y += 36; } }
  function cFlash(c, P, t, times) { for (const tc of times) { const a = t - tc; if (a >= 0 && a < 0.25) { c.fillStyle = `rgba(255,245,230,${0.7 * (1 - a / 0.25)})`; c.fillRect(0, 0, W, P.h); } } }
  function cPhone(c, hp, t, screen = '#6fa8ff', glow = true) {
    c.save(); c.translate(hp[0], hp[1] - 6);
    if (glow) { c.save(); c.globalCompositeOperation = 'lighter'; c.filter = 'blur(10px)'; c.fillStyle = 'rgba(120,170,255,0.4)'; c.beginPath(); c.arc(4, -6, 20, 0, Math.PI * 2); c.fill(); c.restore(); }
    c.fillStyle = '#111'; c.strokeStyle = OUT; c.lineWidth = 3; c.beginPath(); c.roundRect(-7, -14, 14, 24, 3); c.fill(); c.stroke(); c.fillStyle = screen; c.fillRect(-5, -11, 10, 18); c.restore();
  }
  function cZzz(c, hd, t) { for (let i = 0; i < 3; i++) { const a = (t * 0.55 + i / 3) % 1; c.save(); c.globalAlpha = Math.sin(Math.PI * a) * 0.9; c.fillStyle = '#e8dcc6'; c.font = `800 ${16 + 12 * a}px Montserrat, sans-serif`; c.textAlign = 'center'; c.fillText('Z', hd[0] + 20 + a * 50, hd[1] - 20 - a * 70); c.restore(); } }
  function cSweat(c, hd, t, dir = -1) { for (let i = 0; i < 3; i++) { const a = ((t * 1.4 + i / 3) % 1); c.fillStyle = `rgba(200,230,255,${0.9 * (1 - a)})`; c.beginPath(); c.arc(hd[0] + dir * (18 + i * 7), hd[1] - 10 + a * 40, 4.5, 0, Math.PI * 2); c.fill(); } }
  function cNotes(c, x, y, t, col) { for (let i = 0; i < 3; i++) { const a = ((t * 0.8 + i / 3) % 1); c.save(); c.globalAlpha = Math.sin(Math.PI * a); c.fillStyle = col || rgb(PAL.ouro); c.font = '800 30px Montserrat, sans-serif'; c.textAlign = 'center'; c.fillText(i % 2 ? '♫' : '♪', x + 20 * i + 14 * Math.sin(t * 3 + i), y - a * 80); c.restore(); } }
  // cenário básico: parede de madeira, janela, piso (night = noite)
  function cRoom(c, P, night = false, win = [420, 40, 150, 110]) {
    const h = P.h, g = c.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, night ? '#110c09' : '#1b130e'); g.addColorStop(0.7, night ? '#211810' : '#33251b'); g.addColorStop(1, '#201710');
    c.fillStyle = g; c.fillRect(-300, -100, W + 600, h + 200);
    c.strokeStyle = 'rgba(0,0,0,0.22)'; c.lineWidth = 3; for (let x = -280; x < W + 300; x += 96) { c.beginPath(); c.moveTo(x, -100); c.lineTo(x, C_FL); c.stroke(); }
    if (win) { const [wx, wy, ww, wh] = win; c.fillStyle = '#4a3524'; c.fillRect(wx, wy, ww, wh); c.strokeStyle = OUT; c.lineWidth = 5; c.strokeRect(wx, wy, ww, wh);
      c.fillStyle = night ? '#121628' : '#8fa6c4'; c.fillRect(wx + 6, wy + 6, ww - 12, wh - 12);
      if (!night) { c.save(); c.globalCompositeOperation = 'lighter'; c.filter = 'blur(18px)'; c.fillStyle = rgb(PAL.luz, 1, 0.14); c.beginPath(); c.moveTo(wx + 6, wy + 20); c.lineTo(wx + ww - 6, wy + 20); c.lineTo(wx + ww + 190, C_FL + 30); c.lineTo(wx + 10, C_FL + 30); c.closePath(); c.fill(); c.restore(); } }
  }
  function cFloor(c, P, col = '#241911') { c.fillStyle = col; c.fillRect(-300, C_FL, W + 600, P.h); c.strokeStyle = 'rgba(0,0,0,0.5)'; c.lineWidth = 4; c.beginPath(); c.moveTo(-300, C_FL); c.lineTo(W + 300, C_FL); c.stroke(); }
  function cSofa(c, x0 = 820) { c.fillStyle = '#7a3f34'; c.strokeStyle = OUT; c.lineWidth = 4; c.beginPath(); c.roundRect(x0 + 10, C_FL - 130, 170, 70, 14); c.fill(); c.stroke(); c.beginPath(); c.roundRect(x0, C_FL - 68, 190, 40, 10); c.fill(); c.stroke();
    c.fillRect(x0 + 10, C_FL - 28, 14, 28); c.strokeRect(x0 + 10, C_FL - 28, 14, 28); c.fillRect(x0 + 166, C_FL - 28, 14, 28); c.strokeRect(x0 + 166, C_FL - 28, 14, 28); }
  function cTable(c, x0, x1, top) { c.fillStyle = '#6b4a30'; c.strokeStyle = OUT; c.lineWidth = 4; c.fillRect(x0, top, x1 - x0, 14); c.strokeRect(x0, top, x1 - x0, 14);
    for (const lx of [x0 + 8, x1 - 20]) { c.fillRect(lx, top + 14, 12, C_FL - top - 14); c.strokeRect(lx, top + 14, 12, C_FL - top - 14); } }
  function cChair(c, x) { c.fillStyle = '#5a3c26'; c.strokeStyle = OUT; c.lineWidth = 4; c.fillRect(x - 40, C_FL - 64, 70, 12); c.strokeRect(x - 40, C_FL - 64, 70, 12);
    c.fillRect(x - 44, C_FL - 150, 12, 150); c.strokeRect(x - 44, C_FL - 150, 12, 150); c.fillRect(x + 18, C_FL - 52, 10, 52); c.strokeRect(x + 18, C_FL - 52, 10, 52); }
  // notebook visto de lado com tela virada para o público
  function cLaptop(c, x, top, screenFn) { c.fillStyle = '#26262c'; c.strokeStyle = OUT; c.lineWidth = 3; c.beginPath(); c.moveTo(x - 46, top); c.lineTo(x + 46, top); c.lineTo(x + 38, top - 4); c.lineTo(x - 38, top - 4); c.closePath(); c.fill(); c.stroke();
    c.beginPath(); c.roundRect(x - 30, top - 72, 82, 68, 4); c.fill(); c.stroke(); c.save(); c.beginPath(); c.rect(x - 25, top - 67, 72, 58); c.clip(); c.fillStyle = '#e8e4da'; c.fillRect(x - 25, top - 67, 72, 58); if (screenFn) screenFn(c, x - 25, top - 67, 72, 58); c.restore();
    c.save(); c.globalCompositeOperation = 'lighter'; c.filter = 'blur(14px)'; c.fillStyle = 'rgba(160,190,255,0.18)'; c.beginPath(); c.arc(x + 10, top - 38, 46, 0, Math.PI * 2); c.fill(); c.restore(); }
