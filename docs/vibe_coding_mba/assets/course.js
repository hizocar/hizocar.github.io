/* course.js — course-wide navigation for Vibe Coding for Business Leaders.
   Inserts a quiet navigation band at the top of every course page and marks the current page. */
(function () {
  "use strict";
  const LINKS = [
    ["index.html", "Overview"],
    ["sessions.html", "Schedule"],
    ["classes.html", "Classes"],
    ["syllabus.html", "Syllabus"],
    ["rubric.html", "Rubric"],
    ["setup.html", "Setup"],
  ];
  const CLASS_PAGES = /class[1-5]\.html$/;

  function build() {
    if (document.querySelector(".vc-coursenav")) return;
    const main = document.querySelector("main.content") || document.querySelector("main");
    if (!main) return;
    const here = (location.pathname.split("/").pop() || "index.html").toLowerCase();
    const nav = document.createElement("nav");
    nav.className = "vc-coursenav";
    nav.setAttribute("aria-label", "Course");
    const brand = document.createElement("a");
    brand.className = "vc-coursenav-brand";
    brand.href = "index.html";
    brand.innerHTML = '<span class="vc-coursenav-title">Vibe Coding for Business Leaders</span><span class="vc-coursenav-sub">MBA USM elective</span>';
    const list = document.createElement("ul");
    for (const [href, label] of LINKS) {
      const li = document.createElement("li");
      const a = document.createElement("a");
      a.href = href;
      a.textContent = label;
      const current = here === href || (href === "classes.html" && CLASS_PAGES.test(here));
      if (current) a.setAttribute("aria-current", "page");
      li.append(a);
      list.append(li);
    }
    nav.append(brand, list);
    main.prepend(nav);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", build);
  else build();
})();
