import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
const ffmpeg = path.resolve('../ferramentas/ffmpeg/bin/ffmpeg.exe');
const ffprobe = path.resolve('../ferramentas/ffmpeg/bin/ffprobe.exe');
const narration = JSON.parse(fs.readFileSync('public/narration.json', 'utf8'));
fs.mkdirSync('public/audio/raw', { recursive: true });
fs.mkdirSync('out', { recursive: true });
execFileSync('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', 'scripts/voice.ps1'], { stdio: 'inherit' });
// Trilha original: acordes, arpejos, pulsação e efeitos sintetizados localmente.
const rate = 44100, length = 60 * rate;
const music = new Float32Array(length);
const chords = [[48, 55, 59, 62], [45, 52, 55, 59], [41, 48, 52, 55], [43, 50, 53, 57]];
const hz = n => 440 * 2 ** ((n - 69) / 12);
for (let i = 0; i < length; i++) {
  const t = i / rate, chord = chords[Math.floor(t / 5) % 4];
  const fade = Math.min(1, t / 2, (60 - t) / 3);
  const beat = t % .625;
  let v = Math.sin(2 * Math.PI * (48 * beat + 9 * (1 - Math.exp(-beat * 25)))) * Math.exp(-beat * 24) * .11;
  for (const n of chord) v += Math.sin(2 * Math.PI * hz(n) * t) * .017 + Math.sin(2 * Math.PI * hz(n + 12) * t) * .008;
  const arp = chord[Math.floor(t / .3125) % 4] + 24;
  v += Math.sin(2 * Math.PI * hz(arp) * t) * Math.exp(-(t % .3125) * 15) * .025;
  for (const scene of [5, 11, 20, 29, 38, 46, 54]) {
    const dt = t - scene;
    if (dt >= 0 && dt < .6) v += Math.sin(2 * Math.PI * (660 * dt + 150 * dt * dt)) * Math.exp(-dt * 9) * .07;
  }
  music[i] = v * fade;
}
const wave = Buffer.alloc(44 + length * 2);
wave.write('RIFF'); wave.writeUInt32LE(wave.length - 8, 4); wave.write('WAVEfmt ', 8); wave.writeUInt32LE(16, 16); wave.writeUInt16LE(1, 20); wave.writeUInt16LE(1, 22); wave.writeUInt32LE(rate, 24); wave.writeUInt32LE(rate * 2, 28); wave.writeUInt16LE(2, 32); wave.writeUInt16LE(16, 34); wave.write('data', 36); wave.writeUInt32LE(length * 2, 40);
for (let i = 0; i < length; i++) wave.writeInt16LE(Math.round(Math.max(-1, Math.min(1, music[i])) * 32767), 44 + i * 2);
fs.writeFileSync('public/audio/music.wav', wave);
const inputs = ['-y', '-i', 'public/audio/music.wav'];
const filters = ['[0:a]volume=0.65[music]'];
for (let i = 0; i < narration.length; i++) {
  const clip = narration[i];
  const duration = Number(execFileSync(ffprobe, ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', `public/audio/raw/voice-${i}.wav`], { encoding: 'utf8' }).trim());
  const speed = Math.max(1, duration / (clip.end - clip.start - .15));
  inputs.push('-i', `public/audio/raw/voice-${i}.wav`);
  filters.push(`[${i + 1}:a]atempo=${speed.toFixed(5)},highpass=f=80,lowpass=f=11000,loudnorm=I=-17:TP=-2:LRA=7,afade=t=in:d=0.02,adelay=${Math.round(clip.start * 1000)}:all=1[v${i}]`);
}
filters.push(`[music]${narration.map((_, i) => `[v${i}]`).join('')}amix=inputs=9:duration=first:normalize=0,alimiter=limit=0.92,atrim=duration=60[out]`);
execFileSync(ffmpeg, [...inputs, '-filter_complex', filters.join(';'), '-map', '[out]', '-ar', '48000', '-ac', '2', 'public/audio/mix.wav'], { stdio: 'ignore' });
const stamp = n => { const ms = Math.round(n * 1000); return `${String(Math.floor(ms / 3600000)).padStart(2,'0')}:${String(Math.floor(ms / 60000) % 60).padStart(2,'0')}:${String(Math.floor(ms / 1000) % 60).padStart(2,'0')},${String(ms % 1000).padStart(3,'0')}`; };
fs.writeFileSync('out/cursando-legendas.srt', narration.map((n, i) => `${i + 1}\n${stamp(n.start)} --> ${stamp(n.end)}\n${n.text}\n`).join('\n'));
console.log('Locução pt-BR, trilha original, efeitos e legendas preparados.');
