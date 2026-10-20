import fdb
import math
from datetime import datetime
from flask import current_app, jsonify, request
from flask_jwt_extended import get_jwt, get_jwt_identity, jwt_required

from app import app
from banco import get_db
from auditoria import garantir_gatilhos_auditoria
from professor import (
    STATUS_PUBLICADO,
    aula_para_dict,
    criar_mensagem,
    curso_para_dict,
    de_blob_texto,
    STATUS_NOMES,
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


def bloquear_por_fatura_aberta(cursor, id_aluno):
    from pagamento_arkhe import aluno_tem_fatura_aberta

    # Sprint item 34: informa a fatura pendente e envia o aluno ao financeiro antes de abrir cursos.
    if aluno_tem_fatura_aberta(cursor, id_aluno):
        return resposta(
            "Você possui uma fatura em aberto. Acesse a aba Financeiro para consultar e pagar.",
            402,
            "erro",
            redirecionar="/DashboardAluno/financeiro",
        )
    return None


def aluno_tem_assinatura_ativa(cursor, id_aluno):
    cursor.execute(
        """
        SELECT FIRST 1 ID_ASSINATURA
        FROM ASSINATURAS
        WHERE ID_USUARIO = ?
          AND STATUS = 1
          AND DATA_EXPIRACAO IS NOT NULL
          AND DATA_EXPIRACAO >= CURRENT_TIMESTAMP
        ORDER BY DATA_EXPIRACAO DESC, ID_ASSINATURA DESC
        """,
        (id_aluno,),
    )
    return cursor.fetchone() is not None


def exigir_assinatura_ativa(cursor, id_aluno):
    # Sprint item 34: a pendência tem uma orientação específica antes do bloqueio geral da assinatura.
    bloqueio = bloquear_por_fatura_aberta(cursor, id_aluno)
    if bloqueio:
        return bloqueio
    if aluno_tem_assinatura_ativa(cursor, id_aluno):
        return None

    return resposta(
        "Você precisa de uma assinatura ativa para acessar os cursos e aulas. Acesse a aba Financeiro para pagar.",
        402,
        "erro",
        redirecionar="/DashboardAluno/financeiro",
    )




def curso_publico_para_dict(row):
    curso = {"id": row[0], "titulo": row[1], "descricao": de_blob_texto(row[2]), "imagem": row[3], "status": row[4],
             "status_nome": STATUS_NOMES.get(row[4], "desconhecido"), "total_aulas": row[5] or 0,
             "aulas_publicadas": row[6] or 0, "total_inscritos": 0,
             "professor": de_blob_texto(row[7]) or "Professor(a)", "matriculado": bool(row[8]),
             "videos_assistidos": row[9] or 0,
             "categoria": row[10] if len(row) > 10 else "",
             "tema": row[11] if len(row) > 11 else "",
             "avaliacao_media": round(float(row[12] or 0), 2) if len(row) > 12 else 0}

    curso["progresso"] = calcular_progresso(
        curso["aulas_publicadas"],
        curso["videos_assistidos"]
    )

    return curso


def calcular_progresso(total, assistidos):
    total = int(total or 0)
    assistidos = int(assistidos or 0)

    if total <= 0:
        return 0

    return min(100, round((assistidos / total) * 100))


@app.route("/cursos/home", methods=["GET"])
def cursos_home():
    con = get_db()
    cursor = con.cursor()

    try:
        cursor.execute(
            """
            SELECT FIRST 3
                C.ID_CURSO,
                C.TITULO,
                C.DESCRICAO,
                C.IMAGEM_URL,
                C.STATUS,
                (SELECT COUNT(*) FROM VIDEOS V WHERE V.ID_CURSO = C.ID_CURSO AND V.EXCLUIDO = 0),
                (SELECT COUNT(*) FROM VIDEOS V WHERE V.ID_CURSO = C.ID_CURSO AND V.EXCLUIDO = 0 AND V.STATUS = 1)
            FROM CURSOS C
            WHERE C.EXCLUIDO = 0 AND C.STATUS = 1
            ORDER BY C.CRIADO_EM DESC, C.ID_CURSO DESC
            """
        )
        destaques = [curso_para_dict(row) for row in cursor.fetchall()]

        cursor.execute(
            """
            SELECT FIRST 3
                C.ID_CURSO,
                C.TITULO,
                C.DESCRICAO,
                C.IMAGEM_URL,
                C.STATUS,
                (SELECT COUNT(*) FROM VIDEOS V WHERE V.ID_CURSO = C.ID_CURSO AND V.EXCLUIDO = 0),
                (SELECT COUNT(*) FROM VIDEOS V WHERE V.ID_CURSO = C.ID_CURSO AND V.EXCLUIDO = 0 AND V.STATUS = 1),
                (SELECT COUNT(*) FROM MATRICULAS M WHERE M.ID_CURSO = C.ID_CURSO AND M.STATUS_MATRICULA = 1)
            FROM CURSOS C
            WHERE C.EXCLUIDO = 0 AND C.STATUS = 1
            ORDER BY 8 DESC, C.CRIADO_EM DESC, C.ID_CURSO DESC
            """
        )
        mais_assinados = [curso_para_dict(row[:7]) for row in cursor.fetchall()]

        return jsonify({"destaques": destaques, "mais_assinados": mais_assinados})
    except Exception as erro:
        return resposta(f"Erro ao carregar cursos da home: {erro}", 500)
    finally:
        cursor.close()
        con.close()


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
             WHERE PA.ID_USUARIO = ? AND V2.ID_CURSO = C.ID_CURSO AND V2.EXCLUIDO = 0 AND V2.STATUS = 1),
            COALESCE(CAT.NOME, ''),
            COALESCE(TEMA.NOME, ''),
            COALESCE((SELECT AVG(A.NOTA) FROM AVALIACOES_CURSO A WHERE A.ID_CURSO = C.ID_CURSO), 0)
        FROM CURSOS C
        LEFT JOIN CURSO_TAXONOMIA CT ON CT.ID_CURSO = C.ID_CURSO
        LEFT JOIN CATEGORIAS_CURSO CAT ON CAT.ID_CATEGORIA = CT.ID_CATEGORIA
        LEFT JOIN TEMAS_CURSO TEMA ON TEMA.ID_TEMA = CT.ID_TEMA
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
        # Sprint item 34: o resumo do dashboard permanece disponível enquanto os cursos estão bloqueados.
        acesso_bloqueado = not aluno_tem_assinatura_ativa(cursor, id_aluno)

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

        cursor.execute(
            """
            SELECT DATA_INICIO, DATA_EXPIRACAO
            FROM ASSINATURAS
            WHERE ID_USUARIO = ? AND DATA_INICIO IS NOT NULL
            ORDER BY ID_ASSINATURA DESC
            """,
            (id_aluno,),
        )
        assinatura = cursor.fetchone()

        return jsonify(
            {
                "metricas": {
                    "inscritos": len(cursos),
                    "finalizados": len([curso for curso in cursos if curso["progresso"] >= 100]),
                },
                "recentes": recentes,
                "acesso_bloqueado": acesso_bloqueado,
                "assinatura": {
                    "data_inicio": assinatura[0].isoformat() if assinatura and assinatura[0] else None,
                    "data_expiracao": assinatura[1].isoformat() if assinatura and assinatura[1] else None,
                } if assinatura else None,
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
        bloqueio = exigir_assinatura_ativa(cursor, id_aluno)
        if bloqueio:
            return bloqueio

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








# Entrega uma aula publicada somente quando o aluno tem matrícula ativa no curso.
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
        bloqueio = exigir_assinatura_ativa(cursor, id_aluno)
        if bloqueio:
            return bloqueio

        cursor.execute(
            """
            SELECT V.ID_VIDEO, V.ID_CURSO, V.TITULO, V.DESCRICAO, V.VIDEO_URL, V.STATUS,
                   C.ID_CURSO, C.TITULO, C.DESCRICAO, C.IMAGEM_URL, C.STATUS,
                   (SELECT COUNT(*) FROM VIDEOS VX WHERE VX.ID_CURSO = C.ID_CURSO AND VX.EXCLUIDO = 0),
                   (SELECT COUNT(*) FROM VIDEOS VX WHERE VX.ID_CURSO = C.ID_CURSO AND VX.EXCLUIDO = 0 AND VX.STATUS = 1),
                   COALESCE(PR.POSICAO_SEGUNDOS, 0)
            FROM VIDEOS V
            JOIN CURSOS C ON C.ID_CURSO = V.ID_CURSO
            JOIN MATRICULAS M ON M.ID_CURSO = C.ID_CURSO
            LEFT JOIN PROGRESSO_REPRODUCAO PR ON PR.ID_VIDEO = V.ID_VIDEO AND PR.ID_USUARIO = ?
            WHERE V.ID_VIDEO = ? AND M.ID_USUARIO = ? AND M.STATUS_MATRICULA = 1
              AND V.EXCLUIDO = 0 AND V.STATUS = 1 AND C.EXCLUIDO = 0 AND C.STATUS = 1
            """,
            (id_aluno, id_aula, id_aluno),
        )
        row = cursor.fetchone()

        if not row:
            return resposta("Aula nao encontrada para seus cursos.", 404)

        aula = aula_para_dict(row[:6])
        aula["progresso_segundos"] = float(row[13] or 0)

        curso = {
            "id": row[6],
            "titulo": row[7],
            "descricao": de_blob_texto(row[8]),
            "imagem": row[9],
            "status": row[10],
            "status_nome": STATUS_NOMES.get(row[10], "desconhecido"),
            "total_aulas": row[11] or 0,
            "aulas_publicadas": row[12] or 0,
        }

        cursor.execute(
            """
            SELECT V.ID_VIDEO, V.ID_CURSO, V.TITULO, V.DESCRICAO, V.VIDEO_URL, V.STATUS,
                   CASE WHEN PA.ID_VIDEO IS NULL THEN 0 ELSE 1 END,
                   COALESCE(PR.POSICAO_SEGUNDOS, 0)
            FROM VIDEOS V
            LEFT JOIN PROGRESSO_AULAS PA ON PA.ID_VIDEO = V.ID_VIDEO AND PA.ID_USUARIO = ?
            LEFT JOIN PROGRESSO_REPRODUCAO PR ON PR.ID_VIDEO = V.ID_VIDEO AND PR.ID_USUARIO = ?
            WHERE V.ID_CURSO = ? AND V.EXCLUIDO = 0 AND V.STATUS = 1 AND V.ID_VIDEO <> ?
            ORDER BY V.POSICAO_PLAYLIST, V.DATA_UPLOAD, V.ID_VIDEO
            """,
            (id_aluno, id_aluno, aula["id_curso"], id_aula),
        )
        proximas = []
        for prox_row in cursor.fetchall():
            proxima = aula_para_dict(prox_row[:6])
            proxima["assistida"] = bool(prox_row[6])
            proxima["progresso_segundos"] = float(prox_row[7] or 0)
            proximas.append(proxima)

        return jsonify({"aula": aula, "curso": curso, "proximas": proximas})
    except Exception as erro:
        return resposta(f"Erro ao carregar aula: {erro}", 500)
    finally:
        cursor.close()
        con.close()





# Mantém as funções e rotas da sprint acessíveis pelos imports existentes.
from cursos_aluno import descobrir_cursos, detalhe_curso_aluno, garantir_tabela_progresso, inscrever_curso, marcar_aula_assistida, salvar_progresso_aula
