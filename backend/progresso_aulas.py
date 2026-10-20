# Rotas da sprint organizadas por assunto; os comentários dos itens seguem junto ao código.
import math
from datetime import datetime
from flask import request
from flask_jwt_extended import get_jwt_identity, jwt_required

from app import app
from banco import get_db
from auditoria import garantir_gatilhos_auditoria



from aluno import bloquear_por_fatura_aberta, exigir_aluno, exigir_assinatura_ativa, resposta

def garantir_tabela_progresso(con):
    cursor = con.cursor()

    try:
        cursor.execute(
            """
            SELECT 1
            FROM RDB$RELATIONS
            WHERE RDB$RELATION_NAME = 'PROGRESSO_AULAS'
            """
        )

        if cursor.fetchone():
            progresso_existe = True
        else:
            progresso_existe = False

        if not progresso_existe:
            cursor.execute(
                """
                CREATE TABLE PROGRESSO_AULAS (
                    ID_USUARIO INTEGER NOT NULL,
                    ID_VIDEO INTEGER NOT NULL,
                    ASSISTIDO_EM TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    CONSTRAINT PK_PROGRESSO_AULAS PRIMARY KEY (ID_USUARIO, ID_VIDEO)
                )
                """
            )

        cursor.execute(
            """
            SELECT 1
            FROM RDB$RELATIONS
            WHERE RDB$RELATION_NAME = 'PROGRESSO_REPRODUCAO'
            """
        )
        if not cursor.fetchone():
            # Sprint item 4: guarda a posicao de reproducao separada da conclusao da aula.
            cursor.execute(
                """
                CREATE TABLE PROGRESSO_REPRODUCAO (
                    ID_USUARIO INTEGER NOT NULL,
                    ID_VIDEO INTEGER NOT NULL,
                    POSICAO_SEGUNDOS DOUBLE PRECISION DEFAULT 0 NOT NULL,
                    ATUALIZADO_EM TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    CONSTRAINT PK_PROGRESSO_REPRODUCAO PRIMARY KEY (ID_USUARIO, ID_VIDEO)
                )
                """
            )

        # Sprint item 7: acumula o tempo de reprodução confirmado pelos avanços do player.
        cursor.execute(
            """
            SELECT 1
            FROM RDB$RELATIONS
            WHERE RDB$RELATION_NAME = 'TEMPO_ASSISTIDO_AULAS'
            """
        )
        if not cursor.fetchone():
            cursor.execute(
                """
                CREATE TABLE TEMPO_ASSISTIDO_AULAS (
                    ID_USUARIO INTEGER NOT NULL,
                    ID_VIDEO INTEGER NOT NULL,
                    SEGUNDOS_ASSISTIDOS DOUBLE PRECISION DEFAULT 0 NOT NULL,
                    CONSTRAINT PK_TEMPO_ASSISTIDO_AULAS PRIMARY KEY (ID_USUARIO, ID_VIDEO)
                )
                """
            )

        # Sprint item 23: guarda segundos assistidos por mês para que os relatórios preservem a distribuição mensal.
        cursor.execute(
            """
            SELECT 1 FROM RDB$RELATIONS
            WHERE RDB$RELATION_NAME = 'TEMPO_ASSISTIDO_AULAS_MENSAL'
            """
        )
        if not cursor.fetchone():
            cursor.execute(
                """
                CREATE TABLE TEMPO_ASSISTIDO_AULAS_MENSAL (
                    ID_USUARIO INTEGER NOT NULL,
                    ID_VIDEO INTEGER NOT NULL,
                    MES_REFERENCIA DATE NOT NULL,
                    SEGUNDOS_ASSISTIDOS DOUBLE PRECISION DEFAULT 0 NOT NULL,
                    CONSTRAINT PK_TEMPO_ASSISTIDO_MES PRIMARY KEY (ID_USUARIO, ID_VIDEO, MES_REFERENCIA)
                )
                """
            )

        for nome, ddl in {
            "CATEGORIAS_CURSO": """
                CREATE TABLE CATEGORIAS_CURSO (
                    ID_CATEGORIA INTEGER NOT NULL PRIMARY KEY,
                    NOME VARCHAR(120) NOT NULL,
                    NOME_NORMALIZADO VARCHAR(120) NOT NULL
                )
            """,
            "TEMAS_CURSO": """
                CREATE TABLE TEMAS_CURSO (
                    ID_TEMA INTEGER NOT NULL PRIMARY KEY,
                    NOME VARCHAR(120) NOT NULL,
                    NOME_NORMALIZADO VARCHAR(120) NOT NULL
                )
            """,
            "CURSO_TAXONOMIA": """
                CREATE TABLE CURSO_TAXONOMIA (
                    ID_CURSO INTEGER NOT NULL PRIMARY KEY,
                    ID_CATEGORIA INTEGER,
                    ID_TEMA INTEGER
                )
            """,
        }.items():
            cursor.execute(
                "SELECT 1 FROM RDB$RELATIONS WHERE RDB$RELATION_NAME = ?",
                (nome,),
            )
            if not cursor.fetchone():
                cursor.execute(ddl)
        con.commit()
        garantir_gatilhos_auditoria({
            "PROGRESSO_AULAS",
            "CATEGORIAS_CURSO",
            "TEMAS_CURSO",
            "CURSO_TAXONOMIA",
        })
    except Exception:
        con.rollback()
        raise
    finally:
        cursor.close()


