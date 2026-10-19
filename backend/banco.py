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
