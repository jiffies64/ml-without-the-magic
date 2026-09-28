# Machine Learning Without the Magic 🧠

**A free, open-source machine learning course that takes you from _"what is a vector?"_ all the way to building a Mixture-of-Experts transformer from scratch in PyTorch: intuition first, then the math, then the code.**

![Code: MIT](https://img.shields.io/badge/code-MIT-blue)
![Content: CC BY 4.0](https://img.shields.io/badge/content-CC%20BY%204.0-lightgrey)
![Dependencies: none](https://img.shields.io/badge/dependencies-none-brightgreen)
![Works offline](https://img.shields.io/badge/works-offline-success)
![PDF: 389 pages](https://img.shields.io/badge/PDF-389%20pages-orange)

If you've ever bounced off machine learning because every tutorial either hand-waves the math or
drowns you in it, this course is built for you. It teaches **neural networks, backpropagation,
gradient descent, CNNs, RNNs, attention, transformers, and mixture-of-experts** the same honest way
every time: a plain-English **analogy**, then the **math derived line by line with every symbol
defined**, then the **smallest PyTorch** that makes it real, then a **"check yourself"** question so
you know it stuck. No equation is ever left as _"it can be shown that."_

Read it online as a static site, or grab the whole thing as a single **389-page PDF**. No framework,
no build step, no account, no paywall.

> **Topics:** `machine-learning` · `deep-learning` · `pytorch` · `neural-networks` ·
> `backpropagation` · `gradient-descent` · `transformers` · `attention` · `mixture-of-experts` ·
> `from-scratch` · `ml-course` · `learn-machine-learning`

## Table of contents

- [Who this is for](#who-this-is-for)
- [Why it's different](#why-its-different)
- [Curriculum](#curriculum-23-lessons-6-parts)
- [Read it / run it](#read-it--run-it)
- [What's inside](#whats-inside)
- [Editing the course](#editing-the-course)
- [Rebuilding the PDF](#rebuilding-the-pdf)
- [Authors](#authors)
- [License](#license)

## Who this is for

- **Self-taught programmers** who can write a little Python and want to _actually understand_ ML
  instead of copy-pasting `model.fit()`.
- **Students** who've been shown the formulas but never where they come from.
- **Working engineers** who use deep-learning libraries daily and want to see what happens
  underneath, down to hand-derived backprop and a transformer built from an empty file.

The only prerequisites are high-school algebra and basic Python. Everything else (vectors,
derivatives, probability, gradients) is built from zero.

## Why it's different

Most resources pick a lane: rigorous-but-impenetrable, or friendly-but-shallow. This one refuses to.
Every concept follows the same four beats:

1. **Intuition first:** a plain-English explanation and a real-life analogy. Gradient descent is
   hiking downhill in fog; a transformer's attention is a librarian pulling exactly the right books;
   a mixture-of-experts router is a hospital front desk sending you to the right specialist.
2. **Then the math:** derived step by step, every symbol named, nothing skipped or asserted.
3. **Then the code:** the smallest PyTorch (or NumPy) that does exactly that, and nothing more.
4. **Check yourself:** a question with a collapsible answer, so you test understanding before
   moving on.

It's also written to be readable if **English isn't your first language**: jargon like _gradient
descent_, _latent space_, and _auxiliary loss_ is defined in plain words the first time it appears.

## Curriculum (23 lessons, 6 parts)

1. **Math Foundations:** linear algebra · calculus · probability · information theory
2. **Classical ML:** linear & logistic regression · overfitting & regularization · a tour of classical models (kNN, trees, SVMs, ensembles)
3. **Neural Nets from Scratch:** neurons & activations · **backpropagation by hand** · an MLP in pure NumPy · training dynamics
4. **PyTorch:** tensors & autograd · `nn.Module` & the training loop · debugging habits
5. **Deep Learning Architectures:** CNNs · RNNs & LSTMs · **attention & transformers** · language modeling (GPT) · training at scale
6. **Capstone:** reading papers like an engineer · **Mixture of Experts from scratch** · where to go next

Parts 1, 3, and the transformer / MoE sections go deepest. They're the heart of the course.

## Read it / run it

No build step. Open `index.html` directly, or serve the folder (recommended, so the search index and
saved progress work cleanly):

```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```

Everything (math via **KaTeX**, syntax highlighting via **highlight.js**, and all web fonts) is
**vendored locally** under `assets/vendor/`, so the whole site works with **no internet connection**.

## What's inside

```
index.html                  Landing page + full syllabus
sections/01…23-*.html       The 23 lessons
notation.html               Every symbol with its one fixed meaning, plus a glossary
assets/course.css           Design system (light/dark themes, every component)
assets/course.js            Sidebar, search, progress + theme (both persisted), math/code init
assets/search-index.js      Generated client-side search index (titles + headings + keywords)
assets/vendor/              Vendored KaTeX, highlight.js, and web fonts (fully offline)
tools/                      Search index, study times, PDF build, and asset vendoring
ML-Without-the-Magic.pdf    The entire course as a single 389-page PDF
```

Features: sticky sidebar with **progress tracking that persists across visits** and a
**continue where you left off** button, **client-side search** that deep-links to the matching
heading, an **on this page** outline on wide screens, **copy buttons** on every code block, inline
**SVG figures** that follow the **dark/light theme**, a responsive mobile drawer, keyboard focus,
reduced-motion support, and a print stylesheet that moves the answers to the end of each lesson.

## Editing the course

Lessons are hand-written HTML in `sections/`. After you edit lessons, regenerate the search index
and the study times:

```bash
python3 tools/build-search-index.py
python3 tools/reading-time.py
python3 tools/stamp-assets.py   # after changing course.css/course.js: busts browser caches
```

House style, so that every lesson reads the same way: the four beats use fixed labels
(*Intuition first*, *Now the math*, *The same thing in PyTorch*); every code block has a caption;
symbols follow [notation.html](notation.html); sentences stay short and free of idioms, for readers
whose first language is not English; figures are inline SVG that use the theme classes in
`assets/course.css` (section 13) so that they work in light and dark mode.

To re-download the vendored libraries and fonts (e.g. to bump a version):

```bash
python3 tools/vendor-assets.py
```

## Rebuilding the PDF

The PDF is built from the site itself, so it always matches the lessons. It needs Playwright
(Chromium):

```bash
npm install --no-save playwright
node tools/build-pdf.mjs
```

It adds a bookmark outline, tagged (accessible) structure, and the answers to each lesson's
questions at the end of that chapter.

> **Publishing tip:** this works out-of-the-box on **GitHub Pages**, Netlify, Vercel, or any static
> host; it's just files. For discoverability, add repo **topics** matching the keywords above so
> people searching for a free ML / PyTorch / transformers course can find it.

## Authors

Built by **jiffies64** and **Claude** (Anthropic's Opus). The curriculum, the reviews, and every
editorial and design call are jiffies64's; Claude drafted the lessons, the from-scratch code, and
the PDF. It took plenty of back-and-forth to get right.

Found a mistake or an explanation that could be clearer? Please open an issue.

Made with care by both of us. ❤️

## License

Code is released under the [MIT License](LICENSE). The course prose, figures, and explanations are
shared under **CC BY 4.0**: reuse them freely, with attribution to jiffies64.
