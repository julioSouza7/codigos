"""Efeitos do rio sincronizados com schedule.json + mix com a trilha grave.
Uso: python3 sfx_rio.py schedule.json music_raw.wav saida.wav"""
import json, sys, wave
import numpy as np

SR = 48000
sched = json.load(open(sys.argv[1]))
with wave.open(sys.argv[2]) as w:
    raw = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).reshape(-1, 2) / 32768.0
N = len(raw)
L = np.zeros(N); R = np.zeros(N)
rng = np.random.default_rng(1918)
PAN = {'disc': -0.45, 'obs': 0.0, 'ego': 0.45}


def add(sig, t0, gain=1.0, pan=0.0):
    i = int(t0 * SR)
    if i >= N or i < 0: return
    j = min(N, i + len(sig)); s = sig[: j - i] * gain
    L[i:j] += s * min(1, 1 - pan); R[i:j] += s * min(1, 1 + pan)


def mx(*parts):
    n = max(len(p) for p in parts); out = np.zeros(n)
    for p in parts: out[: len(p)] += p
    return out


def tt(d): return np.arange(int(SR * d)) / SR
def note(m): return 440 * 2 ** ((m - 69) / 12)


def lowpass(x, fc):
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR)
    X *= 1 / np.sqrt(1 + (f / fc) ** 4)
    return np.fft.irfft(X, len(x))


def thump(f0=110, f1=45, d=0.4, dec=9):
    t = tt(d); f = f1 + (f0 - f1) * np.exp(-t * 25)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * dec)


def gravel(d=0.22, fc=2600, dec=16):
    t = tt(d); n = rng.standard_normal(len(t))
    grains = np.zeros(len(t))
    for _ in range(14):
        i = rng.integers(0, len(t) - 200); grains[i:i + 120] += rng.standard_normal(120) * np.exp(-np.arange(120) / 25)
    return lowpass(n * np.exp(-t * dec) + 0.8 * grains * np.exp(-t * 6), fc)


def metal(f, d=0.7):
    t = tt(d)
    return sum(a * np.sin(2 * np.pi * f * r * t) * np.exp(-t * k) for r, a, k in [(1, 1, 6), (2.76, 0.6, 8), (5.4, 0.4, 12), (8.93, 0.25, 16)])


def bell(f, d=1.2, dec=3):
    t = tt(d)
    return (np.sin(2 * np.pi * f * t) + 0.35 * np.sin(2 * np.pi * 2 * f * t) * np.exp(-t * 4)) * np.minimum(1, t / 0.002) * np.exp(-t * dec)


def clap():
    t = tt(0.12); n = rng.standard_normal(len(t))
    b = np.convolve(n, np.ones(5) / 5, 'same') - np.convolve(n, np.ones(30) / 30, 'same')
    return b * np.exp(-t * 35)


def key():
    t = tt(0.02)
    return (np.sin(2 * np.pi * 3400 * t) * 0.5 + rng.standard_normal(len(t)) * 0.6) * np.exp(-t * 300)


# golpe do gancho: as três pás juntas
for k, p in PAN.items():
    add(mx(thump(110, 45, 0.5, 7), lowpass(rng.standard_normal(int(SR * 0.6)), 4000) * np.exp(-tt(0.6) * 6)), sched['slam'], 0.3, p)
# cada golpe de pá na terra
for k, times in sched['strikes'].items():
    for t0 in times:
        n = int(SR * 0.35); w = lowpass(rng.standard_normal(n), 3800) * np.interp(np.arange(n) / SR, [0, 0.02, 0.35], [0, 1, 0]); add(mx(w, 0.3 * thump(120, 60, 0.15, 25)), t0, 0.16 if k != 'ego' else 0.13, PAN[k])
# plateia do ego: palmas e gritinhos que somem quando ela vai embora
c0, c1 = sched['crowd']
x = c0
while x < c1 + 0.3:
    fade = 1.0 if x < c1 else max(0.0, 1 - (x - c1) / 0.3)
    add(clap(), x + rng.uniform(0, 0.02), rng.uniform(0.04, 0.09) * fade, rng.uniform(0.2, 0.9)); x += rng.uniform(0.03, 0.07)
crowd = lowpass(rng.standard_normal(int(SR * (c1 - c0 + 0.4))), 1300) * 0.5
crowd *= np.interp(np.arange(len(crowd)) / SR, [0, 0.3, c1 - c0, c1 - c0 + 0.4], [0, 1, 1, 0])
add(crowd, c0, 0.05, 0.55)
# ego larga o remo
add(mx(thump(160, 90, 0.2, 20), 0.4 * gravel(0.15, 2500)), sched['egoQuit'] + 0.5, 0.12, PAN['ego'])

# disciplina bate a meta (1.000 golpes)
for k, m in enumerate([74, 81, 86]):
    add(bell(note(m)), sched['meta'] + 0.07 * k, 0.09, -0.4)
add(mx(metal(500, 0.5), lowpass(rng.standard_normal(int(SR * 0.4)), 3000) * np.exp(-tt(0.4) * 8)), sched['meta'] + 0.5, 0.12, PAN['disc'])
# chegada no sol: whoosh + brilho
W0 = sched['payoff']
sw = lowpass(rng.standard_normal(int(SR * 2.0)), 6000) * np.exp(-tt(2.0) * 2.0)
add(mx(thump(70, 30, 1.2, 3), sw), W0, 0.3)
for i, m in enumerate([86, 89, 93, 98, 101]):
    add(bell(note(m), 1.6, 3), W0 + 0.25 + 0.08 * i, 0.07, -0.3 + 0.15 * i)
# palavras pulando: "pop" curto
for t0 in sched['words']:
    tp = tt(0.06); add(np.sin(2 * np.pi * (900 + 600 * np.exp(-tp * 60)) * tp) * np.exp(-tp * 70), t0, 0.05, rng.uniform(-0.15, 0.15))

fx = np.stack([L, R], 1)
mix = raw * 0.62 + fx
fade = np.ones(N); fn = int(0.6 * SR); fade[-fn:] = np.linspace(1, 0, fn)
mix *= fade[:, None]
mix = np.tanh(mix * 1.1); mix /= np.max(np.abs(mix)) / 0.89
with wave.open(sys.argv[3], 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((mix * 32767).astype(np.int16).tobytes())
print('ok', sys.argv[3], N / SR, 's')
