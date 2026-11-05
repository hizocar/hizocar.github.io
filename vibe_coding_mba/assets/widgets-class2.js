/* widgets-class2.js: Class 2 simulators (Specify, iterate, keep what works)
   c2-spec     · spec quality: weak / medium / strong story → what gets built and how many surprises
   c2-steps    · size of each request vs. chance it works first time and time to find what broke
   c2-commits  · checkpoints, branches, rollback on a QuoteDesk timeline with a live app preview
   c2-data     · where the data lives: in the page / in a file / in a managed database
   c2-ux       · UX for output that is sometimes wrong: confidence, streaming, errors, correction
   c2-skills   · a skill folder opened up: progressive disclosure, the description as the trigger, token cost
   c2-mcp      · connectors (MCP): which doors are open, a request travelling through them, read before write */
(function () {
  "use strict";
  const { h, svg, motion, sleep, panel, controls, slider, text, btn, buttons, toggle, plot, stat, note, register } = window.VC;
  const fmt = (v) => Math.round(v).toLocaleString("en-US");
  const live = (el) => { el.setAttribute("aria-live", "polite"); return el; };
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const keyClick = (el) => el.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); el.click(); } });
  const sub = (t, top) => h("p", { class: "vc-widget-sub", style: { margin: (top || "0.6rem") + " 0 0.2rem" } }, t);

  /* ================= c2-spec ================= */
  register("c2-spec", function (root) {
    panel(root, "Spec quality simulator", "Pick a version of the user story for saving a quote request. See what the assistant will most likely build and how many surprises come with it.", "accent");
    const SPECS = {
      weak: {
        label: "Weak",
        story: "Add a way to save quote requests and make a nice list.",
        builds: [
          ["Free-text customer field", "bad", "Customer typed by hand: typos, duplicates, no link to the ERP."],
          ["Fields: title, description, priority", "bad", "Ticket-style fields guessed from similar apps. No rep, no date, no status."],
          ["Empty requests can be saved", "bad", "No rule was given, so no rule was built."],
          ["List sorted alphabetically", "bad", "Newest first was never asked for."],
          ["Desktop layout only", "bad", "Reps use phones. Nobody said so."],
          ["A 'priority' dropdown", "bad", "Nobody asked. Common in ticket apps, so the assistant added it."],
        ],
        criteria: ["Customer chosen from the existing list", "Fields: customer, message, date, rep, status", "Empty message cannot be saved", "Newest request first", "Works on a phone screen"],
      },
      medium: {
        label: "Medium",
        story: "As a rep, I want to paste a customer message and save it as a quote request for a customer, so I stop retyping. It should show in a list.",
        builds: [
          ["Customer chosen from a list", "ok", "The story named a customer, so the assistant used the customer list."],
          ["Fields: customer, message, date", "warn", "Rep and status are missing: they were not mentioned."],
          ["Empty requests can be saved", "bad", "The failure case was not specified."],
          ["List newest first", "ok", "A reasonable guess, this time correct."],
          ["Desktop layout, usable on a phone with zoom", "warn", "The phone was not named, so the layout was not built for it."],
        ],
        criteria: ["Fields include rep and status", "Empty message cannot be saved", "Phone layout without sideways scrolling"],
      },
      strong: {
        label: "Strong",
        story: "As a Cerro Azul rep on a phone, I want to paste a WhatsApp message and save it as a quote request for one customer chosen from the list. Criteria: fields customer, message, date, rep, status 'new'; save disabled while empty; newest first with customer, date and first line; phone layout without sideways scrolling.",
        builds: [
          ["Customer search over the existing list", "ok", "Exactly as specified."],
          ["Fields: customer, message, date, rep, status", "ok", "All five fields, nothing extra."],
          ["Save disabled while empty", "ok", "The failure case was written, so it was built."],
          ["List newest first, with first line of message", "ok", "As specified."],
          ["Phone layout, no sideways scroll", "ok", "The device was named."],
        ],
        criteria: [],
      },
    };
    const c = controls(root);
    let cur = "weak";
    buttons(c, Object.entries(SPECS).map(([k, v]) => ({ label: v.label + " story", value: k })), (v) => { cur = v; draw(); }, cur);
    const storyBox = h("div", { class: "vc-prompt" }, h("div", { class: "vc-prompt-h" }, "You, to the assistant"), h("div", { class: "vc-prompt-b" }));
    root.append(storyBox);
    const setSurprises = stat(root, "Surprises in the next hour", "", "is-bad");
    const setCrit = stat(root, "Criteria that would have prevented them", "", "is-ok");
    const list = h("div", { class: "vc-cards" });
    root.append(sub("What the assistant will most likely build:"), list);
    const critList = h("ul", { style: { fontSize: "0.84rem", margin: "0.2rem 0 0" } });
    const critWrap = h("div", {}, sub("Missing acceptance criteria:"), critList);
    root.append(critWrap);
    const n = live(note(root, ""));
    function draw() {
      const s = SPECS[cur];
      storyBox.className = "vc-prompt " + (cur === "weak" ? "is-weak" : cur === "strong" ? "is-strong" : "");
      storyBox.lastChild.textContent = s.story;
      const bad = s.builds.filter((b) => b[1] !== "ok").length;
      setSurprises(String(bad), bad === 0 ? "ok" : bad < 3 ? "warn" : "bad");
      setCrit(String(s.criteria.length), "ok");
      list.innerHTML = "";
      s.builds.forEach((b) => {
        list.append(h("div", { class: "vc-card", style: { opacity: 0 } },
          h("span", { class: "vc-chip is-" + b[1], style: { marginBottom: "0.3rem", display: "inline-block" } }, b[1] === "ok" ? "as asked" : b[1] === "warn" ? "partly guessed" : "surprise"),
          h("strong", {}, b[0]), b[2]));
      });
      motion.stagger(list.children, { step: 0.06 });
      critList.innerHTML = "";
      critWrap.style.display = s.criteria.length ? "" : "none";
      s.criteria.forEach((t) => critList.append(h("li", {}, t)));
      n.className = "vc-note " + (bad === 0 ? "is-ok" : bad < 3 ? "is-warn" : "is-bad");
      n.innerHTML = bad === 0
        ? "Five criteria, zero surprises. The strong story takes three more minutes to write and saves an hour of rebuilding."
        : `The ${s.label.toLowerCase()} story leaves <strong>${bad}</strong> decision${bad > 1 ? "s" : ""} to the assistant. Each one becomes a rebuild in the lab. ${s.criteria.length} written criteria would have prevented them.`;
    }
    draw();
  });

  /* ================= c2-steps ================= */
  register("c2-steps", function (root) {
    panel(root, "Small steps vs big bang", "Drag the slider: how many features do you ask for in one request? The chance the build works first time drops fast, and the time to find what broke grows.", "ai");
    const c = controls(root);
    let k = 1;
    slider(c, "Features per request", { min: 1, max: 10, step: 1, value: 1, fmt: (v) => String(v) }, (v) => { k = v; update(true); });
    const setP = stat(root, "Works first time", "", "is-ok");
    const setT = stat(root, "Minutes to find the cause when it breaks", "", "is-warn");
    const setTot = stat(root, "Expected minutes for 10 features", "", "is-accent");
    root.append(h("div", { class: "vc-chips" },
      h("span", { class: "vc-chip is-ok" }, h("span", { style: { color: "var(--vc-ok)" } }, "● "), "works first time (0 to 100%)"),
      h("span", { class: "vc-chip is-bad" }, h("span", { style: { color: "var(--vc-bad)" } }, "● "), "minutes to find the cause (0 to 230)")));
    const TMAX = 230;
    const pOf = (v) => Math.pow(0.9, v);          // each feature has a 90% chance of being right
    const tOf = (v) => 3 + 2.2 * v * v;           // tangled changes take longer to isolate
    let sc = null;                                 // scales and moving marks of the current drawing
    plot(root, {
      label: "Chance of working first time falls and minutes to find the cause rise as one request carries more features",
      height: 230,
      draw(el, W, H, { first, narrow }) {
        const L = narrow ? 40 : 46, R = 14, T = 14, B = 40;
        const x = (v) => L + ((v - 1) / 9) * (W - L - R);
        const yP = (p) => T + (1 - p) * (H - T - B);
        const yT = (t) => T + (1 - Math.min(t, TMAX) / TMAX) * (H - T - B);
        [0, 0.25, 0.5, 0.75, 1].forEach((p) => {
          el.append(svg("line", { x1: L, x2: W - R, y1: yP(p), y2: yP(p), class: "grid" }));
          el.append(svg("text", { x: L - 6, y: yP(p) + 4, "text-anchor": "end", class: "muted" }, Math.round(p * 100) + "%"));
        });
        for (let v = 1; v <= 10; v++) el.append(svg("text", { x: x(v), y: H - B + 16, "text-anchor": "middle", class: "muted" }, v));
        el.append(svg("text", { x: (L + W - R) / 2, y: H - 6, "text-anchor": "middle", class: "muted" }, "features in one request"));
        const dP = [], dT = [];
        for (let v = 1; v <= 10; v += 0.25) { dP.push(`${x(v).toFixed(1)},${yP(pOf(v)).toFixed(1)}`); dT.push(`${x(v).toFixed(1)},${yT(tOf(v)).toFixed(1)}`); }
        const lp = svg("polyline", { points: dP.join(" "), class: "ln-ok" });
        const lt = svg("polyline", { points: dT.join(" "), class: "ln-bad" });
        const cursor = svg("line", { x1: x(k), x2: x(k), y1: T, y2: H - B, class: "ax", "stroke-dasharray": "4 3" });
        const dotP = svg("circle", { cx: x(k), cy: yP(pOf(k)), r: 6, style: "fill:var(--vc-ok)" });
        const dotT = svg("circle", { cx: x(k), cy: yT(tOf(k)), r: 6, style: "fill:var(--vc-bad)" });
        el.append(lp, lt, cursor, dotP, dotT);
        sc = { x, yP, yT, cursor, dotP, dotT };
        if (first && window.Motion && !motion.reduced()) {
          // the two curves are wiped in from the left, once, when the chart is first seen
          const rect = svg("rect", { x: 0, y: 0, width: 0, height: H });
          el.append(svg("clipPath", { id: "c2-steps-wipe" }, rect));
          lp.setAttribute("clip-path", "url(#c2-steps-wipe)");
          lt.setAttribute("clip-path", "url(#c2-steps-wipe)");
          let shown = false;
          const reveal = () => { if (shown) return; shown = true; motion.attr(rect, "width", W, { duration: 0.8 }); };
          motion.onView(el, reveal);
          setTimeout(reveal, 2500);   // never leave the curves hidden
        }
      },
    });
    const n = live(note(root, ""));
    const oneAtATime = 10 * (6 + (1 - pOf(1)) * (tOf(1) + 6));
    function update(animate) {
      const p = pOf(k), t = tOf(k);
      setP(Math.round(p * 100) + "%", p > 0.7 ? "ok" : p > 0.45 ? "warn" : "bad");
      setT(fmt(t), t < 10 ? "ok" : t < 60 ? "warn" : "bad");
      // 10 features in requests of size k: each request costs 6 min to build and test, plus recovery when it fails
      const reqs = Math.ceil(10 / k);
      const total = reqs * (6 + (1 - p) * (t + 6));
      setTot(fmt(total), total < 90 ? "ok" : total < 150 ? "warn" : "bad");
      if (sc) {
        const set = (el, name, to) => (animate ? motion.attr(el, name, to) : el.setAttribute(name, to));
        set(sc.cursor, "x1", sc.x(k)); set(sc.cursor, "x2", sc.x(k));
        set(sc.dotP, "cx", sc.x(k)); set(sc.dotP, "cy", sc.yP(p));
        set(sc.dotT, "cx", sc.x(k)); set(sc.dotT, "cy", sc.yT(t));
      }
      n.className = "vc-note " + (k <= 2 ? "is-ok" : k <= 4 ? "is-warn" : "is-bad");
      n.innerHTML = k === 1
        ? `One feature per request: nine in ten work first time, and when one fails you know exactly which change caused it. Ten features cost about <strong>${fmt(total)} minutes</strong> in total.`
        : `${k} features per request: only <strong>${Math.round(p * 100)}%</strong> work first time, and untangling a failure takes about <strong>${fmt(t)} minutes</strong>. Ten features cost about <strong>${fmt(total)} minutes</strong>, against ${fmt(oneAtATime)} one at a time. The model assumes each feature has a 90% chance of being right and that tangled changes take longer to isolate.`;
    }
    update(false);
  });

  /* ================= c2-commits ================= */
  register("c2-commits", function (root) {
    panel(root, "Checkpoints, branches and undo", "QuoteDesk's history as a line of checkpoints. Make changes, break something, roll back, try an experiment on a branch, merge. The app preview shows the state you are on.", "accent");
    let main = [{ name: "v0 from session 1", state: { customer: false, login: false, layout: "list" } }];
    let branch = null;            // { base: index, commits: [...] }
    let head = { on: "main", i: 0 };
    let broken = false;
    let applied = 0;              // how many of CHANGES are already on the main line
    let expN = 0;                 // how many experiments have been started
    const EXPS = [{ name: "card layout for the list", layout: "cards" }, { name: "compact rows for the list", layout: "compact" }];
    const CHANGES = [
      { name: "customer picker working", apply: (s) => ({ ...s, customer: true }) },
      { name: "database and login working", apply: (s) => ({ ...s, login: true }) },
      { name: "empty and loading states", apply: (s) => ({ ...s, states: true }) },
      { name: "phone layout fixed", apply: (s) => ({ ...s, phone: true }) },
    ];
    const bar = h("div", { class: "vc-buttons" });
    root.append(bar);
    const bChange = btn(bar, "Make a change", () => makeChange(), "");
    btn(bar, "Break something", () => breakIt(), "vc-btn-ghost");
    const bBack = btn(bar, "Roll back", () => rollback(), "vc-btn-accent");
    const bBranch = btn(bar, "Start a branch (experiment)", () => startBranch(), "vc-btn-ghost");
    const bMerge = btn(bar, "Merge the branch", () => merge(), "vc-btn-ghost");
    const bDiscard = btn(bar, "Discard the branch", () => discard(), "vc-btn-ghost");
    const tl = h("ul", { class: "vc-timeline" });
    const brTitle = sub("Branch (the experiment):", "0.4rem");
    const brl = h("ul", { class: "vc-timeline" });
    root.append(sub("Main line (the version that works):", "0.4rem"), tl, brTitle, brl);
    const app = h("div", { class: "vc-app" },
      h("div", { class: "vc-app-bar" }, h("i"), h("i"), h("i"), h("span", { class: "url" }, "quotedesk-cerroazul.app")),
      h("div", { class: "vc-app-body" }));
    root.append(app);
    const body = app.lastChild;
    const n = live(note(root, ""));
    function curState() {
      if (broken) return null;
      return head.on === "main" ? main[head.i].state : branch.commits[head.i].state;
    }
    function render() {
      const s = curState();
      body.innerHTML = "";
      if (!s) {
        body.append(h("h4", {}, "QuoteDesk"),
          h("div", { class: "row" }, h("span", { class: "pill bad" }, "Error: the list failed to load")),
          h("p", { style: { color: "#b3261e", fontSize: "0.8rem", margin: "0.3rem 0 0" } }, "The calendar view replaced the list and broke the data loading."));
        motion.shake(app);
        return;
      }
      body.append(h("h4", {}, "QuoteDesk" + (s.login ? " · signed in as Paula (rep)" : "")));
      if (head.on === "branch") body.append(h("div", { class: "row" }, h("span", { class: "pill warn" }, "experiment, not on the main line")));
      body.append(h("div", { class: "row" },
        h("span", { class: "field" }, s.customer ? "Customer: Restaurante Doña Elsa ▾" : "Customer (type the name)"),
        h("span", { class: "field" }, "Paste WhatsApp message…"),
        h("span", { class: "pill" }, "Save")));
      const items = ["Minimarket Los Aromos · today 10:12 · 20 cajas aceite 900cc…", "Restaurante Doña Elsa · today 09:40 · 5 sacos arroz…"];
      if (s.layout === "cards") body.append(h("div", { class: "row" }, items.map((t) => h("span", { class: "field" }, t))));
      else if (s.layout === "compact") items.forEach((t) => body.append(h("div", { class: "row", style: { fontSize: "0.78rem", margin: "0.1rem 0" } }, "· " + t.split(" · ").slice(0, 2).join(" · "))));
      else items.forEach((t) => body.append(h("div", { class: "row" }, h("span", { class: "pill ok" }, "new"), t)));
      if (s.states) body.append(h("div", { class: "row" }, h("span", { class: "pill" }, "empty and loading states on")));
      if (s.phone) body.append(h("div", { class: "row" }, h("span", { class: "pill ok" }, "fits a phone screen")));
      motion.enter(body);
    }
    function point(li, label, action) {
      li.setAttribute("tabindex", "0");
      li.setAttribute("role", "button");
      li.setAttribute("aria-label", label);
      li.addEventListener("click", action);
      keyClick(li);
    }
    function drawTimeline() {
      tl.innerHTML = "";
      main.forEach((cm, i) => {
        const li = h("li", { class: head.on === "main" && head.i === i && !broken ? "is-head" : "" }, h("strong", {}, "checkpoint " + (i + 1)), cm.name);
        point(li, "Go to checkpoint " + (i + 1) + ": " + cm.name, () => { head = { on: "main", i }; broken = false; sync("Moved to checkpoint " + (i + 1) + ". Any checkpoint can be revisited in seconds."); });
        tl.append(li);
      });
      if (broken) tl.append(h("li", { class: "is-bad" }, h("strong", {}, "unsaved change"), "calendar view (broken)"));
      brTitle.style.display = brl.style.display = branch ? "" : "none";
      brl.innerHTML = "";
      if (branch) {
        brl.append(h("li", { class: "is-branch", style: { opacity: 0.7, cursor: "default" } }, h("strong", {}, "from checkpoint " + (branch.base + 1)), "branch: new list layout"));
        branch.commits.forEach((cm, i) => {
          const li = h("li", { class: "is-branch " + (head.on === "branch" && head.i === i ? "is-head" : "") }, h("strong", {}, "experiment " + (i + 1)), cm.name);
          point(li, "Go to experiment " + (i + 1) + ": " + cm.name, () => { head = { on: "branch", i }; broken = false; sync("On the branch. The main line is untouched."); });
          brl.append(li);
        });
      }
      bMerge.disabled = bDiscard.disabled = !branch;
      bBranch.disabled = !!branch;
      bBack.disabled = !broken && !(head.on === "main" && head.i > 0);
      bChange.disabled = head.on === "branch" || applied >= CHANGES.length;
    }
    function sync(msg, tone) {
      drawTimeline(); render();
      n.className = "vc-note " + (tone ? "is-" + tone : "");
      n.innerHTML = msg;
    }
    function makeChange() {
      if (head.on !== "main") return;
      if (head.i !== main.length - 1) { sync("You are on an older checkpoint. Click the latest one before making changes.", "warn"); return; }
      const next = CHANGES[applied];
      if (!next) return;
      applied += 1;
      broken = false;
      main.push({ name: next.name, state: next.apply(main[main.length - 1].state) });
      head = { on: "main", i: main.length - 1 };
      sync(`The story passed the test, so a checkpoint was saved: <strong>“${esc(next.name)}”</strong>. ${main.length} checkpoints on the main line.`, "ok");
      motion.pop(tl.lastElementChild);
    }
    function breakIt() {
      if (head.on !== "main") { head = { on: "main", i: main.length - 1 }; }
      broken = true;
      sync("You asked for a calendar view you did not need, and the list broke. Nothing is lost: the last checkpoint is one click away.", "bad");
    }
    function rollback() {
      if (broken) { broken = false; sync(`Rolled back to <strong>“${esc(main[head.i].name)}”</strong>. The broken change is gone and the checkpoint is exactly as it was. Seconds, not hours.`, "ok"); return; }
      if (head.on === "main" && head.i > 0) { head.i -= 1; sync(`Rolled back one checkpoint to <strong>“${esc(main[head.i].name)}”</strong>. Later checkpoints still exist if you want them back.`, "ok"); }
    }
    function startBranch() {
      if (branch) return;
      const base = head.on === "main" ? head.i : main.length - 1;
      broken = false;
      const exp = EXPS[expN % EXPS.length]; expN += 1;
      branch = { base, commits: [{ name: exp.name, state: { ...main[base].state, layout: exp.layout } }] };
      head = { on: "branch", i: 0 };
      sync("Branch started from checkpoint " + (base + 1) + ". The experiment (" + exp.name + ") lives here while Diego keeps working on the main line.", "warn");
    }
    function merge() {
      if (!branch) return;
      const last = branch.commits[branch.commits.length - 1];
      main.push({ name: "merged: " + last.name, state: { ...main[main.length - 1].state, layout: last.state.layout } });
      branch = null; head = { on: "main", i: main.length - 1 };
      sync("Merged. The experiment passed the test, so it joined the main line as a new checkpoint. Everything done on the main line meanwhile is kept.", "ok");
      motion.pop(tl.lastElementChild);
    }
    function discard() {
      if (!branch) return;
      const base = branch.base;
      branch = null; head = { on: "main", i: base };
      sync("Branch discarded. The experiment did not pass, and the main line never noticed it existed.", "");
    }
    sync("Start: one checkpoint, “v0 from session 1”. Make a change to save the next one.");
  });

  /* ================= c2-data ================= */
  register("c2-data", function (root) {
    panel(root, "Where the data lives", "Pick where QuoteDesk keeps its quote requests, then run the three tests every real app must pass: refresh, a second rep, a phone.", "ai");
    const OPTS = [
      { k: "page", t: "In the page", d: "Browser memory. Free, instant, forgets everything on refresh.", refresh: false, second: false, phone: false, auth: false },
      { k: "file", t: "In a file on the server", d: "Survives refresh. Two people saving at once can overwrite each other. No idea who is who.", refresh: true, second: "partial", phone: true, auth: false },
      { k: "db", t: "In a managed database", d: "Rows, many users at once, backups, and a login built in. The assistant sets it up in a few requests.", refresh: true, second: true, phone: true, auth: true },
    ];
    let cur = "page", runId = 0;
    const cards = h("div", { class: "vc-cards" });
    root.append(cards);
    const cardEls = OPTS.map((o) => {
      const el = h("div", { class: "vc-card is-pick", tabindex: 0, role: "button", "aria-pressed": String(o.k === cur) }, h("strong", {}, o.t), o.d);
      el.addEventListener("click", () => { cur = o.k; cardEls.forEach((x, i) => x.setAttribute("aria-pressed", String(OPTS[i].k === cur))); motion.pop(el); draw(); });
      keyClick(el);
      cards.append(el); return el;
    });
    const flow = h("div", { class: "vc-flow" });
    const steps = [["Paula saves 3 requests", "She pastes three messages and saves."], ["Refresh the page", "Do the requests survive?"], ["Diego opens the app", "Does he see the shared queue, safely?"], ["Open on a phone", "Same data, another device?"]].map(([a, b]) => h("div", { class: "vc-flow-step" }, h("strong", {}, a), b));
    steps.forEach((s) => flow.append(s));
    root.append(flow);
    const bar = h("div", { class: "vc-buttons" }); root.append(bar);
    const run = btn(bar, "Run the three tests", () => test(), "vc-btn-accent");
    const setRows = stat(root, "Requests visible after the tests", "", "is-accent");
    const setAuth = stat(root, "Knows who saved what", "", "is-ok");
    const n = live(note(root, ""));
    function draw() {
      runId++;
      run.disabled = false;
      const o = OPTS.find((x) => x.k === cur);
      steps.forEach((s) => s.classList.remove("is-on", "is-done", "is-bad"));
      setRows("not run yet", "accent"); setAuth(o.auth ? "yes" : "no", o.auth ? "ok" : "bad");
      n.className = "vc-note";
      n.innerHTML = `Selected: <strong>${o.t}</strong>. Press “Run the three tests”.`;
    }
    async function test() {
      const id = ++runId;
      const o = OPTS.find((x) => x.k === cur);
      run.disabled = true;
      steps.forEach((s) => s.classList.remove("is-on", "is-done", "is-bad"));
      const results = [true, o.refresh, o.second, o.phone];
      let visible = 3;
      for (let i = 0; i < steps.length; i++) {
        steps[i].classList.add("is-on"); motion.pulse(steps[i]);
        await sleep(motion.reduced() ? 0 : 480);
        if (id !== runId) return;
        steps[i].classList.remove("is-on");
        const r = results[i];
        if (r === true) steps[i].classList.add("is-done");
        else { steps[i].classList.add("is-bad"); visible = r === "partial" ? 2 : 0; motion.shake(steps[i]); }
      }
      setRows(visible + " of 3", visible === 3 ? "ok" : "bad");
      const msgs = {
        page: "Refresh: the three requests are gone. Diego sees an empty list. The phone sees nothing. Good for the first hour of session 1, useless for a second rep.",
        file: "Refresh: fine. Diego opens the app at the same moment Paula saves and one request is overwritten (2 remain). Nobody knows who saved what. Works for one person, fails for a team.",
        db: "All three pass: the requests survive refresh, Diego sees the shared queue of requests, the phone shows the same data, and each row carries the rep who created it. This is what milestone M2 requires.",
      };
      n.className = "vc-note " + (cur === "db" ? "is-ok" : cur === "file" ? "is-warn" : "is-bad");
      n.innerHTML = msgs[cur];
      run.disabled = false;
    }
    draw();
  });

  /* ================= c2-ux ================= */
  register("c2-ux", function (root) {
    panel(root, "UX for output that is sometimes wrong", "QuoteDesk reads a pasted message and proposes items. Switch each pattern on or off and watch what Paula sees and how much she can trust it.", "ai");
    const MSG = "hola, necesito 20 cajas de aceite 900cc, 5 sacos de arroz y lo de siempre de lácteos para el jueves";
    const LINES = [
      { p: "Aceite 900 cc", q: "20 cajas", conf: 0.97 },
      { p: "Arroz (saco 25 kg)", q: "5 sacos", conf: 0.93 },
      { p: "Lácteos: usual order (last 3 deliveries)", q: "? guess", conf: 0.41 },
    ];
    const state = { conf: false, stream: false, error: false, correct: false, mode: "ok" };
    const c = controls(root);
    buttons(c, [{ label: "Normal message", value: "ok" }, { label: "Message with no order", value: "none" }], (v) => { state.mode = v; draw(true); }, "ok");
    const sw = h("div", { class: "vc-switches" });
    root.append(sw);
    [["conf", "Show confidence"], ["stream", "Stream the result"], ["error", "Honest errors"], ["correct", "Let the user correct"]]
      .forEach(([key, label]) => toggle(sw, label, (on) => { state[key] = on; draw(true); }, false));
    const setTrust = stat(root, "Trust after one week of use", "", "is-accent");
    const setChecks = stat(root, "Lines Paula must check", "", "is-warn");
    const app = h("div", { class: "vc-app" }, h("div", { class: "vc-app-bar" }, h("i"), h("i"), h("i"), h("span", { class: "url" }, "quotedesk-cerroazul.app/new")), h("div", { class: "vc-app-body" }));
    root.append(app);
    const body = app.lastChild;
    const n = live(note(root, ""));
    let runId = 0;
    async function draw(animate) {
      const id = ++runId;
      // trust model: each pattern adds to a low baseline
      let trust = 35;
      if (state.conf) trust += 25;
      if (state.correct) trust += 20;
      if (state.error) trust += 10;
      if (state.stream) trust += 8;
      trust = Math.min(trust, 96);
      const checks = state.conf ? 1 : 3;
      setTrust(trust + "%", trust > 75 ? "ok" : trust > 50 ? "warn" : "bad");
      setChecks(state.mode === "none" ? "0" : String(checks), checks === 1 || state.mode === "none" ? "ok" : "bad");
      const on = ["conf", "stream", "error", "correct"].filter((k) => state[k]).length;
      n.className = "vc-note " + (trust > 75 ? "is-ok" : trust > 50 ? "is-warn" : "is-bad");
      n.innerHTML = state.mode === "none"
        ? (state.error ? "The honest error says what happened and offers the next step. Paula stays in the tool." : "A generic error teaches the rep that the tool fails for no reason. Turn on <strong>honest errors</strong>.")
        : on === 0 ? `All three lines look equally certain, including the guess about dairy. After one wrong delivery Paula checks every line, and the tool saves no time. Trust: <strong>${trust}%</strong>.`
        : `${on} of 4 patterns on. Paula checks <strong>${checks}</strong> line${checks > 1 ? "s" : ""}${checks === 1 ? " instead of three" : ""}${state.correct ? ", and every fix is saved" : ""}. Trust after a week: <strong>${trust}%</strong>.`;

      body.innerHTML = "";
      body.append(h("h4", {}, "New quote request · Restaurante Doña Elsa"), h("div", { class: "row" }, h("span", { class: "field" }, state.mode === "ok" ? MSG : "hola, me llamas?")));
      if (state.mode === "none") {
        if (state.error) body.append(h("div", { class: "row" }, h("span", { class: "pill warn" }, "No items found in this message")), h("div", { class: "row" }, h("span", { class: "pill" }, "Open manual form"), h("span", { class: "pill" }, "Save as call-back note")));
        else body.append(h("div", { class: "row" }, h("span", { class: "pill bad" }, "Something went wrong")));
        return;
      }
      const table = h("div", {});
      body.append(table);
      const rows = LINES.map((l) => {
        const unsure = state.conf && l.conf < 0.6;
        return h("div", { class: "row" },
          h("span", { class: "field", style: unsure ? { borderColor: "#a8740a", background: "rgba(168,116,10,0.08)" } : {} }, l.p),
          h("span", { class: "field", style: { flex: "0 1 6rem" } }, l.q),
          unsure ? h("span", { class: "pill warn" }, "unsure · " + Math.round(l.conf * 100) + "%") : state.conf ? h("span", { class: "pill ok" }, Math.round(l.conf * 100) + "%") : null,
          state.correct ? h("span", { class: "pill" }, "edit") : null);
      });
      const tail = () => { if (state.correct) body.append(h("div", { class: "row" }, h("span", { class: "pill ok" }, "Corrections are saved"))); };
      if (!animate || motion.reduced()) { rows.forEach((r) => table.append(r)); tail(); return; }
      if (state.stream) {
        // lines arrive one by one: the wait is visible progress
        table.append(h("div", { class: "skeleton", style: { width: "60%" } }));
        for (const r of rows) {
          await sleep(380);
          if (id !== runId) return;
          table.lastChild.remove();
          table.append(r); motion.enter(r);
          if (r !== rows[rows.length - 1]) table.append(h("div", { class: "skeleton", style: { width: "50%" } }));
        }
      } else {
        // everything at once after a blank wait
        const sk = h("div", { class: "skeleton", style: { width: "60%" } });
        table.append(sk);
        await sleep(1100);
        if (id !== runId) return;
        sk.remove();
        rows.forEach((r) => table.append(r));
        motion.stagger(rows);
      }
      tail();
    }
    draw(false);
  });

  /* ================= c2-skills ================= */
  register("c2-skills", function (root) {
    panel(root, "A skill, opened up", "Left: the skills folder; click a file to read it. Right: three things Paula asks. Run one and watch what the assistant loads. Then rewrite the description and run again.", "accent");
    const STRONG = "Drafts or checks a Cerro Azul quote in the house format. Use whenever the user asks for a quote, cotización or price offer for a customer, or pastes a quote request.";
    const VAGUE = "Formats quotes.";
    let desc = STRONG, file = "skill", req = "quote", runId = 0, loadedNow = 1400;

    const grid = h("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 270px), 1fr))", gap: "0.4rem 1.1rem", alignItems: "start" } });
    const left = h("div", {}), right = h("div", {});
    grid.append(left, right);
    root.append(grid);

    /* ---- left: folder and file ---- */
    const fileBtns = {};
    const fb = (key, label) => { const b = h("button", { type: "button", "aria-pressed": String(key === file) }, label); b.addEventListener("click", () => { file = key; showFile(true); }); fileBtns[key] = b; return b; };
    const tree = h("ul", { class: "vc-tree", "aria-label": "Skills folder" },
      h("li", {}, h("span", { class: "dim" }, "skills/"),
        h("ul", {},
          h("li", {}, "quote-format/",
            h("ul", {},
              h("li", {}, fb("skill", "SKILL.md")),
              h("li", {}, fb("template", "template.md")),
              h("li", {}, "examples/", h("ul", {}, h("li", {}, fb("example", "dona-elsa.md")))))),
          h("li", {}, "weekly-sales-note/", h("ul", {}, h("li", {}, fb("weekly", "SKILL.md")))),
          h("li", {}, h("span", { class: "dim" }, "… 18 more skills")))));
    const doc = h("div", { class: "vc-doc", "aria-live": "polite", tabindex: "0", "aria-label": "File contents" });
    if (window.matchMedia && window.matchMedia("(max-width: 600px)").matches) { doc.style.maxHeight = "15rem"; doc.style.overflowY = "auto"; }
    left.append(sub("20 skills installed. Only two are shown.", "0"), tree, doc);
    const FILES = {
      skill: () =>
        `<span class="c">---</span>\n<span class="k">name:</span> quote-format\n<span class="k">description:</span> <mark>${esc(desc.trim() || "(empty)")}</mark>\n<span class="c">---</span>\n<span class="s"># Cerro Azul quote format</span>\n1. Find the customer in the customer list. If there is no match, stop and ask.\n2. One line per product: code, name, quantity, unit, list price in CLP.\n3. Mark any line you are not sure about with CHECK and say why.\n4. Never apply a discount. Discounts need Carla's approval.\n5. Fill template.md. Compare with examples/dona-elsa.md before answering.`,
      template: () =>
        `<span class="s"># Quote · {customer} · {date}</span>\nRep: {rep} · Valid for: 7 days\n\nCode · Product · Qty · Unit · List price (CLP)\n{one line per product}\n\nDelivery: {day}, {route}\n<span class="c">Lines marked CHECK need a call to the customer.</span>`,
      example: () =>
        `<span class="s"># Quote · Restaurante Doña Elsa · 12-11-2026</span>\nRep: Paula · Valid for: 7 days\n\nAC-900 · Aceite 900 cc · 20 · caja de 12 · 18,900\nAR-25 · Arroz grado 1 · 5 · saco 25 kg · 21,500\nLácteos "lo de siempre" · <mark>CHECK: usual order not stated</mark>\n\nDelivery: Thursday, Ñuñoa route`,
      weekly: () =>
        `<span class="c">---</span>\n<span class="k">name:</span> weekly-sales-note\n<span class="k">description:</span> Writes the Monday sales note for Carla from last week's quote requests. Use when asked for the weekly note, weekly summary or Monday report.\n<span class="c">---</span>\n<span class="s"># Weekly sales note</span>\n1. Count requests, quotes sent and quotes won last week.\n2. Three customers to call this week, with the reason.\n3. Half a page. No adjectives.`,
    };
    function showFile(animate) {
      Object.entries(fileBtns).forEach(([k, b]) => b.setAttribute("aria-pressed", String(k === file)));
      doc.innerHTML = FILES[file]();
      if (animate) motion.anim(doc, { opacity: [0.4, 1] }, { duration: motion.DUR.std });
    }

    /* ---- left: the description is the trigger ---- */
    const ed = text(left, "Rewrite the description of quote-format", { value: desc, multiline: true }, (v) => { desc = v; onDesc(); });
    const edBar = h("div", { class: "vc-buttons" });
    left.append(edBar);
    btn(edBar, "Try a vague one", () => { desc = VAGUE; ed.value = desc; onDesc(); }, "vc-btn-ghost vc-btn-sm");
    btn(edBar, "Restore the strong one", () => { desc = STRONG; ed.value = desc; onDesc(); }, "vc-btn-ghost vc-btn-sm");
    const meter = h("div", { class: "vc-chips", "aria-live": "polite" });
    left.append(meter);
    function checks() {
      const d = desc.toLowerCase();
      const what = /\b(draft|write|format|check|prepare|create|build|fill|produce)s?\b/.test(d) && /quote|cotizaci/.test(d);
      const when = /\buse (it |this )?(when|whenever|for|if)\b|\bwhenever\b|\bwhen (the|a|an|i|someone|asked|you)\b|\bany ?time\b|\bevery time\b/.test(d);
      const words = ["quote", "cotizaci", "price", "customer", "request", "offer"].filter((w) => d.includes(w)).length >= 2;
      return { what, when, words, found: when && words };
    }
    function onDesc() {
      const k = checks();
      meter.innerHTML = "";
      [["what", "says what it does"], ["when", "says when to use it"], ["words", "uses the words a rep would say"]].forEach(([key, label]) =>
        meter.append(h("span", { class: "vc-chip " + (k[key] ? "is-ok" : "is-bad") }, (k[key] ? "✓ " : "✗ ") + label)));
      if (file === "skill") showFile(false);
      render(false);
    }

    /* ---- right: requests and what gets loaded ---- */
    right.append(sub("Paula asks:", "0"));
    buttons(right, [
      { label: "Draft the quote for Doña Elsa", value: "quote" },
      { label: "Summarize yesterday's calls", value: "calls" },
      { label: "Write the weekly sales note", value: "weekly" },
    ], (v) => { req = v; render(true); }, req);
    const runBar = h("div", { class: "vc-buttons" });
    right.append(runBar);
    btn(runBar, "Run the request", () => render(true), "vc-btn-accent");
    const loop = h("ol", { class: "vc-loop", "aria-live": "polite" });
    const out = h("div", { class: "vc-doc" });
    right.append(loop, sub("What Paula gets:"), out);

    /* ---- stats: what sits in the assistant's context ---- */
    const mkStat = (label, cls) => { const s = h("strong", {}, ""); const card = h("div", { class: "vc-stat " + cls }, h("span", {}, label), s); return { card, s }; };
    const sAlways = mkStat("Always loaded: 20 names and descriptions", "is-ok");
    const sNow = mkStat("Loaded for this request", "is-accent");
    const sAll = mkStat("If all 20 skills were pasted every time", "is-bad");
    root.append(h("div", { class: "vc-stats" }, sAlways.card, sNow.card, sAll.card));
    sAlways.s.textContent = "2,000 tokens";
    sAll.s.textContent = "28,000 tokens";
    sNow.s.textContent = "1,400 tokens";
    const n = live(note(root, ""));

    function plan() {
      const k = checks();
      if (req === "calls") return {
        tokens: 0, tone: "", steps: [
          ["think", "scan", "Reads 20 skill names and descriptions. Nothing else is loaded yet."],
          ["think", "match", "No description is about call summaries. No skill is opened."],
          ["done", "answer", "Answers from the conversation alone."]],
        out: "Yesterday: 9 calls. 6 were quote follow-ups, 2 were complaints about delivery times, 1 was a new minimarket in Quilpué.\n\n<span class=\"c\">Fine for a one-off. If Carla asks for this every week, it is a candidate for a skill.</span>",
        note: "No skill matched, so nothing was loaded: <strong>0 extra tokens</strong>. That is the point of progressive disclosure. Twenty installed skills cost about 2,000 tokens until one is needed.",
      };
      if (req === "weekly") return {
        tokens: 600, tone: "ok", steps: [
          ["think", "scan", "Reads 20 skill names and descriptions. Nothing else is loaded yet."],
          ["tool", "match", "<code>weekly-sales-note</code> says “Use when asked for the weekly note”. It matches."],
          ["tool", "load", "Opens its SKILL.md: about 600 tokens, only for this request."],
          ["done", "answer", "Writes the note in the three parts the skill asks for."]],
        out: "<span class=\"s\"># Sales note · week 46</span>\nRequests 587 · quotes sent 571 · won 318\n\nCall this week:\n1. Sushi Nikkei Ñuñoa: asked twice for salmon, no answer yet\n2. Almacén La Esquina: quote expired on Friday\n3. Minimarket Los Aromos: order 30% below their usual",
        note: "The request never mentioned a skill. The description did the matching, the assistant loaded <strong>600 tokens</strong> for this one answer, and <code>quote-format</code> stayed closed.",
      };
      if (k.found) return {
        tokens: 1400, tone: "ok", steps: [
          ["think", "scan", "Reads 20 skill names and descriptions. Nothing else is loaded yet."],
          ["tool", "match", "<code>quote-format</code> says when to use it, and this request fits."],
          ["tool", "load", "Opens SKILL.md, template.md and the example: about 1,400 tokens, only for this request."],
          ["done", "answer", "Drafts the quote in the house format. The unclear line is marked CHECK. No discount."]],
        out: FILES.example(),
        note: "The description told the assistant when to use the skill, so it loaded <strong>1,400 tokens</strong> of instructions and followed them: house columns, CHECK on the unclear line, no discount. Paula typed one sentence.",
      };
      return {
        tokens: 0, tone: "bad", steps: [
          ["think", "scan", "Reads 20 skill names and descriptions. Nothing else is loaded yet."],
          ["bad", "match", "<code>quote-format</code> " + (k.when ? "says when to use it, but not in words that match a request for a quote." : "does not say when to use it.") + " It stays closed."],
          ["bad", "answer", "Drafts a quote from general knowledge."]],
        out: "Dear customer, please find our quotation:\n\n- Oil 900cc x 20 ........ $ 378.000\n- Rice x 5 .............. $ 107.500\n- Assorted dairy x 1 .... $ 45.000\n\n<mark>Loyalty discount 5% applied.</mark>\nKind regards",
        note: "The skill is installed and correct, and it was <strong>not used</strong>: the description is the only part the assistant reads before deciding. The result has the wrong columns, an invented dairy line and a discount nobody approved. Fix the description, not the instructions.",
      };
    }
    async function render(animate) {
      const id = ++runId;
      const p = plan();
      const prev = loadedNow; loadedNow = p.tokens;
      loop.innerHTML = "";
      out.innerHTML = "";
      const lis = p.steps.map(([cls, label, html]) => h("li", { class: "is-" + cls }, h("b", {}, label), h("div", { html })));
      n.className = "vc-note" + (p.tone ? " is-" + p.tone : "");
      n.innerHTML = p.note;
      if (!animate || motion.reduced()) {
        lis.forEach((li) => loop.append(li));
        out.innerHTML = p.out;
        sNow.s.textContent = fmt(p.tokens) + " tokens";
        return;
      }
      sNow.s.textContent = "0 tokens";
      for (let i = 0; i < lis.length; i++) {
        loop.append(lis[i]);
        lis[i].classList.add("is-on");
        motion.enter(lis[i]);
        if (i === 2 && p.tokens) motion.count(sNow.s, 0, p.tokens, (v) => fmt(v) + " tokens", 0.5);
        await sleep(430);
        if (id !== runId) return;
        lis[i].classList.remove("is-on");
      }
      sNow.s.textContent = fmt(p.tokens) + " tokens";
      out.innerHTML = p.out;
      motion.enter(out);
      if (p.tone === "bad") motion.shake(out);
      else if (p.tokens && prev !== p.tokens) motion.pop(sNow.card);
    }
    showFile(false);
    onDesc();
  });

  /* ================= c2-mcp ================= */
  register("c2-mcp", function (root) {
    panel(root, "Connectors: which doors are open", "Each card is a connector from the team's assistant to one Cerro Azul system. Switch doors on and off, pick a task and run it. Watch where the request travels and where it stops.", "ai");
    const CONNS = [
      { k: "prices", name: "Price list in Drive", scope: "read · cannot change the file", write: false, on: true },
      { k: "customers", name: "ERP · customers", scope: "read · cannot change records", write: false, on: true },
      { k: "whatsapp", name: "WhatsApp inbox", scope: "read · cannot reply", write: false, on: false },
      { k: "email", name: "Email", scope: "send · in the rep's name", write: true, on: false },
      { k: "orders", name: "ERP · orders", scope: "write · creates real orders", write: true, on: false },
    ];
    const byKey = Object.fromEntries(CONNS.map((c) => [c.k, c]));
    const TASKS = {
      price: {
        label: "What does aceite 900 cc cost for Los Aromos?",
        think: "I need the customer's price tier and the price list. Two look-ups, both read-only.",
        calls: [
          { need: "customers", call: 'find_customer("Minimarket Los Aromos")', res: "Tier B · Maipú route · rep: Marcos" },
          { need: "prices", call: 'read_price("aceite 900 cc")', res: "AC-900 · caja de 12 · list CLP 18,900 · tier B CLP 18,300" },
        ],
        done: ["done", "Answer: <strong>CLP 18,300 per caja</strong> for Los Aromos (tier B column, row 42 of the price list). Paula can open the row and check."],
      },
      inbox: {
        label: "Which WhatsApp requests have no answer yet?",
        think: "I need to read the shared inbox. Nothing has to change.",
        calls: [{ need: "whatsapp", call: "list_unanswered(since: yesterday 18:00)", res: "7 conversations without a reply · oldest: Sushi Nikkei Ñuñoa, 19:12" }],
        done: ["done", "Answer: <strong>7 requests waiting</strong>, oldest first. Nothing was sent; the connector can only read."],
      },
      send: {
        label: "Send the quote to Doña Elsa",
        think: "The quote is drafted. Sending needs her contact and the email connector.",
        calls: [
          { need: "customers", call: 'find_customer("Restaurante Doña Elsa")', res: "Contact on file: purchasing · rep: Paula" },
          { need: "email", call: "send_email(to: Doña Elsa purchasing, attach: quote)", res: "Sent from Paula's address at 10:42" },
        ],
        done: ["human", "Sent, in Paula's name. <strong>Nobody read it before it left.</strong> Class 3 adds the approval step that belongs here."],
      },
      order: {
        label: "Create the order in the ERP",
        think: "Creating an order changes the ERP. I need the orders connector with write access.",
        calls: [{ need: "orders", call: "create_order(customer: Doña Elsa, lines: 3)", res: "Order 88213 created · warehouse notified" }],
        done: ["human", "Order created and the warehouse is already picking it. <strong>If a line was wrong, a truck carries the mistake.</strong>"],
      },
    };
    let task = "price", runId = 0;

    const cards = h("div", { class: "vc-conns" });
    root.append(cards);
    CONNS.forEach((c) => {
      c.el = h("div", { class: "vc-conn" }, h("strong", {}, c.name), h("span", {}, c.scope));
      const sw = toggle(c.el, c.on ? "Connected" : "Not connected", (on) => { c.on = on; sw.lastChild.textContent = on ? "Connected" : "Not connected"; paint(); render(false); }, c.on);
      sw.setAttribute("aria-label", c.name + " connector");
      cards.append(c.el);
    });
    function paint() {
      CONNS.forEach((c) => { c.el.classList.toggle("is-on", c.on && !c.write); c.el.classList.toggle("is-risk", c.on && c.write); });
    }
    const setOpen = stat(root, "Doors open", "", "is-accent");
    const setRead = stat(root, "Systems it can read", "", "is-ok");
    const setWrite = stat(root, "Systems it can change or send from", "", "is-ok");

    root.append(sub("The task:"));
    buttons(root, Object.entries(TASKS).map(([k, t]) => ({ label: t.label, value: k })), (v) => { task = v; render(true); }, task);
    const runBar = h("div", { class: "vc-buttons" });
    root.append(runBar);
    btn(runBar, "Run the task", () => render(true), "vc-btn-accent");
    const loop = h("ol", { class: "vc-loop", "aria-live": "polite" });
    root.append(loop);
    const n = live(note(root, ""));

    function plan() {
      const t = TASKS[task];
      const steps = [["think", "assistant", esc(t.think)]];
      let blocked = null;
      for (const c of t.calls) {
        const conn = byKey[c.need];
        if (!conn.on) { blocked = conn; steps.push(["bad", "connector", `<strong>${esc(conn.name)}</strong> is not connected. The assistant has no way into that system.`]); break; }
        steps.push(["tool", "connector", `${esc(conn.name)} → <code>${esc(c.call)}</code>`]);
        steps.push(["tool", "result", esc(c.res)]);
      }
      if (blocked) steps.push(["bad", "assistant", `Stops and says so: “I cannot do this without the ${esc(blocked.name)} connector.” It must not estimate.`]);
      else steps.push([t.done[0], "assistant", t.done[1]]);
      return { steps, blocked, risky: !blocked && t.done[0] === "human" };
    }
    function summary(p) {
      const open = CONNS.filter((c) => c.on), w = open.filter((c) => c.write), r = open.filter((c) => !c.write);
      setOpen(open.length + " of 5", "accent");
      setRead(String(r.length), "ok");
      setWrite(String(w.length), w.length ? "bad" : "ok");
      const risk = byKey.orders.on ? "Orders are open: a mistake is no longer a sentence on a screen, it is a delivery."
        : byKey.email.on ? "Email is open: the assistant can send messages in a rep's name, so a wrong quote can reach a customer before anyone reads it."
        : open.length === 0 ? "No doors open: the assistant knows only what you paste into it."
        : "Read-only doors: the worst case is a wrong answer on Paula's screen, and she can check the source.";
      const result = p.blocked ? `This task stops at <strong>${esc(p.blocked.name)}</strong>. Connect it only if the task is worth that door.`
        : p.risky ? "The task ran end to end with no person in the loop."
        : "The task ran using read access only.";
      n.className = "vc-note " + (p.blocked ? "is-warn" : w.length ? "is-bad" : "is-ok");
      n.innerHTML = result + " " + risk + " Read before write, one system at a time.";
    }
    async function render(animate) {
      const id = ++runId;
      const p = plan();
      summary(p);
      loop.innerHTML = "";
      const lis = p.steps.map(([cls, label, html]) => h("li", { class: "is-" + cls }, h("b", {}, label), h("div", { html, style: { overflowWrap: "anywhere" } })));
      if (!animate || motion.reduced()) { lis.forEach((li) => loop.append(li)); return; }
      for (let i = 0; i < lis.length; i++) {
        loop.append(lis[i]);
        lis[i].classList.add("is-on");
        motion.enter(lis[i]);
        await sleep(360);
        if (id !== runId) return;
        lis[i].classList.remove("is-on");
      }
      const last = lis[lis.length - 1];
      if (p.blocked) motion.shake(last); else motion.pop(last);
    }
    paint();
    render(false);
  });
})();
