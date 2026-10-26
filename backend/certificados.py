"""Sprint item 5: emiss?o do PDF e verifica??o p?blica do certificado.

Etapas para apresentar: concluir as aulas e a prova; baixar o PDF autenticado;
abrir o endere?o p?blico impresso nele e conferir os dados. A rota p?blica
consulta um c?digo emitido; ela n?o exige login nem permite emitir certificados.
"""
from datetime import datetime
import secrets
from flask import Response, redirect
from flask import jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from app import app
from banco import get_db
from estrutura_banco import garantir_estrutura_banco
from professor import de_blob_texto, para_blob_texto
from config import FRONTEND_URL
from utilitarios_backend import _bloqueio_assinatura_aluno, _data_certificado, _pdf_certificado, exigir_tipo, proximo_id, resposta


@app.route("/aluno/cursos/<int:id_curso>/certificado", methods=["GET"])
@jwt_required()
def certificado_aluno(id_curso):
    negado = exigir_tipo(2)
    if negado:
        return negado

    garantir_estrutura_banco()
    con = get_db()
    cursor = con.cursor()

    try:
        bloqueio = _bloqueio_assinatura_aluno(cursor, int(get_jwt_identity()))
        if bloqueio:
            return bloqueio

        cursor.execute(
            """
            SELECT U.NOME, C.TITULO, M.PROGRESSO
            FROM MATRICULAS M
            JOIN USUARIOS U ON U.ID_USUARIO = M.ID_USUARIO
            JOIN CURSOS C ON C.ID_CURSO = M.ID_CURSO
            WHERE M.ID_CURSO = ? AND M.ID_USUARIO = ? AND M.STATUS_MATRICULA = 1
            """,
            (id_curso, get_jwt_identity()),
        )
        row = cursor.fetchone()
        if not row or int(row[2] or 0) < 100:
            return resposta("Certificado liberado somente apos concluir o curso.", 403)

        # Sprint item 5: confirma que todas as aulas publicadas foram marcadas como concluidas.
        cursor.execute(
            """
            SELECT COUNT(V.ID_VIDEO), COUNT(PA.ID_VIDEO), MAX(PA.ASSISTIDO_EM)
            FROM VIDEOS V
            LEFT JOIN PROGRESSO_AULAS PA
              ON PA.ID_VIDEO = V.ID_VIDEO AND PA.ID_USUARIO = ?
            WHERE V.ID_CURSO = ? AND V.EXCLUIDO = 0 AND V.STATUS = 1
            """,
            (get_jwt_identity(), id_curso),
        )
        total_aulas, aulas_concluidas, concluido_em = cursor.fetchone() or (0, 0, None)
        if not total_aulas or aulas_concluidas != total_aulas:
            return resposta("Certificado liberado somente apos concluir todas as aulas do curso.", 403)

        # Sprint item 20: exige uma submissão aprovada na prova final antes de emitir ou baixar o PDF.
        cursor.execute(
            """
            SELECT FIRST 1 P.ID_PROVA, R.STATUS, R.FEEDBACK
            FROM PROVAS_CURSO P
            LEFT JOIN RESPOSTAS_PROVA R
              ON R.ID_PROVA = P.ID_PROVA AND R.ID_USUARIO = ?
            WHERE P.ID_CURSO = ? AND P.PUBLICADA = 1
            ORDER BY P.ID_PROVA DESC, R.ID_RESPOSTA DESC
            """,
            (get_jwt_identity(), id_curso),
        )
        prova = cursor.fetchone()
        if not prova:
            return resposta("Certificado bloqueado: curso sem prova publicada.", 403)

        if int(prova[1] or 0) == 0:
            return resposta("Certificado bloqueado: prova aguardando correcao.", 403)

        if int(prova[1] or 0) != 1:
            feedback = de_blob_texto(prova[2])
            detalhe = f" Feedback: {feedback}" if feedback else ""
            return resposta(f"Certificado bloqueado: aluno reprovado na prova. Tente novamente apos 1 dia.{detalhe}", 403)

        cursor.execute(
            """
            SELECT FIRST 1 CODIGO, CRIADO_EM
            FROM CERTIFICADOS
            WHERE ID_CURSO = ? AND ID_USUARIO = ?
            ORDER BY ID_CERTIFICADO
            """,
            (id_curso, get_jwt_identity()),
        )
        certificado = cursor.fetchone()
        if not certificado:
            # Sprint item 5: reutiliza sempre o mesmo código para cada certificado emitido.
            codigo = f"CURSANDO-{secrets.token_hex(6).upper()}"
            cursor.execute(
                """
                UPDATE OR INSERT INTO CERTIFICADOS (ID_CERTIFICADO, ID_CURSO, ID_USUARIO, CODIGO)
                VALUES (?, ?, ?, ?)
                MATCHING (ID_CURSO, ID_USUARIO)
                """,
                (proximo_id(cursor, "CERTIFICADOS", "ID_CERTIFICADO"), id_curso, get_jwt_identity(), codigo),
            )
            con.commit()
            cursor.execute(
                """
                SELECT FIRST 1 CODIGO, CRIADO_EM
                FROM CERTIFICADOS
                WHERE ID_CURSO = ? AND ID_USUARIO = ?
                ORDER BY ID_CERTIFICADO
                """,
                (id_curso, get_jwt_identity()),
            )
            certificado = cursor.fetchone()

        codigo = certificado[0]
        emitido_em = certificado[1] or datetime.now()
        cursor.execute(
            """
            SELECT FIRST 1 U.NOME
            FROM PROFESSORES_CURSO PC
            JOIN USUARIOS U ON U.ID_USUARIO = PC.ID_USUARIO
            WHERE PC.ID_CURSO = ?
            ORDER BY U.NOME
            """,
            (id_curso,),
        )
        professor = (cursor.fetchone() or ("Instrutor(a) do curso",))[0]
        concluido_em = concluido_em or emitido_em
        url_verificacao = f"{FRONTEND_URL}/certificados/{codigo}/verificar"

        # Sprint item 5: o PDF reúne aluno, curso, aprovação, instrutor, datas e código verificável.
        pdf = _pdf_certificado({
            "aluno": row[0],
            "curso": row[1],
            "professor": professor,
            "aulas_concluidas": total_aulas,
            "data_conclusao": _data_certificado(concluido_em),
            "data_emissao": _data_certificado(emitido_em),
            "codigo": codigo,
            "url_verificacao": url_verificacao,
        })
        return Response(
            pdf,
            mimetype="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename=certificado-{id_curso}.pdf",
                "Cache-Control": "private, no-store",
            },
        )
    except Exception as erro:
        con.rollback()
        return resposta(f"Erro ao gerar certificado: {erro}", 500)
    finally:
        cursor.close()
        con.close()



