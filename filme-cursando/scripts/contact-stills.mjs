import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
import {serve} from '../engine/scripts/server.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const require=createRequire(path.join(root,'engine/package.json'));
const {chromium}=require('playwright');
const input=path.resolve(process.argv[2]);
const out=path.resolve(process.argv[3]);
const files=(await fs.readdir(input)).filter(f=>f.endsWith('.png')).sort((a,b)=>parseFloat(a)-parseFloat(b));
await fs.mkdir(out,{recursive:true});
const server=await serve(root),browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage({viewport:{width:1280,height:900},deviceScaleFactor:1});
 for(let offset=0;offset<files.length;offset+=20){
  const cards=files.slice(offset,offset+20).map(f=>`<figure><figcaption>${parseFloat(f).toFixed(2)} s</figcaption><img src="${server.url}/${path.relative(root,path.join(input,f)).replaceAll('\\','/')}"></figure>`).join('');
  await page.setContent(`<style>*{box-sizing:border-box}body{margin:0;padding:12px;background:#e6ece8;font:600 16px Arial;color:#173f2e}main{display:grid;grid-template-columns:repeat(5,1fr);gap:10px}figure{margin:0}figcaption{padding:5px;background:white}img{display:block;width:100%;height:auto}</style><main>${cards}</main>`);
  await page.evaluate(()=>Promise.all([...document.images].map(im=>im.decode())));
  await page.screenshot({path:path.join(out,`contact-${offset/20+1}.jpg`),fullPage:true});
 }
 console.log(`${files.length} frames em ${Math.ceil(files.length/20)} folhas de contato.`);
}finally{await browser.close();await server.close();}
