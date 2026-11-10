import fs from 'node:fs/promises';
import path from 'node:path';
import {args,probe,run,main,number} from './common.mjs';
main(async()=>{
  const a=args();if(!a.video||!a.audio)throw new Error('--video e --audio obrigatórios');
  const v=probe(a.video).streams.find(s=>s.codec_type==='video');if(!v)throw new Error('Sem faixa de vídeo');
  const duration=number(a.duration,Number(v.duration),.1,600,'duration'), start=number(a.start,0,0,36000,'start');
  const out=path.resolve(a.out||'out/final-mux.mp4');await fs.mkdir(path.dirname(out),{recursive:true});
  run(process.env.FFMPEG||'ffmpeg',['-hide_banner','-loglevel','error','-n','-i',path.resolve(a.video),'-ss',String(start),'-i',path.resolve(a.audio),'-map','0:v:0','-map','1:a:0','-c:v','copy','-af','apad','-c:a','aac','-b:a','192k','-t',String(duration),'-movflags','+faststart',out]);
  console.log(`Áudio atualizado sem recomprimir vídeo: ${out}`);
});
