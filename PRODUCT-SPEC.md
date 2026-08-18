# ShopLite v1.0 - Product Specification (SRS)

**Status:** approved for release testing · **Audience:** QA · **Version:** 1.0

This is the only source of truth for how ShopLite is *supposed* to behave. When
the application disagrees with this document, the application is wrong — report it.
If something is genuinely not covered here, say so in your report and state the
assumption you tested against; "the spec is silent" is a legitimate finding.

Currency is Bangladeshi Taka. All money is displayed as `৳` followed by the amount
with thousands separators and exactly two decimal places (`৳5,499.00`), everywhere
in the product, on every page.

---

## 1. Environment and accounts

| Item | Value |
|---|---|
| Web app | `http://127.0.0.1:5173` (start with `node tools/static-server.js`) |
| Mock API | `http://127.0.0.1:4000` — **not included in this release**, see §10 |
| Customer account | `qa@shoplite.test` / `Passw0rd!23` |
| Admin account | `admin@shoplite.test` / `Admin@2024` (API only) |
| Supported browsers | Chrome, Edge, Firefox — current versions |
| Supported viewports | 360×640 (mobile) up to 1920×1080 (desktop) |

---

## 2. Authentication (`login.html`)

- **2.1** A user may sign in only with a registered email address and the matching
  password. Any other combination must be rejected.
- **2.2** Email is validated for shape (`local@domain.tld`) before the request is
  attempted. Email is treated **case-insensitively** and surrounding whitespace is
  trimmed, so `  QA@ShopLite.test  ` signs in successfully.
- **2.3** Both fields are mandatory. Submitting either one empty shows an inline
  error against that field and must never sign the user in.
- **2.4** After **5** consecutive failed attempts the account is locked for 15
  minutes and the form shows the remaining lock time.
- **2.5** Failed sign-in always shows the same neutral message —
  *"Email or password is incorrect."* The product must never reveal whether an
  email address is registered.
- **2.6** The password field masks its content by default. A "Show password"
  control toggles masking **both ways**, and its state is reflected for screen
  readers.
- **2.7** The form is submittable with the keyboard: `Enter` in either field
  performs the same action as clicking **Login**.
- **2.8** Passwords must never be written to the browser console, to
  `localStorage`, to `sessionStorage`, to the URL, or to any log.
- **2.9** There is exactly one way to authenticate — the credential check in 2.1.
  No override, master, break-glass or support password exists in any environment.
- **2.10** On success the user lands on the product catalogue with a session
  established.

## 3. Session, layout and navigation (all pages)

- **3.1** `products.html`, `cart.html`, `checkout.html` and `admin.html` require an
  authenticated session. An unauthenticated visit redirects to `login.html`.
- **3.2** **Logout** destroys the whole session. After logging out, navigating
  back to any protected page — including with the browser Back button — must land
  on `login.html`.
- **3.3** Every page has a unique, descriptive `<title>` ending in `- ShopLite`.
- **3.4** The header shows the signed-in user's name and a cart badge. **The badge
  always equals the total number of units in the cart** and updates immediately
  after every add, quantity change, removal and clear.
- **3.5** Layout is responsive from 360 px upward. No page may scroll
  horizontally at 360 px width.
- **3.6** The page must be free of console errors and failed network requests in
  normal use.
- **3.7** Source code, comments, and markup must not disclose internal URLs,
  credentials or unreleased features.

## 4. Product catalogue (`products.html`)

- **4.1** All 8 catalogue products are listed, each with image, name, category,
  rating, price and an action button.
- **4.2** **Search** filters on the product name, is case-insensitive, ignores
  leading and trailing whitespace, and updates as the user types.
- **4.3** Search and the **Category** filter **combine**: applying a category must
  not discard the search term, and vice versa.
- **4.4** When no product matches, the grid shows *"No products found"* — and no
  user-supplied text is rendered back into the page as markup.
- **4.5** The result count reads `Showing X of 8 products`, where **X is the number
  of products currently displayed** after filtering.
- **4.6** **Sort** options order the list correctly: price ascending/descending
  compares prices **numerically**; name A–Z is alphabetical; rating is highest first.
- **4.7** Each product image has meaningful `alt` text, and every image resolves.
- **4.8** **Add to cart** adds **exactly one unit** per click. Clicking it twice
  for the same product results in a quantity of 2, on one cart line.
