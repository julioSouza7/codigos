"""Soundtrack for the attention videos: a 150 BPM track plus sound effects placed on the exact frames of the animation.
Timing formulas mirror the scenes (countdown T[v], word beats from build.BEATS, chart and closing offsets).
Usage: python3 sound.py <theme> <out.wav>   (theme: balao | copo | pavio)"""
import os, subprocess, sys, tempfile, wave
import numpy as np
from scipy.signal import butter, sosfilt, fftconvolve

SR = 48000
DUR = 24.0
N = int(SR * DUR)
BEAT = 0.4                      # 150 BPM
GRID0 = 8.6                     # first word lands on a downbeat
rng = np.random.default_rng(1955)

# ---------------------------------------------------------------- primitives
def t_(d): return np.arange(int(d * SR)) / SR
def noise(d): return rng.standard_normal(int(d * SR))
def env(d, a=0.002, dec=0.1, hold=0.0):
    t = t_(d); e = np.minimum(1, t / max(a, 1e-5)) * np.exp(-np.maximum(0, t - a - hold) / dec)
    k = min(len(e), int(0.004 * SR)); e[-k:] *= np.linspace(1, 0, k); return e
def filt(x, kind, f, order=2):
    f = np.atleast_1d(f) / (SR / 2); f = np.clip(f, 1e-4, 0.999)
    sos = butter(order, float(f[0]) if kind != "bandpass" else [float(f[0]), float(f[1])], btype=kind, output="sos"); return sosfilt(sos, x)
def lp(x, f, o=2): return filt(x, "lowpass", f, o)
def hp(x, f, o=2): return filt(x, "highpass", f, o)
def bp(x, lo, hi, o=2): return filt(x, "bandpass", [lo, hi], o)
def osc(freq, d, kind="sine", phase=0.0):
    n = int(d * SR); f = np.broadcast_to(np.asarray(freq, float), (n,)) if np.ndim(freq) else np.full(n, float(freq))
    ph = phase + 2 * np.pi * np.cumsum(f) / SR
    if kind == "sine": return np.sin(ph)
    if kind == "saw": return 2 * ((ph / (2 * np.pi)) % 1.0) - 1
    if kind == "tri": return 2 * np.abs(2 * ((ph / (2 * np.pi)) % 1.0) - 1) - 1
    if kind == "square": return np.sign(np.sin(ph))
def glide(f0, f1, d, curve="exp"):
    x = np.linspace(0, 1, int(d * SR)); return f0 * (f1 / f0) ** x if curve == "exp" else f0 + (f1 - f0) * x
