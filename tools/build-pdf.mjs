#!/usr/bin/env node
/* Build ML-Without-the-Magic.pdf from the site.
 *
 * Needs Playwright (Chromium). From the repo root:
 *   npm install --no-save playwright   # or use a global install
 *   node tools/build-pdf.mjs
 *
 * What it does: serves the repo on a local port, renders every lesson with the site's
 * own JS (math, code highlighting, the print-only answer list), joins the lessons into
 * one print document with a cover and a clickable contents page, and prints it with
 * a bookmark outline and tagged (accessible) PDF structure.
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = process.env.PDF_OUT || path.join(ROOT, "ML-Without-the-Magic.pdf");
const TITLE = "Machine Learning Without the Magic";
const AUTHOR = "jiffies64";

function loadPlaywright() {
  const req = createRequire(import.meta.url);
  try { return req("playwright"); } catch (e) { /* fall through to a global install */ }
  const globalRoot = execSync("npm root -g").toString().trim();
  return req(path.join(globalRoot, "playwright"));
}

const TYPES = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript",
  ".woff2": "font/woff2", ".svg": "image/svg+xml", ".json": "application/json" };
function serve() {
  const server = http.createServer((req, res) => {
    const rel = decodeURIComponent(new URL(req.url, "http://x").pathname).replace(/^\/+/, "") || "index.html";
    const file = path.join(ROOT, rel);
    if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.writeHead(404); return res.end();
    }
    res.writeHead(200, { "Content-Type": TYPES[path.extname(file)] || "application/octet-stream" });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise(resolve => server.listen(0, "127.0.0.1", () => resolve(server)));
}

const esc = s => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

async function main() {
  const { chromium } = loadPlaywright();
  const server = await serve();
  const base = `http://127.0.0.1:${server.address().port}/`;
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.addInitScript(() => { try { localStorage.setItem("z2h-ml-theme", "light"); } catch (e) {} });

  // The manifest lives in course.js; read it from the home page.
  await page.goto(base + "index.html", { waitUntil: "load" });
  const parts = await page.evaluate(() => window.COURSE.PARTS.map(p => ({
    n: p.n, title: p.title, sections: p.sections.map(s => ({ n: s.n, slug: s.slug, title: s.title })) })));

  const chapters = [];
  for (const part of parts) {
    for (const s of part.sections) {
      await page.goto(base + `sections/${s.slug}.html`, { waitUntil: "load" });
      // boot() renders math and code on DOMContentLoaded; wait until the answer list exists
      await page.waitForFunction(() => document.querySelector(".print-answers") || !document.querySelector("details.check"));
      const html = await page.evaluate(({ slug, n }) => {
        const pre = "s" + String(n).padStart(2, "0");
        const main = document.querySelector("main.reading").cloneNode(true);
        main.querySelectorAll(".pager, .complete-bar, .toc, .copybtn, .check__reveal, script").forEach(e => e.remove());
        // unique ids across the whole book, and in-book links instead of file links
        main.querySelectorAll("[id]").forEach(e => { e.id = `${pre}-${e.id}`; });
        main.querySelectorAll("[aria-labelledby]").forEach(e => {
          e.setAttribute("aria-labelledby", e.getAttribute("aria-labelledby").split(/\s+/).map(i => `${pre}-${i}`).join(" "));
        });
        main.querySelectorAll("a[href]").forEach(a => {
          const h = a.getAttribute("href");
          let m = h.match(/^(?:\.\.\/sections\/|)?(\d\d)-[\w-]+\.html(?:#(.*))?$/);
          if (m) { a.setAttribute("href", "#s" + m[1] + (m[2] ? "-" + m[2] : "")); return; }
          if (h.startsWith("#")) { a.setAttribute("href", `#${pre}-${h.slice(1)}`); return; }
          if (!/^https?:/.test(h)) a.removeAttribute("href");
        });
        // the lesson title becomes the chapter heading (h1) in the outline
        const h1 = main.querySelector(".lesson-title");
        if (h1) h1.id = pre;
        // "1Vectors" -> "1 Vectors" in the PDF outline
        main.querySelectorAll(".h-num").forEach(e => { e.textContent = e.textContent.trim() + "\u2002"; });
        main.querySelectorAll(".h-num").forEach(e => { e.style.marginRight = "0"; });
        // closed <details> print only their summary; the answers are in .print-answers
        main.querySelectorAll("details").forEach(d => d.removeAttribute("open"));
        return main.innerHTML;
      }, s);
      chapters.push({ part, s, html });
      process.stdout.write(".");
    }
  }

  const toc = parts.map(p => `
    <div class="pdf-toc__part">Part ${p.n} · ${esc(p.title)}</div>
    ${p.sections.map(s => `<a class="pdf-toc__row" href="#s${String(s.n).padStart(2, "0")}">
       <span class="pdf-toc__n">${s.n}</span><span>${esc(s.title)}</span></a>`).join("")}`).join("");

  let lastPart = 0;
  const body = chapters.map(({ part, html }) => {
    const partPage = part.n !== lastPart
      ? `<section class="pdf-part"><div class="pdf-part__n">Part ${part.n}</div><div class="pdf-part__t">${esc(part.title)}</div></section>` : "";
    lastPart = part.n;
    return `${partPage}<article class="pdf-chapter reading">${html}</article>`;
  }).join("");

  const doc = `<!DOCTYPE html><html lang="en" data-theme="light"><head><meta charset="utf-8">
<title>${TITLE}</title>
<meta name="author" content="${AUTHOR}">
<link rel="stylesheet" href="assets/vendor/fonts/fonts.css">
<link rel="stylesheet" href="assets/course.css">
<link rel="stylesheet" href="assets/vendor/katex/katex.min.css">
<style>
  body { background: #fff; }
  .pdf-cover { height: 250mm; display: flex; flex-direction: column; justify-content: center; break-after: page; }
  .pdf-cover__kicker { font-family: var(--ui); font-size: 10pt; letter-spacing: .3em; text-transform: uppercase; color: var(--violet); }
  .pdf-cover__title { font-family: var(--display); font-weight: 600; font-size: 44pt; line-height: 1; margin: .4em 0 .5em; }
  .pdf-cover__sub { font-size: 14pt; color: var(--ink-soft); max-width: 34em; }
  .pdf-cover__meta { font-family: var(--ui); font-size: 9pt; color: var(--ink-faint); margin-top: 2.5em; }
  .pdf-toc { break-after: page; font-family: var(--ui); }
  .pdf-toc__title { font-family: var(--display); font-size: 22pt; margin: 0 0 1em; }
  .pdf-toc__part { font-size: 8pt; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; color: var(--ink-faint); margin: 1.3em 0 .4em; }
  .pdf-toc__row { display: flex; gap: .8em; padding: .25em 0; color: var(--ink); font-size: 11pt; border-bottom: 1px solid var(--hairline); }
  .pdf-toc__n { width: 2em; color: var(--violet); font-family: var(--display); font-weight: 600; }
  .pdf-part { height: 240mm; display: flex; flex-direction: column; justify-content: center; break-before: page; break-after: page; }
  .pdf-part__n { font-family: var(--ui); letter-spacing: .2em; text-transform: uppercase; color: var(--violet); font-size: 11pt; }
  .pdf-part__t { font-family: var(--display); font-size: 34pt; margin: .2em 0 0; font-weight: 600; }
  .pdf-chapter { break-before: page; }
  .pdf-chapter .print-answers h2 { font-size: 15pt; }
</style></head><body>
<section class="pdf-cover">
  <div class="pdf-cover__kicker">Machine Learning</div>
  <div class="pdf-cover__title">Without the Magic</div>
  <p class="pdf-cover__sub">From vectors and derivatives to a Mixture-of-Experts transformer, every idea
  built from scratch: intuition first, then the math, then working PyTorch, then a question to check yourself.</p>
  <div class="pdf-cover__meta">A 23-section course · by ${AUTHOR} · text CC BY 4.0, code MIT</div>
</section>
<nav class="pdf-toc"><div class="pdf-toc__title">Contents</div>${toc}</nav>
${body}
</body></html>`;

  const tmp = path.join(ROOT, ".pdf-build.html");
  fs.writeFileSync(tmp, doc);
  try {
    await page.goto(base + ".pdf-build.html", { waitUntil: "load" });
    await page.emulateMedia({ media: "print" });
    await page.evaluate(() => document.fonts.ready);
    await page.pdf({
      path: OUT, format: "A4", printBackground: true, outline: true, tagged: true,
      margin: { top: "16mm", bottom: "18mm", left: "15mm", right: "15mm" },
      displayHeaderFooter: true,
      headerTemplate: "<span></span>",
      footerTemplate: `<div style="width:100%;text-align:center;font:8px Inter,system-ui,sans-serif;color:#6B707B">
        ${TITLE} · <span class="pageNumber"></span> / <span class="totalPages"></span></div>`,
    });
  } finally {
    fs.unlinkSync(tmp);
  }
  await browser.close();
  server.close();
  addInfo(OUT, { Title: TITLE, Author: AUTHOR,
    Subject: "A free course from vectors to a Mixture-of-Experts transformer, built from scratch" });
  console.log(`\nwrote ${OUT}`);
}

/* Chromium writes only /Title. Append a standard PDF incremental update that
   replaces the Info dictionary, so readers also show the author and subject. */
function addInfo(file, info) {
  const buf = fs.readFileSync(file);
  const tail = buf.subarray(Math.max(0, buf.length - 4096)).toString("latin1");
  const prevXref = +tail.match(/startxref\s+(\d+)\s+%%EOF\s*$/)[1];
  const trailer = tail.slice(tail.lastIndexOf("trailer"));
  const infoNum = +trailer.match(/\/Info (\d+) 0 R/)[1];
  const size = +trailer.match(/\/Size (\d+)/)[1];
  const root = trailer.match(/\/Root (\d+ \d+ R)/)[1];
  const id = (trailer.match(/\/ID\s*(\[[^\]]*\])/) || [, ""])[1];
  const pdfStr = v => "(" + v.replace(/[\\()]/g, m => "\\" + m) + ")";
  const dict = Object.entries(info).map(([k, v]) => `/${k} ${pdfStr(v)}`).join(" ");
  let add = "\n";
  const objOff = buf.length + Buffer.byteLength(add, "latin1");
  add += `${infoNum} 0 obj\n<< ${dict} >>\nendobj\n`;
  const xrefOff = buf.length + Buffer.byteLength(add, "latin1");
  add += `xref\n${infoNum} 1\n${String(objOff).padStart(10, "0")} 00000 n \n` +
         `trailer\n<< /Size ${size} /Root ${root} /Info ${infoNum} 0 R /Prev ${prevXref}${id ? " /ID " + id : ""} >>\n` +
         `startxref\n${xrefOff}\n%%EOF\n`;
  fs.appendFileSync(file, add, "latin1");
}

main().catch(e => { console.error(e); process.exit(1); });
