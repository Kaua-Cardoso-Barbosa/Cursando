// Revisão pontual: renderizar somente os GOPs que contêm a marca.
// O miolo (7,1–55,8667 s) e todos os pacotes de áudio são copiados.
import fs from 'node:fs/promises';
import path from 'node:path';
import {spawn} from 'node:child_process';
const root=path.resolve('filme-cursando'),engine=path.join(root,'engine');
const out=path.join(root,'out/escolar'),work=path.join(out,'logo-corrigida');
const ffmpeg=path.resolve('ferramentas/ffmpeg/bin/ffmpeg.exe');
const ffprobe=path.resolve('ferramentas/ffmpeg/bin/ffprobe.exe');
const run=(cmd,args,cwd=root)=>new Promise((resolve,reject)=>{
 const p=spawn(cmd,args,{cwd,windowsHide:true,env:{...process.env,FFMPEG:ffmpeg,FFPROBE:ffprobe}});let stdout='',stderr='';
 p.stdout.on('data',b=>{stdout+=b;if(cmd===process.execPath)process.stdout.write(b);});
 p.stderr.on('data',b=>stderr+=b);p.on('error',reject);p.on('close',code=>code===0?resolve(stdout):reject(Error(stderr||stdout)));
});
const exists=f=>fs.access(f).then(()=>true,()=>false);
await fs.mkdir(work,{recursive:true});
const report={change:'Removido filtro monocromático; imagem original do site, sem alterações.',formats:[]};
for(const format of ['horizontal','vertical']){
 const original=path.join(work,`original-${format}.mp4`),final=path.join(out,`cursando-pitch-escolar-${format}.mp4`);
 if(!await exists(original))await fs.copyFile(final,original);
 for(const [name,start,duration] of [['abertura',0,7.1],['encerramento',3352/60,248/60]]){
  const file=path.join(work,`${format}-${name}.mp4`);
  if(!await exists(file))await run(process.execPath,['scripts/render.mjs','--page','assets/escolar/index.html','--format',format==='horizontal'?'16:9':'9:16','--start',String(start),'--duration',String(duration),'--fps','60','--sub','4','--canvas-average','--out',file],engine);
 }
 const middle=path.join(work,`${format}-miolo.mp4`);
 await run(ffmpeg,['-v','error','-y','-ss','7.1','-i',original,'-map','0:v:0','-an','-frames:v','2926','-c:v','copy',middle]);
 const list=path.join(work,`${format}-concat.txt`);
 await fs.writeFile(list,`file '${format}-abertura.mp4'\nduration 7.1\nfile '${format}-miolo.mp4'\nduration ${2926/60}\nfile '${format}-encerramento.mp4'\nduration ${248/60}\n`);
 const patched=path.join(work,`${format}-imagem.mp4`);
 await run(ffmpeg,['-v','error','-y','-f','concat','-safe','0','-i',list,'-map','0:v:0','-c:v','copy','-movflags','+faststart',patched]);
 const candidate=path.join(work,`${format}-final.mp4`);
 await run(ffmpeg,['-v','error','-y','-i',patched,'-i',original,'-map','0:v:0','-map','1:a:0','-c','copy','-movflags','+faststart',candidate]);
 const probe=JSON.parse(await run(ffprobe,['-v','error','-show_streams','-show_format','-of','json',candidate]));
 if(probe.streams.find(s=>s.codec_type==='video').nb_frames!=='3600')throw Error('Quantidade inesperada de frames');
 await run(ffmpeg,['-v','error','-xerror','-i',candidate,'-f','null','-']);
 const packets=async(file,stream)=>JSON.parse(await run(ffprobe,['-v','error','-select_streams',stream,'-show_packets','-show_data_hash','sha256','-show_entries','packet=pts_time,data_hash','-of','json',file])).packets;
 const oldAudio=await packets(original,'a:0'),newAudio=await packets(candidate,'a:0');
 if(JSON.stringify(oldAudio)!==JSON.stringify(newAudio))throw Error('Áudio alterado');
 const mid=p=>p.filter(p=>Number(p.pts_time)>=7.1&&Number(p.pts_time)<3352/60).map(p=>p.data_hash);
 const oldVideo=mid(await packets(original,'v:0')),newVideo=mid(await packets(candidate,'v:0'));
 // O concat inclui SPS/PPS nos keyframes. Comparar também pixels decodificados
 // para não confundir cabeçalhos do contêiner com alterações da imagem.
 const frameHashes=async file=>(await run(ffmpeg,['-v','error','-ss','7.1','-i',file,'-map','0:v:0','-an','-frames:v','2926','-f','framemd5','-'])).split('\n').filter(s=>s&&!s.startsWith('#')).map(s=>s.split(',').at(-1).trim());
 const oldFrames=await frameHashes(original),newFrames=await frameHashes(candidate);
 if(oldVideo.length!==2926||newVideo.length!==2926||oldFrames.length!==2926||JSON.stringify(oldFrames)!==JSON.stringify(newFrames))throw Error('Miolo não preservado');
 await fs.copyFile(candidate,final);
 await fs.copyFile(patched,path.join(out,`master-${format}-imagem.mp4`));
 await run(ffmpeg,['-v','error','-y','-ss','58.2','-i',final,'-frames:v','1','-q:v','2',path.join(out,`poster-${format}.jpg`)]);
 await run(ffmpeg,['-v','error','-y','-ss','5.5','-i',final,'-frames:v','1',path.join(work,`${format}-revisao.png`)]);
 report.formats.push({format,frames:3600,duration:60,audioPacketsUnchanged:oldAudio.length,decodedFramesUnchanged:oldFrames.length,unmodifiedInterval:[7.1,3352/60]});
 console.log(`Logo corrigida: ${format}; áudio e ${oldFrames.length} quadros do miolo idênticos.`);
}
await fs.writeFile(path.join(work,'verificacao.json'),JSON.stringify(report,null,2));
