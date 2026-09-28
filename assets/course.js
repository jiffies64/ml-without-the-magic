/* ============================================================
   Machine Learning Without the Magic: course engine
   Builds the sidebar from one manifest, handles theme,
   progress, prev/next, prerequisites, the "on this page"
   outline, copy buttons, math + code rendering, and the
   print-only answer list.
   No framework. Progress and theme persist in localStorage
   when it is available, and fall back to memory when not.
   ============================================================ */

/* ---- The single source of truth: the whole curriculum ---- */
const PARTS = [
  {
    n: 1, title: "Math Foundations",
    sections: [
      { n: 1,  slug: "01-linear-algebra",         title: "Linear Algebra for ML",              min: 28 },
      { n: 2,  slug: "02-calculus",               title: "Calculus for ML",                    min: 32, pre: [1] },
      { n: 3,  slug: "03-probability",            title: "Probability & Statistics",           min: 30, pre: [2] },
      { n: 4,  slug: "04-information-theory",      title: "Information Theory",                 min: 26, pre: [3] },
    ],
  },
  {
    n: 2, title: "Classical ML",
    sections: [
      { n: 5,  slug: "05-linear-regression",      title: "What Learning Means",                min: 30, pre: [2, 3] },
      { n: 6,  slug: "06-logistic-regression",    title: "Logistic Regression",                min: 24, pre: [4, 5] },
      { n: 7,  slug: "07-overfitting",            title: "Overfitting & Regularization",       min: 26, pre: [5] },
      { n: 8,  slug: "08-classical-tour",         title: "A Tour of Classical Models",         min: 16, pre: [7] },
    ],
  },
  {
    n: 3, title: "Neural Nets from Scratch",
    sections: [
      { n: 9,  slug: "09-neurons",                title: "Neurons, Layers, Activations",       min: 28, pre: [1, 6] },
      { n: 10, slug: "10-backprop",               title: "Backpropagation by Hand",            min: 34, key: true, pre: [2, 9] },
      { n: 11, slug: "11-mlp-numpy",              title: "Build an MLP in NumPy",              min: 30, pre: [10] },
      { n: 12, slug: "12-training-dynamics",      title: "Training Dynamics & Optimizers",     min: 32, pre: [11] },
    ],
  },
  {
    n: 4, title: "PyTorch",
    sections: [
      { n: 13, slug: "13-tensors-autograd",       title: "Tensors & Autograd",                 min: 26, pre: [10] },
      { n: 14, slug: "14-nn-module",              title: "nn.Module & the Training Loop",      min: 26, pre: [13] },
      { n: 15, slug: "15-debugging",              title: "Debugging & Good Habits",            min: 22, pre: [14] },
    ],
  },
  {
    n: 5, title: "Deep Learning Architectures",
    sections: [
      { n: 16, slug: "16-cnns",                   title: "Convolutional Networks",             min: 30, pre: [14] },
      { n: 17, slug: "17-sequence-models",        title: "Sequence Models: RNNs & LSTMs",      min: 24, pre: [14] },
      { n: 18, slug: "18-transformers",           title: "Attention & Transformers",           min: 42, key: true, pre: [14, 17] },
      { n: 19, slug: "19-language-modeling",      title: "Language Modeling & GPT",            min: 32, pre: [18] },
      { n: 20, slug: "20-training-at-scale",      title: "Training at Scale",                  min: 28, pre: [18] },
    ],
  },
  {
    n: 6, title: "Capstone: Paper from Scratch",
    sections: [
      { n: 21, slug: "21-reading-papers",         title: "Reading a Paper Like an Engineer",   min: 22, pre: [18] },
      { n: 22, slug: "22-moe",                    title: "Mixture of Experts from Scratch",    min: 46, key: true, pre: [19, 21] },
      { n: 23, slug: "23-next-steps",             title: "Where to Go Next",                   min: 18, pre: [22] },
    ],
  },
];

/* Flat list for prev/next + progress math */
const FLAT = PARTS.flatMap(p => p.sections.map(s => ({ ...s, part: p.n })));
const TOTAL = FLAT.length;

/* ---- Progress, persisted to localStorage (falls back to memory) ---- */
const STORAGE_KEY = "z2h-ml-progress";
function loadProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return new Set(JSON.parse(raw));
  } catch (e) { /* private mode or storage disabled — use memory only */ }
  return new Set();
}
function saveProgress() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify([...done])); }
  catch (e) { /* quota/unavailable — silently keep in-memory state */ }
}
const done = loadProgress();

