import {chromium} from 'playwright';
import fs from 'node:fs/promises';
import {REVISION} from 'three';
import {run,main} from './common.mjs';
main(async()=>{
  if(Number(process.versions.node.split('.')[0])<22) throw new Error('Node.js 22+ necessário');
  console.log('Node',process.versions.node);
  console.log('Three.js r'+REVISION);
  for(const cmd of [process.env.FFMPEG || 'ffmpeg',process.env.FFPROBE || 'ffprobe']) console.log(run(cmd,['-version']).split('\n')[0]);
  await fs.access(chromium.executablePath());
  const browser=await chromium.launch({headless:true});
  console.log('Chromium',browser.version());await browser.close();
  console.log('Pronto para renderizar. Nenhum serviço pago necessário.');
});
