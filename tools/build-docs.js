/* ---------------------------------------------------------------------
   Builds the documentation pages in docs/ from the Markdown sources at the
   repository root. Zero dependencies.

   tools/build-site.js then assembles docs/ and app/ into _site/, which is
   what Netlify publishes.

       node tools/build-docs.js              write docs/*.html
       node tools/build-docs.js --check      verify docs/ matches the sources

   The Markdown files are the single source of truth. docs/*.html is
   generated output and is committed so that GitHub Pages can serve it —
   never hand-edit it, edit the .md and rebuild.

   Only the Markdown subset these two documents actually use is supported:
   ATX headings, paragraphs, ul/ol lists with indented continuation lines,
   pipe tables, fenced code, blockquotes, thematic breaks, and inline
   code / bold / italic / links.
   --------------------------------------------------------------------- */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'docs');

const PAGES = [
  {
    src: 'CANDIDATE-BRIEF.md',
    out: 'candidate-brief.html',
    title: 'Candidate Brief',
    nav: 'Candidate Brief',
    blurb: 'The question paper — what to test, what to deliver, how it is judged.',
    toc: false
  },
  {
    src: 'PRODUCT-SPEC.md',
    out: 'product-spec.html',
    title: 'Product Specification',
    nav: 'Product Spec',
    blurb: 'The oracle — numbered clauses describing how ShopLite is supposed to behave.',
    toc: true
  }
];

/* ---------- inline ---------- */

// Placeholder delimiter for extracted code spans; cannot occur in the sources.
const NUL = '\u0000';

function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function inline(text) {
  // Code spans are extracted first so their contents are never treated as markup.
  const spans = [];
  let s = text.replace(/`([^`]+)`/g, (_, code) => {
    spans.push('<code>' + escapeHtml(code) + '</code>');
    return NUL + (spans.length - 1) + NUL;
  });

  s = escapeHtml(s);
  // <https://example.com> — GitHub linkifies these, so the site must too.
  s = s.replace(/&lt;(https?:\/\/[^\s&]+)&gt;/g, '<a href="$1">$1</a>');
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2">$1</a>');
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/(^|[\s(])\*([^*]+)\*/g, '$1<em>$2</em>');

  return s.replace(/\u0000(\d+)\u0000/g, (_, i) => spans[Number(i)]);
}

function slug(text) {
  return text
    .replace(/`/g, '')
    .replace(/\*\*/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9ঀ-৿]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/* ---------- blocks ---------- */

