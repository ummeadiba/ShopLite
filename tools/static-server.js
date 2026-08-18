/* ---------------------------------------------------------------------
   Static file server for the ShopLite demo app. Zero dependencies.
       node tools/static-server.js       -> http://127.0.0.1:5173/login.html
   Serving over http:// (not file://) matters: localStorage, relative
   links and Playwright's baseURL all behave the way a real site does.
   --------------------------------------------------------------------- */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = Number(process.env.PORT || 5173);
const HOST = '127.0.0.1';
const ROOT = path.join(__dirname, '..', 'app');

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

http.createServer((req, res) => {
  let rel = decodeURIComponent(req.url.split('?')[0]);
  if (rel === '/' || rel === '') { rel = '/login.html'; }

  const full = path.join(ROOT, path.normalize(rel).replace(/^([/\\])+/, ''));

  if (!full.startsWith(ROOT)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    return res.end('Forbidden');
  }

  fs.readFile(full, (err, buf) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('404 Not Found: ' + rel);
    }
    res.writeHead(200, {
      'Content-Type': TYPES[path.extname(full).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-store'
    });
    res.end(buf);
  });
}).listen(PORT, HOST, () => {
  console.log('ShopLite app serving from ' + ROOT);
  console.log('Open http://' + HOST + ':' + PORT + '/login.html');
});
