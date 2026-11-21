"""Efeitos genéricos do tipo B (faz x pensa demais) + mix com a trilha.
Uso: python3 sfx_fp.py schedule.json music_raw.wav saida.wav
Lê do schedule: slam, report, words, steps [[t,painel,corrida,ganho]], talks [[t,painel]], fx [[t,tipo,ganho,pan]], heart [t0,t1]."""
import json, sys, wave
import numpy as np
SR = 48000
S = json.load(open(sys.argv[1]))
with wave.open(sys.argv[2]) as w:
    raw = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).reshape(-1, 2) / 32768.0
N = len(raw); L = np.zeros(N); R = np.zeros(N); rng = np.random.default_rng(505)
PAN = {'pensa': -0.35, 'faz': 0.35}
def add(sig, t0, g=1.0, pan=0.0):
    i = int(t0 * SR)
    if i >= N or i < 0: return
    j = min(N, i + len(sig)); s = sig[: j - i] * g
    L[i:j] += s * min(1, 1 - pan); R[i:j] += s * min(1, 1 + pan)
def tt(d): return np.arange(int(SR * d)) / SR
def lp(x, fc):
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR); X *= 1 / np.sqrt(1 + (f / fc) ** 4); return np.fft.irfft(X, len(x))
def bp(x, lo, hi):
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR); X *= (f > lo) & (f < hi); return np.fft.irfft(X, len(x))
def thump(f0, f1, d, dec):
    t = tt(d); f = f1 + (f0 - f1) * np.exp(-t * 25); return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * dec)
def tone(f, d, dec=10, a=0.004):
    t = tt(d); return np.sin(2 * np.pi * f * t) * np.minimum(1, t / a) * np.exp(-t * dec)
def bell(f, d=1.2, dec=3):
    t = tt(d); return (np.sin(2 * np.pi * f * t) + 0.35 * np.sin(4 * np.pi * f * t) * np.exp(-t * 4)) * np.minimum(1, t / 0.002) * np.exp(-t * dec)
def lerp_(a, b, u): return a + (b - a) * u
def note(m): return 440 * 2 ** ((m - 69) / 12)
def step(run):
    n = lp(rng.standard_normal(int(SR * 0.08)), 1800 + 1200 * run) * np.exp(-tt(0.08) * 60)
    return n * 0.7 + thump(110, 60, 0.08, 40) * 0.6
def whoosh(d=0.45):
    t = tt(d); n = rng.standard_normal(len(t)); out = np.zeros(len(t)); ch = 2048
    for i in range(0, len(t), ch):
        u = i / len(t); fc = 400 + 3000 * np.sin(np.pi * u); out[i:i + ch] = lp(n[i:i + ch], fc)
    return out * np.sin(np.pi * np.clip(t / d, 0, 1)) ** 2
def sad():
    out = np.zeros(int(SR * 2.2))
    for i, (m, d) in enumerate([(55, 0.38), (54, 0.38), (53, 0.38), (52, 1.0)]):
        t = tt(d); f = note(m) * (1 + 0.012 * np.sin(2 * np.pi * 5.5 * t) * (t > 0.15))
        ph = np.cumsum(f) / SR; s = (2 * (ph % 1) - 1); s = lp(s, 1400) * np.minimum(1, t / 0.03) * np.exp(-t * (1.0 if i == 3 else 2.5))
        k = int(sum([0.38] * i) * SR); out[k:k + len(s)] += s
    return out
def ring(d=1.3):
    out = np.zeros(int(SR * d)); k = 0
    while k / SR < d - 0.1:
        for j in range(4):
            s = np.sign(np.sin(2 * np.pi * 2300 * tt(0.05))) * 0.5 * np.exp(-tt(0.05) * 5); i = k + int(j * 0.075 * SR); out[i:i + len(s)] += s[: len(out) - i]
        k += int(0.5 * SR)
    return lp(out, 5000)
def slap():
    s = lp(rng.standard_normal(int(SR * 0.12)), 4000) * np.exp(-tt(0.12) * 45); th = thump(200, 90, 0.1, 30); s[:len(th)] += th * 0.5; return s
def rain(d=2.0):
    t = tt(d); return lp(rng.standard_normal(len(t)), 2500) * 0.4 * np.minimum(1, t / 0.3) * np.minimum(1, (d - t) / 0.4)
def chime():
    out = np.zeros(int(SR * 1.4))
    for i, m in enumerate([84, 88, 91, 96]):
        s = bell(note(m), 1.0, 4); k = int(i * 0.07 * SR); out[k:k + len(s)] += s[: len(out) - k]
    return out
def pop():
    t = tt(0.08); return np.sin(2 * np.pi * (500 + 900 * np.exp(-t * 50)) * t) * np.exp(-t * 45)
def beep2():
    out = np.zeros(int(SR * 0.4)); s = tone(1500, 0.11, 18)
    for k in (0, int(0.16 * SR)): out[k:k + len(s)] += s
    return out
import os
SONS = sys.argv[4] if len(sys.argv) > 4 else '/home/user/codigos/videos/trilha/sons'
_cache = {}
def clip(name, rate=1.0):
    if name not in _cache:
        with wave.open(os.path.join(SONS, name + '.wav')) as w:
            x = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16) / 32768.0
            if w.getnchannels() > 1: x = x.reshape(-1, w.getnchannels()).mean(1)
        _cache[name] = x
    x = _cache[name]
    if rate != 1.0:
        idx = np.arange(0, len(x) - 1, rate); x = np.interp(idx, np.arange(len(x)), x)
    return x
def band(n, lo, hi):
    return bp(n, lo, hi)
