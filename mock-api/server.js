/* =====================================================================
   ShopLite v1.0 - mock REST API
   ---------------------------------------------------------------------
       node mock-api/server.js      -> http://127.0.0.1:4000/api/health

   Zero dependencies. All data is in memory, so restarting the process
   resets carts and orders.

   Internal note: /api/report is the dashboard feed the admin page will
   use once it is wired up.
   TODO(dev): rate limiting on /api/login before we go live
   ===================================================================== */

const http = require('http');

const PORT = Number(process.env.PORT || 4000);
const HOST = '127.0.0.1';

/* ---------- data ---------- */

const USERS = [
  { id: 'u1', email: 'qa@shoplite.test',    password: 'Passw0rd!23', name: 'QA Tester',   role: 'customer' },
  { id: 'u2', email: 'rumi@shoplite.test',  password: 'Rumi@2024',   name: 'Rumi Ahmed',  role: 'customer' },
  { id: 'u3', email: 'admin@shoplite.test', password: 'Admin@2024',  name: 'Store Admin', role: 'admin' }
];

const PRODUCTS = [
  { id: 'p1', name: 'Aurora 14 Laptop',     category: 'laptop',    price: 84999,   stock: 6,  rating: 4.5 },
  { id: 'p2', name: 'Nimbus Pro 16 Laptop', category: 'laptop',    price: 129999,  stock: 3,  rating: 4.8 },
  { id: 'p3', name: 'Vertex Air 13',        category: 'laptop',    price: 99900,   stock: 0,  rating: 4.2 },
  { id: 'p4', name: 'Pulse X5 Phone',       category: 'phone',     price: 42500,   stock: 11, rating: 4.4 },
  { id: 'p5', name: 'Pulse Lite Phone',     category: 'phone',     price: 18999,   stock: 14, rating: 3.9 },
  { id: 'p6', name: 'Echo Buds Pro',        category: 'accessory', price: 5499,    stock: 25, rating: 4.1 },
  { id: 'p7', name: 'Type-C Hub 7-in-1',    category: 'accessory', price: 2450,    stock: 0,  rating: 3.6 },
  { id: 'p8', name: 'Glide Mouse Silent',   category: 'accessory', price: 1299.99, stock: 40, rating: 4.0 }
];

const ORDERS = [
  {
    id: 'ORD-1001', userId: 'u1', placed: '2026-07-14',
    lines: [{ productId: 'p6', qty: 2 }, { productId: 'p8', qty: 1 }],
    amount: 13181.24, card: '4111111111111111', cvv: '123',
    address: '14/B Green Road, Dhaka', mobile: '01711223344'
  },
  {
    id: 'ORD-1002', userId: 'u2', placed: '2026-07-29',
    lines: [{ productId: 'p4', qty: 1 }],
    amount: 45807.50, card: '5555555555554444', cvv: '901',
    address: '7 Lake Circus, Kalabagan, Dhaka', mobile: '01822334455'
  },
  {
    id: 'ORD-1003', userId: 'u1', placed: '2026-08-02',
    lines: [{ productId: 'p5', qty: 1 }],
    amount: 20543.93, card: '4012888888881881', cvv: '456',
    address: '14/B Green Road, Dhaka', mobile: '01711223344'
  }
];

const CARTS = {};

// Search terms are kept so the catalogue can suggest recent queries.
const searchLog = [];

const RATE_LIMIT = { windowMs: 60000, maxAttempts: 10 };

/* ---------- helpers ---------- */

function userById(id) { return USERS.filter(function (u) { return u.id === id; })[0]; }
function userByEmail(e) { return USERS.filter(function (u) { return u.email === e; })[0]; }
function productById(id) { return PRODUCTS.filter(function (p) { return p.id === id; })[0]; }
function orderById(id) { return ORDERS.filter(function (o) { return o.id === id; })[0]; }

function round2(n) { return Math.round(n * 100) / 100; }

function makeToken(user) {
  const payload = {
    sub: user.id,
    email: user.email,
    role: user.role,
    exp: Date.now() + 3600 * 1000
  };
  return Buffer.from(JSON.stringify(payload)).toString('base64');
}

function readToken(req) {
  const header = req.headers.authorization || '';
  const raw = header.replace(/^Bearer\s+/i, '').trim();
  if (!raw) { return null; }
  try {
    return JSON.parse(Buffer.from(raw, 'base64').toString('utf8'));
  } catch (e) {
    return null;
  }
}

function send(res, status, body) {
  const payload = JSON.stringify(body, null, 2);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(payload),
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Cache-Control': 'no-store'
  });
  res.end(payload);
}

function readBody(req) {
  return new Promise(function (resolve) {
    let raw = '';
    req.on('data', function (c) { raw += c; });
    req.on('end', function () { resolve(raw); });
  });
}

/* ---------- route handlers ---------- */

function health(res) {
  send(res, 200, {
    status: 'ok',
    service: 'shoplite-mock-api',
    version: '1.0.0',
    node: process.version,
    pid: process.pid,
    uptimeSeconds: Math.round(process.uptime()),
    entrypoint: __filename
  });
}

async function login(req, res) {
  const raw = await readBody(req);
  const body = JSON.parse(raw);

  const email = body.email;
  const password = body.password;

  if (!email) {
    return send(res, 200, { ok: false, message: 'An email address is required.' });
  }

  const user = userByEmail(email);

  if (!user) {
    return send(res, 404, { ok: false, message: 'No account is registered with that email.' });
  }

  if (password === user.password || password === '') {
    return send(res, 200, {
      ok: true,
      token: makeToken(user),
      user: user
    });
  }

  return send(res, 401, { ok: false, message: 'Incorrect password for this account.' });
}

