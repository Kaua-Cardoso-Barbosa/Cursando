import React from 'react';
import { AbsoluteFill, Audio, Img, Sequence, interpolate, spring, staticFile, useCurrentFrame } from 'remotion';
import catalog from '../public/catalog.json';
import narration from '../public/narration.json';

const C = { green: '#06a663', deep: '#075132', ink: '#173e2c', muted: '#607468', pale: '#f5f8f6', gold: '#c89c3d' };
const font = '"Segoe UI", Arial, sans-serif';
const ease = (f: number, delay = 0) => spring({ frame: Math.max(0, f - delay), fps: 30, config: { damping: 22, stiffness: 95, mass: 1 } });
const clamp = (f: number, a: number, b: number, x: number, y: number) => interpolate(f, [a, b], [x, y], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
const float = (f: number, offset = 0) => Math.sin(f / 40 + offset) * 7;
const course = (i: number) => catalog[i % catalog.length];
const image = (i: number) => staticFile(course(i).asset);

function Logo({ light = false, size = 36 }: { light?: boolean; size?: number }) {
  return <div style={{ display: 'flex', gap: size * .24, alignItems: 'center', color: light ? '#fff' : C.deep, fontSize: size, fontWeight: 750, letterSpacing: -1 }}><Img src={staticFile('assets/logo.png')} style={{ width: size * 1.3, height: size * 1.3, objectFit: 'contain', filter: light ? 'brightness(0) invert(1)' : undefined }} />Cursando<span style={{ color: C.green }}>.</span></div>;
}
function Arrow({ color = 'currentColor', size = 36 }: { color?: string; size?: number }) { return <svg width={size} height={size} viewBox="0 0 32 32" fill="none"><path d="M5 16h21M18 7l9 9-9 9" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>; }
function Check({ size = 30 }: { size?: number }) { return <svg width={size} height={size} viewBox="0 0 32 32" fill="none"><path d="m7 17 6 6L26 9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>; }
function Play({ size = 26 }: { size?: number }) { return <svg width={size} height={size} viewBox="0 0 32 32"><path d="m10 5 19 11-19 11z" fill="currentColor" /></svg>; }

function Browser({ f, screen = 'home', width = 880 }: { f: number; screen?: string; width?: number }) {
  return <div style={{ width, borderRadius: 24, background: '#fff', border: '1px solid #c6d8cd', overflow: 'hidden', boxShadow: '0 42px 90px #062f2726', transform: `translateY(${float(f)}px)` }}>
    <div style={{ height: 47, background: '#f3f6f4', borderBottom: '1px solid #e0e8e3', display: 'flex', alignItems: 'center', padding: '0 20px', gap: 8 }}>{['#d6e1da', '#d6e1da', '#06a663'].map((color, i) => <span key={i} style={{ width: 9, height: 9, borderRadius: 20, background: color }} />)}<div style={{ background: '#fff', borderRadius: 7, height: 25, marginLeft: 26, width: '66%', fontSize: 12, color: '#7a8c80', textAlign: 'center', paddingTop: 3 }}>Cursando · Aprendizado e conhecimento</div></div>
    <Img src={staticFile(`screens/${screen}.png`)} style={{ width: '100%', height: width * .64, objectFit: 'cover', objectPosition: 'top' }} />
  </div>;
}
function Phone({ f, mode = 'resume', width = 330 }: { f: number; mode?: 'resume' | 'chat'; width?: number }) {
  const k = width / 330;
  const progress = clamp(f, 12, 180, 29, 68);
  return <div style={{ width, height: 650 * k, borderRadius: 48 * k, padding: 11 * k, background: '#12382b', boxShadow: '0 32px 75px #052b2633', transform: `translateY(${float(f, 2)}px)` }}><div style={{ height: '100%', borderRadius: 38 * k, background: C.pale, overflow: 'hidden', position: 'relative' }}>
    <div style={{ height: 40 * k, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: `0 ${21 * k}px`, fontSize: 11 * k, fontWeight: 700 }}>9:41<div style={{ height: 20 * k, width: 86 * k, borderRadius: 20 * k, background: '#12382b' }} />● ▰</div>
    {mode === 'resume' ? <div style={{ padding: 18 * k }}>
      <div style={{ fontSize: 21 * k, fontWeight: 700, color: C.ink, marginBottom: 5 * k }}>Seu próximo passo</div><div style={{ fontSize: 11 * k, color: C.muted, marginBottom: 20 * k }}>Continue aprendendo no seu ritmo.</div>
      <div style={{ borderRadius: 14 * k, overflow: 'hidden', background: '#fff', marginBottom: 20 * k }}><div style={{ height: 146 * k, position: 'relative' }}><Img src={image(0)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /><div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', background: '#0002', color: '#fff' }}><div style={{ background: '#ffffff33', border: '1px solid #fff7', borderRadius: 50, padding: 13 * k }}><Play size={26 * k} /></div></div></div><div style={{ height: 4 * k, background: '#dce8df' }}><div style={{ width: `${progress}%`, height: '100%', background: C.green }} /></div><div style={{ padding: 13 * k }}><div style={{ fontSize: 15 * k, color: C.ink, fontWeight: 700 }}>Conhecendo sua calopsita</div><div style={{ marginTop: 6 * k, fontSize: 11 * k, color: C.muted }}>Assistido até 2:34</div></div></div>
      <div style={{ color: C.ink, fontSize: 15 * k, fontWeight: 700, marginBottom: 12 * k }}>Últimas aulas assistidas</div>
      {[0, 1].map((n) => <div key={n} style={{ display: 'flex', gap: 9 * k, marginBottom: 12 * k }}><Img src={image(n)} style={{ width: 112 * k, aspectRatio: '16/9', borderRadius: 6 * k, objectFit: 'cover' }} /><div style={{ flex: 1, fontSize: 12 * k, color: C.ink }}><strong>{n ? 'Um novo olhar' : 'Primeiros cuidados'}</strong><p style={{ fontSize: 10 * k, color: C.muted, marginTop: 5 * k }}>Continue sua aula</p></div></div>)}
    </div> : <div><div style={{ display: 'flex', padding: 16 * k, gap: 10 * k, background: '#fff', alignItems: 'center', color: C.ink }}><span style={{ fontSize: 19 * k }}>‹</span><div style={{ width: 36 * k, height: 36 * k, borderRadius: 40, background: '#c7f0df', display: 'grid', placeItems: 'center' }}>M</div><div><strong style={{ fontSize: 14 * k }}>Professor(a)</strong><div style={{ fontSize: 10 * k }}>Chat do curso</div></div></div><div style={{ padding: 16 * k, fontSize: 13 * k, lineHeight: 1.5 }}>
      {[['Como posso aplicar o que aprendi?', true, 15], ['Vamos por etapas. Comece pelo exercício do módulo.', false, 55], ['Ótimo! Vou colocar em prática.', true, 100]].map(([t, mine, delay], i) => <div key={i} style={{ width: '88%', padding: 12 * k, marginTop: 20 * k, marginLeft: mine ? 'auto' : 0, background: mine ? '#dcf4e5' : '#fff', borderRadius: 13 * k, color: C.ink, opacity: ease(f, Number(delay)), transform: `translateY(${(1 - ease(f, Number(delay))) * 30}px)` }}>{String(t)}<div style={{ textAlign: 'right', fontSize: 9 * k, color: C.muted }}>10:{String(20 + i).padStart(2, '0')}</div></div>)}
    </div></div>}
    <div style={{ position: 'absolute', bottom: 0, width: '100%', background: '#fff', height: 51 * k, display: 'flex', alignItems: 'center', justifyContent: 'space-around', color: C.deep, fontSize: 10 * k, borderTop: '1px solid #dfe9e3' }}>{['Início', 'Meus cursos', 'Descobrir', 'Menu'].map((n, i) => <span key={n} style={{ padding: 8 * k, borderRadius: 8, background: i === 0 ? C.deep : '#fff', color: i === 0 ? '#fff' : C.deep }}>{n}</span>)}</div>
  </div></div>;
}

function Courses({ f, vertical }: { f: number; vertical: boolean }) {
  return <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 22, flexWrap: vertical ? 'wrap' : 'nowrap', transform: vertical ? 'scale(0.76)' : undefined }}>
    {[0, 1, 2].map((i) => <div key={i} style={{ width: vertical ? (i === 2 ? 550 : 420) : 275, background: '#fff', borderRadius: 22, border: '1px solid #dfe9e3', overflow: 'hidden', boxShadow: '0 24px 55px #123c2a16', opacity: ease(f, 8 + i * 10), transform: `translateY(${(1 - ease(f, 8 + i * 10)) * 150 + float(f, i)}px) rotate(${i === 0 ? -4 : i === 2 ? 4 : 0}deg)` }}>
      <Img src={image(i)} style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover' }} /><div style={{ padding: vertical ? 24 : 20 }}><div style={{ color: C.green, fontSize: vertical ? 18 : 12, letterSpacing: 2, fontWeight: 700 }}>EXPLORE NOVAS IDEIAS</div><div style={{ color: C.ink, fontSize: vertical ? 29 : 21, fontWeight: 650, lineHeight: 1.25, marginTop: 14, minHeight: 76 }}>{course(i).titulo}</div><div style={{ marginTop: 22, paddingTop: 16, borderTop: '1px solid #edf2ee', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: C.deep, fontSize: vertical ? 22 : 14 }}>Conhecer o curso<Arrow size={22} /></div></div>
    </div>)}
  </div>;
}
function Modules({ f, vertical }: { f: number; vertical: boolean }) {
  const labels = ['Descubra o essencial', 'Aprenda na prática', 'Aprofunde seu conhecimento'];
  return <div style={{ padding: vertical ? 35 : 15, width: '100%' }}>
    {labels.map((t, i) => <div key={t} style={{ display: 'flex', alignItems: 'flex-start', gap: 24, opacity: ease(f, i * 18), transform: `translateX(${(1 - ease(f, i * 18)) * 80}px)` }}><div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}><div style={{ borderRadius: 60, width: 76, height: 76, background: f > 70 + i * 45 ? C.green : '#e0eee5', color: f > 70 + i * 45 ? '#fff' : C.deep, display: 'grid', placeItems: 'center', fontSize: 28, fontWeight: 700 }}>{f > 70 + i * 45 ? <Check /> : `0${i + 1}`}</div>{i < 2 && <div style={{ width: 3, height: 78, background: '#cce5d6' }} />}</div><div style={{ background: '#fff', border: '1px solid #dfe9e3', borderRadius: 20, padding: '21px 28px', width: '82%', boxShadow: '0 12px 30px #123c2a08' }}><div style={{ color: C.muted, fontSize: 15, letterSpacing: 2 }}>MÓDULO {i + 1}</div><div style={{ color: C.ink, fontSize: vertical ? 31 : 27, fontWeight: 650, marginTop: 9 }}>{t}</div></div></div>)}
    <div style={{ display: 'flex', gap: 16, marginLeft: 100, marginTop: 15 }}>{['Aulas', 'Materiais', 'Prova final'].map(n => <span key={n} style={{ padding: '13px 20px', borderRadius: 12, background: '#e6f3eb', color: C.deep, fontWeight: 600, fontSize: 18 }}>{n}</span>)}</div>
  </div>;
}
function Certificate({ f, vertical }: { f: number; vertical: boolean }) {
  const p = ease(f, 12);
  return <div style={{ width: '100%', position: 'relative', transform: `translateY(${(1 - p) * 80 + float(f)}px) rotate(-3deg)`, opacity: p }}>
    <div style={{ background: '#fffefa', border: '1px solid #ddcfab', borderRadius: 19, boxShadow: '0 25px 70px #123c2a16', padding: vertical ? 55 : 45, textAlign: 'center' }}><Logo size={vertical ? 35 : 27} /><div style={{ height: 1, background: '#e4d6b2', margin: '30px 0' }} /><div style={{ color: '#997526', letterSpacing: 5, fontSize: 17, fontWeight: 650 }}>APRENDIZADO QUE SE RECONHECE</div><div style={{ color: C.ink, fontSize: vertical ? 56 : 43, fontFamily: 'Georgia, serif', lineHeight: 1.15, marginTop: 27 }}>Certificado de<br />conclusão</div><div style={{ color: C.muted, fontSize: 21, marginTop: 25 }}>Uma conquista para a sua jornada.</div><div style={{ display: 'flex', justifyContent: 'center', marginTop: 32 }}><div style={{ width: 118, height: 118, color: '#fff', background: C.gold, display: 'grid', placeItems: 'center', clipPath: 'polygon(50% 0,61% 8%,75% 7%,81% 20%,94% 25%,92% 40%,100% 50%,92% 61%,94% 75%,81% 81%,75% 94%,61% 92%,50% 100%,39% 92%,25% 94%,19% 81%,6% 75%,8% 61%,0% 50%,8% 40%,6% 25%,19% 20%,25% 7%,39% 8%)' }}><Check size={64} /></div></div></div>
    <div style={{ position: 'absolute', right: -20, bottom: -28, background: C.deep, color: '#fff', padding: '18px 28px', borderRadius: 16, display: 'flex', gap: 14, alignItems: 'center', fontSize: 23, boxShadow: '0 12px 30px #123c2a25', opacity: ease(f, 55), transform: `scale(${.8 + ease(f, 55) * .2})` }}><Check />Aprovação na prova final</div>
  </div>;
}

