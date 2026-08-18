# ShopLite — QA Practical Assessment

A small e-commerce web app and REST API that are **deliberately broken**, plus the
specification they are supposed to satisfy. Use it as a hiring practical for fresher
Software QA Engineers, or as a sandbox for practising exploratory testing, defect
reporting, API security testing, Playwright automation and load testing.

🛒 **[Open the app](https://shoplite-qa.netlify.app/app/login.html)** — the system
under test, hosted
📄 **[Candidate Brief](https://shoplite-qa.netlify.app/candidate-brief.html)** —
the question paper
📄 **[Product Specification](https://shoplite-qa.netlify.app/product-spec.html)** —
the oracle candidates test against

> [!WARNING]
> Every flaw in `app/` is planted on purpose: missing authentication guards, a master
> password, XSS sinks, passwords written to `localStorage` and the console, card data
> shown in full, broken money arithmetic. The hosted copy is safe to publish because
> the app has no backend and no shared state — but **never type a real credential into
> it, and do not copy its patterns into anything real.** See [SECURITY.md](SECURITY.md).

---

## Quick start

The **web app** is hosted — candidates need nothing but a browser. Open it and sign in
with:

```text
qa@shoplite.test / Passw0rd!23
```

The **API** runs locally, on purpose (see [below](#why-the-api-is-not-hosted)).
Node.js 18+ is the only requirement:

```powershell
git clone https://github.com/ummeadiba/ShopLite.git
cd ShopLite
node mock-api/server.js          # API  -> http://127.0.0.1:4000/api/health
node tools/static-server.js      # app  -> http://127.0.0.1:5173/login.html  (optional)
```

`npm run api` and `npm start` are the same two commands. Try the load generator:

```powershell
node load-test/run-load.js --path /api/report --vus 20 --seconds 15
```

There is nothing to `npm install` — the app, the API, the static server, the load
generator and the docs build are all dependency-free.

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

mock-api/
  server.js                Defective REST API on :4000 — zero dependencies, in-memory

load-test/
  run-load.js              Load generator with percentiles — zero dependencies
  README.md                Options, how to read the output, what earns marks

tools/
  static-server.js         serves app/ over http on :5173 — zero dependencies
  build-docs.js            renders the Markdown docs into docs/ — zero dependencies
  build-site.js            assembles docs/ + app/ into _site/ for deployment

docs/                      The documentation pages. Generated — do not hand-edit
  index.html               overview and links
  candidate-brief.html     built from CANDIDATE-BRIEF.md
  product-spec.html        built from PRODUCT-SPEC.md
  assets/docs.css          the one file in docs/ that is hand-maintained

CANDIDATE-BRIEF.md         Source of truth for the brief page
PRODUCT-SPEC.md            Source of truth for the spec page
SECURITY.md                Why this repository contains vulnerable code on purpose
netlify.toml               Build command, publish directory and headers
package.json               npm start / npm run api / npm run load / npm run docs

.github/workflows/
  ci.yml                   Checks docs/ is in sync, that the site assembles, and
                           that the app, API and load generator all still work
```

`_site/` is build output and is not committed.

Serving over `http://` rather than opening the files directly matters: `localStorage`,
relative links and Playwright's `baseURL` all behave the way they would on a real site.

---

## How the assessment works

Candidates get the two documents, the hosted app and the local API. They produce six
artefacts — a defect report, a test case sheet, two Playwright tests, API findings, a
load-test report, and a release recommendation. The brief spells out the format of each.

Defects are spread deliberately across authentication, session handling, the
catalogue, cart arithmetic, coupons, checkout validation, the admin page,
accessibility, the API and its performance, so that no single skill carries a candidate:

- roughly a third are visible to anyone who looks carefully
- roughly a third need deliberate negative testing, boundary values or DevTools
- the rest need arithmetic, accessibility knowledge or security instinct — a missing
  auth guard, a stored password, a total that goes negative, a forgeable token

| Surface | Covers |
|---|---|
| Hosted web app | Spec §2–§9, §11.4–§11.13 — tasks 1 to 3 |
| Local API | Spec §10 — task 4: status codes, auth, tokens, IDOR, input handling, CORS |
| Local API under load | Spec §11.1–§11.3 — task 5: percentiles, degradation under concurrency |

**Always pair a take-home with a live walkthrough.** Assume candidates use AI
assistance; the brief tells them so openly. What AI cannot fake is explaining a
submission line by line, extending a test while you watch, and defending a severity
rating.

### Running a sitting

1. **Before the candidate arrives**, open the hosted app and confirm it loads. Setup
   problems must not eat their clock.
2. **Use a fresh browser profile per candidate.** `localStorage` survives between
   sittings and will confuse them. The hosted app is static, so candidates cannot
   interfere with each other there.
3. **Each candidate runs their own API.** That is the point of not hosting it: nobody
   else's load test pollutes their percentiles. Tell them to restart
   `node mock-api/server.js` if a long load run leaves it sluggish — its state is in
   memory, and one of the planted performance defects is cumulative.
4. Send the two document links. Everything they need is in those.
5. **For tasks 4 and 5 they need a terminal**, Node.js 18+ and a clone of the repo.
   Confirm that is available before you schedule a timed sitting; a candidate fighting
   a corporate proxy is not being assessed on testing.
6. Keep your answer key and marking sheet **outside this repository** — it is public,
   and so is anything you commit to it.

---

## Why the API is not hosted

The web app is hosted and the API deliberately is not. That asymmetry is the design, not
an unfinished job:

- **Load-test numbers have to mean something.** Spec §11.1 states absolute targets —
  p95 under 800 ms at 50 concurrent users. On a free cloud tier, cold starts and shared
  CPU swamp those numbers, so a candidate would be measuring the host, not the API. On
  `127.0.0.1` the planted performance defects are the dominant signal.
- **Candidates must not collide.** One shared endpoint plus two candidates running 50-VU
  load tests produces two useless reports. A local API is a private API.
- **The API holds real server-side state.** Unlike the app, it has orders, users and
  tokens on the server, and it is defective by design: no rate limiting, an IDOR on
  `/api/orders/:id`, an admin endpoint that returns plaintext passwords. Hosting *that*
  publicly would be careless, where hosting the static app is not.

API testing needs a terminal anyway, so the browser-only convenience the hosted app
provides was never available for tasks 4 and 5.

The web app makes no network calls of its own, so the two run independently — the API is
a separate surface to test, not a backend the UI depends on.

---

## Maintaining this

**Do not "fix" the app or the API.** Every oddity in `app/` and `mock-api/` is either a
planted defect or the scaffolding for one — the `<title>Document</title>` on the login
page, the two different money formatters in `assets/app.js`, the `RATE_LIMIT` constant in
`mock-api/server.js` that is declared and never enforced, the `checksum` loop in
`/api/report` that makes it collapse under concurrency. Changing them silently removes
findings the assessment depends on.

**The API source is public**, so a candidate can read the defects rather than discover
them. That is a deliberate trade for having a single public repository. Grade the
demonstration and the write-up — a working exploit, a correct severity, a clear impact
statement — not the discovery. The live walkthrough is where reading-versus-finding
becomes obvious.

**The Markdown files are the source of truth for the docs.** After editing
`CANDIDATE-BRIEF.md` or `PRODUCT-SPEC.md`, regenerate the pages:

```powershell
node tools/build-docs.js      # or: npm run docs
```

Commit the regenerated `docs/*.html` alongside the Markdown change. CI runs
`node tools/build-docs.js --check` and fails the build if the two drift apart.

**Requirement citations.** `PRODUCT-SPEC.md` numbers its clauses `2.1`, `5.4`, `11.9`
and so on, and the brief asks candidates to cite them as `SPEC §5.4`. If you renumber a
clause, search the repository for references to the old number first.

**Refreshing the paper.** If a set of answers leaks, the cheapest rotation is to change
the planted defects rather than the questions: move the XSS sink to a different field,
invert a calculation, add the missing auth guard back and remove a different one.

## Deployment (Netlify)

The site is hosted on Netlify's free tier. [netlify.toml](netlify.toml) holds the whole
configuration; there is no build image to configure and nothing to install.

```toml
command = "node tools/build-docs.js --check && node tools/build-site.js"
publish = "_site"
```

[tools/build-site.js](tools/build-site.js) assembles one site from two directories:

```text
/                     docs/         the three documentation pages
/app/login.html       app/          the system under test, copied verbatim
/robots.txt                         generated, disallows /app/
```

### Connecting it, once

1. Netlify → **Add new site → Import an existing project** → GitHub →
   `ummeadiba/ShopLite`.
2. Leave the build settings alone — `netlify.toml` supplies them. Deploy.
3. **Site configuration → Change site name** → `shoplite-qa`, so the URL matches the one
   written into the documents. If you pick a different name, update it in
   `CANDIDATE-BRIEF.md`, `PRODUCT-SPEC.md`, `SECURITY.md` and this file, then run
   `npm run docs`.

Every push to `main` redeploys. Netlify's free tier covers this easily: the site is a
handful of small static files, and nothing runs server-side.

### Two details worth knowing

- **The build refuses to publish stale docs.** `build-docs.js --check` runs first, so a
  Markdown edit without a rebuild fails the deploy rather than shipping a stale page.
  `build-site.js` then asserts each expected file exists, and that `mock-api/`,
  `load-test/` and `tools/` are absent from the output. A silent half-deploy, or an
  accidentally published API, are the failure modes worth guarding against.
- **`/app/` is kept out of search results** — `build-site.js` injects
  `<meta name="robots" content="noindex, nofollow">` into the published copies and writes
  a `robots.txt`, and `netlify.toml` adds an `X-Robots-Tag` header. `app/` in the
  repository is never edited. A realistic fake login form in search results is what would
  otherwise land the domain on a phishing blocklist.

`localStorage` is scoped per origin, so the app shares storage with anything else you host
on the same Netlify site. Nothing else does today, but note that telling a candidate to
run `localStorage.clear()` clears the whole origin.

### If you had GitHub Pages enabled

This repository previously deployed to GitHub Pages, and that workflow has been removed.
Turn the old site off in **Settings → Pages → Source → None**, or it will keep serving a
copy at `ummeadiba.github.io/ShopLite` that no longer receives updates.

---

## License

[MIT](LICENSE). The vulnerable code is provided for testing practice only.
