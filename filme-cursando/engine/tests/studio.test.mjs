import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {lintSource} from '../scripts/lint.mjs';
import {plan,nearest} from '../scripts/shotlist.mjs';
import {checkUrl} from '../scripts/gather-assets.mjs';
import {ROOT} from '../scripts/common.mjs';
test('lint pega relógio, aleatoriedade, transições e preview protegido',()=>{
  const bad=lintSource('const x=Math.random();\nsetTimeout(f,1);\n.a{transition: all .3s}\nDate.now()');
  assert.deepEqual(bad.map(x=>x.rule).sort(),['clock','css-transition','random','timer']);
  assert.equal(lintSource('if(!navigator.webdriver){\nrequestAnimationFrame(loop);}').length,0);
  assert.equal(lintSource('requestAnimationFrame(loop)').length,1);
});
test('templates do pacote passam no lint',()=>{
  for(const d of ['assets/starter','assets/morph','assets/three']){
    const r=spawnSync(process.execPath,['scripts/lint.mjs','--input',d],{cwd:ROOT,encoding:'utf8'});
    assert.equal(r.status,0,r.stdout+r.stderr);
  }
});
test('shotlist ajusta SFX ao beat e acusa lacunas',()=>{
  assert.equal(nearest([0,.5,1],.62),.5);
  const r=plan([{id:'A',start:0,end:2,sfx:[{type:'thump'}]},{id:'B',start:2.05,end:9,sfx:[{type:'pop',at:2.2}]},{id:'C',start:9,end:10}],{beats:[0,.5,1,1.5,2,2.5],duration:12});
  assert.deepEqual(r.cues,[{t:0,type:'thump'},{t:2,type:'pop'}]);
  assert.ok(r.issues.some(i=>i.shot==='C'&&/sem novidade/.test(i.msg)));
  assert.ok(r.issues.some(i=>/antes de 12s/.test(i.msg)));
});
test('gather bloqueia hosts locais e protocolos não http',()=>{
  assert.throws(()=>checkUrl('file:///etc/passwd'));
  assert.throws(()=>checkUrl('http://127.0.0.1:3000'));
  assert.throws(()=>checkUrl('http://192.168.0.1'));
  assert.equal(checkUrl('http://localhost:3000',{allowLocal:true}).port,'3000');
  assert.equal(checkUrl('https://example.com').hostname,'example.com');
});
test('new cria estrutura de projeto sem sobrescrever',async()=>{
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'mvs-'));
  const run=()=>spawnSync(process.execPath,['scripts/new.mjs','--dir',dir],{cwd:ROOT,encoding:'utf8'});
  assert.equal(run().status,0);
  await fs.writeFile(path.join(dir,'docs/brief.md'),'meu');
  assert.equal(run().status,0);
  assert.equal(await fs.readFile(path.join(dir,'docs/brief.md'),'utf8'),'meu');
  await fs.access(path.join(dir,'docs/review_log.md'));await fs.access(path.join(dir,'refs'));
  await fs.rm(dir,{recursive:true,force:true});
});
