# Rotas da sprint organizadas por assunto; os comentários dos itens seguem junto ao código.
from flask import jsonify
from flask_jwt_extended import get_jwt_identity, jwt_required

from app import app
from banco import get_db


STATUS_PRIVADO = 0
STATUS_PUBLICADO = 1
STATUS_ARQUIVADO = 2

STATUS_NOMES = {
    STATUS_PRIVADO: "privado",
    STATUS_PUBLICADO: "publicado",
    STATUS_ARQUIVADO: "arquivado",
}

CURSO_STATUS_FILTRO = {
    "todos": None,
    "privados": STATUS_PRIVADO,
    "publicados": STATUS_PUBLICADO,
    "arquivados": STATUS_ARQUIVADO,
}

AULA_STATUS_FILTRO = {
    "todos": None,
    "privadas": STATUS_PRIVADO,
    "publicadas": STATUS_PUBLICADO,
}



from professor import banco_nao_preparado, criar_mensagem, curso_para_dict, exigir_professor, resposta

@app.route("/professor/dashboard", methods=["GET"])
@jwt_required()
def professor_dashboard():
    negado = exigir_professor()
    if negado:
        return negado

    id_professor = get_jwt_identity()
    # Sprint item 7: garante as tabelas de módulos e progresso usadas pelas métricas do painel.
    from sprint import garantir_sprint_schema
    from aluno import garantir_tabela_progresso

    garantir_sprint_schema()
    con = get_db()
    cursor = con.cursor()

    try:
        garantir_tabela_progresso(con)
        cursor.execute(
            """
            SELECT
                COUNT(*),
                SUM(CASE WHEN C.STATUS = 1 THEN 1 ELSE 0 END),
                SUM(CASE WHEN C.STATUS = 0 THEN 1 ELSE 0 END),
                SUM(CASE WHEN C.STATUS = 2 THEN 1 ELSE 0 END)
            FROM CURSOS C
            JOIN PROFESSORES_CURSO PC ON PC.ID_CURSO = C.ID_CURSO
            WHERE PC.ID_USUARIO = ? AND C.EXCLUIDO = 0
            """,
            (id_professor,),
        )
        cursos = cursor.fetchone() or (0, 0, 0, 0)

        cursor.execute(
            """
            SELECT
                COUNT(*),
                SUM(CASE WHEN V.STATUS = 1 THEN 1 ELSE 0 END)
            FROM VIDEOS V
            JOIN CURSOS C ON C.ID_CURSO = V.ID_CURSO
            JOIN PROFESSORES_CURSO PC ON PC.ID_CURSO = C.ID_CURSO
            WHERE PC.ID_USUARIO = ? AND C.EXCLUIDO = 0 AND V.EXCLUIDO = 0
            """,
            (id_professor,),
        )
        aulas = cursor.fetchone() or (0, 0)

        cursor.execute(
            """
            SELECT COUNT(DISTINCT M.ID_USUARIO)
            FROM MATRICULAS M
            JOIN CURSOS C ON C.ID_CURSO = M.ID_CURSO
            JOIN PROFESSORES_CURSO PC ON PC.ID_CURSO = C.ID_CURSO
            WHERE PC.ID_USUARIO = ? AND C.EXCLUIDO = 0 AND M.STATUS_MATRICULA = 1
            """,
            (id_professor,),
        )
        total_alunos = (cursor.fetchone() or (0,))[0] or 0

        # Sprint item 7: conta cada conclusão de curso por aluno usando somente aulas publicadas.
        cursor.execute(
            """
            SELECT COUNT(DISTINCT CAST(M.ID_USUARIO AS VARCHAR(20)) || '-' || CAST(C.ID_CURSO AS VARCHAR(20)))
            FROM MATRICULAS M
            JOIN CURSOS C ON C.ID_CURSO = M.ID_CURSO
            JOIN PROFESSORES_CURSO PC ON PC.ID_CURSO = C.ID_CURSO
            WHERE PC.ID_USUARIO = ? AND C.EXCLUIDO = 0 AND M.STATUS_MATRICULA = 1
              AND EXISTS (
                  SELECT 1 FROM VIDEOS V
                  WHERE V.ID_CURSO = C.ID_CURSO AND V.EXCLUIDO = 0 AND V.STATUS = 1
              )
              AND NOT EXISTS (
                  SELECT 1
                  FROM VIDEOS V
                  WHERE V.ID_CURSO = C.ID_CURSO AND V.EXCLUIDO = 0 AND V.STATUS = 1
                    AND NOT EXISTS (
                        SELECT 1 FROM PROGRESSO_AULAS PA
                        WHERE PA.ID_VIDEO = V.ID_VIDEO AND PA.ID_USUARIO = M.ID_USUARIO
                    )
              )
            """,
            (id_professor,),
        )
        cursos_concluidos = (cursor.fetchone() or (0,))[0] or 0

        # Sprint item 7: conta módulos concluídos por aluno, exigindo ao menos uma aula publicada.
        cursor.execute(
            """
            SELECT COUNT(DISTINCT CAST(M.ID_USUARIO AS VARCHAR(20)) || '-' || CAST(MC.ID_MODULO AS VARCHAR(20)))
            FROM MATRICULAS M
            JOIN CURSOS C ON C.ID_CURSO = M.ID_CURSO
            JOIN PROFESSORES_CURSO PC ON PC.ID_CURSO = C.ID_CURSO
            JOIN MODULOS_CURSO MC ON MC.ID_CURSO = C.ID_CURSO
            WHERE PC.ID_USUARIO = ? AND C.EXCLUIDO = 0 AND M.STATUS_MATRICULA = 1
              AND EXISTS (
                  SELECT 1 FROM VIDEOS V
                  WHERE V.ID_MODULO = MC.ID_MODULO AND V.EXCLUIDO = 0 AND V.STATUS = 1
              )
              AND NOT EXISTS (
                  SELECT 1
                  FROM VIDEOS V
                  WHERE V.ID_MODULO = MC.ID_MODULO AND V.EXCLUIDO = 0 AND V.STATUS = 1
                    AND NOT EXISTS (
                        SELECT 1 FROM PROGRESSO_AULAS PA
                        WHERE PA.ID_VIDEO = V.ID_VIDEO AND PA.ID_USUARIO = M.ID_USUARIO
                    )
              )
            """,
            (id_professor,),
        )
        modulos_concluidos = (cursor.fetchone() or (0,))[0] or 0

        # Sprint item 7: transforma os segundos efetivamente registrados em horas assistidas.
        cursor.execute(
            """
            SELECT COALESCE(SUM(T.SEGUNDOS_ASSISTIDOS), 0)
            FROM TEMPO_ASSISTIDO_AULAS T
            JOIN VIDEOS V ON V.ID_VIDEO = T.ID_VIDEO
            JOIN CURSOS C ON C.ID_CURSO = V.ID_CURSO
            JOIN PROFESSORES_CURSO PC ON PC.ID_CURSO = C.ID_CURSO
            WHERE PC.ID_USUARIO = ? AND C.EXCLUIDO = 0 AND V.EXCLUIDO = 0
            """,
            (id_professor,),
        )
        horas_assistidas = round(float((cursor.fetchone() or (0,))[0] or 0) / 3600, 2)

        cursor.execute(
            """
            SELECT FIRST 6
                C.ID_CURSO,
                C.TITULO,
                C.DESCRICAO,
                C.IMAGEM_URL,
                C.STATUS,
                (SELECT COUNT(*) FROM VIDEOS V WHERE V.ID_CURSO = C.ID_CURSO AND V.EXCLUIDO = 0),
                (SELECT COUNT(*) FROM VIDEOS V WHERE V.ID_CURSO = C.ID_CURSO AND V.EXCLUIDO = 0 AND V.STATUS = 1),
                (SELECT COUNT(DISTINCT M.ID_USUARIO) FROM MATRICULAS M WHERE M.ID_CURSO = C.ID_CURSO AND M.STATUS_MATRICULA = 1)
            FROM CURSOS C
            JOIN PROFESSORES_CURSO PC ON PC.ID_CURSO = C.ID_CURSO
            WHERE PC.ID_USUARIO = ? AND C.EXCLUIDO = 0
            ORDER BY C.ATUALIZADO_EM DESC
            """,
            (id_professor,),
        )
        recentes = [curso_para_dict(row) for row in cursor.fetchall()]

        return jsonify(
            {
                "metricas": {
                    "cursos_cadastrados": cursos[0] or 0,
                    "cursos_publicados": cursos[1] or 0,
                    "cursos_privados": cursos[2] or 0,
                    "cursos_arquivados": cursos[3] or 0,
                    "aulas_total": aulas[0] or 0,
                    "aulas_publicadas": aulas[1] or 0,
                    "total_alunos": total_alunos,
                    "cursos_concluidos": cursos_concluidos,
                    "modulos_concluidos": modulos_concluidos,
                    "horas_assistidas": horas_assistidas,
                },
                "recentes": recentes,
            }
        )
    except Exception as erro:
        if banco_nao_preparado(erro):
            return jsonify(
                {
                    "metricas": {
                        "cursos_cadastrados": 0,
                        "cursos_publicados": 0,
                        "cursos_privados": 0,
                        "cursos_arquivados": 0,
                        "aulas_total": 0,
                        "aulas_publicadas": 0,
                        "total_alunos": 0,
                        "cursos_concluidos": 0,
                        "modulos_concluidos": 0,
                        "horas_assistidas": 0,
                    },
                    "recentes": [],
                    "mensagem": criar_mensagem("Banco ainda não preparado para a dashboard do professor.", "erro"),
                }
            )
        return resposta(f"Erro ao carregar dashboard: {erro}", 500)
    finally:
        cursor.close()
        con.close()

__all__ = ['professor_dashboard']
