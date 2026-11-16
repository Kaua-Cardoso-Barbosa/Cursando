import path from 'node:path';
import fs from 'node:fs/promises';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
const root=path.resolve('filme-cursando'),out=path.join(root,'out/escolar'),require=createRequire(path.join(root,'engine/package.json'));
const {chromium}=require('playwright'),browser=await chromium.launch({headless:true});
const files=JSON.parse(await fs.readFile(path.join(out,'entregas.json'),'utf8'));
const report={passed:false,files:[],layouts:[],errors:[]};
try{
 for(const file of files){const bytes=await fs.readFile(path.join(out,file.file));report.files.push({...file,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});}
 const page=await browser.newPage({viewport:{width:1440,height:1000}});page.on('pageerror',e=>report.errors.push(e.message));
 await page.goto(pathToFileURL(path.join(out,'index.html')).href);
 await page.waitForFunction(()=>[...document.querySelectorAll('video')].length===2&&[...document.querySelectorAll('video')].every(v=>v.readyState>=1));
 for(const [index,video] of (await page.locator('video').all()).entries()){
  const meta=await video.evaluate(v=>({width:v.videoWidth,height:v.videoHeight,duration:v.duration,error:v.error?.code||null}));
  if(meta.width!==files[index].width||meta.height!==files[index].height||Math.abs(meta.duration-60)>.1||meta.error)throw Error('Video invalido no navegador.');
  await video.evaluate(async v=>{v.muted=true;await v.play();v.pause();await new Promise(resolve=>{v.addEventListener('seeked',resolve,{once:true});v.currentTime=1.8;});});
 }
 for(const width of [1440,375]){await page.setViewportSize({width,height:1000});const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);report.layouts.push({width,overflow});if(overflow)throw Error('Overflow na entrega');await page.screenshot({path:path.join(out,`apresentacao-${width}.png`),fullPage:true});}
 report.passed=!report.errors.length;await fs.writeFile(path.join(out,'delivery-check.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}finally{await browser.close();}
