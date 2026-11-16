import fs from 'node:fs/promises';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
const root=path.resolve('filme-cursando'),require=createRequire(path.join(root,'engine/package.json'));
const {chromium}=require('playwright');
const assets=path.join(root,'engine/assets/escolar');
const data=JSON.parse(await fs.readFile(path.join(assets,'demo-private.json'),'utf8'));
const cid=data.cadastro.cursos[0].id,aid=data.cadastro.cursos[0].aulas[6].id;
// Credencial curta apenas em memoria; nenhum token e gravado em artefatos.
const token=execFileSync('python',[path.join(root,'scripts/escolar-sessao.py'),'--token'],{encoding:'utf8',windowsHide:true}).trim();
const payload=JSON.parse(Buffer.from(token.split('.')[1],'base64url').toString());
const browser=await chromium.launch({headless:true});
const errors=[];
try{
 const context=await browser.newContext({viewport:{width:1440,height:1000},deviceScaleFactor:1});
 await context.addCookies([{name:'token',value:token,domain:'127.0.0.1',path:'/',httpOnly:true,sameSite:'Lax'}]);
 await context.route('http://127.0.0.1:5000/**',async route=>{
  const headers={...route.request().headers(),authorization:'Bearer '+token};
  if(payload.csrf)headers['X-CSRF-TOKEN']=payload.csrf;
  await route.continue({headers});
 });
 const page=await context.newPage();
 page.on('pageerror',e=>errors.push(e.message));
 async function goto(url){await page.goto('http://127.0.0.1:5199'+url,{waitUntil:'networkidle',timeout:90000});await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(700);}
 const screenshot=name=>page.screenshot({path:path.join(assets,name+'.png')});
 if(process.argv.includes('--modules-only')){
  await goto(`/DashboardAluno/cursos/${cid}`);
  await page.getByText('Módulos do curso',{exact:true}).first().evaluate(el=>window.scrollTo(0,window.scrollY+el.getBoundingClientRect().top-130));await page.waitForTimeout(200);await screenshot('web-modules');
 }else if(process.argv.includes('--exam-only')){
  await goto(`/DashboardAluno/cursos/${cid}`);
  await page.getByRole('button',{name:/Prova final/}).first().click();await page.waitForTimeout(600);
  const title=page.getByText('Fundamentos de criação 3D',{exact:true}).first();if(await title.count())await title.scrollIntoViewIfNeeded();
  await screenshot(process.argv.includes('--approved')?'web-approved':'web-exam');
 }else if(process.argv.includes('--chat-only')){
  await goto('/DashboardAluno/chat');
  await page.getByText('Blender: primeiros passos na criação 3D',{exact:true}).first().click();await page.waitForTimeout(500);
  const input=page.locator('textarea').first();if(await input.count())await input.fill('Como faço para limitar a extrusão ao eixo Z?');
  await screenshot('web-chat');
 }else{
 await goto('/');await screenshot('web-home');
 await goto('/DashboardAluno/descobrir');
 const search=page.locator('input').first();
 if(await search.count()){await search.fill('Blender');await page.waitForTimeout(700);}
 await screenshot('web-catalog');
 await goto(`/DashboardAluno/cursos/${cid}`);await screenshot('web-course');
 const modules=page.getByText('Módulos do curso',{exact:true}).first();if(await modules.count())await modules.scrollIntoViewIfNeeded();await screenshot('web-modules');
 const module=page.getByRole('button',{name:/Modelando suas primeiras formas/}).first();
 if(await module.count()){await module.click();await page.waitForTimeout(500);}else{const title=page.getByText('Modelando suas primeiras formas',{exact:true}).first();if(await title.count()){await title.click();await page.waitForTimeout(500);}}
 await screenshot('web-lessons');
 await goto(`/DashboardAluno/aulas/${aid}`);
 await page.waitForFunction(()=>{const v=document.querySelector('video');return v&&v.readyState>=2;},null,{timeout:120000});
 await page.locator('video').evaluate(async video=>{video.muted=true;await video.play();await new Promise(resolve=>{video.addEventListener('seeked',resolve,{once:true});video.currentTime=45;});video.pause();});
 await screenshot('web-player');
 const player=await page.locator('video').boundingBox();
 const before=await page.locator('video').evaluate(v=>v.currentTime);
 await page.locator('video').evaluate(v=>v.play());await page.waitForTimeout(1100);
 const after=await page.locator('video').evaluate(v=>{v.pause();return v.currentTime;});
 if(after-before<.5)throw Error('Video nao avancou durante validacao de reproducao.');
 await fs.writeFile(path.join(assets,'player-geometry.json'),JSON.stringify({viewport:{width:1440,height:1000},player,before,after,passed:true},null,2));
 await goto('/DashboardAluno');await screenshot('web-progress');
 await goto('/DashboardAluno/chat');await screenshot('web-chat');
 await goto(`/DashboardAluno/cursos/${cid}`);
 const exam=page.getByRole('button',{name:/Prova final|Provas/}).first();if(await exam.count()){await exam.click();await page.waitForTimeout(600);}
 await screenshot('web-exam');
 const appErrors=[...new Set(errors)].filter(e=>!e.includes('Failed to fetch'));
 await fs.writeFile(path.join(root,'out/escolar-capture-check.json'),JSON.stringify({player:{passed:true,before,after},errors:appErrors},null,2));
 console.log('Telas reais do site capturadas; reproducao validada sem trocar a fonte do player.');
 }
}finally{await browser.close();}
