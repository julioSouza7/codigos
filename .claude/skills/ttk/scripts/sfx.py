"""Sound design for ttk (numpy only, deterministic). Usage: python3 sfx.py events.json out.wav duration
events.json: [[time, "type", gain], ...]  types: whoosh, rise, impact, big, sizzle, zap, tick, pop, blip, key, thud, ding, sub"""
import json, sys, wave
import numpy as np

SR = 48000
rng = np.random.default_rng(2026)


def env(n, a=0.002, d=0.1):
    t = np.arange(n) / SR
    return np.minimum(1, t / max(a, 1e-4)) * np.exp(-t / d)


def lp(x, k):  # moving-average low-pass, k samples
    k = max(1, int(k))
    return np.convolve(x, np.ones(k) / k, "same")


def bp(x, lo_k, hi_k):  # crude band-pass: difference of moving averages
    return lp(x, hi_k) - lp(x, lo_k)


def sweep_noise(dur, k0, k1, chunk=0.01):
    n = int(SR * dur); nz = rng.standard_normal(n + 4000); out = np.zeros(n)
    c = int(SR * chunk)
    for i in range(0, n, c):
        f = i / n; k = int(k0 + (k1 - k0) * f)
        seg = bp(nz[i: i + c + 2000], k * 6, k)[:c]
        out[i: i + len(seg)] = seg[: n - i]
    return out


def whoosh(dur=0.4, rise=True):
    n = int(SR * dur); t = np.linspace(0, 1, n)
    x = sweep_noise(dur, 40, 6) if rise else sweep_noise(dur, 6, 40)
    e = (t ** 1.6) * (1 - t) ** 0.25 if rise else np.sin(np.pi * t) ** 1.5
    return x * e * 3.2


def impact(big=False):
    d = 1.2 if big else 0.6; n = int(SR * d); t = np.arange(n) / SR
    f = 42 + 110 * np.exp(-t * 18); body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * (2.6 if big else 6))
    nz = lp(rng.standard_normal(n), 6) * np.exp(-t * 28)
    click = np.zeros(n); click[:200] = np.hanning(400)[200:] * rng.standard_normal(200)
    return body * (1.5 if big else 1.1) + nz * 0.7 + click * 0.6


def sizzle(dur=0.4):
    n = int(SR * dur); t = np.arange(n) / SR
    hiss = (rng.standard_normal(n) - lp(rng.standard_normal(n), 3)) * 0.18
    crack = np.zeros(n); idx = rng.integers(0, n, int(90 * dur))
    for i in idx:
        L = int(SR * 0.003); seg = rng.standard_normal(L) * np.hanning(L) * rng.uniform(0.2, 1)
        crack[i: i + L] += seg[: n - i]
    return (hiss + crack * 0.5) * (np.exp(-t / (dur * 0.6)))


def zap():
    n = int(SR * 0.18); t = np.arange(n) / SR
    f = 2400 * np.exp(-t * 22) + 140
    return (np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.5 + sizzle(0.18)[:n] * 0.8) * env(n, 0.001, 0.07)


def tick():
    n = int(SR * 0.03); x = rng.standard_normal(n) - lp(rng.standard_normal(n), 2)
    return x * env(n, 0.0005, 0.006) * 0.6 + np.sin(2 * np.pi * 2300 * np.arange(n) / SR) * env(n, 0.0005, 0.01) * 0.25


def pop():
    n = int(SR * 0.07); t = np.arange(n) / SR; f = 900 * np.exp(-t * 30) + 280
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * env(n, 0.001, 0.03) * 0.7


def blip():
    n = int(SR * 0.09); t = np.arange(n) / SR
    return (np.sin(2 * np.pi * 1320 * t) + 0.4 * np.sin(2 * np.pi * 2640 * t)) * env(n, 0.002, 0.03) * 0.35


def key():
    n = int(SR * 0.025); x = bp(rng.standard_normal(n + 200), 8, 2)[:n]
    return x * env(n, 0.0004, 0.006) * rng.uniform(0.6, 1.0) * 1.4


def thud():
    n = int(SR * 0.35); t = np.arange(n) / SR
    return (np.sin(2 * np.pi * 70 * t) * np.exp(-t * 12) + lp(rng.standard_normal(n), 30) * np.exp(-t * 20) * 1.5) * 1.1


def ding():
    n = int(SR * 0.9); t = np.arange(n) / SR
    return (np.sin(2 * np.pi * 988 * t) * np.exp(-t * 5) + 0.6 * np.sin(2 * np.pi * 1480 * t) * np.exp(-np.maximum(0, t - 0.09) * 5) * (t > 0.09)) * 0.3


def sub():
    n = int(SR * 1.1); t = np.arange(n) / SR; f = 75 * np.exp(-t * 1.8) + 30
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.minimum(1, t / 0.01) * np.exp(-t * 1.6) * 1.3


GEN = {"whoosh": lambda: whoosh(0.35, False), "rise": lambda: whoosh(0.45, True), "impact": impact, "big": lambda: impact(True),
       "sizzle": lambda: sizzle(0.38), "zap": zap, "tick": tick, "pop": pop, "blip": blip, "key": key, "thud": thud, "ding": ding, "sub": sub}

if __name__ == "__main__":
    ev = json.load(open(sys.argv[1])); dur = float(sys.argv[3])
    N = int(SR * dur); L = np.zeros(N); R = np.zeros(N)
    for t, kind, g in ev:
        s = GEN[kind]() * g; i = int(t * SR); j = min(N, i + len(s))
        if i >= N: continue
        pan = rng.uniform(-0.35, 0.35) if kind in ("tick", "key", "pop", "blip", "sizzle") else 0
        L[i:j] += s[: j - i] * (1 - max(0, pan)); R[i:j] += s[: j - i] * (1 + min(0, pan))
    pk = max(np.abs(L).max(), np.abs(R).max(), 1e-9); L /= pk; R /= pk
    data = (np.stack([L, R], 1) * 0.9 * 32767).astype(np.int16)
    with wave.open(sys.argv[2], "wb") as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(data.tobytes())
    print("wrote", sys.argv[2], len(ev), "events")