# Sprint item 4: salva a posicao atual sem marcar a aula como concluida.
@app.route("/aluno/aulas/<int:id_aula>/progresso", methods=["PUT"])
@jwt_required()
def salvar_progresso_aula(id_aula):
    negado = exigir_aluno()
    if negado:
        return negado

    dados = request.get_json(silent=True) or {}
    valor_posicao = dados.get("posicao_segundos", 0)
    if isinstance(valor_posicao, bool):
        return resposta("A posicao da aula e invalida.", 400)

    try:
        posicao = float(valor_posicao)
    except (TypeError, ValueError):
        return resposta("A posicao da aula e invalida.", 400)

    if not math.isfinite(posicao) or posicao < 0 or posicao > 604800:
        return resposta("A posicao da aula e invalida.", 400)

    id_aluno = get_jwt_identity()
    con = get_db()
    cursor = con.cursor()

    try:
        garantir_tabela_progresso(con)
        bloqueio = exigir_assinatura_ativa(cursor, id_aluno)
        if bloqueio:
            return bloqueio

        bloqueio = bloquear_por_fatura_aberta(cursor, id_aluno)
        if bloqueio:
            return bloqueio

        cursor.execute(
            """
            SELECT 1
            FROM VIDEOS V
            JOIN CURSOS C ON C.ID_CURSO = V.ID_CURSO
            JOIN MATRICULAS M ON M.ID_CURSO = C.ID_CURSO
            WHERE V.ID_VIDEO = ? AND M.ID_USUARIO = ? AND M.STATUS_MATRICULA = 1
              AND V.EXCLUIDO = 0 AND V.STATUS = 1 AND C.EXCLUIDO = 0 AND C.STATUS = 1
            """,
            (id_aula, id_aluno),
        )
        if not cursor.fetchone():
            return resposta("Aula nao encontrada para seus cursos.", 404)

        # Sprint item 7: estima tempo assistido pelo avanço do player e limita saltos ao tempo real transcorrido.
        cursor.execute(
            """
            SELECT POSICAO_SEGUNDOS,
                   DATEDIFF(MILLISECOND FROM ATUALIZADO_EM TO CURRENT_TIMESTAMP)
            FROM PROGRESSO_REPRODUCAO
            WHERE ID_USUARIO = ? AND ID_VIDEO = ?
            """,
            (id_aluno, id_aula),
        )
        progresso_anterior = cursor.fetchone()
        if progresso_anterior:
            posicao_anterior = float(progresso_anterior[0] or 0)
            segundos_transcorridos = max(0, float(progresso_anterior[1] or 0) / 1000)
            segundos_novos = min(max(0.0, posicao - posicao_anterior), segundos_transcorridos)
            if segundos_novos > 0:
                cursor.execute(
                    """
                    UPDATE TEMPO_ASSISTIDO_AULAS
                    SET SEGUNDOS_ASSISTIDOS = SEGUNDOS_ASSISTIDOS + ?
                    WHERE ID_USUARIO = ? AND ID_VIDEO = ?
                    """,
                    (segundos_novos, id_aluno, id_aula),
                )
                if cursor.rowcount == 0:
                    cursor.execute(
                        """
                        INSERT INTO TEMPO_ASSISTIDO_AULAS (ID_USUARIO, ID_VIDEO, SEGUNDOS_ASSISTIDOS)
                        VALUES (?, ?, ?)
                        """,
                        (id_aluno, id_aula, segundos_novos),
                    )
                # Sprint item 23: registra o mesmo tempo na competência mensal para relatórios mensais do instrutor.
                mes_referencia = datetime.now().date().replace(day=1)
                cursor.execute(
                    """
                    UPDATE TEMPO_ASSISTIDO_AULAS_MENSAL
                    SET SEGUNDOS_ASSISTIDOS = SEGUNDOS_ASSISTIDOS + ?
                    WHERE ID_USUARIO = ? AND ID_VIDEO = ? AND MES_REFERENCIA = ?
                    """,
                    (segundos_novos, id_aluno, id_aula, mes_referencia),
                )
                if cursor.rowcount == 0:
                    cursor.execute(
                        """
                        INSERT INTO TEMPO_ASSISTIDO_AULAS_MENSAL
                            (ID_USUARIO, ID_VIDEO, MES_REFERENCIA, SEGUNDOS_ASSISTIDOS)
                        VALUES (?, ?, ?, ?)
                        """,
                        (id_aluno, id_aula, mes_referencia, segundos_novos),
                    )

        # Sprint item 4: app e site gravam a posição na mesma tabela e retomam do valor mais recente.
        cursor.execute(
            """
            UPDATE OR INSERT INTO PROGRESSO_REPRODUCAO (
                ID_USUARIO, ID_VIDEO, POSICAO_SEGUNDOS, ATUALIZADO_EM
            )
            VALUES (?, ?, ?, CURRENT_TIMESTAMP)
            MATCHING (ID_USUARIO, ID_VIDEO)
            """,
            (id_aluno, id_aula, posicao),
        )
        con.commit()
        return resposta("Progresso da aula salvo.", 200, "sucesso", posicao_segundos=posicao)
    except Exception as erro:
        con.rollback()
        return resposta(f"Erro ao salvar progresso da aula: {erro}", 500)
    finally:
        cursor.close()
        con.close()


