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
  let C_UI = 1;            // escala da interface (1 = dois painéis; maior na tela única)
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
    c.save(); c.translate(W / C_UI - 210, 40); const pop = t0 !== null ? 1 + 0.3 * Math.exp(-Math.max(0, t - t0) * 8) : 1; c.scale(pop, pop);
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

  // ================= ROTEIRO: "CERA QUENTE" — índice de dor, com vozes reais =================
  const FL = 300;
  const X = 300;                              // quadril de quem está sentado
  const SIT_HY = FL - 118;                    // altura do quadril (referencial do boneco)
  const LEG = { fT: 1.35, fS: 1.5, bT: 1.38, bS: 0.05 };   // perna da frente esticada no banquinho
  const KICK = { fT: 1.62, fS: 1.2, bT: 1.38, bS: 0.05 };
  const RIP_F = 3.25, RIP_P = 16.6;           // puxões de uma vez
  // fração já descolada da fita (0 = colada, 1 = arrancada)
  const peelFaz = (t) => (t < RIP_F ? 0 : clamp((t - RIP_F) / 0.1));
  const PEELS = [[5.4, 5.8, 0, 0.08], [7.2, 9.4, 0.08, 0.3], [10.8, 12.8, 0.3, 0.5], [RIP_P, RIP_P + 0.1, 0.5, 1]];
  const peelPensa = (t) => { let p = 0; for (const [a, b, p0, p1] of PEELS) if (t >= a) p = lerp(p0, p1, t < b ? (b - a > 0.3 ? smooth(seg(t, a, b)) : seg(t, a, b)) : 1); return p; };

  // geometria da canela a partir do boneco (referencial do boneco)
  const shin = (st) => {
    const hip = [st.x, st.hipY], K = add(hip, v(st.legs.fT, D.thigh)), A = add(K, v(st.legs.fS, D.shin));
    const len = Math.hypot(A[0] - K[0], A[1] - K[1]), u = [(A[0] - K[0]) / len, (A[1] - K[1]) / len], n = [u[1], -u[0]];
    return { K, A, u, n, len };
  };
  const S0 = 0.16, S1 = 0.92;                 // trecho da canela coberto pela fita
  const stripPt = (sh, s) => add(add(sh.K, [sh.u[0] * sh.len * s, sh.u[1] * sh.len * s]), [sh.n[0] * 17, sh.n[1] * 17]);
  // ponto onde a fita ainda está grudada (a fita sai do tornozelo para o joelho)
  const peelPt = (sh, p) => stripPt(sh, lerp(S1, S0, p));

  // desenho da perna depilada: pelos, fita e vermelhidão
  function legProp(peel, held, ripT, hairOnStrip) {
    return (c, R) => {
      const K = R.legF[1], A = R.legF[2];
      const len = Math.hypot(A[0] - K[0], A[1] - K[1]), u = [(A[0] - K[0]) / len, (A[1] - K[1]) / len], n = [u[1], -u[0]];
      const sh = { K, A, u, n, len };
      const at = (s, off = 17) => add(add(K, [u[0] * len * s, u[1] * len * s]), [n[0] * off, n[1] * off]);
      // vermelhidão onde já arrancou
      if (peel > 0.01) {
        const red = ripT !== null ? 0.35 + 0.65 * Math.exp(-ripT * 0.5) : 0.6;
        c.save(); c.globalAlpha = red; strokePts(c, [at(S1, 6), at(lerp(S1, S0, peel), 6)], 16, rgb(PAL.dor)); c.restore();
      }
      // pelos fora da fita e embaixo da parte ainda colada (escondidos)
      c.strokeStyle = '#2a1d14'; c.lineWidth = 3; c.lineCap = 'round';
      const hair = (s) => { const b = at(s, 14), e = add(b, [n[0] * 10 + u[0] * 5, n[1] * 10 + u[1] * 5]); c.beginPath(); c.moveTo(b[0], b[1]); c.lineTo(e[0], e[1]); c.stroke(); };
      for (let s = 0.02; s < S0; s += 0.05) hair(s);
      for (let s = S1 + 0.02; s < 1; s += 0.05) hair(s);
      // coxa peluda também
      const H = R.legF[0];
      for (let s = 0.2; s < 0.95; s += 0.09) { const b = P2(H, K, s), e = add(b, [4, -11]); c.beginPath(); c.moveTo(b[0], b[1] - 12); c.lineTo(e[0], e[1] - 12); c.stroke(); }
      // fita: parte colada
      const P = peelPt(sh, peel);
      const tape = (pts) => { strokePts(c, pts, 22 + 8, OUT); strokePts(c, pts, 22, '#f1d9cf'); };
      if (peel < 0.999) tape([at(S0), P]);
      // parte solta: vai até a mão (segurando) ou fica caída
      const Lf = len * (S1 - S0) * peel;
      if (peel >= 0.999 && !held) {   // fita arrancada largada no chão
        const f0 = [X + 230, FL - 12], f1 = [X + 330, FL - 8];
        strokePts(c, [f0, f1], 30, OUT); strokePts(c, [f0, f1], 22, '#f1d9cf');
        c.strokeStyle = '#2a1d14'; c.lineWidth = 3; for (let i = 1; i < 8; i++) { const q = P2(f0, f1, i / 8); c.beginPath(); c.moveTo(q[0] - 4, q[1] - 2); c.lineTo(q[0] + 4, q[1] + 2); c.stroke(); }
        return;
      }
      if (peel > 0.01) {
        let end;
        if (held) end = R.armF[2];
        else end = add(P, [u[0] * Lf * 0.5 + n[0] * Lf * 0.1, Lf * 0.85]);
        const free = peel >= 0.999 && held ? [end, add(end, [-Lf * 0.25, Lf * 0.95])] : [P, P2(P, end, 0.5), end];
        if (peel >= 0.999 && held) tape(free); else tape(free);
        // pelos grudados na fita arrancada
        c.strokeStyle = '#2a1d14'; c.lineWidth = 3;
        const a0 = free[0], a1 = free[free.length - 1];
        for (let i = 1; i < 8 * peel; i++) { const q = P2(a0, a1, i / (8 * peel + 1)); c.beginPath(); c.moveTo(q[0] - 4, q[1]); c.lineTo(q[0] + 4, q[1] + 3); c.stroke(); }
      }
    };
  }

  // poses sentadas
  const sit = (o) => (t) => {
    const st = Object.assign({ x: X, hipY: SIT_HY, ay: FL, lean: 0.12, head: 0.12, legs: LEG, hands: [[X + 70, SIT_HY - 26], [X + 50, SIT_HY - 22]], prefF: 'down', prefB: 'down', grounded: false, face: 1, noWalk: true, gesture: false }, o.base || {});
    if (o.f) o.f(st, t);
    return st;
  };
  const sh0 = shin({ x: X, hipY: SIT_HY, legs: LEG });
  const handAt = (p, dy = -8) => add(peelPt(sh0, p), [6, dy]);

  // ---------- 2 · FAZ ----------
  const fazKeys = [
    [0, sit({})],
    [2.45, sit({ base: { lean: 0.42, head: 0.3 }, f: (st) => { st.hands = [handAt(0, -10), [X + 60, SIT_HY - 20]]; } }), 0.35],    // pega a ponta
    [3.0, sit({ base: { lean: 0.46, head: 0.25 }, f: (st, t) => { st.hands = [handAt(0, -2), [X + 60, SIT_HY - 20]]; st.hipY += 2 * Math.sin(t * 30); } }), 0.15],  // respira e trava
    [RIP_F, sit({ base: { lean: -0.32, head: -0.35, legs: KICK, prefF: 'up' }, f: (st) => { st.hands = [[X - 20, SIT_HY - 250], [X - 60, SIT_HY - 120]]; } }), 0.09],   // ARRANCA
    [RIP_F + 0.4, sit({ base: { lean: 0.12, head: 0.3, prefF: 'up' }, f: (st, t) => { st.hands = [[X + 34, SIT_HY - 190], [X + 40, SIT_HY - 40]]; } }), 0.3],  // careta, segura a fita
    [3.95, sit({ base: { lean: 0.6, head: 0.4 }, f: (st, t) => { st.hands = [add(stripPt(sh0, 0.6), [0, -22 + 8 * Math.sin(t * 10)]), add(stripPt(sh0, 0.45), [0, -14])]; } }), 0.35],  // assopra
    [5.3, sit({ base: { lean: 0.05, head: 0.0, prefF: 'up' }, f: (st) => { st.hands = [[X + 60, SIT_HY - 200], [X + 40, SIT_HY - 22]]; } }), 0.35],   // mostra a fita
    [7.0, sit({ base: { lean: -0.2, head: -0.05, prefF: 'back', prefB: 'back' }, f: (st) => { st.hands = [[X - 30, SIT_HY - 150], [X - 44, SIT_HY - 140]]; } }), 0.5],   // relaxa
    [12.0, sit({ base: { lean: 0.0, head: 0.05, prefF: 'up' }, f: (st) => { st.hands = [[X + 70, SIT_HY - 130], [X + 50, SIT_HY - 22]]; } }), 0.35],  // joinha
    [13.2, sit({ base: { lean: -0.2, head: -0.05, prefF: 'back', prefB: 'back' }, f: (st) => { st.hands = [[X - 30, SIT_HY - 150], [X - 44, SIT_HY - 140]]; } }), 0.5],
  ];
  const fazState = (t) => {
    const st = seq(fazKeys, t);
    const p = peelFaz(t), held = t >= RIP_F && t < 7.0;
    st.prop = legProp(p, held, t >= RIP_F ? t - RIP_F : null);
    if (t > 7.0) st.legs = Object.assign({}, st.legs, { bT: 1.38 + 0.12 * Math.sin(t * 2.4) });   // balança o pé, de boa
    if (t >= RIP_F && t < RIP_F + 0.25) st.sq = -0.06 * Math.sin(Math.PI * seg(t, RIP_F, RIP_F + 0.25));
    return st;
  };

  // ---------- 1 · PENSA DEMAIS ----------
  const tremble = (st, t, a = 1) => { st.hands = st.hands.map((h, i) => add(h, [a * 3 * Math.sin(t * 43 + i), a * 3 * Math.cos(t * 39 + i)])); };
  const pull = (base) => sit({ base: Object.assign({ lean: 0.5, head: 0.4 }, base || {}), f: (st, t) => { st.hands = [handAt(peelPensa(t), -6), [X + 40, SIT_HY - 40]]; tremble(st, t, 1.3); st.hipY += 2 * Math.sin(t * 27); } });
  const pensaKeys = [
    [0, sit({ f: (st, t) => { st.hands = [add(handAt(0, -60), [0, 6 * Math.sin(t * 2)]), [X + 50, SIT_HY - 22]]; } })],   // mão no ar, hesita
    [2.4, sit({ base: { lean: 0.2, head: 0.3 }, f: (st, t) => { st.hands = [[X + 36, SIT_HY - 128], [X + 22, SIT_HY - 60]]; } }), 0.4],   // mão no queixo
    [4.9, sit({ base: { lean: 0.42, head: 0.35 }, f: (st, t) => { st.hands = [handAt(0, -6), [X + 50, SIT_HY - 30]]; tremble(st, t); } }), 0.3],
    [5.4, pull(), 0.1],
    [5.8, sit({ base: { lean: -0.18, head: -0.2 }, f: (st) => { st.hands = [[X + 30, SIT_HY - 120], [X + 10, SIT_HY - 100]]; } }), 0.12],   // solta e recua
    [6.4, sit({ base: { lean: 0.1, head: 0.2 } }), 0.4],
    [6.8, sit({ base: { lean: 0.42, head: 0.35 }, f: (st, t) => { st.hands = [handAt(0.08, -6), [X + 50, SIT_HY - 30]]; tremble(st, t); } }), 0.35],
    [7.2, pull({ lean: 0.55, head: 0.5 }), 0.2],
    [9.4, sit({ base: { lean: -0.1, head: -0.1 }, f: (st, t) => { st.hands = [add(stripPt(sh0, 0.7), [10, -50 + 14 * Math.sin(t * 16)]), [X + 10, SIT_HY - 20]]; } }), 0.25],  // abana a perna
    [10.5, sit({ base: { lean: 0.45, head: 0.4 }, f: (st, t) => { st.hands = [handAt(0.3, -6), [X + 50, SIT_HY - 30]]; tremble(st, t); } }), 0.3],
    [10.8, pull({ lean: 0.58, head: 0.55 }), 0.2],
    [12.8, sit({ base: { lean: 0.55, head: 0.7 }, f: (st, t) => { st.hands = [[X + 44, SIT_HY - 140], [X + 30, SIT_HY - 132]]; st.hipY += 3 * Math.sin(t * 11); } }), 0.35],  // chora
    [14.9, sit({ base: { lean: 0.3, head: 0.15 }, f: (st) => { st.hands = [handAt(0.5, -10), [X + 50, SIT_HY - 30]]; } }), 0.35],   // decide
    [RIP_P - 0.25, sit({ base: { lean: 0.48, head: 0.3 }, f: (st, t) => { st.hands = [handAt(0.5, -2), [X + 50, SIT_HY - 30]]; st.hipY += 2 * Math.sin(t * 30); } }), 0.15],
    [RIP_P, sit({ base: { lean: -0.32, head: -0.35, legs: KICK, prefF: 'up' }, f: (st) => { st.hands = [[X - 20, SIT_HY - 250], [X - 60, SIT_HY - 120]]; } }), 0.09],
    [RIP_P + 0.5, sit({ base: { lean: -0.25, head: -0.5, prefF: 'up' }, f: (st, t) => { st.hands = [[X + 10 + 8 * Math.sin(t * 25), SIT_HY - 240], [X - 30, SIT_HY - 150]]; } }), 0.25],
    [17.6, sit({ base: { lean: -0.42, head: -0.4 }, f: (st) => { st.hands = [[X + 10, SIT_HY + 70], [X - 20, SIT_HY + 66]]; } }), 0.5],   // desaba
  ];
  const pensaState = (t) => {
    const st = seq(pensaKeys, t);
    const p = peelPensa(t);
    const held = (t >= 5.4 && t < 5.8) || (t >= 7.2 && t < 9.4) || (t >= 10.8 && t < 12.8) || (t >= RIP_P && t < 17.6);
    st.prop = legProp(p, held, t >= RIP_P ? t - RIP_P : null);
    if (t >= RIP_P && t < RIP_P + 0.25) st.sq = -0.06 * Math.sin(Math.PI * seg(t, RIP_P, RIP_P + 0.25));
    return st;
  };

  // ---------- cenário: banheiro sépia ----------
  function drawBack(c, k, t, P) {
    const h = P.h;
    const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#1b130e'); g.addColorStop(0.7, '#33251b'); g.addColorStop(1, '#241a13');
    c.fillStyle = g; c.fillRect(-60, -40, W + 120, h + 80);
    // azulejos
    c.strokeStyle = 'rgba(0,0,0,0.22)'; c.lineWidth = 2;
    for (let y = 120; y < FL; y += 46) { c.beginPath(); c.moveTo(-60, y); c.lineTo(W + 60, y); c.stroke(); }
    for (let y = 120, r = 0; y < FL; y += 46, r++) for (let x = -60 + (r % 2) * 30; x < W + 60; x += 60) { c.beginPath(); c.moveTo(x, y); c.lineTo(x, y + 46); c.stroke(); }
    // espelho
    c.fillStyle = '#3d4a4f'; c.strokeStyle = OUT; c.lineWidth = 5; c.beginPath(); c.roundRect(640, 40, 170, 120, 14); c.fill(); c.stroke();
    c.fillStyle = 'rgba(255,255,255,0.12)'; c.beginPath(); c.moveTo(660, 60); c.lineTo(700, 60); c.lineTo(670, 140); c.lineTo(660, 140); c.closePath(); c.fill();
    // holofote
    c.save(); c.globalCompositeOperation = 'lighter'; c.filter = 'blur(16px)';
    const bx = 380; const bg = c.createLinearGradient(0, 0, 0, h); bg.addColorStop(0, rgb(PAL.luz, 1, 0.22)); bg.addColorStop(1, rgb(PAL.luz, 1, 0.05));
    c.fillStyle = bg; c.beginPath(); c.moveTo(bx - 40, -20); c.lineTo(bx + 40, -20); c.lineTo(bx + 260, h); c.lineTo(bx - 240, h); c.closePath(); c.fill(); c.restore();
    c.fillStyle = '#e9cf9e'; c.beginPath(); c.ellipse(bx, 8, 46, 9, 0, 0, Math.PI * 2); c.fill();
    // mesinha com o pote de cera (fumegando)
    c.fillStyle = '#6b4a30'; c.strokeStyle = OUT; c.lineWidth = 4;
    c.fillRect(820, FL - 92, 140, 12); c.strokeRect(820, FL - 92, 140, 12); c.fillRect(884, FL - 80, 12, 80); c.strokeRect(884, FL - 80, 12, 80);
    c.fillStyle = '#c98a3a'; c.beginPath(); c.roundRect(856, FL - 132, 68, 40, 8); c.fill(); c.stroke();
    c.fillStyle = '#e8b04a'; c.fillRect(860, FL - 128, 60, 8);
    c.strokeStyle = 'rgba(240,230,220,0.45)'; c.lineWidth = 4;
    for (let i = 0; i < 3; i++) { const ph = t * 1.5 + i * 2.1; c.beginPath(); for (let j = 0; j < 12; j++) { const yy = FL - 140 - j * 6, xx = 872 + i * 18 + 6 * Math.sin(ph + j * 0.6); if (!j) c.moveTo(xx, yy); else c.lineTo(xx, yy); } c.stroke(); }
    // banco (sob o quadril) e banquinho (sob a canela)
    c.fillStyle = '#5a3c26'; c.strokeStyle = OUT; c.lineWidth = 4;
    c.fillRect(X - 50, FL - 66, 90, 14); c.strokeRect(X - 50, FL - 66, 90, 14);
    for (const lx of [X - 44, X + 24]) { c.fillRect(lx, FL - 52, 12, 52); c.strokeRect(lx, FL - 52, 12, 52); }
    c.fillRect(X + 60, FL - 46, 64, 12); c.strokeRect(X + 60, FL - 46, 64, 12);
    for (const lx of [X + 64, X + 108]) { c.fillRect(lx, FL - 34, 10, 34); c.strokeRect(lx, FL - 34, 10, 34); }
    // piso
    c.fillStyle = '#2a1d14'; c.fillRect(-60, FL, W + 120, h); c.strokeStyle = 'rgba(0,0,0,0.5)'; c.lineWidth = 4; c.beginPath(); c.moveTo(-60, FL); c.lineTo(W + 60, FL); c.stroke();
  }
  function drawFront(c, k, t, P, drawn) {
    // linhas de impacto no puxão
    const r = k === 'faz' ? RIP_F : RIP_P;
    const a = t - r;
    if (a >= 0 && a < 0.5) {
      const hp = drawn.main.toP(stripPt(sh0, 0.55));
      c.save(); c.globalAlpha = 1 - a / 0.5; c.strokeStyle = '#fff2d8'; c.lineWidth = 5;
      for (let i = 0; i < 10; i++) { const ang = (i / 10) * Math.PI * 2 + 0.3, r0 = 26 + 90 * easeOut(a / 0.5), r1 = r0 + 26; c.beginPath(); c.moveTo(hp[0] + Math.cos(ang) * r0, hp[1] + Math.sin(ang) * r0); c.lineTo(hp[0] + Math.cos(ang) * r1, hp[1] + Math.sin(ang) * r1); c.stroke(); }
      c.restore();
    }
    // lágrimas do pensa demais
    if (k === 'pensa' && t > 12.9 && t < 15.0) {
      const hd = drawn.main.head;
      for (let i = 0; i < 4; i++) { const q = ((t * 1.8 + i / 4) % 1); c.fillStyle = `rgba(170,215,255,${0.95 * (1 - q)})`; c.beginPath(); c.arc(hd[0] + 16 + (i % 2) * 10, hd[1] + 6 + q * 70, 5, 0, Math.PI * 2); c.fill(); }
    }
    // gotinhas de suor durante os puxões lentos
    if (k === 'pensa' && ((t > 7.2 && t < 9.6) || (t > 10.8 && t < 12.9))) {
      const hd = drawn.main.head;
      for (let i = 0; i < 3; i++) { const q = ((t * 1.3 + i / 3) % 1); c.fillStyle = `rgba(200,230,255,${0.9 * (1 - q)})`; c.beginPath(); c.arc(hd[0] - 22 - i * 6, hd[1] - 14 + q * 50, 5, 0, Math.PI * 2); c.fill(); }
    }
  }

  // ---------- índice de dor ----------
  const painFaz = (t) => 4 + spike(t, RIP_F, 100, 1.9) + (t > RIP_F ? 8 * Math.exp(-(t - RIP_F) * 0.5) : 0);
  const painPensa = (t) => {
    let p = 6 + 12 * smooth(seg(t, 2, 4));           // medo antes de começar
    p += spike(t, 5.4, 38, 2.2);
    p += 46 * smooth(seg(t, 7.2, 7.6)) * (1 - smooth(seg(t, 9.4, 10.2))) + 6 * Math.sin(t * 9) * (t > 7.2 && t < 9.4);
    p += 52 * smooth(seg(t, 10.8, 11.2)) * (1 - smooth(seg(t, 12.8, 13.8))) + 6 * Math.sin(t * 9) * (t > 10.8 && t < 12.8);
    p += 14 * smooth(seg(t, 9.4, 10.0)) + 10 * smooth(seg(t, 12.8, 13.6));   // ardência que fica
    p += spike(t, RIP_P, 90, 1.6);
    return Math.min(100, p);
  };

  const SCENE = {
    metricLabel: 'ÍNDICE DE DOR', totalLabel: 'DOR TOTAL', reportT: 19.0, noReport: true,
    secsWord: (n) => `${n} SEGUNDO${n > 1 ? 'S' : ''}`,
    secsText: (n) => `${n} SEGUNDO${n > 1 ? 'S' : ''} NO VERMELHO`,
    state: { faz: fazState, pensa: pensaState },
    drawBack, drawFront,
    pain: { faz: painFaz, pensa: painPensa },
    bubbles: {
      faz: [
        { t0: 2.5, t1: 3.15, text: 'BORA.', col: PAL.faz, y: 50 },
        { t0: RIP_F + 0.05, t1: RIP_F + 0.75, text: 'AI!', col: PAL.dor, y: 50 },
        { t0: 4.0, t1: 5.0, text: 'UFA...', y: 50 },
        { t0: 5.4, t1: 6.6, text: 'PRONTO.', col: PAL.faz, y: 50 },
        { t0: 12.0, t1: 13.2, text: 'LISINHA.', col: PAL.faz, y: 50 },
      ],
      pensa: [
        { t0: 2.5, t1: 3.9, text: 'E SE DOER MUITO?', y: 50 },
        { t0: 5.45, t1: 6.3, text: 'AI!', col: PAL.dor, y: 50 },
        { t0: 6.4, t1: 7.15, text: 'VOU DEVAGARINHO...', y: 50 },
        { t0: 7.3, t1: 9.3, text: 'AI AI AI AI AI', col: PAL.dor, y: 50 },
        { t0: 10.9, t1: 12.7, text: 'UM PELO POR VEZ...', col: PAL.dor, y: 50 },
        { t0: 13.0, t1: 14.7, text: 'NÃO AGUENTO...', y: 50 },
        { t0: 14.95, t1: RIP_P - 0.05, text: 'VAI DE UMA VEZ.', col: PAL.pensa, y: 50 },
        { t0: RIP_P + 0.05, t1: RIP_P + 1.2, text: 'AI... AI...', col: PAL.dor, y: 50 },
        { t0: 18.0, t1: 18.95, text: 'DOEU EM DOBRO.', col: PAL.dor, y: 50, dx: 200 },
      ],
    },
    shake: (k, t) => { const r = k === 'faz' ? RIP_F : RIP_P; return 9 * (t >= r ? Math.exp(-(t - r) * 7) : 0) + (k === 'pensa' && ((t > 7.2 && t < 9.4) || (t > 10.8 && t < 12.8)) ? 1.2 : 0); },
    energy: (k, t) => (k === 'pensa' && t > 4.9 && t < 16.6 ? 1.6 : 1),
    caps: [
      { s: -1, e: 2.85, lines: [[-1, [['CERA QUENTE NA PERNA.']]], [0.3, [['DOIS JEITOS DE '], ['PUXAR.', 'dor']]]] },
      { s: 3.0, e: 5.5, lines: [[3.0, [['QUEM '], ['FAZ', 'faz']]], [3.3, [['PUXA DE UMA VEZ.']]]] },
      { s: 5.6, e: 8.0, lines: [[5.6, [['DÓI.']]], [5.95, [['MAS SÓ POR '], ['1 SEGUNDO.', 'faz']]]] },
      { s: 8.1, e: 10.5, lines: [[8.1, [['QUEM '], ['PENSA DEMAIS', 'pensa']]], [8.5, [['PUXA DEVAGARINHO.']]]] },
      { s: 10.6, e: 13.2, lines: [[10.6, [['UM PELO']]], [10.95, [['DE CADA '], ['VEZ.', 'dor']]]] },
      { s: 13.3, e: 15.8, lines: [[13.3, [['E A DOR']]], [13.7, [['NÃO ACABA '], ['NUNCA.', 'dor']]]] },
      { s: 15.9, e: 18.9, lines: [[15.9, [['NO FIM, PUXOU']]], [16.3, [['DE UMA VEZ '], ['IGUAL.', 'dor']]]] },
      { s: 19.1, e: 99, center: true, lines: [[19.3, [['QUEM FAZ: '], ['{faz} DE DOR.', 'faz']]], [19.9, [['PENSA DEMAIS: '], ['{pensa}.', 'dor']]]] },
    ],
    sched: {
      noBips: true, music: 0.42,
      fx: [
        // 2 · FAZ (direita): tudo entre 2,4 s e 4,9 s
        [2.45, 'foley/cloth_04', 0.45, 0.35], [2.95, 'breath_in', 0.2, 0.35],
        [RIP_F - 0.02, 'foley/velcro_03', 0.8, 0.35, 1.25], [RIP_F, 'foley/papel_rasgando', 0.35, 0.35, 1.3],
        [RIP_F + 0.12, 'voz_faz/grunt5', 0.55, 0.35], [RIP_F + 0.08, 'beep', 0.05, 0.35],
        [3.95, 'exhale', 0.28, 0.35],
        // 1 · PENSA DEMAIS (esquerda): só começa depois do gemido do faz
        [5.0, 'breath_in', 0.2, -0.35],
        [5.4, 'slowrip', 0.45, -0.35, 0.4], [5.47, 'voz_pensa/dor_10', 0.5, -0.35], [5.85, 'foley/cloth_04', 0.3, -0.35],
        [6.8, 'breath_in', 0.22, -0.35],
        [7.2, 'slowrip', 0.5, -0.35, 2.2], [7.35, 'voz_pensa/dor_02', 0.45, -0.35], [8.1, 'voz_pensa/dor_14', 0.45, -0.35], [8.9, 'voz_pensa/dor_10', 0.45, -0.35, 1.05],
        [9.5, 'fan', 0.22, -0.35], [9.75, 'voz_pensa/dor_15', 0.4, -0.35],
        [10.55, 'breath_in', 0.22, -0.35],
        [10.8, 'slowrip', 0.55, -0.35, 2.0], [11.0, 'voz_pensa/dor_02', 0.45, -0.35, 0.95], [11.8, 'voz_pensa/dor_14', 0.45, -0.35, 1.04], [12.45, 'voz_pensa/dor_10', 0.45, -0.35],
        [13.3, 'voz_pensa/dor_15', 0.35, -0.35, 1.08], [14.05, 'voz_pensa/dor_02', 0.32, -0.35, 1.12],
        [16.1, 'breath_in', 0.25, -0.35],
        [RIP_P - 0.02, 'foley/velcro_03', 0.8, -0.35, 1.25], [RIP_P, 'foley/papel_rasgando', 0.35, -0.35, 1.3],
        [RIP_P + 0.12, 'voz_pensa/dor_10', 0.55, -0.35], [RIP_P + 0.75, 'voz_pensa/dor_02', 0.45, -0.35, 1.05],
        [17.65, 'foley/cloth_02', 0.3, -0.35], [17.95, 'exhale', 0.28, -0.35],
      ],
      heartReal: [[6.6, 16.5, -0.35]], noPops: true, noOverlap: true,
    },
  };

  // ===== versão tela única com gancho (≈18 s) =====
  SCENE.edit = [
    { k: 'pensa', a: 16.45, b: 17.7, sp: 1, cap: [[['ESSA CERA DOEU']], [['{pensa}.', 'dor']]] },
    { k: 'pensa', a: 17.7, b: 2.0, sp: -26, cap: [[['COMO ELE']], [['CHEGOU AQUI?', 'pensa']]] },
    { k: 'faz', a: 2.4, b: 5.0, sp: 1.1, cap: [[['QUEM '], ['FAZ', 'faz']], [['PUXA DE UMA VEZ.']]] },
    { k: 'pensa', a: 4.9, b: 6.4, sp: 1, cap: [[['QUEM '], ['PENSA DEMAIS', 'pensa']], [['PUXA DEVAGARINHO.']]] },
    { k: 'pensa', a: 7.2, b: 9.6, sp: 1.4 },
    { k: 'pensa', a: 10.8, b: 12.8, sp: 1.6, cap: [[['UM PELO']], [['DE CADA '], ['VEZ.', 'dor']]] },
    { k: 'faz', a: 11.6, b: 13.0, sp: 1, cap: [[['ENQUANTO ISSO...']], [['PRONTO HÁ '], ['8 SEGUNDOS.', 'faz']]] },
    { k: 'pensa', a: 13.0, b: 14.6, sp: 1.6, cap: [[['E A DOR']], [['NÃO '], ['ACABA.', 'dor']]] },
    { k: 'pensa', a: 14.9, b: 17.9, sp: 1, cap: [[['NO FIM, PUXOU']], [['DE UMA VEZ '], ['IGUAL.', 'dor']]] },
    { k: 'pensa', a: 17.9, dur: 3.6, sp: 0, end: true, cap: [[['QUEM FAZ: '], ['{faz} DE DOR.', 'faz']], [['PENSA DEMAIS: '], ['{pensa}.', 'dor']]] },
  ];

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
  function bubble(c, x, y, text, col, t0, t1, t, tailX, s = 1) {
    if (t < t0 || t > t1) return;
    const a = smooth(seg(t, t0, t0 + 0.12)) * (1 - smooth(seg(t, t1 - 0.15, t1)));
    const sc = (1 + 0.4 * Math.exp(-(t - t0) * 12) * Math.cos((t - t0) * 28)) * lerp(0.6, 1, smooth(seg(t, t0, t0 + 0.1)));
    c.save(); c.globalAlpha = a; c.translate(x, y + 2 * Math.sin((t - t0) * 5)); c.scale(sc * s, sc * s);
    c.font = '800 28px "Space Mono", monospace'; const tw = c.measureText(text).width;
    const tx = clamp((tailX ?? x) - x, -tw / 2 + 4, tw / 2 - 16);
    c.beginPath(); c.roundRect(-tw / 2 - 18, -26, tw + 36, 52, 12); c.fillStyle = '#f4ead8'; c.fill(); c.lineWidth = 4; c.strokeStyle = OUT; c.stroke();
    c.beginPath(); c.moveTo(tx - 8, 24); c.lineTo(tx + 2 * Math.sign(tx || 1), 44); c.lineTo(tx + 12, 24); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = '#f4ead8'; c.fillRect(tx - 10, 20, 24, 6);
    c.fillStyle = col ? rgb(col) : '#1a120c'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(text, 0, 1);
    c.restore();
  }
  function drawMonitor(c, k, t, P) {
    const y0 = P.h - 66, hh = 56, x0 = 30, x1 = Math.min(925, W / C_UI - 140);
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
  // L = layout: dois painéis (padrão) ou tela única (top 470, h 820, interface e boneco maiores)
  function drawPanel(c, k, t, L, endDim) {
    const P = L ? { top: L.top, h: L.h } : PANELS[k]; const ui = L ? L.ui : 1, bz = L ? L.bz : 1, sy = L ? L.sy : 200;
    c.save(); c.translate(0, P.top); c.beginPath(); c.rect(0, 0, W, P.h); c.clip();
    const sh = SCENE.shake ? SCENE.shake(k, t) : 0;
    c.translate(sh * Math.sin(t * 70), sh * Math.cos(t * 83));
    // câmera: foco definido pelo roteiro (SCENE.cam) + leve câmera de mão
    let cam = SCENE.cam ? SCENE.cam(k, t) : { x: 540, y: 200, z: 1 };
    // tela única: o boneco já é 2× maior, então o zoom do roteiro entra só em parte; sem câmera, segue o personagem
    if (L) cam = SCENE.cam ? { x: clamp(cam.x, 400, 680), y: clamp(cam.y, 170, 215), z: 1 + (cam.z - 1) * 0.35 } : { x: clamp(SCENE.state[k](t).x + 100, 400, 680), y: 190, z: 1 };
    const cz = cam.z * (1.03 + 0.012 * Math.sin(t * 0.37 + (k === 'faz' ? 1 : 0)));
    const cx = cam.x + 10 * noise(t * 0.25, k === 'faz' ? 2 : 5), cy = cam.y + 6 * noise(t * 0.3, k === 'faz' ? 8 : 1);
    const toS = (p) => [540 + (p[0] - cx) * cz * bz, sy + (p[1] - cy) * cz * bz];
    c.save(); c.translate(540, sy); c.scale(cz * bz, cz * bz); c.translate(-cx, -cy);
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
      c.font = '800 28px "Space Mono", monospace'; const bw = (c.measureText(b.text).width / 2 + 22) * ui;
      const bx = clamp(b.x !== undefined ? b.x * ui : hs[0] + (b.dx ?? 60) * ui, 300 * ui + bw, (L ? 930 : (SCENE.bubbleMaxX || 1000)) - bw);
      bubble(c, bx, L ? 138 : (b.y ?? 50), b.text, b.col, b.t0, b.t1, t, hs[0], ui);
    }
    c.save(); c.scale(ui, ui); const PU = { top: P.top, h: P.h / ui };
    if (SCENE.drawOverlay) SCENE.drawOverlay(c, k, t, PU, drawn, (p) => toS(p).map((v) => v / ui));
    drawMonitor(c, k, t, PU);
    c.restore();
    { const fd = !L && SCENE.dimOf && t < GT1 ? SCENE.dimOf(k, t) : 0; if (fd > 0) { c.fillStyle = `rgba(8,5,3,${0.5 * fd})`; c.fillRect(0, 0, W, P.h); } }
    const nm = k === 'faz' ? '2 · FAZ' : '1 · PENSA DEMAIS';
    c.save(); c.scale(ui, ui);
    c.font = '700 22px "Space Mono", monospace'; const tw = c.measureText(nm).width;
    c.beginPath(); c.roundRect(18, 16, tw + 32, 38, 19); c.fillStyle = 'rgba(15,10,7,0.85)'; c.fill(); c.lineWidth = 3; c.strokeStyle = rgb(PAL[k]); c.stroke();
    c.fillStyle = rgb(PAL[k]); c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(nm, 34 + tw / 2, 36);
    c.restore();
    if (L && L.after) L.after(c, P);
    const dim = L ? (endDim || 0) : smooth(seg(t, GT1, GT1 + 0.5));
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


  // ---------- TELA ÚNICA: lista de cortes (SCENE.edit) ----------
  // cada corte: { k, a, b, sp } (sp<0 = rebobinando) ou { k, a, dur, sp: 0, end: true } (quadro final parado)
  const EDIT = SCENE.edit || null;
  const LSINGLE = { top: 470, h: 820, ui: 1.4, bz: 2.0, sy: 400 };
  let ETOT = 0;
  if (EDIT) {
    C_UI = LSINGLE.ui;
    for (const cl of EDIT) { cl.dur = cl.dur ?? Math.abs((cl.b - cl.a) / cl.sp); cl.T0 = ETOT; ETOT += cl.dur; }
    // legendas a partir dos cortes: cap = [linha1, linha2]; vale até o próximo corte que tiver legenda
    const caps = [];
    EDIT.forEach((cl, i) => { if (!cl.cap) return; let e = ETOT + 99; for (let j = i + 1; j < EDIT.length; j++) if (EDIT[j].cap) { e = EDIT[j].T0; break; }
      caps.push({ s: cl.T0 - (i === 0 ? 1 : 0), e: cl.end ? 999 : e, center: !!cl.end, lines: [[cl.T0 + (i === 0 ? -1 : 0.02) + (cl.end ? 0.2 : 0), cl.cap[0]], [cl.T0 + (i === 0 ? 0 : 0.32) + (cl.end ? 0.6 : 0), cl.cap[1]]] }); });
    SCENE.caps = caps;
  }
  const mapT = (T) => { let i = 0; while (i < EDIT.length - 1 && T >= EDIT[i + 1].T0) i++; const cl = EDIT[i], u = T - cl.T0; return { cl, i, u, k: cl.k, t: cl.sp === 0 ? cl.a : cl.a + u * cl.sp }; };
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

  function renderSingle(T) {
    const c = ctx, m = mapT(T);
    c.setTransform(1, 0, 0, 1, 0, 0);
    const bg = c.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#0f0a07'); bg.addColorStop(0.5, '#1a120c'); bg.addColorStop(1, '#0a0705');
    c.fillStyle = bg; c.fillRect(0, 0, W, H);
    const prev = m.i > 0 ? EDIT[m.i - 1] : null;
    const punch = m.i === 0 || (prev && prev.k !== m.k) ? 0.05 * Math.exp(-m.u * 9) : 0;
    const z = 1 + punch;
    c.setTransform(z, 0, 0, z, 540 - 540 * z, 880 - 880 * z);
    const L = Object.assign({}, LSINGLE, { after: (cc, P) => {
      if (m.cl.sp < 0) {   // rebobinando: linhas de fita, tom frio e ícone
        cc.fillStyle = 'rgba(120,150,200,0.16)'; cc.fillRect(0, 0, W, P.h);
        for (let i = 0; i < 9; i++) { const y = ((i * 97 + T * 1900) % P.h); cc.fillStyle = 'rgba(255,255,255,0.22)'; cc.fillRect(0, y, W, 3 + (i % 3) * 2); }
        cc.save(); cc.translate(540, P.h / 2); cc.fillStyle = 'rgba(15,10,7,0.8)'; cc.beginPath(); cc.roundRect(-110, -52, 220, 104, 20); cc.fill();
        cc.fillStyle = '#fff'; for (const dx of [-36, 14]) { cc.beginPath(); cc.moveTo(dx + 30, -28); cc.lineTo(dx - 14, 0); cc.lineTo(dx + 30, 28); cc.closePath(); cc.fill(); } cc.restore();
      }
      if (prev && prev.k !== m.k && m.u < 0.14) { cc.fillStyle = `rgba(255,245,230,${0.7 * (1 - m.u / 0.14)})`; cc.fillRect(0, 0, W, P.h); }
    } });
    drawPanel(c, m.k, m.t, L, m.cl.end ? 0.8 * smooth(seg(m.u, 0, 0.5)) : 0);
    c.setTransform(1, 0, 0, 1, 0, 0);
    const top = c.createLinearGradient(0, 120, 0, 480); top.addColorStop(0, 'rgba(0,0,0,0.5)'); top.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = top; c.fillRect(0, 0, W, 480);
    renderCaptions(T);
  }
  function renderAt(t) {
    if (EDIT) return renderSingle(t);
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
  if (EDIT) {
    // remapeia os efeitos para a linha do tempo dos cortes; cada som é cortado no fim do seu trecho
    const S0 = window.__schedule, fx = [], st2 = [], hr = [];
    const side = (pan, k) => (pan === 0 ? true : k === 'faz' ? pan > 0 : pan < 0);
    for (const cl of EDIT) {
      const until = +(cl.T0 + cl.dur).toFixed(3);
      if (cl.sp < 0) { fx.push([cl.T0, 'rewind', 0.4, 0, cl.dur, until + 0.05]); continue; }
      if (cl.sp === 0) continue;
      const inC = (x) => x >= cl.a && x < cl.b, toT = (x) => +(cl.T0 + (x - cl.a) / cl.sp).toFixed(3);
      for (const e of S0.fx || []) if (side(e[3], cl.k) && inC(e[0])) { const n = e.slice(); n[0] = toT(e[0]); n[3] = 0; while (n.length < 5) n.push(null); n[5] = until; fx.push(n); }
      for (const s of S0.steps || []) if (s[1] === cl.k && inC(s[0])) st2.push([toT(s[0]), s[1], s[2], s[3]]);
      for (const [h0, h1, pan] of S0.heartReal || []) if (side(pan, cl.k)) { const a = Math.max(h0, cl.a), b = Math.min(h1, cl.b); if (b > a) hr.push([toT(a), toT(b), 0]); }
    }
    // corte entre personagens: leve sopro
    EDIT.forEach((cl, i) => { if (i > 0 && EDIT[i - 1].k !== cl.k && !cl.end) fx.push([cl.T0, 'swish', 0.12, 0, null, cl.T0 + 0.3]); });
    const endT = EDIT.find((cl) => cl.end).T0;
    window.__schedule = Object.assign({}, S0, { fx, steps: st2, heartReal: hr, focusKeys: null, words: [], talks: [], slam: 0.02, report: endT, duration: ETOT });
  }
  window.__renderAt = renderAt;
  window.addEventListener('hf-seek', (e) => renderAt(e.detail.time));
  renderAt(0);
})();
