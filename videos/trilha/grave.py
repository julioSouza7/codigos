"""Trilha grave e lenta (Ré menor, 80 BPM) para @stick.obsessao, 48 kHz estéreo.
Uso: python3 grave.py saida.wav [dur=18] [slam=1.5] [quit=5.0] [meta=9.4] [payoff=14.8]
Estrutura: relógio + drone no gancho → impacto → pulso grave e motivo sombrio → respiro quando o ego desiste →
coração acelerando → riser → impacto final + acorde sustentado."""
import sys, wave
import numpy as np

SR = 48000
DUR = float(sys.argv[2]) if len(sys.argv) > 2 else 18.0
SLAM = float(sys.argv[3]) if len(sys.argv) > 3 else 1.5
QUIT = float(sys.argv[4]) if len(sys.argv) > 4 else 5.0
META = float(sys.argv[5]) if len(sys.argv) > 5 else 9.4
PAY = float(sys.argv[6]) if len(sys.argv) > 6 else 14.8
BEAT = 0.75
START = 2.6
N = int(SR * DUR)
rng = np.random.default_rng(80)
dry = np.zeros((N, 2)); wet = np.zeros((N, 2))


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


def tick(f):
    t = tt(0.05)
    return np.sin(2 * np.pi * f * t) * np.exp(-t * 140) + 0.4 * highpass(rng.standard_normal(len(t)), 3000) * np.exp(-t * 200)


def braam(t0, gain=1.0):
    d = 4.0; n = int(SR * d)
    s = sum(saw(note(m), d, 0.006) for m in (26, 38, 45, 50, 53)) / 5
    s = lowpass(s, 800) * env(n, 0.02, 1.3, 0.12, 1.0)
    k = 1.4 * kick(85, 28, 2.4, 1.6); s[: len(k)] += k
    imp = lowpass(rng.standard_normal(n), 2200) * np.exp(-tt(d) * 6) * 0.55
    put(dry, s + imp, t0, 0.55 * gain); put(wet, s + imp, t0, 0.35 * gain)


def whoosh(t_end, d=0.6, gain=0.4):
    n = int(SR * d); t = tt(d); nz = rng.standard_normal(n); out = np.zeros(n); ch = 2400
    for i in range(0, n, ch):
        out[i:i + ch] = lowpass(nz[i:i + ch], 300 + 5000 * ((i / n) ** 2))
    out *= (t / d) ** 2.5
    put(wet, out, t_end - d, gain); put(dry, out, t_end - d, gain * 0.6)


# 1) drone grave
t = tt(DUR)
lvl = np.interp(t, [0, 1.4, START, QUIT, QUIT + 1.6, 10.6, PAY, PAY + 0.4, DUR], [0.55, 0.62, 0.72, 0.72, 0.55, 0.85, 1.0, 0.85, 0.7])
lfo = 0.78 + 0.22 * np.sin(2 * np.pi * 0.15 * t)
drone = np.sin(2 * np.pi * note(26) * t) + 0.6 * np.sin(2 * np.pi * note(38) * t * 1.002) + 0.28 * np.sin(2 * np.pi * note(45) * t * 0.998)
put(dry, drone * lfo * lvl, 0, 0.18)
put(wet, lowpass(rng.standard_normal(N), 420) * lvl, 0, 0.05)

# 2) relógio: no tempo até o clímax, dobrado na reta final
x = 0.0; k = 0
while x < PAY:
    put(dry, tick(2500 if k % 2 == 0 else 1900), x, 0.11, 0.2 if k % 2 else -0.2)
    x += BEAT if x < PAY - 2.1 else BEAT / 2; k += 1

# 3) pulso sub-grave em cada tempo (pausa no respiro depois que o ego desiste)
x = START
while x < PAY:
    if not (QUIT <= x < QUIT + 1.6):
        g = 0.42 + 0.3 * (x - START) / (PAY - START)
        put(dry, kick(95, 40, 0.5, 9), x, g)
    x += BEAT

