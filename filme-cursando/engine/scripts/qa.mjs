import fs from 'node:fs/promises';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {args,probe,run,number,main} from './common.mjs';
main(async()=>{
  const a=args();if(!a.input) throw new Error('--input VIDEO obrigatório');
  const input=path.resolve(a.input), p=probe(input), video=p.streams.find(s=>s.codec_type==='video'), audio=p.streams.find(s=>s.codec_type==='audio');
  const errors=[];
  if(!video) throw new Error('Sem vídeo');
  if(video.codec_name!=='h264' || video.pix_fmt!=='yuv420p') errors.push('Entrega deve ser H.264 yuv420p');
  const duration=Number(video.duration || p.format.duration);
  if(a.duration && Math.abs(duration-number(a.duration,24,0.1,600,'duration'))>0.1) errors.push('Duração divergente');
  if(a['require-audio'] && !audio) errors.push('Áudio ausente');
  if(audio && Math.abs(Number(audio.duration)-duration)>0.15) errors.push('Áudio/vídeo com duração divergente');
  for(const key of ['width','height']) if(a[key] && video[key]!==Number(a[key])) errors.push(`${key} divergente`);
  run(process.env.FFMPEG || 'ffmpeg',['-v','error','-xerror','-i',input,'-f','null','-']);
  let loudness=null;
  if(audio){
    const r=spawnSync(process.env.FFMPEG||'ffmpeg',['-hide_banner','-i',input,'-vn','-af','loudnorm=I=-14:TP=-1.5:print_format=json','-f','null','-'],{encoding:'utf8',windowsHide:true});
    if(r.error||r.status!==0)throw new Error(r.error?.message||r.stderr);
    const match=r.stderr.match(/\{\s*"input_i"[\s\S]*?\}/);
    if(!match)throw new Error('Sem medição de loudness');
    const m=JSON.parse(match[0]);loudness={integratedLUFS:Number(m.input_i),truePeakDBTP:Number(m.input_tp),rangeLU:Number(m.input_lra)};
    if(a['check-loudness'] && (!Number.isFinite(loudness.integratedLUFS)||Math.abs(loudness.integratedLUFS+14)>.8||loudness.truePeakDBTP>-1))errors.push('Loudness fora da tolerância (-14±0,8 LUFS; pico ≤-1 dBTP)');
  }
  delete p.format.filename;
  const report={passed:errors.length===0,errors,video:{width:video.width,height:video.height,fps:video.avg_frame_rate,frames:video.nb_frames,duration},audio:audio?{codec:audio.codec_name,rate:audio.sample_rate,channels:audio.channels,loudness}:null,visualReview:'REQUIRES_HUMAN_OR_VISION_REVIEW'};
  const out=path.resolve(a.out || 'out/qa.json');await fs.mkdir(path.dirname(out),{recursive:true});await fs.writeFile(out,JSON.stringify(report,null,2));
  console.log(JSON.stringify(report,null,2));if(errors.length) process.exitCode=1;
});
