/* widgets-class5.js — Class 5: Demo Day and strategy revisited
   c5-pitch      · 10-minute pitch structure timer with progress ring
   c5-rubric     · rubric self-scorer: four criteria × four levels
   c5-moats      · defensibility meter: what remains a moat when building is cheap
   c5-roadmap    · prototype-to-production roadmap builder (order 8 cards)
   c5-reflection · reflection memo builder with word count and copy */
(function () {
  "use strict";
  const { h, svg, motion, sleep, panel, controls, slider, select, text, btn, buttons, stat, note, runFlow, register } = window.VC;
  const fmt = (n) => Math.round(n).toLocaleString("en-US");
  const mmss = (s) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

  /* ================================================================
     c5-pitch · Pitch structure timer
     ================================================================ */
  register("c5-pitch", function (root) {
    panel(root, "The 10-minute pitch, block by block",
      "Press start and rehearse against the clock. Each block tells you what the panel is listening for while you speak.", "accent");
    const BLOCKS = [
      { k: "Problem", sec: 60, hear: "Who the user is, the pain, and the one number that will tell them if it worked. Cerro Azul: 14 reps, 300 messages a day, quotes in 3 to 6 hours." },
      { k: "Live demo", sec: 180, hear: "One real user story, end to end, with a message a rep would actually receive. They watch whether you trust it and whether the rep stays in control." },
      { k: "Evidence", sec: 120, hear: "The test set: how many examples, pass rate before and after the guardrail, and how much human review it costs. Numbers, not adjectives." },
      { k: "Risks", sec: 90, hear: "Three findings from the risk memo, what you did about each, and what is still open. Honesty about the open item builds more trust than a clean sheet." },
      { k: "Decision", sec: 60, hear: "Build, buy, keep vibing or hand off, in one sentence, with the criteria that drove it. They want a decision, not a wish." },
      { k: "Roadmap", sec: 90, hear: "The three conditions for rollout to 14 reps, who owns each, and roughly what it costs. They are doing the arithmetic while you talk." },
    ];
    const TOTAL = BLOCKS.reduce((a, b) => a + b.sec, 0);

    const wrap = h("div", { style: { display: "grid", gridTemplateColumns: "minmax(140px, 180px) 1fr", gap: "1rem", alignItems: "start" } });
    root.append(wrap);

    // Progress ring
    const R = 54, C = 2 * Math.PI * R;
    const ring = svg("svg", { viewBox: "0 0 140 140", class: "vc-plot", "aria-hidden": "true" });
    ring.append(svg("circle", { cx: 70, cy: 70, r: R, fill: "none", stroke: "var(--hz-line)", "stroke-width": 10 }));
    const arc = svg("circle", { cx: 70, cy: 70, r: R, fill: "none", stroke: "var(--hz-accent)", "stroke-width": 10, "stroke-linecap": "round",
      "stroke-dasharray": C, "stroke-dashoffset": C, transform: "rotate(-90 70 70)" });
    ring.append(arc);
    const tClock = svg("text", { x: 70, y: 66, "text-anchor": "middle", style: "font-size:22px;font-weight:700;font-variant-numeric:tabular-nums" }, "10:00");
    const tLabel = svg("text", { x: 70, y: 86, "text-anchor": "middle", class: "muted", style: "font-size:11px" }, "remaining");
    ring.append(tClock, tLabel);
    const left = h("div", {});
    left.append(ring);
    const ctl = h("div", { class: "vc-buttons", style: { justifyContent: "center" } });
    left.append(ctl);
    wrap.append(left);

    // Blocks
    const right = h("div", {});
    const flow = h("div", { class: "vc-flow", style: { flexDirection: "column" } });
    const stepEls = BLOCKS.map((b) => {
      const el = h("div", { class: "vc-flow-step", style: { display: "grid", gridTemplateColumns: "1fr auto", gap: "0.3rem 0.6rem" } },
        h("strong", {}, b.k), h("span", { class: "muted", style: { fontFamily: "var(--hz-mono)", fontSize: "0.72rem", color: "var(--hz-muted)" } }, mmss(b.sec)),
        h("span", { style: { gridColumn: "1 / -1", color: "var(--hz-muted)" } }, b.hear));
      flow.append(el);
      return el;
    });
    right.append(flow);
    wrap.append(right);

    const setElapsed = stat(root, "Elapsed", "00:00");
    const setBlock = stat(root, "Current block", "Not started", "accent");
    const setLeft = stat(root, "Left in block", "—");
    const noteEl = note(root, "The clock is 10:00 and stops there. The panel's five minutes of questions do not count.");

    let elapsed = 0, timer = null, running = false;
    function blockAt(t) {
      let acc = 0;
      for (let i = 0; i < BLOCKS.length; i++) { acc += BLOCKS[i].sec; if (t < acc) return { i, end: acc }; }
      return { i: BLOCKS.length - 1, end: TOTAL };
    }
    function paint() {
      const remaining = Math.max(0, TOTAL - elapsed);
      tClock.textContent = mmss(remaining);
      arc.setAttribute("stroke-dashoffset", C * (1 - Math.min(1, elapsed / TOTAL)));
      setElapsed(mmss(elapsed));
      if (elapsed === 0 && !running) { setBlock("Not started"); setLeft("—"); return; }
      const { i, end } = blockAt(elapsed);
      stepEls.forEach((el, j) => { el.classList.toggle("is-on", j === i && elapsed < TOTAL); el.classList.toggle("is-done", j < i || elapsed >= TOTAL); });
      if (elapsed >= TOTAL) {
        setBlock("Time", "bad"); setLeft("00:00", "bad");
        noteEl.textContent = "10:00. Stop talking, even mid-sentence. The panel notices teams that respect the clock, and the questions are where you win anyway.";
        noteEl.className = "vc-note is-bad";
        stop();
        return;
      }
      const b = BLOCKS[i];
      setBlock(b.k, "accent");
      const leftSec = end - elapsed;
      setLeft(mmss(leftSec), leftSec <= 15 ? "warn" : undefined);
      noteEl.className = "vc-note";
      noteEl.innerHTML = `<strong>${b.k}.</strong> ${b.hear}`;
    }
    function tick() {
      elapsed += 1;
      const before = blockAt(elapsed - 1).i, after = blockAt(elapsed).i;
      paint();
      if (after !== before && stepEls[after]) motion.pulse(stepEls[after]);
    }
    function start() { if (running || elapsed >= TOTAL) return; running = true; timer = setInterval(tick, 1000); bStart.textContent = "Pause"; paint(); }
    function stop() { running = false; clearInterval(timer); timer = null; bStart.textContent = elapsed >= TOTAL ? "Done" : "Start"; }
    const bStart = btn(ctl, "Start", () => (running ? stop() : start()), "vc-btn-accent");
    btn(ctl, "Reset", () => { stop(); elapsed = 0; bStart.textContent = "Start"; stepEls.forEach((el) => el.classList.remove("is-on", "is-done")); noteEl.className = "vc-note"; noteEl.textContent = "The clock is 10:00 and stops there. The panel's five minutes of questions do not count."; paint(); }, "vc-btn-ghost");
    btn(ctl, "Skip block", () => { if (elapsed >= TOTAL) return; const { end } = blockAt(elapsed); elapsed = end; paint(); const { i } = blockAt(elapsed); motion.pulse(stepEls[i]); }, "vc-btn-ghost vc-btn-sm");
    paint();
  });

  /* ================================================================
     c5-rubric · Rubric self-scorer
     ================================================================ */
  register("c5-rubric", function (root) {
    panel(root, "Score QuoteDesk as the panel would",
      "Click a level for each criterion. The total updates, and the note tells you which criterion moves the grade most tonight.");
    const CRIT = [
      { k: "Problem and value", lv: [
        "No named user or metric; the problem is a slogan.",
        "User named, pain described, but no measured metric.",
        "Metric from the brief measured once with real data.",
        "Metric measured, baseline and gap shown; a manager could decide on it tomorrow."],
        fix: "Measure quotes per rep per day with the reps who tried it, even for three days." },
      { k: "Functionality", lv: [
        "The demo does not complete a user story.",
        "One story works with the team driving; breaks on a new input.",
        "A rep could complete the story alone; deployed, login works.",
        "Works end to end for its user, handles the bad message gracefully, nothing hidden."],
        fix: "Try the demo with a message you have never pasted before, and fix what breaks." },
      { k: "AI quality and safety", lv: [
        "The AI feature is shown but never tested; no guardrail.",
        "A few examples tried by hand; a guardrail exists but is not measured.",
        "Test set run, pass rate before and after the guardrail, review workload known.",
        "Test set plus the failure cases explained, injection tried, human review where money moves."],
        fix: "Run the 24-example test set with and without the guardrail and put both numbers on one slide." },
      { k: "Communication", lv: [
        "The panel cannot say what the tool is for after ten minutes.",
        "Clear to the team, confusing to the panel; jargon unexplained.",
        "Problem, demo, evidence and decision in order; questions answered directly.",
        "Adapted to the room; technical and non-technical listeners both leave able to act."],
        fix: "Rehearse once with someone outside the team as the panel and cut everything they did not need." },
    ];
    const scores = [2, 3, 2, 3];
    const grid = h("div", {});
    root.append(grid);
    const rows = CRIT.map((c, ci) => {
      const row = h("div", { class: "vc-card", style: { marginBottom: "0.5rem" } });
      row.append(h("strong", {}, c.k));
      const opts = h("div", { class: "vc-buttons" });
      const bs = c.lv.map((d, li) => {
        const b = h("button", { type: "button", class: "vc-btn vc-btn-ghost vc-btn-sm", "aria-pressed": String(scores[ci] === li), title: d }, `Level ${li + 1}`);
        b.addEventListener("click", () => { scores[ci] = li; bs.forEach((x, j) => x.setAttribute("aria-pressed", String(j === li))); desc.textContent = d; motion.anim(b, { scale: [0.95, 1] }, { duration: motion.DUR.quick, ease: motion.EASE.back }); update(); });
        opts.append(b); return b;
      });
      const desc = h("p", { style: { margin: "0.2rem 0 0", fontSize: "0.82rem", color: "var(--hz-muted)" } }, c.lv[scores[ci]]);
      row.append(opts, desc);
      grid.append(row);
      return { row, desc };
    });
    const setTotal = stat(root, "Rubric total (max 16)", "—", "accent");
    const setGrade = stat(root, "Approximate grade (0 to 100)", "—");
    const setWeak = stat(root, "Lowest criterion", "—", "warn");
    const noteEl = note(root, "");
    let lastTotal = 0;
    function update() {
      const total = scores.reduce((a, b) => a + b + 1, 0);
      const grade = Math.round(((total - 4) / 12) * 100);
      const el = root.querySelector(".vc-stats strong");
      if (el) motion.count(el, lastTotal, total, (v) => String(Math.round(v)));
      lastTotal = total;
      setGrade(String(grade), grade >= 55 ? "ok" : "bad");
      let mi = 0; scores.forEach((s, i) => { if (s < scores[mi]) mi = i; });
      setWeak(CRIT[mi].k);
      rows.forEach((r, i) => r.row.style.borderColor = i === mi ? "var(--vc-warn)" : "");
      noteEl.innerHTML = `Total ${total} of 16, about ${grade}/100${grade >= 55 ? " (pass)" : " (below 55, not a pass)"}. The cheapest move tonight is <strong>${CRIT[mi].k}</strong>, level ${scores[mi] + 1}: ${CRIT[mi].fix}`;
      noteEl.className = "vc-note " + (grade >= 70 ? "is-ok" : grade >= 55 ? "" : "is-bad");
    }
    update();
  });

  /* ================================================================
     c5-moats · Defensibility meter
     ================================================================ */
  register("c5-moats", function (root) {
    panel(root, "What survives when a competitor copies QuoteDesk",
      "Toggle what Cerro Azul has. The meter shows how defensible the position is. Notice what the app itself contributes.");
    const ITEMS = [
      { k: "Proprietary data", w: 32, on: true, why: "1,800 customers' histories, the catalog's local names, three months of rep corrections. Accumulates with use; cannot be copied with the code." },
      { k: "Distribution", w: 22, on: false, why: "The 14 reps already use it daily. A competitor has to win the reps before the customers." },
      { k: "Workflow integration", w: 24, on: false, why: "Writes into the ERP, respects the price list and the approval rules. Encodes how Cerro Azul operates." },
      { k: "Trust and compliance", w: 20, on: false, why: "Test set, risk memo, personal data under Ley 21.719, a rep approving every quote. Slow to earn, does not travel with the code." },
      { k: "The app itself", w: 2, on: true, why: "A weekend with the same assistant. Rented model, generated code. Worth almost nothing on its own." },
    ];
    const chips = h("div", { class: "vc-chips" });
    root.append(chips);
    const bar = svg("svg", { viewBox: "0 0 640 60", class: "vc-plot", role: "img", "aria-label": "Defensibility meter" });
    bar.append(svg("rect", { x: 10, y: 18, width: 620, height: 20, rx: 10, fill: "var(--hz-line)" }));
    const fill = svg("rect", { x: 10, y: 18, width: 0, height: 20, rx: 10, class: "bar-alt" });
    bar.append(fill);
    [0, 25, 50, 75, 100].forEach((p) => bar.append(svg("text", { x: 10 + 6.2 * p, y: 54, "text-anchor": p === 0 ? "start" : p === 100 ? "end" : "middle", class: "muted" }, p + "%")));
    root.append(bar);
    const setScore = stat(root, "Defensibility", "—", "accent");
    const setApp = stat(root, "Contribution of the app itself", "—");
    const setTime = stat(root, "Time for a rival to catch up", "—", "warn");
    const noteEl = note(root, "");
    let last = 0;
    function update() {
      const score = ITEMS.filter((i) => i.on).reduce((a, i) => a + i.w, 0);
      motion.attr(fill, "width", 6.2 * score);
      const el = root.querySelectorAll(".vc-stats strong")[0];
      motion.count(el, last, score, (v) => Math.round(v) + "%"); last = score;
      const app = ITEMS[4].on ? "2 points" : "0 points";
      setApp(app);
      const months = score < 10 ? "one weekend" : score < 35 ? "a few weeks" : score < 60 ? "6 to 12 months" : score < 85 ? "two to three years" : "years, if at all";
      setTime(months, score < 35 ? "bad" : score < 60 ? "warn" : "ok");
      fill.setAttribute("class", score < 35 ? "bar" : "bar-alt");
      fill.style.fill = score < 35 ? "var(--vc-bad)" : score < 60 ? "var(--vc-warn)" : "var(--vc-ok)";
      const on = ITEMS.filter((i) => i.on && i.k !== "The app itself").map((i) => i.k);
      noteEl.innerHTML = on.length === 0
        ? "With only the app, defensibility is 2%: a rival with the same assistant catches up in a weekend. The code was never the moat."
        : `Defensibility ${score}%. What a rival cannot copy in a weekend: <strong>${on.join(", ")}</strong>. ${ITEMS[4].on ? "The app itself adds 2 points." : "The app itself is off and the score barely moved."}`;
      noteEl.className = "vc-note " + (score < 35 ? "is-bad" : score < 60 ? "is-warn" : "is-ok");
    }
    ITEMS.forEach((it) => {
      const c = h("button", { type: "button", class: "vc-chip is-pick", "aria-pressed": String(it.on), title: it.why }, `${it.k} · ${it.w}`);
      c.addEventListener("click", () => { it.on = !it.on; c.setAttribute("aria-pressed", String(it.on)); motion.pop(c); why.textContent = it.why; update(); });
      chips.append(c);
    });
    const why = h("p", { style: { fontSize: "0.82rem", color: "var(--hz-muted)", margin: "0 0 0.6rem" } }, "Hover or click a chip to read why it counts. The number is its weight in the meter.");
    chips.after(why);
    update();
  });

  /* ================================================================
     c5-roadmap · Prototype-to-production roadmap builder
     ================================================================ */
  register("c5-roadmap", function (root) {
    panel(root, "Put QuoteDesk's road to production in order",
      "Move the cards up or down, then check. The exact order is debatable at the edges; the two classic mistakes are not.");
    const STEPS = [
      { id: 0, k: "Pilot with real users and the metric", d: "Three reps, two weeks, quotes per rep per day measured against the brief." },
      { id: 1, k: "Close the risk findings", d: "Key on the server, authorization tested, discounts need human approval." },
      { id: 2, k: "Engineering review and handoff decision", d: "The five questions from session 4: rebuild, harden or keep." },
      { id: 3, k: "An owner and a budget", d: "Company API account with a limit; a name on the tool." },
      { id: 4, k: "Data protection and retention policy", d: "Purpose and retention for customer names, phones, addresses, written down." },
      { id: 5, k: "Monitoring and the test set in production", d: "Extraction quality measured every week, not once." },
      { id: 6, k: "Training and rollout to the 14 reps", d: "Two waves; the first wave trains the second." },
      { id: 7, k: "Scaling, integration depth, cost optimization", d: "Now that you know what you are scaling." },
    ];
    // Start shuffled deterministically (a plausible wrong order)
    let order = [7, 6, 1, 0, 3, 2, 5, 4];
    const list = h("ol", { class: "vc-timeline", style: { flexDirection: "column", flexWrap: "nowrap" } });
    root.append(list);
    const ctl = h("div", { class: "vc-buttons" });
    root.append(ctl);
    const setOk = stat(root, "Cards in a sensible place", "—", "accent");
    const noteEl = note(root, "Two teams out of three start with scaling. Order the cards, then press Check.");
    function render() {
      list.innerHTML = "";
      order.forEach((id, pos) => {
        const s = STEPS[id];
        const li = h("li", { tabindex: "0", style: { flex: "none", display: "grid", gridTemplateColumns: "2rem 1fr auto", gap: "0.4rem", alignItems: "center" } },
          h("strong", {}, String(pos + 1)),
          h("span", {}, h("span", { style: { fontWeight: 600, display: "block" } }, s.k), h("span", { style: { color: "var(--hz-muted)" } }, s.d)),
          h("span", { class: "vc-buttons", style: { margin: 0 } },
            h("button", { type: "button", class: "vc-btn vc-btn-ghost vc-btn-sm", "aria-label": "Move up", disabled: pos === 0, onclick: () => move(pos, -1) }, "↑"),
            h("button", { type: "button", class: "vc-btn vc-btn-ghost vc-btn-sm", "aria-label": "Move down", disabled: pos === order.length - 1, onclick: () => move(pos, 1) }, "↓")));
        list.append(li);
      });
    }
    function move(pos, dir) {
      const np = pos + dir;
      [order[pos], order[np]] = [order[np], order[pos]];
      render();
      const li = list.children[np];
      motion.anim(li, { y: [dir * -18, 0], opacity: [0.6, 1] }, { duration: motion.DUR.std, ease: motion.EASE.back });
      list.querySelectorAll("li").forEach((l) => l.classList.remove("is-head", "is-bad"));
      setOk("—");
    }
    function check() {
      let ok = 0; const bad = [];
      order.forEach((id, pos) => {
        const good = Math.abs(id - pos) <= 1;
        const li = list.children[pos];
        li.classList.toggle("is-head", good); li.classList.toggle("is-bad", !good);
        if (good) ok++; else bad.push({ id, pos });
      });
      setOk(`${ok} of 8`, ok === 8 ? "ok" : ok >= 5 ? "warn" : "bad");
      motion.stagger(list.querySelectorAll("li"), { kf: { opacity: [0.5, 1] }, step: 0.04 });
      const msgs = [];
      if (order[0] === 7) msgs.push("Scaling first spends money on a tool whose value is still a hypothesis.");
      if (order.indexOf(0) > 2) msgs.push("The pilot with the metric should be near the top: it tells you whether to spend on everything else.");
      if (order.indexOf(2) > order.indexOf(6)) msgs.push("Rolling out to 14 reps before the engineering review is the 'tool nobody else understands' mistake.");
      if (order.indexOf(1) > order.indexOf(6)) msgs.push("Reps and customer data in front of an open authorization bug: close the findings before rollout.");
      if (order.indexOf(3) > order.indexOf(6)) msgs.push("Rollout without an owner and a budget means the tool lives on someone's personal account.");
      if (ok === 8) noteEl.innerHTML = "All eight within one position of the recommended order. Pilot and measure, close risks, get a review and an owner, protect data, monitor, roll out, then scale.";
      else noteEl.innerHTML = `${ok} of 8 cards within one position of the recommended order. ${msgs.length ? msgs.join(" ") : "Close. Cards marked in red are more than one place off."}`;
      noteEl.className = "vc-note " + (ok === 8 ? "is-ok" : ok >= 5 ? "is-warn" : "is-bad");
      if (ok === 8) motion.pop(noteEl);
    }
    btn(ctl, "Check my order", check, "vc-btn-accent");
    btn(ctl, "Show the recommended order", () => { order = [0, 1, 2, 3, 4, 5, 6, 7]; render(); check(); }, "vc-btn-ghost");
    btn(ctl, "Shuffle again", () => { order = [5, 7, 2, 1, 6, 0, 4, 3]; render(); setOk("—"); noteEl.className = "vc-note"; noteEl.textContent = "Order the cards, then press Check."; }, "vc-btn-ghost vc-btn-sm");
    render();
  });

  /* ================================================================
     c5-reflection · Reflection memo builder
     ================================================================ */
  register("c5-reflection", function (root) {
    panel(root, "Reflection memo builder",
      "Five prompts, one paragraph each, with a concrete moment from your build log in every one. 500 to 800 words. Copy it out before closing the tab.", "accent");
    const PARTS = [
      { k: "What the AI did", ph: "What the assistant produced that you could not have: the first deployed version in 40 minutes, the extraction table, the ERP connector. Cite a date and what you typed." },
      { k: "What I decided", ph: "The decisions that were yours: which problem, which user story first, where the guardrail goes, who approves discounts. Cite the moment in the log." },
      { k: "Where it misled me", ph: "The time it said the tests passed and they had not, the dependency that did not exist, the confident wrong answer about the delivery policy. The prompt, the output, how you noticed." },
      { k: "What I would do differently", ph: "Smaller steps, a test set in week one, a checkpoint before every risky change, a brief revisited after the pilot. Be specific." },
      { k: "How this changes my work with technology teams", ph: "What you will now ask for, what you will build yourself, what you will stop asking for, and how you will judge what an engineering team tells you." },
    ];
    const fields = [];
    const c = controls(root);
    c.style.gridTemplateColumns = "1fr";
    PARTS.forEach((p) => {
      const t = text(c, p.k, { placeholder: p.ph, multiline: true }, update);
      t.style.minHeight = "6rem";
      fields.push({ k: p.k, el: t });
    });
    const ctl = h("div", { class: "vc-buttons" });
    root.append(ctl);
    const setWords = stat(root, "Words", "0", "accent");
    const setParts = stat(root, "Parts with text", "0 of 5");
    const setEvidence = stat(root, "Parts citing a moment (date, time or a quoted prompt)", "0 of 5", "warn");
    const out = h("div", { class: "vc-prompt is-ai", style: { marginTop: "0.8rem" } }, h("div", { class: "vc-prompt-h" }, "Your memo, assembled"), h("div", { class: "vc-prompt-b" }, ""));
    root.append(out);
    const body = out.querySelector(".vc-prompt-b");
    const noteEl = note(root, "");
    let lastWords = 0;
    const hasEvidence = (s) => /\b(20\d\d|\d{1,2}\/\d{1,2}|\d{1,2}:\d{2}|session \d|day \d|week \d|typed|prompt|asked it|"[^"]{8,}")\b/i.test(s) || /"[^"]{8,}"/.test(s);
    function assemble() {
      return fields.map((f) => f.el.value.trim() ? `${f.k}\n${f.el.value.trim()}` : "").filter(Boolean).join("\n\n");
    }
    function update() {
      const memo = assemble();
      const words = memo ? memo.split(/\s+/).filter(Boolean).length : 0;
      const parts = fields.filter((f) => f.el.value.trim()).length;
      const ev = fields.filter((f) => hasEvidence(f.el.value)).length;
      const wEl = root.querySelectorAll(".vc-stats strong")[0];
      motion.count(wEl, lastWords, words, (v) => fmt(v), motion.DUR.std); lastWords = words;
      setWords(fmt(words), words < 500 ? "warn" : words > 800 ? "bad" : "ok");
      setParts(`${parts} of 5`, parts === 5 ? "ok" : undefined);
      setEvidence(`${ev} of 5`, ev === 5 ? "ok" : ev >= 3 ? "warn" : "bad");
      body.textContent = memo || "Nothing yet. Start with the part you remember most clearly, usually where it misled you.";
      let msg;
      if (words === 0) msg = "Empty. The memo is graded on honesty and specificity, not on how well QuoteDesk works.";
      else if (parts < 5) msg = `${parts} of 5 parts written, ${fmt(words)} words. Every part needs a paragraph; the grader reads the five headings first.`;
      else if (ev < 5) msg = `All five parts written, ${fmt(words)} words. ${5 - ev} part${5 - ev > 1 ? "s" : ""} still without a concrete moment: add a date, a session number or the exact prompt in quotes.`;
      else if (words < 500) msg = `All parts written with evidence, ${fmt(words)} words. Under 500: expand the moments, say what you saw and what you did next.`;
      else if (words > 800) msg = `${fmt(words)} words, over 800. Cut the parts that describe the product; the memo is about what you learned.`;
      else msg = `${fmt(words)} words, five parts, five concrete moments. Copy it and submit.`;
      noteEl.textContent = msg;
      noteEl.className = "vc-note " + (parts === 5 && ev === 5 && words >= 500 && words <= 800 ? "is-ok" : parts === 5 ? "is-warn" : "");
    }
    const copyBtn = btn(ctl, "Copy memo", async () => {
      const memo = assemble();
      if (!memo) { motion.shake(copyBtn); return; }
      try { await navigator.clipboard.writeText(memo); copyBtn.textContent = "Copied"; motion.pop(copyBtn); setTimeout(() => (copyBtn.textContent = "Copy memo"), 1600); }
      catch (e) { body.focus(); copyBtn.textContent = "Select and copy from below"; setTimeout(() => (copyBtn.textContent = "Copy memo"), 2000); }
    }, "vc-btn-accent");
    btn(ctl, "Clear", () => { fields.forEach((f) => (f.el.value = "")); update(); }, "vc-btn-ghost vc-btn-sm");
    update();
  });
})();
