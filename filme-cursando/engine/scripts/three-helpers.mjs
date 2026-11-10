import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {DRACOLoader} from 'three/addons/loaders/DRACOLoader.js';
import {KTX2Loader} from 'three/addons/loaders/KTX2Loader.js';

export function createVideoRenderer(canvas,{width=1920,height=1080,alpha=false}={}){
  const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha,preserveDrawingBuffer:true,powerPreference:'high-performance'});
  renderer.setPixelRatio(1);renderer.setSize(width,height,false);
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;
  return renderer;
}
export function fitCameraToObject(camera,object,{padding=1.3,direction=new THREE.Vector3(0,.15,1)}={}){
  object.updateWorldMatrix(true,true);
  const box=new THREE.Box3().setFromObject(object),sphere=box.getBoundingSphere(new THREE.Sphere());
  if(!Number.isFinite(sphere.radius)||sphere.radius<=0)throw new Error('Objeto sem volume válido');
  const vfov=THREE.MathUtils.degToRad(camera.fov),hfov=2*Math.atan(Math.tan(vfov/2)*camera.aspect);
  const distance=sphere.radius/Math.sin(Math.min(vfov,hfov)/2)*padding;
  camera.position.copy(sphere.center).add(direction.clone().normalize().multiplyScalar(distance));
  camera.near=Math.max(.01,distance-sphere.radius*2);camera.far=distance+sphere.radius*4;
  camera.lookAt(sphere.center);camera.updateProjectionMatrix();
  return {center:sphere.center,radius:sphere.radius,distance};
}
export function addStudioLights(scene){
  const hemi=new THREE.HemisphereLight(0xffffff,0x9dafaa,1.7);scene.add(hemi);
  const key=new THREE.DirectionalLight(0xffffff,3);key.position.set(-3,7,5);key.castShadow=true;
  key.shadow.mapSize.set(1024,1024);Object.assign(key.shadow.camera,{left:-7,right:7,top:7,bottom:-7,near:.5,far:25});
  key.shadow.bias=-.0003;scene.add(key);
  const rim=new THREE.DirectionalLight(0xd4ffe9,1.3);rim.position.set(4,3,-4);scene.add(rim);
  return {hemi,key,rim};
}
export async function loadModel(url,{renderer,dracoPath,ktx2Path,meshoptDecoder}={}){
  const loader=new GLTFLoader();let draco,ktx2;
  if(dracoPath){draco=new DRACOLoader();draco.setDecoderPath(dracoPath);loader.setDRACOLoader(draco);}
  if(ktx2Path){if(!renderer)throw new Error('KTX2 requer renderer');ktx2=new KTX2Loader().setTranscoderPath(ktx2Path).detectSupport(renderer);loader.setKTX2Loader(ktx2);}
  if(meshoptDecoder)loader.setMeshoptDecoder(meshoptDecoder);
  try{return await loader.loadAsync(url);}finally{draco?.dispose();ktx2?.dispose();}
}
export function animationAt(root,clips,index=0){
  if(!clips[index])throw new Error('Clip de animação inexistente');
  const mixer=new THREE.AnimationMixer(root),action=mixer.clipAction(clips[index]);
  return {mixer,seek(t){action.reset().play();mixer.setTime(t);},dispose(){mixer.stopAllAction();mixer.uncacheRoot(root);}};
}
export async function imageTexture(url){
  const texture=await new THREE.TextureLoader().loadAsync(url);texture.colorSpace=THREE.SRGBColorSpace;return texture;
}
export function labelTexture(text,{color='#101714',background=null,width=1024,height=256,font='900 100px Arial'}={}){
  const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
  const g=canvas.getContext('2d');if(background){g.fillStyle=background;g.fillRect(0,0,width,height);}
  g.font=font;g.fillStyle=color;g.textAlign='center';g.textBaseline='middle';g.fillText(text,width/2,height/2,width*.92);
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;return texture;
}
// Use apenas para recursos de propriedade desta cena, nunca shared assets vivos.
export function disposeTree(root){
  const geometries=new Set(),materials=new Set(),textures=new Set();
  root.traverse(o=>{if(o.geometry)geometries.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material])if(m){materials.add(m);for(const v of Object.values(m))if(v?.isTexture)textures.add(v);}});
  textures.forEach(t=>t.dispose());materials.forEach(m=>m.dispose());geometries.forEach(g=>g.dispose());
}
