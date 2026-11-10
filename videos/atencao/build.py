"""Build the three attention videos (balloon, glass of water, fuse) from the shared base.
Usage: python3 build.py <out_dir> [theme ...]"""
import json, os, shutil, sys

HERE = os.path.dirname(os.path.abspath(__file__))
# Archivo Black advance widths at 100 px (measured in Chromium)
W100 = {"VOCÊ": 308, "FICOU": 350, "VENDO": 394, "ESPERANDO": 689, "UM BALÃO": 593, "UM COPO": 528, "UM PAVIO": 547,
        "ESTOURAR.": 646, "ENCHER.": 500, "QUEIMAR.": 561, "AINDA": 351, "AQUI.": 315, "ISSO": 267, "É": 72,
        "ATENÇÃO.": 568, "QUE": 239, "IMPULSIONA": 710, "VENDAS": 457}

THEMES = {
    "balao": dict(name="balão", acc="#9B4DFF", deep="#5A1BC2", light="#CDA8FF", text="#7A2FF0",
                  verb="ESPERANDO", obj="UM BALÃO", act="ESTOURAR."),
    "copo": dict(name="copo d'água", acc="#2F7BFF", deep="#123FA8", light="#9CC2FF", text="#1F63E6",
                 verb="VENDO", obj="UM COPO", act="ENCHER."),
    "pavio": dict(name="pavio", acc="#FF7A1A", deep="#B84700", light="#FFC08A", text="#E85F00",
                  verb="VENDO", obj="UM PAVIO", act="QUEIMAR."),
}

def rgb(h): h = h.lstrip("#"); return ",".join(str(int(h[i:i + 2], 16)) for i in (0, 2, 4))
def mix(h, to, t):
    a = [int(h.lstrip("#")[i:i + 2], 16) for i in (0, 2, 4)]; b = [int(to.lstrip("#")[i:i + 2], 16) for i in (0, 2, 4)]
    return "#%02x%02x%02x" % tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))

def size(word, cap=200, box=930):
    return min(cap, int(box * 100 / W100[word]))

def words_html(th):
    """one beat per clip; times are local to the words scene (starts at 8.6 s)"""
    B = 8.6
    beats = [  # (abs start, abs end, bg, colour class, text, anim, cap)
        (8.60, 8.95, "acc", "ink", "VOCÊ", "pop", 210),
        (8.95, 9.35, "cream", "acc", "FICOU", "whip", 210),
        (9.35, 10.15, "none", "white", "#SEC", "num", 0),
        (10.15, 10.55, "acc", "ink", th["verb"], "pop", 200),
        (10.55, 10.95, "cream", "acc", th["obj"], "whip", 200),
        (10.95, 11.55, "none", "white", th["act"], "pop", 200),
        (11.55, 11.95, "acc", "ink", "AINDA", "pop", 210),
        (11.95, 12.65, "cream", "acc", "AQUI.", "aqui", 230),
        (12.65, 13.20, "none", "white", "#TIMER", "timer", 0),
        (13.20, 13.50, "acc", "ink", "ISSO", "pop", 220),
        (13.50, 13.75, "cream", "acc", "É", "pop", 420),
        (13.75, 14.55, "none", "white", "ATENÇÃO.", "att", 200),
        (14.55, 15.00, "acc", "ink", "ISSO", "pop", 220),
        (15.00, 15.30, "cream", "acc", "QUE", "whip", 230),
        (15.30, 16.05, "none", "white", "IMPULSIONA", "imp", 200),
        (16.05, 16.95, "acc", "ink", "VENDAS", "up", 210),
    ]
    divs, js = [], []
    for i, (a, b, bg, col, text, anim, cap) in enumerate(beats):
        s, d, wid = round(a - B, 3), round(b - a, 3), "wd-%d" % i
        if text == "#SEC":
            inner = ('<div class="wd-num"><span id="wd-n7" class="wn">7</span><span id="wd-n8" class="wn">8</span></div>'
                     '<div class="wd-sec">SEGUNDOS</div>')
        elif text == "#TIMER":
            inner = ('<div class="wd-tl"><span class="wd-tdot"></span>VOCÊ ESTÁ AQUI HÁ</div>'
                     '<div class="wd-tbox"><span id="wd-t12" class="wd-tn">00:12</span><span id="wd-t13" class="wd-tn">00:13</span></div>')
        else:
            fs = size(text, cap)
            body = text
            if text.endswith("."):
                body = text[:-1] + '<span class="dot">.</span>'
            inner = '<div id="%s-t" class="wt c-%s" style="font-size:%dpx">%s</div>' % (wid, col, fs, body)
            if anim == "att":
                inner = ('<div class="wd-att"><div id="%s-t" class="wt c-%s glow" style="font-size:%dpx">%s</div>'
                         '<div id="wd-ul" style="width:%dpx"></div></div>') % (wid, col, fs, body, int(W100[text] * fs / 100 * 0.93))
            if anim == "up":
                inner = ('<div class="wd-upbox"><svg id="wd-arrow" viewBox="0 0 120 130"><path d="M60,4 L114,62 L80,62 L80,126 L40,126 '
                         'L40,62 L6,62 Z" fill="#0b0b0c"/></svg>' + inner + '</div>')
        divs.append('      <div id="%s" class="wd clip bg-%s" data-start="%s" data-duration="%s">%s</div>' % (wid, bg, s, d, inner))
        sel = "#%s-t" % wid
        if anim in ("pop", "aqui", "att", "imp", "up"):
            js.append('pop("%s", %s, %s);' % (sel, s, d))
        if anim == "whip":
            js.append('whip("%s", %s, %s);' % (sel, s, d))
        if anim == "aqui":
            js.append('tl.fromTo("%s", { scale: 1.04 }, { scale: 2.6, opacity: 0, filter: "blur(16px)", duration: 0.13, ease: "power3.in", immediateRender: false }, %s);' % (sel, round(s + d - 0.13, 3)))
        if anim == "att":
            js.append('tl.fromTo("#wd-ul", { scaleX: 0 }, { scaleX: 1, duration: 0.3, ease: "power3.out", immediateRender: false }, %s);' % round(s + 0.12, 3))
        if anim == "imp":
            js.append('tl.fromTo("%s", { rotation: 0, scale: 1.04, opacity: 1, filter: "blur(0px)" }, { rotation: -24, scale: 1.7, opacity: 0, filter: "blur(16px)", duration: 0.18, ease: "power3.in", immediateRender: false }, %s);' % (sel, round(s + d - 0.18, 3)))
        if anim == "up":
            js.append('tl.fromTo("#wd-arrow", { y: 120, opacity: 0 }, { y: 0, opacity: 1, duration: 0.3, ease: "back.out(2.4)", immediateRender: false }, %s);' % round(s + 0.08, 3))
            js.append('tl.fromTo("#wd-arrow", { y: 0 }, { y: -18, duration: 0.22, ease: "sine.inOut", yoyo: true, repeat: 1, immediateRender: false }, %s);' % round(s + 0.4, 3))
        if anim == "num":
            js.append('numIn("#wd-n7", %s, 0.18); tl.fromTo("#wd-n7", { opacity: 1 }, { opacity: 0, duration: 0.001, immediateRender: false }, %s);'
                      ' numIn("#wd-n8", %s); tl.fromTo(".wd-sec", { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.25, ease: "power2.out", immediateRender: false }, %s);'
                      ' tl.fromTo(".wd-num", { scale: 1 }, { scale: 1.06, duration: 0.6, ease: "sine.out", immediateRender: false }, %s);'
                      % (s, round(s + 0.22, 3), round(s + 0.22, 3), round(s + 0.25, 3), round(s + 0.22, 3)))
        if anim == "timer":
            js.append('tl.fromTo(".wd-tl", { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.2, ease: "power2.out", immediateRender: false }, %s);' % s)
            js.append('tl.fromTo("#wd-t12", { opacity: 0, scale: 0.6, filter: "blur(14px)" }, { opacity: 1, scale: 1, filter: "blur(0px)", duration: 0.16, ease: "power3.out", immediateRender: false }, %s);' % s)
            flip = round(13.0 - B, 3)
            js.append('tl.fromTo("#wd-t12", { opacity: 1 }, { opacity: 0, duration: 0.001, immediateRender: false }, %s);' % flip)
            js.append('tl.fromTo("#wd-t13", { opacity: 0, y: -26 }, { opacity: 1, y: 0, duration: 0.12, ease: "power3.out", immediateRender: false }, %s);' % flip)
    with open(os.path.join(HERE, "base", "words.tpl.html"), encoding="utf-8") as f:
        tpl = f.read()
    return tpl.replace("{{DIVS}}", "\n".join(divs)).replace("{{JS}}", "\n      ".join(js))

