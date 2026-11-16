import sys,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/'backend'))
from app import app
from banco_37 import get_db
from flask_jwt_extended import JWTManager,create_access_token
from datetime import timedelta
JWTManager(app)
with app.app_context():
 if '--token' in sys.argv:
  print(create_access_token(identity='8',additional_claims={'tipo':2},expires_delta=timedelta(hours=6)))
 else:
  from aluno_4_6_34 import exigir_assinatura_ativa
  con=get_db();cur=con.cursor()
  cur.execute('SELECT ID_USUARIO FROM USUARIOS WHERE TIPO_USUARIO=2 ORDER BY ID_USUARIO')
  rows=cur.fetchall()
  for row in rows:
   blocked=exigir_assinatura_ativa(cur,row[0])
   print(row[0], 'ativa' if not blocked else 'inativa')
  con.close()
