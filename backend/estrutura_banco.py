"""Estrutura das tabelas usadas pelos itens da sprint.

Cada função pequena verifica se tabela ou coluna já existe antes de criar.
`garantir_estrutura_banco` reúne essas etapas e usa um lock para impedir que
duas requisições tentem criar a mesma estrutura ao mesmo tempo. As rotas
chamam essa função antes de usar as tabelas.
"""

from threading import Lock

from auditoria import garantir_gatilhos_auditoria
from banco import get_db
from log_banco import garantir_log_schema



_schema_pronto = False
_schema_lock = Lock()



def _existe_relacao(cursor, nome):
    cursor.execute(
        """
        SELECT 1
        FROM RDB$RELATIONS
        WHERE RDB$RELATION_NAME = ?
        """,
        (nome.upper(),),
    )
    return cursor.fetchone() is not None



def _criar_tabela(cursor, nome, ddl):
    if not _existe_relacao(cursor, nome):
        cursor.execute(ddl)



def _existe_coluna(cursor, tabela, coluna):
    cursor.execute(
        """
        SELECT 1
        FROM RDB$RELATION_FIELDS
        WHERE RDB$RELATION_NAME = ? AND RDB$FIELD_NAME = ?
        """,
        (tabela.upper(), coluna.upper()),
    )
    return cursor.fetchone() is not None



def _garantir_coluna(cursor, tabela, coluna, ddl):
    if not _existe_coluna(cursor, tabela, coluna):
        cursor.execute(f"ALTER TABLE {tabela} ADD {ddl}")



