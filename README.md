# ShopLite — QA Practical Assessment

A small e-commerce web app that is **deliberately broken**, plus the specification it
is supposed to satisfy. Use it as a hiring practical for fresher Software QA
Engineers, or as a sandbox for practising exploratory testing, defect reporting and
Playwright automation.

🛒 **[Open the app](https://ummeadiba.github.io/ShopLite/app/login.html)** — the system
under test, hosted
📄 **[Candidate Brief](https://ummeadiba.github.io/ShopLite/candidate-brief.html)** —
the question paper
📄 **[Product Specification](https://ummeadiba.github.io/ShopLite/product-spec.html)** —
the oracle candidates test against

> [!WARNING]
> Every flaw in `app/` is planted on purpose: missing authentication guards, a master
> password, XSS sinks, passwords written to `localStorage` and the console, card data
> shown in full, broken money arithmetic. The hosted copy is safe to publish because
> the app has no backend and no shared state — but **never type a real credential into
> it, and do not copy its patterns into anything real.** See [SECURITY.md](SECURITY.md).

---

## Quick start

Candidates need nothing but a browser — open the hosted app and sign in with:

```text
qa@shoplite.test / Passw0rd!23
```

To run it offline, or to work on the fixture itself, Node.js 18+ is the only
requirement:

```powershell
git clone https://github.com/ummeadiba/ShopLite.git
cd ShopLite
node tools/static-server.js
```

`npm start` does the same thing, serving the identical pages at
<http://127.0.0.1:5173/login.html>. There is nothing to `npm install` — the app, the
static server and the docs build are all dependency-free.

The app keeps all its state in `localStorage`. To get back to a clean slate, run this
in the browser console:

```js
localStorage.clear(); sessionStorage.clear();
```

---

## What is in here

```text
app/                       The system under test — no build step, no dependencies
  login.html               sign-in
  products.html            catalogue with search, category filter and sort
  cart.html                lines, quantities, coupons, totals
  checkout.html            address, payment, order confirmation
  admin.html               order list for an "admin" who is never checked
  assets/app.js            shared catalogue, cart storage, money helpers, header
  assets/style.css         all styling

tools/
  static-server.js         serves app/ over http on :5173 — zero dependencies
  build-docs.js            renders the Markdown docs into docs/ — zero dependencies

docs/                      GitHub Pages site. Generated — do not hand-edit
  index.html               overview and links
  candidate-brief.html     built from CANDIDATE-BRIEF.md
  product-spec.html        built from PRODUCT-SPEC.md
  assets/docs.css          the one file in docs/ that is hand-maintained

CANDIDATE-BRIEF.md         Source of truth for the brief page
PRODUCT-SPEC.md            Source of truth for the spec page
SECURITY.md                Why this repository contains vulnerable code on purpose
package.json               npm start / npm run docs — no dependencies

.github/workflows/
  ci.yml                   Checks docs/ is in sync and that the app still serves
  pages.yml                Assembles and deploys the hosted site
```

Serving over `http://` rather than opening the files directly matters: `localStorage`,
relative links and Playwright's `baseURL` all behave the way they would on a real site.

---

## How the assessment works

Candidates get the two documents and the running app. They produce four artefacts —
a defect report, a test case sheet, two Playwright tests, and a release
recommendation. The brief spells out the format of each.

Defects are spread deliberately across authentication, session handling, the
catalogue, cart arithmetic, coupons, checkout validation, the admin page and
accessibility, so that no single skill carries a candidate:

- roughly a third are visible to anyone who looks carefully
- roughly a third need deliberate negative testing, boundary values or DevTools
- the rest need arithmetic, accessibility knowledge or security instinct — a missing
  auth guard, a stored password, a total that goes negative

**Always pair a take-home with a live walkthrough.** Assume candidates use AI
assistance; the brief tells them so openly. What AI cannot fake is explaining a
submission line by line, extending a test while you watch, and defending a severity
rating.

### Running a sitting

1. **Before the candidate arrives**, open the hosted app and confirm it loads. Setup
   problems must not eat their clock.
2. **Use a fresh browser profile per candidate.** `localStorage` survives between
   sittings and will confuse them. There is no server state to reset — the hosted copy
   is static, so candidates cannot interfere with each other.
3. Send the two document links. Everything they need is in those.
4. Keep your answer key and marking sheet **outside this repository** — it is public,
   and so is anything you commit to it.

---

## Not included

The specification's §10 (API contract) and §11.1–11.3 (performance targets) describe a
mock REST API that **is not part of this repository**. Both sections are marked as out
of scope in the spec and in the brief. The web app is entirely client-side and makes
no network calls, so it runs without one.

If you want API and load-testing rounds, supply your own service on port 4000 matching
§10 and tell candidates its base URL.

---

## Maintaining this

**Do not "fix" the app.** Every oddity in `app/` is either a planted defect or the
scaffolding for one — the `<title>Document</title>` on the login page, the two
different money formatters in `assets/app.js`, the `TODO(dev)` comments that leak the
admin URL. Changing them silently removes findings the assessment depends on.

**The Markdown files are the source of truth for the docs.** After editing
`CANDIDATE-BRIEF.md` or `PRODUCT-SPEC.md`, regenerate the pages:

```powershell
node tools/build-docs.js      # or: npm run docs
```

Commit the regenerated `docs/*.html` alongside the Markdown change. CI runs
`node tools/build-docs.js --check` and fails the build if the two drift apart.

**Requirement citations.** `PRODUCT-SPEC.md` numbers its clauses `2.1`, `5.4`, `11.9`
and so on, and the brief asks candidates to cite them as `SPEC 5.4`. If you renumber a
clause, search the repository for references to the old number first.

**Refreshing the paper.** If a set of answers leaks, the cheapest rotation is to change
the planted defects rather than the questions: move the XSS sink to a different field,
invert a calculation, add the missing auth guard back and remove a different one.

### How the hosted site is built

[.github/workflows/pages.yml](.github/workflows/pages.yml) deploys on every push to
`main`. It assembles one site from two directories:

```text
/                     docs/         the three documentation pages
/app/login.html       app/          the system under test, copied verbatim
```

**Set-up, once:** Settings → Pages → Source → **GitHub Actions**. Not "Deploy from a
branch" — the workflow needs to combine `docs/` and `app/`, which branch deploys cannot
do.

Two details worth knowing before you change that workflow:

- It refuses to publish if `docs/` is out of sync with the Markdown, then asserts every
  expected file exists in the assembled site. A silent half-deploy is the failure mode
  worth guarding against.
- It injects `<meta name="robots" content="noindex, nofollow">` into each published page
  under `/app/`. `app/` in the repository is never touched. This keeps a realistic fake
  login form out of search results, which is what would otherwise land the domain on a
  phishing blocklist.

`localStorage` is scoped per origin, not per path, so the app shares storage with
anything else you host on `ummeadiba.github.io`. Nothing else lives there today; keep it
in mind if that changes, and note that telling a candidate to run `localStorage.clear()`
clears that whole origin.

---

## License

[MIT](LICENSE). The vulnerable code is provided for testing practice only.
