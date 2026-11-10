import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {args,main,number} from './common.mjs';
// Cap. 06/09/10 do artigo: "mostre a lista de estados no grid de beats antes de escrever código".
// Cada shot: {id,start,end,msg,sfx:[{type,at?}]}. Sem beats.json, só audita o ritmo.
export function nearest(list,t){let b=list[0];for(const x of list)if(Math.abs(x-t)<Math.abs(b-t))b=x;return b;}
export function plan(shots,{beats=[],tolerance=0.12,maxGap=4,hook=2,duration}={}){
  const issues=[],cues=[],rows=[];
  const sorted=[...shots].sort((a,b)=>a.start-b.start);
  sorted.forEach((s,i)=>{
    if(!(s.end>s.start))issues.push({shot:s.id,level:'error',msg:'end deve ser maior que start'});
    const prev=sorted[i-1];
    if(prev&&s.start<prev.end-1e-6)issues.push({shot:s.id,level:'warn',msg:`sobrepõe ${prev.id} (permitido só em morph/continuidade)`});
    if(prev&&s.start-prev.start>maxGap)issues.push({shot:s.id,level:'warn',msg:`${(s.start-prev.start).toFixed(1)} s sem novidade desde ${prev.id} (máx ${maxGap} s)`});
    let start=s.start,onBeat=null;
    if(beats.length){const b=nearest(beats,s.start);onBeat=Math.abs(b-s.start)<=tolerance;if(!onBeat)issues.push({shot:s.id,level:'info',msg:`início ${s.start}s está a ${(s.start-b).toFixed(3)}s do beat ${b}s; considere ${b}s ou justifique por voz/ação`});}
    for(const f of s.sfx||[]){
      let t=f.at??s.start;
      if(beats.length&&f.snap!==false)t=nearest(beats,t);
      cues.push({t:Math.round(t*1000)/1000,type:f.type});
    }
    rows.push({id:s.id,start:start,end:s.end,onBeat,msg:s.msg||''});
  });
  const first=sorted[0];
  if(first&&!(first.sfx?.length)&&!first.hook)issues.push({shot:first.id,level:'info',msg:`gancho: confirme que o primeiro take entrega algo marcante em ≤${hook} s`});
  if(duration&&sorted.length&&sorted.at(-1).end<duration-0.2)issues.push({shot:sorted.at(-1).id,level:'warn',msg:`shotlist termina em ${sorted.at(-1).end}s, antes de ${duration}s`});
  cues.sort((a,b)=>a.t-b.t);
  return {rows,issues,cues};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)main(async()=>{
  const a=args();if(!a.shotlist)throw new Error('--shotlist docs/shotlist.json obrigatório');
  const shots=JSON.parse(await fs.readFile(a.shotlist,'utf8'));
  let beats=[];
  if(a.beats){const b=JSON.parse(await fs.readFile(a.beats,'utf8'));beats=b.beats||[];if(!b.downbeats_confirmed)console.log('Aviso: downbeats não confirmados em '+a.beats+'; só beats foram usados.');}
  const r=plan(shots,{beats,tolerance:number(a.tolerance,0.12,0,1,'tolerance'),maxGap:number(a.gap,4,1,30,'gap'),duration:a.duration?number(a.duration,0,0.1,600,'duration'):undefined});
  for(const x of r.rows)console.log(`${x.id}\t${x.start}-${x.end}s\t${x.onBeat===null?'':x.onBeat?'no beat':'fora do beat'}\t${x.msg}`);
  for(const i of r.issues)console.log(`${i.level.toUpperCase()} ${i.shot}: ${i.msg}`);
  if(a.out){const out=path.resolve(a.out);await fs.mkdir(path.dirname(out),{recursive:true});await fs.writeFile(out,JSON.stringify(r.cues,null,1)+'\n',{flag:a.force?'w':'wx'});console.log(`${r.cues.length} cues em ${out} (use com npm run sfx -- --cues)`);}
  if(r.issues.some(i=>i.level==='error'))process.exitCode=1;
});
