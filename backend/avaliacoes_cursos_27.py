
from flask import request
from flask_jwt_extended import get_jwt_identity, jwt_required

from app import app
from banco_37 import get_db
from estrutura_banco_1_5_6_9_15_19_20_21_27_28_32_33_36_37 import garantir_estrutura_banco
from professor_7 import para_blob_texto
from servicos.avaliacao_curso import consultar_liberacao
from utilitarios_backend_5_9_12_15_20_24_28_34 import _bloqueio_assinatura_aluno, exigir_tipo, proximo_id, resposta




# A nota do curso é liberada após 75% das aulas, sem exigir aprovação em prova.
@app.route("/aluno/cursos/<int:id_curso>/avaliacoes", methods=["POST"])
@jwt_required()
def avaliar_curso(id_curso):
    
    negado = exigir_tipo(2)
    if negado:
        return negado

    garantir_estrutura_banco()
    dados = request.get_json(silent=True)
    if not isinstance(dados, dict):
        return resposta("Envie os dados da avaliação em um objeto JSON.", 400)
    nota_recebida = dados.get("nota")
    if isinstance(nota_recebida, bool) or not isinstance(nota_recebida, (int, str)):
        return resposta("A nota deve ser um numero inteiro entre 0 e 5.", 400)
    if isinstance(nota_recebida, str) and not nota_recebida.strip().isdigit():
        return resposta("A nota deve ser um numero inteiro entre 0 e 5.", 400)
    try:
        nota = int(nota_recebida)
    except ValueError:
        return resposta("A nota deve ser um numero inteiro entre 0 e 5.", 400)
    comentario = dados.get("comentario", "")
    if comentario is None:
        comentario = ""
    if not isinstance(comentario, str):
        return resposta("O comentário deve ser um texto.", 400)
    comentario = comentario.strip()

    if nota < 0 or nota > 5:
        return resposta("A nota deve estar entre 0 e 5.", 400)

    con = get_db()
    cursor = con.cursor()

    try:
        liberacao = consultar_liberacao(cursor, id_curso, get_jwt_identity())
        if not liberacao["pode_avaliar"]:
            return resposta(liberacao["regra"] + " " + liberacao["mensagem"], 403,
                            avaliacao=liberacao)

        bloqueio = _bloqueio_assinatura_aluno(cursor, int(get_jwt_identity()))
        if bloqueio:
            return bloqueio

        # Ao editar, preserve o identificador da avaliação existente.
        cursor.execute("SELECT ID_AVALIACAO FROM AVALIACOES_CURSO WHERE ID_CURSO = ? AND ID_USUARIO = ?",
                       (id_curso, get_jwt_identity()))
        existente = cursor.fetchone()
        id_avaliacao = existente[0] if existente else proximo_id(cursor, "AVALIACOES_CURSO", "ID_AVALIACAO")
        cursor.execute(
            """
            UPDATE OR INSERT INTO AVALIACOES_CURSO (
                ID_AVALIACAO, ID_CURSO, ID_USUARIO, NOTA, COMENTARIO, CRIADO_EM
            )
            VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            MATCHING (ID_CURSO, ID_USUARIO)
            """,
            (
                id_avaliacao,
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
# Fim item 27



