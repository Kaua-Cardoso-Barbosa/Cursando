# Rotas da sprint organizadas por assunto; os comentários dos itens seguem junto ao código.
from decimal import Decimal, InvalidOperation

from flask import current_app, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required
from datetime import datetime, timedelta
from app import app
from banco import get_db
import requests

from servicos.arkhe import ArkheError, criar_cobranca_pix, consultar_cobranca_pix




@app.route("/pagamentos/pix", methods=["POST"])
@jwt_required()
def criar_pagamento_pix():
    try:
        # Esta rota gera uma cobrança avulsa; diferente da rota de assinatura,
        # ela não grava uma assinatura no banco.
        dados = request.get_json() or {}

        valor_recebido = dados.get("valor")

        if valor_recebido is None:
            return jsonify({
                "mensagem": "Valor do pagamento é obrigatório"
            }), 400

        # Sprint item 1: rejeita valores PIX inválidos antes de chamar a Arkhé.
        try:
            valor_decimal = Decimal(str(valor_recebido))
            if not valor_decimal.is_finite():
                raise InvalidOperation
            valor_centavos = valor_decimal.quantize(Decimal("0.01"))
        except (InvalidOperation, TypeError, ValueError):
            return jsonify({
                "mensagem": "Valor do pagamento deve ser um número válido com até duas casas decimais"
            }), 400

        if valor_decimal <= 0:
            return jsonify({
                "mensagem": "Valor do pagamento deve ser maior que zero"
            }), 400

        if valor_decimal != valor_centavos:
            return jsonify({
                "mensagem": "Valor do pagamento deve ter até duas casas decimais"
            }), 400

        valor = float(valor_centavos)

        # A Arkhé cria a cobrança e retorna o código PIX para o cliente pagar.
        cobranca = criar_cobranca_pix(valor)

        return jsonify({
            "id_cobranca": cobranca["id_cobranca"],
            "valor": cobranca["valor"],
            "codigo_pagamento": cobranca["codigo_pagamento"],
            "status": cobranca["status"],
            "tipo_cobranca": cobranca["tipo_cobranca"],
        }), 201

    except (requests.RequestException, ArkheError) as erro:
        return jsonify({
            "mensagem": "Não foi possível comunicar com a Arkhé",
            "detalhes": str(erro)
        }), 502

    except Exception as erro:
        return jsonify({
            "mensagem": str(erro)
        }), 500


