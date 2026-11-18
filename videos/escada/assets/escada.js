// A escada: Disciplina x Obsessão x Ego — palco 2D vetorial (estilo da referência), função pura do tempo.
// Regra do canal: a OBSESSÃO sempre vence.
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
  const rnd = mulberry32(3011);
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
  const LANES = {
    disc: { x: 200, tint: [255, 241, 220] },
    obs: { x: 540, tint: [255, 226, 216] },
    ego: { x: 860, tint: [238, 226, 255] },
  };
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
  function drawFigure(c, R, light) {
    const f = rgb(mixC(DARK, WHITE, light));
    strokePts(c, R.legL, D.limb + 2 * D.ol, OUT); strokePts(c, R.legR, D.limb + 2 * D.ol, OUT);
    strokePts(c, [R.hip, R.sc], D.torsoW + 2 * D.ol, OUT);
    strokePts(c, R.legL, D.limb, f); strokePts(c, R.legR, D.limb, f);
    strokePts(c, [R.hip, R.sc], D.torsoW, f);
    c.save(); c.globalAlpha = 0.1; strokePts(c, [[R.hip[0] + 15, R.hip[1] - 2], [R.sc[0] + 15, R.sc[1] + 8]], 7, '#000'); c.restore();
    limb(c, R.armL, D.limb, f); limb(c, R.armR, D.limb, f);
    disc(c, R.head, D.headR + D.ol, OUT); disc(c, R.head, D.headR, f);
    for (const [arm, g] of [[R.armL, R.grip[0]], [R.armR, R.grip[1]]]) if (g > 0.5) { disc(c, arm[2], D.handR + D.ol, OUT); disc(c, arm[2], D.handR, f); }
  }
  function floorShadow(c, x, w, a) {
    c.save(); c.translate(x, FLOOR + 2); c.scale(1, 0.16);
    const g = c.createRadialGradient(0, 0, 0, 0, 0, w);
    g.addColorStop(0, `rgba(0,0,0,${a})`); g.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g; c.beginPath(); c.arc(0, 0, w, 0, Math.PI * 2); c.fill(); c.restore();
  }

  // ---------- subida: degraus escalados n(t) integrados de uma velocidade ----------
  const DT = 1 / 240;
  function integrate(speed) {
    const arr = [0]; let n = 0;
    for (let t = DT; t <= 26.5; t += DT) { n += speed(t) * DT; arr.push(n); }
    return (t) => { const x = clamp(t / DT, 0, arr.length - 1), i = Math.floor(x); return lerp(arr[i], arr[Math.min(arr.length - 1, i + 1)], x - i); };
  }
  const START = { ego: 2.55, obs: 2.75, disc: 2.95 };
  const META_N = 18;
  const nEgo = integrate((t) => (t < START.ego + 0.45 ? 0 : t < 5.9 ? 2.3 : t < 6.95 ? 2.3 * (1 - smooth(seg(t, 5.9, 6.1))) : t < 11.3 ? 1.05 : 1.05 * (1 - smooth(seg(t, 11.3, 11.9)))));
  const nDiscRaw = integrate((t) => (t < START.disc + 0.45 ? 0 : 1.36));
  const nDisc = (t) => Math.min(META_N, nDiscRaw(t));
  const T_META = (() => { for (let t = 3; t < 26; t += 0.005) if (nDiscRaw(t) >= META_N) return t; return 20; })();
  const nObs = integrate((t) => (t < START.obs + 0.45 ? 0 : t < 19 ? 1.62 : t < 22 ? lerp(1.62, 4.2, smooth(seg(t, 19, 20.3))) : 1.9));

  // marcha: cada membro sobe 1 degrau por degrau escalado, em sequência (MÃO E., PÉ D., MÃO D., PÉ E.)
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
      x: x + 3 * Math.sin(n * Math.PI), hipY,
      hands: [[x - 44, rungY(LH) + lift(LH)], [x + 44, rungY(RH) + lift(RH)]],
      feet: [[x - 22, rungY(LF) - 6 + lift(LF)], [x + 22, rungY(RF) - 6 + lift(RF)]],
      grip: [1, 1],
      headDrop: 0,
    };
  }
  const STAND_HIP = FLOOR - D.limb * 0.5 - 2 - (D.thigh + D.shin) * 0.995;
  function standState(x, hipY, hands, headDrop) {
    const h = hipY ?? STAND_HIP, sc = h - D.torso;
    return { x, hipY: h, hands: hands || [[x - 41, sc + 120], [x + 41, sc + 120]], feet: [[x - 24, FLOOR - 10], [x + 24, FLOOR - 10]], headDrop: headDrop || 0 };
  }
  const mixS = (a, b, u) => ({
    x: lerp(a.x, b.x, u), hipY: lerp(a.hipY, b.hipY, u),
    hands: [P2(a.hands[0], b.hands[0], u), P2(a.hands[1], b.hands[1], u)],
    feet: [P2(a.feet[0], b.feet[0], u), P2(a.feet[1], b.feet[1], u)],
    grip: u > 0.85 ? (b.grip || [0, 0]) : (a.grip || [0, 0]), headDrop: lerp(a.headDrop || 0, b.headDrop || 0, u),
  });
  // da base para a escada
  function mount(t, x, t0, n) {
    const st = standState(x);
    if (t < t0) return st;
    return mixS(st, climbState(x, n), easeInOut(seg(t, t0, t0 + 0.45)));
  }

  function egoState(t) {
    const x = LANES.ego.x, n = nEgo(t);
    if (t < START.ego + 0.45) return mount(t, x, START.ego, n);
    const s = climbState(x, n);
    // acena para a plateia no meio da subida
    const wave = smooth(seg(t, 6.0, 6.2)) * (1 - smooth(seg(t, 6.75, 6.95)));
    if (wave > 0) {
      const tgt = [x + 92 + 14 * Math.sin(t * 14), s.hipY - 150 + 10 * Math.cos(t * 14)];
      s.hands = [s.hands[0], P2(s.hands[1], tgt, wave)]; s.grip = [1, wave > 0.3 ? 0 : 1]; s.x += 6 * wave;
    }
    // trava: abraça a escada, cabeça baixa
    const fr = smooth(seg(t, 12.2, 12.9));
    if (fr > 0) {
      const r = Math.floor(n) + 3.4;
      s.hands = [P2(s.hands[0], [x - 26, rungY(Math.round(r))], fr), P2(s.hands[1], [x + 26, rungY(Math.round(r))], fr)];
      s.headDrop = 14 * fr; s.hipY += 6 * fr;
      s.x += 2 * Math.sin(t * 9) * fr * (1 - smooth(seg(t, 13.6, 14.4)));
    }
    return s;
  }
  // plataforma da META no topo da escada da disciplina
  const PLAT_Y = rungY(META_N) - 34;
  function discState(t) {
    const x = LANES.disc.x, n = nDisc(t);
    if (t < START.disc + 0.45) return mount(t, x, START.disc, n);
    if (t < T_META) return climbState(x, n);
    const top = climbState(x, META_N);
    const sc = PLAT_Y - 10 - D.limb * 0.5 - (D.thigh + D.shin) * 0.995 - D.torso;
    const onPlat = { x, hipY: sc + D.torso, hands: [[x - 41, sc + 120], [x + 41, sc + 120]], feet: [[x - 24, PLAT_Y - 10], [x + 24, PLAT_Y - 10]], headDrop: 0 };
    const up = easeInOut(seg(t, T_META, T_META + 0.7));
    let s = mixS(top, onPlat, up);
    const hh = easeInOut(seg(t, T_META + 1.0, T_META + 1.4));
    if (hh > 0) s.hands = [P2(onPlat.hands[0], [x - 31, sc + 82], hh), P2(onPlat.hands[1], [x + 31, sc + 82], hh)];
    s.headDrop = -3 * hh;
    return s;
  }
  function obsState(t) {
    const x = LANES.obs.x, n = nObs(t);
    if (t < START.obs + 0.45) return mount(t, x, START.obs, n);
    return climbState(x, n);
  }

  // ---------- cenário ----------
  function beamPoly(c, ax, ay, xl, xr, yb, a, tint, blur) {
    c.save(); c.filter = `blur(${blur}px)`;
    const g = c.createLinearGradient(0, ay, 0, yb);
    g.addColorStop(0, rgb(tint, 1, a)); g.addColorStop(1, rgb(tint, 1, a * 0.4));
    c.fillStyle = g; c.beginPath(); c.moveTo(ax - 14, ay); c.lineTo(ax + 14, ay); c.lineTo(xr, yb); c.lineTo(xl, yb); c.closePath(); c.fill();
    c.restore();
  }
  function pool(c, x, w, a, tint) {
    c.save(); c.translate(x, FLOOR + 4); c.scale(1, 0.13);
    const g = c.createRadialGradient(0, 0, 0, 0, 0, w);
    g.addColorStop(0, rgb(tint, 1, a)); g.addColorStop(1, rgb(tint, 1, 0));
    c.fillStyle = g; c.beginPath(); c.arc(0, 0, w, 0, Math.PI * 2); c.fill(); c.restore();
  }
  function lamp(c, x, lv) {
    c.strokeStyle = '#0a0a0b'; c.lineWidth = 3; c.beginPath(); c.moveTo(x, -4000); c.lineTo(x, LAMP_Y - 30); c.stroke();
    c.beginPath(); c.moveTo(x - 13, LAMP_Y - 32); c.lineTo(x + 13, LAMP_Y - 32); c.lineTo(x + 30, LAMP_Y); c.lineTo(x - 30, LAMP_Y); c.closePath();
    c.fillStyle = '#141416'; c.fill(); c.lineWidth = 3; c.strokeStyle = OUT; c.stroke();
    const g = c.createRadialGradient(x, LAMP_Y + 4, 0, x, LAMP_Y + 4, 140);
    g.addColorStop(0, `rgba(255,255,255,${0.42 * lv})`); g.addColorStop(0.35, `rgba(255,250,240,${0.12 * lv})`); g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g; c.beginPath(); c.arc(x, LAMP_Y + 4, 140, 0, Math.PI * 2); c.fill();
    c.save(); c.translate(x, LAMP_Y + 1); c.scale(1, 0.3);
    c.fillStyle = `rgba(255,255,255,${0.12 + 0.88 * Math.min(1, lv)})`; c.beginPath(); c.arc(0, 0, 25, 0, Math.PI * 2); c.fill(); c.restore();
  }
  function drawLadder(c, x, yTop, yView0, yView1) {
    const a = Math.max(yTop, yView0 - 80), b = Math.min(FLOOR, yView1 + 80);
    if (a >= b) return;
    // degraus
    const r0 = Math.max(0, Math.ceil((R0Y - b) / RUNG)), r1 = Math.floor((R0Y - a) / RUNG);
    for (let r = r0; r <= r1; r++) {
      const y = rungY(r); if (y < yTop) continue;
      c.lineCap = 'butt';
      c.strokeStyle = OUT; c.lineWidth = 15; c.beginPath(); c.moveTo(x - 48, y); c.lineTo(x + 48, y); c.stroke();
      c.strokeStyle = '#8a8a92'; c.lineWidth = 7; c.beginPath(); c.moveTo(x - 46, y); c.lineTo(x + 46, y); c.stroke();
    }
    // trilhos
    for (const s of [-1, 1]) {
      c.fillStyle = '#3c3c43'; c.strokeStyle = OUT; c.lineWidth = 4;
      c.beginPath(); c.rect(x + s * 52 - 8, a, 16, b - a); c.fill(); c.stroke();
      c.fillStyle = 'rgba(255,255,255,0.08)'; c.fillRect(x + s * 52 - 5, a, 4, b - a);
    }
  }
  function drawPlatform(c, x, t) {
    const y = PLAT_Y;
    c.fillStyle = '#26262b'; c.strokeStyle = OUT; c.lineWidth = 4;
    c.beginPath(); c.rect(x - 95, y, 190, 22); c.fill(); c.stroke();
    c.fillStyle = '#ffc25a'; c.fillRect(x - 93, y + 2, 186, 5);
    // bandeira da meta
    const fx = x + 78, fy = y - 120, wv = Math.sin(t * 5) * 4;
    c.strokeStyle = OUT; c.lineWidth = 9; c.beginPath(); c.moveTo(fx, y); c.lineTo(fx, fy); c.stroke();
    c.strokeStyle = '#cfcfd4'; c.lineWidth = 4; c.beginPath(); c.moveTo(fx, y - 2); c.lineTo(fx, fy); c.stroke();
    c.beginPath(); c.moveTo(fx, fy); c.quadraticCurveTo(fx - 30, fy + 10 + wv, fx - 62, fy + 4 + wv); c.lineTo(fx - 58, fy + 38 + wv); c.quadraticCurveTo(fx - 30, fy + 42 - wv, fx, fy + 36); c.closePath();
    c.fillStyle = '#ffc25a'; c.fill(); c.lineWidth = 4; c.strokeStyle = OUT; c.stroke();
    c.fillStyle = '#3a2406'; c.font = '700 15px "Space Mono", monospace'; c.textAlign = 'center'; c.fillText('META', fx - 30, fy + 27 + wv * 0.5);
  }
  function heightMarks(c, x, yView0, yView1) {
    c.font = '700 22px "Space Mono", monospace'; c.textAlign = 'right'; c.fillStyle = 'rgba(255,255,255,0.32)';
    for (let m = 2; m < 80; m += 2) {
      const y = R0Y - m * 2 * RUNG; if (y < yView0 - 40 || y > yView1 + 40) continue;
      c.fillRect(x - 96, y - 1, 26, 3); c.fillText(`${m} m`, x - 104, y + 8);
    }
  }

  // ---------- luz das raias ----------
  const SLAM = 1.5;
  const level = {
    disc: track([[0, 1.05], [1.5, 1.05], [1.75, 0.85], [3.0, 0.85], [3.3, 0.6], [5.8, 0.6], [6.1, 1.0], [8.8, 1.0], [9.1, 0.6], [15.3, 0.6], [15.6, 1.0], [17.8, 1.0], [18.8, 0.42]]),
    obs: track([[0, 0.05], [1.48, 0.05], [1.53, 1.45], [2.2, 0.85], [3.0, 0.85], [3.3, 0.6], [8.8, 0.6], [9.1, 1.0], [11.8, 1.0], [12.1, 0.75], [18.8, 0.75], [19.3, 1.15], [22.0, 1.15], [22.6, 1.4]]),
    ego: track([[0, 0.05], [1.62, 0.05], [1.78, 0.85], [3.0, 0.85], [3.3, 1.1], [5.8, 1.1], [6.1, 0.6], [11.9, 0.6], [12.1, 1.0], [12.3, 1.0], [12.85, 0.08]]),
  };
  const slamTint = (t, tint) => (t >= SLAM ? mixC(tint, [255, 110, 90], 0.85 * Math.exp(-(t - SLAM) * 2.5)) : tint);

  // poeira que fica no mundo (dá sensação de subida)
  const dust = [];
  for (let i = 0; i < 90; i++) dust.push({ x: rr(0, W), y: rr(-2600, 900), r: rr(1.2, 3), a: rr(0.08, 0.25) });
  const sparks = [];
  for (let i = 0; i < 44; i++) sparks.push({ dx: rr(-170, 170), dy: rr(-160, 360), v: rr(30, 80), t0: 21.9 + rr(0, 1.8), r: rr(2, 4.5), ph: rr(0, 6.28) });

  // ---------- câmera: gancho fechado na disciplina, depois acompanha a obsessão subindo ----------
  const PIV = [540, 820], F0 = [200, 880], SF0 = [430, 965];
  function scrollAt(t) { const x = nObs(t) * RUNG - 150; return 0.5 * (x + Math.sqrt(x * x + 90 * 90)); }
  function camAt(t) {
    const base = 1 + 0.012 * seg(t, 0, 19) + 0.1 * easeInOut(seg(t, 19.0, 24.6));
    const u = easeOut(seg(t, SLAM, SLAM + 0.38));
    const s = lerp(1.42 + 0.06 * seg(t, 0, SLAM), base, u);
    const sc = Math.max(0, scrollAt(t) - scrollAt(0));
    const f = P2(F0, [PIV[0], PIV[1] - sc], u), sf = P2(SF0, PIV, u);
    const k = t >= SLAM ? Math.exp(-(t - SLAM) * 9) : 0;
    return { s, ox: sf[0] - f[0] * s + 16 * k * Math.sin((t - SLAM) * 70), oy: sf[1] - f[1] * s + 11 * k * Math.cos((t - SLAM) * 83), sc };
  }
  const toScreen = (p, C) => [p[0] * C.s + C.ox, p[1] * C.s + C.oy];
  const toWorldY = (y, C) => (y - C.oy) / C.s;

  const labels = {};
  for (const k of ['disc', 'obs', 'ego']) labels[k] = { el: document.getElementById('lab-' + k), n: document.getElementById('n-' + k) };
  const meters = (n) => Math.floor(n * 0.5);
  const HUD_Y = 1236;
  function obsMeters(t) {
    return meters(nObs(t));
  }

  // ---------- desenho ----------
  function drawObjects(c, t, lv, C) {
    const figLight = (k) => clamp(0.3 + 0.7 * Math.min(1, lv[k] / 0.85));
    const y0 = toWorldY(0, C), y1 = toWorldY(H, C);
    drawLadder(c, LANES.disc.x, PLAT_Y + 4, y0, y1);
    drawLadder(c, LANES.obs.x, -9000, y0, y1);
    drawLadder(c, LANES.ego.x, -9000, y0, y1);
    heightMarks(c, LANES.obs.x, y0, y1);
    drawPlatform(c, LANES.disc.x, t);
    const st = { disc: discState(t), obs: obsState(t), ego: egoState(t) };
    const R = {}; for (const k in st) R[k] = buildRig(st[k]);
    for (const k in R) {
      const feetY = Math.max(R[k].legL[3][1], R[k].legR[3][1]);
      const air = clamp((FLOOR - 4 - feetY) / 140);
      if (air < 1) floorShadow(c, R[k].hip[0], 70 - 20 * air, 0.5 * (1 - air));
    }
    const aura = smooth(seg(t, 19.2, 22.4));
    if (aura > 0) {
      c.save(); c.globalCompositeOperation = 'lighter';
      const p = R.obs.sc, g = c.createRadialGradient(p[0], p[1] + 40, 0, p[0], p[1] + 40, 270);
      g.addColorStop(0, `rgba(255,90,60,${0.32 * aura})`); g.addColorStop(1, 'rgba(255,60,40,0)');
      c.fillStyle = g; c.beginPath(); c.arc(p[0], p[1] + 40, 270, 0, Math.PI * 2); c.fill(); c.restore();
    }
    for (const k of ['disc', 'ego', 'obs']) drawFigure(c, R[k], figLight(k));
    c.save(); c.globalCompositeOperation = 'lighter';
    for (const m of sparks) {
      const d = t - m.t0; if (d < 0) continue;
      const a = 0.85 * smooth(d / 0.5) * (1 - smooth((d - 2.4) / 1.0)); if (a <= 0) continue;
      const x = R.obs.sc[0] + m.dx + 8 * Math.sin(m.ph + d * 1.4), y = R.obs.sc[1] + m.dy - d * m.v;
      const g = c.createRadialGradient(x, y, 0, x, y, m.r * 4);
      g.addColorStop(0, `rgba(255,170,120,${a})`); g.addColorStop(1, 'rgba(255,90,60,0)');
      c.fillStyle = g; c.beginPath(); c.arc(x, y, m.r * 4, 0, Math.PI * 2); c.fill();
    }
    c.restore();
    return R;
  }

  function renderAt(t) {
    const C = camAt(t);
    const lv = { disc: level.disc(t), obs: level.obs(t), ego: level.ego(t) };
    const floorS = toScreen([0, FLOOR], C)[1];
    const cam = (c) => c.setTransform(C.s, 0, 0, C.s, C.ox, C.oy);

    lc.setTransform(1, 0, 0, 1, 0, 0); lc.clearRect(0, 0, W, H); cam(lc);
    drawObjects(lc, t, lv, C);

    const c = ctx;
    c.setTransform(1, 0, 0, 1, 0, 0);
    // fundo fica mais escuro e frio conforme sobe
    const hgt = clamp(C.sc / 1600);
    const bg = c.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, rgb(mixC([7, 7, 8], [4, 4, 7], hgt)));
    bg.addColorStop(0.5, rgb(mixC([40, 38, 38], [18, 18, 24], hgt)));
    bg.addColorStop(1, rgb(mixC([40, 38, 38], [10, 10, 14], hgt)));
    c.fillStyle = bg; c.fillRect(0, 0, W, H);
    cam(c);
    beamPoly(c, -260, -120 - C.sc, 260, 900, FLOOR, 0.05 * (1 - hgt), [255, 250, 240], 18);
    beamPoly(c, 1340, -120 - C.sc, 160, 820, FLOOR, 0.05 * (1 - hgt), [255, 250, 240], 18);
    // poeira
    for (const d of dust) { c.fillStyle = `rgba(255,255,255,${d.a})`; c.beginPath(); c.arc(d.x, d.y, d.r, 0, Math.PI * 2); c.fill(); }
    // chão
    if (floorS < H) {
      const fl = c.createLinearGradient(0, FLOOR, 0, FLOOR + 760);
      fl.addColorStop(0, '#262526'); fl.addColorStop(0.18, '#141415'); fl.addColorStop(0.6, '#070708'); fl.addColorStop(1, '#020202');
      c.fillStyle = fl; c.fillRect(-300, FLOOR, W + 600, 2000);
    }
    for (const k of ['disc', 'obs', 'ego']) {
      const L = LANES[k], a = 0.13 * Math.min(1.25, lv[k]);
      if (a > 0.003) beamPoly(c, L.x, LAMP_Y + 2, L.x - 175, L.x + 175, FLOOR, a, k === 'obs' ? slamTint(t, L.tint) : L.tint, 10);
    }
    if (floorS < H) {
      c.save(); c.setTransform(1, 0, 0, 1, 0, 0);
      c.beginPath(); c.rect(0, floorS, W, H - floorS); c.clip();
      c.globalAlpha = 0.2; c.translate(0, 2 * floorS); c.scale(1, -1); c.drawImage(layer, 0, 0);
      c.restore();
      c.save(); c.setTransform(1, 0, 0, 1, 0, 0);
      const fade = c.createLinearGradient(0, floorS, 0, floorS + 420);
      fade.addColorStop(0, 'rgba(8,8,9,0.15)'); fade.addColorStop(1, 'rgba(4,4,5,1)');
      c.fillStyle = fade; c.fillRect(0, floorS, W, H - floorS); c.restore();
      cam(c);
      c.fillStyle = 'rgba(255,255,255,0.07)'; c.fillRect(-300, FLOOR - 1, W + 600, 3);
      c.save(); c.globalCompositeOperation = 'lighter';
      for (const k of ['disc', 'obs', 'ego']) pool(c, LANES[k].x, 230, 0.2 * Math.min(1.25, lv[k]), k === 'obs' ? slamTint(t, LANES[k].tint) : LANES[k].tint);
      c.restore();
    }
    for (const k of ['disc', 'obs', 'ego']) lamp(c, LANES[k].x, Math.min(1, lv[k]));
    // canhão de luz que acompanha a obsessão lá em cima
    c.setTransform(1, 0, 0, 1, 0, 0);
    const follow = smooth(seg(C.sc, 250, 700));
    if (follow > 0) {
      const ox = toScreen([LANES.obs.x, 0], C)[0];
      beamPoly(c, ox, -60, ox - 190, ox + 190, 1500, 0.16 * follow * Math.min(1.2, lv.obs), slamTint(t, LANES.obs.tint), 12);
    }
    c.drawImage(layer, 0, 0);
    const band = c.createLinearGradient(0, HUD_Y - 70, 0, HUD_Y + 130);
    band.addColorStop(0, 'rgba(0,0,0,0)'); band.addColorStop(0.45, 'rgba(0,0,0,0.55)'); band.addColorStop(1, 'rgba(0,0,0,0.55)');
    c.fillStyle = band; c.fillRect(0, HUD_Y - 70, W, 200);

    // rótulos (HUD fixo) + metros escalados
    const reveal = smooth(seg(t, SLAM, SLAM + 0.2));
    const op = { disc: 1 - 0.35 * smooth(seg(t, 18.8, 19.4)), obs: reveal, ego: reveal * (1 - 0.55 * smooth(seg(t, 13.0, 13.6))) * (1 - 0.6 * smooth(seg(t, 18.8, 19.4))) };
    const val = { disc: meters(nDisc(t)), obs: obsMeters(t), ego: meters(nEgo(t)) };
    for (const k in labels) {
      const L = labels[k]; if (!L.el) continue;
      L.el.style.transform = `translate(${LANES[k].x}px, ${HUD_Y}px) translate(-50%, 0)`;
      L.el.style.opacity = op[k].toFixed(3);
      if (L.n) L.n.textContent = k === 'disc' && t >= T_META ? `${val[k]} m ✓` : `${val[k]} m`;
    }
  }

  // agenda para os efeitos: cada vez que uma mão pega um degrau
  function grabs(nf, t0, t1) {
    const out = []; let prev = nf(t0);
    for (let t = t0; t < t1; t += 1 / 120) {
      const n = nf(t);
      for (const ph of [0.25, 0.75]) { // mão esquerda termina em 0.25, direita em 0.75
        const a = prev - Math.floor(prev), b = n - Math.floor(n);
        if (Math.floor(n) === Math.floor(prev) && a < ph && b >= ph) out.push(+t.toFixed(3));
        if (Math.floor(n) > Math.floor(prev) && (a < ph || b >= ph)) out.push(+t.toFixed(3));
      }
      prev = n;
    }
    return out;
  }
  window.__schedule = {
    slam: SLAM, start: Object.values(START).map((x) => +(x + 0.45).toFixed(3)),
    egoGrabs: grabs(nEgo, 3, 12.5), discGrabs: grabs(nDisc, 3, T_META), obsGrabs: grabs(nObs, 3, 26),
    egoWave: 6.0, egoDim: 12.3, egoFreeze: 12.9, discGoal: +T_META.toFixed(3), discTop: +(T_META + 0.7).toFixed(3),
  };
  window.__renderAt = renderAt;
  window.addEventListener('hf-seek', (e) => renderAt(e.detail.time));
  renderAt(0);
})();
