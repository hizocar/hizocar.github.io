/* ==========================================================================
   vc-core.js — Vibe Coding for Business Leaders (MBA USM)
   Exposes window.VC with:
     · h / svg                 → create HTML / SVG elements
     · motion                  → Motion (motion.dev) helpers. Course motion identity:
                                  signature easing ease-out-back (~12% overshoot) for entrances,
                                  ease-out for state changes; durations quick 0.16 s · std 0.28 s · slow 0.45 s;
                                  entrance pattern: rise 14 px + fade, once, when in view.
                                  Respects prefers-reduced-motion.
     · panel / controls / slider / select / text / btn / buttons / stat / note / typeln → UI pieces
     · register(name, fn)      → registers a widget; mounted on each
                                  <div class="vc-widget" data-widget="name"></div>
   Also mounts quizzes (.vc-quiz), practice sets (.vc-practice) and checklists (.vc-checklist).
   ========================================================================== */
(function () {
  "use strict";
  const NS = "http://www.w3.org/2000/svg";
  const WIDGETS = {};

  function h(tag, attrs, ...kids) {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v == null || v === false) continue;
      if (k === "class") e.className = v;
      else if (k === "html") e.innerHTML = v;
      else if (k.startsWith("on") && typeof v === "function") e.addEventListener(k.slice(2), v);
      else if (k === "style" && typeof v === "object") Object.assign(e.style, v);
      else e.setAttribute(k, v === true ? "" : v);
    }
    kids.flat().forEach((c) => c != null && e.append(c.nodeType ? c : document.createTextNode(String(c))));
    return e;
  }
  function svg(tag, attrs, ...kids) {
    const e = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v == null || v === false) continue;
      if (k.startsWith("on") && typeof v === "function") e.addEventListener(k.slice(2), v);
      else e.setAttribute(k, v);
    }
    kids.flat().forEach((c) => c != null && e.append(c.nodeType ? c : document.createTextNode(String(c))));
    return e;
  }

  /* ---------- Motion identity ---------- */
  const EASE = { back: [0.34, 1.36, 0.64, 1], out: [0.2, 0, 0, 1], in: [0.3, 0, 1, 1] };
  const DUR = { quick: 0.16, std: 0.28, slow: 0.45 };
  const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const M = () => window.Motion;

  function anim(el, kf, opts) {
    if (!el) return Promise.resolve();
    if (!M() || reduced()) {
      const last = {};
      for (const [k, v] of Object.entries(kf)) last[k] = Array.isArray(v) ? v[v.length - 1] : v;
      if ("opacity" in last) el.style.opacity = last.opacity;
      if ("width" in last) el.style.width = typeof last.width === "number" ? last.width + "px" : last.width;
      if ("height" in last) el.style.height = typeof last.height === "number" ? last.height + "px" : last.height;
      if ("backgroundColor" in last) el.style.backgroundColor = last.backgroundColor;
      el.style.transform = "";
      return Promise.resolve();
    }
    return M().animate(el, kf, Object.assign({ duration: DUR.std, ease: EASE.out }, opts)).finished;
  }

  const motion = {
    EASE, DUR, reduced, anim,
    enter(el, delay = 0) { return anim(el, { opacity: [0, 1], y: [14, 0] }, { duration: DUR.slow, ease: EASE.back, delay }); },
    stagger(els, opts = {}) {
      els = [...els];
      if (!els.length) return Promise.resolve();
      const step = Math.min(opts.step ?? 0.05, 0.45 / els.length);
      if (!M() || reduced()) return Promise.all(els.map((e) => anim(e, opts.kf || { opacity: 1 })));
      return M().animate(els, opts.kf || { opacity: [0, 1], y: [10, 0] },
        { duration: opts.duration ?? DUR.std, ease: opts.ease || EASE.back, delay: M().stagger(step, { startDelay: opts.delay || 0 }) }).finished;
    },
    pop(el) { return anim(el, { scale: [1, 1.06, 1] }, { duration: DUR.std, ease: EASE.back }); },
    shake(el) { return anim(el, { x: [0, -8, 7, -5, 3, 0] }, { duration: 0.36, ease: "easeInOut" }); },
    pulse(el) { return anim(el, { scale: [1, 1.04, 1], opacity: [0.65, 1] }, { duration: DUR.std, ease: EASE.out }); },
    count(el, from, to, fmt = (v) => Math.round(v).toLocaleString("en-US"), duration = DUR.slow) {
      if (!M() || reduced()) { el.textContent = fmt(to); return Promise.resolve(); }
      return M().animate(from, to, { duration, ease: EASE.out, onUpdate: (v) => { el.textContent = fmt(v); } }).finished;
    },
    attr(el, name, to, opts = {}) {
      const from = parseFloat(el.getAttribute(name)) || 0;
      if (!M() || reduced()) { el.setAttribute(name, to); return Promise.resolve(); }
      return M().animate(from, to, Object.assign({ duration: DUR.std, ease: EASE.out, onUpdate: (v) => el.setAttribute(name, v) }, opts)).finished;
    },
    tween(from, to, onUpdate, opts = {}) {
      if (!M() || reduced()) { onUpdate(to); return Promise.resolve(); }
      return M().animate(from, to, Object.assign({ duration: DUR.slow, ease: EASE.out, onUpdate }, opts)).finished;
    },
    onView(el, fn) {
      if (M() && M().inView) { const stop = M().inView(el, () => { fn(); stop && stop(); }, { amount: 0.25 }); }
      else fn();
    },
    /** Types text into el, line by line (array) or char by char (string). Returns a promise. Honors reduced motion. */
    async type(el, content, { cps = 60, lineDelay = 180 } = {}) {
      const lines = Array.isArray(content) ? content : [content];
      if (reduced()) { el.innerHTML = lines.join("\n"); return; }
      el.innerHTML = "";
      const cur = h("span", { class: "cur" });
      el.append(cur);
      for (const ln of lines) {
        const span = h("span", {});
        cur.before(span);
        if (/<[a-z]+[^>]*>/.test(ln)) { span.innerHTML = ln; }
        else { for (const ch of ln) { span.textContent += ch; await sleep(1000 / cps); } }
        cur.before(document.createTextNode("\n"));
        await sleep(lineDelay);
      }
      cur.remove();
    },
  };
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  /* ---------- UI pieces ---------- */
  function panel(root, title, sub, kind) {
    root.classList.add("vc-widget");
    if (kind) root.classList.add("is-" + kind);
    if (title) root.append(h("p", { class: "vc-widget-title" }, h("span", { class: "vc-chip-k" }, "try it"), title));
    if (sub) root.append(h("p", { class: "vc-widget-sub", html: sub }));
    return root;
  }
  function controls(parent) { const c = h("div", { class: "vc-controls" }); parent.append(c); return c; }
  function slider(parent, label, { min = 0, max = 1, step = 0.01, value = 0, fmt = (v) => v }, onInput) {
    const out = h("output", {}, fmt(+value));
    const input = h("input", { type: "range", min, max, step, value, "aria-label": label });
    input.addEventListener("input", () => { out.textContent = fmt(+input.value); onInput && onInput(+input.value); });
    parent.append(h("div", { class: "vc-control" }, h("label", {}, label + " ", out), input));
    return input;
  }
  function select(parent, label, options, onChange, initial) {
    const sel = h("select", { "aria-label": label }, options.map((o) => h("option", { value: o.value, selected: o.value === initial }, o.label)));
    sel.addEventListener("change", () => onChange(sel.value));
    parent.append(h("div", { class: "vc-control" }, h("label", {}, label), sel));
    return sel;
  }
  function text(parent, label, { value = "", placeholder = "", multiline = false } = {}, onInput) {
    const input = multiline ? h("textarea", { placeholder, "aria-label": label }, value) : h("input", { type: "text", value, placeholder, "aria-label": label });
    input.addEventListener("input", () => onInput && onInput(input.value));
    parent.append(h("div", { class: "vc-control" }, h("label", {}, label), input));
    return input;
  }
  function btn(parent, label, onClick, cls = "") {
    const b = h("button", { type: "button", class: "vc-btn " + cls }, label);
    b.addEventListener("click", (ev) => { motion.anim(b, { scale: [0.96, 1] }, { duration: DUR.quick, ease: EASE.back }); onClick(ev); });
    parent.append(b);
    return b;
  }
  function buttons(parent, options, onSelect, initial) {
    const wrap = h("div", { class: "vc-buttons", role: "group" });
    const bs = options.map((o) => {
      const b = h("button", { type: "button", class: "vc-btn vc-btn-ghost", "aria-pressed": String(o.value === initial) }, o.label);
      b.addEventListener("click", () => {
        bs.forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
        motion.anim(b, { scale: [0.95, 1] }, { duration: DUR.quick, ease: EASE.back });
        onSelect(o.value);
      });
      wrap.append(b);
      return b;
    });
    parent.append(wrap);
    return wrap;
  }
  function stat(parent, label, initial = "—", cls = "") {
    const strong = h("strong", {}, initial);
    const card = h("div", { class: "vc-stat " + cls }, h("span", {}, label), strong);
    let row = parent.querySelector(":scope > .vc-stats");
    if (!row) { row = h("div", { class: "vc-stats" }); parent.append(row); }
    row.append(card);
    return (v, tone) => {
      if (tone !== undefined) { card.classList.remove("is-ok", "is-bad", "is-warn", "is-accent"); if (tone) card.classList.add("is-" + tone); }
      if (strong.textContent === String(v)) return;
      strong.textContent = v;
      motion.pulse(strong);
    };
  }
  function note(parent, html, tone) {
    const p = h("p", { class: "vc-note" + (tone ? " is-" + tone : ""), html });
    parent.append(p);
    return p;
  }
  /** Highlights flow steps in sequence: steps = [el...]; returns promise. */
  async function runFlow(steps, { every = 520 } = {}) {
    steps.forEach((s) => s.classList.remove("is-on", "is-done", "is-bad"));
    for (const s of steps) {
      s.classList.add("is-on");
      motion.pulse(s);
      await sleep(reduced() ? 0 : every);
      s.classList.remove("is-on");
      s.classList.add("is-done");
    }
  }

  /* ---------- Quizzes ---------- */
  function mountQuiz(q) {
    if (q.dataset.mounted) return;
    q.dataset.mounted = "1";
    const opts = q.querySelectorAll(".vc-quiz-opt");
    const fb = q.querySelector(".vc-quiz-fb");
    const why = h("p", { class: "vc-quiz-why", "aria-live": "polite" });
    q.querySelector(".vc-quiz-opts").after(why);
    opts.forEach((o) => {
      o.type = "button";
      o.addEventListener("click", () => {
        const ok = o.hasAttribute("data-correct");
        o.classList.add(ok ? "is-right" : "is-wrong");
        if (!q.dataset.first) q.dataset.first = ok ? "right" : "wrong";
        if (ok) {
          opts.forEach((x) => { x.disabled = true; });
          why.textContent = "";
          motion.pop(o);
          if (fb) { fb.classList.add("is-visible"); motion.enter(fb); }
          q.dataset.done = "1";
          const set = q.closest(".vc-practice");
          if (set) scorePractice(set);
        } else {
          why.textContent = "Not this one. " + (o.dataset.why || "Try again.");
          o.disabled = true;
          motion.shake(o);
        }
      });
    });
  }
  function scorePractice(set) {
    const qs = [...set.querySelectorAll(".vc-quiz")];
    const done = qs.filter((q) => q.dataset.done).length;
    const right = qs.filter((q) => q.dataset.first === "right").length;
    const out = set.querySelector(".vc-practice-score");
    if (!out) return;
    out.textContent = done < qs.length ? `${done} of ${qs.length} answered` : `${right} of ${qs.length} right on the first try${right === qs.length ? " 🎉" : " · read the explanations"}`;
    const complete = done === qs.length;
    out.classList.toggle("is-complete", complete);
    if (complete) motion.pop(out);
  }
  function mountPractice(set) {
    if (set.dataset.mounted) return;
    set.dataset.mounted = "1";
    const head = set.querySelector(".vc-practice-t");
    if (!head) return;
    head.append(h("span", { class: "vc-practice-score" }));
    const reset = btn(head, "↺ Retry", () => {
      set.querySelectorAll(".vc-quiz").forEach((q) => {
        delete q.dataset.first; delete q.dataset.done;
        q.querySelectorAll(".vc-quiz-opt").forEach((o) => { o.disabled = false; o.classList.remove("is-right", "is-wrong"); });
        q.querySelector(".vc-quiz-fb")?.classList.remove("is-visible");
        const w = q.querySelector(".vc-quiz-why"); if (w) w.textContent = "";
      });
      scorePractice(set);
    }, "vc-btn-ghost vc-btn-sm");
    reset.setAttribute("aria-label", "Retry the questions of this topic");
    scorePractice(set);
  }

  /* ---------- Checklists persisted in localStorage ---------- */
  function mountChecklist(ul) {
    if (ul.dataset.mounted) return;
    ul.dataset.mounted = "1";
    const key = "vc:" + location.pathname + ":" + (ul.id || ul.dataset.key || "list");
    let saved = {};
    try { saved = JSON.parse(localStorage.getItem(key) || "{}"); } catch (e) { saved = {}; }
    const items = [...ul.querySelectorAll("li")];
    const score = h("p", { class: "vc-checklist-score" });
    ul.after(score);
    const update = () => {
      const done = items.filter((li) => li.classList.contains("is-done")).length;
      score.textContent = `${done} of ${items.length} done`;
      if (done === items.length) motion.pop(score);
    };
    items.forEach((li, i) => {
      if (li.querySelector("input")) return;
      const cb = h("input", { type: "checkbox", "aria-label": li.textContent.trim().slice(0, 80) });
      const on = !!saved[i];
      cb.checked = on; li.classList.toggle("is-done", on);
      cb.addEventListener("change", () => {
        li.classList.toggle("is-done", cb.checked);
        saved[i] = cb.checked;
        try { localStorage.setItem(key, JSON.stringify(saved)); } catch (e) {}
        if (cb.checked) motion.pop(cb);
        update();
      });
      li.prepend(cb);
    });
    update();
  }

  /* ---------- Mount ---------- */
  function register(name, fn) { WIDGETS[name] = fn; }
  function mountAll() {
    document.querySelectorAll(".vc-widget[data-widget]").forEach((root) => {
      if (root.dataset.mounted) return;
      const fn = WIDGETS[root.dataset.widget];
      if (!fn) return;
      root.dataset.mounted = "1";
      try { fn(root); }
      catch (err) { console.error("vc-core:", root.dataset.widget, err); root.append(h("p", { class: "vc-note is-bad" }, "This simulator could not load.")); }
    });
    document.querySelectorAll(".vc-quiz").forEach(mountQuiz);
    document.querySelectorAll(".vc-practice").forEach(mountPractice);
    document.querySelectorAll(".vc-checklist").forEach(mountChecklist);
    if (!reduced() && M()) {
      document.querySelectorAll(".vc-widget, .vc-lab, .vc-practice, .vc-prompt, .vc-compare").forEach((el) => {
        if (el.dataset.entered) return;
        el.dataset.entered = "1";
        el.style.opacity = "0";
        motion.onView(el, () => motion.enter(el));
      });
    }
  }

  window.VC = { h, svg, motion, sleep, panel, controls, slider, select, text, btn, buttons, stat, note, runFlow, register, mountAll, WIDGETS };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => setTimeout(mountAll, 0));
  else setTimeout(mountAll, 0);
})();
