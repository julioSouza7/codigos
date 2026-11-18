"""Trilha de suspense por código (Ré menor, 120 BPM), 48 kHz estéreo.
Uso: python3 suspense.py saida.wav [dur=26] [slam=1.5] [quiet0=12.0] [quiet1=15.4] [drop=22.0]
Estrutura: gancho (drone + relógio) → impacto no "errado." → ostinato crescendo → silêncio tenso
(coração) → construção acelerando → riser → impacto final + acorde épico."""
import sys, wave
import numpy as np

SR = 48000
DUR = float(sys.argv[2]) if len(sys.argv) > 2 else 26.0
SLAM = float(sys.argv[3]) if len(sys.argv) > 3 else 1.5
Q0 = float(sys.argv[4]) if len(sys.argv) > 4 else 12.0
Q1 = float(sys.argv[5]) if len(sys.argv) > 5 else 15.4
DROP = float(sys.argv[6]) if len(sys.argv) > 6 else 22.0
N = int(SR * DUR)
rng = np.random.default_rng(7)
dry = np.zeros((N, 2)); wet = np.zeros((N, 2))  # wet = vai para o reverb


def note(m): return 440.0 * 2 ** ((m - 69) / 12)
def tt(d): return np.arange(int(SR * d)) / SR


def put(buf, sig, t0, gain=1.0, pan=0.0):
    i = int(t0 * SR)
    if i >= N or i + len(sig) <= 0: return
    s = sig * gain
    if i < 0: s = s[-i:]; i = 0
    j = min(N, i + len(s)); s = s[: j - i]
    buf[i:j, 0] += s * min(1, 1 - pan); buf[i:j, 1] += s * min(1, 1 + pan)


def lowpass(x, fc, order=2):
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR)
    X *= 1 / np.sqrt(1 + (f / max(fc, 10)) ** (2 * order))
    return np.fft.irfft(X, len(x))


def highpass(x, fc, order=2):
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR)
    X *= 1 / np.sqrt(1 + (max(fc, 1) / np.maximum(f, 1e-3)) ** (2 * order))
    return np.fft.irfft(X, len(x))


def saw(f, d, det=0.0):
    t = tt(d); out = np.zeros(len(t))
    for k in (-det, 0.0, det):
        out += 2 * ((t * f * (1 + k) + rng.random()) % 1) - 1
    return out / 3


def env(n, a, d, s=0.0, r=0.05):
    t = np.arange(n) / SR
    e = np.minimum(1, t / max(a, 1e-4)) * (s + (1 - s) * np.exp(-t / max(d, 1e-4)))
    rn = int(r * SR)
    if rn and n > rn: e[-rn:] *= np.linspace(1, 0, rn)
    return e


def kick(f0=120, f1=38, d=0.9, dec=5):
    t = tt(d); f = f1 + (f0 - f1) * np.exp(-t * 28)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * dec)


def tom(f):
    t = tt(0.7); fr = f * (1 + 0.6 * np.exp(-t * 30))
    body = np.sin(2 * np.pi * np.cumsum(fr) / SR) * np.exp(-t * 6)
    hit = lowpass(rng.standard_normal(len(t)) * np.exp(-t * 40), 1800)
    return body + 0.4 * hit


def tick(f):
    t = tt(0.05)
    return (np.sin(2 * np.pi * f * t) * np.exp(-t * 140) + 0.4 * highpass(rng.standard_normal(len(t)), 3000) * np.exp(-t * 200))


def braam(t0, gain=1.0):
    d = 4.5; n = int(SR * d)
    s = sum(saw(note(m), d, 0.006) for m in (26, 38, 45, 50, 53)) / 5
    s = lowpass(s, 900) * env(n, 0.02, 1.4, 0.15, 1.2)
    s += 1.3 * kick(90, 30, 2.2, 1.8)[: n] if n <= int(SR * 2.2) else np.concatenate([1.3 * kick(90, 30, 2.2, 1.8), np.zeros(n - int(SR * 2.2))])
    imp = lowpass(rng.standard_normal(n), 2500) * np.exp(-tt(d) * 6) * 0.6
    put(dry, s + imp, t0, 0.55 * gain); put(wet, s + imp, t0, 0.35 * gain)


def whoosh(t_end, d=0.6, gain=0.4):
    n = int(SR * d); t = tt(d)
    nz = rng.standard_normal(n)
    # varredura de filtro subindo, ganho crescente (som "reverso")
    out = np.zeros(n); chunk = 2400
    for i in range(0, n, chunk):
        fc = 300 + 5000 * ((i / n) ** 2)
        out[i:i + chunk] = lowpass(nz[i:i + chunk], fc)
    out *= (t / d) ** 2.5
    put(wet, out, t_end - d, gain); put(dry, out, t_end - d, gain * 0.6)


# 1) drone grave de Ré, a trilha inteira
t = tt(DUR)
lfo = 0.75 + 0.25 * np.sin(2 * np.pi * 0.18 * t)
drone = (np.sin(2 * np.pi * note(26) * t) + 0.6 * np.sin(2 * np.pi * note(38) * t * 1.002) + 0.3 * np.sin(2 * np.pi * note(45) * t * 0.998))
lvl = np.interp(t, [0, 1.4, 3, 12, 12.3, 15.4, 22, 22.2, DUR], [0.5, 0.6, 0.7, 0.85, 0.55, 0.65, 1.0, 0.9, 0.8])
put(dry, drone * lfo * lvl, 0, 0.16)
air = lowpass(rng.standard_normal(N), 500) * lvl
put(wet, air, 0, 0.05)

