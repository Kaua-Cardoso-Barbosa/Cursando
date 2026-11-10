import {chromium} from 'playwright';
import fs from 'node:fs/promises';
import net from 'node:net';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {args,main,number} from './common.mjs';
// Cap. 04: "reúna logo, telas e cores da URL do produto e liste". Só lê a URL que o usuário informou.
export function checkUrl(raw,{allowLocal=false}={}){
  const u=new URL(raw);
  if(!['http:','https:'].includes(u.protocol))throw new Error('Apenas http(s)');
  const h=u.hostname.replace(/^\[|\]$/g,'');
  const priv=h==='localhost'||h.endsWith('.localhost')||h.endsWith('.local')||(net.isIP(h)&&/^(127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|::1$|f[cd])/i.test(h));
  if(priv&&!allowLocal)throw new Error('Host local/privado bloqueado; use --allow-local só para seu próprio app');
  return u;
}
const slug=s=>s.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,40)||'asset';
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)main(async()=>{
  const a=args();if(!a.url)throw new Error('--url https://produto.com obrigatório');
  const u=checkUrl(a.url,{allowLocal:!!a['allow-local']});
  const out=path.resolve(a.out||'assets/brand');await fs.mkdir(out,{recursive:true});
  const maxImages=number(a['max-images'],12,0,40,'max-images');
  const browser=await chromium.launch({headless:true});
  const inventory={source:u.href,retrievedAt:new Date().toISOString(),licenseNote:'Não verificada: confirme direitos de uso antes de publicar.',screens:[],images:[],colors:[],fonts:[],meta:{}};
  try{
    for(const [name,vp,mobile] of [['desktop',{width:1440,height:900},false],['mobile',{width:390,height:844},true]]){
      const ctx=await browser.newContext({viewport:vp,deviceScaleFactor:1,isMobile:mobile,serviceWorkers:'block'});
      const page=await ctx.newPage();
      await page.goto(u.href,{waitUntil:'networkidle',timeout:45000}).catch(()=>{});
      await page.evaluate(()=>document.fonts?.ready);
      const file=path.join(out,`screen-${name}.png`);
      await page.screenshot({path:file,fullPage:false});
      inventory.screens.push({file:path.basename(file),viewport:vp});
      if(name==='desktop'){
        const d=await page.evaluate(()=>{
          const abs=s=>{try{return new URL(s,location.href).href}catch{return null}};
          const m=n=>document.querySelector(`meta[property="${n}"],meta[name="${n}"]`)?.content||null;
          const imgs=[...document.images].map(i=>({src:i.currentSrc||i.src,alt:i.alt,w:i.naturalWidth,h:i.naturalHeight,logo:/logo|brand/i.test(i.className+i.id+i.alt+i.src)})).filter(i=>i.src&&i.w>=48);
          const icons=[...document.querySelectorAll('link[rel~="icon"],link[rel="apple-touch-icon"]')].map(l=>({src:abs(l.href),alt:'icon',w:0,h:0,logo:true}));
          const cnt={},fonts={};
          for(const el of [...document.querySelectorAll('body *')].slice(0,1500)){
            const cs=getComputedStyle(el);
            for(const c of [cs.color,cs.backgroundColor]){if(c&&!/rgba\(0, 0, 0, 0\)|transparent/.test(c))cnt[c]=(cnt[c]||0)+1;}
            const f=cs.fontFamily.split(',')[0].replace(/["']/g,'').trim();fonts[f]=(fonts[f]||0)+1;
          }
          const top=o=>Object.entries(o).sort((x,y)=>y[1]-x[1]).slice(0,8).map(([k,v])=>({value:k,count:v}));
          return {title:document.title,description:m('description'),ogImage:abs(m('og:image')||''),themeColor:m('theme-color'),imgs:[...icons,...imgs],colors:top(cnt),fonts:top(fonts)};
        });
        inventory.meta={title:d.title,description:d.description,themeColor:d.themeColor};
        inventory.colors=d.colors;inventory.fonts=d.fonts;
        const urls=[...new Map([...(d.ogImage?[{src:d.ogImage,alt:'og:image',logo:false}]:[]),...d.imgs].map(i=>[i.src,i])).values()].sort((x,y)=>(y.logo-x.logo)).slice(0,maxImages);
        let n=0;
        for(const i of urls){
          try{
            const r=await ctx.request.get(i.src,{timeout:15000});
            const body=await r.body();const type=r.headers()['content-type']||'';
            if(!r.ok()||!/^image\//.test(type)||body.length>8e6)continue;
            const ext=(type.split('/')[1]||'bin').split(/[+;]/)[0].replace('svg','svg').replace('jpeg','jpg');
            const name=`${String(++n).padStart(2,'0')}-${slug(i.alt||path.basename(new URL(i.src).pathname))}.${ext}`;
            await fs.writeFile(path.join(out,name),body);
            inventory.images.push({file:name,from:i.src,alt:i.alt,kind:i.logo?'logo/ícone provável':'imagem',bytes:body.length});
          }catch{}
        }
      }
      await ctx.close();
    }
  } finally {await browser.close();}
  const inv=path.join(out,'inventory.json');
  await fs.writeFile(inv,JSON.stringify(inventory,null,2),'utf8');
  console.log(`${inventory.screens.length} telas, ${inventory.images.length} imagens, ${inventory.colors.length} cores e ${inventory.fonts.length} fontes em ${out}\nInventário: ${inv}\nConfirme logo, texto aprovado e licenças com o usuário; screenshots de página pública não substituem capturas autorizadas do app.`);
});
