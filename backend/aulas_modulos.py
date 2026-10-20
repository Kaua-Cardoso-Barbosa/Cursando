# Rotas da sprint organizadas por assunto; os comentários dos itens seguem junto ao código.
from uuid import uuid4
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



from professor import converter_video_dash, criar_slug, exigir_professor, para_blob_texto, resposta, salvar_thumb_aula, salvar_upload

@app.route("/professor/cursos/<int:id_curso>/aulas", methods=["POST"])
@jwt_required()
def criar_aula_professor(id_curso):
    negado = exigir_professor()
    if negado:
        return negado

    # Sprint item 6: valida e grava a aula somente no módulo escolhido pelo instrutor.
    from sprint import garantir_sprint_schema
    garantir_sprint_schema()

    titulo = (request.form.get("titulo") or "").strip()
    descricao = (request.form.get("descricao") or "").strip()
    id_modulo = request.form.get("id_modulo", type=int)

    if not titulo or not descricao:
        return resposta("Título e descrição são obrigatórios.", 400)

    if not id_modulo:
        return resposta("Selecione um modulo para esta aula.", 400)

    con = get_db()
    cursor = con.cursor()

    try:
        cursor.execute(
            """
            SELECT 1
            FROM CURSOS C
            JOIN PROFESSORES_CURSO PC ON PC.ID_CURSO = C.ID_CURSO
            JOIN MODULOS_CURSO M ON M.ID_CURSO = C.ID_CURSO
            WHERE C.ID_CURSO = ? AND PC.ID_USUARIO = ? AND C.EXCLUIDO = 0 AND M.ID_MODULO = ?
            """,
            (id_curso, get_jwt_identity(), id_modulo),
        )

        if not cursor.fetchone():
            return resposta("Curso não encontrado.", 404)

        cursor.execute("SELECT GEN_ID(GEN_VIDEOS_ID, 1) FROM RDB$DATABASE")
        id_aula = cursor.fetchone()[0]

        try:
            video = salvar_upload(
                request.files.get("video"),
                "aulas",
                {"mp4", "webm", "ogg", "mov"}
            )

            if not video:
                return resposta("O vídeo da aula é obrigatório.", 400)

            video_url = converter_video_dash(
                                video["caminho"],
                                id_aula
                            )

            thumb_url = salvar_thumb_aula(id_aula, request.files.get("thumb"))
        except ValueError as erro:
            return resposta(str(erro), 400)

        cursor.execute(
            """
            INSERT INTO VIDEOS (
                ID_VIDEO, ID_CURSO, ID_MODULO, ID_PUBLICO, TITULO, TITULO_SLUG, DESCRICAO,
                POSICAO_PLAYLIST, DURACAO, DATA_UPLOAD, VIDEO_URL, STATUS, EXCLUIDO, ATUALIZADO_EM
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, CURRENT_TIMESTAMP, ?, 0, 0, CURRENT_TIMESTAMP)
            """,
            (id_aula, id_curso, id_modulo, uuid4().hex, titulo, criar_slug(titulo), para_blob_texto(descricao), video_url),
        )
        con.commit()
        return resposta("Aula cadastrada como privada.", 201, "sucesso", id_aula=id_aula, thumb=thumb_url)
    except Exception as erro:
        con.rollback()
        return resposta(f"Erro ao cadastrar aula: {erro}", 500)
    finally:
        cursor.close()
        con.close()


@app.route("/professor/aulas/<int:id_aula>/modulo", methods=["PATCH"])
@jwt_required()
def mover_aula_para_modulo(id_aula):
    negado = exigir_professor()
    if negado:
        return negado

    from sprint import garantir_sprint_schema
    garantir_sprint_schema()
    try:
        id_modulo = int((request.get_json() or {}).get("id_modulo"))
    except (TypeError, ValueError):
        return resposta("Selecione um modulo valido.", 400)

    con = get_db()
    cursor = con.cursor()
    try:
        cursor.execute(
            """
            SELECT V.ID_CURSO
            FROM VIDEOS V
            JOIN CURSOS C ON C.ID_CURSO = V.ID_CURSO
            JOIN PROFESSORES_CURSO PC ON PC.ID_CURSO = C.ID_CURSO
            WHERE V.ID_VIDEO = ? AND V.EXCLUIDO = 0 AND C.EXCLUIDO = 0
              AND PC.ID_USUARIO = ?
            """,
            (id_aula, get_jwt_identity()),
        )
        curso = cursor.fetchone()
        if not curso:
            return resposta("Aula nao encontrada.", 404)

        cursor.execute(
            "SELECT 1 FROM MODULOS_CURSO WHERE ID_MODULO = ? AND ID_CURSO = ?",
            (id_modulo, curso[0]),
        )
        if not cursor.fetchone():
            return resposta("Modulo nao pertence a este curso.", 400)

        cursor.execute("UPDATE VIDEOS SET ID_MODULO = ?, ATUALIZADO_EM = CURRENT_TIMESTAMP WHERE ID_VIDEO = ?", (id_modulo, id_aula))
        con.commit()
        # Sprint item 6: permite incluir aulas antigas em um dos módulos criados pelo instrutor.
        return resposta("Aula movida para o modulo.", 200, "sucesso")
    except Exception as erro:
        con.rollback()
        return resposta(f"Erro ao mover aula: {erro}", 500)
    finally:
        cursor.close()
        con.close()

__all__ = ['criar_aula_professor', 'mover_aula_para_modulo']
