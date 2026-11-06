"""Procedural 15 s pop track, 120 BPM, for spotify-de-play. Writes 48 kHz stereo WAV.
Sections: 0-3 intro (filtered), 3-11 groove, 9.5-11 riser, 11.0 drop (logo), 11-15 outro."""
import numpy as np, wave, sys
SR = 48000; BPM = 120; BEAT = 60 / BPM
DUR = float(sys.argv[2]) if len(sys.argv) > 2 else 15.0
DROP = float(sys.argv[3]) if len(sys.argv) > 3 else 11.0
G0 = float(sys.argv[4]) if len(sys.argv) > 4 else 3.0
RISE = DROP - 1.5
N = int(SR * DUR); L = np.zeros(N); R = np.zeros(N)
rng = np.random.default_rng(1955)
t_all = np.arange(N) / SR

def add(sig, start, gain=1.0, pan=0.0):
    i = int(start * SR); j = min(N, i + len(sig))
    if i >= N: return
    s = sig[: j - i] * gain
    L[i:j] += s * (1 - max(0, pan)); R[i:j] += s * (1 + min(0, pan))

def env(n, a=0.005, d=0.2, sustain=0.0, rel=0.05):
    t = np.arange(n) / SR; e = np.minimum(1, t / max(a, 1e-4)) * (sustain + (1 - sustain) * np.exp(-t / d))
    tail = int(rel * SR)
    if tail and n > tail: e[-tail:] *= np.linspace(1, 0, tail)
    return e

def kick(big=False):
    n = int(SR * (0.9 if big else 0.35)); t = np.arange(n) / SR
    f = 50 + 120 * np.exp(-t * 30); ph = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(ph) * np.exp(-t * (3 if big else 9)) * (1.4 if big else 1.0)

def clap():
    n = int(SR * 0.25); t = np.arange(n) / SR; nz = rng.standard_normal(n)
    e = np.exp(-t * 18) + 0.6 * np.exp(-np.maximum(0, t - 0.012) * 30) * (t > 0.012)
    b = np.convolve(nz, np.ones(6) / 6, 'same') - np.convolve(nz, np.ones(40) / 40, 'same')
    return b * e * 0.9

def hat(open_=False):
    n = int(SR * (0.18 if open_ else 0.05)); t = np.arange(n) / SR; nz = rng.standard_normal(n)
    hp = nz - np.convolve(nz, np.ones(4) / 4, 'same')
    return hp * np.exp(-t * (14 if open_ else 70)) * 0.35

def saw(freq, n, detune=0.0):
    t = np.arange(n) / SR; out = np.zeros(n)
    for d in (-detune, 0, detune):
        out += 2 * ((t * freq * (1 + d)) % 1) - 1
    return out / 3

def lowpass(x, cutoff):
    a = np.exp(-2 * np.pi * cutoff / SR); y = np.zeros_like(x); prev = 0.0
    for i, v in enumerate(x):
        prev = (1 - a) * v + a * prev; y[i] = prev
    return y

def note(midi): return 440 * 2 ** ((midi - 69) / 12)
# C - G - Am - F, one chord per bar (2 s)
CHORDS = [[60, 64, 67], [55, 59, 62], [57, 60, 64], [53, 57, 60]]
ROOTS = [36, 31, 33, 29]

