"""Efeitos genéricos de 4 personagens (tema = argv[4]) sincronizados com schedule.json + mix com a trilha grave.
Uso: python3 sfx_machado.py schedule.json music_raw.wav saida.wav"""
import json, sys, wave
import numpy as np

SR = 48000
sched = json.load(open(sys.argv[1]))
with wave.open(sys.argv[2]) as w:
    raw = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).reshape(-1, 2) / 32768.0
N = len(raw)
L = np.zeros(N); R = np.zeros(N)
rng = np.random.default_rng(1918)
PAN = {'disc': -0.55, 'obs': -0.2, 'motiv': 0.2, 'ego': 0.55}
THEME = sys.argv[4] if len(sys.argv) > 4 else 'gelo'


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


def hit(k):
    if THEME == 'gelo':
        return mx(0.5 * thump(170, 80, 0.15, 25), metal(1900 + 80 * (k == 'obs'), 0.35), 0.6 * gravel(0.1, 7000, 35))
    if THEME == 'boxe':
        t = tt(0.16); return mx(thump(120, 55, 0.25, 16), lowpass(rng.standard_normal(len(t)), 2200) * np.exp(-t * 40) * 0.9)
    return mx(thump(150, 60, 0.3, 13), 0.9 * gravel(0.18, 4200, 22))
# gancho: os quatro golpes juntos
for k, p in PAN.items():
    add(hit(k), sched['slam'] + 0.004 * p, 0.3, p)
for k, times in sched['strikes'].items():
    for t0 in times:
        add(hit(k), t0, 0.2 if k in ('obs', 'disc') else 0.17, PAN[k])
# motivação cansa e senta
t = tt(0.7); f = 420 * np.exp(-t * 3) + 60
add(np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 3) * np.minimum(1, t / 0.02), sched['motivQuit'], 0.13, PAN['motiv'])
add(mx(thump(80, 40, 0.4, 9), 0.4 * gravel(0.2, 1500)), sched['motivSit'], 0.22, PAN['motiv'])
# plateia do ego
c0, c1 = sched['crowd']
x = c0
while x < c1 + 0.3:
    fade = 1.0 if x < c1 else max(0.0, 1 - (x - c1) / 0.3)
    add(clap(), x + rng.uniform(0, 0.02), rng.uniform(0.04, 0.09) * fade, rng.uniform(0.3, 0.9)); x += rng.uniform(0.03, 0.07)
t = tt(0.8); f = 380 * np.exp(-t * 3.2) + 50
add(np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 3) * np.minimum(1, t / 0.02), sched['egoQuit'], 0.14, PAN['ego'])
add(mx(thump(80, 40, 0.4, 9), 0.4 * gravel(0.2, 1500)), sched['egoSit'], 0.22, PAN['ego'])
# disciplina bate a meta
for k, m in enumerate([79, 84, 88, 91]):
    add(bell(note(m), 1.2, 3), sched['meta'] + 0.06 * k, 0.08, PAN['disc'])
# clímax
W0 = sched['payoff']
if THEME == 'gelo':
    crash = lowpass(rng.standard_normal(int(SR * 1.6)), 9000) * np.exp(-tt(1.6) * 3)
    add(mx(thump(75, 30, 1.2, 3), crash), W0, 0.34)
    for i in range(26): add(bell(note(rng.choice([96, 100, 103, 108])), 0.5, 8), W0 + rng.uniform(0, 0.9), 0.03, rng.uniform(-0.5, 0.5))
elif THEME == 'boxe':
    add(mx(thump(70, 28, 1.4, 3), lowpass(rng.standard_normal(int(SR * 1.2)), 3000) * np.exp(-tt(1.2) * 3)), W0, 0.4)
    for i in range(10): add(metal(rng.uniform(600, 1100), 0.3), W0 + 0.05 + i * 0.03, 0.05, rng.uniform(-0.3, 0.3))
    x = W0 + 0.4
    while x < W0 + 3.0:
        add(clap(), x + rng.uniform(0, 0.02), rng.uniform(0.04, 0.08), rng.uniform(-0.8, 0.8)); x += rng.uniform(0.025, 0.05)
else:
    add(mx(thump(70, 30, 1.2, 3), lowpass(rng.standard_normal(int(SR * 1.8)), 3000) * np.exp(-tt(1.8) * 2.4)), W0, 0.36)
for i, m in enumerate([86, 89, 93, 98, 101]):
    add(bell(note(m), 1.6, 3), W0 + 0.3 + 0.08 * i, 0.06, -0.3 + 0.15 * i)
# palavras pulando
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
