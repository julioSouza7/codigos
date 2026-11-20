"""Efeitos da corda sincronizados com schedule.json + mix com a trilha.
Uso: python3 sfx_corda.py schedule.json music_raw.wav saida.wav"""
import json, sys, wave
import numpy as np

SR = 48000
sched = json.load(open(sys.argv[1]))
with wave.open(sys.argv[2]) as w:
    raw = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).reshape(-1, 2) / 32768.0
N = len(raw)
L = np.zeros(N); R = np.zeros(N)
rng = np.random.default_rng(611)


def add(sig, t0, gain=1.0, pan=0.0):
    i = int(t0 * SR)
    if i >= N or i < 0: return
    j = min(N, i + len(sig)); s = sig[: j - i] * gain
    L[i:j] += s * min(1, 1 - pan); R[i:j] += s * min(1, 1 + pan)


def mx(*parts):
    n = max(len(p) for p in parts); out = np.zeros(n)
    for p in parts: out[: len(p)] += p
    return out


def tt(dur): return np.arange(int(SR * dur)) / SR
def note(m): return 440 * 2 ** ((m - 69) / 12)


def bell(f, dur=0.9, dec=3.2):
    t = tt(dur); a = np.minimum(1, t / 0.002)
    s = np.sin(2 * np.pi * f * t) + 0.35 * np.sin(2 * np.pi * 2 * f * t) * np.exp(-t * 4) + 0.12 * np.sin(2 * np.pi * 3.01 * f * t) * np.exp(-t * 7)
    return s * a * np.exp(-t * dec)


def thump(f0=110, f1=45, dur=0.5, dec=7):
    t = tt(dur); f = f1 + (f0 - f1) * np.exp(-t * 25)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * dec)


def noise(dur, dec, smooth=1):
    t = tt(dur); n = rng.standard_normal(len(t))
    if smooth > 1: n = np.convolve(n, np.ones(smooth) / smooth, 'same')
    return n * np.exp(-t * dec)


def tick(f):
    t = tt(0.08)
    return (0.7 * np.sin(2 * np.pi * f * t) * np.exp(-t * 60) + 0.35 * noise(0.08, 90, 2)) * np.minimum(1, t / 0.0006)


def metal(f, dur=0.7):
    t = tt(dur)
    return sum(a * np.sin(2 * np.pi * f * r * t) * np.exp(-t * d) for r, a, d in [(1, 1, 6), (2.76, 0.6, 8), (5.4, 0.4, 12), (8.93, 0.25, 16)])


def clap():
    t = tt(0.12); n = rng.standard_normal(len(t))
    b = np.convolve(n, np.ones(5) / 5, 'same') - np.convolve(n, np.ones(30) / 30, 'same')
    return b * np.exp(-t * 35)


PAN = {'disc': -0.55, 'obs': -0.2, 'motiv': 0.2, 'ego': 0.55}
def lp(x, fc):
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR); X *= 1 / np.sqrt(1 + (f / fc) ** 4); return np.fft.irfft(X, len(x))
def rope():
    n = int(SR * 0.12); return lp(rng.standard_normal(n), 2200) * np.exp(-np.arange(n) / SR * 30)
# gancho: pulo + agarrar
add(mx(thump(120, 50, 0.4, 9), 0.6 * rope()), sched['slam'], 0.3)
for k, times in sched['grabs'].items():
    for t0 in times:
        add(mx(rope(), 0.3 * thump(140, 70, 0.1, 30)), t0, 0.07 if k != 'obs' else 0.09, PAN[k])
# motivação: escorrega (zíper descendo) e cai sentada
d = 0.75; t = tt(d); f = 900 * np.exp(-t * 2.2) + 120
add(lp(np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)) * 0.4 + 0.6 * rng.standard_normal(len(t)), 2500) * np.exp(-t * 1.5), sched['motivSlide'], 0.1, PAN['motiv'])
add(thump(85, 40, 0.5, 8), sched['motivLand'], 0.35, PAN['motiv'])
# plateia do ego
c0, c1 = sched['crowd']
x = c0
while x < c1 + 0.3:
    fade = 1.0 if x < c1 else max(0.0, 1 - (x - c1) / 0.3)
    add(clap(), x + rng.uniform(0, 0.02), rng.uniform(0.04, 0.09) * fade, rng.uniform(0.3, 0.9)); x += rng.uniform(0.03, 0.07)
t = tt(0.8); f = 380 * np.exp(-t * 3.2) + 50
add(np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 3) * np.minimum(1, t / 0.02), sched['egoFreeze'], 0.14, PAN['ego'])
# disciplina bate a meta
for k, m in enumerate([79, 84, 88, 91]):
    add(bell(note(m), 1.2, 3), sched['meta'] + 0.06 * k, 0.08, PAN['disc'])
add(thump(95, 40, 0.4, 9), sched['meta'] + 0.7, 0.25, PAN['disc'])
# SINO da obsessão
W0 = sched['payoff']
for r, a, dec in [(1, 1.0, 1.0), (2.0, 0.5, 1.4), (2.76, 0.35, 2.0), (5.4, 0.25, 3.0)]:
    t = tt(5.5); add(np.sin(2 * np.pi * 330 * r * t) * np.exp(-t * dec) * np.minimum(1, t / 0.003), W0, 0.22 * a, -0.2)
add(thump(80, 35, 0.8, 4), W0, 0.3)
# palavras pulando
for t0 in sched['words']:
    tp = tt(0.06); add(np.sin(2 * np.pi * (900 + 600 * np.exp(-tp * 60)) * tp) * np.exp(-tp * 70), t0, 0.05, rng.uniform(-0.15, 0.15))

fx = np.stack([L, R], 1)
mix = raw * 0.6 + fx
fade = np.ones(N); fn = int(0.6 * SR); fade[-fn:] = np.linspace(1, 0, fn)
mix *= fade[:, None]
mix = np.tanh(mix * 1.1); mix /= np.max(np.abs(mix)) / 0.89
with wave.open(sys.argv[3], 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((mix * 32767).astype(np.int16).tobytes())
print('ok', sys.argv[3], N / SR, 's')
