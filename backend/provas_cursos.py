import json
from datetime import datetime, timedelta

from flask import jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from app import app
from banco import get_db
from professor import de_blob_texto, para_blob_texto


from sprint_schema import garantir_sprint_schema
from sprint_comum import _aluno_matriculado, _bloqueio_assinatura_aluno, _curso_do_professor, _decodificar_alternativas, _decodificar_respostas_prova, exigir_tipo, proximo_id, resposta



# Sprint item 20: cria ou atualiza o rascunho da prova e publica questões objetivas e dissertativas.
@app.route("/professor/cursos/<int:id_curso>/prova", methods=["GET", "POST"])
@jwt_required()
def prova_professor(id_curso):
    negado = exigir_tipo(1)
    if negado:
        return negado

    garantir_sprint_schema()
    con = get_db()
    cursor = con.cursor()

    try:
        if not _curso_do_professor(cursor, id_curso, int(get_jwt_identity())):
            return resposta("Curso nao encontrado para este instrutor.", 404)

        if request.method == "GET":
            cursor.execute(
                """
                SELECT FIRST 1 ID_PROVA, TITULO, PUBLICADA
                FROM PROVAS_CURSO
                WHERE ID_CURSO = ?
                ORDER BY ID_PROVA DESC
                """,
                (id_curso,),
            )
            prova = cursor.fetchone()
            if not prova:
                return jsonify({"prova": None, "questoes": []})

            cursor.execute(
                """
                SELECT ID_QUESTAO, ENUNCIADO, TIPO, ALTERNATIVAS, RESPOSTA_ESPERADA
                FROM QUESTOES_PROVA
                WHERE ID_PROVA = ?
                ORDER BY ID_QUESTAO
                """,
                (prova[0],),
            )
            return jsonify({
                "prova": {
                    "id": prova[0],
                    "titulo": prova[1],
                    "publicada": prova[2] == 1,
                },
                "questoes": [
                    {
                        "id": row[0],
                        "enunciado": de_blob_texto(row[1]),
                        "tipo": row[2],
                        "alternativas": _decodificar_alternativas(row[3]),
                        "resposta_esperada": de_blob_texto(row[4]),
                    }
                    for row in cursor.fetchall()
                ],
            })

        dados = request.get_json() or {}
        titulo = (dados.get("titulo") or "").strip()
        questoes = dados.get("questoes") or []

        if not titulo:
            return resposta("Titulo da prova e obrigatorio.", 400)

        if not isinstance(questoes, list) or len(questoes) == 0:
            return resposta("Cadastre ao menos uma questao.", 400)

        questoes_validadas = []
        for questao in questoes:
            enunciado = (questao.get("enunciado") or "").strip()
            tipo = (questao.get("tipo") or "objetiva").strip().lower()
            alternativas = questao.get("alternativas") or ""
            resposta_esperada = questao.get("resposta_esperada") or ""

            if not enunciado or tipo not in {"objetiva", "dissertativa"}:
                return resposta("Questao invalida.", 400)

            if tipo == "objetiva":
                if isinstance(alternativas, str):
                    alternativas = [opcao.strip() for opcao in alternativas.splitlines() if opcao.strip()]
                if not isinstance(alternativas, list) or len(alternativas) < 2:
                    return resposta("Cada questao objetiva precisa ter ao menos duas alternativas.", 400)
                alternativas = [str(opcao).strip() for opcao in alternativas if str(opcao).strip()]
                if len(alternativas) < 2:
                    return resposta("Cada questao objetiva precisa ter ao menos duas alternativas.", 400)
            else:
                alternativas = []
            questoes_validadas.append((enunciado, tipo, alternativas, str(resposta_esperada).strip()))

        cursor.execute("SELECT FIRST 1 ID_PROVA, PUBLICADA FROM PROVAS_CURSO WHERE ID_CURSO = ? ORDER BY ID_PROVA DESC", (id_curso,))
        prova_existente = cursor.fetchone()
        if prova_existente and int(prova_existente[1] or 0) == 1:
            return resposta("A prova publicada nao pode ser alterada.", 409)

        if prova_existente:
            id_prova = prova_existente[0]
            cursor.execute("UPDATE PROVAS_CURSO SET TITULO = ? WHERE ID_PROVA = ?", (titulo, id_prova))
            cursor.execute("DELETE FROM QUESTOES_PROVA WHERE ID_PROVA = ?", (id_prova,))
        else:
            id_prova = proximo_id(cursor, "PROVAS_CURSO", "ID_PROVA")
            cursor.execute(
                "INSERT INTO PROVAS_CURSO (ID_PROVA, ID_CURSO, TITULO, PUBLICADA) VALUES (?, ?, ?, 0)",
                (id_prova, id_curso, titulo),
            )

        for enunciado, tipo, alternativas, resposta_esperada in questoes_validadas:

            cursor.execute(
                """
                INSERT INTO QUESTOES_PROVA (
                    ID_QUESTAO, ID_PROVA, ENUNCIADO, TIPO, ALTERNATIVAS, RESPOSTA_ESPERADA
                )
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (
                    proximo_id(cursor, "QUESTOES_PROVA", "ID_QUESTAO"),
                    id_prova,
                    para_blob_texto(enunciado),
                    tipo,
                    para_blob_texto(json.dumps(alternativas, ensure_ascii=False)),
                    para_blob_texto(resposta_esperada),
                ),
            )

        con.commit()
        return resposta("Prova cadastrada como rascunho.", 201, "sucesso", id_prova=id_prova)
    except Exception as erro:
        con.rollback()
        return resposta(f"Erro ao processar prova: {erro}", 500)
    finally:
        cursor.close()
        con.close()



@app.route("/professor/provas/<int:id_prova>/publicar", methods=["PATCH"])
@jwt_required()
def publicar_prova(id_prova):
    negado = exigir_tipo(1)
    if negado:
        return negado

    garantir_sprint_schema()
    con = get_db()
    cursor = con.cursor()

    try:
        cursor.execute(
            """
            SELECT P.ID_CURSO
            FROM PROVAS_CURSO P
            JOIN PROFESSORES_CURSO PC ON PC.ID_CURSO = P.ID_CURSO
            WHERE P.ID_PROVA = ? AND PC.ID_USUARIO = ?
            """,
            (id_prova, get_jwt_identity()),
        )
        if not cursor.fetchone():
            return resposta("Prova nao encontrada para este instrutor.", 404)

        cursor.execute("SELECT COUNT(*) FROM QUESTOES_PROVA WHERE ID_PROVA = ?", (id_prova,))
        if int((cursor.fetchone() or (0,))[0] or 0) == 0:
            return resposta("Cadastre questoes antes de publicar a prova.", 400)

        cursor.execute("UPDATE PROVAS_CURSO SET PUBLICADA = 1 WHERE ID_PROVA = ?", (id_prova,))
        con.commit()
        return resposta("Prova publicada com sucesso.", 200, "sucesso")
    except Exception as erro:
        con.rollback()
        return resposta(f"Erro ao publicar prova: {erro}", 500)
    finally:
        cursor.close()
        con.close()



# Sprint item 20: libera a avaliação após a conclusão e bloqueia reenvio até um dia após uma reprovação.
@app.route("/aluno/cursos/<int:id_curso>/prova", methods=["GET", "POST"])
@jwt_required()
def prova_aluno(id_curso):
    negado = exigir_tipo(2)
    if negado:
        return negado

    garantir_sprint_schema()
    id_aluno = int(get_jwt_identity())
    con = get_db()
    cursor = con.cursor()

    try:
        if not _aluno_matriculado(cursor, id_curso, id_aluno):
            return resposta("Aluno sem matricula ativa neste curso.", 403)

        bloqueio = _bloqueio_assinatura_aluno(cursor, id_aluno)
        if bloqueio:
            return bloqueio

        cursor.execute(
            """
            SELECT PROGRESSO
            FROM MATRICULAS
            WHERE ID_CURSO = ? AND ID_USUARIO = ?
            """,
            (id_curso, id_aluno),
        )
        if int((cursor.fetchone() or (0,))[0] or 0) < 100:
            return resposta("Prova liberada somente apos concluir as aulas.", 403)

        cursor.execute(
            """
            SELECT FIRST 1 ID_PROVA, TITULO
            FROM PROVAS_CURSO
            WHERE ID_CURSO = ? AND PUBLICADA = 1
            ORDER BY ID_PROVA DESC
            """,
            (id_curso,),
        )
        prova = cursor.fetchone()
        if not prova:
            return resposta("Curso ainda nao possui prova publicada.", 403)

        if request.method == "GET":
            cursor.execute(
                """
                SELECT FIRST 1 STATUS, FEEDBACK, CRIADO_EM, CORRIGIDO_EM, RESPOSTAS
                FROM RESPOSTAS_PROVA
                WHERE ID_PROVA = ? AND ID_USUARIO = ?
                ORDER BY ID_RESPOSTA DESC
                """,
                (prova[0], id_aluno),
            )
            envio = cursor.fetchone()
            data_reprovacao = (envio[3] or envio[2]) if envio and int(envio[0] or 0) == 2 else None
            reaplicar_em = data_reprovacao + timedelta(days=1) if data_reprovacao else None
            cursor.execute(
                """
                SELECT ID_QUESTAO, ENUNCIADO, TIPO, ALTERNATIVAS
                FROM QUESTOES_PROVA
                WHERE ID_PROVA = ?
                ORDER BY ID_QUESTAO
                """,
                (prova[0],),
            )
            return jsonify({
                "prova": {
                    "id": prova[0],
                    "titulo": prova[1],
                },
                "envio": {
                    "status": envio[0],
                    "feedback": de_blob_texto(envio[1]),
                    "criado_em": envio[2].isoformat() if envio and envio[2] else None,
                    "corrigido_em": envio[3].isoformat() if envio and envio[3] else None,
                    "pode_tentar_em": reaplicar_em.isoformat() if reaplicar_em else None,
                    "respostas": _decodificar_respostas_prova(envio[4]) if envio else None,
                } if envio else None,
                "questoes": [
                    {
                        "id": row[0],
                        "enunciado": de_blob_texto(row[1]),
                        "tipo": row[2],
                        "alternativas": _decodificar_alternativas(row[3]),
                    }
                    for row in cursor.fetchall()
                ],
            })

        dados = request.get_json() or {}
        respostas = dados.get("respostas")
        if not isinstance(respostas, dict) or not respostas:
            return resposta("Envie as respostas da prova.", 400)

        cursor.execute(
            "SELECT FIRST 1 STATUS, CORRIGIDO_EM FROM RESPOSTAS_PROVA WHERE ID_PROVA = ? AND ID_USUARIO = ? ORDER BY ID_RESPOSTA DESC",
            (prova[0], id_aluno),
        )
        envio_anterior = cursor.fetchone()
        if envio_anterior:
            if int(envio_anterior[0] or 0) == 0:
                return resposta("Sua prova ainda aguarda correcao do instrutor.", 409)
            if int(envio_anterior[0] or 0) == 1:
                return resposta("Esta prova ja foi aprovada.", 409)
            pode_tentar_em = envio_anterior[1] + timedelta(days=1) if envio_anterior[1] else datetime.now() + timedelta(days=1)
            if datetime.now() < pode_tentar_em:
                return resposta("Voce podera refazer a prova apos 1 dia da reprovacao.", 429, pode_tentar_em=pode_tentar_em.isoformat())

        cursor.execute("SELECT ID_QUESTAO, TIPO, ALTERNATIVAS FROM QUESTOES_PROVA WHERE ID_PROVA = ?", (prova[0],))
        questoes_da_prova = cursor.fetchall()
        chaves_questoes = {str(row[0]) for row in questoes_da_prova}
        if set(respostas) != chaves_questoes or any(not str(valor).strip() for valor in respostas.values()):
            return resposta("Responda todas as questoes antes de enviar.", 400)
        for id_questao, tipo_questao, alternativas_salvas in questoes_da_prova:
            if tipo_questao != "objetiva":
                continue
            try:
                alternativas = json.loads(de_blob_texto(alternativas_salvas) or "[]")
            except (TypeError, ValueError):
                alternativas = [item.strip() for item in de_blob_texto(alternativas_salvas).splitlines() if item.strip()]
            if str(respostas.get(str(id_questao))) not in [str(opcao) for opcao in alternativas]:
                return resposta("Selecione uma alternativa valida para cada questao objetiva.", 400)

        cursor.execute(
            """
            INSERT INTO RESPOSTAS_PROVA (ID_RESPOSTA, ID_PROVA, ID_USUARIO, RESPOSTAS, STATUS)
            VALUES (?, ?, ?, ?, 0)
            """,
            (
                proximo_id(cursor, "RESPOSTAS_PROVA", "ID_RESPOSTA"),
                prova[0],
                id_aluno,
                para_blob_texto(json.dumps(respostas, ensure_ascii=False)),
            ),
        )
        con.commit()
        return resposta("Prova enviada para correcao.", 201, "sucesso")
    except Exception as erro:
        con.rollback()
        return resposta(f"Erro ao processar prova do aluno: {erro}", 500)
    finally:
        cursor.close()
        con.close()



# Sprint item 20: entrega ao instrutor as respostas dos alunos com as perguntas correspondentes para correção manual.
@app.route("/professor/provas/respostas", methods=["GET"])
@jwt_required()
def respostas_prova_professor():
    negado = exigir_tipo(1)
    if negado:
        return negado

    garantir_sprint_schema()
    con = get_db()
    cursor = con.cursor()

    try:
        cursor.execute(
            """
            SELECT FIRST 200
                R.ID_RESPOSTA, P.ID_PROVA, P.ID_CURSO, P.TITULO, C.TITULO, U.NOME, U.EMAIL,
                R.RESPOSTAS, R.STATUS, R.FEEDBACK, R.CRIADO_EM, R.ID_USUARIO
            FROM RESPOSTAS_PROVA R
            JOIN PROVAS_CURSO P ON P.ID_PROVA = R.ID_PROVA
            JOIN CURSOS C ON C.ID_CURSO = P.ID_CURSO
            JOIN USUARIOS U ON U.ID_USUARIO = R.ID_USUARIO
            JOIN PROFESSORES_CURSO PC ON PC.ID_CURSO = P.ID_CURSO
            WHERE PC.ID_USUARIO = ?
            ORDER BY R.ID_RESPOSTA DESC
            """,
            (get_jwt_identity(),),
        )
        envios = cursor.fetchall()
        questoes_por_prova = {}
        for envio in envios:
            if envio[1] in questoes_por_prova:
                continue
            cursor.execute("SELECT ID_QUESTAO, ENUNCIADO, TIPO FROM QUESTOES_PROVA WHERE ID_PROVA = ? ORDER BY ID_QUESTAO", (envio[1],))
            questoes_por_prova[envio[1]] = [
                {"id": q[0], "enunciado": de_blob_texto(q[1]), "tipo": q[2]}
                for q in cursor.fetchall()
            ]

        return jsonify([
            {
                "id": row[0],
                "id_prova": row[1],
                "id_curso": row[2],
                "prova": row[3],
                "curso": row[4],
                "aluno": row[5],
                "email": row[6],
                "respostas": _decodificar_respostas_prova(row[7]),
                "status": row[8],
                "feedback": de_blob_texto(row[9]),
                "criado_em": row[10].isoformat() if row[10] else None,
                "id_aluno": row[11],
                "questoes": questoes_por_prova.get(row[1], []),
            }
            for row in envios
        ])
    except Exception as erro:
        return resposta(f"Erro ao listar respostas: {erro}", 500)
    finally:
        cursor.close()
        con.close()



# Sprint item 20: salva aprovação/reprovação e dispara o aviso de e-mail ao aluno reprovado.
@app.route("/professor/provas/respostas/<int:id_resposta>", methods=["PATCH"])
@jwt_required()
def corrigir_resposta_prova(id_resposta):
    negado = exigir_tipo(1)
    if negado:
        return negado

    garantir_sprint_schema()
    dados = request.get_json() or {}
    if not isinstance(dados.get("aprovado"), bool):
        return resposta("Informe se a prova foi aprovada ou reprovada.", 400)
    aprovado = bool(dados.get("aprovado"))
    feedback = (dados.get("feedback") or "").strip()
    con = get_db()
    cursor = con.cursor()

    try:
        cursor.execute(
            """
            SELECT U.EMAIL, C.TITULO, R.STATUS
            FROM RESPOSTAS_PROVA R
            JOIN PROVAS_CURSO P ON P.ID_PROVA = R.ID_PROVA
            JOIN CURSOS C ON C.ID_CURSO = P.ID_CURSO
            JOIN USUARIOS U ON U.ID_USUARIO = R.ID_USUARIO
            JOIN PROFESSORES_CURSO PC ON PC.ID_CURSO = P.ID_CURSO
            WHERE R.ID_RESPOSTA = ? AND PC.ID_USUARIO = ?
            """,
            (id_resposta, get_jwt_identity()),
        )
        aluno_e_curso = cursor.fetchone()
        if not aluno_e_curso:
            return resposta("Resposta nao encontrada para este instrutor.", 404)
        if int(aluno_e_curso[2] or 0) != 0:
            return resposta("Esta resposta ja foi corrigida.", 409)

        cursor.execute(
            """
            UPDATE RESPOSTAS_PROVA
            SET STATUS = ?, FEEDBACK = ?, CORRIGIDO_EM = CURRENT_TIMESTAMP
            WHERE ID_RESPOSTA = ?
            """,
            (1 if aprovado else 2, para_blob_texto(feedback), id_resposta),
        )
        con.commit()
        if not aprovado and aluno_e_curso[0]:
            from email_cursos import notificar_reprovacao_prova
            notificar_reprovacao_prova(aluno_e_curso[0], aluno_e_curso[1], feedback)
        return resposta("Correcao registrada.", 200, "sucesso")
    except Exception as erro:
        con.rollback()
        return resposta(f"Erro ao corrigir prova: {erro}", 500)
    finally:
        cursor.close()
        con.close()

__all__ = ['prova_professor', 'publicar_prova', 'prova_aluno', 'respostas_prova_professor', 'corrigir_resposta_prova']
