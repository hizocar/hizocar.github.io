(function () {
  "use strict";

  var M = window.Motion;
  var root = document.documentElement;
  var motionOn = !!M && root.classList.contains("hz-motion");
  var ease = [0.22, 1, 0.36, 1];
  if (!M) root.classList.remove("hz-motion");
  window.__hzReady = true;

  function tween(opts, onUpdate) {
    return M.animate(0, 1, Object.assign({ ease: ease, onUpdate: onUpdate }, opts));
  }

  // ---------- Regression plot ----------
  var W = 480, H = 360, PAD = 28, N = 32, R = 4.5;
  var SVGNS = "http://www.w3.org/2000/svg";
  var plot = document.querySelector(".hz-plot");

  function sx(x) { return PAD + x * (W - 2 * PAD); }
  function sy(y) { return H - PAD - y * (H - 2 * PAD); }

  function makeRng(seed) {
    var s = seed % 2147483647;
    if (s <= 0) s += 2147483646;
    return function () { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
  }

  function gauss(r) {
    var u = 0;
    while (!u) u = r();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * r());
  }

  function sample(seed) {
    var r = makeRng(seed);
    var slope = 0.35 + r() * 0.5;
    var icpt = 0.5 - slope * 0.5 + (r() - 0.5) * 0.12;
    var pts = [];
    for (var i = 0; i < N; i++) {
      var x = 0.04 + r() * 0.92;
      var y = icpt + slope * x + gauss(r) * 0.08;
      pts.push({ x: x, y: Math.min(0.97, Math.max(0.03, y)) });
    }
    return pts;
  }

  // Ordinary least squares: b1 = Sxy / Sxx, b0 = ȳ - b1·x̄, R² = Sxy² / (Sxx·Syy)
  function fit(pts) {
    var mx = 0, my = 0, sxy = 0, sxx = 0, syy = 0;
    pts.forEach(function (p) { mx += p.x; my += p.y; });
    mx /= pts.length; my /= pts.length;
    pts.forEach(function (p) {
      sxy += (p.x - mx) * (p.y - my);
      sxx += (p.x - mx) * (p.x - mx);
      syy += (p.y - my) * (p.y - my);
    });
    var b1 = sxy / sxx;
    return { b0: my - b1 * mx, b1: b1, r2: (sxy * sxy) / (sxx * syy) };
  }

  if (plot) {
    var svg = plot.querySelector("svg");
    var gGrid = svg.querySelector(".grid");
    var gRes = svg.querySelector(".resids");
    var gPts = svg.querySelector(".pts");
    var line = svg.querySelector(".fitline");
    var statB1 = plot.querySelector('[data-stat="b1"]');
    var statR2 = plot.querySelector('[data-stat="r2"]');

    for (var g = 0; g <= 4; g++) {
      var gl = document.createElementNS(SVGNS, "line");
      var gy = sy(g / 4);
      gl.setAttribute("x1", PAD); gl.setAttribute("x2", W - PAD);
      gl.setAttribute("y1", gy); gl.setAttribute("y2", gy);
      gGrid.appendChild(gl);
    }

    var seed = 2125;
    var current = sample(seed);
    var circles = [], resids = [];
    current.forEach(function () {
      var c = document.createElementNS(SVGNS, "circle");
      c.setAttribute("class", "pt");
      c.setAttribute("r", motionOn ? 0 : R);
      gPts.appendChild(c);
      circles.push(c);
      var l = document.createElementNS(SVGNS, "line");
      l.setAttribute("class", "resid");
      gRes.appendChild(l);
      resids.push(l);
    });

    var draw = function (pts) {
      var f = fit(pts);
      pts.forEach(function (p, i) {
        var cx = sx(p.x), cy = sy(p.y);
        circles[i].setAttribute("cx", cx);
        circles[i].setAttribute("cy", cy);
        resids[i].setAttribute("x1", cx); resids[i].setAttribute("x2", cx);
        resids[i].setAttribute("y1", cy); resids[i].setAttribute("y2", sy(f.b0 + f.b1 * p.x));
      });
      line.setAttribute("d", "M" + sx(0) + " " + sy(f.b0) + "L" + sx(1) + " " + sy(f.b0 + f.b1));
      statB1.textContent = f.b1.toFixed(2);
      statR2.textContent = f.r2.toFixed(2);
    };
    draw(current);

    if (motionOn) {
      line.style.strokeDasharray = "1";
      line.style.strokeDashoffset = "1";
      gRes.style.opacity = "0";
      circles.forEach(function (c, i) {
        M.animate(0, 1, {
          type: "spring", stiffness: 420, damping: 18, delay: 0.5 + i * 0.028,
          onUpdate: function (v) { c.setAttribute("r", Math.max(0, v) * R); }
        });
      });
      tween({ duration: 1.1, delay: 1.45 }, function (v) { line.style.strokeDashoffset = 1 - v; });
      tween({ duration: 0.6, delay: 2.3 }, function (v) { gRes.style.opacity = v; });
    }

    var running = null;
    plot.addEventListener("click", function () {
      var from = current.map(function (p) { return { x: p.x, y: p.y }; });
      var to = sample(++seed * 7919);
      if (running) running.stop();
      line.style.strokeDashoffset = "0";
      gRes.style.opacity = "1";
      if (!motionOn) { current = to; draw(current); return; }
      var spread = 0.35;
      running = tween({ duration: 1.1 }, function (v) {
        current = from.map(function (a, i) {
          var t = Math.min(1, Math.max(0, (v - (i / N) * spread) / (1 - spread)));
          t = 1 - Math.pow(1 - t, 3);
          return { x: a.x + (to[i].x - a.x) * t, y: a.y + (to[i].y - a.y) * t };
        });
        draw(current);
      });
    });
  }

  // ---------- Copy email ----------
  var copy = document.querySelector("[data-copy]");
  if (copy) {
    var label = copy.querySelector("span");
    copy.addEventListener("click", function () {
      var done = function (text) {
        label.textContent = text;
        copy.classList.add("is-done");
        setTimeout(function () { label.textContent = "Copiar"; copy.classList.remove("is-done"); }, 1800);
      };
      if (navigator.clipboard) {
        navigator.clipboard.writeText(copy.dataset.copy).then(
          function () { done("Copiado"); },
          function () { done("No se pudo copiar"); }
        );
      } else {
        done("No se pudo copiar");
      }
    });
  }

  if (!motionOn) return;

  try {
    var target = function (a) { return a.target || a; };

    // Hero name: each word rises out of its own mask
    M.animate(".hz-name .w > span",
      { transform: ["translateY(105%)", "translateY(0%)"] },
      { duration: 1.05, ease: ease, delay: M.stagger(0.1, { startDelay: 0.1 }) });

    M.inView("[data-reveal]", function (info) {
      var el = target(info);
      M.animate(el,
        { opacity: [0, 1], transform: ["translateY(24px)", "translateY(0px)"] },
        { duration: 0.9, ease: ease, delay: parseFloat(el.dataset.delay || 0) });
    }, { margin: "0px 0px -8% 0px" });

    M.inView("[data-stagger]", function (info) {
      var kids = Array.prototype.slice.call(target(info).children);
      M.animate(kids,
        { opacity: [0, 1], transform: ["translateY(18px)", "translateY(0px)"] },
        { duration: 0.8, ease: ease, delay: M.stagger(0.07) });
    }, { margin: "0px 0px -8% 0px" });

    M.inView(".hz-count", function (info) {
      var el = target(info);
      var to = parseInt(el.dataset.to, 10);
      M.animate(0, to, {
        duration: 1.6, ease: ease, delay: 0.2,
        onUpdate: function (v) { el.textContent = Math.round(v); }
      });
    });

    var portrait = document.querySelector(".hz-portrait");
    if (portrait) {
      M.inView(portrait, function () {
        M.animate(portrait.querySelector("img"),
          { transform: ["rotate(-8deg) scale(0.94)", "rotate(0deg) scale(1)"] },
          { duration: 1.2, ease: ease });
        M.animate(portrait.querySelector(".hz-portrait-disc"),
          { transform: ["translate(0%, 0%)", "translate(6%, 5%)"] },
          { duration: 1.3, ease: ease, delay: 0.15 });
      });
    }

    // Timeline rail fills as you scroll through it
    var timeline = document.querySelector(".hz-timeline");
    if (timeline) {
      M.scroll(
        M.animate(".hz-rail-fill", { transform: ["scaleY(0)", "scaleY(1)"] }, { ease: "linear" }),
        { target: timeline, offset: ["start 75%", "end 55%"] }
      );
    }
  } catch (err) {
    root.classList.remove("hz-motion");
  }
})();
