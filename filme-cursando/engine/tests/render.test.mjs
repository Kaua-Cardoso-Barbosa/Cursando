import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {serve} from '../scripts/server.mjs';
import {ROOT} from '../scripts/common.mjs';
test('mesmo frame após seek fora de ordem tem pixels idênticos nos três formatos',async()=>{
  const s=await serve(ROOT);const browser=await chromium.launch({headless:true});
  try {
    for(const [width,height] of [[640,360],[360,640],[480,480]]){
      const page=await browser.newPage({viewport:{width,height}}),errors=[];
      page.on('pageerror',e=>errors.push(e.message));
      await page.goto(s.url+'/assets/starter/index.html');
      await page.evaluate(async()=>{await window.ready;await document.fonts.ready;});
      for(const t of [1.4,3.8,6.3,8.8,10.9,13.2,17.9,21.8,23.5]){
        await page.evaluate(t=>window.seek(t),t);const first=await page.screenshot();
        await page.evaluate(()=>window.seek(22.75));
        await page.evaluate(t=>window.seek(t),t);assert.deepEqual(await page.screenshot(),first,`seek(${t}) ${width}x${height}`);
      }
      assert.deepEqual(errors,[]);await page.close();
    }
    const loop=await browser.newPage({viewport:{width:480,height:480}});
    await loop.goto(s.url+'/assets/morph/index.html');
    await loop.evaluate(async()=>{await window.ready;window.seek(0);});
    const initial=await loop.screenshot();
    await loop.evaluate(()=>window.seek(15.5));assert.deepEqual(await loop.screenshot(),initial,'hold final deve coincidir com inicial');
    await loop.evaluate(()=>window.seek(16));assert.deepEqual(await loop.screenshot(),initial,'emenda deve voltar ao primeiro frame');
    await loop.close();
  } finally {await browser.close();await s.close();}
});
