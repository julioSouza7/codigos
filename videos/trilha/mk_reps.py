"""Tipo A 'treino' (barra / flexão): 4 personagens, câmera que foca um por vez, paleta minimalista,
braços da obsessão ficam vermelhos de dor, ela cai e volta a fazer. Uso: python3 mk_reps.py barra|flexao"""
import sys, os, shutil, re
HF = os.path.dirname(os.path.abspath(__file__))
TH = sys.argv[1]
P = {'barra': 'barra4', 'flexao': 'flexao4'}[TH]
foco = open(HF + '/foco/assets/foco.js').read().split('\n')
L = lambda a, b: '\n'.join(foco[a - 1:b])          # linhas a..b (1-based, inclusivo)
assert foco[54].startswith('  function ikP') and foco[90].startswith('  const disc'), (foco[54], foco[90])
assert foco[398].startswith('  const capEl') and foco[421].startswith('  const fmt'), (foco[398], foco[421])

DUEL = """
    { s: 3.0, e: 5.5, lines: [[3.0, [['A MOTIVAÇÃO']]], [3.35, [['COMEÇA A MIL.']]]] },
    { s: 5.6, e: 6.5, lines: [[5.6, [['E PARA NO']]], [5.85, [['PRIMEIRO CANSAÇO.']]]] },
    { s: 6.8, e: 9.9, lines: [[6.8, [['A DISCIPLINA']]], [7.15, [['FAZ NO RITMO.']]]] },
    { s: 10.0, e: 10.75, lines: [[10.0, [['BATE A META']]], [10.25, [['@DOWN@']]]] },
    { s: 10.9, e: 12.3, lines: [[10.9, [['O EGO E A OBSESSÃO']]], [11.4, [['PASSAM DA META.']]]] },
    { s: 12.4, e: 13.72, lines: [[12.4, [['OS BRAÇOS DELA']]], [12.8, [['DOEM.', 'obs']]]] },
    { s: 13.8, e: 14.6, lines: [[13.8, [['ELA PARA']]], [14.0, [['PRIMEIRO.']]]] },
    { s: 14.65, e: REGRAB_T - 0.1, lines: [[14.65, [['O EGO PASSA']]], [14.9, [['NA FRENTE.']]]] },
    { s: REGRAB_T - 0.05, e: PASS_T - 0.1, lines: [[REGRAB_T - 0.05, [['MAS ELA VOLTA']]], [REGRAB_T + 0.3, [['MAIS RÁPIDO.']]]] },
    { s: PASS_T - 0.05, e: 17.2, lines: [[PASS_T - 0.05, [['E PASSA']]], [PASS_T + 0.2, [['O EGO.']]]] },
    { s: 17.3, e: 18.2, lines: [[17.3, [['SEM PLATEIA,']]], [17.6, [['@QUIT@']]]] },
    { s: 18.25, e: 18.95, lines: [[18.25, [['ELA NÃO PARA.']]]] },"""
CAPS = {
    'barra': """
    { s: -1, e: 2.85, lines: [[-1, [['QUATRO BARRAS.']]], [0.3, [['SÓ '], ['UM', 'obs'], [' PASSA POR CIMA.']]]] },""" + DUEL.replace('@BACK@', 'VOLTA PRA BARRA.').replace('@QUIT@', 'O EGO SOLTA.').replace('@DOWN@', 'E DESCE.') + """
    { s: 21.0, e: 99, big: true, lines: [[21.0, [['CAIU? SOBE DE NOVO.']]]] },""",
    'flexao': """
    { s: -1, e: 2.85, lines: [[-1, [['QUATRO FLEXÕES.']]], [0.3, [['SÓ '], ['UM', 'obs'], [' NÃO DESISTE.']]]] },""" + DUEL.replace('@BACK@', 'EMPURRA DE NOVO.').replace('@QUIT@', 'O EGO DESISTE.').replace('@DOWN@', 'E PARA.') + """
    { s: 21.0, e: 99, big: true, lines: [[21.0, [['DOEU? CONTINUA.']]]] },""",
}[TH]
HEAD = {'barra': ('MESMA BARRA', 'QUATRO BARRAS.'), 'flexao': ('MESMO TREINO', 'QUATRO FLEXÕES.')}[TH]