/* ---- Theme choice, persisted so it survives navigation between sections ---- */
const THEME_KEY = "z2h-ml-theme";
function loadTheme() {
  try { return localStorage.getItem(THEME_KEY); } catch (e) { return null; }
}
function saveTheme(mode) {
  try { localStorage.setItem(THEME_KEY, mode); } catch (e) { /* storage disabled */ }
}

/* Path prefix: home lives at root, sections live in /sections/ */
function relRoot() {
  return location.pathname.includes("/sections/") ? "../" : "./";
}
function sectionHref(slug) {
  const base = location.pathname.includes("/sections/") ? "" : "sections/";
  return `${base}${slug}.html`;
}

/* ============================================================
   THEME
   ============================================================ */
function initTheme() {
  // The inline <head> script already applied the saved (or OS-preferred) theme
  // before first paint, so here we only sync the button and wire the toggle.
  setTheme(document.documentElement.getAttribute("data-theme") || "light");
  const btn = document.querySelector("[data-theme-toggle]");
  if (btn) btn.addEventListener("click", () => {
    const next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
    setTheme(next);
    saveTheme(next);
  });
  // Pages restored from the back/forward cache don't re-run the head script,
  // so re-apply the saved choice on show — navigating back never looks stale.
  window.addEventListener("pageshow", () => {
    const saved = loadTheme();
    if (saved === "dark" || saved === "light") setTheme(saved);
  });
}
function setTheme(mode) {
  document.documentElement.setAttribute("data-theme", mode);
  const btn = document.querySelector("[data-theme-toggle]");
  if (btn) {
    btn.textContent = mode === "dark" ? "☀" : "☾";
    btn.setAttribute("aria-label", mode === "dark" ? "Switch to light theme" : "Switch to dark theme");
  }
}

/* ============================================================
   SIDEBAR
   ============================================================ */
function buildSidebar(currentSlug) {
  const nav = document.querySelector("[data-nav]");
  if (!nav) return;
  let html = "";
  for (const part of PARTS) {
    html += `<div class="nav__part"><div class="nav__part-label">Part ${part.n} · ${part.title}</div></div>`;
    for (const s of part.sections) {
      const cur = s.slug === currentSlug ? ` aria-current="page"` : "";
      html += `<a class="nav__link" data-slug="${s.slug}" href="${sectionHref(s.slug)}"${cur}>
        <span class="nav__num">${s.n}</span>
        <span class="nav__title">${s.title}</span>
        <span class="nav__check" aria-hidden="true">✓</span>
      </a>`;
    }
  }
  nav.innerHTML = html;
}

/* ============================================================
   PROGRESS
   ============================================================ */
function refreshProgress() {
  const pct = Math.round((done.size / TOTAL) * 100);
  const fill = document.querySelector("[data-progress-fill]");
  const label = document.querySelector("[data-progress-label]");
  if (fill) fill.style.width = pct + "%";
  if (label) label.innerHTML = `<span>${done.size} / ${TOTAL} done</span><span>${pct}%</span>`;
  document.querySelectorAll(".nav__link").forEach(a => {
    a.classList.toggle("is-done", done.has(a.dataset.slug));
  });
  // home cards
  document.querySelectorAll("[data-card]").forEach(c => {
    const d = done.has(c.dataset.card);
    c.querySelectorAll("[data-card-done]").forEach(el => el.style.display = d ? "" : "none");
  });
}

function markComplete(slug, isDone) {
  if (isDone) done.add(slug); else done.delete(slug);
  saveProgress();
  refreshProgress();
}

/* ============================================================
   PREV / NEXT + complete bar (section pages)
   ============================================================ */
function buildPager(slug) {
  const holder = document.querySelector("[data-pager]");
  if (!holder) return;
  const i = FLAT.findIndex(s => s.slug === slug);
  const prev = FLAT[i - 1], next = FLAT[i + 1];
  const link = (s, dir, cls) => s
    ? `<a class="pager__link pager__link--${cls}" href="${sectionHref(s.slug)}">
         <span class="pager__dir">${dir}</span>
         <span class="pager__title">${s.title}</span></a>`
    : `<span class="pager__link pager__link--${cls} pager__link--disabled">
         <span class="pager__dir">${dir}</span>
         <span class="pager__title">—</span></span>`;
  holder.innerHTML = link(prev, "‹ Previous", "prev") + link(next, "Next ›", "next");
}

