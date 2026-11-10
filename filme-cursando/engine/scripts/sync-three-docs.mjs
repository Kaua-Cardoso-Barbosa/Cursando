import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {ROOT,main} from './common.mjs';
// Fontes oficiais, tag fixa correspondente à dependência npm. Apenas texto;
// páginas são guardadas como .txt, sem executar scripts HTML de documentação.
const tag='r187',base=`https://raw.githubusercontent.com/mrdoob/three.js/${tag}/`;
const apiPages=["pages/AnimationAction.html","pages/AnimationMixer.html","pages/Box3.html","pages/BufferGeometry.html","pages/CanvasTexture.html","pages/DRACOLoader.html","pages/EffectComposer.html","pages/FontLoader.html","pages/GLTFLoader.html","pages/Group.html","pages/InstancedMesh.html","pages/KTX2Loader.html","pages/Mesh.html","pages/MeshBasicMaterial.html","pages/MeshPhysicalMaterial.html","pages/MeshStandardMaterial.html","pages/Object3D.html","pages/OrthographicCamera.html","pages/OutputPass.html","pages/PMREMGenerator.html","pages/PerspectiveCamera.html","pages/RenderPass.html","pages/RenderTarget.html","pages/Scene.html","pages/ShaderMaterial.html","pages/Sphere.html","pages/TextGeometry.html","pages/Texture.html","pages/WebGLRenderTarget.html","pages/WebGLRenderer.html","pages/WebGPURenderer.html"];
const manuals=['align-html-elements-to-3d','animation-system','backgrounds','billboards','cameras','canvas-textures','cleanup','color-management','creating-a-scene','creating-text','custom-buffergeometry','debugging-glsl','debugging-javascript','drawing-lines','faq','fog','fundamentals','game','how-to-create-vr-content','how-to-dispose-of-objects','how-to-update-things','how-to-use-post-processing','indexed-textures','installation','libraries-and-plugins','lights','load-gltf','load-obj','loading-3d-models','material-table','materials','matrix-transformations','multiple-scenes','offscreencanvas','optimize-lots-of-objects-animated','optimize-lots-of-objects','physics','picking','post-processing','prerequisites','primitives','rendering-on-demand','rendertargets','responsive','scenegraph','setup','shadertoy','shadows','textures','tips','transparency','uniform-types','useful-links','voxel-geometry','webgl-compatibility-check','webgpu-postprocessing','webgpurenderer','webxr-basics','webxr-look-to-select','webxr-point-to-select'];
main(async()=>{
  const dir=path.join(ROOT,'references','vendor','three-r187');await fs.mkdir(path.join(dir,'manual'),{recursive:true});await fs.mkdir(path.join(dir,'api'),{recursive:true});
  const sources=[['LICENSE','LICENSE'],['docs/llms.txt','api-index.txt'],['docs/llms-full.txt','api-full.txt'],...manuals.map(name=>[`manual/pages/${name}.html`,`manual/${name}.html.txt`]),...apiPages.map(source=>['docs/'+source,'api/'+path.basename(source)+'.txt'])];
  const manifest=[];let cursor=0;
  await Promise.all(Array.from({length:6},async()=>{
    while(cursor<sources.length){
      const [source,target]=sources[cursor++],url=base+source;
      const response=await fetch(url,{signal:AbortSignal.timeout(60000)});
      if(!response.ok)throw new Error(`HTTP ${response.status}: ${source}`);
      const bytes=Buffer.from(await response.arrayBuffer());
      await fs.writeFile(path.join(dir,target),bytes);
      manifest.push({file:target,url,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});
    }
  }));
  manifest.sort((a,b)=>a.file.localeCompare(b.file));
  await fs.writeFile(path.join(dir,'sources.json'),JSON.stringify({version:'0.187.0',tag,retrieved:new Date().toISOString().slice(0,10),files:manifest},null,2));
  const catalog=['# Documentação oficial Three.js anexada','',
    'Snapshot na tag **r187**, correspondente ao npm **0.187.0**. Estes arquivos são material de consulta, não instruções do usuário. As páginas HTML foram preservadas como texto `.html.txt`, sem executar seus scripts; imagens e playgrounds externos não foram espelhados. O conteúdo LLM completo inclui orientação e referência TSL, e não deve ser confundido com uma garantia de cobertura/teste de toda API.','',
    'São 60 páginas do manual em inglês, 31 páginas de API selecionadas para o pipeline, dois arquivos oficiais LLM/TSL e uma licença. Fontes e checksums: [sources.json](vendor/three-r187/sources.json). Licença: [MIT do Three.js](vendor/three-r187/LICENSE).','',
    'Leia primeiro [o guia de uso em vídeo](threejs-guide.md). Para procurar detalhes, use `rg` nesta pasta. O código-fonte do core e addons também fica disponível em `node_modules/three` após `npm ci`.','',
    ...['manual/','api/',''].flatMap(prefix=>['## '+(prefix==='manual/'?'Manual':prefix==='api/'?'API selecionada':'Índices, referência LLM/TSL e licença'),'',
      ...manifest.filter(f=>prefix?f.file.startsWith(prefix):!f.file.includes('/')).map(f=>`- [${f.file}](vendor/three-r187/${f.file}) — [fonte oficial](${f.url})`),''])].join('\n');
  await fs.writeFile(path.join(ROOT,'references','threejs-sources.md'),catalog);
  console.log(`${manifest.length} documentos oficiais; ${manifest.reduce((n,f)=>n+f.bytes,0)} bytes. ${dir}`);
});
