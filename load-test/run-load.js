/* ---------------------------------------------------------------------
   Dependency-free load generator with percentiles.

     node load-test/run-load.js --path /api/health --vus 20 --seconds 15

   Options
     --path      request path, default /api/health
     --vus       concurrent virtual users, default 10
     --seconds   duration, default 15
     --host      default 127.0.0.1
     --port      default 4000
     --method    GET (default) or POST
     --body      JSON string sent with POST
     --warmup    requests to discard before measuring, default 10

   It reports throughput, error rate and p50/p90/p95/p99 so the results can
   be compared against PRODUCT-SPEC.md §11.1-11.3.
   --------------------------------------------------------------------- */

const http = require('http');

/* ---------- arguments ---------- */

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--')) {
      const key = argv[i].slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith('--')) { out[key] = 'true'; }
      else { out[key] = next; i++; }
    }
  }
  return out;
}

// Git Bash (MSYS) rewrites a leading /api/... into a Windows path before node
// ever sees it, e.g. C:/Program Files/Git/api/health. Undo that.
function fixPath(p) {
  if (p.startsWith('/') && !p.startsWith('//')) { return p; }
  const match = p.replace(/\\/g, '/').match(/\/(api\/.*)$/);
  if (match) {
    console.log('note: shell rewrote the path, using /' + match[1]);
    return '/' + match[1];
  }
  return p.startsWith('/') ? p : '/' + p;
}

const args = parseArgs(process.argv.slice(2));

const CONFIG = {
  path: fixPath(args.path || '/api/health'),
  vus: Number(args.vus || 10),
  seconds: Number(args.seconds || 15),
  host: args.host || '127.0.0.1',
  port: Number(args.port || 4000),
  method: (args.method || 'GET').toUpperCase(),
  body: args.body || null,
  warmup: Number(args.warmup || 10)
};

if (!Number.isInteger(CONFIG.vus) || CONFIG.vus < 1) {
  console.error('--vus must be a positive integer');
  process.exit(1);
}
if (!(CONFIG.seconds > 0)) {
  console.error('--seconds must be greater than zero');
  process.exit(1);
}

/* ---------- measurement ---------- */

const agent = new http.Agent({ keepAlive: true, maxSockets: CONFIG.vus + 4 });

const samples = [];
const statuses = {};
let errors = 0;
let inWarmup = true;

function record(ms, status) {
  if (inWarmup) { return; }
  samples.push(ms);
  statuses[status] = (statuses[status] || 0) + 1;
  if (status === 0 || status >= 400) { errors++; }
}

function once() {
  return new Promise(function (resolve) {
    const started = process.hrtime.bigint();

    const req = http.request({
      host: CONFIG.host,
      port: CONFIG.port,
      path: CONFIG.path,
      method: CONFIG.method,
      agent: agent,
      headers: CONFIG.body
        ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(CONFIG.body) }
        : {}
    }, function (res) {
      res.on('data', function () { /* drain */ });
      res.on('end', function () {
        const ms = Number(process.hrtime.bigint() - started) / 1e6;
        record(ms, res.statusCode);
        resolve();
      });
    });

    req.on('error', function () {
      const ms = Number(process.hrtime.bigint() - started) / 1e6;
      record(ms, 0);
      resolve();
    });

    if (CONFIG.body) { req.write(CONFIG.body); }
    req.end();
  });
}

function percentile(sorted, p) {
  if (!sorted.length) { return 0; }
  const rank = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.min(Math.max(rank, 0), sorted.length - 1)];
}

function fmt(ms) { return ms.toFixed(1).padStart(8) + ' ms'; }

/* ---------- run ---------- */

async function main() {
  console.log('ShopLite load test');
  console.log('  target      ' + CONFIG.method + ' http://' + CONFIG.host + ':' + CONFIG.port + CONFIG.path);
  console.log('  virtual users ' + CONFIG.vus);
  console.log('  duration      ' + CONFIG.seconds + 's');
  console.log('');

  // A single request first, so a wrong port fails immediately rather than
  // producing a run made entirely of connection errors.
  await once();
  if (!samples.length && !statuses[0]) { /* still in warmup, nothing recorded */ }

  for (let i = 0; i < CONFIG.warmup; i++) { await once(); }
  inWarmup = false;

  const deadline = Date.now() + CONFIG.seconds * 1000;
  const started = Date.now();

  async function worker() {
    while (Date.now() < deadline) { await once(); }
  }

  const workers = [];
  for (let i = 0; i < CONFIG.vus; i++) { workers.push(worker()); }

  const ticker = setInterval(function () {
    const left = Math.max(0, Math.round((deadline - Date.now()) / 1000));
    process.stdout.write('  ' + samples.length + ' requests, ' + left + 's left\r');
  }, 1000);

  await Promise.all(workers);
  clearInterval(ticker);

  const elapsed = (Date.now() - started) / 1000;
  const sorted = samples.slice().sort(function (a, b) { return a - b; });
  const total = samples.reduce(function (s, v) { return s + v; }, 0);

  console.log('  ' + samples.length + ' requests in ' + elapsed.toFixed(1) + 's');
  console.log('');
  console.log('  requests      ' + samples.length);
  console.log('  throughput    ' + (samples.length / elapsed).toFixed(1) + ' req/s');
  console.log('  errors        ' + errors + '  (' +
              (samples.length ? (errors / samples.length * 100).toFixed(2) : '0.00') + '%)');
  console.log('');
  console.log('  min         ' + fmt(sorted[0] || 0));
  console.log('  p50         ' + fmt(percentile(sorted, 50)));
  console.log('  p90         ' + fmt(percentile(sorted, 90)));
  console.log('  p95         ' + fmt(percentile(sorted, 95)));
  console.log('  p99         ' + fmt(percentile(sorted, 99)));
  console.log('  max         ' + fmt(sorted[sorted.length - 1] || 0));
  console.log('  mean        ' + fmt(samples.length ? total / samples.length : 0));
  console.log('');
  console.log('  status codes  ' + JSON.stringify(statuses));

  if (statuses[0]) {
    console.log('');
    console.log('  ' + statuses[0] + ' connection errors — is the API running on port ' +
                CONFIG.port + '?');
  }

  agent.destroy();
}

main();
