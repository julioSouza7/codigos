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

  // ================= ROTEIRO: "O VIOLÃO" (32 s) — índice de frustração =================
  const GT = 27.0, FL = C_FL;
  const FOCUS = [[0, null], [2.8, 'faz'], [7.0, 'pensa'], [11.0, 'faz'], [13.5, 'pensa'], [16.0, 'faz'], [18.5, 'pensa'], [21.0, 'faz'], [23.5, 'pensa'], [GT, null]];
  const dimOf = focusTrack(FOCUS);
  const DAYS = [[0, 1], [11.0, 15], [16.0, 30], [21.0, 60]];
  const dayOf = (t) => { let d = 1; for (const [a, n] of DAYS) if (t >= a) d = n; return d; };
  const CH = 520, SOFA = 905, STAND = [770, FL];

  // acordes (tempo, nome) — "!" = desafinado; "/d" = duração
  const STRUM_F = [[3.2, 'G!'], [4.6, 'C!/1.5'], [6.2, 'G!/0.7'], [11.2, 'G/0.9'], [12.0, 'C/1.3'], [16.2, 'G/0.75'], [16.9, 'D/0.75'], [17.6, 'Em/0.8'], [21.1, 'G/0.55'], [21.65, 'D/0.55'], [22.2, 'Em/0.55'], [22.75, 'C/0.7']];
  const STRUM_P = [[19.4, 'Em!/1.2']];
  const strumming = (list, t) => list.some(([a, n]) => t >= a - 0.05 && t < a + 0.25);

  // ---------- poses ----------
  const NECK = [CH + 84, FL - 104], HOLE = [CH + 34, FL - 86];
  const play = (list, fretMove) => cSeat(CH, 1, 0.25, 0.38, (t) => { const s = strumming(list, t) ? Math.sin(t * 40) * 10 : 0; const f = fretMove ? 6 * Math.sin(Math.floor(t * 1.6) * 2.1) : 0;
    return [[NECK[0] + f, NECK[1] + f * 0.4], [HOLE[0] + 2, HOLE[1] - 6 + s]]; }, { prefB: 'down' });
  const holdSad = cSeat(CH, 1, 0.35, 0.55, [[NECK[0], NECK[1]], [HOLE[0] - 4, HOLE[1] + 6]]);
  const sofaPhone = cSeat(SOFA, -1, 0.2, 0.38, (t) => [[SOFA - 26, FL - 160 + 2 * Math.sin(t * 5)], [SOFA - 18, FL - 150]]);
  const sofaLook = cSeat(SOFA, -1, 0.1, 0.15, [[SOFA - 30, FL - 100], [SOFA - 20, FL - 98]]);
  const chairPhone = cSeat(CH, 1, 0.2, 0.4, (t) => [[CH + 34, FL - 132 + 2 * Math.sin(t * 5)], [CH + 26, FL - 128]]);
  const fazKeys = [[0, play([], false)], [2.8, play(STRUM_F, false), 0.3], [5.4, cSeat(CH, 1, 0.3, 0.5, [[CH + 30, FL - 140], [HOLE[0], HOLE[1]]]), 0.2], [6.0, play(STRUM_F, false), 0.3],
    [11.0, play(STRUM_F, true), 0.3], [16.0, play(STRUM_F, true), 0.3], [21.0, play(STRUM_F, true), 0.3]];
  const fazState = (t) => seq(fazKeys, t);
  const pensaKeys = [[0, cSeat(CH, 1, 0.1, 0.1, [[CH + 40, FL - 98], [CH + 30, FL - 96]])],
    [7.2, cStandW(660, 1, 0.4, 0.4, [[720, FL - 40], [700, FL - 36]]), 0.01], [8.4, cStand(660, -1), 0.35], [8.7, chairPhone, 0.01],
    [13.3, sofaPhone, 0.01], [18.3, holdSad, 0.01], [19.2, play(STRUM_P, false), 0.25], [19.9, holdSad, 0.3], [21.0, sofaLook, 0.01]];
  const pensaState = (t) => seq(pensaKeys, t);
  const pensaHolds = (t) => t >= 18.3 && t < 21.0;

  // ---------- cenário ----------
  function drawBack(c, k, t, P) {
    cRoom(c, P, false, [330, 40, 150, 110]);
    // pôster de música
    c.fillStyle = '#2b2b30'; c.strokeStyle = OUT; c.lineWidth = 4; c.fillRect(560, 50, 90, 110); c.strokeRect(560, 50, 90, 110);
    c.fillStyle = rgb(PAL.ouro); c.font = '900 34px Montserrat'; c.textAlign = 'center'; c.fillText('♪', 605, 120);
    cChair(c, CH); cSofa(c, 830);
    // suporte do violão (do pensa demais, quando não está na mão)
    if (k === 'pensa' && t >= 7.9 && !pensaHolds(t)) guitarStand(c, t);
    cFloor(c, P);
  }
  function guitarBody(c, cx, cy, ang, s = 1, dusty = 0) {
    c.save(); c.translate(cx, cy); c.rotate(ang); c.scale(s, s); c.strokeStyle = OUT; c.lineWidth = 3.5;
    // braço
    c.fillStyle = '#4a3220'; c.fillRect(14, -5, 74, 10); c.strokeRect(14, -5, 74, 10); c.fillStyle = '#2b1d12'; c.fillRect(86, -8, 16, 16); c.strokeRect(86, -8, 16, 16);
    c.strokeStyle = 'rgba(230,220,200,0.6)'; c.lineWidth = 1; for (let i = 0; i < 6; i++) { c.beginPath(); c.moveTo(24 + i * 11, -5); c.lineTo(24 + i * 11, 5); c.stroke(); }
    // corpo
    c.fillStyle = mixC([201, 138, 74], [140, 130, 120], dusty).map(Math.round).reduce((a, v, i) => a + (i ? ',' : '') + v, 'rgb(') + ')';
    c.strokeStyle = OUT; c.lineWidth = 3.5; c.beginPath(); c.ellipse(-8, 0, 20, 17, 0, 0, Math.PI * 2); c.fill(); c.stroke(); c.beginPath(); c.ellipse(-34, 0, 24, 21, 0, 0, Math.PI * 2); c.fill(); c.stroke();
    c.fillStyle = '#1a120c'; c.beginPath(); c.arc(-14, 0, 6, 0, Math.PI * 2); c.fill();
    c.strokeStyle = 'rgba(240,230,210,0.7)'; c.lineWidth = 1; c.beginPath(); c.moveTo(-40, -2); c.lineTo(100, -2); c.moveTo(-40, 2); c.lineTo(100, 2); c.stroke();
    c.restore();
  }
  const dustOf = (t) => smooth(seg(t, 13.5, 26));
  function guitarStand(c, t) {
    const dusty = dustOf(t);
    c.strokeStyle = OUT; c.lineWidth = 5; c.beginPath(); c.moveTo(STAND[0] - 20, FL); c.lineTo(STAND[0], FL - 36); c.lineTo(STAND[0] + 20, FL); c.stroke();
    guitarBody(c, STAND[0] - 6, FL - 70, -1.62, 1, dusty);
    // poeira e teia
    for (let i = 0; i < Math.floor(24 * dusty); i++) { const a = (t * 0.15 + i * 0.37) % 1; c.fillStyle = `rgba(220,210,190,${0.6 * Math.sin(Math.PI * a)})`; c.beginPath(); c.arc(STAND[0] - 40 + (i * 23) % 80, FL - 150 + a * 120, 2, 0, Math.PI * 2); c.fill(); }
    if (t > 18) { const u = smooth(seg(t, 18, 20)); c.strokeStyle = `rgba(235,235,235,${0.7 * u})`; c.lineWidth = 1.5; const ox = STAND[0] - 10, oy = FL - 190;
      for (let r = 8; r <= 32; r += 8) { c.beginPath(); c.arc(ox, oy, r, 0.2, 1.4); c.stroke(); } for (let i = 0; i < 5; i++) { const a = 0.2 + i * 0.3; c.beginPath(); c.moveTo(ox, oy); c.lineTo(ox + Math.cos(a) * 34, oy + Math.sin(a) * 34); c.stroke(); } }
  }
  function drawFront(c, k, t, P, drawn) {
    const holding = k === 'faz' || pensaHolds(t);
    if (holding) { const lap = drawn.main.toP(drawn.main.R.legF[1]); guitarBody(c, HOLE[0] - 4, HOLE[1] + 2, -0.42, 1, k === 'pensa' ? dustOf(t) : 0); }
    if (k === 'faz' && t >= 11 && FOCUS.some(([a, w], i) => w === 'faz' && t >= a && t < (FOCUS[i + 1] || [99])[0])) cNotes(c, drawn.main.head[0] + 60, drawn.main.head[1] - 10, t);
    if (k === 'faz' && t >= 21.0 && t < 23.5) cNotes(c, drawn.main.head[0] + 130, drawn.main.head[1] + 10, t + 0.5, rgb(PAL.faz));
    if (k === 'pensa' && ((t >= 8.7 && t < 13.5) || (t >= 13.3 && t < 18.3))) cPhone(c, drawn.main.hand, t);
    // caixa chegando
    if (k === 'pensa' && t >= 7.3 && t < 8.6) { c.fillStyle = '#b08850'; c.strokeStyle = OUT; c.lineWidth = 3; c.beginPath(); c.moveTo(690, FL); c.lineTo(760, FL); c.lineTo(760, FL - 30); c.lineTo(690, FL - 30); c.closePath(); c.fill(); c.stroke(); }
  }
  function drawOverlay(c, k, t, P, drawn, toS) {
    if (t > GT) return;
    const d = dayOf(t), d0 = DAYS.find(([, n]) => n === d)[0]; cCorner(c, `DIA ${d}`, t, d > 1 ? d0 : null);
    // nome do acorde tocado
    const list = k === 'faz' ? STRUM_F : STRUM_P; const cur = list.filter(([a]) => t >= a && t < a + 0.6).pop();
    if (cur) { const nm = cur[1].split('/')[0], bad = nm.endsWith('!'); const hs = toS(drawn.main.head); cPill(c, clamp(hs[0] + 70, 300, 540), 56, bad ? `${nm.replace('!', '')} (DESAFINADO)` : `ACORDE ${nm}`, bad ? PAL.dor : PAL.ouro, null, 1 + 0.25 * Math.exp(-(t - cur[0]) * 10), true); }
    if (k === 'faz') cStack(c, t, [[3.0, '10 MIN POR DIA', PAL.faz, true], [11.2, () => `ACORDES: ${t < 16 ? 2 : t < 21 ? 4 : 6}`, PAL.faz, true], [21.1, '1ª MÚSICA', PAL.faz, true]]);
    else cStack(c, t, [[8.9, () => `VÍDEOS ASSISTIDOS: ${t < 13.5 ? 3 : t < 18.5 ? 12 : 20}`, PAL.pensa, null], [13.6, () => `DIAS SEM TOCAR: ${d - 1}`, PAL.dor, false]]);
  }

  const painFaz = (t) => 35 + spike(t, 3.2, 15, 1.2) + spike(t, 5.4, 25, 1.4) - 28 * smooth(seg(t, 7, 22)) + 2 * Math.sin(t * 2);
  const painPensa = (t) => Math.min(100, 25 + 3 * Math.sin(t * 2.3) + 40 * smooth(seg(t, 8, 26)) + spike(t, 19.4, 30, 0.8));

  const SCENE = {
    metricLabel: 'ÍNDICE DE FRUSTRAÇÃO', totalLabel: 'FRUSTRAÇÃO TOTAL', reportT: GT, noReport: true, dimOf, bubbleMaxX: 780,
    secsText: (n) => `${n}`,
    state: { faz: fazState, pensa: pensaState },
    drawBack, drawFront, drawOverlay,
    cam: (k, t) => (k === 'faz' ? cCam([[0, 560, 190, 1.2], [2.8, 580, 175, 1.65], [7.0, 600, 190, 1.15], [11.0, 580, 175, 1.6], [13.5, 600, 190, 1.15], [16.0, 580, 175, 1.6], [18.5, 600, 190, 1.15], [21.0, 590, 180, 1.5]])(t)
      : cCam([[0, 600, 190, 1.1], [7.0, 680, 190, 1.3], [8.6, 580, 175, 1.55], [11.0, 640, 190, 1.1], [13.4, 840, 175, 1.45, 0.01], [16.0, 760, 190, 1.1], [18.4, 600, 180, 1.55, 0.01], [21.0, 780, 190, 1.1, 0.01], [23.5, 820, 180, 1.3]])(t)),
    pain: { faz: painFaz, pensa: painPensa },
    bubbles: {
      faz: [
        { t0: 5.5, t1: 6.2, text: 'AI, O DEDO.', col: PAL.dor },
        { t0: 6.35, t1: 6.95, text: 'DE NOVO.', col: PAL.faz },
      ],
      pensa: [
        { t0: 8.9, t1: 10.4, text: 'VOU VER UNS VÍDEOS ANTES...' },
        { t0: 14.0, t1: 15.5, text: 'AMANHÃ EU TREINO.', col: PAL.pensa },
        { t0: 19.9, t1: 20.9, text: 'TÁ DESAFINADO...', col: PAL.dor },
        { t0: 24.0, t1: 25.6, text: 'NÃO TENHO DOM...' },
      ],
    },
    caps: [
      { s: -1, e: 2.8, lines: [[-1, [['APRENDER VIOLÃO.']]], [0.3, [['DOIS JEITOS DE '], ['COMEÇAR.', 'dor']]]] },
      { s: 2.9, e: 7.0, lines: [[2.9, [['QUEM '], ['FAZ', 'faz']]], [3.25, [['TOCA MAL. MAS TOCA.']]]] },
      { s: 7.05, e: 11.0, lines: [[7.05, [['QUEM '], ['PENSA DEMAIS', 'pensa']]], [7.45, [['ASSISTE TUTORIAL.']]]] },
      { s: 11.05, e: 13.5, lines: [[11.05, [['DIA 15:']]], [11.4, [['2 '], ['ACORDES.', 'faz']]]] },
      { s: 13.55, e: 16.0, lines: [[13.55, [['DIA 15:']]], [13.9, [['VIOLÃO NO '], ['CANTO.', 'dor']]]] },
      { s: 16.05, e: 18.5, lines: [[16.05, [['DIA 30:']]], [16.4, [['4 '], ['ACORDES.', 'faz']]]] },
      { s: 18.55, e: 21.0, lines: [[18.55, [['DIA 30:']]], [18.9, [['TENTA UMA '], ['VEZ.', 'dor']]]] },
      { s: 21.05, e: 23.5, lines: [[21.05, [['DIA 60:']]], [21.4, [['A PRIMEIRA '], ['MÚSICA.', 'faz']]]] },
      { s: 23.55, e: GT, lines: [[23.55, [['DIA 60:']]], [23.9, [['"NÃO TENHO '], ['DOM."', 'dor']]]] },
      { s: GT + 0.1, e: 99, center: true, lines: [[GT + 0.3, [['QUEM FAZ: '], ['TOCA 1 MÚSICA.', 'faz']]], [GT + 0.9, [['PENSA DEMAIS: '], ['0 ACORDES.', 'dor']]]] },
    ],
    sched: {
      noBips: true, noPops: true, music: 0.3, focusKeys: FOCUS,
      fx: [
        ...STRUM_F.map(([a, n]) => [a, 'strum', 0.9, 0.35, n]), [5.45, 'voz_faz/grunt4', 0.35, 0.35],
        [7.2, 'doorbell', 0.22, -0.35], [7.6, 'box', 0.35, -0.35], [7.95, 'foley/cloth_05', 0.3, -0.35], ...Array.from({ length: 5 }, (_, i) => [9.2 + i * 0.3, 'scroll', 0.1, -0.35]),
        ...Array.from({ length: 5 }, (_, i) => [14.0 + i * 0.3, 'scroll', 0.1, -0.35]), [15.0, 'exhale', 0.18, -0.35],
        [18.7, 'foley/cloth_04', 0.3, -0.35], ...STRUM_P.map(([a, n]) => [a, 'strum', 0.9, -0.35, n]), [20.0, 'exhale', 0.22, -0.35],
        [24.1, 'exhale', 0.22, -0.35], [25.0, 'voz_pensa/dor_14', 0.28, -0.35],
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
