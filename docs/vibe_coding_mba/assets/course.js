/* course.js — course-wide navigation for Vibe Coding for Business Leaders.
   Inserts a quiet navigation band at the top of every course page, marks the current page,
   and offers an EN | ES switch on pages that have a Spanish twin (x.html <-> x-es.html). */
(function () {
  "use strict";
  const ES = /^es/i.test(document.documentElement.lang || "");
  // pages with a Spanish twin
  const TWINS = ["index", "sessions", "classes", "class1", "setup"];
  const LINKS = [
    ["index", "Overview", "Inicio"],
    ["sessions", "Schedule", "Calendario"],
    ["classes", "Classes", "Clases"],
    ["syllabus", "Syllabus", "Programa"],
    ["rubric", "Rubric", "Rúbrica"],
    ["setup", "Setup", "Instalación"],
  ];
  const CLASS_PAGES = /^class[1-5]$/;
  const hrefFor = (base, es) => base + (es && TWINS.includes(base) ? "-es" : "") + ".html";

  function build() {
    if (document.querySelector(".vc-coursenav")) return;
    const main = document.querySelector("main.content") || document.querySelector("main");
    if (!main) return;
    const file = (location.pathname.split("/").pop() || "index.html").toLowerCase();
    const here = file.replace(/\.html$/, "").replace(/-es$/, "") || "index";
    const nav = document.createElement("nav");
    nav.className = "vc-coursenav";
    nav.setAttribute("aria-label", ES ? "Curso" : "Course");
    const top = document.createElement("div");
    top.className = "vc-coursenav-top";
    const brand = document.createElement("a");
    brand.className = "vc-coursenav-brand";
    brand.href = hrefFor("index", ES);
    brand.innerHTML = '<span class="vc-coursenav-title">Vibe Coding for Business Leaders</span><span class="vc-coursenav-sub">' + (ES ? "Electivo MBA USM" : "MBA USM elective") + "</span>";
    top.append(brand);
    if (TWINS.includes(here)) {
      const sw = document.createElement("div");
      sw.className = "vc-lang";
      sw.setAttribute("role", "group");
      sw.setAttribute("aria-label", ES ? "Idioma" : "Language");
      for (const [code, isEs] of [["EN", false], ["ES", true]]) {
        const a = document.createElement("a");
        a.textContent = code;
        a.lang = isEs ? "es" : "en";
        a.title = isEs ? "Ver en español" : "View in English";
        if (isEs === ES) { a.setAttribute("aria-current", "true"); a.href = "#"; a.addEventListener("click", (e) => e.preventDefault()); }
        else {
          a.href = hrefFor(here, isEs);
          a.addEventListener("click", () => { a.href = hrefFor(here, isEs) + location.hash; });
        }
        sw.append(a);
      }
      top.append(sw);
    }
    const list = document.createElement("ul");
    for (const [base, en, es] of LINKS) {
      const li = document.createElement("li");
      const a = document.createElement("a");
      a.href = hrefFor(base, ES);
      a.textContent = ES ? es : en;
      const current = here === base || (base === "classes" && CLASS_PAGES.test(here));
      if (current) a.setAttribute("aria-current", "page");
      li.append(a);
      list.append(li);
    }
    nav.append(top, list);
    main.prepend(nav);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", build);
  else build();
})();
