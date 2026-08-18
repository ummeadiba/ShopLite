# ShopLite QA Practical — Candidate Brief

**Role:** Software QA Engineer (fresher) · **Suggested time:** 4 hours

Welcome. You are testing **ShopLite v1.0** — a small e-commerce web app and the REST API
behind it — handed to QA as "approved for release testing". Your job is to decide whether
that claim survives contact with the product.

Six tasks: exploratory testing, test case design, automation, API testing, load testing,
and a release recommendation. Attempt all six. A thin answer to every task beats a
polished answer to three.

[`PRODUCT-SPEC.md`](PRODUCT-SPEC.md) is the source of truth for correct behaviour.
**Read it before you start testing.** Where the application disagrees with the specification, the
application is wrong — report it.

---

## Before you start

| Item | Value |
|---|---|
| App | <https://shoplite-qa.netlify.app/app/login.html> |
| API | `http://127.0.0.1:4000` — runs on your machine, see below |
| Test account | `qa@shoplite.test` / `Passw0rd!23` |
| Reset state | `localStorage.clear(); sessionStorage.clear()` in the browser console |
| Browser | Chrome, Edge or Firefox — current version, DevTools open |

Tasks 1 to 3 need only the browser. The web app is hosted, keeps its state in your own
`localStorage`, and clearing storage returns you to a clean slate.

**Use a throwaway password.** The app stores what you type in plain text and prints it
to the console; that is one of the defects. Never type a real credential into it.

### Local setup for tasks 4 and 5

The API is not hosted — it runs on your machine, which keeps your load-test numbers
yours alone. Node.js 18 or newer, then:

```powershell
git clone https://github.com/ummeadiba/ShopLite.git
cd ShopLite
node mock-api/server.js
```

Confirm it is up:

```powershell
curl.exe -s http://127.0.0.1:4000/api/health
```

Its data lives in memory, so restarting the process resets carts and orders. Leave it
running in its own terminal.

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
- **expected result** — and the clause it comes from, cited as `SPEC §5.4`
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

Point `baseURL` at `https://shoplite-qa.netlify.app/app/` — the hosted app needs no
local server. Include your config and a one-line command to execute the suite.

### 4. API testing

Test the API against [`PRODUCT-SPEC.md`](PRODUCT-SPEC.md) §10 and report your findings in
`api-findings.md`. Cite the clause, give the exact request, and show enough of the
response to prove the point.

These three are a starting point, not the task. Run them and record what comes back:

```powershell
curl.exe -s http://127.0.0.1:4000/api/health
curl.exe -s -X POST http://127.0.0.1:4000/api/login -H "Content-Type: application/json" -d "{\"email\":\"admin@shoplite.test\",\"password\":\"\"}"
curl.exe -s http://127.0.0.1:4000/api/orders/ORD-1002
```

Does anything come back that should not? Then go further. §10 has eleven clauses and
every one of them is checkable:

- **Status codes** (§10.2) — a failure must never answer `200`. Try invalid input,
  missing fields, unknown resources, and read the status, not just the body.
- **Authentication** (§10.3) — empty values, wrong values, unknown accounts. Does the
  response tell you *which* part was wrong? It should not.
- **Tokens** (§10.4) — you are given one on login. Look at it. Can you change what it
  says about you and have the API believe it?
- **Authorisation** (§10.6, §10.7) — the orders in the system do not all belong to you.
  Can you read someone else's? Can you reach an admin endpoint without being an admin?
- **Input handling** (§10.5, §10.8) — `limit` has rules; so does `qty`. What happens to
  a price you send yourself? What happens to markup you send as a search term?
- **Rate limiting** (§10.10) — the policy is stated. Is it enforced? Task 5's tool is
  one way to find out.
- **Error safety and CORS** (§10.9, §10.11) — inspect the response headers, and make
  something break on purpose.

For each finding, state the impact in one line: what could someone actually do with it.
A missing status code and a readable stranger's card number are not the same severity,
and your report should show that you know it.

### 5. Load and performance testing

Measure the API against §11.1–11.3 and write up `load-test-report.md`.

A dependency-free generator is provided:

```powershell
node load-test/run-load.js --path /api/health --vus 20 --seconds 15
```

Read [load-test/README.md](load-test/README.md) for its options and for what a good
profile looks like. In short:

- profile **more than one endpoint** — they do not degrade uniformly
- establish a **single-user baseline** for each, because §11.2 is a comparison
- give a **verdict per clause** against the stated numbers
- where something fails, explain **why** it fails, not only that it did

Report your machine and the number of runs. Percentiles from one short run on a busy
laptop are not evidence, and saying so is part of the skill.

### 6. Release recommendation

**Would you release this build?** One paragraph. Name the single defect that most
influenced your answer and explain why it — rather than the others — decided it.
A defensible "no" and a defensible "yes, with conditions" both score; an unsupported
verdict does not.

You now have UI defects, API defects and performance numbers in front of you. A good
answer weighs them against each other rather than counting them.

---

## Scope

Everything in [`PRODUCT-SPEC.md`](PRODUCT-SPEC.md) is in scope: §2–§9 against the hosted
web app, §10 and §11.1–11.3 against the local API, and §11.4–11.13 against both.

If you conclude that a clause cannot be verified with the environment you were given,
say so and explain why. Correctly identifying an untestable requirement is a finding,
not a gap.

---

## Submission

Send these six files:

| File | Task |
|---|---|
| `bug-reports.md` | 1 |
| `test-cases.csv` | 2 |
| `automation/` (tests + config, no `node_modules`) | 3 |
| `api-findings.md` | 4 |
| `load-test-report.md` | 5 |
| `release-recommendation.md` | 6 |

Zip them, or share a private git repository link. Then expect a 30-minute
walkthrough where you will be asked to explain a report, extend a test while we
watch, and justify a severity rating.
