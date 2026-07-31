#!/usr/bin/env python3
"""Download all CDN assets into assets/vendor/ so the site runs fully offline.

Pass --licenses-only to refresh just the third-party license notices.
"""
import os, re, sys, urllib.request, ssl

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
V = os.path.join(ROOT, "assets", "vendor")
UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/120.0 Safari/537.36")
ctx = ssl.create_default_context()

def get(url, binary=True):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, context=ctx, timeout=60) as r:
        return r.read() if binary else r.read().decode("utf-8")

def save(path, data):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    mode = "wb" if isinstance(data, (bytes, bytearray)) else "w"
    with open(path, mode, **({} if mode == "wb" else {"encoding": "utf-8"})) as f:
        f.write(data)

# MIT, BSD-3 and the OFL all require the notice to travel with the files we redistribute.
LICENSES = {
    "katex/LICENSE": "https://cdn.jsdelivr.net/npm/katex@0.16.9/LICENSE",
    "highlight/LICENSE": "https://cdn.jsdelivr.net/npm/@highlightjs/cdn-assets@11.9.0/LICENSE",
    "fonts/OFL-Fraunces.txt": "https://raw.githubusercontent.com/google/fonts/main/ofl/fraunces/OFL.txt",
    "fonts/OFL-Newsreader.txt": "https://raw.githubusercontent.com/google/fonts/main/ofl/newsreader/OFL.txt",
    "fonts/OFL-Inter.txt": "https://raw.githubusercontent.com/google/fonts/main/ofl/inter/OFL.txt",
    "fonts/OFL-JetBrainsMono.txt": "https://raw.githubusercontent.com/google/fonts/main/ofl/jetbrainsmono/OFL.txt",
}

def licenses():
    for rel, url in LICENSES.items():
        save(os.path.join(V, *rel.split("/")), get(url, binary=False))
    print(f"licenses: ok ({len(LICENSES)} files)")

if "--licenses-only" in sys.argv:
    licenses()
    raise SystemExit(0)

KX = "https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/"

# ---- KaTeX JS ----
for name in ["katex.min.js", "contrib/auto-render.min.js"]:
    save(os.path.join(V, "katex", os.path.basename(name)), get(KX + name))
print("katex js: ok")

# ---- highlight.js ----
save(os.path.join(V, "highlight", "highlight.min.js"),
     get("https://cdn.jsdelivr.net/npm/@highlightjs/cdn-assets@11.9.0/highlight.min.js"))
print("highlight js: ok")

# ---- KaTeX CSS + woff2 fonts (woff2 only, strip woff/ttf) ----
css = get(KX + "katex.min.css", binary=False)
woff2 = sorted(set(re.findall(r'url\(fonts/([A-Za-z0-9_\-]+\.woff2)\)', css)))
for fn in woff2:
    save(os.path.join(V, "katex", "fonts", fn), get(KX + "fonts/" + fn))
# rewrite src lists to keep only the woff2 entry
def katex_src(m):
    return 'src:url(fonts/%s) format("woff2")' % m.group(1)
css2 = re.sub(r'src:url\(fonts/([A-Za-z0-9_\-]+\.woff2)\)[^;}]*', katex_src, css)
save(os.path.join(V, "katex", "katex.min.css"), css2)
print(f"katex css: ok ({len(woff2)} woff2 fonts)")

# ---- Google Fonts CSS + woff2 ----
GF = ("https://fonts.googleapis.com/css2?"
      "family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600"
      "&family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;0,6..72,600;1,6..72,400;1,6..72,500"
      "&family=Inter:wght@400;500;600;700"
      "&family=JetBrains+Mono:wght@400;500;600&display=swap")
gcss = get(GF, binary=False)
urls = re.findall(r'url\((https://fonts\.gstatic\.com/[^)]+\.woff2)\)', gcss)
seen = {}
for u in urls:
    fn = re.sub(r'[^A-Za-z0-9_.\-]', '_', u.rsplit("/", 1)[-1])
    # ensure uniqueness (gstatic filenames can repeat across families)
    base = fn; i = 1
    while fn in seen and seen[fn] != u:
        fn = base.replace(".woff2", f"-{i}.woff2"); i += 1
    seen[fn] = u
    save(os.path.join(V, "fonts", fn), get(u))
    gcss = gcss.replace(u, fn)  # rewrite to local relative path
save(os.path.join(V, "fonts", "fonts.css"), gcss)
print(f"google fonts: ok ({len(set(urls))} woff2 files)")

licenses()

print("\nVENDOR DONE ->", V)
