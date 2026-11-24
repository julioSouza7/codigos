"""Confere se os efeitos do faz (pan>0) e do pensa demais (pan<0) se sobrepõem. Uso: python3 check_audio.py schedule.json"""
import json, sys, wave, os
S = json.load(open(sys.argv[1])); SONS = '/home/user/codigos/videos/trilha/sons'
SY = {'tuu': 1.3, 'busy': 1.2, 'knock': 0.5, 'clap': 0.06, 'splash': 1.0, 'splash_s': 0.6, 'doorbell': 1.6, 'clank': 0.8, 'cardbeep': 0.35, 'box': 0.35, 'crunch': 0.25, 'ding': 0.9, 'breath_in': 0.38, 'exhale': 0.9, 'beep': 0.3, 'fan': 1.2, 'thud': 0.6, 'blow': 1.0, 'ring': 1.3, 'bigring': 2.0, 'swish': 0.25, 'whoosh': 0.45, 'pop': 0.08, 'scroll': 0.09, 'tick': 0.03, 'chime': 1.4, 'sad': 2.2, 'rain': 2.0, 'slap': 0.12}
ev = []
for e in S['fx']:
    t0, typ, g, pan = e[:4]; prm = e[4] if len(e) > 4 else None
    if pan == 0: continue
    if typ == 'strum': d = float(prm.split('/')[1]) if '/' in prm else 2.0
    elif typ == 'pluck': d = 1.4
    elif typ in ('applause', 'murmur', 'roar', 'crickets', 'wind', 'paddle', 'ominous', 'rewind'): d = prm
    elif typ in ('slowrip', 'water', 'scrub', 'drill', 'buzz', 'scribble', 'typing', 'noise'): d = prm
    elif '/' in typ:
        w = wave.open(os.path.join(SONS, typ + '.wav')); d = w.getnframes() / w.getframerate() / (prm or 1)
    else: d = SY.get(typ, 0.5)
    ev.append((round(t0, 2), round(t0 + d, 2), 'faz' if pan > 0 else 'pensa', typ))
bad = [(a, b) for a in ev for b in ev if a[2] == 'faz' and b[2] == 'pensa' and a[0] < b[1] - 0.02 and b[0] < a[1] - 0.02]
for a, b in bad: print('SOBREPOSIÇÃO', a, b)
print('ok, sem sobreposição' if not bad else f'{len(bad)} sobreposições')
sys.exit(1 if bad else 0)