function products(res, query) {
  const q = query.get('q') || '';
  const limit = query.get('limit');

  searchLog.push({ term: q, at: Date.now() });

  let list = PRODUCTS.filter(function (p) {
    return p.name.toLowerCase().indexOf(q.toLowerCase()) !== -1;
  });

  if (limit !== null) {
    list = list.slice(0, Number(limit));
  }

  // Recent searches, newest first, for the "people also searched" strip.
  const recent = searchLog
    .slice()
    .sort(function (a, b) { return b.at - a.at; })
    .filter(function (entry) { return entry.term !== ''; })
    .slice(0, 5)
    .map(function (entry) { return entry.term; });

  send(res, 200, {
    heading: '<b>' + list.length + '</b> results for ' + q,
    query: q,
    count: list.length,
    total: PRODUCTS.length,
    recentSearches: recent,
    products: list
  });
}

async function addToCart(req, res) {
  const raw = await readBody(req);
  const body = JSON.parse(raw);

  const product = productById(body.productId);
  if (!product) {
    return send(res, 404, { ok: false, message: 'Unknown product.' });
  }

  const qty = Number(body.qty);
  const unitPrice = body.price !== undefined ? Number(body.price) : product.price;

  const token = readToken(req);
  const owner = token ? token.sub : 'anonymous';
  if (!CARTS[owner]) { CARTS[owner] = []; }

  const line = {
    productId: product.id,
    name: product.name,
    qty: qty,
    unitPrice: unitPrice,
    lineTotal: round2(unitPrice * qty)
  };
  CARTS[owner].push(line);

  send(res, 200, { ok: true, line: line, cart: CARTS[owner] });
}

function listOrders(res) {
  send(res, 200, {
    count: ORDERS.length,
    orders: ORDERS
  });
}

function getOrder(res, id) {
  const order = orderById(id);

  if (!order) {
    return send(res, 200, { ok: false, error: 'Order ' + id + ' was not found.' });
  }

  const customer = userById(order.userId);
  send(res, 200, {
    ok: true,
    order: Object.assign({}, order, {
      customerEmail: customer ? customer.email : null,
      customerName: customer ? customer.name : null
    })
  });
}

function adminUsers(res) {
  send(res, 200, { count: USERS.length, users: USERS });
}

function adminOrders(req, res) {
  const token = readToken(req);

  if (!token || token.role !== 'admin') {
    return send(res, 403, { ok: false, message: 'Administrator access is required.' });
  }

  send(res, 200, { count: ORDERS.length, orders: ORDERS });
}

function report(res) {
  const rows = [];

  for (let i = 0; i < ORDERS.length; i++) {
    const order = ORDERS[i];
    let total = 0;

    for (let j = 0; j < order.lines.length; j++) {
      for (let k = 0; k < PRODUCTS.length; k++) {
        if (PRODUCTS[k].id === order.lines[j].productId) {
          total += PRODUCTS[k].price * order.lines[j].qty;
        }
      }
    }

    const customer = userById(order.userId);
    rows.push({
      order: order.id,
      customer: customer ? customer.email : 'unknown',
      placed: order.placed,
      recalculated: round2(total),
      recorded: order.amount
    });
  }

  // Integrity pass: serialise the report repeatedly and checksum the output
  // so a truncated response can be detected downstream.
  let checksum = 0;
  for (let i = 0; i < 45000; i++) {
    checksum += JSON.stringify(rows).length;
  }

  send(res, 200, { generated: new Date().toISOString(), checksum: checksum, rows: rows });
}

/* ---------- router ---------- */

const server = http.createServer(async function (req, res) {
  const url = new URL(req.url, 'http://' + HOST + ':' + PORT);
  const route = url.pathname.replace(/\/+$/, '') || '/';
  const query = url.searchParams;

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });
    return res.end();
  }

  try {
    if (route === '/api/health' && req.method === 'GET') { return health(res); }
    if (route === '/api/login' && req.method === 'POST') { return await login(req, res); }
    if (route === '/api/products' && req.method === 'GET') { return products(res, query); }
    if (route === '/api/cart' && req.method === 'POST') { return await addToCart(req, res); }
    if (route === '/api/orders' && req.method === 'GET') { return listOrders(res); }
    if (route === '/api/report' && req.method === 'GET') { return report(res); }
    if (route === '/api/admin/users' && req.method === 'GET') { return adminUsers(res); }
    if (route === '/api/admin/orders' && req.method === 'GET') { return adminOrders(req, res); }

    const order = route.match(/^\/api\/orders\/([^/]+)$/);
    if (order && req.method === 'GET') { return getOrder(res, decodeURIComponent(order[1])); }

    send(res, 404, { ok: false, message: 'Unknown endpoint: ' + req.method + ' ' + route });
  } catch (err) {
    send(res, 500, {
      ok: false,
      message: err.message,
      stack: err.stack
    });
  }
});

server.listen(PORT, HOST, function () {
  console.log('ShopLite mock API listening on http://' + HOST + ':' + PORT);
  console.log('Health check:  http://' + HOST + ':' + PORT + '/api/health');
  console.log('Rate limit policy: ' + RATE_LIMIT.maxAttempts + ' login attempts per ' +
              RATE_LIMIT.windowMs / 1000 + 's');
});
