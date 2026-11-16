import fs from 'node:fs/promises';
import path from 'node:path';
import {plan} from '../engine/scripts/shotlist.mjs';
const root=path.resolve('filme-cursando'),dir=path.join(root,'engine/assets/escolar');
await fs.mkdir(path.join(root,'docs/escolar'),{recursive:true});
const segments=JSON.parse(await fs.readFile(path.join(root,'audio/alinhamento-escolar.json'),'utf8'));
const words=segments.flatMap(s=>s.words||[]);
for(const word of words){
 if(/^tornaram$/i.test(word.text))word.text='tornar o';
 if(/^cur[çs]ando[,\.]?$/i.test(word.text))word.text='Cursando.';
}
const normalize=s=>s.toLocaleLowerCase('pt-BR').normalize('NFD').replace(/\p{Diacritic}/gu,'').replace(/[^a-z0-9]/g,'');
function phrase(text,fallback){const wanted=text.split(' ').map(normalize);for(let i=0;i<words.length-wanted.length;i++){if(wanted.every((w,j)=>normalize(words[i+j].text)===w))return words[i].start;}return fallback;}
const marker={catalog:phrase('no catalogo',12),example:phrase('vamos acompanhar',16),lesson:phrase('na pagina da aula',25.15),progress:phrase('o progresso',33),chat:phrase('se surgir',39),exam:phrase('as provas',42),approved:phrase('com a aprovacao',46),ending:phrase('um projeto',51),cta:phrase('conheca o projeto',55.86)};
const end=Math.max(60,Math.ceil((words.at(-1)?.end||57)+2));
const rows=[
 ['pergunta',0,3.7,'Aprendizado mais organizado'],['marca',3.7,7.1,'Alunos, professores e conhecimento'],['home',7.1,marker.catalog,'Site e aplicativo'],
 ['catalogo',marker.catalog,marker.example,'Escolha um curso'],['curso',marker.example,marker.example+3,'Um percurso de criacao 3D'],
 ['modulos',marker.example+3,marker.lesson-2.5,'Tres modulos, quatro aulas em cada'],['aulas',marker.lesson-2.5,marker.lesson,'Aulas na ordem certa'],
 ['player',marker.lesson,marker.progress,'Uma explicacao de verdade'],['progresso',marker.progress,marker.progress+2.8,'Continue de onde parou'],
 ['mobile',marker.progress+2.8,marker.chat,'A mesma jornada no aplicativo'],['chat',marker.chat,marker.exam,'Aluno e professor, mais perto'],
 ['prova',marker.exam,marker.approved,'Conhecimento colocado a prova'],['resultado',marker.approved,marker.approved+2.5,'Aprovacao registrada'],
 ['certificado',marker.approved+2.5,marker.ending,'Uma etapa reconhecida'],['jornada',marker.ending,marker.cta,'Organizacao, acompanhamento e comunicacao'],['final',marker.cta,end,'Conheca o projeto'],
].filter(r=>r[2]>r[1]);
const shots=rows.map(([id,start,end,msg],i)=>({id,start,end,msg,sfx:[{type:i%4===0?'whoosh':'pop',at:start+.12,snap:false}]}));
const subtitles=[];
for(const segment of segments){for(let i=0;i<segment.words.length;i+=8){const group=segment.words.slice(i,i+8);subtitles.push({start:group[0].start,end:group.at(-1).end+.06,text:group.map(w=>w.text).join(' ')});}}
await fs.writeFile(path.join(dir,'timeline.json'),JSON.stringify({duration:end,shots,subtitles,marker},null,2));
await fs.writeFile(path.join(root,'docs/escolar/shotlist.json'),JSON.stringify(shots,null,2));
const audit=plan(shots,{duration:end});await fs.writeFile(path.join(root,'audio/escolar-cues.json'),JSON.stringify(audit.cues,null,2));
console.log(JSON.stringify({duration:end,marker,shots:shots.length,issues:audit.issues},null,2));
