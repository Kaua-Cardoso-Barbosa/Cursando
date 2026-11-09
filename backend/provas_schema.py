"""Estrutura das provas versionadas e do histórico permanente de tentativas."""
from banco_37 import get_db


def preparar_provas():
    con = get_db()
    cur = con.cursor()
    try:
        campos = {
            "PROVAS_CURSO": [
                "ESTADO VARCHAR(12) DEFAULT 'rascunho' NOT NULL",
                "NOTA_MINIMA INTEGER DEFAULT 70 NOT NULL", "VERSAO INTEGER DEFAULT 1 NOT NULL",
                "ATIVA_CURSO INTEGER", "PUBLICADA_EM TIMESTAMP", "ARQUIVADA_EM TIMESTAMP",
            ],
            "RESPOSTAS_PROVA": [
                "ID_CURSO INTEGER", "CONTEUDO BLOB SUB_TYPE TEXT", "ALUNO_NOME VARCHAR(150)",
                "PROVA_TITULO VARCHAR(150)", "ALUNO_BUSCA VARCHAR(150)", "VERSAO INTEGER DEFAULT 1", "NOTA_MINIMA INTEGER DEFAULT 70",
                "TENTATIVA INTEGER DEFAULT 1", "CORRIGIDO_POR INTEGER",
            ],
        }
        estado_novo = False
        for tabela, definicoes in campos.items():
            for definicao in definicoes:
                nome = definicao.split()[0]
                cur.execute("SELECT 1 FROM RDB$RELATION_FIELDS WHERE RDB$RELATION_NAME = ? AND RDB$FIELD_NAME = ?", (tabela, nome))
                if not cur.fetchone():
                    cur.execute(f"ALTER TABLE {tabela} ADD {definicao}")
                    estado_novo |= nome == "ESTADO"
        con.commit()
        cur.execute("SELECT F.RDB$FIELD_SCALE FROM RDB$RELATION_FIELDS RF JOIN RDB$FIELDS F ON F.RDB$FIELD_NAME = RF.RDB$FIELD_SOURCE WHERE RF.RDB$RELATION_NAME = 'RESPOSTAS_PROVA' AND RF.RDB$FIELD_NAME = 'NOTA'")
        if cur.fetchone()[0] != -2:
            cur.execute('ALTER TABLE RESPOSTAS_PROVA ALTER NOTA TYPE NUMERIC(5,2)')
            con.commit()
        if estado_novo:
            cur.execute("UPDATE PROVAS_CURSO SET ESTADO = CASE WHEN PUBLICADA = 1 THEN 'vigente' ELSE 'rascunho' END")
            cur.execute("UPDATE PROVAS_CURSO SET ATIVA_CURSO = ID_CURSO WHERE ESTADO = 'vigente'")
        # Mantém compatibilidade com instalações que ainda possuam registros anteriores.
        cur.execute("UPDATE RESPOSTAS_PROVA R SET ID_CURSO = (SELECT P.ID_CURSO FROM PROVAS_CURSO P WHERE P.ID_PROVA = R.ID_PROVA) WHERE R.ID_CURSO IS NULL")
        con.commit()
        restricoes = [
            ("PROVAS_CURSO", "CK_PROVA_ESTADO", "CHECK (ESTADO IN ('rascunho', 'vigente', 'arquivada'))"),
            ("PROVAS_CURSO", "CK_PROVA_MINIMO", "CHECK (NOTA_MINIMA BETWEEN 50 AND 100)"),
            ("PROVAS_CURSO", "UQ_PROVA_VIGENTE", "UNIQUE (ATIVA_CURSO)"),
            ("PROVAS_CURSO", "CK_PROVA_ATIVA", "CHECK ((ESTADO = 'vigente' AND ATIVA_CURSO = ID_CURSO AND ATIVA_CURSO IS NOT NULL AND PUBLICADA = 1) OR (ESTADO <> 'vigente' AND ATIVA_CURSO IS NULL AND PUBLICADA = 0))"),
            ("QUESTOES_PROVA", "FK_QUESTAO_PROVA", "FOREIGN KEY (ID_PROVA) REFERENCES PROVAS_CURSO (ID_PROVA)"),
            ("RESPOSTAS_PROVA", "FK_TENTATIVA_PROVA", "FOREIGN KEY (ID_PROVA) REFERENCES PROVAS_CURSO (ID_PROVA)"),
            ("RESPOSTAS_PROVA", "CK_TENTATIVA_MINIMO", "CHECK (NOTA_MINIMA BETWEEN 50 AND 100)"),
        ]
        for tabela, nome, ddl in restricoes:
            cur.execute("SELECT 1 FROM RDB$RELATION_CONSTRAINTS WHERE RDB$CONSTRAINT_NAME = ?", (nome,))
            if not cur.fetchone():
                cur.execute(f"ALTER TABLE {tabela} ADD CONSTRAINT {nome} {ddl}")
        for tabela, coluna, gerador in [
            ("PROVAS_CURSO", "ID_PROVA", "GEN_EX_PROVA"),
            ("QUESTOES_PROVA", "ID_QUESTAO", "GEN_EX_QUESTAO"),
            ("RESPOSTAS_PROVA", "ID_RESPOSTA", "GEN_EX_RESPOSTA"),
        ]:
            cur.execute("SELECT 1 FROM RDB$GENERATORS WHERE RDB$GENERATOR_NAME = ?", (gerador,))
            if not cur.fetchone():
                cur.execute(f"CREATE SEQUENCE {gerador}")
                con.commit()
                cur.execute(f"SELECT COALESCE(MAX({coluna}), 0) FROM {tabela}")
                cur.execute(f"SET GENERATOR {gerador} TO {int(cur.fetchone()[0])}")
        for nome, tabela, colunas in [
            ("IX_TENTATIVA_CURSO", "RESPOSTAS_PROVA", "ID_CURSO, ID_RESPOSTA"),
            ("IX_TENTATIVA_ALUNO", "RESPOSTAS_PROVA", "ID_USUARIO, ID_CURSO"),
        ]:
            cur.execute("SELECT 1 FROM RDB$INDICES WHERE RDB$INDEX_NAME = ?", (nome,))
            if not cur.fetchone():
                cur.execute(f"CREATE INDEX {nome} ON {tabela} ({colunas})")
        con.commit()
    except Exception:
        con.rollback()
        raise
    finally:
        cur.close()
        con.close()
