"""Cadastros do pitch por rotas reais; leituras SQL somente para identificar contas."""
import sys,json,os,time
from pathlib import Path
from datetime import timedelta
ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/'backend'))
from app import app
from banco_37 import get_db
from flask_jwt_extended import JWTManager,create_access_token,decode_token
import usuario_1_3_8_34,aluno_4_6_34,curso_conteudo_6_11_20_21_28,provas_cursos_20,certificados_5_20,perfis_usuarios
import chat_cursos_11_19_20
# Nao enviar emails a outras pessoas ao preparar os dados da apresentacao.
chat_cursos_11_19_20.notificar_alunos_novo_curso=lambda destinatarios,titulo: None
JWTManager(app)
OUT=ROOT/'backend/private_uploads/pitch_escolar'
ASSETS=ROOT/'filme-cursando/engine/assets/escolar'

def session(user,kind):
 client=app.test_client()
 token=create_access_token(identity=str(user),additional_claims={'tipo':kind},expires_delta=timedelta(hours=6))
 client.set_cookie(app.config.get('JWT_ACCESS_COOKIE_NAME','token'),token)
 headers={'Authorization':'Bearer '+token}
 if csrf:=decode_token(token).get('csrf'):headers['X-CSRF-TOKEN']=csrf
 def call(method,route,**kwargs):
  response=client.open(route,method=method,headers=headers,**kwargs)
  if not 200<=response.status_code<300:raise RuntimeError(f'{method} {route}: {response.status_code} {response.get_json()}')
  return response.get_json() if response.is_json else response.data
 return call,token

