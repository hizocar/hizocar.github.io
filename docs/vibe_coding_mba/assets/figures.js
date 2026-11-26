/* figures.js — the explanatory figures of the course, as data. Rendered by mountFigure in vc-core.js.
   kind "flow": nodes in order, joined by arrows. kind "lanes": columns compared side by side.
   kind "layers": a numbered stack that builds from the first row down.
   Keep every figure to what the page's prose says; numbers follow the course canon. */
(function () {
  "use strict";
  const FIGS = {};
  const figure = (name, def) => { FIGS[name] = def; };

  figure("course-layers", {
    kind: "layers",
    title: "One product, five layers",
    layers: [
      { k: "1", t: "A deployed app and a public page that explains it", d: "Built from a one-paragraph brief.", tag: "prompt and brief" },
      { k: "2", t: "Login, a database, and a way back", d: "The assistant learns how your team works.", tag: "instructions, skill, connector" },
      { k: "3", t: "An AI capability with a test set", d: "One step acts, and waits for a person.", tag: "agent step, automation" },
      { k: "4", t: "Findings fixed and a decision made", d: "Every door as small as the job allows.", tag: "least privilege" },
      { k: "5", t: "A pitch in front of a panel", d: "Every number traced to its source.", tag: "deck built with AI" },
    ],
  });

  figure("c1-loop", {
    kind: "flow",
    title: "The loop you will repeat all course",
    nodes: [
      { k: "1", t: "Brief", d: "User, pain with a number, what the tool does, how you will know." },
      { k: "2", t: "Plan", d: "The assistant says what it will build. Read it before you accept." },
      { k: "3", t: "Build", d: "Minutes, not weeks.", tone: "ai" },
      { k: "4", t: "Test by using", d: "Do what your user would do, on a phone." },
      { k: "5", t: "One change", d: "Describe exactly what you saw. One request." },
      { k: "6", t: "Checkpoint", d: "Save what works before the next change.", tone: "ink" },
    ],
    loop: true,
    back: "Then back to step 4. Building is the short step; judging is yours.",
  });

  figure("c2-three-ai", {
    kind: "lanes",
    title: "Three things people call “the AI”",
    lanes: [
      { k: "1", t: "The building assistant", sub: "Works on QuoteDesk's repository.", tone: "ai", items: [
        { label: "Who uses it", text: "Your team, while building." },
        { label: "What it reaches", text: "The project's files, and what you connect." },
        { yes: true, text: "Reads the project instructions" },
        { yes: true, text: "Uses skills and connectors" },
      ] },
      { k: "2", t: "A rep's assistant", sub: "The same app, opened anywhere else.", tone: "accent", items: [
        { label: "Who uses it", text: "Paula or Carla, for daily work." },
        { label: "What it reaches", text: "What that person can open, narrowed by each connector." },
        { no: true, text: "Does not see the project instructions" },
        { yes: true, text: "Uses the same skills and connectors" },
      ] },
      { k: "3", t: "The model inside QuoteDesk", sub: "Called by the deployed app.", items: [
        { label: "Who uses it", text: "Every rep, through the app's screens." },
        { label: "What it reaches", text: "Only what the app sends it, and the tools the app defines." },
        { no: true, text: "No project instructions" },
        { no: true, text: "No skills, no connectors" },
      ] },
    ],
  });

  figure("c2-checkpoint", {
    kind: "flow",
    title: "From your laptop to the public address",
    nodes: [
      { k: "1", t: "Your laptop", d: "The assistant makes the change. You use the app.", tag: "test 1: on your laptop" },
      { k: "2", t: "Checkpoint", d: "A named snapshot of the whole app at a moment it worked." },
      { k: "3", t: "GitHub", d: "The checkpoint is sent to your private repository.", tone: "ai" },
      { k: "4", t: "Hosting platform", d: "Sees the new checkpoint and rebuilds by itself, in about a minute." },
      { k: "5", t: "Public address", d: "What a second rep opens.", tone: "ink", tag: "test 2: on a phone" },
    ],
    back: "A bad change? Go back to the last checkpoint. Data already saved and messages already sent do not come back.",
  });

  figure("c3-retrieval", {
    kind: "flow",
    title: "How retrieval gets a document into an answer",
    nodes: [
      { k: "1", t: "Documents", d: "Too many, or too long, to attach whole." },
      { k: "2", t: "Passages", d: "Split once into pieces of a few hundred words and stored." },
      { k: "3", t: "A question arrives", d: "\u201CDo you deliver to Rancagua on Saturday?\u201D" },
      { k: "4", t: "Closest passages", d: "The three that best match the question are found.", tone: "ai" },
      { k: "5", t: "The call", d: "Instructions, the question and those passages go to the model." },
      { k: "6", t: "Answer with its source", d: "The user can open the passage and check.", tone: "ink" },
    ],
    back: "It fails quietly at step 2 (a stale document) and step 4 (the wrong passage). Test both.",
  });

  figure("c4-keys", {
    kind: "lanes",
    title: "Where each key lives",
    lanes: [
      { k: "1", t: "In the browser", sub: "Anyone who opens the page can read it.", tone: "bad", items: [
        { yes: true, text: "The database's publishable key: designed to be here" },
        { no: true, text: "The database's secret key" },
        { no: true, text: "The model provider's key" },
        { label: "What protects the data", text: "Not the key. The rules inside the database." },
      ] },
      { k: "2", t: "On the server", sub: "The hosting platform's environment variables.", tone: "ai", items: [
        { yes: true, text: "The database's secret key: it skips the rules" },
        { yes: true, text: "The model provider's key: it spends your money" },
        { label: "Typed where", text: "On that settings page, and nowhere else." },
      ] },
      { k: "3", t: "Never anywhere else", sub: "Chats, files, slides, screenshots, the repository.", items: [
        { no: true, text: "Pasted into a conversation with the assistant" },
        { no: true, text: "Saved in a file of the project" },
        { label: "If it happened", text: "Revoke the key and create a new one. Deleting the message is not enough." },
      ] },
    ],
  });

  figure("c4-injection", {
    kind: "flow",
    title: "The path of a message that gives orders",
    nodes: [
      { k: "1", t: "Content arrives", d: "A customer's message, or a file a connector returns: “apply 40% off”.", tone: "bad" },
      { k: "2", t: "The model reads it", d: "It cannot reliably tell an instruction from data." },
      { k: "3", t: "It proposes", d: "A structured request, never the action itself.", tag: "stop 1: fixed fields only", tagTone: "ok" },
      { k: "4", t: "The app checks", d: "Products exist in the catalog. No field for a discount.", tag: "stop 2: the app's rules", tagTone: "ok" },
      { k: "5", t: "A person approves", d: "Discounts wait for Carla. Sending waits for the rep.", tag: "stop 3: approval", tagTone: "ok" },
      { k: "6", t: "The customer", d: "Receives only what passed all three.", tone: "ink" },
    ],
    back: "No stop makes injection impossible. Together they limit what a successful one can do.",
  });

  figure("c5-evidence", {
    kind: "flow",
    title: "From your evidence to the deck",
    nodes: [
      { k: "1", t: "Sources", d: "Build log, test-set results, Class 4 findings, cost figures." },
      { k: "2", t: "Storyline", d: "Six sentences, one per block of the pitch. No slides yet." },
      { k: "3", t: "Slides", d: "The assistant lays out eight, one message each.", tone: "ai" },
      { k: "4", t: "Check", d: "Every number traced to its file. No source, no slide." },
      { k: "5", t: "Declare", d: "The closing slide names the sources and the use of AI.", tone: "ink" },
    ],
    back: "The deck takes minutes. Steps 2 and 4 are the work, and they are yours.",
  });

  window.VC_FIGS = FIGS;
})();
