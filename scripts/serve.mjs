import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const types = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml','.json':'application/json; charset=utf-8','.woff2':'font/woff2','.txt':'text/plain; charset=utf-8'};
http.createServer((req,res) => {
  try {
    const urlPath = decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    const target = path.resolve(root,'.' + (urlPath.endsWith('/') ? urlPath+'index.html' : urlPath));
    if (!target.startsWith(root+path.sep) || urlPath.split('/').some(p=>p.startsWith('.'))) {res.writeHead(403);res.end();return;}
    fs.stat(target,(error,stat)=>{if(error||!stat.isFile()){res.writeHead(404);res.end('Not found');return;}res.writeHead(200,{'Content-Type':types[path.extname(target)]||'application/octet-stream','Cache-Control':'no-store'});fs.createReadStream(target).pipe(res);});
  }catch {res.writeHead(400);res.end('Bad request');}
}).listen(Number(process.env.PORT || 4174),'127.0.0.1',()=>console.log(`Monster Mash preview: http://127.0.0.1:${process.env.PORT || 4174}`));
