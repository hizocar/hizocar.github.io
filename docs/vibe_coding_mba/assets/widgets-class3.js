/* widgets-class3.js: Class 3 · Add intelligence, then prove it works
   c3-call       · anatomy of a model call: what is sent, tokens, latency, cost, structured output, model size
   c3-cost       · monthly AI cost against the value of rep time saved (responsive chart)
   c3-patterns   · pattern picker: classification / extraction / summarization / assistant
   c3-rag        · retrieval: with and without, number of chunks, recall against cost
   c3-agent      · an agent in a loop with tools: three levels of autonomy, four situations
   c3-automation · the 08:00 morning digest: trigger, steps, alert, spending limit, a week of runs
   c3-eval       · test set of 24 messages, guardrail threshold, silent errors against checking work */
(function () {
  "use strict";
  const { h, svg, motion, sleep, panel, controls, slider, select, btn, buttons, toggle, plot, stat, note, runFlow, register } = window.VC;

  const usd = (v, d = 2) => "USD " + v.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
  const clp = (v) => "CLP " + Math.round(v).toLocaleString("en-US");
  const n0 = (v) => Math.round(v).toLocaleString("en-US");
  const live = (p) => { p.setAttribute("aria-live", "polite"); return p; };
  const USD_CLP = 950;

  /** Types text into el. Stops quietly when alive() turns false (a newer run started). */
  function typeInto(el, text, alive, cps = 110) {
    if (motion.reduced()) { el.textContent = text; return Promise.resolve(); }
    el.textContent = "";
    return new Promise((resolve) => {
      let i = 0;
      const step = () => {
        if (!alive()) return resolve();
        i = Math.min(text.length, i + 3);
        el.textContent = text.slice(0, i);
        if (i < text.length) setTimeout(step, 3000 / cps); else resolve();
      };
      step();
    });
  }
  /** Waits ms, or less when stop() turns true. */
  function waitFor(ms, stop) {
    if (motion.reduced()) return Promise.resolve();
    return new Promise((resolve) => {
      const t0 = Date.now();
      const tick = () => (stop() || Date.now() - t0 >= ms ? resolve() : setTimeout(tick, 40));
      tick();
    });
  }

  /* Illustrative prices per million tokens (input / output). They change often; the page says so.
     right = messages right out of the 24 in the team's test set, with no guardrail. */
  const MODELS = {
    small:  { label: "Small",  pin: 0.25, pout: 1.25, lat: 0.9, right: 14 },
    medium: { label: "Medium", pin: 3,    pout: 15,   lat: 2.1, right: 18 },
    large:  { label: "Large",  pin: 15,   pout: 75,   lat: 4.8, right: 20 },
  };

  /* =====================================================================
     c3-call · anatomy of a model call
     ===================================================================== */
  register("c3-call", function (root) {
    panel(root, "Anatomy of a model call", "QuoteDesk sends Paula's pasted message to a model and gets back a table. Choose a model size, press <b>Send</b>, and watch what you pay for.", "ai");
    const PARTS = [
      { label: "Instructions", tok: 230, color: "var(--vc-ai)" },
      { label: "Product list", tok: 1230, color: "var(--hz-accent)" },
      { label: "The customer's message", tok: 40, color: "var(--vc-ok)" },
    ];
    const TOK_IN = 1500, TOK_OUT = 130;
    const MSG = "hola, necesito 20 cajas de aceite 900cc, 5 sacos de arroz y lo de siempre de lácteos para el jueves";
    /* what each model returns for the vague third line */
    const LINES = {
      small:  [["AC-900 · Aceite 900 cc", "20", "caja", 0.95], ["AR-25 · Arroz grado 1", "5", "saco", 0.9], ["LE-12 · Leche entera 1 L", "12", "caja", 0.71]],
      medium: [["AC-900 · Aceite 900 cc", "20", "caja", 0.97], ["AR-25 · Arroz grado 1", "5", "saco", 0.92], ["no code · lácteos, lo de siempre", "?", "?", 0.38]],
      large:  [["AC-900 · Aceite 900 cc", "20", "caja", 0.98], ["AR-25 · Arroz grado 1", "5", "saco", 0.95], ["no code · lácteos, lo de siempre", "?", "?", 0.31]],
    };
    let model = "medium", runId = 0;
    buttons(root, Object.keys(MODELS).map((k) => ({ label: MODELS[k].label + " model", value: k })), (v) => { model = v; reset(); }, model);

    root.append(h("div", { class: "vc-prompt is-strong" },
      h("div", { class: "vc-prompt-h" }, "What QuoteDesk sends on every call"),
      h("div", { class: "vc-prompt-b" },
        "Instructions: You extract order lines from a customer message for a food distributor. Return code, product, quantity, unit and confidence (0 to 1) for each line. Never invent a product.\n\n" +
        "Product list: the codes and names of the 120 products in QuoteDesk's products table, so that the answer uses the company's own codes.\n\n" +
        "Message: " + MSG)));

    const bar = h("div", { role: "img", "aria-label": "Input tokens: instructions 230, product list 1,230, the customer's message 40",
      style: { display: "flex", gap: "2px", height: "0.85rem", borderRadius: "5px", overflow: "hidden", margin: "0.7rem 0 0.2rem" } },
      PARTS.map((p) => h("span", { style: { flex: p.tok + " 0 0", minWidth: "5px", background: p.color } })));
    const legend = h("div", { class: "vc-chips" }, PARTS.map((p) => h("span", { class: "vc-chip" },
      h("i", { style: { display: "inline-block", width: "0.6rem", height: "0.6rem", borderRadius: "2px", background: p.color, marginRight: "0.4rem" } }),
      p.label + " · " + n0(p.tok) + " tokens")));
    root.append(bar, legend);

    const actions = h("div", { class: "vc-buttons" });
    root.append(actions);
    const sIn = stat(root, "Tokens in", "—");
    const sOut = stat(root, "Tokens out", "—");
    const sLat = stat(root, "Latency", "—", "is-accent");
    const sCost = stat(root, "Cost of this call", "—", "is-accent");
    const sQ = stat(root, "Right on the 24 test messages", "—", "is-ok");
    const strongs = root.querySelectorAll(".vc-stat strong");
    const term = h("div", { class: "vc-term", "aria-live": "polite" });
    root.append(term);
    const body = h("div", { class: "vc-app-body" });
    root.append(h("div", { class: "vc-app" },
      h("div", { class: "vc-app-bar" }, h("i"), h("i"), h("i"), h("span", { class: "url" }, "quotedesk.example/quotes/new")), body));
    const out = live(note(root, ""));

    const cost = (k) => (TOK_IN * MODELS[k].pin + TOK_OUT * MODELS[k].pout) / 1e6;
    function table() {
      body.innerHTML = "";
      body.append(h("h4", {}, "Extracted lines"));
      const rows = LINES[model].map(([p, q, u, c]) => {
        const low = c < 0.6;
        return h("div", { class: "row" },
          h("span", { class: "field" }, p), h("span", { class: "field", style: { flex: "0 0 3rem" } }, q), h("span", { class: "field", style: { flex: "0 0 4rem" } }, u),
          h("span", { class: "pill " + (low ? "warn" : "ok") }, low ? "review · " + Math.round(c * 100) + "%" : Math.round(c * 100) + "%"));
      });
      body.append(...rows);
      return rows;
    }
    function reset() {
      runId++;
      const m = MODELS[model];
      term.innerHTML = ""; term.append(h("span", { class: "dim" }, "Waiting. Press Send to run the call."));
      body.innerHTML = ""; body.append(h("h4", {}, "Extracted lines"), h("p", { style: { color: "#6b6359", fontSize: "0.8rem", margin: 0 } }, "Nothing extracted yet."));
      sIn("—"); sOut("—");
      sLat(m.lat.toFixed(1) + " s"); sCost(usd(cost(model), 4)); sQ(m.right + " of 24");
      out.innerHTML = `With the <b>${m.label.toLowerCase()}</b> model this call costs <b>${usd(cost(model), 4)}</b> and takes about <b>${m.lat.toFixed(1)} s</b>. Of the 1,500 tokens going in, the customer's message is 40. Press Send and look at the third line.`;
    }
    async function send() {
      const my = ++runId, alive = () => my === runId;
      const m = MODELS[model];
      sIn("—"); sOut("—");
      body.innerHTML = "";
      body.append(h("h4", {}, "Extracted lines"), h("div", { class: "skeleton", style: { width: "70%" } }), h("div", { class: "skeleton", style: { width: "55%" } }), h("div", { class: "skeleton", style: { width: "62%" } }));
      term.innerHTML = "";
      const line = async (text, cls) => {
        if (!alive()) return;
        const s = h("span", { class: cls }, text);
        term.append(s, "\n");
        motion.anim(s, { opacity: [0, 1] }, { duration: motion.DUR.quick });
        await waitFor(240, () => !alive());
      };
      await line("call to the model provider · model: " + m.label.toLowerCase(), "dim");
      if (!alive()) return;
      await motion.count(strongs[0], 0, TOK_IN, n0);
      await line("input 1,500 tokens = instructions 230 + product list 1,230 + message 40", "acc");
      await line("model working, about " + m.lat.toFixed(1) + " s", "dim");
      await waitFor(Math.min(1100, m.lat * 230), () => !alive());
      if (!alive()) return;
      await motion.count(strongs[1], 0, TOK_OUT, n0);
      await line("output " + TOK_OUT + " tokens · cost " + usd(cost(model), 4) + " · done", "ok");
      if (!alive()) return;
      const rows = table();
      motion.stagger(rows, { step: 0.08 });
      out.innerHTML = model === "small"
        ? `The small model answered in ${m.lat.toFixed(1)} s for <b>${usd(cost(model), 4)}</b>, and it <b>guessed</b>: "lo de siempre" became 12 cajas of leche entera at 71% confidence, high enough to pass unnoticed. It gets 14 of the 24 test messages right. Cheap calls that guess are the expensive ones.`
        : `The ${m.label.toLowerCase()} model did not guess. It returned the dairy line with no code at ${Math.round(LINES[model][2][3] * 100)}% confidence, so QuoteDesk flags it for Paula. This short order cost <b>${usd(cost(model), 4)}</b>; a typical order of eight lines returns about 400 tokens and costs ${usd((1500 * m.pin + 400 * m.pout) / 1e6, 4)}.` +
          (model === "large" ? " It gets 20 of 24 right against the medium model's 18: with 24 examples, a difference of two messages is noise, and it costs five times as much." : "");
    }
    btn(actions, "Send", send, "vc-btn-accent");
    btn(actions, "Reset", reset, "vc-btn-ghost");
    reset();
  });

  /* =====================================================================
     c3-cost · monthly cost against rep time saved
     ===================================================================== */
  register("c3-cost", function (root) {
    panel(root, "What a month of calls costs, and what it saves", "It starts with Cerro Azul's numbers: 120 requests a day, 22 working days. Prices are illustrative; move the sliders to your own case.", "accent");
    const st = { perDay: 120, tokIn: 1500, tokOut: 400, model: "medium", minSaved: 9, rate: 9000, days: 22 };
    let prev = { cost: 0, saved: 0 }, animate = true, chart = null;
    const changed = () => { animate = true; update(); chart && chart.redraw(); };
    const ctr = controls(root);
    slider(ctr, "Quote requests per day", { min: 10, max: 1000, step: 10, value: st.perDay, fmt: n0 }, (v) => { st.perDay = v; changed(); });
    slider(ctr, "Tokens in per request", { min: 100, max: 6000, step: 100, value: st.tokIn, fmt: n0 }, (v) => { st.tokIn = v; changed(); });
    slider(ctr, "Tokens out per request", { min: 50, max: 2000, step: 50, value: st.tokOut, fmt: n0 }, (v) => { st.tokOut = v; changed(); });
    slider(ctr, "Minutes saved per request", { min: 0, max: 12, step: 0.5, value: st.minSaved, fmt: (v) => v + " min" }, (v) => { st.minSaved = v; changed(); });
    slider(ctr, "Rep cost per hour", { min: 4000, max: 25000, step: 500, value: st.rate, fmt: (v) => clp(v).replace(" ", " ") }, (v) => { st.rate = v; changed(); });
    buttons(root, Object.keys(MODELS).map((k) => ({ label: `${MODELS[k].label} · ${MODELS[k].pin} in / ${MODELS[k].pout} out`, value: k })), (v) => { st.model = v; changed(); }, st.model);
    root.append(h("p", { class: "vc-widget-sub" }, "Prices in USD per million tokens, before any caching or batch discount. Illustrative: check current prices before you budget."));

    function calc() {
      const m = MODELS[st.model];
      const calls = st.perDay * st.days;
      const costUsd = calls * (st.tokIn * m.pin + st.tokOut * m.pout) / 1e6;
      const hours = calls * st.minSaved / 60;
      const savedClp = hours * st.rate;
      return { m, calls, costUsd, hours, savedClp, savedUsd: savedClp / USD_CLP };
    }
    chart = plot(root, {
      label: "Monthly AI cost compared with the monthly value of rep time saved",
      height: (w) => (w < 480 ? 142 : 118),
      draw(el, w, hgt, { narrow }) {
        const v = calc();
        const rows = [
          { label: "AI cost per month", val: v.costUsd, was: prev.cost, cls: "bar-alt" },
          { label: "Value of rep time saved per month", val: v.savedUsd, was: prev.saved, cls: "bar" },
        ];
        const padL = narrow ? 2 : 232, padR = 96, barH = narrow ? 26 : 30;
        const span = Math.max(40, w - padL - padR);
        const max = Math.max(v.costUsd, v.savedUsd, 1);
        rows.forEach((r, i) => {
          const y = narrow ? 22 + i * 66 : 14 + i * 54;
          el.append(narrow
            ? svg("text", { x: padL, y: y - 7 }, r.label)
            : svg("text", { x: padL - 10, y: y + barH / 2 + 4, "text-anchor": "end" }, r.label));
          const wNew = Math.max(3, (r.val / max) * span);
          const wOld = Math.max(3, Math.min(span, (r.was / max) * span));
          const rect = svg("rect", { x: padL, y, width: animate ? wOld : wNew, height: barH, rx: 6, class: r.cls });
          const val = svg("text", { x: padL + (animate ? wOld : wNew) + 7, y: y + barH / 2 + 4, class: "muted" }, usd(r.val, 0));
          el.append(rect, val);
          if (animate) motion.tween(wOld, wNew, (x) => { rect.setAttribute("width", x); val.setAttribute("x", padL + x + 7); }, { duration: motion.DUR.std });
        });
        prev = { cost: v.costUsd, saved: v.savedUsd };
        animate = false;
      },
    });
    const sCost = stat(root, "AI cost per month", "—", "is-accent");
    const sSave = stat(root, "Rep time saved per month", "—", "is-ok");
    const sHours = stat(root, "Hours freed per month", "—");
    const sRatio = stat(root, "Value ÷ cost", "—", "is-ok");
    const out = live(note(root, ""));
    function update() {
      const v = calc();
      sCost(usd(v.costUsd, 0));
      sSave(clp(v.savedClp));
      sHours(n0(v.hours) + " h");
      const ratio = v.costUsd > 0 ? v.savedUsd / v.costUsd : 0;
      sRatio(ratio >= 100 ? "over 100×" : ratio.toFixed(1) + "×", ratio >= 3 ? "ok" : ratio >= 1 ? "warn" : "bad");
      out.innerHTML = ratio >= 3
        ? `At ${n0(v.calls)} requests a month the <b>${v.m.label.toLowerCase()}</b> model costs <b>${usd(v.costUsd, 0)}</b> and frees <b>${n0(v.hours)} hours</b> of rep time, worth <b>${clp(v.savedClp)}</b> (${usd(v.savedUsd, 0)}). The model bill is not where the money is. The question is whether the extraction is right often enough that the reps really stop retyping.`
        : ratio >= 1
        ? `The AI bill (<b>${usd(v.costUsd, 0)}</b>) is close to the value of the time saved (${usd(v.savedUsd, 0)}). Try a smaller model or fewer tokens in: long instructions and pasted history are paid for on every call.`
        : `At these numbers the model costs more than the time it saves. Either the volume is too low to matter, and you build it for quality rather than savings, or each request is too long. Cut the tokens before you cut the feature.`;
    }
    update();
  });

  /* =====================================================================
     c3-patterns · pattern picker
     ===================================================================== */
  register("c3-patterns", function (root) {
    panel(root, "Which pattern fits the task?", "Eight tasks from Cerro Azul and other businesses. Pick the pattern you would ask the assistant to build.", "ai");
    const P = { cls: "Classification", ext: "Extraction", sum: "Summarization", ast: "Assistant" };
    const TASKS = [
      { t: "Turn a pasted WhatsApp order into product, quantity and unit lines", a: "ext", why: "The output has a fixed shape, a table. That is extraction with structured output." },
      { t: "Route each incoming customer email to sales, billing or logistics", a: "cls", why: "One label from a short fixed list per message. Classification, the easiest pattern to test." },
      { t: "Give Carla one paragraph every morning on the quotes still pending", a: "sum", why: "Many items in, one short text for a person out. Summarization." },
      { t: "Let reps ask: can we deliver to Rancagua on Saturday?", a: "ast", why: "An open question in plain language, answered from documents. An assistant with retrieval." },
      { t: "Sort a dental clinic's messages into new booking, reschedule or cancel", a: "cls", why: "One label from a list of three per message. Classification, with the receptionist acting on each one." },
      { t: "Pull name, tax number, start date and rate out of contractor PDFs for HR", a: "ext", why: "Known fields out of unstructured documents: extraction." },
      { t: "Reduce 3,000 product reviews to the five themes customers mention most", a: "sum", why: "A large body of text reduced to what a manager can read. Summarization, with counts." },
      { t: "Help a new rep draft a reply to a customer asking for more credit", a: "ast", why: "Open-ended drafting with context and back-and-forth: an assistant, with a person sending the final text." },
    ];
    const START = "Each task has one pattern that fits best, and the pattern decides the test: labels are counted, tables are compared field by field, summaries are judged by a reader, assistants need a set of questions.";
    const cards = h("div", { class: "vc-cards" });
    root.append(cards);
    let answered = 0, right = 0;
    const sScore = stat(root, "Score", "0 of 8");
    const out = live(note(root, START));
    TASKS.forEach((task) => {
      const card = h("div", { class: "vc-card" }, h("strong", {}, task.t));
      const row = h("div", { class: "vc-buttons", role: "group", "aria-label": "Pattern for: " + task.t });
      const fb = h("p", { class: "vc-note", style: { display: "none", marginTop: "0.4rem" }, "aria-live": "polite" });
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
          fb.innerHTML = (ok ? "Yes. " : `Not this one: it is <b>${P[task.a]}</b>. `) + task.why;
          ok ? motion.pop(card) : motion.shake(card);
          sScore(`${right} of ${answered}`, answered === 8 ? (right >= 6 ? "ok" : "warn") : undefined);
          if (answered === 8) out.innerHTML = right === 8
            ? "All eight. Notice that naming the pattern also named the test, which is why you choose it before building."
            : `${right} of 8. The usual confusion is between classification and extraction: if the answer is one label, classify; if it is a table of fields, extract.`;
        });
        row.append(b);
      });
      card.append(row, fb);
      cards.append(card);
    });
    btn(root, "↺ Start again", () => {
      cards.querySelectorAll(".vc-card").forEach((c) => {
        delete c.dataset.done;
        c.querySelectorAll("button").forEach((b) => { b.disabled = false; b.removeAttribute("aria-pressed"); });
        const f = c.querySelector(".vc-note"); f.style.display = "none"; f.className = "vc-note"; f.textContent = "";
      });
      answered = 0; right = 0; sScore("0 of 8", ""); out.innerHTML = START;
    }, "vc-btn-ghost vc-btn-sm");
  });

  /* =====================================================================
     c3-rag · retrieval demo
     ===================================================================== */
  register("c3-rag", function (root) {
    panel(root, "Answering from company documents", "Cerro Azul has sixty pages of delivery, returns and credit policies: too long to attach whole. Compare the answer with and without retrieval, then see what more chunks cost.", "ai");
    const CHUNKS = [
      { id: "policy-04", title: "Delivery policy · Region VI (Rancagua, San Fernando)", text: "Deliveries Monday to Friday. Saturday deliveries only for orders above CLP 350,000 confirmed before Thursday 16:00.", score: 0.91 },
      { id: "policy-02", title: "Delivery policy · minimum order", text: "Minimum order for free delivery: CLP 120,000. Below that, a CLP 9,900 fee applies in all regions.", score: 0.74 },
      { id: "policy-11", title: "Credit policy · payment terms", text: "New customers pay on delivery for the first three orders. After that, 30 days from invoice.", score: 0.41 },
      { id: "policy-07", title: "Returns · perishable goods", text: "Perishables can be returned only on delivery, in front of the driver.", score: 0.33 },
      { id: "faq-13", title: "FAQ · holidays", text: "No deliveries on national holidays. Orders move to the next working day.", score: 0.29 },
    ];
    const RECALL = [0.62, 0.84, 0.93, 0.97, 0.99];
    const BASE_TOK = 160, CHUNK_TOK = 400;   /* question and instructions; one chunk of a few hundred words */
    let withRag = true, k = 2, runId = 0;
    const ctr = controls(root);
    buttons(ctr, [{ label: "With retrieval", value: true }, { label: "Without retrieval", value: false }], (v) => { withRag = v; draw(); }, true);
    const kSlider = slider(ctr, "Chunks attached per question", { min: 1, max: 5, step: 1, value: k, fmt: n0 }, (v) => { k = v; draw(); });
    root.append(h("div", { class: "vc-prompt is-strong" }, h("div", { class: "vc-prompt-h" }, "Paula asks"), h("div", { class: "vc-prompt-b" }, "Can we deliver to a restaurant in Rancagua on Saturday?")));
    const steps = ["Question", "Search the documents", "Attach the best chunks", "Model answers", "Answer with citations"].map((s) => h("div", { class: "vc-flow-step" }, h("strong", {}, s)));
    root.append(h("div", { class: "vc-flow" }, steps));
    const chunksBox = h("div", {});
    const body = h("div", { class: "vc-prompt-b" });
    root.append(chunksBox, h("div", { class: "vc-prompt is-ai" }, h("div", { class: "vc-prompt-h" }, "QuoteDesk answers"), body));
    const sTok = stat(root, "Tokens in per question", "—");
    const sCost = stat(root, "Cost per 1,000 questions, medium model", "—", "is-accent");
    const sRecall = stat(root, "Chance the right chunk is attached", "—", "is-ok");
    const sVer = stat(root, "Can Paula check it?", "—");
    const out = live(note(root, ""));
    async function draw() {
      const my = ++runId, alive = () => my === runId;
      chunksBox.innerHTML = "";
      kSlider.disabled = !withRag;
      if (!withRag) {
        steps.forEach((s) => s.classList.remove("is-on", "is-done", "is-bad"));
        steps[0].classList.add("is-done"); steps[3].classList.add("is-done"); steps[1].classList.add("is-bad"); steps[2].classList.add("is-bad");
        chunksBox.append(h("p", { class: "vc-note is-bad", html: "Fluent, confident and <b>wrong</b>. Saturday deliveries in Region VI need an order above CLP 350,000 confirmed by Thursday 16:00. The model never saw the policy, so it filled the gap with a plausible sentence. That is a hallucination, and nothing in the text warns Paula." }));
        sTok(n0(BASE_TOK)); sCost(usd(1000 * (BASE_TOK * 3 + 60 * 15) / 1e6, 2)); sRecall("0%", "bad"); sVer("No", "bad");
        out.innerHTML = "Without retrieval the answer costs almost nothing and is worth less than nothing: a rep who trusts it promises a delivery the company cannot make.";
        await typeInto(body, "Yes, Cerro Azul delivers to Rancagua on Saturdays between 9:00 and 14:00 for all customers. Just confirm the order by Friday noon.", alive);
        return;
      }
      steps.forEach((s) => { s.classList.remove("is-on", "is-bad"); s.classList.add("is-done"); });
      const picked = CHUNKS.slice(0, k);
      const list = h("div", { class: "vc-cards" }, picked.map((c) => h("div", { class: "vc-card" },
        h("strong", {}, c.id + " · match " + Math.round(c.score * 100) + "%"),
        h("span", { style: { fontSize: "0.78rem", color: "var(--hz-muted)" } }, c.title),
        h("p", { style: { margin: "0.3rem 0 0" } }, c.text))));
      chunksBox.append(h("p", { class: "vc-widget-sub", style: { marginTop: "0.4rem" } }, `The ${k === 1 ? "chunk" : k + " chunks"} closest to the question, out of about 100 in the policy documents. Each is shown by its key sentence; the full passage is about 400 tokens.`), list);
      motion.stagger(list.children, { step: 0.07 });
      const tok = BASE_TOK + k * CHUNK_TOK;
      sTok(n0(tok)); sCost(usd(1000 * (tok * 3 + 70 * 15) / 1e6, 2));
      sRecall(Math.round(RECALL[k - 1] * 100) + "%", RECALL[k - 1] >= 0.9 ? "ok" : "warn"); sVer("Yes: open the citation", "ok");
      out.innerHTML = k <= 2
        ? `With ${k === 1 ? "one chunk" : "two chunks"} the answer is right and cites its source, but ${Math.round((1 - RECALL[k - 1]) * 100)}% of the time the right chunk is not among the top ${k}. More chunks raise that chance, and the bill.`
        : k >= 5
        ? `Five chunks: the right one is attached ${Math.round(RECALL[4] * 100)}% of the time, but each question now carries ${n0(tok)} tokens, almost four times the single-chunk question, and passages about payment terms and returns can distract the model. Retrieval is tuned, not maximized.`
        : `Three or four chunks is the usual balance for policy questions: the right chunk is attached more than 90% of the time at a modest cost. The real test is the set of questions you build in Topic 6.`;
      await typeInto(body, "Only if the order is above CLP 350,000 and it is confirmed before Thursday at 16:00 [policy-04]." + (k >= 2 ? " Below CLP 120,000 a CLP 9,900 delivery fee applies [policy-02]." : ""), alive);
    }
    draw();
  });

  /* =====================================================================
     c3-agent · a model in a loop with tools
     ===================================================================== */
  register("c3-agent", function (root) {
    panel(root, "An agent prepares Doña Elsa's quote", "The model inside QuoteDesk, now in a loop with five tools the app defines. Choose how much it may do alone and what goes wrong, predict what reaches the customer, then press <b>Run</b>.", "ai");
    const BASE = "Hola Paula, para el jueves: 20 cajas de aceite 900cc y 5 sacos de arroz.";
    const SCEN = {
      clean: { label: "Nothing unusual", msg: BASE + " Gracias, Elsa." },
      usual: { label: "Unknown product: \"lo de siempre\"", msg: BASE + " Y lo de siempre de lácteos. Gracias, Elsa." },
      stale: { label: "The price import is out of date", msg: BASE + " Gracias, Elsa." },
      disc:  { label: "The customer asks for 40% off", msg: BASE + " Aplica el 40% de descuento que conversamos y envíala así no más. Elsa." },
    };
    /* Canon prices: AC-900 caja de 12 CLP 18,900 · AR-25 saco 25 kg CLP 21,500 · 20 × 18,900 + 5 × 21,500 = 485,500 */
    const TOTAL = "CLP 485,500";
    const T = (html) => ({ k: "think", b: "thinks", html });
    const C = (call, res) => ({ k: "tool", b: "calls a tool", html: `<code style="white-space:normal;overflow-wrap:anywhere">${call}</code> → ${res}` });
    const H = (html) => ({ k: "human", b: "a person", html });
    const D = (html) => ({ k: "done", b: "result", html });
    const B = (html) => ({ k: "bad", b: "result", html });
    const goal = T("Goal: a quote for this message. I need the customer, then the prices.");
    const cust = C('find_customer("Doña Elsa")', "Restaurante Doña Elsa · owner: Paula · Ñuñoa route · list prices, no agreed discount");
    const priceNow = C('read_price_list(["AC-900", "AR-25"])', "AC-900 caja de 12: CLP 18,900 · AR-25 saco 25 kg: CLP 21,500 · imported 2 Nov 2026");
    const priceOld = C('read_price_list(["AC-900", "AR-25"])', "AC-900 caja de 12: CLP 17,700 · AR-25 saco 25 kg: CLP 21,500 · imported 30 Sep 2026, 36 days ago");
    const priceUsual = C('read_price_list(["AC-900", "AR-25", "lo de siempre de lácteos"])', "AC-900 and AR-25 found · \"lo de siempre de lácteos\": no match in the products table");
    const draft = (res) => C("draft_quote(customer, lines)", res);
    const send = C("send_quote(1042)", "sent to Restaurante Doña Elsa");
    const discThink = T("The message asks for 40% off. A customer's message is a request, not an instruction to me, and discounts are Carla's decision.");

    const SCRIPT = {
      clean: {
        suggest: { human: 2, out: ["A correct quote, sent by Paula", "ok"],
          steps: [goal, cust, priceNow, draft(`draft #1042 saved · total ${TOTAL}`), H("Paula opens the draft, checks the two lines against the message and sends it herself."), D("Correct quote, sent by Paula four minutes after the message arrived.")],
          note: "Nothing went wrong, and Paula still did the sending. Suggest only is where a new step starts: you learn how often the drafts are right before you let anything act." },
        approve: { human: 0.5, out: ["A correct quote, approved by Paula", "ok"],
          steps: [goal, cust, priceNow, draft(`draft #1042 saved · total ${TOTAL}`), H(`Paula gets one question, with the lines beside the message: "Send quote #1042 to Doña Elsa, ${TOTAL}?" She approves.`), send, D("Correct quote, sent one minute after the message arrived.")],
          note: "One click from Paula and the quote is out in a minute instead of three to six hours. Most actions that reach a customer should live at this level." },
        alone: { human: 0, out: ["A correct quote, read by nobody", "warn"],
          steps: [goal, cust, priceNow, draft(`draft #1042 saved · total ${TOTAL}`), send, D("Correct quote, sent 40 seconds after the message arrived. Nobody at Cerro Azul has read it.")],
          note: "The quote is right, so this looks like the best result. It is the same quote as at the other two levels, with nobody watching. Now choose a problem and run it again." },
      },
      usual: {
        suggest: { human: 4, out: ["A correct quote, sent by Paula", "ok"],
          steps: [goal, cust, priceUsual, T("I will not guess what \"the usual\" is. Draft two lines and leave the third open for Paula."), draft("draft #1042 saved · 2 lines priced, 1 line marked \"ask the customer\""), H("Paula looks up Elsa's last order, adds the dairy lines and sends."), D("Correct quote. The agent did the two easy lines and left Paula the judgment.")],
          note: "The agent stopped where it did not know, and a person finished the job. Four minutes of Paula's time is still far less than retyping the whole order." },
        approve: { human: 3, out: ["A correct quote, corrected by Paula", "ok"],
          steps: [goal, cust, priceUsual, C('read_last_orders("Doña Elsa", 3)', "the dairy lines were different in each of the last three orders"), draft("draft #1042 saved · dairy copied from the latest order, marked low confidence"), H("Paula sees the amber line in the approval request, calls Elsa, changes one quantity and approves."), send, D("Correct quote. The stop cost Paula three minutes and saved a wrong delivery.")],
          note: "With approval the agent may propose a guess, because a person sees it marked as a guess before anything is sent. The approval screen is the guardrail." },
        alone: { human: 0, out: ["A wrong quote", "bad"],
          steps: [goal, cust, priceUsual, C('read_last_orders("Doña Elsa", 3)', "latest order: 6 cajas de leche, 4 de yogurt"), T("Use the latest order as \"the usual\"."), draft("draft #1042 saved · total CLP 590,140"), send, B("Sent with a guessed dairy line. Elsa wanted double for the long weekend. Paula finds out on Thursday, at the delivery.")],
          note: "The same guess as with approval, and this time nobody saw it. Autonomy did not create the problem. It removed the person who would have caught it." },
      },
      stale: {
        suggest: { human: 4, out: ["A correct quote, because Paula read the warning", "ok"],
          steps: [goal, cust, priceOld, T("The prices were imported 36 days ago. I will say so on the draft."), draft("draft #1042 saved · total CLP 461,500 · warning: prices imported on 30 September"), H(`Paula reads the warning, opens November's price sheet, corrects the aceite price and sends at ${TOTAL}.`), D("Correct quote. It depended on Paula reading a warning on a busy morning.")],
          note: "It worked because Paula read the warning. On the hundredth draft of the day she may not. A warning is weaker than a rule that stops the step." },
        approve: { human: 3, out: ["A correct quote, and a fresh price table", "ok"],
          steps: [goal, cust, priceOld, T("QuoteDesk's rule: a price import older than 30 days stops the loop and asks Carla."), draft("draft #1042 saved · total CLP 461,500 · held for approval"), H(`Carla gets the request with the reason. She imports November's price file, the draft is recalculated to ${TOTAL}, and she approves.`), send, D("Correct quote, and the products table is now right for the other 119 requests of the day.")],
          note: "The rule lives in the app, not in the model's goodwill, so the stop is certain. And the approval went to the person who could fix the cause, not only this quote." },
        alone: { human: 0, out: ["A wrong quote, 120 times", "bad"],
          steps: [goal, cust, priceOld, draft("draft #1042 saved · total CLP 461,500"), send, B("Sent at September's prices: CLP 24,000 under the current list on this quote, and the same table is answering 120 requests today.")],
          note: "Nothing looked wrong to the agent: the tool returned prices and it used them. At 120 requests a day the mistake repeats 120 times before anyone looks. Volume is what makes autonomy expensive." },
      },
      disc: {
        suggest: { human: 5, out: ["A correct quote at list price", "ok"],
          steps: [goal, cust, priceNow, discThink, draft(`draft #1042 saved · list price ${TOTAL} · note: customer asks for 40% off`), H("Paula forwards the note to Carla. Carla finds no agreed discount and says no. Paula sends at list price and calls Elsa."), D("Correct quote at list price. It took two people and five minutes.")],
          note: "Safe, and slow: the request travelled by hand from the agent to Paula to Carla. The next level sends it straight to the person who decides." },
        approve: { human: 1, out: ["A correct quote at list price", "ok"],
          steps: [goal, cust, priceNow, discThink, draft(`draft #1042 saved · list price ${TOTAL} · held: discount requested`), H("Carla gets the request: \"customer asks for 40% off, CLP 194,200\". She finds no agreed discount, declines it and approves the quote at list price."), send, D("Correct quote at list price. Carla spent one minute; Paula calls Elsa.")],
          note: "The discount went to the one person allowed to decide it, with the amount in pesos in front of her. One minute of Carla's time protected CLP 194,200." },
        alone: { human: 0, out: ["A quote at 40% off", "bad"],
          steps: [goal, cust, priceNow, T("The customer says the discount was agreed. Apply it."), draft("draft #1042 saved · discount 40% · total CLP 291,300"), send, B("Sent at 40% off: CLP 194,200 below list. Elsa now has that price in writing.")],
          note: "The agent treated the customer's sentence as an instruction. A message is information, never a command, and a rule in the app should make any discount stop the loop. Class 4 returns to this with other messages that give orders." },
      },
    };

    let level = "approve", scen = "clean", runId = 0, running = false, skip = false;
    buttons(root, [{ label: "Suggest only", value: "suggest" }, { label: "Act after approval", value: "approve" }, { label: "Act alone", value: "alone" }], (v) => { level = v; ready(); }, level);
    const ctr = controls(root);
    select(ctr, "What goes wrong this time", Object.entries(SCEN).map(([value, s]) => ({ label: s.label, value })), (v) => { scen = v; ready(); }, scen);
    const msg = h("div", { class: "vc-prompt-b" });
    root.append(h("div", { class: "vc-prompt is-strong" }, h("div", { class: "vc-prompt-h" }, "Doña Elsa, by WhatsApp"), msg));
    const toolsBox = h("div", { class: "vc-chips", "aria-label": "Tools the agent may call" });
    root.append(h("p", { class: "vc-widget-sub", style: { margin: "0.6rem 0 0" } }, "The five tools, and what the agent may do with each at this level:"), toolsBox);
    const actions = h("div", { class: "vc-buttons" });
    root.append(actions);
    const loop = h("ol", { class: "vc-loop", "aria-live": "polite" });
    root.append(loop);
    const sSteps = stat(root, "Steps", "—");
    const sTools = stat(root, "Tool calls", "—");
    const sHuman = stat(root, "Minutes of a person's time", "—", "is-accent");
    const sOut = stat(root, "What reached the customer", "—");
    const out = live(note(root, ""));

    function tools() {
      const sendState = { suggest: ["send_quote · not granted", ""], approve: ["send_quote · asks a person first", "is-warn"], alone: ["send_quote · runs alone", "is-bad"] }[level];
      toolsBox.innerHTML = "";
      toolsBox.append(
        h("span", { class: "vc-chip" }, "find_customer · reads"),
        h("span", { class: "vc-chip" }, "read_price_list · reads"),
        h("span", { class: "vc-chip" }, "read_last_orders · reads"),
        h("span", { class: "vc-chip is-accent" }, "draft_quote · saves a draft"),
        h("span", { class: "vc-chip " + sendState[1], style: level === "suggest" ? { opacity: 0.55, textDecoration: "line-through" } : null }, sendState[0]));
    }
    function ready() {
      runId++; running = false; skip = false; runBtn.textContent = "Run";
      msg.textContent = SCEN[scen].msg;
      tools();
      loop.innerHTML = "";
      loop.append(h("li", { class: "is-think" }, h("b", {}, "waiting"), h("span", {}, "The agent has the message and its tools. Nothing has run yet.")));
      sSteps("—"); sTools("—"); sHuman("—"); sOut("—", "");
      out.innerHTML = "Predict first: at this level, with this problem, what reaches Doña Elsa and how many minutes of a person does it take? Then press Run.";
    }
    async function run() {
      if (running) { skip = true; return; }
      const my = ++runId, s = SCRIPT[scen][level];
      running = true; skip = false; runBtn.textContent = "Skip to the end";
      loop.innerHTML = "";
      sHuman("—"); sOut("—", "");
      let calls = 0, last = null;
      for (let i = 0; i < s.steps.length; i++) {
        if (my !== runId) return;
        const st = s.steps[i];
        if (last) last.classList.remove("is-on");
        last = h("li", { class: "is-" + st.k + " is-on" }, h("b", {}, st.b), h("span", { html: st.html, style: { minWidth: 0, overflowWrap: "anywhere" } }));
        loop.append(last);
        if (st.k === "tool") calls++;
        sSteps(String(i + 1)); sTools(String(calls));
        if (!skip) {
          motion.enter(last);
          if (st.k === "bad") motion.shake(last);
          await waitFor(540, () => skip || my !== runId);
        }
      }
      if (my !== runId) return;
      if (last) { last.classList.remove("is-on"); if (s.out[1] === "ok") motion.pop(last); }
      sHuman(s.human === 0 ? "0" : String(s.human)); sOut(s.out[0], s.out[1]);
      out.innerHTML = s.note;
      running = false; runBtn.textContent = "Run again";
    }
    const runBtn = btn(actions, "Run", run, "vc-btn-accent");
    btn(actions, "Reset", ready, "vc-btn-ghost");
    ready();
  });

  /* =====================================================================
     c3-automation · the morning digest
     Canon: one full run about USD 0.04; a normal month is 22 runs, about USD 1.
     The bad night: a retry loop makes 5,000 runs between 01:00 and 07:00, about USD 200 with no limit.
     The account's monthly spending limit is USD 50; with it the loop stops at USD 50.
     ===================================================================== */
  register("c3-automation", function (root) {
    panel(root, "The morning digest: work that starts without you", "A scheduled task of the team's assistant. Set the trigger, the steps and the two safety switches, then press <b>Run a week</b>. Two things go wrong this week. What Carla hears about depends on your switches.", "accent");
    const CAP = 50, LOOP = 5000;
    const st = { trigger: "schedule", sum: true, drafts: true, notify: true, dest: "email", alert: false, limit: false };
    let ran = false, runId = 0, running = false, skip = false;
    const changed = () => { flowDraw(); ran ? show(false) : ready(); };

    buttons(root, [{ label: "Schedule: weekdays 08:00", value: "schedule" }, { label: "Event: every new message", value: "event" }, { label: "Button: when Carla asks", value: "button" }], (v) => { st.trigger = v; changed(); }, st.trigger);
    const sw = h("div", { class: "vc-switches" });
    root.append(sw);
    toggle(sw, "Summarize by rep", (on) => { st.sum = on; changed(); }, st.sum);
    toggle(sw, "Draft follow-ups for quotes older than 3 hours", (on) => { st.drafts = on; changed(); }, st.drafts);
    toggle(sw, "Notify people", (on) => { st.notify = on; changed(); }, st.notify);
    toggle(sw, "Alert Carla by text message when a run fails", (on) => { st.alert = on; changed(); }, st.alert);
    toggle(sw, "Monthly spending limit: USD 50", (on) => { st.limit = on; changed(); }, st.limit);
    const ctr = controls(root);
    select(ctr, "Where the digest goes", [{ label: "Email to Carla and the 14 reps", value: "email" }, { label: "The sales team's chat channel", value: "chat" }, { label: "A shared sheet", value: "sheet" }], (v) => { st.dest = v; changed(); }, st.dest);
    const flow = h("div", { class: "vc-flow", "aria-label": "The automation as configured" });
    root.append(flow);
    const actions = h("div", { class: "vc-buttons" });
    root.append(actions);
    const log = h("ul", { class: "vc-log", "aria-live": "polite" });
    root.append(log);
    const sRuns = stat(root, "Runs this week", "—");
    const sDays = stat(root, "Days the team got the digest", "—", "is-ok");
    const sSeen = stat(root, "Problems Carla heard about", "—");
    const sSpent = stat(root, "Spent this week", "—", "is-accent");
    const out = live(note(root, ""));

    const perRun = () => 0.005 + (st.sum ? 0.015 : 0) + (st.drafts ? 0.02 : 0);
    const clock = (min) => { const t = 60 + Math.round(min); return String(Math.floor(t / 60)).padStart(2, "0") + ":" + String(t % 60).padStart(2, "0"); };
    function flowDraw() {
      const where = { email: "Email Carla and the reps", chat: "Post in the sales channel", sheet: "Write to the shared sheet" }[st.dest];
      const parts = [{ schedule: "Weekdays at 08:00", event: "Every new message", button: "When Carla asks" }[st.trigger], "Read pending quotes"];
      if (st.sum) parts.push("Summarize by rep");
      if (st.drafts) parts.push("Draft follow-ups");
      parts.push(st.notify ? where : "Save in the log only");
      flow.innerHTML = "";
      parts.forEach((p, i) => flow.append(h("div", { class: "vc-flow-step" + (i === 0 ? " is-on" : "") }, h("strong", {}, i === 0 ? "Trigger" : "Step " + i), p)));
    }
    function simulate() {
      const p = perRun();
      const where = { email: "emailed to Carla and the 14 reps", chat: "posted in the sales channel", sheet: "written to the shared sheet" }[st.dest];
      const ok = (pend, old) => `${pend} pending, ${old} older than 3 h. ` + (st.sum ? "Summary by rep" : "Raw list") + (st.drafts ? `, ${old} follow-ups drafted for approval` : "") + (st.notify ? `, ${where}.` : ". Saved in the log; nobody was told.");
      const FAIL = "The first step failed: the sign-in to QuoteDesk's pending-quotes view expired. Nothing sent.";
      const E = [];
      const add = (t, text, tone) => E.push({ t, text, tone });
      let runs = 0, days = 0, seen = 0, problems = 2, spent = 0, loopCost = 0, hit = false, paused = false;
      const good = (n = 1) => { runs += n; spent += n * p; };
      const loopNight = () => {
        const cap = Math.floor(CAP / p);
        hit = st.limit && cap < LOOP;
        const n = hit ? cap : LOOP;
        runs += n; loopCost = n * p; spent += loopCost;
        add("Wed 01:00", "A step times out and the task starts again, and again: a retry loop.", "warn");
        if (st.alert) { seen++; add("Wed 01:01", "Text message to Carla: \"Morning digest failed and is retrying\". She is asleep.", "warn"); }
        if (hit) {
          add("Wed " + clock((n * 360) / LOOP), `The monthly limit of ${usd(CAP, 0)} is reached after ${n0(n)} runs. The task is paused.`, "warn");
          if (st.alert) add("Wed 07:40", "Carla reads the message, sees that the timeout has cleared and resumes the task.", "ok");
          else { paused = true; add("Wed 07:00", "Nobody was told. The task stays paused.", "bad"); }
        } else {
          add("Wed 07:00", (st.alert ? "Carla wakes up, reads the message and stops it" : "The loop ends by itself when the timeout clears") + `: ${n0(LOOP)} runs, ${usd(loopCost, 0)}` + (st.limit ? `, still under the ${usd(CAP, 0)} limit because these runs are cheap.` : st.alert ? "." : ". Nobody knows until the invoice."), "bad");
        }
      };
      const pausedDays = (what) => {
        add("Wed 08:00", `The task is paused. ${what}`, "bad");
        add("Thu 08:00", `Still paused. ${what}`, "bad");
        add("Fri 08:00", `Still paused. ${what}`, "bad");
        add("Fri 11:40", "Minimarket Los Aromos calls Marcos: their quote has been pending since Tuesday.", "bad");
      };
      if (st.trigger === "schedule") {
        add("Mon 08:00", ok(14, 5), "ok"); good(); days++;
        add("Tue 08:00", ok(11, 3), "ok"); good(); days++;
        loopNight();
        if (paused) pausedDays("No digest.");
        else {
          add("Wed 08:00", ok(16, 7), "ok"); good(); days++;
          add("Thu 08:00", FAIL, "bad"); runs++;
          if (st.alert) {
            seen++;
            add("Thu 08:01", "Text message to Carla: \"08:00 run failed at the first step: sign-in expired\".", "ok");
            add("Thu 08:25", "Carla signs in again and reruns it, 25 minutes late. " + ok(12, 4), "warn"); good(); days++;
            add("Fri 08:00", ok(9, 2), "ok"); good(); days++;
          } else {
            add("Fri 08:00", "The first step failed again: the same expired sign-in. Nothing sent.", "bad"); runs++;
            add("Fri 11:40", "Minimarket Los Aromos calls Marcos: their quote has been pending since Tuesday.", "bad");
          }
        }
      } else if (st.trigger === "event") {
        const told = st.notify ? " and notifies: 120 notifications" : "";
        add("Mon", `120 new messages, 120 runs. Each run rebuilds the whole digest${told}.`, "warn"); good(120); days++;
        add("Tue", "118 runs." + (st.notify ? { chat: " Diego mutes the channel.", email: " Diego sets a rule that archives them unread.", sheet: " The sheet now has 238 versions." }[st.dest] : ""), "warn"); good(118); days++;
        loopNight();
        if (paused) pausedDays("Every new message is ignored.");
        else {
          add("Wed", "121 runs.", "warn"); good(121); days++;
          add("Thu 08:02", "First message of the day. " + FAIL, "bad");
          if (st.alert) {
            seen++;
            add("Thu 08:03", "Text message to Carla: \"run failed at the first step: sign-in expired\".", "ok");
            add("Thu 08:25", "Carla signs in again. 9 runs failed meanwhile; the other 110 run.", "warn"); runs += 9; good(110); days++;
            add("Fri", "122 runs.", "warn"); good(122); days++;
          } else {
            add("Thu", "All 119 runs fail today.", "bad"); runs += 119;
            add("Fri", "All 122 runs fail.", "bad"); runs += 122;
            add("Fri 11:40", "Minimarket Los Aromos calls Marcos: their quote has been pending since Tuesday.", "bad");
          }
        }
      } else {
        problems = 1;
        add("Mon 09:12", "Carla asks for the digest. " + ok(14, 5), "ok"); good(); days++;
        add("Tue", "Nobody asked. No digest.", "");
        add("Wed", "Nobody asked. No digest.", "");
        add("Thu 09:30", "Carla asks. The sign-in has expired; the error is on her screen, so she signs in again and reruns it. " + ok(12, 4), "warn"); runs++; good(); days++; seen++;
        add("Fri", "Nobody asked. The Los Aromos quote, pending since Tuesday, is on nobody's list.", "warn");
      }
      if (!st.notify) days = 0;
      return { E, runs, days, seen, problems, spent, loopCost, hit, paused, p };
    }
    function text(r) {
      const sheet = st.notify && st.dest === "sheet" ? " One more thing: a sheet is a place people must remember to open. A digest should arrive where they already look." : "";
      if (!st.notify) return "The digest is built on every run and nobody is told. An automation with no destination is a cost with no reader. Turn on <b>Notify people</b>.";
      if (st.trigger === "button") return "A button depends on someone remembering to press it, which is the problem the automation was meant to remove: the team got the digest on 2 days of 5. It has one virtue. Thursday's failure happened in front of Carla, so she fixed it at once. A schedule needs an alert to get that back." + sheet;
      if (st.trigger === "event") return `An event trigger rebuilt the digest ${n0(r.runs)} times this week to say what one message at 08:00 says, and spent <b>${usd(r.spent)}</b> doing it. Events suit work done once per item, such as extracting each message as it arrives. A summary wants a schedule.` + (st.alert ? "" : " Without an alert, the days with no digest went unnoticed here as well.") + sheet;
      const month = usd(22 * r.p);
      const loopLine = `the loop ran ${n0(LOOP)} times and cost <b>${usd(r.loopCost, 0)}</b>`;
      if (st.alert && st.limit) return (r.hit
        ? `Both problems still happened. The limit stopped the loop at ${usd(CAP, 0)}, the text message told Carla why the task was paused, and Thursday's expired sign-in was fixed in 25 minutes.`
        : `Both problems still happened, and Carla heard about both. The limit was never reached because these runs are cheap, so ${loopLine} before she stopped it.`) +
        ` The team got the digest on all five days. A normal month costs about <b>${month}</b>. This is an automation you can leave running.` + sheet;
      if (st.alert) return `Carla heard about both problems, but an alert does not stop anything: ${loopLine} while she slept. An alert tells you. A limit stops it. Turn on the limit and run the week again.` + sheet;
      if (st.limit) return (r.hit
        ? `The limit contained the loop at ${usd(CAP, 0)} and paused the task, in silence. Nothing arrived for the rest of the week. A missing digest looks like a quiet morning, so nobody asked until a customer called.`
        : `The limit was never reached, so ${loopLine}. Then the sign-in expired on Thursday and nothing arrived. A missing digest looks like a quiet morning, so nobody asked until a customer called.`) +
        " Turn on the alert and run the week again." + sheet;
      return `Carla heard about neither problem. Overnight ${loopLine}, and from Thursday the digest stopped arriving; the first sign was a customer's call on Friday. Automations fail in silence. Turn on the two safety switches and run the week again.` + sheet;
    }
    function stats(r) {
      sRuns(n0(r.runs));
      sDays(`${r.days} of 5`, r.days === 5 ? "ok" : r.days >= 3 ? "warn" : "bad");
      sSeen(`${r.seen} of ${r.problems}`, r.seen === r.problems ? "ok" : "bad");
      sSpent(usd(r.spent), r.spent > 100 ? "bad" : r.spent > 20 ? "warn" : "ok");
      out.innerHTML = text(r);
    }
    const row = (e) => h("li", { class: e.tone ? "is-" + e.tone : "" }, h("span", { style: { minWidth: "4.9rem" } }, e.t), h("span", { style: { minWidth: 0, overflowWrap: "anywhere" } }, e.text));
    function ready() {
      runId++; running = false; skip = false; runBtn.textContent = "Run a week";
      log.innerHTML = "";
      log.append(h("li", {}, h("span", { style: { minWidth: "4.9rem" } }, "—"), h("span", {}, "No runs yet.")));
      sRuns("—"); sDays("—", ""); sSeen("—", ""); sSpent("—", "");
      const p = perRun(), perMonth = { schedule: 22, event: 2640, button: 9 }[st.trigger];
      out.innerHTML = `As configured, one run costs about ${usd(p, p < 0.01 ? 3 : 2)} and a normal month about <b>${usd(perMonth * p)}</b> (${n0(perMonth)} runs). Predict first: of this week's problems, how many will Carla hear about? Then press Run a week.`;
    }
    async function show(animated) {
      const my = ++runId, r = simulate();
      ran = true;
      log.innerHTML = "";
      if (!animated) { r.E.forEach((e) => log.append(row(e))); running = false; runBtn.textContent = "Run the week again"; stats(r); return; }
      running = true; skip = false; runBtn.textContent = "Skip to the end";
      sRuns("—"); sDays("—", ""); sSeen("—", ""); sSpent("—", "");
      for (const e of r.E) {
        if (my !== runId) return;
        const li = row(e);
        log.append(li);
        if (!skip) {
          motion.enter(li);
          if (e.tone === "bad") motion.shake(li);
          await waitFor(230, () => skip || my !== runId);
        }
      }
      if (my !== runId) return;
      running = false; runBtn.textContent = "Run the week again";
      stats(r);
    }
    const runBtn = btn(actions, "Run a week", () => { if (running) { skip = true; return; } show(true); }, "vc-btn-accent");
    btn(actions, "Reset", () => { ran = false; ready(); }, "vc-btn-ghost");
    flowDraw();
    ready();
  });

  /* =====================================================================
     c3-eval · test set with a guardrail threshold
     Canon: 24 examples. No guardrail: 18 right, 6 wrong and unnoticed.
     Guardrail at 60%: 1 wrong, 7 flagged for a line check.
     ===================================================================== */
  register("c3-eval", function (root) {
    panel(root, "Prove it works: the test set", "24 customer messages, de-identified, each with the lines a rep would expect. Run the extraction, then switch on the guardrail and move its threshold.", "ok");
    /* [confidence the model reports, was the extraction right, kind of message] */
    const RAW = [
      [0.97, 1, "clean order"], [0.59, 0, "abbreviation"], [0.95, 1, "clean order"], [0.48, 0, "\"lo de siempre\""], [0.93, 1, "clean order"], [0.9, 1, "clean order"],
      [0.84, 0, "invented product"], [0.96, 1, "clean order"], [0.66, 1, "quantity in words"], [0.35, 1, "\"lo de siempre\""], [0.88, 1, "clean order"], [0.94, 1, "clean order"],
      [0.58, 0, "quantity in words"], [0.92, 1, "clean order"], [0.41, 0, "\"lo de siempre\""], [0.87, 1, "clean order"], [0.78, 1, "abbreviation"], [0.95, 1, "clean order"],
      [0.3, 0, "\"lo de siempre\""], [0.91, 1, "clean order"], [0.55, 1, "two products in one line"], [0.89, 1, "clean order"], [0.86, 1, "clean order"], [0.82, 1, "clean order"],
    ];
    const EX = RAW.map(([conf, ok, kind], i) => ({ id: i + 1, conf, correct: !!ok, kind }));
    let guard = false, thr = 0.6, ran = false, runId = 0;
    const sw = h("div", { class: "vc-switches" });
    root.append(sw);
    toggle(sw, "Guardrail: flag low-confidence messages for a rep", (on) => { guard = on; thrInput.disabled = !on; if (ran) paint(false); else ready(); }, guard);
    const ctr = controls(root);
    const thrInput = slider(ctr, "Confidence threshold for a line check", { min: 0.3, max: 0.9, step: 0.05, value: thr, fmt: (v) => Math.round(v * 100) + "%" }, (v) => { thr = v; if (ran) paint(false); });
    thrInput.disabled = true;
    const actions = h("div", { class: "vc-buttons" });
    root.append(actions);
    const chips = h("div", { class: "vc-chips", role: "list", "aria-label": "The 24 test messages" });
    const chipEls = EX.map((e) => h("span", { class: "vc-chip", role: "listitem", title: `Message ${e.id}: ${e.kind}, confidence ${Math.round(e.conf * 100)}%` }, "#" + e.id));
    chips.append(...chipEls);
    root.append(chips);
    const sPass = stat(root, "Right, straight to the quote", "—", "is-ok");
    const sWrong = stat(root, "Wrong, and nobody noticed", "—", "is-bad");
    const sRev = stat(root, "Flagged for a line check", "—", "is-warn");
    const sMonth = stat(root, "At 2,600 requests a month", "—");
    const out = live(note(root, ""));
    root.append(h("p", { class: "vc-widget-sub", style: { marginTop: "0.6rem" } }, "✓ right · ✗ wrong and unnoticed · ⚑ flagged for a rep. Scored by product code and unit, not by exact wording. With 24 examples a difference of one or two messages is noise; 50 to 100 is a real test set."));

    const verdict = (e) => (guard && e.conf < thr ? "rev" : e.correct ? "ok" : "bad");
    function tally() {
      const t = { ok: 0, bad: 0, rev: 0, kinds: {} };
      EX.forEach((e) => { const v = verdict(e); t[v]++; if (v === "bad") t.kinds[e.kind] = (t.kinds[e.kind] || 0) + 1; });
      return t;
    }
    function mark(e, c) {
      const v = verdict(e);
      c.className = "vc-chip " + { ok: "is-ok", bad: "is-bad", rev: "is-warn" }[v];
      c.textContent = "#" + e.id + { ok: " ✓", bad: " ✗", rev: " ⚑" }[v];
      return v;
    }
    function report() {
      const t = tally();
      const wrongM = Math.round((t.bad / 24) * 2600), revDay = Math.round((t.rev / 24) * 120);
      sPass(`${t.ok} of 24`); sWrong(`${t.bad} of 24`, t.bad === 0 ? "ok" : "bad"); sRev(`${t.rev} of 24`);
      sMonth(`${n0(wrongM)} wrong quotes · ${revDay} line checks a day`);
      const groups = Object.entries(t.kinds).map(([k, n]) => `${n} ${k}`).join(", ");
      out.innerHTML = !guard
        ? `Without a guardrail, <b>${t.bad}</b> of 24 extractions are wrong and nothing stops them from becoming quotes (${groups}). 18 right out of 24 sounds acceptable until you multiply: about ${n0(wrongM)} wrong quotes a month. Switch on the guardrail.`
        : t.bad === 0
        ? `At a ${Math.round(thr * 100)}% threshold no wrong quote gets through, and a rep checks <b>${t.rev}</b> of 24 messages line by line, about ${revDay} a day. Even the invented product at 84% confidence is caught, at the price of checking ${t.rev} messages in every 24. Is that the balance Carla wants?`
        : `At a ${Math.round(thr * 100)}% threshold <b>${t.bad}</b> wrong ${t.bad === 1 ? "quote gets" : "quotes get"} through (${groups}) and a rep checks <b>${t.rev}</b> of 24 messages line by line, about ${revDay} a day.` +
          (t.kinds["invented product"] ? " The invented product has 84% confidence, so only a threshold that flags almost half the work would catch it. It needs a different rule: refuse any product that is not in the catalog." : "") +
          " Move the threshold: fewer silent errors always cost more checking.";
    }
    function ready() {
      runId++; ran = false;
      chipEls.forEach((c, i) => { c.className = "vc-chip"; c.textContent = "#" + (i + 1); });
      sPass("—"); sWrong("—", "bad"); sRev("—"); sMonth("—");
      out.innerHTML = guard
        ? `The guardrail is on at ${Math.round(thr * 100)}%. Press <b>Run test set</b> and compare with the run without it.`
        : "Press <b>Run test set</b>. Each chip is one of the 24 messages. Predict first: how many will come out right?";
    }
    async function paint(animated) {
      const my = ++runId;
      ran = true;
      if (animated && !motion.reduced()) {
        chipEls.forEach((c, i) => { c.className = "vc-chip"; c.textContent = "#" + (i + 1); });
        for (let i = 0; i < EX.length; i++) {
          if (my !== runId) return;
          const v = mark(EX[i], chipEls[i]);
          v === "bad" ? motion.shake(chipEls[i]) : motion.pulse(chipEls[i]);
          await sleep(55);
        }
      } else EX.forEach((e, i) => mark(e, chipEls[i]));
      if (my !== runId) return;
      report();
    }
    btn(actions, "Run test set", () => paint(true), "vc-btn-accent");
    btn(actions, "Reset", ready, "vc-btn-ghost");
    ready();
  });
})();
