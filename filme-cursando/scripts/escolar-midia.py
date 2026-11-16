"""Prepara videoaulas oficiais, creditos e thumbs; nao inicia servidor."""
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import requests, re, html, json, subprocess

ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'backend/private_uploads/pitch_escolar'
ASSETS=ROOT/'filme-cursando/engine/assets/escolar'
FF=ROOT/'ferramentas/ffmpeg/bin/ffmpeg.exe'
FP=FF.with_name('ffprobe.exe')
LESSONS=[
 ('Interface e organização do projeto','interface-overview'),
 ('Navegação no espaço 3D','viewport-navigation'),
 ('Mover, girar e dimensionar objetos','select-transform'),
 ('Organização de objetos e coleções','collections'),
 ('Modo Objeto e Modo de Edição','object-and-edit-mode'),
 ('Vértices, arestas e faces','mesh-selection-mode'),
 ('Extrusão e criação de volumes','extrude'),
 ('Cortes para refinar a malha','loop-cut'),
 ('Materiais e editor de sombreamento','shading-editor'),
 ('Tipos de luz e iluminação','light-types'),
 ('Configurações de renderização','render-settings-introduction'),
 ('Exportação da imagem final','render-output-settings'),
]
def run(args):
 r=subprocess.run([str(a) for a in args],capture_output=True,timeout=900)
 if r.returncode:raise RuntimeError(r.stderr.decode(errors='replace')[-1500:])
 return r.stdout
def prepare(item):
 title,slug=item
 page=f'https://studio.blender.org/training/blender-2-8-fundamentals/{slug}/'
 video=OUT/f'{slug}.mp4';thumb=ASSETS/f'{slug}.jpg'
 if not video.exists():
  response=requests.get(page,timeout=45);response.raise_for_status()
  if 'creativecommons.org/licenses/by/4.0/' not in response.text:raise ValueError('Licenca nao confirmada: '+page)
  candidates=re.findall(r'https://studio\.blender\.org/files/[^\s"<>]+\.mp4[^\s"<>]*',response.text)
  if not candidates:raise ValueError('Sem download oficial: '+page)
  url=html.unescape(candidates[0])
  original=OUT/f'{slug}.download.mp4'
  with requests.get(url,stream=True,timeout=(20,120)) as source:
   source.raise_for_status()
   with original.open('wb') as target:
    for block in source.iter_content(1024*1024):target.write(block)
  run([FF,'-v','error','-y','-i',original,'-vf','scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2,setsar=1','-c:v','libx264','-threads','2','-preset','fast','-crf','24','-c:a','aac','-b:a','96k','-movflags','+faststart',video])
 if not thumb.exists():run([FF,'-v','error','-n','-ss','35','-i',video,'-frames:v','1',thumb])
 meta=json.loads(run([FP,'-v','error','-show_entries','format=duration:stream=codec_type,width,height','-of','json',video]))
 entry=dict(titulo=title,slug=slug,video=str(video),thumb=str(thumb),duracao=float(meta['format']['duration']),fonte=page,autor='Blender Foundation / Blender Studio — Blender 2.8 Fundamentals',licenca='https://creativecommons.org/licenses/by/4.0/',idioma='Inglês',versao='Blender 2.8')
 print(f'Pronta: {slug} ({entry["duracao"]:.1f}s)',flush=True)
 return entry
if __name__=='__main__':
 OUT.mkdir(parents=True,exist_ok=True);ASSETS.mkdir(parents=True,exist_ok=True)
 with ThreadPoolExecutor(max_workers=3) as pool:entries=list(pool.map(prepare,LESSONS))
 (OUT/'fontes.json').write_text(json.dumps(entries,ensure_ascii=False,indent=2),encoding='utf8')
 (ASSETS/'creditos-aulas.json').write_text(json.dumps([{k:v for k,v in e.items() if k not in ('video','thumb')} for e in entries],ensure_ascii=False,indent=2),encoding='utf8')
 # Trecho da aula que sera realmente reproduzido, sem apagar os arquivos completos.
 run([FF,'-v','error','-n','-ss','45','-i',OUT/'extrude.mp4','-t','12','-an','-c:v','libx264','-preset','fast','-crf','20',ASSETS/'extrude-pitch.mp4'])