@app.route("/assinaturas/pix", methods=["POST"])
@jwt_required()
def criar_pix_assinatura():
    from sprint import garantir_sprint_schema, valor_assinatura_config

    garantir_sprint_schema()
    con = get_db()
    cursor = con.cursor()

    try:
        id_usuario = get_jwt_identity()

        # Impede criar outra cobrança de assinatura enquanto houver uma ativa.
        cursor.execute(
            """
            SELECT ID_ASSINATURA
            FROM ASSINATURAS
            WHERE ID_USUARIO = ?
              AND STATUS = 1
            """,
            (id_usuario,)
        )

        if cursor.fetchone():
            return jsonify({
                "mensagem": "Usuário já possui uma assinatura ativa"
            }), 409

        # Sprint item 1: reutiliza apenas PIX pendente e dentro do vencimento, sem gerar cobranças duplicadas.
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
            (id_usuario,)
        )
        assinatura_pendente = cursor.fetchone()

        if assinatura_pendente:
            id_assinatura, id_cobranca, valor_fatura = assinatura_pendente
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
                    "cobranca_existente": True
                }), 200

        # Sprint item 1: usa o preco do servidor quando nao houver PIX pendente reutilizavel.
        valor = valor_assinatura_config()

        # Solicita à Arkhé uma cobrança PIX vinculada ao valor do plano.
        cobranca = criar_cobranca_pix(valor)

        # Guarda a assinatura como pendente (STATUS 0) até confirmar o pagamento.
        # O ID da cobrança permite consultar depois o estado do PIX na Arkhé.
        # Bases antigas podem ter o generator da tabela defasado. Usar o
        # próximo ID livre evita reutilizar uma chave primária já existente.
        cursor.execute("SELECT COALESCE(MAX(ID_ASSINATURA), 0) + 1 FROM ASSINATURAS")
        id_assinatura = cursor.fetchone()[0]
        cursor.execute(
            """
            INSERT INTO ASSINATURAS (
                ID_ASSINATURA,
                ID_USUARIO,
                STATUS,
                PLANO,
                ID_COBRANCA_ARKHE,
                VALOR,
                DATA_VENCIMENTO
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                id_assinatura,
                id_usuario,
                0,
                1,
                cobranca["id_cobranca"],
                valor,
                datetime.now() + timedelta(days=3)
            )
        )

        # Persiste a assinatura pendente antes de devolver o código PIX.
        con.commit()

        return jsonify({
            "id_assinatura": id_assinatura,
            "id_cobranca": cobranca["id_cobranca"],
            "valor": valor,
            "codigo_pagamento": cobranca["codigo_pagamento"],
            "status": cobranca["status"],
            "tipo_cobranca": cobranca["tipo_cobranca"]
        }), 201

    except (requests.RequestException, ArkheError) as erro:
        con.rollback()

        return jsonify({
            "mensagem": "Não foi possível comunicar com a Arkhé",
            "detalhes": str(erro)
        }), 502

    except Exception as erro:
        con.rollback()

        return jsonify({
            "mensagem": str(erro)
        }), 500

    finally:
        cursor.close()
        con.close()


@app.route("/assinaturas/verificar", methods=["GET"])
@jwt_required()
def verificar_pagamento_assinatura():
    from sprint import garantir_sprint_schema

    garantir_sprint_schema()
    con = get_db()
    cursor = con.cursor()

    try:
        id_usuario = get_jwt_identity()

        # Usa a assinatura mais recente do usuário para decidir se pode acessar.
        cursor.execute(
            """
            SELECT
                ID_ASSINATURA,
                ID_COBRANCA_ARKHE,
                STATUS,
                DATA_INICIO,
                DATA_EXPIRACAO
            FROM ASSINATURAS
            WHERE ID_USUARIO = ?
            ORDER BY
                CASE
                    WHEN STATUS = 1 AND (DATA_EXPIRACAO IS NULL OR DATA_EXPIRACAO >= CURRENT_TIMESTAMP) THEN 0
                    ELSE 1
                END,
                ID_ASSINATURA DESC
            """,
            (id_usuario,)
        )

        assinaturas = cursor.fetchall()
        assinatura = assinaturas[0] if assinaturas else None

        if not assinatura:
            return jsonify({
                "assinatura": False,
                "status": "sem_assinatura",
                "mensagem": "Usuário não possui assinatura."
            }), 200

        (
            id_assinatura,
            id_cobranca,
            status,
            data_inicio,
            data_expiracao
        ) = assinatura

        # STATUS 1 significa ativa; ainda é preciso conferir se não venceu.
        if status == 1:
            agora = datetime.now()

            # Verifica se ela ainda está dentro da validade
            if data_expiracao and data_expiracao >= agora:
                return jsonify({
                    "assinatura": True,
                    "status": "ativa",
                    "id_assinatura": id_assinatura,
                    "data_inicio": data_inicio.isoformat(),
                    "data_expiracao": data_expiracao.isoformat()
                }), 200

            # Registra STATUS 3 quando a data de validade já passou.
            cursor.execute(
                """
                UPDATE ASSINATURAS
                SET STATUS = 3
                WHERE ID_ASSINATURA = ?
                """,
                (id_assinatura,)
            )

            con.commit()

            return jsonify({
                "assinatura": False,
                "status": "expirada",
                "mensagem": "A assinatura do usuário expirou."
            }), 200

        # Sem o identificador da cobrança não é possível confirmar o PIX na Arkhé.
        # A confirmação é consultada na Arkhé quando esta rota é chamada.
        # Verifica todas as cobranças pendentes para aceitar o pagamento de
        # uma mensalidade antiga caso existam duplicatas no histórico.
        cobranca = None
        assinatura_paga = None
        for assinatura_candidata in assinaturas:
            if assinatura_candidata[2] == 1 or not assinatura_candidata[1]:
                continue
            # Sprint item 1: consulta o status sem depender de um novo código para a cobrança existente.
            cobranca_candidata = consultar_cobranca_pix(
                assinatura_candidata[1],
                exigir_codigo_pix=False,
            )
            if str(cobranca_candidata["status"]).strip().lower() in {
                "1", "pago", "paid", "confirmado", "confirmed", "aprovado", "approved"
            }:
                assinatura_paga = assinatura_candidata
                cobranca = cobranca_candidata
                break

        if cobranca is None and id_cobranca:
            # Sprint item 1: consulta o status sem depender de um novo código para a cobrança existente.
            cobranca = consultar_cobranca_pix(id_cobranca, exigir_codigo_pix=False)

        if cobranca is None:
            return jsonify({
                "assinatura": False,
                "status": "pendente",
                "mensagem": "Assinatura aguardando pagamento."
            }), 200

        status_cobranca = cobranca["status"]

        # Sprint item 1: reconhece status numérico ou textual da cobrança confirmada pela Arkhé.
        # STATUS 1 da cobrança indica pagamento confirmado: ativa por 30 dias
        # a partir do momento desta confirmação e salva as duas datas no banco.
        if str(status_cobranca).strip().lower() in {
            "1", "pago", "paid", "confirmado", "confirmed", "aprovado", "approved"
        }:
            agora = datetime.now()
            data_expiracao = agora + timedelta(days=30)

            cursor.execute(
                """
                UPDATE ASSINATURAS
                SET
                    STATUS = 1,
                    DATA_INICIO = ?,
                    DATA_EXPIRACAO = ?,
                    DATA_PAGAMENTO = ?,
                    VALOR = COALESCE(VALOR, ?)
                WHERE ID_ASSINATURA = ?
                """,
                (
                    agora,
                    data_expiracao,
                    agora,
                    current_app.config["VALOR_ASSINATURA"],
                    (assinatura_paga or assinatura)[0]
                )
            )

            con.commit()

            return jsonify({
                "assinatura": True,
                "status": "ativa",
                "id_assinatura": (assinatura_paga or assinatura)[0],
                "data_inicio": agora.isoformat(),
                "data_expiracao": data_expiracao.isoformat()
            }), 200

        # Qualquer status diferente de confirmado mantém a assinatura pendente.
        return jsonify({
            "assinatura": False,
            "status": "pendente",
            "id_assinatura": id_assinatura,
            "id_cobranca": id_cobranca,
            "status_cobranca": status_cobranca,
            "mensagem": "Pagamento ainda não confirmado."
        }), 200

    except (requests.RequestException, ArkheError) as erro:
        con.rollback()

        return jsonify({
            "assinatura": False,
            "mensagem": "Não foi possível verificar o pagamento.",
            "detalhes": str(erro)
        }), 502

    except Exception as erro:
        con.rollback()

        return jsonify({
            "assinatura": False,
            "mensagem": str(erro)
        }), 500

    finally:
        cursor.close()
        con.close()

__all__ = ['criar_pagamento_pix', 'criar_pix_assinatura', 'verificar_pagamento_assinatura']
