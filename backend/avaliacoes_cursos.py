"""Sprint item 27: estrelas e comentários públicos do curso.

Uma rota recebe a avaliação, confirma matrícula, conclusão e aprovação na prova,
e só então grava o comentário. As regras ficam no servidor para serem iguais
no site e no aplicativo. O cursor executa SQL; commit confirma a grava??o.
"""
from flask import jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from app import app
from banco import get_db
from estrutura_banco import garantir_estrutura_banco
from professor import de_blob_texto, para_blob_texto
from utilitarios_backend import _bloqueio_assinatura_aluno, exigir_tipo, proximo_id, resposta


# Sprint item 27: a avaliação só é aceita após matrícula, conclusão das aulas
# e aprovação na prova final. O mesmo endpoint atende site e aplicativo.
@app.route("/aluno/cursos/<int:id_curso>/avaliacoes", methods=["POST"])
@jwt_required()
def avaliar_curso(id_curso):
    negado = exigir_tipo(2)
    if negado:
        return negado

    garantir_estrutura_banco()
    dados = request.get_json() or {}
    nota_recebida = dados.get("nota")
    if isinstance(nota_recebida, bool) or not isinstance(nota_recebida, (int, str)):
        return resposta("A nota deve ser um numero inteiro entre 0 e 5.", 400)
    if isinstance(nota_recebida, str) and not nota_recebida.strip().isdigit():
        return resposta("A nota deve ser um numero inteiro entre 0 e 5.", 400)
    nota = int(nota_recebida)
    comentario = (dados.get("comentario") or "").strip()

    if nota < 0 or nota > 5:
        return resposta("A nota deve estar entre 0 e 5.", 400)

    con = get_db()
    cursor = con.cursor()

    try:
        cursor.execute(
            """
            SELECT PROGRESSO
            FROM MATRICULAS
            WHERE ID_CURSO = ? AND ID_USUARIO = ? AND STATUS_MATRICULA = 1
            """,
            (id_curso, get_jwt_identity()),
        )
        matricula = cursor.fetchone()
        if not matricula or int(matricula[0] or 0) < 100:
            return resposta("Avaliacao liberada somente apos concluir o curso.", 403)

        bloqueio = _bloqueio_assinatura_aluno(cursor, int(get_jwt_identity()))
        if bloqueio:
            return bloqueio

        cursor.execute(
            """
            SELECT FIRST 1 R.STATUS
            FROM PROVAS_CURSO P
            JOIN RESPOSTAS_PROVA R ON R.ID_PROVA = P.ID_PROVA AND R.ID_USUARIO = ?
            WHERE P.ID_CURSO = ? AND P.PUBLICADA = 1
            ORDER BY R.ID_RESPOSTA DESC
            """,
            (get_jwt_identity(), id_curso),
        )
        status_prova = cursor.fetchone()
        if not status_prova or int(status_prova[0] or 0) != 1:
            return resposta("Avaliacao liberada somente apos aprovacao na prova.", 403)

        # Sprint item 27: persiste a nota em estrelas e o comentario vinculados ao curso e ao aluno.
        cursor.execute(
            """
            UPDATE OR INSERT INTO AVALIACOES_CURSO (
                ID_AVALIACAO, ID_CURSO, ID_USUARIO, NOTA, COMENTARIO, CRIADO_EM
            )
            VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            MATCHING (ID_CURSO, ID_USUARIO)
            """,
            (
                proximo_id(cursor, "AVALIACOES_CURSO", "ID_AVALIACAO"),
                id_curso,
                get_jwt_identity(),
                nota,
                para_blob_texto(comentario),
            ),
        )
        con.commit()
        return resposta("Avaliacao registrada com sucesso.", 201, "sucesso")
    except Exception as erro:
        con.rollback()
        return resposta(f"Erro ao avaliar curso: {erro}", 500)
    finally:
        cursor.close()
        con.close()



