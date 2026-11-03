

# Usa o sistema de arquivos para criar o banco de logs quando necessário.
import os

# O driver Firebird abre o banco separado de auditoria.
import fdb
from flask import current_app


# Sprint item 37 - Desenvolver rotina de gravação de log de todas as rotinas como gravar, editar e excluir em banco separado - Seleciona o caminho e a autenticação do banco separado de logs
def _parametros_log():
    # Reúne conexão, credenciais e codificação do banco de logs.
    return {
        "host": current_app.config["DB_HOST"],
        "database": current_app.config["DB_LOG_NAME"],
        "user": current_app.config["AUDIT_LOG_USER"],
        "password": current_app.config["AUDIT_LOG_PASSWORD"],
        "charset": "UTF8",
    }


def get_log_db():
    # Cria o arquivo de logs se necessário e devolve uma conexão Firebird.
    
    parametros = _parametros_log()
    caminho = parametros["database"]

    # Na primeira execução, cria o diretório e o arquivo antes de conectar.
    if not os.path.exists(caminho):
        os.makedirs(os.path.dirname(caminho), exist_ok=True)
        fdb.create_database(**parametros)

    # As consultas e gravações de log usam sempre esta conexão separada.
    return fdb.connect(**parametros)


def garantir_log_schema():
    # Prepara as tabelas e o gerador de IDs do banco de logs.
    
    # Abre conexão própria para alterações na estrutura de auditoria.
    con = get_log_db()
    cursor = con.cursor()

    try:
        
        
        cursor.execute(
            "SELECT 1 FROM RDB$RELATIONS WHERE RDB$RELATION_NAME = 'LOG_ACOES'"
        )
        # Cria LOG_ACOES apenas quando ainda não existe.
        if not cursor.fetchone():
            
            
            # Guarda ações da aplicação com usuário, rota, método e detalhes.
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
            # Guarda alterações em tabelas com valores anteriores, posteriores e contexto da requisição.
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
            
            
            con.commit()

        # Lista colunas acrescentadas a bancos de log criados em versões anteriores.
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
        # Consulta metadados antes de adicionar cada coluna ausente.
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
        # Obtém o maior ID gravado para sincronizar o gerador.
        maior_id = int((cursor.fetchone() or (0,))[0] or 0)
        
        
        cursor.execute("SELECT GEN_ID(GEN_LOG_GRAVACAO, 0) FROM RDB$DATABASE")
        id_atual = int((cursor.fetchone() or (0,))[0] or 0)
        # Avança o gerador para evitar colisão com registros existentes.
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
    # Desfaz a alteração de estrutura se ocorrer uma falha.
    except Exception:
        con.rollback()
        raise
    # Fecha cursor e conexão em qualquer resultado.
    finally:
        cursor.close()
        con.close()
# Fim item 37
