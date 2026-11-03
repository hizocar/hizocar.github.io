/* widgets-class2.js — Class 2 simulators (Specify, iterate, keep what works)
   c2-spec     · spec quality: weak / medium / strong story → what gets built and how many surprises
   c2-steps    · size of each request vs. probability it works first time and time to recover
   c2-commits  · checkpoints, branches, rollback on a QuoteDesk timeline with a live app preview
   c2-ux       · UX for non-deterministic output: confidence, streaming, errors, correction → trust score
   c2-data     · where the data lives: in the page / in a file / in a managed database */
(function () {
  "use strict";
  const { h, svg, motion, sleep, panel, controls, slider, select, text, btn, buttons, stat, note, runFlow, register } = window.VC;
  const fmt = (v) => Math.round(v).toLocaleString("en-US");

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
          ["Fields: customer, message, date", "warn", "Rep and status missing: no login yet, and status was not mentioned."],
          ["Empty requests can be saved", "bad", "The failure case was not specified."],
          ["List newest first", "ok", "A reasonable guess, this time correct."],
          ["Desktop layout, usable on phone with zoom", "warn", "Phone not named; layout is not optimized."],
        ],
        criteria: ["Fields include rep and status", "Empty message cannot be saved", "Phone layout without horizontal scrolling"],
      },
      strong: {
        label: "Strong",
        story: "As a Cerro Azul rep on a phone, I want to paste a WhatsApp message and save it as a quote request for one customer chosen from the list. Criteria: fields customer, message, date, rep, status 'new'; save disabled while empty; newest first with customer, date and first line; phone layout without horizontal scrolling.",
        builds: [
          ["Customer search over the existing list", "ok", "Exactly as specified."],
          ["Fields: customer, message, date, rep, status", "ok", "All five fields, nothing extra."],
          ["Save disabled while empty", "ok", "The failure case was written, so it was built."],
          ["List newest first, with first line of message", "ok", "As specified."],
          ["Phone layout, no horizontal scroll", "ok", "The device was named."],
        ],
        criteria: [],
      },
    };
    const c = controls(root);
    let cur = "weak";
    buttons(c, Object.entries(SPECS).map(([k, v]) => ({ label: v.label + " story", value: k })), (v) => { cur = v; draw(); }, cur);
    const storyBox = h("div", { class: "vc-prompt" }, h("div", { class: "vc-prompt-h" }, "You, to the assistant"), h("div", { class: "vc-prompt-b" }));
    root.append(storyBox);
    const setSurprises = stat(root, "Surprises in the next hour", "—", "is-bad");
    const setCrit = stat(root, "Criteria that would have prevented them", "—", "is-ok");
    const list = h("div", { class: "vc-cards" });
    root.append(h("p", { class: "vc-widget-sub", style: { marginTop: "0.6rem" } }, "What the assistant will most likely build:"), list);
    const critList = h("ul", { style: { fontSize: "0.84rem", margin: "0.4rem 0 0" } });
    const critWrap = h("div", {}, h("p", { class: "vc-widget-sub", style: { margin: "0.6rem 0 0.2rem" } }, "Missing acceptance criteria:"), critList);
    root.append(critWrap);
    const n = note(root, "");
    function draw() {
      const s = SPECS[cur];
      storyBox.className = "vc-prompt " + (cur === "weak" ? "is-weak" : cur === "strong" ? "is-strong" : "");
      storyBox.lastChild.textContent = s.story;
      const bad = s.builds.filter((b) => b[1] !== "ok").length;
      setSurprises(String(bad), bad === 0 ? "ok" : bad < 3 ? "warn" : "bad");
      setCrit(String(s.criteria.length), s.criteria.length ? "ok" : "ok");
      list.innerHTML = "";
      s.builds.forEach((b) => {
        const card = h("div", { class: "vc-card", style: { opacity: 0 } }, h("span", { class: "vc-chip is-" + b[1], style: { marginBottom: "0.3rem", display: "inline-block" } }, b[1] === "ok" ? "as asked" : b[1] === "warn" ? "partly guessed" : "surprise"), h("strong", {}, b[0]), b[2]);
        list.append(card);
      });
      motion.stagger(list.children, { step: 0.06 });
      critList.innerHTML = "";
      critWrap.style.display = s.criteria.length ? "" : "none";
      s.criteria.forEach((t) => critList.append(h("li", {}, t)));
      n.className = "vc-note " + (bad === 0 ? "is-ok" : bad < 3 ? "is-warn" : "is-bad");
      n.innerHTML = bad === 0
        ? "Five criteria, zero surprises. The strong story is longer to write and shorter to build."
        : `The ${s.label.toLowerCase()} story leaves <strong>${bad}</strong> decision${bad > 1 ? "s" : ""} to the assistant. Each one becomes a rebuild in the lab. ${s.criteria.length} criteria would have prevented them.`;
    }
    draw();
  });

  /* ================= c2-steps ================= */
  register("c2-steps", function (root) {
    panel(root, "Small steps vs big bang", "Drag the slider: how many features do you ask for in one request? The chance the build works first time drops fast, and the time to find what broke grows.", "ai");
    const c = controls(root);
    let k = 1;
    const sl = slider(c, "Features per request", { min: 1, max: 10, step: 1, value: 1, fmt: (v) => v }, (v) => { k = v; draw(); });
    const setP = stat(root, "Works first time", "—", "is-ok");
    const setT = stat(root, "Minutes to find the cause when it breaks", "—", "is-warn");
    const setTot = stat(root, "Expected minutes for 10 features", "—", "is-accent");
    const W = 640, H = 220, L = 46, R = 16, T = 14, B = 34;
    const plot = svg("svg", { class: "vc-plot", viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": "Probability of working first time and recovery time versus features per request" });
    root.append(plot);
    const x = (v) => L + ((v - 1) / 9) * (W - L - R);
    const yP = (p) => T + (1 - p) * (H - T - B);
    const pOf = (v) => Math.pow(0.9, v);          // 90% per feature, independent
    const tOf = (v) => 3 + 2.2 * v * v;           // minutes to isolate the cause grows with tangled changes
    const yT = (t) => T + (1 - Math.min(t, 230) / 230) * (H - T - B);
    [0, 0.25, 0.5, 0.75, 1].forEach((p) => {
      plot.append(svg("line", { x1: L, x2: W - R, y1: yP(p), y2: yP(p), class: "grid" }));
      plot.append(svg("text", { x: L - 6, y: yP(p) + 4, "text-anchor": "end", class: "muted" }, Math.round(p * 100) + "%"));
    });
    for (let v = 1; v <= 10; v++) plot.append(svg("text", { x: x(v), y: H - B + 16, "text-anchor": "middle", class: "muted" }, v));
    plot.append(svg("text", { x: (L + W - R) / 2, y: H - 4, "text-anchor": "middle", class: "muted" }, "features in one request"));
    const dP = [], dT = [];
    for (let v = 1; v <= 10; v += 0.25) { dP.push(`${x(v).toFixed(1)},${yP(pOf(v)).toFixed(1)}`); dT.push(`${x(v).toFixed(1)},${yT(tOf(v)).toFixed(1)}`); }
    plot.append(svg("polyline", { points: dP.join(" "), class: "ln-ok" }));
    plot.append(svg("polyline", { points: dT.join(" "), class: "ln-bad" }));
    plot.append(svg("text", { x: W - R - 4, y: yP(pOf(10)) - 6, "text-anchor": "end", style: "fill:var(--vc-ok)" }, "works first time"));
    plot.append(svg("text", { x: W - R - 4, y: yT(tOf(10)) + 14, "text-anchor": "end", style: "fill:var(--vc-bad)" }, "minutes to find the cause"));
    const cursor = svg("line", { x1: x(1), x2: x(1), y1: T, y2: H - B, class: "ax", "stroke-dasharray": "4 3" });
    const dotP = svg("circle", { cx: x(1), cy: yP(pOf(1)), r: 6, style: "fill:var(--vc-ok)" });
    const dotT = svg("circle", { cx: x(1), cy: yT(tOf(1)), r: 6, style: "fill:var(--vc-bad)" });
    plot.append(cursor, dotP, dotT);
    const n = note(root, "");
    function draw() {
      const p = pOf(k), t = tOf(k);
      setP(Math.round(p * 100) + "%", p > 0.7 ? "ok" : p > 0.45 ? "warn" : "bad");
      setT(fmt(t), t < 10 ? "ok" : t < 60 ? "warn" : "bad");
      // Expected time for 10 features: requests of size k, each costs 6 min build + (1-p) × recovery
      const reqs = Math.ceil(10 / k);
      const total = reqs * (6 + (1 - p) * (t + 6));
      setTot(fmt(total), total < 90 ? "ok" : total < 150 ? "warn" : "bad");
      motion.attr(cursor, "x1", x(k)); motion.attr(cursor, "x2", x(k));
      motion.attr(dotP, "cx", x(k)); motion.attr(dotP, "cy", yP(p));
      motion.attr(dotT, "cx", x(k)); motion.attr(dotT, "cy", yT(t));
      n.className = "vc-note " + (k <= 2 ? "is-ok" : k <= 4 ? "is-warn" : "is-bad");
      n.innerHTML = k === 1
        ? "One feature per request: nine in ten work first time, and when one fails you know exactly which change caused it. Ten features cost about <strong>" + fmt(total) + " minutes</strong> in total."
        : `${k} features per request: only <strong>${Math.round(p * 100)}%</strong> work first time, and untangling a failure takes about <strong>${fmt(t)} minutes</strong>. Ten features cost about <strong>${fmt(total)} minutes</strong>, versus ${fmt(Math.ceil(10) * (6 + (1 - pOf(1)) * (tOf(1) + 6)))} one at a time. Assumes each feature has a 90% chance of being right and that tangled changes take longer to isolate.`;
    }
    draw();
  });

  /* ================= c2-commits ================= */
  register("c2-commits", function (root) {
    panel(root, "Version control for managers", "QuoteDesk's history as a line of checkpoints. Make changes, break something, roll back, try an experiment on a branch, merge. The app preview shows the state you are on.", "accent");
    const c = controls(root);
    let main = [{ name: "v0 from session 1", state: { list: true, customer: false, login: false, layout: "list" } }];
    let branch = null;            // { base: index, commits: [...] }
    let head = { on: "main", i: 0 };
    let broken = false;
    const CHANGES = [
      { name: "customer picker working", apply: (s) => ({ ...s, customer: true }) },
      { name: "database and login working", apply: (s) => ({ ...s, login: true }) },
      { name: "empty and loading states", apply: (s) => ({ ...s, states: true }) },
      { name: "phone layout fixed", apply: (s) => ({ ...s, phone: true }) },
    ];
    const bar = h("div", { class: "vc-buttons" });
    root.append(bar);
    const bChange = btn(bar, "Make a change", () => makeChange(), "");
    const bBreak = btn(bar, "Break something", () => breakIt(), "vc-btn-ghost");
    const bBack = btn(bar, "Roll back", () => rollback(), "vc-btn-accent");
    const bBranch = btn(bar, "Start a branch (experiment)", () => startBranch(), "vc-btn-ghost");
    const bMerge = btn(bar, "Merge", () => merge(), "vc-btn-ghost");
    const bDiscard = btn(bar, "Discard branch", () => discard(), "vc-btn-ghost");
    const tlTitle = h("p", { class: "vc-widget-sub", style: { margin: "0.4rem 0 0" } }, "Main line (the version that works):");
    const tl = h("ul", { class: "vc-timeline" });
    const brTitle = h("p", { class: "vc-widget-sub", style: { margin: "0.4rem 0 0" } }, "Branch (the experiment):");
    const brl = h("ul", { class: "vc-timeline" });
    root.append(tlTitle, tl, brTitle, brl);
    const app = h("div", { class: "vc-app" },
      h("div", { class: "vc-app-bar" }, h("i"), h("i"), h("i"), h("span", { class: "url" }, "quotedesk-cerroazul.app")),
      h("div", { class: "vc-app-body" }));
    root.append(app);
    const body = app.lastChild;
    const n = note(root, "");
    function curState() {
      if (broken) return null;
      if (head.on === "main") return main[head.i].state;
      return branch.commits[head.i].state;
    }
    function render() {
      const s = curState();
      body.innerHTML = "";
      if (!s) {
        body.append(h("h4", {}, "QuoteDesk"), h("div", { class: "row" }, h("span", { class: "pill bad" }, "Error: list failed to load")), h("p", { style: { color: "#b3261e", fontSize: "0.8rem" } }, "The calendar view replaced the list and broke the data loading. Nobody knows which of the changes did it."));
        motion.shake(app);
        return;
      }
      body.append(h("h4", {}, "QuoteDesk" + (s.login ? " · signed in as Paula (rep)" : "")));
      if (s.layout === "cards") body.append(h("div", { class: "row" }, h("span", { class: "pill warn" }, "experimental card layout")));
      const row = h("div", { class: "row" });
      row.append(s.customer ? h("span", { class: "field" }, "Customer: Restaurante La Ñipa ▾") : h("span", { class: "field" }, "Customer (type name)"));
      row.append(h("span", { class: "field" }, "Paste WhatsApp message…"));
      row.append(h("span", { class: "pill" }, "Save"));
      body.append(row);
      const items = ["Minimarket Don Lalo · today 10:12 · 20 cajas aceite 900cc…", "Restaurante La Ñipa · today 09:40 · 5 sacos arroz…"];
      if (s.layout === "cards") body.append(h("div", { class: "row" }, items.map((t) => h("span", { class: "field" }, t))));
      else items.forEach((t) => body.append(h("div", { class: "row" }, h("span", { class: "pill ok" }, "new"), t)));
      if (s.states) body.append(h("div", { class: "row" }, h("span", { class: "pill" }, "empty and loading states on")));
      if (s.phone) body.append(h("div", { class: "row" }, h("span", { class: "pill ok" }, "fits a phone screen")));
      motion.enter(body);
    }
    function drawTimeline() {
      tl.innerHTML = "";
      main.forEach((cm, i) => {
        const li = h("li", { tabindex: 0, class: (head.on === "main" && head.i === i && !broken ? "is-head" : "") }, h("strong", {}, "checkpoint " + (i + 1)), cm.name);
        li.addEventListener("click", () => { head = { on: "main", i }; broken = false; sync("Moved to checkpoint " + (i + 1) + ". Any checkpoint can be revisited in seconds."); });
        li.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); li.click(); } });
        tl.append(li);
      });
      if (broken) tl.append(h("li", { class: "is-bad" }, h("strong", {}, "unsaved change"), "calendar view (broken)"));
      brTitle.style.display = brl.style.display = branch ? "" : "none";
      brl.innerHTML = "";
      if (branch) {
        brl.append(h("li", { class: "is-branch", style: { opacity: 0.6 } }, h("strong", {}, "from checkpoint " + (branch.base + 1)), "branch: new list layout"));
        branch.commits.forEach((cm, i) => {
          const li = h("li", { tabindex: 0, class: "is-branch " + (head.on === "branch" && head.i === i ? "is-head" : "") }, h("strong", {}, "experiment " + (i + 1)), cm.name);
          li.addEventListener("click", () => { head = { on: "branch", i }; broken = false; sync("On the branch. The main line is untouched."); });
          brl.append(li);
        });
      }
      bMerge.disabled = bDiscard.disabled = !branch;
      bBranch.disabled = !!branch;
      bBack.disabled = !broken && !(head.on === "main" && head.i > 0 && main.length > 1);
      bChange.disabled = main.length - 1 >= CHANGES.length && head.on === "main" || head.on === "branch";
    }
    function sync(msg, tone) {
      drawTimeline(); render();
      n.className = "vc-note " + (tone ? "is-" + tone : "");
      n.innerHTML = msg;
    }
    function makeChange() {
      if (head.on !== "main") return;
      if (head.i !== main.length - 1) { sync("You are on an older checkpoint. Click the latest one before making changes, or this becomes a new branch.", "warn"); return; }
      const next = CHANGES[main.length - 1];
      if (!next) return;
      broken = false;
      main.push({ name: next.name, state: next.apply(main[main.length - 1].state) });
      head = { on: "main", i: main.length - 1 };
      sync(`Story passed the test, checkpoint saved: <strong>“${next.name}”</strong>. ${main.length} checkpoints on the main line.`, "ok");
      motion.pop(tl.lastElementChild);
    }
    function breakIt() {
      broken = true;
      sync("You asked for a calendar view you did not need. The list broke. Nothing is lost: the last checkpoint is one click away.", "bad");
    }
    function rollback() {
      if (broken) { broken = false; sync(`Rolled back to <strong>“${main[head.i].name}”</strong>. The broken change is gone; the checkpoint is exactly as it was. Seconds, not hours.`, "ok"); return; }
      if (head.on === "main" && head.i > 0) { head.i -= 1; sync(`Rolled back one checkpoint to <strong>“${main[head.i].name}”</strong>.`, "ok"); }
    }
    function startBranch() {
      if (branch) return;
      const base = head.on === "main" ? head.i : branch.base;
      broken = false;
      branch = { base, commits: [{ name: "card layout for the list", state: { ...main[base].state, layout: "cards" } }] };
      head = { on: "branch", i: 0 };
      sync("Branch started from checkpoint " + (base + 1) + ". The experiment (a card layout) lives here. Your teammate keeps working on the main line.", "warn");
    }
    function merge() {
      if (!branch) return;
      const last = branch.commits[branch.commits.length - 1];
      const mainLast = main[main.length - 1].state;
      main.push({ name: "merged: " + last.name, state: { ...mainLast, layout: "cards" } });
      branch = null; head = { on: "main", i: main.length - 1 };
      sync("Merged. The experiment passed the test, so it joined the main line as a new checkpoint. Everything done on main meanwhile is kept.", "ok");
    }
    function discard() {
      if (!branch) return;
      const base = branch.base;
      branch = null; head = { on: "main", i: base };
      sync("Branch discarded. The experiment did not pass, and the main line never noticed it existed.", "");
    }
    sync("Start: one checkpoint, “v0 from session 1”. Make a change to save the next one.");
  });

  /* ================= c2-ux ================= */
  register("c2-ux", function (root) {
    panel(root, "UX for output that is sometimes wrong", "QuoteDesk reads a pasted message and proposes items. Switch each pattern on or off and watch what the rep sees and how much they can trust it.", "ai");
    const MSG = "hola, necesito 20 cajas de aceite 900cc, 5 sacos de arroz y lo de siempre de lácteos para el jueves";
    const LINES = [
      { p: "Aceite 900 cc", q: "20 boxes", conf: 0.97 },
      { p: "Arroz (sack)", q: "5 sacks", conf: 0.93 },
      { p: "Dairy: usual order (last 3 deliveries)", q: "? guess", conf: 0.41 },
    ];
    const state = { conf: false, stream: false, error: false, correct: false, mode: "ok" };
    const c = controls(root);
    const toggles = h("div", { class: "vc-buttons" });
    root.append(toggles);
    const mk = (key, label) => {
      const b = h("button", { type: "button", class: "vc-btn vc-btn-ghost", "aria-pressed": "false" }, label);
      b.addEventListener("click", () => { state[key] = !state[key]; b.setAttribute("aria-pressed", String(state[key])); motion.anim(b, { scale: [0.95, 1] }, { duration: motion.DUR.quick, ease: motion.EASE.back }); draw(true); });
      toggles.append(b); return b;
    };
    mk("conf", "Show confidence"); mk("stream", "Stream the result"); mk("error", "Honest errors"); mk("correct", "Let the user correct");
    buttons(c, [{ label: "Normal message", value: "ok" }, { label: "Message with no order", value: "none" }], (v) => { state.mode = v; draw(true); }, "ok");
    const setTrust = stat(root, "Trust after one week of use", "—", "is-accent");
    const setChecks = stat(root, "Lines the rep must check", "—", "is-warn");
    const app = h("div", { class: "vc-app" }, h("div", { class: "vc-app-bar" }, h("i"), h("i"), h("i"), h("span", { class: "url" }, "quotedesk-cerroazul.app/new")), h("div", { class: "vc-app-body" }));
    root.append(app);
    const body = app.lastChild;
    const n = note(root, "");
    let runId = 0;
    async function draw(animate) {
      const id = ++runId;
      body.innerHTML = "";
      body.append(h("h4", {}, "New quote request · Restaurante La Ñipa"), h("div", { class: "row" }, h("span", { class: "field" }, state.mode === "ok" ? MSG : "hola, me llamas?")));
      if (state.mode === "none") {
        if (state.error) body.append(h("div", { class: "row" }, h("span", { class: "pill warn" }, "No items found in this message")), h("div", { class: "row" }, h("span", { class: "pill" }, "Open manual form"), h("span", { class: "pill" }, "Save as call-back note")));
        else body.append(h("div", { class: "row" }, h("span", { class: "pill bad" }, "Something went wrong")));
      } else {
        const table = h("div", {});
        body.append(table);
        const rows = LINES.map((l) => {
          const unsure = state.conf && l.conf < 0.6;
          const row = h("div", { class: "row", style: { opacity: animate && state.stream ? 0 : 1 } },
            h("span", { class: "field", style: unsure ? { borderColor: "#a8740a", background: "rgba(168,116,10,0.08)" } : {} }, l.p),
            h("span", { class: "field", style: { flex: "0 1 6rem" } }, l.q),
            unsure ? h("span", { class: "pill warn" }, "unsure · " + Math.round(l.conf * 100) + "%") : state.conf ? h("span", { class: "pill ok" }, Math.round(l.conf * 100) + "%") : null,
            state.correct ? h("span", { class: "pill" }, "edit") : null);
          return row;
        });
        if (animate && state.stream) {
          table.append(h("div", { class: "skeleton", style: { width: "60%" } }));
          for (const r of rows) {
            await sleep(motion.reduced() ? 0 : 420);
            if (id !== runId) return;
            table.lastChild.remove();
            table.append(r); motion.enter(r);
            if (r !== rows[rows.length - 1]) table.append(h("div", { class: "skeleton", style: { width: "50%" } }));
          }
        } else {
          if (animate) { const sk = h("div", { class: "skeleton", style: { width: "60%" } }); table.append(sk); await sleep(motion.reduced() ? 0 : 1300); if (id !== runId) return; sk.remove(); }
          rows.forEach((r) => table.append(r));
          motion.stagger(rows);
        }
        if (state.correct) body.append(h("div", { class: "row" }, h("span", { class: "pill ok" }, "Corrections are saved and used to improve")));
      }
      // trust model
      let trust = 35;
      if (state.conf) trust += 25;
      if (state.correct) trust += 20;
      if (state.error) trust += 10;
      if (state.stream) trust += 8;
      trust = Math.min(trust, 96);
      const checks = state.conf ? 1 : 3;
      setTrust(trust + "%", trust > 75 ? "ok" : trust > 50 ? "warn" : "bad");
      setChecks(state.mode === "none" ? "0" : String(checks), checks === 1 ? "ok" : "bad");
      const on = ["conf", "stream", "error", "correct"].filter((k) => state[k]).length;
      n.className = "vc-note " + (trust > 75 ? "is-ok" : trust > 50 ? "is-warn" : "is-bad");
      n.innerHTML = state.mode === "none"
        ? (state.error ? "The honest error says what happened and offers the next step. The rep stays in the tool." : "A generic error teaches the rep that the tool fails for no reason. Turn on <strong>honest errors</strong>.")
        : on === 0 ? "All three lines look equally certain, including the guess about dairy. After one wrong delivery the rep checks every line, and the tool saves no time. Trust: <strong>" + trust + "%</strong>."
        : `${on} of 4 patterns on. The rep checks <strong>${checks}</strong> line${checks > 1 ? "s" : ""} instead of three${state.correct ? ", and every fix feeds the next version" : ""}. Trust after a week: <strong>${trust}%</strong>.`;
    }
    draw(false);
  });

  /* ================= c2-data ================= */
  register("c2-data", function (root) {
    panel(root, "Where the data lives", "Pick where QuoteDesk keeps its quote requests, then run the three tests every real app must pass: refresh, a second rep, a phone.", "ai");
    const OPTS = [
      { k: "page", t: "In the page", d: "Browser memory. Free, instant, forgets everything on refresh.", refresh: false, second: false, phone: false, auth: false },
      { k: "file", t: "In a file on the server", d: "Survives refresh. Two people saving at once can overwrite each other. No idea who is who.", refresh: true, second: "partial", phone: true, auth: false },
      { k: "db", t: "In a managed database", d: "Rows, many users at once, backups, and a login built in. The assistant sets it up in one request.", refresh: true, second: true, phone: true, auth: true },
    ];
    let cur = "page";
    const cards = h("div", { class: "vc-cards" });
    root.append(cards);
    const cardEls = OPTS.map((o) => {
      const el = h("div", { class: "vc-card is-pick", tabindex: 0, role: "button", "aria-pressed": String(o.k === cur) }, h("strong", {}, o.t), o.d);
      el.addEventListener("click", () => { cur = o.k; cardEls.forEach((x, i) => x.setAttribute("aria-pressed", String(OPTS[i].k === cur))); motion.pop(el); draw(); });
      el.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); el.click(); } });
      cards.append(el); return el;
    });
    const flow = h("div", { class: "vc-flow" });
    const steps = [["Rep saves 3 requests", "Paula pastes three messages and saves."], ["Refresh the page", "Do the requests survive?"], ["Second rep opens the app", "Does Diego see the shared list, safely?"], ["Open on a phone", "Same data, another device?"]].map(([a, b]) => h("div", { class: "vc-flow-step" }, h("strong", {}, a), b));
    steps.forEach((s) => flow.append(s));
    root.append(flow);
    const bar = h("div", { class: "vc-buttons" }); root.append(bar);
    const run = btn(bar, "Run the three tests", () => test(), "vc-btn-accent");
    const setRows = stat(root, "Requests visible after the tests", "—", "is-accent");
    const setAuth = stat(root, "Knows who saved what", "—", "is-ok");
    const n = note(root, "");
    function draw() {
      const o = OPTS.find((x) => x.k === cur);
      steps.forEach((s) => s.classList.remove("is-on", "is-done", "is-bad"));
      setRows("—"); setAuth(o.auth ? "yes" : "no", o.auth ? "ok" : "bad");
      n.className = "vc-note";
      n.innerHTML = `Selected: <strong>${o.t}</strong>. Press “Run the three tests”.`;
    }
    async function test() {
      const o = OPTS.find((x) => x.k === cur);
      run.disabled = true;
      steps.forEach((s) => s.classList.remove("is-on", "is-done", "is-bad"));
      const results = [true, o.refresh, o.second, o.phone];
      let visible = 3;
      for (let i = 0; i < steps.length; i++) {
        steps[i].classList.add("is-on"); motion.pulse(steps[i]);
        await sleep(motion.reduced() ? 0 : 520);
        steps[i].classList.remove("is-on");
        const r = results[i];
        if (r === true) steps[i].classList.add("is-done");
        else if (r === "partial") { steps[i].classList.add("is-bad"); visible = 2; motion.shake(steps[i]); }
        else { steps[i].classList.add("is-bad"); visible = 0; motion.shake(steps[i]); }
        if (i === 1) setRows(String(visible), visible ? "ok" : "bad");
      }
      setRows(String(visible), visible === 3 ? "ok" : "bad");
      const msgs = {
        page: "Refresh: the three requests are gone. Diego sees an empty list. The phone sees nothing. Good for the first hour of session 1, useless for a second rep.",
        file: "Refresh: fine. Diego opens the app at the same moment Paula saves and one request is overwritten (2 remain). Nobody knows who saved what. Works for one person; fails for a team.",
        db: "All three pass: the requests survive refresh, Diego sees the shared list, the phone shows the same data, and each row carries the rep who created it. This is what milestone M2 requires.",
      };
      n.className = "vc-note " + (cur === "db" ? "is-ok" : cur === "file" ? "is-warn" : "is-bad");
      n.innerHTML = msgs[cur];
      run.disabled = false;
    }
    draw();
  });
})();
