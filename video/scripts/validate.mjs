import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
const probe = path.resolve('../ferramentas/ffmpeg/bin/ffprobe.exe');
const targets = [['cursando-60s-horizontal.mp4', 1920, 1080, 60], ['cursando-60s-vertical.mp4', 1080, 1920, 60], ['cursando-15s-vertical.mp4', 1080, 1920, 15]];
const results = [];
for (const [name, width, height, duration] of targets) {
  const info = JSON.parse(execFileSync(probe, ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', `out/${name}`], { encoding: 'utf8' }));
  const video = info.streams.find(s => s.codec_type === 'video');
  const audio = info.streams.find(s => s.codec_type === 'audio');
  if (!video || !audio || video.width !== width || video.height !== height || video.codec_name !== 'h264' || audio.codec_name !== 'aac' || Math.abs(Number(info.format.duration) - Number(duration)) > .15) throw Error(`Arquivo inesperado: ${name}`);
  // Decodifica o arquivo inteiro para detectar danos no vídeo ou no áudio.
  execFileSync(path.resolve('../ferramentas/ffmpeg/bin/ffmpeg.exe'), ['-v', 'error', '-i', `out/${name}`, '-f', 'null', '-'], { stdio: 'pipe' });
  results.push({ file: name, width, height, seconds: Number(info.format.duration), frames: Number(video.nb_frames), video: video.codec_name, audio: audio.codec_name, bytes: Number(info.format.size), decodedWithoutErrors: true });
}
fs.writeFileSync('out/verificacao.json', JSON.stringify(results, null, 2));
fs.writeFileSync('out/index.html', `<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Cursando — Vídeo promocional</title><style>body{margin:0;background:#f5f8f6;color:#173e2c;font:16px/1.5 system-ui}main{max-width:1100px;margin:auto;padding:40px 24px}h1{font-size:clamp(30px,5vw,52px);letter-spacing:-.04em;margin:0}p{color:#607468}section{margin:30px 0;padding:24px;background:white;border:1px solid #dfe9e3;border-radius:18px}video{display:block;width:100%;max-height:78vh;background:#075132;border-radius:12px}a{color:#087044;font-weight:600}h2{margin-top:0}small{color:#607468}</style><main><small>CURSANDO · MOTION DESIGN</small><h1>Seu próximo passo começa aqui.</h1><p>Locução sintética em português, trilha original e interfaces ilustrativas baseadas no produto.</p>${targets.map(([name, w, h, d], i) => `<section><h2>${i === 0 ? 'Filme principal' : i === 1 ? 'Versão vertical' : 'Corte para redes sociais'} · ${d}s</h2><video controls playsinline preload="metadata" ${i === 0 ? 'poster="capa.png"' : ''} src="${name}"></video><p>${w} × ${h} · H.264 / AAC · <a href="${name}" download>Baixar MP4</a></p></section>`).join('')}<a href="cursando-legendas.srt" download>Baixar legendas SRT dos vídeos de 60 segundos</a></main></html>`);
console.log(JSON.stringify(results, null, 2));
