from pathlib import Path
import importlib.util,json
spec=importlib.util.spec_from_file_location('cadastro',Path(__file__).with_name('escolar-cadastro.py'))
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
with m.app.app_context():
 data=json.loads((m.OUT/'cadastro.json').read_text(encoding='utf8'));cid=data['cursos'][0]['id']
 call,_=m.session(data['professor'],1)
 materials=call('GET',f'/professor/cursos/{cid}/materiais')
 if not any(item['titulo']=='Guia de prática - Criação 3D' for item in materials):
  with (m.ASSETS/'guia-pratica.pdf').open('rb') as pdf:call('POST',f'/professor/cursos/{cid}/materiais',data={'titulo':'Guia de prática - Criação 3D','descricao':'Atividade guiada, atalhos e checklist para acompanhar as aulas.','tipo':'pdf','arquivo':(pdf,'guia-pratica.pdf')},content_type='multipart/form-data')
 print('Material complementar cadastrado pela rota do curso.')
