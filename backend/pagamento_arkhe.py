from datetime import datetime, timedelta
from threading import Lock
from decimal import Decimal, InvalidOperation

from flask import jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from app import app
from banco import get_db
from professor import para_blob_texto
from servicos.arkhe import ArkheError, criar_cobranca_pix, consultar_cobranca_pix, solicitar_saque_conta


from sprint_schema import garantir_sprint_schema
from sprint_comum import calcular_saldo_saque, exigir_tipo, percentual_instrutores, pesos_pool_instrutores, proximo_id, resposta, valor_assinatura_config

_faturas_lock = Lock()



def _fatura_para_dict(row, numero=None):
    status = int(row[2] or 0)
    valor_padrao = valor_assinatura_config()
    return {
        "id": row[0],
        "numero": numero or row[0],
        "id_cobranca": row[1],
        "status": status,
        "status_label": "paga" if status == 1 else "em aberto",
        "valor": float(row[3] or valor_padrao),
        "data_inicio": row[4].isoformat() if row[4] else None,
        "data_expiracao": row[5].isoformat() if row[5] else None,
        "data_vencimento": row[6].isoformat() if row[6] else None,
        "data_pagamento": row[7].isoformat() if row[7] else None,
        "criado_em": row[8].isoformat() if row[8] else None,
        "aberta": status != 1,
    }



def aluno_tem_fatura_aberta(cursor, id_usuario):
    garantir_sprint_schema()
    agora = datetime.now()
    cursor.execute(
        """
        SELECT FIRST 1 ID_ASSINATURA
        FROM ASSINATURAS
        WHERE ID_USUARIO = ?
          AND STATUS = 1
          AND (DATA_EXPIRACAO IS NULL OR DATA_EXPIRACAO >= ?)
        ORDER BY DATA_EXPIRACAO DESC, ID_ASSINATURA DESC
        """,
        (id_usuario, agora),
    )
    if cursor.fetchone() is not None:
        return False

    cursor.execute(
        """
        SELECT FIRST 1 ID_ASSINATURA
        FROM ASSINATURAS
        WHERE ID_USUARIO = ? AND STATUS <> 1
        ORDER BY ID_ASSINATURA DESC
        """,
        (id_usuario,),
    )
    return cursor.fetchone() is not None



# Sprint item 1: gera e lista cobranças PIX de mensalidades usando a Arkhé.
@app.route("/financeiro/faturas", methods=["GET", "POST"])
@jwt_required()
def faturas_aluno():
    negado = exigir_tipo(2)
    if negado:
        return negado

    garantir_sprint_schema()
    id_usuario = get_jwt_identity()
    con = get_db()
    cursor = con.cursor()

    try:
        if request.method == "POST":
            # Sprint item 1: serializa a criacao para evitar cobrancas duplicadas em pedidos simultaneos.
            with _faturas_lock:
                dados = request.get_json(silent=True) or {}
                valor = valor_assinatura_config()
                meses = max(1, min(int(dados.get("meses") or 1), 12))
                valor_total = round(valor * meses, 2)
                cursor.execute(
                    """
                    SELECT FIRST 1 ID_ASSINATURA, ID_COBRANCA_ARKHE, VALOR
                    FROM ASSINATURAS
                    WHERE ID_USUARIO = ?
                      AND STATUS = 0
                      AND ID_COBRANCA_ARKHE IS NOT NULL
                      AND (DATA_VENCIMENTO IS NULL OR DATA_VENCIMENTO >= CURRENT_TIMESTAMP)
                    ORDER BY ID_ASSINATURA DESC
                    """,
                    (id_usuario,),
                )
                fatura_aberta = cursor.fetchone()
                if fatura_aberta:
                    id_assinatura, id_cobranca, valor_fatura = fatura_aberta
                    valor_pendente = float(valor_fatura or 0)
                    if valor_pendente > 0:
                        cobranca = consultar_cobranca_pix(id_cobranca)
                        return jsonify({
                            "id_assinatura": id_assinatura,
                            "id_cobranca": cobranca["id_cobranca"],
                            "valor": valor_pendente,
                            "codigo_pagamento": cobranca["codigo_pagamento"],
                            "status": cobranca["status"],
                            "tipo_cobranca": cobranca["tipo_cobranca"],
                            "fatura_existente": True,
                            "mensagem": "Ja existe uma mensalidade em aberto para pagamento.",
                        }), 200

                cobranca = criar_cobranca_pix(valor_total)
                agora = datetime.now()
                vencimento = agora + timedelta(days=3)
                id_assinatura = proximo_id(cursor, "ASSINATURAS", "ID_ASSINATURA")
                cursor.execute(
                    """
                    INSERT INTO ASSINATURAS (
                        ID_ASSINATURA, ID_USUARIO, PLANO, STATUS, ID_COBRANCA_ARKHE,
                        VALOR, DATA_VENCIMENTO, CRIADO_EM
                    )
                    VALUES (?, ?, 1, 0, ?, ?, ?, ?)
                    """,
                    (id_assinatura, id_usuario, cobranca["id_cobranca"], valor_total, vencimento, agora),
                )
                con.commit()
                return jsonify({
                    "id_assinatura": id_assinatura,
                    "id_cobranca": cobranca["id_cobranca"],
                    "valor": valor_total,
                    "codigo_pagamento": cobranca["codigo_pagamento"],
                    "status": cobranca["status"],
                    "tipo_cobranca": cobranca["tipo_cobranca"],
                }), 201

        cursor.execute(
            """
            SELECT ID_ASSINATURA, ID_COBRANCA_ARKHE, STATUS, VALOR, DATA_INICIO,
                   DATA_EXPIRACAO, DATA_VENCIMENTO, DATA_PAGAMENTO, CRIADO_EM
            FROM ASSINATURAS
            WHERE ID_USUARIO = ?
            ORDER BY ID_ASSINATURA ASC
            """,
            (id_usuario,),
        )
        faturas = [_fatura_para_dict(row, indice + 1) for indice, row in enumerate(cursor.fetchall())]
        faturas = list(reversed(faturas))
        faturas_abertas = [item for item in faturas if item["status"] != 1]
        faturas_pagas = [item for item in faturas if item["status"] == 1]
        # Sprint item 2: devolve total gasto, total em aberto e historico de faturas do aluno.
        total_gasto = sum(item["valor"] for item in faturas_pagas)
        total_aberto = sum(item["valor"] for item in faturas_abertas)
        return jsonify({
            "faturas": faturas,
            "faturas_abertas": faturas_abertas,
            "faturas_pagas": faturas_pagas,
            "total_gasto": round(total_gasto, 2),
            "total_aberto": round(total_aberto, 2),
            "tem_fatura_aberta": aluno_tem_fatura_aberta(cursor, id_usuario),
        })
    except ArkheError as erro:
        con.rollback()
        return resposta(f"Erro ao comunicar com a Arkhe: {erro}", 502)
    except Exception as erro:
        con.rollback()
        return resposta(f"Erro ao processar faturas: {erro}", 500)
    finally:
        cursor.close()
        con.close()