def sweep(x, f0, f1, q=1.2, curve=None):
    """band-pass that moves from f0 to f1 over the signal (STFT overlap-add)"""
    n, hop, win = len(x), 512, 2048; w = np.hanning(win); out = np.zeros(n + win); freqs = np.fft.rfftfreq(win, 1 / SR)
    pad = np.concatenate([x, np.zeros(win)]); steps = max(1, (n) // hop)
    for i in range(0, n, hop):
        p = i / max(1, n - 1); p = curve(p) if curve else p; fc = f0 * (f1 / f0) ** p
        seg = pad[i:i + win] * w; spec = np.fft.rfft(seg)
        g = np.exp(-0.5 * (np.log2(np.maximum(freqs, 1) / fc) / (0.5 / q)) ** 2)
        out[i:i + win] += np.fft.irfft(spec * g, win) * w
    return out[:n] / 1.5
def lpsweep(x, f0, f1, curve=None):
    """low-pass whose cutoff moves from f0 to f1 over the signal (STFT overlap-add)"""
    n, hop, win = len(x), 512, 2048; w = np.hanning(win); out = np.zeros(n + win); freqs = np.fft.rfftfreq(win, 1 / SR)
    pad = np.concatenate([x, np.zeros(win)])
    for i in range(0, n, hop):
        p = i / max(1, n - 1); p = curve(p) if curve else p; fc = f0 * (f1 / f0) ** p
        spec = np.fft.rfft(pad[i:i + win] * w); out[i:i + win] += np.fft.irfft(spec / (1 + (freqs / fc) ** 4), win) * w
    return out[:n] / 1.5
def note(name):
    names = {"C": -9, "D": -7, "E": -5, "F": -4, "G": -2, "A": 0, "B": 2}
    base, octv = name[:-1], int(name[-1]); s = names[base[0]] + (1 if "#" in base else -1 if "b" in base else 0)
    return 440.0 * 2 ** ((s + (octv - 4) * 12) / 12)

# ---------------------------------------------------------------- bus
class Bus:
    def __init__(self): self.L = np.zeros(N + SR * 3); self.R = np.zeros(N + SR * 3)
    def add(self, sig, t, gain=1.0, pan=0.0):
        i = int(round(t * SR))
        if i < 0: sig = sig[-i:]; i = 0
        pan = np.clip(pan, -1, 1); l = np.cos((pan + 1) * np.pi / 4); r = np.sin((pan + 1) * np.pi / 4)
        j = i + len(sig); self.L[i:j] += sig * gain * l * 1.414; self.R[i:j] += sig * gain * r * 1.414
    def add_panned(self, sig, t, gain, pan_arr):
        i = int(round(t * SR)); p = np.clip(pan_arr, -1, 1)
        self.L[i:i + len(sig)] += sig * gain * np.cos((p + 1) * np.pi / 4) * 1.414
        self.R[i:i + len(sig)] += sig * gain * np.sin((p + 1) * np.pi / 4) * 1.414

music, sfx, verb = Bus(), Bus(), Bus()
def fx(sig, t, gain=1.0, pan=0.0, rev=0.0):
    sfx.add(sig, t, gain, pan)
    if rev: verb.add(sig, t, gain * rev, pan)

# ---------------------------------------------------------------- instruments
def kick(g=1.0, f0=160, f1=44, d=0.42, dec=0.16):
    f = f1 + (f0 - f1) * np.exp(-t_(d) * 32); body = np.sin(2 * np.pi * np.cumsum(f) / SR) * env(d, 0.001, dec)
    click = hp(noise(0.01), 3000) * env(0.01, 0.0005, 0.003) * 0.3
    body[:len(click)] += click; return np.tanh(body * 1.6) * g
def clap(g=1.0):
    d = 0.3; x = np.zeros(int(d * SR)); n = noise(d)
    for k, o in enumerate((0, 0.011, 0.022)):
        i = int(o * SR); m = len(x) - i; tt = np.arange(m) / SR
        e = np.minimum(1, tt / 0.001) * np.exp(-tt / (0.012 if k < 2 else 0.11)); x[i:] += n[i:] * e
    return bp(x, 900, 5200) * g * 0.9
def hat(g=1.0, open_=False):
    d = 0.3 if open_ else 0.06; return hp(noise(d), 7000, 2) * env(d, 0.0008, 0.09 if open_ else 0.018) * g
def tick(f=2200, g=1.0, d=0.05):
    x = osc(f, d) * env(d, 0.0005, 0.012) + hp(noise(d), 4000) * env(d, 0.0003, 0.003) * 0.4; return x * g
def thock(g=1.0, f=150):
    d = 0.22; tone = np.sin(2 * np.pi * np.cumsum(f * 0.5 + f * 0.5 * np.exp(-t_(d) * 30)) / SR) * env(d, 0.001, 0.07)
    snap = bp(noise(d), 900, 4500) * env(d, 0.0008, 0.018) * 0.8
    return np.tanh((tone + snap) * 1.4) * g
def boom(g=1.0, d=1.4, f0=70, f1=34):
    f = f1 + (f0 - f1) * np.exp(-t_(d) * 6); s = np.sin(2 * np.pi * np.cumsum(f) / SR) * env(d, 0.002, 0.45)
    s += lp(noise(d), 260) * env(d, 0.002, 0.18) * 0.9; return np.tanh(s * 1.8) * g
def crash(g=1.0, d=1.8):
    x = hp(noise(d), 3200) * env(d, 0.001, 0.55)
    for f in (3150, 4380, 5930, 7210): x += osc(f * (1 + 0.002 * rng.standard_normal()), d) * env(d, 0.001, 0.35) * 0.05
    return x * g * 0.6
def bell(freqs, g=1.0, d=1.6):
    x = np.zeros(int(d * SR))
    for f in freqs:
        for m, a, dec in ((1, 1, 0.9), (2.76, 0.35, 0.35), (5.4, 0.15, 0.15)):
            x += osc(f * m, d) * env(d, 0.001, dec) * a
    return x * g / len(freqs)
def pluck(f, g=1.0, d=0.6, bright=8):
    t = t_(d); x = np.zeros_like(t)
    for k in range(1, bright + 1): x += np.sin(2 * np.pi * f * k * t) / k * np.exp(-t * (4 + k * 2.2))
    return x * env(d, 0.002, 10) * g
def whoosh(d=0.3, f0=600, f1=6000, g=1.0, q=0.9):
    e = np.sin(np.linspace(0, np.pi, int(d * SR))) ** 1.5; return sweep(noise(d), f0, f1, q) * e * g * 3
def riser(d=0.8, g=1.0, f0=300, f1=7000):
    x = sweep(noise(d), f0, f1, 0.8) * 3 + osc(glide(180, 900, d), d) * 0.25
    return x * np.linspace(0, 1, int(d * SR)) ** 2.2 * g
def saw_chord(freqs, d, cutoff, g=1.0, dec=None, detune=0.006):
    x = np.zeros(int(d * SR))
    for f in freqs:
        for k in (-1, 0, 1): x += osc(f * (1 + k * detune), d, "saw", phase=rng.random() * 6.28)
    x = x / (3 * len(freqs))
    if cutoff: x = lp(x, cutoff, 2)
    return x * (env(d, 0.004, dec) if dec else 1) * g
def bass_note(f, d, g=1.0):
    x = osc(f, d, "saw") * 0.6 + osc(f, d, "sine") * 0.8; x = lp(x, 520, 2)
    e = env(d, 0.004, d * 0.7); return np.tanh(x * e * 1.6) * g

def reverb_ir(d=1.6, seed=3):
    r = np.random.default_rng(seed); t = t_(d)
    e = np.exp(-t / 0.42); l = r.standard_normal(len(t)) * e; rr = r.standard_normal(len(t)) * e
    l = lp(l, 6000); rr = lp(rr, 6000); l[:int(0.012 * SR)] = 0; rr[:int(0.017 * SR)] = 0
    return l / np.sqrt(np.sum(l ** 2)), rr / np.sqrt(np.sum(rr ** 2))

# ---------------------------------------------------------------- timing shared with the scenes
def countdown():
    T = {v: (0 if v == 28 else 1.6 + 5.4 * (1 - (v / 28) ** 0.55)) for v in range(29)}
    return T
CHORDS = [("A2", "C3", "E3", "A3"), ("F2", "A2", "C3", "F3"), ("C3", "E3", "G3", "C4"), ("G2", "B2", "D3", "G3")]
ROOTS = ["A1", "F1", "C2", "G1"]
def chord_at(t): return int(np.floor((t - GRID0) / (4 * BEAT) + 1000)) % 4

# ---------------------------------------------------------------- music
def build_music():
    # hook: pad opening up, heartbeat kick, pulsing bass, hats in the last bar, riser into the pop
    d = 7.0; pad = saw_chord([note(n) for n in CHORDS[0]], d, None, 1.0)
    pad = lpsweep(pad, 420, 2600, curve=lambda p: p ** 1.6) * np.linspace(0.5, 1.0, int(d * SR))
    pad *= np.minimum(1, t_(d) / 0.6); pad[-int(0.03 * SR):] *= np.linspace(1, 0, int(0.03 * SR))
    music.add(pad, 0.0, 0.32, -0.1)
    for k in range(int((7.0 - 1.4) / BEAT)):
        t = 1.4 + k * BEAT; music.add(kick(0.18 + 0.45 * t / 7.0, d=0.35), t)
    for k in range(int((7.0 - 3.8) / (BEAT / 2))):
        t = 3.8 + k * BEAT / 2; music.add(bass_note(note("A1"), 0.18), t, 0.12 + 0.2 * (t - 3.8) / 3.2)
    for k in range(int((7.0 - 5.4) / (BEAT / 2))):
        t = 5.4 + k * BEAT / 2; music.add(hat(0.09 + 0.08 * (t - 5.4) / 1.6), t, 1, 0.3)
    music.add(riser(1.6, 0.38), 5.4)
    # into the words: riser + accelerating snare roll on 8.0 -> 8.6
    music.add(riser(0.8, 0.45, 400, 9000), 7.8)
    for k in range(12):
        t = 8.0 + 0.6 * (1 - (1 - k / 12) ** 1.6); music.add(clap(0.12 + 0.3 * k / 12), t, 1, 0.15)

    # groove 8.6 -> 23.4 with a break on the timer, a build before VENDAS, half-time on the chart
    t = GRID0; k = 0
    while t < 23.39:
        beat_in_bar = k % 4; bar_start = beat_in_bar == 0; c = chord_at(t)
        brk = 12.6 <= t < 13.2
        build_up = 15.6 <= t < 16.0
        chart = 16.8 <= t < 19.8
        if not brk and not build_up and (not chart or beat_in_bar in (0, 2)):
            music.add(kick(0.62), t)
        if not brk and not build_up and beat_in_bar in (1, 3):
            music.add(clap(0.32), t, 1, 0.05); verb.add(clap(0.32), t, 0.25)
        for e in (0, 1):
            te = t + e * BEAT / 2
            if e == 1: music.add(hat(0.12 if not brk else 0.06), te, 1, 0.25)
            if not brk and not build_up:
                f = note(ROOTS[c]) * (2 if (k * 2 + e) % 4 == 3 else 1)
                music.add(bass_note(f, BEAT / 2 * 0.95), te, 0.34)
        if bar_start and not brk:
            st = saw_chord([note(n) * 2 for n in CHORDS[c]], 0.5, 2400, 1, dec=0.16)
            music.add(st, t, 0.2, -0.2); verb.add(st, t, 0.12)
        if not brk and not build_up and beat_in_bar == 2:
            st = saw_chord([note(n) * 2 for n in CHORDS[c]], 0.3, 2000, 1, dec=0.08)
            music.add(st, t + BEAT / 2, 0.12, 0.2)
        t = round(t + BEAT, 4); k += 1
    # snare roll + riser before VENDAS (15.6 -> 16.0)
    for i in range(8): music.add(clap(0.15 + 0.35 * i / 8), 15.6 + i * 0.05, 1, 0.1)
    music.add(riser(0.6, 0.4, 500, 10000), 15.4)
    # pad underneath words / chart / closing
    for bar in range(int((23.4 - GRID0) / 1.6) + 1):
        t0 = GRID0 + bar * 1.6; c = chord_at(t0 + 0.01); dd = min(1.6, 23.4 - t0)
        if dd <= 0.05: break
        p = saw_chord([note(n) for n in CHORDS[c]], dd, 900, 1)
        p *= np.minimum(1, t_(dd) / 0.08); p[-int(0.05 * SR):] *= np.linspace(1, 0, int(0.05 * SR))
        g = 0.05 if 12.6 <= t0 < 13.2 else 0.11
        music.add(p, t0, g, 0)
    # end: music stops on the beat at 23.4 with a final chord
    fin = saw_chord([note(n) * 2 for n in CHORDS[0]], 0.6, 3000, 1, dec=0.35)
    music.add(fin, 23.4, 0.3); verb.add(fin, 23.4, 0.5)

# ---------------------------------------------------------------- shared sound effects
def countdown_fx(T):
    for v in range(27, -1, -1):
        f = 950 * 2 ** ((27 - v) / 22); fx(tick(f, 0.2 if v > 3 else 0.32), T[v], pan=0.0)
        if v <= 3: fx(kick(0.35, 120, 40, 0.3, 0.12), T[v])

def words_fx(beats):
    for (a, b, bg, col, text, anim, cap) in beats:
        if anim in ("pop", "aqui"): fx(thock(0.6), a, rev=0.15); fx(hat(0.25), a, pan=0.2)
        if anim == "whip":
            fx(whoosh(0.22, 7000, 700, 0.5), a - 0.12, pan=-0.3); fx(thock(0.4, 180), a)
        if anim == "num":
            fx(tick(1600, 0.35), a); fx(boom(0.75, 1.0), a + 0.2, rev=0.3); fx(bell([note("A5")], 0.16), a + 0.2, rev=0.4)
        if anim == "aqui": fx(whoosh(0.16, 500, 7000, 0.45), b - 0.15)
        if anim == "timer":
            fx(tick(1900, 0.55, 0.08), a, rev=0.3); fx(tick(1250, 0.6, 0.08), 13.0, rev=0.3)
            for i in range(1, 3): fx(tick(2600, 0.12), a + i * 0.2, pan=0.3)
        if anim == "att":
            fx(boom(0.7, 1.3), a, rev=0.3); fx(crash(0.45), a, rev=0.3); fx(bell([note("A5"), note("E6")], 0.18), a, rev=0.6)
            fx(whoosh(0.3, 800, 5000, 0.25), a + 0.1, pan=-0.4)
        if anim == "imp": fx(thock(0.55), a); fx(whoosh(0.2, 600, 8000, 0.45), b - 0.2, pan=0.4)
        if anim == "up":
            fx(boom(0.85, 1.4, 60, 30), a, rev=0.25); fx(crash(0.5), a, rev=0.2)
            for i, n_ in enumerate(("A5", "C6", "E6", "A6")): fx(pluck(note(n_), 0.18, 0.5), a + 0.08 + i * 0.05, pan=-0.3 + i * 0.2, rev=0.3)

def chart_fx(theme, C=16.8):
    fx(whoosh(0.25, 6000, 500, 0.4), C - 0.08); fx(thock(0.35, 200), C + 0.02)
    for i, n_ in enumerate(("A4", "C5", "D5", "E5", "G5", "A5", "C6")):
        fx(pluck(note(n_), 0.28, 0.7), C + 0.2 + i * 0.1, pan=-0.6 + i * 0.2, rev=0.25)
    d = 1.2; line = osc(glide(320, 1250, d), d, "tri") * np.sin(np.linspace(0, np.pi, int(d * SR))) ** 0.5 * 0.5
    fx(lp(line, 3000), C + 1.0, 0.16, pan=0.2, rev=0.3)
    fx(bell([note("A6"), note("E7")], 0.3), C + 2.2, pan=0.4, rev=0.6)
    if theme == "pavio":
        sz = bp(noise(1.2), 3500, 9000) * 0.5; fx(sz * np.linspace(0.6, 1, len(sz)), C + 1.0, 0.18, pan=0.2)
        for i in range(30): fx(hp(noise(0.004), 2500) * env(0.004, 0.0003, 0.001), C + 2.2 + rng.random() * 0.5, 0.25, pan=rng.uniform(-0.6, 0.8))
    if theme == "copo": fx(drip(1.0), C + 2.25, 0.4, pan=0.4, rev=0.4)
    if theme == "balao": fx(squeak(900, 0.12), C + 2.25, 0.12, pan=0.4)
    fx(whoosh(0.34, 400, 9000, 0.55), C + 2.6)

def cta_fx(theme, E=19.8):
    fx(boom(0.85, 1.5), E, rev=0.3); fx(crash(0.55), E, rev=0.3)
    for i in range(8):
        if i != 6: fx(tick(2600 + i * 40, 0.08, 0.03), E + 0.05 + i * 0.035, pan=-0.4 + i * 0.1)
    for i in range(7): fx(tick(2200 + i * 60, 0.1, 0.03), E + 0.38 + i * 0.04, pan=-0.3 + i * 0.1)
    fx(pluck(note("A6"), 0.28, 0.6), E + 0.8, pan=0.45, rev=0.5); fx(whoosh(0.3, 900, 6000, 0.25), E + 0.78, pan=-0.2)
    fx(thock(0.75), E + 1.2, rev=0.3); fx(clap(0.5), E + 1.2); fx(boom(0.5, 0.9), E + 1.2)
    if theme == "copo":
        fx(whoosh(0.4, 2000, 700, 0.15), E + 1.8, pan=0.45); fx(drip(1.0), E + 2.2, 0.55, pan=0.45, rev=0.5)
    if theme == "pavio":
        for i in range(40): fx(hp(noise(0.004), 2500) * env(0.004, 0.0003, 0.0012), E + 1.8 + rng.random() * 0.6, 0.3 * rng.random() + 0.1, pan=rng.uniform(0.1, 0.8))
        fx(whoosh(0.25, 1500, 8000, 0.25), E + 1.8, pan=0.45)
    if theme == "balao":
        fx(puff(0.3), E + 1.8, 0.5, pan=0.45); fx(squeak(700, 0.15), E + 1.8, 0.14, pan=0.45)
        d = 2.0; fl = osc(glide(500, 900, d), d) * np.sin(np.linspace(0, np.pi, int(d * SR))) * 0.08
        fx(fl, E + 2.15, 1, pan=0.5, rev=0.4)
    fx(bell([note("A5"), note("C6"), note("E6")], 0.34, 2.0), 23.58, rev=0.7); fx(boom(0.4, 1.0, 55, 30), 23.58)

# ---------------------------------------------------------------- theme sounds
def puff(size):
    d = 0.2; x = lp(noise(d), 500 + 1700 * size, 2) * env(d, 0.012, 0.06); return x * 1.4
def squeak(f, d):
    vib = 1 + 0.03 * np.sin(2 * np.pi * 28 * t_(d)); x = osc(glide(f, f * 1.25, d) * vib, d, "saw")
    return bp(x, f * 0.8, f * 4) * env(d, 0.01, d * 0.6)
def drip(fill):
    d = 0.35; f0 = 620 + 1350 * fill; f = f0 * (1 + 0.75 * (1 - np.exp(-t_(d) / 0.012)))
    x = osc(f, d) * env(d, 0.0015, 0.05) + bp(noise(d), 2000, 7000) * env(d, 0.0005, 0.01) * 0.25; return x * 0.8

def hook_balao(T):
    T0 = T[0]
    for v in range(27, -1, -1):
        s = 1 - v / 28; fx(puff(s), T[v] - 0.015, 0.55, pan=-0.05)
        fx(squeak(260 + 520 * s, 0.09), T[v] + 0.02, 0.05 + 0.05 * s, pan=0.05)
    d = T0 - T[1]
    creak = osc(140 * (1 + 0.05 * np.sin(2 * np.pi * 23 * t_(d))), d, "saw") * (0.5 + 0.5 * np.sin(2 * np.pi * 11 * t_(d)))
    creak = bp(creak, 120, 1500) * np.linspace(0.3, 1, len(creak)); fx(creak, T[1], 0.12)
    fx(osc(glide(1400, 2900, d), d) * np.linspace(0, 1, int(d * SR)) ** 2, T[1], 0.04, pan=0.1)
    # POP
    crack = hp(noise(0.08), 1500) * env(0.08, 0.0004, 0.022); body = bp(noise(0.25), 300, 3500) * env(0.25, 0.001, 0.07)
    fx(crack, T0, 1.0, rev=0.5); fx(body, T0, 0.55, rev=0.4); fx(kick(0.7, 130, 40, 0.4, 0.13), T0); fx(crash(0.25), T0, rev=0.3)
    for i in range(170):  # confetti
        tt = T0 + 0.05 + rng.exponential(0.45)
        if tt > 8.6: continue
        fx(hp(noise(0.004), 5000) * env(0.004, 0.0003, 0.0012), tt, 0.04 + 0.12 * rng.random() * np.exp(-(tt - T0)), pan=rng.uniform(-0.8, 0.8))
    rs = bp(noise(1.3), 2000, 7000) * env(1.3, 0.02, 0.4); fx(rs, T0 + 0.05, 0.12, pan=0.1)
    fx(whoosh(0.35, 300, 4000, 0.5), 8.25)

def hook_copo(T):
    T0 = T[0]; EMPTY, BRIM = 1450, 905
    def fill(v): return min(1, (1 - v / 28) ** 0.9 / (1 - 2 / 28) ** 0.9)
    for v in range(27, -1, -1):
        fx(drip(fill(v + 1)), T[v], 0.55, pan=0.0, rev=0.35)
    d = T0 - T[2]; hum = (osc(2350, d) + 0.6 * osc(3120, d)) * (0.6 + 0.4 * np.sin(2 * np.pi * 9 * t_(d))) * np.linspace(0.2, 1, int(d * SR))
    fx(hum, T[2], 0.035, rev=0.3)
    fx(bp(noise(0.6), 400, 4000) * env(0.6, 0.004, 0.22), T0, 0.8, rev=0.4); fx(kick(0.45, 110, 40, 0.35, 0.12), T0)
    d = 1.3; am = np.clip(lp(rng.standard_normal(int(d * SR)), 18) * 25, 0, 1)
    pour = lp(noise(d), 1700) * am * env(d, 0.05, 0.6); fx(pour, T0 + 0.05, 0.45, pan=-0.25)
    pour2 = lp(noise(d), 1500) * am[::-1] * env(d, 0.05, 0.6); fx(pour2, T0 + 0.08, 0.35, pan=0.25)
    for i in range(16): fx(drip(rng.uniform(0.6, 1.2)), T0 + 0.25 + rng.random() * 0.7, 0.18, pan=rng.uniform(-0.6, 0.6))
    d = 0.45; rush = sweep(noise(d), 200, 3200, 0.7) * 3 * np.linspace(0, 1, int(d * SR)) ** 1.5
    fx(rush, 8.16, 0.6); fx(lp(noise(d), 120) * np.linspace(0, 1, int(d * SR)), 8.16, 0.5)

def spark_x_path():
    segs = [((140, 590), (420, 540), (880, 560), (900, 680)), ((900, 680), (915, 790), (230, 730), (190, 860)),
            ((190, 860), (150, 990), (860, 900), (900, 1050)), ((900, 1050), (930, 1170), (760, 1300), (700, 1380)),
            ((700, 1380), (670, 1420), (620, 1420), (586, 1405))]
    pts = []
    for p0, p1, p2, p3 in segs:
        u = np.linspace(0, 1, 400)[:, None]
        pts.append(((1 - u) ** 3) * p0 + 3 * ((1 - u) ** 2) * u * p1 + 3 * (1 - u) * u ** 2 * p2 + u ** 3 * p3)
    P = np.vstack(pts); L = np.concatenate([[0], np.cumsum(np.hypot(*np.diff(P, axis=0).T))]); return P, L / L[-1]

def hook_pavio(T):
    T0 = T[0]; TS = dict(T); TS[28] = 0.55
    def t_at(f):
        x = 28 * (1 - f); a = int(np.floor(x)); b = min(28, a + 1); return TS[a] if a == b else TS[b] + (TS[a] - TS[b]) * (b - x)
    P, Lf = spark_x_path(); fs = np.linspace(0, 1, 600); ts = np.array([t_at(f) for f in fs])
    fx(bp(noise(0.12), 2000, 7000) * env(0.12, 0.003, 0.05), 0.08, 0.5, pan=-0.75)
    fx(lp(noise(0.4), 900) * env(0.4, 0.04, 0.12), 0.12, 0.45, pan=-0.75)
    d = T0 - 0.5; tt = 0.5 + t_(d)
    f_of_t = np.interp(tt, ts, fs); xs = np.interp(f_of_t, Lf, P[:, 0]); pan = (xs / 1080) * 1.6 - 0.8
    hiss = bp(noise(d), 3500, 9500) * (0.75 + 0.25 * np.sin(2 * np.pi * 7 * tt)) * np.linspace(0.8, 1.15, len(tt))
    sfx.add_panned(hiss, 0.5, 0.11, pan)
    t = 0.55
    while t < T0:
        x = np.interp(np.interp(t, ts, fs), Lf, P[:, 0]); p = x / 1080 * 1.6 - 0.8
        fx(hp(noise(0.006), 1800) * env(0.006, 0.0003, 0.0015), t, 0.12 + 0.3 * rng.random(), pan=p)
        t += rng.exponential(1 / 26)
    fx(lp(noise(0.3), 1400) * env(0.3, 0.06, 0.1), T0, 0.6, pan=0.0)  # rocket catches
    LT, BT = T0 + 0.2, T0 + 0.8
    d = BT - LT; vib = 1 + 0.01 * np.sin(2 * np.pi * 9 * t_(d))
    whis = osc(glide(750, 3000, d) * vib, d) * np.linspace(0.4, 1, int(d * SR)); fx(whis, LT, 0.22, rev=0.3)
    fx(lp(noise(d), 2400) * np.linspace(1, 0.5, int(d * SR)), LT, 0.32)
    fx(boom(1.0, 1.8, 75, 30), BT, rev=0.5); fx(crash(0.35), BT, rev=0.4)
    for i in range(220):
        tc = BT + 0.12 + rng.exponential(0.35)
        if tc > 8.6: continue
        fx(hp(noise(0.005), 2000) * env(0.005, 0.0003, 0.0015), tc, 0.06 + 0.3 * rng.random() * np.exp(-(tc - BT) * 1.5), pan=rng.uniform(-0.9, 0.9), rev=0.3)
    fx(whoosh(0.32, 300, 4500, 0.5), 8.28)

# ---------------------------------------------------------------- render
def render(theme, out):
    global music, sfx, verb
    music, sfx, verb = Bus(), Bus(), Bus()
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    import build
    T = countdown()
    build_music()
    # intro: camera pulls back on frame 0, three ticks set the tempo before the first count
    fx(boom(0.45, 1.3, 62, 30), 0.0, rev=0.3); fx(whoosh(0.9, 5000, 250, 0.4), 0.0)
    for i, tt in enumerate((0.2, 0.6, 1.0)): fx(tick(1500, 0.22, 0.06), tt, rev=0.35)
    if theme == "balao": fx(puff(0.1), 0.02, 0.35)
    if theme == "copo": fx(drip(0.0), 0.62, 0.18, rev=0.4)
    countdown_fx(T)
    {"balao": hook_balao, "copo": hook_copo, "pavio": hook_pavio}[theme](T)
    fx(crash(0.3), 8.6, rev=0.2); fx(boom(0.6, 1.2), 8.6)          # the drop on the first word
    words_fx(build.BEATS(build.THEMES[theme]))
    chart_fx(theme); cta_fx(theme)
    irl, irr = reverb_ir()
    wl = fftconvolve(verb.L, irl)[:len(verb.L)]; wr = fftconvolve(verb.R, irr)[:len(verb.R)]
    L = music.L * 0.62 + sfx.L * 0.95 + wl * 0.5; R = music.R * 0.62 + sfx.R * 0.95 + wr * 0.5
    L, R = L[:N], R[:N]
    fade = int(0.35 * SR); L[-fade:] *= np.linspace(1, 0, fade); R[-fade:] *= np.linspace(1, 0, fade)
    peak = max(np.abs(L).max(), np.abs(R).max()); L, R = np.tanh(L / peak * 1.3) / np.tanh(1.3), np.tanh(R / peak * 1.3) / np.tanh(1.3)
    raw = os.path.join(tempfile.mkdtemp(), "raw.wav")
    with wave.open(raw, "wb") as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((np.stack([L, R], 1) * 32000).astype(np.int16).tobytes())
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", raw, "-af", "loudnorm=I=-14:TP=-1.5:LRA=11", "-ar", "48000", "-ac", "2", out], check=True)
    print("audio", theme, out)

if __name__ == "__main__":
    render(sys.argv[1], sys.argv[2])
