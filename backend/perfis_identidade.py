"""Identificadores públicos imutáveis e arrobas opcionais dos professores."""
import re
import unicodedata
from threading import Lock
from uuid import uuid4

import fdb
from banco_37 import get_db

_pronto = False
_trava = Lock()


class ErroArroba(ValueError):
    def __init__(self, mensagem, status=400):
        super().__init__(mensagem)
        self.status = status


def normalizar_arroba(valor):
    if valor is None or valor == '':
        return None
    if not isinstance(valor, str):
        raise ErroArroba('Informe um @ válido.')
    valor = valor.strip().removeprefix('@').lower()
    if not valor:
        return None
    if not re.fullmatch(r'[a-z][a-z0-9._]{2,39}', valor) or '..' in valor or valor.endswith('.'):
        raise ErroArroba('Use de 3 a 40 caracteres: letras sem acento, números, ponto ou sublinhado. Comece com uma letra.')
    if valor in {'admin','administrador','cursando','suporte','api','login','cadastro','perfil','perfis'}:
        raise ErroArroba('Este @ é reservado. Escolha outro.')
    return valor


def preparar_identidades():
    global _pronto
    if _pronto:
        return
    with _trava:
        if _pronto:
            return
        con = get_db()
        cur = con.cursor()
        try:
            cur.execute("SELECT 1 FROM RDB$RELATION_FIELDS WHERE RDB$RELATION_NAME='USUARIOS' AND RDB$FIELD_NAME='ARROBA'")
            primeira_migracao = cur.fetchone() is None
            for coluna, ddl in [('ID_PUBLICO','VARCHAR(40)'),('ARROBA','VARCHAR(40)')]:
                cur.execute("SELECT 1 FROM RDB$RELATION_FIELDS WHERE RDB$RELATION_NAME='USUARIOS' AND RDB$FIELD_NAME=?",(coluna,))
                if not cur.fetchone():
                    cur.execute(f'ALTER TABLE USUARIOS ADD {coluna} {ddl}')
            con.commit()
            cur.execute('SELECT ID_USUARIO,NOME,TIPO_USUARIO,ID_PUBLICO,ARROBA FROM USUARIOS ORDER BY ID_USUARIO')
            usuarios = cur.fetchall()
            ocupados = {r[4].lower() for r in usuarios if r[4]}
            for ident, nome, tipo, publico, arroba in usuarios:
                if not publico:
                    cur.execute('UPDATE USUARIOS SET ID_PUBLICO=? WHERE ID_USUARIO=?',('u_'+uuid4().hex,ident))
                if primeira_migracao and tipo == 1 and not arroba:
                    base = unicodedata.normalize('NFKD',nome).encode('ascii','ignore').decode().lower()
                    base = re.sub(r'[^a-z0-9]+','.',base).strip('.')[:32].rstrip('.')
                    if not base or not base[0].isalpha() or len(base)<3:
                        base = 'professor.'+base
                    candidato = base
                    sufixo = 2
                    while candidato in ocupados or candidato in {'admin','administrador','cursando','suporte','api','login','cadastro','perfil','perfis'}:
                        candidato = f'{base}.{sufixo}'
                        sufixo += 1
                    cur.execute('UPDATE USUARIOS SET ARROBA=? WHERE ID_USUARIO=?',(candidato,ident))
                    ocupados.add(candidato)
            for indice,coluna in [('UQ_USUARIOS_ID_PUBLICO','ID_PUBLICO'),('UQ_USUARIOS_ARROBA','ARROBA')]:
                cur.execute('SELECT 1 FROM RDB$INDICES WHERE RDB$INDEX_NAME=?',(indice,))
                if not cur.fetchone():
                    cur.execute(f'CREATE UNIQUE INDEX {indice} ON USUARIOS ({coluna})')
            # Cobre também cadastros legados e scripts que não enviam o campo.
            cur.execute('''CREATE OR ALTER TRIGGER BI_USUARIOS_PERFIL FOR USUARIOS
                ACTIVE BEFORE INSERT POSITION 0 AS BEGIN
                  IF (NEW.ID_PUBLICO IS NULL) THEN
                    NEW.ID_PUBLICO = 'u_' || REPLACE(UUID_TO_CHAR(GEN_UUID()), '-', '');
                END''')
            con.commit()
            _pronto = True
        except Exception:
            con.rollback()
            raise
        finally:
            cur.close()
            con.close()


def identidade_publica(cur, id_usuario):
    cur.execute('SELECT ID_PUBLICO,ARROBA,TIPO_USUARIO FROM USUARIOS WHERE ID_USUARIO=?',(id_usuario,))
    row = cur.fetchone()
    if not row:
        return {}
    publico, arroba, tipo = row
    if not publico:
        publico = 'u_'+uuid4().hex
        cur.execute('UPDATE USUARIOS SET ID_PUBLICO=? WHERE ID_USUARIO=?',(publico,id_usuario))
    return dict(id_publico=publico,arroba=arroba,identificador='@'+arroba if tipo==1 and arroba else publico)


def salvar_arroba(cur,id_usuario,valor):
    cur.execute('SELECT TIPO_USUARIO FROM USUARIOS WHERE ID_USUARIO=?',(id_usuario,))
    tipo = cur.fetchone()
    if not tipo or tipo[0] != 1:
        raise ErroArroba('Somente professores podem escolher um @.')
    arroba = normalizar_arroba(valor)
    if arroba:
        cur.execute('SELECT 1 FROM USUARIOS WHERE ARROBA=? AND ID_USUARIO<>?',(arroba,id_usuario))
        if cur.fetchone():
            raise ErroArroba('Este @ já está em uso. Escolha outro.',409)
    try:
        cur.execute('UPDATE USUARIOS SET ARROBA=? WHERE ID_USUARIO=?',(arroba,id_usuario))
    except fdb.IntegrityError as erro:
        raise ErroArroba('Este @ já está em uso. Escolha outro.',409) from erro