# Registra a conclusão da aula e atualiza o progresso da matrícula.
@app.route("/aluno/aulas/<int:id_aula>/assistir", methods=["POST"])
@jwt_required()
def marcar_aula_assistida(id_aula):
    negado = exigir_aluno()
    if negado:
        return negado

    id_aluno = get_jwt_identity()
    con = get_db()
    cursor = con.cursor()

    try:
        garantir_tabela_progresso(con)
        bloqueio = exigir_assinatura_ativa(cursor, id_aluno)
        if bloqueio:
            return bloqueio

        bloqueio = bloquear_por_fatura_aberta(cursor, id_aluno)
        if bloqueio:
            return bloqueio

        cursor.execute(
            """
            SELECT 1
            FROM VIDEOS V
            JOIN CURSOS C ON C.ID_CURSO = V.ID_CURSO
            JOIN MATRICULAS M ON M.ID_CURSO = C.ID_CURSO
            WHERE V.ID_VIDEO = ? AND M.ID_USUARIO = ? AND M.STATUS_MATRICULA = 1
              AND V.EXCLUIDO = 0 AND V.STATUS = 1 AND C.EXCLUIDO = 0 AND C.STATUS = 1
            """,
            (id_aula, id_aluno),
        )

        if not cursor.fetchone():
            return resposta("Aula nao encontrada para seus cursos.", 404)

        cursor.execute(
            """
            UPDATE OR INSERT INTO PROGRESSO_AULAS (ID_USUARIO, ID_VIDEO, ASSISTIDO_EM)
            VALUES (?, ?, CURRENT_TIMESTAMP)
            MATCHING (ID_USUARIO, ID_VIDEO)
            """,
            (id_aluno, id_aula),
        )
        # Sprint item 4: remove o ponto salvo ao concluir para evitar uma retomada quase no fim.
        cursor.execute(
            "DELETE FROM PROGRESSO_REPRODUCAO WHERE ID_USUARIO = ? AND ID_VIDEO = ?",
            (id_aluno, id_aula),
        )
        cursor.execute(
            """
            UPDATE MATRICULAS M
            SET PROGRESSO = (
                SELECT
                    CASE
                        WHEN COUNT(V.ID_VIDEO) = 0 THEN 0
                        ELSE CAST((COUNT(PA.ID_VIDEO) * 100.0 / COUNT(V.ID_VIDEO)) AS INTEGER)
                    END
                FROM VIDEOS V
                LEFT JOIN PROGRESSO_AULAS PA
                    ON PA.ID_VIDEO = V.ID_VIDEO
                   AND PA.ID_USUARIO = M.ID_USUARIO
                WHERE V.ID_CURSO = M.ID_CURSO
                  AND V.EXCLUIDO = 0
                  AND V.STATUS = 1
            )
            WHERE M.ID_USUARIO = ?
              AND M.ID_CURSO = (
                  SELECT V2.ID_CURSO
                  FROM VIDEOS V2
                  WHERE V2.ID_VIDEO = ?
              )
            """,
            (id_aluno, id_aula),
        )
        con.commit()
        return resposta("Aula marcada como assistida.", 200, "sucesso")
    except Exception as erro:
        con.rollback()
        return resposta(f"Erro ao atualizar progresso: {erro}", 500)
    finally:
        cursor.close()
        con.close()

__all__ = ['garantir_tabela_progresso', 'salvar_progresso_aula', 'marcar_aula_assistida']
