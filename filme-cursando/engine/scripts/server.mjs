import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
const mime = {'.html':'text/html', '.mjs':'text/javascript', '.js':'text/javascript', '.json':'application/json', '.png':'image/png', '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.webp':'image/webp', '.svg':'image/svg+xml', '.woff2':'font/woff2', '.ttf':'font/ttf', '.mp4':'video/mp4', '.wasm':'application/wasm', '.gltf':'model/gltf+json', '.glb':'model/gltf-binary', '.ktx2':'image/ktx2'};
export async function serve(root) {
  root = await fs.realpath(root);
  const server = http.createServer(async (req, res) => {
    try {
      if(req.headers.host!==`127.0.0.1:${server.address().port}`){res.writeHead(403).end();return;}
      const origin = `http://${req.headers.host}`;
      if (req.headers.origin && req.headers.origin !== origin) {res.writeHead(403).end(); return;}
      if (!['GET','HEAD'].includes(req.method)) {res.writeHead(405).end(); return;}
      const url = new URL(req.url, origin);
      const file = await fs.realpath(path.resolve(root, '.' + decodeURIComponent(url.pathname)));
      const rel = path.relative(root, file);
      if (rel.startsWith('..') || path.isAbsolute(rel) || rel.split(path.sep).some(x => x.startsWith('.'))) {res.writeHead(403).end(); return;}
      const data = await fs.readFile(file);
      res.writeHead(200, {'Content-Type':mime[path.extname(file)] || 'application/octet-stream', 'Cache-Control':'no-store'});
      res.end(req.method === 'HEAD' ? undefined : data);
    } catch {res.writeHead(404).end();}
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  return {url:`http://127.0.0.1:${server.address().port}`, close:()=>new Promise(resolve=>server.close(resolve))};
}
