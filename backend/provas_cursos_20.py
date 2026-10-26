

import json
from datetime import datetime, timedelta

from flask import jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from app import app
from banco_37 import get_db
from professor_6 import de_blob_texto, para_blob_texto


from estrutura_banco_6_9_19_20_21_32_36 import garantir_estrutura_banco
from utilitarios_backend_5_9_20_28_34 import _aluno_matriculado, _bloqueio_assinatura_aluno, _curso_do_professor, _decodificar_alternativas, _decodificar_respostas_prova, exigir_tipo, proximo_id, resposta

NOTA_MINIMA_APROVACAO = 70


# Sprint item 20 - Permitir que o instrutor cadastre provas para validar a conclusão do curso
def _apagar_conteudo_prova(cursor, id_prova, apagar_cabecalho=False):
    
    cursor.execute("DELETE FROM RESPOSTAS_PROVA WHERE ID_PROVA = ?", (id_prova,))
    cursor.execute("DELETE FROM QUESTOES_PROVA WHERE ID_PROVA = ?", (id_prova,))
    if apagar_cabecalho:
        cursor.execute("DELETE FROM PROVAS_CURSO WHERE ID_PROVA = ?", (id_prova,))
# Fim item 20


# Sprint item 20 - Permitir que o instrutor cadastre provas para validar a conclusão do curso
def _pontuar_prova(cursor, id_prova, respostas, correcoes=None):
    
    correcoes = correcoes or {}
    cursor.execute(
        "SELECT ID_QUESTAO, TIPO, RESPOSTA_ESPERADA FROM QUESTOES_PROVA WHERE ID_PROVA = ?",
        (id_prova,),
    )
    questoes = cursor.fetchall()
    acertos = 0
    pendentes = []
    for id_questao, tipo, gabarito in questoes:
        chave = str(id_questao)
        if tipo == "objetiva":
            correta = de_blob_texto(gabarito).strip()
            if str(respostas.get(chave, "")).strip() == correta:
                acertos += 1
        elif chave in correcoes:
            acertos += int(correcoes[chave] is True)
        else:
            pendentes.append(chave)
    total = len(questoes)
    nota = round(100 * acertos / total) if total else 0
    status = 0 if pendentes else (1 if nota >= NOTA_MINIMA_APROVACAO else 2)
    return {"nota": nota, "acertos": acertos, "total_questoes": total, "status": status, "pendentes": pendentes}
# Fim item 20







# Sprint item 20 - Permitir que o instrutor cadastre provas para validar a conclusão do curso
@app.route("/professor/cursos/<int:id_curso>/prova", methods=["GET", "POST", "DELETE"])
@jwt_required()
def prova_professor(id_curso):
    
    negado = exigir_tipo(1)
    if negado:
        return negado

    garantir_estrutura_banco()
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
                    "nota_minima": NOTA_MINIMA_APROVACAO,
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

        if request.method == "DELETE":
            
            
            cursor.execute("SELECT ID_PROVA FROM PROVAS_CURSO WHERE ID_CURSO = ?", (id_curso,))
            ids_provas = [row[0] for row in cursor.fetchall()]
            for id_prova in ids_provas:
                _apagar_conteudo_prova(cursor, id_prova, apagar_cabecalho=True)
            con.commit()
            return resposta("Prova e respostas removidas.", 200, "sucesso")

        dados = request.get_json() or {}
        titulo = (dados.get("titulo") or "").strip()
        questoes = dados.get("questoes") or []

        if not titulo:
            return resposta("Titulo da prova e obrigatorio.", 400)

        if not isinstance(questoes, list) or len(questoes) == 0:
            return resposta("Cadastre ao menos uma questao.", 400)

        questoes_validadas = []
        
        
        for questao in questoes:
            if not isinstance(questao, dict):
                return resposta("Questão inválida.", 400)
            enunciado = (questao.get("enunciado") or "").strip()
            tipo = (questao.get("tipo") or "objetiva").strip().lower()
            alternativas = questao.get("alternativas") or ""
            resposta_esperada = str(questao.get("resposta_esperada") or "").strip()

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
                if len(set(alternativas)) != len(alternativas):
                    return resposta("As alternativas da mesma questão precisam ser diferentes.", 400)
                if resposta_esperada not in alternativas:
                    return resposta("Selecione a alternativa correta de cada questão objetiva.", 400)
            else:
                alternativas = []
                resposta_esperada = ""
            questoes_validadas.append((enunciado, tipo, alternativas, resposta_esperada))

        cursor.execute("SELECT FIRST 1 ID_PROVA, PUBLICADA FROM PROVAS_CURSO WHERE ID_CURSO = ? ORDER BY ID_PROVA DESC", (id_curso,))
        prova_existente = cursor.fetchone()
        if prova_existente:
            id_prova = prova_existente[0]
            
            
            _apagar_conteudo_prova(cursor, id_prova)
            cursor.execute("UPDATE PROVAS_CURSO SET TITULO = ? WHERE ID_PROVA = ?", (titulo, id_prova))
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
        return resposta("Prova salva com sucesso.", 200, "sucesso", id_prova=id_prova)
    except Exception as erro:
        con.rollback()
        return resposta(f"Erro ao processar prova: {erro}", 500)
    finally:
        cursor.close()
        con.close()
