import fdb
from flask import current_app, jsonify, request
from flask_jwt_extended import get_jwt, get_jwt_identity, jwt_required

from main import app
from professor import (
    STATUS_PUBLICADO,
    aula_para_dict,
    criar_mensagem,
    curso_para_dict,
    de_blob_texto,
)


def get_db():
    return fdb.connect(
        host=current_app.config["DB_HOST"],
        database=current_app.config["DB_NAME"],
        user=current_app.config["DB_USER"],
        password=current_app.config["DB_PASSWORD"],
        charset="UTF8",
    )


def resposta(descricao, status=200, tipo="erro", **extra):
    payload = {"mensagem": criar_mensagem(descricao, tipo)}
    payload.update(extra)
    return jsonify(payload), status


def exigir_aluno():
    tipo = get_jwt().get("tipo")

    if int(tipo or -1) != 2:
        return resposta("Acesso negado. Apenas alunos podem usar este recurso.", 403)

    return None


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
            return

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
        con.commit()
    except Exception:
        con.rollback()
        raise
    finally:
        cursor.close()


def curso_publico_para_dict(row):
    curso = curso_para_dict(row[:7])
    curso["professor"] = de_blob_texto(row[7]) or "Professor(a)"
    curso["matriculado"] = bool(row[8])
    curso["videos_assistidos"] = row[9] or 0
    curso["progresso"] = calcular_progresso(curso["aulas_publicadas"], curso["videos_assistidos"])
    return curso


def calcular_progresso(total, assistidos):
    total = int(total or 0)
    assistidos = int(assistidos or 0)

    if total <= 0:
        return 0

    return min(100, round((assistidos / total) * 100))


def query_cursos_base(filtro_extra=""):
    return f"""
        SELECT
            C.ID_CURSO,
            C.TITULO,
            C.DESCRICAO,
            C.IMAGEM_URL,
            C.STATUS,
            (SELECT COUNT(*) FROM VIDEOS V WHERE V.ID_CURSO = C.ID_CURSO AND V.EXCLUIDO = 0),
            (SELECT COUNT(*) FROM VIDEOS V WHERE V.ID_CURSO = C.ID_CURSO AND V.EXCLUIDO = 0 AND V.STATUS = 1),
            COALESCE((SELECT LIST(U.NOME, ', ') FROM PROFESSORES_CURSO PC JOIN USUARIOS U ON U.ID_USUARIO = PC.ID_USUARIO WHERE PC.ID_CURSO = C.ID_CURSO), ''),
            CASE WHEN EXISTS (
                SELECT 1 FROM MATRICULAS M
                WHERE M.ID_CURSO = C.ID_CURSO AND M.ID_USUARIO = ? AND M.STATUS_MATRICULA = 1
            ) THEN 1 ELSE 0 END,
            (SELECT COUNT(*)
             FROM PROGRESSO_AULAS PA
             JOIN VIDEOS V2 ON V2.ID_VIDEO = PA.ID_VIDEO
             WHERE PA.ID_USUARIO = ? AND V2.ID_CURSO = C.ID_CURSO AND V2.EXCLUIDO = 0 AND V2.STATUS = 1)
        FROM CURSOS C
        WHERE C.EXCLUIDO = 0 AND C.STATUS = 1 {filtro_extra}
    """


@app.route("/aluno/dashboard", methods=["GET"])
@jwt_required()
def aluno_dashboard():
    negado = exigir_aluno()
    if negado:
        return negado

    id_aluno = get_jwt_identity()
    con = get_db()
    cursor = con.cursor()

    try:
        garantir_tabela_progresso(con)
        cursor.execute(
            """
            SELECT
                C.ID_CURSO,
                C.TITULO,
                C.DESCRICAO,
                C.IMAGEM_URL,
                C.STATUS,
                (SELECT COUNT(*) FROM VIDEOS V WHERE V.ID_CURSO = C.ID_CURSO AND V.EXCLUIDO = 0),
                (SELECT COUNT(*) FROM VIDEOS V WHERE V.ID_CURSO = C.ID_CURSO AND V.EXCLUIDO = 0 AND V.STATUS = 1),
                COALESCE((SELECT LIST(U.NOME, ', ') FROM PROFESSORES_CURSO PC JOIN USUARIOS U ON U.ID_USUARIO = PC.ID_USUARIO WHERE PC.ID_CURSO = C.ID_CURSO), ''),
                1,
                (SELECT COUNT(*)
                 FROM PROGRESSO_AULAS PA
                 JOIN VIDEOS V2 ON V2.ID_VIDEO = PA.ID_VIDEO
                 WHERE PA.ID_USUARIO = ? AND V2.ID_CURSO = C.ID_CURSO AND V2.EXCLUIDO = 0 AND V2.STATUS = 1)
            FROM MATRICULAS M
            JOIN CURSOS C ON C.ID_CURSO = M.ID_CURSO
            WHERE M.ID_USUARIO = ? AND M.STATUS_MATRICULA = 1 AND C.EXCLUIDO = 0 AND C.STATUS = 1
            ORDER BY C.ATUALIZADO_EM DESC
            """,
            (id_aluno, id_aluno),
        )
        cursos = [curso_publico_para_dict(row) for row in cursor.fetchall()]

        cursor.execute(
            """
            SELECT FIRST 8 V.ID_VIDEO, V.ID_CURSO, V.TITULO, V.DESCRICAO, V.VIDEO_URL, V.STATUS, PA.ASSISTIDO_EM
            FROM PROGRESSO_AULAS PA
            JOIN VIDEOS V ON V.ID_VIDEO = PA.ID_VIDEO
            JOIN CURSOS C ON C.ID_CURSO = V.ID_CURSO
            JOIN MATRICULAS M ON M.ID_CURSO = C.ID_CURSO AND M.ID_USUARIO = PA.ID_USUARIO
            WHERE PA.ID_USUARIO = ? AND V.EXCLUIDO = 0 AND V.STATUS = 1 AND C.EXCLUIDO = 0 AND C.STATUS = 1
              AND M.STATUS_MATRICULA = 1
            ORDER BY PA.ASSISTIDO_EM DESC
            """,
            (id_aluno,),
        )
        recentes = [aula_para_dict(row[:6]) for row in cursor.fetchall()]

        return jsonify(
            {
                "metricas": {
                    "inscritos": len(cursos),
                    "finalizados": len([curso for curso in cursos if curso["progresso"] >= 100]),
                    "iniciados": len([curso for curso in cursos if 0 < curso["progresso"] < 100]),
                },
                "recentes": recentes,
            }
        )
    except Exception as erro:
        return resposta(f"Erro ao carregar dashboard do aluno: {erro}", 500)
    finally:
        cursor.close()
        con.close()