function buildCompleteBar(slug) {
  const bar = document.querySelector("[data-complete]");
  if (!bar) return;
  const btn = bar.querySelector("button");
  const sync = () => {
    const d = done.has(slug);
    btn.classList.toggle("is-done", d);
    btn.textContent = d ? "✓ Marked complete" : "Mark section complete";
  };
  btn.addEventListener("click", () => { markComplete(slug, !done.has(slug)); sync(); });
  sync();
}

/* ============================================================
   MOBILE NAV
   ============================================================ */
function initMobileNav() {
  const btn = document.querySelector("[data-menu]");
  const scrim = document.querySelector(".nav-scrim");
  const close = () => document.body.classList.remove("nav-open");
  if (btn) btn.addEventListener("click", () => document.body.classList.toggle("nav-open"));
  if (scrim) scrim.addEventListener("click", close);
  document.querySelectorAll(".nav__link").forEach(a => a.addEventListener("click", close));
  document.addEventListener("keydown", e => { if (e.key === "Escape") close(); });
}

/* ============================================================
   MATH + CODE rendering
   ============================================================ */
function renderMath() {
  if (window.renderMathInElement) {
    renderMathInElement(document.body, {
      delimiters: [
        { left: "$$", right: "$$", display: true },
        { left: "\\[", right: "\\]", display: true },
        { left: "\\(", right: "\\)", display: false },
        { left: "$", right: "$", display: false },
      ],
      throwOnError: false,
      trust: true,
    });
  }
}
function highlightCode() {
  if (window.hljs) {
    document.querySelectorAll("pre code").forEach(block => window.hljs.highlightElement(block));
  }
}

/* ============================================================
   HEADINGS + SEARCH
   ============================================================ */
/* Must match the slugify used when the search index is built. */
function slugify(s) {
  return s.toLowerCase().replace(/[^\w]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
}
/* Give every h2/h3 a stable id so search results can deep-link to a heading. */
function assignHeadingIds() {
  document.querySelectorAll(".prose h2, .prose h3").forEach(h => {
    if (h.id) return;
    const text = h.textContent.replace(/^\s*\d+\s*/, "").trim(); // drop the leading section number
    if (text) h.id = slugify(text);
  });
}

function buildSearch() {
  const nav = document.querySelector("[data-nav]");
  if (!nav || !window.SEARCH_INDEX) return;
  const wrap = document.createElement("div");
  wrap.className = "search";
  wrap.innerHTML =
    '<input class="search__input" type="search" placeholder="Search the course…" ' +
    'aria-label="Search sections" autocomplete="off" />' +
    '<div class="search__results" hidden></div>';
  nav.parentNode.insertBefore(wrap, nav);
  const input = wrap.querySelector(".search__input");
  const res = wrap.querySelector(".search__results");

  function run() {
    const q = input.value.trim().toLowerCase();
    if (!q) { res.hidden = true; res.innerHTML = ""; nav.hidden = false; return; }
    nav.hidden = true; res.hidden = false;
    const terms = q.split(/\s+/);
    const hits = [];
    for (const s of window.SEARCH_INDEX) {
      const headingText = s.headings.map(h => h.t).join(" ");
      const hay = (s.title + " " + s.keywords.join(" ") + " " + headingText).toLowerCase();
      if (terms.every(t => hay.includes(t))) {
        const mh = s.headings.find(h => terms.some(t => h.t.toLowerCase().includes(t)));
        hits.push({ s, mh });
      }
    }
    if (!hits.length) {
      res.innerHTML = '<p class="search__empty">No sections match those words.</p>';
      return;
    }
    res.innerHTML = hits.map(({ s, mh }) => {
      const href = sectionHref(s.slug) + (mh ? ("#" + mh.id) : "");
      const sub = mh ? '<span class="search__sub">' + mh.t + '</span>' : "";
      return '<a class="search__hit" href="' + href + '">' +
             '<span class="search__n">' + s.num + '</span>' +
             '<span class="search__t">' + s.title + sub + '</span></a>';
    }).join("");
  }
  input.addEventListener("input", run);
  input.addEventListener("keydown", e => {
    if (e.key === "Escape") { input.value = ""; run(); input.blur(); }
    if (e.key === "Enter") { const a = res.querySelector(".search__hit"); if (a) a.click(); }
  });
}

/* ============================================================
   PREREQUISITES (lesson head)
   ============================================================ */
function buildPrereqs(slug) {
  const box = document.querySelector(".objectives");
  const s = FLAT.find(x => x.slug === slug);
  if (!box || !s || !s.pre || !s.pre.length) return;
  const links = s.pre.map(n => {
    const p = FLAT.find(x => x.n === n);
    return `<a href="${sectionHref(p.slug)}">Section ${p.n}: ${p.title}</a>`;
  });
  const el = document.createElement("p");
  el.className = "objectives__pre";
  el.innerHTML = "Before you start: " + links.join(" and ") + ".";
  box.appendChild(el);
}

/* ============================================================
   ON THIS PAGE (wide screens)
   ============================================================ */
function buildToc() {
  const main = document.querySelector("main.reading");
  const hs = [...document.querySelectorAll(".prose h2[id]")];
  if (!main || hs.length < 3) return;
  const nav = document.createElement("nav");
  nav.className = "toc";
  nav.setAttribute("aria-label", "On this page");
  nav.innerHTML = '<div class="toc__label">On this page</div>' + hs.map(h =>
    `<a href="#${h.id}">${h.textContent.replace(/^\s*\d+\s*/, "")}</a>`).join("");
  main.appendChild(nav);
  const links = [...nav.querySelectorAll("a")];
  if (!("IntersectionObserver" in window)) return;
  const io = new IntersectionObserver(entries => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      links.forEach(a => a.classList.toggle("is-active", a.getAttribute("href") === "#" + e.target.id));
    }
  }, { rootMargin: "0px 0px -70% 0px" });
  hs.forEach(h => io.observe(h));
}