# 4) motivo sombrio (D2 F2 E2 A1), filtro abrindo
PAT = [38, 41, 40, 33]
x = START; i = 0
while x < PAY:
    if not (QUIT <= x < QUIT + 1.6):
        d = 0.6; n = int(SR * d); m = PAT[i % 4] + (12 if x > PAY - 2.1 and i % 2 else 0)
        fc = 450 + 1500 * ((x - START) / (PAY - START)) ** 1.4
        s = lowpass(saw(note(m), d, 0.004), fc) * env(n, 0.006, 0.22, 0.0, 0.05)
        put(dry, s, x, 0.15, -0.3 if i % 2 else 0.3); put(wet, s, x, 0.08)
    x += BEAT; i += 1

# 5) coração acelerando depois do respiro
x = QUIT + 1.6; bpm = 66.0
while x < PAY - 0.15:
    put(dry, kick(70, 40, 0.25, 14), x, 0.5); put(dry, kick(60, 38, 0.25, 16), x + 0.13, 0.36)
    bpm = 66 + 64 * max(0.0, (x - QUIT - 1.6) / (PAY - QUIT - 1.6)) ** 1.3
    x += 60.0 / bpm

# 6) o ego desiste: descida de tom
d = 1.0; tr = tt(d); f = 300 * np.exp(-tr * 2.5) + 45
put(wet, np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tr * 2.4) * np.minimum(1, tr / 0.02), QUIT, 0.16)

# 7) riser + impactos
d = 1.8; tr = tt(d); f = 160 * 2 ** (2.4 * tr / d)
gl = (np.sin(2 * np.pi * np.cumsum(f) / SR) + 0.5 * np.sin(2 * np.pi * np.cumsum(f * 1.5) / SR)) * (tr / d) ** 2
put(wet, gl, PAY - d, 0.1); put(dry, gl, PAY - d, 0.05)
whoosh(PAY, 1.1, 0.35); whoosh(SLAM, 0.7, 0.35)
braam(SLAM, 1.0); braam(PAY, 1.3)

# 8) acorde final sustentado + arpejo lento
dd = DUR - PAY
for m in (38, 45, 50, 53, 57, 64):
    n = int(SR * dd)
    s = lowpass(saw(note(m), dd, 0.005), 1500) * env(n, 0.45, 9, 0.7, 0.6)
    put(wet, s, PAY + 0.05, 0.05); put(dry, s, PAY + 0.05, 0.035)
x = PAY + 0.4; i = 0
while x < DUR - 0.3:
    n = int(SR * 0.6)
    s = np.sin(2 * np.pi * note([62, 65, 69, 74][i % 4]) * tt(0.6)) * env(n, 0.004, 0.3)
    put(wet, s, x, 0.06, -0.4 if i % 2 else 0.4); put(dry, s, x, 0.04)
    x += 0.375; i += 1

# reverb por convolução
ir_n = int(SR * 2.4); ti = np.arange(ir_n) / SR; out = dry.copy()
for ch in range(2):
    ir = rng.standard_normal(ir_n) * np.exp(-ti * 2.6); ir = lowpass(ir, 6000); ir /= np.sqrt(np.sum(ir ** 2))
    nfft = 1 << (N + ir_n - 1).bit_length()
    y = np.fft.irfft(np.fft.rfft(wet[:, ch], nfft) * np.fft.rfft(ir, nfft), nfft)[:N]
    out[:, ch] += 0.55 * y + 0.35 * wet[:, ch]
fade = np.ones(N); fn = int(0.7 * SR); fade[-fn:] = np.linspace(1, 0, fn); fi = int(0.05 * SR); fade[:fi] *= np.linspace(0, 1, fi)
out *= fade[:, None]
out = np.tanh(out * 1.3); out /= np.max(np.abs(out)) / 0.9
with wave.open(sys.argv[1], 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((out * 32767).astype(np.int16).tobytes())
print('ok', sys.argv[1], DUR, 's')
