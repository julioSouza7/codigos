// Contra a correnteza: Disciplina x Obsessão x Ego — 2D vetorial, função pura do tempo.
// Regras do canal (@stick.obsessao): a OBSESSÃO sempre vence; uma cor viva para cada um; mais animado (25 s).
(function () {
  const W = 1080, H = 1920, FLOOR = 1080;
  const cv = document.getElementById('gl');
  const ctx = cv.getContext('2d');
  const layer = document.createElement('canvas'); layer.width = W; layer.height = H;
  const lc = layer.getContext('2d');

  // ---------- utilidades ----------
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const lerp = (a, b, u) => a + (b - a) * u;
  const seg = (t, a, b) => clamp((t - a) / (b - a));
  const smooth = (u) => { u = clamp(u); return u * u * (3 - 2 * u); };
  const easeIn = (u) => { u = clamp(u); return u * u; };
  const easeOut = (u) => 1 - Math.pow(1 - clamp(u), 3);
  const easeInOut = (u) => { u = clamp(u); return u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2; };
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const rnd = mulberry32(8811);
  const rr = (a, b) => a + (b - a) * rnd();
  const track = (keys) => (t) => {
    if (t <= keys[0][0]) return keys[0][1];
    for (let i = 1; i < keys.length; i++) {
      const [t1, v1] = keys[i], [t0, v0] = keys[i - 1];
      if (t <= t1) return lerp(v0, v1, smooth((t - t0) / (t1 - t0)));
    }
    return keys[keys.length - 1][1];
  };
  const rgb = (c, k = 1, a = 1) => `rgba(${Math.round(c[0] * k)},${Math.round(c[1] * k)},${Math.round(c[2] * k)},${a})`;
  const mixC = (a, b, u) => [lerp(a[0], b[0], u), lerp(a[1], b[1], u), lerp(a[2], b[2], u)];
  const P2 = (a, b, u) => [lerp(a[0], b[0], u), lerp(a[1], b[1], u)];
  const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
  const v = (a, len) => [Math.sin(a) * len, Math.cos(a) * len];
  const dirA = (a) => [Math.sin(a), -Math.cos(a)]; // 0 = para cima, π/2 = para a frente

  // ---------- boneco de perfil ----------
  const D = { headR: 31, limb: 26, torsoW: 30, ol: 5, torso: 100, uArm: 60, fArm: 56, thigh: 82, shin: 78, foot: 20 };
  const OUT = '#0e0e10';
  const WHITE = [247, 247, 245], BACK = [196, 196, 200], DARK = [88, 88, 94], DARKB = [62, 62, 68];
  const RED = [255, 59, 48];
  const COL = { disc: [47, 155, 255], obs: [255, 59, 48], ego: [184, 92, 255] };

  function ikP(S, T, a, b, pref) {
    const dx = T[0] - S[0], dy = T[1] - S[1], d = Math.max(1e-3, Math.hypot(dx, dy));
    const dd = clamp(d, Math.abs(a - b) + 1, a + b - 0.5);
    const ux = dx / d, uy = dy / d;
    const A = Math.acos(clamp((a * a + dd * dd - b * b) / (2 * a * dd), -1, 1));
    const c1 = [ux * Math.cos(A) - uy * Math.sin(A), ux * Math.sin(A) + uy * Math.cos(A)];
    const c2 = [ux * Math.cos(A) + uy * Math.sin(A), -ux * Math.sin(A) + uy * Math.cos(A)];
    const e = pref(c1) >= pref(c2) ? c1 : c2;
    const E = [S[0] + e[0] * a, S[1] + e[1] * a];
    const hx = T[0] - E[0], hy = T[1] - E[1], hl = Math.max(1e-3, Math.hypot(hx, hy));
    return { E, H: [E[0] + (hx / hl) * b, E[1] + (hy / hl) * b] };
  }
  const PREF = { down: (c) => c[1] - 0.3 * c[0], back: (c) => -c[0] + 0.2 * c[1], fwd: (c) => c[0] - 0.2 * c[1] };
  const legH = (L) => D.thigh * Math.cos(L.fT) + D.shin * Math.cos(L.fS);
  const standHipY = (L) => FLOOR - D.limb * 0.5 - 2 - legH(L);

  function rigP(st) {
    const L = st.legs, hip = [st.x, st.hipY];
    const tv = [Math.sin(st.lean), -Math.cos(st.lean)];
    const sh = add(hip, [tv[0] * D.torso, tv[1] * D.torso]);
    const arm = add(hip, [tv[0] * (D.torso - 12), tv[1] * (D.torso - 12)]);
    const ha = st.lean + st.head;
    const head = add(sh, [Math.sin(ha) * (D.headR + 9), -Math.cos(ha) * (D.headR + 9)]);
    const aF = ikP(arm, st.hands[0], D.uArm, D.fArm, PREF[st.prefF || 'down']);
    const aB = ikP(arm, st.hands[1], D.uArm, D.fArm, PREF[st.prefB || 'down']);
    const kF = add(hip, v(L.fT, D.thigh)), anF = add(kF, v(L.fS, D.shin)), tF = add(anF, v(L.fS + Math.PI / 2, D.foot));
    const kB = add(hip, v(L.bT, D.thigh)), anB = add(kB, v(L.bS, D.shin)), tB = add(anB, v(L.bS + Math.PI / 2, D.foot));
    return { hip, sh, arm, head, armF: [arm, aF.E, aF.H], armB: [arm, aB.E, aB.H], legF: [hip, kF, anF, tF], legB: [hip, kB, anB, tB] };
  }
  function strokePts(c, pts, w, col) {
    c.lineWidth = w; c.strokeStyle = col; c.lineCap = 'round'; c.lineJoin = 'round';
    c.beginPath(); c.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]);
    c.stroke();
  }
  const limb = (c, pts, w, col) => { strokePts(c, pts, w + 2 * D.ol, OUT); strokePts(c, pts, w, col); };
  const disc = (c, p, r, col) => { c.fillStyle = col; c.beginPath(); c.arc(p[0], p[1], r, 0, Math.PI * 2); c.fill(); };

  // ---------- remo e canoa (coordenadas locais: quadril em 0,0; y para baixo) ----------
  const SC = 0.62;
  const SURF = { disc: 690, obs: 897, ego: 1098 };
  const LANE_Y = (k) => SURF[k] - 30 * SC;
  const PXM = 7.0, X0 = 150;
  const META_M = 60;
  const xOf = (m) => X0 + m * PXM;
  function drawPaddle(c, top, blade, col) {
    const dx = blade[0] - top[0], dy = blade[1] - top[1], L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L;
    const bStart = [blade[0] - ux * 62, blade[1] - uy * 62];
    strokePts(c, [top, bStart], 9 + 8, OUT); strokePts(c, [top, bStart], 9, '#b9875f');
    strokePts(c, [[top[0] - uy * 14, top[1] + ux * 14], [top[0] + uy * 14, top[1] - ux * 14]], 9 + 8, OUT);
    strokePts(c, [[top[0] - uy * 14, top[1] + ux * 14], [top[0] + uy * 14, top[1] - ux * 14]], 9, '#b9875f');
    c.save(); c.translate((bStart[0] + blade[0]) / 2, (bStart[1] + blade[1]) / 2); c.rotate(Math.atan2(uy, ux));
    c.beginPath(); c.ellipse(0, 0, 38, 17, 0, 0, Math.PI * 2); c.fillStyle = rgb(col); c.fill(); c.lineWidth = 4.5; c.strokeStyle = OUT; c.stroke();
    c.fillStyle = 'rgba(255,255,255,0.45)'; c.beginPath(); c.ellipse(-4, -6, 22, 4, 0, 0, Math.PI * 2); c.fill();
    c.restore();
  }
  function drawHull(c, col, lit) {
    c.beginPath(); c.moveTo(-200, -14); c.quadraticCurveTo(-130, 76, 0, 78); c.quadraticCurveTo(150, 76, 215, -16); c.quadraticCurveTo(140, 14, 0, 16); c.quadraticCurveTo(-130, 14, -200, -14); c.closePath();
    const g = c.createLinearGradient(0, -10, 0, 80); g.addColorStop(0, rgb(col, lit)); g.addColorStop(1, rgb(col, lit * 0.62));
    c.fillStyle = g; c.fill(); c.lineWidth = 5; c.strokeStyle = OUT; c.stroke();
    c.fillStyle = 'rgba(255,255,255,0.4)'; c.beginPath(); c.moveTo(-170, 2); c.quadraticCurveTo(0, 30, 185, 0); c.quadraticCurveTo(0, 24, -170, 2); c.fill();
  }
  function drawRower(c, R, light, col, paddle) {
    const f = rgb(mixC(DARK, WHITE, light)), b = rgb(mixC(DARKB, BACK, light));
    if (light > 0.5) {
      c.save(); c.globalAlpha = 0.55 * (light - 0.5) * 2; c.filter = 'blur(8px)';
      for (const L of [R.armB, R.armF, [R.hip, R.sh]]) strokePts(c, L, D.limb + 22, rgb(col));
      disc(c, R.head, D.headR + 12, rgb(col)); c.restore();
    }
    limb(c, R.legB, D.limb, b); limb(c, R.legF, D.limb, f);
    drawHull(c, col, 0.55 + 0.45 * light);
    limb(c, R.armB, D.limb, b);
    strokePts(c, [R.hip, R.sh], D.torsoW + 2 * D.ol, OUT); strokePts(c, [R.hip, R.sh], D.torsoW, f);
    disc(c, R.head, D.headR + D.ol, OUT); disc(c, R.head, D.headR, f);
    if (paddle) drawPaddle(c, paddle.top, paddle.blade, col);
    limb(c, R.armF, D.limb, f);
  }

  // ---------- remadas ----------
  const SEAT_L = { fT: 1.35, fS: 0.15, bT: 1.25, bS: 0.1 };
  const PK = [
    [0.0, [70, -150], [172, 92], 0.36],
    [0.45, [-22, -140], [-92, 92], -0.12],
    [0.6, [-12, -168], [-74, 22], -0.06],
    [0.9, [70, -172], [160, 22], 0.3],
    [1.0, [70, -150], [172, 92], 0.36],
  ];
  function strokeAt(ph) {
    let i = 0; while (i < PK.length - 2 && ph >= PK[i + 1][0]) i++;
    const [p0, t0, b0, l0] = PK[i], [p1, t1, b1, l1] = PK[i + 1];
    const u = i === 0 ? easeInOut((ph - p0) / (p1 - p0)) : easeInOut((ph - p0) / (p1 - p0));
    return { top: P2(t0, t1, u), blade: P2(b0, b1, u), lean: lerp(l0, l1, u) };
  }
  const T0 = 3.0;
  const RUN = {
    ego: { P: 0.42, end: 6.5, rate: 9.0 },
    disc: { P: 0.7, end: 12.6, rate: META_M / 9.6 },
    obs: { P: 0.55, end: 19.0, rate: 6.6 },
  };
  const PAY = 19.0;
  function dist(k, t) {
    const r = RUN[k];
    let d = r.rate * clamp(t - T0, 0, r.end - T0);
    if (k === 'ego' && t > r.end) d = Math.max(4, d - 1.45 * (t - r.end) - 0.4 * Math.pow(Math.max(0, t - r.end), 1.2));
    return d;
  }
  // gancho: pás erguidas e mergulho junto em 1,5 s
  function hookPose(t) {
    const rest = { top: [10, -110], blade: [150, -40], lean: 0.05 };
    const raised = { top: [40, -200], blade: [150, -40], lean: -0.05 };
    const cat = { top: PK[0][1], blade: PK[0][2], lean: PK[0][3] };
    const mix = (a, b, u) => ({ top: P2(a.top, b.top, u), blade: P2(a.blade, b.blade, u), lean: lerp(a.lean, b.lean, u) });
    if (t < 1.1) return mix(rest, raised, easeInOut(t / 1.1));
    if (t < 1.36) return raised;
    if (t < 1.5) return mix(raised, cat, easeIn(seg(t, 1.36, 1.5)));
    if (t < T0) return mix(cat, { top: PK[1][1], blade: PK[1][2], lean: PK[1][3] }, easeInOut(seg(t, 1.6, 2.6)));
    return cat;
  }
  function paddleState(k, t) {
    let s;
    if (t < T0) s = hookPose(t);
    else if (t < RUN[k].end || k === 'obs' && t < PAY) s = strokeAt(((t - T0) / RUN[k].P) % 1);
    else s = strokeAt(0.6);
    const lean = s.lean;
    const hands = [P2(s.top, s.blade, 0.4), [s.top[0] + 2, s.top[1] + 4]];
    return { x: 0, hipY: 0, lean, head: 0.1, legs: SEAT_L, hands, prefF: 'down', prefB: 'down', paddle: { top: s.top, blade: s.blade } };
  }
  function egoState(t) {
    const end = RUN.ego.end;
    if (t < end) return paddleState('ego', t);
    const last = paddleState('ego', end - 1e-3);
    const u = easeInOut(seg(t, end, end + 0.6));
    const across = { top: [-120, -30], blade: [170, -36] };
    const paddle = { top: P2(last.paddle.top, across.top, u), blade: P2(last.paddle.blade, across.blade, u) };
    const knees = [[70, -40], [56, -36]];
    return { x: 0, hipY: 0, lean: lerp(last.lean, 0.55, u), head: lerp(0.1, 0.55, u), legs: SEAT_L,
      hands: [P2(last.hands[0], knees[0], u), P2(last.hands[1], knees[1], u)], prefF: 'down', prefB: 'down', paddle };
  }
  function discState(t) {
    const end = RUN.disc.end;
    if (t < end) return paddleState('disc', t);
    const last = paddleState('disc', end - 1e-3);
    const u = easeInOut(seg(t, end, end + 0.5));
    const across = { top: [-120, -30], blade: [170, -36] };
    const paddle = { top: P2(last.paddle.top, across.top, u), blade: P2(last.paddle.blade, across.blade, u) };
    const hips = [[22, -60], [10, -64]];
    return { x: 0, hipY: 0, lean: lerp(last.lean, -0.04, u), head: lerp(0.1, -0.12, u), legs: SEAT_L,
      hands: [P2(last.hands[0], hips[0], u), P2(last.hands[1], hips[1], u)], prefF: u > 0.3 ? 'back' : 'down', prefB: u > 0.3 ? 'back' : 'down', paddle };
  }
  function obsState(t) {
    if (t < PAY) {
      const s = paddleState('obs', t);
      // braço doendo: tremor e mais inclinação na reta final
      const tired = smooth(seg(t, 15.8, 16.4));
      s.lean += 0.08 * tired; s.head += 0.15 * tired * Math.abs(Math.sin(t * 3));
      return s;
    }
    const last = paddleState('obs', PAY - 1e-3);
    const u = easeOut(seg(t, PAY + 0.1, PAY + 0.55));
    const up = [[60, -270], [-70, -262]];
    const paddle = { top: P2(last.paddle.top, [-70, -262], u), blade: P2(last.paddle.blade, [-170, -380], u) };
    return { x: 0, hipY: -12 * Math.sin(Math.PI * seg(t, PAY + 0.2, PAY + 0.6)), lean: lerp(last.lean, -0.1 + 0.04 * Math.sin((t - PAY) * 5), u), head: lerp(0.1, -0.3, u), legs: SEAT_L,
      hands: [P2(last.hands[0], up[0], u), P2(last.hands[1], up[1], u)], prefF: 'fwd', prefB: 'back', paddle };
  }
  const stateOf = { disc: discState, obs: obsState, ego: egoState };
  const STRIKES = { ego: [], disc: [], obs: [] };
  for (const k of ['ego', 'disc', 'obs']) for (let n = 0; ; n++) { const ts = T0 + RUN[k].P * n; const end = k === 'obs' ? PAY : RUN[k].end; if (ts >= end) break; STRIKES[k].push(+ts.toFixed(3)); }

  // ---------- rio ----------
  function boatPos(k, t) {
    const x = xOf(dist(k, t)), bob = 4 * Math.sin(t * 3.1 + x * 0.01);
    const tilt = k === 'ego' && t > RUN.ego.end ? 0.06 * Math.sin((t - RUN.ego.end) * 2.2) - 0.04 * smooth(seg(t, RUN.ego.end, RUN.ego.end + 1)) : 0.02 * Math.sin(t * 2.3 + x * 0.02);
    return { x, y: LANE_Y(k) + bob, tilt };
  }
  function drawWater(c, k, t) {
    const S = SURF[k], col = COL[k];
    const g = c.createLinearGradient(0, S, 0, S + 70); g.addColorStop(0, rgb(mixC([40, 44, 52], col, 0.18))); g.addColorStop(1, 'rgba(10,11,14,1)');
    c.fillStyle = g; c.fillRect(-300, S, W + 600, 56);
    c.lineWidth = 3; c.strokeStyle = rgb(mixC([255, 255, 255], col, 0.3), 1, 0.45);
    c.beginPath(); for (let x = -300; x <= W + 300; x += 12) { const y = S + 3 * Math.sin(x * 0.04 + t * 5); if (x === -300) c.moveTo(x, y); else c.lineTo(x, y); } c.stroke();
    // corrente: traços correndo para a esquerda
    c.strokeStyle = 'rgba(255,255,255,0.28)'; c.lineWidth = 3; c.lineCap = 'round';
    for (let i = 0; i < 14; i++) {
      const sp = 210 + (i % 3) * 50, x = (((i * 173 - t * sp) % (W + 200)) + W + 200) % (W + 200) - 100, y = S + 14 + (i % 4) * 13;
      c.beginPath(); c.moveTo(x, y); c.lineTo(x + 34 + (i % 2) * 18, y); c.stroke();
    }
  }
  function drawSplash(c, k, t) {
    const list = [...STRIKES[k], 1.5];
    for (const t0 of list) {
      const a = t - t0; if (a < 0 || a > 0.5) continue;
      const bp = boatPos(k, t0), sx = bp.x + 172 * SC, S = SURF[k];
      c.save(); c.globalAlpha = 1 - a / 0.5;
      c.lineWidth = 3; c.strokeStyle = rgb(mixC([255, 255, 255], COL[k], 0.4));
      const r = 12 + 60 * easeOut(a / 0.5); c.beginPath(); c.ellipse(sx - 20 * a * 2, S + 4, r, r * 0.25, 0, 0, Math.PI * 2); c.stroke();
      for (let i = 0; i < 5; i++) { const ang = -Math.PI * (0.2 + 0.15 * i), sp = 240 + i * 30; disc(c, [sx + Math.cos(ang) * sp * a, S + Math.sin(ang) * sp * a + 900 * a * a], 4.5, rgb(mixC([235, 240, 245], COL[k], 0.35))); }
      c.restore();
    }
    // esteira atrás do barco
    const bp = boatPos(k, t), moving = k === 'ego' ? t < RUN.ego.end && t > T0 : k === 'disc' ? t < RUN.disc.end && t > T0 : t > T0 && t < PAY;
    if (moving) { c.save(); c.globalAlpha = 0.5; c.strokeStyle = '#e6eef4'; c.lineWidth = 3; for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(bp.x - 120 * SC - i * 30, SURF[k] + 6 + i * 6); c.lineTo(bp.x - 120 * SC - 60 - i * 40, SURF[k] + 10 + i * 9); c.stroke(); } c.restore(); }
  }
  function drawMetaLine(c, t) {
    const x = xOf(META_M), hit = t >= RUN.disc.end;
    c.save(); c.setLineDash([12, 10]); c.lineWidth = 3; c.strokeStyle = 'rgba(255,255,255,0.4)';
    c.beginPath(); c.moveTo(x, SURF.disc - 190); c.lineTo(x, SURF.ego + 40); c.stroke(); c.restore();
    // boia da meta no rio da disciplina
    const by = SURF.disc + 2 * Math.sin(t * 3);
    c.beginPath(); c.moveTo(x - 16, by + 6); c.lineTo(x + 16, by + 6); c.lineTo(x + 10, by - 30); c.lineTo(x - 10, by - 30); c.closePath();
    c.fillStyle = '#f2f2f2'; c.fill(); c.lineWidth = 4; c.strokeStyle = OUT; c.stroke();
    c.fillStyle = rgb(COL.disc); c.fillRect(x - 11, by - 18, 22, 9);
    const flash = hit ? Math.exp(-(t - RUN.disc.end) * 4) : 0;
    const label = hit ? 'META ✓' : `META ${META_M} M`;
    c.font = '700 22px "Space Mono", monospace'; const tw = c.measureText(label).width;
    const px = x - (tw + 26) / 2, py = SURF.disc - 196;
    c.save(); c.globalAlpha = 1 - smooth(seg(t, 18.8, 19.1));
    c.fillStyle = `rgba(${Math.round(20 + 200 * flash)},${Math.round(20 + 200 * flash)},${Math.round(22 + 200 * flash)},0.92)`;
    c.beginPath(); c.roundRect(px, py, tw + 26, 36, 18); c.fill();
    c.lineWidth = 2.5; c.strokeStyle = 'rgba(255,255,255,0.8)'; c.stroke();
    c.fillStyle = flash > 0.5 ? '#111' : '#f2f2f2'; c.textAlign = 'left'; c.textBaseline = 'middle'; c.fillText(label, px + 13, py + 19);
    c.restore();
  }
  // âncora da disciplina
  function drawAnchor(c, t) {
    if (t < RUN.disc.end) return;
    const u = easeIn(seg(t, RUN.disc.end + 0.1, RUN.disc.end + 0.5)), bp = boatPos('disc', t);
    const x = bp.x - 150 * SC, y0 = SURF.disc, y = lerp(y0 - 30, y0 + 44, u);
    c.strokeStyle = 'rgba(230,230,235,0.8)'; c.lineWidth = 2.5; c.beginPath(); c.moveTo(x, y0 - 24); c.lineTo(x, y); c.stroke();
    c.lineWidth = 5; c.strokeStyle = OUT; c.beginPath(); c.moveTo(x, y - 12); c.lineTo(x, y + 10); c.moveTo(x - 10, y + 4); c.quadraticCurveTo(x, y + 16, x + 10, y + 4); c.stroke();
  }
  // plateia na margem do rio do ego
  const crowdX = [870, 915, 960, 1005, 1050];
  function drawCrowd(c, t) {
    const y0 = SURF.ego - 6;
    c.fillStyle = '#2a2a2f'; c.fillRect(835, y0, 260, 10); c.strokeStyle = OUT; c.lineWidth = 3; c.strokeRect(835, y0, 260, 10);
    for (let i = 0; i < crowdX.length; i++) {
      const show = smooth(seg(t, 3.0 + i * 0.07, 3.3 + i * 0.07)) * (1 - smooth(seg(t, 6.25 + i * 0.06, 6.5 + i * 0.06)));
      if (show <= 0.01) continue;
      const ph = i * 1.7, cheer = t < 6.3 ? Math.abs(Math.sin((t + ph) * 7)) * 10 : 0;
      c.save(); c.globalAlpha = show; c.translate(crowdX[i], y0 - cheer);
      c.lineWidth = 3; c.strokeStyle = rgb(COL.ego, 1, 0.9); c.fillStyle = '#121214';
      c.beginPath(); c.arc(0, -40, 11, 0, Math.PI * 2); c.fill(); c.stroke();
      c.beginPath(); c.moveTo(-17, 0); c.quadraticCurveTo(-17, -24, 0, -24); c.quadraticCurveTo(17, -24, 17, 0); c.fill(); c.stroke();
      if (t < 6.3 && Math.sin((t + ph) * 3) > 0.2) { c.beginPath(); c.arc(0, -66, 7, 0.15 * Math.PI, 0.85 * Math.PI); c.stroke(); }
      c.restore();
    }
  }
  // sol vermelho nascendo na nascente (clímax)
  function drawSun(c, t) {
    const u = easeOut(seg(t, PAY - 0.2, PAY + 1.4)); if (u <= 0) return;
    const S = SURF.obs, cx = 925, cy = lerp(S + 140, S - 120, u);
    c.save(); c.beginPath(); c.rect(-300, -400, W + 600, S + 400); c.clip();
    c.globalCompositeOperation = 'lighter';
    const g = c.createRadialGradient(cx, cy, 0, cx, cy, 520); g.addColorStop(0, rgb(COL.obs, 1, 0.75 * u)); g.addColorStop(0.35, rgb(COL.obs, 1, 0.22 * u)); g.addColorStop(1, rgb(COL.obs, 1, 0));
    c.fillStyle = g; c.fillRect(cx - 520, cy - 520, 1040, 1040);
    c.filter = 'blur(5px)'; c.fillStyle = `rgba(255,220,210,${0.16 * u})`;
    for (let i = 0; i < 10; i++) { const a = -Math.PI + (i / 9) * Math.PI + 0.1 * Math.sin(t); c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx + Math.cos(a - 0.06) * 700, cy + Math.sin(a - 0.06) * 700); c.lineTo(cx + Math.cos(a + 0.06) * 700, cy + Math.sin(a + 0.06) * 700); c.closePath(); c.fill(); }
    c.filter = 'none'; c.globalCompositeOperation = 'source-over';
    c.beginPath(); c.arc(cx, cy, 110, 0, Math.PI * 2); c.fillStyle = rgb(COL.obs); c.fill(); c.lineWidth = 5; c.strokeStyle = OUT; c.stroke();
    c.fillStyle = 'rgba(255,255,255,0.35)'; c.beginPath(); c.arc(cx - 34, cy - 36, 30, 0, Math.PI * 2); c.fill();
    c.restore();
  }

  // ---------- luz ----------
  const level = {
    disc: track([[0, 0.95], [3.0, 0.95], [3.25, 0.7], [7.9, 0.7], [8.1, 1.1], [13.1, 1.1], [13.6, 0.6]]),
    obs: track([[0, 0.95], [3.0, 0.95], [3.25, 0.7], [13.1, 0.7], [13.3, 1.15], [18.9, 1.15], [19.05, 1.6], [20.4, 1.3]]),
    ego: track([[0, 0.95], [3.0, 0.95], [3.25, 1.15], [6.4, 1.15], [6.5, 1.0], [7.2, 0.1]]),
  };

  // ---------- câmera ----------
  function camAt(t) {
    const hookU = easeOut(seg(t, 1.5, 2.4));
    let s = lerp(1.1, 1.0, hookU);
    let ox = 540 - 540 * s, oy = 905 - 905 * s;
    const focus = t < 6.5 ? 'ego' : t < 13.0 ? 'disc' : 'obs';
    let punch = 0; for (const ts of STRIKES[focus]) { const d = t - ts; if (d >= 0 && d < 0.4) punch += 0.018 * Math.exp(-d * 13); }
    s *= 1 + punch; ox = 540 - (540 - ox) * (1 + punch); oy = 905 - (905 - oy) * (1 + punch);
    const k1 = t >= 1.5 ? Math.exp(-(t - 1.5) * 9) : 0, k2 = t >= PAY ? Math.exp(-(t - PAY) * 5) : 0;
    ox += 15 * k1 * Math.sin((t - 1.5) * 70) + 22 * k2 * Math.sin((t - PAY) * 60);
    oy += 10 * k1 * Math.cos((t - 1.5) * 83) + 16 * k2 * Math.cos((t - PAY) * 73);
    return { s, ox, oy };
  }
  const toScreen = (p, C) => [p[0] * C.s + C.ox, p[1] * C.s + C.oy];

  // ---------- texto: palavras pulando, palavra-chave na cor do personagem ----------
  const CAPS = [
    { s: -1, e: 2.85, lines: [[-1, [['TRÊS CONTRA A CORRENTEZA.']]], [0.3, [['SÓ '], ['UM', 'obs'], [' CHEGA NO SOL.']]]] },
    { s: 3.0, e: 5.3, lines: [[3.0, [['O '], ['EGO', 'ego'], [' REMA']]], [3.35, [['PRA SER VISTO.']]]] },
    { s: 5.4, e: 7.9, lines: [[5.4, [['SEM PLATEIA, PAROU.']]], [5.8, [['A CORRENTE LEVA.']]]] },
    { s: 8.0, e: 10.5, lines: [[8.0, [['A '], ['DISCIPLINA', 'disc']]], [8.35, [['REMA TODO DIA.']]]] },
    { s: 10.6, e: 13.1, lines: [[10.6, [['CHEGA NA META']]], [11.0, [['E ANCORA.']]]] },
    { s: 13.2, e: 15.7, lines: [[13.2, [['A '], ['OBSESSÃO', 'obs']]], [13.55, [['PASSA DA META.']]]] },
    { s: 15.8, e: 18.9, lines: [[15.8, [['COM O BRAÇO DOENDO,']]], [16.2, [['REMA DE NOVO.']]]] },
    { s: 19.1, e: 21.7, big: true, lines: [[19.25, [['PAROU DE REMAR,']]], [19.65, [['A CORRENTE '], ['LEVA.', 'obs']]]] },
    { s: 21.8, e: 99, big: true, lines: [[21.8, [['REMA MAIS']]], [22.1, [['UM '], ['POUCO.', 'obs']]]] },
  ];
  const capEl = document.getElementById('cap');
  const capLines = capEl ? [capEl.querySelector('.l1'), capEl.querySelector('.l2')] : [];
  const WSTEP = 0.11;
  const wordsOf = (segs) => { const out = []; for (const [txt, col] of segs) for (const w of txt.split(' ')) if (w) out.push([w, col || '']); return out; };
  const lenOf = (segs) => segs.reduce((a, s) => a + s[0].length, 0);
  function renderCaptions(t) {
    if (!capEl) return;
    const cap = CAPS.find((c) => t >= c.s && t < c.e) || null;
    if (!cap) { capEl.style.opacity = '0'; return; }
    capEl.style.opacity = String(1 - smooth(seg(t, cap.e - 0.15, cap.e)));
    capEl.className = cap.big ? 'cap big' : 'cap';
    cap.lines.forEach(([ls, segs], i) => {
      const ws = wordsOf(segs);
      capLines[i].innerHTML = ws.map(([w, col], j) => {
        const age = t - (ls + j * WSTEP);
        if (age < 0) return '';
        const sc = 1 + 0.55 * Math.exp(-age * 16) * Math.cos(age * 30), op = clamp(age / 0.06), y = 22 * Math.exp(-age * 18);
        return `<span class="w ${col ? 'c-' + col : ''}" style="opacity:${op.toFixed(3)};transform:translateY(${y.toFixed(1)}px) scale(${sc.toFixed(3)})">${w}</span>`;
      }).join(' ');
    });
    for (let i = cap.lines.length; i < capLines.length; i++) capLines[i].innerHTML = '';
  }
  const hud = {}; for (const k of ['disc', 'obs', 'ego']) hud[k] = document.getElementById('n-' + k);
  const fmt = (n) => Math.floor(n).toLocaleString('pt-BR');

  // ---------- desenho ----------
  function drawObjects(c, t, lv) {
    drawSun(c, t);
    drawMetaLine(c, t);
    drawCrowd(c, t);
    for (const k of ['disc', 'obs', 'ego']) {
      const bp = boatPos(k, t);
      const light = clamp(0.3 + 0.7 * Math.min(1, lv[k] / 0.85));
      // halo colorido
      const a = 0.24 * Math.min(1.3, lv[k]) * (k === 'obs' ? 1 + 0.8 * smooth(seg(t, PAY, PAY + 0.5)) : 1);
      c.save(); c.globalCompositeOperation = 'lighter';
      const g = c.createRadialGradient(bp.x, bp.y - 60, 0, bp.x, bp.y - 60, 220); g.addColorStop(0, rgb(COL[k], 1, a)); g.addColorStop(1, rgb(COL[k], 1, 0));
      c.fillStyle = g; c.fillRect(bp.x - 220, bp.y - 280, 440, 440); c.restore();
      if (k === 'disc') drawAnchor(c, t);
      const st = stateOf[k](t);
      c.save(); c.translate(bp.x, bp.y); c.rotate(bp.tilt); c.scale(SC, SC);
      drawRower(c, rigP(st), light, COL[k], st.paddle);
      c.restore();
      drawWater(c, k, t);
      drawSplash(c, k, t);
    }
  }
  function beamS(c, x, yb, a, col) {
    c.save(); c.filter = 'blur(12px)';
    const cc = mixC([255, 252, 246], col || [255, 252, 246], 0.55);
    const g = c.createLinearGradient(0, -60, 0, yb); g.addColorStop(0, rgb(cc, 1, a * 1.3)); g.addColorStop(1, rgb(cc, 1, a * 0.4));
    c.fillStyle = g; c.beginPath(); c.moveTo(x - 26, -60); c.lineTo(x + 26, -60); c.lineTo(x + 175, yb); c.lineTo(x - 175, yb); c.closePath(); c.fill(); c.restore();
  }

  function renderAt(t) {
    const C = camAt(t);
    const lv = { disc: level.disc(t), obs: level.obs(t), ego: level.ego(t) };
    lc.setTransform(1, 0, 0, 1, 0, 0); lc.clearRect(0, 0, W, H); lc.setTransform(C.s, 0, 0, C.s, C.ox, C.oy);
    drawObjects(lc, t, lv);
    const c = ctx;
    c.setTransform(1, 0, 0, 1, 0, 0);
    const bg = c.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#060608'); bg.addColorStop(0.45, '#1c1d24'); bg.addColorStop(1, '#08080a');
    c.fillStyle = bg; c.fillRect(0, 0, W, H);
    c.save(); c.filter = 'blur(26px)'; c.fillStyle = 'rgba(255,250,240,0.04)';
    c.beginPath(); c.moveTo(-200, -100); c.lineTo(0, -100); c.lineTo(760, 1300); c.lineTo(160, 1300); c.closePath(); c.fill();
    c.beginPath(); c.moveTo(1100, -100); c.lineTo(1300, -100); c.lineTo(940, 1300); c.lineTo(340, 1300); c.closePath(); c.fill(); c.restore();
    c.drawImage(layer, 0, 0);
    const top = c.createLinearGradient(0, 120, 0, 500); top.addColorStop(0, 'rgba(0,0,0,0.6)'); top.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = top; c.fillRect(0, 0, W, 500);
    const ui = c.createLinearGradient(0, 1250, 0, 1420); ui.addColorStop(0, 'rgba(4,4,5,0)'); ui.addColorStop(1, 'rgba(4,4,5,0.96)');
    c.fillStyle = ui; c.fillRect(0, 1250, W, H - 1250);

    renderCaptions(t);
    const fm = (k) => `${Math.floor(dist(k, t) + 1e-6)} M`;
    if (hud.disc) hud.disc.textContent = t >= RUN.disc.end ? `${fm('disc')} ✓` : fm('disc');
    if (hud.obs) hud.obs.textContent = fm('obs');
    if (hud.ego) hud.ego.textContent = fm('ego');
    const egoLab = document.getElementById('lab-ego'); if (egoLab) egoLab.style.opacity = String(1 - 0.6 * smooth(seg(t, 6.7, 7.3)));
    const discLab = document.getElementById('lab-disc'); if (discLab) discLab.style.opacity = String(1 - 0.4 * smooth(seg(t, 13.2, 13.8)));
  }

  const typing = [];
  for (const cap of CAPS) for (const [ls, segs] of cap.lines) wordsOf(segs).forEach((w, j) => { const tt = ls + j * WSTEP; if (tt >= 0 && tt < cap.e) typing.push(+tt.toFixed(3)); });
  window.__schedule = { slam: 1.5, egoQuit: RUN.ego.end, meta: RUN.disc.end, payoff: PAY, strikes: STRIKES, crowd: [3.0, 6.25], words: typing };
  window.__renderAt = renderAt;
  window.addEventListener('hf-seek', (e) => renderAt(e.detail.time));
  renderAt(0);
})();
