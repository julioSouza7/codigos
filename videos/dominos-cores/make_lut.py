"""Make a .cube 3D LUT that turns the reds of a video into another hue, leaving black, white and greys alone.
Works in OKLab: hue is rotated so the main red lands on the target hue, lightness/chroma kept (plus an optional
lightness lift), out-of-gamut colours brought back by lowering chroma. Only saturated pixels near red move.
Usage: python3 make_lut.py out.cube <target_hue_deg> [dL] [chroma_scale] [ref_r,ref_g,ref_b]"""
import sys
import numpy as np

N = 65

def srgb_to_lin(c): return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
def lin_to_srgb(c):
    c = np.clip(c, 0, 1); return np.where(c <= 0.0031308, c * 12.92, 1.055 * c ** (1 / 2.4) - 0.055)

M1 = np.array([[0.4122214708, 0.5363325363, 0.0514459929], [0.2119034982, 0.6806995451, 0.1073969566],
               [0.0883024619, 0.2817188376, 0.6299787005]])
M2 = np.array([[0.2104542553, 0.7936177850, -0.0040720468], [1.9779984951, -2.4285922050, 0.4505937099],
               [0.0259040371, 0.7827717662, -0.8086757660]])
M2i, M1i = np.linalg.inv(M2), np.linalg.inv(M1)

def to_lab(rgb): return np.cbrt(srgb_to_lin(rgb) @ M1.T) @ M2.T
def to_lin(lab): return ((lab @ M2i.T) ** 3) @ M1i.T

def smooth(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t)

out = sys.argv[1]; target = np.radians(float(sys.argv[2]))
dL = float(sys.argv[3]) if len(sys.argv) > 3 else 0.0
cs = float(sys.argv[4]) if len(sys.argv) > 4 else 1.0
ref = np.array([float(v) for v in (sys.argv[5] if len(sys.argv) > 5 else "207,14,38").split(",")]) / 255
rl = to_lab(ref[None])[0]; ref_h = np.arctan2(rl[2], rl[1])
delta = target - ref_h

# grid in .cube order: red fastest, then green, then blue
idx = np.arange(N ** 3)
rgb = np.stack([idx % N, (idx // N) % N, idx // (N * N)], axis=1) / (N - 1)
lab = to_lab(rgb)
L, a, bb = lab[:, 0], lab[:, 1], lab[:, 2]
C = np.hypot(a, bb); h = np.arctan2(bb, a)

mx, mn = rgb.max(1), rgb.min(1)
sat = np.where(mx > 1e-6, (mx - mn) / np.maximum(mx, 1e-6), 0)
dh = np.abs(np.angle(np.exp(1j * (h - ref_h))))           # distance from the reference red hue
w = smooth(0.12, 0.30, sat) * (1 - smooth(np.radians(45), np.radians(75), dh)) * smooth(0.01, 0.03, C)

nh = h + delta
nL = L + dL * w * smooth(0.35, 0.55, L)   # lift only mid/bright reds, keep dark glows dark
nC = C * (1 + (cs - 1) * w)
# bring back into the sRGB gamut by lowering chroma (binary search)
lo, hi = np.zeros_like(nC), nC.copy()
def inside(c):
    lin = to_lin(np.stack([nL, c * np.cos(nh), c * np.sin(nh)], 1)); return np.all((lin >= -1e-4) & (lin <= 1 + 1e-4), 1)
ok = inside(hi); lo[ok] = hi[ok]
for _ in range(22):
    mid = (lo + hi) / 2; m = inside(mid); lo = np.where(m, mid, lo); hi = np.where(m, hi, mid)
rot = np.stack([nL, lo * np.cos(nh), lo * np.sin(nh)], 1)
res = lab * (1 - w[:, None]) + rot * w[:, None]
outrgb = lin_to_srgb(to_lin(res))

with open(out, "w") as f:
    f.write(f"LUT_3D_SIZE {N}\nDOMAIN_MIN 0 0 0\nDOMAIN_MAX 1 1 1\n")
    np.savetxt(f, outrgb, fmt="%.6f")
probe = to_lab(ref[None]); i = np.argmin(np.sum((rgb - ref) ** 2, 1))
print(out, "ref red ->", tuple(int(round(v * 255)) for v in outrgb[i]))
