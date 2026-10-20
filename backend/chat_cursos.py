
from flask import jsonify, request
from flask_jwt_extended import get_jwt, get_jwt_identity, jwt_required

from app import app
from banco import get_db
from professor import de_blob_texto, para_blob_texto


from sprint_schema import garantir_sprint_schema
from sprint_comum import _aluno_matriculado, _bloqueio_assinatura_aluno, _curso_do_professor, _professor_responsavel, proximo_id, resposta



# Sprint item 19: lista cursos matriculados para alunos e conversas recebidas para instrutores, com nome e avatar do contato.
@app.route("/chat/conversas", methods=["GET"])
@jwt_required()
def chat_conversas():
    garantir_sprint_schema()
    tipo = int(get_jwt().get("tipo", -1))
    id_usuario = int(get_jwt_identity())
    con = get_db()
    cursor = con.cursor()

    try:
        if tipo == 1:
            cursor.execute(
                """
                SELECT
                    M.ID_CURSO,
                    M.ID_ALUNO,
                    C.TITULO,
                    U.NOME,
                    U.EMAIL,
                    U.IMAGEM_PERFIL,
                    MAX(M.CRIADO_EM),
                    SUM(CASE WHEN M.ID_DESTINATARIO = ? AND M.LIDA = 0 THEN 1 ELSE 0 END)
                FROM MENSAGENS_CHAT M
                JOIN CURSOS C ON C.ID_CURSO = M.ID_CURSO
                JOIN USUARIOS U ON U.ID_USUARIO = M.ID_ALUNO
                JOIN PROFESSORES_CURSO PC ON PC.ID_CURSO = M.ID_CURSO AND PC.ID_USUARIO = ?
                GROUP BY M.ID_CURSO, M.ID_ALUNO, C.TITULO, U.NOME, U.EMAIL, U.IMAGEM_PERFIL
                ORDER BY MAX(M.CRIADO_EM) DESC
                """,
                (id_usuario, id_usuario),
            )
            return jsonify([
                {
                    "id_curso": row[0],
                    "id_aluno": row[1],
                    "curso": row[2],
                    "nome": row[3],
                    "email": row[4],
                    "imagem_perfil": row[5],
                    "ultima_mensagem_em": row[6].isoformat() if row[6] else None,
                    "nao_lidas": int(row[7] or 0),
                }
                for row in cursor.fetchall()
            ])

        if tipo == 2:
            cursor.execute(
                """
                SELECT
                    C.ID_CURSO,
                    MT.ID_USUARIO,
                    C.TITULO,
                    U.NOME,
                    U.EMAIL,
                    U.IMAGEM_PERFIL,
                    MAX(M.CRIADO_EM),
                    SUM(CASE WHEN M.ID_DESTINATARIO = ? AND M.LIDA = 0 THEN 1 ELSE 0 END)
                FROM MATRICULAS MT
                JOIN CURSOS C ON C.ID_CURSO = MT.ID_CURSO AND C.EXCLUIDO = 0
                JOIN PROFESSORES_CURSO PC ON PC.ID_CURSO = C.ID_CURSO
                JOIN USUARIOS U ON U.ID_USUARIO = PC.ID_USUARIO
                LEFT JOIN MENSAGENS_CHAT M ON M.ID_CURSO = C.ID_CURSO AND M.ID_ALUNO = MT.ID_USUARIO
                WHERE MT.ID_USUARIO = ? AND MT.STATUS_MATRICULA = 1
                GROUP BY C.ID_CURSO, MT.ID_USUARIO, C.TITULO, U.NOME, U.EMAIL, U.IMAGEM_PERFIL
                ORDER BY MAX(M.CRIADO_EM) DESC, C.TITULO
                """,
                (id_usuario, id_usuario),
            )
            return jsonify([
                {
                    "id_curso": row[0],
                    "id_aluno": row[1],
                    "curso": row[2],
                    "nome": row[3],
                    "email": row[4],
                    "imagem_perfil": row[5],
                    "ultima_mensagem_em": row[6].isoformat() if row[6] else None,
                    "nao_lidas": int(row[7] or 0),
                }
                for row in cursor.fetchall()
            ])

        return resposta("Chat disponivel apenas para alunos e instrutores.", 403)
    except Exception as erro:
        return resposta(f"Erro ao listar conversas: {erro}", 500)
    finally:
        cursor.close()
        con.close()



