import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {createVideoRenderer,addStudioLights,fitCameraToObject,labelTexture,loadModel,disposeTree} from '../../scripts/three-helpers.mjs';
import {spring,clamp,smooth,progress} from '../../scripts/motion.mjs';
const canvas=document.querySelector('canvas'),renderer=createVideoRenderer(canvas,{width:innerWidth,height:innerHeight});
const scene=new THREE.Scene();scene.background=new THREE.Color('#f5f8f5');
const camera=new THREE.PerspectiveCamera(38,innerWidth/innerHeight,.1,80);camera.position.set(0,3,10);camera.lookAt(0,.7,0);
addStudioLights(scene);
const floor=new THREE.Mesh(new THREE.PlaneGeometry(200,200),new THREE.MeshStandardMaterial({color:'#f5f8f5',roughness:1}));floor.rotation.x=-Math.PI/2;floor.position.y=-1.02;floor.receiveShadow=true;scene.add(floor);
const objects=new THREE.Group();scene.add(objects);
const green=new THREE.MeshStandardMaterial({color:'#079564',roughness:.35,metalness:.1});
const dark=new THREE.MeshStandardMaterial({color:'#14241d',roughness:.3,metalness:.3});
const cardboard=new THREE.MeshStandardMaterial({color:'#d3ae70',roughness:.85});
const tape=new THREE.MeshStandardMaterial({color:'#f3dcad',roughness:.8});
const parcel=new THREE.Group();const cube=new THREE.Mesh(new RoundedBoxGeometry(1.45,1.45,1.45,3,.06),cardboard);cube.castShadow=true;parcel.add(cube);
const ribbon=new THREE.Mesh(new THREE.BoxGeometry(.2,1.47,1.47),tape);ribbon.castShadow=true;parcel.add(ribbon);parcel.position.set(-2,-.25,0);objects.add(parcel);
const phone=new THREE.Group();const body=new THREE.Mesh(new RoundedBoxGeometry(1.6,3.15,.21,4,.14),dark);body.castShadow=true;phone.add(body);
const screenCanvas=document.createElement('canvas');screenCanvas.width=640;screenCanvas.height=1280;const g=screenCanvas.getContext('2d');
g.fillStyle='white';g.fillRect(0,0,640,1280);g.fillStyle='#079564';g.font='bold 39px Arial';g.fillText('PROTÓTIPO FICTÍCIO',36,115);
g.fillStyle='#101714';g.font='bold 49px Arial';g.fillText('Visão do dia',36,230);g.fillStyle='#e5f5ec';g.fillRect(36,300,568,190);
g.fillStyle='#079564';g.font='bold 28px Arial';g.fillText('SALDO',65,360);g.font='bold 62px Arial';g.fillText('R$ 238,00',65,440);
for(let i=0;i<7;i++){g.fillStyle='#079564';g.fillRect(45+i*78,1000-(120+i*45),48,120+i*45);}
g.fillStyle='#079564';g.fillRect(0,1140,640,140);
const texture=new THREE.CanvasTexture(screenCanvas);texture.colorSpace=THREE.SRGBColorSpace;
const display=new THREE.Mesh(new THREE.PlaneGeometry(1.43,2.91),new THREE.MeshBasicMaterial({map:texture,toneMapped:false}));display.position.z=.111;phone.add(display);phone.position.set(.2,.65,0);objects.add(phone);
const bars=new THREE.Group();const columns=[];
for(let i=0;i<5;i++){const mesh=new THREE.Mesh(new RoundedBoxGeometry(.35,1,.4,2,.05),green);mesh.castShadow=true;mesh.position.x=i*.48;columns.push(mesh);bars.add(mesh);}bars.position.set(1.6,-1,0);objects.add(bars);
const caption=new THREE.Mesh(new THREE.PlaneGeometry(3.4,.85),new THREE.MeshBasicMaterial({map:labelTexture('R$ 238,00',{color:'#079564'}),transparent:true,toneMapped:false,depthWrite:false}));caption.position.set(2.4,1.9,0);objects.add(caption);
let width=innerWidth,height=innerHeight,model=null;
window.configure=async({width:w=1920,height:h=1080,modelUrl=null}={})=>{
  width=w;height=h;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();
  if(modelUrl){const asset=await loadModel(modelUrl,{renderer});model=asset.scene;scene.add(model);objects.visible=false;fitCameraToObject(camera,model);}
  await renderer.compileAsync(scene,camera);
};
function draw(t){
  if(!model){
    const portrait=width<height;
    parcel.position.set(portrait?-1.4:-2,-.25+Math.sin(t*1.5)*.07,0);parcel.rotation.set(.04*Math.sin(t),t*.3,.05*Math.sin(t*.7));
    phone.position.set(portrait?0:.2,.65,0);phone.rotation.set(.035*Math.sin(t),-.23+.17*Math.sin(t*.65),-.04);
    const enter=Math.max(.001,spring(t-.15,{damping:1}));phone.scale.setScalar(enter);
    bars.position.x=portrait?1.1:1.6;bars.scale.setScalar(portrait?.7:1);
    columns.forEach((mesh,i)=>{const h=(.6+i*.35)*Math.max(.001,spring(t-.3-i*.12,{damping:.95}));mesh.scale.y=h;mesh.position.y=h/2;});
    caption.scale.setScalar(clamp(spring(t-1,{damping:1})));caption.position.x=portrait?0:2.4;caption.position.y=portrait?2.85:2;
    const distance=portrait?15:10,angle=.045*Math.sin(t*.6);camera.position.set(Math.sin(angle)*distance,3,Math.cos(angle)*distance);camera.lookAt(0,.65,0);
    camera.near=.1;camera.far=80;camera.updateProjectionMatrix();
  }
  renderer.render(scene,camera);
  window.threeStats={revision:THREE.REVISION,calls:renderer.info.render.calls,triangles:renderer.info.render.triangles,width,height};
}
window.seek=t=>{if(!Number.isFinite(t)||t<0)throw new Error('Tempo inválido');draw(t);};
window.dispose=()=>{disposeTree(scene);renderer.dispose();};
window.ready=window.configure({width:innerWidth,height:innerHeight}).then(()=>draw(0));