# Fim item 20

# Sprint item 20 - Permitir que o instrutor cadastre provas para validar a conclusão do curso
@app.route("/professor/provas/<int:id_prova>/publicar", methods=["PATCH"])
@jwt_required()
def publicar_prova(id_prova):
    
    negado = exigir_tipo(1)
    if negado:
        return negado

    garantir_estrutura_banco()
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

        cursor.execute("SELECT TIPO, ALTERNATIVAS, RESPOSTA_ESPERADA FROM QUESTOES_PROVA WHERE ID_PROVA = ?", (id_prova,))
        questoes_publicar = cursor.fetchall()
        if not questoes_publicar:
            return resposta("Cadastre questoes antes de publicar a prova.", 400)
        for tipo_questao, alternativas_salvas, gabarito in questoes_publicar:
            if tipo_questao == "objetiva" and de_blob_texto(gabarito).strip() not in _decodificar_alternativas(alternativas_salvas):
                return resposta("Escolha a resposta correta de cada questão objetiva antes de publicar.", 400)

        cursor.execute("UPDATE PROVAS_CURSO SET PUBLICADA = 1 WHERE ID_PROVA = ?", (id_prova,))
        con.commit()
        return resposta("Prova publicada com sucesso.", 200, "sucesso")
    except Exception as erro:
        con.rollback()
        return resposta(f"Erro ao publicar prova: {erro}", 500)
    finally:
        cursor.close()
        con.close()
# Fim item 20




