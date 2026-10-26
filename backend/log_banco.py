"""Sprint item 37 - Desenvolver rotina de gravação de log de todas as rotinas como gravar, editar e excluir em banco separado. banco separado que recebe os registros dos triggers.

O caminho vem de DB_LOG_NAME no .env. ``get_log_db`` abre esse arquivo; a
estrutura cria LOG_GRAVACAO, seu gerador e LOG_ACOES quando necessário. A
segunda tabela conserva os eventos antigos consultados pela rota /admin/logs.
ANTES/DEPOIS são texto JSON guardado em BLOBs: BLOB é o tipo do Firebird para
conteúdo maior.
O log não é preenchido pelas telas; os triggers do banco principal o gravam.
"""

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
    """Sprint item 37 - Desenvolver rotina de gravação de log de todas as rotinas como gravar, editar e excluir em banco separado. abre o banco de log e cria o arquivo se o caminho ainda não existe."""
    parametros = _parametros_log()
    caminho = parametros["database"]

    if not os.path.exists(caminho):
        os.makedirs(os.path.dirname(caminho), exist_ok=True)
        fdb.create_database(**parametros)

    return fdb.connect(**parametros)


def garantir_log_schema():
    """Itens 24 e 25: garante colunas consultáveis, campos antes/depois e gerador.

    Cada ALTER é confirmado antes da próxima leitura do esquema no Firebird.
    O gerador acompanha o maior ID existente para evitar colisões futuras.
    """
    con = get_log_db()
    cursor = con.cursor()

    try:
        # Sprint item 37 - Desenvolver rotina de gravação de log de todas as rotinas como gravar, editar e excluir em banco separado. o histórico da rota /admin/logs mora no mesmo arquivo de
        # auditoria, nunca no banco principal da aplicação.
        cursor.execute(
            "SELECT 1 FROM RDB$RELATIONS WHERE RDB$RELATION_NAME = 'LOG_ACOES'"
        )
        if not cursor.fetchone():
            # O histórico antigo tem formato próprio. Mantê-lo aqui permite
            # consultar eventos migrados sem recriar tabelas no banco principal.
            cursor.execute(
                """
                CREATE TABLE LOG_ACOES (
                    ID_LOG INTEGER NOT NULL PRIMARY KEY,
                    ID_USUARIO INTEGER,
                    TIPO_USUARIO INTEGER,
                    NOME VARCHAR(150),
                    EMAIL VARCHAR(150),
                    ACAO VARCHAR(80) NOT NULL,
                    ROTA VARCHAR(300) NOT NULL,
                    METODO VARCHAR(10) NOT NULL,
                    DETALHES BLOB SUB_TYPE TEXT,
                    CRIADO_EM TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
                """
            )
            con.commit()

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
            # O Firebird nao disponibiliza a tabela ao restante da transacao
            # ate que a alteracao de metadados seja confirmada.
            con.commit()

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
            # O mesmo arquivo de log pode ter sido criado antes de alguns
            # campos de contexto. Cada coluna ausente é acrescentada uma vez.
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
                con.commit()

        cursor.execute(
            """
            SELECT 1
            FROM RDB$GENERATORS
            WHERE RDB$GENERATOR_NAME = 'GEN_LOG_GRAVACAO'
            """
        )
        if not cursor.fetchone():
            cursor.execute("CREATE GENERATOR GEN_LOG_GRAVACAO")
            con.commit()

        cursor.execute("SELECT COALESCE(MAX(ID_LOG), 0) FROM LOG_GRAVACAO")
        maior_id = int((cursor.fetchone() or (0,))[0] or 0)
        # O trigger usa GEN_ID para novos IDs. Após importações antigas, o
        # gerador deve alcançar o maior ID para não colidir com um registro.
        cursor.execute("SELECT GEN_ID(GEN_LOG_GRAVACAO, 0) FROM RDB$DATABASE")
        id_atual = int((cursor.fetchone() or (0,))[0] or 0)
        if maior_id > id_atual:
            cursor.execute(
                "SELECT GEN_ID(GEN_LOG_GRAVACAO, CAST(? AS INTEGER)) FROM RDB$DATABASE",
                (maior_id - id_atual,),
            )
            id_atual = int((cursor.fetchone() or (0,))[0] or 0)
            if id_atual < maior_id:
                raise RuntimeError(
                    "O gerador GEN_LOG_GRAVACAO permaneceu abaixo do maior ID_LOG."
                )
        con.commit()
    except Exception:
        con.rollback()
        raise
    finally:
        cursor.close()
        con.close()
