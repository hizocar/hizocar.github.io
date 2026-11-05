/* widgets-class1.js: Class 1 · Ship something today
   c1-cost         · cost of a working prototype, 2015 vs 2020 vs today (responsive chart)
   c1-toolkit      · the toolkit map: six jobs, where each is built and from which building blocks
   c1-vibe-or-not  · vibe it or engineer it: six scenarios, four criteria
   c1-pullpush     · Problem Pull vs AI Push sorter
   c1-brief        · brief builder with a four-part quality meter
   c1-build        · prompt-to-app storyboard with a bug and its recovery */
(function () {
  "use strict";
  const { h, svg, motion, sleep, panel, controls, slider, text, btn, buttons, plot, stat, note, register } = window.VC;

  const usd = (v) => "USD " + Math.round(v).toLocaleString("en-US");
  const live = (el) => { el.setAttribute("aria-live", "polite"); return el; };

  /* ====================================================================
     c1-cost: Cost of a working prototype across three eras
     ==================================================================== */
  register("c1-cost", function (root) {
    panel(root, "What a working prototype costs, then and now",
      "The same tool, QuoteDesk v0, built three ways. Move the sliders: the shape of the chart does not change, only how far the bars sit apart.", "accent");

    // Hours of work per screen, by era. Illustrative, from typical agency / no-code / assistant workflows.
    const ERAS = [
      { label: "2015 · agency build", short: "2015 · agency", hours: 80, days: 10 },
      { label: "2020 · no-code tool", short: "2020 · no-code", hours: 16, days: 2 },
      { label: "Today · assistant", short: "Today · assistant", hours: 0.8, days: 0.25 },
    ];
    let rate = 60, screens = 3;
    const cost = (e) => e.hours * screens * rate;
    const shown = ERAS.map(() => 0);
    let bars = [], geo = null;

    const c = controls(root);
    slider(c, "Hourly rate of the people building (USD)", { min: 20, max: 150, step: 5, value: rate, fmt: (v) => "USD " + v }, (v) => { rate = v; apply(true); });
    slider(c, "Scope: screens in the first version", { min: 1, max: 8, step: 1, value: screens, fmt: (v) => v + (v === 1 ? " screen" : " screens") }, (v) => { screens = v; apply(true); });

    plot(root, {
      label: "Cost of the first working version in 2015, 2020 and today",
      height: (w) => (w < 480 ? 206 : 176),
      draw(el, w, hgt, { first, narrow }) {
        const L = narrow ? 0 : 160, R = narrow ? 0 : 112, rowH = narrow ? 58 : 46, top = narrow ? 4 : 6;
        geo = { L, R, w, narrow };
        bars = ERAS.map((e, i) => {
          const y = top + i * rowH;
          const lab = narrow
            ? svg("text", { x: 0, y: y + 14, style: "font-size:12.5px" }, e.short)
            : svg("text", { x: L - 12, y: y + 25, "text-anchor": "end", style: "font-size:12.5px" }, e.label);
          const rect = svg("rect", { x: L, y: narrow ? y + 22 : y + 7, width: 0, height: narrow ? 22 : 28, rx: 4, class: i === 2 ? "bar-alt" : "bar" });
          const val = narrow
            ? svg("text", { x: w, y: y + 14, "text-anchor": "end", style: "font-size:12.5px;font-weight:600" }, "")
            : svg("text", { x: L + 8, y: y + 25, style: "font-size:12.5px;font-weight:600" }, "");
          el.append(lab, rect, val);
          return { rect, val };
        });
        el.append(svg("text", { x: L, y: hgt - 8, class: "muted", style: "font-size:11.5px" },
          narrow ? "first working version, USD, same scale" : "cost of the first working version, USD (same scale for all three)"));
        apply(first);
      },
    });

    const sCost15 = stat(root, "2015 cost", "");
    const sCostNow = stat(root, "Today's cost", "", "is-accent");
    const sRatio = stat(root, "How much cheaper", "", "is-ok");
    const sIdeas = stat(root, "Ideas you can test for the 2015 budget", "", "is-ok");
    const n = live(note(root, ""));

    function apply(animate) {
      const costs = ERAS.map(cost);
      if (geo && bars.length) {
        const max = Math.max(...costs);
        const width = geo.w - geo.L - geo.R;
        costs.forEach((v, i) => {
          const bw = Math.max(3, (v / max) * width);
          const { rect, val } = bars[i];
          if (animate) {
            motion.attr(rect, "width", bw);
            if (!geo.narrow) motion.attr(val, "x", geo.L + bw + 8);
            motion.count(val, shown[i], v, (x) => usd(x));
          } else {
            rect.setAttribute("width", bw);
            if (!geo.narrow) val.setAttribute("x", geo.L + bw + 8);
            val.textContent = usd(v);
          }
          shown[i] = v;
        });
      }
      const ratio = costs[0] / costs[2];
      const days = Math.max(1, Math.round((ERAS[0].days * screens) / 3));
      sCost15(usd(costs[0]) + " · about " + days + " working day" + (days === 1 ? "" : "s") + " for a team of three");
      sCostNow(usd(costs[2]) + " · about an afternoon");
      sRatio("×" + Math.round(ratio));
      sIdeas(Math.round(ratio).toLocaleString("en-US"));
      n.innerHTML = `With ${screens} screen${screens > 1 ? "s" : ""} at ${usd(rate)} an hour, the 2015 version costs <strong>${usd(costs[0])}</strong> and today's costs <strong>${usd(costs[2])}</strong>. ` +
        `For the money Cerro Azul would have spent on one agency project it can now try <strong>${Math.round(ratio)}</strong> ideas and throw most of them away. The hours per screen (80, 16 and 0.8) are an illustration, not a measurement: your numbers will differ, the direction will not.`;
    }
    apply(false);
  });

  /* ====================================================================
     c1-toolkit: the toolkit map: six jobs, surface + building blocks + class
     ==================================================================== */
  register("c1-toolkit", function (root) {
    panel(root, "The toolkit map: which tool for which job",
      "Six jobs a manager at Cerro Azul could start this week. Pick one to see where it gets built, what it is built from, and where in the course you practice it.", "accent");

    const SURF = { chat: "Chat assistant", builder: "App builder", coding: "Agentic coding assistant", desktop: "Desktop agent app" };
    const BLOCKS = { prompt: "Prompt (a brief)", instr: "Project instructions", skill: "Skill", conn: "Connector (MCP)", agent: "Agent", auto: "Scheduled automation" };
    const JOBS = [
      { k: "page", label: "A public web page", job: "A one-page site that tells restaurants Cerro Azul is piloting faster quotes, and how to send their next order.",
        surf: ["chat", "builder"], blocks: ["prompt"], cls: "Class 1 · today's lab",
        why: "A page is a brief plus structure: who it is for, the one action you want, proof, and the call to action. One conversation produces it and one click publishes it. Nothing is stored, so a prompt is all it needs." },
      { k: "app", label: "An internal app", job: "QuoteDesk: reps paste a customer's message, pick the customer and save the request to today's list.",
        surf: ["builder", "coding"], blocks: ["prompt", "instr"], cls: "Classes 1 and 2",
        why: "Start in an app builder to get a first version in front of a rep today. As soon as it has to keep data and serve several users, move it to an agentic coding assistant working on a repository, with project instructions so you stop repeating the rules." },
      { k: "deck", label: "An eight-slide deck", job: "The Demo Day presentation: the problem, the demo, the evidence, the risks and the decision.",
        surf: ["chat", "desktop"], blocks: ["prompt", "skill"], cls: "Class 5",
        why: "The storyline is yours, written first, one message per slide. A presentation skill turns it into slides in your template, from the build log and the test results. You still own every number on every slide." },
      { k: "report", label: "A weekly report that arrives on its own", job: "Every Monday Carla receives the weekly sales note: quotes sent, quotes won, and the customers who waited longest.",
        surf: ["desktop", "coding"], blocks: ["conn", "agent", "auto"], cls: "Class 3 · governed in Class 4",
        why: "Nobody asks for this report, so a schedule has to start it. Carla's assistant reads the quotes through a connector, writes the note and sends it. Because it runs without her, it needs an owner, a log, an alert when it fails and a spending limit. In Class 3 you build its daily cousin, the 08:00 list of pending quotes." },
      { k: "prices", label: "Answers from the price list in Drive", job: "Paula asks what aceite 900 cc costs for Restaurante Doña Elsa and gets the answer from the current price list.",
        surf: ["chat", "desktop"], blocks: ["conn"], cls: "Class 2 · governed in Class 4",
        why: "Paula's assistant does not know your prices; a connector lets it read the file where they live, with at most the access Paula already has. Grant read before write, one system at a time." },
      { k: "format", label: "Our quote format, every time", job: "Every quote leaves in Cerro Azul's format: items, units, delivery day, validity, and the rep's signature.",
        surf: ["chat", "coding", "desktop"], blocks: ["skill", "instr"], cls: "Class 2",
        why: "Explaining the format in every conversation does not scale past one person. A skill packages \"the way we do quotes here\" once: a short description of when to use it, the steps, and the template. The assistant loads it only when the task matches." },
    ];
    let cur = JOBS[0];

    buttons(root, JOBS.map((j) => ({ label: j.label, value: j.k })), (k) => { cur = JOBS.find((j) => j.k === k); show(true); }, cur.k);
    const job = h("p", { style: { margin: "0.2rem 0 0.7rem", fontSize: "0.95rem" } });
    root.append(job);

    const rowLabel = (t) => h("p", { class: "vc-widget-sub", style: { margin: "0.5rem 0 0", fontWeight: 600 } }, t);
    const surfRow = h("div", { class: "vc-chips" });
    const blockRow = h("div", { class: "vc-chips" });
    const mk = (map, row) => Object.fromEntries(Object.entries(map).map(([k, t]) => { const el = h("span", { class: "vc-chip" }, t); row.append(el); return [k, { el, t }]; }));
    root.append(rowLabel("Where you build it"), surfRow, rowLabel("What it is built from"), blockRow);
    const surfChips = mk(SURF, surfRow), blockChips = mk(BLOCKS, blockRow);

    const sSurf = stat(root, "Start in", "", "is-accent");
    const sBlocks = stat(root, "Building blocks", "");
    const sClass = stat(root, "You practice it in", "", "is-ok");
    const n = live(note(root, ""));

    function paint(chips, active, animate) {
      const lit = [];
      for (const [k, c] of Object.entries(chips)) {
        const on = active.includes(k);
        c.el.className = "vc-chip" + (on ? " is-accent" : "");
        c.el.textContent = (on ? "✓ " : "") + c.t;
        c.el.style.opacity = on ? "1" : "0.55";
        c.el.style.borderColor = on ? "var(--hz-accent)" : "transparent";
        c.el.style.fontWeight = on ? "600" : "400";
        if (on) lit.push(c.el);
      }
      if (animate) lit.forEach((el) => motion.pulse(el));
    }
    function show(animate) {
      job.textContent = cur.job;
      paint(surfChips, cur.surf, animate);
      paint(blockChips, cur.blocks, animate);
      sSurf(SURF[cur.surf[0]]);
      sBlocks(cur.blocks.length + " of 6");
      sClass(cur.cls);
      n.innerHTML = `<strong>${cur.label}.</strong> ${cur.why}`;
      if (animate) motion.enter(n);
    }
    show(false);
  });

  /* ====================================================================
     c1-vibe-or-not: six scenarios, two buttons, four criteria
     ==================================================================== */
  register("c1-vibe-or-not", function (root) {
    panel(root, "Vibe it or engineer it?",
      "Six pieces of software. For each one decide, then read the four criteria. Blast radius is the one that decides most often.", "ai");

    const SC = [
      { t: "QuoteDesk v0: internal tool for 14 reps to paste and save quote requests", ans: "vibe",
        c: { blast: "low: a rep goes back to retyping", users: "14 colleagues who know it is a prototype", reg: "ordinary contact details in a small internal tool; handled in Class 4", life: "weeks, then rebuilt or handed off" },
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
    const LABELS = { blast: "Blast radius", users: "Users", reg: "Regulation", life: "Lifetime" };
    const START = "Decide first, then read the criteria. A chip turns red where the scenario fails a test.";
    let i = 0, score = 0, answered = 0;
    const prog = h("p", { class: "vc-widget-sub" });
    const title = h("strong", {});
    const crit = h("div", { class: "vc-chips" });
    const why = live(h("p", { class: "vc-note", style: { display: "none" } }));
    const card = h("div", { class: "vc-card", style: { marginTop: "0.4rem" } }, title, crit, why);
    root.append(prog, card);
    const bb = h("div", { class: "vc-buttons" });
    root.append(bb);
    const bVibe = btn(bb, "Vibe it", () => answer("vibe"), "vc-btn-accent");
    const bEng = btn(bb, "Engineer it", () => answer("eng"));
    const bNext = btn(bb, "Next scenario", next, "vc-btn-ghost");
    const sScore = stat(root, "Your calls", "0 of 0");
    const n = live(note(root, START));

    function next() {
      if (i === SC.length - 1) { i = 0; score = 0; answered = 0; sScore("0 of 0", ""); n.innerHTML = START; }
      else i++;
      show();
    }
    function show() {
      prog.textContent = `Scenario ${i + 1} of ${SC.length}`;
      title.textContent = SC[i].t;
      crit.innerHTML = "";
      why.style.display = "none";
      bVibe.disabled = bEng.disabled = false;
      bNext.disabled = true;
      bNext.textContent = i === SC.length - 1 ? "Start again" : "Next scenario";
      motion.enter(card);
    }
    function answer(a) {
      const s = SC[i];
      answered++;
      const ok = a === s.ans;
      if (ok) score++;
      bVibe.disabled = bEng.disabled = true;
      bNext.disabled = false;
      const chips = Object.keys(LABELS).map((k) => {
        const red = s.ans === "eng" && !/^(none|low)/.test(s.c[k]);
        return h("span", { class: "vc-chip " + (red ? "is-bad" : "is-ok") }, `${red ? "✗" : "✓"} ${LABELS[k]}: ${s.c[k]}`);
      });
      crit.append(...chips);
      chips.forEach((ch) => (ch.style.opacity = "0"));
      motion.stagger(chips, { step: 0.08 });
      why.style.display = "";
      why.className = "vc-note " + (ok ? "is-ok" : "is-bad");
      why.innerHTML = (ok ? "Right. " : `Not quite: this one is <strong>${s.ans === "vibe" ? "vibe it" : "engineer it"}</strong>. `) + s.why;
      ok ? motion.pop(why) : motion.shake(why);
      sScore(`${score} of ${answered}`, score === answered ? "ok" : "warn");
      n.innerHTML = `${score} of ${answered} calls right${answered === SC.length ? ", all six scenarios done" : ""}. The rule in one line: <strong>vibe when failure is loud, local and cheap; engineer when it is silent, wide or regulated.</strong>`;
    }
    show();
  });

  /* ====================================================================
     c1-pullpush: Problem Pull vs AI Push sorter
     ==================================================================== */
  register("c1-pullpush", function (root) {
    panel(root, "Problem Pull or AI Push?",
      "Eight ideas of the kind you hear in meetings. Sort them. Pull ideas name a user, a number and a moment; Push ideas name a technology.", "ai");

    const IDEAS = [
      { t: "Reps retype every WhatsApp order into the ERP; a quote takes 3 to 6 hours and we lose about one request in ten.", a: "pull", why: "User (reps), numbers (3 to 6 hours, one in ten), moment (every order)." },
      { t: "Let's add a chatbot to the website because our two main competitors have one.", a: "push", why: "Starts with a technology and a competitor. Who asks what, how often, and what does it cost today?" },
      { t: "At the dental clinic, 30% of incoming calls are reschedules and the receptionist cannot answer new patients.", a: "pull", why: "User (receptionist), number (30% of calls), moment (incoming calls)." },
      { t: "Use AI to write all our internal emails.", a: "push", why: "No pain named. Which emails, written by whom, costing how much time?" },
      { t: "Onboarding a contractor takes 11 days because the same four forms are re-entered by three departments.", a: "pull", why: "User (three departments), number (11 days, four forms), moment (onboarding)." },
      { t: "Build an agent that does everything the finance team does.", a: "push", why: "A technology with no boundary. Nothing can be measured, so nothing can be finished." },
      { t: "8% of deliveries have an item mismatch and drivers call the office from the customer's door.", a: "pull", why: "User (drivers, office), number (8%), moment (at the customer's door)." },
      { t: "Connect an AI assistant to our ERP.", a: "push", why: "The most common Push sentence. Translate it: whose five minutes does the ERP waste, and when?" },
    ];
    const START = "The test is mechanical: a named user, a number, a moment. Three yes answers mean Pull.";
    let i = 0, right = 0, done = 0;
    const prog = h("p", { class: "vc-widget-sub" });
    const quote = h("p", { style: { fontSize: "1rem", margin: "0 0 0.4rem" } });
    const fb = live(h("p", { class: "vc-note", style: { display: "none" } }));
    const card = h("div", { class: "vc-card" }, quote, fb);
    root.append(prog, card);
    const bb = h("div", { class: "vc-buttons" });
    root.append(bb);
    const bPull = btn(bb, "Problem Pull", () => answer("pull"), "vc-btn-accent");
    const bPush = btn(bb, "AI Push", () => answer("push"));
    const bNext = btn(bb, "Next idea", next, "vc-btn-ghost");
    const sRight = stat(root, "Sorted correctly", "0 of 0");
    const n = live(note(root, START));

    function next() {
      if (i === IDEAS.length - 1) { i = 0; right = 0; done = 0; sRight("0 of 0", ""); n.innerHTML = START; }
      else i++;
      show();
    }
    function show() {
      prog.textContent = `Idea ${i + 1} of ${IDEAS.length}`;
      quote.textContent = "“" + IDEAS[i].t + "”";
      fb.style.display = "none";
      bPull.disabled = bPush.disabled = false;
      bNext.disabled = true;
      bNext.textContent = i === IDEAS.length - 1 ? "Start again" : "Next idea";
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
     c1-brief: brief builder with a quality meter
     ==================================================================== */
  register("c1-brief", function (root) {
    panel(root, "Build the brief",
      "Four fields become one paragraph. The meter checks what the assistant needs: a role, a number, verbs in order, and a measurable outcome. It starts with the Cerro Azul brief; clear it to write your own. The meter reads English only and is a guide, not a gate: if a good brief scores low, your instructor can sign it off.", "accent");

    const EX = {
      user: "sales reps at Cerro Azul Distribuidora, on a phone between customer visits",
      pain: "retype every WhatsApp quote request into the ERP and take three to six hours to send a quote",
      does: "a rep pastes the customer's message, picks the customer from a list, and saves the request so it appears in today's list",
      metric: "three reps use it for two weeks and quote time drops below one hour",
    };
    const v = Object.assign({}, EX);   // starts with the worked example; "Clear" empties it
    const c = controls(root);
    const fUser = text(c, "1. The user (a role, where they are)", { placeholder: "e.g. receptionists at the clinic's front desk" }, (x) => { v.user = x; draw(); });
    const fPain = text(c, "2. The pain, with a number", { placeholder: "e.g. spend 40 minutes a day on reschedule calls" }, (x) => { v.pain = x; draw(); });
    const fDoes = text(c, "3. What the tool does (verbs, in order)", { placeholder: "e.g. a patient taps a link, picks a new slot, the desk confirms", multiline: true }, (x) => { v.does = x; draw(); });
    const fMetric = text(c, "4. How we know it works (number and when)", { placeholder: "e.g. reschedule calls drop below 10% in two weeks" }, (x) => { v.metric = x; draw(); });

    const bb = h("div", { class: "vc-buttons" });
    root.append(bb);
    btn(bb, "Load the Cerro Azul example", () => {
      fUser.value = EX.user; fPain.value = EX.pain; fDoes.value = EX.does; fMetric.value = EX.metric;
      Object.assign(v, EX); draw();
    }, "vc-btn-ghost");
    btn(bb, "Clear and write your own", () => { fUser.value = fPain.value = fDoes.value = fMetric.value = ""; Object.assign(v, { user: "", pain: "", does: "", metric: "" }); draw(); }, "vc-btn-ghost");
    const bCopy = btn(bb, "Copy the brief", async () => {
      try { await navigator.clipboard.writeText(para.textContent); bCopy.textContent = "Copied"; motion.pop(bCopy); }
      catch (e) { bCopy.textContent = "Select the text and copy"; }
      setTimeout(() => (bCopy.textContent = "Copy the brief"), 1600);
    });

    const para = h("div", { class: "vc-prompt-b", style: { fontSize: "0.95rem" } });
    const wrap = h("div", { class: "vc-prompt is-strong" }, h("div", { class: "vc-prompt-h" }, "Your brief, assembled"), para);
    root.append(wrap);
    const sMeter = stat(root, "Quality meter", "0 of 4");
    const checks = h("div", { class: "vc-chips" });
    root.append(checks);
    const n = live(note(root, ""));

    const VERBS = /\b(paste|pastes|pick|picks|save|saves|see|sees|extract|extracts|send|sends|create|creates|show|shows|list|lists|upload|uploads|draft|drafts|flag|flags|tap|taps|choose|chooses|confirm|confirms|enter|enters|search|searches|open|opens|review|reviews|approve|approves|fill|fills|record|records|mark|marks|scan|scans|type|types|select|selects|submit|submits)\b/i;
    const ROLE = /\b(rep|reps|manager|managers|nurse|nurses|receptionist|receptionists|dispatcher|dispatchers|driver|drivers|analyst|analysts|team|staff|agent|agents|clerk|clerks|accountant|accountants|buyer|buyers|customer|customers|patient|patients|contractor|contractors|supervisor|supervisors|operator|operators|cashier|cashiers|technician|technicians|seller|sellers|assistant|assistants|coordinator|coordinators|partner|partners|department|departments|warehouse|sales|finance|hr|employee|employees|user|users|doctor|doctors|teacher|teachers|student|students|lawyer|lawyers|pharmacist|pharmacists|engineer|engineers|officer|officers|planner|planners|recruiter|recruiters|auditor|auditors|owner|owners|chef|chefs|cook|cooks|crew|vendor|vendors|supplier|suppliers|advisor|advisors|consultant|consultants|dentist|dentists|teller|tellers|broker|brokers|inspector|inspectors|controller|controllers|executive|executives|representative|representatives)\b|\b\w{3,}(ists?|ians?)\b/i;
    // A number means a digit, a number word or a percentage. "Every day" alone is not a number.
    const NUM = /(\d|\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|twenty|thirty|forty|fifty|hundred|thousand|half|third|quarter|dozen|twice)\b|%|\bpercent\b)/i;
    let lastScore = 4;
    fUser.value = EX.user; fPain.value = EX.pain; fDoes.value = EX.does; fMetric.value = EX.metric;

    function draw() {
      const u = v.user.trim(), p = v.pain.trim(), d = v.does.trim(), m = v.metric.trim();
      para.textContent = (u || p || d || m)
        ? `For ${u || "[user]"}, who ${p || "[pain, with a number]"}, the tool is a web page where ${d || "[what the user does, in order]"}. We will know it works when ${m || "[measurable outcome, and when]"}.`
        : "Fill the four fields, or load the example. The paragraph assembles here as you type.";
      const tests = [
        { ok: u.length > 0 && ROLE.test(u) && u.split(/\s+/).length >= 2, label: "User is a role, not “people”" },
        { ok: p.length > 0 && NUM.test(p), label: "Pain has a number" },
        { ok: d.length > 0 && VERBS.test(d) && d.split(/\s+/).length >= 6, label: "Tool is described with verbs, in order" },
        { ok: m.length > 0 && NUM.test(m), label: "Success is measurable, with a when" },
      ];
      const score = tests.filter((t) => t.ok).length;
      checks.innerHTML = "";
      tests.forEach((t) => checks.append(h("span", { class: "vc-chip " + (t.ok ? "is-ok" : "is-bad") }, (t.ok ? "✓ " : "✗ ") + t.label)));
      sMeter(`${score} of 4`, score === 4 ? "ok" : score >= 2 ? "warn" : "bad");
      if (score === 4 && lastScore < 4) motion.pop(wrap);
      lastScore = score;
      n.innerHTML = score === 4
        ? "Four of four. This paragraph is your first prompt, your milestone's first paragraph and the opening line of your Demo Day pitch. Copy it into the build log."
        : score === 0 ? "The meter checks the four things an assistant cannot invent for you: who, how much, what happens, and how you will know."
        : `${score} of 4. Still missing: ${tests.filter((t) => !t.ok).map((t) => t.label.toLowerCase()).join("; ")}. Numbers and roles are what turn a wish into a brief.`;
    }
    draw();
  });

  /* ====================================================================
     c1-build: prompt-to-app storyboard with a bug and its recovery
     ==================================================================== */
  register("c1-build", function (root) {
    panel(root, "From the brief to a public address, with the bug",
      "Replay the live demo step by step. The conversation with the assistant is on the left; the page it produces appears on the right.", "ai");

    const flow = h("div", { class: "vc-flow" });
    const SUBS = ["your paragraph", "plain-language list", "the assistant writes them", "you test by using", "a public address"];
    const STEPS = ["Brief", "Plan", "Files", "Preview", "Deploy"].map((s, i) => h("div", { class: "vc-flow-step" }, h("strong", {}, `${i + 1}. ${s}`), SUBS[i]));
    flow.append(...STEPS);
    root.append(flow);

    const IDLE = "Press “Build QuoteDesk v0” to start.";
    const ADDRESS = "https://quotedesk.example";
    const grid = h("div", { class: "vc-compare", style: { gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" } });
    const term = h("div", { class: "vc-term", style: { minHeight: "11rem", maxHeight: "19rem", overflowY: "auto", margin: 0 }, tabindex: "0", role: "log", "aria-label": "Conversation with the assistant" }, h("span", { class: "dim" }, IDLE));
    const app = h("div", { class: "vc-app", style: { margin: 0 } },
      h("div", { class: "vc-app-bar" }, h("i"), h("i"), h("i"), h("span", { class: "url" }, "preview · not deployed")),
      h("div", { class: "vc-app-body" }, h("p", { style: { color: "#6b6359", margin: 0 } }, "Nothing built yet.")));
    const appBody = app.querySelector(".vc-app-body");
    const url = app.querySelector(".url");
    grid.append(h("div", { style: { padding: 0, border: 0, minWidth: 0 } }, term), h("div", { style: { padding: 0, border: 0, minWidth: 0 } }, app));
    root.append(grid);

    const bb = h("div", { class: "vc-buttons" });
    root.append(bb);
    const bBuild = btn(bb, "Build QuoteDesk v0", build, "vc-btn-accent");
    const bBug = btn(bb, "Run the third test", bug);
    const bFix = btn(bb, "Ask the assistant to fix it", fix);
    const bSkip = btn(bb, "Skip the typing", () => { fast = true; }, "vc-btn-ghost");
    const bReset = btn(bb, "Reset", reset, "vc-btn-ghost");
    const sState = stat(root, "State of the build", "not started");
    const sTime = stat(root, "Elapsed in the demo", "0 min");
    const START = "Watch for the rhythm: plan, build, test by using, describe the failure, read the fix, test again, deploy.";
    const n = live(note(root, START));
    let busy = false, state = "idle", fast = false;
    const cur = h("span", { class: "cur" });
    setButtons();

    function setButtons() {
      bBuild.disabled = busy || state !== "idle";
      bBug.disabled = busy || state !== "built";
      bFix.disabled = busy || state !== "broken";
      bSkip.disabled = !busy;
      bReset.disabled = busy || state === "idle";
    }
    function begin() { busy = true; fast = false; setButtons(); }
    function end(next) { cur.remove(); busy = false; fast = false; state = next; setButtons(); }
    /** Types lines into the terminal. Lines with markup appear at once; plain lines are typed. Skippable. */
    async function say(lines, cps = 120) {
      const instant = () => fast || motion.reduced();
      for (const ln of lines) {
        const row = h("div", {});
        term.append(row, cur);
        if (instant() || /<[a-z]/i.test(ln)) row.innerHTML = ln;
        else {
          for (let k = 0; k < ln.length; k++) {
            if (fast) { row.textContent = ln; break; }
            row.textContent += ln[k];
            if (k % 2) await sleep(2000 / cps);
          }
        }
        term.scrollTop = term.scrollHeight;
        if (!instant()) await sleep(130);
      }
    }
    const pause = (ms) => (fast || motion.reduced() ? Promise.resolve() : sleep(ms));

    function renderApp(mode) {
      appBody.innerHTML = "";
      if (mode === "skeleton") {
        appBody.append(h("div", { class: "skeleton", style: { width: "40%" } }), h("div", { class: "skeleton" }), h("div", { class: "skeleton", style: { width: "70%" } }));
        return;
      }
      const pill = mode === "broken" ? h("span", { class: "pill bad" }, "tap on phone: nothing happens")
        : mode === "fixed" ? h("span", { class: "pill ok" }, "saves on phone and laptop")
        : h("span", { class: "pill ok" }, "works on laptop");
      appBody.append(
        h("h4", {}, "QuoteDesk"),
        h("div", { class: "row" }, h("div", { class: "field" }, "Paste the customer's message…"), h("div", { class: "field", style: { flex: "0 1 9rem" } }, "Customer ▾")),
        h("div", { class: "row" }, h("span", { class: "pill", style: mode === "broken" ? {} : { background: "#b84f1e", color: "#fff8f0" } }, "Save request"), pill),
        h("p", { style: { margin: "0.5rem 0 0.2rem", fontWeight: 600, fontSize: "0.78rem" } }, "Today's requests"),
        h("div", { class: "row" }, h("span", {}, "Restaurante Doña Elsa"), h("span", { class: "pill" }, "20 cajas aceite 900cc, 5 sacos arroz…"), h("span", { class: "pill" }, "14:02")),
        h("div", { class: "row" }, h("span", {}, "Minimarket Los Aromos"), h("span", { class: "pill" }, "lo de siempre + 3 cajas leche"), h("span", { class: "pill" }, "13:41"))
      );
      motion.stagger(appBody.children, { step: 0.05 });
    }
    async function build() {
      begin(); term.innerHTML = "";
      sState("building", "warn");
      STEPS.forEach((s) => s.classList.remove("is-on", "is-done", "is-bad"));
      STEPS[0].classList.add("is-on");
      await say(['<span class="acc">you ›</span> (pastes the brief, three constraints, asks for a plan)']);
      STEPS[0].classList.replace("is-on", "is-done"); STEPS[1].classList.add("is-on");
      await say(['<span class="ok">assistant ›</span> Plan for QuoteDesk v0:', "  1. One page with a text box for the pasted message", "  2. A customer picker with the eight names you gave me", "  3. A Save button that adds the request to today's list", "     (kept on this device for now, no shared storage)", "  4. The list shows customer, first 60 characters, time", "  Shall I build this?"]);
      await say(['<span class="acc">you ›</span> Yes. Nothing more for now.']);
      sTime("4 min");
      STEPS[1].classList.replace("is-on", "is-done"); STEPS[2].classList.add("is-on");
      renderApp("skeleton");
      await say(['<span class="ok">assistant ›</span> Creating the page, the form and the list…', '<span class="dim">  the page · the message form · the request list · a small store for saved requests</span>']);
      await pause(450);
      STEPS[2].classList.replace("is-on", "is-done"); STEPS[3].classList.add("is-on");
      renderApp("built");
      await say(['<span class="ok">assistant ›</span> Done. I built the page as planned. To test: paste a message, pick a customer, press Save; the request appears at the top of the list.']);
      sTime("9 min");
      sState("built · test it by using", "ok");
      end("built");
      n.innerHTML = "Nine minutes to a working page. Now the slow part: use it the way a rep would, three times, in a phone-sized window. Press <strong>Run the third test</strong> to see what it finds.";
    }
    async function bug() {
      begin();
      STEPS[3].classList.remove("is-done", "is-on"); STEPS[3].classList.add("is-bad");
      renderApp("broken");
      await say(['<span class="bad">test 3 ›</span> phone-sized window: paste, pick customer, tap Save. Nothing happens. No message, no new item.']);
      sState("broken on phone", "bad");
      sTime("14 min");
      motion.shake(app);
      end("broken");
      n.innerHTML = "This is the moment the demo is about. The instructor does not open the code. The failure is described <strong>in the user's words</strong> and the assistant is asked to explain before fixing.";
    }
    async function fix() {
      begin();
      await say(['<span class="acc">you ›</span> On a phone-sized screen, I paste, pick a customer and tap Save. Nothing happens. On a laptop it works. Explain what you think is happening, then fix it.']);
      await say(['<span class="ok">assistant ›</span> On narrow screens the customer picker was sitting on top of the Save button, so the tap never reached it. I moved the button below the picker and added a short “Saved” message so the rep gets confirmation. Test again on the phone size.']);
      STEPS[3].classList.remove("is-bad"); STEPS[3].classList.add("is-on");
      renderApp("fixed");
      await say(['<span class="ok">test 4 ›</span> phone-sized window: Save works, “Saved” appears, request at the top of the list.']);
      STEPS[3].classList.replace("is-on", "is-done"); STEPS[4].classList.add("is-on");
      await say(['<span class="acc">you ›</span> Publish it.', `<span class="ok">assistant ›</span> Deployed. Your page is at <span class="acc">${ADDRESS}</span> and opens on any phone.`]);
      url.textContent = ADDRESS;
      motion.pop(url);
      STEPS[4].classList.replace("is-on", "is-done");
      sState("deployed · public address", "ok");
      sTime("20 min");
      end("done");
      n.innerHTML = "Twenty minutes, one bug, one public address. Count where the time went: 9 minutes building, 11 minutes testing, describing, reading the fix and testing again. <strong>Judging took longer than building.</strong> That is the normal shape.";
    }
    function reset() {
      state = "idle"; busy = false; fast = false; setButtons();
      term.innerHTML = ""; term.append(h("span", { class: "dim" }, IDLE));
      appBody.innerHTML = ""; appBody.append(h("p", { style: { color: "#6b6359", margin: 0 } }, "Nothing built yet."));
      url.textContent = "preview · not deployed";
      STEPS.forEach((s) => s.classList.remove("is-on", "is-done", "is-bad"));
      sState("not started", ""); sTime("0 min");
      n.innerHTML = START;
    }
  });
})();