# Sprint item 1: consulta e baixa a cobrança da mensalidade antes de atualizar a assinatura.
@app.route("/financeiro/faturas/<int:id_assinatura>/verificar", methods=["POST"])
@jwt_required()
def verificar_fatura_aluno(id_assinatura):
    negado = exigir_tipo(2)
    if negado:
        return negado

    garantir_sprint_schema()
    id_usuario = get_jwt_identity()
    con = get_db()
    cursor = con.cursor()

    try:
        cursor.execute(
            """
            SELECT ID_COBRANCA_ARKHE, STATUS
            FROM ASSINATURAS
            WHERE ID_ASSINATURA = ? AND ID_USUARIO = ?
            """,
            (id_assinatura, id_usuario),
        )
        fatura = cursor.fetchone()

        if not fatura:
            return resposta("Mensalidade nao encontrada.", 404)

        id_cobranca, status = fatura
        if int(status or 0) == 1:
            return jsonify({"assinatura": True, "status": "ativa", "id_assinatura": id_assinatura}), 200

        if not id_cobranca:
            return resposta("Mensalidade aguardando codigo de cobranca.", 409)

        # Sprint item 1: confirma o status remoto sem depender do campo de cópia do Pix.
        cobranca = consultar_cobranca_pix(id_cobranca, exigir_codigo_pix=False)
        # Sprint item 1: confirma apenas o status pago informado pela Arkhé, tolerando espaços no retorno.
        if str(cobranca["status"]).strip() != "1":
            return resposta("Pagamento ainda nao confirmado.", 402, status_cobranca=cobranca["status"])

        agora = datetime.now()
        cursor.execute(
            """
            SELECT FIRST 1 DATA_EXPIRACAO
            FROM ASSINATURAS
            WHERE ID_USUARIO = ?
              AND STATUS = 1
              AND (DATA_EXPIRACAO IS NULL OR DATA_EXPIRACAO >= ?)
            ORDER BY DATA_EXPIRACAO DESC, ID_ASSINATURA DESC
            """,
            (id_usuario, agora),
        )
        assinatura_ativa = cursor.fetchone()
        data_inicio = assinatura_ativa[0] if assinatura_ativa and assinatura_ativa[0] and assinatura_ativa[0] > agora else agora
        data_expiracao = data_inicio + timedelta(days=30)

        cursor.execute(
            """
            UPDATE ASSINATURAS
            SET STATUS = 1,
                DATA_INICIO = ?,
                DATA_EXPIRACAO = ?,
                DATA_PAGAMENTO = ?,
                VALOR = COALESCE(VALOR, ?)
            WHERE ID_ASSINATURA = ? AND ID_USUARIO = ?
            """,
            (data_inicio, data_expiracao, agora, valor_assinatura_config(), id_assinatura, id_usuario),
        )
        con.commit()

        return jsonify({
            "assinatura": True,
            "status": "ativa",
            "id_assinatura": id_assinatura,
            "data_inicio": data_inicio.isoformat(),
            "data_expiracao": data_expiracao.isoformat(),
            "mensagem": {"tipo": "sucesso", "descricao": "Pagamento confirmado."},
        }), 200
    except ArkheError as erro:
        con.rollback()
        return resposta(f"Erro ao comunicar com a Arkhe: {erro}", 502)
    except Exception as erro:
        con.rollback()
        return resposta(f"Erro ao verificar pagamento: {erro}", 500)
    finally:
        cursor.close()
        con.close()



