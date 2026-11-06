"""Recolor a ttk project to another accent.
Usage: python3 theme.py <project_dir> <accent_hex> <alt_hex> [ember_css_gradient] [wall2_hex]
- accent: theme colour (sparks, lines, light on the wall, highlights)
- alt: negation/error colour
- ember gradient: optional CSS linear-gradient(...) for the burning letters
- wall2: optional second wall light colour (top-left glow)
The source palette is the template's (Spotify green / pink). To recolor files copied from an already themed
project, pass its palette in env vars: SRC_ACCENT, SRC_ALT, SRC_EMBER, SRC_WALL2."""
import glob, os, sys

def hx(h):
    h = h.lstrip("#"); return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))

def mix(c, t, to): return tuple(round(c[i] + (to[i] - c[i]) * t) for i in range(3))
def h(c): return "#%02x%02x%02x" % c
W, K = (255, 255, 255), (0, 0, 0)

# template literal -> (role, factor). role: a=accent tint toward white, d=accent toward black, x=alt tint
HEX = {"#1ed760": ("a", 0), "#7cf5a4": ("a", .45), "#6ff59b": ("a", .4), "#c9ffda": ("a", .75), "#dcffe8": ("a", .85),
       "#5df08f": ("a", .3), "#9ff7bd": ("a", .6), "#8cf7b1": ("a", .5), "#4ff08a": ("a", .25), "#e8fff0": ("a", .9),
       "#f0fff5": ("a", .93), "#f2fff6": ("a", .94), "#eafff1": ("a", .91), "#0c8a3d": ("d", .45), "#04140a": ("d", .9),
       "#ff4f8b": ("x", 0), "#ff9ec0": ("x", .45)}
RGB = {"30,215,96": ("a", 0), "30, 215, 96": ("a", 0), "70,225,125": ("a", .2), "30,200,90": ("d", .08), "160,255,195": ("a", .6),
       "124,245,164": ("a", .45), "200,255,220": ("a", .75), "10,40,20": ("d", .85), "255,79,139": ("x", 0)}
EMBER = "linear-gradient(180deg, #ffffff 0%, #dcffe8 22%, #5df08f 48%, #1ed760 68%, #0c8a3d 100%)"
WALL2 = "rgba(30,215,96,0.55) 0%, rgba(30,215,96,0.12) 50%, rgba(30,215,96,0) 75%"

def color(role, f, acc, alt):
    return mix(acc, f, W) if role == "a" else mix(acc, f, K) if role == "d" else mix(alt, f, W)

def wall(c): return "rgba(%d,%d,%d,0.55) 0%%, rgba(%d,%d,%d,0.12) 50%%, rgba(%d,%d,%d,0) 75%%" % (c * 3)

d, acc, alt = sys.argv[1], hx(sys.argv[2]), hx(sys.argv[3])
ember = sys.argv[4] if len(sys.argv) > 4 and sys.argv[4] else None
wall2 = hx(sys.argv[5]) if len(sys.argv) > 5 and sys.argv[5] else None
pairs = []  # (old, new) literal replacements
if ember: pairs.append((EMBER, ember))
if wall2: pairs.append((WALL2, wall(wall2)))
for k, (r, f) in HEX.items(): pairs.append((k, h(color(r, f, acc, alt))))
for k, (r, f) in RGB.items(): pairs.append(("rgba(" + k + ",", "rgba(%d,%d,%d," % color(r, f, acc, alt)))
if os.environ.get("SRC_ACCENT"):
    sa, sx = hx(os.environ["SRC_ACCENT"]), hx(os.environ.get("SRC_ALT", "#ff4f8b"))
    if os.environ.get("SRC_EMBER") and ember: pairs.append((os.environ["SRC_EMBER"], ember))
    if os.environ.get("SRC_WALL2") and wall2: pairs.append((wall(hx(os.environ["SRC_WALL2"])), wall(wall2)))
    for k, (r, f) in HEX.items(): pairs.append((h(color(r, f, sa, sx)), h(color(r, f, acc, alt))))
    for k, (r, f) in RGB.items(): pairs.append(("rgba(%d,%d,%d," % color(r, f, sa, sx), "rgba(%d,%d,%d," % color(r, f, acc, alt)))
files = [os.path.join(d, "index.html"), os.path.join(d, "assets", "ttk.js")] + glob.glob(os.path.join(d, "compositions", "*.html"))
for fn in files:
    s = open(fn, encoding="utf-8").read(); o = s
    low = s.lower()
    for a, b in pairs:  # case-insensitive literal replace
        i = 0; out = []; la = a.lower()
        while True:
            j = low.find(la, i)
            if j < 0: out.append(s[i:]); break
            out.append(s[i:j]); out.append(b); i = j + len(a)
        s = "".join(out); low = s.lower()
    if s != o: open(fn, "w", encoding="utf-8").write(s); print("themed", os.path.relpath(fn, d))
