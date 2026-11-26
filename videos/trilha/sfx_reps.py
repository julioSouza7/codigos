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
THEME = sched['theme']


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

SONS = '/home/user/codigos/videos/trilha/sons'
import os
def wclip(name):
    with wave.open(os.path.join(SONS, name + '.wav')) as w:
        x = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16) / 32768.0
        if w.getnchannels() > 1: x = x.reshape(-1, w.getnchannels()).mean(1)
        if w.getframerate() != SR: x = np.interp(np.arange(0, len(x), w.getframerate() / SR), np.arange(len(x)), x)
    return x
def rep_snd():
    if THEME == 'barra':   # rangido curto do metal + corpo
        return mx(0.55 * thump(140, 70, 0.16, 22), 0.2 * metal(rng.uniform(1150, 1300), 0.25))
    t = tt(0.22); n = rng.standard_normal(len(t))     # flexão: expiração + mãos no chão
    exh = lowpass(n, 2400) * np.minimum(1, t / 0.02) * np.exp(-t * 13)
    return mx(0.7 * exh, 0.4 * thump(110, 55, 0.12, 25))
def thud(size):
    return mx(thump(85, 38, 0.45, 8), 0.45 * gravel(0.22, 1400)) * (0.4 + 0.6 * size)
SHOTS = sched.get('shots')
FOCUS = sched.get('focus', {})
def focus_at(t):
    cur = None
    for ts, n in SHOTS:
        if t >= ts: cur = n
    return None if cur == 'wide' else FOCUS.get(cur, [cur])
DUEL_PAN = {'ego': -0.3, 'obs': 0.3}
MOAN_WIN = [(m, m + 0.75) for m in sched['moans']]
def gain_for(k, t0, base):
    f = focus_at(t0)
    if f is None: return base, PAN[k]
    if k not in f: return base * 0.22, PAN[k]
    g = base
    if k != 'obs' and any(a - 0.05 <= t0 <= b for a, b in MOAN_WIN): g *= 0.2   # gemido dela nunca disputa com o som do outro
    return g, (DUEL_PAN[k] if len(f) > 1 else 0.0)
# gancho: os quatro juntos
for k, p in PAN.items(): add(rep_snd(), sched['slam'] + 0.004 * p, 0.32, p)
add(thump(70, 32, 0.8, 5), sched['slam'], 0.22)
for k, times in sched['reps'].items():
    for t0 in times:
        g, pn = gain_for(k, t0, 0.2 if k in ('obs', 'disc') else 0.17); add(rep_snd(), t0, g, pn)
for t0, size, k in sched['thuds']:
    g, pn = gain_for(k, t0, 0.3); add(thud(size), t0, g, pn)
# plateia do ego
c0, c1 = sched['crowd']; h0, h1 = sched['cheer']; x = c0
while x < c1 + 0.3:
    fade = 1.0 if x < c1 else max(0.0, 1 - (x - c1) / 0.3)
    hot = 1.8 if h0 <= x < h1 else 1.0
    quiet = 0.25 if any(a <= x <= b for a, b in MOAN_WIN) else 1.0
    add(clap(), x + rng.uniform(0, 0.02), rng.uniform(0.03, 0.06) * fade * hot * quiet, rng.uniform(-0.8, -0.2)); x += rng.uniform(0.03, 0.07) / hot
for key in ('motivQuit', 'egoQuit'):   # (o do ego cai entre os gemidos dela)   # suspiro de desistência
    t = tt(0.7); f = 400 * np.exp(-t * 3) + 55
    add(np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 3) * np.minimum(1, t / 0.02), sched[key], 0.11, 0.0)
for i, m in enumerate([79, 84, 88, 91]): add(bell(note(m), 1.2, 3), sched['meta'] + 0.06 * i, 0.08, 0.0)
# obsessão: pequenos gemidos (só ela soa no zoom dela)
for i, t0 in enumerate(sched['moans']):
    add(wclip(['voz_pensa/dor_02', 'voz_pensa/dor_10', 'voz_pensa/dor_14'][i % 3]), t0, 0.4, 0.0)
if sched.get('regrab'): add(mx(0.5 * metal(820, 0.4), 0.5 * thump(120, 60, 0.2, 18)), sched['regrab'], 0.16)
# clímax
W0 = sched['payoff']
t = tt(0.4); add(lowpass(rng.standard_normal(len(t)), 3000) * (t / 0.4) ** 2, W0 - 0.4, 0.12)      # puxada
if THEME == 'flexao':
    add(clap(), W0, 0.9); add(clap(), W0 + 0.004, 0.6)
add(mx(thump(70, 30, 1.2, 3), lowpass(rng.standard_normal(int(SR * 1.6)), 2600) * np.exp(-tt(1.6) * 2.6)), W0, 0.32)
for i, m in enumerate([86, 89, 93, 98, 101]): add(bell(note(m), 1.6, 3), W0 + 0.3 + 0.08 * i, 0.06, -0.3 + 0.15 * i)
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
