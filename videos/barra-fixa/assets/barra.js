// Barra fixa: Disciplina x Obsessão x Ego — palco 2D vetorial (estilo da referência), função pura do tempo.
// Regra do canal: a OBSESSÃO sempre vence.
(function () {
  const W = 1080, H = 1920, FLOOR = 1150, LAMP_Y = 560, BAR_Y = 700;
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
  const rnd = mulberry32(2611);
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

  // ---------- boneco de frente (mesma linguagem visual da referência) ----------
  const D = { headR: 31, limb: 26, torsoW: 42, ol: 5, torso: 100, uArm: 58, fArm: 56, thigh: 82, shin: 78, foot: 15, shW: 21, hipW: 11, handR: 13 };
  const OUT = '#0e0e10';
  const WHITE = [247, 247, 245], DARK = [92, 92, 98];

  const LANES = {
    disc: { x: 200, tint: [255, 241, 220] },
    obs: { x: 540, tint: [255, 226, 216] },
    ego: { x: 860, tint: [238, 226, 255] },
  };

  const vside = (a, side, len) => [Math.sin(a) * side * len, Math.cos(a) * len];
  const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
  const legsH = (L) => D.thigh * Math.cos(L.t) + D.shin * Math.cos(L.s);
  const standSC = (L) => FLOOR - D.limb * 0.5 - 2 - legsH(L) - D.torso;
  const STAND_L = { t: 0.07, s: 0.0, f: 1.45 };
  const SIT_L = { t: 1.6, s: -1.3, f: 0.9 };
  const hangL = (t, ph) => ({ t: 0.05 + 0.025 * Math.sin(t * 2.1 + ph), s: -0.03, f: 0.35 });
  const mixL = (a, b, u) => ({ t: lerp(a.t, b.t, u), s: lerp(a.s, b.s, u), f: lerp(a.f, b.f, u) });
  const HANG_SC = BAR_Y + 98, TOP_SC = BAR_Y + 4;
  const grips = (x) => [[x - 46, BAR_Y], [x + 46, BAR_Y]];

  function ik(S, T, side) {
    const a = D.uArm, b = D.fArm;
    const dx = T[0] - S[0], dy = T[1] - S[1], d = Math.max(1e-3, Math.hypot(dx, dy));
    const dd = clamp(d, Math.abs(a - b) + 1, a + b - 0.5);
    const ux = dx / d, uy = dy / d;
    const A = Math.acos(clamp((a * a + dd * dd - b * b) / (2 * a * dd), -1, 1));
    const c1 = [ux * Math.cos(A) - uy * Math.sin(A), ux * Math.sin(A) + uy * Math.cos(A)];
    const c2 = [ux * Math.cos(A) + uy * Math.sin(A), -ux * Math.sin(A) + uy * Math.cos(A)];
    const score = (c) => c[0] * side + 0.35 * c[1];
    const e = score(c1) >= score(c2) ? c1 : c2;
    const E = [S[0] + e[0] * a, S[1] + e[1] * a];
    const hx = T[0] - E[0], hy = T[1] - E[1], hl = Math.max(1e-3, Math.hypot(hx, hy));
    return { E, H: [E[0] + (hx / hl) * b, E[1] + (hy / hl) * b] };
  }

  function buildRig(st) {
    const x = st.x;
    const sc = [x + Math.sin(st.lean || 0) * D.torso, st.scY];
    const hip = [x, st.scY + Math.cos(st.lean || 0) * D.torso];
    const L = st.legs;
    const legPts = (side) => {
      const h = [hip[0] + D.hipW * side, hip[1]];
      const k = add(h, vside(L.t, side, D.thigh)), a = add(k, vside(L.s, side, D.shin)), f = add(a, vside(L.f, side, D.foot));
      return [h, k, a, f];
    };
    const shL = [sc[0] - D.shW, sc[1] + 10], shR = [sc[0] + D.shW, sc[1] + 10];
    const aL = ik(shL, st.hands[0], -1), aR = ik(shR, st.hands[1], 1);
    const head = [sc[0] + Math.sin(st.lean || 0) * 38, sc[1] - 38 + (st.headDrop || 0)];
    return { sc, hip, legL: legPts(-1), legR: legPts(1), armL: [shL, aL.E, aL.H], armR: [shR, aR.E, aR.H], head, grip: st.grip || [0, 0] };
  }

  function strokePts(c, pts, w, col) {
    c.lineWidth = w; c.strokeStyle = col; c.lineCap = 'round'; c.lineJoin = 'round';
    c.beginPath(); c.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]);
    c.stroke();
  }
  const limb = (c, pts, w, col) => { strokePts(c, pts, w + 2 * D.ol, OUT); strokePts(c, pts, w, col); };
  const disc = (c, p, r, col) => { c.fillStyle = col; c.beginPath(); c.arc(p[0], p[1], r, 0, Math.PI * 2); c.fill(); };

  function drawBody(c, R, light) {
    const f = rgb(mixC(DARK, WHITE, light));
    strokePts(c, R.legL, D.limb + 2 * D.ol, OUT); strokePts(c, R.legR, D.limb + 2 * D.ol, OUT);
    strokePts(c, [R.hip, R.sc], D.torsoW + 2 * D.ol, OUT);
    strokePts(c, R.legL, D.limb, f); strokePts(c, R.legR, D.limb, f);
    strokePts(c, [R.hip, R.sc], D.torsoW, f);
    // leve sombreado lateral, como os membros de trás cinza da referência
    c.save(); c.globalAlpha = 0.1;
    strokePts(c, [[R.hip[0] + 15, R.hip[1] - 2], [R.sc[0] + 15, R.sc[1] + 8]], 7, '#000'); c.restore();
    limb(c, R.armL, D.limb, f); limb(c, R.armR, D.limb, f);
  }
  function drawHeadHands(c, R, light) {
    const f = rgb(mixC(DARK, WHITE, light));
    disc(c, R.head, D.headR + D.ol, OUT); disc(c, R.head, D.headR, f);
    for (const [arm, g] of [[R.armL, R.grip[0]], [R.armR, R.grip[1]]]) {
      if (g > 0.5) { disc(c, arm[2], D.handR + D.ol, OUT); disc(c, arm[2], D.handR, f); }
    }
  }
  function floorShadow(c, x, w, a) {
    c.save(); c.translate(x, FLOOR + 2); c.scale(1, 0.16);
    const g = c.createRadialGradient(0, 0, 0, 0, 0, w);
    g.addColorStop(0, `rgba(0,0,0,${a})`); g.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g; c.beginPath(); c.arc(0, 0, w, 0, Math.PI * 2); c.fill(); c.restore();
  }

  // ---------- repetições ----------
  function repQ(d, up, hold, down) {
    if (d < 0) return 0;
    if (d < up) return easeInOut(d / up);
    if (d < up + hold) return 1;
    if (d < up + hold + down) return 1 - easeInOut((d - up - hold) / down);
    return 0;
  }
  const mkRep = (s, period) => ({ s, up: 0.42 * period, hold: 0.12 * period, down: 0.4 * period });
  const qAt = (t, reps) => { let q = 0; for (const r of reps) { const d = t - r.s; if (d >= 0 && d < r.up + r.hold + r.down) q = Math.max(q, repQ(d, r.up, r.hold, r.down)); } return q; };
  const countAt = (t, reps) => { let n = 0; for (const r of reps) if (t >= r.s + r.up) n++; return n; };

  const EGO_R = [];
  for (let k = 0; k < 7; k++) EGO_R.push(mkRep(3.0 + 0.45 * k, 0.45));      // começa com tudo
  for (let k = 0; k < 5; k++) EGO_R.push(mkRep(7.0 + 1.0 * k, 1.0));       // vai perdendo o gás
  const DISC_R = [];
  for (let k = 0; k < 15; k++) DISC_R.push(mkRep(3.25 + 0.9 * k, 0.9));    // ritmo constante até a meta (15)
  const OBS_R = [];
  { let s = 3.2; while (s < 26) { const p = s < 19 ? 0.7 : s < 22 ? lerp(0.7, 0.34, smooth(seg(s, 19, 20.2))) : 0.8; OBS_R.push(mkRep(s, p)); s += p; } }
  const DISC_GOAL = DISC_R[DISC_R.length - 1].s + DISC_R[DISC_R.length - 1].up;
  const EGO_DROP = 12.9, DISC_DROP = 16.85;
  const JUMP = { ego: 2.15, obs: 2.3, disc: 2.42 };

  // ---------- estado de cada boneco ----------
  const handsDown = (x, scY) => [[x - 41, scY + 120], [x + 41, scY + 120]];
  const handsUp = (x, scY) => [[x - 44, scY + 10 - 108], [x + 44, scY + 10 - 108]];
  const handsHips = (x, scY) => [[x - 31, scY + 82], [x + 31, scY + 82]];
  function sway(t, t0, amp, ph) { return amp * Math.exp(-Math.max(0, t - t0) * 2.2) * Math.sin((t - t0) * 6.5 + ph) + 2.5 * Math.sin(t * 1.7 + ph); }

  function onBar(t, x, reps, ph, j0) {
    const q = qAt(t, reps);
    const sx = x + sway(t, j0 + 0.26, 9, ph);
    return { x: sx, scY: lerp(HANG_SC, TOP_SC, q), legs: hangL(t, ph), hands: grips(x), grip: [1, 1], lean: 0, headDrop: 0, q };
  }
  function jumpTo(t, x, j0, ph) {
    const sc0 = standSC(STAND_L);
    if (t < j0 - 0.4) return { x, scY: sc0, legs: STAND_L, hands: handsDown(x, sc0), lean: 0.008 * Math.sin(t * 2 + ph), headDrop: 0 };
    if (t < j0) {
      const u = easeInOut(seg(t, j0 - 0.4, j0 - 0.1));
      const dip = 14 * Math.sin(Math.PI * seg(t, j0 - 0.22, j0 + 0.02));
      const scY = sc0 + dip;
      return { x, scY, legs: STAND_L, hands: [P2(handsDown(x, scY)[0], handsUp(x, scY)[0], u), P2(handsDown(x, scY)[1], handsUp(x, scY)[1], u)], lean: 0, headDrop: 0 };
    }
    const u = easeOut(seg(t, j0, j0 + 0.26));
    const scY = lerp(sc0, HANG_SC, u);
    const g = grips(x);
    return { x, scY, legs: mixL(STAND_L, hangL(t, ph), u), hands: [P2(handsUp(x, scY)[0], g[0], u), P2(handsUp(x, scY)[1], g[1], u)], grip: [u > 0.92 ? 1 : 0, u > 0.92 ? 1 : 0], lean: 0, headDrop: 0 };
  }
  function dropFrom(t, x, d0, ph) {
    const sc0 = standSC(STAND_L);
    const u = easeIn(seg(t, d0, d0 + 0.22));
    const land = seg(t, d0 + 0.22, d0 + 0.55);
    const dip = t > d0 + 0.22 ? 18 * Math.sin(Math.PI * land) : 0;
    const scY = lerp(HANG_SC, sc0, u) + dip;
    const armsDown = easeInOut(seg(t, d0 + 0.2, d0 + 0.65));
    const up = handsUp(x, scY), dn = handsDown(x, scY), g = grips(x);
    const hands = t < d0 + 0.05 ? g : [P2(up[0], dn[0], armsDown), P2(up[1], dn[1], armsDown)];
    return { x, scY, legs: mixL(hangL(t, ph), STAND_L, u), hands, grip: t < d0 + 0.05 ? [1, 1] : [0, 0], lean: 0, headDrop: 0 };
  }

  function egoState(t) {
    const x = LANES.ego.x, ph = 1.3, j0 = JUMP.ego;
    if (t < j0 + 0.26) return jumpTo(t, x, j0, ph);
    if (t < EGO_DROP) {
      const s = onBar(t, x, EGO_R, ph, j0);
      // repetições "de exibição": balança mais
      s.x += 10 * Math.sin(t * 7) * smooth(seg(t, 3.0, 3.3)) * (1 - smooth(seg(t, 5.6, 5.95)));
      // acena para a plateia com uma mão só
      const wave = smooth(seg(t, 5.95, 6.15)) * (1 - smooth(seg(t, 6.7, 6.9)));
      if (wave > 0) {
        const tgt = [x + 72 + 16 * Math.sin(t * 14), BAR_Y - 46 + 8 * Math.cos(t * 14)];
        s.hands = [s.hands[0], P2(s.hands[1], tgt, wave)];
        s.grip = [1, wave > 0.3 ? 0 : 1]; s.x -= 10 * wave; s.lean = -0.07 * wave;
      }
      // sem plateia: fica parado, procurando aplauso
      const look = smooth(seg(t, 11.6, 11.9));
      s.x += 5 * Math.sin((t - 11.6) * 5) * look;
      return s;
    }
    let s = dropFrom(t, x, EGO_DROP, ph);
    if (t > EGO_DROP + 0.65) {
      const sl = easeInOut(seg(t, 13.6, 14.1));
      s = { x, scY: standSC(STAND_L) + 6 * sl, legs: STAND_L, hands: handsDown(x, standSC(STAND_L) + 6 * sl), lean: 0, headDrop: 16 * sl };
      const sit = easeInOut(seg(t, 14.4, 15.2));
      if (sit > 0) {
        const legs = mixL(STAND_L, SIT_L, sit);
        const scY = standSC(legs) + 6 + 8 * sit;
        const knees = [[x - 30, FLOOR - 20], [x + 30, FLOOR - 20]];
        const dn = handsDown(x, scY);
        s = { x, scY, legs, hands: [P2(dn[0], knees[0], sit), P2(dn[1], knees[1], sit)], lean: 0, headDrop: 16 + 12 * sit };
      }
    }
    return s;
  }
  function discState(t) {
    const x = LANES.disc.x, ph = 0.4, j0 = JUMP.disc;
    if (t < j0 + 0.26) return jumpTo(t, x, j0, ph);
    if (t < DISC_DROP) return onBar(t, x, DISC_R, ph, j0);
    let s = dropFrom(t, x, DISC_DROP, ph);
    const hh = easeInOut(seg(t, 17.45, 17.85));
    if (hh > 0) {
      const scY = standSC(STAND_L);
      const dn = handsDown(x, scY), hp = handsHips(x, scY);
      s = { x, scY, legs: STAND_L, hands: [P2(dn[0], hp[0], hh), P2(dn[1], hp[1], hh)], lean: 0, headDrop: -3 * hh };
    }
    return s;
  }
  function obsState(t) {
    const x = LANES.obs.x, ph = 2.2, j0 = JUMP.obs;
    if (t < j0 + 0.26) return jumpTo(t, x, j0, ph);
    return onBar(t, x, OBS_R, ph, j0);
  }
  const stateOf = { disc: discState, obs: obsState, ego: egoState };

  // gotas de suor da obsessão
  const drops = [];
  for (let t0 = 9.2; t0 < 26; t0 += rr(0.45, 0.75)) {
    const side = rnd() < 0.5 ? -1 : 1;
    const R0 = buildRig(obsState(t0));
    drops.push({ t0, p: [R0.head[0] + side * 22, R0.head[1] - 10], vx: side * rr(70, 140), vy: rr(-190, -120) });
  }

  // ---------- cenário ----------
  function beamPoly(c, ax, ay, xl, xr, a, tint, blur) {
    c.save(); c.filter = `blur(${blur}px)`;
    const g = c.createLinearGradient(0, ay, 0, FLOOR);
    g.addColorStop(0, rgb(tint, 1, a)); g.addColorStop(1, rgb(tint, 1, a * 0.45));
    c.fillStyle = g; c.beginPath(); c.moveTo(ax - 14, ay); c.lineTo(ax + 14, ay); c.lineTo(xr, FLOOR); c.lineTo(xl, FLOOR); c.closePath(); c.fill();
    c.restore();
  }
  function pool(c, x, w, a, tint) {
    c.save(); c.translate(x, FLOOR + 4); c.scale(1, 0.13);
    const g = c.createRadialGradient(0, 0, 0, 0, 0, w);
    g.addColorStop(0, rgb(tint, 1, a)); g.addColorStop(1, rgb(tint, 1, 0));
    c.fillStyle = g; c.beginPath(); c.arc(0, 0, w, 0, Math.PI * 2); c.fill(); c.restore();
  }
  function lamp(c, x, lv) {
    c.strokeStyle = '#0a0a0b'; c.lineWidth = 3; c.beginPath(); c.moveTo(x, -40); c.lineTo(x, LAMP_Y - 30); c.stroke();
    c.beginPath(); c.moveTo(x - 13, LAMP_Y - 32); c.lineTo(x + 13, LAMP_Y - 32); c.lineTo(x + 30, LAMP_Y); c.lineTo(x - 30, LAMP_Y); c.closePath();
    c.fillStyle = '#141416'; c.fill(); c.lineWidth = 3; c.strokeStyle = OUT; c.stroke();
    const g = c.createRadialGradient(x, LAMP_Y + 4, 0, x, LAMP_Y + 4, 140);
    g.addColorStop(0, `rgba(255,255,255,${0.42 * lv})`); g.addColorStop(0.35, `rgba(255,250,240,${0.12 * lv})`); g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g; c.beginPath(); c.arc(x, LAMP_Y + 4, 140, 0, Math.PI * 2); c.fill();
    c.save(); c.translate(x, LAMP_Y + 1); c.scale(1, 0.3);
    c.fillStyle = `rgba(255,255,255,${0.12 + 0.88 * Math.min(1, lv)})`; c.beginPath(); c.arc(0, 0, 25, 0, Math.PI * 2); c.fill(); c.restore();
  }
  function drawRigPosts(c) {
    for (const px of [34, 1046]) {
      c.fillStyle = '#1c1c1f'; c.strokeStyle = OUT; c.lineWidth = 4;
      c.beginPath(); c.rect(px - 13, BAR_Y - 34, 26, FLOOR - BAR_Y + 34); c.fill(); c.stroke();
      c.fillStyle = 'rgba(255,255,255,0.06)'; c.fillRect(px - 9, BAR_Y - 30, 5, FLOOR - BAR_Y + 26);
      c.fillStyle = '#18181b'; c.beginPath(); c.rect(px - 40, FLOOR - 12, 80, 12); c.fill(); c.stroke();
    }
  }
  function drawBar(c) {
    c.lineCap = 'round';
    c.strokeStyle = OUT; c.lineWidth = 22; c.beginPath(); c.moveTo(24, BAR_Y); c.lineTo(1056, BAR_Y); c.stroke();
    const g = c.createLinearGradient(0, BAR_Y - 7, 0, BAR_Y + 7);
    g.addColorStop(0, '#e9e9ee'); g.addColorStop(0.5, '#a9a9b1'); g.addColorStop(1, '#6d6d75');
    c.strokeStyle = g; c.lineWidth = 13; c.beginPath(); c.moveTo(24, BAR_Y); c.lineTo(1056, BAR_Y); c.stroke();
  }

  // ---------- luz das raias ----------
  const level = {
    disc: track([[0, 1.05], [1.5, 1.05], [1.75, 0.85], [3.0, 0.85], [3.3, 0.6], [5.8, 0.6], [6.1, 1.0], [8.8, 1.0], [9.1, 0.6], [15.3, 0.6], [15.6, 1.0], [17.6, 1.0], [18.6, 0.42]]),
    obs: track([[0, 0.05], [1.48, 0.05], [1.53, 1.45], [2.2, 0.85], [3.0, 0.85], [3.3, 0.6], [8.8, 0.6], [9.1, 1.0], [11.8, 1.0], [12.1, 0.6], [18.8, 0.6], [19.3, 1.15], [22.0, 1.15], [22.6, 1.4]]),
    ego: track([[0, 0.05], [1.62, 0.05], [1.78, 0.85], [3.0, 0.85], [3.3, 1.1], [5.8, 1.1], [6.1, 0.6], [11.9, 0.6], [12.15, 1.0], [12.4, 1.0], [12.85, 0.08]]),
  };

  const sparks = [];
  for (let i = 0; i < 44; i++) sparks.push({ x: LANES.obs.x + rr(-170, 170), y0: BAR_Y + rr(-40, 420), v: rr(30, 80), t0: 21.9 + rr(0, 1.8), r: rr(2, 4.5), ph: rr(0, 6.28) });

  // ---------- câmera ----------
  // gancho: começa fechado na disciplina; no "errado." a câmera abre de uma vez, com tremor
  const PIV = [540, 820], F0 = [200, 880], SF0 = [430, 965], SLAM = 1.5;
  function camAt(t) {
    const base = 1 + 0.012 * seg(t, 0, 19) + 0.11 * easeInOut(seg(t, 19.0, 24.6));
    const u = easeOut(seg(t, SLAM, SLAM + 0.38));
    const s = lerp(1.42 + 0.06 * seg(t, 0, SLAM), base, u);
    const f = P2(F0, PIV, u), sf = P2(SF0, PIV, u);
    const k = t >= SLAM ? Math.exp(-(t - SLAM) * 9) : 0;
    const shx = 16 * k * Math.sin((t - SLAM) * 70), shy = 11 * k * Math.cos((t - SLAM) * 83);
    return { s, ox: sf[0] - f[0] * s + shx, oy: sf[1] - f[1] * s + shy };
  }
  const toScreen = (p, C) => [p[0] * C.s + C.ox, p[1] * C.s + C.oy];
  const slamTint = (t, tint) => (t >= SLAM ? mixC(tint, [255, 110, 90], 0.85 * Math.exp(-(t - SLAM) * 2.5)) : tint);

  const labels = {};
  for (const k of ['disc', 'obs', 'ego']) labels[k] = { el: document.getElementById('lab-' + k), n: document.getElementById('n-' + k) };

  function obsDisplay(t) {
    const real = countAt(t, OBS_R);
    if (t < 19) return real;
    const at22 = countAt(22, OBS_R);
    if (t < 22) return real + Math.round((100 - at22) * easeIn(seg(t, 19, 22)));
    return 100 + (real - at22);
  }

  // ---------- desenho ----------
  function drawObjects(c, t, lv) {
    const figLight = (k) => clamp(0.3 + 0.7 * Math.min(1, lv[k] / 0.85));
    drawRigPosts(c);
    const st = { disc: discState(t), obs: obsState(t), ego: egoState(t) };
    const R = {}; for (const k in st) R[k] = buildRig(st[k]);
    for (const k in R) {
      const feetY = Math.max(R[k].legL[3][1], R[k].legR[3][1]);
      const air = clamp((FLOOR - 4 - feetY) / 140);
      floorShadow(c, R[k].hip[0], 70 - 20 * air, 0.5 - 0.3 * air);
    }
    // aura vermelha da obsessão no final
    const aura = smooth(seg(t, 19.2, 22.4));
    if (aura > 0) {
      c.save(); c.globalCompositeOperation = 'lighter';
      const p = R.obs.sc, g = c.createRadialGradient(p[0], p[1] + 40, 0, p[0], p[1] + 40, 260);
      g.addColorStop(0, `rgba(255,90,60,${0.32 * aura})`); g.addColorStop(1, 'rgba(255,60,40,0)');
      c.fillStyle = g; c.beginPath(); c.arc(p[0], p[1] + 40, 260, 0, Math.PI * 2); c.fill(); c.restore();
    }
    for (const k of ['disc', 'obs', 'ego']) drawBody(c, R[k], figLight(k));
    drawBar(c);
    for (const k of ['disc', 'obs', 'ego']) drawHeadHands(c, R[k], figLight(k));
    // suor
    for (const d of drops) {
      const a = t - d.t0; if (a < 0 || a > 0.75) continue;
      const x = d.p[0] + d.vx * a, y = d.p[1] + d.vy * a + 0.5 * 900 * a * a;
      c.save(); c.globalAlpha = 1 - smooth(seg(a, 0.45, 0.75));
      c.translate(x, y); c.rotate(Math.atan2(d.vy + 900 * a, d.vx) - Math.PI / 2); c.scale(1.7, 1.7);
      c.beginPath(); c.moveTo(0, -11); c.quadraticCurveTo(7, 0, 0, 6); c.quadraticCurveTo(-7, 0, 0, -11); c.closePath();
      c.fillStyle = '#dff1ff'; c.fill(); c.lineWidth = 2.2; c.strokeStyle = OUT; c.stroke(); c.restore();
    }
    // faíscas finais
    c.save(); c.globalCompositeOperation = 'lighter';
    for (const m of sparks) {
      const d = t - m.t0; if (d < 0) continue;
      const a = 0.85 * smooth(d / 0.5) * (1 - smooth((d - 2.4) / 1.0)); if (a <= 0) continue;
      const x = m.x + 8 * Math.sin(m.ph + d * 1.4), y = m.y0 - d * m.v;
      const g = c.createRadialGradient(x, y, 0, x, y, m.r * 4);
      g.addColorStop(0, `rgba(255,170,120,${a})`); g.addColorStop(1, 'rgba(255,90,60,0)');
      c.fillStyle = g; c.beginPath(); c.arc(x, y, m.r * 4, 0, Math.PI * 2); c.fill();
    }
    c.restore();
  }

  function renderAt(t) {
    const C = camAt(t);
    const lv = { disc: level.disc(t), obs: level.obs(t), ego: level.ego(t) };
    const floorS = toScreen([0, FLOOR], C)[1];
    const cam = (c) => c.setTransform(C.s, 0, 0, C.s, C.ox, C.oy);

    lc.setTransform(1, 0, 0, 1, 0, 0); lc.clearRect(0, 0, W, H); cam(lc);
    drawObjects(lc, t, lv);

    const c = ctx;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.fillStyle = '#050506'; c.fillRect(0, 0, W, H);
    cam(c);
    const bg = c.createLinearGradient(0, 0, 0, FLOOR);
    bg.addColorStop(0, '#070708'); bg.addColorStop(0.32, '#1b1a1a'); bg.addColorStop(0.7, '#323030'); bg.addColorStop(1, '#2c2b2b');
    c.fillStyle = bg; c.fillRect(-300, -300, W + 600, FLOOR + 300);
    const fl = c.createLinearGradient(0, FLOOR, 0, FLOOR + 760);
    fl.addColorStop(0, '#262526'); fl.addColorStop(0.18, '#141415'); fl.addColorStop(0.6, '#070708'); fl.addColorStop(1, '#020202');
    c.fillStyle = fl; c.fillRect(-300, FLOOR, W + 600, H);
    beamPoly(c, -260, -120, 260, 900, 0.05, [255, 250, 240], 18);
    beamPoly(c, 1340, -120, 160, 820, 0.05, [255, 250, 240], 18);
    for (const k of ['disc', 'obs', 'ego']) {
      const L = LANES[k], a = 0.13 * Math.min(1.25, lv[k]);
      if (a > 0.003) beamPoly(c, L.x, LAMP_Y + 2, L.x - 175, L.x + 175, a, k === 'obs' ? slamTint(t, L.tint) : L.tint, 10);
    }
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
    for (const k of ['disc', 'obs', 'ego']) lamp(c, LANES[k].x, Math.min(1, lv[k]));
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.drawImage(layer, 0, 0);

    // rótulos + contadores de repetição
    const lostEgo = 1 - 0.55 * smooth(seg(t, 13.0, 13.6));
    const rv = smooth(seg(t, SLAM + 0.3, SLAM + 0.55));
    const op = { disc: rv * (1 - 0.35 * smooth(seg(t, 18.8, 19.4))), obs: rv, ego: rv * lostEgo * (1 - 0.6 * smooth(seg(t, 18.8, 19.4))) };
    const cnt = { disc: countAt(t, DISC_R), obs: obsDisplay(t), ego: countAt(t, EGO_R) };
    for (const k in labels) {
      const L = labels[k]; if (!L.el) continue;
      const p = toScreen([LANES[k].x, FLOOR + 20], C);
      L.el.style.transform = `translate(${p[0].toFixed(1)}px, ${p[1].toFixed(1)}px) translate(-50%, 0)`;
      L.el.style.opacity = op[k].toFixed(3);
      if (L.n) L.n.textContent = k === 'disc' && t >= DISC_GOAL ? `${cnt[k]} ✓` : String(cnt[k]);
    }
  }

  window.__schedule = {
    grabs: Object.values(JUMP).map((j) => +(j + 0.26).toFixed(3)),
    egoReps: EGO_R.map((r) => +(r.s + r.up).toFixed(3)),
    discReps: DISC_R.map((r) => +(r.s + r.up).toFixed(3)),
    obsReps: OBS_R.filter((r) => r.s + r.up < 26).map((r) => +(r.s + r.up).toFixed(3)),
    slam: SLAM, egoWave: 5.95, egoDim: 12.4, egoLand: +(EGO_DROP + 0.22).toFixed(3), egoSit: 15.2,
    discGoal: +DISC_GOAL.toFixed(3), discLand: +(DISC_DROP + 0.22).toFixed(3),
  };
  window.__renderAt = renderAt;
  window.addEventListener('hf-seek', (e) => renderAt(e.detail.time));
  renderAt(0);
})();
