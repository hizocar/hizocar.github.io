/* day1-visuals.js — entrance for the Day 1 visuals (day1.css).
   Each [data-d1] block reveals its .d1-a / .d1-grow children in order when it enters the viewport.
   Reduced motion or no IntersectionObserver: everything is shown at once (the CSS only hides under html.d1-js). */
(function () {
  "use strict";
  const blocks = document.querySelectorAll("[data-d1]");
  if (!blocks.length) return;
  blocks.forEach((b) => {
    b.querySelectorAll(".d1-a").forEach((el, i) => el.style.setProperty("--i", String(i)));
    b.querySelectorAll(".d1-grow").forEach((el, i) => el.style.setProperty("--i", String(i)));
    b.querySelectorAll(".d1-f").forEach((el, i) => el.style.setProperty("--i", String(i)));
  });
  const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce || !("IntersectionObserver" in window)) {
    blocks.forEach((b) => b.classList.add("is-in"));
    return;
  }
  document.documentElement.classList.add("d1-js");
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); }
    });
  }, { threshold: 0, rootMargin: "0px 0px -12% 0px" });
  blocks.forEach((b) => {
    const r = b.getBoundingClientRect();
    if (r.top < window.innerHeight * 0.88 && r.bottom > 0) b.classList.add("is-in");
    else io.observe(b);
  });
})();
