

import fdb
from flask import current_app

from auditoria_24_37 import definir_contexto_auditoria


# Sprint item 37 - Desenvolver rotina de gravação de log de todas as rotinas como gravar, editar e excluir em banco separado - Abre a conexão e configura o contexto usado pelos gatilhos de auditoria
# Abre a conexão principal e prepara o contexto de auditoria antes de qualquer operação.
def get_db():
    con = fdb.connect(
        host=current_app.config["DB_HOST"],
        database=current_app.config["DB_NAME"],
        user=current_app.config["DB_USER"],
        password=current_app.config["DB_PASSWORD"],
        charset="UTF8"
    )
    try:
        # Os gatilhos leem deste contexto o ator, a rota e o identificador da requisição.
        definir_contexto_auditoria(con)
    except Exception:
        con.close()
        raise
    return con
# Fim item 37
