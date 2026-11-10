/* ttk.js — shared motion kit for the "screen-on-a-desk" ttk look.
   Everything is deterministic (seeded), built before tweens are authored, and driven only by the paused timeline.
   Screen space = 1920x1080 inside .tk-scr (scaled onto the monitor). */
(function () {
  var TTK = {};
  TTK.mulberry32 = function (a) {
    return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  };
  function el(parent, cls, id) { var e = document.createElement("div"); e.className = cls; if (id) e.id = id; parent.appendChild(e); return e; }
  function ang(x0, y0, x1, y1) { return Math.atan2(y1 - y0, x1 - x0) * 180 / Math.PI; }

  /* ---------- handheld camera: one function of global time ---------- */
  TTK.camAt = function (t, kicks) {
    var x = 4.5 * Math.sin(1.31 * t + 0.4) + 2.5 * Math.sin(2.73 * t + 1.7) + 1.1 * Math.sin(5.1 * t + 0.9);
    var y = 3.5 * Math.sin(1.07 * t + 2.1) + 2.0 * Math.sin(3.21 * t + 0.3) + 0.9 * Math.sin(6.3 * t + 2.2);
    var r = 0.28 * Math.sin(0.83 * t + 1.0) + 0.12 * Math.sin(2.17 * t + 0.5);
    var s = 1 + 0.04 * (t / 16);
    (kicks || []).forEach(function (k) { if (t >= k[0]) { var e = Math.exp(-(t - k[0]) / 0.16); s += k[1] * e; y += k[1] * 120 * e * Math.sin((t - k[0]) * 40); } });
    return { x: x, y: y, rotation: r, scale: s };
  };
  TTK.camera = function (tl, target, dur, kicks, fps) {
    var step = 1 / (fps || 20), first = TTK.camAt(0, kicks);
    tl.set(target, { x: first.x, y: first.y, rotation: first.rotation, scale: first.scale, transformOrigin: "540px 840px" }, 0);
    for (var t = step; t <= dur + 1e-6; t += step) {
      var v = TTK.camAt(t, kicks);
      tl.to(target, { x: v.x, y: v.y, rotation: v.rotation, scale: v.scale, duration: step, ease: "none" }, t - step);
    }
  };

  /* ---------- spark: glowing ember head + motion tail ---------- */
  TTK.spark = function (parent, id, size) {
    var s = el(parent, "tk-sp", id);
    el(s, "tk-sp-tail"); var h = el(s, "tk-sp-head");
    if (size) { h.style.width = h.style.height = size + "px"; h.style.margin = (-size / 2) + "px 0 0 " + (-size / 2) + "px"; }
    return s;
  };
  // pts: [[x,y],...]; durs: seconds per segment; opts: {at, ease, draw (parent for drawn lines), hold, lineCls}
  TTK.fly = function (tl, sp, pts, durs, opts) {
    var t = opts.at, tail = sp.querySelector(".tk-sp-tail"), lines = [];
    tl.set(sp, { x: pts[0][0], y: pts[0][1], rotation: ang(pts[0][0], pts[0][1], pts[1][0], pts[1][1]) }, t);
    tl.set(sp, { opacity: 1 }, t);
    for (var i = 0; i < pts.length - 1; i++) {
      var a = pts[i], b = pts[i + 1], d = Array.isArray(durs) ? durs[i] : durs, e = opts.ease || "power2.inOut";
      var r = ang(a[0], a[1], b[0], b[1]);
      tl.set(sp, { rotation: r }, t);
      tl.fromTo(sp, { x: a[0], y: a[1] }, { x: b[0], y: b[1], duration: d, ease: e, immediateRender: false }, t);
      tl.fromTo(tail, { scaleX: 0.15 }, { scaleX: 1, duration: d * 0.35, ease: "power2.out", immediateRender: false }, t);
      tl.to(tail, { scaleX: 0.15, duration: d * 0.4, ease: "power2.in" }, t + d * 0.6);
      if (opts.draw) lines.push(TTK.drawLine(tl, opts.draw, a, b, t, d, e, opts.lineCls));
      t += d;
    }
    if (opts.fadeOut != null) tl.to(sp, { opacity: 0, duration: 0.15 }, opts.fadeOut);
    return { end: t, lines: lines };
  };
  TTK.drawLine = function (tl, parent, a, b, t, d, ease, cls) {
    var L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    var ln = el(parent, "tk-line " + (cls || ""));
    ln.style.left = a[0] + "px"; ln.style.top = (a[1] - 2) + "px"; ln.style.width = L + "px";
    tl.fromTo(ln, { rotation: ang(a[0], a[1], b[0], b[1]), scaleX: 0 }, { rotation: ang(a[0], a[1], b[0], b[1]), scaleX: 1, duration: d, ease: ease || "power2.inOut" }, t);
    return ln;
  };
  // particle burst
  TTK.burst = function (tl, parent, x, y, at, n, radius, seed, cls) {
    var rnd = TTK.mulberry32(seed || 7);
    for (var i = 0; i < n; i++) {
      var p = el(parent, "tk-pt " + (cls || ""));
      var a = rnd() * Math.PI * 2, r = radius * (0.35 + 0.65 * rnd()), d = 0.35 + 0.45 * rnd(), s = 0.5 + rnd() * 1.2;
      p.style.width = p.style.height = (6 + rnd() * 8) + "px";
      tl.fromTo(p, { x: x, y: y, opacity: 1, scale: s }, { x: x + Math.cos(a) * r, y: y + Math.sin(a) * r + 30 * rnd(), opacity: 0, scale: 0.2, duration: d, ease: "power3.out", immediateRender: false }, at);
    }
  };
  // reveal text left->right with the spark riding the edge. box = [x0, x1, y]
  TTK.write = function (tl, target, sp, box, at, d, ease) {
    tl.fromTo(target, { clipPath: "inset(-30% 100% -30% -5%)" }, { clipPath: "inset(-30% -5% -30% -5%)", duration: d, ease: ease || "power1.inOut" }, at);
    if (sp) {
      tl.set(sp, { rotation: 0, opacity: 1 }, at);
      tl.fromTo(sp, { x: box[0], y: box[2] }, { x: box[1], y: box[2], duration: d, ease: ease || "power1.inOut", immediateRender: false }, at);
      var tail = sp.querySelector(".tk-sp-tail");
      tl.fromTo(tail, { scaleX: 0.15 }, { scaleX: 0.8, duration: d * 0.3, immediateRender: false }, at);
    }
  };
  // letters pop one by one: returns spans
  TTK.letters = function (container, text) {
    container.textContent = ""; var out = [];
    for (var i = 0; i < text.length; i++) { var s = document.createElement("span"); s.className = "tk-ch"; s.textContent = text[i] === " " ? " " : text[i]; container.appendChild(s); out.push(s); }
    return out;
  };

  /* ---------- slice: the line really cuts what it crosses ---------- */
  var L = 6000;
  function poly(c, d, n, s) {
    var p = [[c[0] - d[0] * L, c[1] - d[1] * L], [c[0] + d[0] * L, c[1] + d[1] * L],
      [c[0] + d[0] * L + s * n[0] * L, c[1] + d[1] * L + s * n[1] * L], [c[0] - d[0] * L + s * n[0] * L, c[1] - d[1] * L + s * n[1] * L]];
    return "polygon(" + p.map(function (q) { return q[0].toFixed(1) + "px " + q[1].toFixed(1) + "px"; }).join(",") + ")";
  }
  TTK.slicePrepare = function (sel) {
    var a = document.querySelector(sel), b = a.cloneNode(true); b.id = a.id + "-b"; b.style.opacity = "0";
    a.parentNode.insertBefore(b, a.nextSibling); return b;
  };
  // o: {el, cx, cy, deg, at, gap, slide, flyAt, flyDur, fly, fall}
  TTK.slice = function (tl, o) {
    var a = document.querySelector(o.el), b = document.getElementById(a.id + "-b");
    var t = o.deg * Math.PI / 180, d = [Math.cos(t), Math.sin(t)], n = [-Math.sin(t), Math.cos(t)], c = [o.cx, o.cy];
    var gap = o.gap || 26, slide = o.slide || 70, fly = o.fly || 700, flyDur = o.flyDur || 0.4, flyAt = o.flyAt != null ? o.flyAt : o.at + 0.25;
    tl.set(a, { clipPath: poly(c, d, n, -1) }, o.at);
    tl.set(b, { opacity: 1, clipPath: poly(c, d, n, 1) }, o.at);
    tl.fromTo(a, { x: 0, y: 0 }, { x: d[0] * slide - n[0] * gap, y: d[1] * slide - n[1] * gap, duration: 0.16, ease: "power3.out", immediateRender: false }, o.at);
    tl.fromTo(b, { x: 0, y: 0 }, { x: -d[0] * slide + n[0] * gap, y: -d[1] * slide + n[1] * gap, duration: 0.16, ease: "power3.out", immediateRender: false }, o.at);
    if (o.rejoin) {
      tl.to([a, b], { x: 0, y: 0, duration: flyDur, ease: "power3.inOut" }, flyAt);
      return;
    }
    var fall = o.fall || 0;
    tl.to(a, { x: d[0] * fly - n[0] * fly * 0.3, y: d[1] * fly - n[1] * fly * 0.3 - fall, rotation: -5, opacity: 0, duration: flyDur, ease: "power3.in" }, flyAt);
    tl.to(b, { x: -d[0] * fly + n[0] * fly * 0.3, y: -d[1] * fly + n[1] * fly * 0.3 + fall, rotation: 5, opacity: 0, duration: flyDur, ease: "power3.in" }, flyAt);
  };

  /* ---------- karaoke words: current word in a highlight box ---------- */
  TTK.karaoke = function (tl, container, words, t0, t1, hold) {
    container.innerHTML = ""; var spans = [];
    words.forEach(function (w, i) { var s = document.createElement("span"); s.className = "tk-kw"; s.textContent = w; container.appendChild(s);
      if (i < words.length - 1) container.appendChild(document.createTextNode(" ")); spans.push(s); });
    var step = (t1 - t0) / words.length;
    spans.forEach(function (s, i) {
      var t = t0 + i * step;
      tl.fromTo(s, { opacity: 0 }, { opacity: 1, duration: 0.05 }, t);
      tl.to(s, { backgroundColor: "rgba(169,112,255,1)", color: "#050505", duration: 0.04 }, t);
      if (i < spans.length - 1 || !hold) tl.to(s, { backgroundColor: "rgba(169,112,255,0)", color: "#f2f2f2", duration: 0.06 }, t + step);
    });
    return spans;
  };
  window.TTK = TTK;
})();
