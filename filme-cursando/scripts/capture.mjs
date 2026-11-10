import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import { createRequire } from 'node:module';
const require = createRequire(path.resolve('engine/package.json'));
const { build } = require('esbuild');
const { chromium } = require('playwright');
const root = path.resolve('..'), assets = path.resolve('engine/assets/cursando');
const data = JSON.parse(await fs.readFile(path.join(assets,'demo-private.json'),'utf8'));
const stub = `export const resolverUrlMidia=p=>p?.startsWith('http')?p:'http://127.0.0.1:5000'+p;export const getApiBaseUrl=()=> 'http://127.0.0.1:5000';export const apiRequest=async p=> p==='/chat/conversas'?${JSON.stringify((data.course.curso.professores || []).slice(0,1).map(p=>({id_curso:11,id_aluno:0,nome:p.nome||'Professor do curso',curso:data.course.curso.titulo})))}:p.includes('/historico')?{itens:[],total:0,paginas:1}:p.includes('/mensagens')?{mensagens:[],tem_mais:false}:[];`;
await build({ entryPoints:['scripts/mobile-entry.jsx'], outfile:'out/mobile-ui.js', bundle:true, loader:{'.js':'jsx','.png':'file'}, jsx:'automatic', platform:'browser', define:{'process.env.NODE_ENV':'"production"','__DEV__':'false'}, alias:{'react-native':'react-native-web','react':path.resolve('engine/node_modules/react'),'react-dom':path.resolve('engine/node_modules/react-dom')}, nodePaths:[path.resolve('engine/node_modules')], plugins:[{name:'capture-adapters',setup(b){
  b.onResolve({filter:/AppIcon_39$/},()=>({path:'icon',namespace:'stub'}));
  b.onResolve({filter:/api\/client_3_17$/},()=>({path:'api',namespace:'stub'}));
  b.onResolve({filter:/^expo-/},()=>({path:'expo',namespace:'stub'}));
  b.onLoad({filter:/.*/,namespace:'stub'},({path:p})=>({contents:p==='api'?stub:p==='icon'?`import React from 'react';export default function Icon({name,size=16,color}){return <span style={{fontFamily:'CursandoIcons',fontSize:size,color}}>{({'arrow-back':'\\uf060','chevron-down':'\\uf078','check':'\\uf00c','home-outline':'\\uf015','people-outline':'\\uf0c0','play-circle-outline':'\\uf144','bars':'\\uf0c9','person-circle-outline':'\\uf2bd'})[name]||'\\uf144'}</span>}`:`export default {};export const documentDirectory='';export const cacheDirectory='';export const downloadAsync=async()=>({});`,loader:'jsx',resolveDir:path.resolve('engine/node_modules')}));
}}] });
const iconPath=path.join(root,'mobile/node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/FontAwesome5_Solid.ttf');
const font=await fs.readFile(iconPath);
const server=http.createServer(async(req,res)=>{try{if(req.url==='/icon.ttf'){res.end(font);return;}if(req.url==='/ui.js'){res.setHeader('Content-Type','text/javascript');res.end(await fs.readFile('out/mobile-ui.js'));return;}if(/\.png/.test(req.url)){const file=path.basename(req.url);res.setHeader('Content-Type','image/png');res.end(await fs.readFile(path.join('out',file)));return;}res.setHeader('Content-Type','text/html; charset=utf-8');res.end(`<!doctype html><style>@font-face{font-family:CursandoIcons;src:url('/icon.ttf')}html,body,#root{height:100%;margin:0;font-family:Arial,sans-serif}#root{display:flex;flex-direction:column}*{box-sizing:border-box}</style><div id="root"></div><script>window.productData=${JSON.stringify(data).replace(/</g,'\\u003c')}</script><script src="/ui.js"></script>`);}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const port=server.address().port;
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage({viewport:{width:1440,height:960},deviceScaleFactor:1});
 const auth={autenticado:true,id_usuario:0,tipo:2,nome:'Aluno',identificador:'u_demo'};
 await page.route('**/*',async route=>{const u=new URL(route.request().url());if(u.port==='5000'&&['fetch','xhr'].includes(route.request().resourceType())){
   let json;const p=u.pathname;
   if(p==='/verificar_token')json=auth;
   else if(p==='/aluno/dashboard')json=data.dashboard;
   else if(p==='/aluno/cursos')json=data.courses;
   else if(p==='/aluno/cursos/11')json=data.course;
   else if(p==='/aluno/cursos/11/prova')json=data.exam;
   else if(p.startsWith('/aluno/aulas/'))json=data.lesson;
   else if(p==='/assinaturas/verificar')json={assinatura:true};
   else if(p==='/cursos/home')json=data.catalog;
   else if(p.startsWith('/aluno/descobrir'))json=[...data.catalog.destaques,...data.catalog.mais_assinados];
   else json=[];
   return route.fulfill({json});
 }return route.continue();});
 for(const [name,url] of [['web-home','/'],['web-courses','/DashboardAluno/descobrir'],['web-course','/DashboardAluno/cursos/11']]){
   await page.goto('http://127.0.0.1:5199'+url,{waitUntil:'networkidle'});await page.evaluate(()=>document.fonts.ready);await page.screenshot({path:path.join(assets,name+'.png')});
 }
 await page.setViewportSize({width:390,height:844});
 for(const screen of ['home','course','exam','chat']){
   const errors=[];const handler=e=>errors.push(e.message);page.on('pageerror',handler);
   await page.goto(`http://127.0.0.1:${port}/?screen=${screen}`,{waitUntil:'networkidle'});await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(500);
   if(errors.length)throw Error(screen+': '+errors.join(';'));
   if(screen==='home'){await page.getByText('Últimas aulas assistidas',{exact:true}).scrollIntoViewIfNeeded();}
   await page.screenshot({path:path.join(assets,'mobile-'+screen+'.png')});
   if(screen==='course'){
     const module=page.getByRole('button',{name:/Módulo 1|Modulo 1/}).first();
     if(await module.count()){await module.click();await page.waitForTimeout(200);await page.screenshot({path:path.join(assets,'mobile-module.png')});}
   }
   page.off('pageerror',handler);
 }
 console.log('Capturas das interfaces reais: site e componentes do aplicativo renderizados com React Native Web.');
}finally{await browser.close();await new Promise(r=>server.close(r));}
