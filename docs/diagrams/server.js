const http = require('http'), fs = require('fs'), path = require('path');
http.createServer((req, res) => {
  if (req.method === 'POST' && req.url.startsWith('/save/')) {
    const name = path.basename(decodeURIComponent(req.url.slice(6)));
    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => {
      const buf = Buffer.concat(chunks);
      const b64 = buf.toString('utf8').replace(/^data:image\/png;base64,/, '');
      fs.writeFileSync(path.join(process.cwd(), name), Buffer.from(b64, 'base64'));
      res.writeHead(200); res.end('saved ' + name);
    });
    return;
  }
  const f = decodeURIComponent(req.url.split('?')[0]).replace(/^\//, '') || 'index.html';
  try {
    const b = fs.readFileSync(path.join(process.cwd(), f));
    const ct = f.endsWith('.svg') ? 'image/svg+xml' : f.endsWith('.png') ? 'image/png' : 'text/html';
    res.writeHead(200, { 'Content-Type': ct }); res.end(b);
  } catch (e) { res.writeHead(404); res.end('nope'); }
}).listen(8812, () => console.log('serving on 8812'));