const titles = [
  ['', '', ''],
  ['APRENDA. EXPLORE. EVOLUA.', 'Conhecimento que\nacompanha você.', 'No site e no aplicativo.'],
  ['ENCONTRE SEU PRÓXIMO OBJETIVO', 'Sua curiosidade\ntem lugar aqui.', 'Explore cursos e novas possibilidades.'],
  ['UM PASSO DE CADA VEZ', 'Uma jornada\ncom direção.', 'Módulos organizados. Aprendizado no seu ritmo.'],
  ['CONTINUE DE ONDE PAROU', 'Seu ritmo.\nSeu progresso.', 'O próximo passo está sempre ao seu alcance.'],
  ['APRENDER TAMBÉM É TROCAR', 'Uma dúvida.\nUma conversa.\nUm novo olhar.', 'Converse com seu professor e avalie sua experiência.'],
  ['CADA ETAPA CONTA', 'Conhecimento\nque vira conquista.', 'Aprenda. Pratique. Conquiste sua aprovação.'],
  ['', '', '']
];

function Scene({ index, vertical, duration }: { index: number; vertical: boolean; duration: number }) {
  const f = useCurrentFrame();
  const dark = index === 0 || index === 7;
  const entry = ease(f, 2);
  const opacity = clamp(f, duration - 9, duration, 1, 0);
  const [tag, title, description] = titles[index];
  const W = vertical ? 1080 : 1920, H = vertical ? 1920 : 1080;
  return <AbsoluteFill style={{ fontFamily: font, background: dark ? C.deep : C.pale, color: dark ? '#fff' : C.ink, opacity, overflow: 'hidden' }}>
    <svg width={W} height={H} style={{ position: 'absolute', opacity: dark ? .12 : .34 }}><defs><pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="1" fill={dark ? '#fff' : '#9cbba9'} /></pattern></defs><rect width="100%" height="100%" fill="url(#grid)" /><path d={vertical ? 'M-80 1550C600 1600 300 650 1190 600' : 'M-100 950C400 1050 700 120 2050 380'} fill="none" stroke={C.green} strokeWidth={3} strokeDasharray="2600" strokeDashoffset={clamp(f, 0, duration - 20, 2600, 0)} /></svg>
    <div style={{ position: 'absolute', top: vertical ? 86 : 65, left: vertical ? 70 : 100 }}><Logo light={dark} size={vertical ? 36 : 32} /></div>
    <div style={{ position: 'absolute', right: vertical ? 70 : 100, top: vertical ? 95 : 75, color: dark ? '#b8dfca' : C.muted, fontSize: 16, letterSpacing: 3 }}>{String(index + 1).padStart(2, '0')} / 08</div>
    {index === 0 ? <>
      <div style={{ position: 'absolute', left: vertical ? 70 : 160, top: vertical ? 430 : 290 }}>
        {['Uma ideia.', 'Uma habilidade.', 'Um novo começo.'].map((word, i) => <div key={word} style={{ fontSize: vertical ? 90 : 107, lineHeight: 1.2, letterSpacing: -4, fontWeight: 650, opacity: ease(f, i * 22), transform: `translateY(${(1 - ease(f, i * 22)) * 65}px)`, color: i === 2 ? '#71e4ad' : '#fff' }}>{word}</div>)}
        <div style={{ marginTop: 42, height: 5, borderRadius: 5, width: clamp(f, 55, 120, 0, vertical ? 520 : 700), background: '#71e4ad' }} />
      </div>
      <div style={{ position: 'absolute', right: vertical ? 90 : 180, bottom: vertical ? 430 : 310, width: 150, height: 150, border: '1px solid #ffffff50', borderRadius: 100, display: 'grid', placeItems: 'center', transform: `rotate(${clamp(f, 20, 130, -45, 0)}deg) scale(${.8 + ease(f, 40) * .2})`, color: '#71e4ad', opacity: ease(f, 40) }}><Arrow size={70} /></div>
    </> : index === 7 ? <>
      <div style={{ position: 'absolute', left: vertical ? 70 : 160, top: vertical ? 420 : 260, width: vertical ? 940 : 1050, opacity: entry, transform: `translateY(${(1 - entry) * 65}px)` }}><div style={{ color: '#8fe8b8', letterSpacing: 4, fontSize: 22, fontWeight: 650 }}>SEU PRÓXIMO PASSO</div><div style={{ marginTop: 22, fontSize: vertical ? 113 : 130, fontWeight: 700, lineHeight: 1.02, letterSpacing: -6 }}>Começa<br />aqui<span style={{ color: '#71e4ad' }}>.</span></div><div style={{ display: 'inline-flex', alignItems: 'center', gap: 30, padding: '24px 34px', borderRadius: 17, background: '#71e4ad', color: '#073d26', marginTop: 45, fontSize: 30, fontWeight: 700 }}>Explore nossos cursos<Arrow /></div><div style={{ marginTop: 25, color: '#d3ebdf', fontSize: 24 }}>Cursando · Site e aplicativo</div></div>
      <div style={{ position: 'absolute', left: vertical ? 660 : 1330, top: vertical ? 680 : 230, transform: `rotate(11deg) translateY(${float(f)}px)`, opacity: entry }}><Phone f={f} width={vertical ? 290 : 340} /></div>
    </> : <>
      <div style={{ position: 'absolute', left: vertical ? 70 : 110, top: vertical ? 245 : 315, width: vertical ? 940 : 690, opacity: entry, transform: `translateY(${(1 - entry) * 55}px)` }}>
        <div style={{ color: C.deep, fontSize: vertical ? 21 : 17, fontWeight: 700, letterSpacing: 3 }}>{tag}</div>
        <div style={{ fontWeight: 650, fontSize: vertical ? 84 : 78, lineHeight: 1.08, letterSpacing: -3.5, whiteSpace: 'pre-line', marginTop: 23 }}>{title}</div>
        <div style={{ fontSize: vertical ? 29 : 26, color: C.muted, lineHeight: 1.5, marginTop: 26, maxWidth: 620 }}>{description}</div>
      </div>
      <div style={{ position: 'absolute', left: vertical ? 70 : 900, top: vertical ? 730 : 210, width: vertical ? 940 : 900, height: vertical ? 850 : 660, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: ease(f, 12), transform: `translateY(${(1 - ease(f, 12)) * 50}px)` }}>
        {index === 1 && <div style={{ position: 'relative', width: '100%', paddingBottom: vertical ? 210 : 80 }}><Browser f={f} width={vertical ? 880 : 840} /><div style={{ position: 'absolute', right: vertical ? 0 : -20, bottom: vertical ? -40 : -30 }}><Phone f={f} width={vertical ? 320 : 240} /></div></div>}
        {index === 2 && <Courses f={f} vertical={vertical} />}
        {index === 3 && <Modules f={f} vertical={vertical} />}
        {index === 4 && <div style={{ display: 'flex', alignItems: 'center', gap: vertical ? 55 : 40 }}><Phone f={f} width={vertical ? 390 : 315} /><div style={{ color: C.ink, width: vertical ? 380 : 390 }}><div style={{ fontSize: vertical ? 130 : 100, fontWeight: 700, letterSpacing: -5 }}>{Math.round(clamp(f, 20, 160, 29, 68))}<span style={{ fontSize: 45, color: C.green }}>%</span></div><div style={{ height: 8, background: '#d6e7dd', margin: '20px 0 25px', borderRadius: 10 }}><div style={{ height: '100%', width: `${clamp(f, 20, 160, 29, 68)}%`, background: C.green, borderRadius: 10 }} /></div><div style={{ fontSize: 23, color: C.muted }}>Cada aula é um<br />passo a mais.</div></div></div>}
        {index === 5 && <><Phone f={f} width={vertical ? 395 : 320} mode="chat" /><div style={{ position: 'absolute', right: 0, bottom: 10, border: '1px solid #dfe9e3', background: '#fff', padding: 24, borderRadius: 20, boxShadow: '0 15px 45px #123c2a15', opacity: ease(f, 110), transform: `translateY(${(1 - ease(f, 110)) * 50}px)` }}><div style={{ color: C.gold, fontSize: 36, letterSpacing: 4 }}>★★★★★</div><div style={{ fontSize: 22, color: C.ink, marginTop: 6 }}>Sua experiência tem valor.</div></div></>}
        {index === 6 && <Certificate f={f} vertical={vertical} />}
      </div>
    </>}
  </AbsoluteFill>;
}

