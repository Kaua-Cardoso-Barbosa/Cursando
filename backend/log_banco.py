import os

import fdb
from flask import current_app


def _parametros_log():
    return {
        "host": current_app.config["DB_HOST"],
        "database": current_app.config["DB_LOG_NAME"],
        "user": current_app.config["DB_USER"],
        "password": current_app.config["DB_PASSWORD"],
        "charset": "UTF8",
    }


def get_log_db():
    parametros = _parametros_log()
    caminho = parametros["database"]

    if not os.path.exists(caminho):
        os.makedirs(os.path.dirname(caminho), exist_ok=True)
        fdb.create_database(**parametros)

    return fdb.connect(**parametros)


def garantir_log_schema():
    con = get_log_db()
    cursor = con.cursor()

    try:
        cursor.execute(
            """
            SELECT 1
            FROM RDB$RELATIONS
            WHERE RDB$RELATION_NAME = 'LOG_GRAVACAO'
            """
        )
        if not cursor.fetchone():
            cursor.execute(
                """
                CREATE TABLE LOG_GRAVACAO (
                    ID_LOG INTEGER NOT NULL PRIMARY KEY,
                    ID_USUARIO INTEGER,
                    ACAO VARCHAR(20) NOT NULL,
                    TABELA_AFETADA VARCHAR(80),
                    ROTA VARCHAR(300),
                    METODO VARCHAR(10),
                    DETALHES BLOB SUB_TYPE TEXT,
                    CRIADO_EM TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
                """
            )
        else:
            cursor.execute(
                """
                SELECT 1
                FROM RDB$RELATION_FIELDS
                WHERE RDB$RELATION_NAME = 'LOG_GRAVACAO'
                  AND RDB$FIELD_NAME = 'ROTA'
                """
            )
            if not cursor.fetchone():
                cursor.execute("ALTER TABLE LOG_GRAVACAO ADD ROTA VARCHAR(300)")

            cursor.execute(
                """
                SELECT 1
                FROM RDB$RELATION_FIELDS
                WHERE RDB$RELATION_NAME = 'LOG_GRAVACAO'
                  AND RDB$FIELD_NAME = 'METODO'
                """
            )
            if not cursor.fetchone():
                cursor.execute("ALTER TABLE LOG_GRAVACAO ADD METODO VARCHAR(10)")
        con.commit()
    except Exception:
        con.rollback()
        raise
    finally:
        cursor.close()
        con.close()