# 2) relógio: tic-tac no gancho e no começo, some no silêncio, volta dobrado na construção
beat = 0.5
k = 0; x = 0.0
while x < DUR:
    if x < Q0 or (Q1 <= x < DROP) or x >= DROP + 0.5:
        g = 0.13 if x < Q0 else 0.16
        if x >= DROP + 0.5: g = 0.08
        put(dry, tick(2600 if k % 2 == 0 else 2000), x, g, 0.2 if k % 2 else -0.2)
    step = beat if x < Q1 else (beat / 2 if x < DROP else beat)
    x += step; k += 1

# 3) coração: no silêncio e acelerando na construção
x = Q0 + 0.1; bpm = 70.0
while x < DROP - 0.1:
    put(dry, kick(70, 40, 0.25, 14), x, 0.55); put(dry, kick(60, 38, 0.25, 16), x + 0.13, 0.4)
    if x > Q1: bpm = 70 + 70 * ((x - Q1) / (DROP - Q1)) ** 1.3
    x += 60.0 / bpm

# 4) ostinato em colcheias (Ré menor), filtro abrindo; some no silêncio
PAT = [50, 50, 53, 50, 52, 50, 45, 50]
def ost_cut(x):
    if x < 6: return 900
    if x < 9: return 1500
    if x < Q0: return 2300
    if x < 19: return 1800 + 900 * (x - Q1) / (19 - Q1)
    return 3200
x = 3.0; i = 0
while x < DROP:
    if not (Q0 <= x < Q1):
        step = 0.25 if x < 19 else 0.125
        m = PAT[i % 8] + (12 if x >= 19 else 0)
        n = int(SR * 0.22)
        s = lowpass(saw(note(m), 0.22, 0.004), ost_cut(x)) * env(n, 0.004, 0.08, 0.0, 0.03)
        g = 0.10 + 0.05 * min(1, (x - 3) / 9) if x < Q0 else 0.12 + 0.06 * (x - Q1) / (DROP - Q1)
        put(dry, s, x, g, -0.35 if i % 2 else 0.35); put(wet, s, x, g * 0.5)
        x += step
    else:
        x += 0.25
    i += 1

# 5) baixo pulsante nas partes de maior tensão
for a, b in ((9.0, Q0), (19.0, DROP)):
    x = a
    while x < b:
        n = int(SR * 0.2)
        s = lowpass(saw(note(26), 0.2, 0.003), 260) * env(n, 0.005, 0.12)
        put(dry, s, x, 0.32); x += 0.25

# 6) tambores graves: tempos 1 e 3, rufar antes do impacto
for a, b, g in ((6.0, Q0, 0.22), (Q1 + 0.6, DROP - 1.0, 0.32)):
    x = a
    while x < b:
        put(wet, tom(62), x, g * 0.5); put(dry, tom(62), x, g)
        x += 1.0
x = DROP - 1.0; step = 0.25
while x < DROP - 0.05:
    put(dry, tom(75 + 30 * (x - DROP + 1)), x, 0.18 + 0.25 * (x - DROP + 1)); x += step; step = max(0.0625, step * 0.8)

# 7) riser antes do impacto final (glissando + ruído)
d = 2.0; tr = tt(d); f = 180 * 2 ** (2.6 * tr / d)
gl = (np.sin(2 * np.pi * np.cumsum(f) / SR) + 0.5 * np.sin(2 * np.pi * np.cumsum(f * 1.5) / SR)) * (tr / d) ** 2
put(wet, gl, DROP - d, 0.1); put(dry, gl, DROP - d, 0.06)
whoosh(DROP, 1.2, 0.35)

# 8) gancho: whoosh + impacto no "errado."
whoosh(SLAM, 0.7, 0.4)
braam(SLAM, 1.0)

# 9) impacto final + acorde épico sustentado (Ré menor com 9ª) e arpejo brilhante
braam(DROP, 1.25)
for m in (38, 45, 50, 53, 57, 64):
    dd = DUR - DROP; n = int(SR * dd)
    s = lowpass(saw(note(m), dd, 0.005), 1600) * env(n, 0.5, 9, 0.7, 0.8)
    put(wet, s, DROP + 0.05, 0.05); put(dry, s, DROP + 0.05, 0.035)
x = DROP + 0.5; i = 0
ARP = [62, 65, 69, 74, 69, 65]
while x < DUR - 0.3:
    n = int(SR * 0.5)
    s = np.sin(2 * np.pi * note(ARP[i % 6]) * tt(0.5)) * env(n, 0.003, 0.25)
    put(wet, s, x, 0.06, -0.4 if i % 2 else 0.4); put(dry, s, x, 0.04)
    x += 0.25; i += 1

# reverb: convolução com resposta de ruído decaindo (2,4 s), um pouco diferente por canal
ir_n = int(SR * 2.4); ti = np.arange(ir_n) / SR
out = dry.copy()
for ch in range(2):
    ir = rng.standard_normal(ir_n) * np.exp(-ti * 2.6)
    ir = lowpass(ir, 6000); ir /= np.sqrt(np.sum(ir ** 2))
    L = N + ir_n
    nfft = 1 << (L - 1).bit_length()
    y = np.fft.irfft(np.fft.rfft(wet[:, ch], nfft) * np.fft.rfft(ir, nfft), nfft)[:N]
    out[:, ch] += 0.55 * y + 0.35 * wet[:, ch]

fade = np.ones(N); fn = int(0.7 * SR); fade[-fn:] = np.linspace(1, 0, fn)
fi = int(0.05 * SR); fade[:fi] *= np.linspace(0, 1, fi)
out *= fade[:, None]
out = np.tanh(out * 1.3); out /= np.max(np.abs(out)) / 0.9
with wave.open(sys.argv[1], 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((out * 32767).astype(np.int16).tobytes())
print('ok', sys.argv[1], DUR, 's')