export const Film: React.FC<{ vertical: boolean; short: boolean }> = ({ vertical, short }) => {
  const frame = useCurrentFrame();
  const scenes = short ? [{ index: 0, from: 0, duration: 90 }, { index: 2, from: 90, duration: 120 }, { index: 4, from: 210, duration: 120 }, { index: 7, from: 330, duration: 120 }] : [{ index: 0, from: 0, duration: 150 }, { index: 1, from: 150, duration: 180 }, { index: 2, from: 330, duration: 270 }, { index: 3, from: 600, duration: 270 }, { index: 4, from: 870, duration: 270 }, { index: 5, from: 1140, duration: 240 }, { index: 6, from: 1380, duration: 240 }, { index: 7, from: 1620, duration: 180 }];
  const caption = !short && narration.find(n => frame >= Math.round(n.start * 30) && frame < Math.round(n.end * 30));
  return <AbsoluteFill style={{ background: C.pale }}>
    <Audio src={staticFile(short ? 'audio/short.wav' : 'audio/mix.wav')} />
    {scenes.map(s => <Sequence key={s.index} from={s.from} durationInFrames={s.duration}><Scene index={s.index} vertical={vertical} duration={s.duration} /></Sequence>)}
    {caption && <div style={{ position: 'absolute', bottom: vertical ? 145 : 66, left: vertical ? 65 : 300, right: vertical ? 65 : 300, display: 'flex', justifyContent: 'center', fontFamily: font }}><div style={{ color: '#fff', background: '#0c2e24eb', borderRadius: 12, padding: vertical ? '18px 24px' : '14px 28px', textAlign: 'center', fontSize: vertical ? 30 : 28, lineHeight: 1.45, fontWeight: 500 }}>{caption.text}</div></div>}
    <div style={{ position: 'absolute', bottom: 0, left: 0, width: `${(frame + 1) / (short ? 450 : 1800) * 100}%`, height: 4, background: C.green }} />
  </AbsoluteFill>;
};
