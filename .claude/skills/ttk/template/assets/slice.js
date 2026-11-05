/* ttk slice: the neon line really cuts the words.
   1) ttkSlice.prepare("#wrap") BEFORE authoring any tween: clones the full-frame wrapper (same inner ids, so every
      selector tween drives both copies identically). The copy stays hidden until the cut.
   2) ttkSlice.cut(tl, {...}) after the tweens: sweeps the line along the cut, then at `at` clips the two copies into
      complementary half-planes along that exact line and pushes them apart (slide along the line + gap), then flies them off. */
(function () {
  var L = 5000;
  function rad(d) { return d * Math.PI / 180; }
  function poly(c, d, n, s) {
    var p = [
      [c[0] - d[0] * L, c[1] - d[1] * L], [c[0] + d[0] * L, c[1] + d[1] * L],
      [c[0] + d[0] * L + s * n[0] * L, c[1] + d[1] * L + s * n[1] * L], [c[0] - d[0] * L + s * n[0] * L, c[1] - d[1] * L + s * n[1] * L]
    ];
    return "polygon(" + p.map(function (q) { return q[0].toFixed(1) + "px " + q[1].toFixed(1) + "px"; }).join(",") + ")";
  }
  window.ttkSlice = {
    prepare: function (sel) {
      var a = document.querySelector(sel);
      var b = a.cloneNode(true); b.id = a.id + "-b"; b.style.opacity = "0";
      a.parentNode.insertBefore(b, a.nextSibling);
      return b;
    },
    // o: { el, cx, cy, deg, at, line, sweep=0.18, gap=18, slide=60, flyAt, flyDur=0.32, fly=520 }
    cut: function (tl, o) {
      var a = document.querySelector(o.el), b = document.getElementById(a.id + "-b");
      var t = rad(o.deg), d = [Math.cos(t), Math.sin(t)], n = [-Math.sin(t), Math.cos(t)], c = [o.cx, o.cy];
      var sweep = o.sweep || 0.18, gap = o.gap || 28, slide = o.slide || 60, fly = o.fly || 520, flyDur = o.flyDur || 0.32;
      var flyAt = o.flyAt != null ? o.flyAt : o.at + 0.22;
      if (o.line) {
        var ln = document.querySelector(o.line), half = 1300;
        ln.style.left = (o.cx - d[0] * half) + "px"; ln.style.top = (o.cy - d[1] * half - 5) + "px";
        ln.style.width = (half * 2) + "px"; ln.style.transformOrigin = "0 50%";
        tl.fromTo(ln, { rotation: o.deg, scaleX: 0, opacity: 1 }, { rotation: o.deg, scaleX: 1, duration: sweep, ease: "power2.in" }, o.at - sweep);
        tl.to(ln, { opacity: 0, duration: 0.2, ease: "power2.out" }, o.at + 0.08);
      }
      tl.set(a, { clipPath: poly(c, d, n, -1) }, o.at);
      tl.set(b, { opacity: 1, clipPath: poly(c, d, n, 1) }, o.at);
      // the cut opens: halves slip along the blade and part slightly
      tl.fromTo(a, { x: 0, y: 0 }, { x: d[0] * slide - n[0] * gap, y: d[1] * slide - n[1] * gap, duration: 0.14, ease: "power3.out", immediateRender: false }, o.at);
      tl.fromTo(b, { x: 0, y: 0 }, { x: -d[0] * slide + n[0] * gap, y: -d[1] * slide + n[1] * gap, duration: 0.14, ease: "power3.out", immediateRender: false }, o.at);
      // then they fly off in opposite directions
      tl.to(a, { x: d[0] * fly - n[0] * fly * 0.35, y: d[1] * fly - n[1] * fly * 0.35, rotation: -4, opacity: 0, duration: flyDur, ease: "power3.in" }, flyAt);
      tl.to(b, { x: -d[0] * fly + n[0] * fly * 0.35, y: -d[1] * fly + n[1] * fly * 0.35, rotation: 4, opacity: 0, duration: flyDur, ease: "power3.in" }, flyAt);
    }
  };
})();
