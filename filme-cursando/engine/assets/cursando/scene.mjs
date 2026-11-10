import {clamp,lerp,progress,spring,track} from '../../scripts/motion.mjs';
const canvas=document.getElementById('stage'),ctx=canvas.getContext('2d');
let W=1920,H=1080,V=false,short=false;
// Cores extraídas da home e dos tokens reais do site.
const c={paper:'#f5f9f6',ink:'#173f2e',green:'#02693e',accent:'#06a663',deep:'#075132',muted:'#53675d',line:'#dfe8e2'};
const fontStack="'Segoe UI',Manrope,Arial,sans-serif";
const images={};
const courses=await fetch('./courses.json').then(r=>r.json());
const narration=await fetch('./narration.json').then(r=>r.json());
const files=['logo.png','web-home.png','web-course.png','web-courses.png','mobile-home.png','mobile-course.png','mobile-module.png','mobile-exam.png','mobile-chat.png',...courses.map(c=>c.asset)];
window.ready=Promise.all(files.map(async file=>{const img=new Image();img.src='./'+file;await img.decode();images[file]=img;}));
const e=(t,start,d=.6)=>t>=start+2*d?1:clamp(spring((t-start)/d,{frequency:1.15,damping:1}));
function box(x,y,w,h,fill,r=0,stroke){ctx.beginPath();ctx.roundRect(x,y,w,h,r);if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=2;ctx.stroke();}}
function line(x,y,xx,yy,color=c.green,width=4){ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(xx,yy);ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap='round';ctx.stroke();}
function text(s,x,y,size=48,color=c.ink,weight=700,align='left'){ctx.font=`${weight} ${size}px ${fontStack}`;if(align==='center'){while(ctx.measureText(s).width>W-120&&size>18){size-=1;ctx.font=`${weight} ${size}px ${fontStack}`;}}ctx.fillStyle=color;ctx.textAlign=align;ctx.textBaseline='top';ctx.fillText(s,x,y);}
function wrap(s,x,y,width,size=40,color=c.ink,weight=600){const words=s.split(' ');let row='',yy=y;ctx.font=`${weight} ${size}px ${fontStack}`;for(const word of words){const next=row?row+' '+word:word;if(ctx.measureText(next).width>width&&row){text(row,x,yy,size,color,weight);yy+=size*1.27;row=word;}else row=next;}if(row)text(row,x,yy,size,color,weight);return yy+size*1.27;}
function reveal(s,x,y,size,t,start,color=c.ink,align='left'){const p=e(t,start);ctx.save();ctx.beginPath();ctx.rect(0,y-2,W,size*1.3);ctx.clip();text(s,x,y+(1-p)*size*1.3,size,color,800,align);ctx.restore();}
function pic(file,x,y,w,h,crop,r=0){const img=images[file];if(!img)return;ctx.save();ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.clip();if(crop){const [sx,sy,sw,sh]=crop;const scale=Math.min(w/sw,h/sh);const dw=sw*scale,dh=sh*scale;ctx.drawImage(img,sx,sy,sw,sh,x+(w-dw)/2,y+(h-dh)/2,dw,dh);}else{const scale=Math.max(w/img.width,h/img.height);const sw=w/scale,sh=h/scale;ctx.drawImage(img,(img.width-sw)/2,(img.height-sh)/2,sw,sh,x,y,w,h);}ctx.restore();}
function logo(x,y,size=58,light=false){const img=images['logo.png'];ctx.save();if(light)ctx.filter='brightness(0) invert(1)';ctx.drawImage(img,x,y,size*1.35,size*1.35);ctx.restore();text('Cursando',x+size*1.65,y+size*.12,size,light?'#fff':c.deep,800);}
function check(x,y,size=60,color='#fff'){line(x-size*.27,y,x-size*.04,y+size*.22,color,size*.08);line(x-size*.04,y+size*.22,x+size*.35,y-size*.25,color,size*.08);}
function title(lines,t,start=0){const size=V?100:116;const y=V?230:125;for(let i=0;i<lines.length;i++)reveal(lines[i],W/2,y+i*size*1.1,size,t,start+i*.1,i===lines.length-1?c.green:c.ink,'center');}
function screen(file,x,y,w,h,crop){box(x,y,w,h,'#fff',24,c.line);pic(file,x+2,y+2,w-4,h-4,crop,22);}
function pointer(x,y,t,start){const p=e(t,start,.3);ctx.save();ctx.translate(x,y);ctx.scale(p,p);ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(7,42);ctx.lineTo(18,28);ctx.lineTo(33,24);ctx.closePath();ctx.fillStyle=c.ink;ctx.fill();ctx.strokeStyle='#fff';ctx.lineWidth=3;ctx.stroke();if(t>start+.35&&t<start+.85){ctx.beginPath();ctx.arc(3,8,8+progress(t,start+.35,.5)*35,0,Math.PI*2);ctx.strokeStyle=c.green;ctx.lineWidth=3*(1-progress(t,start+.35,.5));ctx.stroke();}ctx.restore();}
function phone(file,x,y,w,t,scroll=0){const h=w*844/390;box(x-14,y-14,w+28,h+28,c.ink,52);pic(file,x,y,w,h,[0,0,390,844],40);box(x+w*.36,y+12,w*.28,20,c.ink,15);}
function card(index,x,y,w,t,start){const p=e(t,start);ctx.save();ctx.translate(0,(1-p)*90);ctx.globalAlpha=p;box(x,y,w,w*.94,'#fff',12,c.line);pic(courses[index].asset,x,y,w,w*9/16,null,12);wrap(courses[index].titulo,x+25,y+w*9/16+25,w-50,w*.059,c.ink,750);text('Ver curso  →',x+25,y+w*.83,w*.044,c.green,650);ctx.restore();}
function caption(t){if(short)return;const n=narration.find(n=>t>=n.start&&t<n.end);if(!n)return;const size=V?31:30,width=V?920:1320;ctx.font=`600 ${size}px ${fontStack}`;const words=n.text.split(' ');const rows=[];let row='';for(const word of words){const next=(row+' '+word).trim();if(ctx.measureText(next).width>width-56&&row){rows.push(row);row=word;}else row=next;}rows.push(row);const height=rows.length*size*1.4+30,y=H-(V?150:44)-height;box((W-width)/2,y,width,height,'#173f2ef2',12);rows.forEach((s,i)=>text(s,W/2,y+15+i*size*1.4,size,'#fff',500,'center'));}
function draw(t){
 ctx.setTransform(canvas.width/W,0,0,canvas.height/H,0,0);ctx.globalAlpha=1;ctx.filter='none';ctx.lineCap='round';ctx.lineJoin='round';ctx.clearRect(0,0,W,H);box(0,0,W,H,c.paper);
 // O container mantém a mesma trajetória ao mudar de estado.
 const bx=track(t,W/2-200,[{time:3,value:V?95:450},{time:6,value:V?250:670},{time:9,value:0},{time:12,value:V?60:190}],{frequency:2.5,damping:1});
 if(t<6){
   const sz=V?102:144,yy=V?640:280,departure=progress(t,2.65,.5);
   if(departure<1){ctx.save();ctx.globalAlpha=1-departure;ctx.translate(0,-departure*70);reveal('E se você',W/2,yy,sz,t,.12,c.ink,'center');reveal('começasse',W/2,yy+sz*1.14,sz,t,.38,c.ink,'center');reveal('hoje?',W/2,yy+sz*2.28,sz,t,.68,c.green,'center');ctx.restore();}
   const p=e(t,2.75,.8),w=lerp(340*e(t,.8),V?890:1020,p),h=lerp(4,160,p),x=(W-w)/2,y=lerp(yy+sz*3.48,V?800:430,p);
   box(x,y,w,h,p<.18?c.green:'#fff',lerp(2,20,p),p>.18?c.line:undefined);
   if(p>.7){ctx.beginPath();ctx.arc(x+53,y+73,19,0,Math.PI*2);ctx.strokeStyle=c.green;ctx.lineWidth=4;ctx.stroke();line(x+68,y+88,x+83,y+103,c.green,4);const typed='O que você quer aprender?'.slice(0,Math.floor(progress(t,3.55,1.2)*27));text(typed,x+110,y+51,V?37:48,c.ink,600);}
   if(t>=3)reveal('Sua curiosidade é o começo.',W/2,V?1080:700,V?49:52,t,4.3,c.ink,'center');
 }else if(t<9){
   title(['Um novo assunto.', 'Uma nova possibilidade.'],t,6);
   const y=V?630:465,w=V?420:450;
   const p=e(t,6,.65),firstX=V?80:215;box(lerp(V?95:450,firstX,p),lerp(V?800:430,y,p),lerp(V?890:1020,w,p),lerp(160,w*.94,p),'#fff',lerp(20,12,p),c.line);
   if(p>.8)card(0,firstX,y,w,t,6.1);
   if(V){card(1,570,y+110,w,t,6.3);card(2,330,y+490,w,t,6.55);}
   else [1,2].forEach(n=>card(n,215+n*505,y,w,t,6.1+n*.16));
   pointer(V?150:295,y+w*.83+15,t,7.6);
 }else if(t<12){
   const p=e(t,9,.75);box(lerp(V?80:215,0,p),lerp(V?630:465,0,p),lerp(V?420:450,W,p),lerp(V?395:423,H,p),c.green,lerp(22,0,p));
   if(t>9.45){ctx.save();ctx.translate((1-e(t,9.4))*W*.5,0);logo(W/2-(V?320:370),H/2-80,V?96:110,true);ctx.restore();reveal('Dê caminho à sua curiosidade.',W/2,H/2+110,V?43:54,t,10.05,'#fff','center');}
 }else if(t<15){
   if(V)title(['Seu próximo passo', 'começa aprendendo.'],t,12);
   else{reveal('Seu primeiro',120,290,100,t,12,c.ink);reveal('passo começa',120,405,100,t,12.1,c.ink);reveal('aprendendo.',120,520,100,t,12.2,c.green);}
   const y=V?680:285;screen('web-home.png',V?55:880,y,V?970:900,V?510:472,[0,60,1440,755]);
 }else if(t<18){
   reveal('UM CAMINHO ORGANIZADO',W/2,V?350:125,V?55:70,t,15,c.ink,'center');
   const y=V?650:300;screen('web-course.png',V?55:180,y,V?970:1560,V?600:610,[295,465,1110,440]);
   pointer(V?875:1655,y+(V?310:300),t,16.3);
 }else if(t<21){
   if(V)reveal('UMA ETAPA DE CADA VEZ',W/2,260,57,t,18,c.ink,'center');
   else{reveal('Uma etapa',140,320,112,t,18,c.ink);reveal('de cada vez.',140,455,112,t,18.15,c.green);}
   if(V)screen('mobile-module.png',70,570,940,920,[0,120,390,382]);else screen('mobile-module.png',1080,190,620,608,[0,120,390,382]);
 }else if(t<24){
   reveal('DÊ PLAY NA CURIOSIDADE.',W/2,V?350:100,V?62:80,t,21,c.ink,'center');
   const w=V?920:1260,h=w*9/16,x=(W-w)/2,y=V?780:320;
   pic(courses[0].asset,x,y,w,h,null,24);ctx.beginPath();ctx.arc(W/2,y+h/2,64,0,Math.PI*2);ctx.fillStyle=c.green;ctx.fill();ctx.beginPath();ctx.moveTo(W/2-13,y+h/2-27);ctx.lineTo(W/2+31,y+h/2);ctx.lineTo(W/2-13,y+h/2+27);ctx.fillStyle='#fff';ctx.fill();
   box(x,y+h+20,w,8,'#d5e7dc',5);box(x,y+h+20,w*progress(t,21,3),8,c.green,5);
 }else if(t<27){
   if(V)title(['Aprenda no seu ritmo.'],t,24);
   else{reveal('Sua rotina.',140,300,105,t,24,c.ink);reveal('Seu ritmo.',140,435,115,t,24.15,c.green);}
   const w=V?940:620,x=V?70:1050,y=V?680:240;
   screen('mobile-home.png',x,y,w,V?820:540,[0,420,390,340]);
 }else if(t<30){
   const p=e(t,27,.9),ww=lerp(V?970:900,V?535:300,p),hh=lerp(V?640:615,(V?535:300)*844/390,p),x=(W-ww)/2,y=V?470:220;
   reveal('NO SITE. NO APLICATIVO.',W/2,V?270:90,V?61:80,t,27,c.ink,'center');
   box(x-12,y-12,ww+24,hh+24,c.ink,lerp(22,52,p));screen(p>.5?'mobile-course.png':'web-course.png',x,y,ww,hh,p>.5?[0,0,390,844]:[290,150,1120,750]);
 }else if(t<33){
   const x=V?270:1050,y=V?450:130,w=V?540:330;
   if(V)screen('mobile-home.png',70,640,940,820,[0,420,390,340]);else screen('mobile-home.png',1050,240,620,540,[0,420,390,340]);
   if(!V){reveal('Continue',150,350,112,t,30,c.ink);reveal('de onde parou.',150,480,92,t,30.25,c.green);}else reveal('CONTINUE DE ONDE PAROU.',W/2,260,57,t,30,c.ink,'center');
 }else if(t<36){
   const w=V?540:330;phone('mobile-course.png',(W-w)/2,V?450:165,w,t);
   reveal('O PRÓXIMO PASSO É SEU.',W/2,V?260:70,V?62:75,t,33,c.ink,'center');
 }else if(t<39){
   reveal('SURGIU UMA DÚVIDA?',W/2,V?530:180,V?83:116,t,36,c.ink,'center');
   const p=e(t,36.5),ww=V?820:1050,y=V?800:440;box((W-ww)/2,y,ww,210,c.green,35);
   if(p>.7){text('Converse com seu professor.',W/2,y+78,V?42:52,'#fff',750,'center');}ctx.beginPath();ctx.moveTo(W/2+200,y+208);ctx.lineTo(W/2+240,y+260);ctx.lineTo(W/2+290,y+208);ctx.fillStyle=c.green;ctx.fill();
 }else if(t<42){
   const w=V?540:330;if(V)screen('mobile-chat.png',70,650,940,600,[0,0,390,250]);else screen('mobile-chat.png',1030,290,730,468,[0,0,390,250]);
   if(V)reveal('APRENDER TAMBÉM É TROCAR.',W/2,250,54,t,39,c.ink,'center');else{reveal('Uma conversa.',120,310,92,t,39,c.ink);reveal('Um novo olhar.',120,440,92,t,39.2,c.green);}
 }else if(t<45){
   if(V)title(['O que você aprendeu', 'ganha uma nova etapa.'],t,42);
   else{reveal('O que você',140,290,100,t,42,c.ink);reveal('aprendeu abre',140,410,100,t,42.1,c.ink);reveal('uma nova etapa.',140,530,100,t,42.2,c.green);}
   if(V)screen('mobile-exam.png',70,650,940,900,[0,0,390,374]);else screen('mobile-exam.png',1110,180,620,595,[0,0,390,374]);
 }else if(t<48){
   reveal('COLOQUE O CONHECIMENTO',W/2,V?510:180,V?59:78,t,45,c.ink,'center');reveal('À PROVA.',W/2,V?610:290,V?132:164,t,45.15,c.green,'center');
   const yy=V?990:650;ctx.beginPath();ctx.arc(W/2,yy,96*e(t,45.3),0,Math.PI*2);ctx.fillStyle=c.green;ctx.fill();if(t>45.7)check(W/2,yy,90);
   reveal('APROVAÇÃO NA PROVA FINAL',W/2,yy+160,V?40:48,t,46,c.deep,'center');
 }else if(t<51){
   const ww=V?910:1250,hh=V?620:540,x=(W-ww)/2,y=V?590:300;box(x,y,ww,hh,'#fff',20,'#cbdccf');
   logo(x+50,y+45,V?40:45);line(x+50,y+140,x+ww-50,y+140,c.line,2);
   reveal('Cada conquista',W/2,y+200,V?72:88,t,48,c.ink,'center');reveal('abre um caminho.',W/2,y+300,V?72:88,t,48.2,c.green,'center');
   text('Certificado do curso após aprovação.',W/2,y+hh-95,V?30:37,c.muted,600,'center');
 }else if(t<54){
   title(['Escolher.', 'Aprender. Avançar.'],t,51);
   const y=V?1050:650,xs=V?[180,540,900]:[410,960,1510];line(xs[0],y,xs[0]+(xs[2]-xs[0])*e(t,51.2,.9),y,c.green,5);
   xs.forEach((x,i)=>{const p=e(t,51.4+i*.2);ctx.beginPath();ctx.arc(x,y,45*p,0,Math.PI*2);ctx.fillStyle=c.green;ctx.fill();if(p>.7)check(x,y,38);text(['CURSO','AULA','CONQUISTA'][i],x,y+90,V?26:31,c.ink,700,'center');});
 }else {
   box(0,0,W,H,c.green);const size=V?95:128;const y=V?570:240;
   reveal('Dê caminho',W/2,y,size,t,54,'#fff','center');reveal('à sua',W/2,y+size*1.14,size,t,54.15,'#fff','center');reveal('curiosidade.',W/2,y+size*2.28,size,t,54.3,'#b9d8c8','center');
   if(t>=57){const p=e(t,57);box(0,0,W,H,c.deep);ctx.save();ctx.globalAlpha=p;logo(W/2-(V?330:390),V?680:330,V?96:116,true);const bw=V?750:850,by=V?1020:610;box((W-bw)/2,by,bw,V?125:110,'#fff',16);text('Explore nossos cursos  →',W/2,by+(V?33:25),V?44:48,c.green,650,'center');text('SITE E APLICATIVO',W/2,V?1220:800,V?30:31,'#b9d8c8',600,'center');ctx.restore();}
 }
 if(t>=12&&t<12.7){const p=e(t,12,.52);box(0,-H*p,W,H,c.green);}
 caption(t);
}
// Estes intervalos começam somente após as molas assentarem por completo.
// O renderer pode repetir o PNG exato durante um hold, mantendo 60 fps na saída.
const stillRegions=[[2.05,2.65],[5.6,6],[8.5,9],[11.3,12],[13.5,15],[17.2,18],[19.4,21],[25.4,27],[28.85,30],[31.5,33],[34.3,35.7],[35.7,36],[37.3,39],[40.5,42],[43.5,45],[47.3,48],[49.5,51],[53.1,54],[55.6,57],[58.3,59.9],[59.9,60]];
const shortSegments=[{start:0,end:3,source:0,speed:1},{start:3,end:7,source:12,speed:.75},{start:7,end:11,source:27,speed:.75},{start:11,end:15,source:54,speed:1.5}];
window.configure=async config=>{V=(config.height||1080)>(config.width||1920);W=V?1080:1920;H=V?1920:1080;short=!!config.short;canvas.width=config.width||W;canvas.height=config.height||H;await window.ready;await document.fonts.load('800 120px Manrope');await document.fonts.ready;window.renderCacheRanges=short?shortSegments.flatMap(segment=>stillRegions.map(([a,b])=>[Math.max(segment.start,segment.start+(a-segment.source)/segment.speed),Math.min(segment.end,segment.start+(b-segment.source)/segment.speed)]).filter(([a,b])=>b>a)):stillRegions;};
window.seek=time=>{const segment=short&&shortSegments.find(segment=>time<segment.end);const t=segment?segment.source+(time-segment.start)*segment.speed:time;draw(Math.min(59.999,t));};
