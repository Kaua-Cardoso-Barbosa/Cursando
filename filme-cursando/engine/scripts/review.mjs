import fs from 'node:fs/promises';
import path from 'node:path';
import {args,probe,run,main,number} from './common.mjs';
main(async()=>{
  const a=args();if(!a.input)throw new Error('--input VIDEO obrigatório');
  const input=path.resolve(a.input), out=path.resolve(a.out||'out/review');await fs.mkdir(out,{recursive:true});
  const p=probe(input),duration=Number(p.format.duration),ff=process.env.FFMPEG||'ffmpeg';
  run(ff,['-hide_banner','-loglevel','error','-n','-i',input,'-vf','fps=2,scale=320:-2,tile=6x5',path.join(out,'contact-%03d.jpg')]);
  run(ff,['-hide_banner','-loglevel','error','-n','-i',input,'-vf','fps=1,scale=360:-2,tile=5x3',path.join(out,'phone-%03d.jpg')]);
  const at=number(a.at,Math.min(4.1,Math.max(0,duration-.5)),0,duration,'at');
  run(ff,['-hide_banner','-loglevel','error','-n','-ss',String(at),'-i',input,'-vf','scale=240:-2,tile=12x1','-frames:v','1',path.join(out,'strip.jpg')]);
  run(ff,['-hide_banner','-loglevel','error','-n','-ss',String(Math.min(duration/2,1.5)),'-i',input,'-frames:v','1',path.join(out,'poster.png')]);
  if(a.loop)run(ff,['-hide_banner','-loglevel','error','-n','-stream_loop','1','-i',input,'-c','copy',path.join(out,'loop-check.mp4')]);
  console.log(`Revisão de toda a duração: ${out}. A inspeção visual e auditiva ainda é necessária.`);
});
