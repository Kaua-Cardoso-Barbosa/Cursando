import fs from 'node:fs/promises';
import path from 'node:path';
import {args,probe,run,number,main} from './common.mjs';
main(async()=>{
  const a=args();if(!a.input) throw new Error('--input VIDEO obrigatório');
  const input=path.resolve(a.input), out=path.resolve(a.out || 'out/analysis');
  const fps=number(a.fps,4,0.1,12,'fps');await fs.mkdir(out,{recursive:true});
  const metadata=probe(input);delete metadata.format.filename;
  await fs.writeFile(path.join(out,'metadata.json'),JSON.stringify(metadata,null,2));
  // Índices dos arquivos iniciam em zero; timestamp nominal = índice / fps.
  run(process.env.FFMPEG || 'ffmpeg',['-hide_banner','-loglevel','error','-n','-i',input,'-vf',`fps=${fps},scale=640:-2`,'-start_number','0',path.join(out,'frame-%05d.jpg')]);
  const duration=Number(metadata.streams.find(s=>s.codec_type==='video').duration || metadata.format.duration);
  const frames=(await fs.readdir(out)).filter(f=>/^frame-\d+\.jpg$/.test(f)).sort();
  await fs.writeFile(path.join(out,'frames.json'),JSON.stringify(frames.map((file,i)=>({file,time:i/fps})),null,2));
  const html=`<!doctype html><meta charset="utf-8"><title>Análise de frames</title><style>body{font:14px system-ui;background:#eee}main{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}figure{margin:0;background:white}img{width:100%}figcaption{padding:8px}</style><h1>Frames — ${duration.toFixed(3)} s</h1><p>Cadência ${fps} fps. Timestamps nominais; para cortes exatos inspecione o original frame a frame.</p><main>${frames.map((f,i)=>`<figure><img src="${f}"><figcaption>${(i/fps).toFixed(3)} s</figcaption></figure>`).join('')}</main>`;
  await fs.writeFile(path.join(out,'index.html'),html);
  console.log(`${frames.length} frames em ${out}`);
});
