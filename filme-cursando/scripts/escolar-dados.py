import sys,json,importlib.util
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(Path(__file__).resolve().parent))
spec=importlib.util.spec_from_file_location('escolar_cadastro',Path(__file__).with_name('escolar-cadastro.py'))
cadastro=importlib.util.module_from_spec(spec);spec.loader.exec_module(cadastro)
app,session=cadastro.app,cadastro.session
import chat_cursos_11_19_20
OUT=ROOT/'backend/private_uploads/pitch_escolar'
ASSETS=ROOT/'filme-cursando/engine/assets/escolar'
def save(name,data):(ASSETS/name).write_text(json.dumps(data,ensure_ascii=False,default=str,indent=2),encoding='utf8')
with app.app_context():
 data=json.loads((OUT/'cadastro.json').read_text(encoding='utf8'))
 cid=data['cursos'][0]['id'];aulas=data['cursos'][0]['aulas']
 call,_=session(8,2)
 for course in data['cursos']:
  try:call('POST',f'/aluno/cursos/{course["id"]}/inscrever')
  except RuntimeError as error:
   if 'inscrito' not in str(error).lower() and 'matriculado' not in str(error).lower():raise
 call('PUT',f'/aluno/aulas/{aulas[6]["id"]}/progresso',json={'posicao_segundos':48})
 for lesson in aulas[:4]:call('POST',f'/aluno/aulas/{lesson["id"]}/assistir')
 initial=dict(cadastro=data,course=call('GET',f'/aluno/cursos/{cid}'),lesson=call('GET',f'/aluno/aulas/{aulas[6]["id"]}'),dashboard=call('GET','/aluno/dashboard'),courses=call('GET','/aluno/cursos'),exam=call('GET',f'/aluno/cursos/{cid}/prova'))
 # Snapshot de dados reais para capturar o app offline; sem sessao ou credenciais.
 save('demo-private.json',initial)
 save('catalogo.json',[{**{k:v for k,v in c.items() if k!='aulas'},'asset':f'capa-{c["key"]}.png'} for c in data['cursos']])
 if '--concluir' in sys.argv or '--liberar-prova' in sys.argv:
  for lesson in aulas:call('POST',f'/aluno/aulas/{lesson["id"]}/assistir')
  exam=call('GET',f'/aluno/cursos/{cid}/prova')
  save('prova-antes.json',exam)
  if '--liberar-prova' in sys.argv:
   print('Aulas concluidas para demonstracao; prova liberada para captura, ainda sem respostas.');sys.exit(0)
  if not exam['aprovado_curso']:
   teacher,_=session(data['professor'],1)
   questions=teacher('GET',f'/professor/provas/{exam["prova"]["id"]}')
   save('professor-prova-private.json',questions)
   # Respostas da demonstracao calculadas a partir das questoes preparadas, sem alterar notas diretamente.
   expected=['Extrusão','Modo de Edição','Formato e destino do arquivo']
   answers={str(q['id']):expected[i] for i,q in enumerate(exam['questoes'])}
   print(call('POST',f'/aluno/cursos/{cid}/prova',json={'id_prova':exam['prova']['id'],'respostas':answers}))
  save('prova-depois.json',call('GET',f'/aluno/cursos/{cid}/prova'))
  pdf=call('GET',f'/aluno/cursos/{cid}/certificado')
  (ASSETS/'certificado-demonstracao.pdf').write_bytes(pdf)
  print('Prova e certificado preparados pelas rotas do sistema.')
 print(f'Curso principal {cid}; aula central {aulas[6]["id"]}; dados lidos e salvos sem tokens.',flush=True)
