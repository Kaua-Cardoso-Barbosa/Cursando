import fs from 'node:fs/promises';
import path from 'node:path';
import {args,main,number} from './common.mjs';
import {seeded} from './motion.mjs';
export function effects(cues,duration=24,rate=48000){
  const data=new Float64Array(Math.ceil(duration*rate));
  for(const [index,cue] of cues.entries()){
    if(!Number.isFinite(cue.t)||cue.t<0||cue.t>=duration)throw new Error('Cue fora da duração');
    if(!['click','pop','thump','whoosh'].includes(cue.type))throw new Error(`Efeito desconhecido: ${cue.type}`);
    const random=seeded(42+index), len={click:.05,pop:.15,thump:.5,whoosh:.35}[cue.type];
    for(let i=0;i<len*rate;i++){
      const t=i/rate, at=Math.round(cue.t*rate)+i;if(at>=data.length)break;
      let v=0;
      if(cue.type==='click')v=.35*Math.sin(2*Math.PI*1800*t)*Math.exp(-90*t);
      if(cue.type==='pop')v=.3*Math.sin(2*Math.PI*(600*t+450*t*t))*Math.exp(-30*t);
      if(cue.type==='thump')v=.6*Math.sin(2*Math.PI*(90*t-30*t*t))*Math.exp(-9*t);
      if(cue.type==='whoosh')v=.2*(random()*2-1)*Math.sin(Math.PI*t/len);
      data[at]+=v;
    }
  }
  const b=Buffer.alloc(44+data.length*2);b.write('RIFF');b.writeUInt32LE(b.length-8,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);
  b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(rate,24);b.writeUInt32LE(rate*2,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(data.length*2,40);
  for(let i=0;i<data.length;i++)b.writeInt16LE(Math.round(Math.max(-.98,Math.min(.98,data[i]))*32767),44+i*2);
  return b;
}
main(async()=>{
  const a=args();if(!a.cues)throw new Error('--cues JSON obrigatório');
  const cues=JSON.parse(await fs.readFile(path.resolve(a.cues),'utf8'));
  const out=path.resolve(a.out||'out/sfx.wav');await fs.mkdir(path.dirname(out),{recursive:true});
  await fs.writeFile(out,effects(cues,number(a.duration,24,.1,600,'duration')));console.log(out);
});
