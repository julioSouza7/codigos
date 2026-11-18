// Disciplina x Ego x Obsessão — palco 2D vetorial (bonecos de perfil com contorno), função pura do tempo.
(function () {
  const W = 1080, H = 1920, FLOOR = 1150, LAMP_Y = 585;
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
  const outBack = (u, s = 1.8) => { u = clamp(u) - 1; return u * u * ((s + 1) * u + s) + 1; };
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const rnd = mulberry32(1118);
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

  // ---------- proporções do boneco (≈ 340 px de altura) ----------
  const D = { headR: 31, limb: 26, torsoW: 30, ol: 5, torso: 100, uArm: 60, fArm: 56, thigh: 82, shin: 78, foot: 20 };
  const OUT = '#0e0e10';
  const WHITE = [247, 247, 245], BACK = [196, 196, 200], DARK = [92, 92, 98], DARKB = [66, 66, 72];

  const LANES = {
    obs: { figX: 112, towerL: 200, lampX: 210, tint: [255, 222, 214] },
    disc: { figX: 428, towerL: 496, lampX: 530, tint: [255, 241, 220] },
    ego: { figX: 758, towerL: 824, lampX: 846, tint: [238, 226, 255] },
  };

  // ---------- poses (ângulos absolutos; 0 = para baixo, positivo = para a frente) ----------
  const KEYS = ['torso', 'head', 'aFu', 'aFl', 'aBu', 'aBl', 'lFt', 'lFs', 'lBt', 'lBs', 'hx', 'hy', 'free'];
  const P = (o) => Object.assign({ torso: 0.03, head: 0.05, aFu: 0.07, aFl: 0.2, aBu: -0.08, aBl: 0.06, lFt: 0.05, lFs: -0.02, lBt: -0.1, lBs: -0.06, hx: 0, hy: 0, free: 0 }, o || {});
  const mixP = (a, b, u) => { const o = {}; for (const k of KEYS) o[k] = lerp(a[k], b[k], u); return o; };
  const STAND = P();
  const HOLD = P({ aFu: 0.32, aFl: 1.28, torso: 0.05 });

  const v = (a, len) => [Math.sin(a) * len, Math.cos(a) * len];
  const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
  function rig(figX, p) {
    const autoY = FLOOR - D.limb * 0.5 - 2 - (D.thigh * Math.cos(p.lFt) + D.shin * Math.cos(p.lFs));
    const hip = [figX + p.hx, lerp(autoY, FLOOR + p.hy, p.free)];
    const tv = [Math.sin(p.torso), -Math.cos(p.torso)];
    const sh = [hip[0] + tv[0] * D.torso, hip[1] + tv[1] * D.torso];
    const arm = [hip[0] + tv[0] * (D.torso - 10), hip[1] + tv[1] * (D.torso - 10)];
    const ha = p.torso + p.head;
    const head = [sh[0] + Math.sin(ha) * (D.headR + 9), sh[1] - Math.cos(ha) * (D.headR + 9)];
    const eF = add(arm, v(p.aFu, D.uArm)), hF = add(eF, v(p.aFl, D.fArm));
    const eB = add(arm, v(p.aBu, D.uArm)), hB = add(eB, v(p.aBl, D.fArm));
    const kF = add(hip, v(p.lFt, D.thigh)), aF = add(kF, v(p.lFs, D.shin)), tF = add(aF, v(p.lFs + Math.PI / 2, D.foot));
    const kB = add(hip, v(p.lBt, D.thigh)), aB = add(kB, v(p.lBs, D.shin)), tB = add(aB, v(p.lBs + Math.PI / 2, D.foot));
    return { hip, sh, arm, head, ha, eF, hF, eB, hB, kF, aF, tF, kB, aB, tB };
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
    const f = rgb(mixC(DARK, WHITE, light)), b = rgb(mixC(DARKB, BACK, light));
    limb(c, [R.arm, R.eB, R.hB], D.limb, b);
    limb(c, [R.hip, R.kB, R.aB, R.tB], D.limb, b);
    strokePts(c, [R.hip, R.sh], D.torsoW + 2 * D.ol, OUT);
    strokePts(c, [R.hip, R.kF, R.aF, R.tF], D.limb + 2 * D.ol, OUT);
    strokePts(c, [R.hip, R.sh], D.torsoW, f);
    strokePts(c, [R.hip, R.kF, R.aF, R.tF], D.limb, f);
    disc(c, R.head, D.headR + D.ol, OUT); disc(c, R.head, D.headR, f);
    limb(c, [R.arm, R.eF, R.hF], D.limb, f);
  }
  function floorShadow(c, x, w, a) {
    const g = c.createRadialGradient(x, FLOOR + 2, 0, x, FLOOR + 2, w);
    g.addColorStop(0, `rgba(0,0,0,${a})`); g.addColorStop(1, 'rgba(0,0,0,0)');
    c.save(); c.translate(0, FLOOR + 2); c.scale(1, 0.16); c.translate(0, -(FLOOR + 2));
    c.fillStyle = g; c.beginPath(); c.arc(x, FLOOR + 2, w, 0, Math.PI * 2); c.fill(); c.restore();
  }

  // ---------- blocos ----------
  const STY = {
    disc: { w: 44, h: 42, r: 8, top: [255, 228, 150], bot: [236, 164, 50], line: '#3a2406', glow: [255, 184, 60] },
    obs: { w: 40, h: 26, r: 6, top: [255, 112, 92], bot: [204, 40, 30], line: '#3a0906', glow: [255, 70, 50] },
    ego: { w: 54, h: 54, r: 10, top: [204, 160, 255], bot: [124, 64, 228], line: '#1d0e3a', glow: [170, 110, 255] },
  };
  function rrect(c, x, y, w, h, r) {
    c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
  }
  function drawBlock(c, kind, x, y, rot, sx, sy, bright, glow) {
    const s = STY[kind], w = s.w, h = s.h;
    c.save(); c.translate(x, y); c.rotate(rot); c.scale(sx, sy);
    if (glow > 0.01) { c.shadowColor = rgb(s.glow, 1, 0.9 * Math.min(1, glow)); c.shadowBlur = 30 * glow; }
    rrect(c, -w / 2, -h / 2, w, h, s.r);
    const g = c.createLinearGradient(0, -h / 2, 0, h / 2);
    g.addColorStop(0, rgb(s.top, bright)); g.addColorStop(1, rgb(s.bot, bright));
    c.fillStyle = g; c.fill();
    c.shadowBlur = 0; c.shadowColor = 'transparent';
    c.lineWidth = 4; c.strokeStyle = s.line; c.stroke();
    if (kind === 'disc') {
      c.strokeStyle = rgb([150, 86, 10], 1, 0.4); c.lineWidth = 2.2;
      for (const yy of [-3, 6, 15]) { c.beginPath(); c.moveTo(-w / 2 + 7, yy); c.lineTo(w / 2 - 7, yy); c.stroke(); }
    }
    c.fillStyle = `rgba(255,255,255,${0.5 * bright})`; rrect(c, -w / 2 + 6, -h / 2 + 5, w - 12, 5, 2.5); c.fill();
    c.restore();
  }

  // ---------- agenda ----------
  const DISC_T = [], OBS_T = [], EGO_T = [];
  for (let k = 0; k < 26; k++) DISC_T.push(3.4 + 0.6 * k);   // 3.4 → 18.4, um por "dia"
  for (let k = 0; k < 10; k++) DISC_T.push(19.1 + 0.3 * k);  // time-lapse final
  for (let k = 0; k < 30; k++) OBS_T.push(3.2 + 0.4 * k);    // 3.2 → 14.8, sem parar
  for (let k = 0; k < 6; k++) EGO_T.push(3.35 + 0.33 * k);   // 3.35 → 5.0, rápido e grande
  const FLY = { disc: 0.42, obs: 0.3, ego: 0.45 };

  const blocks = [];
  DISC_T.forEach((ts, i) => {
    const row = Math.floor(i / 3), col = i % 3, L = LANES.disc;
    blocks.push({ who: 'disc', i, row, ts, fly: FLY.disc, hand: 'F', slot: [L.towerL + 22 + col * 46, FLOOR - 21 - row * 44], rot: 0 });
  });
  OBS_T.forEach((ts, i) => {
    const row = Math.floor(i / 2), col = i % 2, L = LANES.obs;
    const lean = 0.6 * Math.pow(row, 1.5);
    blocks.push({ who: 'obs', i, row, ts, fly: FLY.obs, hand: i % 2 ? 'B' : 'F',
      slot: [L.towerL + 20 + col * 41 + lean + rr(-3, 3), FLOOR - 13 - row * 27], rot: rr(-0.05, 0.05) + 0.004 * row });
  });
  EGO_T.forEach((ts, i) => {
    const row = Math.floor(i / 2), col = i % 2, L = LANES.ego;
    blocks.push({ who: 'ego', i, row, ts, fly: FLY.ego, hand: 'BOTH', slot: [L.towerL + 27 + col * 56, FLOOR - 27 - row * 56], rot: 0 });
  });
  const byWho = { disc: blocks.filter((b) => b.who === 'disc'), obs: blocks.filter((b) => b.who === 'obs'), ego: blocks.filter((b) => b.who === 'ego') };

  // envelope do gesto (1 = braço estendido no instante da soltura)
  function reachEnv(t, list, pre, post) {
    let best = 0, which = null;
    for (const b of list) {
      const d = t - b.ts;
      if (d > -pre && d < post) {
        const r = d < 0 ? easeInOut((d + pre) / pre) : 1 - easeInOut(d / post);
        if (r > best) { best = r; which = b; }
      }
    }
    return { r: best, b: which };
  }
  function nextBlock(t, list) { for (const b of list) if (b.ts >= t) return b; return null; }
  function reachPose(base, R0, b, r, armKeys) {
    // ângulo do ombro até o encaixe do bloco
    const dx = b.slot[0] - R0.arm[0], dy = b.slot[1] - R0.arm[1];
    const A = clamp(Math.atan2(dx, dy), 0.45, 2.7);
    const low = clamp((b.slot[1] - R0.arm[1]) / 260);
    const p = Object.assign({}, base);
    for (const [u, l] of armKeys) { p[u] = lerp(base[u], A - 0.08, r); p[l] = lerp(base[l], A + 0.06, r); }
    p.torso += r * (0.05 + 0.3 * low); p.head += r * (0.1 * low - 0.12 * (1 - low));
    return p;
  }

  // ---------- disciplina ----------
  function discPose(t) {
    const L = LANES.disc;
    let base = mixP(STAND, HOLD, smooth(seg(t, 2.7, 3.1)) * (1 - smooth(seg(t, 22.0, 22.5))));
    base = Object.assign({}, base);
    base.torso += 0.012 * Math.sin(t * 2.2);
    const fast = t > 19.0;
    const { r, b } = reachEnv(t, byWho.disc, fast ? 0.17 : 0.3, fast ? 0.12 : 0.24);
    let p = base;
    if (b) p = reachPose(base, rig(L.figX, base), b, r, [['aFu', 'aFl']]);
    const fin = smooth(seg(t, 22.3, 22.9));
    p.torso -= 0.05 * fin; p.head -= 0.12 * fin;
    return p;
  }

  // ---------- obsessão ----------
  const OBS_BASE = P({ torso: 0.24, head: 0.25, aFu: 0.42, aFl: 1.25, aBu: 0.36, aBl: 1.18, lFt: 0.16, lFs: -0.12, lBt: -0.06, lBs: -0.2 });
  const KNEEL = P({ torso: 0.62, head: 0.45, aFu: 0.25, aFl: 0.3, aBu: 0.12, aBl: 0.22, lFt: 0.55, lFs: -1.42, lBt: 0.48, lBs: -1.48, hx: 6, hy: -86, free: 1 });
  const SLUMP_KNEEL = P({ torso: 0.75, head: 0.6, aFu: 0.3, aFl: 0.1, aBu: 0.22, aBl: 0.05, lFt: 1.25, lFs: -1.5, lBt: 1.18, lBs: -1.52, hx: -8, hy: -44, free: 1 });
  const obsF = byWho.obs.filter((b) => b.hand === 'F'), obsB = byWho.obs.filter((b) => b.hand === 'B');
  function obsPose(t) {
    const L = LANES.obs;
    const on = smooth(seg(t, 2.8, 3.15));
    const work = on * (1 - smooth(seg(t, 15.2, 15.6)));
    let base = mixP(P({ torso: 0.14, head: 0.12 }), OBS_BASE, on);
    base = Object.assign({}, base);
    base.torso += 0.03 * Math.sin(t * 3.1) * (1 - on);
    const eF = reachEnv(t, obsF, 0.22, 0.17), eB = reachEnv(t, obsB, 0.22, 0.17);
    let p = base;
    const R0 = rig(L.figX, base);
    if (eF.b && work > 0) p = reachPose(p, R0, eF.b, eF.r * work, [['aFu', 'aFl']]);
    if (eB.b && work > 0) p = reachPose(p, R0, eB.b, eB.r * work, [['aBu', 'aBl']]);
    // corpo bombeando a cada arremesso
    p.hy = 0; p.torso += 0.05 * Math.sin(t * Math.PI / 0.4) * work;
    // exaustão → joelhos → desaba
    const stop = smooth(seg(t, 15.2, 15.7));
    if (stop > 0) {
      const limp = mixP(p, P({ torso: 0.42, head: 0.4, aFu: 0.1, aFl: 0.12, aBu: 0.02, aBl: 0.08, lFt: 0.2, lFs: -0.14, lBt: -0.04, lBs: -0.2 }), stop);
      p = limp; p.torso += 0.08 * Math.sin((t - 15.2) * 6) * (1 - smooth(seg(t, 15.8, 16.0)));
    }
    if (t > 15.95) p = mixP(p, KNEEL, easeIn(seg(t, 15.95, 16.3)));
    if (t > 16.3) {
      const u = easeInOut(seg(t, 16.3, 16.75));
      p = mixP(KNEEL, SLUMP_KNEEL, u);
      p.hy += -5 * Math.sin(seg(t, 16.75, 16.95) * Math.PI);
    }
    return p;
  }

  // ---------- ego ----------
  const HIPS = P({ torso: -0.07, head: -0.12, aFu: -0.62, aFl: 0.9, aBu: -0.52, aBl: 1.0, lFt: 0.14, lFs: 0.02, lBt: -0.14, lBs: -0.08 });
  const HOLD2 = P({ torso: 0.02, aFu: 0.45, aFl: 1.3, aBu: 0.4, aBl: 1.25, lFt: 0.12, lFs: 0.0, lBt: -0.12, lBs: -0.06 });
  const VICT = P({ torso: -0.12, head: -0.3, aFu: 2.7, aFl: 2.95, aBu: 2.5, aBl: 2.75, lFt: 0.16, lFs: 0.02, lBt: -0.16, lBs: -0.08 });
  const SLUMP = P({ torso: 0.5, head: 0.65, aFu: 0.12, aFl: 0.14, aBu: 0.02, aBl: 0.08, lFt: 0.16, lFs: -0.1, lBt: 0.0, lBs: -0.14 });
  const SIT = P({ torso: 0.35, head: 0.9, aFu: 1.0, aFl: 0.2, aBu: 0.9, aBl: 0.3, lFt: 2.3, lFs: 0.8, lBt: 2.15, lBs: 0.7, hx: -70, hy: -17, free: 1 });
  function egoPose(t) {
    const L = LANES.ego;
    let p;
    if (t < 3.0) p = HIPS;
    else if (t < 5.15) {
      p = Object.assign({}, mixP(HIPS, HOLD2, smooth(seg(t, 3.0, 3.25))));
      const { r, b } = reachEnv(t, byWho.ego, 0.22, 0.14);
      if (b) p = reachPose(p, rig(L.figX, p), b, r, [['aFu', 'aFl'], ['aBu', 'aBl']]);
    } else if (t < 7.0) {
      p = mixP(HOLD2, VICT, outBack(seg(t, 5.15, 5.5), 1.3));
      const pump = 0.12 * Math.sin((t - 5.5) * 9) * smooth(seg(t, 5.5, 5.7)) * (1 - smooth(seg(t, 6.6, 7.0)));
      p.aFu += pump; p.aBu += pump; p.aFl += pump; p.aBl += pump;
    } else if (t < 13.0) {
      p = Object.assign({}, mixP(VICT, HIPS, smooth(seg(t, 7.0, 7.45))));
      p.torso += 0.03 * Math.sin((t - 7) * 1.6);
      const anx = smooth(seg(t, 12.0, 12.3)) * (1 - smooth(seg(t, 12.9, 13.0)));
      p.hx += 6 * Math.sin((t - 12) * 7) * anx; p.head += 0.12 * Math.sin((t - 12) * 5) * anx;
    } else if (t < 14.55) {
      p = mixP(HIPS, SLUMP, easeInOut(seg(t, 13.0, 13.65)));
    } else {
      p = mixP(SLUMP, SIT, easeInOut(seg(t, 14.55, 15.4)));
    }
    p = Object.assign({}, p);
    p.torso += 0.008 * Math.sin(t * 1.9);
    return p;
  }

  const poseOf = { disc: discPose, obs: obsPose, ego: egoPose };
  function handOf(who, which, t) {
    const R = rig(LANES[who].figX, poseOf[who](t));
    if (which === 'F') return add(R.hF, [6, -10]);
    if (which === 'B') return add(R.hB, [6, -10]);
    return [(R.hF[0] + R.hB[0]) / 2 + 10, (R.hF[1] + R.hB[1]) / 2 - 22];
  }
  for (const b of blocks) b.start = handOf(b.who, b.hand, b.ts);

  // ---------- desmoronamentos ----------
  // ego: três blocos de cima caem para a direita, um racha
  const EGO_REST = {
    5: { t0: 13.9, to: [1046, FLOOR - 27], r: Math.PI / 2 - 0.08 },
    4: { t0: 14.02, to: [1000, FLOOR - 80], r: 0.42 },
    3: { t0: 14.14, to: [966, FLOOR - 27], r: Math.PI / 2 + 0.06 },
    2: { t0: 14.2, to: null, r: 0.1 },
  };
  // obsessão: a torre quebra no meio; a parte de cima tomba para a direita e vira entulho
  const OBS_TILT0 = 16.5, OBS_BREAK = 16.95, BREAK_ROW = 6;
  const obsPivot = [LANES.obs.towerL + 81, FLOOR];
  const topPiv = [LANES.obs.towerL + 81 + 0.6 * Math.pow(BREAK_ROW, 1.5), FLOOR - BREAK_ROW * 27];
  function obsTowerXform(b, t) {
    const wob = 0.02 * Math.sin((t - 13) * 5.3) * smooth(seg(t, 13, 14.5)) * (1 - smooth(seg(t, OBS_TILT0, OBS_TILT0 + 0.15)));
    let ang = wob, piv = obsPivot;
    if (b.row >= BREAK_ROW) { ang += 0.55 * easeIn(seg(t, OBS_TILT0, OBS_BREAK)); piv = topPiv; }
    else ang += 0.07 * easeOut(seg(t, OBS_BREAK, OBS_BREAK + 0.35));
    const dx = b.slot[0] - piv[0], dy = b.slot[1] - piv[1];
    const c = Math.cos(ang), sn = Math.sin(ang);
    return { p: [piv[0] + dx * c - dy * sn, piv[1] + dx * sn + dy * c], r: b.rot + ang };
  }
  const hmap = new Map();
  const bin = (x) => Math.round(x / 10);
  const heapAt = (x) => { let h = 0; for (let xx = x - 18; xx <= x + 18; xx += 10) h = Math.max(h, hmap.get(bin(xx)) || 0); return h; };
  const falling = byWho.obs.filter((b) => b.row >= BREAK_ROW).sort((a, b) => a.row - b.row);
  falling.forEach((b, k) => {
    let best = null;
    for (let tries = 0; tries < 5; tries++) {
      const x = rr(288, 392), h = heapAt(x);
      if (!best || h < best.h) best = { x, h };
    }
    const tilted = best.h > 0 && rnd() < 0.55;
    b.fall = { t0: OBS_BREAK + 0.025 * k, to: [best.x, FLOOR - 13 - best.h], r: (rnd() < 0.5 ? 0 : Math.PI) + (tilted ? rr(-0.4, 0.4) : rr(-0.08, 0.08)), dur: 0.34 + (FLOOR - b.slot[1]) / 1500 };
    for (let xx = best.x - 18; xx <= best.x + 18; xx += 10) hmap.set(bin(xx), best.h + 25);
    const st = obsTowerXform(b, b.fall.t0); b.fall.from = st.p; b.fall.r0 = st.r;
  });
  for (const k in EGO_REST) {
    const e = EGO_REST[k], b = byWho.ego[k];
    b.fall = { t0: e.t0, from: b.slot, r0: 0, to: e.to, r: e.r, dur: 0.5 };
  }
  function fallAt(f, t) {
    const u = clamp((t - f.t0) / f.dur);
    const x = lerp(f.from[0], f.to[0], easeOut(u * 0.9 + 0.1 * u * u));
    const y = lerp(f.from[1], f.to[1], easeIn(u)) - Math.sin(u * Math.PI) * 30 * (f.to[1] < f.from[1] ? 0 : 1);
    const land = t - (f.t0 + f.dur);
    const hop = land > 0 ? 9 * Math.sin(clamp(land / 0.16) * Math.PI) : 0;
    return { x, y: y - hop, r: lerp(f.r0, f.r, easeInOut(u)) };
  }

  // ---------- coroa ----------
  const CROWN_ON = 5.45, CROWN_OFF = 13.25;
  function drawCrown(c, x, y, rot, s, bright, glow) {
    c.save(); c.translate(x, y); c.rotate(rot); c.scale(s, s);
    if (glow > 0.01) { c.shadowColor = `rgba(255,200,80,${0.9 * glow})`; c.shadowBlur = 28 * glow; }
    c.beginPath();
    c.moveTo(-26, 10); c.lineTo(-28, -12); c.lineTo(-14, 0); c.lineTo(0, -20); c.lineTo(14, 0); c.lineTo(28, -12); c.lineTo(26, 10); c.closePath();
    const g = c.createLinearGradient(0, -20, 0, 10); g.addColorStop(0, rgb([255, 226, 120], bright)); g.addColorStop(1, rgb([230, 160, 40], bright));
    c.fillStyle = g; c.fill(); c.shadowBlur = 0; c.shadowColor = 'transparent';
    c.lineWidth = 4; c.lineJoin = 'round'; c.strokeStyle = '#3a2406'; c.stroke();
    for (const [px, py] of [[-28, -12], [0, -20], [28, -12]]) { disc(c, [px, py], 5.5, '#3a2406'); disc(c, [px, py], 3, rgb([255, 236, 160], bright)); }
    c.restore();
  }
  const egoHeadAtOff = rig(LANES.ego.figX, egoPose(CROWN_OFF));
  const crownFall = { t0: CROWN_OFF, from: [egoHeadAtOff.head[0] - 4, egoHeadAtOff.head[1] - D.headR - 6], r0: -0.18, to: [694, FLOOR - 13], r: -1.42, dur: 0.6 };

  // ---------- luz das raias ----------
  const level = {
    obs: track([[0, 0.85], [3.0, 0.85], [3.3, 0.6], [5.8, 0.6], [6.1, 1.0], [8.8, 1.0], [9.1, 0.6], [15.3, 0.6], [15.6, 1.0]]),
    disc: track([[0, 0.85], [3.0, 0.85], [3.3, 0.6], [8.8, 0.6], [9.1, 1.0], [11.8, 1.0], [12.1, 0.6], [18.8, 0.6], [19.3, 1.1], [22.0, 1.1], [22.6, 1.3]]),
    ego: track([[0, 0.85], [3.0, 0.85], [3.3, 1.1], [5.8, 1.1], [6.1, 0.6], [11.9, 0.6], [12.15, 1.0], [12.6, 1.0], [13.25, 0.08]]),
  };
  const FLICK = [[15.95, 1], [16.02, 0.15], [16.1, 0.9], [16.16, 0.05], [16.3, 0.7], [16.34, 0.0], [16.5, 0.45], [16.56, 0.0], [16.75, 0.2], [16.8, 0.0]];
  function flicker(t) { if (t < FLICK[0][0]) return 1; let v = 1; for (const [tt, vv] of FLICK) if (t >= tt) v = vv; return v; }

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
    const g = c.createRadialGradient(x, LAMP_Y + 4, 0, x, LAMP_Y + 4, 150);
    g.addColorStop(0, `rgba(255,255,255,${0.42 * lv})`); g.addColorStop(0.35, `rgba(255,250,240,${0.12 * lv})`); g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g; c.beginPath(); c.arc(x, LAMP_Y + 4, 150, 0, Math.PI * 2); c.fill();
    c.save(); c.translate(x, LAMP_Y + 1); c.scale(1, 0.3);
    c.fillStyle = `rgba(255,255,255,${0.12 + 0.88 * Math.min(1, lv)})`; c.beginPath(); c.arc(0, 0, 25, 0, Math.PI * 2); c.fill(); c.restore();
  }

  // partículas douradas
  const motes = [];
  for (let i = 0; i < 40; i++) motes.push({ x: LANES.disc.towerL + rr(-60, 200), y0: FLOOR - rr(20, 520), v: rr(28, 70), t0: 21.9 + rr(0, 1.6), r: rr(2, 4.5), ph: rr(0, 6.28) });

  // ---------- câmera 2D ----------
  const PIV = [530, 900];
  function camScale(t) { return 1 + 0.012 * seg(t, 0, 19) + 0.13 * easeInOut(seg(t, 19.0, 24.6)); }
  const toScreen = (p, s) => [PIV[0] + (p[0] - PIV[0]) * s, PIV[1] + (p[1] - PIV[1]) * s];

  const labelEls = { obs: document.getElementById('lab-obs'), disc: document.getElementById('lab-disc'), ego: document.getElementById('lab-ego') };
  const labelAnchor = { obs: 196, disc: 520, ego: 842 };

  // ---------- desenho de um instante ----------
  function drawObjects(c, t, lv) {
    // sombras no chão
    for (const k of ['obs', 'disc', 'ego']) floorShadow(c, LANES[k].figX + 10, 70, 0.5);
    const poses = { obs: obsPose(t), disc: discPose(t), ego: egoPose(t) };
    const rigs = { obs: rig(LANES.obs.figX, poses.obs), disc: rig(LANES.disc.figX, poses.disc), ego: rig(LANES.ego.figX, poses.ego) };
    const figLight = (k) => clamp(0.3 + 0.7 * Math.min(1, lv[k] / 0.85));
    const bright = {
      disc: lerp(0.92, 1.0, smooth(seg(t, 21.8, 23))),
      obs: lerp(1, 0.5, smooth(seg(t, 17.2, 19.2))),
      ego: lerp(1, 0.5, smooth(seg(t, 13.0, 14.0))),
    };
    const later = [];
    const drawB = (b) => {
      if (t < b.ts - 0.42) return;
      let x, y, r = b.rot, sx = 1, sy = 1, glow = 0;
      if (t < b.ts) {
        const p = handOf(b.who, b.hand, t); x = p[0]; y = p[1]; r = 0;
        const s = easeOut((t - (b.ts - 0.42)) / 0.18); sx = sy = Math.max(0.01, s);
      } else if (t < b.ts + b.fly) {
        const u = (t - b.ts) / b.fly, ue = easeInOut(u);
        const arc = Math.max(46, 0.3 * Math.abs(b.slot[0] - b.start[0]) + 40);
        x = lerp(b.start[0], b.slot[0], ue); y = lerp(b.start[1], b.slot[1], ue) - arc * 4 * u * (1 - u);
        r = lerp(-Math.PI, b.rot, easeOut(u));
      } else {
        x = b.slot[0]; y = b.slot[1];
        const d = t - (b.ts + b.fly);
        if (d < 0.18) { const q = Math.sin((d / 0.18) * Math.PI); sx = 1 + 0.12 * q; sy = 1 - 0.16 * q; y += STY[b.who].h * 0.08 * q; }
        if (b.who === 'disc') glow = 0.22 + 0.9 * Math.exp(-d * 6) + 0.5 * smooth(seg(t, 22, 23.4));
        if (b.who === 'obs' && (!b.fall || t < b.fall.t0)) { const tx = obsTowerXform(b, t); x = tx.p[0]; y = tx.p[1]; r = tx.r; }
        if (b.fall && t >= b.fall.t0) {
          if (b.fall.to) { const f = fallAt(b.fall, t); x = f.x; y = f.y; r = f.r; }
          else { r = lerp(0, b.fall.r, easeOut(seg(t, b.fall.t0, b.fall.t0 + 0.25))); x -= 4 * r; }
        }
      }
      if (b.who === 'disc' && t >= b.ts - 0.42 && t < b.ts + b.fly) glow = 0.35;
      if (b.who === 'obs' && t < 17.2) glow = 0.25;
      if (b.who === 'ego' && t < 13.0) glow = 0.3;
      drawBlock(c, b.who, x, y, r, sx, sy, bright[b.who], glow);
    };
    // torres (atrás dos bonecos), menos os blocos na mão
    for (const b of blocks) {
      if (t < b.ts) { later.push(b); continue; }
      drawB(b);
    }
    // bonecos
    for (const k of ['obs', 'disc', 'ego']) drawFigure(c, rigs[k], figLight(k));
    // blocos na mão por cima dos bonecos
    for (const b of later) drawB(b);
    // coroa
    if (t >= CROWN_ON && t < CROWN_OFF) {
      const R = rigs.ego; const up = [Math.sin(R.ha), -Math.cos(R.ha)];
      const cx = R.head[0] + up[0] * (D.headR + 4), cy = R.head[1] + up[1] * (D.headR + 4);
      const s = outBack(seg(t, CROWN_ON, CROWN_ON + 0.35), 2.2);
      drawCrown(c, cx, cy, R.ha - 0.14, Math.max(0.01, s), 1, 0.25 + 0.9 * Math.exp(-(t - CROWN_ON) * 3));
    } else if (t >= CROWN_OFF) {
      const f = fallAt(crownFall, t); drawCrown(c, f.x, f.y, f.r, 1, 0.55, 0);
    }
    // partículas
    c.save(); c.globalCompositeOperation = 'lighter';
    for (const m of motes) {
      const d = t - m.t0; if (d < 0) continue;
      const a = 0.85 * smooth(d / 0.5) * (1 - smooth((d - 2.4) / 1.0)); if (a <= 0) continue;
      const x = m.x + 8 * Math.sin(m.ph + d * 1.4), y = m.y0 - d * m.v;
      const g = c.createRadialGradient(x, y, 0, x, y, m.r * 4);
      g.addColorStop(0, `rgba(255,214,120,${a})`); g.addColorStop(1, 'rgba(255,190,80,0)');
      c.fillStyle = g; c.beginPath(); c.arc(x, y, m.r * 4, 0, Math.PI * 2); c.fill();
    }
    c.restore();
  }

  function renderAt(t) {
    const s = camScale(t);
    const lv = { obs: level.obs(t) * flicker(t), disc: level.disc(t), ego: level.ego(t) };
    const floorS = toScreen([0, FLOOR], s)[1];
    const cam = (c) => c.setTransform(s, 0, 0, s, PIV[0] - PIV[0] * s, PIV[1] - PIV[1] * s);

    // objetos numa camada (para o reflexo)
    lc.setTransform(1, 0, 0, 1, 0, 0); lc.clearRect(0, 0, W, H); cam(lc);
    drawObjects(lc, t, lv);

    const c = ctx;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.fillStyle = '#050506'; c.fillRect(0, 0, W, H);
    cam(c);
    // fundo
    const bg = c.createLinearGradient(0, 0, 0, FLOOR);
    bg.addColorStop(0, '#070708'); bg.addColorStop(0.32, '#1b1a1a'); bg.addColorStop(0.7, '#323030'); bg.addColorStop(1, '#2c2b2b');
    c.fillStyle = bg; c.fillRect(-300, -300, W + 600, FLOOR + 300);
    const fl = c.createLinearGradient(0, FLOOR, 0, FLOOR + 760);
    fl.addColorStop(0, '#262526'); fl.addColorStop(0.18, '#141415'); fl.addColorStop(0.6, '#070708'); fl.addColorStop(1, '#020202');
    c.fillStyle = fl; c.fillRect(-300, FLOOR, W + 600, H);
    // feixes cruzados de ambiente
    beamPoly(c, -260, -120, 260, 900, 0.05, [255, 250, 240], 18);
    beamPoly(c, 1340, -120, 160, 820, 0.05, [255, 250, 240], 18);
    beamPoly(c, 540, -200, -120, 1200, 0.022, [255, 250, 240], 24);
    // feixes das lâmpadas
    for (const k of ['obs', 'disc', 'ego']) {
      const L = LANES[k], a = 0.13 * Math.min(1.2, lv[k]);
      if (a > 0.003) beamPoly(c, L.lampX, LAMP_Y + 2, L.lampX - 175, L.lampX + 175, a, L.tint, 10);
    }
    // reflexo no chão
    c.save();
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.beginPath(); c.rect(0, floorS, W, H - floorS); c.clip();
    c.globalAlpha = 0.2; c.translate(0, 2 * floorS); c.scale(1, -1); c.drawImage(layer, 0, 0);
    c.restore();
    c.save(); c.setTransform(1, 0, 0, 1, 0, 0);
    const fade = c.createLinearGradient(0, floorS, 0, floorS + 420);
    fade.addColorStop(0, 'rgba(8,8,9,0.15)'); fade.addColorStop(1, 'rgba(4,4,5,1)');
    c.fillStyle = fade; c.fillRect(0, floorS, W, H - floorS);
    c.restore();
    cam(c);
    // borda do palco + poças de luz
    c.fillStyle = 'rgba(255,255,255,0.07)'; c.fillRect(-300, FLOOR - 1, W + 600, 3);
    c.save(); c.globalCompositeOperation = 'lighter';
    for (const k of ['obs', 'disc', 'ego']) pool(c, LANES[k].lampX, 230, 0.2 * Math.min(1.2, lv[k]), LANES[k].tint);
    c.restore();
    for (const k of ['obs', 'disc', 'ego']) lamp(c, LANES[k].lampX, Math.min(1, lv[k]));
    // objetos
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.drawImage(layer, 0, 0);

    // rótulos
    const lost = (1 - 0.7 * smooth(seg(t, 18.8, 19.4))) * (1 - smooth(seg(t, 21.4, 22.0)));
    const op = { obs: lost, ego: lost, disc: 1 };
    for (const k in labelEls) {
      const el = labelEls[k]; if (!el) continue;
      const p = toScreen([labelAnchor[k], FLOOR + 26], s);
      el.style.transform = `translate(${p[0].toFixed(1)}px, ${p[1].toFixed(1)}px) translate(-50%, 0)`;
      el.style.opacity = op[k].toFixed(3);
    }
  }

  window.__schedule = {
    disc: byWho.disc.map((b) => +(b.ts + b.fly).toFixed(3)),
    obs: byWho.obs.map((b) => +(b.ts + b.fly).toFixed(3)),
    ego: byWho.ego.map((b) => +(b.ts + b.fly).toFixed(3)),
    crownOn: CROWN_ON, crownOff: CROWN_OFF, crownLand: +(crownFall.t0 + crownFall.dur).toFixed(3),
    egoFall: Object.keys(EGO_REST).filter((k) => EGO_REST[k].to).map((k) => +(EGO_REST[k].t0 + 0.5).toFixed(3)),
    obsFall: falling.map((b) => +(b.fall.t0 + b.fall.dur).toFixed(3)),
    obsBody: 16.75, obsKnees: 16.3, flicker: FLICK.map((f) => f[0]),
  };
  window.__renderAt = renderAt;
  window.addEventListener('hf-seek', (e) => renderAt(e.detail.time));
  renderAt(0);
})();
