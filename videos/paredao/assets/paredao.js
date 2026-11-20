// O paredão: Obsessão x Disciplina x Motivação x Ego — 2D vetorial, função pura do tempo.
// Regras do canal (@stick.obsessao): a OBSESSÃO sempre vence; uma cor viva por personagem; 25 s.
(function () {
  const W = 1080, H = 1920, FLOOR = 1150, LAMP_Y = 560, RUNG = 56, R0Y = FLOOR - 40;
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
  const rnd = mulberry32(5656);
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

  // ---------- boneco de frente ----------
  const D = { headR: 31, limb: 26, torsoW: 42, ol: 5, torso: 100, uArm: 58, fArm: 56, thigh: 82, shin: 78, foot: 15, shW: 21, hipW: 11, handR: 13 };
  const OUT = '#0e0e10';
  const WHITE = [247, 247, 245], DARK = [92, 92, 98];
  const LANES = { disc: { x: 125 }, obs: { x: 370 }, motiv: { x: 615 }, ego: { x: 860 } };
  const COL = { disc: [47, 155, 255], obs: [255, 59, 48], motiv: [255, 204, 0], ego: [184, 92, 255] };
  const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
  const rungY = (r) => R0Y - r * RUNG;

  function ik(S, T, side, a, b) {
    const dx = T[0] - S[0], dy = T[1] - S[1], d = Math.max(1e-3, Math.hypot(dx, dy));
    const dd = clamp(d, Math.abs(a - b) + 1, a + b - 0.5);
    const ux = dx / d, uy = dy / d;
    const A = Math.acos(clamp((a * a + dd * dd - b * b) / (2 * a * dd), -1, 1));
    const c1 = [ux * Math.cos(A) - uy * Math.sin(A), ux * Math.sin(A) + uy * Math.cos(A)];
    const c2 = [ux * Math.cos(A) + uy * Math.sin(A), -ux * Math.sin(A) + uy * Math.cos(A)];
    const score = (c) => c[0] * side + 0.25 * c[1];
    const e = score(c1) >= score(c2) ? c1 : c2;
    const E = [S[0] + e[0] * a, S[1] + e[1] * a];
    const hx = T[0] - E[0], hy = T[1] - E[1], hl = Math.max(1e-3, Math.hypot(hx, hy));
    return { E, H: [E[0] + (hx / hl) * b, E[1] + (hy / hl) * b] };
  }

  // estado → esqueleto (mãos e pés por alvo, cotovelos e joelhos para fora)
  function buildRig(st) {
    const hip = [st.x, st.hipY];
    const sc = [st.x, st.hipY - D.torso];
    const shL = [sc[0] - D.shW, sc[1] + 10], shR = [sc[0] + D.shW, sc[1] + 10];
    const hL = [hip[0] - D.hipW, hip[1]], hR = [hip[0] + D.hipW, hip[1]];
    const aL = ik(shL, st.hands[0], -1, D.uArm, D.fArm), aR = ik(shR, st.hands[1], 1, D.uArm, D.fArm);
    const leg = (h, f, side) => {
      const d = Math.hypot(f[0] - h[0], f[1] - h[1]);
      const k = Math.min(1, (d * 0.52) / Math.max(D.thigh, D.shin) + 0.02);
      return ik(h, f, side, D.thigh * k, D.shin * k);
    };
    const lL = leg(hL, st.feet[0], -1), lR = leg(hR, st.feet[1], 1);
    const foot = (a, side) => add(a, [side * D.foot, 2]);
    return {
      sc, hip, head: [sc[0], sc[1] - 38 + (st.headDrop || 0)],
      armL: [shL, aL.E, aL.H], armR: [shR, aR.E, aR.H],
      legL: [hL, lL.E, lL.H, foot(lL.H, -1)], legR: [hR, lR.E, lR.H, foot(lR.H, 1)],
      grip: st.grip || [0, 0],
    };
  }
  function strokePts(c, pts, w, col) {
    c.lineWidth = w; c.strokeStyle = col; c.lineCap = 'round'; c.lineJoin = 'round';
    c.beginPath(); c.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]);
    c.stroke();
  }
  const limb = (c, pts, w, col) => { strokePts(c, pts, w + 2 * D.ol, OUT); strokePts(c, pts, w, col); };
  const disc = (c, p, r, col) => { c.fillStyle = col; c.beginPath(); c.arc(p[0], p[1], r, 0, Math.PI * 2); c.fill(); };
  function drawFigure(c, R, light, col) {
    const f = rgb(mixC(DARK, WHITE, light));
    if (light > 0.5) {
      c.save(); c.globalAlpha = 0.6 * (light - 0.5) * 2; c.filter = 'blur(9px)';
      for (const L of [R.legL, R.legR, R.armL, R.armR, [R.hip, R.sc]]) strokePts(c, L, D.limb + 24, rgb(col));
      disc(c, R.head, D.headR + 13, rgb(col)); c.restore();
    }
    strokePts(c, R.legL, D.limb + 2 * D.ol, OUT); strokePts(c, R.legR, D.limb + 2 * D.ol, OUT);
    strokePts(c, [R.hip, R.sc], D.torsoW + 2 * D.ol, OUT);
    strokePts(c, R.legL, D.limb, f); strokePts(c, R.legR, D.limb, f);
    strokePts(c, [R.hip, R.sc], D.torsoW, f);
    c.save(); c.globalAlpha = 0.1; strokePts(c, [[R.hip[0] + 15, R.hip[1] - 2], [R.sc[0] + 15, R.sc[1] + 8]], 7, '#000'); c.restore();
    limb(c, R.armL, D.limb, f); limb(c, R.armR, D.limb, f);
    disc(c, R.head, D.headR + D.ol, OUT); disc(c, R.head, D.headR, f);
    for (const [arm, g] of [[R.armL, R.grip[0]], [R.armR, R.grip[1]]]) if (g > 0.5) { disc(c, arm[2], D.handR + D.ol, OUT); disc(c, arm[2], D.handR, f); }
  }

  // ---------- subida ----------
  const DT = 1 / 240;
  function integrate(speed) {
    const arr = [0]; let n = 0;
    for (let t = DT; t <= 26.5; t += DT) { n += speed(t) * DT; arr.push(n); }
    return (t) => { const x = clamp(t / DT, 0, arr.length - 1), i = Math.floor(x); return lerp(arr[i], arr[Math.min(arr.length - 1, i + 1)], x - i); };
  }
  const START = { motiv: 2.5, ego: 2.55, obs: 2.6, disc: 2.65 };
  const GO = (k) => START[k] + 0.45;
  const META_N = 20, PAY = 19.0, BELL_N = 31;
  const T_MQ = 5.6, T_SLIDE = 6.6, T_EGOFREEZE = 10.0;
  const nMotivRaw = integrate((t) => (t < GO('motiv') ? 0 : t < T_MQ ? 3.3 : 3.3 * (1 - smooth(seg(t, T_MQ, 6.2)))));
  const MOTIV_PEAK = nMotivRaw(T_SLIDE);
  const nMotiv = (t) => (t < T_SLIDE ? nMotivRaw(t) : MOTIV_PEAK * (1 - easeIn(seg(t, T_SLIDE, T_SLIDE + 0.75))));
  const nEgo = integrate((t) => (t < GO('ego') ? 0 : t < T_EGOFREEZE - 0.3 ? 1.45 : 1.45 * (1 - smooth(seg(t, T_EGOFREEZE - 0.3, T_EGOFREEZE + 0.2)))));
  const T_META = 14.0;
  const nDisc = integrate((t) => (t < GO('disc') ? 0 : t < T_META ? META_N / (T_META - GO('disc')) : 0));
  const nObs = integrate((t) => (t < GO('obs') ? 0 : t < 15.8 ? 2.02 : t < PAY - 0.3 ? 1.72 : 0));

  function limbRung(n, base, ph) {
    const f = n - Math.floor(n), k = Math.floor(n);
    const u = easeInOut(clamp((f - ph) / 0.25));
    return base + k + (f >= ph ? u : 0);
  }
  function climbState(x, n) {
    const hipY = R0Y - 128 - n * RUNG;
    const LH = limbRung(n, 5, 0), RF = limbRung(n, 0, 0.25), RH = limbRung(n, 5, 0.5), LF = limbRung(n, 0, 0.75);
    const lift = (r) => { const f = r - Math.floor(r); return f > 0.001 ? -14 * Math.sin(Math.PI * f) : 0; };
    return {
      x: x + 4 * Math.sin(n * Math.PI), hipY,
      hands: [[x - 42, rungY(LH) + lift(LH)], [x + 42, rungY(RH) + lift(RH)]],
      feet: [[x - 26, rungY(LF) - 4 + lift(LF)], [x + 26, rungY(RF) - 4 + lift(RF)]],
      grip: [1, 1], headDrop: 0,
    };
  }
  const STAND_HIP = FLOOR - D.limb * 0.5 - 2 - (D.thigh + D.shin) * 0.995;
  function standState(x, hipY, hands, headDrop) {
    const h = hipY ?? STAND_HIP, sc = h - D.torso;
    return { x, hipY: h, hands: hands || [[x - 41, sc + 120], [x + 41, sc + 120]], feet: [[x - 24, FLOOR - 10], [x + 24, FLOOR - 10]], headDrop: headDrop || 0, grip: [0, 0] };
  }
  const mixS = (a, b, u) => ({
    x: lerp(a.x, b.x, u), hipY: lerp(a.hipY, b.hipY, u),
    hands: [P2(a.hands[0], b.hands[0], u), P2(a.hands[1], b.hands[1], u)],
    feet: [P2(a.feet[0], b.feet[0], u), P2(a.feet[1], b.feet[1], u)],
    grip: u > 0.85 ? (b.grip || [0, 0]) : (a.grip || [0, 0]), headDrop: lerp(a.headDrop || 0, b.headDrop || 0, u),
  });
  function mount(t, x, t0, n) {
    const st = standState(x);
    // pulinho no gancho: braços sobem em 1,5 s
    const up = smooth(seg(t, 1.1, 1.45)) * (1 - smooth(seg(t, 1.9, 2.4)));
    if (up > 0) { st.hands = [P2(st.hands[0], [x - 30, STAND_HIP - 250], up), P2(st.hands[1], [x + 30, STAND_HIP - 250], up)]; st.hipY -= 18 * Math.sin(Math.PI * seg(t, 1.38, 1.62)); }
    if (t < t0) return st;
    return mixS(st, climbState(x, n), easeInOut(seg(t, t0, t0 + 0.45)));
  }
  function motivState(t) {
    const x = LANES.motiv.x, n = nMotiv(t);
    if (t < GO('motiv')) return mount(t, x, START.motiv, n);
    if (t < T_SLIDE) {
      const s = climbState(x, n);
      const tired = smooth(seg(t, 5.9, 6.3));
      s.headDrop = 12 * tired; s.x += 5 * Math.sin(t * 24) * tired;
      return s;
    }
    // escorrega até o chão e senta
    const top = climbState(x, MOTIV_PEAK);
    const u = easeIn(seg(t, T_SLIDE, T_SLIDE + 0.75));
    const handsY = lerp(top.hands[0][1], STAND_HIP - 160, u);
    let s = { x, hipY: lerp(top.hipY, STAND_HIP, u), hands: [[x - 40, handsY], [x + 40, handsY + 20]], feet: [[x - 22, lerp(top.feet[0][1], FLOOR - 10, u)], [x + 22, lerp(top.feet[1][1], FLOOR - 10, u)]], grip: [1, 1], headDrop: 12 };
    const sit = easeInOut(seg(t, 7.4, 8.1));
    if (sit > 0) {
      const sitS = { x, hipY: FLOOR - 50, hands: [[x - 46, FLOOR - 40], [x + 46, FLOOR - 40]], feet: [[x - 70, FLOOR - 12], [x + 70, FLOOR - 12]], grip: [0, 0], headDrop: 22 };
      s = mixS(s, sitS, sit);
    }
    return s;
  }
  function egoState(t) {
    const x = LANES.ego.x, n = nEgo(t);
    if (t < GO('ego')) return mount(t, x, START.ego, n);
    const s = climbState(x, n);
    const wave = smooth(seg(t, 8.4, 8.6)) * (1 - smooth(seg(t, 9.2, 9.4)));
    if (wave > 0) {
      const tgt = [x + 82 + 14 * Math.sin(t * 14), s.hipY - 150 + 10 * Math.cos(t * 14)];
      s.hands = [s.hands[0], P2(s.hands[1], tgt, wave)]; s.grip = [1, wave > 0.3 ? 0 : 1];
    }
    const fr = smooth(seg(t, T_EGOFREEZE, T_EGOFREEZE + 0.6));
    if (fr > 0) {
      const ry = rungY(Math.floor(n) + 3.4);
      s.hands = [P2(s.hands[0], [x - 40, ry], fr), P2(s.hands[1], [x + 40, ry + 6], fr)];
      s.headDrop = 14 * fr; s.hipY += 6 * fr;
      s.x += 2 * Math.sin(t * 9) * fr * (1 - smooth(seg(t, 11.0, 11.8)));
    }
    return s;
  }
  const PLAT_Y = rungY(META_N) - 34;
  function discState(t) {
    const x = LANES.disc.x, n = nDisc(t);
    if (t < GO('disc')) return mount(t, x, START.disc, n);
    if (t < T_META) return climbState(x, n);
    const top = climbState(x, META_N);
    const sc = PLAT_Y - 10 - D.limb * 0.5 - (D.thigh + D.shin) * 0.995 - D.torso;
    const px = x + 40;
    const onPlat = { x: px, hipY: sc + D.torso, hands: [[px - 41, sc + 120], [px + 41, sc + 120]], feet: [[px - 24, PLAT_Y - 10], [px + 24, PLAT_Y - 10]], headDrop: 0, grip: [0, 0] };
    const up = easeInOut(seg(t, T_META, T_META + 0.7));
    let s = mixS(top, onPlat, up);
    const hh = easeInOut(seg(t, T_META + 1.0, T_META + 1.4));
    if (hh > 0) s.hands = [P2(onPlat.hands[0], [px - 31, sc + 82], hh), P2(onPlat.hands[1], [px + 31, sc + 82], hh)];
    s.headDrop = -3 * hh;
    return s;
  }
  // sino no topo da corda da obsessão
  const SUMMIT_Y = rungY(BELL_N + 5) - 30;
  function obsState(t) {
    const x = LANES.obs.x, n = nObs(t);
    if (t < GO('obs')) return mount(t, x, START.obs, n);
    const s = climbState(x, n);
    const tired = smooth(seg(t, 15.8, 16.3)) * (1 - smooth(seg(t, PAY - 0.4, PAY)));
    s.x += 4 * Math.sin(t * 26) * tired; s.headDrop = 8 * tired;
    if (t >= PAY - 0.2) {
      const fist = easeOut(seg(t, PAY - 0.2, PAY + 0.35));
      s.hands = [s.hands[0], P2(s.hands[1], [x + 64, s.hipY - 312], fist)];
      s.grip = [1, 1]; s.headDrop = -10 * fist;
    }
    return s;
  }
  const stateOf = { disc: discState, obs: obsState, motiv: motivState, ego: egoState };

  // ---------- cenário ----------
  const ROCK = (() => { const r = mulberry32(77), out = []; for (let i = 0; i < 220; i++) out.push({ x: r() * W, y: -3200 + r() * 4400, w: 30 + r() * 90, h: 14 + r() * 36, a: (r() - 0.5) * 0.6 }); return out; })();
  function drawRockFace(c, y0, y1) {
    const g = c.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, '#2c2a2b'); g.addColorStop(1, '#3a3736');
    c.fillStyle = g; c.fillRect(-300, Math.max(SUMMIT_Y, y0 - 50), W + 600, Math.min(FLOOR, y1 + 50) - Math.max(SUMMIT_Y, y0 - 50));
    for (const p of ROCK) {
      if (p.y < y0 - 60 || p.y > y1 + 60 || p.y < SUMMIT_Y + 20 || p.y > FLOOR - 10) continue;
      c.save(); c.translate(p.x, p.y); c.rotate(p.a);
      c.beginPath(); c.ellipse(0, 0, p.w / 2, p.h / 2, 0, 0, Math.PI * 2); c.fillStyle = 'rgba(0,0,0,0.18)'; c.fill();
      c.strokeStyle = 'rgba(0,0,0,0.45)'; c.lineWidth = 3; c.beginPath(); c.moveTo(-p.w / 2, 2); c.lineTo(p.w / 2, -2); c.stroke();
      c.restore();
    }
  }
  const HOLD_TOP = { disc: PLAT_Y + 10, obs: SUMMIT_Y + 40, motiv: SUMMIT_Y + 40, ego: SUMMIT_Y + 40 };
  function drawRope(c, k, y0, y1) {
    const x = LANES[k].x;
    const r0 = Math.max(0, Math.ceil((R0Y - Math.min(FLOOR, y1 + 80)) / RUNG)), r1 = Math.floor((R0Y - Math.max(HOLD_TOP[k], y0 - 80)) / RUNG);
    for (let r = r0; r <= r1 + 5; r++) {
      const y = rungY(r); if (y < HOLD_TOP[k]) continue;
      for (const sd of [-1, 1]) {
        const hx = x + sd * 44 + ((r * 7) % 5 - 2) * 2, hy = y + 6;
        c.beginPath(); c.ellipse(hx, hy, 15, 10, sd * 0.3, 0, Math.PI * 2); c.fillStyle = rgb(COL[k], 0.85); c.fill(); c.lineWidth = 3.5; c.strokeStyle = OUT; c.stroke();
        c.fillStyle = 'rgba(255,255,255,0.4)'; c.beginPath(); c.ellipse(hx - 4, hy - 3, 5, 3, 0, 0, Math.PI * 2); c.fill();
      }
    }
  }
  function drawPlatform(c, t) {
    const x = LANES.disc.x + 40, y = PLAT_Y;
    c.fillStyle = '#26262b'; c.strokeStyle = OUT; c.lineWidth = 4;
    c.beginPath(); c.rect(x - 105, y, 210, 22); c.fill(); c.stroke();
    c.fillStyle = rgb(COL.disc); c.fillRect(x - 103, y + 2, 206, 6);
    const fx = x + 90, fy = y - 120, wv = Math.sin(t * 5) * 4;
    c.strokeStyle = OUT; c.lineWidth = 9; c.beginPath(); c.moveTo(fx, y); c.lineTo(fx, fy); c.stroke();
    c.strokeStyle = '#cfcfd4'; c.lineWidth = 4; c.beginPath(); c.moveTo(fx, y - 2); c.lineTo(fx, fy); c.stroke();
    c.beginPath(); c.moveTo(fx, fy); c.quadraticCurveTo(fx - 30, fy + 10 + wv, fx - 62, fy + 4 + wv); c.lineTo(fx - 58, fy + 38 + wv); c.quadraticCurveTo(fx - 30, fy + 42 - wv, fx, fy + 36); c.closePath();
    c.fillStyle = rgb(COL.disc); c.fill(); c.lineWidth = 4; c.strokeStyle = OUT; c.stroke();
    c.fillStyle = '#fff'; c.font = '700 15px "Space Mono", monospace'; c.textAlign = 'center'; c.fillText('META', fx - 30, fy + 27 + wv * 0.5);
  }
  function drawBell(c, t) {
    // borda do cume
    c.beginPath(); c.moveTo(-300, SUMMIT_Y); for (let x = -300; x <= W + 300; x += 60) c.lineTo(x, SUMMIT_Y - 14 * Math.abs(Math.sin(x * 0.05))); c.lineTo(W + 300, SUMMIT_Y + 30); c.lineTo(-300, SUMMIT_Y + 30); c.closePath();
    c.fillStyle = '#4a4644'; c.fill(); c.lineWidth = 5; c.strokeStyle = OUT; c.stroke();
    const d = t - PAY; if (d < 0) return;
    // brilho vermelho do cume conquistado
    c.save(); c.globalCompositeOperation = 'lighter';
    const ob = obsState(t), hx = LANES.obs.x + 64, hy = ob.hipY - 312;
    const g = c.createRadialGradient(hx, hy, 0, hx, hy, 420); g.addColorStop(0, rgb(COL.obs, 1, 0.5 * Math.exp(-d * 0.5))); g.addColorStop(1, rgb(COL.obs, 1, 0));
    c.fillStyle = g; c.fillRect(hx - 420, hy - 420, 840, 840);
    for (let i = 0; i < 4; i++) { const a = d - i * 0.25; if (a < 0 || a > 1.4) continue; c.lineWidth = 6; c.strokeStyle = rgb(COL.obs, 1, 0.7 * (1 - a / 1.4)); c.beginPath(); c.arc(hx, hy - 90, 40 + 300 * easeOut(a / 1.4), 0, Math.PI * 2); c.stroke(); }
    c.restore();
  }
  function drawFlag(c, t) {
    const d = t - PAY; if (d < -0.2) return;
    const ob = obsState(t), R = buildRig(ob), hp = R.armR[2];
    const u = easeOut(seg(t, PAY - 0.1, PAY + 0.4));
    const top = [hp[0], hp[1] - 105 * u];
    c.lineCap = 'round'; c.strokeStyle = OUT; c.lineWidth = 11; c.beginPath(); c.moveTo(hp[0], hp[1] + 30); c.lineTo(top[0], top[1]); c.stroke();
    c.strokeStyle = '#d9d9de'; c.lineWidth = 5; c.beginPath(); c.moveTo(hp[0], hp[1] + 30); c.lineTo(top[0], top[1]); c.stroke();
    if (u < 0.3) return;
    const wv = Math.sin(t * 7) * 7, L = 100 * smooth((u - 0.3) / 0.7);
    c.beginPath(); c.moveTo(top[0], top[1]); c.quadraticCurveTo(top[0] + L * 0.5, top[1] + 10 + wv, top[0] + L, top[1] + 4 - wv);
    c.lineTo(top[0] + L - 4, top[1] + 54 - wv); c.quadraticCurveTo(top[0] + L * 0.5, top[1] + 60 + wv, top[0], top[1] + 50); c.closePath();
    c.fillStyle = rgb(COL.obs); c.fill(); c.lineWidth = 4.5; c.strokeStyle = OUT; c.stroke();
  }
  function heightMarks(c, x, y0, y1) {
    c.font = '700 20px "Space Mono", monospace'; c.textAlign = 'left'; c.fillStyle = 'rgba(255,255,255,0.45)';
    for (let m = 2; m < 40; m += 2) { const y = R0Y - m * 2 * RUNG; if (y < y0 - 40 || y > y1 + 40) continue; c.fillRect(W - 120, y - 1, 20, 3); c.fillText(`${m} M`, W - 94, y + 7); }
  }
  // plateia do ego no chão
  const crowdX = [700, 740, 960, 1000];
  function drawCrowd(c, t) {
    for (let i = 0; i < crowdX.length; i++) {
      const show = smooth(seg(t, 7.8 + i * 0.07, 8.1 + i * 0.07)) * (1 - smooth(seg(t, 9.7 + i * 0.06, 9.95 + i * 0.06)));
      if (show <= 0.01) continue;
      const ph = i * 1.7, cheer = t < 9.7 ? Math.abs(Math.sin((t + ph) * 7)) * 10 : 0;
      c.save(); c.globalAlpha = show; c.translate(crowdX[i], FLOOR - 4 - cheer);
      c.lineWidth = 3; c.strokeStyle = rgb(COL.ego, 1, 0.9); c.fillStyle = '#121214';
      c.beginPath(); c.arc(0, -40, 11, 0, Math.PI * 2); c.fill(); c.stroke();
      c.beginPath(); c.moveTo(-17, 0); c.quadraticCurveTo(-17, -24, 0, -24); c.quadraticCurveTo(17, -24, 17, 0); c.fill(); c.stroke();
      if (t < 9.7 && Math.sin((t + ph) * 3) > 0.2) { c.beginPath(); c.arc(0, -66, 7, 0.15 * Math.PI, 0.85 * Math.PI); c.stroke(); }
      c.restore();
    }
  }
  // brilho/estrelinhas saindo da motivação no começo (energia que acaba)
  const SPARK = []; for (let i = 0; i < 24; i++) SPARK.push({ t0: 3.0 + rr(0, 2.6), dx: rr(-60, 60), dy: rr(-160, 40), v: rr(60, 140), r: rr(3, 6) });

  // ---------- luz ----------
  const level = {
    disc: track([[0, 1.0], [3.0, 1.0], [3.3, 0.7], [12.8, 0.7], [13.0, 1.1], [14.6, 1.1], [15.3, 0.55]]),
    obs: track([[0, 1.0], [3.0, 1.0], [3.3, 0.7], [15.3, 0.7], [15.5, 1.2], [18.9, 1.2], [19.05, 1.6], [20.4, 1.3]]),
    motiv: track([[0, 1.0], [3.0, 1.0], [3.2, 1.3], [5.6, 1.3], [6.6, 0.5], [7.4, 0.08]]),
    ego: track([[0, 1.0], [3.0, 1.0], [7.8, 1.0], [8.0, 1.2], [9.8, 1.2], [10.4, 0.5], [11.0, 0.08]]),
  };

  // ---------- câmera ----------
  function scrollAt(t) { const x = nObs(t) * RUNG - 180; return 0.5 * (x + Math.sqrt(x * x + 90 * 90)); }
  function camAt(t) {
    const hookU = easeOut(seg(t, 1.5, 2.4));
    let s = lerp(1.08, 1.0, hookU);
    const sc = Math.max(0, scrollAt(t) - scrollAt(0));
    let fy = 900 - sc - 150 * smooth(seg(t, 16.5, 18.6));
    let ox = 540 - 540 * s, oy = 900 - fy * s;
    const k1 = t >= 1.5 ? Math.exp(-(t - 1.5) * 9) : 0, k2 = t >= PAY ? Math.exp(-(t - PAY) * 5) : 0;
    ox += 15 * k1 * Math.sin((t - 1.5) * 70) + 20 * k2 * Math.sin((t - PAY) * 60);
    oy += 10 * k1 * Math.cos((t - 1.5) * 83) + 14 * k2 * Math.cos((t - PAY) * 73);
    return { s, ox, oy, sc };
  }
  const toScreen = (p, C) => [p[0] * C.s + C.ox, p[1] * C.s + C.oy];
  const toWorldY = (y, C) => (y - C.oy) / C.s;
  const meters = (n) => Math.floor(n * 0.5 + 1e-6);

  // ---------- texto: palavras pulando ----------
  const CAPS = [
    { s: -1, e: 2.85, lines: [[-1, [['QUATRO NO PAREDÃO.']]], [0.3, [['SÓ '], ['UM', 'obs'], [' FINCA A BANDEIRA.']]]] },
    { s: 3.0, e: 5.5, lines: [[3.0, [['A '], ['MOTIVAÇÃO', 'motiv']]], [3.35, [['SOBE CORRENDO.']]]] },
    { s: 5.6, e: 8.0, lines: [[5.6, [['MAS O BRAÇO']]], [5.95, [['ACABA RÁPIDO.']]]] },
    { s: 8.1, e: 10.5, lines: [[8.1, [['O '], ['EGO', 'ego'], [' SOBE']]], [8.45, [['PRA SER VISTO.']]]] },
    { s: 10.6, e: 12.9, lines: [[10.6, [['SEM PLATEIA,']]], [11.0, [['ELE CONGELA.']]]] },
    { s: 13.0, e: 15.4, lines: [[13.0, [['A '], ['DISCIPLINA', 'disc']]], [13.35, [['BATE A META E PARA.']]]] },
    { s: 15.5, e: 18.9, lines: [[15.5, [['SEM FORÇA NO DEDO,']]], [15.9, [['A '], ['OBSESSÃO', 'obs'], [' SOBE.']]]] },
    { s: 19.1, e: 21.7, big: true, lines: [[19.2, [['O TOPO É DE QUEM']]], [19.6, [['NÃO '], ['SOLTA.', 'obs']]]] },
    { s: 21.8, e: 99, big: true, lines: [[21.8, [['MOTIVAÇÃO', 'motiv'], [' CAI.']]], [22.15, [['OBSESSÃO', 'obs'], [' CHEGA.']]]] },
  ];
  const capEl = document.getElementById('cap');
  const capLines = capEl ? [capEl.querySelector('.l1'), capEl.querySelector('.l2')] : [];
  const WSTEP = 0.11;
  const wordsOf = (segs) => { const out = []; for (const [txt, col] of segs) for (const w of txt.split(' ')) if (w) out.push([w, col || '']); return out; };
  function renderCaptions(t) {
    if (!capEl) return;
    const cap = CAPS.find((c) => t >= c.s && t < c.e) || null;
    if (!cap) { capEl.style.opacity = '0'; return; }
    capEl.style.opacity = String(1 - smooth(seg(t, cap.e - 0.15, cap.e)));
    capEl.className = cap.big ? 'cap big' : 'cap';
    cap.lines.forEach(([ls, segs], i) => {
      capLines[i].innerHTML = wordsOf(segs).map(([w, col], j) => {
        const age = t - (ls + j * WSTEP);
        if (age < 0) return '';
        const sc = 1 + 0.55 * Math.exp(-age * 16) * Math.cos(age * 30), op = clamp(age / 0.06), y = 22 * Math.exp(-age * 18);
        return `<span class="w ${col ? 'c-' + col : ''}" style="opacity:${op.toFixed(3)};transform:translateY(${y.toFixed(1)}px) scale(${sc.toFixed(3)})">${w}</span>`;
      }).join(' ');
    });
    for (let i = cap.lines.length; i < capLines.length; i++) capLines[i].innerHTML = '';
  }
  const hud = {}; for (const k of ['disc', 'obs', 'motiv', 'ego']) hud[k] = document.getElementById('n-' + k);
  const labs = {}; for (const k of ['disc', 'obs', 'motiv', 'ego']) labs[k] = document.getElementById('lab-' + k);

  // ---------- desenho ----------
  function drawObjects(c, t, lv, C) {
    const y0 = toWorldY(0, C), y1 = toWorldY(H, C);
    drawRockFace(c, y0, y1);
    heightMarks(c, 0, y0, y1);
    for (const k of ['disc', 'obs', 'motiv', 'ego']) {
      const L = LANES[k], a = 0.2 * Math.min(1.4, lv[k]);
      const st = stateOf[k](t), cy = st.hipY - 60;
      c.save(); c.globalCompositeOperation = 'lighter';
      const g = c.createRadialGradient(L.x, cy, 0, L.x, cy, 250); g.addColorStop(0, rgb(COL[k], 1, a)); g.addColorStop(1, rgb(COL[k], 1, 0));
      c.fillStyle = g; c.fillRect(L.x - 250, cy - 250, 500, 500); c.restore();
    }
    for (const k of ['disc', 'obs', 'motiv', 'ego']) drawRope(c, k, y0, y1);
    drawBell(c, t);
    drawPlatform(c, t);
    // chão
    c.fillStyle = '#18181b'; c.fillRect(-400, FLOOR, W + 800, 900);
    c.fillStyle = 'rgba(255,255,255,0.2)'; c.fillRect(-400, FLOOR - 2, W + 800, 4);
    drawCrowd(c, t);
    for (const k of ['disc', 'motiv', 'ego', 'obs']) {
      const light = clamp(0.3 + 0.7 * Math.min(1, lv[k] / 0.85));
      drawFigure(c, buildRig(stateOf[k](t)), light, COL[k]);
    }
    drawFlag(c, t);
    // faíscas amarelas da motivação no começo
    c.save(); c.globalCompositeOperation = 'lighter';
    const ms = motivState(t);
    for (const p of SPARK) {
      const d = t - p.t0; if (d < 0 || d > 0.8) continue;
      const x = LANES.motiv.x + p.dx, y = ms.hipY + p.dy + p.v * d;
      c.fillStyle = rgb(COL.motiv, 1, 0.9 * (1 - d / 0.8)); c.beginPath(); c.arc(x, y, p.r, 0, Math.PI * 2); c.fill();
    }
    c.restore();
  }

  function renderAt(t) {
    const C = camAt(t);
    const lv = { disc: level.disc(t), obs: level.obs(t), motiv: level.motiv(t), ego: level.ego(t) };
    lc.setTransform(1, 0, 0, 1, 0, 0); lc.clearRect(0, 0, W, H); lc.setTransform(C.s, 0, 0, C.s, C.ox, C.oy);
    drawObjects(lc, t, lv, C);
    const c = ctx;
    c.setTransform(1, 0, 0, 1, 0, 0);
    const hgt = clamp(C.sc / 1500);
    const bg = c.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, rgb(mixC([7, 7, 9], [4, 4, 8], hgt))); bg.addColorStop(0.5, rgb(mixC([34, 33, 38], [16, 16, 24], hgt))); bg.addColorStop(1, '#08080a');
    c.fillStyle = bg; c.fillRect(0, 0, W, H);
    c.save(); c.filter = 'blur(26px)'; c.fillStyle = 'rgba(255,250,240,0.04)';
    c.beginPath(); c.moveTo(-200, -100); c.lineTo(0, -100); c.lineTo(760, 1300); c.lineTo(160, 1300); c.closePath(); c.fill();
    c.beginPath(); c.moveTo(1100, -100); c.lineTo(1300, -100); c.lineTo(940, 1300); c.lineTo(340, 1300); c.closePath(); c.fill(); c.restore();
    c.drawImage(layer, 0, 0);
    const top = c.createLinearGradient(0, 120, 0, 520); top.addColorStop(0, 'rgba(0,0,0,0.6)'); top.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = top; c.fillRect(0, 0, W, 520);
    const bot = c.createLinearGradient(0, 1060, 0, 1300); bot.addColorStop(0, 'rgba(0,0,0,0)'); bot.addColorStop(0.45, 'rgba(0,0,0,0.85)'); bot.addColorStop(1, 'rgba(0,0,0,0.93)');
    c.fillStyle = bot; c.fillRect(0, 1060, W, H - 1060);
    const ui = c.createLinearGradient(0, 1300, 0, 1420); ui.addColorStop(0, 'rgba(4,4,5,0)'); ui.addColorStop(1, 'rgba(4,4,5,0.95)');
    c.fillStyle = ui; c.fillRect(0, 1300, W, H - 1300);

    renderCaptions(t);
    const nOf = { disc: nDisc(t), obs: nObs(t), motiv: nMotiv(t), ego: nEgo(t) };
    for (const k in hud) if (hud[k]) hud[k].textContent = k === 'disc' && t >= T_META ? `${meters(nOf[k])} M ✓` : `${meters(nOf[k])} M`;
    if (labs.motiv) labs.motiv.style.opacity = String(1 - 0.6 * smooth(seg(t, 6.8, 7.4)));
    if (labs.ego) labs.ego.style.opacity = String(1 - 0.6 * smooth(seg(t, 10.4, 11.0)));
    if (labs.disc) labs.disc.style.opacity = String(1 - 0.4 * smooth(seg(t, 15.4, 16.0)));
  }

  function grabs(nf, t0, t1) {
    const out = []; let prev = nf(t0);
    for (let t = t0; t < t1; t += 1 / 120) {
      const n = nf(t);
      for (const ph of [0.25, 0.75]) {
        const a = prev - Math.floor(prev), b = n - Math.floor(n);
        if (Math.floor(n) === Math.floor(prev) && a < ph && b >= ph) out.push(+t.toFixed(3));
        if (Math.floor(n) > Math.floor(prev) && (a < ph || b >= ph)) out.push(+t.toFixed(3));
      }
      prev = n;
    }
    return out;
  }
  const words = [];
  for (const cap of CAPS) for (const [ls, segs] of cap.lines) wordsOf(segs).forEach((w, j) => { const tt = ls + j * WSTEP; if (tt >= 0 && tt < cap.e) words.push(+tt.toFixed(3)); });
  window.__schedule = {
    slam: 1.5, grabs: { motiv: grabs(nMotivRaw, 3, T_MQ + 0.6), ego: grabs(nEgo, 3, T_EGOFREEZE), disc: grabs(nDisc, 3, T_META), obs: grabs(nObs, 3, PAY) },
    motivSlide: T_SLIDE, motivLand: T_SLIDE + 0.75, crowd: [7.8, 9.7], egoFreeze: T_EGOFREEZE, meta: T_META, payoff: PAY, words,
  };
  window.__renderAt = renderAt;
  window.addEventListener('hf-seek', (e) => renderAt(e.detail.time));
  renderAt(0);
})();
