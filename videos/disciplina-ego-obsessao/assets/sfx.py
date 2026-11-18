"""Efeitos sonoros sincronizados com a agenda da cena (schedule.json) + mix com a trilha.
Uso: python3 sfx.py schedule.json music_raw.wav saida.wav"""
import json, sys, wave
import numpy as np

SR = 48000
sched = json.load(open(sys.argv[1]))
with wave.open(sys.argv[2]) as w:
    raw = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).reshape(-1, 2) / 32768.0
N = len(raw)
L = np.zeros(N); R = np.zeros(N)
rng = np.random.default_rng(26)


def add(sig, t0, gain=1.0, pan=0.0):
    i = int(t0 * SR)
    if i >= N: return
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


def clack(f):
    t = tt(0.12)
    return (0.6 * np.sin(2 * np.pi * f * t) * np.exp(-t * 45) + 0.5 * noise(0.12, 60, 3)) * np.minimum(1, t / 0.0008)


def metal(f, dur=0.8):
    t = tt(dur)
    return sum(a * np.sin(2 * np.pi * f * r * t) * np.exp(-t * d) for r, a, d in [(1, 1, 5), (2.76, 0.6, 7), (5.4, 0.4, 10), (8.93, 0.25, 14)])


# disciplina: um "tlim" por bloco, subindo na pentatônica conforme a torre cresce
PENTA = [67, 69, 72, 74, 76, 79, 81, 84, 86, 88, 91, 93, 96, 98, 100]
for i, t0 in enumerate(sched['disc']):
    row = i // 3
    fast = t0 > 19.2
    add(bell(note(PENTA[min(row, len(PENTA) - 1)]) * (1 + 0.002 * (i % 3))), t0, 0.16 if not fast else 0.13, 0.05 * ((i % 3) - 1))

# obsessão: cliques secos e ansiosos
for i, t0 in enumerate(sched['obs']):
    add(clack(rng.uniform(170, 240)), t0, 0.22, -0.45)

# ego: baques graves com brilho
for i, t0 in enumerate(sched['ego']):
    add(mx(thump(130, 55, 0.6, 6), 0.25 * bell(note(84 + (i % 3) * 4), 0.6, 6)), t0, 0.42, 0.45)
# coroa
for k, m in enumerate([84, 88, 91, 96, 100]):
    add(bell(note(m), 0.7, 5), sched['crownOn'] + 0.045 * k, 0.11, 0.45)
# luz do ego apagando: descida de tom
t = tt(0.8); f = 380 * np.exp(-t * 3.2) + 50
add(np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 3) * np.minimum(1, t / 0.02), 12.62, 0.16, 0.45)
# coroa batendo no chão
add(metal(1150), sched.get('crownLand', sched['crownOff'] + 0.68), 0.17, 0.4)
add(metal(1150, 0.5), sched.get('crownLand', sched['crownOff'] + 0.68) + 0.16, 0.07, 0.4)
# blocos do ego caindo
for t0 in sched['egoFall']:
    add(mx(thump(95, 40, 0.5, 8), 0.4 * noise(0.2, 25, 4)), t0, 0.4, 0.4)

# lâmpada da obsessão falhando
for k, t0 in enumerate(sched['flicker']):
    t = tt(0.07); buzz = np.sign(np.sin(2 * np.pi * 100 * t)) * 0.4 + noise(0.07, 20, 2)
    add(buzz * np.exp(-t * 30), t0, 0.1, -0.45)
add(mx(noise(0.25, 18, 1), thump(400, 120, 0.25, 20) * 0.5), sched['flicker'][-1], 0.16, -0.45)  # estalo final
# corpo caindo
add(mx(thump(90, 38, 0.7, 6), 0.5 * noise(0.25, 22, 6)), sched['obsBody'], 0.5, -0.4)
# torre desabando
of = sorted(sched['obsFall'])
add(noise(1.6, 2.6, 8) * 0.5, of[0] - 0.05, 0.22, -0.3)
for i, t0 in enumerate(of):
    add(mx(clack(rng.uniform(120, 260)), 0.4 * thump(150, 60, 0.25, 14)), t0 + rng.uniform(-0.01, 0.01), rng.uniform(0.14, 0.24), rng.uniform(-0.7, -0.1))

# final: acorde quente sob "constância vence."
for m in [60, 64, 67, 72, 76]:
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