# Sprint item 20 - Permitir que o instrutor cadastre provas para validar a conclusão do curso
@app.route("/aluno/cursos/<int:id_curso>/prova", methods=["GET", "POST"])
@jwt_required()
def prova_aluno(id_curso):
    
    negado = exigir_tipo(2)
    if negado:
        return negado

    garantir_estrutura_banco()
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
                SELECT FIRST 1 STATUS, FEEDBACK, CRIADO_EM, CORRIGIDO_EM, RESPOSTAS,
                       NOTA, ACERTOS, TOTAL_QUESTOES
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
                    "nota_minima": NOTA_MINIMA_APROVACAO,
                },
                "envio": {
                    "status": envio[0],
                    "feedback": de_blob_texto(envio[1]),
                    "criado_em": envio[2].isoformat() if envio and envio[2] else None,
                    "corrigido_em": envio[3].isoformat() if envio and envio[3] else None,
                    "pode_tentar_em": reaplicar_em.isoformat() if reaplicar_em else None,
                    "respostas": _decodificar_respostas_prova(envio[4]) if envio else None,
                    "nota": envio[5],
                    "acertos": envio[6],
                    "total_questoes": envio[7],
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
            "SELECT FIRST 1 STATUS, CORRIGIDO_EM, CRIADO_EM FROM RESPOSTAS_PROVA WHERE ID_PROVA = ? AND ID_USUARIO = ? ORDER BY ID_RESPOSTA DESC",
            (prova[0], id_aluno),
        )
        envio_anterior = cursor.fetchone()
        if envio_anterior:
            
            
            if int(envio_anterior[0] or 0) == 0:
                return resposta("Sua prova ainda aguarda correcao do instrutor.", 409)
            if int(envio_anterior[0] or 0) == 1:
                return resposta("Esta prova ja foi aprovada.", 409)
            pode_tentar_em = (envio_anterior[1] or envio_anterior[2]) + timedelta(days=1)
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

        resultado = _pontuar_prova(cursor, prova[0], respostas)
        
        
        cursor.execute(
            """
            INSERT INTO RESPOSTAS_PROVA
                (ID_RESPOSTA, ID_PROVA, ID_USUARIO, RESPOSTAS, STATUS, NOTA, ACERTOS, TOTAL_QUESTOES, CORRIGIDO_EM)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, CASE WHEN ? = 0 THEN NULL ELSE CURRENT_TIMESTAMP END)
            """,
            (
                proximo_id(cursor, "RESPOSTAS_PROVA", "ID_RESPOSTA"),
                prova[0],
                id_aluno,
                para_blob_texto(json.dumps(respostas, ensure_ascii=False)),
                resultado["status"],
                resultado["nota"],
                resultado["acertos"],
                resultado["total_questoes"],
                resultado["status"],
            ),
        )
        con.commit()
        if resultado["status"] == 2:
            
            try:
                from chat_cursos_11_19_20 import notificar_reprovacao_prova
                cursor.execute("SELECT EMAIL FROM USUARIOS WHERE ID_USUARIO = ?", (id_aluno,))
                email = (cursor.fetchone() or (None,))[0]
                cursor.execute("SELECT TITULO FROM CURSOS WHERE ID_CURSO = ?", (id_curso,))
                titulo_curso = (cursor.fetchone() or ("Curso",))[0]
                if email:
                    notificar_reprovacao_prova(email, titulo_curso, "")
            except Exception:
                app.logger.exception("Não foi possível avisar o aluno sobre o resultado da prova.")
        mensagem = "Prova corrigida automaticamente." if resultado["status"] else "Objetivas corrigidas. As questões dissertativas aguardam o professor."
        return resposta(mensagem, 201, "sucesso", resultado=resultado)
    except Exception as erro:
        con.rollback()
        return resposta(f"Erro ao processar prova do aluno: {erro}", 500)
    finally:
        cursor.close()
        con.close()
# Fim item 20




