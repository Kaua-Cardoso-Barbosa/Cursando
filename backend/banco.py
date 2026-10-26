"""Sprint item 37 - Desenvolver rotina de gravação de log de todas as rotinas como gravar, editar e excluir em banco separado. conexão com o banco principal e contexto dos triggers.

Toda rota que chama ``get_db`` recebe uma conexão Firebird. Antes de devolver
a conexão, colocamos nela usuário, perfil e requisição atuais. O trigger lê
esses dados de sessão para atribuir o log a quem fez a mudança. Cada rota
fecha a conexão depois de usar o cursor; em falha de preparação, fechamos aqui.
"""

import fdb
from flask import current_app

from auditoria import definir_contexto_auditoria


def get_db():
    con = fdb.connect(
        host=current_app.config["DB_HOST"],
        database=current_app.config["DB_NAME"],
        user=current_app.config["DB_USER"],
        password=current_app.config["DB_PASSWORD"],
        charset="UTF8"
    )
    try:
        definir_contexto_auditoria(con)
    except Exception:
        con.close()
        raise
    return con