const RE_HEADING = /^(#{1,6})\s+(.*)$/;
const RE_BULLET = /^\s*[-*]\s+(.*)$/;
const RE_ORDERED = /^\s*(\d+)\.\s+(.*)$/;
const RE_FENCE = /^\s*```(.*)$/;
const RE_RULE = /^(---+|\*\*\*+)\s*$/;
const RE_TABLE_SEP = /^\s*\|[\s:|-]+\|\s*$/;

function isBlank(line) {
  return line.trim() === '';
}

function fence(lines, i, out) {
  const info = lines[i].match(RE_FENCE)[1].trim();
  const body = [];
  let j = i + 1;
  while (j < lines.length && !RE_FENCE.test(lines[j])) {
    body.push(lines[j]);
    j++;
  }
  const cls = info ? ' class="lang-' + slug(info) + '"' : '';
  out.push('<pre' + cls + '><code>' + escapeHtml(body.join('\n')) + '</code></pre>');
  return j + 1; // skip the closing fence
}

function table(lines, i, out) {
  const rows = [];
  let j = i;
  while (j < lines.length && /^\s*\|/.test(lines[j])) {
    rows.push(lines[j]);
    j++;
  }
  const cells = row =>
    row.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => c.trim());

  const head = cells(rows[0]);
  const body = rows.slice(2).map(cells);

  out.push('<div class="table-scroll"><table>');
  out.push('<thead><tr>' + head.map(c => '<th>' + inline(c) + '</th>').join('') + '</tr></thead>');
  out.push('<tbody>');
  for (const row of body) {
    out.push('<tr>' + row.map(c => '<td>' + inline(c) + '</td>').join('') + '</tr>');
  }
  out.push('</tbody></table></div>');
  return j;
}

// Collects an item's first line plus any indented continuation lines, and any
// fenced block nested inside it. Continuation lines belong to the sentence they
// wrap, so they are joined into the surrounding text run rather than split off.
function listItem(lines, i, first) {
  const segments = [{ type: 'text', raw: [first] }];
  let j = i + 1;

  while (j < lines.length) {
    const line = lines[j];
    if (isBlank(line)) { break; }
    if (RE_BULLET.test(line) || RE_ORDERED.test(line)) { break; }
    if (!/^\s{2,}\S/.test(line)) { break; }

    if (RE_FENCE.test(line)) {
      const block = [];
      j = fence(lines, j, block);
      segments.push({ type: 'code', html: block.join('\n') });
      segments.push({ type: 'text', raw: [] });
      continue;
    }
    segments[segments.length - 1].raw.push(line.trim());
    j++;
  }

  let firstText = true;
  const html = segments.map(seg => {
    if (seg.type === 'code') { return seg.html; }
    if (!seg.raw.length) { return ''; }
    const rendered = inline(seg.raw.join(' '));
    if (firstText) { firstText = false; return rendered; }
    return '<p>' + rendered + '</p>';
  }).join('');

  return { html: '<li>' + html + '</li>', next: j };
}

function list(lines, i, out, ordered) {
  const re = ordered ? RE_ORDERED : RE_BULLET;
  const tag = ordered ? 'ol' : 'ul';
  const items = [];
  let j = i;

  while (j < lines.length) {
    if (isBlank(lines[j])) {
      // A blank line only ends the list if the next line is not another item.
      let k = j + 1;
      while (k < lines.length && isBlank(lines[k])) { k++; }
      if (k >= lines.length || !re.test(lines[k])) { break; }
      j = k;
      continue;
    }
    const m = lines[j].match(re);
    if (!m) { break; }
    const item = listItem(lines, j, ordered ? m[2] : m[1]);
    items.push(item.html);
    j = item.next;
  }

  const start = ordered ? Number(lines[i].match(RE_ORDERED)[1]) : 1;
  const attr = ordered && start !== 1 ? ' start="' + start + '"' : '';
  out.push('<' + tag + attr + '>' + items.join('') + '</' + tag + '>');
  return j;
}

function quote(lines, i, out) {
  const body = [];
  let j = i;
  while (j < lines.length && /^\s*>/.test(lines[j])) {
    body.push(lines[j].replace(/^\s*>\s?/, ''));
    j++;
  }
  out.push('<blockquote>' + render(body.join('\n')).html + '</blockquote>');
  return j;
}

function paragraph(lines, i, out) {
  const body = [];
  let j = i;
  while (j < lines.length && !isBlank(lines[j])) {
    if (RE_HEADING.test(lines[j]) || RE_RULE.test(lines[j]) || RE_FENCE.test(lines[j]) ||
        RE_BULLET.test(lines[j]) || RE_ORDERED.test(lines[j]) || /^\s*[|>]/.test(lines[j])) {
      break;
    }
    body.push(lines[j].trim());
    j++;
  }
  if (body.length) { out.push('<p>' + inline(body.join(' ')) + '</p>'); }
  return j === i ? i + 1 : j;
}

function render(md) {
  const lines = md.replace(/\r\n/g, '\n').split('\n');
  const out = [];
  const headings = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (isBlank(line)) { i++; continue; }

    if (RE_FENCE.test(line)) { i = fence(lines, i, out); continue; }
    if (RE_RULE.test(line)) { out.push('<hr>'); i++; continue; }

    const h = line.match(RE_HEADING);
    if (h) {
      const level = h[1].length;
      const raw = h[2].replace(/\s+#+\s*$/, '');
      const id = slug(raw);
      if (level === 2) { headings.push({ id: id, text: raw }); }
      out.push('<h' + level + ' id="' + id + '">' +
               '<a class="anchor" href="#' + id + '" aria-hidden="true">#</a>' +
               inline(raw) + '</h' + level + '>');
      i++;
      continue;
    }

    if (/^\s*>/.test(line)) { i = quote(lines, i, out); continue; }
    if (/^\s*\|/.test(line) && RE_TABLE_SEP.test(lines[i + 1] || '')) {
      i = table(lines, i, out);
      continue;
    }
    if (RE_ORDERED.test(line)) { i = list(lines, i, out, true); continue; }
    if (RE_BULLET.test(line)) { i = list(lines, i, out, false); continue; }

    i = paragraph(lines, i, out);
  }

  return { html: out.join('\n'), headings: headings };
}

/* ---------- page template ---------- */

function navHtml(currentOut) {
  const links = [{ out: 'index.html', nav: 'Overview' }]
    .concat(PAGES.map(p => ({ out: p.out, nav: p.nav })))
    .map(l => '<a href="' + l.out + '"' + (l.out === currentOut ? ' aria-current="page"' : '') +
              '>' + l.nav + '</a>')
    .join('\n      ');

  return '<header class="topbar">\n' +
    '  <a class="wordmark" href="index.html">ShopLite <span>QA Practical</span></a>\n' +
    '  <nav aria-label="Documents">\n      ' + links + '\n  </nav>\n' +
    '</header>';
}

function page(opts) {
  const toc = opts.headings && opts.headings.length >= 3
    ? '<aside class="toc" aria-label="On this page">\n' +
      '  <p class="toc-title">On this page</p>\n  <ol>\n' +
      // Plain text in the sidebar: code chips and bold make it noisy at that size.
      opts.headings.map(hd => '    <li><a href="#' + hd.id + '">' +
        escapeHtml(hd.text.replace(/[`*]/g, '')) + '</a></li>').join('\n') +
      '\n  </ol>\n</aside>'
    : '';

  return [
    '<!DOCTYPE html>',
    '<html lang="en">',
    '<head>',
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    '<title>' + escapeHtml(opts.title) + ' - ShopLite QA Practical</title>',
    '<meta name="description" content="' + escapeHtml(opts.blurb || '') + '">',
    '<link rel="stylesheet" href="assets/docs.css">',
    '</head>',
    '<body>',
    '<a class="skip" href="#main">Skip to content</a>',
    navHtml(opts.out),
    '<div class="shell' + (toc ? ' has-toc' : '') + '">',
    toc,
    '<main id="main" class="prose">',
    opts.body,
    '</main>',
    '</div>',
    '<footer class="foot">',
    '<p>ShopLite v1.0 &middot; deliberately defective by design &middot; ' +
      '<a href="https://github.com/ummeadiba/ShopLite">source on GitHub</a></p>',
    '</footer>',
    '</body>',
    '</html>',
    ''
  ].join('\n');
}

