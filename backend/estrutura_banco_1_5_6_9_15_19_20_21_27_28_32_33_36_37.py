

from threading import Lock

from auditoria_24_37 import garantir_gatilhos_auditoria
from banco_37 import get_db
from log_banco_37 import garantir_log_schema



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
        # Sprint item 6 - Permitir que o instrutor divida o curso em módulos - Organiza os módulos e os vínculos das aulas do curso
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
        # Fim item 6
        # Sprint item 21 - Permitir que o instrutor publique materiais do curso, como livros, apostilas e códigos - Prepara ou consulta os materiais complementares do curso
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
        # Fim item 21
        # Sprint item 27 - Permitir que o aluno avalie o curso após a conclusão - Consulta as avaliações e as notas atribuídas ao curso
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
        # Fim item 27
        # Sprint item 20 - Permitir que o instrutor cadastre provas para validar a conclusão do curso - Consulta os requisitos e os resultados da prova do curso
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
        # Fim item 20
        # Sprint item 5 - Gerar certificado ao concluir o curso - Prepara ou consulta os dados necessários ao certificado
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
        # Fim item 5
        # Sprint item 36 - Permitir cadastro e acompanhamento dos custos da plataforma - Consulta ou organiza os custos da plataforma
        _criar_tabela(
            cursor,
            "CUSTOS_PLATAFORMA",
            
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
        # Fim item 36
        # Sprint item 20 - Permitir que o instrutor cadastre provas para validar a conclusão do curso - Consulta os requisitos e os resultados da prova do curso
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
        # Fim item 20
        # Sprint item 15 - Exibir saldo disponível em caixa, assinatura de R$ 500 e desconto das comissões no saldo administrativo - Reserva as comissões e calcula o saldo líquido disponível
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
        # Fim item 15
        # Sprint item 19 - Implementar chat entre instrutor e aluno no aplicativo e no sistema web - Prepara as conversas e mensagens entre aluno e instrutor
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
        # Fim item 19
        # Sprint item 28 - Permitir filtro de cursos por tema, categoria e avaliação - Aplica os filtros de busca, categoria, tema e avaliação
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
        # Fim item 28
        
        # Sprint item 9 - Exibir acessos aos cursos, compras realizadas e taxa de conversão - Registra ou contabiliza os acessos e as compras dos cursos
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
        # Fim item 9
        con.commit()
        cursor.execute("SELECT COUNT(*) FROM FINANCEIRO_CONFIG")
        # Sprint item 15 - Exibir saldo disponível em caixa, assinatura de R$ 500 e desconto das comissões no saldo administrativo - Reserva as comissões e calcula o saldo líquido disponível
        if int((cursor.fetchone() or (0,))[0] or 0) == 0:
            cursor.execute(
                """
                INSERT INTO FINANCEIRO_CONFIG (ID_CONFIG, PERCENTUAL_INSTRUTORES)
                VALUES (1, 50)
                """
            )
        # Fim item 15
        
        
        # Sprint item 33 - Exibir total gasto e histórico de faturas do aluno - Consulta o histórico e os valores das faturas do aluno
        _garantir_coluna(cursor, "ASSINATURAS", "VALOR", "VALOR NUMERIC(15,2)")
        _garantir_coluna(cursor, "ASSINATURAS", "DATA_VENCIMENTO", "DATA_VENCIMENTO TIMESTAMP")
        _garantir_coluna(cursor, "ASSINATURAS", "DATA_PAGAMENTO", "DATA_PAGAMENTO TIMESTAMP")
        _garantir_coluna(cursor, "ASSINATURAS", "CRIADO_EM", "CRIADO_EM TIMESTAMP DEFAULT CURRENT_TIMESTAMP")
        # Fim item 33
        
        
        
        # Sprint item 32 - Permitir solicitação de saque para a conta ARKHE - Consulta ou prepara as solicitações de saque
        _garantir_coluna(cursor, "SAQUES_INSTRUTOR", "ID_SAQUE_ARKHE", "ID_SAQUE_ARKHE VARCHAR(120)")
        _garantir_coluna(cursor, "SAQUES_INSTRUTOR", "RESPOSTA_ARKHE", "RESPOSTA_ARKHE BLOB SUB_TYPE TEXT")
        _garantir_coluna(cursor, "SAQUES_INSTRUTOR", "CHAVE_PIX", "CHAVE_PIX VARCHAR(140)")
        # Fim item 32
        # Sprint item 20 - Permitir que o instrutor cadastre provas para validar a conclusão do curso - Consulta os requisitos e os resultados da prova do curso
        _garantir_coluna(cursor, "SAQUES_INSTRUTOR", "COMPROVANTE", "COMPROVANTE VARCHAR(500)")
        # Fim item 20
        # Sprint item 32 - Permitir solicitação de saque para a conta ARKHE - Consulta ou prepara as solicitações de saque
        _garantir_coluna(cursor, "SAQUES_INSTRUTOR", "MOTIVO_RECUSA", "MOTIVO_RECUSA VARCHAR(500)")
        _garantir_coluna(cursor, "SAQUES_INSTRUTOR", "ID_ADMIN", "ID_ADMIN INTEGER")
        _garantir_coluna(cursor, "SAQUES_INSTRUTOR", "ANALISADO_EM", "ANALISADO_EM TIMESTAMP")
        # Fim item 32
        # Sprint item 36 - Permitir cadastro e acompanhamento dos custos da plataforma - Consulta ou organiza os custos da plataforma
        _garantir_coluna(cursor, "CUSTOS_PLATAFORMA", "CATEGORIA", "CATEGORIA VARCHAR(80)")
        _garantir_coluna(cursor, "CUSTOS_PLATAFORMA", "ID_USUARIO", "ID_USUARIO INTEGER")
        _garantir_coluna(cursor, "CUSTOS_PLATAFORMA", "ID_CATEGORIA", "ID_CATEGORIA INTEGER")
        _garantir_coluna(cursor, "CUSTOS_PLATAFORMA", "TIPO_CUSTO", "TIPO_CUSTO VARCHAR(12) DEFAULT 'UNICO'")
        _garantir_coluna(cursor, "CUSTOS_PLATAFORMA", "DATA_INICIO", "DATA_INICIO DATE")
        _garantir_coluna(cursor, "CUSTOS_PLATAFORMA", "DATA_FIM", "DATA_FIM DATE")
        _garantir_coluna(cursor, "CUSTOS_PLATAFORMA", "ID_GRUPO_MENSAL", "ID_GRUPO_MENSAL INTEGER")
        # Fim item 36
        
        con.commit()
        
        # Sprint item 36 - Permitir cadastro e acompanhamento dos custos da plataforma - Consulta ou organiza os custos da plataforma
        cursor.execute("SELECT NOME FROM CATEGORIAS_CUSTO")
        # Fim item 36
        categorias_existentes = {str(row[0]).strip().casefold() for row in cursor.fetchall()}
        # Sprint item 36 - Permitir cadastro e acompanhamento dos custos da plataforma - Consulta ou organiza os custos da plataforma
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
        # Fim item 36
        ids_categorias = {str(row[1]).strip().casefold(): row[0] for row in cursor.fetchall()}
        # Sprint item 36 - Permitir cadastro e acompanhamento dos custos da plataforma - Consulta ou organiza os custos da plataforma
        for nome_categoria, id_categoria in ids_categorias.items():
            cursor.execute(
                "UPDATE CUSTOS_PLATAFORMA SET ID_CATEGORIA = ?, TIPO_CUSTO = COALESCE(TIPO_CUSTO, 'UNICO') WHERE ID_CATEGORIA IS NULL AND UPPER(TRIM(CATEGORIA)) = ?",
                (id_categoria, nome_categoria.upper()),
            )
        cursor.execute("UPDATE CUSTOS_PLATAFORMA SET TIPO_CUSTO = 'UNICO' WHERE TIPO_CUSTO IS NULL")
        # Fim item 36
        
        # Sprint item 6 - Permitir que o instrutor divida o curso em módulos - Organiza os módulos e os vínculos das aulas do curso
        _garantir_coluna(cursor, "MODULOS_CURSO", "STATUS", "STATUS INTEGER DEFAULT 1")
        # Fim item 6
        
        con.commit()
        # Sprint item 6 - Permitir que o instrutor divida o curso em módulos - Organiza os módulos e os vínculos das aulas do curso
        cursor.execute("UPDATE MODULOS_CURSO SET STATUS = 1 WHERE STATUS IS NULL")
        _garantir_coluna(cursor, "VIDEOS", "ID_MODULO", "ID_MODULO INTEGER")
        # Fim item 6
        
        _garantir_coluna(cursor, "USUARIOS", "IMAGEM_PERFIL", "IMAGEM_PERFIL VARCHAR(500)")
        # Sprint item 1 - Implementar cadastro de alunos pelo aplicativo - Prepara os campos de confirmação e data do cadastro de alunos
        _garantir_coluna(cursor, "USUARIOS", "EMAIL_VERIFICADO", "EMAIL_VERIFICADO SMALLINT DEFAULT 1 NOT NULL")
        
        
        _garantir_coluna(cursor, "USUARIOS", "CRIADO_EM", "CRIADO_EM TIMESTAMP")
        # Fim item 1
        
        # Sprint item 21 - Permitir que o instrutor publique materiais do curso, como livros, apostilas e códigos - Prepara ou consulta os materiais complementares do curso
        _garantir_coluna(cursor, "MATERIAIS_CURSO", "NOME_ARQUIVO", "NOME_ARQUIVO VARCHAR(255)")
        # Fim item 21
        con.commit()
        # Sprint item 37 - Desenvolver rotina de gravação de log de todas as rotinas como gravar, editar e excluir em banco separado - Prepara ou consulta a gravação das alterações no banco separado
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
        # Fim item 37
        _schema_pronto = True
    except Exception:
        con.rollback()
        raise
    finally:
        cursor.close()
        con.close()

def garantir_estrutura_banco():
    
    
    with _schema_lock:
        return _garantir_estrutura_banco()


__all__ = ['_existe_relacao', '_criar_tabela', '_existe_coluna', '_garantir_coluna', 'garantir_estrutura_banco']
