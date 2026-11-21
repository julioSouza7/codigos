"""Efeitos de Água gelada (faz x pensa demais) + mix. Uso: python3 sfx_dor.py schedule.json music_raw.wav saida.wav"""
import json, sys, wave
import numpy as np
SR = 48000
sched = json.load(open(sys.argv[1]))
with wave.open(sys.argv[2]) as w:
    raw = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).reshape(-1, 2) / 32768.0
N = len(raw); L = np.zeros(N); R = np.zeros(N); rng = np.random.default_rng(404)
def add(sig, t0, g=1.0, pan=0.0):
    i = int(t0 * SR)
    if i >= N or i < 0: return
    j = min(N, i + len(sig)); s = sig[: j - i] * g
    L[i:j] += s * min(1, 1 - pan); R[i:j] += s * min(1, 1 + pan)
def tt(d): return np.arange(int(SR * d)) / SR
def lp(x, fc):
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR); X *= 1 / np.sqrt(1 + (f / fc) ** 4); return np.fft.irfft(X, len(x))
def thump(f0, f1, d, dec):
    t = tt(d); f = f1 + (f0 - f1) * np.exp(-t * 25); return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * dec)
def splash(d, fc):
    t = tt(d); n = rng.standard_normal(len(t)); return lp(n, fc) * np.exp(-t * 4) * np.minimum(1, t / 0.005)
def beep(f=1000, d=0.09):
    t = tt(d); return np.sin(2 * np.pi * f * t) * np.minimum(1, t / 0.004) * np.exp(-t * 18)
def bell(f, d=1.2, dec=3):
    t = tt(d); return (np.sin(2 * np.pi * f * t) + 0.35 * np.sin(4 * np.pi * f * t) * np.exp(-t * 4)) * np.minimum(1, t / 0.002) * np.exp(-t * dec)
def note(m): return 440 * 2 ** ((m - 69) / 12)
UP, DN = -0.35, 0.35   # pensa demais (em cima) à esquerda, faz (embaixo) à direita
add(thump(120, 50, 0.6, 7), sched['slam'], 0.3)
# faz: impulso e mergulho
add(thump(140, 70, 0.2, 18), sched['jump'], 0.2, DN)
add(splash(1.6, 3500), sched["splash"], 0.4, DN); add(thump(80, 35, 0.8, 4), sched["splash"], 0.32, DN)
# pensa demais: respingos pequenos a cada passo
for t0 in sched['dips'] + sched['steps']:
    add(splash(0.5, 2600), t0, 0.12, UP)
# monitor: bip de dor em cada pico (mais agudo quanto maior)
for t0 in [sched['splash']]:
    for i in range(3): add(beep(1500, 0.12), t0 + 0.05 + i * 0.14, 0.12, DN)
for k, t0 in enumerate(sched['dips'] + sched['steps']):
    add(beep(900 + 60 * k, 0.1), t0 + 0.05, 0.1, UP); add(beep(900 + 60 * k, 0.1), t0 + 0.22, 0.07, UP)
# batida de coração do pensa demais acelerando
x = 3.0; bpm = 70.0
while x < sched['report'] - 0.2:
    add(thump(70, 40, 0.25, 14), x, 0.3, UP); add(thump(60, 38, 0.25, 16), x + 0.13, 0.22, UP)
    bpm = 70 + 60 * ((x - 3.0) / (sched['report'] - 3.0)); x += 60 / bpm
# relatório final: impacto + acorde
W0 = sched['report']
add(thump(70, 30, 1.2, 3) + 0.0, W0, 0.35)
for i, m in enumerate([86, 89, 93, 98]): add(bell(note(m), 1.4, 3.5), W0 + 0.4 + 0.08 * i, 0.06, -0.3 + 0.2 * i)
for t0 in sched['words']:
    tp = tt(0.06); add(np.sin(2 * np.pi * (900 + 600 * np.exp(-tp * 60)) * tp) * np.exp(-tp * 70), t0, 0.05)
fx = np.stack([L, R], 1); mix = raw * 0.6 + fx
fade = np.ones(N); fn = int(0.6 * SR); fade[-fn:] = np.linspace(1, 0, fn); mix *= fade[:, None]
mix = np.tanh(mix * 1.1); mix /= np.max(np.abs(mix)) / 0.89
with wave.open(sys.argv[3], 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((mix * 32767).astype(np.int16).tobytes())
print('ok')