- **4.9** A product with no stock shows a **disabled** "Out of stock" button that
  cannot add anything to the cart.
- **4.10** A product can never be added beyond its available stock.

## 5. Cart (`cart.html`)

- **5.1** Each cart line shows product name, **read-only** unit price, an editable
  quantity, and the line total. **Unit price is set by the server-side catalogue
  and is never editable or accepted from the client.**
- **5.2** Quantity accepts **integers from 1 to the available stock**. `0`, negative
  numbers, decimals, blanks and non-numeric input are rejected with an inline
  error, and the previous valid quantity is kept.
- **5.3** Setting a quantity to `0` is not a way to delete a line; the ✕ control is.
- **5.4** The ✕ control removes **exactly the line it belongs to**, whatever the
  current display order, and asks for no confirmation.
- **5.5** **Clear cart** is destructive and must ask for confirmation first.
  Clearing the cart also clears any applied coupon and discount.
- **5.6** An empty cart shows *"Your cart is empty"* with a link to the catalogue,
  and **Proceed to checkout** is disabled.
- **5.7** Line total = unit price × quantity. Subtotal = sum of line totals.
- **5.8** Interactive controls must be uniquely addressable: no two elements in the
  DOM may share the same `id`, and icon-only buttons carry an accessible name
  (e.g. *"Remove Echo Buds Pro"*).

## 6. Pricing, VAT, delivery and coupons

- **6.1** VAT is **7.5%**, calculated on the subtotal **after** discount.
- **6.2** Delivery is **৳120**, and free when the **post-discount** subtotal is
  ৳5,000 or more.
- **6.3** `Grand total = (subtotal − discount) + VAT + delivery`.
- **6.4** Every displayed money value is rounded to 2 decimal places. Raw floating
  point output (e.g. `3899.9700000000003`) is a defect.
- **6.5** **The grand total can never be negative and never below the delivery
  charge.** Discount is capped at the subtotal.
- **6.6** **Exactly one coupon may be applied per order.** Applying a second code,
  or the same code twice, must be rejected with *"A coupon is already applied."*

| Code | Benefit | Cap | Minimum order | Valid until |
|---|---|---|---|---|
| `SAVE10` | 10% off subtotal | ৳2,000 | none | 31 Dec 2027 |
| `WELCOME200` | ৳200 off | ৳200 | ৳3,000 | 31 Dec 2027 |
| `FEST50` | 50% off subtotal | ৳5,000 | none | **expired 31 Dec 2025** |

- **6.7** Coupon codes are matched **case-insensitively** (`save10` = `SAVE10`) and
  trimmed.
- **6.8** An expired code, an unknown code, or a code below its minimum order is
  rejected with a clear message **styled as an error**, and no discount is applied.
- **6.9** The discount applied must respect the coupon's cap.

## 7. Checkout (`checkout.html`)

- **7.1** Checkout is reachable only with at least one item in the cart.
- **7.2** Mandatory fields: full name, mobile number, street address, city.
  Each is validated on submit with an inline error naming what is wrong.
- **7.3** Mobile number must be a Bangladeshi mobile: 11 digits starting `01`.
  Letters and symbols are rejected.
- **7.4** Payment method is a **single-choice** group: selecting card deselects
  cash on delivery and vice versa. Exactly one is always selected. Choosing cash on
  delivery **hides** the card fields; they are then not required.
- **7.5** Card number must be 13–19 digits and pass the **Luhn** check.
- **7.6** Expiry must be `MM/YY`, month `01`–`12`, and the date must be **in the
  future**. A past or malformed expiry is rejected.
- **7.7** CVV must be **exactly 3 digits**. Two digits, four digits, letters and
  negative numbers are all rejected.
- **7.8** The terms checkbox must be ticked before an order can be placed.
- **7.9** **Amount payable** on checkout equals the grand total shown on the cart.
- **7.10** **Place order** is idempotent: it is disabled while the order is being
  submitted, and one user action creates exactly one order.
- **7.11** Card number and CVV must never be logged, stored, or placed in a URL.
  Only the last 4 digits may ever be persisted or displayed.

## 8. Order confirmation

- **8.1** After a successful order the user sees a confirmation with the order
  reference and the amount charged.
- **8.2** **The amount on the confirmation equals the amount payable that was shown
  before the order was placed**, and equals the amount recorded against the order.