CATALOG=[
 dict(key='blender',titulo='Blender: primeiros passos na criação 3D',categoria='Design e criação',tema='Modelagem 3D',descricao='Explore o espaço 3D, transforme objetos e construa suas primeiras formas. Conheça materiais, iluminação e renderização em uma trilha de 3 módulos. Curadoria didática para demonstração do projeto escolar Cursando. Vídeos originais: Blender Foundation / Blender Studio, Blender 2.8 Fundamentals, em inglês, com descrições e atividades em português. Licença CC-BY 4.0; créditos em cada aula.'),
 dict(key='python',titulo='Python: lógica e primeiros programas',categoria='Tecnologia',tema='Programação',descricao='Conheça variáveis, decisões e repetições para organizar ideias e construir pequenos programas. Curso de demonstração do projeto escolar Cursando; apresentação de catálogo, com conteúdo em preparação.'),
 dict(key='fotografia',titulo='Fotografia: luz e composição',categoria='Fotografia',tema='Luz e composição',descricao='Explore enquadramento, direção da luz e escolha do fundo para criar imagens mais intencionais com câmera ou celular. Curso de demonstração do projeto escolar Cursando; apresentação de catálogo, com conteúdo em preparação.'),
]
def main():
 sources=json.loads((OUT/'fontes.json').read_text(encoding='utf8'))
 with app.app_context():
  prof=35
  call,_=session(prof,1)
  existing=call('GET','/professor/cursos')
  result=[]
  for course in CATALOG:
   old=next((c for c in existing if c['titulo']==course['titulo']),None)
   if old:cid=old['id']
   else:
    with (ASSETS/f'capa-{course["key"]}.png').open('rb') as cover:
     cid=call('POST','/professor/cursos',data=dict(titulo=course['titulo'],descricao=course['descricao'],imagem=(cover,'capa.png')),content_type='multipart/form-data')['id_curso']
   tax={}
   for kind,name in [('categorias',course['categoria']),('temas',course['tema'])]:
    values=call('GET','/taxonomias/'+kind); found=next((v for v in values if v['nome']==name),None)
    tax['id_categoria' if kind=='categorias' else 'id_tema']=found['id'] if found else call('POST','/taxonomias/'+kind,json={'nome':name})['id']
   call('PUT',f'/professor/cursos/{cid}/taxonomia',json=tax)
   lessons=[]
   if course['key']=='blender':
    modules=call('GET',f'/professor/cursos/{cid}/modulos')
    for n,title in enumerate(['Conhecendo o espaço 3D','Modelando suas primeiras formas','Preparando a cena final']):
     module=next((m for m in modules if m['titulo']==title),None)
     mid=module['id'] if module else call('POST',f'/professor/cursos/{cid}/modulos',json={'titulo':title,'descricao':['Reconheça a interface e organize objetos na cena.','Edite os componentes e transforme a geometria.','Explore materiais, iluminação e saída de imagem.'][n],'ordem':n+1})['id_modulo']
     registered=call('GET',f'/professor/cursos/{cid}/aulas?id_modulo={mid}')
     for source in sources[n*4:n*4+4]:
      found=next((v for v in registered if v['titulo']==source['titulo']),None)
      if found:aid=found['id']
      else:
       with open(source['video'],'rb') as video,open(source['thumb'],'rb') as thumb:
        description=f'{source["titulo"]}: acompanhe a explicação e repita os comandos em uma cena de exercício. Pause para comparar o resultado e salve seu projeto.\n\nVídeo original em inglês, Blender 2.8. Autoria: {source["autor"]}. Fonte: {source["fonte"]}. Licença: {source["licenca"]}. Curadoria e atividade em português para o projeto escolar Cursando.'
        aid=call('POST',f'/professor/cursos/{cid}/aulas',data=dict(titulo=source['titulo'],descricao=description,id_modulo=str(mid),video=(video,source['slug']+'.mp4'),thumb=(thumb,'thumb.jpg')),content_type='multipart/form-data')['id_aula']
      call('PATCH',f'/professor/aulas/{aid}/status',json={'status':1})
      lessons.append(dict(id=aid,modulo=mid,**source))
      print(f'Aula cadastrada: {aid} {source["titulo"]}',flush=True)
    exams=call('GET',f'/professor/cursos/{cid}/provas')['provas']
    if not any(p['estado']=='vigente' for p in exams):
     questions=[('Qual ferramenta cria volume a partir de uma face?',['Extrusão','Zoom da viewport','Salvar arquivo'],'Extrusão'),('Qual modo permite editar vértices, arestas e faces?',['Modo de Edição','Modo Objeto','Visualização da câmera'],'Modo de Edição'),('Qual configuração está relacionada à saída da imagem renderizada?',['Formato e destino do arquivo','Nome da coleção apenas','Cor do tema da interface'],'Formato e destino do arquivo')]
     exam=call('POST',f'/professor/cursos/{cid}/provas',json={'titulo':'Fundamentos de criação 3D','nota_minima':70,'questoes':[dict(enunciado=q,tipo='objetiva',alternativas=a,resposta_esperada=correct) for q,a,correct in questions]})['id_prova']
     call('PATCH',f'/professor/provas/{exam}/publicar')
   if course['key']!='blender':
    exams=call('GET',f'/professor/cursos/{cid}/provas')['provas']
    if not any(p['estado']=='vigente' for p in exams):
     questions=([('Qual estrutura representa uma decisão?',['if','print','str'],'if'),('Qual comando percorre elementos de uma lista?',['for','input','return'],'for'),('Para que serve uma variável?',['Guardar um valor','Alterar o monitor','Excluir o interpretador'],'Guardar um valor')] if course['key']=='python' else [('O que ajuda a destacar o assunto?',['Escolher um fundo adequado','Ignorar o enquadramento','Cobrir a lente'],'Escolher um fundo adequado'),('Qual opção tende a produzir luz mais suave?',['Luz difusa de uma janela','Flash direto muito próximo','Sol forte sem difusão'],'Luz difusa de uma janela'),('O enquadramento define o quê?',['Os elementos incluídos na imagem','O nome do arquivo apenas','A marca da câmera'],'Os elementos incluídos na imagem')])
     exam=call('POST',f'/professor/cursos/{cid}/provas',json={'titulo':'Conceitos introdutórios - demonstração','nota_minima':70,'questoes':[dict(enunciado=q,tipo='objetiva',alternativas=a,resposta_esperada=correct) for q,a,correct in questions]})['id_prova']
     call('PATCH',f'/professor/provas/{exam}/publicar')
   # A rota exige prova publicada ate para um curso de apoio ainda sem aulas.
   call('PATCH',f'/professor/cursos/{cid}/status',json={'status':1})
   result.append(dict(id=cid,**course,aulas=lessons))
   (OUT/'cadastro.json').write_text(json.dumps(dict(professor=prof,cursos=result),ensure_ascii=False,indent=2),encoding='utf8')
   print(f'Curso publicado: {cid} {course["titulo"]}',flush=True)
if __name__=='__main__':main()