def build(out, key):
    th = THEMES[key]
    rep = {"{{ACC}}": th["acc"], "{{ACC_DEEP}}": th["deep"], "{{ACC_LIGHT}}": th["light"], "{{ACC_TEXT}}": th["text"],
           "{{ACC_RGB}}": rgb(th["acc"]), "{{ACC_BRIGHT}}": mix(th["acc"], "#ffffff", 0.14), "{{THEME}}": key,
           "{{THEME_NAME}}": th["name"],
           "{{REC_SPANS}}": "\n".join('      <span id="rc-%d" class="rc-t clip" data-start="%d" data-duration="%s">00:%02d</span>'
                                      % (s, s, "0.85" if s == 19 else "1", s) for s in range(20))}
    d = os.path.join(out, key)
    shutil.rmtree(d, ignore_errors=True)
    os.makedirs(os.path.join(d, "compositions"))
    os.makedirs(os.path.join(d, "assets", "vendor"))
    shutil.copy(os.path.join(out, "gsap.min.js"), os.path.join(d, "assets", "vendor", "gsap.min.js"))
    for extra in ("hyperframes.json", "package.json"):
        shutil.copy(os.path.join(HERE, "base", extra), os.path.join(d, extra))
    json.dump({"id": "atencao-" + key, "name": "atencao-" + key}, open(os.path.join(d, "meta.json"), "w"))
    files = {"index.html": os.path.join(HERE, "base", "index.html"),
             "compositions/hook.html": os.path.join(HERE, "hooks", key + ".html")}
    for n in ("ambient", "rec", "chart", "cta", "grain"):
        files["compositions/%s.html" % n] = os.path.join(HERE, "base", "compositions", n + ".html")
    texts = {k: open(v, encoding="utf-8").read() for k, v in files.items()}
    texts["compositions/words.html"] = words_html(th)
    for k, s in texts.items():
        for a, b in rep.items():
            s = s.replace(a, b)
        assert "{{" not in s, (key, k, s[s.index("{{"):s.index("{{") + 40])
        open(os.path.join(d, k), "w", encoding="utf-8").write(s)
    print("built", d)

if __name__ == "__main__":
    out = sys.argv[1]
    for key in (sys.argv[2:] or list(THEMES)):
        build(out, key)
