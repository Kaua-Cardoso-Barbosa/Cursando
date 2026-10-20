# Rotas da sprint organizadas por assunto; os comentários dos itens seguem junto ao código.
from flask import jsonify
from flask_jwt_extended import get_jwt_identity, jwt_required

from app import app
from banco import get_db
from professor import aula_para_dict, de_blob_texto



from aluno import bloquear_por_fatura_aberta, curso_publico_para_dict, exigir_aluno, exigir_assinatura_ativa, query_cursos_base, resposta
from progresso_aulas import garantir_tabela_progresso

@app.route("/aluno/cursos/<int:id_curso>", methods=["GET"])
@jwt_required()
def detalhe_curso_aluno(id_curso):
    negado = exigir_aluno()
    if negado:
        return negado

    id_aluno = get_jwt_identity()
    # Sprint item 6: prepara a coluna de associacao antes de montar a previa publica dos modulos.
    from sprint import garantir_sprint_schema, registrar_evento_curso
    garantir_sprint_schema()
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

        registrar_evento_curso(cursor, id_curso, id_aluno, "ACESSO")

        curso = curso_publico_para_dict(row)
        if curso["matriculado"]:
            bloqueio = exigir_assinatura_ativa(cursor, id_aluno)
            if bloqueio:
                return bloqueio

            bloqueio = bloquear_por_fatura_aberta(cursor, id_aluno)
            if bloqueio:
                return bloqueio

        cursor.execute(
            """
            SELECT ID_MODULO, TITULO, DESCRICAO, IMAGEM_URL, ORDEM
            FROM MODULOS_CURSO
            WHERE ID_CURSO = ?
            ORDER BY ORDEM, ID_MODULO
            """,
            (id_curso,),
        )
        modulos = [
            {
                "id": row[0],
                "id_curso": id_curso,
                "titulo": row[1],
                "descricao": de_blob_texto(row[2]),
                "imagem": row[3],
                "ordem": row[4] or 0,
                "aulas": [],
            }
            for row in cursor.fetchall()
        ]
        modulos_por_id = {int(modulo["id"]): modulo for modulo in modulos}

        cursor.execute(
            """
            SELECT V.ID_VIDEO, V.ID_CURSO, V.TITULO, V.DESCRICAO, V.VIDEO_URL, V.STATUS, V.ID_MODULO,
                   CASE WHEN PA.ID_VIDEO IS NULL THEN 0 ELSE 1 END,
                   COALESCE(PR.POSICAO_SEGUNDOS, 0)
            FROM VIDEOS V
            LEFT JOIN PROGRESSO_AULAS PA ON PA.ID_VIDEO = V.ID_VIDEO AND PA.ID_USUARIO = ?
            LEFT JOIN PROGRESSO_REPRODUCAO PR ON PR.ID_VIDEO = V.ID_VIDEO AND PR.ID_USUARIO = ?
            WHERE V.ID_CURSO = ? AND V.EXCLUIDO = 0 AND V.STATUS = 1
            ORDER BY V.POSICAO_PLAYLIST, V.DATA_UPLOAD, V.ID_VIDEO
            """,
            (id_aluno, id_aluno, id_curso),
        )
        aulas = []
        for aula_row in cursor.fetchall():
            aula = aula_para_dict(aula_row[:6])
            aula["id_modulo"] = aula_row[6]
            aula["assistida"] = bool(aula_row[7])
            aula["progresso_segundos"] = float(aula_row[8] or 0)
            if not curso["matriculado"]:
                aula["video"] = ""
                aula["progresso_segundos"] = 0
            aulas.append(aula)
            modulo = modulos_por_id.get(int(aula["id_modulo"])) if aula["id_modulo"] is not None else None
            if modulo:
                modulo["aulas"].append(aula)

        for modulo in modulos:
            modulo["total_aulas"] = len(modulo["aulas"])

        # Sprint item 27: carrega comentários públicos do curso com a foto, nome e nota de cada aluno avaliador.
        cursor.execute(
            """
            SELECT A.ID_AVALIACAO, U.NOME, U.IMAGEM_PERFIL, A.NOTA, A.COMENTARIO
            FROM AVALIACOES_CURSO A
            JOIN USUARIOS U ON U.ID_USUARIO = A.ID_USUARIO
            WHERE A.ID_CURSO = ?
            ORDER BY A.CRIADO_EM DESC, A.ID_AVALIACAO DESC
            """,
            (id_curso,),
        )
        avaliacoes = [
            {
                "id": avaliacao_row[0],
                "nome": avaliacao_row[1] or "Aluno",
                "imagem_perfil": avaliacao_row[2],
                "nota": int(avaliacao_row[3] or 0),
                "comentario": de_blob_texto(avaliacao_row[4]) or "",
            }
            for avaliacao_row in cursor.fetchall()
        ]

        con.commit()
        return jsonify({"curso": curso, "modulos": modulos, "aulas": aulas, "avaliacoes": avaliacoes})
    except Exception as erro:
        return resposta(f"Erro ao carregar curso: {erro}", 500)
    finally:
        cursor.close()
        con.close()


# Cria ou reativa a matrícula do aluno em um curso publicado.
@app.route("/aluno/cursos/<int:id_curso>/inscrever", methods=["POST"])
@jwt_required()
def inscrever_curso(id_curso):
    negado = exigir_aluno()
    if negado:
        return negado

    id_aluno = get_jwt_identity()
    from sprint import garantir_sprint_schema, registrar_evento_curso
    garantir_sprint_schema()
    con = get_db()
    cursor = con.cursor()

    try:
        bloqueio = exigir_assinatura_ativa(cursor, id_aluno)
        if bloqueio:
            return bloqueio

        bloqueio = bloquear_por_fatura_aberta(cursor, id_aluno)
        if bloqueio:
            return bloqueio

        cursor.execute(
            "SELECT 1 FROM CURSOS WHERE ID_CURSO = ? AND STATUS = 1 AND EXCLUIDO = 0",
            (id_curso,),
        )

        if not cursor.fetchone():
            return resposta("Curso nao encontrado ou indisponivel.", 404)

        # Sprint item 9: contabiliza como acesso mensal a abertura direta do fluxo de inscrição quando não houve detalhe antes.
        registrar_evento_curso(cursor, id_curso, id_aluno, "ACESSO")

        cursor.execute(
            "SELECT STATUS_MATRICULA FROM MATRICULAS WHERE ID_USUARIO = ? AND ID_CURSO = ?",
            (id_aluno, id_curso),
        )
        matricula = cursor.fetchone()

        if matricula:
            cursor.execute(
                """
                UPDATE MATRICULAS
                SET STATUS_MATRICULA = 1,
                    PROGRESSO = COALESCE(PROGRESSO, 0)
                WHERE ID_USUARIO = ? AND ID_CURSO = ?
                """,
                (id_aluno, id_curso),
            )
        else:
            cursor.execute(
                "INSERT INTO MATRICULAS (ID_USUARIO, ID_CURSO, STATUS_MATRICULA, PROGRESSO) VALUES (?, ?, 1, 0)",
                (id_aluno, id_curso),
            )

        if not matricula or int(matricula[0] or 0) != 1:
            registrar_evento_curso(cursor, id_curso, id_aluno, "INSCRICAO")

        con.commit()
        return resposta("Inscricao realizada com sucesso.", 200, "sucesso")
    except Exception as erro:
        con.rollback()
        return resposta(f"Erro ao realizar inscricao: {erro}", 500)
    finally:
        cursor.close()
        con.close()

__all__ = ['detalhe_curso_aluno', 'inscrever_curso']
