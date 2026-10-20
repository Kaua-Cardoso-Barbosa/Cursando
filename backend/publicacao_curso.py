# Rotas da sprint organizadas por assunto; os comentários dos itens seguem junto ao código.
from flask import request
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



from professor import exigir_professor, resposta

@app.route("/professor/cursos/<int:id_curso>/status", methods=["PATCH"])
@jwt_required()
def alterar_status_curso(id_curso):
    negado = exigir_professor()
    if negado:
        return negado

    try:
        status = int((request.get_json() or {}).get("status"))
    except (TypeError, ValueError):
        return resposta("Status inválido.", 400)

    if status not in STATUS_NOMES:
        return resposta("Status inválido.", 400)

    con = get_db()
    cursor = con.cursor()

    try:
        cursor.execute(
            """
            SELECT C.STATUS, C.TITULO
            FROM CURSOS C
            JOIN PROFESSORES_CURSO PC ON PC.ID_CURSO = C.ID_CURSO
            WHERE C.ID_CURSO = ? AND PC.ID_USUARIO = ? AND C.EXCLUIDO = 0
            """,
            (id_curso, get_jwt_identity()),
        )
        curso_atual = cursor.fetchone()
        if not curso_atual:
            return resposta("Curso não encontrado.", 404)
        status_anterior, titulo_curso = curso_atual

        if status == STATUS_PUBLICADO:
            # Sprint item 20: só libera o status público se a prova final do curso já estiver publicada.
            try:
                cursor.execute(
                    """
                    SELECT COUNT(*)
                    FROM PROVAS_CURSO
                    WHERE ID_CURSO = ? AND PUBLICADA = 1
                    """,
                    (id_curso,),
                )
                if int((cursor.fetchone() or (0,))[0] or 0) == 0:
                    return resposta("Cadastre e publique uma prova antes de publicar o curso.", 400)
            except Exception:
                return resposta("Cadastre e publique uma prova antes de publicar o curso.", 400)

        # Sprint item 11: seleciona uma única vez os alunos ativos dos outros cursos do instrutor ao publicar um curso novo.
        destinatarios = []
        if status == STATUS_PUBLICADO and status_anterior != STATUS_PUBLICADO:
            cursor.execute(
                """
                SELECT DISTINCT U.EMAIL
                FROM USUARIOS U
                JOIN MATRICULAS M ON M.ID_USUARIO = U.ID_USUARIO
                JOIN PROFESSORES_CURSO PC ON PC.ID_CURSO = M.ID_CURSO
                JOIN CURSOS C ON C.ID_CURSO = PC.ID_CURSO
                WHERE PC.ID_USUARIO = ?
                  AND M.STATUS_MATRICULA = 1
                  AND C.EXCLUIDO = 0
                  AND U.EMAIL IS NOT NULL
                  AND TRIM(U.EMAIL) <> ''
                """,
                (get_jwt_identity(),),
            )
            destinatarios = [row[0] for row in cursor.fetchall()]

        cursor.execute(
            """
            UPDATE CURSOS
            SET STATUS = ?, ATUALIZADO_EM = CURRENT_TIMESTAMP
            WHERE ID_CURSO = ? AND EXCLUIDO = 0
              AND EXISTS (
                  SELECT 1 FROM PROFESSORES_CURSO PC
                  WHERE PC.ID_CURSO = CURSOS.ID_CURSO AND PC.ID_USUARIO = ?
              )
            """,
            (status, id_curso, get_jwt_identity()),
        )
        con.commit()
        if status == STATUS_PUBLICADO and status_anterior != STATUS_PUBLICADO:
            # Sprint item 11: envia o aviso depois do commit, sem deixar falhas SMTP reverterem a publicação.
            from email_cursos import notificar_alunos_novo_curso
            notificar_alunos_novo_curso(destinatarios, titulo_curso)
        return resposta(f"Curso definido como {STATUS_NOMES[status]}.", 200, "sucesso")
    except Exception as erro:
        con.rollback()
        return resposta(f"Erro ao alterar status do curso: {erro}", 500)
    finally:
        cursor.close()
        con.close()

__all__ = ['alterar_status_curso']
