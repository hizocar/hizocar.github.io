/* widgets-class3.js — Class 3 · Add intelligence, then prove it works
   c3-call     · anatomy of a model call: tokens, latency, cost, structured output, model size
   c3-cost     · monthly cost calculator vs. hours of rep time saved (payback)
   c3-patterns · pattern picker: classification / extraction / summarization / assistant
   c3-rag      · retrieval demo: with vs without retrieval, number of chunks
   c3-eval     · evaluation set of 24 messages, guardrail, pass rate vs review workload */
(function () {
  "use strict";
  const { h, svg, motion, sleep, panel, controls, slider, select, text, btn, buttons, stat, note, runFlow, register } = window.VC;

  const usd = (v, d = 2) => "US$ " + v.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
  const clp = (v) => "CLP " + Math.round(v).toLocaleString("en-US");
  const n0 = (v) => Math.round(v).toLocaleString("en-US");
  function rng(seed) {
    let a = seed >>> 0;
    return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }

  /* Illustrative prices per million tokens (input / output). They change often; the page says so. */
  const MODELS = {
    small:  { label: "Small",  pin: 0.25, pout: 1.25, lat: 0.9, quality: 0.86 },
    medium: { label: "Medium", pin: 3,    pout: 15,   lat: 2.1, quality: 0.94 },
    large:  { label: "Large",  pin: 15,   pout: 75,   lat: 4.8, quality: 0.97 },
  };

  /* =====================================================================
     c3-call · anatomy of a model call
     ===================================================================== */
  register("c3-call", function (root) {
    panel(root, "Anatomy of a model call", "QuoteDesk sends the rep's pasted message to a model and gets back a table. Press <b>Send</b> and watch what you are paying for.", "ai");
    const SYSTEM = "You extract order lines from a customer message for a food distributor. Return JSON with product, quantity, unit and confidence (0 to 1). Do not invent products.";
    const MSG = "hola, necesito 20 cajas de aceite 900cc, 5 sacos de arroz y lo de siempre de lácteos para el jueves";
    let model = "medium";
    const ctr = controls(root);
    buttons(ctr, Object.keys(MODELS).map((k) => ({ label: MODELS[k].label + " model", value: k })), (v) => { model = v; draw(); }, model);

    const req = h("div", { class: "vc-prompt is-strong" },
      h("div", { class: "vc-prompt-h" }, "Request · system instructions + the pasted message"),
      h("div", { class: "vc-prompt-b" }, "System: " + SYSTEM + "\n\nMessage: " + MSG));
    root.append(req);
    const bar = h("div", { class: "vc-buttons" });
    root.append(bar);
    const sIn = stat(root, "Tokens in", "—");
    const sOut = stat(root, "Tokens out", "—");
    const sLat = stat(root, "Latency", "—", "is-accent");
    const sCost = stat(root, "Cost of this call", "—", "is-accent");
    const sQ = stat(root, "Expected quality", "—", "is-ok");
    const term = h("div", { class: "vc-term" }, h("span", { class: "dim" }, "Waiting. Press Send to run the call."));
    root.append(term);
    const app = h("div", { class: "vc-app" },
      h("div", { class: "vc-app-bar" }, h("i"), h("i"), h("i"), h("span", { class: "url" }, "quotedesk.app/quotes/new")),
      h("div", { class: "vc-app-body" }, h("h4", {}, "Extracted lines"), h("p", { style: { color: "#6b6359", fontSize: "0.8rem" } }, "Nothing extracted yet.")));
    root.append(app);
    const out = note(root, "");

    const TOK_IN = 118, TOK_OUT = 96;
    const lines = [
      ["Aceite 900 cc", "20", "cajas", 0.97],
      ["Arroz", "5", "sacos", 0.92],
      ["Lácteos (lo de siempre)", "?", "?", 0.38],
    ];
    function cost(k) { const m = MODELS[k]; return (TOK_IN * m.pin + TOK_OUT * m.pout) / 1e6; }
    function draw() {
      const m = MODELS[model];
      sLat(m.lat.toFixed(1) + " s");
      sCost(usd(cost(model), 4));
      sQ(Math.round(m.quality * 100) + "%");
      out.innerHTML = `With the <b>${m.label.toLowerCase()}</b> model one extraction costs <b>${usd(cost(model), 4)}</b> and takes about <b>${m.lat.toFixed(1)} s</b>. A rep retyping the same message takes about 4 minutes. The question is never the cost of one call; it is the cost of a month of calls, which the next simulator shows.`;
    }
    let busy = false;
    btn(bar, "Send", async () => {
      if (busy) return; busy = true;
      const m = MODELS[model];
      sIn("—"); sOut("—");
      const body = app.querySelector(".vc-app-body");
      body.innerHTML = ""; body.append(h("h4", {}, "Extracted lines"), h("div", { class: "skeleton", style: { width: "70%" } }), h("div", { class: "skeleton", style: { width: "55%" } }), h("div", { class: "skeleton", style: { width: "62%" } }));
      term.innerHTML = "";
      await motion.type(term, [
        `<span class="dim">POST /v1/messages  model=${model}</span>`,
        `<span class="acc">→ counting input tokens…</span>`,
      ], { cps: 90, lineDelay: 120 });
      const strongIn = root.querySelectorAll(".vc-stat strong")[0];
      await motion.count(strongIn, 0, TOK_IN, (v) => n0(v));
      await motion.type(term, [`<span class="dim">input: ${TOK_IN} tokens (instructions ${TOK_IN - 41} + message 41)</span>`, `<span class="acc">→ model thinking ${m.lat.toFixed(1)} s…</span>`], { cps: 90, lineDelay: 120 });
      await sleep(motion.reduced() ? 0 : Math.min(1400, m.lat * 300));
      const strongOut = root.querySelectorAll(".vc-stat strong")[1];
      await motion.count(strongOut, 0, TOK_OUT, (v) => n0(v));
      term.append(h("span", { class: "ok" }, `output: ${TOK_OUT} tokens · cost ${usd(cost(model), 4)} · 200 OK\n`));
      body.innerHTML = "";
      body.append(h("h4", {}, "Extracted lines"));
      const rows = lines.map(([p, q, u, c]) => {
        const low = c < 0.6;
        return h("div", { class: "row", style: { opacity: 0 } },
          h("span", { class: "field" }, p), h("span", { class: "field", style: { flex: "0 0 3rem" } }, q), h("span", { class: "field", style: { flex: "0 0 4rem" } }, u),
          h("span", { class: "pill " + (low ? "warn" : "ok") }, low ? "review · " + Math.round(c * 100) + "%" : Math.round(c * 100) + "%"));
      });
      body.append(...rows);
      await motion.stagger(rows, { step: 0.08 });
      busy = false;
    }, "vc-btn-accent");
    btn(bar, "Reset", () => { term.innerHTML = ""; term.append(h("span", { class: "dim" }, "Waiting. Press Send to run the call.")); sIn("—"); sOut("—"); app.querySelector(".vc-app-body").innerHTML = "<h4>Extracted lines</h4><p style='color:#6b6359;font-size:0.8rem'>Nothing extracted yet.</p>"; }, "vc-btn-ghost");
    draw();
  });

  /* =====================================================================
     c3-cost · monthly cost vs. rep time saved
     ===================================================================== */
  register("c3-cost", function (root) {
    panel(root, "What a month of calls costs, and what it saves", "Illustrative prices per million tokens. Move the sliders to your own numbers.", "accent");
    const st = { perDay: 90, tokIn: 600, tokOut: 150, model: "medium", minSaved: 4, rate: 9000, days: 22 };
    const ctr = controls(root);
    slider(ctr, "Quote requests per day", { min: 10, max: 1000, step: 10, value: st.perDay, fmt: n0 }, (v) => { st.perDay = v; draw(); });
    slider(ctr, "Tokens in per request", { min: 100, max: 4000, step: 50, value: st.tokIn, fmt: n0 }, (v) => { st.tokIn = v; draw(); });
    slider(ctr, "Tokens out per request", { min: 50, max: 2000, step: 50, value: st.tokOut, fmt: n0 }, (v) => { st.tokOut = v; draw(); });
    slider(ctr, "Minutes of rep time saved per request", { min: 0, max: 15, step: 0.5, value: st.minSaved, fmt: (v) => v + " min" }, (v) => { st.minSaved = v; draw(); });
    slider(ctr, "Loaded cost of a rep per hour (CLP)", { min: 4000, max: 25000, step: 500, value: st.rate, fmt: clp }, (v) => { st.rate = v; draw(); });
    buttons(root, Object.keys(MODELS).map((k) => ({ label: `${MODELS[k].label} · ${usd(MODELS[k].pin, 2)} in / ${usd(MODELS[k].pout, 2)} out per M tokens`, value: k })), (v) => { st.model = v; draw(); }, st.model);

    const W = 640, H = 170, pad = { l: 150, r: 110, t: 18, b: 10 };
    const plot = svg("svg", { class: "vc-plot", viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": "Monthly AI cost versus monthly value of rep time saved" });
    const bars = [
      { cls: "bar-alt", label: "AI cost per month (USD)", y: 30 },
      { cls: "bar", label: "Rep time saved per month (USD)", y: 95 },
    ].map((b) => {
      const g = svg("g", {});
      g.append(svg("text", { x: pad.l - 8, y: b.y + 24, "text-anchor": "end" }, b.label));
      const rect = svg("rect", { x: pad.l, y: b.y, width: 0, height: 36, rx: 6, class: b.cls });
      const val = svg("text", { x: pad.l + 6, y: b.y + 24, class: "muted" }, "");
      g.append(rect, val); plot.append(g);
      return { rect, val };
    });
    root.append(plot);
    const sCost = stat(root, "AI cost per month", "—", "is-accent");
    const sSave = stat(root, "Rep time saved per month", "—", "is-ok");
    const sHours = stat(root, "Hours freed per month", "—");
    const sRatio = stat(root, "Value ÷ cost", "—", "is-ok");
    const out = note(root, "");
    const USD_CLP = 950;
    function draw() {
      const m = MODELS[st.model];
      const calls = st.perDay * st.days;
      const costUsd = calls * (st.tokIn * m.pin + st.tokOut * m.pout) / 1e6;
      const hours = calls * st.minSaved / 60;
      const savedClp = hours * st.rate;
      const savedUsd = savedClp / USD_CLP;
      const max = Math.max(costUsd, savedUsd, 1);
      const scale = (W - pad.l - pad.r) / max;
      motion.attr(bars[0].rect, "width", Math.max(2, costUsd * scale));
      motion.attr(bars[1].rect, "width", Math.max(2, savedUsd * scale));
      bars[0].val.textContent = usd(costUsd, 0); bars[0].val.setAttribute("x", pad.l + Math.max(2, costUsd * scale) + 6);
      bars[1].val.textContent = usd(savedUsd, 0); bars[1].val.setAttribute("x", pad.l + Math.max(2, savedUsd * scale) + 6);
      sCost(usd(costUsd, 0));
      sSave(clp(savedClp) + " (" + usd(savedUsd, 0) + ")");
      sHours(n0(hours) + " h");
      const ratio = costUsd > 0 ? savedUsd / costUsd : 0;
      sRatio(ratio >= 100 ? "> 100×" : ratio.toFixed(1) + "×", ratio >= 3 ? "ok" : ratio >= 1 ? "warn" : "bad");
      out.innerHTML = ratio >= 3
        ? `At ${n0(calls)} requests a month, the <b>${m.label.toLowerCase()}</b> model costs <b>${usd(costUsd, 0)}</b> and frees <b>${n0(hours)} hours</b> of rep time worth <b>${clp(savedClp)}</b>. The model is not where the money is; the question is whether the extraction is right often enough that reps actually stop retyping.`
        : ratio >= 1
        ? `The AI bill (<b>${usd(costUsd, 0)}</b>) is close to the value of the time saved. Try the small model, or fewer tokens in: long instructions and pasted history are paid on every call.`
        : `At these numbers the model costs more than it saves. Either the volume is too low to matter (then build it for the quality, not the savings) or the request is too long. Cut the tokens before cutting the feature.`;
    }
    draw();
  });

  /* =====================================================================
     c3-patterns · pattern picker
     ===================================================================== */
  register("c3-patterns", function (root) {
    panel(root, "Which pattern fits the task?", "Eight tasks from Cerro Azul and other businesses. Pick the pattern you would ask the assistant to build. Four patterns cover most business cases.", "ai");
    const P = { cls: "Classification", ext: "Extraction", sum: "Summarization", ast: "Assistant" };
    const TASKS = [
      { t: "Turn a pasted WhatsApp order into product, quantity and unit lines", a: "ext", why: "The output has a fixed shape (a table). That is extraction with structured output." },
      { t: "Route each incoming customer email to sales, billing or logistics", a: "cls", why: "One label from a short, fixed list per message. Classification, easy to test." },
      { t: "Give the sales manager a one-paragraph digest of 40 complaint tickets every Monday", a: "sum", why: "Many inputs to one short text for a human to read. Summarization." },
      { t: "Let reps ask 'what is the delivery policy for Rancagua on Saturdays?'", a: "ast", why: "Open questions in natural language, answered over documents. A conversational assistant with retrieval." },
      { t: "Flag which dental appointment requests are urgent", a: "cls", why: "Urgent or not urgent is a label. Classification, and a human decides on the flagged ones." },
      { t: "Pull name, RUT, start date and rate out of contractor PDFs into the HR system", a: "ext", why: "Fields with a known shape from unstructured documents: extraction." },
      { t: "Group 3,000 product reviews into the five most common themes", a: "sum", why: "Reduce a large body of text to what a manager can read. Summarization (with counts)." },
      { t: "Help a new rep draft a reply to a customer asking for a credit extension", a: "ast", why: "Open-ended drafting with context and back-and-forth: an assistant, with a human sending the final text." },
    ];
    const cards = h("div", { class: "vc-cards" });
    let answered = 0, right = 0;
    const sScore = stat(root, "Score", "0 of 8");
    const out = note(root, "Each task has one pattern that fits best. The pattern decides how you test it: labels are counted, tables are compared field by field, summaries are judged by a reader, assistants need a question set.");
    TASKS.forEach((task, i) => {
      const card = h("div", { class: "vc-card" }, h("strong", {}, task.t));
      const row = h("div", { class: "vc-buttons" });
      const fb = h("p", { class: "vc-note", style: { display: "none", marginTop: "0.4rem" } });
      Object.entries(P).forEach(([k, label]) => {
        const b = h("button", { type: "button", class: "vc-btn vc-btn-ghost vc-btn-sm" }, label);
        b.addEventListener("click", () => {
          if (card.dataset.done) return;
          card.dataset.done = "1"; answered++;
          const ok = k === task.a;
          if (ok) right++;
          row.querySelectorAll("button").forEach((x) => { x.disabled = true; if (x === b) x.setAttribute("aria-pressed", "true"); });
          fb.style.display = "block";
          fb.classList.add(ok ? "is-ok" : "is-bad");
          fb.innerHTML = (ok ? "Yes. " : `Not quite: this is <b>${P[task.a]}</b>. `) + task.why;
          ok ? motion.pop(card) : motion.shake(card);
          motion.enter(fb);
          sScore(`${right} of ${answered}` + (answered === 8 ? " · done" : ""), answered === 8 ? (right >= 6 ? "ok" : "warn") : undefined);
          if (answered === 8) out.innerHTML = right === 8 ? "All eight. Notice that the pattern also sets the evaluation: that is why we choose it before building." : `${right} of 8. The common confusion is extraction vs. classification: if the answer is a label, classify; if it is a table with fields, extract.`;
        });
        row.append(b);
      });
      card.append(row, fb);
      cards.append(card);
    });
    root.append(cards);
    btn(root, "↺ Reset", () => { cards.querySelectorAll(".vc-card").forEach((c) => { delete c.dataset.done; c.querySelectorAll("button").forEach((b) => { b.disabled = false; b.removeAttribute("aria-pressed"); }); const f = c.querySelector(".vc-note"); f.style.display = "none"; f.className = "vc-note"; }); answered = 0; right = 0; sScore("0 of 8"); }, "vc-btn-ghost vc-btn-sm");
  });

  /* =====================================================================
     c3-rag · retrieval demo
     ===================================================================== */
  register("c3-rag", function (root) {
    panel(root, "Answering over company documents", "A rep asks QuoteDesk about delivery policy. Compare the answer with and without retrieval, then see what more chunks cost.", "ai");
    const CHUNKS = [
      { id: "policy-04", title: "Delivery policy · Region VI (Rancagua, San Fernando)", text: "Deliveries Monday to Friday. Saturday deliveries only for orders above CLP 350,000 confirmed before Thursday 16:00.", score: 0.91 },
      { id: "policy-02", title: "Delivery policy · minimum order", text: "Minimum order for free delivery: CLP 120,000. Below that, a CLP 9,900 fee applies in all regions.", score: 0.74 },
      { id: "price-list-2026-10", title: "Price list · October 2026 · dairy", text: "Leche entera 1 L caja ×12: CLP 11,880. Yogurt 1 L ×6: CLP 8,340.", score: 0.41 },
      { id: "policy-07", title: "Returns · perishable goods", text: "Perishables can be returned only on delivery, in front of the driver.", score: 0.33 },
      { id: "faq-13", title: "FAQ · holidays", text: "No deliveries on national holidays. Orders move to the next business day.", score: 0.29 },
    ];
    const Q = "Can we deliver to a restaurant in Rancagua on Saturday?";
    let withRag = true, k = 2;
    const ctr = controls(root);
    buttons(ctr, [{ label: "With retrieval", value: true }, { label: "Without retrieval", value: false }], (v) => { withRag = v; draw(); }, true);
    const kSlider = slider(ctr, "Chunks retrieved per question", { min: 1, max: 5, step: 1, value: k, fmt: n0 }, (v) => { k = v; draw(); });
    root.append(h("div", { class: "vc-prompt is-strong" }, h("div", { class: "vc-prompt-h" }, "Rep asks"), h("div", { class: "vc-prompt-b" }, Q)));
    const flow = h("div", { class: "vc-flow" });
    const steps = ["Question", "Search the documents", "Attach the best chunks", "Model answers", "Answer with citations"].map((s) => h("div", { class: "vc-flow-step" }, h("strong", {}, s)));
    flow.append(...steps); root.append(flow);
    const chunksBox = h("div", {}); root.append(chunksBox);
    const ans = h("div", { class: "vc-prompt is-ai" }, h("div", { class: "vc-prompt-h" }, "QuoteDesk answers"), h("div", { class: "vc-prompt-b" }, ""));
    root.append(ans);
    const sTok = stat(root, "Tokens in per question", "—");
    const sCost = stat(root, "Cost per 1,000 questions (medium)", "—", "is-accent");
    const sRecall = stat(root, "Chance the right chunk is included", "—", "is-ok");
    const sVer = stat(root, "Verifiable by the rep?", "—");
    const out = note(root, "");
    const recall = [0.62, 0.84, 0.93, 0.97, 0.99];
    async function draw() {
      chunksBox.innerHTML = "";
      const body = ans.querySelector(".vc-prompt-b");
      if (!withRag) {
        steps.forEach((s) => s.classList.remove("is-on", "is-done")); steps[0].classList.add("is-done"); steps[3].classList.add("is-done"); steps[1].classList.add("is-bad"); steps[2].classList.add("is-bad");
        body.textContent = "";
        await motion.type(body, "Yes, Cerro Azul delivers to Rancagua on Saturdays between 9:00 and 14:00 for all customers. Just confirm the order by Friday noon.", { cps: 70 });
        chunksBox.append(h("p", { class: "vc-note is-bad" }, "Fluent, confident, and <b>wrong</b>: Saturday deliveries in Region VI require an order above CLP 350,000 confirmed by Thursday 16:00. The model never saw the policy; it filled the gap with a plausible sentence. That is a hallucination, and nothing in the text warns the rep."));
        sTok(n0(160)); sCost(usd(1000 * (160 * 3 + 60 * 15) / 1e6, 2)); sRecall("0%", "bad"); sVer("No", "bad");
        out.innerHTML = "Without retrieval the answer costs almost nothing and is worth less than nothing: a rep who trusts it promises a delivery the company cannot make.";
        kSlider.disabled = true;
        return;
      }
      kSlider.disabled = false;
      runFlow(steps, { every: 300 });
      const picked = CHUNKS.slice(0, k);
      const list = h("div", { class: "vc-cards" });
      picked.forEach((c) => list.append(h("div", { class: "vc-card", style: { opacity: 0 } }, h("strong", {}, c.id + " · match " + Math.round(c.score * 100) + "%"), h("span", { style: { fontSize: "0.78rem", color: "var(--hz-muted)" } }, c.title), h("p", { style: { margin: "0.3rem 0 0" } }, c.text))));
      chunksBox.append(h("p", { class: "vc-widget-sub", style: { marginTop: "0.4rem" } }, `Top ${k} chunk${k > 1 ? "s" : ""} by similarity to the question (out of 412 in the company documents):`), list);
      await motion.stagger(list.children, { step: 0.07 });
      body.textContent = "";
      await motion.type(body, "Only if the order is above CLP 350,000 and it is confirmed before Thursday at 16:00 [policy-04]." + (k >= 2 ? " Below CLP 120,000 a CLP 9,900 delivery fee applies in any case [policy-02]." : ""), { cps: 70 });
      const tok = 160 + picked.reduce((a, c) => a + 90, 0);
      sTok(n0(tok)); sCost(usd(1000 * (tok * 3 + 70 * 15) / 1e6, 2));
      sRecall(Math.round(recall[k - 1] * 100) + "%", recall[k - 1] >= 0.9 ? "ok" : "warn"); sVer("Yes · click the citation", "ok");
      out.innerHTML = k <= 2
        ? `With ${k} chunk${k > 1 ? "s" : ""} the answer is right and cites its source, but ${Math.round((1 - recall[k - 1]) * 100)}% of the time the right chunk is not among the top ${k}. More chunks raise recall and the bill.`
        : k >= 5
        ? `Five chunks: recall ${Math.round(recall[4] * 100)}%, but the question now costs ${Math.round(((160 + 450) / 160 - 1) * 100)}% more tokens than with none, and irrelevant chunks (dairy prices, returns) can confuse the model. Retrieval is tuned, not maximized.`
        : `Three or four chunks is the usual sweet spot for policy questions: recall above 90% at a modest cost. The real test is the question set you build in the evaluation simulator below.`;
    }
    draw();
  });

  /* =====================================================================
     c3-eval · evaluation set with guardrail
     ===================================================================== */
  register("c3-eval", function (root) {
    panel(root, "Prove it works: the test set", "24 real customer messages with the lines a rep would expect. Run the extraction, then add the guardrail and run again.", "ok");
    const r = rng(2026);
    /* each example: confidence the model has in its own extraction, and whether the extraction was actually correct */
    const EX = Array.from({ length: 24 }, (_, i) => {
      const conf = i < 15 ? 0.8 + r() * 0.19 : i < 20 ? 0.55 + r() * 0.25 : 0.25 + r() * 0.3;
      const correct = i < 15 ? r() > 0.08 : i < 20 ? r() > 0.4 : r() > 0.75;
      return { id: i + 1, conf, correct, hard: i >= 20 };
    });
    const THR = 0.6;
    let guard = false, ran = false;
    const ctr = controls(root);
    buttons(ctr, [{ label: "No guardrail", value: false }, { label: "Guardrail: flag lines below 60% confidence for review", value: true }], (v) => { guard = v; if (ran) run(); }, false);
    const bar = h("div", { class: "vc-buttons" }); root.append(bar);
    const chips = h("div", { class: "vc-chips" }); root.append(chips);
    const chipEls = EX.map((e) => h("span", { class: "vc-chip", title: `message ${e.id} · confidence ${Math.round(e.conf * 100)}%` }, "#" + e.id));
    chips.append(...chipEls);
    const sPass = stat(root, "Correct, sent straight to the quote", "—", "is-ok");
    const sWrong = stat(root, "Wrong, and nobody noticed", "—", "is-bad");
    const sRev = stat(root, "Sent to a rep for review", "—", "is-warn");
    const sRate = stat(root, "Automation rate", "—");
    const out = note(root, "Press <b>Run test set</b>. Each chip is one of the 24 messages; green passed, red failed silently, amber was flagged for a human.");
    const legend = h("p", { class: "vc-widget-sub" }, "24 examples is the minimum to see a pattern; 50 to 100 is a real test set. Collect them from real messages, with the answer a good rep would give.");
    root.append(legend);
    async function run() {
      ran = true;
      chipEls.forEach((c) => { c.className = "vc-chip"; });
      let pass = 0, wrong = 0, rev = 0;
      for (let i = 0; i < EX.length; i++) {
        const e = EX[i], c = chipEls[i];
        await sleep(motion.reduced() ? 0 : 45);
        if (guard && e.conf < THR) { c.classList.add("is-warn"); rev++; c.textContent = "#" + e.id + " ⚑"; }
        else if (e.correct) { c.classList.add("is-ok"); pass++; c.textContent = "#" + e.id + " ✓"; }
        else { c.classList.add("is-bad"); wrong++; c.textContent = "#" + e.id + " ✗"; motion.shake(c); }
        motion.pulse(c);
      }
      sPass(`${pass} of 24`); sWrong(`${wrong} of 24`); sRev(`${rev} of 24`);
      sRate(Math.round(((24 - rev) / 24) * 100) + "%");
      out.innerHTML = guard
        ? `With the guardrail, <b>${wrong}</b> wrong quote${wrong === 1 ? "" : "s"} would reach a customer instead of ${EX.filter((e) => !e.correct).length}, at the price of <b>${rev}</b> messages a rep must check. That is the trade: fewer silent errors, more review work. Move the threshold in your own build and watch both numbers.`
        : `Without a guardrail, <b>${wrong}</b> of 24 extractions are wrong and nothing stops them from becoming quotes. ${pass} of 24 is a ${Math.round(pass / 24 * 100)}% accuracy that sounds fine until you count the quotes per month. Add the guardrail and run again.`;
    }
    btn(bar, "Run test set", run, "vc-btn-accent");
    btn(bar, "Reset", () => { ran = false; chipEls.forEach((c, i) => { c.className = "vc-chip"; c.textContent = "#" + (i + 1); }); sPass("—"); sWrong("—"); sRev("—"); sRate("—"); }, "vc-btn-ghost");
  });
})();