@app.route("/aluno/cursos", methods=["GET"])
@jwt_required()
def listar_cursos_aluno():
    negado = exigir_aluno()
    if negado:
        return negado

    id_aluno = get_jwt_identity()
    con = get_db()
    cursor = con.cursor()

    try:
        garantir_tabela_progresso(con)
        cursor.execute(
            query_cursos_base(
                """
                AND EXISTS (
                    SELECT 1 FROM MATRICULAS M
                    WHERE M.ID_CURSO = C.ID_CURSO AND M.ID_USUARIO = ? AND M.STATUS_MATRICULA = 1
                )
                ORDER BY C.ATUALIZADO_EM DESC
                """
            ),
            (id_aluno, id_aluno, id_aluno),
        )
        return jsonify([curso_publico_para_dict(row) for row in cursor.fetchall()])
    except Exception as erro:
        return resposta(f"Erro ao listar seus cursos: {erro}", 500)
    finally:
        cursor.close()
        con.close()


@app.route("/aluno/descobrir", methods=["GET"])
@jwt_required()
def descobrir_cursos():
    negado = exigir_aluno()
    if negado:
        return negado

    id_aluno = get_jwt_identity()
    busca = (request.args.get("busca") or "").strip().lower()
    filtro = ""
    parametros = [id_aluno, id_aluno]

    if busca:
        filtro = "AND LOWER(C.TITULO) LIKE ?"
        parametros.append(f"%{busca}%")

    con = get_db()
    cursor = con.cursor()

    try:
        garantir_tabela_progresso(con)
        cursor.execute(
            query_cursos_base(f"{filtro} ORDER BY C.ATUALIZADO_EM DESC"),
            tuple(parametros),
        )
        return jsonify([curso_publico_para_dict(row) for row in cursor.fetchall()])
    except Exception as erro:
        return resposta(f"Erro ao listar cursos publicos: {erro}", 500)
    finally:
        cursor.close()
        con.close()


@app.route("/aluno/cursos/<int:id_curso>", methods=["GET"])
@jwt_required()
def detalhe_curso_aluno(id_curso):
    negado = exigir_aluno()
    if negado:
        return negado

    id_aluno = get_jwt_identity()
    con = get_db()
    cursor = con.cursor()

    try:
        garantir_tabela_progresso(con)
        cursor.execute(
            query_cursos_base("AND C.ID_CURSO = ?"),
            (id_aluno, id_aluno, id_curso),
        )
        row = cursor.fetchone()

        if not row:
            return resposta("Curso nao encontrado.", 404)

        curso = curso_publico_para_dict(row)
        cursor.execute(
            """
            SELECT V.ID_VIDEO, V.ID_CURSO, V.TITULO, V.DESCRICAO, V.VIDEO_URL, V.STATUS,
                   CASE WHEN PA.ID_VIDEO IS NULL THEN 0 ELSE 1 END
            FROM VIDEOS V
            LEFT JOIN PROGRESSO_AULAS PA ON PA.ID_VIDEO = V.ID_VIDEO AND PA.ID_USUARIO = ?
            WHERE V.ID_CURSO = ? AND V.EXCLUIDO = 0 AND V.STATUS = 1
            ORDER BY V.POSICAO_PLAYLIST, V.DATA_UPLOAD, V.ID_VIDEO
            """,
            (id_aluno, id_curso),
        )
        aulas = []
        for aula_row in cursor.fetchall():
            aula = aula_para_dict(aula_row[:6])
            aula["assistida"] = bool(aula_row[6])
            if not curso["matriculado"]:
                aula["video"] = ""
            aulas.append(aula)

        return jsonify({"curso": curso, "aulas": aulas})
    except Exception as erro:
        return resposta(f"Erro ao carregar curso: {erro}", 500)
    finally:
        cursor.close()
        con.close()


