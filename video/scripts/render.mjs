import path from 'node:path';
import fs from 'node:fs/promises';
import { bundle } from '@remotion/bundler';
import { renderMedia, renderStill, selectComposition, ensureBrowser } from '@remotion/renderer';
import { execFileSync } from 'node:child_process';
const ffmpeg = path.resolve('../ferramentas/ffmpeg/bin/ffmpeg.exe');
await fs.mkdir('out', { recursive: true });
// O corte curto recebe a trilha original, com começo e final próprios.
execFileSync(ffmpeg, ['-y', '-i', 'public/audio/music.wav', '-t', '15', '-af', 'afade=t=in:d=0.5,afade=t=out:st=13:d=2', 'public/audio/short.wav'], { stdio: 'ignore' });
await ensureBrowser();
const serveUrl = await bundle({ entryPoint: path.resolve('src/index.tsx'), publicDir: path.resolve('public'), webpackOverride: c => c });
const targets = [
  ['CursandoLandscape', 'out/cursando-60s-horizontal.mp4'],
  ['CursandoVertical', 'out/cursando-60s-vertical.mp4'],
  ['CursandoShort', 'out/cursando-15s-vertical.mp4']
];
const selected = process.argv[2] ? targets.filter(([id]) => id === process.argv[2]) : targets;
for (const [id, outputLocation] of selected) {
  const composition = await selectComposition({ serveUrl, id });
  let last = -1;
  await renderMedia({ composition, serveUrl, codec: 'h264', audioCodec: 'aac', crf: 19, pixelFormat: 'yuv420p', outputLocation, concurrency: 4, x264Preset: 'fast', onProgress: ({ progress }) => {
    const pct = Math.floor(progress * 10) * 10;
    if (pct !== last) { last = pct; console.log(`${id}: ${pct}%`); }
  } });
  console.log(`Pronto: ${outputLocation}`);
}
if (!process.argv[2] || process.argv[2] === 'CursandoLandscape') {
  const composition = await selectComposition({ serveUrl, id: 'CursandoLandscape' });
  for (const [name, frame] of [['capa', 1675], ['abertura', 110], ['produto', 230], ['cursos', 450], ['modulos', 760], ['progresso', 1040], ['chat', 1290], ['conquista', 1515]]) {
    await renderStill({ composition, serveUrl, output: `out/${name}.png`, frame });
  }
}