def slowrip(d):
    # descolar devagar: grãos do velcro real em velocidade reduzida, densidade irregular
    src = clip('foley/velcro_01', 0.7); out = np.zeros(int(SR * d) + SR // 4); t = 0.0
    while t < d:
        g = int(SR * rng.uniform(0.04, 0.11)); a = rng.integers(0, len(src) - g); seg_ = src[a:a + g] * np.hanning(g) * rng.uniform(0.4, 1.0)
        i = int(t * SR); out[i:i + g] += seg_[: len(out) - i]; t += rng.uniform(0.025, 0.07)
    env = np.minimum(1, np.arange(len(out)) / (0.05 * SR)); return out * env
def breath_in(d=0.38):
    t = tt(d); n = rng.standard_normal(len(t)); return band(n, 2200, 7500) * (t / d) ** 1.5 * np.minimum(1, (d - t) / 0.02 + 0.0)
def exhale(d=0.9):
    t = tt(d); n = rng.standard_normal(len(t)); return (band(n, 250, 1800) * 0.8 + band(n, 1800, 4000) * 0.2) * np.minimum(1, t / 0.05) * np.exp(-t * 3)
def blow(d=1.0):
    t = tt(d); n = rng.standard_normal(len(t)); return lp(n, 1400) * np.minimum(1, t / 0.08) * np.exp(-t * 1.6) * (0.75 + 0.25 * np.sin(2 * np.pi * 7 * t))
def fan():
    out = np.zeros(int(SR * 1.2))
    for i in range(4):
        s = whoosh(0.14); k = int(i * 0.26 * SR); out[k:k + len(s)] += s[: len(out) - k]
    return out
def scrollsw():
    t = tt(0.09); n = rng.standard_normal(len(t)); return band(n, 3000, 9000) * np.sin(np.pi * t / 0.09) ** 2 * 0.6
def birds(d=10.0):
    out = np.zeros(int(SR * d)); x = 0.3
    while x < d - 0.5:
        for j in range(rng.integers(2, 5)):
            t = tt(0.07); f0 = rng.uniform(2800, 4200); f = f0 + 1600 * np.sin(np.pi * t / 0.07); s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * t / 0.07) ** 2
            i = int((x + j * 0.09) * SR); out[i:i + len(s)] += s[: len(out) - i]
        x += rng.uniform(0.6, 1.6)
    return out
FX = {'scroll': scrollsw, 'birds': lambda: birds(10.5), 'whoosh': lambda: whoosh(), 'chime': chime, 'pop': pop, 'beep': beep2, 'thud': lambda: thump(90, 38, 0.6, 6), 'sad': sad, 'rain': lambda: rain(2.0),
      'ring': lambda: ring(1.3), 'slap': slap, 'swish': lambda: whoosh(0.25), 'tick': lambda: tone(2600, 0.03, 80), 'bigring': lambda: ring(2.0), 'breath_in': lambda: breath_in(), 'exhale': lambda: exhale(), 'blow': lambda: blow(), 'fan': fan}

add(thump(120, 50, 0.6, 7), S['slam'], 0.3)
for t0, k, run, g in S.get('steps', []):
    add(step(run), t0, 0.09 * g * (1 + 0.6 * run), PAN[k])
# fala: três sílabas "bip" de desenho animado
for t0, k in ([] if S.get('noBips') else S.get('talks', [])):
    base = 330 if k == 'pensa' else 420
    for j in range(3):
        f = base * (1 + 0.25 * rng.random()); add(tone(f, 0.07, 30, 0.006) * (1 + 0.3 * np.sign(np.sin(2 * np.pi * f * 2 * tt(0.07)))), t0 + j * 0.085, 0.045, PAN[k])
for e in S.get('fx', []):
    t0, typ, g, pan = e[:4]; prm = e[4] if len(e) > 4 else None
    if typ == 'slowrip': sig = slowrip(prm)
    elif '/' in typ: sig = clip(typ, prm or 1.0)
    else: sig = FX[typ]()
    add(sig, t0, g, pan)
# coração gravado acelerando
for t0, t1, pan in S.get('heartReal', []):
    hb = clip('foley/heartbeat_fast'); x = t0
    while x < t1:
        u = (x - t0) / (t1 - t0); add(lp(hb, 900), x, 0.35 + 0.35 * u, pan); x += lerp_(1.15, 0.62, u)
# ambiente do cômodo (ar parado), bem baixo
add(lp(rng.standard_normal(N), 600) * 0.004, 0.0, 1.0)
if S.get('heart'):
    x, t1 = S['heart']; x0 = x
    while x < t1 - 0.2:
        add(thump(70, 40, 0.25, 14), x, 0.26, PAN['pensa']); add(thump(60, 38, 0.25, 16), x + 0.13, 0.19, PAN['pensa'])
        x += 60 / (68 + 60 * (x - x0) / (t1 - x0))
W0 = S['report']
add(thump(70, 30, 1.2, 3), W0, 0.35)
for i, m in enumerate([86, 89, 93, 98]): add(bell(note(m), 1.4, 3.5), W0 + 0.4 + 0.08 * i, 0.06, -0.3 + 0.2 * i)
for t0 in S['words']: add(pop(), t0, 0.04)
fx = np.stack([L, R], 1); mix = raw * S.get('music', 0.6) + fx
fade = np.ones(N); fn = int(0.6 * SR); fade[-fn:] = np.linspace(1, 0, fn); mix *= fade[:, None]
mix = np.tanh(mix * 1.1); mix /= np.max(np.abs(mix)) / 0.89
with wave.open(sys.argv[3], 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((mix * 32767).astype(np.int16).tobytes())
print('ok')
