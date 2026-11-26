"""Tipo A com câmera que foca um personagem por vez (motivação → ego → disciplina → obsessão) e abre no fim."""
import sys, os, shutil, re
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from base4 import base4, html4, R, HF
P = 'foco'
s = base4()
# ---- câmera por planos ----
a = s.index('  const GS = 0.8, WCX = 668;'); b = s.index('  const toScreen')
s = s[:a] + '''  const GS = 0.8, WCX = 668, ZS = 1.65;
  const SHOTS = [[0, 'wide'], [2.9, 'motiv'], [6.9, 'ego'], [11.2, 'disc'], [15.0, 'obs'], [19.6, 'wide']];
  const frameOf = (n) => (n === 'wide' ? { cx: WCX, cy: 960, s: GS, sy: 960 } : { cx: HX[n] + 110, cy: FLOOR - 255, s: ZS, sy: 905 });
  function shotAt(t) {
    let i = 0; while (i < SHOTS.length - 1 && t >= SHOTS[i + 1][0]) i++;
    const cur = SHOTS[i], prev = i > 0 ? SHOTS[i - 1] : cur, u = i > 0 ? easeInOut(seg(t, cur[0], cur[0] + 0.55)) : 1;
    const A = frameOf(prev[1]), B = frameOf(cur[1]);
    const f = { cx: lerp(A.cx, B.cx, u), cy: lerp(A.cy, B.cy, u), s: Math.exp(lerp(Math.log(A.s), Math.log(B.s), u)), sy: lerp(A.sy, B.sy, u) };
    const za = (n) => (n === 'wide' ? 0 : 1), amt = lerp(za(prev[1]), za(cur[1]), u);
    const k = cur[1] !== 'wide' ? cur[1] : prev[1] !== 'wide' ? prev[1] : null;
    return { f, amt, k };
  }
  function camAt(t) {
    const S = shotAt(t), f = S.f;
    let s = f.s * (t < 2.9 ? lerp(1.08, 1.0, easeOut(seg(t, 1.5, 2.4))) : 1);
    let punch = 0; if (S.k) for (const ts of STRIKES[S.k]) { const d = t - ts; if (d >= 0 && d < 0.4) punch += 0.025 * Math.exp(-d * 13) * S.amt; }
    s *= 1 + punch;
    let ox = 540 - f.cx * s, oy = f.sy - f.cy * s;
    const k1 = t >= 1.5 ? Math.exp(-(t - 1.5) * 9) : 0, k2 = t >= BREAK_T ? Math.exp(-(t - BREAK_T) * 5) : 0;
    ox += 15 * k1 * Math.sin((t - 1.5) * 70) + 24 * k2 * Math.sin((t - BREAK_T) * 60);
    oy += 10 * k1 * Math.cos((t - 1.5) * 83) + 18 * k2 * Math.cos((t - BREAK_T) * 73);
    return { s, ox, oy };
  }
''' + s[b:]
# ---- quem não está em foco fica na sombra ----
s = R(s, "    const lv = { disc: level.disc(t), obs: level.obs(t), motiv: level.motiv(t), ego: level.ego(t) };",
      "    const lv = { disc: level.disc(t), obs: level.obs(t), motiv: level.motiv(t), ego: level.ego(t) };\n    const SH = shotAt(t); if (SH.k) for (const k of KS) if (k !== SH.k) lv[k] *= 1 - 0.7 * SH.amt;")
# ---- rótulos: na tela larga os 4; no zoom, só o do personagem em foco ----
NAMES = "{ disc: '1 · DISCIPLINA', obs: '2 · OBSESSÃO', motiv: '3 · MOTIVAÇÃO', ego: '4 · EGO' }"
a = "    const fadeLab = (id, a, b, d) => { const el = document.getElementById(id); if (el) el.style.opacity = String(1 - d * smooth(seg(t, a, b))); };"
s = R(s, a, "    const SHL = shotAt(t);\n    const fadeLab = (id, a, b, d) => { const el = document.getElementById(id); if (el) el.style.opacity = String((1 - SHL.amt) * (1 - d * smooth(seg(t, a, b)))); };\n    fadeLab('lab-obs', 99, 100, 0);\n    if (SHL.k && SHL.amt > 0.02) { const k = SHL.k, nm = (" + NAMES + ")[k], n = k === 'disc' && t >= RUN.disc.end ? `${fmt(hits(k, t))} ✓` : fmt(hits(k, t));\n      c.save(); c.globalAlpha = SHL.amt; c.font = '700 26px \"Space Mono\", monospace'; const tw = c.measureText(nm).width; c.beginPath(); c.roundRect(540 - tw / 2 - 18, 488, tw + 36, 44, 22); c.fillStyle = 'rgba(12,12,14,0.85)'; c.fill(); c.lineWidth = 3; c.strokeStyle = rgb(COL[k]); c.stroke();\n      c.fillStyle = rgb(COL[k]); c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(nm, 540, 511); c.font = '800 48px Montserrat, sans-serif'; c.fillText(n, 540, 572); c.restore(); }")
# ---- placa META some no zoom (a meta aparece no rótulo da disciplina) ----
s = R(s, "  function drawMeta(c, t) {\n", "  function drawMeta(c, t) {\n    const MA = 1 - shotAt(t).amt; if (MA <= 0.01) return; c.save(); c.globalAlpha = MA; drawMeta0(c, t); c.restore();\n  }\n  function drawMeta0(c, t) {\n")
s = R(s, "n = k === 'disc' && t >= RUN.disc.end ? `${fmt(hits(k, t))} ✓` : fmt(hits(k, t));\n      c.save(); c.globalAlpha = SHL.amt;", "n = k === 'disc' ? (t >= RUN.disc.end ? `${fmt(hits(k, t))} ✓ META` : `${fmt(hits(k, t))} / 1.000`) : fmt(hits(k, t));\n      c.save(); c.globalAlpha = SHL.amt;")
# ---- PALETA MINIMALISTA: tudo neutro; a obsessão só ganha o vermelho na queda da árvore ----
s = R(s, "  const COL = { disc: [47, 155, 255], obs: [255, 59, 48], motiv: [255, 204, 0], ego: [184, 92, 255] };",
         "  const NEU = [214, 212, 206], ACC = [214, 80, 66];\n  const COL = { disc: NEU, obs: NEU, motiv: NEU, ego: NEU };")
