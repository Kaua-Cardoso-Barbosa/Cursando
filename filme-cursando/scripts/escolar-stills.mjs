import fs from 'node:fs/promises';
import path from 'node:path';
import {spawn} from 'node:child_process';
const root=path.resolve('filme-cursando');const timeline=JSON.parse(await fs.readFile(path.join(root,'engine/assets/escolar/timeline.json'),'utf8'));
const round=process.argv[2]||'1',format=process.argv[3]||'16:9',name=format==='16:9'?'horizontal':'vertical';
const times=timeline.shots.flatMap(s=>[s.start+Math.min(.35,(s.end-s.start)/4),(s.start+s.end)/2,s.end-.15]).map(n=>n.toFixed(3)).join(',');
const args=['scripts/render.mjs','--stills','--page','assets/escolar/index.html','--duration','60','--format',format,'--scale','.5','--times',times,'--out',`../out/escolar/revisao-${round}-${name}`];
const proc=spawn(process.execPath,args,{cwd:path.join(root,'engine'),stdio:'inherit',windowsHide:true});
proc.on('exit',code=>process.exit(code||0));