# Sprint item 20 - Permitir que o instrutor cadastre provas para validar a conclusão do curso
@app.route("/professor/provas/respostas", methods=["GET"])
@jwt_required()
def respostas_prova_professor():
    
    negado = exigir_tipo(1)
    if negado:
        return negado

    garantir_estrutura_banco()
    con = get_db()
    cursor = con.cursor()

    try:
        cursor.execute(
            """
            SELECT FIRST 200
                R.ID_RESPOSTA, P.ID_PROVA, P.ID_CURSO, P.TITULO, C.TITULO, U.NOME, U.EMAIL,
                R.RESPOSTAS, R.STATUS, R.FEEDBACK, R.CRIADO_EM, R.ID_USUARIO,
                R.NOTA, R.ACERTOS, R.TOTAL_QUESTOES, R.CORRECOES_DISSERTATIVAS
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
            cursor.execute("SELECT ID_QUESTAO, ENUNCIADO, TIPO, RESPOSTA_ESPERADA FROM QUESTOES_PROVA WHERE ID_PROVA = ? ORDER BY ID_QUESTAO", (envio[1],))
            questoes_por_prova[envio[1]] = [
                {"id": q[0], "enunciado": de_blob_texto(q[1]), "tipo": q[2],
                 "resposta_esperada": de_blob_texto(q[3]) if q[2] == "objetiva" else None}
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
                "nota": row[12],
                "acertos": row[13],
                "total_questoes": row[14],
                "correcoes_dissertativas": _decodificar_respostas_prova(row[15]),
                "questoes": questoes_por_prova.get(row[1], []),
            }
            for row in envios
        ])
    except Exception as erro:
        return resposta(f"Erro ao listar respostas: {erro}", 500)
    finally:
        cursor.close()
        con.close()
# Fim item 20



# Sprint item 20 - Permitir que o instrutor cadastre provas para validar a conclusão do curso
@app.route("/professor/provas/respostas/<int:id_resposta>/questoes/<int:id_questao>", methods=["PATCH"])
@jwt_required()
def corrigir_questao_dissertativa(id_resposta, id_questao):
    
    negado = exigir_tipo(1)
    if negado:
        return negado
    dados = request.get_json(silent=True) or {}
    if not isinstance(dados.get("correta"), bool):
        return resposta("Informe se a resposta dissertativa está correta.", 400)
    feedback = str(dados.get("feedback") or "").strip()[:2000]
    garantir_estrutura_banco()
    con = get_db()
    cursor = con.cursor()
    try:
        cursor.execute(
            """SELECT R.ID_PROVA, R.STATUS, R.RESPOSTAS, R.CORRECOES_DISSERTATIVAS,
                      U.EMAIL, C.TITULO
               FROM RESPOSTAS_PROVA R
               JOIN PROVAS_CURSO P ON P.ID_PROVA = R.ID_PROVA
               JOIN CURSOS C ON C.ID_CURSO = P.ID_CURSO
               JOIN USUARIOS U ON U.ID_USUARIO = R.ID_USUARIO
               JOIN PROFESSORES_CURSO PC ON PC.ID_CURSO = P.ID_CURSO
               WHERE R.ID_RESPOSTA = ? AND PC.ID_USUARIO = ?""",
            (id_resposta, get_jwt_identity()),
        )
        envio = cursor.fetchone()
        if not envio:
            return resposta("Resposta não encontrada para este professor.", 404)
        if int(envio[1] or 0) != 0:
            return resposta("Esta prova já foi corrigida.", 409)
        cursor.execute(
            "SELECT STATUS, RESPOSTAS, CORRECOES_DISSERTATIVAS FROM RESPOSTAS_PROVA WHERE ID_RESPOSTA = ? WITH LOCK",
            (id_resposta,),
        )
        estado_atual = cursor.fetchone()
        
        
        if not estado_atual or int(estado_atual[0] or 0) != 0:
            return resposta("Esta prova já foi corrigida.", 409)
        cursor.execute("SELECT TIPO FROM QUESTOES_PROVA WHERE ID_QUESTAO = ? AND ID_PROVA = ?", (id_questao, envio[0]))
        questao = cursor.fetchone()
        if not questao or questao[0] != "dissertativa":
            return resposta("Questão dissertativa não encontrada nesta prova.", 404)
        correcoes = _decodificar_respostas_prova(estado_atual[2])
        correcoes[str(id_questao)] = dados["correta"]
        
        
        resultado = _pontuar_prova(cursor, envio[0], _decodificar_respostas_prova(estado_atual[1]), correcoes)
        cursor.execute(
            """UPDATE RESPOSTAS_PROVA
               SET CORRECOES_DISSERTATIVAS = ?, STATUS = ?, NOTA = ?, ACERTOS = ?,
                   TOTAL_QUESTOES = ?, FEEDBACK = ?,
                   CORRIGIDO_EM = CASE WHEN ? = 0 THEN NULL ELSE CURRENT_TIMESTAMP END
               WHERE ID_RESPOSTA = ? AND STATUS = 0""",
            (para_blob_texto(json.dumps(correcoes)), resultado["status"], resultado["nota"],
             resultado["acertos"], resultado["total_questoes"], para_blob_texto(feedback),
             resultado["status"], id_resposta),
        )
        con.commit()
        if resultado["status"] == 2 and envio[4]:
            try:
                from chat_cursos_11_19_20 import notificar_reprovacao_prova
                notificar_reprovacao_prova(envio[4], envio[5], feedback)
            except Exception:
                app.logger.exception("Não foi possível avisar o aluno sobre o resultado da prova.")
        return resposta("Questão corrigida.", 200, "sucesso", resultado=resultado)
    except Exception as erro:
        con.rollback()
        return resposta(f"Erro ao corrigir a questão: {erro}", 500)
    finally:
        cursor.close()
        con.close()
# Fim item 20
