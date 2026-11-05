// Southampton General Hospital wayfinding app v7.8: the web server for Railway.
// It serves the files in the public folder and nothing else, and needs no packages (Node 20 or later).
// It listens on 0.0.0.0 and the port Railway gives it (PORT), or on port 3000 on a computer.
// Text files are compressed once, at start-up (brotli, or gzip for older browsers). No request is logged.
// The page and the route files are checked for changes on every visit (no-cache with an ETag), so a new
// upload is seen at once; React, ReactDOM and Babel are kept by the phone for a day.
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const crypto = require('crypto');

const PORT = Number(process.env.PORT) || 3000;
const HOST = '0.0.0.0';
const PUBLIC_DIR = path.join(__dirname, 'public');
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
};
const COMPRESS = new Set(['.html', '.js', '.json', '.css', '.svg', '.txt']);
const KEEP_A_DAY = new Set(['/react.production.min.js', '/react-dom.production.min.js', '/babel.min.js']);

// Read every file in public/ into memory once.
const files = new Map();
function load(dir, base) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name.startsWith('.')) continue;
    const full = path.join(dir, e.name);
    const url = `${base}/${e.name}`;
    if (e.isDirectory()) { load(full, url); continue; }
    if (!e.isFile()) continue;
    const ext = path.extname(e.name).toLowerCase();
    const body = fs.readFileSync(full);
    const f = {
      body,
      type: TYPES[ext] || 'application/octet-stream',
      etag: `"${crypto.createHash('md5').update(body).digest('hex').slice(0, 16)}"`,
      cache: KEEP_A_DAY.has(url) ? 'public, max-age=86400' : 'no-cache',
    };
    if (COMPRESS.has(ext) && body.length > 1024) {
      f.br = zlib.brotliCompressSync(body, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 9, [zlib.constants.BROTLI_PARAM_SIZE_HINT]: body.length } });
      f.gz = zlib.gzipSync(body, { level: 9 });
    }
    files.set(url, f);
  }
}
load(PUBLIC_DIR, '');
if (!files.has('/index.html')) {
  console.error('public/index.html is missing, so there is nothing to serve.');
  process.exit(1);
}

function plain(res, status, text, extra) {
  res.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8', 'Content-Length': Buffer.byteLength(text), 'X-Content-Type-Options': 'nosniff', ...extra });
  res.end(text);
}

const server = http.createServer((req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') return plain(res, 405, 'Method not allowed', { Allow: 'GET, HEAD' });
  let p;
  try { p = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); } catch (e) { return plain(res, 400, 'Bad request'); }
  if (p === '/') p = '/index.html';
  let f = files.get(p);
  // An address with no file ending (for example /?tag=CC380 with a path added by mistake) gets the app.
  // A missing file with an ending (for example a route file) gets 404, so the app shows "Directions did not load".
  if (!f && !path.extname(p)) f = files.get('/index.html');
  if (!f) return plain(res, 404, 'Not found');

  const headers = {
    'Content-Type': f.type,
    'Cache-Control': f.cache,
    ETag: f.etag,
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
  };
  if (f.br) headers.Vary = 'Accept-Encoding';
  if (req.headers['if-none-match'] === f.etag) { res.writeHead(304, headers); return res.end(); }
  const accept = String(req.headers['accept-encoding'] || '');
  let body = f.body;
  if (f.br && /\bbr\b/.test(accept)) { body = f.br; headers['Content-Encoding'] = 'br'; }
  else if (f.gz && /\bgzip\b/.test(accept)) { body = f.gz; headers['Content-Encoding'] = 'gzip'; }
  headers['Content-Length'] = body.length;
  res.writeHead(200, headers);
  res.end(req.method === 'HEAD' ? undefined : body);
});

server.listen(PORT, HOST, () => {
  console.log(`SGH wayfinding v7.8 listening on ${HOST}:${PORT} (${files.size} files)`);
});
process.on('SIGTERM', () => server.close(() => process.exit(0)));
