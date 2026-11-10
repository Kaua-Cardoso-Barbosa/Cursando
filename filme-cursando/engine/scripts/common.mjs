import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export function args(argv = process.argv.slice(2)) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    if (!argv[i].startsWith('--')) throw new Error(`Argumento inesperado: ${argv[i]}`);
    const key = argv[i].slice(2);
    out[key] = argv[i + 1] !== undefined && !argv[i + 1].startsWith('--') ? argv[++i] : true;
  }
  return out;
}
export function number(value, fallback, min, max, name) {
  const n = value === undefined ? fallback : Number(value);
  if (!Number.isFinite(n) || n < min || n > max) throw new Error(`${name}: esperado ${min}..${max}`);
  return n;
}
export function run(command, argv, options = {}) {
  const r = spawnSync(command, argv, {encoding: 'utf8', windowsHide: true, maxBuffer: 32 * 1024 * 1024, ...options});
  if (r.error || r.status !== 0) throw new Error(`${command} falhou: ${r.error?.message || r.stderr || r.stdout}`);
  return r.stdout;
}
export function probe(file) {
  return JSON.parse(run(process.env.FFPROBE || 'ffprobe', ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', path.resolve(file)]));
}
export function main(fn) { fn().catch(e => { console.error(e.message); process.exitCode = 1; }); }
