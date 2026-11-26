
  // ---------- desenho ----------
  function drawObjects(c, t, lv) {
    c.fillStyle = '#1b1b1e'; c.fillRect(-600, FLOOR, W + 1300, 900);
    c.fillStyle = 'rgba(255,255,255,0.2)'; c.fillRect(-600, FLOOR - 2, W + 1300, 4);
    for (const k of KS) {
      const a = 0.22 * Math.min(1.3, lv[k]) * (k === 'obs' ? 1 + 0.8 * smooth(seg(t, BREAK_T, BREAK_T + 0.5)) : 1);
      const hy = BAR ? FLOOR - 250 : FLOOR - 90;
      c.save(); c.globalCompositeOperation = 'lighter';
      const g = c.createRadialGradient(CX(k), hy, 0, CX(k), hy, 300); g.addColorStop(0, rgb(COL[k], 1, a)); g.addColorStop(1, rgb(COL[k], 1, 0));
      c.fillStyle = g; c.fillRect(CX(k) - 320, hy - 320, 640, 640); c.restore();
    }
    for (const k of KS) drawGear(c, k, t, lv[k]);
    drawMeta(c, t);
    drawCrowd(c, t);
    for (const k of ['disc', 'motiv', 'ego', 'obs']) {
      const st = stateOf[k](t);
      const light = clamp(0.3 + 0.7 * Math.min(1, lv[k] / 0.85));
      c.save(); c.translate(st.x + 10, FLOOR + 2); c.scale(1, 0.16);
      const sg = c.createRadialGradient(0, 0, 0, 0, 0, 80); sg.addColorStop(0, 'rgba(0,0,0,0.5)'); sg.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = sg; c.beginPath(); c.arc(0, 0, 80, 0, Math.PI * 2); c.fill(); c.restore();
      let arm = null, sd = 9;
      if (k === 'obs') {
        const h = hurtOf(t); sd = t - lastOf(PAIN_EV, t); const th = sd < 1 ? Math.exp(-sd * 7) : 0;
        if (t < BREAK_T) { st.head = (st.head || 0) + 0.24 * h * th; st.lean = (st.lean || 0) + 0.04 * h * th; }
        arm = { a: h * (0.8 + 0.2 * th), g: h * (0.1 + 0.32 * th) * clamp(light) };
      }
      const R = rigP(st);
      drawFigure(c, R, light, COL[k], arm);
      drawBarTop(c, k, lv[k]);
      if (arm && arm.a > 0.4 && sd >= 0 && sd < 0.34 && t < BREAK_T + 0.1) {
        const E = R.arm, u = sd / 0.34; c.save(); c.strokeStyle = rgb(ACC, 1, (1 - u) * arm.a * light); c.lineWidth = 6; c.lineCap = 'round';
        for (let i = -1; i <= 1; i++) { const an = -2.5 + i * 0.42, r0 = 44 + 16 * easeOut(u), r1 = r0 + 18; c.beginPath(); c.moveTo(E[0] + Math.cos(an) * r0, E[1] + Math.sin(an) * r0); c.lineTo(E[0] + Math.cos(an) * r1, E[1] + Math.sin(an) * r1); c.stroke(); }
        c.restore();
      }
    }
    if (!BAR) { const a = t - BREAK_T; if (a >= 0 && a < 0.3) { const st = stateOf.obs(BREAK_T), R = rigP(st), hp = P2(R.armF[2], R.armB[2], 0.5), u = a / 0.3;   // estouro da palma
      c.save(); c.strokeStyle = `rgba(255,255,255,${(1 - u).toFixed(3)})`; c.lineWidth = 5; c.lineCap = 'round';
      for (let i = 0; i < 8; i++) { const an = i * Math.PI / 4 + 0.2, r0 = 26 + 40 * easeOut(u), r1 = r0 + 20; c.beginPath(); c.moveTo(hp[0] + Math.cos(an) * r0, hp[1] + Math.sin(an) * r0); c.lineTo(hp[0] + Math.cos(an) * r1, hp[1] + Math.sin(an) * r1); c.stroke(); }
      c.restore(); } }
    for (const [tt, big, k] of THUDS) dust(c, k === 'obs' ? stateOf.obs(tt).x + 40 : CX(k), tt, t, 0.5 + 0.6 * big);
  }
  function beamS(c, x, yb, a, col) {
    c.save(); c.filter = 'blur(12px)';
    const cc = mixC([255, 252, 246], col || [255, 252, 246], 0.55);
    const g = c.createLinearGradient(0, -60, 0, yb); g.addColorStop(0, rgb(cc, 1, a * 1.3)); g.addColorStop(1, rgb(cc, 1, a * 0.4));
    c.fillStyle = g; c.beginPath(); c.moveTo(x - 26, -60); c.lineTo(x + 26, -60); c.lineTo(x + 175, yb); c.lineTo(x - 175, yb); c.closePath(); c.fill(); c.restore();
  }

  function renderAt(t) {
    COL.obs = mixC(NEU, ACC, smooth(seg(t, BREAK_T - 0.2, BREAK_T + 0.4)));
    const C = camAt(t);
    const lv = { disc: level.disc(t), obs: level.obs(t), motiv: level.motiv(t), ego: level.ego(t) };
    const SH = shotAt(t); if (SH.k) for (const k of KS) if (k !== SH.k) lv[k] *= 1 - 0.7 * SH.amt;
    lc.setTransform(1, 0, 0, 1, 0, 0); lc.clearRect(0, 0, W, H); lc.setTransform(C.s, 0, 0, C.s, C.ox, C.oy);
    drawObjects(lc, t, lv);

    const c = ctx;
    c.setTransform(1, 0, 0, 1, 0, 0);
    const bg = c.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#060607'); bg.addColorStop(0.45, '#232224'); bg.addColorStop(1, '#0c0c0d');
    c.fillStyle = bg; c.fillRect(0, 0, W, H);
    c.setTransform(C.s, 0, 0, C.s, C.ox, C.oy);
    c.save(); c.filter = 'blur(22px)'; c.fillStyle = 'rgba(255,250,240,0.04)';
    c.beginPath(); c.moveTo(-300, -500); c.lineTo(-120, -500); c.lineTo(900, FLOOR); c.lineTo(160, FLOOR); c.closePath(); c.fill();
    c.beginPath(); c.moveTo(1200, -500); c.lineTo(1380, -500); c.lineTo(940, FLOOR); c.lineTo(320, FLOOR); c.closePath(); c.fill(); c.restore();
    c.setTransform(1, 0, 0, 1, 0, 0);
    const floorS = toScreen([0, FLOOR], C)[1];
    c.save(); c.beginPath(); c.rect(0, floorS, W, H - floorS); c.clip();
    c.globalAlpha = 0.16; c.translate(0, 2 * floorS); c.scale(1, -1); c.drawImage(layer, 0, 0); c.restore();
    c.drawImage(layer, 0, 0);
    c.save(); c.globalCompositeOperation = 'lighter';
    for (const k of KS) {
      const fl = toScreen([CX(k), FLOOR + 10], C);
      const a = 0.12 * Math.min(1.4, lv[k]);
      if (a > 0.004) beamS(c, fl[0], fl[1], a, COL[k]);
    }
    c.restore();
    const top = c.createLinearGradient(0, 120, 0, 560); top.addColorStop(0, 'rgba(0,0,0,0.6)'); top.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = top; c.fillRect(0, 0, W, 560);
    const bot = c.createLinearGradient(0, 1100, 0, 1340); bot.addColorStop(0, 'rgba(0,0,0,0)'); bot.addColorStop(0.5, 'rgba(0,0,0,0.6)'); bot.addColorStop(1, 'rgba(0,0,0,0.75)');
    c.fillStyle = bot; c.fillRect(0, 1100, W, H - 1100);
    const ui = c.createLinearGradient(0, 1300, 0, 1420); ui.addColorStop(0, 'rgba(4,4,5,0)'); ui.addColorStop(1, 'rgba(4,4,5,0.94)');
    c.fillStyle = ui; c.fillRect(0, 1300, W, H - 1300);

    renderCaptions(t);
    for (const k of KS) if (hud[k]) hud[k].textContent = k === 'disc' && t >= RUN.disc.end ? `${fmt(hits(k, t))} ✓` : fmt(hits(k, t));
    const SHL = shotAt(t);
    const fadeLab = (id, a, b, d) => { const el = document.getElementById(id); if (el) el.style.opacity = String((1 - SHL.amt) * (1 - d * smooth(seg(t, a, b)))); };
    fadeLab('lab-obs', 99, 100, 0);
    if (SHL.k && SHL.amt > 0.02) {
      const k = SHL.k, nm = ({ disc: '1 · DISCIPLINA', obs: '2 · OBSESSÃO', motiv: '3 · MOTIVAÇÃO', ego: '4 · EGO' })[k];
      const n = k === 'disc' ? (t >= RUN.disc.end ? `${fmt(hits(k, t))} ✓ META` : `${fmt(hits(k, t))} / 1.000`) : fmt(hits(k, t));
      c.save(); c.globalAlpha = SHL.amt; c.font = '700 26px "Space Mono", monospace'; const tw = c.measureText(nm).width; c.beginPath(); c.roundRect(540 - tw / 2 - 18, 488, tw + 36, 44, 22); c.fillStyle = 'rgba(12,12,14,0.85)'; c.fill(); c.lineWidth = 3; c.strokeStyle = rgb(COL[k]); c.stroke();
      c.fillStyle = rgb(COL[k]); c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(nm, 540, 511); c.font = '800 48px Montserrat, sans-serif'; c.fillText(n, 540, 572); c.restore();
    }
    fadeLab('lab-motiv', 6.2, 6.8, 0.6); fadeLab('lab-ego', 10.6, 11.2, 0.6); fadeLab('lab-disc', 15.4, 16.0, 0.4);
  }

  const typing = [];
  for (const cap of CAPS) for (const [ls, segs] of cap.lines) wordsOf(segs).forEach((w, j) => { const tt = ls + j * WSTEP; if (tt >= 0 && tt < cap.e) typing.push(+tt.toFixed(3)); });
  window.__schedule = { theme: THEME, shots: SHOTS, slam: 1.5, motivQuit: RUN.motiv.end, egoQuit: RUN.ego.end, meta: RUN.disc.end, payoff: BREAK_T, fall: FALL_HIT, regrab: BAR ? 17.98 + 0.17 : null,
    reps: REPS, thuds: THUDS, moans: MOANS, crowd: [7.8, 9.7], words: typing };
  window.__renderAt = renderAt;
  window.addEventListener('hf-seek', (e) => renderAt(e.detail.time));
  renderAt(0);
})();
