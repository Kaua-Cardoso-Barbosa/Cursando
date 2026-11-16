import path from 'node:path';
import {spawnSync} from 'node:child_process';
const root=path.resolve('filme-cursando'),ff=path.resolve('ferramentas/ffmpeg/bin/ffmpeg.exe');
for(const format of ['horizontal','vertical']){
 const file=path.join(root,`out/escolar/animatic-${format}.mp4`);
 for(const [vf,out,ss] of [['fps=1/3,scale=320:-2,tile=5x4',`animatic-contact-${format}.jpg`,null],['scale=240:-2,tile=12x1',`animatic-strip-${format}.jpg`,'25.05']]){
  const args=['-hide_banner','-loglevel','error','-n',...(ss?['-ss',ss]:[]),'-i',file,'-vf',vf,...(ss?['-frames:v','1']:[]),path.join(root,'out/escolar',out)];
  const result=spawnSync(ff,args,{encoding:'utf8',windowsHide:true});if(result.status)throw Error(result.stderr);
 }
}
console.log('Contatos e transicoes dos dois animatics preparados.');
