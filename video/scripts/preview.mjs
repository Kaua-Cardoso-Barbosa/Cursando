import { bundle } from '@remotion/bundler';
import { renderStill, selectComposition } from '@remotion/renderer';
import path from 'node:path';
const serveUrl = await bundle({ entryPoint: path.resolve('src/index.tsx'), publicDir: path.resolve('public') });
for (const [id, frame, output] of [['CursandoLandscape', 250, 'out/revisao-horizontal.png'], ['CursandoVertical', 450, 'out/revisao-vertical.png'], ['CursandoVertical', 1700, 'out/revisao-final.png']]) {
  const composition = await selectComposition({ serveUrl, id });
  await renderStill({ composition, serveUrl, frame, output });
  console.log(output);
}