s = R(s, "  function renderAt(t) {\n", "  function renderAt(t) {\n    COL.obs = mixC(NEU, ACC, smooth(seg(t, BREAK_T - 0.2, BREAK_T + 0.4)));\n")
s = s.replace("rgb([150, 100, 62], lit)", "rgb([128, 116, 104], lit)").replace("rgb([104, 68, 42], lit)", "rgb([92, 84, 76], lit)").replace("rgb([110, 72, 44], lit)", "rgb([98, 90, 82], lit)")
s = s.replace("rgb([58, 150, 88])", "rgb([88, 96, 90])").replace("'#e8b878'", "'#cfc6b8'").replace("'#d9a86c'", "'#b8b0a4'")
# ---- legendas ----
a = s.index('  const CAPS = ['); b = s.index('  const capEl')
s = s[:a] + '''  const CAPS = [
    { s: -1, e: 2.85, lines: [[-1, [['QUATRO MACHADOS.']]], [0.3, [['SÓ '], ['UMA', 'obs'], [' ÁRVORE CAI.']]]] },
    { s: 3.0, e: 5.5, lines: [[3.0, [['A MOTIVAÇÃO']]], [3.35, [['COMEÇA A MIL.']]]] },
    { s: 5.6, e: 6.85, lines: [[5.6, [['E APAGA NO']]], [5.95, [['PRIMEIRO CANSAÇO.']]]] },
    { s: 7.0, e: 9.7, lines: [[7.0, [['O EGO']]], [7.35, [['BATE PRA SER VISTO.']]]] },
    { s: 9.8, e: 11.1, lines: [[9.8, [['SEM PLATEIA,']]], [10.15, [['LARGA O MACHADO.']]]] },
    { s: 11.3, e: 13.9, lines: [[11.3, [['A DISCIPLINA']]], [11.65, [['BATE NO RITMO.']]]] },
    { s: 14.0, e: 14.95, lines: [[14.0, [['BATE A META']]], [14.3, [['E PARA.']]]] },
    { s: 15.1, e: 17.0, lines: [[15.1, [['A OBSESSÃO']]], [15.45, [['PASSA DA META.']]]] },
    { s: 17.1, e: 18.95, lines: [[17.1, [['CANSADA,']]], [17.45, [['BATE DE NOVO.']]]] },
    { s: 21.0, e: 99, big: true, lines: [[21.0, [['NÃO PARE NA META.']]]] },
  ];
''' + s[b:]
s = re.sub(r"window\.__schedule = \{ slam", "window.__schedule = { shots: SHOTS, slam", s)
if os.path.exists(P): shutil.rmtree(P)
os.makedirs(P + '/assets'); shutil.copytree('gelo/assets/vendor', P + '/assets/vendor'); shutil.copy('gelo/hyperframes.json', P + '/')
open(P + '/meta.json', 'w').write('{"id":"foco","name":"foco","createdAt":"2026-11-26T00:00:00.000Z"}')
open(P + '/assets/foco.js', 'w').write(s)
html4('MESMA ÁRVORE', 'QUATRO MACHADOS.', {'disc': 115, 'obs': 365, 'motiv': 615, 'ego': 860}, P + '/index.html', 'assets/foco.js')
h = open(P + '/index.html').read()
css = """
      /* paleta minimalista */
      .lab .nm, #lab-disc .nm, #lab-obs .nm, #lab-motiv .nm, #lab-ego .nm { border-color: rgba(244,242,238,0.55) !important; color: #f4f2ee !important; background: rgba(10,10,12,0.6) !important; }
      .lab .n, #lab-disc .n, #lab-obs .n, #lab-motiv .n, #lab-ego .n { color: #f4f2ee !important; }
      .cap .c-motiv, .cap .c-ego, .cap .c-disc { color: #f4f2ee !important; text-shadow: 0 4px 24px rgba(0,0,0,0.9) !important; }
      .cap .c-obs { color: #d65042 !important; text-shadow: 0 4px 24px rgba(0,0,0,0.9) !important; }
      #cta .sub b { color: #f4f2ee !important; }
      #cta .pill b { color: #d65042 !important; }
      #flash { background: radial-gradient(90% 60% at 50% 45%, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0.12) 55%, rgba(0,0,0,0) 100%) !important; }
    </style>"""
h = h.replace("    </style>", css, 1)
open(P + '/index.html', 'w').write(h)
print('ok')
