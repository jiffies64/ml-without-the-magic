#!/usr/bin/env python3
"""Add ?v=<content hash> to our own CSS/JS links in every page, so a deploy never
mixes new HTML with an old cached stylesheet. Run after editing course.css/course.js."""
import glob, hashlib, os, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS = ["assets/course.css", "assets/course.js", "assets/search-index.js"]
ver = {a: hashlib.sha1(open(os.path.join(ROOT, a), "rb").read()).hexdigest()[:8] for a in ASSETS}
pages = glob.glob(os.path.join(ROOT, "*.html")) + glob.glob(os.path.join(ROOT, "sections", "*.html"))
for p in pages:
    s = open(p, encoding="utf-8").read()
    t = s
    for a, v in ver.items():
        name = re.escape(os.path.basename(a))
        t = re.sub(r'((?:\.\./)?assets/%s)(\?v=[0-9a-f]+)?"' % name, r'\1?v=%s"' % v, t)
    if t != s:
        open(p, "w", encoding="utf-8").write(t)
print("stamped", len(pages), "pages:", ver)
