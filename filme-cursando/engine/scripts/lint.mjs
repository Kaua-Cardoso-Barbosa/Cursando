import fs from 'node:fs/promises';
import path from 'node:path';
import {args,ROOT,main} from './common.mjs';
// Regras do artigo (cap. 01/06/07): seek(t) puro, sem relógio, sem transições CSS, sem will-change em texto escalado.
export const RULES=[
  {id:'random',level:'error',re:/Math\.random\s*\(/,msg:'Math.random quebra seek aleatório; use seeded(seed) recriado no draw'},
  {id:'clock',level:'error',re:/\b(Date\.now|performance\.now|new Date)\s*\(/,msg:'Relógio real no caminho de render; use apenas t'},
  {id:'timer',level:'error',re:/\b(setTimeout|setInterval)\s*\(/,msg:'Timers não são determinísticos; derive tudo de t'},
  {id:'raf',level:'error',re:/\brequestAnimationFrame\s*\(/,msg:'requestAnimationFrame só em preview protegido por ?preview, nunca no render'},
  {id:'css-transition',level:'error',re:/\b(transition|animation)\s*:|@keyframes/,msg:'CSS transitions/animations não são controladas por seek(t)'},
  {id:'will-change',level:'warn',re:/will-change/,msg:'will-change em conteúdo ampliado pela câmera borra o texto'},
  {id:'default-gradient',level:'warn',re:/linear-gradient\([^)]*\)[^;]*;?[\s\S]{0,80}text-align\s*:\s*center/,msg:'Possível título centralizado sobre gradiente (padrão banido)'},
  {id:'glow',level:'warn',re:/shadowBlur\s*=\s*([2-9]\d|\d{3,})|box-shadow:[^;]*0\s+0\s+\d{2,}px/,msg:'Glow forte em UI; o artigo lista glow como marca de vídeo genérico'}
];
export function lintSource(text,{preview=true}={}){
  const out=[];
  const lines=text.split(/\r?\n/);
  for(const r of RULES){
    lines.forEach((l,i)=>{
      const code=l.replace(/\/\/.*$/,'');
      if(r.re.test(code)){
        // preview com guarda explícita é permitido para raf/timer
        if(preview&&['raf','timer'].includes(r.id)&&/preview|navigator\.webdriver/.test(lines.slice(Math.max(0,i-3),i+1).join('\n')))return;
        out.push({rule:r.id,level:r.level,line:i+1,msg:r.msg});
      }
    });
  }
  return out;
}
async function files(p){
  const st=await fs.stat(p);
  if(st.isFile())return [p];
  const all=[];
  for(const e of await fs.readdir(p,{withFileTypes:true})){
    if(['node_modules','.git','out','.venv'].includes(e.name))continue;
    const f=path.join(p,e.name);
    if(e.isDirectory())all.push(...await files(f));else if(/\.(html|mjs|js)$/.test(e.name))all.push(f);
  }
  return all;
}
import {pathToFileURL} from 'node:url';
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)main(async()=>{
  const a=args(),target=path.resolve(a.input||path.join(ROOT,'assets/starter'));
  const list=await files(target);let errors=0,warns=0,seek=false;
  for(const f of list){
    const text=await fs.readFile(f,'utf8');
    seek||=/window.seeks*=/.test(text);
    if(/(^|[\/])(motion|three-helpers).mjs$/.test(f))continue;
    for(const x of lintSource(text)){console.log(`${x.level.toUpperCase()} ${path.relative(process.cwd(),f)}:${x.line} [${x.rule}] ${x.msg}`);x.level==='error'?errors++:warns++;}
  }
  if(!seek){console.log('ERROR nenhum arquivo define window.seek = ...');errors++;}
  console.log(`${list.length} arquivos; ${errors} erros, ${warns} avisos. Lint estático não substitui ver os frames.`);
  if(errors)process.exitCode=1;
});