/* ============================================================
   COPY BUTTONS on code blocks
   ============================================================ */
function addCopyButtons() {
  document.querySelectorAll(".prose pre > code").forEach(code => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "copybtn";
    btn.textContent = "Copy";
    btn.setAttribute("aria-label", "Copy code");
    btn.addEventListener("click", async () => {
      try { await navigator.clipboard.writeText(code.innerText); btn.textContent = "Copied"; }
      catch (e) { btn.textContent = "Select + Ctrl-C"; }
      setTimeout(() => { btn.textContent = "Copy"; }, 1500);
    });
    code.parentNode.appendChild(btn);
  });
}

/* ============================================================
   PRINT: collect the check-yourself answers at the end
   so a reader on paper does not see an answer under its question
   ============================================================ */
function buildPrintAnswers() {
  const checks = [...document.querySelectorAll(".prose details.check")];
  const prose = document.querySelector(".prose");
  if (!checks.length || !prose) return;
  const sec = document.createElement("section");
  sec.className = "print-answers";
  let html = "<h2>Answers to “Check yourself”</h2>";
  checks.forEach((d, i) => {
    const q = d.querySelector(".check__q");
    const a = d.querySelector(".check__answer");
    const tag = d.querySelector(".check__tag");
    if (tag) tag.textContent = "Check yourself " + (i + 1);
    html += `<h3>${i + 1}. ${q ? q.innerHTML : ""}</h3>` +
            `<div class="check__answer">${a ? a.innerHTML : ""}</div>`;
  });
  sec.innerHTML = html;
  const bar = prose.querySelector("[data-complete]");
  prose.insertBefore(sec, bar || null);
}

/* ============================================================
   HOME: "continue where you left off"
   ============================================================ */
function initResume() {
  const btn = document.querySelector("[data-resume]");
  if (!btn || !done.size) return;
  const next = FLAT.find(s => !done.has(s.slug));
  if (!next) { btn.textContent = "You finished the course. Review Section 1 →"; btn.href = sectionHref(FLAT[0].slug); }
  else { btn.textContent = `Continue: Section ${next.n}, ${next.title} →`; btn.href = sectionHref(next.slug); }
  btn.hidden = false;
  const start = document.querySelector("[data-start]");
  if (start) start.classList.replace("btn--primary", "btn--ghost");
}

/* ============================================================
   BOOT
   ============================================================ */
function boot() {
  const slug = document.body.dataset.slug || "";
  initTheme();
  buildSidebar(slug);
  buildSearch();
  buildPager(slug);
  buildCompleteBar(slug);
  initMobileNav();
  refreshProgress();
  assignHeadingIds();
  buildPrereqs(slug);
  buildToc();
  initResume();
  highlightCode();
  addCopyButtons();
  renderMath();
  buildPrintAnswers();
}
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else { boot(); }

/* expose manifest for the home page builder */
window.COURSE = { PARTS, FLAT, TOTAL, sectionHref, markComplete, done };
