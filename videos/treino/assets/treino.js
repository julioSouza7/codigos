// Motor "FAZ × PENSA DEMAIS" (@stick.obsessao) — 2D vetorial, função pura do tempo.
// head.js: utilidades + boneco de perfil + camada de movimento orgânico (caminhada, respiração, atraso, gestos).
(function () {
  const W = 1080, H = 1920;
  const cv = document.getElementById('gl');
  const ctx = cv.getContext('2d');

  // ---------- utilidades ----------
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const lerp = (a, b, u) => a + (b - a) * u;
  const seg = (t, a, b) => clamp((t - a) / (b - a));
  const smooth = (u) => { u = clamp(u); return u * u * (3 - 2 * u); };
  const easeIn = (u) => { u = clamp(u); return u * u; };
  const easeOut = (u) => 1 - Math.pow(1 - clamp(u), 3);
  const easeInOut = (u) => { u = clamp(u); return u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2; };
  // passa um pouco do ponto e assenta (dá peso às transições)
  const backE = (u) => { u = clamp(u); const v = u - 1; return 1 + 2.3 * v * v * v + 1.3 * v * v; };
  const noise = (t, s) => 0.5 * Math.sin(t * 1.13 + s * 1.7) + 0.3 * Math.sin(t * 2.31 + s * 3.1) + 0.2 * Math.sin(t * 4.57 + s * 0.3);
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const rgb = (c, k = 1, a = 1) => `rgba(${Math.round(c[0] * k)},${Math.round(c[1] * k)},${Math.round(c[2] * k)},${a})`;
  const mixC = (a, b, u) => [lerp(a[0], b[0], u), lerp(a[1], b[1], u), lerp(a[2], b[2], u)];
  const P2 = (a, b, u) => [lerp(a[0], b[0], u), lerp(a[1], b[1], u)];
  const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
  const v = (a, len) => [Math.sin(a) * len, Math.cos(a) * len];

  // ---------- boneco de perfil ----------
  const D = { headR: 31, limb: 26, torsoW: 30, ol: 5, torso: 100, uArm: 60, fArm: 56, thigh: 82, shin: 78, foot: 20 };
  const OUT = '#0e0e10';
  const WHITE = [247, 247, 245], BACK = [196, 196, 200];
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
  const PREF = { down: (c) => c[1] - 0.3 * c[0], back: (c) => -c[0] + 0.2 * c[1], fwd: (c) => c[0] - 0.2 * c[1], up: (c) => -c[1] };
  const legH = (th, sh) => D.thigh * Math.cos(th) + D.shin * Math.cos(sh);
  // quadril apoiado no chão pela perna mais esticada (o quadril sobe e desce sozinho na caminhada)
  const hipOn = (floor, L) => floor - D.limb * 0.5 - 2 - Math.max(legH(L.fT, L.fS), legH(L.bT, L.bS));

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
  function drawFigure(c, R, col, glow = 0.5, tint = 0) {
    if (col && glow > 0) {
      c.save(); c.globalAlpha = glow; c.filter = 'blur(9px)';
      for (const L of [R.legB, R.armB, R.legF, R.armF, [R.hip, R.sh]]) strokePts(c, L, D.limb + 22, rgb(col));
      disc(c, R.head, D.headR + 12, rgb(col)); c.restore();
    }
    const f = rgb(mixC(WHITE, col || WHITE, tint)), b = rgb(mixC(BACK, col || BACK, tint * 0.8));
    limb(c, R.legB, D.limb, b);
    limb(c, R.armB, D.limb, b);
    strokePts(c, [R.hip, R.sh], D.torsoW + 2 * D.ol, OUT);
    strokePts(c, R.legF, D.limb + 2 * D.ol, OUT);
    strokePts(c, [R.hip, R.sh], D.torsoW, f);
    strokePts(c, R.legF, D.limb, f);
    limb(c, R.armF, D.limb, f);
    disc(c, R.head, D.headR + D.ol, OUT); disc(c, R.head, D.headR, f);
  }

  // ---------- poses ----------
  const STAND_L = { fT: 0.05, fS: -0.02, bT: -0.08, bS: -0.05 };
  const CROUCH_L = { fT: 0.95, fS: -0.65, bT: 0.75, bS: -0.8 };
  const mixL = (a, b, u) => ({ fT: lerp(a.fT, b.fT, u), fS: lerp(a.fS, b.fS, u), bT: lerp(a.bT, b.bT, u), bS: lerp(a.bS, b.bS, u) });
  // pose em pé (x/mãos no referencial do boneco, olhando para a direita; face = -1 espelha)
  const pose = (x, floor, L, lean, head, hands, extra) => Object.assign({ x, hipY: hipOn(floor, L), ay: floor, lean, head, legs: L, hands, prefF: 'down', prefB: 'down', grounded: true, face: 1 }, extra || {});
  const handsDown = (x, hy) => [[x + 16, hy + 40], [x + 4, hy + 44]];
  const handsChin = (x, hy) => [[x + 40, hy - 128], [x + 22, hy - 58]];
  const handsHips = (x, hy) => [[x + 34, hy - 6], [x - 26, hy - 4]];
  const handsUp = (x, hy) => [[x + 30, hy - 250], [x - 4, hy - 248]];
  const mixPose = (a, b, u) => Object.assign({}, b, {
    x: lerp(a.x, b.x, u), hipY: lerp(a.hipY, b.hipY, u), ay: lerp(a.ay, b.ay, u), lean: lerp(a.lean, b.lean, u), head: lerp(a.head, b.head, u),
    legs: mixL(a.legs, b.legs, u), hands: [P2(a.hands[0], b.hands[0], u), P2(a.hands[1], b.hands[1], u)], face: lerp(a.face ?? 1, b.face ?? 1, clamp(u * 1.6)),
    prefF: u > 0.5 ? b.prefF : a.prefF, prefB: u > 0.5 ? b.prefB : a.prefB, grounded: u > 0.5 ? b.grounded : a.grounded, sq: lerp(a.sq || 0, b.sq || 0, u),
    armFree: lerp(a.armFree ?? 1, b.armFree ?? 1, u), gesture: u > 0.5 ? b.gesture : a.gesture });
  // trilha de poses: [[t, fn(t)->pose, transição?], ...]; transição com leve passada do ponto
  function seq(keys, t, trD = 0.42) {
    let i = 0; while (i < keys.length - 1 && t >= keys[i + 1][0]) i++;
    const cur = keys[i][1](t);
    const tr = keys[i][2] ?? trD;
    if (i > 0 && t - keys[i][0] < tr) return mixPose(keys[i - 1][1](t), cur, backE((t - keys[i][0]) / tr));
    return cur;
  }
  // caminhada/corrida: ângulos das pernas a partir da fase
  function walkL(ph, run) {
    const s = Math.sin(ph), c = Math.cos(ph);
    const A = lerp(0.42, 0.78, run), K = lerp(0.65, 1.35, run);
    const fT = A * s, bT = -A * s;
    return { fT, fS: fT - 0.06 - K * Math.pow(Math.max(0, c), 1.4), bT, bS: bT - 0.06 - K * Math.pow(Math.max(0, -c), 1.4) };
  }
  // camada de vida: qualquer função de pose vira um boneco que respira, anda de verdade e tem atraso nas mãos/cabeça
  function alive(fn, t, o = {}) {
    const s = o.seed || 0, en = o.energy ?? 1;
    const st = Object.assign({}, fn(t));
    if (st.raw) return st;
    const pa = fn(t - 0.05), pb = fn(t - 0.11);
    const face = Math.sign(st.face || 1) || 1;
    const rd = st.runDist !== undefined;   // correndo no lugar (cenário rolando)
    const vx = rd ? (st.runDist - pa.runDist) / 0.05 : ((st.x - pa.x) / 0.05) * face;
    const sp = Math.abs(vx);
    // atraso (follow-through): mãos e cabeça chegam um pouco depois do corpo
    st.hands = [P2(st.hands[0], pb.hands[0], 0.38), P2(st.hands[1], pb.hands[1], 0.45)];
    st.head = lerp(st.head, pb.head, 0.45) - (st.lean - pb.lean) * 0.6;
    const moving = st.noWalk ? 0 : smooth(clamp((sp - 20) / 110));
    if (moving > 0.001) {
      const run = st.run ?? clamp((sp - 260) / 260);
      const stride = lerp(150, 270, run);
      const ph = (((rd ? st.runDist : st.x * face)) / stride) * Math.PI * 2 + (st.phase0 || 0);
      st.legs = mixL(st.legs, walkL(ph, run), moving); st._ph = ph; st._mv = moving; st._run = run;
      const s1 = Math.sin(ph), hy = st.hipY;
      const swF = run > 0.3 ? [st.x + 34 - 46 * s1, hy - 58 + 10 * s1] : [st.x + 12 - 40 * s1, hy + 36 - 8 * Math.abs(s1)];
      const swB = run > 0.3 ? [st.x + 34 + 46 * s1, hy - 58 - 10 * s1] : [st.x + 12 + 40 * s1, hy + 36 - 8 * Math.abs(s1)];
      const fr = (st.armFree ?? 1) * moving;
      st.hands = [P2(st.hands[0], swF, fr), P2(st.hands[1], swB, fr)];
      if (run > 0.3) { st.prefF = 'down'; st.prefB = 'down'; }
      st.lean += moving * (0.06 + 0.22 * run);
      st.head -= moving * 0.1 * run;
    }
    if (st.grounded) st.hipY = hipOn(st.ay, st.legs) + (st.hipOff || 0);
    // respiração e micro-movimentos (somem quando anda)
    const calm = 1 - moving;
    const br = Math.sin(t * (2.1 + 0.4 * en) + s);
    st.hipY += calm * 1.6 * br * (st.grounded ? 1 : 0.6);
    st.lean += calm * (0.024 * noise(t * 0.8, s) + 0.014 * br) * en;
    st.head += 0.07 * noise(t * 0.55, s + 3) * en;
    st.hands = [add(st.hands[0], [4 * noise(t * 1.1, s + 7), 5 * noise(t * 1.3, s + 9) + 3 * br]), add(st.hands[1], [4 * noise(t * 1.05, s + 11), 5 * noise(t * 1.2, s + 13) + 3 * br])];
    // fala: cabeça acompanha o ritmo e a mão da frente gesticula
    const talk = o.talk ? o.talk(t) : 0;
    if (talk > 0) {
      st.head += talk * (0.08 * Math.sin(t * 12.5) - 0.05);
      if (st.gesture !== false) {
        const g = [st.x + 74 + 14 * Math.sin(t * 6.3), st.hipY - 118 + 16 * Math.sin(t * 8.7)];
        st.hands[0] = P2(st.hands[0], g, talk * 0.85 * (st.armFree ?? 1));
      }
    }
    return st;
  }

  const PAL = { faz: [79, 191, 106], pensa: [242, 162, 58], dor: [229, 72, 59], luz: [255, 214, 160], azul: [47, 155, 255], ouro: [232, 197, 71] };
  const SC = 0.6;
  // ponto do painel -> coordenada do boneco (que é desenhado em escala SC em torno do pé)
  const toRig = (st, Q) => { const f = st.face || 1, ax = st.ax ?? st.x; return [ax + (Q[0] - ax) / (SC * f), st.ay + (Q[1] - st.ay) / SC]; };
  const spike = (t, t0, a, k) => (t >= t0 ? a * Math.exp(-(t - t0) * k) : 0);
  const bump = (t, a, b, h) => h * smooth(seg(t, a, a + 0.4)) * (1 - smooth(seg(t, b - 0.2, b + 0.6)));

  // foco alternado: o painel de quem está agindo fica aceso e o outro escurece (e só ele tem som)
  const focusTrack = (keys, tr = 0.3) => (k, t) => {
    let cur = keys[0][1], prev = null, ts = -9;
    for (const [kt, who] of keys) if (t >= kt) { prev = cur; cur = who; ts = kt; }
    const dimOf = (w) => (w && w !== k ? 1 : 0);
    return lerp(dimOf(prev), dimOf(cur), smooth(seg(t, ts, ts + tr)));
  };

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

  // ================= ROTEIRO: "O TREINO" (32 s) — índice de culpa =================
  const GT = 27.0, FL = C_FL;
  const FOCUS = [[0, null], [2.8, 'faz'], [7.0, 'pensa'], [11.0, 'faz'], [13.5, 'pensa'], [16.0, 'faz'], [18.5, 'pensa'], [21.0, 'faz'], [23.5, 'pensa'], [GT, null]];
  const dimOf = focusTrack(FOCUS);
  const WEEKS = [[0, 1], [11.0, 4], [16.0, 8], [21.0, 12]];
  const weekOf = (t) => { let w = 1; for (const [a, n] of WEEKS) if (t >= a) w = n; return w; };
  const KG = (t) => (t < 11 ? 5 : t < 16 ? 10 : t < 21 ? 15 : 20);
  const GX = 520;                          // faz na academia
  const SOFA = 905;

  // ---------- 2 · FAZ: rosca com halteres, o peso sobe a cada fase ----------
  const CURL = [[3.2, 6.8], [11.2, 13.3], [16.2, 18.3], [21.2, 22.6]];
  const curling = (t) => CURL.some(([a, b]) => t >= a && t < b);
  const curlPose = (t) => { const per = 1.0, u = 0.5 - 0.5 * Math.cos(((t - 3.2) / per) * Math.PI * 2), alt = Math.floor((t - 3.2) / per) % 2;
    const down = (dx) => [GX + 12 + dx, FL - 88], up = (dx) => [GX + 36 + dx, FL - 182];
    return cStandW(GX, 1, 0.06 - 0.04 * u, -0.05, [alt ? down(6) : P2(down(6), up(6), u), alt ? P2(down(-6), up(-6), u) : down(-6)], { prefF: 'down', prefB: 'down' })(t); };
  const rest = (t) => cStandW(GX, 1, 0.08, 0.1, [[GX + 16, FL - 92], [GX + 4, FL - 90]])(t);
  const flex = (t) => cStandW(GX, 1, -0.05, -0.1, [[GX + 46, FL - 196], [GX - 34, FL - 196]], { prefF: 'down', prefB: 'down' })(t);
  const fazKeys = [[0, rest]];
  for (const [a, b] of CURL) fazKeys.push([a, curlPose, 0.3], [b, rest, 0.35]);
  fazKeys.push([22.7, flex, 0.35]);
  fazKeys.sort((p, q) => p[0] - q[0]);
  const fazState = (t) => seq(fazKeys, t);

  // ---------- 1 · PENSA DEMAIS: sofá, celular, suplemento, salgadinho ----------
  const sofaPhone = cSeat(SOFA, -1, 0.2, 0.38, (t) => [[SOFA - 26, FL - 160 + 2 * Math.sin(t * 5)], [SOFA - 18, FL - 150]]);
  const sofaChips = cSeat(SOFA, -1, 0.1, 0.1, (t) => { const u = 0.5 - 0.5 * Math.cos(t * 5.5); return [P2([SOFA - 40, FL - 100], [SOFA - 18, FL - 146], u), [SOFA - 44, FL - 98]]; });
  const sofaRelax = cSeat(SOFA, -1, -0.15, 0.0, [[SOFA + 22, FL - 158], [SOFA + 34, FL - 150]], { prefF: 'back', prefB: 'back' });
  const pushTry = (t) => { const X = 640, th = lerp(0.42, 0.08, smooth(seg(t, 19.6, 20.4))); const toe = [X - 135, FL - 10];
    const hip = [toe[0] + 160 * Math.cos(th), toe[1] - 160 * Math.sin(th)], sh = [hip[0] + 100 * Math.cos(th), hip[1] - 100 * Math.sin(th)], a = -(Math.PI / 2 - th);
    return { x: hip[0], ax: X, hipY: hip[1], ay: FL, lean: Math.PI / 2 - th, head: -0.35 + 0.4 * smooth(seg(t, 20.2, 20.6)), legs: { fT: a, fS: a, bT: a - 0.03, bS: a - 0.03 },
      hands: [[sh[0] + 6, FL - 13], [sh[0] - 6, FL - 13]], prefF: 'back', prefB: 'back', grounded: false, face: 1, gesture: false, noWalk: true }; };
  const pensaKeys = [
    [0, sofaRelax],
    [7.0, sofaPhone, 0.35],
    [13.5, cStandW(SOFA - 60, -1, 0.15, 0.2, [[SOFA - 120, FL - 120], [SOFA - 110, FL - 116]]), 0.4],   // recebe a caixa
    [14.6, sofaChips, 0.45],
    [18.6, cStand(700, -1), 0.4], [19.0, cWalk(700, 640, 19.0, 19.3, -1), 0.2], [19.3, pushTry, 0.4],
    [21.0, sofaRelax, 0.6],
    [23.5, cSeat(SOFA, -1, 0.35, 0.5, [[SOFA - 20, FL - 150], [SOFA - 6, FL - 146]]), 0.4],
  ];
  const pensaState = (t) => seq(pensaKeys, t);

  // ---------- cenários ----------
  function drawGym(c, k, t, P) {
    const h = P.h; c.fillStyle = '#1e1713'; c.fillRect(-300, -100, W + 600, h + 200);
    c.fillStyle = 'rgba(255,255,255,0.04)'; for (let x = -280; x < W + 300; x += 120) c.fillRect(x, -100, 60, FL + 100);
    // espelho
    c.fillStyle = '#3d4a4f'; c.strokeStyle = OUT; c.lineWidth = 5; c.fillRect(640, 30, 260, 180); c.strokeRect(640, 30, 260, 180);
    c.fillStyle = 'rgba(255,255,255,0.1)'; c.beginPath(); c.moveTo(660, 40); c.lineTo(710, 40); c.lineTo(670, 200); c.lineTo(660, 200); c.closePath(); c.fill();
    // suporte de halteres
    c.fillStyle = '#3a3a40'; c.fillRect(160, FL - 110, 220, 12); c.strokeRect(160, FL - 110, 220, 12); c.fillRect(160, FL - 60, 220, 12); c.strokeRect(160, FL - 60, 220, 12);
    for (const lx of [166, 366]) { c.fillRect(lx, FL - 110, 10, 110); c.strokeRect(lx, FL - 110, 10, 110); }
    for (let i = 0; i < 6; i++) { const r = 8 + i * 1.5; for (const yy of [FL - 120, FL - 70]) { c.fillStyle = '#1b1b1f'; c.beginPath(); c.arc(184 + i * 34, yy, r, 0, Math.PI * 2); c.fill(); c.stroke(); } }
    c.fillStyle = '#e8dcc6'; c.font = '900 34px Montserrat, sans-serif'; c.textAlign = 'center'; c.fillText('ACADEMIA', 270, 150);
    c.save(); c.globalCompositeOperation = 'lighter'; c.filter = 'blur(16px)'; const bg = c.createLinearGradient(0, 0, 0, h); bg.addColorStop(0, rgb(PAL.luz, 1, 0.22)); bg.addColorStop(1, rgb(PAL.luz, 1, 0.04));
    c.fillStyle = bg; c.beginPath(); c.moveTo(GX - 30, -20); c.lineTo(GX + 40, -20); c.lineTo(GX + 240, h); c.lineTo(GX - 220, h); c.closePath(); c.fill(); c.restore();
    cFloor(c, P, '#151515');
  }
  function drawLiving(c, k, t, P) {
    cRoom(c, P, false, [380, 40, 150, 110]);
    // calendário com as segundas riscadas
    c.fillStyle = '#efe6d6'; c.strokeStyle = OUT; c.lineWidth = 4; c.beginPath(); c.roundRect(600, 40, 150, 120, 6); c.fill(); c.stroke();
    c.fillStyle = rgb(PAL.dor); c.fillRect(600, 40, 150, 22); c.fillStyle = '#fff'; c.font = '800 14px "Space Mono", monospace'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('SEGUNDAS', 675, 51);
    const n = mondays(t); c.strokeStyle = rgb(PAL.dor); c.lineWidth = 3;
    for (let i = 0; i < 12; i++) { const x = 612 + (i % 4) * 34, y = 74 + Math.floor(i / 4) * 28; c.strokeStyle = 'rgba(0,0,0,0.25)'; c.lineWidth = 2; c.strokeRect(x, y, 26, 22);
      if (i < n) { c.strokeStyle = rgb(PAL.dor); c.lineWidth = 3; c.beginPath(); c.moveTo(x + 3, y + 3); c.lineTo(x + 23, y + 19); c.moveTo(x + 23, y + 3); c.lineTo(x + 3, y + 19); c.stroke(); } }
    // estante com o pote de suplemento (fechado)
    c.fillStyle = '#5a3c26'; c.strokeStyle = OUT; c.lineWidth = 4; c.fillRect(160, FL - 150, 150, 12); c.strokeRect(160, FL - 150, 150, 12);
    if (t > 14.4) { c.fillStyle = '#2b2b30'; c.beginPath(); c.roundRect(200, FL - 200, 44, 50, 6); c.fill(); c.stroke(); c.fillStyle = rgb(PAL.ouro); c.fillRect(204, FL - 186, 36, 16); c.fillStyle = '#111'; c.font = '800 9px Montserrat'; c.fillText('WHEY', 222, FL - 177); }
    cSofa(c, 820);
    cFloor(c, P);
  }
  const mondays = (t) => (t < 9.0 ? 0 : t < 13.5 ? 1 : t < 18.5 ? 4 : t < 23.5 ? 8 : 12);
  function drawBack(c, k, t, P) { if (k === 'faz') drawGym(c, k, t, P); else drawLiving(c, k, t, P); }
  // halter: placas maiores conforme o peso
  function dumbbell(c, p, kg) { const r = 6 + kg * 0.7; c.save(); c.translate(p[0], p[1]); c.strokeStyle = OUT; c.lineWidth = 3;
    c.fillStyle = '#9a9aa2'; c.fillRect(-16, -3, 32, 6); c.strokeRect(-16, -3, 32, 6);
    for (const s of [-1, 1]) { c.fillStyle = '#1b1b1f'; c.beginPath(); c.roundRect(s * 16 - (s > 0 ? 0 : 8), -r, 8, r * 2, 2); c.fill(); c.stroke(); } c.restore(); }
  function drawFront(c, k, t, P, drawn) {
    if (k === 'faz') {
      const R = drawn.main.R, toP = drawn.main.toP, kg = KG(t);
      dumbbell(c, toP(R.armB[2]), kg); dumbbell(c, toP(R.armF[2]), kg);
      if (curling(t) && t > 12) cSweat(c, drawn.main.head, t);
    } else {
      // celular
      if (t >= 7.2 && t < 13.5) cPhone(c, drawn.main.hand, t);
      // caixa do suplemento chegando
      if (t >= 13.5 && t < 14.6) { const hp = drawn.main.hand; c.fillStyle = '#b08850'; c.strokeStyle = OUT; c.lineWidth = 3; c.fillRect(hp[0] - 26, hp[1] - 34, 50, 38); c.strokeRect(hp[0] - 26, hp[1] - 34, 50, 38); }
      // salgadinho
      if (t >= 14.6 && t < 18.6) { const hb = drawn.main.toP(drawn.main.R.armB[2]); c.fillStyle = '#e5483b'; c.strokeStyle = OUT; c.lineWidth = 3; c.beginPath(); c.roundRect(hb[0] - 16, hb[1] - 26, 32, 40, 4); c.fill(); c.stroke();
        c.fillStyle = '#e8c547'; c.font = '900 9px Montserrat'; c.textAlign = 'center'; c.fillText('CHIPS', hb[0], hb[1] - 4); }
      if (t > 20.3 && t < 21.0) cSweat(c, drawn.main.head, t, 1);
    }
  }
  function drawOverlay(c, k, t, P, drawn, toS) {
    if (t > GT) return;
    const w = weekOf(t), w0 = WEEKS.find(([, n]) => n === w)[0];
    cCorner(c, `SEMANA ${w}`, t, w > 1 ? w0 : null);
    if (k === 'faz') {
      const tr = t < 3.2 ? 0 : t < 11 ? 1 : t < 16 ? 12 : t < 21 ? 24 : 36;
      cStack(c, t, [[3.2, () => `TREINOS: ${tr}`, PAL.faz, true], [3.2, () => `PESO: ${KG(t)} KG`, PAL.faz, null]]);
      if (curling(t)) { const hs = toS(drawn.main.hand); cPill(c, clamp(hs[0] + 40, 300, 760), 56, `${KG(t)} KG`, PAL.ouro, null, 1 + 0.2 * Math.exp(-Math.max(0, t - CURL.find(([a, b]) => t >= a && t < b)[0]) * 6), true); }
    } else {
      cStack(c, t, [[9.0, () => `SEGUNDAS ADIADAS: ${mondays(t)}`, PAL.dor, false], [14.4, 'SUPLEMENTO: FECHADO', PAL.pensa, false]]);
    }
  }

  // ---------- índice de culpa ----------
  const painFaz = (t) => 30 - 22 * smooth(seg(t, 3, 12)) + 3 * Math.sin(t * 2);
  const painPensa = (t) => Math.min(100, 30 + 4 * Math.sin(t * 2.3) + spike(t, 9.0, 18, 1) + 50 * smooth(seg(t, 9, 25)) + spike(t, 20.3, 20, 1.2));

  const SCENE = {
    metricLabel: 'ÍNDICE DE CULPA', totalLabel: 'CULPA TOTAL', reportT: GT, noReport: true, dimOf, bubbleMaxX: 780,
    secsText: (n) => `${n}`,
    state: { faz: fazState, pensa: pensaState },
    drawBack, drawFront, drawOverlay,
    cam: (k, t) => (k === 'faz' ? cCam([[0, 540, 200, 1.05], [2.8, 520, 175, 1.45], [7.0, 560, 200, 1.1], [11.0, 520, 170, 1.5], [13.5, 560, 200, 1.1], [16.0, 520, 168, 1.55], [18.5, 560, 200, 1.1], [21.0, 520, 168, 1.6]])(t)
      : cCam([[0, 640, 190, 1.05], [7.0, 860, 170, 1.55], [11.0, 760, 190, 1.1], [13.5, 820, 180, 1.4], [16.0, 760, 190, 1.1], [18.5, 640, 220, 1.4], [21.0, 760, 190, 1.1], [23.5, 780, 160, 1.4]])(t)),
    pain: { faz: painFaz, pensa: painPensa },
    bubbles: {
      faz: [
        { t0: 2.9, t1: 3.6, text: 'COMEÇA LEVE.', col: PAL.faz },
        { t0: 22.8, t1: 23.5, text: 'SEMANA 12.', col: PAL.faz },
      ],
      pensa: [
        { t0: 7.3, t1: 8.6, text: 'VOU ACHAR O TREINO PERFEITO...' },
        { t0: 9.0, t1: 10.6, text: 'SEGUNDA EU COMEÇO.', col: PAL.pensa },
        { t0: 13.6, t1: 14.5, text: 'AGORA VAI!', col: PAL.pensa },
        { t0: 15.2, t1: 16.0, text: 'SEGUNDA EU COMEÇO.', col: PAL.pensa },
        { t0: 20.5, t1: 21.0, text: 'AI...', col: PAL.dor },
        { t0: 23.7, t1: 25.2, text: 'SEGUNDA EU COMEÇO...' },
      ],
    },
    shake: (k, t) => (k === 'pensa' ? 5 * (t >= 20.3 ? Math.exp(-(t - 20.3) * 8) : 0) : 0),
    caps: [
      { s: -1, e: 2.8, lines: [[-1, [['ENTRAR EM FORMA.']]], [0.3, [['DOIS JEITOS DE '], ['COMEÇAR.', 'dor']]]] },
      { s: 2.9, e: 7.0, lines: [[2.9, [['QUEM '], ['FAZ', 'faz']]], [3.25, [['COMEÇA COM 5 KG.']]]] },
      { s: 7.05, e: 11.0, lines: [[7.05, [['QUEM '], ['PENSA DEMAIS', 'pensa']]], [7.45, [['PROCURA O TREINO PERFEITO.']]]] },
      { s: 11.05, e: 13.5, lines: [[11.05, [['SEMANA 4:']]], [11.4, [['10 KG.', 'faz']]]] },
      { s: 13.55, e: 16.0, lines: [[13.55, [['SEMANA 4:']]], [13.9, [['COMPROU '], ['SUPLEMENTO.', 'pensa']]]] },
      { s: 16.05, e: 18.5, lines: [[16.05, [['SEMANA 8:']]], [16.4, [['15 KG.', 'faz']]]] },
      { s: 18.55, e: 21.0, lines: [[18.55, [['SEMANA 8:']]], [18.9, [['UMA FLEXÃO. '], ['UMA.', 'dor']]]] },
      { s: 21.05, e: 23.5, lines: [[21.05, [['SEMANA 12:']]], [21.4, [['20 KG.', 'faz']]]] },
      { s: 23.55, e: GT, lines: [[23.55, [['SEMANA 12:']]], [23.9, [['"SEGUNDA EU '], ['COMEÇO."', 'dor']]]] },
      { s: GT + 0.1, e: 99, center: true, lines: [[GT + 0.3, [['QUEM FAZ: '], ['36 TREINOS.', 'faz']]], [GT + 0.9, [['PENSA DEMAIS: '], ['12 SEGUNDAS.', 'dor']]]] },
    ],
    sched: {
      noBips: true, noPops: true, music: 0.42, focusKeys: FOCUS,
      fx: [
        ...CURL.flatMap(([a, b], i) => [[a, 'clank', 0.18, 0.35], ...Array.from({ length: Math.floor((b - a) / 1.0) }, (_, j) => [a + 0.55 + j * 1.0, 'voz_faz/grunt' + (1 + ((i + j) % 3)), 0.14 + 0.03 * i, 0.35]), [b - 0.8, 'clank', 0.22, 0.35]]),
        // pensa
        ...Array.from({ length: 6 }, (_, i) => [7.4 + i * 0.25, 'scroll', 0.1, -0.35]), [9.1, 'exhale', 0.18, -0.35],
        [13.6, 'doorbell', 0.25, -0.35], [14.45, 'box', 0.4, -0.35], ...[14.9, 15.45, 16.0 - 0.3].map((x) => [x, 'crunch', 0.35, -0.35]),
        [18.7, 'foley/cloth_05', 0.3, -0.35], [19.4, 'foley/cloth_04', 0.3, -0.35], [20.3, 'thud', 0.2, -0.35], [20.4, 'voz_pensa/dor_10', 0.35, -0.35],
        [23.7, 'exhale', 0.22, -0.35], [24.5, 'foley/cloth_05', 0.25, -0.35],
      ],
    },
  };

  // ---------- tail.js: painéis, índice, relatório, legendas (usa SCENE definido pelo roteiro) ----------
  const PANELS = { pensa: { top: 470, h: 405 }, faz: { top: 885, h: 405 } };
  const GT1 = SCENE.reportT || 19.0, NS = 760;

  // série do índice pré-calculada
  const SERIES = {}, TOTAL = {};
  for (const k of ['faz', 'pensa']) {
    const arr = []; let acc = 0; const accArr = [];
    for (let i = 0; i <= NS; i++) { const tt = (i / NS) * GT1; const val = clamp(SCENE.pain[k](tt), 0, 100); arr.push(val); if (i) acc += val * (GT1 / NS); accArr.push(acc); }
    SERIES[k] = arr; TOTAL[k] = accArr;
  }
  const totalAt = (k, t) => TOTAL[k][Math.round(clamp(t / GT1) * NS)];
  const FINAL = { faz: TOTAL.faz[NS], pensa: TOTAL.pensa[NS] };
  const redSecs = (k) => { let n = 0; for (const val of SERIES[k]) if (val > 40) n++; return (n / NS) * GT1; };
  const SECS = { faz: redSecs('faz'), pensa: redSecs('pensa') };

  // quanto cada personagem está falando agora (0..1)
  const talkOf = (k, who) => (t) => {
    let m = 0;
    for (const b of SCENE.bubbles[k]) if ((b.who || 'main') === who && t > b.t0 - 0.05 && t < b.t1 + 0.05) m = Math.max(m, smooth(seg(t, b.t0 - 0.05, b.t0 + 0.15)) * (1 - smooth(seg(t, b.t1 - 0.2, b.t1 + 0.05))));
    return m;
  };
  const TALK = { faz: { main: talkOf('faz', 'main'), other: talkOf('faz', 'other') }, pensa: { main: talkOf('pensa', 'main'), other: talkOf('pensa', 'other') } };

  function drawActor(c, st, col, glow, tint) {
    const fx = st.ax ?? st.x, fy = st.ay;
    const f = clamp(st.face ?? 1, -1, 1), sq = st.sq || 0;
    c.save();
    c.translate(fx, fy); c.scale(SC * f * (1 + sq * 0.45), SC * (1 - sq)); c.translate(-fx, -fy);
    const R = rigP(st);
    if (st.behind) st.behind(c, R);
    drawFigure(c, R, col, glow, tint || 0);
    if (st.prop) st.prop(c, R);
    c.restore();
    const toP = (p) => [fx + (p[0] - fx) * SC * f, fy + (p[1] - fy) * SC];
    return { st, R, head: toP(R.head), hand: toP(R.armF[2]), toP };
  }
  function bubble(c, x, y, text, col, t0, t1, t, tailX) {
    if (t < t0 || t > t1) return;
    const a = smooth(seg(t, t0, t0 + 0.12)) * (1 - smooth(seg(t, t1 - 0.15, t1)));
    const sc = (1 + 0.4 * Math.exp(-(t - t0) * 12) * Math.cos((t - t0) * 28)) * lerp(0.6, 1, smooth(seg(t, t0, t0 + 0.1)));
    c.save(); c.globalAlpha = a; c.translate(x, y + 2 * Math.sin((t - t0) * 5)); c.scale(sc, sc);
    c.font = '800 28px "Space Mono", monospace'; const tw = c.measureText(text).width;
    const tx = clamp((tailX ?? x) - x, -tw / 2 + 4, tw / 2 - 16);
    c.beginPath(); c.roundRect(-tw / 2 - 18, -26, tw + 36, 52, 12); c.fillStyle = '#f4ead8'; c.fill(); c.lineWidth = 4; c.strokeStyle = OUT; c.stroke();
    c.beginPath(); c.moveTo(tx - 8, 24); c.lineTo(tx + 2 * Math.sign(tx || 1), 44); c.lineTo(tx + 12, 24); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = '#f4ead8'; c.fillRect(tx - 10, 20, 24, 6);
    c.fillStyle = col ? rgb(col) : '#1a120c'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(text, 0, 1);
    c.restore();
  }
  function drawMonitor(c, k, t, P) {
    const y0 = P.h - 66, hh = 56, x0 = 30, x1 = 925;
    c.fillStyle = 'rgba(10,7,5,0.82)'; c.fillRect(0, y0 - 8, W, hh + 16);
    c.strokeStyle = 'rgba(255,255,255,0.08)'; c.lineWidth = 1;
    for (let i = 1; i < 4; i++) { c.beginPath(); c.moveTo(x0, y0 + hh * i / 4); c.lineTo(x1, y0 + hh * i / 4); c.stroke(); }
    c.font = '700 18px "Space Mono", monospace'; c.textAlign = 'left'; c.textBaseline = 'top'; c.fillStyle = rgb(PAL.dor); c.fillText(SCENE.metricLabel, x0 + 4, y0 - 2);
    const n = Math.round(clamp(t / GT1) * NS);
    const gx0 = x0 + 250, gx1 = x1 - 170;
    c.lineWidth = 4; c.strokeStyle = rgb(PAL.dor); c.lineJoin = 'round';
    c.beginPath();
    for (let i = 0; i <= n; i++) { const x = lerp(gx0, gx1, i / NS), y = y0 + hh - (SERIES[k][i] / 100) * (hh - 6); if (i === 0) c.moveTo(x, y); else c.lineTo(x, y); }
    c.stroke();
    if (n > 0 && t < GT1) { const x = lerp(gx0, gx1, n / NS), y = y0 + hh - (SERIES[k][n] / 100) * (hh - 6); const pu = 1 + 0.4 * Math.max(0, Math.sin(t * 9)); c.save(); c.globalCompositeOperation = 'lighter'; disc(c, [x, y], 10 * pu, rgb(PAL.dor, 1, 0.6)); c.restore(); disc(c, [x, y], 5, '#fff'); }
    c.textAlign = 'right'; c.fillStyle = 'rgba(255,255,255,0.6)'; c.font = '700 16px "Space Mono", monospace'; c.fillText(SCENE.totalLabel, x1, y0 - 2);
    const val = SERIES[k][Math.min(NS, n)];
    const hot = val > 40 ? 1 : 0;
    c.fillStyle = hot ? rgb(mixC([255, 255, 255], PAL.dor, 0.6)) : '#fff'; c.font = '800 30px Montserrat, sans-serif'; c.fillText(String(Math.round(totalAt(k, Math.min(t, GT1)))), x1, y0 + 20);
  }
  function drawPanel(c, k, t) {
    const P = PANELS[k];
    c.save(); c.translate(0, P.top); c.beginPath(); c.rect(0, 0, W, P.h); c.clip();
    const sh = SCENE.shake ? SCENE.shake(k, t) : 0;
    c.translate(sh * Math.sin(t * 70), sh * Math.cos(t * 83));
    // câmera: foco definido pelo roteiro (SCENE.cam) + leve câmera de mão
    const cam = SCENE.cam ? SCENE.cam(k, t) : { x: 540, y: 200, z: 1 };
    const cz = cam.z * (1.03 + 0.012 * Math.sin(t * 0.37 + (k === 'faz' ? 1 : 0)));
    const cx = cam.x + 10 * noise(t * 0.25, k === 'faz' ? 2 : 5), cy = cam.y + 6 * noise(t * 0.3, k === 'faz' ? 8 : 1);
    const toS = (p) => [540 + (p[0] - cx) * cz, 200 + (p[1] - cy) * cz];
    c.save(); c.translate(540, 200); c.scale(cz, cz); c.translate(-cx, -cy);
    SCENE.drawBack(c, k, t, P);
    const others = (SCENE.others && SCENE.others[k]) || [];
    const drawn = {};
    for (const o of others) if (!o.front) drawn[o.id] = drawActor(c, alive(o.fn, t, { seed: o.seed, talk: TALK[k].other, energy: o.energy }), o.col, o.glow ?? 0.4, o.tint);
    const main = drawActor(c, alive(SCENE.state[k], t, { seed: k === 'faz' ? 2 : 9, talk: TALK[k].main, energy: SCENE.energy ? SCENE.energy(k, t) : 1 }), PAL[k], 0.5);
    drawn.main = main;
    for (const o of others) if (o.front) drawn[o.id] = drawActor(c, alive(o.fn, t, { seed: o.seed, talk: TALK[k].other }), o.col, o.glow ?? 0.4, o.tint);
    if (SCENE.drawFront) SCENE.drawFront(c, k, t, P, drawn);
    c.restore();
    for (const b of SCENE.bubbles[k]) {
      const sp = drawn[(b.who || 'main') === 'main' ? 'main' : (b.whoId || 'other')] || main;
      const hs = toS(sp.head);
      c.font = '800 28px "Space Mono", monospace'; const bw = c.measureText(b.text).width / 2 + 22;
      const bx = clamp(b.x ?? hs[0] + (b.dx ?? 60), 300 + bw, (SCENE.bubbleMaxX || 1000) - bw);
      bubble(c, bx, b.y ?? 50, b.text, b.col, b.t0, b.t1, t, hs[0]);
    }
    if (SCENE.drawOverlay) SCENE.drawOverlay(c, k, t, P, drawn, toS);
    drawMonitor(c, k, t, P);
    { const fd = SCENE.dimOf && t < GT1 ? SCENE.dimOf(k, t) : 0; if (fd > 0) { c.fillStyle = `rgba(8,5,3,${0.5 * fd})`; c.fillRect(0, 0, W, P.h); } }
    const nm = k === 'faz' ? '2 · FAZ' : '1 · PENSA DEMAIS';
    c.font = '700 22px "Space Mono", monospace'; const tw = c.measureText(nm).width;
    c.beginPath(); c.roundRect(18, 16, tw + 32, 38, 19); c.fillStyle = 'rgba(15,10,7,0.85)'; c.fill(); c.lineWidth = 3; c.strokeStyle = rgb(PAL[k]); c.stroke();
    c.fillStyle = rgb(PAL[k]); c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(nm, 34 + tw / 2, 36);
    const dim = smooth(seg(t, GT1, GT1 + 0.5));
    if (dim > 0) { c.fillStyle = `rgba(8,5,3,${0.78 * dim})`; c.fillRect(0, 0, W, P.h); }
    c.restore();
    c.lineWidth = 5; c.strokeStyle = OUT; c.strokeRect(0, P.top, W, P.h);
  }
  function drawReport(c, t) {
    if (SCENE.noReport) return;
    const out = SCENE.report2T ? smooth(seg(t, SCENE.report2T - 0.3, SCENE.report2T)) : 0;
    if (SCENE.drawReport2 && t >= SCENE.report2T - 0.3) SCENE.drawReport2(c, t, out);
    if (out >= 1) return;
    const u = easeOut(seg(t, GT1 + 0.2, GT1 + 0.8)) * (1 - out); if (u <= 0) return;
    const x0 = 40, x1 = 935, top = 520, h = 680;
    const sc = lerp(0.9, 1, backE(seg(t, GT1 + 0.2, GT1 + 0.75)));
    c.save(); c.globalAlpha = u; c.translate((x0 + x1) / 2, top + h / 2); c.scale(sc, sc); c.translate(-(x0 + x1) / 2, -(top + h / 2));
    c.beginPath(); c.roundRect(x0, top, x1 - x0, h, 26); c.fillStyle = 'rgba(22,15,10,0.96)'; c.fill(); c.lineWidth = 4; c.strokeStyle = rgb(PAL.luz, 0.8); c.stroke();
    c.font = '700 26px "Space Mono", monospace'; c.fillStyle = rgb(PAL.dor); c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(SCENE.metricLabel + ' · RESULTADO', (x0 + x1) / 2, top + 50);
    const rows = [['pensa', '1 · PENSA DEMAIS'], ['faz', '2 · FAZ']];
    rows.forEach(([k, nm], r) => {
      const ry = top + 110 + r * 290, gx0 = x0 + 40, gx1 = x1 - 40, gh = 130;
      c.textAlign = 'left'; c.fillStyle = rgb(PAL[k]); c.font = '700 24px "Space Mono", monospace'; c.fillText(nm, gx0, ry);
      c.strokeStyle = 'rgba(255,255,255,0.12)'; c.lineWidth = 1; c.strokeRect(gx0, ry + 24, gx1 - gx0, gh);
      const draw = easeInOut(seg(t, GT1 + 0.5 + r * 0.2, GT1 + 1.6 + r * 0.2));
      const n = Math.round(draw * NS);
      const path = () => { c.beginPath(); for (let i = 0; i <= n; i++) { const x = lerp(gx0, gx1, i / NS), y = ry + 24 + gh - (SERIES[k][i] / 100) * (gh - 8); if (i === 0) c.moveTo(x, y); else c.lineTo(x, y); } };
      path(); c.lineTo(lerp(gx0, gx1, n / NS), ry + 24 + gh); c.lineTo(gx0, ry + 24 + gh); c.closePath(); c.fillStyle = rgb(PAL.dor, 1, 0.28); c.fill();
      path(); c.lineWidth = 4; c.strokeStyle = rgb(PAL.dor); c.stroke();
      const cnt = Math.round(FINAL[k] * easeOut(seg(t, GT1 + 0.6 + r * 0.2, GT1 + 2.0 + r * 0.2)));
      c.textAlign = 'left'; c.fillStyle = 'rgba(255,255,255,0.65)'; c.font = '700 20px "Space Mono", monospace';
      c.fillText(SCENE.secsText(Math.max(1, Math.round(SECS[k])), k), gx0, ry + gh + 56);
      const pop = 1 + 0.25 * Math.exp(-Math.max(0, t - (GT1 + 2.0 + r * 0.2)) * 10) * (t > GT1 + 2.0 + r * 0.2 ? 1 : 0);
      c.save(); c.translate(gx1, ry + gh + 60); c.scale(pop, pop);
      c.textAlign = 'right'; c.fillStyle = '#fff'; c.font = '900 54px Montserrat, sans-serif'; c.fillText(String(cnt), 0, 0); c.restore();
      c.font = '700 16px "Space Mono", monospace'; c.fillStyle = 'rgba(255,255,255,0.55)'; c.textAlign = 'right'; c.fillText(SCENE.totalLabel, gx1, ry + gh + 18);
    });
    c.restore();
  }

  // ---------- legendas: palavras pulando ----------
  // frase final com os segundos de dor de cada um ({faz} / {pensa})
  const SW = SCENE.secsWord || ((n) => `${n} SEGUNDO${n > 1 ? 'S' : ''}`);
  const CAPS = SCENE.caps.map((cp) => Object.assign({}, cp, { lines: cp.lines.map(([ls, segs]) => [ls, segs.map(([txt, col]) => [txt.replace('{faz}', SW(Math.max(1, Math.round(SECS.faz)))).replace('{pensa}', SW(Math.max(1, Math.round(SECS.pensa)))), col])]) }));
  const capEl = document.getElementById('cap');
  const capLines = capEl ? [capEl.querySelector('.l1'), capEl.querySelector('.l2')] : [];
  const WSTEP = 0.11;
  const wordsOf = (segs) => { const out = []; for (const [txt, col] of segs) for (const w of txt.split(' ')) if (w) out.push([w, col || '']); return out; };
  function renderCaptions(t) {
    if (!capEl) return;
    const cap = CAPS.find((cc) => t >= cc.s && t < cc.e) || null;
    if (!cap) { capEl.style.opacity = '0'; return; }
    capEl.style.opacity = String(1 - smooth(seg(t, cap.e - 0.15, cap.e)));
    capEl.className = cap.big ? 'cap big' : cap.center ? 'cap center' : 'cap';
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

  function renderAt(t) {
    const c = ctx;
    c.setTransform(1, 0, 0, 1, 0, 0);
    const bg = c.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#0f0a07'); bg.addColorStop(0.5, '#1a120c'); bg.addColorStop(1, '#0a0705');
    c.fillStyle = bg; c.fillRect(0, 0, W, H);
    const k1 = t >= 1.5 ? Math.exp(-(t - 1.5) * 9) : 0;
    const z = lerp(1.06, 1, easeOut(seg(t, 1.5, 2.3)));
    c.setTransform(z, 0, 0, z, 540 - 540 * z + 12 * k1 * Math.sin(t * 70), 880 - 880 * z + 8 * k1 * Math.cos(t * 80));
    drawPanel(c, 'pensa', t);
    drawPanel(c, 'faz', t);
    c.setTransform(1, 0, 0, 1, 0, 0);
    drawReport(c, t);
    const top = c.createLinearGradient(0, 120, 0, 480); top.addColorStop(0, 'rgba(0,0,0,0.5)'); top.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = top; c.fillRect(0, 0, W, 480);
    renderCaptions(t);
  }

  const words = [];
  for (const cap of CAPS) for (const [ls, segs] of cap.lines) wordsOf(segs).forEach((w, j) => { const tt = ls + j * WSTEP; if (tt >= 0 && tt < cap.e) words.push(+tt.toFixed(3)); });
  // passos (cruzamentos da fase da caminhada) e falas, para os efeitos sonoros
  const steps = [];
  for (const k of ['faz', 'pensa']) {
    const fns = [[SCENE.state[k], 1], ...(((SCENE.others || {})[k]) || []).map((o) => [o.fn, 0.6])];
    for (const [fn, g] of fns) { let prev = null; for (let i = 0; i < GT1 * 120; i++) { const tt = i / 120; const st = alive(fn, tt); if (st._mv > 0.5 && prev !== null && Math.sign(Math.sin(st._ph)) !== Math.sign(Math.sin(prev))) steps.push([+tt.toFixed(3), k, +(st._run || 0).toFixed(2), g]); prev = st._mv > 0.5 ? st._ph : null; } }
  }
  const talks = []; for (const k of ['faz', 'pensa']) for (const b of SCENE.bubbles[k]) talks.push([b.t0, k]);
  window.__schedule = Object.assign({ slam: 1.5, report: GT1, words, steps, talks,
    painFaz: SERIES.faz.filter((_, i) => i % 19 === 0).map((x) => +x.toFixed(1)), painPensa: SERIES.pensa.filter((_, i) => i % 19 === 0).map((x) => +x.toFixed(1)) }, SCENE.sched || {});
  window.__renderAt = renderAt;
  window.addEventListener('hf-seek', (e) => renderAt(e.detail.time));
  renderAt(0);
})();
