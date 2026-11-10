import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {chromium} from 'playwright';
import {fitCameraToObject,animationAt} from '../scripts/three-helpers.mjs';
import {serve} from '../scripts/server.mjs';
import {ROOT} from '../scripts/common.mjs';
test('câmera enquadra bounds 3D em retrato e paisagem',()=>{
  const object=new THREE.Mesh(new THREE.BoxGeometry(3,2,1));object.position.set(1,2,-1);
  for(const aspect of [16/9,9/16,1]){
    const camera=new THREE.PerspectiveCamera(40,aspect,.1,100);
    fitCameraToObject(camera,object);camera.updateMatrixWorld(true);
    const box=new THREE.Box3().setFromObject(object);
    for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z]){
      const p=new THREE.Vector3(x,y,z).project(camera);assert.ok(Math.abs(p.x)<1&&Math.abs(p.y)<1&&Math.abs(p.z)<1);
    }
  }
  object.geometry.dispose();
});
test('AnimationMixer usa tempo absoluto e recupera pose após seek reverso',()=>{
  const root=new THREE.Object3D(),clip=new THREE.AnimationClip('test',2,[new THREE.NumberKeyframeTrack('.position[x]',[0,1,2],[0,4,0])]);
  const animation=animationAt(root,[clip]);animation.seek(.5);const x=root.position.x;
  animation.seek(1.9);animation.seek(.5);assert.equal(root.position.x,x);assert.equal(x,2);animation.dispose();
});
test('WebGL2 desenha pixels determinísticos e carrega glTF local sem rede externa',async()=>{
  const s=await serve(ROOT),browser=await chromium.launch({headless:true});
  try{
    const page=await browser.newPage({viewport:{width:640,height:360}}),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.route('**/*',r=>r.request().url().startsWith(s.url+'/')?r.continue():r.abort());
    await page.goto(s.url+'/assets/three/index.html');await page.evaluate(async()=>await window.ready);
    await page.evaluate(()=>window.seek(2));const frame=await page.screenshot();
    await page.evaluate(()=>window.seek(6));await page.evaluate(()=>window.seek(2));
    assert.deepEqual(await page.screenshot(),frame);
    const stats=await page.evaluate(()=>window.threeStats);assert.equal(stats.revision,'187');assert.ok(stats.calls>0&&stats.triangles>100);
    const result=await page.evaluate(async()=>{
      const {loadModel,disposeTree}=await import('/scripts/three-helpers.mjs');
      const gltf=await loadModel('/assets/three/triangle.gltf');let vertices=0;
      gltf.scene.traverse(o=>{if(o.isMesh)vertices+=o.geometry.attributes.position.count;});
      disposeTree(gltf.scene);return vertices;
    });
    assert.equal(result,3);assert.deepEqual(errors,[]);
    await page.evaluate(()=>window.dispose());await page.close();
  }finally{await browser.close();await s.close();}
});
