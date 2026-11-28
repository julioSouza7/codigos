"""Trilha enérgica e motivacional (Ré menor, 124 BPM) para @stick.obsessao, 48 kHz estéreo.
Uso: python3 energia.py saida.wav [dur=25] [slam=1.5] [start=3.0] [quit=6.5] [meta=12.6] [payoff=19.0]
Gancho com tensão → impacto → batida 4/4 com baixo pulsante → respiro quando o ego desiste → volta mais forte →
riser → drop no clímax com acordes épicos até o fim."""
import sys, wave
import numpy as np

SR = 48000
A = [float(x) for x in sys.argv[2:]]
DUR, SLAM, START, QUIT, META, PAY = (A + [25, 1.5, 3.0, 6.5, 12.6, 19.0][len(A):])[:6]
BEAT = 60 / 124
N = int(SR * DUR)
rng = np.random.default_rng(124)
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
    for k in (-det, 0.0, det): out += 2 * ((t * f * (1 + k) + rng.random()) % 1) - 1
    return out / 3


def env(n, a, d, s=0.0, r=0.03):
    t = np.arange(n) / SR
    e = np.minimum(1, t / max(a, 1e-4)) * (s + (1 - s) * np.exp(-t / max(d, 1e-4)))
    rn = int(r * SR)
    if rn and n > rn: e[-rn:] *= np.linspace(1, 0, rn)
    return e


def kick(f0=150, f1=45, d=0.45, dec=8):
    t = tt(d); f = f1 + (f0 - f1) * np.exp(-t * 32)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * dec) + 0.15 * highpass(rng.standard_normal(len(t)), 3000) * np.exp(-t * 200)


def clap():
    t = tt(0.22); n = rng.standard_normal(len(t))
    b = np.convolve(n, np.ones(5) / 5, 'same') - np.convolve(n, np.ones(40) / 40, 'same')
    e = np.exp(-t * 16) + 0.6 * np.exp(-np.maximum(0, t - 0.012) * 26) * (t > 0.012)
    return b * e


def hat(open_=False):
    t = tt(0.16 if open_ else 0.045)
    return highpass(rng.standard_normal(len(t)), 7000) * np.exp(-t * (16 if open_ else 80))


def stab(ms, d=0.35, fc=2600):
    n = int(SR * d)
    s = sum(saw(note(m), d, 0.007) for m in ms) / len(ms)
    return lowpass(s, fc) * env(n, 0.004, 0.14, 0.0, 0.04)


def braam(t0, gain=1.0):
    d = 3.0; n = int(SR * d)
    s = sum(saw(note(m), d, 0.006) for m in (26, 38, 45, 50, 53)) / 5
    s = lowpass(s, 900) * env(n, 0.01, 1.0, 0.1, 0.8)
    k = 1.3 * kick(110, 30, 2.0, 2.0); s[: len(k)] += k
    imp = lowpass(rng.standard_normal(n), 3000) * np.exp(-tt(d) * 7) * 0.55
    put(dry, s + imp, t0, 0.5 * gain); put(wet, s + imp, t0, 0.3 * gain)


def riser(t_end, d, gain):
    t = tt(d); nz = rng.standard_normal(len(t)); out = np.zeros(len(t)); ch = 2400
    for i in range(0, len(t), ch): out[i:i + ch] = lowpass(nz[i:i + ch], 400 + 7000 * ((i / len(t)) ** 2))
    f = 220 * 2 ** (2.5 * t / d)
    tone = np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.4
    put(wet, (out + tone) * (t / d) ** 2.2, t_end - d, gain); put(dry, (out + tone) * (t / d) ** 2.2, t_end - d, gain * 0.5)


