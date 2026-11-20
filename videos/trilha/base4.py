"""Gera a base de 4 personagens (perfil, golpe em objeto à frente) a partir de machado.js.
Uso como módulo: from base4 import base4; s = base4(); depois substituir os ganchos de tema."""
import re

HF = '/tmp/claude-0/-home-user-codigos/189b9105-0dc8-5112-bff7-a7c6ce878b44/scratchpad/hf'


def R(s, a, b, cnt=1):
    assert s.count(a) == cnt, (s.count(a), a[:100])
    return s.replace(a, b)


def base4():
    s = open(HF + '/machado/assets/machado.js').read()
    s = R(s, "  const COL = { disc: [47, 155, 255], obs: [255, 59, 48], ego: [184, 92, 255] };",
          "  const COL = { disc: [47, 155, 255], obs: [255, 59, 48], motiv: [255, 204, 0], ego: [184, 92, 255] };\n  const KS = ['disc', 'obs', 'motiv', 'ego'];")
    s = R(s, "const HX = { disc: 95, obs: 430, ego: 765 };", "const HX = { disc: 70, obs: 405, motiv: 740, ego: 1075 };")
    s = R(s, """    ego: { P: 0.44, end: 6.5, rate: 240 },
    disc: { P: 0.7, end: 12.6, rate: 1000 / 9.6 },
    obs: { P: 0.52, end: 19.0, rate: 175 },""", """    motiv: { P: 0.36, end: 5.6, rate: 300 },
    ego: { P: 0.46, end: 10.0, rate: 120 },
    disc: { P: 0.72, end: 14.0, rate: 1000 / 11 },
    obs: { P: 0.52, end: 19.0, rate: 170 },""")
    # desistentes genéricos: motivação (5,6 s) e ego (10 s)
    a = s.index('  function egoState(t) {'); b = s.index('  function discState(t) {')
    s = s[:a] + '''  function quitState(k, sitAt) {
    return function (t) {
      const end = RUN[k].end;
      if (t < end) return swinging(k, t);
      const x = HX[k], last = atRest(k);
      const u = easeInOut(seg(t, end, end + 0.5));
      const hy0 = standHipY(STAND_L);
      const slump = { x, hipY: lerp(last.hipY, hy0, u), lean: lerp(last.lean, 0.38, u), head: lerp(0.1, 0.5, u), legs: mixL(SWING_L, STAND_L, u),
        hands: [P2(last.hands[0], [x + 18, hy0 + 40], u), P2(last.hands[1], [x + 6, hy0 + 44], u)], prefF: 'down', prefB: 'down' };
      const sv = easeInOut(seg(t, sitAt, sitAt + 0.8));
      if (sv <= 0) return slump;
      const legs = mixL(STAND_L, SIT_L, sv), hipSit = FLOOR - 17;
      return { x: x - 40 * sv, hipY: lerp(slump.hipY, hipSit, sv), lean: lerp(0.38, 0.42, sv), head: lerp(0.5, 0.75, sv), legs,
        hands: [P2(slump.hands[0], [x + 60 - 40 * sv, FLOOR - 62], sv), P2(slump.hands[1], [x + 48 - 40 * sv, FLOOR - 58], sv)], prefF: 'down', prefB: 'down' };
    };
  }
  const motivState = quitState('motiv', 6.2), egoState = quitState('ego', 10.6);
  function droppedTool(k, t) {
    const end = RUN[k].end; if (t < end) return null;
    const last = atRest(k).hammer;
    const rest = { g: [HX[k] + 70, FLOOR - 50], a: Math.PI * 0.58 };
    const u = easeIn(seg(t, end, end + 0.4));
    return { g: P2(last.g, rest.g, u), a: lerp(last.a, rest.a, u) };
  }
''' + s[b:]
    s = R(s, "  const stateOf = { disc: discState, obs: obsState, ego: egoState };", "  const stateOf = { disc: discState, obs: obsState, motiv: motivState, ego: egoState };")
    s = R(s, "  const STRIKES = { ego: [], disc: [], obs: [] };\n  for (const k of ['ego', 'disc', 'obs'])", "  const STRIKES = { motiv: [], ego: [], disc: [], obs: [] };\n  for (const k of KS)")
    s = R(s, "const CRACKS = { disc: crackTree(11), obs: crackTree(23), ego: crackTree(37) };", "const CRACKS = { disc: crackTree(11), obs: crackTree(23), motiv: crackTree(29), ego: crackTree(37) };")
    s = R(s, "const crowdX = [600, 640, 1040, 1072];", "const crowdX = [1008, 1043, 1300, 1335];")
    s = R(s, "const show = smooth(seg(t, 3.0 + i * 0.07, 3.3 + i * 0.07)) * (1 - smooth(seg(t, 6.25 + i * 0.06, 6.5 + i * 0.06)));",
          "const show = smooth(seg(t, 7.8 + i * 0.07, 8.1 + i * 0.07)) * (1 - smooth(seg(t, 9.7 + i * 0.06, 9.95 + i * 0.06)));")
    s = R(s, "const ph = i * 1.7, cheer = t < 6.3 ? Math.abs(Math.sin((t + ph) * 7)) * 10 : 0;", "const ph = i * 1.7, cheer = t < 9.7 ? Math.abs(Math.sin((t + ph) * 7)) * 10 : 0;")
    s = R(s, "if (t < 6.3 && Math.sin((t + ph) * 3) > 0.2)", "if (t < 9.7 && Math.sin((t + ph) * 3) > 0.2)")
    s = R(s, """    disc: track([[0, 0.95], [3.0, 0.95], [3.25, 0.7], [7.9, 0.7], [8.1, 1.1], [13.1, 1.1], [13.6, 0.55]]),
    obs: track([[0, 0.95], [3.0, 0.95], [3.25, 0.7], [13.1, 0.7], [13.3, 1.15], [18.9, 1.15], [19.05, 1.6], [20.4, 1.3]]),
    ego: track([[0, 0.95], [3.0, 0.95], [3.25, 1.15], [6.4, 1.15], [6.5, 1.0], [7.2, 0.1]]),""",
          """    disc: track([[0, 1.0], [3.0, 1.0], [3.3, 0.7], [12.8, 0.7], [13.0, 1.1], [14.6, 1.1], [15.3, 0.55]]),
    obs: track([[0, 1.0], [3.0, 1.0], [3.3, 0.7], [15.3, 0.7], [15.5, 1.2], [18.9, 1.2], [19.05, 1.6], [20.4, 1.3]]),
    motiv: track([[0, 1.0], [3.0, 1.0], [3.2, 1.3], [5.5, 1.3], [6.2, 0.5], [6.9, 0.08]]),
    ego: track([[0, 1.0], [3.0, 1.0], [7.8, 1.0], [8.0, 1.2], [9.9, 1.2], [10.4, 0.5], [11.0, 0.08]]),""")
    # câmera: mundo mais largo (escala 0,8) com soco no golpe de quem está em foco
    a = s.index('  function camAt(t) {'); b = s.index('  const toScreen')
    s = s[:a] + '''  const GS = 0.8, WCX = 668;
  function camAt(t) {
    const hookU = easeOut(seg(t, 1.5, 2.4));
    let s = GS * lerp(1.08, 1.0, hookU);
    const focus = t < 5.6 ? 'motiv' : t < 10.0 ? 'ego' : t < 14.0 ? 'disc' : 'obs';
    let punch = 0; for (const ts of STRIKES[focus]) { const d = t - ts; if (d >= 0 && d < 0.4) punch += 0.02 * Math.exp(-d * 13); }
    s *= 1 + punch;
    let ox = 540 - WCX * s, oy = 960 - 960 * s;
    const k1 = t >= 1.5 ? Math.exp(-(t - 1.5) * 9) : 0, k2 = t >= BREAK_T ? Math.exp(-(t - BREAK_T) * 5) : 0;
    ox += 15 * k1 * Math.sin((t - 1.5) * 70) + 22 * k2 * Math.sin((t - BREAK_T) * 60);
    oy += 10 * k1 * Math.cos((t - 1.5) * 83) + 16 * k2 * Math.cos((t - BREAK_T) * 73);
    return { s, ox, oy };
  }
''' + s[b:]
    s = R(s, "  const hud = {}; for (const k of ['disc', 'obs', 'ego'])", "  const hud = {}; for (const k of KS)")
    s = R(s, "    for (const k of ['disc', 'obs', 'ego']) {\n      const a = 0.22", "    for (const k of KS) {\n      const a = 0.22")
    s = R(s, "    for (const k of ['disc', 'ego', 'obs']) drawWall(c, k, t, lv[k]);", "    for (const k of KS) drawWall(c, k, t, lv[k]);")
    s = R(s, "    for (const k of ['disc', 'obs', 'ego']) drawRubble(c, k, t);", "    for (const k of KS) drawRubble(c, k, t);")
    s = R(s, "    const eh = egoHammer(t); if (eh) drawHammer(c, eh.g, eh.a, COL.ego);", "    for (const k of ['motiv', 'ego']) { const dt = droppedTool(k, t); if (dt) drawHammer(c, dt.g, dt.a, COL[k]); }")
    s = R(s, "    for (const k of ['disc', 'ego', 'obs']) {\n      const st = stateOf[k](t);", "    for (const k of ['disc', 'motiv', 'ego', 'obs']) {\n      const st = stateOf[k](t);")
    s = R(s, "    for (const k of ['disc', 'obs', 'ego']) for (const t0 of [1.5, ...STRIKES[k]]) {", "    for (const k of KS) for (const t0 of [1.5, ...STRIKES[k]]) {")
    s = R(s, "    const lv = { disc: level.disc(t), obs: level.obs(t), ego: level.ego(t) };", "    const lv = { disc: level.disc(t), obs: level.obs(t), motiv: level.motiv(t), ego: level.ego(t) };")
    s = R(s, "    for (const k of ['disc', 'obs', 'ego']) {\n      const fl = toScreen([HX[k] + 60, FLOOR + 10], C);", "    for (const k of KS) {\n      const fl = toScreen([HX[k] + 60, FLOOR + 10], C);")
    s = R(s, "c.beginPath(); c.moveTo(-300, -500); c.lineTo(-120, -500); c.lineTo(760, FLOOR); c.lineTo(140, FLOOR); c.closePath(); c.fill();",
          "c.beginPath(); c.moveTo(-300, -500); c.lineTo(-120, -500); c.lineTo(900, FLOOR); c.lineTo(160, FLOOR); c.closePath(); c.fill();")
    s = R(s, "    c.fillStyle = '#1b1b1e'; c.fillRect(-300, FLOOR, W + 600, 900);\n    c.fillStyle = 'rgba(255,255,255,0.2)'; c.fillRect(-300, FLOOR - 2, W + 600, 4);",
          "    c.fillStyle = '#1b1b1e'; c.fillRect(-500, FLOOR, W + 1100, 900);\n    c.fillStyle = 'rgba(255,255,255,0.2)'; c.fillRect(-500, FLOOR - 2, W + 1100, 4);")
    a = s.index("    if (hud.disc) hud.disc.textContent"); b = s.index("  }\n\n  const typing = [];")
    s = s[:a] + '''    for (const k of KS) if (hud[k]) hud[k].textContent = k === 'disc' && t >= RUN.disc.end ? `${fmt(hits(k, t))} ✓` : fmt(hits(k, t));
    const fadeLab = (id, a, b, d) => { const el = document.getElementById(id); if (el) el.style.opacity = String(1 - d * smooth(seg(t, a, b))); };
    fadeLab('lab-motiv', 6.2, 6.8, 0.6); fadeLab('lab-ego', 10.6, 11.2, 0.6); fadeLab('lab-disc', 15.4, 16.0, 0.4);
''' + s[b:]
    s = re.sub(r"window\.__schedule = \{.*?\};", "window.__schedule = { slam: 1.5, motivQuit: RUN.motiv.end, egoQuit: RUN.ego.end, motivSit: 6.6, egoSit: 11.0, meta: RUN.disc.end, payoff: BREAK_T, strikes: STRIKES, crowd: [7.8, 9.7], words: typing };", s, flags=re.S)
    return s


def html4(title_k, title_line, lab_x, out, script):
    h = open(HF + '/corda/index.html').read()
    h = h.replace('MESMA CORDA', title_k).replace('assets/corda.js', script)
    h = re.sub(r'(<div id="cap" class="cap"><div class="l1">).*?(</div>)', lambda m: m.group(1) + title_line + m.group(2), h, flags=re.S)
    for k, x in lab_x.items():
        h = re.sub(r'(<div id="lab-%s" class="lab" style="left: )\d+px' % k, lambda m: m.group(1) + '%dpx' % x, h)
    h = h.replace('n">0 M<', 'n">0<') if 'M' not in title_k else h
    open(out, 'w').write(h)
