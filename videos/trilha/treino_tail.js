
  // ---------- desenho ----------
  function drawObjects(c, t, lv) {
    c.fillStyle = '#1b1b1e'; c.fillRect(-600, FLOOR, W + 1300, 900);
    c.fillStyle = 'rgba(255,255,255,0.2)'; c.fillRect(-600, FLOOR - 2, W + 1300, 4);
    for (const k of KS) {
      const a = 0.22 * Math.min(1.3, lv[k]) * (k === 'obs' ? 1 + 0.8 * smooth(seg(t, BREAK_T, BREAK_T + 0.5)) : 1), hy = FLOOR - 200;
      c.save(); c.globalCompositeOperation = 'lighter';
      const g = c.createRadialGradient(CX(k), hy, 0, CX(k), hy, 300); g.addColorStop(0, rgb(COL[k], 1, a)); g.addColorStop(1, rgb(COL[k], 1, 0));
      c.fillStyle = g; c.fillRect(CX(k) - 320, hy - 320, 640, 640); c.restore();
    }
    drawCrowd(c, t);
    for (const k of KS) drawGear(c, k, t, lv[k]);
    drawMeta(c, t);
    for (const k of ['motiv', 'disc', 'ego', 'obs']) {
      const st = stateOf[k](t);
      const light = clamp(0.3 + 0.7 * Math.min(1, lv[k] / 0.85));
      c.save(); c.translate(st.x + (st.front ? 0 : 10), FLOOR + 2); c.scale(1, 0.16);
      const sg = c.createRadialGradient(0, 0, 0, 0, 0, 80); sg.addColorStop(0, 'rgba(0,0,0,0.5)'); sg.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = sg; c.beginPath(); c.arc(0, 0, 80, 0, Math.PI * 2); c.fill(); c.restore();
      let hurt = null, sd = 9;
      if (k === 'obs') {
        const h = hurtOf(t); sd = t - lastOf(PAIN_EV, t); const th = sd < 1 ? Math.exp(-sd * 7) : 0;
        if (t < BREAK_T) { if (st.front) st.nod = (st.nod || 0) + 9 * h * th; else { st.head = (st.head || 0) + 0.24 * h * th; st.lean = (st.lean || 0) + 0.04 * h * th; } }
        hurt = { a: h * (0.8 + 0.2 * th), g: h * (0.1 + 0.32 * th) * clamp(light) };
      }
      const R = st.front ? rigF(st) : rigP(st);
      TH.drawBack(c, k, t, lv[k], st, R);
      if (st.front) drawFigF(c, R, light, COL[k], hurt); else drawFigure(c, R, light, COL[k], hurt);
      TH.drawFront(c, k, t, lv[k], st, R);
      if (hurt && hurt.a > 0.4 && sd >= 0 && sd < 0.34 && t < BREAK_T + 0.1) {   // tracinhos de dor
        const u = sd / 0.34; c.save(); c.strokeStyle = rgb(ACC, 1, (1 - u) * hurt.a * light); c.lineWidth = 6; c.lineCap = 'round';
        for (const [E, a0] of TH.painSpots(R)) for (let i = -1; i <= 1; i++) { const an = a0 + i * 0.42, r0 = 40 + 16 * easeOut(u), r1 = r0 + 18; c.beginPath(); c.moveTo(E[0] + Math.cos(an) * r0, E[1] + Math.sin(an) * r0); c.lineTo(E[0] + Math.cos(an) * r1, E[1] + Math.sin(an) * r1); c.stroke(); }
        c.restore();
      }
    }
    TH.burst(c, t, stateOf);
    for (const [tt, big, k] of THUDS) dust(c, k === 'obs' ? stateOf.obs(tt).x : CX(k), tt, t, 0.5 + 0.6 * big);
  }
  function beamS(c, x, yb, a, col) {
    c.save(); c.filter = 'blur(12px)';
    const cc = mixC([255, 252, 246], col || [255, 252, 246], 0.55);
    const g = c.createLinearGradient(0, -60, 0, yb); g.addColorStop(0, rgb(cc, 1, a * 1.3)); g.addColorStop(1, rgb(cc, 1, a * 0.4));
    c.fillStyle = g; c.beginPath(); c.moveTo(x - 26, -60); c.lineTo(x + 26, -60); c.lineTo(x + 175, yb); c.lineTo(x - 175, yb); c.closePath(); c.fill(); c.restore();
  }
  const NAMES = { motiv: '1 · MOTIVAÇÃO', disc: '2 · DISCIPLINA', ego: '3 · EGO', obs: '4 · OBSESSÃO' };
  function pill(c, x, k, t, alpha) {   // placar embaixo do personagem em foco
    const nm = NAMES[k];
    let n = fmt(hits(k, t)); if (k === 'disc') n = t >= RUN.disc.end ? `${n} ✓ META` : `${n} / 1.000`;
    const popT = k === 'obs' ? PASS_T : k === 'ego' ? EGO_PASS : -9, pop = t >= popT ? 1 + 0.35 * Math.exp(-(t - popT) * 7) : 1;
    const red = k === 'obs' ? smooth(seg(t, PASS_T, PASS_T + 0.2)) : 0, dim = k === 'ego' ? 1 - 0.5 * smooth(seg(t, RUN.ego.end, RUN.ego.end + 0.5)) : 1;
        c.save(); c.globalAlpha = alpha * dim; c.font = '700 24px "Space Mono", monospace'; const tw = c.measureText(nm).width;
    c.beginPath(); c.roundRect(x - tw / 2 - 16, 1178, tw + 32, 40, 20); c.fillStyle = 'rgba(12,12,14,0.85)'; c.fill(); c.lineWidth = 3; c.strokeStyle = 'rgba(244,242,238,0.8)'; c.stroke();
    c.fillStyle = '#f4f2ee'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(nm, x, 1199);
    c.translate(x, 1252); c.scale(pop, pop); c.font = '800 46px Montserrat, sans-serif'; c.fillStyle = rgb(mixC([244, 242, 238], [224, 86, 70], red)); c.fillText(n, 0, 0); c.restore();
  }

  function renderAt(t) {
    COL.obs = mixC(NEU, ACC, smooth(seg(t, BREAK_T - 0.2, BREAK_T + 0.4)));
    const C = camAt(t);
    const lv = { disc: level.disc(t), obs: level.obs(t), motiv: level.motiv(t), ego: level.ego(t) };
    const SH = shotAt(t); if (SH.k) for (const k of KS) if (!SH.foc.includes(k)) lv[k] *= 1 - 0.7 * SH.amt;
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
    const fadeLab = (id, a, b, d) => { const el = document.getElementById(id); if (el) el.style.opacity = String((1 - SH.amt) * (1 - d * smooth(seg(t, a, b)))); };
    fadeLab('lab-obs', 99, 100, 0);
    const pills = (key, a) => { if (key === 'duel') { for (const k of ['ego', 'obs']) pill(c, clamp(toScreen([CX(k), FLOOR], C)[0], 190, 890), k, t, a); } else pill(c, 540, key, t, a); };
    if (SH.k && SH.amt > 0.02) {
      const fresh = SH.pk !== 'wide' && SH.pk !== SH.k;   // troca entre dois zooms: o placar antigo some, o novo entra
      if (fresh && t < SH.ts + 0.3) pills(SH.pk, SH.amt * (1 - smooth(seg(t, SH.ts, SH.ts + 0.25))));
      pills(SH.k, SH.amt * (fresh ? smooth(seg(t, SH.ts + 0.35, SH.ts + 0.6)) : 1));
    }
    fadeLab('lab-motiv', 6.2, 6.8, 0.6); fadeLab('lab-disc', 11.0, 11.6, 0.4); fadeLab('lab-ego', 17.9, 18.5, 0.6);
  }

  const typing = [];
  for (const cap of CAPS) for (const [ls, segs] of cap.lines) wordsOf(segs).forEach((w, j) => { const tt = ls + j * WSTEP; if (tt >= 0 && tt < cap.e) typing.push(+tt.toFixed(3)); });
  window.__schedule = { theme: THEME, shots: SHOTS, focus: FOCUS, slam: 1.5, motivQuit: RUN.motiv.end, egoQuit: RUN.ego.end, meta: RUN.disc.end, payoff: BREAK_T, fall: FALL_HIT, regrab: null,
    reps: REPS, thuds: THUDS, clanks: TH.clanks, moans: MOANS, crowd: CROWD, cheer: [FALL_HIT + 0.6, 15.2], words: typing };
  window.__renderAt = renderAt; window.__dbg = { stateOf, rigP, rigF, HX };
  window.addEventListener('hf-seek', (e) => renderAt(e.detail.time));
  renderAt(0);
})();
