"""Second pass for green literals the Spotify example uses that theme.py does not map."""
import glob, os, re, sys
d, acc = sys.argv[1], sys.argv[2].lstrip("#")
A = tuple(int(acc[i:i+2], 16) for i in (0, 2, 4))
def mix(t, to): return tuple(round(A[i] + (to[i] - A[i]) * t) for i in range(3))
W, K = (255,)*3, (0,)*3
HEX = {"#78e7a0": .4, "#c7f5d7": .75, "#83e9a8": .45, "#8eebb0": .5, "#a5efbf": .6, "#56e188": .25, "#effcf4": .93, "#f2fdf5": .94}
RGB = {"131,233,168": ("a", .45), "199,245,215": ("a", .75), "75,223,128": ("a", .2), "165,239,191": ("a", .6),
       "28,198,88": ("d", .08), "4,32,14": ("d", .85)}
pairs = [(k, "#%02x%02x%02x" % mix(t, W)) for k, t in HEX.items()]
pairs += [("rgba(" + k + ",", "rgba(%d,%d,%d," % mix(t, W if r == "a" else K)) for k, (r, t) in RGB.items()]
for fn in [os.path.join(d, "index.html"), os.path.join(d, "assets", "ttk.js")] + glob.glob(os.path.join(d, "compositions", "*.html")):
    s = o = open(fn, encoding="utf-8").read()
    for a, b in pairs: s = re.sub(re.escape(a), b, s, flags=re.I)
    if s != o: open(fn, "w", encoding="utf-8").write(s); print("  extra", os.path.relpath(fn, d))