# progressão: Dm – Bb – F – C (uma por compasso de 4 tempos)
CH = [[50, 53, 57], [46, 50, 53], [45, 48, 53], [48, 52, 55]]
ROOT = [38, 34, 41, 36]
BAR = 4 * BEAT
bar_of = lambda x: int((x - START) // BAR) % 4 if x >= START else 0

# gancho: pulso grave filtrado subindo + relógio rápido
x = 0.0
while x < START:
    put(dry, kick(90, 40, 0.3, 12), x, 0.25 + 0.2 * x / START)
    put(dry, hat(), x + BEAT / 2, 0.08 + 0.1 * x / START, 0.3)
    x += BEAT
riser(SLAM, 0.9, 0.25); braam(SLAM, 1.0)
riser(START, 1.2, 0.2)

# corpo: 4/4 com respiro depois que o ego desiste e entrada mais forte na reta final
b = 0; x = START
while x < PAY:
    brk = QUIT <= x < QUIT + BAR
    hot = x >= META
    if not brk:
        put(dry, kick(), x, 0.85 if hot else 0.75)
        if b % 2 == 1: put(dry, clap(), x, 0.5, 0.0); put(wet, clap(), x, 0.18)
    for k in range(2):
        tt0 = x + k * BEAT / 2
        if tt0 >= PAY: break
        put(dry, hat(open_=(k == 1 and b % 4 == 3)), tt0, 0.18 if not brk else 0.1, 0.35)
        if hot: put(dry, hat(), tt0 + BEAT / 4, 0.09, -0.35)
    # baixo pulsando nas colcheias
    if not brk:
        r = ROOT[bar_of(x)]
        for k in range(2):
            n = int(SR * 0.2); s = lowpass(saw(note(r), 0.2, 0.003), 320) * env(n, 0.004, 0.11)
            put(dry, s, x + k * BEAT / 2 + (BEAT / 2 if k == 0 else 0) * 0, 0.4)
    # acordes em stab no contratempo
    if b % 2 == 0 and not brk:
        put(dry, stab([m + 12 for m in CH[bar_of(x)]], 0.3, 1800 + (1500 if hot else 0)), x + BEAT / 2, 0.16, -0.25)
        put(wet, stab([m + 12 for m in CH[bar_of(x)]], 0.3, 1800), x + BEAT / 2, 0.08)
    x += BEAT; b += 1
# respiro do ego: descida de tom
d = 0.9; t = tt(d); f = 320 * np.exp(-t * 2.6) + 50
put(wet, np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 2.5), QUIT, 0.16)
# rufar e riser para o clímax
x = PAY - 2 * BEAT; step = BEAT / 2
while x < PAY - 0.03:
    put(dry, clap(), x, 0.2 + 0.35 * (x - PAY + 2 * BEAT) / (2 * BEAT)); x += step; step = max(BEAT / 8, step * 0.75)
riser(PAY, 2.2, 0.32)
braam(PAY, 1.3)

# drop: batida cheia + acordes sustentados até o fim
x = PAY; b = 0
while x < DUR - 0.2:
    if not (PAY <= x < PAY + BEAT):
        put(dry, kick(), x, 0.9)
        if b % 2 == 1: put(dry, clap(), x, 0.55); put(wet, clap(), x, 0.2)
    put(dry, hat(), x + BEAT / 2, 0.2, 0.35); put(dry, hat(), x + BEAT / 4, 0.08, -0.35)
    ci = int((x - PAY) // BAR) % 4
    n = int(SR * 0.2); r = ROOT[ci]
    put(dry, lowpass(saw(note(r), 0.2, 0.003), 340) * env(n, 0.004, 0.11), x + BEAT / 2, 0.42)
    if b % 4 == 0:
        d = BAR; nn = int(SR * d)
        pad = sum(saw(note(m), d, 0.006) for m in CH[ci]) / 3
        pad = lowpass(pad, 2200) * env(nn, 0.05, 2.0, 0.6, 0.2)
        put(wet, pad, x, 0.07); put(dry, pad, x, 0.06)
        for k, m in enumerate([CH[ci][0] + 24, CH[ci][1] + 24, CH[ci][2] + 24, CH[ci][1] + 24]):
            nn2 = int(SR * 0.3); put(wet, np.sin(2 * np.pi * note(m) * tt(0.3)) * env(nn2, 0.003, 0.12), x + k * BEAT, 0.07, -0.4 + 0.25 * k)
    x += BEAT; b += 1

# reverb
ir_n = int(SR * 1.8); ti = np.arange(ir_n) / SR; out = dry.copy()
for ch in range(2):
    ir = rng.standard_normal(ir_n) * np.exp(-ti * 3.2); ir = lowpass(ir, 7000); ir /= np.sqrt(np.sum(ir ** 2))
    nfft = 1 << (N + ir_n - 1).bit_length()
    y = np.fft.irfft(np.fft.rfft(wet[:, ch], nfft) * np.fft.rfft(ir, nfft), nfft)[:N]
    out[:, ch] += 0.5 * y + 0.35 * wet[:, ch]
fade = np.ones(N); fn = int(0.6 * SR); fade[-fn:] = np.linspace(1, 0, fn); fi = int(0.03 * SR); fade[:fi] *= np.linspace(0, 1, fi)
out *= fade[:, None]
out = np.tanh(out * 1.35); out /= np.max(np.abs(out)) / 0.9
with wave.open(sys.argv[1], 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((out * 32767).astype(np.int16).tobytes())
print('ok', sys.argv[1], DUR, 's')