- **8.3** The confirmation reflects a real, persisted order. It must not be
  reachable, or forgeable, by editing the URL.
- **8.4** Order references are not guessable from another user's reference.
- **8.5** A successful order empties the cart and clears any applied coupon.
- **8.6** Any user-supplied text shown back to the user — the gift message
  included — is rendered as **text, never as markup**.

## 9. Admin dashboard (`admin.html`)

- **9.1** Reachable only by an authenticated user whose role is `admin`. Every
  other visitor is redirected to `login.html`. The page must not be protected by
  obscurity alone.
- **9.2** Card numbers are shown masked (`•••• 1111`). CVV is never stored or shown.
- **9.3** No page may ever display a password.
- **9.4** **Delete** asks for confirmation and deletes exactly the order shown on
  that row, including while a filter is active.
- **9.5** The search term is rendered as text, never as markup.

## 10. API contract (`http://127.0.0.1:4000`)

> **Scope note.** The mock API these clauses describe is **not included in this
> release** — there is no service listening on port 4000. The clauses are retained
> because the numbering is cited elsewhere and because a tester should be able to
> read a contract and say what they would check. Unless an interviewer supplies the
> API separately, treat §10 as **untestable in this environment** and state that in
> your report rather than inventing results for it.

- **10.1** `GET /api/health` → `200 {"status":"ok"}`.
- **10.2** HTTP status codes carry meaning: `200` success, `400` invalid input,
  `401` missing/invalid credentials, `403` authenticated but not permitted,
  `404` unknown resource, `429` rate limited. **A failure must never return `200`.**
- **10.3** `POST /api/login` requires a non-empty email and password. Invalid
  credentials return `401` with a neutral message that does not reveal whether the
  account exists. A success response **never contains the password**.
- **10.4** Tokens must be unguessable and tamper-evident. A client must not be able
  to construct or alter a token to change who it represents or what role it has.
- **10.5** `GET /api/products` accepts `q` and `limit`. `limit` must be a positive
  integer within a documented maximum; anything else returns `400`. No input may
  reach the response as markup.
- **10.6** `GET /api/orders/:id` returns an order **only to the user who owns it**;
  otherwise `403`. `GET /api/orders` returns only the caller's orders.
- **10.7** `GET /api/admin/*` requires the `admin` role. It must never return
  passwords.
- **10.8** `POST /api/cart` takes `productId` and `qty` only. **Price is resolved
  server-side from the catalogue**; a client-supplied price is ignored. `qty` must
  be a positive integer within stock.
- **10.9** Error responses carry a safe message. Stack traces, file paths, and
  runtime versions must never be exposed.
- **10.10** `POST /api/login` is rate limited to 10 attempts per minute per IP.
- **10.11** `Access-Control-Allow-Origin` is restricted to known origins; it is
  never `*` in combination with credentials.

## 11. Non-functional requirements

**Performance (NFR-P)** — targets for the API described in §10, and therefore
**untestable in this release** for the same reason.
- **11.1** Under **50 concurrent users** for 60 seconds against the API:
  p95 latency < **800 ms**, p99 < **1,500 ms**, error rate < **1%**.
- **11.2** No endpoint's p95 exceeds 2× its single-user latency at 20 concurrent users.
- **11.3** Throughput must not collapse as concurrency rises — it may plateau, but
  latency growth must stay proportional and no request may be dropped.

**Security (NFR-S)**
- **11.4** No authentication bypass of any kind.
- **11.5** No user-supplied value is ever rendered as markup or executed (XSS).
- **11.6** No object is reachable by guessing its identifier (IDOR).
- **11.7** No secret — password, full card number, CVV, token — is exposed in the
  UI, the console, storage, a URL, or an API response.
- **11.8** Prices, discounts and totals are authoritative on the server; a client
  cannot alter what it will be charged.

**Accessibility (NFR-A) — WCAG 2.1 AA**
- **11.9** Every input has a programmatically associated `<label>`. A placeholder
  is not a label.
- **11.10** Keyboard focus is always visible, and tab order follows visual order.
- **11.11** Text contrast is at least 4.5:1 against its background (3:1 for large text).
- **11.12** Every image has appropriate `alt` text; icon-only controls have an
  accessible name.
- **11.13** The entire purchase journey is completable with the keyboard alone.

---

*End of specification. Anything the product does that this document does not
permit is a defect, regardless of whether it looks intentional in the code.*
