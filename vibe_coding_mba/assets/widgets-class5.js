/* widgets-class5.js — Class 5: Demo Day and strategy revisited
   c5-deck       · deck builder: sources, storyline, one message per slide, evidence coverage
   c5-pitch      · 10-minute pitch structure timer with progress ring
   c5-rubric     · rubric self-scorer: four criteria × four levels
   c5-moats      · defensibility meter: what remains a moat when building is cheap
   c5-roadmap    · prototype-to-production roadmap builder (order 8 cards)
   c5-reflection · reflection memo builder with word count, draft saved in the browser, copy */
(function () {
  "use strict";
  const { h, svg, motion, panel, controls, text, btn, buttons, toggle, plot, stat, note, register } = window.VC;
  const fmt = (n) => Math.round(n).toLocaleString("en-US");
  const mmss = (s) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
  const BAD = "color-mix(in srgb, var(--vc-bad) 62%, var(--hz-ink))"; // red text that stays readable in light and dark
  const live = (el) => { el.setAttribute("aria-live", "polite"); return el; };
  const label = (parent, txt) => { const p = h("p", { style: { margin: "0.7rem 0 0.2rem", fontSize: "0.8rem", fontWeight: "700" } }, txt); parent.append(p); return p; };

  /* ================================================================
     c5-deck · Build the Demo Day deck with AI
     ================================================================ */
  register("c5-deck", function (root) {
    panel(root, "Generate the Demo Day deck from your sources",
      "Switch on what the assistant may read, then generate. One slide carries one message, and every number needs a source. Click a slide to see it large.", "accent");

    const SRC = [["log", "Build log"], ["tests", "Test-set results"], ["risk", "Risk memo"], ["shots", "Screenshots"], ["cost", "Cost model"]];
    const NAME = Object.fromEntries(SRC);
    const on = { log: true, tests: true, risk: false, shots: true, cost: false };

    const STORY = [
      { block: "Problem", sec: 60, short: "120 requests a day, 3 to 6 hours each", needs: ["log"],
        sentence: "Cerro Azul's 14 reps retype about 120 quote requests a day, and a quote goes out 3 to 6 hours later.",
        body: ["Each request costs about 12 minutes of retyping.", "The number we promised to move: quote time, to under one hour. Baseline and result from five timed requests."] },
      { block: "Live demo", sec: 180, short: "Live: Paula quotes Doña Elsa", needs: ["shots"],
        sentence: "Paula pastes Restaurante Doña Elsa's message and has a quote ready in under two minutes.",
        body: ["This slide holds the screen while the product loads.", "Then the product itself, live, with a de-identified message."] },
      { block: "Evidence", sec: 120, short: "24 messages, before and after", needs: ["tests"],
        sentence: "On 24 de-identified messages, the guardrail cut wrong quotes that nobody noticed from 6 to 1.",
        body: ["Without the guardrail: 18 right, 6 wrong and unnoticed.", "With it: 1 wrong, and 7 of 24 go to a rep for a line-by-line check."] },
      { block: "Risks", sec: 90, short: "Three findings fixed, one open", needs: ["risk"],
        sentence: "We found three risks and fixed them; one is still open.",
        body: ["Fixed: the secret key in the public page, reps opening each other's priced quotes, a message that asked for 40% off.", "Open: customer phone numbers have no retention rule yet."] },
      { block: "Decision", sec: 60, short: "Keep vibe coding, hand off the ERP write", needs: ["risk"],
        sentence: "We keep vibe coding QuoteDesk and hand the write into the ERP to engineering.",
        body: ["Carla approves every discount; a rep approves every quote.", "Buying a product was ruled out: none knows our catalog's local names."] },
      { block: "Roadmap", sec: 90, short: "Three conditions, about USD 28 a month", needs: ["cost"],
        sentence: "Rolling out to 14 reps needs three things and about USD 28 a month in model calls.",
        body: ["A two-week pilot with three reps, an owner with a company account and a USD 50 monthly limit, a retention rule.", "Against about 520 rep hours of retyping a month (CLP 4.7 million)."] },
    ];
    const EXTRA = [
      { block: "Added", sec: 60, short: "How retrieval works", needs: [], fixed: "not in your storyline",
        sentence: "QuoteDesk uses retrieval over the price list and the delivery policy.", body: ["A diagram of chunks and embeddings.", "True, and nobody on the panel asked for it."] },
      { block: "Added", sec: 60, short: "A USD 40 million market", needs: ["none"], fixed: "not in your storyline",
        sentence: "AI quoting in Chilean food distribution is a USD 40 million market.", body: ["A number the assistant produced because decks usually have one.", "No source of yours contains it."] },
      { block: "Added", sec: 60, short: "Architecture overview", needs: [], fixed: "not in your storyline",
        sentence: "The architecture has a web page, a database and a model call.", body: ["Keep it for the questions, as a backup slide."] },
      { block: "Added", sec: 60, short: "Team and timeline", needs: [], fixed: "not in your storyline",
        sentence: "The team built QuoteDesk across five sessions.", body: ["The panel knows. It is the course."] },
    ];

    let mode = "one", extras = false, backup = false, sel = 2, prev = {};

    label(root, "Sources the assistant may read");
    const sw = h("div", { class: "vc-switches" });
    root.append(sw);
    SRC.forEach(([id, k]) => toggle(sw, k, (v) => { on[id] = v; render(false); }, on[id]));

    label(root, "Storyline, written before any slide exists: six sentences, one per block of the pitch");
    root.append(h("ol", { style: { margin: "0.2rem 0 0.4rem", paddingLeft: "1.3rem", fontSize: "0.84rem", lineHeight: "1.45" } },
      STORY.map((s) => h("li", { style: { margin: "0.15rem 0" } }, h("strong", {}, s.block + ". "), s.sentence))));

    label(root, "How the assistant lays it out");
    buttons(root, [{ label: "One message per slide", value: "one" }, { label: "Pack two messages per slide", value: "two" }], (v) => { mode = v; sel = Math.min(sel, 3); render(false); }, mode);
    const sw2 = h("div", { class: "vc-switches" });
    root.append(sw2);
    toggle(sw2, "Let the assistant add slides it thinks are missing", (v) => { extras = v; render(false); }, extras);
    toggle(sw2, "Backup: recorded demo", (v) => { backup = v; render(false); }, backup);

    const ctl = h("div", { class: "vc-buttons" });
    root.append(ctl);
    btn(ctl, "Generate deck", () => render(true), "vc-btn-accent");

    const grid = h("div", { class: "vc-slides", style: { gridTemplateColumns: "repeat(auto-fill, minmax(132px, 1fr))", alignItems: "stretch" } });
    const stage = live(h("div", { class: "vc-slide is-stage", style: { aspectRatio: "auto", minHeight: "min(19rem, 56vw)", overflow: "visible", gap: "0.45rem" } }));
    root.append(grid, stage);
    const setSlides = stat(root, "Slides", "—", "accent");
    const setCov = stat(root, "Numbers with a source", "—");
    const setTime = stat(root, "Talk time against the 10:00 clock", "—");
    const out = live(note(root, ""));

    function build() {
      const deck = [{ key: "title", block: "Title", sec: 0, short: "QuoteDesk: a quote in minutes", needs: [], msgs: 1,
        sentence: "QuoteDesk: a quote in minutes, not hours.", body: ["Cerro Azul Distribuidora, Demo Day.", "On screen while you say the problem sentence."] }];
      if (mode === "one") STORY.forEach((s) => deck.push(Object.assign({ key: s.block, msgs: 1 }, s)));
      else for (let i = 0; i < STORY.length; i += 2) {
        const a = STORY[i], b = STORY[i + 1];
        deck.push({ key: a.block + "+" + b.block, block: a.block + " + " + b.block, sec: a.sec + b.sec, short: a.block + " and " + b.block.toLowerCase(), msgs: 2,
          needs: [...new Set([...a.needs, ...b.needs])], sentence: a.sentence + " " + b.sentence, body: [a.body[0], b.body[0]] });
      }
      if (extras) EXTRA.forEach((s) => deck.push(Object.assign({ key: s.short, msgs: 1 }, s)));
      deck.push({ key: "close", block: "Sources", sec: 0, short: "Sources, and how this deck was made", needs: [], msgs: 1,
        sentence: "Every number here comes from our build log, test set, risk memo or cost model.",
        body: ["Slides generated with an AI assistant from those sources, then checked line by line by the team.", "Stays on screen during the questions."] });
      if (backup) deck.push({ key: "backup", block: "Backup", sec: 0, short: "Backup: 90-second recording", needs: ["shots"], msgs: 1,
        sentence: "A 90-second recording of the same user story, used only if the deployed app fails.",
        body: ["Say that it is a recording, and add the failure to the risks block.", "After the closing slide, never in the main run."] });
      return deck;
    }
    const flagsOf = (s) => {
      const f = [];
      if (s.needs.some((n) => !on[n])) f.push(s.block === "Decision" ? "claim with no evidence" : "number with no evidence");
      if (s.msgs > 1) f.push("two messages on one slide");
      if (s.fixed) f.push(s.fixed);
      return f;
    };

    function showStage(deck, i, animate) {
      const s = deck[i], f = flagsOf(s);
      stage.innerHTML = "";
      stage.classList.toggle("is-bad", f.length > 0);
      const missing = s.needs.filter((n) => !on[n]);
      const src = s.needs.length === 0 ? "No number on this slide that needs a source."
        : missing.length ? "Missing source: " + missing.map((n) => NAME[n] || "none of your sources").join(", ") + ". The assistant filled the gap with a plausible number."
        : "Source: " + s.needs.map((n) => NAME[n]).join(", ") + ".";
      stage.append(
        h("span", { style: { fontFamily: "var(--hz-mono)", fontSize: "0.72rem", color: "var(--hz-muted)" } }, `Slide ${i + 1} of ${deck.length} · ${s.block}`),
        h("b", { style: { fontSize: "clamp(1.15rem, 3.2vw, 1.55rem)", lineHeight: "1.15" } }, s.sentence),
        ...s.body.map((t) => h("span", {}, t)),
        h("span", { style: { marginTop: "auto", fontSize: "0.78rem", color: missing.length ? BAD : "var(--hz-muted)" } }, src),
        f.length ? h("span", { style: { fontSize: "0.78rem", fontWeight: "700", color: BAD } }, "Flag: " + f.join("; ") + ".") : "");
      if (animate) motion.anim(stage, { opacity: [0.4, 1], y: [8, 0] }, { duration: motion.DUR.std, ease: motion.EASE.out });
    }

    function render(generate) {
      const deck = build();
      if (sel >= deck.length) sel = deck.length - 1;
      grid.innerHTML = "";
      const now = {};
      const els = deck.map((s, i) => {
        const f = flagsOf(s);
        now[s.key] = f.length > 0;
        const srcLine = f.length ? f[0] : s.needs.length ? "source: " + s.needs.map((n) => NAME[n].toLowerCase()).join(", ") : "";
        const el = h("button", { type: "button", class: "vc-slide" + (f.length ? " is-bad" : "") + (i === sel ? " is-on" : ""), "aria-pressed": String(i === sel),
          "aria-label": `Slide ${i + 1}: ${s.short}.${f.length ? " Flag: " + f.join("; ") + "." : ""}`,
          style: { font: "inherit", fontSize: "0.68rem", lineHeight: "1.3", textAlign: "left", cursor: "pointer", color: "inherit", aspectRatio: "auto", minHeight: "5.6rem", paddingBottom: "1.1rem" } },
          h("b", {}, s.short),
          srcLine ? h("span", { style: { color: f.length ? BAD : "var(--hz-muted)", fontWeight: f.length ? "700" : "400" } }, srcLine) : "",
          h("i", {}, String(i + 1)));
        el.addEventListener("click", () => {
          sel = i;
          els.forEach((x, j) => { x.classList.toggle("is-on", j === i); x.setAttribute("aria-pressed", String(j === i)); });
          showStage(deck, i, true);
        });
        grid.append(el);
        return el;
      });
      if (generate) motion.stagger(els, { kf: { opacity: [0, 1], y: [10, 0] }, step: 0.04 });
      else els.forEach((el, i) => {
        const k = deck[i].key;
        if (!(k in prev)) motion.enter(el);
        else if (prev[k] && !now[k]) motion.pop(el);
        else if (!prev[k] && now[k]) motion.shake(el);
      });
      prev = now;
      showStage(deck, sel, generate);

      const need = deck.filter((s) => s.needs.length > 0);
      const covered = need.filter((s) => s.needs.every((n) => on[n])).length;
      const secs = deck.reduce((a, s) => a + s.sec, 0);
      const two = deck.filter((s) => s.msgs > 1).length;
      const added = deck.filter((s) => s.fixed).length;
      const badCount = deck.filter((s) => flagsOf(s).length).length;
      setSlides(String(deck.length), deck.length > 9 ? "bad" : "accent");
      setCov(`${covered} of ${need.length}`, covered === need.length ? "ok" : "bad");
      setTime(mmss(secs), secs > 600 ? "bad" : "ok");
      let msg;
      if (added) msg = `<b>${deck.length} slides, ${mmss(secs)} of talk for a 10:00 slot.</b> The assistant added ${added} slides that are not in your storyline, one of them with a market number no source of yours contains. Generating is free; every extra slide costs you a minute of the panel's attention. Switch the additions off.`;
      else if (two) msg = `<b>${two} slides carry two messages.</b> The deck looks shorter but the talk is still ${mmss(secs)}: the panel reads the second message while you explain the first. Go back to one message per slide.`;
      else if (covered < need.length) msg = `<b>${need.length - covered} of ${need.length} slides state a number with no source behind it.</b> The assistant did not leave them blank: it wrote something plausible. Switch on the missing source (${[...new Set(need.filter((s) => !s.needs.every((n) => on[n])).flatMap((s) => s.needs.filter((n) => !on[n])))].map((n) => NAME[n] || n).join(", ")}) or cut the slide.`;
      else msg = `<b>${deck.length} slides, one message each, every number traced to a source, ${mmss(secs)} of talk.</b> ${backup ? "The recording sits after the closing slide as the fallback." : "Switch on the recorded demo: it is the fallback if the deployed app fails."} Now read every slide aloud once: you own each number, not the assistant.`;
      out.innerHTML = msg;
      out.className = "vc-note " + (badCount === 0 && secs <= 600 ? "is-ok" : added || covered < need.length ? "is-bad" : "is-warn");
      if (badCount === 0 && secs <= 600 && !generate) motion.pop(out);
    }
    render(false);
  });

  /* ================================================================
     c5-pitch · Pitch structure timer
     ================================================================ */
  register("c5-pitch", function (root) {
    panel(root, "The 10-minute pitch, block by block",
      "Press start and rehearse against the clock. Each block tells you what the panel is listening for while you speak.", "accent");
    const BLOCKS = [
      { k: "Problem", sec: 60, screen: "title slide, then the problem slide", hear: "Who the user is, the pain, and the one number that will tell them if it worked. Cerro Azul: 14 reps, about 120 quote requests a day, quotes in 3 to 6 hours." },
      { k: "Live demo", sec: 180, screen: "the product itself", hear: "One user story, end to end, with a de-identified message. They watch whether you trust it and whether the rep stays in control." },
      { k: "Evidence", sec: 120, screen: "the test-set slide", hear: "The test set: how many examples, the result before and after the guardrail, and how much human review it costs. Numbers, not adjectives." },
      { k: "Risks", sec: 90, screen: "the risks slide", hear: "Three findings from the risk memo, what you did about each, and what is still open. Honesty about the open item builds more trust than a clean sheet." },
      { k: "Decision", sec: 60, screen: "the decision slide", hear: "The build / buy / vibe decision in one sentence: keep vibe coding it, hand it to engineering to build properly, buy a product, or stop, with the criteria that drove it. They want a decision, not a wish." },
      { k: "Roadmap", sec: 90, screen: "the roadmap slide, then sources", hear: "The three conditions for rollout to 14 reps, who owns each, and roughly what it costs. They are doing the arithmetic while you talk." },
    ];
    const TOTAL = BLOCKS.reduce((a, b) => a + b.sec, 0);
    const IDLE = "The clock is 10:00 and stops there. The panel's five minutes of questions do not count.";

    const wrap = h("div", { style: { display: "flex", flexWrap: "wrap", gap: "1rem", alignItems: "flex-start" } });
    root.append(wrap);

    const R = 54, C = 2 * Math.PI * R;
    const ring = svg("svg", { viewBox: "0 0 140 140", class: "vc-plot", "aria-hidden": "true" });
    ring.append(svg("circle", { cx: 70, cy: 70, r: R, fill: "none", stroke: "var(--hz-line)", "stroke-width": 10 }));
    const arc = svg("circle", { cx: 70, cy: 70, r: R, fill: "none", stroke: "var(--hz-accent)", "stroke-width": 10, "stroke-linecap": "round",
      "stroke-dasharray": C, "stroke-dashoffset": C, transform: "rotate(-90 70 70)" });
    if (!motion.reduced()) arc.style.transition = "stroke-dashoffset 0.3s linear";
    ring.append(arc);
    const tClock = svg("text", { x: 70, y: 66, "text-anchor": "middle", style: "font-size:22px;font-weight:700;font-variant-numeric:tabular-nums" }, "10:00");
    ring.append(tClock, svg("text", { x: 70, y: 86, "text-anchor": "middle", class: "muted", style: "font-size:11px" }, "remaining"));
    const left = h("div", { style: { flex: "0 0 170px", margin: "0 auto" } });
    left.append(ring);
    const ctl = h("div", { class: "vc-buttons", style: { justifyContent: "center" } });
    left.append(ctl);
    wrap.append(left);

    const right = h("div", { style: { flex: "1 1 280px", minWidth: "0" } });
    const flow = h("div", { class: "vc-flow", style: { flexDirection: "column", margin: "0" } });
    const stepEls = BLOCKS.map((b) => {
      const el = h("div", { class: "vc-flow-step", style: { flex: "none", display: "grid", gridTemplateColumns: "1fr auto", gap: "0.2rem 0.6rem" } },
        h("strong", { style: { margin: "0" } }, b.k), h("span", { style: { fontFamily: "var(--hz-mono)", fontSize: "0.72rem", color: "var(--hz-muted)" } }, mmss(b.sec)),
        h("span", { style: { gridColumn: "1 / -1", color: "var(--hz-muted)" } }, b.hear));
      flow.append(el);
      return el;
    });
    right.append(flow);
    wrap.append(right);

    const setElapsed = stat(root, "Elapsed", "00:00");
    const setBlock = stat(root, "Current block", "Not started", "accent");
    const setLeft = stat(root, "Left in block", "01:00");
    const noteEl = live(note(root, IDLE));

    let base = 0, t0 = 0, elapsed = 0, timer = null, running = false, lastBlock = -1;
    const current = () => (running ? Math.min(TOTAL, base + Math.floor((Date.now() - t0) / 1000)) : base);
    function blockAt(t) {
      let acc = 0;
      for (let i = 0; i < BLOCKS.length; i++) { acc += BLOCKS[i].sec; if (t < acc) return { i, end: acc }; }
      return { i: BLOCKS.length - 1, end: TOTAL };
    }
    function paint() {
      tClock.textContent = mmss(Math.max(0, TOTAL - elapsed));
      arc.setAttribute("stroke-dashoffset", C * (1 - Math.min(1, elapsed / TOTAL)));
      setElapsed(mmss(elapsed));
      if (elapsed === 0 && !running) {
        stepEls.forEach((el) => el.classList.remove("is-on", "is-done"));
        setBlock("Not started", "accent"); setLeft("01:00", ""); lastBlock = -1;
        noteEl.className = "vc-note"; noteEl.textContent = IDLE;
        return;
      }
      const { i, end } = blockAt(elapsed);
      const over = elapsed >= TOTAL;
      stepEls.forEach((el, j) => { el.classList.toggle("is-on", j === i && !over); el.classList.toggle("is-done", j < i || over); });
      if (over) {
        setBlock("Time", "bad"); setLeft("00:00", "bad");
        if (lastBlock !== 99) {
          lastBlock = 99;
          noteEl.className = "vc-note is-bad";
          noteEl.textContent = "10:00. Stop talking, even mid-sentence. The panel notices teams that respect the clock, and the questions are where you win anyway.";
        }
        if (running) stop();
        return;
      }
      const b = BLOCKS[i];
      setBlock(b.k, "accent");
      const leftSec = end - elapsed;
      setLeft(mmss(leftSec), leftSec <= 15 ? "warn" : "");
      if (lastBlock !== i) {
        lastBlock = i;
        noteEl.className = "vc-note";
        noteEl.innerHTML = `<strong>${b.k}.</strong> ${b.hear} On screen: ${b.screen}.`;
        motion.pulse(stepEls[i]);
      }
    }
    function tick() { const t = current(); if (t !== elapsed) { elapsed = t; paint(); } }
    function start() { if (running || base >= TOTAL) return; running = true; t0 = Date.now(); timer = setInterval(tick, 250); bStart.textContent = "Pause"; paint(); }
    function stop() { base = current(); running = false; clearInterval(timer); timer = null; bStart.textContent = base >= TOTAL ? "Done" : base > 0 ? "Resume" : "Start"; }
    const bStart = btn(ctl, "Start", () => (running ? stop() : start()), "vc-btn-accent");
    btn(ctl, "Reset", () => { stop(); base = 0; elapsed = 0; bStart.textContent = "Start"; paint(); }, "vc-btn-ghost");
    btn(ctl, "Skip block", () => {
      if (elapsed >= TOTAL) return;
      base = blockAt(elapsed).end; t0 = Date.now(); elapsed = base;
      if (!running) bStart.textContent = base >= TOTAL ? "Done" : "Resume";
      paint();
    }, "vc-btn-ghost vc-btn-sm");
    paint();
  });

  /* ================================================================
     c5-rubric · Rubric self-scorer
     ================================================================ */
  register("c5-rubric", function (root) {
    panel(root, "Score QuoteDesk as the panel would",
      "Pick a level for each criterion. The total updates, and the note tells you which criterion is cheapest to raise tonight.");
    const CRIT = [
      { k: "Problem and value", lv: [
        "No named user or metric; the problem is a slogan.",
        "User named, pain described, but no measured metric.",
        "Metric from the brief measured once, on at least five timed requests.",
        "Metric measured, baseline and gap shown; a manager could decide on it tomorrow."],
        fix: "Put the five timed requests from M3 on the problem slide, baseline beside result. If you never timed them, do it tonight with de-identified messages." },
      { k: "Functionality", lv: [
        "The demo does not complete a user story.",
        "One story works with the team driving; breaks on a new input.",
        "A rep could complete the story alone; deployed, login works.",
        "Works end to end for its user, handles the bad message gracefully, nothing hidden."],
        fix: "Try the demo with a message you have never pasted before, and fix what breaks." },
      { k: "AI quality and safety", lv: [
        "The AI feature is shown but never tested; no guardrail.",
        "A few examples tried by hand; a guardrail exists but is not measured.",
        "Test set run, result before and after the guardrail, review workload known.",
        "Test set plus the failure cases explained, injection tried, human approval where money moves."],
        fix: "Run the 24-example test set with and without the guardrail and put both numbers on one slide." },
      { k: "Communication", lv: [
        "The panel cannot say what the tool is for after ten minutes.",
        "Clear to the team, confusing to the panel; jargon unexplained.",
        "Problem, demo, evidence and decision in order; questions answered directly.",
        "Adapted to the room; technical and non-technical listeners both leave able to act."],
        fix: "Rehearse once with someone outside the team as the panel and cut everything they did not need." },
    ];
    const scores = [1, 2, 1, 2];
    const grid = h("div", {});
    root.append(grid);
    const rows = CRIT.map((c, ci) => {
      const row = h("div", { class: "vc-card", style: { marginBottom: "0.5rem" } });
      row.append(h("strong", {}, c.k));
      const opts = h("div", { class: "vc-buttons", role: "group", "aria-label": c.k });
      const desc = live(h("p", { style: { margin: "0.2rem 0 0", fontSize: "0.84rem", color: "var(--hz-muted)" } }, c.lv[scores[ci]]));
      const bs = c.lv.map((d, li) => {
        const b = h("button", { type: "button", class: "vc-btn vc-btn-ghost vc-btn-sm", "aria-pressed": String(scores[ci] === li), "aria-label": `Level ${li + 1}: ${d}` }, `Level ${li + 1}`);
        b.addEventListener("click", () => {
          scores[ci] = li;
          bs.forEach((x, j) => x.setAttribute("aria-pressed", String(j === li)));
          desc.textContent = d;
          motion.anim(b, { scale: [0.95, 1] }, { duration: motion.DUR.quick, ease: motion.EASE.back });
          update();
        });
        opts.append(b);
        return b;
      });
      row.append(opts, desc);
      grid.append(row);
      return row;
    });
    stat(root, "Rubric total (max 16)", "—", "accent");
    const setGrade = stat(root, "Approximate grade (0 to 100)", "—");
    const setWeak = stat(root, "Lowest criterion", "—", "warn");
    const noteEl = live(note(root, ""));
    const totalEl = root.querySelector(".vc-stats strong");
    let lastTotal = 0;
    function update() {
      const total = scores.reduce((a, b) => a + b + 1, 0);
      const grade = Math.round(scores.reduce((a, s) => a + [25, 55, 80, 100][s], 0) / 4);
      motion.count(totalEl, lastTotal, total, (v) => String(Math.round(v)));
      lastTotal = total;
      setGrade(String(grade), grade >= 55 ? "ok" : "bad");
      let mi = 0; scores.forEach((s, i) => { if (s < scores[mi]) mi = i; });
      const top = scores[mi] === 3;
      setWeak(top ? "None below level 4" : CRIT[mi].k, top ? "ok" : "warn");
      rows.forEach((r, i) => { r.style.borderColor = !top && i === mi ? "var(--vc-warn)" : ""; });
      noteEl.innerHTML = top
        ? `Total 16 of 16. Every criterion at level 4 means a manager could act on QuoteDesk tomorrow. Rehearse the questions; that is all that is left.`
        : `Total ${total} of 16, about ${grade}/100${grade >= 55 ? " (a pass)" : " (below 55, not a pass)"}. The cheapest move tonight is <strong>${CRIT[mi].k}</strong>, now at level ${scores[mi] + 1}: ${CRIT[mi].fix}`;
      noteEl.className = "vc-note " + (grade >= 70 ? "is-ok" : grade >= 55 ? "" : "is-bad");
    }
    update();
  });

  /* ================================================================
     c5-moats · Defensibility meter
     ================================================================ */
  register("c5-moats", function (root) {
    panel(root, "What survives when a competitor copies QuoteDesk",
      "Switch on what Cerro Azul has. The meter shows how defensible the position is. Notice what the app itself contributes.");
    const ITEMS = [
      { k: "Proprietary data", w: 32, on: true, why: "The catalog's local names, what each customer usually orders, three months of rep corrections. Accumulates with use; does not copy with the code." },
      { k: "Customer relationships", w: 22, on: false, why: "1,800 accounts and their history with Cerro Azul's reps. A rival's copy quotes faster for the rival's customers; it does not bring these accounts with it." },
      { k: "Workflow integration", w: 24, on: false, why: "The quote-format skill and the price-list connector the reps' assistants use, and Carla's approval of discounts. It encodes how Cerro Azul operates." },
      { k: "Trust", w: 20, on: false, why: "A rep approves every quote, the test set and the risk memo exist, customer data is handled well. Complying with the law is an obligation; trust is what you earn on top of it." },
      { k: "The app itself", w: 2, on: true, why: "A weekend with the same assistant. Rented model, generated code. Worth almost nothing on its own." },
    ];
    const chips = h("div", { class: "vc-chips" });
    root.append(chips);
    const why = live(h("p", { style: { fontSize: "0.84rem", color: "var(--hz-muted)", margin: "0 0 0.6rem" } }, "Press a chip to switch it and read why it counts. The number is its weight in the meter."));
    root.append(why);

    const score = () => ITEMS.filter((i) => i.on).reduce((a, i) => a + i.w, 0);
    const color = (s) => (s < 35 ? "var(--vc-bad)" : s < 60 ? "var(--vc-warn)" : "var(--vc-ok)");
    let fillEl = null, unit = 0;
    plot(root, {
      label: "Defensibility meter, from 0 to 100 percent",
      height: 62,
      draw(el, w, hgt, { first, narrow }) {
        const x0 = 8, W = w - 16, s = score();
        unit = W / 100;
        el.append(svg("rect", { x: x0, y: 14, width: W, height: 20, rx: 10, fill: "var(--hz-line)" }));
        fillEl = svg("rect", { x: x0, y: 14, width: first ? 0 : unit * s, height: 20, rx: 10 });
        fillEl.style.fill = color(s);
        el.append(fillEl);
        (narrow ? [0, 50, 100] : [0, 25, 50, 75, 100]).forEach((p) =>
          el.append(svg("text", { x: x0 + unit * p, y: 54, "text-anchor": p === 0 ? "start" : p === 100 ? "end" : "middle", class: "muted" }, p + "%")));
        if (first) motion.attr(fillEl, "width", unit * s, { duration: motion.DUR.slow });
      },
    });
    stat(root, "Defensibility", "—", "accent");
    const setApp = stat(root, "Contribution of the app itself", "—");
    const setTime = stat(root, "Time for a rival to catch up", "—", "warn");
    const noteEl = live(note(root, ""));
    const scoreEl = root.querySelector(".vc-stats strong");
    let last = 0;
    function update(user) {
      const s = score();
      if (fillEl && user) { motion.attr(fillEl, "width", unit * s); fillEl.style.fill = color(s); }
      motion.count(scoreEl, last, s, (v) => Math.round(v) + "%"); last = s;
      setApp(ITEMS[4].on ? "2 points" : "0 points");
      const months = s < 10 ? "one weekend" : s < 35 ? "a few weeks" : s < 60 ? "6 to 12 months" : s < 85 ? "two to three years" : "years, if at all";
      setTime(months, s < 35 ? "bad" : s < 60 ? "warn" : "ok");
      const have = ITEMS.filter((i) => i.on && i.k !== "The app itself").map((i) => i.k.toLowerCase());
      noteEl.innerHTML = have.length === 0
        ? `Defensibility ${s}%. With ${ITEMS[4].on ? "only the app" : "nothing switched on"}, a rival with the same assistant catches up in a weekend. The code was never the moat.`
        : `Defensibility ${s}%. What a rival cannot copy in a weekend: <strong>${have.join(", ")}</strong>. ${ITEMS[4].on ? "The app itself adds 2 points." : "The app itself is off and the score barely moved."}`;
      noteEl.className = "vc-note " + (s < 35 ? "is-bad" : s < 60 ? "is-warn" : "is-ok");
    }
    ITEMS.forEach((it) => {
      const c = h("button", { type: "button", class: "vc-chip is-pick", "aria-pressed": String(it.on) }, `${it.k} · ${it.w}`);
      c.addEventListener("click", () => {
        it.on = !it.on;
        c.setAttribute("aria-pressed", String(it.on));
        motion.pop(c);
        why.textContent = `${it.k} (${it.w} points). ${it.why}`;
        update(true);
      });
      chips.append(c);
    });
    update(false);
  });

  /* ================================================================
     c5-roadmap · Prototype-to-production roadmap builder
     ================================================================ */
  register("c5-roadmap", function (root) {
    panel(root, "Put QuoteDesk's road to production in order",
      "Move the cards up or down, then check. The exact order is debatable at the edges; the three classic mistakes are not.");
    const STEPS = [
      { k: "Close the critical findings", d: "Secret key on the server, authorization tested with three accounts, discounts wait for Carla." },
      { k: "Data protection decisions, written down", d: "Purpose, retention and provider terms for customer names, phones and addresses." },
      { k: "Pilot with real users and the metric", d: "Paula, Diego and Marcos for two weeks; quote time measured against the brief." },
      { k: "Engineering review and the decision", d: "The five questions from Class 4: keep vibe coding it, hand it to engineering, buy, or stop." },
      { k: "An owner and a budget", d: "Company account with a USD 50 monthly limit; Carla's name on the tool." },
      { k: "Monitoring, with the test set every week", d: "Extraction quality measured, automations logged, an alert on a second channel." },
      { k: "Training and rollout to the 14 reps", d: "Two waves; the first wave trains the second." },
      { k: "Scaling, integration depth, cost optimization", d: "Now that you know what you are scaling." },
    ];
    const START = "The usual first instinct is to start with scaling. Order the cards, then press Check.";
    let order = [7, 6, 2, 0, 4, 3, 5, 1];
    const list = h("ol", { class: "vc-timeline", style: { flexDirection: "column", flexWrap: "nowrap" } });
    root.append(list);
    const ctl = h("div", { class: "vc-buttons" });
    root.append(ctl);
    const setOk = stat(root, "Cards in a sensible place", "not checked yet", "accent");
    const noteEl = live(note(root, START));
    function render() {
      list.innerHTML = "";
      order.forEach((id, pos) => {
        const s = STEPS[id];
        list.append(h("li", { style: { flex: "none", display: "grid", gridTemplateColumns: "1.6rem 1fr auto", gap: "0.5rem", alignItems: "center", cursor: "default" } },
          h("strong", { style: { fontSize: "0.82rem" } }, String(pos + 1)),
          h("span", {}, h("span", { style: { fontWeight: "600", display: "block", fontSize: "0.82rem" } }, s.k), h("span", { style: { color: "var(--hz-muted)" } }, s.d)),
          h("span", { class: "vc-buttons", style: { margin: "0", flexWrap: "nowrap" } },
            h("button", { type: "button", class: "vc-btn vc-btn-ghost vc-btn-sm", "aria-label": `Move "${s.k}" up`, disabled: pos === 0, onclick: () => move(pos, -1) }, "↑"),
            h("button", { type: "button", class: "vc-btn vc-btn-ghost vc-btn-sm", "aria-label": `Move "${s.k}" down`, disabled: pos === order.length - 1, onclick: () => move(pos, 1) }, "↓"))));
      });
    }
    function move(pos, dir) {
      const np = pos + dir;
      [order[pos], order[np]] = [order[np], order[pos]];
      render();
      const li = list.children[np];
      motion.anim(li, { y: [dir * -18, 0], opacity: [0.6, 1] }, { duration: motion.DUR.std, ease: motion.EASE.back });
      const bs = li.querySelectorAll("button");
      const target = dir < 0 ? bs[0] : bs[1];
      (target && !target.disabled ? target : dir < 0 ? bs[1] : bs[0]).focus({ preventScroll: true });
      setOk("not checked yet", "accent");
    }
    function check() {
      let ok = 0;
      order.forEach((id, pos) => {
        const good = Math.abs(id - pos) <= 1;
        const li = list.children[pos];
        li.classList.toggle("is-head", good); li.classList.toggle("is-bad", !good);
        if (good) ok++;
      });
      setOk(`${ok} of 8`, ok === 8 ? "ok" : ok >= 5 ? "warn" : "bad");
      const msgs = [];
      const at = (id) => order.indexOf(id);
      if (order[0] === 7) msgs.push("Scaling first spends money on a tool whose value is still a hypothesis.");
      if (at(2) < at(0) || at(2) < at(1)) msgs.push("The pilot puts real customer messages in the tool: close the critical findings and write down the data decisions before it starts.");
      else if (at(2) > 3) msgs.push("The pilot with the metric belongs early: it tells you whether to spend on the review, the owner, the monitoring and the rollout.");
      if (at(3) > at(6)) msgs.push("Rolling out to 14 reps before the engineering review is the tool-nobody-else-understands mistake.");
      if (at(4) > at(6)) msgs.push("Rollout without an owner and a budget means the tool lives on someone's personal account.");
      noteEl.innerHTML = ok === 8
        ? "All eight within one position of the recommended order. Close the critical findings, settle the data decisions, pilot and measure, get a review and an owner, monitor, roll out, then scale."
        : `${ok} of 8 cards within one position of the recommended order. ${msgs.length ? msgs.join(" ") : "Close. The cards outlined in red are more than one place off."}`;
      noteEl.className = "vc-note " + (ok === 8 ? "is-ok" : ok >= 5 ? "is-warn" : "is-bad");
      if (ok === 8) motion.pop(noteEl);
      else [...list.children].filter((li) => li.classList.contains("is-bad")).slice(0, 2).forEach((li) => motion.shake(li));
    }
    btn(ctl, "Check my order", check, "vc-btn-accent");
    btn(ctl, "Show the recommended order", () => { order = [0, 1, 2, 3, 4, 5, 6, 7]; render(); motion.stagger(list.children, { kf: { opacity: [0.4, 1], y: [8, 0] }, step: 0.04 }); check(); }, "vc-btn-ghost");
    btn(ctl, "Shuffle again", () => { order = [5, 7, 3, 2, 6, 0, 4, 1]; render(); setOk("not checked yet", "accent"); noteEl.className = "vc-note"; noteEl.textContent = START; }, "vc-btn-ghost vc-btn-sm");
    render();
  });

  /* ================================================================
     c5-reflection · Reflection memo builder
     ================================================================ */
  register("c5-reflection", function (root) {
    panel(root, "Reflection memo builder",
      "Five parts, one paragraph each, with a concrete moment from your build log in every one. 400 to 600 words. The draft is saved in this browser.", "accent");
    const MIN = 400, MAX = 600, KEY = "vc:class5:reflection";
    const PARTS = [
      { k: "What the AI did", ph: "What the assistant produced that you could not have: the first deployed version in 40 minutes, the extraction table, the morning digest. Cite the session and what you typed." },
      { k: "What I decided", ph: "The decisions that were yours: which problem, which user story first, where the guardrail goes, who approves discounts. Cite the moment in the log." },
      { k: "Where it misled me", ph: "The time it said the tests passed and they had not, the price it invented, the confident wrong answer about the delivery policy. The prompt, the output, how you noticed." },
      { k: "What I would do differently", ph: "Smaller steps, a test set in week one, a checkpoint before every risky change, read access before write access. Be specific." },
      { k: "How this changes my work with technology teams", ph: "What you will now ask for, what you will build yourself, what you will stop asking for, and how you will judge what an engineering team tells you." },
    ];
    let saved = [];
    try { saved = JSON.parse(localStorage.getItem(KEY) || "[]"); } catch (e) { saved = []; }
    const fields = [];
    const c = controls(root);
    c.style.gridTemplateColumns = "1fr";
    PARTS.forEach((p, i) => {
      const t = text(c, p.k, { placeholder: p.ph, multiline: true }, update);
      t.style.minHeight = "6rem";
      if (typeof saved[i] === "string") t.value = saved[i];
      fields.push({ k: p.k, el: t });
    });
    const ctl = h("div", { class: "vc-buttons" });
    root.append(ctl);
    const setWords = stat(root, "Words", "0", "accent");
    const setParts = stat(root, "Parts with text", "0 of 5");
    const setEvidence = stat(root, "Parts citing a moment", "0 of 5", "warn");
    const out = h("div", { class: "vc-prompt is-ai", style: { marginTop: "0.8rem" } }, h("div", { class: "vc-prompt-h" }, "Your memo, assembled"), h("div", { class: "vc-prompt-b", tabindex: "0" }, ""));
    root.append(out);
    const body = out.querySelector(".vc-prompt-b");
    const noteEl = live(note(root, ""));
    const hasEvidence = (s) => /\b(20\d\d|\d{1,2}\/\d{1,2}|\d{1,2}:\d{2}|session \d|class \d|day \d|week \d|typed|prompt|asked it)\b/i.test(s) || /["“][^"”]{8,}["”]/.test(s);
    const assemble = () => fields.map((f) => (f.el.value.trim() ? `${f.k}\n${f.el.value.trim()}` : "")).filter(Boolean).join("\n\n");
    function update() {
      const memo = assemble();
      const words = memo ? memo.split(/\s+/).filter(Boolean).length : 0;
      const parts = fields.filter((f) => f.el.value.trim()).length;
      const ev = fields.filter((f) => hasEvidence(f.el.value)).length;
      try { localStorage.setItem(KEY, JSON.stringify(fields.map((f) => f.el.value))); } catch (e) { /* private mode: the draft lives in the page only */ }
      setWords(fmt(words), words < MIN ? "warn" : words > MAX ? "bad" : "ok");
      setParts(`${parts} of 5`, parts === 5 ? "ok" : "");
      setEvidence(`${ev} of 5`, ev === 5 ? "ok" : ev >= 3 ? "warn" : "bad");
      body.textContent = memo || "Nothing yet. Start with the part you remember most clearly, usually where the assistant misled you.";
      let msg;
      if (words === 0) msg = "Empty. The memo is graded on honesty and specificity, not on how well QuoteDesk works.";
      else if (parts < 5) msg = `${parts} of 5 parts written, ${fmt(words)} words. Every part needs a paragraph; the grader reads the five headings first.`;
      else if (ev < 5) msg = `All five parts written, ${fmt(words)} words. ${5 - ev} part${5 - ev > 1 ? "s" : ""} still without a concrete moment: add a session number, a date or the exact prompt in quotes.`;
      else if (words < MIN) msg = `All parts written with evidence, ${fmt(words)} words. Under ${MIN}: expand the moments, say what you saw and what you did next.`;
      else if (words > MAX) msg = `${fmt(words)} words, over ${MAX}. Cut the sentences that describe the product; the memo is about what you learned.`;
      else msg = `${fmt(words)} words, five parts, five concrete moments. Copy it and submit.`;
      noteEl.textContent = msg;
      noteEl.className = "vc-note " + (parts === 5 && ev === 5 && words >= MIN && words <= MAX ? "is-ok" : parts === 5 ? "is-warn" : "");
    }
    const copyBtn = btn(ctl, "Copy memo", async () => {
      const memo = assemble();
      if (!memo) { motion.shake(copyBtn); noteEl.textContent = "Nothing to copy yet. Write at least one part."; return; }
      try {
        await navigator.clipboard.writeText(memo);
        copyBtn.textContent = "Copied"; motion.pop(copyBtn);
      } catch (e) {
        const r = document.createRange(); r.selectNodeContents(body);
        const s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
        copyBtn.textContent = "Selected below: press copy";
      }
      setTimeout(() => { copyBtn.textContent = "Copy memo"; }, 2000);
    }, "vc-btn-accent");
    btn(ctl, "Clear the draft", () => { fields.forEach((f) => { f.el.value = ""; }); update(); }, "vc-btn-ghost vc-btn-sm");
    update();
  });
})();
