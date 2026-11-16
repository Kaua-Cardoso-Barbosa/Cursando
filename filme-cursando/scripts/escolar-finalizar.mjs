import fs from 'node:fs/promises';
import path from 'node:path';
import {spawn} from 'node:child_process';
const root=path.resolve('filme-cursando'),out=path.join(root,'out/escolar');
process.env.FFMPEG||=path.resolve('ferramentas/ffmpeg/bin/ffmpeg.exe');
process.env.FFPROBE||=path.resolve('ferramentas/ffmpeg/bin/ffprobe.exe');
const run=(command,args)=>new Promise((resolve,reject)=>{const p=spawn(command,args,{cwd:root,env:process.env,windowsHide:true,stdio:['ignore','pipe','pipe']});let log='';p.stdout.on('data',b=>log+=b);p.stderr.on('data',b=>log+=b);p.on('error',reject);p.on('close',c=>c===0?resolve(log):reject(Error(log)));});
const exists=file=>fs.access(file).then(()=>true,()=>false);
const node=(name,args)=>run(process.execPath,[`engine/scripts/${name}.mjs`,...args]);
const deliveries=[];
for(const format of ['horizontal','vertical']){
 const input=`out/escolar/master-${format}-imagem.mp4`,file=`cursando-pitch-escolar-${format}.mp4`;
 const width=format==='horizontal'?1920:1080,height=format==='horizontal'?1080:1920;
 if(!await exists(path.join(out,file)))await node('mux',['--video',input,'--audio','audio/escolar-final.wav','--duration','60','--out',`out/escolar/${file}`]);
 console.log(`Audio e imagem unidos: ${format}`);
 await node('qa',['--input',`out/escolar/${file}`,'--duration','60','--width',String(width),'--height',String(height),'--require-audio','--check-loudness','--out',`out/escolar/qa-${format}.json`]);
 const qa=JSON.parse(await fs.readFile(path.join(out,`qa-${format}.json`),'utf8'));
 if(!qa.passed||qa.video.fps!=='60/1'||qa.video.frames!=='3600')throw Error('QA final recusou '+format);
 console.log(`QA aprovado: ${format}, ${qa.audio.loudness.integratedLUFS} LUFS, ${qa.audio.loudness.truePeakDBTP} dBTP`);
 if(!await exists(path.join(out,`review-${format}/poster.png`)))await node('review',['--input',`out/escolar/${file}`,'--at','25.05','--out',`out/escolar/review-${format}`]);
 if(!await exists(path.join(out,`poster-${format}.jpg`)))await run(process.env.FFMPEG,['-hide_banner','-loglevel','error','-n','-ss','58.2','-i',`out/escolar/${file}`,'-frames:v','1','-q:v','2',`out/escolar/poster-${format}.jpg`]);
 deliveries.push({id:format,file,width,height,duration:60,fps:60,poster:`poster-${format}.jpg`});
}
const timeline=JSON.parse(await fs.readFile(path.join(root,'engine/assets/escolar/timeline.json'),'utf8'));
function stamp(t,sep=','){const ms=Math.round(t*1000);return `${String(Math.floor(ms/3600000)).padStart(2,'0')}:${String(Math.floor(ms/60000)%60).padStart(2,'0')}:${String(Math.floor(ms/1000)%60).padStart(2,'0')}${sep}${String(ms%1000).padStart(3,'0')}`;}
await fs.writeFile(path.join(out,'legendas.srt'),timeline.subtitles.map((s,i)=>`${i+1}\n${stamp(s.start)} --> ${stamp(s.end)}\n${s.text}`).join('\n\n')+'\n');
await fs.writeFile(path.join(out,'legendas.vtt'),'WEBVTT\n\n'+timeline.subtitles.map(s=>`${stamp(s.start,'.')} --> ${stamp(s.end,'.')}\n${s.text}`).join('\n\n')+'\n');
await fs.writeFile(path.join(out,'entregas.json'),JSON.stringify(deliveries,null,2));
await fs.copyFile(path.join(root,'docs/escolar/PRODUCAO.md'),path.join(out,'CREDITOS.md'));
const cards=deliveries.map(d=>`<article><h2>${d.id==='horizontal'?'Horizontal':'Vertical'}</h2><p>${d.width} × ${d.height} · 60 fps · 1 minuto</p><video controls playsinline preload="metadata" poster="${d.poster}"><source src="${d.file}" type="video/mp4"></video><a class="button" href="${d.file}" download>Baixar vídeo <span aria-hidden="true">↓</span></a><a href="qa-${d.id}.json">Verificação técnica</a></article>`).join('');
await fs.writeFile(path.join(out,'index.html'),`<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Cursando · Pitch escolar</title><style>*{box-sizing:border-box}body{margin:0;background:#f5f9f6;color:#173f2e;font:16px/1.6 system-ui,'Segoe UI',sans-serif}header{padding:20px max(24px,calc((100vw - 1200px)/2));background:#02693e;color:#fff;font-size:24px;font-weight:750}main{max-width:1250px;margin:auto;padding:38px 24px 60px}h1{margin:0 0 14px;font-size:clamp(32px,4vw,48px);line-height:1.15;letter-spacing:-.03em}.intro{color:#53675d;max-width:800px;margin-bottom:30px}.grid{display:grid;grid-template-columns:1.4fr 1fr;gap:24px;align-items:start}article{background:white;border:1px solid #dfe8e2;padding:22px;border-radius:12px}h2{margin:0 0 6px;font-size:22px}article p{margin:0 0 18px;color:#53675d;font-size:14px}video{display:block;width:100%;max-height:650px;border-radius:8px;background:#075132}a{color:#02693e;text-underline-offset:3px}.button{display:flex;justify-content:space-between;gap:20px;margin:18px 0 12px;background:#02693e;color:white;border-radius:8px;padding:12px 18px;font-weight:650;text-decoration:none}.button:hover{background:#075132}.links{display:flex;gap:24px;flex-wrap:wrap;margin-top:28px}a:focus-visible{outline:3px solid #06a663;outline-offset:4px}@media(max-width:760px){.grid{grid-template-columns:1fr}main{padding:28px 18px}video{max-height:70vh}}</style><header>Cursando</header><main><h1>Aprendizado conectado.</h1><p class="intro">Apresentação escolar do site e do aplicativo, com a narração fornecida, cursos de demonstração e uma videoaula real de Blender. Versões com áudio e legendas incorporadas.</p><section class="grid">${cards}</section><div class="links"><a href="legendas.srt" download>Baixar legendas</a><a href="CREDITOS.md">Créditos e detalhes da produção</a></div></main></html>`);
console.log('Entrega escolar pronta: out/escolar/index.html');