consts = f"""  // ---------- boneco de perfil ----------
  const THEME = '{TH}', BAR = THEME === 'barra';
  const D = {{ headR: 30, limb: 22, torsoW: 25, ol: 5, torso: 100, uArm: 60, fArm: 56, thigh: 82, shin: 78, foot: 20 }};
  const OUT = '#0e0e10';
  const WHITE = [247, 247, 245], BACK = [196, 196, 200], DARK = [88, 88, 94], DARKB = [62, 62, 68];
  const NEU = [214, 212, 206], ACC = [214, 80, 66], ACCB = [168, 62, 52];
  const COL = {{ disc: NEU, obs: NEU, motiv: NEU, ego: NEU }};
  const KS = ['disc', 'obs', 'motiv', 'ego'];
  const HX = BAR ? {{ motiv: 210, disc: 510, ego: 810, obs: 1110 }} : {{ motiv: -45, disc: 340, ego: 725, obs: 1110 }};
  const CX = (k) => HX[k] + (BAR ? 0 : 150);
"""
rig = L(55, 91).replace("fwd: (c) => c[0] - 0.2 * c[1] };", "fwd: (c) => c[0] - 0.2 * c[1], fdown: (c) => 0.6 * c[0] + c[1] };")
assert 'fdown' in rig
caps = "  // ---------- texto ----------\n  const CAPS = [" + CAPS + "\n  ];\n" + L(399, 422)
js = ("// Treino (" + TH + "): Disciplina x Obsessão x Motivação x Ego — 2D vetorial, função pura do tempo.\n"
      "// Disputa final EGO x OBSESSÃO: ela para primeiro (dor), o ego passa na frente, ela volta e passa o ego. Paleta minimalista; 25 s.\n"
      + L(3, 42) + '\n' + consts + rig + '\n' + open(HF + '/reps_body.js').read() + caps + '\n' + open(HF + '/reps_tail.js').read())

if os.path.exists(HF + '/' + P): shutil.rmtree(HF + '/' + P)
os.makedirs(HF + '/' + P + '/assets'); shutil.copytree(HF + '/gelo/assets/vendor', HF + '/' + P + '/assets/vendor'); shutil.copy(HF + '/gelo/hyperframes.json', HF + '/' + P + '/')
open(HF + '/' + P + '/meta.json', 'w').write('{"id":"%s","name":"%s","createdAt":"2026-11-26T00:00:00.000Z"}' % (P, P))
open(HF + '/' + P + '/assets/' + P + '.js', 'w').write(js)
h = open(HF + '/foco/index.html').read()
h = h.replace('MESMA ÁRVORE', HEAD[0]).replace('QUATRO MACHADOS.', HEAD[1]).replace('assets/foco.js', 'assets/%s.js' % P)
WIDE = {'barra': (660, 0.88, 0), 'flexao': (692, 0.64, 150)}[TH]
HXs = {'barra': {'motiv': 210, 'disc': 510, 'ego': 810, 'obs': 1110}, 'flexao': {'motiv': -45, 'disc': 340, 'ego': 725, 'obs': 1110}}[TH]
for k, x in HXs.items():
    lx = round(540 + (x + WIDE[2] - WIDE[0]) * WIDE[1])
    h, n = re.subn(r'(<div id="lab-%s" class="lab" style="left: )\d+px' % k, lambda m: m.group(1) + '%dpx' % lx, h); assert n == 1
h = h.replace('n">0 M<', 'n">0<')
for a_, b_ in [('1 · DISCIPLINA', '2 · DISCIPLINA'), ('2 · OBSESSÃO', '4 · OBSESSÃO'), ('3 · MOTIVAÇÃO', '1 · MOTIVAÇÃO'), ('4 · EGO', '3 · EGO')]:
    assert h.count('>' + a_ + '<') == 1, a_; h = h.replace('>' + a_ + '<', '>' + b_ + '<')
open(HF + '/' + P + '/index.html', 'w').write(h)
print('ok', P)
