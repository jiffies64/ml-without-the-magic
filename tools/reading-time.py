#!/usr/bin/env python3
"""Compute study time for every lesson with one formula, and write it everywhere it appears:
the manifest in assets/course.js, the "N min read" line in each lesson, and the home page total.

Study time, not skim time:
  prose words / 170 per minute
  + 0.5 min per display equation (you read it twice: symbols, then the gloss)
  + 0.08 min per line of code
  + 1 min per figure
  + 1.5 min per "Check yourself" (thinking before you reveal)
Rounded to the nearest 2 minutes.

Run after editing lessons:  python3 tools/reading-time.py
"""
import glob, html, os, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def minutes(src):
    body = src.split('<div class="prose">', 1)[-1].split("data-complete")[0]
    code = re.findall(r"<pre>(.*?)</pre>", body, re.S)
    code_lines = sum(c.count("\n") + 1 for c in code)
    body = re.sub(r"<pre>.*?</pre>", " ", body, flags=re.S)
    body = re.sub(r"<svg.*?</svg>", " ", body, flags=re.S)
    display = len(re.findall(r"\$\$.*?\$\$", body, re.S))
    body = re.sub(r"\$\$.*?\$\$", " ", body, flags=re.S)
    body = re.sub(r"\$[^$]*\$", " x ", body)
    words = len(html.unescape(re.sub(r"<[^>]+>", " ", body)).split())
    figs = body.count('<figure class="fig"')
    checks = body.count('<details class="check"')
    m = words / 170 + 0.5 * display + 0.08 * code_lines + 1.0 * figs + 1.5 * checks
    return max(10, int(round(m / 2.0)) * 2)


def main():
    js_path = os.path.join(ROOT, "assets", "course.js")
    js = open(js_path, encoding="utf-8").read()
    total = 0
    for f in sorted(glob.glob(os.path.join(ROOT, "sections", "*.html"))):
        slug = os.path.splitext(os.path.basename(f))[0]
        src = open(f, encoding="utf-8").read()
        m = minutes(src)
        total += m
        src2 = re.sub(r"<b>\d+ min</b> read", f"<b>{m} min</b> read", src, count=1)
        if src2 != src:
            open(f, "w", encoding="utf-8").write(src2)
        js = re.sub(r'(slug: "%s",.*?min: )\d+' % re.escape(slug), r"\g<1>%d" % m, js, count=1)
        print(f"{slug:28} {m:3d} min")
    open(js_path, "w", encoding="utf-8").write(js)
    hours = round(total / 60)
    idx_path = os.path.join(ROOT, "index.html")
    idx = open(idx_path, encoding="utf-8").read()
    idx = re.sub(r"~\d+ hrs of (?:reading|study)", f"~{hours} hrs of study", idx)
    open(idx_path, "w", encoding="utf-8").write(idx)
    print(f"total {total} min (~{hours} hrs)")


if __name__ == "__main__":
    main()
