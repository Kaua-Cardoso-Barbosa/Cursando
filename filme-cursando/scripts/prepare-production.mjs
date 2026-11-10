import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {plan} from '../engine/scripts/shotlist.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const definitions={
 '01':[{type:'thump',at:.65}],
 '02':[{type:'click',at:3.65},{type:'click',at:3.85},{type:'click',at:4.05}],
 '03':[{type:'pop',at:6.4},{type:'pop',at:6.7},{type:'click',at:7.95}],
 '04':[{type:'whoosh',at:9.05}],
 '05':[{type:'whoosh',at:12.05}],
 '06':[{type:'click',at:16.65}],
 '07':[{type:'pop',at:18.3}],
 '08':[{type:'click',at:21.3}],
 '10':[{type:'whoosh',at:27.1}],
 '13':[{type:'pop',at:36.7}],
 '15':[{type:'whoosh',at:42.1}],
 '16':[{type:'pop',at:45.7}],
 '18':[{type:'pop',at:51.6},{type:'pop',at:51.8},{type:'pop',at:52}],
 '19':[{type:'whoosh',at:54.05}],
 '20':[{type:'thump',at:57.1}],
};
const shotFile=path.join(root,'docs/shotlist.json');
const shots=JSON.parse(await fs.readFile(shotFile,'utf8')).map(s=>({...s,sfx:(definitions[s.id]||[]).map(f=>({...f,snap:false}))}));
await fs.writeFile(shotFile,JSON.stringify(shots,null,2)+'\n');
const report=plan(shots,{duration:60});
await fs.writeFile(path.join(root,'audio/cues.json'),JSON.stringify(report.cues,null,2));
await fs.writeFile(path.join(root,'out/shotlist-audit.json'),JSON.stringify(report,null,2));
await fs.writeFile(path.join(root,'docs/short-config.json'),JSON.stringify({short:true}));
const stamp=t=>{const ms=Math.round(t*1000);return `${String(Math.floor(ms/60000)).padStart(2,'0')}:${String(Math.floor(ms/1000)%60).padStart(2,'0')},${String(ms%1000).padStart(3,'0')}`;};
const clips=JSON.parse(await fs.readFile(path.join(root,'audio/roteiro.json'),'utf8'));
const subs=clips.map((c,i)=>`${i+1}\n${stamp(c.start)} --> ${stamp(c.end)}\n${c.text}`).join('\n\n');
await fs.writeFile(path.join(root,'out/cursando-roteiro.srt'),subs+'\n');
console.log(`${shots.length} cenas, ${report.cues.length} efeitos; ${report.issues.filter(i=>i.level==='error').length} erros na timeline.`);