@app.route("/certificados/<string:codigo>/verificar", methods=["GET"])
def verificar_certificado(codigo):
    if request.accept_mimetypes.accept_html and request.accept_mimetypes.best != "application/json":
        return redirect(f"{FRONTEND_URL}/certificados/{codigo}/verificar", code=302)
    # Sprint item 5: permite conferir publicamente se o código do PDF foi emitido pelo Cursando.
    garantir_estrutura_banco()
    con = get_db()
    cursor = con.cursor()
    try:
        cursor.execute(
            """
            SELECT FIRST 1 C.CODIGO, U.NOME, CUR.TITULO, C.CRIADO_EM
            FROM CERTIFICADOS C
            JOIN USUARIOS U ON U.ID_USUARIO = C.ID_USUARIO
            JOIN CURSOS CUR ON CUR.ID_CURSO = C.ID_CURSO
            WHERE C.CODIGO = ?
            """,
            (codigo,),
        )
        certificado = cursor.fetchone()
        if not certificado:
            return resposta("Código de certificado não encontrado.", 404)

        cursor.execute(
            """
            SELECT FIRST 1 U.NOME
            FROM PROFESSORES_CURSO PC
            JOIN USUARIOS U ON U.ID_USUARIO = PC.ID_USUARIO
            JOIN CERTIFICADOS C ON C.ID_CURSO = PC.ID_CURSO
            WHERE C.CODIGO = ?
            ORDER BY U.NOME
            """,
            (codigo,),
        )
        professor = (cursor.fetchone() or ("Instrutor(a) do curso",))[0]
        emitido_em = certificado[3]
        return jsonify({
            "valido": True,
            "certificado": {
                "codigo": certificado[0],
                "aluno": certificado[1],
                "curso": certificado[2],
                "professor": professor,
                "emitido_em": emitido_em.isoformat() if hasattr(emitido_em, "isoformat") else str(emitido_em or ""),
            },
        })
    except Exception as erro:
        return resposta(f"Erro ao verificar certificado: {erro}", 500)
    finally:
        cursor.close()
        con.close()