def _garantir_estrutura_banco():
    global _schema_pronto

    if _schema_pronto:
        return

    con = get_db()
    cursor = con.cursor()

    try:
        _criar_tabela(
            cursor,
            "MODULOS_CURSO",
            """
            CREATE TABLE MODULOS_CURSO (
                ID_MODULO INTEGER NOT NULL PRIMARY KEY,
                ID_CURSO INTEGER NOT NULL,
                TITULO VARCHAR(150) NOT NULL,
                DESCRICAO BLOB SUB_TYPE TEXT,
                IMAGEM_URL VARCHAR(500),
                ORDEM INTEGER DEFAULT 0,
                STATUS INTEGER DEFAULT 1 NOT NULL,
                CRIADO_EM TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                ATUALIZADO_EM TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """,
        )
        _criar_tabela(
            cursor,
            "MATERIAIS_CURSO",
            """
            CREATE TABLE MATERIAIS_CURSO (
                ID_MATERIAL INTEGER NOT NULL PRIMARY KEY,
                ID_CURSO INTEGER NOT NULL,
                TITULO VARCHAR(150) NOT NULL,
                TIPO VARCHAR(30) NOT NULL,
                URL VARCHAR(1000) NOT NULL,
                DESCRICAO BLOB SUB_TYPE TEXT,
                CRIADO_EM TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """,
        )
        _criar_tabela(
            cursor,
            "AVALIACOES_CURSO",
            """
            CREATE TABLE AVALIACOES_CURSO (
                ID_AVALIACAO INTEGER NOT NULL PRIMARY KEY,
                ID_CURSO INTEGER NOT NULL,
                ID_USUARIO INTEGER NOT NULL,
                NOTA INTEGER NOT NULL,
                COMENTARIO BLOB SUB_TYPE TEXT,
                CRIADO_EM TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """,
        )
        _criar_tabela(
            cursor,
            "PROVAS_CURSO",
            """
            CREATE TABLE PROVAS_CURSO (
                ID_PROVA INTEGER NOT NULL PRIMARY KEY,
                ID_CURSO INTEGER NOT NULL,
                TITULO VARCHAR(150) NOT NULL,
                PUBLICADA INTEGER DEFAULT 0,
                CRIADO_EM TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """,
        )
        _criar_tabela(
            cursor,
            "QUESTOES_PROVA",
            """
            CREATE TABLE QUESTOES_PROVA (
                ID_QUESTAO INTEGER NOT NULL PRIMARY KEY,
                ID_PROVA INTEGER NOT NULL,
                ENUNCIADO BLOB SUB_TYPE TEXT NOT NULL,
                TIPO VARCHAR(20) NOT NULL,
                ALTERNATIVAS BLOB SUB_TYPE TEXT,
                RESPOSTA_ESPERADA BLOB SUB_TYPE TEXT
            )
            """,
        )
        # Sprint item 20 - Permitir que o instrutor cadastre provas para validar a conclusão do curso. separa a definição da prova, as questões e as tentativas.
        # CORRIGIDO_EM fica em RESPOSTAS_PROVA e marca quando há nota final;
        # esse momento determina o início do prazo para uma nova tentativa.
        _criar_tabela(
            cursor,
            "RESPOSTAS_PROVA",
            """
            CREATE TABLE RESPOSTAS_PROVA (
                ID_RESPOSTA INTEGER NOT NULL PRIMARY KEY,
                ID_PROVA INTEGER NOT NULL,
                ID_USUARIO INTEGER NOT NULL,
                RESPOSTAS BLOB SUB_TYPE TEXT,
                STATUS INTEGER DEFAULT 0,
                FEEDBACK BLOB SUB_TYPE TEXT,
                NOTA INTEGER,
                ACERTOS INTEGER,
                TOTAL_QUESTOES INTEGER,
                CORRECOES_DISSERTATIVAS BLOB SUB_TYPE TEXT,
                CRIADO_EM TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                CORRIGIDO_EM TIMESTAMP
            )
            """,
        )
        _criar_tabela(
            cursor,
            "CERTIFICADOS",
            """
            CREATE TABLE CERTIFICADOS (
                ID_CERTIFICADO INTEGER NOT NULL PRIMARY KEY,
                ID_CURSO INTEGER NOT NULL,
                ID_USUARIO INTEGER NOT NULL,
                CODIGO VARCHAR(80) NOT NULL,
                CRIADO_EM TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """,
        )
        _criar_tabela(
            cursor,
            "CUSTOS_PLATAFORMA",
            # Sprint item 36 - Permitir cadastro e acompanhamento dos custos da plataforma. armazena despesas da plataforma para consulta e acompanhamento pelo administrador.
            """
            CREATE TABLE CUSTOS_PLATAFORMA (
                ID_CUSTO INTEGER NOT NULL PRIMARY KEY,
                DESCRICAO VARCHAR(200) NOT NULL,
                VALOR NUMERIC(15,2) NOT NULL,
                DATA_CUSTO DATE DEFAULT CURRENT_DATE,
                CRIADO_EM TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """,
        )
        _criar_tabela(
            cursor,
            "CATEGORIAS_CUSTO",
            """
            CREATE TABLE CATEGORIAS_CUSTO (
                ID_CATEGORIA INTEGER NOT NULL PRIMARY KEY,
                NOME VARCHAR(80) NOT NULL UNIQUE,
                CRIADO_EM TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """,
        )
        _criar_tabela(
            cursor,
            "SAQUES_INSTRUTOR",
            """
            CREATE TABLE SAQUES_INSTRUTOR (
                ID_SAQUE INTEGER NOT NULL PRIMARY KEY,
                ID_USUARIO INTEGER NOT NULL,
                VALOR NUMERIC(15,2) NOT NULL,
                STATUS INTEGER DEFAULT 0,
                CHAVE_PIX VARCHAR(140),
                COMPROVANTE VARCHAR(500),
                MOTIVO_RECUSA VARCHAR(500),
                ID_ADMIN INTEGER,
                ANALISADO_EM TIMESTAMP,
                CRIADO_EM TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """,
        )
        _criar_tabela(
            cursor,
            "FINANCEIRO_CONFIG",
            """
            CREATE TABLE FINANCEIRO_CONFIG (
                ID_CONFIG INTEGER NOT NULL PRIMARY KEY,
                PERCENTUAL_INSTRUTORES NUMERIC(5,2) DEFAULT 50,
                ATUALIZADO_EM TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """,
        )
        _criar_tabela(
            cursor,
            "MENSAGENS_CHAT",
            """
            CREATE TABLE MENSAGENS_CHAT (
                ID_MENSAGEM INTEGER NOT NULL PRIMARY KEY,
                ID_CURSO INTEGER NOT NULL,
                ID_ALUNO INTEGER NOT NULL,
                ID_REMETENTE INTEGER NOT NULL,
                ID_DESTINATARIO INTEGER NOT NULL,
                TEXTO BLOB SUB_TYPE TEXT NOT NULL,
                LIDA INTEGER DEFAULT 0,
                CRIADO_EM TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """,
        )
        _criar_tabela(
            cursor,
            "CATEGORIAS_CURSO",
            """
            CREATE TABLE CATEGORIAS_CURSO (
                ID_CATEGORIA INTEGER NOT NULL PRIMARY KEY,
                NOME VARCHAR(120) NOT NULL,
                NOME_NORMALIZADO VARCHAR(120) NOT NULL
            )
            """,
        )
        _criar_tabela(
            cursor,
            "TEMAS_CURSO",
            """
            CREATE TABLE TEMAS_CURSO (
                ID_TEMA INTEGER NOT NULL PRIMARY KEY,
                NOME VARCHAR(120) NOT NULL,
                NOME_NORMALIZADO VARCHAR(120) NOT NULL
            )
            """,
        )
        _criar_tabela(
            cursor,
            "CURSO_TAXONOMIA",
            """
            CREATE TABLE CURSO_TAXONOMIA (
                ID_CURSO INTEGER NOT NULL PRIMARY KEY,
                ID_CATEGORIA INTEGER,
                ID_TEMA INTEGER
            )
            """,
        )
        # Sprint item 9 - Exibir acessos aos cursos, compras realizadas e taxa de conversão. guarda visitas e inscrições únicas por aluno e mês para medir conversão por curso.
        _criar_tabela(
            cursor,
            "EVENTOS_CURSOS",
            """
            CREATE TABLE EVENTOS_CURSOS (
                ID_CURSO INTEGER NOT NULL,
                ID_USUARIO INTEGER NOT NULL,
                TIPO_EVENTO VARCHAR(20) NOT NULL,
                MES_REFERENCIA DATE NOT NULL,
                CRIADO_EM TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT PK_EVENTOS_CURSOS PRIMARY KEY (ID_CURSO, ID_USUARIO, TIPO_EVENTO, MES_REFERENCIA)
            )
            """,
        )
        con.commit()
        cursor.execute("SELECT COUNT(*) FROM FINANCEIRO_CONFIG")
        if int((cursor.fetchone() or (0,))[0] or 0) == 0:
            cursor.execute(
                """
                INSERT INTO FINANCEIRO_CONFIG (ID_CONFIG, PERCENTUAL_INSTRUTORES)
                VALUES (1, 50)
                """
            )
        # valor, vencimento e pagamento permitem
        # distinguir mensalidade paga, mensalidade vencida e fatura aberta.
        _garantir_coluna(cursor, "ASSINATURAS", "VALOR", "VALOR NUMERIC(15,2)")
        _garantir_coluna(cursor, "ASSINATURAS", "DATA_VENCIMENTO", "DATA_VENCIMENTO TIMESTAMP")
        _garantir_coluna(cursor, "ASSINATURAS", "DATA_PAGAMENTO", "DATA_PAGAMENTO TIMESTAMP")
        _garantir_coluna(cursor, "ASSINATURAS", "CRIADO_EM", "CRIADO_EM TIMESTAMP DEFAULT CURRENT_TIMESTAMP")
        # Sprint item 32 - Permitir solicitação de saque para a conta ARKHE. o fluxo atual de saque é manual: guarda chave Pix,
        # comprovante ou motivo e quem analisou. As colunas antigas da Arkhé
        # permanecem no esquema, mas a análise não depende delas.
        _garantir_coluna(cursor, "SAQUES_INSTRUTOR", "ID_SAQUE_ARKHE", "ID_SAQUE_ARKHE VARCHAR(120)")
        _garantir_coluna(cursor, "SAQUES_INSTRUTOR", "RESPOSTA_ARKHE", "RESPOSTA_ARKHE BLOB SUB_TYPE TEXT")
        _garantir_coluna(cursor, "SAQUES_INSTRUTOR", "CHAVE_PIX", "CHAVE_PIX VARCHAR(140)")
        _garantir_coluna(cursor, "SAQUES_INSTRUTOR", "COMPROVANTE", "COMPROVANTE VARCHAR(500)")
        _garantir_coluna(cursor, "SAQUES_INSTRUTOR", "MOTIVO_RECUSA", "MOTIVO_RECUSA VARCHAR(500)")
        _garantir_coluna(cursor, "SAQUES_INSTRUTOR", "ID_ADMIN", "ID_ADMIN INTEGER")
        _garantir_coluna(cursor, "SAQUES_INSTRUTOR", "ANALISADO_EM", "ANALISADO_EM TIMESTAMP")
        _garantir_coluna(cursor, "CUSTOS_PLATAFORMA", "CATEGORIA", "CATEGORIA VARCHAR(80)")
        _garantir_coluna(cursor, "CUSTOS_PLATAFORMA", "ID_USUARIO", "ID_USUARIO INTEGER")
        _garantir_coluna(cursor, "CUSTOS_PLATAFORMA", "ID_CATEGORIA", "ID_CATEGORIA INTEGER")
        _garantir_coluna(cursor, "CUSTOS_PLATAFORMA", "TIPO_CUSTO", "TIPO_CUSTO VARCHAR(12) DEFAULT 'UNICO'")
        _garantir_coluna(cursor, "CUSTOS_PLATAFORMA", "DATA_INICIO", "DATA_INICIO DATE")
        _garantir_coluna(cursor, "CUSTOS_PLATAFORMA", "DATA_FIM", "DATA_FIM DATE")
        _garantir_coluna(cursor, "CUSTOS_PLATAFORMA", "ID_GRUPO_MENSAL", "ID_GRUPO_MENSAL INTEGER")
        # Sprint item 36 - Permitir cadastro e acompanhamento dos custos da plataforma. confirma as colunas novas antes de usá-las na migração de custos no Firebird.
        con.commit()
        # Sprint item 36 - Permitir cadastro e acompanhamento dos custos da plataforma. migra categorias antigas para a lista obrigatória de seleção.
        cursor.execute("SELECT NOME FROM CATEGORIAS_CUSTO")
        categorias_existentes = {str(row[0]).strip().casefold() for row in cursor.fetchall()}
        cursor.execute("SELECT DISTINCT CATEGORIA FROM CUSTOS_PLATAFORMA WHERE CATEGORIA IS NOT NULL")
        for linha_categoria in cursor.fetchall():
            nome_categoria = str(linha_categoria[0]).strip()
            if nome_categoria and nome_categoria.casefold() not in categorias_existentes:
                cursor.execute("SELECT COALESCE(MAX(ID_CATEGORIA), 0) + 1 FROM CATEGORIAS_CUSTO")
                id_categoria = cursor.fetchone()[0]
                cursor.execute(
                    "INSERT INTO CATEGORIAS_CUSTO (ID_CATEGORIA, NOME) VALUES (?, ?)",
                    (id_categoria, nome_categoria[:80]),
                )
                categorias_existentes.add(nome_categoria.casefold())
        cursor.execute("SELECT ID_CATEGORIA, NOME FROM CATEGORIAS_CUSTO")
        ids_categorias = {str(row[1]).strip().casefold(): row[0] for row in cursor.fetchall()}
        for nome_categoria, id_categoria in ids_categorias.items():
            cursor.execute(
                "UPDATE CUSTOS_PLATAFORMA SET ID_CATEGORIA = ?, TIPO_CUSTO = COALESCE(TIPO_CUSTO, 'UNICO') WHERE ID_CATEGORIA IS NULL AND UPPER(TRIM(CATEGORIA)) = ?",
                (id_categoria, nome_categoria.upper()),
            )
        cursor.execute("UPDATE CUSTOS_PLATAFORMA SET TIPO_CUSTO = 'UNICO' WHERE TIPO_CUSTO IS NULL")
        # Sprint item 6 - Permitir que o instrutor divida o curso em módulos. associa cada videoaula ao modulo do curso.
        _garantir_coluna(cursor, "MODULOS_CURSO", "STATUS", "STATUS INTEGER DEFAULT 1")
        # O Firebird só permite usar a coluna recém-criada depois de confirmar o DDL.
        con.commit()
        cursor.execute("UPDATE MODULOS_CURSO SET STATUS = 1 WHERE STATUS IS NULL")
        _garantir_coluna(cursor, "VIDEOS", "ID_MODULO", "ID_MODULO INTEGER")
        # Sprint item 19 - Implementar chat entre instrutor e aluno no aplicativo e no sistema web. garante a foto de perfil usada para identificar os participantes do chat.
        _garantir_coluna(cursor, "USUARIOS", "IMAGEM_PERFIL", "IMAGEM_PERFIL VARCHAR(500)")
        _garantir_coluna(cursor, "USUARIOS", "EMAIL_VERIFICADO", "EMAIL_VERIFICADO SMALLINT DEFAULT 1 NOT NULL")
        # A data de cadastro dos usuários antigos é desconhecida. A coluna
        # começa vazia; os novos cadastros informam CURRENT_TIMESTAMP.
        _garantir_coluna(cursor, "USUARIOS", "CRIADO_EM", "CRIADO_EM TIMESTAMP")
        # Sprint item 21 - Permitir que o instrutor publique materiais do curso, como livros, apostilas e códigos. guarda o nome original de arquivos privados dos complementos do curso.
        _garantir_coluna(cursor, "MATERIAIS_CURSO", "NOME_ARQUIVO", "NOME_ARQUIVO VARCHAR(255)")
        con.commit()
        garantir_log_schema()
        garantir_gatilhos_auditoria({
            "MODULOS_CURSO",
            "MATERIAIS_CURSO",
            "AVALIACOES_CURSO",
            "PROVAS_CURSO",
            "QUESTOES_PROVA",
            "RESPOSTAS_PROVA",
            "CERTIFICADOS",
            "CUSTOS_PLATAFORMA",
            "CATEGORIAS_CUSTO",
            "SAQUES_INSTRUTOR",
            "FINANCEIRO_CONFIG",
            "MENSAGENS_CHAT",
            "CATEGORIAS_CURSO",
            "TEMAS_CURSO",
            "CURSO_TAXONOMIA",
            "VIDEOS",
            "ASSINATURAS",
            "USUARIOS",
        }, force=True)
        _schema_pronto = True
    except Exception:
        con.rollback()
        raise
    finally:
        cursor.close()
        con.close()

def garantir_estrutura_banco():
    # As rotas financeiras podem pedir o schema em paralelo na primeira visita.
    # Serializa a criação/migração para evitar DDL concorrente no Firebird.
    with _schema_lock:
        return _garantir_estrutura_banco()


__all__ = ['_existe_relacao', '_criar_tabela', '_existe_coluna', '_garantir_coluna', 'garantir_estrutura_banco']
