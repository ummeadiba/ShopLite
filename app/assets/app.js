/* =====================================================================
   ShopLite v1.0 - shared catalog, storage helpers and header
   ---------------------------------------------------------------------
   Internal note: admin dashboard lives at admin.html
   TODO(dev): wire up auth guard on the admin page before release
   ===================================================================== */

var SL = (function () {

  var CATALOG = [
    { id: 'p1', name: 'Aurora 14 Laptop',     category: 'laptop',    price: 84999,   stock: true,  rating: 4.5 },
    { id: 'p2', name: 'Nimbus Pro 16 Laptop', category: 'laptop',    price: 129999,  stock: true,  rating: 4.8 },
    { id: 'p3', name: 'Vertex Air 13',        category: 'laptop',    price: 99900,   stock: false, rating: 4.2, brokenImg: true },
    { id: 'p4', name: 'Pulse X5 Phone',       category: 'phone',     price: 42500,   stock: true,  rating: 4.4, noAlt: true },
    { id: 'p5', name: 'Pulse Lite Phone',     category: 'phone',     price: 18999,   stock: true,  rating: 3.9 },
    { id: 'p6', name: 'Echo Buds Pro',        category: 'accessory', price: 5499,    stock: true,  rating: 4.1, noAlt: true },
    { id: 'p7', name: 'Type-C Hub 7-in-1',    category: 'accessory', price: 2450,    stock: false, rating: 3.6 },
    { id: 'p8', name: 'Glide Mouse Silent',   category: 'accessory', price: 1299.99, stock: true,  rating: 4.0 }
  ];

  var K = {
    auth:     'sl_auth',
    user:     'sl_user',
    cart:     'sl_cart',
    discount: 'sl_discount',
    coupons:  'sl_coupons',
    orders:   'sl_orders'
  };

  var COUPONS = [
    { code: 'SAVE10',     type: 'percent', value: 10,  cap: 2000, minOrder: 0,    expires: '2027-12-31' },
    { code: 'WELCOME200', type: 'flat',    value: 200, cap: 200,  minOrder: 3000, expires: '2027-12-31' },
    { code: 'FEST50',     type: 'percent', value: 50,  cap: 5000, minOrder: 0,    expires: '2025-12-31' }
  ];

  function byId(id) {
    var hit = CATALOG.filter(function (p) { return p.id === id; });
    return hit[0];
  }

  function thumb(p) {
    if (p.brokenImg) { return 'images/vertex-air.png'; }
    var label = p.name.split(' ')[0];
    var svg = "<svg xmlns='http://www.w3.org/2000/svg' width='160' height='110'>" +
              "<rect width='160' height='110' rx='8' fill='#e3eaf2'/>" +
              "<text x='80' y='62' font-size='14' font-family='sans-serif' " +
              "text-anchor='middle' fill='#48596b'>" + label + "</text></svg>";
    return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
  }

  /* price formatting - products page */
  function money(n) { return 'BDT ' + n; }

  /* price formatting - cart / checkout */
  function money2(n) { return '৳' + Number(n).toLocaleString('en-IN'); }

  function readCart() {
    try { return JSON.parse(localStorage.getItem(K.cart)) || []; }
    catch (e) { return []; }
  }

  function writeCart(c) { localStorage.setItem(K.cart, JSON.stringify(c)); }

  function cartUnits() {
    return readCart().reduce(function (s, l) { return s + Number(l.qty || 0); }, 0);
  }

  function subtotal() {
    return readCart().reduce(function (s, l) { return s + Number(l.price) * Number(l.qty); }, 0);
  }

  function discount() { return Number(localStorage.getItem(K.discount) || 0); }

  /* ---------- coupons ---------- */

  function appliedCoupons() {
    try { return JSON.parse(localStorage.getItem(K.coupons)) || []; }
    catch (e) { return []; }
  }

  function couponByCode(code) {
    var hit = COUPONS.filter(function (c) { return c.code === code; });
    return hit[0];
  }

  function applyCoupon(code) {
    var c = couponByCode(code);
    if (!c) { return { ok: false, message: 'Coupon code ' + code + ' is not recognised.' }; }

    var amount;
    if (c.type === 'percent') {
      amount = subtotal() * c.value / 100;
    } else {
      amount = c.value;
    }

    localStorage.setItem(K.discount, discount() + amount);

    var list = appliedCoupons();
    list.push(c.code);
    localStorage.setItem(K.coupons, JSON.stringify(list));

    return { ok: true, message: 'Coupon ' + c.code + ' applied. You saved ' + money2(amount) + '.' };
  }

  /* ---------- money maths ---------- */

  function vat() { return subtotal() * 0.075; }

  function shipping() { return subtotal() >= 5000 ? 0 : 120; }

  function grandTotal() { return subtotal() - discount() + vat() + shipping(); }

  /* ---------- orders ---------- */

  function readOrders() {
    try { return JSON.parse(localStorage.getItem(K.orders)) || []; }
    catch (e) { return []; }
  }

  function writeOrders(o) { localStorage.setItem(K.orders, JSON.stringify(o)); }

  function nextOrderId() { return 'ORD-' + (1001 + readOrders().length); }

  /* ---------- session ---------- */

  function requireAuth() {
    if (!localStorage.getItem(K.auth)) { location.href = 'login.html'; }
  }

  function currentUser() { return localStorage.getItem(K.user); }

  function logout() {
    localStorage.removeItem(K.user);
    location.href = 'login.html';
  }

  function updateBadge() {
    var b = document.getElementById('badge');
    if (b) { b.textContent = cartUnits(); }
  }

  function renderHeader(active) {
    var host = document.getElementById('hdr');
    if (!host) { return; }
    var who = currentUser() ? currentUser().split('@')[0] : 'Guest';
    host.innerHTML =
      '<div class="brand">ShopLite</div>' +
      '<nav>' +
      '  <a href="products.html" class="' + (active === 'products' ? 'on' : '') + '">Products</a>' +
      '  <a href="cart.html" class="' + (active === 'cart' ? 'on' : '') + '">Cart (<span id="badge">0</span>)</a>' +
      '  <a href="checkout.html" class="' + (active === 'checkout' ? 'on' : '') + '">Checkout</a>' +
      '</nav>' +
      '<div class="who">Hi, ' + who +
      ' <button id="logout" class="link-btn" type="button">Logout</button></div>';
    var lo = document.getElementById('logout');
    if (lo) { lo.addEventListener('click', logout); }
    updateBadge();
  }

  return {
    CATALOG: CATALOG, COUPONS: COUPONS, K: K, byId: byId, thumb: thumb,
    money: money, money2: money2,
    readCart: readCart, writeCart: writeCart, cartUnits: cartUnits,
    subtotal: subtotal, discount: discount,
    appliedCoupons: appliedCoupons, couponByCode: couponByCode, applyCoupon: applyCoupon,
    vat: vat, shipping: shipping, grandTotal: grandTotal,
    readOrders: readOrders, writeOrders: writeOrders, nextOrderId: nextOrderId,
    requireAuth: requireAuth, currentUser: currentUser, logout: logout,
    updateBadge: updateBadge, renderHeader: renderHeader
  };
})();