function indexPage() {
  const cards = PAGES.map(p =>
    '  <a class="card" href="' + p.out + '">\n' +
    '    <h2>' + escapeHtml(p.title) + '</h2>\n' +
    '    <p>' + escapeHtml(p.blurb) + '</p>\n' +
    '    <span class="go">Read it &rarr;</span>\n' +
    '  </a>'
  ).join('\n');

  const body = [
    '<h1>ShopLite QA Practical</h1>',
    '<p class="lede">A hiring practical for fresher Software QA Engineers. The app under',
    'test is a small e-commerce store seeded with deliberate defects; the specification',
    'is the oracle candidates test against.</p>',
    '<p class="actions">',
    '  <a class="btn" href="app/login.html">Open the app &rarr;</a>',
    '  <span class="btn-note">Sign in as <code>qa@shoplite.test</code> /',
    '  <code>Passw0rd!23</code></span>',
    '</p>',
    '<div class="cards">',
    cards,
    '</div>',
    '<div class="notice">',
    '<strong>The defects are the point.</strong> Every bug in the app is planted on',
    'purpose &mdash; missing auth guards, XSS sinks, broken totals, logged passwords.',
    'The store is fictional and the credentials above are test data. Use a throwaway',
    'password: the app stores what you type in plain text. Do not copy its patterns',
    'into anything real.',
    '</div>',
    '<h2 id="run-it">The local half</h2>',
    '<p>The hosted app covers tasks 1 to 3. The mock REST API and the load generator',
    'run on your own machine &mdash; that is deliberate, so that one candidate&rsquo;s',
    'load test cannot distort another&rsquo;s numbers. Node.js 18+, then:</p>',
    '<pre><code>git clone https://github.com/ummeadiba/ShopLite.git',
    'cd ShopLite',
    'node mock-api/server.js                                   # API on :4000',
    'node load-test/run-load.js --path /api/report --vus 20</code></pre>',
    '<p><code>node tools/static-server.js</code> also serves the web app offline at',
    '<code>http://127.0.0.1:5173/login.html</code>, if you would rather not use the',
    'hosted copy.</p>'
  ].join('\n');

  return page({ title: 'Overview', out: 'index.html', body: body, headings: [], blurb: 'A hiring practical for fresher Software QA Engineers.' });
}

