"""Tipo A 'treino v3' — 4 temas: agach | corda | halter | saco.
4 personagens, zoom em cada um, disputa final EGO x OBSESSÃO (ela para primeiro por dor, volta mais rápida e passa o ego).
Uso: python3 mk_treino.py agach|corda|halter|saco"""
import sys, os, shutil, re
KIT = os.path.dirname(os.path.abspath(__file__))
WORK = os.environ.get('TREINO_WORK', '/tmp/treino_work')
TH = sys.argv[1]
P = TH + '4'
foco = open(KIT + '/base/foco.js').read().split('\n')
L = lambda a, b: '\n'.join(foco[a - 1:b])
assert foco[54].startswith('  function ikP') and foco[90].startswith('  const disc'), (foco[54], foco[90])
assert foco[398].startswith('  const capEl') and foco[421].startswith('  const fmt'), (foco[398], foco[421])

CFG = {
    'agach': dict(head='MESMA CARGA', hook1='QUATRO AGACHAMENTOS.', hook2=' SALTA.', part='AS PERNAS DELA', quit='O EGO LARGA.', final='TREMEU? LEVANTA.'),
    'corda': dict(head='MESMA CORDA', hook1='QUATRO CORDAS.', hook2=' ACELERA.', part='AS PERNAS DELA', quit='O EGO PARA.', final='TROPEÇOU? CONTINUA.'),
    'halter': dict(head='MESMO PESO', hook1='QUATRO PESOS.', hook2=' CHEGA AO TOPO.', part='OS BRAÇOS DELA', quit='O EGO LARGA.', final='PESOU? LEVANTA.'),
    'saco': dict(head='MESMO SACO', hook1='QUATRO SACOS.', hook2=' DERRUBA O SACO.', part='OS BRAÇOS DELA', quit='O EGO PARA.', final='DOEU? BATE DE NOVO.'),
}[TH]
CAPS = f"""
    {{ s: -1, e: 2.85, lines: [[-1, [['{CFG['hook1']}']]], [0.3, [['SÓ '], ['UM', 'obs'], ['{CFG['hook2']}']]]] }},
    {{ s: 3.0, e: 5.5, lines: [[3.0, [['A MOTIVAÇÃO']]], [3.35, [['COMEÇA A MIL.']]]] }},
    {{ s: 5.6, e: 6.5, lines: [[5.6, [['E PARA NO']]], [5.85, [['PRIMEIRO CANSAÇO.']]]] }},
    {{ s: 6.8, e: 9.9, lines: [[6.8, [['A DISCIPLINA']]], [7.15, [['FAZ NO RITMO.']]]] }},
    {{ s: 10.0, e: 10.75, lines: [[10.0, [['BATE A META']]], [10.25, [['E PARA.']]]] }},
    {{ s: 10.9, e: 12.3, lines: [[10.9, [['O EGO E A OBSESSÃO']]], [11.4, [['PASSAM DA META.']]]] }},
    {{ s: 12.4, e: 13.72, lines: [[12.4, [['{CFG['part']}']]], [12.8, [['DOEM.', 'obs']]]] }},
    {{ s: 13.8, e: 14.6, lines: [[13.8, [['ELA PARA']]], [14.0, [['PRIMEIRO.']]]] }},
    {{ s: 14.65, e: REGRAB_T - 0.1, lines: [[14.65, [['O EGO PASSA']]], [14.9, [['NA FRENTE.']]]] }},
    {{ s: REGRAB_T - 0.05, e: PASS_T - 0.1, lines: [[REGRAB_T - 0.05, [['MAS ELA VOLTA']]], [REGRAB_T + 0.3, [['MAIS RÁPIDO.']]]] }},
    {{ s: PASS_T - 0.05, e: 17.2, lines: [[PASS_T - 0.05, [['E PASSA']]], [PASS_T + 0.2, [['O EGO.']]]] }},
    {{ s: 17.3, e: 18.2, lines: [[17.3, [['SEM PLATEIA,']]], [17.6, [['{CFG['quit']}']]]] }},
    {{ s: 18.25, e: 18.95, lines: [[18.25, [['ELA NÃO PARA.']]]] }},
    {{ s: 21.0, e: 99, big: true, lines: [[21.0, [['{CFG['final']}']]]] }},"""

consts = f"""  // ---------- boneco ----------
  const THEME = '{TH}';
  const D = {{ headR: 30, limb: 22, torsoW: 25, ol: 5, torso: 100, uArm: 60, fArm: 56, thigh: 82, shin: 78, foot: 20 }};
  const OUT = '#0e0e10';
  const WHITE = [247, 247, 245], BACK = [196, 196, 200], DARK = [88, 88, 94], DARKB = [62, 62, 68];
  const NEU = [214, 212, 206], ACC = [214, 80, 66], ACCB = [168, 62, 52];
  const COL = {{ disc: NEU, obs: NEU, motiv: NEU, ego: NEU }};
  const KS = ['disc', 'obs', 'motiv', 'ego'];
"""
rig = L(55, 91)
caps = "  // ---------- texto ----------\n  const CAPS = [" + CAPS + "\n  ];\n" + L(399, 422)
js = ("// Treino (" + TH + "): Motivação x Disciplina x Ego x Obsessão — 2D vetorial, função pura do tempo.\n"
      "// Disputa final EGO x OBSESSÃO: ela para primeiro (dor), o ego passa na frente, ela volta mais rápida e passa o ego. Paleta minimalista; 25 s.\n"
      + L(3, 42) + '\n' + consts + rig + '\n' + open(KIT + '/treino_body.js').read() + caps + '\n' + open(KIT + '/treino_tail.js').read())

OUT = os.path.join(WORK, P)
if os.path.exists(OUT): shutil.rmtree(OUT)
os.makedirs(OUT + '/assets'); shutil.copytree(KIT + '/base/vendor', OUT + '/assets/vendor'); shutil.copy(KIT + '/base/hyperframes.json', OUT + '/')
open(OUT + '/meta.json', 'w').write('{"id":"%s","name":"%s","createdAt":"2026-11-28T00:00:00.000Z"}' % (P, P))
open(OUT + '/assets/' + P + '.js', 'w').write(js)
h = open(KIT + '/base/index.html').read()
h = h.replace('MESMA ÁRVORE', CFG['head']).replace('QUATRO MACHADOS.', CFG['hook1']).replace('assets/foco.js', 'assets/%s.js' % P)
if TH == 'saco': wcx, ws, xs = 650, 0.82, {'motiv': 165, 'disc': 460, 'ego': 755, 'obs': 1050}
else: wcx, ws, xs = 660, 0.88, {'motiv': 210, 'disc': 510, 'ego': 810, 'obs': 1110}
for k, x in xs.items():
    lx = round(540 + (x - wcx) * ws)
    h, n = re.subn(r'(<div id="lab-%s" class="lab" style="left: )\d+px' % k, lambda m: m.group(1) + '%dpx' % lx, h); assert n == 1
h = h.replace('n">0 M<', 'n">0<')
for a_, b_ in [('1 · DISCIPLINA', '2 · DISCIPLINA'), ('2 · OBSESSÃO', '4 · OBSESSÃO'), ('3 · MOTIVAÇÃO', '1 · MOTIVAÇÃO'), ('4 · EGO', '3 · EGO')]:
    assert h.count('>' + a_ + '<') == 1, a_; h = h.replace('>' + a_ + '<', '>' + b_ + '<')
open(OUT + '/index.html', 'w').write(h)
print('ok', OUT)
