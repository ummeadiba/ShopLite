# Security Policy

## This repository contains insecure code on purpose

ShopLite is a **training target** for QA practice. The application under `app/` is
seeded with deliberate defects, including security ones: a hard-coded master password,
missing authentication and role guards, cross-site scripting sinks, credentials written
to `localStorage` and the browser console, and payment data rendered in full.

**Please do not report these as vulnerabilities.** They are the exercise. A report that
`app/login.html` accepts a master password is a correct observation about a fixture, not
a finding about a product.

## Yes, it is deliberately hosted

The app is published at
<https://ummeadiba.github.io/ShopLite/app/login.html> so that candidates can be assessed
remotely without a local setup step.

That is a considered decision, not an oversight:

- **There is no backend.** No server, no database, no API, no accounts. Every page is
  static HTML and one JavaScript file.
- **All state is per-visitor.** The cart, the session flag and the fake orders live in
  each visitor's own `localStorage`. Nothing is shared between visitors, so nothing one
  person does can reach another.
- **The flaws are self-contained.** The XSS sinks execute in the visitor's own page with
  no cross-user data to steal. The "authentication bypass" grants access to a fictional
  catalogue held in the same browser.

What is genuinely worth guarding against is the page being mistaken for, or repurposed
as, a real sign-in form. So:

- every page under `/app/` is published with `<meta name="robots" content="noindex,
  nofollow">`, injected at deploy time by
  [.github/workflows/pages.yml](.github/workflows/pages.yml) — the files in `app/` are
  never edited
- the documentation states plainly that the store is fictional and the credentials are
  test data
- the brief tells candidates to use a throwaway password, because the app stores what
  they type in plain text

If you believe the hosted copy is being abused — linked from somewhere as a genuine
login, for instance — please open an issue and it will be taken down.

## Still do not use it for real

- Do not enter real credentials, real card numbers, or any personal data. The app stores
  what you type in `localStorage` in plain text and logs it to the console.
- Do not copy patterns from `app/` into production code.
- If you fork this and host your own copy, keep the `noindex` step and do not put it on a
  domain that anything else depends on. `localStorage` is shared per origin, so a fork on
  `yourname.github.io` shares storage with everything else you host there.

## What is worth reporting

Open an issue if you find a problem in the parts of this repository that are meant to be
correct:

- `tools/static-server.js` — e.g. a path traversal that escapes `app/`
- `tools/build-docs.js` — e.g. unescaped Markdown reaching the generated HTML
- the GitHub Actions workflows, or anything else that runs on a maintainer's machine
- a specification clause that contradicts itself, or an unreachable requirement

For anything sensitive, use GitHub's private vulnerability reporting on this repository
rather than a public issue.
