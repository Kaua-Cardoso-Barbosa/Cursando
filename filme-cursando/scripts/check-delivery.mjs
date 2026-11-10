import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const require=createRequire(path.join(root,'engine/package.json'));
const {chromium}=require('playwright');
const delivery=JSON.parse(await fs.readFile(path.join(root,'out/entregas.json'),'utf8'));
const files=[];
for(const product of delivery.products){
 const bytes=await fs.readFile(path.join(root,'out',product.file));
 const qa=JSON.parse(await fs.readFile(path.join(root,`out/qa-${product.id}.json`),'utf8'));
 if(!bytes.length||!qa.passed)throw Error(`Entrega incompleta: ${product.id}`);
 files.push({file:product.file,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});
}
const browser=await chromium.launch({headless:true});
const layouts=[];
try{
 const page=await browser.newPage({viewport:{width:1440,height:960}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(pathToFileURL(path.join(root,'out/index.html')).href);
 await page.waitForFunction(()=>[...document.querySelectorAll('video')].length===3&&[...document.querySelectorAll('video')].every(v=>v.readyState>=1),{timeout:15000});
 const metadata=await page.locator('video').evaluateAll(videos=>videos.map(v=>({width:v.videoWidth,height:v.videoHeight,duration:v.duration,error:v.error?.code||null})));
 if(metadata.some((m,i)=>m.width!==delivery.products[i].width||m.height!==delivery.products[i].height||Math.abs(m.duration-delivery.products[i].duration)>.1||m.error))throw Error('Metadados do player divergentes.');
 for(const video of await page.locator('video').all())await video.evaluate(async video=>{
  video.muted=true;await video.play();video.pause();
  await new Promise(resolve=>{video.addEventListener('seeked',resolve,{once:true});video.currentTime=1.5;});
 });
 for(const width of [1440,375]){
  await page.setViewportSize({width,height:960});
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
  if(overflow)throw Error(`Apresentacao com overflow em ${width}px`);
  layouts.push({width,overflow});
  await page.screenshot({path:path.join(root,`out/apresentacao-${width}.png`),fullPage:true});
 }
 if(errors.length)throw Error(errors.join('; '));
 const report={passed:true,files,players:metadata,layouts,errors};
 await fs.writeFile(path.join(root,'out/delivery-check.json'),JSON.stringify(report,null,2));
 console.log(JSON.stringify(report,null,2));
}finally{await browser.close();}
