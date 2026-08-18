# Load and performance testing

`run-load.js` is a dependency-free load generator. It drives a fixed number of
concurrent virtual users at one endpoint for a set duration and reports throughput,
error rate and latency percentiles.

Start the API first:

```powershell
node mock-api/server.js
```

Then, in a second terminal:

```powershell
node load-test/run-load.js --path /api/health --vus 20 --seconds 15
```

## Options

| Option | Default | Meaning |
|---|---|---|
| `--path` | `/api/health` | Request path, including a query string if needed |
| `--vus` | `10` | Concurrent virtual users |
| `--seconds` | `15` | Measurement duration |
| `--host` | `127.0.0.1` | Target host |
| `--port` | `4000` | Target port |
| `--method` | `GET` | `GET` or `POST` |
| `--body` | none | JSON string sent with `POST` |
| `--warmup` | `10` | Requests discarded before measuring |

Example against a POST endpoint:

```powershell
node load-test/run-load.js --path /api/login --method POST `
  --body '{\"email\":\"qa@shoplite.test\",\"password\":\"Passw0rd!23\"}' --vus 20 --seconds 15
```

## Reading the output

```text
  requests      61606
  throughput    7700.8 req/s
  errors        0  (0.00%)

  p50              2.1 ms
  p95              4.5 ms
  p99              7.0 ms
```

- **Any status of 400 or above counts as an error**, as does a connection failure. When
  you are measuring the §11.1 targets, send valid input — a run of deliberate `401`s
  will read as a 100% error rate.
- Percentiles are computed from the measured requests only, after the warm-up.
- A row of connection errors almost always means the API is not running, or is running
  on a different port.

## What the specification asks for

`PRODUCT-SPEC.md` §11.1–11.3 state the targets:

| Clause | Requirement |
|---|---|
| 11.1 | 50 concurrent users for 60 s: p95 < 800 ms, p99 < 1,500 ms, error rate < 1% |
| 11.2 | No endpoint's p95 exceeds **2× its single-user latency** at 20 concurrent users |
| 11.3 | Throughput may plateau, but must not collapse, and no request may be dropped |

Clause 11.2 is the one that needs method rather than a single command. Measure the
endpoint at `--vus 1` first to establish its single-user latency, then again at
`--vus 20`, and compare. An endpoint that looks acceptable on its own can still fail
this comparison badly.

## Earning the marks

A run of the tool is not a performance test. What earns credit:

- **More than one endpoint.** Endpoints do not degrade uniformly; a profile that covers
  only `/api/health` proves the harness works and nothing else.
- **A single-user baseline per endpoint**, so §11.2 can actually be evaluated.
- **A stated verdict per clause** — pass or fail against the numbers, not a screenshot
  of the output.
- **An explanation of the mechanism** where you find a failure. Latency that scales
  linearly with concurrency while throughput stays flat says something specific about
  where the time goes. Say what.
- **Repeatability.** Note the machine, the number of runs, and whether the figures held
  across them. Percentiles from one 5-second run on a laptop that is also running a
  browser are not evidence.

Restarting `mock-api/server.js` resets its in-memory state. If a later functional test
behaves differently after a long load run, that observation is worth reporting rather
than working around.
