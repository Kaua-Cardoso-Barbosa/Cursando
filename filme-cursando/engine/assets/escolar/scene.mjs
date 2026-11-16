import {clamp,progress,spring,lerp} from '../../scripts/motion.mjs';
const ctx=document.querySelector('canvas').getContext('2d'),canvas=ctx.canvas;
const timeline=await fetch('./timeline.json').then(r=>r.json());
const geometry=await fetch('./player-geometry.json').then(r=>r.json());
const courses=await fetch('./catalogo.json').then(r=>r.json());
const examResult=await fetch('./prova-depois.json').then(r=>r.json());
let W=1920,H=1080,V=false;
const c={paper:'#f5f9f6',ink:'#173f2e',green:'#02693e',light:'#c6e4d2',deep:'#075132',line:'#dfe8e2',muted:'#53675d'};
const images={};
const files=['web-home.png','web-catalog.png','web-course.png','web-modules.png','web-lessons.png','web-player.png','web-progress.png','web-chat.png','web-exam.png','web-approved.png','mobile-course.png','mobile-module.png','mobile-exam.png','certificate.png','capa-blender.png','capa-python.png','capa-fotografia.png','logo.png',...Array.from({length:240},(_,i)=>`frames/${String(i+1).padStart(4,'0')}.jpg`)];
window.ready=Promise.all(files.map(async f=>{const im=new Image();im.src='./'+f;await im.decode();images[f]=im;}));
const e=(t,start,d=.5)=>t>=start+2*d?1:clamp(spring((t-start)/d,{frequency:1.15,damping:1}));
function box(x,y,w,h,fill,r=0,stroke){ctx.beginPath();ctx.roundRect(x,y,w,h,r);if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.lineWidth=2;ctx.strokeStyle=stroke;ctx.stroke();}}
function text(s,x,y,size=60,color=c.ink,weight=700,align='left',max=W-140){ctx.textAlign=align;ctx.textBaseline='top';ctx.font=`${weight} ${size}px 'Segoe UI',Manrope,sans-serif`;while(ctx.measureText(s).width>max&&size>16){size--;ctx.font=`${weight} ${size}px 'Segoe UI',Manrope,sans-serif`;}ctx.fillStyle=color;ctx.fillText(s,x,y);}
function reveal(s,x,y,size,t,start,color=c.ink,align='left',max=W-140){ctx.save();ctx.beginPath();ctx.rect(0,y-4,W,size*1.5);ctx.clip();text(s,x,y+(1-e(t,start))*size*1.4,size,color,750,align,max);ctx.restore();}
function pic(file,x,y,w,h,crop,r=18){const im=images[file];if(!im)return;const [sx,sy,sw,sh]=crop||[0,0,im.width,im.height],scale=Math.min(w/sw,h/sh),dw=sw*scale,dh=sh*scale;ctx.save();ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.clip();ctx.drawImage(im,sx,sy,sw,sh,x+(w-dw)/2,y+(h-dh)/2,dw,dh);ctx.restore();}
function panel(file,x,y,w,h,crop){box(x,y,w,h,'#fff',18,c.line);pic(file,x+2,y+2,w-4,h-4,crop);}
function brand(x,y,size=90,light=false){ctx.save();ctx.drawImage(images['logo.png'],x,y,size*1.35,size*1.35);ctx.restore();text('Cursando',x+size*1.65,y+size*.1,size,light?'#fff':c.green,750);}
function heading(lines,t,start){lines.forEach((s,i)=>reveal(s,W/2,(V?225:100)+i*(V?106:115),V?88:100,t,start+i*.1,i===lines.length-1?c.green:c.ink,'center'));}
function page(file,t,start,{crop,heading:head}={}){const im=images[file];const ratio=crop?crop[2]/crop[3]:im.width/im.height;if(V){if(head)heading(head,t,start);const w=940,h=Math.min(900,w/ratio);panel(file,70,620+(900-h)/2+(1-e(t,start))*55,w,h,crop);}else{if(head)head.forEach((line,i)=>reveal(line,110,320+i*125,98,t,start+i*.1,i===head.length-1?c.green:c.ink,'left',680));const w=960,h=Math.min(680,w/ratio);panel(file,850,220+(680-h)/2+(1-e(t,start))*55,w,h,crop);}}
function check(x,y){ctx.beginPath();ctx.moveTo(x-44,y);ctx.lineTo(x-10,y+35);ctx.lineTo(x+55,y-40);ctx.strokeStyle='#fff';ctx.lineWidth=12;ctx.lineCap='round';ctx.stroke();}
function subtitle(t){const sub=timeline.subtitles.find(s=>t>=s.start&&t<s.end);if(!sub)return;const w=V?940:1400,size=V?37:36;ctx.font=`600 ${size}px 'Segoe UI'`;const rows=[];let row='';for(const word of sub.text.split(' ')){const next=(row+' '+word).trim();if(ctx.measureText(next).width>w-60&&row){rows.push(row);row=word;}else row=next;}rows.push(row);const h=rows.length*size*1.32+32,y=H-(V?145:50)-h;box((W-w)/2,y,w,h,'#173f2ef5',12);rows.forEach((s,i)=>text(s,W/2,y+16+i*size*1.32,size,'#fff',600,'center',w-45));}
function draw(t){ctx.setTransform(canvas.width/W,0,0,canvas.height/H,0,0);ctx.globalAlpha=1;ctx.filter='none';ctx.lineCap='round';ctx.clearRect(0,0,W,H);box(0,0,W,H,c.paper);
 const shot=timeline.shots.find(s=>t>=s.start&&t<s.end)||timeline.shots.at(-1),s=shot.start,u=t-s;
 switch(shot.id){
 case 'pergunta':reveal('Aprender.',W/2,V?600:275,V?130:160,t,.12,c.ink,'center');reveal('Com mais clareza.',W/2,V?780:465,V?90:125,t,.5,c.green,'center');box(W/2-180,V?950:650,360*e(t,.9),5,c.green,3);break;
 case 'marca':box(0,0,W,H,c.green);const p=e(t,s,.65);ctx.save();ctx.translate(0,(1-p)*100);brand(W/2-(V?330:400),H/2-100,V?96:118,true);ctx.restore();reveal('Alunos. Professores. Conhecimento.',W/2,H/2+130,V?43:60,t,s+.5,'#fff','center');break;
 case 'home':if(V)heading(['Site e aplicativo.', 'Uma mesma proposta.'],t,s);else{reveal('Aprendizado',120,280,110,t,s);reveal('conectado.',120,420,110,t,s+.15,c.green);}panel('web-home.png',V?60:880,V?670:235,V?960:920,V?640:590,[0,0,1440,900]);break;
 case 'catalogo':heading(['O que você quer', 'aprender hoje?'],t,s);courses.slice(0,3).forEach((course,i)=>{const w=V?440:480,x=V?[60,580,320][i]:160+i*560,y=V?[610,820,1150][i]:430;ctx.save();ctx.translate(0,(1-e(t,s+i*.12))*80);box(x,y,w,w*.75,'#fff',14,c.line);pic(course.asset,x,y,w,w*9/16,null,12);text(['Criação 3D','Programação','Fotografia'][i],x+22,y+w*9/16+25,V?28:31,c.ink,700,'left',w-44);ctx.restore();});break;
 case 'curso':page('web-course.png',t,s,{heading:['Um exemplo.', 'Criação em três dimensões.'],crop:[290,90,1120,800]});break;
 case 'modulos':page('web-modules.png',t,s,{heading:['Conteúdo organizado.', 'Um passo de cada vez.'],crop:[300,125,1100,600]});break;
 case 'aulas':if(V)page('mobile-module.png',t,s,{heading:['Aulas na ordem certa.'],crop:[0,100,390,650]});else page('web-lessons.png',t,s,{heading:['Aulas na ordem certa.'],crop:[290,140,1120,740]});break;
 case 'player':{
 if(V)heading(['Assista. Entenda.', 'Coloque em prática.'],t,s);else{reveal('Assista. Entenda.',W/2,65,90,t,s,c.ink,'center');reveal('Coloque em prática.',W/2,170,90,t,s+.1,c.green,'center');}
 const p=geometry.player;
 const frame=`frames/${String(Math.min(240,Math.floor((t-s)*30)+1)).padStart(4,'0')}.jpg`;
 if(V){const x=60,y=620,w=960,h=540;box(x,y,w,h,c.deep,15);pic(frame,x,y,w,h,null,12);text('Extrusão e criação de volumes',W/2,1200,40,c.green,700,'center');panel('web-player.png',70,1300,940,285,[1075,865,325,120]);text('Blender Foundation · CC-BY 4.0',W/2,1600,25,c.muted,500,'center');}
 else{const x=80,y=310,w=1080,h=607.5;box(x,y,w,h,c.deep,15);pic(frame,x,y,w,h,null,12);panel('web-player.png',1240,310,590,607.5,[1070,630,330,357]);text('Blender Foundation / Blender Studio · CC-BY 4.0',100,925,19,c.muted,500,'left',1100);}
 break;}
 case 'progresso':if(V)page('mobile-module.png',t,s,{heading:['Seu progresso', 'fica registrado.'],crop:[0,100,390,650]});else{reveal('Continue de',130,300,105,t,s);reveal('onde parou.',130,435,105,t,s+.1,c.green);panel('mobile-module.png',1070,190,630,650,[0,100,390,405]);}break;
 case 'mobile':{if(V)heading(['A jornada continua', 'no aplicativo.'],t,s);else{reveal('A jornada continua',130,320,100,t,s,c.ink,'left',800);reveal('no aplicativo.',130,450,100,t,s+.1,c.green,'left',800);}const w=V?500:320,h=w*844/390,x=V?(W-w)/2:1190,y=V?490:155;box(x-14,y-14,w+28,h+28,c.ink,46);pic('mobile-module.png',x,y,w,h,null,34);break;}
 case 'chat':page('web-chat.png',t,s,{heading:['Uma dúvida.', 'Um canal de conversa.'],crop:[660,95,740,690]});break;
 case 'prova':page(V?'mobile-exam.png':'web-exam.png',t,s,{heading:['Conhecimento', 'colocado à prova.'],crop:V?[15,286,360,300]:[300,550,900,440]});break;
 case 'resultado':if(V){heading(['Uma aprovação', 'registrada pelo sistema.'],t,s);reveal('Aprovado',W/2,700,125,t,s+.1,c.green,'center');text(`${examResult.envio.acertos} de ${examResult.envio.total_questoes} acertos · ${examResult.envio.nota}%`,W/2,875,58,c.ink,700,'center');panel('web-approved.png',70,1060,940,340,[300,550,900,325]);}else page('web-approved.png',t,s,{heading:['Uma aprovação', 'registrada pelo sistema.'],crop:[300,550,900,440]});break;
 case 'certificado':heading(['Cada etapa', 'tem seu reconhecimento.'],t,s);panel('certificate.png',V?60:350,V?660:370,V?960:1220,V?680:490);break;
 case 'jornada':heading(['Uma experiência', 'que conecta.'],t,s);const xs=V?[190,540,890]:[420,960,1500],y=V?1040:660;ctx.beginPath();ctx.moveTo(xs[0],y);ctx.lineTo(lerp(xs[0],xs[2],progress(t,s+.6,4)),y);ctx.strokeStyle=c.green;ctx.lineWidth=5;ctx.stroke();xs.forEach((x,i)=>{const start=s+.5+i*1.7;ctx.beginPath();ctx.arc(x,y,43*e(t,start),0,Math.PI*2);ctx.fillStyle=c.green;ctx.fill();if(t>start+.8){ctx.save();ctx.translate(x,y);ctx.scale(.45,.45);check(0,0);ctx.restore();}reveal(['Organização','Acompanhamento','Comunicação'][i],x,y+100,V?26:35,t,start+.2,c.ink,'center',V?330:480);});break;
 default:box(0,0,W,H,c.deep);brand(W/2-(V?330:400),V?650:320,V?96:118,true);reveal('Conheça o projeto.',W/2,V?980:620,V?65:75,t,s+.1,'#fff','center');text('SITE E APLICATIVO · PROJETO ESCOLAR',W/2,V?1130:760,V?25:28,c.light,600,'center');break;
 }
 subtitle(t);
}
window.configure=async config=>{V=config.height>config.width;W=V?1080:1920;H=V?1920:1080;canvas.width=config.width||W;canvas.height=config.height||H;await window.ready;await document.fonts.load('750 120px Manrope');await document.fonts.ready;
 // Reutilizar somente pausas exatas, separadas em cada troca de legenda.
 window.renderCacheRanges=timeline.shots.filter(s=>!['player','jornada'].includes(s.id)&&s.end>s.start+1.7).flatMap(s=>{
  const a=s.start+(s.id==='pergunta'?2:1.7),b=s.end;
  const bounds=[a,b,...timeline.subtitles.flatMap(c=>[c.start,c.end]).filter(t=>t>a&&t<b)].sort((a,b)=>a-b);
  return bounds.slice(0,-1).map((t,i)=>[t+.001,bounds[i+1]-.001]).filter(([a,b])=>b-a>.04);
 });
};
window.seek=t=>draw(Math.min(timeline.duration-.001,Math.max(0,t)));
