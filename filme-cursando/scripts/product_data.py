"""Leitura de dados de demonstração: não inicia o Flask nem altera conteúdo."""
import sys, json, shutil
from pathlib import Path
from datetime import timedelta
import requests
ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'backend'))
from app import app
from banco_37 import get_db
from flask_jwt_extended import JWTManager, create_access_token
JWTManager(app)
app.app_context().push()
con = get_db()
cur = con.cursor()
cur.execute('SELECT FIRST 1 ID_USUARIO FROM MATRICULAS WHERE ID_CURSO = 11 AND STATUS_MATRICULA = 1 ORDER BY ID_USUARIO')
row = cur.fetchone()
if not row: raise RuntimeError('Aluno de demonstração não encontrado')
user = row[0]
con.close()
with app.app_context():
    token = create_access_token(identity=str(user), additional_claims={'tipo': 2}, expires_delta=timedelta(minutes=30))
session = requests.Session()
session.headers['Authorization'] = 'Bearer ' + token
def get(path):
    r = session.get('http://127.0.0.1:5000' + path, timeout=30)
    r.raise_for_status()
    return r.json()
catalog = get('/cursos/home')
course = get('/aluno/cursos/11')
dashboard = get('/aluno/dashboard')
courses = get('/aluno/cursos')
lessons = course.get('aulas', []) or [a for m in course.get('modulos', []) for a in m.get('aulas', [])]
payload = {'catalog': catalog, 'course': course, 'dashboard': dashboard, 'courses': courses, 'lesson': None, 'exam': None}
if lessons:
    payload['lesson'] = get('/aluno/aulas/' + str(lessons[0]['id']))
try: payload['exam'] = get('/aluno/cursos/11/prova')
except requests.HTTPError: pass
# Nenhum perfil, cookie ou token é salvo. Nomes pessoais do painel são mascarados na captura.
dest = ROOT / 'filme-cursando/engine/assets/cursando'
(dest / 'demo-private.json').write_text(json.dumps(payload, ensure_ascii=False, default=str), encoding='utf-8')
selected = {c['id']: c for c in catalog['destaques'] + catalog['mais_assinados']}
selected = sorted(selected.values(), key=lambda c: [11, 9, 8, 20].index(c['id']) if c['id'] in [11, 9, 8, 20] else 10)[:4]
for i, c in enumerate(selected):
    source = ROOT / 'backend' / c['imagem'].lstrip('/')
    target = 'course-' + str(i) + source.suffix
    shutil.copy2(source, dest / target)
    c['asset'] = target
(dest / 'courses.json').write_text(json.dumps(selected, ensure_ascii=False), encoding='utf-8')
shutil.copy2(ROOT/'frontend/public/imagens_assets/logo.png', dest/'logo.png')
print('Dados de curso, aulas e catálogo lidos. Nenhuma operação de escrita foi enviada.')
