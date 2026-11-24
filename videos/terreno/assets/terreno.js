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
  function drawFigure(c, R, col, glow = 0.5, tint = 0, tintCol = null) {
    if (col && glow > 0) {
      c.save(); c.globalAlpha = glow; c.filter = 'blur(9px)';
      for (const L of [R.legB, R.armB, R.legF, R.armF, [R.hip, R.sh]]) strokePts(c, L, D.limb + 22, rgb(col));
      disc(c, R.head, D.headR + 12, rgb(col)); c.restore();
    }
    const tc = tintCol || col; const f = rgb(mixC(WHITE, tc || WHITE, tint)), b = rgb(mixC(BACK, tc || BACK, tint * 0.8));
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

  // palco minimalista (método das referências): preto, uma luminária inclinada no canto e um cone de luz
  function cStage(c, P, lamp = [140, 20], target = [560, 330], floorY = C_FL) {
    c.fillStyle = '#08080a'; c.fillRect(-400, -200, W + 800, P.h + 600);
    c.save(); c.globalCompositeOperation = 'lighter'; c.filter = 'blur(22px)';
    const dx = target[0] - lamp[0], dy = target[1] - lamp[1], len = Math.hypot(dx, dy), nx = -dy / len, ny = dx / len;
    const g = c.createLinearGradient(lamp[0], lamp[1], target[0], target[1]); g.addColorStop(0, 'rgba(255,214,160,0.32)'); g.addColorStop(1, 'rgba(255,214,160,0.06)');
    c.fillStyle = g; c.beginPath(); c.moveTo(lamp[0] + nx * 14, lamp[1] + ny * 14); c.lineTo(lamp[0] - nx * 14, lamp[1] - ny * 14);
    c.lineTo(target[0] - nx * 260, target[1] - ny * 260 + 60); c.lineTo(target[0] + nx * 260, target[1] + ny * 260 + 60); c.closePath(); c.fill();
    c.fillStyle = 'rgba(255,214,160,0.10)'; c.beginPath(); c.ellipse(target[0], floorY + 4, 230, 26, 0, 0, Math.PI * 2); c.fill(); c.restore();
    c.save(); c.translate(lamp[0], lamp[1]); c.rotate(Math.atan2(dy, dx) - Math.PI / 2); c.fillStyle = '#2b2b30'; c.beginPath(); c.moveTo(-26, -6); c.lineTo(26, -6); c.lineTo(16, 18); c.lineTo(-16, 18); c.closePath(); c.fill();
    c.fillStyle = '#ffe9c4'; c.beginPath(); c.ellipse(0, 18, 16, 5, 0, 0, Math.PI * 2); c.fill(); c.restore();
    c.strokeStyle = 'rgba(255,255,255,0.10)'; c.lineWidth = 3; c.beginPath(); c.moveTo(-400, floorY); c.lineTo(W + 400, floorY); c.stroke();
  }
  // banquinho simples
  function cStool(c, x, top = C_FL - 66) { c.strokeStyle = '#3a3a40'; c.lineWidth = 7; c.lineCap = 'round'; c.beginPath(); c.moveTo(x - 34, top); c.lineTo(x + 34, top); c.moveTo(x - 26, top); c.lineTo(x - 32, C_FL); c.moveTo(x + 26, top); c.lineTo(x + 32, C_FL); c.moveTo(x - 29, top + 40); c.lineTo(x + 29, top + 40); c.stroke(); }

  // ---------- peças de animação extra (método minimalista 2.0) ----------
  // confete saindo de um ponto (t0 = início)
  function cConfetti(c, x, y, t0, t, n = 26) { const a = t - t0; if (a < 0 || a > 1.6) return; const cols = ['#4fbf6a', '#e8c547', '#2f9bff', '#e5483b', '#f2a23a'];
    for (let i = 0; i < n; i++) { const ang = -Math.PI / 2 + (i / n - 0.5) * 2.2, sp = 260 + (i * 37) % 160; const px = x + Math.cos(ang) * sp * a, py = y + Math.sin(ang) * sp * a + 420 * a * a;
      c.save(); c.globalAlpha = 1 - a / 1.6; c.translate(px, py); c.rotate(a * 10 + i); c.fillStyle = cols[i % 5]; c.fillRect(-5, -3, 10, 6); c.restore(); } }
  // balão redondo de ligação com um bonequinho azul do outro lado da linha
  function cCallInset(c, x, y, t, a = 1, talking = 0, lightsOff = 0) { if (a <= 0) return; const s = backE(clamp(a));
    c.save(); c.translate(x, y); c.scale(s, s); c.fillStyle = lightsOff > 0.5 ? '#111114' : '#1c2430'; c.strokeStyle = '#f4f2ee'; c.lineWidth = 4; c.beginPath(); c.arc(0, 0, 56, 0, Math.PI * 2); c.fill(); c.stroke();
    c.save(); c.beginPath(); c.arc(0, 0, 54, 0, Math.PI * 2); c.clip(); c.globalAlpha = 1 - 0.7 * lightsOff;
    c.strokeStyle = rgb(PAL.azul); c.lineWidth = 9; c.lineCap = 'round'; const bob = talking * 3 * Math.sin(t * 14);
    c.beginPath(); c.moveTo(0, 6 + bob); c.lineTo(0, 50); c.moveTo(0, 18 + bob); c.lineTo(-22, 34 + talking * 6 * Math.sin(t * 9)); c.moveTo(0, 18 + bob); c.lineTo(22, 30); c.stroke();
    c.fillStyle = '#f4f2ee'; c.beginPath(); c.arc(0, -12 + bob, 15, 0, Math.PI * 2); c.fill(); c.strokeStyle = '#0e0e10'; c.lineWidth = 3; c.stroke();
    c.strokeStyle = '#2b2b30'; c.lineWidth = 4; c.beginPath(); c.arc(0, -12 + bob, 18, Math.PI * 1.05, Math.PI * 1.95); c.stroke(); c.beginPath(); c.moveTo(16, -10 + bob); c.lineTo(10, 2 + bob); c.stroke();
    c.restore(); c.restore(); }
  // braço branco com contorno (lista de pontos em coordenadas de tela/mundo)
  function cArm(c, pts, w = 22) { strokePts(c, pts, w + 10, '#0e0e10'); strokePts(c, pts, w, '#f7f7f5'); }
  // balde de pipoca
  function cPopcorn(c, p, t) { c.save(); c.translate(p[0], p[1]); c.fillStyle = '#f4ead8'; for (let i = 0; i < 7; i++) { c.beginPath(); c.arc(-14 + (i % 4) * 9, -20 - Math.floor(i / 4) * 7 + Math.sin(t * 3 + i), 6, 0, Math.PI * 2); c.fill(); }
    c.fillStyle = '#e5483b'; c.strokeStyle = '#0e0e10'; c.lineWidth = 3; c.beginPath(); c.moveTo(-20, -18); c.lineTo(20, -18); c.lineTo(15, 22); c.lineTo(-15, 22); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = '#fff'; c.fillRect(-12, -14, 5, 34); c.fillRect(2, -14, 5, 34); c.restore(); }
  // relógio de parede (horas girando rápido quando spin > 0)
  function cWallClock(c, x, y, t, spin = 0) { c.save(); c.translate(x, y); c.fillStyle = '#efe6d6'; c.strokeStyle = '#0e0e10'; c.lineWidth = 4; c.beginPath(); c.arc(0, 0, 30, 0, Math.PI * 2); c.fill(); c.stroke();
    const h = 1.2 + spin * t * 2.5, m = 4.2 + spin * t * 30; c.lineCap = 'round'; c.lineWidth = 5; c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.sin(h) * 14, -Math.cos(h) * 14); c.stroke();
    c.lineWidth = 3; c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.sin(m) * 22, -Math.cos(m) * 22); c.stroke(); c.restore(); }
  // risquinhos de susto / impacto em volta de um ponto
  function cBurst(c, p, t0, t, col = '#fff2d8') { const a = t - t0; if (a < 0 || a > 0.45) return; c.save(); c.globalAlpha = 1 - a / 0.45; c.strokeStyle = col; c.lineWidth = 5;
    for (let i = 0; i < 8; i++) { const ang = (i / 8) * Math.PI * 2, r0 = 30 + 70 * easeOut(a / 0.45); c.beginPath(); c.moveTo(p[0] + Math.cos(ang) * r0, p[1] + Math.sin(ang) * r0); c.lineTo(p[0] + Math.cos(ang) * (r0 + 22), p[1] + Math.sin(ang) * (r0 + 22)); c.stroke(); } c.restore(); }

  // luminária pendurada no teto (layout B) com cone de luz reto até o chão
  function cHangLamp(c, x, y = 40, floorY = C_FL, w = 230) {
    c.save(); c.globalCompositeOperation = 'lighter'; c.filter = 'blur(20px)';
    const g = c.createLinearGradient(0, y, 0, floorY); g.addColorStop(0, 'rgba(255,214,160,0.30)'); g.addColorStop(1, 'rgba(255,214,160,0.07)');
    c.fillStyle = g; c.beginPath(); c.moveTo(x - 24, y + 14); c.lineTo(x + 24, y + 14); c.lineTo(x + w, floorY + 20); c.lineTo(x - w, floorY + 20); c.closePath(); c.fill();
    c.fillStyle = 'rgba(255,214,160,0.12)'; c.beginPath(); c.ellipse(x, floorY + 4, w * 0.95, 22, 0, 0, Math.PI * 2); c.fill(); c.restore();
    c.strokeStyle = '#2b2b30'; c.lineWidth = 3; c.beginPath(); c.moveTo(x, -400); c.lineTo(x, y - 6); c.stroke();
    c.fillStyle = '#2b2b30'; c.beginPath(); c.moveTo(x - 10, y - 8); c.lineTo(x + 10, y - 8); c.lineTo(x + 26, y + 12); c.lineTo(x - 26, y + 12); c.closePath(); c.fill();
    c.fillStyle = '#ffe9c4'; c.beginPath(); c.ellipse(x, y + 12, 20, 5, 0, 0, Math.PI * 2); c.fill();
  }
  function cDark(c, P) { c.fillStyle = '#060607'; c.fillRect(-400, -400, W + 800, P.h + 800); c.strokeStyle = 'rgba(255,255,255,0.08)'; c.lineWidth = 3; c.beginPath(); c.moveTo(-400, C_FL); c.lineTo(W + 400, C_FL); c.stroke(); }

  // ================= ESTRATÉGIA "MESMO X / DIA N" (layout B, clean): "MESMO TERRENO" (17 s) =================
  const GT = 13.5, FL = C_FL, END = 12.4;
  const dayOf = (t) => Math.max(1, Math.min(60, Math.round(1 + 59 * Math.pow(clamp(t / END), 1.25))));
  const prog = (t) => (dayOf(t) - 1) / 59;
  const LOT0 = 560, LOT1 = 800;                                   // terreno marcado (igual nos dois)
  const BRICK = [201, 162, 122], PER = 0.9;

  // ---------- 1 · FAZ: assenta tijolo, a casa sobe ----------
  const WX = 500;
  const work = (t) => {
    const u = (((t - 0.3) / PER) % 1 + 1) % 1, down = u < 0.45 ? smooth(u / 0.3) : 1 - smooth((u - 0.45) / 0.25);
    const rows = Math.floor(prog(t) * 11), topY = FL - 8 - Math.min(rows, 8) * 22, bx = LOT0 + 30 + ((Math.floor((t - 0.3) / PER) * 47) % 180);
    const legs = mixL(STAND_L, CROUCH_L, down), st = pose(WX, FL, legs, lerp(0.15, 0.7, down), lerp(0.1, 0.5, down), handsDown(WX, C_HY), { gesture: false, noWalk: true });
    const pile = [WX + 50, FL - 24], place = [Math.min(bx, WX + 70), topY - 10];
    st.hands = [toRig(st, P2(place, pile, down)), toRig(st, P2([place[0] - 16, place[1] + 6], [pile[0] - 18, pile[1]], down))];
    return st;
  };
  const admire = (t) => cStandW(430, 1, -0.05, -0.1, [[470, FL - 104], [400, FL - 100]], { prefF: 'down' })(t);
  const fazKeys = [[0, cStand(WX)], [0.3, work, 0.3], [END, cWalk(WX, 430, END, END + 0.6, -1), 0.3], [END + 0.6, admire, 0.3], [END + 0.9, cStandW(430, 1, -0.05, -0.15, (t) => [[480, FL - 230 + 10 * Math.sin(t * 9)], [400, FL - 100]], { prefF: 'down' }), 0.3]];
  const fazState = (t) => seq(fazKeys, t);

  // ---------- 2 · PENSA DEMAIS: redesenha a planta sem parar ----------
  const EX = 600, PX = 520;
  const draw = (t) => { const u = ((t - 0.85) / PER) % 1, slot = Math.floor((t - 0.85) / PER), crumple = slot % 3 === 2 && u < 0.6;
    const st = cStandW(PX, 1, 0.12, 0.25, crumple ? [[EX - 10 + 40 * smooth(u / 0.6), FL - 170 + 60 * smooth(u / 0.6)], [EX - 24, FL - 160]] : [[EX - 12 + 10 * Math.sin(t * 13), FL - 176 + 8 * Math.sin(t * 9.3)], [PX + 20, FL - 120]])(t); return st; };
  const sigh = (t) => cStandW(PX, 1, 0.3, 0.55, [[PX + 30, FL - 96], [PX + 10, FL - 92]])(t);
  const pensaKeys = [[0, cStandW(PX, 1, 0.05, 0.2, [[PX + 36, FL - 140], [PX + 22, FL - 130]])], [0.85, draw, 0.3], [END, sigh, 0.5]];
  const pensaState = (t) => seq(pensaKeys, t);
  const sheets = (t) => Math.max(0, Math.floor((t - 0.85) / PER / 3 + 0.34));   // papéis amassados
  const version = (t) => 1 + Math.round(36 * clamp(t / END));

  // ---------- cenário ----------
  function lot(c) { c.strokeStyle = 'rgba(201,162,122,0.5)'; c.lineWidth = 2; c.beginPath(); c.moveTo(LOT0, FL - 26); c.lineTo(LOT1, FL - 26); c.stroke();
    c.fillStyle = '#6b4a30'; for (const x of [LOT0, LOT1]) c.fillRect(x - 3, FL - 34, 6, 34); }
  function house(c, t) {
    const p = prog(t), rows = Math.min(8, Math.floor(p * 11));
    c.strokeStyle = '#0e0e10'; c.lineWidth = 2.5;
    for (let r = 0; r < rows; r++) for (let i = 0; i < 10; i++) { const x = LOT0 + i * 24 + (r % 2 ? 12 : 0); if (x + 22 > LOT1) continue; c.fillStyle = rgb(mixC(BRICK, [170, 130, 95], ((i * 7 + r * 3) % 5) / 8)); c.fillRect(x, FL - 22 - r * 22, 22, 20); c.strokeRect(x, FL - 22 - r * 22, 22, 20); }
    // pilha de tijolos
    const left = Math.max(0, 6 - Math.floor(p * 6)); for (let i = 0; i < left; i++) { c.fillStyle = rgb(BRICK); c.fillRect(WX + 30 + (i % 3) * 24, FL - 14 - Math.floor(i / 3) * 14, 22, 12); c.strokeRect(WX + 30 + (i % 3) * 24, FL - 14 - Math.floor(i / 3) * 14, 22, 12); }
    const roof = smooth(seg(p, 0.74, 0.9)); if (roof > 0) { const top = FL - 22 - 8 * 22 + 20; c.save(); c.globalAlpha = roof; c.fillStyle = '#7a4a34'; c.beginPath(); c.moveTo(LOT0 - 16, top); c.lineTo((LOT0 + LOT1) / 2, top - 90 * roof); c.lineTo(LOT1 + 16, top); c.closePath(); c.fill(); c.lineWidth = 4; c.stroke(); c.restore(); }
    const det = smooth(seg(p, 0.9, 1)); if (det > 0) { c.save(); c.globalAlpha = det; c.fillStyle = '#3a2a1c'; c.fillRect(LOT0 + 40, FL - 110, 50, 110); c.strokeRect(LOT0 + 40, FL - 110, 50, 110);
      const on = t > END + 0.5 ? 1 : 0.25; c.fillStyle = `rgba(255,214,140,${on})`; c.fillRect(LOT0 + 130, FL - 120, 60, 50); c.strokeRect(LOT0 + 130, FL - 120, 60, 50);
      if (on > 0.5) { c.globalCompositeOperation = 'lighter'; c.filter = 'blur(14px)'; c.fillStyle = 'rgba(255,214,140,0.35)'; c.beginPath(); c.ellipse(LOT0 + 160, FL - 95, 70, 50, 0, 0, Math.PI * 2); c.fill(); } c.restore(); }
  }
  function easel(c, t) {
    c.strokeStyle = '#3a3a40'; c.lineWidth = 6; c.lineCap = 'round'; c.beginPath(); c.moveTo(EX - 40, FL); c.lineTo(EX, FL - 210); c.lineTo(EX + 40, FL); c.moveTo(EX, FL - 210); c.lineTo(EX + 8, FL); c.stroke();
    c.fillStyle = '#efe6d6'; c.strokeStyle = '#0e0e10'; c.lineWidth = 3; c.fillRect(EX - 50, FL - 220, 100, 90); c.strokeRect(EX - 50, FL - 220, 100, 90);
    // planta da casa (sempre recomeçando)
    const u = ((t - 0.85) / PER / 3) % 1, k = clamp(u * 1.4);
    c.strokeStyle = 'rgba(60,80,110,0.85)'; c.lineWidth = 2;
    c.beginPath(); c.rect(EX - 38, FL - 200, 76 * Math.min(1, k * 2), 56 * Math.min(1, Math.max(0, k * 2 - 0.4))); c.stroke();
    if (k > 0.6) { c.beginPath(); c.moveTo(EX - 38, FL - 172); c.lineTo(EX - 38 + 76 * (k - 0.6) / 0.4, FL - 172); c.stroke(); }
    c.fillStyle = 'rgba(229,72,59,0.85)'; c.font = '700 11px "Space Mono"'; c.textAlign = 'right'; c.fillText(`V${version(t)}`, EX + 46, FL - 136);
  }
  function drawBack(c, k, t, P) {
    cDark(c, P); cHangLamp(c, 600, 30, FL, 260); lot(c);
    if (k === 'faz') house(c, t); else easel(c, t);
  }
  function drawFront(c, k, t, P, drawn) {
    if (k === 'faz') { const u = (((t - 0.3) / PER) % 1 + 1) % 1; if (t > 0.3 && t < END && u > 0.15 && u < 0.92) { const hp = drawn.main.hand; c.fillStyle = rgb(BRICK); c.strokeStyle = '#0e0e10'; c.lineWidth = 2.5; c.fillRect(hp[0] - 11, hp[1] - 14, 22, 12); c.strokeRect(hp[0] - 11, hp[1] - 14, 22, 12); } }
    else {
      // bolinhas de papel amassado acumulando no chão
      const n = Math.min(30, sheets(t)); for (let i = 0; i < n; i++) { const x = 650 + (i * 37) % 130, y = FL - 8 - Math.floor(i / 6) * 9; c.fillStyle = '#efe6d6'; c.strokeStyle = '#0e0e10'; c.lineWidth = 2; c.beginPath(); c.arc(x, y, 8, 0, Math.PI * 2); c.fill(); c.stroke(); }
      // bolinha voando quando amassa
      const slot = Math.floor((t - 0.85) / PER), u = ((t - 0.85) / PER) % 1; if (t > 0.85 && t < END && slot % 3 === 2 && u > 0.55) { const a = (u - 0.55) / 0.45, x = lerp(EX + 30, 650 + ((sheets(t)) * 37) % 130, a), y = lerp(FL - 120, FL - 8, a) - 60 * Math.sin(Math.PI * a); c.fillStyle = '#efe6d6'; c.beginPath(); c.arc(x, y, 8, 0, Math.PI * 2); c.fill(); c.stroke(); }
    }
  }

  const bricks = Array.from({ length: Math.floor((END - 0.3) / PER) }, (_, j) => 0.3 + j * PER + 0.42);
  const pensaFx = Array.from({ length: Math.floor((END - 0.85) / PER) }, (_, j) => [0.85 + j * PER + 0.05, j % 3 === 2 ? 'crumple' : 'scribble']);
  const SCENE = {
    minimal: true, layoutB: true, noMonitor: true, metricLabel: '', totalLabel: '', reportT: GT, noReport: true,
    labels: ['FAZ', 'PENSA DEMAIS'], midLabel: (t) => ['MESMO TERRENO', `DIA ${dayOf(Math.min(t, GT))}`],
    secsText: (n) => `${n}`,
    state: { faz: fazState, pensa: pensaState },
    drawBack, drawFront,
    cam: (k, t) => ({ x: 610, y: 180, z: 1.08 }),
    pain: { faz: () => 0, pensa: () => 0 },
    bubbles: {
      faz: [{ t0: END + 0.9, t1: GT - 0.05, text: 'PRONTO.', col: PAL.faz }],
      pensa: [
        { t0: 3.0, t1: 4.3, text: 'E SE A JANELA FOR AQUI?' },
        { t0: 8.2, t1: 9.4, text: 'AINDA NÃO TÁ PERFEITO.' },
        { t0: END + 0.3, t1: GT - 0.05, text: 'AMANHÃ EU COMEÇO.' },
      ],
    },
    shake: () => 0,
    caps: [{ s: GT + 0.1, e: 99, center: true, lines: [[GT + 0.3, [['60 DIAS: '], ['UMA CASA.', 'faz']]], [GT + 0.9, [['O OUTRO: '], ['37 PLANTAS.', 'dor']]]] }],
    sched: {
      noBips: true, noPops: true, music: 0.16,
      fx: [
        ...bricks.map((x) => [x, 'brick', 0.5, 0.35]),
        ...pensaFx.map(([x, ty]) => (ty === 'scribble' ? [x, 'scribble', 0.3, -0.35, 0.38] : [x, 'foley/pagina_2', 0.4, -0.35, 1.4])),
        [END + 0.5, 'chime', 0.14, 0.35],
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

  function drawActor(c, st, col, glow, tint, tintCol) {
    const fx = st.ax ?? st.x, fy = st.ay;
    const f = clamp(st.face ?? 1, -1, 1), sq = st.sq || 0;
    c.save();
    c.translate(fx, fy); c.scale(SC * f * (1 + sq * 0.45), SC * (1 - sq)); c.translate(-fx, -fy);
    const R = rigP(st);
    if (st.behind) st.behind(c, R);
    drawFigure(c, R, col, glow, tint || 0, tintCol || null);
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
    if (L && SCENE.minimal) cam = SCENE.cam ? SCENE.cam(k, t) : { x: 560, y: 200, z: 1 };
    else if (L) cam = SCENE.cam ? { x: clamp(cam.x, 400, 680), y: clamp(cam.y, 170, 215), z: 1 + (cam.z - 1) * 0.35 } : { x: clamp(SCENE.state[k](t).x + 100, 400, 680), y: 190, z: 1 };
    const cz = cam.z * (1.03 + 0.012 * Math.sin(t * 0.37 + (k === 'faz' ? 1 : 0)));
    const cx = cam.x + 10 * noise(t * 0.25, k === 'faz' ? 2 : 5), cy = cam.y + 6 * noise(t * 0.3, k === 'faz' ? 8 : 1);
    const toS = (p) => [540 + (p[0] - cx) * cz * bz, sy + (p[1] - cy) * cz * bz];
    c.save(); c.translate(540, sy); c.scale(cz * bz, cz * bz); c.translate(-cx, -cy);
    SCENE.drawBack(c, k, t, P);
    const others = (SCENE.others && SCENE.others[k]) || [];
    const drawn = {};
    for (const o of others) if (!o.front) drawn[o.id] = drawActor(c, alive(o.fn, t, { seed: o.seed, talk: TALK[k].other, energy: o.energy }), o.col, o.glow ?? 0.4, o.tint);
    const main = drawActor(c, alive(SCENE.state[k], t, { seed: k === 'faz' ? 2 : 9, talk: TALK[k].main, energy: SCENE.energy ? SCENE.energy(k, t) : 1 }), PAL[k], SCENE.minimal ? 0 : 0.5, SCENE.tint ? SCENE.tint(k, t) : 0, SCENE.tintCol || null);
    drawn.main = main;
    for (const o of others) if (o.front) drawn[o.id] = drawActor(c, alive(o.fn, t, { seed: o.seed, talk: TALK[k].other }), o.col, o.glow ?? 0.4, o.tint);
    if (SCENE.drawFront) SCENE.drawFront(c, k, t, P, drawn);
    c.restore();
    for (const b of SCENE.bubbles[k]) {
      const sp = drawn[(b.who || 'main') === 'main' ? 'main' : (b.whoId || 'other')] || main;
      const hs = toS(sp.head);
      c.font = '800 28px "Space Mono", monospace'; const bw = (c.measureText(b.text).width / 2 + 22) * ui;
      const bx = clamp(b.x !== undefined ? b.x * ui : hs[0] + (b.dx ?? 60) * ui, 300 * ui + bw, (L ? 930 : (SCENE.bubbleMaxX || 1000)) - bw);
      bubble(c, bx, L ? (SCENE.minimal ? clamp(hs[1] - 105 * ui, 100 * ui, P.h - 80) : 138) : (b.y ?? 50), b.text, b.col, b.t0, b.t1, t, hs[0], ui);
    }
    c.save(); c.scale(ui, ui); const PU = { top: P.top, h: P.h / ui };
    if (SCENE.drawOverlay) SCENE.drawOverlay(c, k, t, PU, drawn, (p) => toS(p).map((v) => v / ui));
    if (!SCENE.noMonitor) drawMonitor(c, k, t, PU);
    c.restore();
    { const fd = !L && SCENE.dimOf && t < GT1 ? SCENE.dimOf(k, t) : 0; if (fd > 0) { c.fillStyle = `rgba(8,5,3,${0.5 * fd})`; c.fillRect(0, 0, W, P.h); } }
    const nm = k === 'faz' ? '2 · FAZ' : '1 · PENSA DEMAIS';
    c.save(); c.scale(ui, ui); if (SCENE.minimal) c.globalAlpha = 0;
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
  // ---------- MÉTODO MINIMALISTA: tela dividida que ocupa a tela toda, fundo preto, sem texto por cima ----------
  // layout B (estratégia "MESMO X / DIA N"): faz em cima, pensa embaixo, faixa do contador no meio
  const LMIN = SCENE.layoutB ? { faz: { top: 150, h: 650, ui: 1.3, bz: 1.6, sy: 325 }, pensa: { top: 890, h: 650, ui: 1.3, bz: 1.6, sy: 325 } }
    : { pensa: { top: 150, h: 690, ui: 1.3, bz: 1.7, sy: 345 }, faz: { top: 850, h: 690, ui: 1.3, bz: 1.7, sy: 345 } };
  function renderMinimal(t) {
    const c = ctx; c.setTransform(1, 0, 0, 1, 0, 0); c.fillStyle = '#050506'; c.fillRect(0, 0, W, H);
    const dim = 0.8 * smooth(seg(t, GT1, GT1 + 0.5));
    drawPanel(c, 'pensa', t, LMIN.pensa, dim); drawPanel(c, 'faz', t, LMIN.faz, dim);
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.font = '700 30px "Space Mono", monospace'; c.textAlign = 'center'; c.textBaseline = 'middle';
    const lab = (txt, y, col, sp = 22) => { c.save(); c.globalAlpha = 1 - dim * 0.6; c.fillStyle = col; let x = 540 - (txt.length - 1) * sp / 2; for (const ch of txt) { c.fillText(ch, x, y); x += sp; } c.restore(); };
    const L1 = SCENE.labels || ['FAZ', 'PENSA DEMAIS'];
    if (SCENE.layoutB) {
      c.fillStyle = '#050506'; c.fillRect(0, 800, W, 90);
      lab(L1[0], 178, '#f4f2ee'); lab(L1[1], 1512, '#f4f2ee');
      if (SCENE.midLabel) { const [sm, big] = SCENE.midLabel(t); c.font = '700 24px "Space Mono", monospace'; lab(sm, 818, 'rgba(244,242,238,0.75)', 17); c.font = '800 40px "Space Mono", monospace'; lab(big, 862, '#f4f2ee', 28); }
    } else {
      c.fillStyle = '#050506'; c.fillRect(0, 840, W, 10); c.strokeStyle = 'rgba(255,255,255,0.35)'; c.lineWidth = 2; c.beginPath(); c.moveTo(0, 845); c.lineTo(W, 845); c.stroke();
      lab('PENSA DEMAIS', 812, '#f4f2ee'); lab('FAZ', 878, '#f4f2ee');
    }
    if (SCENE.drawGlobal) { c.save(); SCENE.drawGlobal(c, t, LMIN, dim); c.restore(); }
    renderCaptions(t);
  }
  function renderAt(t) {
    if (SCENE.minimal) return renderMinimal(t);
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
