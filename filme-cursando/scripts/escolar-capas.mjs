import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
const root=path.resolve('filme-cursando'),require=createRequire(path.join(root,'engine/package.json'));
const {chromium}=require('playwright');
const dest=path.join(root,'engine/assets/escolar');await fs.mkdir(dest,{recursive:true});
const photo=await fs.readFile('backend/static/uploads/cursos/recomendacoes/pexels-7619784.jpg');
const themes=[
 {id:'blender',label:'CRIAÇÃO DIGITAL',name:'Primeiros passos<br>na criação 3D',sub:'Blender · Fundamentos',art:`<svg viewBox="0 0 600 600"><path d="M80 450L300 565L540 435L320 320Z" fill="#c1dacf"/><path d="M180 210L330 125L485 212L330 300Z" fill="#8ec5a7"/><path d="M180 210V380L330 470V300Z" fill="#02693e"/><path d="M330 300L485 212V380L330 470Z" fill="#075132"/><circle cx="155" cy="420" r="55" fill="#ddaf6c"/><path d="M435 425L510 460L550 390L480 355Z" fill="#d8e9df"/></svg>`},
 {id:'python',label:'TECNOLOGIA',name:'Lógica e primeiros<br>programas',sub:'Python · Programação',art:`<div class="code"><span class="muted"># Um primeiro programa</span><br><b>def</b> aprender(assunto):<br>&nbsp;&nbsp;etapas = [<i>"estudar"</i>, <i>"praticar"</i>]<br>&nbsp;&nbsp;<b>for</b> etapa <b>in</b> etapas:<br>&nbsp;&nbsp;&nbsp;&nbsp;print(etapa, assunto)<br><br>aprender(<i>"Python"</i>)</div>`},
 {id:'fotografia',label:'FOTOGRAFIA',name:'Luz e<br>composição',sub:'Fotografia · Retratos',art:`<img src="data:image/jpeg;base64,${photo.toString('base64')}">`},
];
const browser=await chromium.launch({headless:true});
try{const page=await browser.newPage({viewport:{width:1280,height:720},deviceScaleFactor:1});
for(const item of themes){await page.setContent(`<style>*{box-sizing:border-box}body{margin:0;background:#f5f9f6;color:#173f2e;font-family:'Segoe UI',sans-serif}main{display:grid;grid-template-columns:1fr 1fr;height:720px;padding:60px;gap:40px}.left{display:flex;flex-direction:column;justify-content:center}small{font-size:18px;letter-spacing:3px;color:#02693e;font-weight:700}h1{font-size:56px;line-height:1.1;letter-spacing:-1.8px;margin:30px 0}p{font-size:24px;color:#53675d}.brand{position:absolute;bottom:48px;left:60px;font-size:24px;font-weight:750;color:#02693e}.art{align-self:center;overflow:hidden;border-radius:22px}.art svg{width:100%;height:560px}.art img{width:100%;height:530px;object-fit:cover}.code{background:#173f2e;padding:40px 25px;border-radius:18px;color:#fff;font:20px/2 Consolas,monospace}.code b{color:#91dbb6}.code i{color:#edca94;font-style:normal}.muted{color:#b3c6bb}</style><main><div class="left"><small>${item.label}</small><h1>${item.name}</h1><p>${item.sub}</p></div><div class="art">${item.art}</div></main><div class="brand">Cursando</div>`);await page.evaluate(()=>Promise.all([...document.images].map(i=>i.decode())));await page.screenshot({path:path.join(dest,`capa-${item.id}.png`)});}
}finally{await browser.close();}
await fs.writeFile(path.join(dest,'creditos-capas.json'),JSON.stringify({blender:'Composição vetorial original para o projeto escolar.',python:'Composição tipográfica original; código de demonstração.',fotografia:{autor:'Vlado Krstevski',fonte:'https://www.pexels.com/photo/7619784/',licenca:'https://www.pexels.com/license/',origem:'Foto já utilizada pelo site; layout original.'}},null,2));
console.log('Tres capas 1280x720 preparadas.');
