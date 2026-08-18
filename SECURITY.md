# Security Policy

## This repository contains insecure code on purpose

ShopLite is a **training target** for QA practice. The application under `app/` is
seeded with deliberate defects, including security ones: a hard-coded master password,
missing authentication and role guards, cross-site scripting sinks, credentials written
to `localStorage` and the browser console, and payment data rendered in full.

**Please do not report these as vulnerabilities.** They are the exercise. A report that
`app/login.html` accepts a master password is a correct observation about a fixture, not
a finding about a product.

## Do not deploy it

- Never host `app/` on a public URL, an intranet, or any shared environment.
- Run it on `127.0.0.1` only, which is what `tools/static-server.js` binds to.
- Do not enter real credentials, real card numbers, or any personal data into it. The
  app stores what you type in `localStorage` in plain text.
- Do not copy patterns from `app/` into production code.

Only `docs/` is published to GitHub Pages. The application is never hosted.

## What is worth reporting

Open an issue if you find a problem in the parts of this repository that are meant to
be correct:

- `tools/static-server.js` — e.g. a path traversal that escapes `app/`
- `tools/build-docs.js` — e.g. unescaped Markdown reaching the generated HTML
- the GitHub Actions workflow, or anything else that runs on a maintainer's machine
- a specification clause that contradicts itself, or an unreachable requirement

For anything sensitive, use GitHub's private vulnerability reporting on this repository
rather than a public issue.
