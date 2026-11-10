export const clamp = (v, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, v));
export const lerp = (a, b, p) => a + (b - a) * p;
export const progress = (t, start, duration) => clamp((t - start) / duration);
export const smooth = p => { p = clamp(p); return p * p * (3 - 2 * p); };
// Resposta analítica a um degrau de um oscilador amortecido, repouso inicial.
// Casos subamortecido, crítico e superamortecido; sem integração por frame.
export function spring(t, {frequency = 3, damping = 0.85} = {}) {
  if (t <= 0) return 0;
  if (frequency <= 0 || damping < 0) throw new Error('Parâmetros de mola inválidos');
  const w = 2 * Math.PI * frequency, z = damping;
  if (Math.abs(z - 1) < 1e-6) return 1 - Math.exp(-w * t) * (1 + w * t);
  if (z < 1) {
    const wd = w * Math.sqrt(1 - z * z);
    return 1 - Math.exp(-z * w * t) * (Math.cos(wd * t) + z * w / wd * Math.sin(wd * t));
  }
  const a = -w * (z - Math.sqrt(z * z - 1)), b = -w * (z + Math.sqrt(z * z - 1));
  return 1 + (b * Math.exp(a * t) - a * Math.exp(b * t)) / (a - b);
}
// Soma de degraus preserva posição e velocidade quando o alvo muda.
export function track(t, initial, changes, options) {
  let value = initial, target = initial, previous = -Infinity;
  for (const change of changes) {
    if (change.time < previous) throw new Error('track requer tempos ordenados');
    value += (change.value - target) * spring(t - change.time, options);
    target = change.value; previous = change.time;
  }
  return value;
}
export const beatTime = (beat, bpm = 120, offset = 0) => offset + beat * 60 / bpm;
export function seeded(seed) {
  let state = seed >>> 0;
  return () => { state = (Math.imul(1664525, state) + 1013904223) >>> 0; return state / 4294967296; };
}
export const money = v => new Intl.NumberFormat('pt-BR', {style:'currency', currency:'BRL'}).format(v);
export function springKD(t, stiffness=170, damping=26) {
  return spring(t,{frequency:Math.sqrt(stiffness)/(2*Math.PI),damping:damping/(2*Math.sqrt(stiffness))});
}
export function indicator(t,initial,changes,width=120){
  const lead=track(t,initial,changes,{frequency:Math.sqrt(320)/(2*Math.PI),damping:30/(2*Math.sqrt(320))});
  const trail=track(t,initial,changes,{frequency:Math.sqrt(140)/(2*Math.PI),damping:22/(2*Math.sqrt(140))});
  return {left:Math.min(lead,trail),right:Math.max(lead,trail)+width};
}
export const swapAlpha=(t,start,end)=>Math.min(progress(t,start+.08,.12),clamp((end-.1-t)/.1));
export const loopTime=(t,duration)=>((t%duration)+duration)%duration;
