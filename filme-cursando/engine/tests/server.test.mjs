import test from 'node:test';
import assert from 'node:assert/strict';
import {serve} from '../scripts/server.mjs';
import {ROOT} from '../scripts/common.mjs';
test('servidor estático só atende loopback, leitura e mesma origem',async()=>{
  const s=await serve(ROOT);
  try {
    assert.match(s.url,/127\.0\.0\.1/);
    assert.equal((await fetch(s.url+'/assets/starter/index.html')).status,200);
    assert.equal((await fetch(s.url+'/package.json',{headers:{Origin:'https://example.com'}})).status,403);
    assert.equal((await fetch(s.url+'/package.json',{method:'POST'})).status,405);
    assert.notEqual((await fetch(s.url+'/.gitignore')).status,200);
    assert.notEqual((await fetch(s.url+'/%2e%2e%2fpackage.json')).status,200);
  } finally {await s.close();}
});