# Sprint item 19: valida matrícula e autoria, registra mensagens e retorna identidade visual de cada remetente.
@app.route("/chat/cursos/<int:id_curso>/mensagens", methods=["GET", "POST"])
@jwt_required()
def chat_mensagens(id_curso):
    garantir_sprint_schema()
    tipo = int(get_jwt().get("tipo", -1))
    id_usuario = int(get_jwt_identity())
    con = get_db()
    cursor = con.cursor()

    try:
        if tipo == 2:
            id_aluno = id_usuario
            if not _aluno_matriculado(cursor, id_curso, id_aluno):
                return resposta("Aluno sem matricula ativa neste curso.", 403)
            bloqueio = _bloqueio_assinatura_aluno(cursor, id_aluno)
            if bloqueio:
                return bloqueio
        elif tipo == 1:
            if not _curso_do_professor(cursor, id_curso, id_usuario):
                return resposta("Curso nao encontrado para este instrutor.", 404)
            id_aluno = int((request.args.get("id_aluno") or (request.get_json(silent=True) or {}).get("id_aluno") or 0))
            if not id_aluno or not _aluno_matriculado(cursor, id_curso, id_aluno):
                return resposta("Informe um aluno matriculado para a conversa.", 400)
        else:
            return resposta("Chat disponivel apenas para alunos e instrutores.", 403)

        if request.method == "GET":
            cursor.execute(
                """
                UPDATE MENSAGENS_CHAT
                SET LIDA = 1
                WHERE ID_CURSO = ? AND ID_ALUNO = ? AND ID_DESTINATARIO = ?
                """,
                (id_curso, id_aluno, id_usuario),
            )
            cursor.execute(
                """
                SELECT M.ID_MENSAGEM, M.ID_REMETENTE, U.NOME, U.EMAIL, U.IMAGEM_PERFIL, M.TEXTO, M.LIDA, M.CRIADO_EM
                FROM MENSAGENS_CHAT M
                JOIN USUARIOS U ON U.ID_USUARIO = M.ID_REMETENTE
                WHERE M.ID_CURSO = ? AND M.ID_ALUNO = ?
                ORDER BY M.ID_MENSAGEM
                """,
                (id_curso, id_aluno),
            )
            mensagens = [
                {
                    "id": row[0],
                    "id_remetente": row[1],
                    "nome": row[2],
                    "email": row[3],
                    "imagem_perfil": row[4],
                    "texto": de_blob_texto(row[5]),
                    "lida": row[6] == 1,
                    "criado_em": row[7].isoformat() if row[7] else None,
                    "minha": int(row[1]) == id_usuario,
                }
                for row in cursor.fetchall()
            ]
            con.commit()
            return jsonify(mensagens)

        dados = request.get_json() or {}
        texto = (dados.get("texto") or "").strip()
        if not texto:
            return resposta("Mensagem nao pode ficar vazia.", 400)

        if tipo == 2:
            id_destinatario = _professor_responsavel(cursor, id_curso)
            if not id_destinatario:
                return resposta("Curso sem instrutor responsavel.", 400)
        else:
            id_destinatario = id_aluno

        cursor.execute(
            """
            INSERT INTO MENSAGENS_CHAT (
                ID_MENSAGEM, ID_CURSO, ID_ALUNO, ID_REMETENTE, ID_DESTINATARIO, TEXTO
            )
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (
                proximo_id(cursor, "MENSAGENS_CHAT", "ID_MENSAGEM"),
                id_curso,
                id_aluno,
                id_usuario,
                id_destinatario,
                para_blob_texto(texto),
            ),
        )
        con.commit()
        return resposta("Mensagem enviada.", 201, "sucesso")
    except Exception as erro:
        con.rollback()
        return resposta(f"Erro ao processar chat: {erro}", 500)
    finally:
        cursor.close()
        con.close()

__all__ = ['chat_conversas', 'chat_mensagens']