@app.route("/aluno/cursos/<int:id_curso>/inscrever", methods=["POST"])
@jwt_required()
def inscrever_curso(id_curso):
    negado = exigir_aluno()
    if negado:
        return negado

    id_aluno = get_jwt_identity()
    con = get_db()
    cursor = con.cursor()

    try:
        cursor.execute(
            "SELECT 1 FROM CURSOS WHERE ID_CURSO = ? AND STATUS = 1 AND EXCLUIDO = 0",
            (id_curso,),
        )

        if not cursor.fetchone():
            return resposta("Curso nao encontrado ou indisponivel.", 404)

        cursor.execute(
            "SELECT STATUS_MATRICULA FROM MATRICULAS WHERE ID_USUARIO = ? AND ID_CURSO = ?",
            (id_aluno, id_curso),
        )
        matricula = cursor.fetchone()

        if matricula:
            cursor.execute(
                "UPDATE MATRICULAS SET STATUS_MATRICULA = 1 WHERE ID_USUARIO = ? AND ID_CURSO = ?",
                (id_aluno, id_curso),
            )
        else:
            cursor.execute(
                "INSERT INTO MATRICULAS (ID_USUARIO, ID_CURSO, STATUS_MATRICULA) VALUES (?, ?, 1)",
                (id_aluno, id_curso),
            )

        con.commit()
        return resposta("Inscricao realizada com sucesso.", 200, "sucesso")
    except Exception as erro:
        con.rollback()
        return resposta(f"Erro ao realizar inscricao: {erro}", 500)
    finally:
        cursor.close()
        con.close()


@app.route("/aluno/aulas/<int:id_aula>", methods=["GET"])
@jwt_required()
def detalhe_aula_aluno(id_aula):
    negado = exigir_aluno()
    if negado:
        return negado

    id_aluno = get_jwt_identity()
    con = get_db()
    cursor = con.cursor()

    try:
        garantir_tabela_progresso(con)
        cursor.execute(
            """
            SELECT V.ID_VIDEO, V.ID_CURSO, V.TITULO, V.DESCRICAO, V.VIDEO_URL, V.STATUS,
                   C.ID_CURSO, C.TITULO, C.DESCRICAO, C.IMAGEM_URL, C.STATUS,
                   (SELECT COUNT(*) FROM VIDEOS VX WHERE VX.ID_CURSO = C.ID_CURSO AND VX.EXCLUIDO = 0),
                   (SELECT COUNT(*) FROM VIDEOS VX WHERE VX.ID_CURSO = C.ID_CURSO AND VX.EXCLUIDO = 0 AND VX.STATUS = 1)
            FROM VIDEOS V
            JOIN CURSOS C ON C.ID_CURSO = V.ID_CURSO
            JOIN MATRICULAS M ON M.ID_CURSO = C.ID_CURSO
            WHERE V.ID_VIDEO = ? AND M.ID_USUARIO = ? AND M.STATUS_MATRICULA = 1
              AND V.EXCLUIDO = 0 AND V.STATUS = 1 AND C.EXCLUIDO = 0 AND C.STATUS = 1
            """,
            (id_aula, id_aluno),
        )
        row = cursor.fetchone()

        if not row:
            return resposta("Aula nao encontrada para seus cursos.", 404)

        aula = aula_para_dict(row[:6])
        curso = curso_para_dict(row[6:13])

        cursor.execute(
            """
            SELECT V.ID_VIDEO, V.ID_CURSO, V.TITULO, V.DESCRICAO, V.VIDEO_URL, V.STATUS,
                   CASE WHEN PA.ID_VIDEO IS NULL THEN 0 ELSE 1 END
            FROM VIDEOS V
            LEFT JOIN PROGRESSO_AULAS PA ON PA.ID_VIDEO = V.ID_VIDEO AND PA.ID_USUARIO = ?
            WHERE V.ID_CURSO = ? AND V.EXCLUIDO = 0 AND V.STATUS = 1 AND V.ID_VIDEO <> ?
            ORDER BY V.POSICAO_PLAYLIST, V.DATA_UPLOAD, V.ID_VIDEO
            """,
            (id_aluno, aula["id_curso"], id_aula),
        )
        proximas = []
        for prox_row in cursor.fetchall():
            proxima = aula_para_dict(prox_row[:6])
            proxima["assistida"] = bool(prox_row[6])
            proximas.append(proxima)

        return jsonify({"aula": aula, "curso": curso, "proximas": proximas})
    except Exception as erro:
        return resposta(f"Erro ao carregar aula: {erro}", 500)
    finally:
        cursor.close()
        con.close()


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
        con.commit()
        return resposta("Aula marcada como assistida.", 200, "sucesso")
    except Exception as erro:
        con.rollback()
        return resposta(f"Erro ao atualizar progresso: {erro}", 500)
    finally:
        cursor.close()
        con.close()
