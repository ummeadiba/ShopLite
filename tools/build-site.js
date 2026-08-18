/* ---------------------------------------------------------------------
   Assembles the deployable site into _site/. Zero dependencies.

       node tools/build-site.js

   Layout produced:
       _site/                      the docs pages, from docs/
       _site/app/login.html        the system under test, from app/
       _site/robots.txt            keeps /app/ out of search results

   The API is NOT copied here — it is deployed as a function from
   netlify/functions/. See SECURITY.md.

   app/ is never edited in the repository. The noindex tag is added to the
   published copy only.
   --------------------------------------------------------------------- */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, '_site');

const NOINDEX = '<meta name="robots" content="noindex, nofollow">';

const ROBOTS = [
  '# ShopLite is a QA training fixture, not a real store.',
  '# The app under /app/ is a deliberately defective sign-in flow and must not',
  '# appear in search results.',
  'User-agent: *',
  'Disallow: /app/',
  ''
].join('\n');

function copyDir(from, to) {
  fs.mkdirSync(to, { recursive: true });

  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const src = path.join(from, entry.name);
    const dest = path.join(to, entry.name);

    if (entry.isDirectory()) { copyDir(src, dest); }
    else { fs.copyFileSync(src, dest); }
  }
}

function injectNoindex(dir) {
  let touched = 0;

  for (const name of fs.readdirSync(dir)) {
    if (!name.endsWith('.html')) { continue; }

    const file = path.join(dir, name);
    const html = fs.readFileSync(file, 'utf8');
    if (html.includes('name="robots"')) { continue; }

    fs.writeFileSync(file, html.replace('<head>', '<head>\n' + NOINDEX));
    touched++;
  }
  return touched;
}

function assertExists(relative) {
  const target = path.join(OUT, relative);
  if (!fs.existsSync(target)) {
    console.error('missing from the assembled site: ' + relative);
    process.exit(1);
  }
}

function main() {
  fs.rmSync(OUT, { recursive: true, force: true });

  copyDir(path.join(ROOT, 'docs'), OUT);
  copyDir(path.join(ROOT, 'app'), path.join(OUT, 'app'));

  const tagged = injectNoindex(path.join(OUT, 'app'));
  fs.writeFileSync(path.join(OUT, 'robots.txt'), ROBOTS);

  for (const file of [
    'index.html', 'candidate-brief.html', 'product-spec.html',
    'assets/docs.css', 'robots.txt',
    'app/login.html', 'app/products.html', 'app/cart.html',
    'app/checkout.html', 'app/admin.html',
    'app/assets/app.js', 'app/assets/style.css'
  ]) {
    assertExists(file);
  }

  // The API holds server-side state and has no rate limiting. It ships as a
  // function, never as a published directory.
  for (const forbidden of ['mock-api', 'load-test', 'tools']) {
    if (fs.existsSync(path.join(OUT, forbidden))) {
      console.error(forbidden + '/ must not be published');
      process.exit(1);
    }
  }

  console.log('_site assembled: docs + app (' + tagged + ' pages tagged noindex) + robots.txt');
}

main();
