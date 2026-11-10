import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
process.env.FFMPEG||=path.join(root,'../ferramentas/ffmpeg/bin/ffmpeg.exe');
process.env.FFPROBE||=path.join(root,'../ferramentas/ffmpeg/bin/ffprobe.exe');
const products=[
 {id:'horizontal',title:'Horizontal · 60 segundos',duration:60,width:1920,height:1080},
 {id:'vertical',title:'Vertical · 60 segundos',duration:60,width:1080,height:1920},
 {id:'curto',title:'Vertical · 15 segundos',duration:15,width:1080,height:1920},
];
const run=(command,args)=>new Promise((resolve,reject)=>{
 const proc=spawn(command,args,{cwd:root,env:process.env,windowsHide:true,stdio:['ignore','pipe','pipe']});
 let log='';proc.stdout.on('data',chunk=>log+=chunk);proc.stderr.on('data',chunk=>log+=chunk);
 proc.on('error',reject);proc.on('close',code=>code===0?resolve(log):reject(Error(log||`Processo terminou com ${code}`)));
});
const exists=p=>fs.access(path.join(root,p)).then(()=>true,()=>false);
const node=(script,args)=>run(process.execPath,[`engine/scripts/${script}.mjs`,...args]);
for(const product of products){
 const {id,duration,width,height}=product;
 const input=`out/cursando-${id}-imagem.mp4`;
 if(!await exists(input)){console.log(`Aguardando render: ${input}`);continue;}
 try{
  const metadata=JSON.parse(await run(process.env.FFPROBE,['-v','error','-show_format','-of','json',input]));
  if(Math.abs(Number(metadata.format.duration)-duration)>.1){console.log(`Aguardando duracao final: ${input}`);continue;}
 }catch{console.log(`Aguardando finalizacao do render: ${input}`);continue;}
 const filename=`cursando-${duration}s-${id==='curto'?'vertical':id}-sem-locucao.mp4`;
 product.file=filename;
 const audio=id==='curto'?'audio/mix-curto-sem-locucao.wav':'audio/mix-sem-locucao.wav';
 if(!await exists(`out/${filename}`))await node('mux',['--video',input,'--audio',audio,'--duration',String(duration),'--out',`out/${filename}`]);
 console.log(`Audio incorporado: ${filename}`);
 await node('qa',['--input',`out/${filename}`,'--duration',String(duration),'--width',String(width),'--height',String(height),'--require-audio','--check-loudness','--out',`out/qa-${id}.json`]);
 const report=JSON.parse(await fs.readFile(path.join(root,`out/qa-${id}.json`),'utf8'));
 if(!report.passed)throw Error(`QA recusou ${filename}`);
 console.log(`QA aprovado: ${id}; ${report.video.frames} frames; ${report.audio.loudness.integratedLUFS} LUFS.`);
 if(!await exists(`out/review-${id}/poster.png`))await node('review',['--input',`out/${filename}`,'--at','2.9','--out',`out/review-${id}`]);
 const poster=`poster-${id}.jpg`;
 if(!await exists(`out/${poster}`))await run(process.env.FFMPEG,['-hide_banner','-loglevel','error','-n','-ss',String(duration===15?13.9:58.8),'-i',`out/${filename}`,'-frames:v','1','-q:v','2',`out/${poster}`]);
 product.poster=poster;
}
if(products.some(product=>!product.file))process.exit(0);
await fs.writeFile(path.join(root,'out/entregas.json'),JSON.stringify({status:'Imagem, musica e efeitos concluidos; narracao ElevenLabs pendente.',products},null,2));
const cards=products.map(p=>`<article><h2>${p.title}</h2><p>${p.width} × ${p.height} · 60 fps</p><video controls playsinline preload="metadata" poster="${p.poster}"><source src="${p.file}" type="video/mp4"></video><a class="download" href="${p.file}" download>Baixar vídeo <span aria-hidden="true">↓</span></a><a class="review" href="qa-${p.id}.json">Verificação técnica</a></article>`).join('');
await fs.writeFile(path.join(root,'out/index.html'),`<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Cursando · Vídeo de apresentação</title><style>*{box-sizing:border-box}body{margin:0;background:#f5f9f6;color:#173f2e;font-family:system-ui,"Segoe UI",sans-serif}header{background:#02693e;color:white;padding:20px max(24px,calc((100vw - 1280px)/2));font-size:24px;font-weight:750}main{max-width:1330px;margin:auto;padding:42px 25px 60px}h1{max-width:800px;font-size:clamp(30px,4vw,48px);line-height:1.12;margin:0 0 20px;letter-spacing:-.03em}.intro{max-width:780px;color:#53675d;line-height:1.65;margin-bottom:30px}.status{background:white;border:1px solid #cbded1;border-radius:12px;padding:18px 22px;line-height:1.6;margin-bottom:32px}.grid{display:grid;grid-template-columns:1.4fr 1fr 1fr;align-items:start;gap:22px}article{min-width:0;background:white;border:1px solid #dfe8e2;border-radius:12px;padding:20px}h2{font-size:19px;margin:0 0 8px}article p{margin:0 0 18px;color:#53675d;font-size:14px}video{width:100%;max-height:590px;display:block;background:#075132;border-radius:8px}.download{display:flex;align-items:center;justify-content:space-between;gap:20px;margin:18px 0 12px;padding:13px 17px;background:#02693e;color:white;border-radius:8px;text-decoration:none;font-weight:650}.download:hover{background:#075132}.review{font-size:13px;color:#02693e}a:focus-visible{outline:3px solid #06a663;outline-offset:4px}@media(max-width:1000px){.grid{grid-template-columns:1fr 1fr}.grid article:first-child{grid-column:1/-1}}@media(max-width:600px){main{padding:28px 18px}.grid{grid-template-columns:1fr}.grid article:first-child{grid-column:auto}video{max-height:70vh}}</style><header>Cursando</header><main><h1>Dê caminho à sua curiosidade.</h1><p class="intro">Uma apresentação do site e do aplicativo, com o visual do Cursando, telas do produto e motion design.</p><p class="status"><strong>Imagem, trilha e efeitos prontos.</strong> Estas versões estão sem locução. A integração ElevenLabs foi validada, mas a geração da voz recebeu “pagamento necessário”.</p><section class="grid">${cards}</section></main></html>`);
console.log('Apresentacao local pronta: out/index.html');
