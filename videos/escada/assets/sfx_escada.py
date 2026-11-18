"""Efeitos da escada sincronizados com schedule.json + mix com a trilha.
Uso: python3 sfx_escada.py schedule.json music_raw.wav saida.wav"""
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


# subida: tilintar metálico a cada mão no degrau (cada um com seu timbre)
for i, t0 in enumerate(sched['egoGrabs']):
    add(mx(metal(900 + 60 * (i % 2), 0.25), 0.4 * thump(150, 80, 0.12, 25)), t0, 0.07, 0.45)
for i, t0 in enumerate(sched['discGrabs']):
    add(metal(1250 + 40 * (i % 2), 0.3), t0, 0.06, -0.45)
for i, t0 in enumerate(sched['obsGrabs']):
    add(mx(tick(1800 + 40 * (i % 3)), 0.35 * metal(700, 0.2)), t0, 0.1 if t0 < 19 else 0.08, 0.0)
# ego: aplauso ao acenar; luz apagando; trava
wv = sched['egoWave']
for k in range(26):
    add(clap(), wv + k * 0.028 + rng.uniform(0, 0.03), rng.uniform(0.05, 0.12) * (1 - k / 30), rng.uniform(-0.2, 0.8))
t = tt(0.8); f = 380 * np.exp(-t * 3.2) + 50
add(np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 3) * np.minimum(1, t / 0.02), sched['egoDim'], 0.16, 0.45)
# disciplina: acorde de meta e passo na plataforma
PENTA = [79, 84, 88, 91, 96]
for k, m in enumerate(PENTA):
    add(bell(note(m), 1.2, 3), sched['discGoal'] + 0.06 * k, 0.1, -0.4)
add(mx(thump(95, 40, 0.5, 8), 0.4 * noise(0.18, 25, 4)), sched['discTop'], 0.3, -0.45)

# final: acorde sob "a obsessão vence."
for m in [57, 60, 64, 69, 72]:
    t = tt(4.0); s = np.sin(2 * np.pi * note(m) * t) * np.minimum(1, t / 0.6) * np.exp(-np.maximum(0, t - 2.5) * 1.2)
    add(s, 22.0, 0.05)

fx = np.stack([L, R], 1)
mix = raw * 0.6 + fx
fade = np.ones(N); fn = int(0.6 * SR); fade[-fn:] = np.linspace(1, 0, fn)
mix *= fade[:, None]
mix = np.tanh(mix * 1.1); mix /= np.max(np.abs(mix)) / 0.89
with wave.open(sys.argv[3], 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((mix * 32767).astype(np.int16).tobytes())
print('ok', sys.argv[3], N / SR, 's')
