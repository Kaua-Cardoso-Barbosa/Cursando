import fs from 'node:fs/promises';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {args,main,run,number} from './common.mjs';
main(async()=>{
  const a=args();if(!a.music)throw new Error('--music WAV obrigatório');
  const out=path.resolve(a.out||'out/mix.wav'),duration=number(a.duration,24,.1,600,'duration');
  await fs.mkdir(path.dirname(out),{recursive:true});
  const ins=['-i',path.resolve(a.music)];let graph='[0:a]apad,atrim=duration='+duration+'[mix]';
  if(a.sfx){ins.push('-i',path.resolve(a.sfx));graph=`[0:a]volume=0.8[m];[1:a]volume=0.7[s];[m][s]amix=inputs=2:duration=longest:normalize=0,apad,atrim=duration=${duration}[mix]`;}
  if(a.voice){
    const voiceIndex=a.sfx?2:1;ins.push('-i',path.resolve(a.voice));
    graph=graph.replace('[mix]','[base]')+`;[base]volume=0.25[bed];[${voiceIndex}:a]apad,atrim=duration=${duration}[voice];[bed][voice]amix=inputs=2:duration=longest:normalize=0[mix]`;
  }
  // Controlar crest factor antes de normalizar evita pedir ganho impossível a
  // transientes muito curtos. Limiter final é posterior ao resample de saída.
  graph=graph.replace('[mix]','[premix]')+';[premix]acompressor=threshold=0.05:ratio=6:attack=2:release=80:makeup=2[mix]';
  const ff=process.env.FFMPEG||'ffmpeg';
  const first=spawnSync(ff,['-hide_banner',...ins,'-filter_complex',graph+';[mix]loudnorm=I=-14:TP=-3.5:LRA=11:print_format=json[n]','-map','[n]','-f','null','-'],{encoding:'utf8',windowsHide:true});
  if(first.error||first.status!==0)throw new Error(first.error?.message||first.stderr);
  const match=first.stderr.match(/\{\s*"input_i"[\s\S]*?\}/);
  if(!match)throw new Error('Medição de loudness ausente');
  const m=JSON.parse(match[0]);
  if(!Number.isFinite(Number(m.input_i)))throw new Error('Áudio silencioso; loudness indefinido');
  const filter=`loudnorm=I=-14:TP=-3.5:LRA=11:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true`;
  const safety='aresample=48000,alimiter=limit=0.65:level=false,loudnorm=I=-14:TP=-3.5:LRA=11,aresample=48000,alimiter=limit=0.65:level=false';
  run(ff,['-hide_banner','-loglevel','error','-n',...ins,'-filter_complex',graph+`;[mix]${filter},${safety}[n]`,'-map','[n]','-ar','48000','-c:a','pcm_s16le',out]);
  await fs.writeFile(out+'.measurement.json',JSON.stringify({targetLUFS:-14,targetDeliveryTruePeak:-1.5,internalHeadroomDBTP:-3.5,firstPass:m},null,2));
  console.log(out);
});
