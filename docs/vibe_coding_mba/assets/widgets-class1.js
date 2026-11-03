/* widgets-class1.js — Class 1 · Ship something today
   c1-cost         · cost of a working prototype, 2015 vs 2020 vs today
   c1-vibe-or-not  · vibe it or engineer it: six scenarios, four criteria
   c1-pullpush     · Problem Pull vs AI Push sorter
   c1-brief        · brief builder with a four-part quality meter
   c1-build        · prompt-to-app storyboard with a bug and its recovery */
(function () {
  "use strict";
  const { h, svg, motion, sleep, panel, controls, slider, select, text, btn, buttons, stat, note, runFlow, register } = window.VC;

  const usd = (v) => "USD " + Math.round(v).toLocaleString("en-US");
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  /* ====================================================================
     c1-cost — Cost of a working prototype across three eras
     ==================================================================== */
  register("c1-cost", function (root) {
    panel(root, "What a working prototype costs, then and now",
      "The same tool, QuoteDesk v0, built three ways. Move the sliders: the shape of the chart does not change, only how far the bars sit apart.", "accent");

    // Hours of work per screen, by era. Illustrative, from typical agency / no-code / assistant workflows.
    const ERAS = [
      { key: "2015", label: "2015 · agency build", hours: 80, people: 3, who: "designer + 2 developers", days: 10 },
      { key: "2020", label: "2020 · no-code tool", hours: 16, people: 1, who: "one trained analyst", days: 2 },
      { key: "now", label: "Today · assistant", hours: 1.5, people: 1, who: "a manager, no code", days: 0.25 },
    ];
    let rate = 60, screens = 3;

    const c = controls(root);
    slider(c, "Hourly rate of the people building (USD)", { min: 20, max: 150, step: 5, value: rate, fmt: (v) => "USD " + v }, (v) => { rate = v; draw(); });
    slider(c, "Scope: screens in the first version", { min: 1, max: 8, step: 1, value: screens, fmt: (v) => v + (v === 1 ? " screen" : " screens") }, (v) => { screens = v; draw(); });

    const W = 640, H = 230, L = 150, R = 20, T = 18, B = 34;
    const plot = svg("svg", { class: "vc-plot", viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": "Cost of a prototype by era" });
    root.append(plot);
    const bars = ERAS.map((e, i) => {
      const y = T + i * ((H - T - B) / 3) + 10;
      const g = svg("g", {});
      g.append(svg("text", { x: L - 10, y: y + 18, "text-anchor": "end" }, e.label));
      const rect = svg("rect", { x: L, y, width: 0, height: 28, rx: 4, class: i === 2 ? "bar-alt" : "bar" });
      const val = svg("text", { x: L + 6, y: y + 19, class: "muted" }, "");
      g.append(rect, val);
      plot.append(g);
      return { rect, val, y };
    });
    plot.append(svg("text", { x: L, y: H - 10, class: "muted" }, "cost of the first working version, USD (same scale for all three)"));

    const sCost15 = stat(root, "2015 cost", "—");
    const sCostNow = stat(root, "Today's cost", "—", "is-accent");
    const sRatio = stat(root, "How much cheaper", "—", "is-ok");
    const sIdeas = stat(root, "Ideas you can test for the 2015 budget", "—", "is-ok");
    const n = note(root, "");

    const cost = (e) => e.hours * screens * rate;
    let prev = ERAS.map(() => 0);
    function draw() {
      const costs = ERAS.map(cost);
      const max = Math.max(...costs);
      const width = W - L - R;
      costs.forEach((v, i) => {
        const w = Math.max(3, (v / max) * width);
        motion.attr(bars[i].rect, "width", w);
        const el = bars[i].val;
        motion.count(el, prev[i], v, (x) => usd(x));
        el.setAttribute("x", L + w + 8 > W - 90 ? L + 8 : L + w + 8);
        if (L + w + 8 > W - 90) el.setAttribute("fill", "#fff");
        else el.removeAttribute("fill");
        prev[i] = v;
      });
      const ratio = costs[0] / costs[2];
      sCost15(usd(costs[0]) + " · ~" + Math.round(ERAS[0].days * screens / 3) + " working days");
      sCostNow(usd(costs[2]) + " · about an afternoon");
      sRatio("×" + Math.round(ratio));
      sIdeas(Math.floor(ratio).toLocaleString("en-US"));
      n.innerHTML = `With ${screens} screen${screens > 1 ? "s" : ""} at ${usd(rate)} an hour, the 2015 version costs <strong>${usd(costs[0])}</strong> and today's costs <strong>${usd(costs[2])}</strong>. ` +
        `For the money Cerro Azul would have spent on one agency project it can now try <strong>${Math.floor(ratio)}</strong> ideas and throw most of them away. The hours per screen (80 · 16 · 1.5) are illustrative; the ratio is the point.`;
    }
    draw();
  });

  /* ====================================================================
     c1-vibe-or-not — six scenarios, two buttons, four criteria
     ==================================================================== */
  register("c1-vibe-or-not", function (root) {
    panel(root, "Vibe it or engineer it?",
      "Six pieces of software. For each one decide, then read the four criteria. Blast radius is the one that decides most often.", "ai");

    const SC = [
      { t: "QuoteDesk v0: internal tool for 14 reps to paste and save quote requests", ans: "vibe",
        c: { blast: "low: a rep goes back to retyping", users: "14 colleagues who know it is a prototype", reg: "customer phone numbers; nothing legal depends on a draft quote", life: "weeks, then rebuilt or handed off" },
        why: "Fails loudly, in front of a colleague, with no money moving. This is what vibe coding is for." },
      { t: "Demand test: a page where restaurants sign up for next-day delivery, to see if anyone wants it", ans: "vibe",
        c: { blast: "low: a lost sign-up", users: "a few dozen prospects", reg: "collects an email; keep it minimal", life: "two weeks" },
        why: "The whole point is to learn cheaply whether the idea has demand. Build it in an afternoon, measure, delete." },
      { t: "Payroll calculation for Cerro Azul's 250 employees", ans: "eng",
        c: { blast: "high: wrong pay, possibly unnoticed until the complaint", users: "every employee", reg: "labor and tax law", life: "years" },
        why: "Four red flags. A silent rounding error here costs money and trust. Buy it or have it engineered." },
      { t: "Dental clinic: an app that decides how urgent an appointment request is", ans: "eng",
        c: { blast: "high: a missed emergency", users: "patients", reg: "health data", life: "years" },
        why: "A prototype of the workflow is fine to vibe; the decision about urgency is not. Keep a human deciding and engineer the rest." },
      { t: "A marketing page for the launch of a new product line", ans: "vibe",
        c: { blast: "low: a typo in public, fixed in minutes", users: "the public, but nothing to break", reg: "none beyond normal advertising rules", life: "one campaign" },
        why: "Customer-facing is not the same as high risk. Nothing is stored, nothing is decided. Vibe it, have marketing review the copy." },
      { t: "Nightly process that updates inventory in the ERP from supplier files", ans: "eng",
        c: { blast: "high and silent: wrong stock levels for weeks", users: "everyone who trusts the ERP", reg: "none directly, but financial reporting depends on inventory", life: "years, integrated deeply" },
        why: "Deep integration plus silent failure. The classic prototype that becomes production and breaks a year later." },
    ];
    let i = 0, score = 0, answered = 0;
    const card = h("div", { class: "vc-card", style: { marginTop: "0.4rem" } });
    const prog = h("p", { class: "vc-widget-sub" });
    const title = h("strong", {});
    const crit = h("div", { class: "vc-chips" });
    const why = h("p", { class: "vc-note", style: { display: "none" } });
    card.append(title, crit, why);
    root.append(prog, card);
    const bb = h("div", { class: "vc-buttons" });
    root.append(bb);
    const bVibe = btn(bb, "Vibe it", () => answer("vibe"), "vc-btn-accent");
    const bEng = btn(bb, "Engineer it", () => answer("eng"));
    const bNext = btn(bb, "Next scenario", () => { i = (i + 1) % SC.length; show(); }, "vc-btn-ghost");
    const sScore = stat(root, "Your calls", "0 of 0");
    const n = note(root, "Decide first, then read the criteria. The chips turn red where the scenario fails a test.");

    function show() {
      const s = SC[i];
      prog.textContent = `Scenario ${i + 1} of ${SC.length}`;
      title.textContent = s.t;
      crit.innerHTML = "";
      why.style.display = "none";
      bVibe.disabled = bEng.disabled = false;
      bNext.disabled = true;
      motion.enter(card);
    }
    function answer(a) {
      const s = SC[i];
      answered++;
      const ok = a === s.ans;
      if (ok) score++;
      bVibe.disabled = bEng.disabled = true;
      bNext.disabled = false;
      const labels = { blast: "Blast radius", users: "Users", reg: "Regulation", life: "Lifetime" };
      const redFor = { blast: s.ans === "eng", users: s.ans === "eng", reg: s.ans === "eng", life: s.ans === "eng" };
      const chips = Object.keys(labels).map((k) => h("span", { class: "vc-chip " + (s.c[k].startsWith("high") || (k !== "blast" && redFor[k] && !s.c[k].startsWith("none") && !s.c[k].startsWith("low")) ? "is-bad" : "is-ok") }, `${labels[k]}: ${s.c[k]}`));
      crit.append(...chips);
      chips.forEach((ch) => (ch.style.opacity = "0"));
      motion.stagger(chips, { step: 0.08 });
      why.style.display = "";
      why.className = "vc-note " + (ok ? "is-ok" : "is-bad");
      why.innerHTML = (ok ? "Right. " : `Not quite: this one is <strong>${s.ans === "vibe" ? "vibe it" : "engineer it"}</strong>. `) + s.why;
      ok ? motion.pop(why) : motion.shake(why);
      sScore(`${score} of ${answered}`, score === answered ? "ok" : "warn");
      n.innerHTML = `${score} of ${answered} calls right. The rule in one line: <strong>vibe when failure is loud, local and cheap; engineer when it is silent, wide or regulated.</strong>`;
    }
    show();
  });

  /* ====================================================================
     c1-pullpush — Problem Pull vs AI Push sorter
     ==================================================================== */
  register("c1-pullpush", function (root) {
    panel(root, "Problem Pull or AI Push?",
      "Eight ideas heard in real meetings. Sort them. Pull ideas name a user, a number and a moment; Push ideas name a technology.", "ai");

    const IDEAS = [
      { t: "Reps retype every WhatsApp order into the ERP; a quote takes 3 to 6 hours and we lose about one request in ten.", a: "pull", why: "User (reps), numbers (3 to 6 hours, one in ten), moment (every order)." },
      { t: "Let's add a chatbot to the website because our two main competitors have one.", a: "push", why: "Starts with a technology and a competitor. Who asks what, how often, and what does it cost today?" },
      { t: "At the dental clinic, 30% of incoming calls are reschedules and the receptionist cannot answer new patients.", a: "pull", why: "User (receptionist), number (30% of calls), moment (incoming calls)." },
      { t: "Use AI to write all our internal emails.", a: "push", why: "No pain named. Which emails, written by whom, costing how much time?" },
      { t: "Onboarding a contractor takes 11 days because the same four forms are re-entered by three departments.", a: "pull", why: "User (three departments), number (11 days, four forms), moment (onboarding)." },
      { t: "Build an agent that does everything the finance team does.", a: "push", why: "A technology with no boundary. Nothing can be measured, so nothing can be finished." },
      { t: "8% of deliveries have an item mismatch and drivers call the office from the customer's door.", a: "pull", why: "User (drivers, office), number (8%), moment (at the customer's door)." },
      { t: "Put a GPT on top of our ERP.", a: "push", why: "The most common Push sentence. Translate it: whose five minutes does the ERP waste, and when?" },
    ];
    let i = 0, right = 0, done = 0;
    const prog = h("p", { class: "vc-widget-sub" });
    const card = h("div", { class: "vc-card" });
    const quote = h("p", { style: { fontSize: "1rem", margin: "0 0 0.4rem" } });
    const fb = h("p", { class: "vc-note", style: { display: "none" } });
    card.append(quote, fb);
    root.append(prog, card);
    const bb = h("div", { class: "vc-buttons" });
    root.append(bb);
    const bPull = btn(bb, "Problem Pull", () => answer("pull"), "vc-btn-accent");
    const bPush = btn(bb, "AI Push", () => answer("push"));
    const bNext = btn(bb, "Next idea", () => { i = (i + 1) % IDEAS.length; show(); }, "vc-btn-ghost");
    const sRight = stat(root, "Sorted correctly", "0 of 0");
    const n = note(root, "The test is mechanical: a named user, a number, a moment. Three yes answers mean Pull.");

    function show() {
      prog.textContent = `Idea ${i + 1} of ${IDEAS.length}`;
      quote.textContent = "“" + IDEAS[i].t + "”";
      fb.style.display = "none";
      bPull.disabled = bPush.disabled = false;
      bNext.disabled = true;
      motion.enter(card);
    }
    function answer(a) {
      const it = IDEAS[i];
      const ok = a === it.a;
      done++; if (ok) right++;
      bPull.disabled = bPush.disabled = true;
      bNext.disabled = false;
      fb.style.display = "";
      fb.className = "vc-note " + (ok ? "is-ok" : "is-bad");
      fb.innerHTML = (ok ? "Right: " : `This one is <strong>${it.a === "pull" ? "Problem Pull" : "AI Push"}</strong>. `) + it.why;
      ok ? motion.pop(fb) : motion.shake(fb);
      sRight(`${right} of ${done}`, right === done ? "ok" : "warn");
      n.innerHTML = `${right} of ${done} sorted correctly. Push ideas are not useless: they are unfinished. The manager's job is to find the person behind them.`;
    }
    show();
  });

  /* ====================================================================
     c1-brief — brief builder with a quality meter
     ==================================================================== */
  register("c1-brief", function (root) {
    panel(root, "Build the brief",
      "Four fields become one paragraph. The meter checks what the assistant needs: a role, a number, verbs in order, and a measurable outcome.", "accent");

    const EX = {
      user: "sales reps at Cerro Azul Distribuidora, on a phone between customer visits",
      pain: "retype every WhatsApp quote request into the ERP and take three to six hours to send a quote",
      does: "a rep pastes the customer's message, picks the customer from a list, and saves the request so the team sees it in a shared list",
      metric: "three reps use it for a week and quote time drops below one hour",
    };
    const v = { user: "", pain: "", does: "", metric: "" };
    const c = controls(root);
    const fUser = text(c, "1. The user (a role, where they are)", { placeholder: "e.g. dispatchers at the clinic's front desk" }, (x) => { v.user = x; draw(); });
    const fPain = text(c, "2. The pain, with a number", { placeholder: "e.g. spend 40 minutes a day on reschedule calls" }, (x) => { v.pain = x; draw(); });
    const fDoes = text(c, "3. What the tool does (verbs, in order)", { placeholder: "e.g. a patient taps a link, picks a new slot, the desk confirms", multiline: true }, (x) => { v.does = x; draw(); });
    const fMetric = text(c, "4. How we know it works (number and when)", { placeholder: "e.g. reschedule calls drop below 10% in two weeks" }, (x) => { v.metric = x; draw(); });

    const bb = h("div", { class: "vc-buttons" });
    root.append(bb);
    btn(bb, "Load the Cerro Azul example", () => {
      fUser.value = EX.user; fPain.value = EX.pain; fDoes.value = EX.does; fMetric.value = EX.metric;
      Object.assign(v, EX); draw(); motion.pop(para);
    }, "vc-btn-ghost");
    btn(bb, "Clear", () => { fUser.value = fPain.value = fDoes.value = fMetric.value = ""; Object.assign(v, { user: "", pain: "", does: "", metric: "" }); draw(); }, "vc-btn-ghost");
    const bCopy = btn(bb, "Copy the brief", async () => {
      try { await navigator.clipboard.writeText(para.textContent); bCopy.textContent = "Copied"; motion.pop(bCopy); setTimeout(() => (bCopy.textContent = "Copy the brief"), 1500); }
      catch (e) { bCopy.textContent = "Select and copy"; }
    });

    const para = h("div", { class: "vc-prompt-b", style: { fontSize: "0.95rem" } });
    const wrap = h("div", { class: "vc-prompt is-strong" }, h("div", { class: "vc-prompt-h" }, "Your brief, assembled"), para);
    root.append(wrap);
    const sMeter = stat(root, "Quality meter", "0 of 4");
    const checks = h("div", { class: "vc-chips" });
    root.append(checks);
    const n = note(root, "");

    const VERBS = /\b(paste|pastes|pick|picks|save|saves|see|sees|extract|extracts|send|sends|create|creates|show|shows|list|lists|upload|uploads|draft|drafts|flag|flags|tap|taps|choose|chooses|confirm|confirms|enter|enters|search|searches|open|opens|review|reviews|approve|approves|fill|fills|record|records|mark|marks|scan|scans|type|types|select|selects|submit|submits)\b/i;
    const ROLE = /\b(rep|reps|manager|managers|nurse|nurses|receptionist|dispatcher|dispatchers|driver|drivers|analyst|analysts|team|staff|agent|agents|clerk|clerks|accountant|accountants|buyer|buyers|customer|customers|patient|patients|contractor|contractors|supervisor|supervisors|operator|operators|cashier|cashiers|technician|technicians|seller|sellers|assistant|assistants|coordinator|coordinators|partner|partners|department|departments|warehouse|sales|finance|hr|employee|employees|user|users|doctor|doctors|teacher|teachers|student|students)\b/i;
    const NUM = /(\d|\bone\b|\btwo\b|\bthree\b|\bfour\b|\bfive\b|\bsix\b|\bten\b|\bhalf\b|%|percent|hour|hours|minute|minutes|day|days|week|weeks)/i;

    function draw() {
      const u = v.user.trim(), p = v.pain.trim(), d = v.does.trim(), m = v.metric.trim();
      const name = "the tool";
      para.textContent = (u || p || d || m)
        ? `For ${u || "[user]"}, who ${p || "[pain, with a number]"}, ${name} is a web tool where ${d || "[what the user does, in order]"}. We will know it works when ${m || "[measurable outcome, and when]"}.`
        : "Fill the four fields, or load the example. The paragraph assembles here as you type.";
      const tests = [
        { ok: u.length > 0 && ROLE.test(u) && u.split(/\s+/).length >= 2, label: "User is a role, not “people”" },
        { ok: p.length > 0 && NUM.test(p), label: "Pain has a number" },
        { ok: d.length > 0 && VERBS.test(d) && d.split(/\s+/).length >= 6, label: "Tool is described with verbs, in order" },
        { ok: m.length > 0 && NUM.test(m), label: "Success is measurable, with a when" },
      ];
      const score = tests.filter((t) => t.ok).length;
      checks.innerHTML = "";
      tests.forEach((t) => checks.append(h("span", { class: "vc-chip " + (t.ok ? "is-ok" : "is-bad") }, (t.ok ? "✓ " : "· ") + t.label)));
      sMeter(`${score} of 4`, score === 4 ? "ok" : score >= 2 ? "warn" : "bad");
      if (score === 4) { motion.pop(wrap); }
      n.innerHTML = score === 4
        ? "Four of four. This paragraph is your first prompt, your milestone's first paragraph and the opening line of your Demo Day pitch. Copy it into the build log."
        : score === 0 ? "The meter checks the four things an assistant cannot invent for you: who, how much, what happens, and how you will know."
        : `${score} of 4. ${tests.filter((t) => !t.ok).map((t) => t.label).join(" · ")}. Numbers and roles are what turn a wish into a brief.`;
    }
    draw();
  });

  /* ====================================================================
     c1-build — prompt-to-app storyboard with a bug and its recovery
     ==================================================================== */
  register("c1-build", function (root) {
    panel(root, "From the brief to a public address, with the bug",
      "Replay the live demo step by step. The assistant's messages are typed on the left; the page it produces appears on the right.", "ai");

    const flow = h("div", { class: "vc-flow" });
    const STEPS = ["Brief", "Plan", "Files", "Preview", "Deploy"].map((s, i) => h("div", { class: "vc-flow-step" }, h("strong", {}, `${i + 1}. ${s}`), ["your paragraph", "plain-language list", "the assistant writes them", "you test by using", "a public address"][i]));
    flow.append(...STEPS);
    root.append(flow);

    const grid = h("div", { class: "vc-compare", style: { gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" } });
    const term = h("div", { class: "vc-term", style: { minHeight: "11rem" } }, h("span", { class: "dim" }, "Press “Build QuoteDesk v0” to start."));
    const app = h("div", { class: "vc-app" },
      h("div", { class: "vc-app-bar" }, h("i"), h("i"), h("i"), h("span", { class: "url" }, "preview · not deployed")),
      h("div", { class: "vc-app-body" }, h("p", { class: "dim", style: { color: "#6b6359", margin: 0 } }, "Nothing built yet.")));
    const appBody = app.querySelector(".vc-app-body");
    const url = app.querySelector(".url");
    const colL = h("div", { style: { padding: 0, border: 0 } }, term);
    const colR = h("div", { style: { padding: 0, border: 0 } }, app);
    grid.append(colL, colR);
    root.append(grid);

    const bb = h("div", { class: "vc-buttons" });
    root.append(bb);
    const bBuild = btn(bb, "Build QuoteDesk v0", build, "vc-btn-accent");
    const bBug = btn(bb, "Introduce the bug", bug);
    const bFix = btn(bb, "Ask the assistant to fix it", fix);
    const bReset = btn(bb, "Reset", reset, "vc-btn-ghost");
    const sState = stat(root, "State of the build", "not started");
    const sTime = stat(root, "Elapsed in the demo", "0 min");
    const n = note(root, "Watch for the rhythm: plan, build, test by using, describe the failure, read the fix, test again, deploy.");
    let busy = false, state = "idle";
    setButtons();

    function setButtons() {
      bBuild.disabled = busy || state !== "idle";
      bBug.disabled = busy || state !== "built";
      bFix.disabled = busy || state !== "broken";
      bReset.disabled = busy || state === "idle";
    }
    function block() { const d = h("div", {}); term.append(d); return d; }
    function renderApp(mode) {
      appBody.innerHTML = "";
      if (mode === "skeleton") {
        appBody.append(h("div", { class: "skeleton", style: { width: "40%" } }), h("div", { class: "skeleton" }), h("div", { class: "skeleton", style: { width: "70%" } }));
        return;
      }
      const items = [
        h("div", { class: "row" }, h("span", {}, "Restaurante Doña Elsa"), h("span", { class: "pill" }, "20 cajas aceite 900cc, 5 sacos arroz…"), h("span", { class: "pill" }, "14:02")),
        h("div", { class: "row" }, h("span", {}, "Minimarket San Luis"), h("span", { class: "pill" }, "lo de siempre + 3 cajas leche"), h("span", { class: "pill" }, "13:41")),
      ];
      appBody.append(
        h("h4", {}, "QuoteDesk"),
        h("div", { class: "row" }, h("div", { class: "field" }, "Paste the customer's message…"), h("div", { class: "field", style: { flex: "0 1 10rem" } }, "Customer ▾")),
        h("div", { class: "row" }, h("button", { type: "button", class: "vc-btn vc-btn-sm " + (mode === "broken" ? "" : "vc-btn-accent"), disabled: true }, "Save request"),
          mode === "broken" ? h("span", { class: "pill bad" }, "tap on phone: nothing happens") : mode === "fixed" ? h("span", { class: "pill ok" }, "saves on phone and laptop") : h("span", { class: "pill ok" }, "works on laptop")),
        h("p", { style: { margin: "0.5rem 0 0.2rem", fontWeight: 600, fontSize: "0.78rem" } }, "Today's requests"),
        ...items
      );
      motion.stagger(appBody.children, { step: 0.05 });
    }
    async function build() {
      busy = true; setButtons(); term.innerHTML = "";
      sState("building", "warn");
      STEPS.forEach((s) => s.classList.remove("is-on", "is-done", "is-bad"));
      STEPS[0].classList.add("is-on");
      await motion.type(block(), ['<span class="acc">you ›</span> (pastes the brief, three constraints, asks for a plan)']);
      STEPS[0].classList.replace("is-on", "is-done"); STEPS[1].classList.add("is-on");
      await motion.type(block(), ['<span class="ok">assistant ›</span> Plan for QuoteDesk v0:', '  1. One page with a text box for the pasted message', '  2. A customer picker with the eight names you gave me', '  3. A Save button that adds the request to a shared list', '  4. The list shows customer, first 60 characters, time', '  Shall I build this?'], { cps: 90 });
      await motion.type(block(), ['<span class="acc">you ›</span> Yes. Nothing more for now.']);
      sTime("4 min");
      STEPS[1].classList.replace("is-on", "is-done"); STEPS[2].classList.add("is-on");
      renderApp("skeleton");
      await motion.type(block(), ['<span class="ok">assistant ›</span> Creating the page, the form and the list…', '<span class="dim">  app/page · components/QuoteForm · components/RequestList · a small store for saved requests</span>'], { cps: 80 });
      await sleep(motion.reduced() ? 0 : 500);
      STEPS[2].classList.replace("is-on", "is-done"); STEPS[3].classList.add("is-on");
      renderApp("built");
      await motion.type(block(), ['<span class="ok">assistant ›</span> Done. I built the page as planned. To test: paste a message, pick a customer, press Save; the request appears at the top of the list.']);
      sTime("9 min");
      sState("built · test it by using", "ok");
      busy = false; state = "built"; setButtons();
      n.innerHTML = "Nine minutes to a working page. Now the slow part: use it the way a rep would, three times, on a phone-sized window. Press <strong>Introduce the bug</strong> to see what the third test finds.";
    }
    async function bug() {
      busy = true; setButtons();
      STEPS[3].classList.remove("is-done"); STEPS[3].classList.add("is-bad");
      renderApp("broken");
      await motion.type(block(), ['<span class="bad">test 3 ›</span> phone-sized window: paste, pick customer, tap Save. Nothing happens. No message, no new item.']);
      sState("broken on phone", "bad");
      sTime("14 min");
      motion.shake(app);
      busy = false; state = "broken"; setButtons();
      n.innerHTML = "This is the moment the demo is about. The instructor does not open the code. The failure is described <strong>in the user's words</strong> and the assistant is asked to explain before fixing.";
    }
    async function fix() {
      busy = true; setButtons();
      await motion.type(block(), ['<span class="acc">you ›</span> On a phone-sized screen, I paste, pick a customer and tap Save. Nothing happens. On a laptop it works. Explain what you think is happening, then fix it.']);
      await motion.type(block(), ['<span class="ok">assistant ›</span> The Save button only reacted to a keyboard event that phones do not send. I changed it to respond to any tap or click, and I added a short “Saved” message so the rep gets confirmation. Test again on the phone size.'], { cps: 90 });
      STEPS[3].classList.remove("is-bad"); STEPS[3].classList.add("is-on");
      renderApp("fixed");
      await motion.type(block(), ['<span class="ok">test 4 ›</span> phone-sized window: Save works, “Saved” appears, request at the top of the list.']);
      STEPS[3].classList.replace("is-on", "is-done"); STEPS[4].classList.add("is-on");
      await motion.type(block(), ['<span class="acc">you ›</span> Publish it.', '<span class="ok">assistant ›</span> Deployed. Your page is at <span class="acc">https://quotedesk-cerroazul.app</span> and opens on any phone.']);
      url.textContent = "https://quotedesk-cerroazul.app";
      motion.pop(url);
      STEPS[4].classList.replace("is-on", "is-done");
      sState("deployed · public address", "ok");
      sTime("20 min");
      busy = false; state = "done"; setButtons();
      n.innerHTML = "Twenty minutes, one bug, one public address. Count where the time went: 9 minutes building, 11 minutes testing, describing, reading the fix and testing again. <strong>Judging took longer than building.</strong> That is the normal shape.";
    }
    function reset() {
      state = "idle"; busy = false; setButtons();
      term.innerHTML = ""; term.append(h("span", { class: "dim" }, "Press “Build QuoteDesk v0” to start."));
      appBody.innerHTML = ""; appBody.append(h("p", { style: { color: "#6b6359", margin: 0 } }, "Nothing built yet."));
      url.textContent = "preview · not deployed";
      STEPS.forEach((s) => s.classList.remove("is-on", "is-done", "is-bad"));
      sState("not started"); sTime("0 min");
      n.innerHTML = "Watch for the rhythm: plan, build, test by using, describe the failure, read the fix, test again, deploy.";
    }
  });
})();
