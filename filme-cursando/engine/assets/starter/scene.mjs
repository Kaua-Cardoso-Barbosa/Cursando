import {clamp,lerp,spring,smooth,progress,seeded,money} from '../../scripts/motion.mjs';
const canvas=document.querySelector('canvas'), ctx=canvas.getContext('2d');
let W=1920,H=1080;
let cfg={brand:'DIA EM DIA',green:'#079564',black:'#101714',red:'#d84a4d',background:'#ffffff',screen:null};
let screen=null;
// Todas as posições usam o espaço normalizado 1920x1080; retrato possui layout próprio.
window.configure=async({width=1920,height=1080,...config}={})=>{
  W=width;H=height;canvas.width=W;canvas.height=H;cfg={...cfg,...config};
  if(cfg.screen)await loadScreen(cfg.screen);
};
const C=()=>cfg.green;
function rect(x,y,w,h,color,r=0){ctx.fillStyle=color;ctx.beginPath();ctx.roundRect(x,y,w,h,Math.max(0,r));ctx.fill();}
function line(points,color,width=5){ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap='round';ctx.lineJoin='round';ctx.stroke();}
function text(value,x,y,size=80,color=cfg.black,align='center',weight=900){ctx.fillStyle=color;ctx.textAlign=align;ctx.textBaseline='middle';ctx.font=`${weight} ${size}px Arial, sans-serif`;const limit=W<=H?1000:1760;const measured=ctx.measureText(value).width;if(measured>limit)ctx.font=`${weight} ${size*limit/measured}px Arial, sans-serif`;ctx.fillText(value,x,y);}
function group(x,y,scale,rotation,fn){ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);ctx.rotate(rotation);fn();ctx.restore();}
function reveal(value,x,y,size,t,start,color=cfg.black,align='center'){
  const p=clamp(spring(t-start,{damping:1,frequency:3}));
  ctx.save();ctx.beginPath();ctx.rect(0,y-size*0.7,1920,size*1.4);ctx.clip();
  text(value,x,y+(1-p)*size*1.5,size,color,align);ctx.restore();
}
function dot(x,y,r,color){ctx.beginPath();ctx.arc(x,y,Math.max(0.01,r),0,Math.PI*2);ctx.fillStyle=color;ctx.fill();}
function arrow(x,y,scale=1){group(x,y,scale,0,()=>{line([[0,0],[300,0],[278,-12]],C(),8);});}
function bulb(x,y,scale=1,t=0){group(x,y,scale,0,()=>{
  ctx.beginPath();ctx.arc(0,-18,62,Math.PI*.2,Math.PI*2.8);ctx.strokeStyle=cfg.black;ctx.lineWidth=7;ctx.stroke();
  line([[-36,21],[-26,48],[26,48],[36,21]],cfg.black,7);
  line([[-23,60],[23,60]],cfg.black,7);line([[-15,74],[15,74]],cfg.black,7);
  line([[-12,40],[-12,-10],[0,2],[12,-10],[12,40]],C(),4);
  for(let i=0;i<9;i++){const a=Math.PI+Math.PI*i/8;line([[Math.cos(a)*86,Math.sin(a)*86-18],[Math.cos(a)*103,Math.sin(a)*103-18]],C(),4);}
});}
function box(x,y,scale=1){group(x,y,scale,0,()=>{rect(-70,-55,140,110,'#d6b47b',3);rect(-73,-60,146,22,'#ead0a2',2);rect(-8,-60,16,115,'#f4deb7');rect(26,10,36,24,'#fff');line([[30,16],[56,16]],'#95a99f',2);});}
function ticket(x,y,scale=1){group(x,y,scale,-.06,()=>{rect(-160,-65,320,130,C(),14);dot(-160,0,12,'white');dot(160,0,12,'white');text('EXTRA',-25,-12,38,'white');text('+ R$ 60',-25,32,29,'#c4f4de');line([[96,-50],[96,50]],'#a3dcca',2);});}
function calendar(t){const p=spring(t-.1,{damping:1});group(960,540,Math.max(.01,p),0,()=>{
  rect(-230,-235,460,470,'#f6faf8',24);rect(-230,-235,460,62,C(),15);text('OUTUBRO',-195,-205,28,'white','left');text('2026',200,-205,22,'white','right',500);
  for(let i=0;i<7;i++)text(['D','S','T','Q','Q','S','S'][i],-187+i*62,-135,22,'#708379');
  for(let i=0;i<31;i++)text(String(i+1),-187+(i%7)*62,-80+Math.floor(i/7)*62,26);
  const x=-187+6*62,y=-80+3*62;dot(x,y,23,`${C()}25`);text('28',x,y,26,C());
  if(t>1)arrow(960-1130,185,clamp((t-1)*2));
});}
function phone(x,y,t,scale=1){group(x,y,scale,0,()=>{
  rect(-181,-361,362,722,'#141d19',48);rect(-168,-347,336,694,'#fff',38);
  ctx.save();ctx.beginPath();ctx.roundRect(-168,-347,336,694,38);ctx.clip();
  if(screen)ctx.drawImage(screen,-168,-347,336,694);
  else{
    text('PROTÓTIPO FICTÍCIO',0,-290,20,C());text('Visão do dia',-142,-235,29,cfg.black,'left');
    rect(-147,-190,140,90,'#e8f5ef',12);rect(7,-190,140,90,'#fff0ef',12);
    text('RECEITAS',-77,-164,15,C());text('DESPESAS',77,-164,15,cfg.red);text('R$ 273',-77,-130,26,C());text('R$ 35',77,-130,26,cfg.red);
    rect(-147,-80,294,88,'#e8f5ef',12);text('SALDO',-125,-55,18,C(),'left');text('R$ 238,00',-125,-19,33,C(),'left');
    text('Evolução',-141,63,22,cfg.black,'left');
    for(let i=0;i<7;i++){const h=(55+i*19)*clamp(spring(t-.06*i,{damping:1}));rect(-135+i*40,248-h,22,h,C(),2);}
    rect(-168,292,336,55,C());for(let i=0;i<3;i++)dot(-100+i*100,317,9,'#c6eedc');
  }
  ctx.restore();rect(-65,-337,130,24,'#141d19',12);
});}
function truck(x,y,rotation=0){group(x,y,1,rotation,()=>{rect(-330,-170,450,170,'#f8fcfa',9);rect(-330,-25,450,20,C());rect(120,-165,145,165,C(),18);rect(155,-146,80,64,'#e2f4ea',10);rect(-330,5,605,18,cfg.black,4);[-240,-150,210].forEach(x=>{dot(x,30,39,cfg.black);dot(x,30,19,'#b9c5bf');});});}
function hook(t){
  if(W<=H){
    reveal('VOCÊ SABE',960,180,90,t,.1);reveal('QUANTO',960,360,170,t,.45);
    reveal('RENDEU',960,560,170,t,.65,C());reveal('O SEU DIA?',960,770,100,t,1.05);
    return;
  }
  reveal('VOCÊ SABE',960,330,70,t,.1);reveal('QUANTO RENDEU',960,455,132,t,.45);
  group(430,545,1,0,()=>arrow(0,0,clamp((t-.8)*2)*3.55));
  reveal('O SEU DIA?',960,650,76,t,1.05,C());
  const exit=progress(t,2.6,.4);if(exit){ctx.save();ctx.globalAlpha=exit;rect(0,0,1920,1080,'white');ctx.restore();}
}
const entries=[{label:'DIÁRIA',value:150,x:350,y:270,at:0},{label:'PACOTES',value:63,x:1570,y:270,at:.5},{label:'EXTRA',value:60,x:1570,y:700,at:1},{label:'A PAGAR',value:-35,x:350,y:700,at:1.5}];
function ledger(t){
  entries.forEach((e,i)=>{const p=spring(t-e.at,{damping:.9});if(p<=0)return;const x=W<=H?(i===0||i===3?700:1220):e.x;group(x,e.y,Math.max(.01,p),i===2?-.04:0,()=>{
    if(i===1)box(0,-60,.7);if(i===2)ticket(0,-60,.65);
    text(e.label,0,i===1||i===2?45:-20,48);text(money(e.value*clamp((t-e.at)*2)),0,i===1||i===2?100:40,42,e.value<0?cfg.red:C());
  });});
}
function chaos(t){
  ledger(3);const rnd=seeded(19), values=['150','+63','+60','−35','×42','1,50','?'];
  for(let i=0;i<24;i++){const a=rnd()*Math.PI*2+t*(i%2?1:-1)*1.7, r=80+rnd()*230;group(960+Math.cos(a)*r,540+Math.sin(a)*r*.7,1,a*.15,()=>text(values[i%values.length],0,0,28+i%3*8,i%4===0?cfg.red:C()));}
  const p=smooth(progress(t,1.3,.7));if(p>0){rect(0,0,1920,1080,`rgba(255,255,255,${p})`);text('?',960,530,300*p);}
}
function solution(t){
  const p=smooth(progress(t,.5,.65));dot(960,500,p*1300,C());
  bulb(960,240,.7);
  reveal(cfg.brand,960,500,118,t,.7,'white');reveal('Seu trabalho, em números claros.',960,655,43,t,1.05,'white');
}
function product(t){
  const portrait=W<=H;
  const label=t<1.3?'RECEITAS':t<2.6?'DESPESAS':t<4?'SALDO':'HISTÓRICO';
  const val=t<1.3?273:t<2.6?35:238;
  // Retrato: título acima e telefone central. Paisagem: duas colunas.
  const titleX=portrait?960:450,titleY=portrait?(W===H?-75:-170):440;
  const phoneX=portrait?960:1290,phoneY=portrait?670:550;
  reveal(label,titleX,titleY,portrait?74:88,t,0);
  text(t<4?money(val*clamp(t/.5)):'dia a dia',titleX,titleY+100,60,label==='DESPESAS'?cfg.red:C());
  const enter=spring(t,{damping:1});phone(phoneX,phoneY+100*(1-enter),t,portrait?(W===H?1.6:1.7):1.15);
}
function timeline(t){
  const portrait=W<=H, x0=portrait?600:390,y=portrait?380:540, step=portrait?165:250;
  box(x0-170,y,.65);const p=clamp(t/1.5);line([[x0,y],[x0+step*4*p,y]],C(),6);
  [150,63,60,-35].forEach((v,i)=>{if(t>i*.27){dot(x0+i*step,y,12,'white');line([[x0+i*step-6,y],[x0+i*step+6,y]],C(),4);text(`${v>0?'+':''}${v}`,x0+i*step,y+(i%2?65:-65),38,v<0?cfg.red:C());}});
  if(t>1.1){const x=portrait?960:1510,cy=portrait?710:y;dot(x,cy,75*clamp(spring(t-1.1)),C());line([[x-35,cy],[x-5,cy+30],[x+40,cy-35]],'white',11);reveal('R$ 238,00',x,cy+130,53,t,1.3,C());}
}
function outro(t){
  if(t<2){reveal('TUDO FICA',960,400,112,t,0);reveal('MAIS CLARO.',960,550,125,t,.25,C());}
  else if(t<3.6){const x=lerp(-400,2400,smooth(progress(t,2,1.6)));truck(x,650,-.02*Math.sin(t*8));}
  else{reveal(cfg.brand,960,480,116,t,3.6,C());reveal('Conheça uma rotina mais simples.',960,625,42,t,3.9);}
}
export function draw(t){
  ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,W,H);rect(0,0,W,H,cfg.background);
  // Retrato recompõe os elementos num espaço menos largo, sem cortar o render horizontal.
  if(W<=H){if(W===H){ctx.scale(W/1536,H/1536);ctx.translate(-192,228);}else{ctx.scale(W/1152,H/2048);ctx.translate(-384,484);}}else{ctx.scale(W/1920,H/1080);}
  if(t<3)hook(t);else if(t<5)calendar(t-3);else if(t<8)ledger(t-5);else if(t<10)chaos(t-8);
  else if(t<12)solution(t-10);else if(t<17)product(t-12);else if(t<19)timeline(t-17);else outro(t-19);
}
window.seek=t=>{if(!Number.isFinite(t)||t<0)throw new Error('Tempo inválido');draw(t);};
window.ready=Promise.resolve();
// Tela real opcional: defina assets/starter/screen.png e configure a URL antes de window.ready.
export async function loadScreen(url){screen=new Image();screen.src=url;await screen.decode();}
window.configure({width:innerWidth,height:innerHeight});window.seek(0);