# pads (whole piece, filtered harder in intro)
for bar in range(int(DUR // 2) + 1):
    start = bar * 2.0
    if start >= DUR: break
    n = int(SR * 2.05); ch = CHORDS[bar % 4]
    pad = sum(saw(note(m), n, 0.004) for m in ch) / 3
    cut = 700 if start < G0 else (2200 if start < DROP else 1500)
    pad = lowpass(pad, cut) * env(n, a=0.08, d=9, sustain=0.6, rel=0.1)
    g = 0.16 if start < DROP else 0.2
    add(pad, start, g, -0.3); add(pad, start + 0.01, g, 0.3)

# drums
for b in range(int(DUR / BEAT)):
    t0 = b * BEAT
    if t0 < G0 - 1.0: continue                 # first bar: pad only (hook holds on the type)
    if t0 >= DUR - 1.0: break
    if DROP <= t0 < DROP + 0.5: continue        # silence after the drop hit
    if t0 < G0:
        add(kick(), t0, 0.5)
    elif t0 < RISE or t0 >= DROP + 0.5:
        add(kick(), t0, 0.9 if t0 < DROP else 0.6)
        if b % 2 == 1: add(clap(), t0, 0.55 if t0 < DROP else 0.35)
    for k in (0, 1):
        tt = t0 + k * BEAT / 2
        if tt < G0 or (RISE <= tt < DROP + 0.5): continue
        add(hat(open_=(k == 1 and b % 4 == 3)), tt, 0.8, 0.4)

# bass (groove only), eighth-note pulse on the root
for bar in range(1, int(RISE // 2) + 1):
    start = bar * 2.0
    if start < G0: start = G0
    for k in range(max(0, int((min((bar + 1) * 2.0, RISE) - start) / (BEAT / 2)))):
        tt = start + k * BEAT / 2; n = int(SR * 0.22)
        b = np.sin(2 * np.pi * note(ROOTS[bar % 4]) * np.arange(n) / SR)
        b += 0.3 * np.sin(4 * np.pi * note(ROOTS[bar % 4]) * np.arange(n) / SR)
        add(b * env(n, a=0.003, d=0.12), tt, 0.32)

# pluck arpeggio in the groove (16ths of chord tones, one octave up)
for i in range(int((RISE - G0) / (BEAT / 2))):
    tt = G0 + i * BEAT / 2; bar = int(tt // 2.0)
    m = CHORDS[bar % 4][i % 3] + 12; n = int(SR * 0.2)
    p = lowpass(saw(note(m), n), 3500) * env(n, a=0.002, d=0.07)
    add(p, tt, 0.12, 0.5 if i % 2 else -0.5)

# riser 9.5 -> 11.0: noise sweep + snare roll
n = int(SR * 1.5); t = np.arange(n) / SR; nz = rng.standard_normal(n)
sweep = np.zeros(n); prev = 0.0
for i in range(n):
    c = 300 + 6000 * (t[i] / 1.5) ** 2; a = np.exp(-2 * np.pi * c / SR); prev = (1 - a) * nz[i] + a * prev; sweep[i] = prev
add(sweep * (t / 1.5) ** 2 * 0.9, RISE, 0.6)
k = 0; tt = RISE
while tt < DROP:
    add(clap(), tt, 0.15 + 0.35 * (tt - RISE) / 1.5); step = BEAT / (2 if tt < RISE + 0.75 else 4); tt += step

# drop at 11.0: big kick + crash (logo lands)
add(kick(big=True), DROP, 1.0)
n = int(SR * 2.5); t = np.arange(n) / SR; nz = rng.standard_normal(n)
crash = (nz - np.convolve(nz, np.ones(3) / 3, 'same')) * np.exp(-t * 1.6) * 0.25
add(crash, DROP, 0.6, -0.2); add(crash, DROP + 0.003, 0.5, 0.2)
# final chord shimmer
n = int(SR * 4.0); sh = sum(np.sin(2 * np.pi * note(m + 12) * np.arange(n) / SR) for m in CHORDS[0]) / 3
add(sh * env(n, a=0.02, d=2.5, sustain=0.0, rel=0.5), DROP, 0.15)

# master: fade out last 0.8 s, soft clip, normalise to -1 dBFS
fade = np.ones(N); fn = int(0.8 * SR); fade[-fn:] = np.linspace(1, 0, fn)
st = np.stack([L, R], 1) * fade[:, None]
st = np.tanh(st * 1.2); st /= np.max(np.abs(st)) / 0.89
pcm = (st * 32767).astype(np.int16)
with wave.open(sys.argv[1], 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
print("wrote", sys.argv[1], DUR, "s")