@app.route("/professor/saques", methods=["POST"])
@jwt_required()
def solicitar_saque():
    negado = exigir_tipo(1)
    if negado:
        return negado

    garantir_sprint_schema()
    valor_recebido = (request.get_json(silent=True) or {}).get("valor")
    try:
        valor_decimal = Decimal(str(valor_recebido))
        if not valor_decimal.is_finite() or valor_decimal <= 0:
            return resposta("Valor de saque inválido.", 400)
        valor_centavos = valor_decimal.quantize(Decimal("0.01"))
    except (InvalidOperation, TypeError, ValueError):
        return resposta("Informe um valor de saque válido com até duas casas decimais.", 400)

    if valor_decimal != valor_centavos:
        return resposta("O valor do saque deve ter até duas casas decimais.", 400)

    valor = float(valor_centavos)

    con = get_db()
    cursor = con.cursor()

    try:
        # Sprint item 32: serializa saques para evitar saldo e ID local duplicados em chamadas simultâneas.
        cursor.execute("SELECT ID_CONFIG FROM FINANCEIRO_CONFIG WHERE ID_CONFIG = 1 WITH LOCK")
        if not cursor.fetchone():
            raise RuntimeError("Configuração financeira não encontrada.")

        # Sprint item 1: valida o saque contra o saldo disponível calculado no backend.
        percentual = percentual_instrutores(cursor)
        cursor.execute("SELECT COALESCE(CAST(SUM(VALOR) AS DOUBLE PRECISION), 0) FROM ASSINATURAS WHERE STATUS = 1")
        total_arrecadado = float((cursor.fetchone() or (0,))[0] or 0)
        # Sprint item 15: valida o saque pelo mesmo fundo de receita baseado em pagamentos reais mostrado aos dois perfis.
        pool_instrutores = total_arrecadado * (percentual / 100)
        pesos_instrutores = pesos_pool_instrutores(cursor)
        peso_total = sum(pesos_instrutores.values())
        _, _, _, disponivel_saque = calcular_saldo_saque(
            cursor,
            get_jwt_identity(),
            pool_instrutores,
            pesos_instrutores,
            peso_total,
        )

        if valor > disponivel_saque:
            return resposta(
                "O valor solicitado excede o saldo disponível para saque.",
                400,
                disponivel_saque=disponivel_saque,
            )

        id_saque = proximo_id(cursor, "SAQUES_INSTRUTOR", "ID_SAQUE")
        # Sprint item 32: solicita o saque na Arkhé após validar o saldo disponível no backend.
        saque_arkhe = solicitar_saque_conta(valor, referencia=f"SAQUE-{id_saque}-{get_jwt_identity()}")
        cursor.execute(
            """
            INSERT INTO SAQUES_INSTRUTOR (ID_SAQUE, ID_USUARIO, VALOR, STATUS, ID_SAQUE_ARKHE, RESPOSTA_ARKHE)
            VALUES (?, ?, ?, 0, ?, ?)
            """,
            (id_saque, get_jwt_identity(), valor, saque_arkhe.get("id_saque"), para_blob_texto(str(saque_arkhe))),
        )
        con.commit()
        return resposta("Solicitação de saque registrada.", 201, "sucesso")
    except ArkheError as erro:
        con.rollback()
        return resposta(f"Erro ao solicitar saque na Arkhé: {erro}", 502)
    except Exception as erro:
        con.rollback()
        return resposta(f"Erro ao solicitar saque: {erro}", 500)
    finally:
        cursor.close()
        con.close()

__all__ = ['_fatura_para_dict', 'aluno_tem_fatura_aberta', 'faturas_aluno', 'verificar_fatura_aluno', 'solicitar_saque']
