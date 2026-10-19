import os

import fdb
from flask import current_app


def _parametros_log():
    return {
        "host": current_app.config["DB_HOST"],
        "database": current_app.config["DB_LOG_NAME"],
        "user": current_app.config["AUDIT_LOG_USER"],
        "password": current_app.config["AUDIT_LOG_PASSWORD"],
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
                    TIPO_USUARIO SMALLINT,
                    ACAO VARCHAR(20) NOT NULL,
                    TABELA_AFETADA VARCHAR(80),
                    ID_REGISTRO VARCHAR(200),
                    ROTA VARCHAR(300),
                    METODO VARCHAR(10),
                    CAMPOS_ALTERADOS BLOB SUB_TYPE TEXT,
                    VALORES_ANTES BLOB SUB_TYPE TEXT,
                    VALORES_DEPOIS BLOB SUB_TYPE TEXT,
                    DETALHES BLOB SUB_TYPE TEXT,
                    IP VARCHAR(80),
                    USER_AGENT VARCHAR(255),
                    REQUEST_ID VARCHAR(80),
                    ORIGEM VARCHAR(30),
                    USUARIO_BANCO VARCHAR(63),
                    CRIADO_EM TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
                """
            )

        colunas = {
            "TIPO_USUARIO": "TIPO_USUARIO SMALLINT",
            "ID_REGISTRO": "ID_REGISTRO VARCHAR(200)",
            "ROTA": "ROTA VARCHAR(300)",
            "METODO": "METODO VARCHAR(10)",
            "CAMPOS_ALTERADOS": "CAMPOS_ALTERADOS BLOB SUB_TYPE TEXT",
            "VALORES_ANTES": "VALORES_ANTES BLOB SUB_TYPE TEXT",
            "VALORES_DEPOIS": "VALORES_DEPOIS BLOB SUB_TYPE TEXT",
            "IP": "IP VARCHAR(80)",
            "USER_AGENT": "USER_AGENT VARCHAR(255)",
            "REQUEST_ID": "REQUEST_ID VARCHAR(80)",
            "ORIGEM": "ORIGEM VARCHAR(30)",
            "USUARIO_BANCO": "USUARIO_BANCO VARCHAR(63)",
        }
        for nome, ddl in colunas.items():
            cursor.execute(
                """
                SELECT 1
                FROM RDB$RELATION_FIELDS
                WHERE RDB$RELATION_NAME = 'LOG_GRAVACAO'
                  AND RDB$FIELD_NAME = ?
                """,
                (nome,),
            )
            if not cursor.fetchone():
                cursor.execute(f"ALTER TABLE LOG_GRAVACAO ADD {ddl}")

        cursor.execute(
            """
            SELECT 1
            FROM RDB$GENERATORS
            WHERE RDB$GENERATOR_NAME = 'GEN_LOG_GRAVACAO'
            """
        )
        if not cursor.fetchone():
            cursor.execute("CREATE GENERATOR GEN_LOG_GRAVACAO")

        cursor.execute("SELECT COALESCE(MAX(ID_LOG), 0) FROM LOG_GRAVACAO")
        maior_id = int((cursor.fetchone() or (0,))[0] or 0)
        cursor.execute("SELECT GEN_ID(GEN_LOG_GRAVACAO, 0) FROM RDB$DATABASE")
        id_atual = int((cursor.fetchone() or (0,))[0] or 0)
        if maior_id > id_atual:
            cursor.execute(
                "SELECT GEN_ID(GEN_LOG_GRAVACAO, ?) FROM RDB$DATABASE",
                (maior_id - id_atual,),
            )
        con.commit()
    except Exception:
        con.rollback()
        raise
    finally:
        cursor.close()
        con.close()
