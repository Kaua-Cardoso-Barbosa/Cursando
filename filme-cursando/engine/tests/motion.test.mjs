import test from 'node:test';
import assert from 'node:assert/strict';
import {spring,track,seeded,beatTime} from '../scripts/motion.mjs';
import {synth} from '../scripts/audio.mjs';
test('molas convergem nos três regimes e suportam seek fora de ordem',()=>{
  for(const damping of [.65,1,1.8]){
    assert.equal(spring(-1,{damping}),0);assert.equal(spring(0,{damping}),0);
    assert.ok(Math.abs(spring(20,{damping})-1)<1e-8);
    const value=spring(.312,{damping});spring(7,{damping});assert.equal(spring(.312,{damping}),value);
  }
});
test('track preserva posição e velocidade quando o alvo muda',()=>{
  const steps=[{time:0,value:100},{time:.4,value:-40},{time:.8,value:50}], e=1e-5;
  for(const t of [.4,.8]){
    const left=track(t-e,0,steps), middle=track(t,0,steps), right=track(t+e,0,steps);
    assert.ok(Math.abs(right-left)<.1);
    assert.ok(Math.abs((right-middle)/e-(middle-left)/e)<2);
  }
  assert.ok(Math.abs(track(20,0,steps)-50)<1e-8);
  assert.throws(()=>track(1,0,[{time:2,value:3},{time:1,value:5}]));
});
test('grid de beats e aleatoriedade são reproduzíveis',()=>{
  assert.equal(beatTime(8,120,.25),4.25);
  const a=seeded(9),b=seeded(9);for(let i=0;i<100;i++)assert.equal(a(),b());
});
test('WAV tem duração exata, PCM válido e bytes determinísticos',()=>{
  const a=synth({duration:.25,rate:48000}),b=synth({duration:.25,rate:48000});
  assert.equal(a.toString('ascii',0,4),'RIFF');assert.equal(a.readUInt32LE(24),48000);
  assert.equal(a.length,44+12000*2);assert.deepEqual(a,b);
});