/* ---------- build ---------- */

const REPO_BLOB = 'https://github.com/ummeadiba/ShopLite/blob/main/';

// Links in the Markdown are written repo-relative so they work when the files are
// read on github.com. On the published site only docs/ and app/ exist, so:
//   PRODUCT-SPEC.md      -> the generated page
//   load-test/README.md  -> the file on github.com
function crossLinks(html) {
  let out = html;
  const onSite = new Set(['index.html'].concat(PAGES.map(p => p.out)));

  for (const p of PAGES) {
    out = out.split('href="' + p.src + '"').join('href="' + p.out + '"');
  }

  return out.replace(/href="(?!https?:|#|mailto:|app\/)([^"]+)"/g, function (whole, href) {
    return onSite.has(href) ? whole : 'href="' + REPO_BLOB + href + '"';
  });
}

function build() {
  const files = {};

  for (const p of PAGES) {
    const md = fs.readFileSync(path.join(ROOT, p.src), 'utf8');
    const r = render(md);
    files[p.out] = page({
      title: p.title,
      out: p.out,
      body: crossLinks(r.html),
      headings: p.toc ? r.headings : [],
      blurb: p.blurb
    });
  }
  files['index.html'] = indexPage();

  return files;
}

function main() {
  const check = process.argv.includes('--check');
  const files = build();
  const stale = [];

  fs.mkdirSync(path.join(OUT, 'assets'), { recursive: true });

  for (const name of Object.keys(files)) {
    const target = path.join(OUT, name);
    const current = fs.existsSync(target) ? fs.readFileSync(target, 'utf8') : null;

    // Compare newline-insensitively: with core.autocrlf=true these files check
    // out as CRLF on Windows, which is not drift and must not fail --check.
    if (current !== null && current.replace(/\r\n/g, '\n') === files[name]) {
      if (!check) { console.log('  unchanged  docs/' + name); }
      continue;
    }
    if (check) { stale.push('docs/' + name); continue; }

    fs.writeFileSync(target, files[name]);
    console.log((current === null ? '  created    ' : '  updated    ') + 'docs/' + name);
  }

  if (check) {
    if (stale.length) {
      console.error('docs/ is out of date with the Markdown sources:');
      stale.forEach(f => console.error('  ' + f));
      console.error('Run: node tools/build-docs.js');
      process.exit(1);
    }
    console.log('docs/ is up to date with the Markdown sources.');
    return;
  }
  console.log('Done. Open docs/index.html, or serve docs/ over http.');
}

main();
