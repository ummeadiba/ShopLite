# ShopLite QA Practical — Candidate Brief

**Role:** Software QA Engineer (fresher) · **Suggested time:** 3 hours

Welcome. You are testing **ShopLite v1.0**, a small e-commerce web app that has been
handed to QA as "approved for release testing". Your job is to decide whether that
claim survives contact with the product.

[`PRODUCT-SPEC.md`](PRODUCT-SPEC.md) is the source of truth for correct behaviour.
**Read it before you start testing.** Where the application disagrees with the specification, the
application is wrong — report it.

---

## Before you start

| Item | Value |
|---|---|
| App | <https://ummeadiba.github.io/ShopLite/app/login.html> |
| Test account | `qa@shoplite.test` / `Passw0rd!23` |
| Reset state | `localStorage.clear(); sessionStorage.clear()` in the browser console |
| Browser | Chrome, Edge or Firefox — current version, DevTools open |

The app is hosted, so there is nothing to install or start. It runs entirely in your
browser and keeps its state in your own `localStorage`, so you cannot disturb another
candidate — and clearing storage resets you to a clean slate.

**Use a throwaway password.** The app stores what you type in plain text and prints it
to the console; that is one of the defects. Never type a real credential into it.

Node.js is only needed if you attempt the Playwright task.

Use whatever tools you normally would, AI assistants included. You will be asked to
walk through your submission line by line afterwards, so submit only what you can
explain and defend.

---

## Tasks

### 1. Exploratory testing and defect reporting

Explore login, the product catalogue, the cart and checkout. Report **at least 8
defects** in `bug-reports.md`.

For each defect give:

- a title that says what is wrong, not what screen it is on
- numbered steps to reproduce, from a clean state
- **expected result** — and the clause it comes from, cited as `SPEC 5.4`
- **actual result** — what the product did instead
- severity and priority, with one line justifying the severity

Do not stop at the first eight things you notice. Quantity is not the point; a
report the developer can act on without asking you a follow-up question is.

### 2. Test case design

Write **10 test cases** for the cart and checkout flow in `test-cases.csv`, covering
**positive, negative and boundary** conditions. Suggested columns:

```text
ID, Title, Precondition, Steps, Test data, Expected result, Spec clause, Result, Notes
```

Execute them and record the actual result of each. A test case that you did not run
is a design artefact, not a test.

### 3. Automation

Automate **two Playwright tests** under `automation/tests/`:

- one happy path — sign in, add a product to the cart, assert the cart reflects it
- one that **proves a defect you found in task 1** — the test should fail against
  this build and pass once the bug is fixed. Say in a comment which defect it pins.

Set the project up yourself:

```powershell
mkdir automation
cd automation
npm init -y
npm install --save-dev @playwright/test
npx playwright install chromium
```

Point `baseURL` at `https://ummeadiba.github.io/ShopLite/app/` — the hosted app needs no
local server. Include your config and a one-line command to execute the suite.

### 4. Release recommendation

**Would you release this build?** One paragraph. Name the single defect that most
influenced your answer and explain why it — rather than the others — decided it.
A defensible "no" and a defensible "yes, with conditions" both score; an unsupported
verdict does not.

---

## Not part of this release

[`PRODUCT-SPEC.md`](PRODUCT-SPEC.md) §10 (API contract) and §11.1–11.3 (performance) describe a mock
REST API that is **not included in this repository**. There is no API to point a
`curl` command or a load generator at, so:

- API testing, IDOR probing and rate-limit checks are **out of scope**
- load and performance testing is **out of scope**

If an interviewer supplies the API separately, they will tell you its base URL and
extend the brief. Otherwise treat §10 and §11.1–11.3 as untestable and say so —
correctly identifying that a requirement cannot be verified with the environment you
were given is itself a finding worth reporting.

Everything else in the specification, including §11.4–11.13 (security and
accessibility in the web app), is in scope.

---

## Submission

Send these four files:

| File | Task |
|---|---|
| `bug-reports.md` | 1 |
| `test-cases.csv` | 2 |
| `automation/` (tests + config, no `node_modules`) | 3 |
| `release-recommendation.md` | 4 |

Zip them, or share a private git repository link. Then expect a 30-minute
walkthrough where you will be asked to explain a report, extend a test while we
watch, and justify a severity rating.
