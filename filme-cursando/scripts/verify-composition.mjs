import path from 'node:path';
import fs from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {serve} from '../engine/scripts/server.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const require=createRequire(path.join(root,'engine/package.json'));
const {chromium}=require('playwright');
const server=await serve(path.join(root,'engine')),browser=await chromium.launch({headless:true});
const results=[];
try{
 for(const [width,height,short] of [[960,540,false],[540,960,false],[540,960,true]]){
  const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(server.url+'/assets/cursando/index.html');
  await page.waitForFunction(()=>typeof window.seek==='function');
  await page.evaluate(async c=>{await window.ready;await window.configure(c);},{width,height,short});
  const capture=t=>page.evaluate(t=>{window.seek(t);return document.querySelector('canvas').toDataURL();},t);
  const hash=s=>createHash('sha256').update(s).digest('hex');
  let deterministic=true;
  for(const t of [1.5,7.5,short?12.4:43.8]){const a=hash(await capture(t));await capture(.1);if(a!==hash(await capture(t)))deterministic=false;}
  const ranges=await page.evaluate(()=>window.renderCacheRanges);
  const invalid=[];
  for(const [a,b] of ranges){if(hash(await capture(a+.001))!==hash(await capture(b-.001)))invalid.push([a,b]);}
  const row={width,height,short,deterministic,holds:ranges.length,invalidHolds:invalid,errors};
  results.push(row);console.log(JSON.stringify(row));
  await page.close();
 }
 await fs.writeFile(path.join(root,'out/composition-check.json'),JSON.stringify(results,null,2));
 if(results.some(r=>!r.deterministic||r.invalidHolds.length||r.errors.length))process.exitCode=1;
}finally{await browser.close();await server.close();}
