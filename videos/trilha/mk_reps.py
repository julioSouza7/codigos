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

CAPS = {
    'barra': """
    { s: -1, e: 2.85, lines: [[-1, [['QUATRO BARRAS.']]], [0.3, [['SÓ '], ['UM', 'obs'], [' PASSA POR CIMA.']]]] },
    { s: 3.0, e: 5.5, lines: [[3.0, [['A MOTIVAÇÃO']]], [3.35, [['COMEÇA A MIL.']]]] },
    { s: 5.6, e: 6.85, lines: [[5.6, [['E SOLTA NO']]], [5.95, [['PRIMEIRO CANSAÇO.']]]] },
    { s: 7.0, e: 9.7, lines: [[7.0, [['O EGO']]], [7.35, [['PUXA PRA SER VISTO.']]]] },
    { s: 9.8, e: 11.1, lines: [[9.8, [['SEM PLATEIA,']]], [10.15, [['SOLTA A BARRA.']]]] },
    { s: 11.3, e: 13.9, lines: [[11.3, [['A DISCIPLINA']]], [11.65, [['PUXA NO RITMO.']]]] },
    { s: 14.0, e: 14.95, lines: [[14.0, [['BATE A META']]], [14.3, [['E DESCE.']]]] },
    { s: 15.1, e: 16.3, lines: [[15.1, [['A OBSESSÃO']]], [15.45, [['PASSA DA META.']]]] },
    { s: 16.35, e: 17.2, lines: [[16.35, [['OS BRAÇOS']]], [16.6, [['DOEM.', 'obs']]]] },
    { s: 17.25, e: 18.0, lines: [[17.25, [['ELA CAI.']]]] },
    { s: 18.05, e: 18.95, lines: [[18.05, [['E VOLTA']]], [18.3, [['PRA BARRA.']]]] },
    { s: 21.0, e: 99, big: true, lines: [[21.0, [['CAIU? SOBE DE NOVO.']]]] },""",
    'flexao': """
    { s: -1, e: 2.85, lines: [[-1, [['QUATRO FLEXÕES.']]], [0.3, [['SÓ '], ['UM', 'obs'], [' NÃO PARA.']]]] },
    { s: 3.0, e: 5.5, lines: [[3.0, [['A MOTIVAÇÃO']]], [3.35, [['COMEÇA A MIL.']]]] },
    { s: 5.6, e: 6.85, lines: [[5.6, [['E DEITA NO']]], [5.95, [['PRIMEIRO CANSAÇO.']]]] },
    { s: 7.0, e: 9.7, lines: [[7.0, [['O EGO']]], [7.35, [['TREINA PRA SER VISTO.']]]] },
    { s: 9.8, e: 11.1, lines: [[9.8, [['SEM PLATEIA,']]], [10.15, [['DESISTE.']]]] },
    { s: 11.3, e: 13.9, lines: [[11.3, [['A DISCIPLINA']]], [11.65, [['FAZ NO RITMO.']]]] },
    { s: 14.0, e: 14.95, lines: [[14.0, [['BATE A META']]], [14.3, [['E PARA.']]]] },
    { s: 15.1, e: 16.3, lines: [[15.1, [['A OBSESSÃO']]], [15.45, [['PASSA DA META.']]]] },
    { s: 16.35, e: 17.2, lines: [[16.35, [['OS BRAÇOS']]], [16.6, [['DOEM.', 'obs']]]] },
    { s: 17.25, e: 18.0, lines: [[17.25, [['ELA DESABA.']]]] },
    { s: 18.05, e: 18.95, lines: [[18.05, [['E EMPURRA']]], [18.3, [['DE NOVO.']]]] },
    { s: 21.0, e: 99, big: true, lines: [[21.0, [['DOEU? CONTINUA.']]]] },""",
}[TH]
HEAD = {'barra': ('MESMA BARRA', 'QUATRO BARRAS.'), 'flexao': ('MESMO TREINO', 'QUATRO FLEXÕES.')}[TH]

consts = f"""  // ---------- boneco de perfil ----------
  const THEME = '{TH}', BAR = THEME === 'barra';
  const D = {{ headR: 31, limb: 26, torsoW: 30, ol: 5, torso: 100, uArm: 60, fArm: 56, thigh: 82, shin: 78, foot: 20 }};
  const OUT = '#0e0e10';
  const WHITE = [247, 247, 245], BACK = [196, 196, 200], DARK = [88, 88, 94], DARKB = [62, 62, 68];
  const NEU = [214, 212, 206], ACC = [214, 80, 66], ACCB = [168, 62, 52];
  const COL = {{ disc: NEU, obs: NEU, motiv: NEU, ego: NEU }};
  const KS = ['disc', 'obs', 'motiv', 'ego'];
  const HX = BAR ? {{ disc: 70, obs: 405, motiv: 740, ego: 1075 }} : {{ disc: -45, obs: 340, motiv: 725, ego: 1110 }};
  const CX = (k) => HX[k] + (BAR ? 85 : 150);
"""
rig = L(55, 91).replace("fwd: (c) => c[0] - 0.2 * c[1] };", "fwd: (c) => c[0] - 0.2 * c[1], fdown: (c) => 0.6 * c[0] + c[1] };")
assert 'fdown' in rig
caps = "  // ---------- texto ----------\n  const CAPS = [" + CAPS + "\n  ];\n" + L(399, 422)
js = ("// Treino (" + TH + "): Disciplina x Obsessão x Motivação x Ego — 2D vetorial, função pura do tempo.\n"
      "// Regras do canal (@stick.obsessao): a OBSESSÃO sempre vence; paleta minimalista, vermelho só na obsessão; 25 s.\n"
      + L(3, 42) + '\n' + consts + rig + '\n' + open(HF + '/reps_body.js').read() + caps + '\n' + open(HF + '/reps_tail.js').read())

if os.path.exists(HF + '/' + P): shutil.rmtree(HF + '/' + P)
os.makedirs(HF + '/' + P + '/assets'); shutil.copytree(HF + '/gelo/assets/vendor', HF + '/' + P + '/assets/vendor'); shutil.copy(HF + '/gelo/hyperframes.json', HF + '/' + P + '/')
open(HF + '/' + P + '/meta.json', 'w').write('{"id":"%s","name":"%s","createdAt":"2026-11-26T00:00:00.000Z"}' % (P, P))
open(HF + '/' + P + '/assets/' + P + '.js', 'w').write(js)
h = open(HF + '/foco/index.html').read()
h = h.replace('MESMA ÁRVORE', HEAD[0]).replace('QUATRO MACHADOS.', HEAD[1]).replace('assets/foco.js', 'assets/%s.js' % P)
WIDE = {'barra': (667, 0.86, 85), 'flexao': (692, 0.64, 150)}[TH]
HXs = {'barra': {'disc': 70, 'obs': 405, 'motiv': 740, 'ego': 1075}, 'flexao': {'disc': -45, 'obs': 340, 'motiv': 725, 'ego': 1110}}[TH]
for k, x in HXs.items():
    lx = round(540 + (x + WIDE[2] - WIDE[0]) * WIDE[1])
    h, n = re.subn(r'(<div id="lab-%s" class="lab" style="left: )\d+px' % k, lambda m: m.group(1) + '%dpx' % lx, h); assert n == 1
h = h.replace('n">0 M<', 'n">0<')
open(HF + '/' + P + '/index.html', 'w').write(h)
print('ok', P)
