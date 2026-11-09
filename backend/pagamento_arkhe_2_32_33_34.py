

# Datas de vencimento, pagamento e duração das assinaturas.
from datetime import datetime, timedelta
from threading import Lock
from decimal import Decimal, InvalidOperation

# Reconhece erros de comunicação HTTP com a Arkhe.
import requests
from flask import current_app, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

# Integração com Flask, autenticação, banco de dados e Pix.
from app import app
from banco_37 import get_db
from professor_7 import para_blob_texto
from servicos.arkhe_2 import ArkheError, criar_cobranca_pix, consultar_cobranca_pix


# Prepara as tabelas usadas pelo módulo.
from estrutura_banco_1_5_6_9_15_19_20_21_27_28_32_33_36_37 import garantir_estrutura_banco
# Regras compartilhadas de autorização, valores e respostas.
from utilitarios_backend_5_9_12_15_20_24_28_34 import calcular_saldo_saque, exigir_tipo, percentual_instrutores, pesos_pool_instrutores, proximo_id, resposta, valor_assinatura_config

# Evita criação simultânea de faturas neste processo.
_faturas_lock = Lock()



# Sprint item 33 - Exibir total gasto e histórico de faturas do aluno - Converte os campos da fatura para o histórico do aluno
# O histórico preserva faturas pagas mesmo quando o período de acesso terminou.
def _fatura_para_dict(row, numero=None):
    # Converte uma linha de fatura para o formato da resposta ao aluno.
    status = int(row[2] or 0)
    valor_padrao = valor_assinatura_config()
    
    # Os status 1 e 3 indicam fatura paga, inclusive depois do vencimento.
    paga = status in (1, 3)
    # Formata datas em ISO e usa o valor configurado quando a linha não o contém.
    return {
        "id": row[0],
        "numero": numero or row[0],
        "id_cobranca": row[1],
        "status": status,
        "status_label": "paga" if paga else "em aberto" if status == 0 else "não paga",
        "valor": float(row[3] or valor_padrao),
        "data_inicio": row[4].isoformat() if row[4] else None,
        "data_expiracao": row[5].isoformat() if row[5] else None,
        "data_vencimento": row[6].isoformat() if row[6] else None,
        "data_pagamento": row[7].isoformat() if row[7] else None,
        "criado_em": row[8].isoformat() if row[8] else None,
        "aberta": status == 0,
    }
# Fim item 33



# Sprint item 34 - Exibir faturas em aberto - Consulta e identifica faturas pendentes do aluno
# Uma assinatura vencida gera fatura em aberto que pode receber novo código Pix.
def aluno_tem_fatura_aberta(cursor, id_usuario):
    # Verifica se há mensalidade pendente para o aluno.
    garantir_estrutura_banco()
    # Uma assinatura ativa e válida elimina a pendência atual.
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
        WHERE ID_USUARIO = ? AND STATUS = 0
        ORDER BY ID_ASSINATURA DESC
        """,
        (id_usuario,),
    )
    # Uma fatura com status 0 já está aguardando pagamento.
    if cursor.fetchone() is not None:
        return True

    
    cursor.execute(
        """
        SELECT FIRST 1 ID_ASSINATURA
        FROM ASSINATURAS
        WHERE ID_USUARIO = ? AND STATUS IN (1, 3)
          AND DATA_EXPIRACAO < CURRENT_TIMESTAMP
        ORDER BY DATA_EXPIRACAO DESC, ID_ASSINATURA DESC
        """,
        (id_usuario,),
    )
    # Uma assinatura paga e vencida também sinaliza pendência.
    return cursor.fetchone() is not None
# Fim item 34




@app.route("/financeiro/faturas", methods=["GET", "POST"])
@jwt_required()
def faturas_aluno():
    # Consulta o histórico no GET e cria ou reutiliza cobrança no POST.
    
    # Restringe a rota a alunos autenticados.
    negado = exigir_tipo(2)
    if negado:
        return negado

    garantir_estrutura_banco()
    id_usuario = get_jwt_identity()
    con = get_db()
    cursor = con.cursor()

    try:
        
        # Sprint item 34 - Exibir faturas em aberto - Identifica faturas pendentes e verifica a liberação do acesso
        # Abre a próxima mensalidade se a assinatura anterior expirou.
        garantir_fatura_vencida(cursor, con, id_usuario)
        # Fim item 34
        # Protege a criação de cobrança contra chamadas simultâneas locais.
        if request.method == "POST":
            
            with _faturas_lock:
                dados = request.get_json(silent=True) or {}
                valor = valor_assinatura_config()
                
                if str(dados.get("meses") or 1) != "1":
                    return resposta("Pague uma mensalidade por vez para manter o histórico correto.", 400)
                # O ID opcional seleciona uma fatura específica.
                id_solicitado = dados.get("id_assinatura")
                if id_solicitado is not None:
                    try:
                        id_solicitado = int(id_solicitado)
                    except (TypeError, ValueError):
                        return resposta("Mensalidade inválida.", 400)
                    if id_solicitado <= 0:
                        return resposta("Mensalidade inválida.", 400)
                
                # A consulta mantém o ID como parâmetro SQL.
                filtro_fatura = "AND ID_ASSINATURA = ?" if id_solicitado is not None else ""
                # Sprint item 34 - Exibir faturas em aberto - Identifica faturas pendentes e verifica a liberação do acesso
                cursor.execute(
                    f"""
                    SELECT FIRST 1 ID_ASSINATURA, ID_COBRANCA_ARKHE, VALOR, DATA_VENCIMENTO
                    FROM ASSINATURAS
                    WHERE ID_USUARIO = ?
                      AND STATUS = 0
                      {filtro_fatura}
                    ORDER BY ID_ASSINATURA ASC
                    """,
                    (id_usuario, id_solicitado) if id_solicitado is not None else (id_usuario,),
                )
                fatura_aberta = cursor.fetchone()
                # Reaproveita a fatura aberta e prepara o Pix correspondente.
                if fatura_aberta:
                    id_assinatura, id_cobranca, valor_fatura, vencimento = fatura_aberta
                    valor_pendente = float(valor_fatura or valor)
                    return jsonify(preparar_pagamento_fatura(
                        cursor, con, id_assinatura, id_cobranca, valor_pendente, vencimento,
                    )), 200
                # Fim item 34

                if id_solicitado is not None:
                    return resposta("Mensalidade em aberto não encontrada.", 404)

                # Sem fatura aberta, emite Pix e registra nova mensalidade.
                cobranca = criar_cobranca_pix(valor)
                agora = datetime.now()
                vencimento = agora + timedelta(days=3)
                # Sprint item 33 - Exibir total gasto e histórico de faturas do aluno - Consulta o histórico e os valores das faturas do aluno
                id_assinatura = proximo_id(cursor, "ASSINATURAS", "ID_ASSINATURA")
                cursor.execute(
                    """
                    INSERT INTO ASSINATURAS (
                        ID_ASSINATURA, ID_USUARIO, PLANO, STATUS, ID_COBRANCA_ARKHE,
                        VALOR, DATA_VENCIMENTO, CRIADO_EM
                    )
                    VALUES (?, ?, 1, 0, ?, ?, ?, ?)
                    """,
                    (id_assinatura, id_usuario, cobranca["id_cobranca"], valor, vencimento, agora),
                )
                # Fim item 33
                con.commit()
                return jsonify({
                    "id_assinatura": id_assinatura,
                    "id_cobranca": cobranca["id_cobranca"],
                    "valor": valor,
                    "codigo_pagamento": cobranca["codigo_pagamento"],
                    "qr_code_png": cobranca.get("qr_code_png"),
                    "qr_code_svg": cobranca.get("qr_code_svg"),
                    "status": cobranca["status"],
                    "tipo_cobranca": cobranca["tipo_cobranca"],
                }), 201

        # Sprint item 33 - Exibir total gasto e histórico de faturas do aluno - Consulta o histórico e os valores das faturas do aluno
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
        # Numera as faturas por ordem de criação e exibe as mais recentes primeiro.
        faturas = [_fatura_para_dict(row, indice + 1) for indice, row in enumerate(cursor.fetchall())]
        faturas = list(reversed(faturas))
        # Fim item 33
        # Sprint item 34 - Exibir faturas em aberto - Identifica faturas pendentes e verifica a liberação do acesso
        # Calcula listas e totais para o resumo financeiro.
        faturas_abertas = [item for item in faturas if item["aberta"]]
        # Fim item 34
        # Sprint item 33 - Exibir total gasto e histórico de faturas do aluno - Consulta o histórico e os valores das faturas do aluno
        faturas_pagas = [item for item in faturas if item["status"] in (1, 3)]
        
        total_gasto = sum(item["valor"] for item in faturas_pagas)
        # Fim item 33
        # Sprint item 34 - Exibir faturas em aberto - Identifica faturas pendentes e verifica a liberação do acesso
        total_aberto = sum(item["valor"] for item in faturas_abertas)
        return jsonify({
            "faturas": faturas,
            "faturas_abertas": faturas_abertas,
            "faturas_pagas": faturas_pagas,
            "total_gasto": round(total_gasto, 2),
            "total_aberto": round(total_aberto, 2),
            "tem_fatura_aberta": aluno_tem_fatura_aberta(cursor, id_usuario),
        })
        # Fim item 34
    # Desfaz alterações se a integração falhar.
    except ArkheError as erro:
        con.rollback()
        return resposta(f"Erro ao comunicar com a Arkhe: {erro}", 502)
    except Exception as erro:
        con.rollback()
        # Sprint item 33 - Exibir total gasto e histórico de faturas do aluno - Consulta o histórico e os valores das faturas do aluno
        return resposta(f"Erro ao processar faturas: {erro}", 500)
        # Fim item 33
    # Libera cursor e conexão em todos os caminhos.
    finally:
        cursor.close()
        con.close()




# Sprint item 2 - Integrar pagamentos pelo ARKHE - Consulta a cobrança Pix e confirma o pagamento da fatura
# A fatura só libera a assinatura depois que o status da cobrança Pix é confirmado na Arkhe.
@app.route("/financeiro/faturas/<int:id_assinatura>/verificar", methods=["POST"])
@jwt_required()
def verificar_fatura_aluno(id_assinatura):
    # Consulta a Arkhe e ativa uma fatura paga.
    
    # Confere o perfil do aluno.
    negado = exigir_tipo(2)
    if negado:
        return negado

    garantir_estrutura_banco()
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

        # Só permite verificar fatura pertencente ao usuário autenticado.
        if not fatura:
            return resposta("Mensalidade não encontrada.", 404)

        id_cobranca, status = fatura
        # Uma fatura já ativa não precisa de nova confirmação.
        if int(status or 0) == 1:
            return jsonify({"assinatura": True, "status": "ativa", "id_assinatura": id_assinatura}), 200

        
        # Uma fatura paga e expirada não pode ser reativada.
        if int(status or 0) == 3:
            return resposta("Esta mensalidade já foi paga e expirou.", 409)

        if not id_cobranca:
            return resposta("Mensalidade aguardando código de cobrança.", 409)

        
        # Consulta o status real da cobrança na Arkhe.
        cobranca = consultar_cobranca_pix(id_cobranca, exigir_codigo_pix=False)
        
        if str(cobranca["status"]).strip().lower() not in STATUS_PAGOS:
            return resposta("Pagamento ainda não confirmado.", 402, status_cobranca=cobranca["status"])

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
        # O próximo período começa após o período ativo, quando houver.
        assinatura_ativa = cursor.fetchone()
        
        
        data_inicio = assinatura_ativa[0] if assinatura_ativa and assinatura_ativa[0] and assinatura_ativa[0] > agora else agora
        # Cada mensalidade acrescenta trinta dias de acesso.
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
        # Persiste o pagamento e as datas antes de responder.
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
# Fim item 2



# Sprint item 32 - Permitir solicitação de saque para a conta ARKHE - Valida o saldo e registra o pedido de saque para análise manual
# O pedido de saque reserva saldo para análise; o pagamento é registrado manualmente pelo administrador.
@app.route("/professor/saques", methods=["POST"])
@jwt_required()
def solicitar_saque():
    # Registra um pedido de saque para pagamento manual.
    
    # Somente professores podem solicitar saques.
    negado = exigir_tipo(1)
    if negado:
        return negado

    garantir_estrutura_banco()
    dados = request.get_json(silent=True) or {}
    if not isinstance(dados, dict):
        return resposta("Dados da solicitação inválidos.", 400)
    valor_recebido = dados.get("valor")
    chave_pix = dados.get("chave_pix")
    # Normaliza e valida a chave Pix informada.
    chave_pix = chave_pix.strip() if isinstance(chave_pix, str) else ""
    if not 5 <= len(chave_pix) <= 140:
        return resposta("Informe uma chave Pix válida para receber o pagamento.", 400)
    try:
        # Decimal evita erros de arredondamento na validação dos centavos.
        valor_decimal = Decimal(str(valor_recebido))
        if not valor_decimal.is_finite() or valor_decimal <= 0:
            return resposta("Valor de saque inválido.", 400)
        valor_centavos = valor_decimal.quantize(Decimal("0.01"))
    except (InvalidOperation, TypeError, ValueError):
        return resposta("Informe um valor de saque válido com até duas casas decimais.", 400)

    # Rejeita valores com mais de duas casas decimais.
    if valor_decimal != valor_centavos:
        return resposta("O valor do saque deve ter até duas casas decimais.", 400)

    valor = float(valor_centavos)

    con = get_db()
    cursor = con.cursor()

    try:
        
        # Bloqueia a configuração durante cálculo e registro do saque.
        cursor.execute("SELECT ID_CONFIG FROM FINANCEIRO_CONFIG WHERE ID_CONFIG = 1 WITH LOCK")
        if not cursor.fetchone():
            raise RuntimeError("Configuração financeira não encontrada.")

        
        # Determina a parte da receita destinada aos instrutores.
        percentual = percentual_instrutores(cursor)
        
        cursor.execute("SELECT COALESCE(CAST(SUM(VALOR) AS DOUBLE PRECISION), 0) FROM ASSINATURAS WHERE STATUS IN (1, 3)")
        total_arrecadado = float((cursor.fetchone() or (0,))[0] or 0)
        
        pool_instrutores = total_arrecadado * (percentual / 100)
        # Calcula a cota do professor e o saldo ainda disponível.
        pesos_instrutores = pesos_pool_instrutores(cursor)
        peso_total = sum(pesos_instrutores.values())
        _, _, _, disponivel_saque = calcular_saldo_saque(
            cursor,
            get_jwt_identity(),
            pool_instrutores,
            pesos_instrutores,
            peso_total,
        )

        # Impede pedidos acima do saldo disponível.
        if valor > disponivel_saque:
            
            
            return resposta(
                "O valor solicitado excede o saldo disponível para saque.",
                400,
                disponivel_saque=disponivel_saque,
            )

        # O status 0 indica solicitação aguardando análise.
        id_saque = proximo_id(cursor, "SAQUES_INSTRUTOR", "ID_SAQUE")
        
        
        cursor.execute(
            """
            INSERT INTO SAQUES_INSTRUTOR (ID_SAQUE, ID_USUARIO, VALOR, STATUS, CHAVE_PIX)
            VALUES (?, ?, ?, 0, ?)
            """,
            (id_saque, get_jwt_identity(), valor, chave_pix),
        )
        con.commit()
        return resposta("Solicitação enviada ao administrador. O pagamento ainda não foi realizado.", 201, "sucesso", id_saque=id_saque)
    except Exception as erro:
        con.rollback()
        return resposta(f"Erro ao solicitar saque: {erro}", 500)
    finally:
        cursor.close()
        con.close()


def _saque_manual_para_dict(row):
    # Serializa um saque para as listagens do professor e do administrador.
    status = int(row[4] or 0)
    # Traduz o status e formata as datas do pedido e da análise.
    return {
        "id": row[0],
        "id_professor": row[1],
        "professor": row[2],
        "valor": float(row[3] or 0),
        "status": status,
        "status_nome": {0: "Solicitado", 1: "Pago", 2: "Recusado"}.get(status, "Desconhecido"),
        "chave_pix": row[5] or "",
        "comprovante": row[6] or "",
        "motivo_recusa": row[7] or "",
        "criado_em": row[8].isoformat() if row[8] else None,
        "analisado_em": row[9].isoformat() if row[9] else None,
    }


@app.route("/professor/saques", methods=["GET"])
@jwt_required()
def listar_saques_professor():
    # Lista os saques do professor autenticado.
    negado = exigir_tipo(1)
    if negado:
        return negado
    garantir_estrutura_banco()
    con = get_db()
    cursor = con.cursor()
    try:
        # Filtra os registros pela identidade do token.
        cursor.execute(
            """SELECT S.ID_SAQUE, S.ID_USUARIO, U.NOME, S.VALOR, S.STATUS, S.CHAVE_PIX,
                      S.COMPROVANTE, S.MOTIVO_RECUSA, S.CRIADO_EM, S.ANALISADO_EM
               FROM SAQUES_INSTRUTOR S JOIN USUARIOS U ON U.ID_USUARIO = S.ID_USUARIO
               WHERE S.ID_USUARIO = ? ORDER BY S.ID_SAQUE DESC""",
            (get_jwt_identity(),),
        )
        retorno = jsonify([_saque_manual_para_dict(row) for row in cursor.fetchall()])
        # Impede cache de dados financeiros e chave Pix.
        retorno.headers["Cache-Control"] = "private, no-store"
        return retorno
    except Exception as erro:
        return resposta(f"Erro ao listar solicitações: {erro}", 500)
    finally:
        cursor.close()
        con.close()


@app.route("/admin/saques", methods=["GET"])
@jwt_required()
def listar_saques_admin():
    # Lista os saques para análise administrativa.
    negado = exigir_tipo(0)
    if negado:
        return negado
    garantir_estrutura_banco()
    con = get_db()
    cursor = con.cursor()
    try:
        # Mostra os pendentes primeiro e ordena por ID decrescente.
        cursor.execute(
            """SELECT S.ID_SAQUE, S.ID_USUARIO, U.NOME, S.VALOR, S.STATUS, S.CHAVE_PIX,
                      S.COMPROVANTE, S.MOTIVO_RECUSA, S.CRIADO_EM, S.ANALISADO_EM
               FROM SAQUES_INSTRUTOR S JOIN USUARIOS U ON U.ID_USUARIO = S.ID_USUARIO
               ORDER BY CASE WHEN S.STATUS = 0 THEN 0 ELSE 1 END, S.ID_SAQUE DESC"""
        )
        retorno = jsonify([_saque_manual_para_dict(row) for row in cursor.fetchall()])
        # Impede cache dos dados de pagamento.
        retorno.headers["Cache-Control"] = "private, no-store"
        return retorno
    except Exception as erro:
        return resposta(f"Erro ao listar pagamentos de professores: {erro}", 500)
    finally:
        cursor.close()
        con.close()


@app.route("/admin/saques/<int:id_saque>", methods=["PATCH"])
@jwt_required()
def analisar_saque_admin(id_saque):
    # Marca um saque como pago ou recusado.
    
    # Somente administradores podem decidir sobre saques.
    negado = exigir_tipo(0)
    if negado:
        return negado
    dados = request.get_json(silent=True) or {}
    if not isinstance(dados, dict):
        return resposta("Dados da análise inválidos.", 400)
    # Aceita apenas as ações previstas pela API.
    acao = dados.get("acao")
    if acao not in {"pago", "recusado"}:
        return resposta("Escolha marcar como pago ou recusar a solicitação.", 400)
    # Exige comprovante ou motivo com tamanho válido.
    texto = str(dados.get("comprovante" if acao == "pago" else "motivo") or "").strip()
    if not 5 <= len(texto) <= 500:
        return resposta("Informe a referência do pagamento ou o motivo da recusa (5 a 500 caracteres).", 400)

    garantir_estrutura_banco()
    con = get_db()
    cursor = con.cursor()
    try:
        # Serializa a análise com outros acessos ao financeiro.
        cursor.execute("SELECT ID_CONFIG FROM FINANCEIRO_CONFIG WHERE ID_CONFIG = 1 WITH LOCK")
        if not cursor.fetchone():
            return resposta("Configuração financeira não encontrada.", 500)
        cursor.execute("SELECT STATUS, CHAVE_PIX FROM SAQUES_INSTRUTOR WHERE ID_SAQUE = ?", (id_saque,))
        saque = cursor.fetchone()
        if not saque:
            return resposta("Solicitação não encontrada.", 404)
        # Impede nova decisão sobre pedido já analisado.
        if int(saque[0] or 0) != 0:
            return resposta("Esta solicitação já foi analisada.", 409)
        # Exige chave Pix registrada antes de confirmar pagamento.
        if acao == "pago" and not saque[1]:
            return resposta("Solicitação antiga sem chave Pix. Recuse e peça uma nova solicitação ao professor.", 400)
        if acao == "pago":
            
            
            # Impede reutilizar uma referência de pagamento.
            cursor.execute("SELECT 1 FROM SAQUES_INSTRUTOR WHERE STATUS = 1 AND COMPROVANTE = ?", (texto,))
            if cursor.fetchone():
                return resposta("Esta referência de pagamento já foi usada em outra solicitação.", 409)
        cursor.execute(
            """UPDATE SAQUES_INSTRUTOR
               SET STATUS = ?, COMPROVANTE = ?, MOTIVO_RECUSA = ?, ID_ADMIN = ?, ANALISADO_EM = CURRENT_TIMESTAMP
               WHERE ID_SAQUE = ? AND STATUS = 0""",
            (1 if acao == "pago" else 2, texto if acao == "pago" else None,
             texto if acao == "recusado" else None, get_jwt_identity(), id_saque),
        )
        # Confere se o pedido ainda estava pendente durante a atualização.
        if cursor.rowcount != 1:
            return resposta("Esta solicitação já foi analisada.", 409)
        
        
        # A recusa libera o valor para saques futuros.
        con.commit()
        return resposta("Pagamento confirmado no sistema." if acao == "pago" else "Solicitação recusada; saldo liberado ao professor.", 200, "sucesso")
    except Exception as erro:
        con.rollback()
        return resposta(f"Erro ao analisar solicitação: {erro}", 500)
    finally:
        cursor.close()
        con.close()
# Fim item 32


# Status da Arkhe aceitos como pagamento confirmado.
STATUS_PAGOS = {"1", "pago", "paid", "confirmado", "confirmed", "aprovado", "approved"}
# Evita geração simultânea de pendências neste processo.
_pendencias_lock = Lock()


# Sprint item 34 - Exibir faturas em aberto - Gera a fatura pendente após o vencimento da assinatura
def garantir_fatura_vencida(cursor, con, id_usuario):
    # Gera nova fatura após o vencimento da última assinatura paga.
    
    
    # Protege a leitura e a inserção de chamadas simultâneas locais.
    with _pendencias_lock:
        cursor.execute(
            """
            SELECT FIRST 1 ID_ASSINATURA, STATUS, DATA_EXPIRACAO
            FROM ASSINATURAS
            WHERE ID_USUARIO = ? AND STATUS IN (1, 3)
            ORDER BY DATA_EXPIRACAO DESC, ID_ASSINATURA DESC
            """,
            (id_usuario,),
        )
        ultima_paga = cursor.fetchone()
        # Sem mensalidade paga vencida, não há pendência nova.
        if not ultima_paga or not ultima_paga[2] or ultima_paga[2] >= datetime.now():
            return

        
        
        cursor.execute(
            "SELECT FIRST 1 ID_ASSINATURA FROM ASSINATURAS WHERE ID_USUARIO = ? AND STATUS = 0",
            (id_usuario,),
        )
        # Evita duplicar uma fatura em aberto.
        if cursor.fetchone():
            return

        # Marca a assinatura anterior como expirada.
        if int(ultima_paga[1]) == 1:
            cursor.execute("UPDATE ASSINATURAS SET STATUS = 3 WHERE ID_ASSINATURA = ?", (ultima_paga[0],))

        # A nova fatura usa como vencimento a expiração anterior.
        id_assinatura = proximo_id(cursor, "ASSINATURAS", "ID_ASSINATURA")
        cursor.execute(
            """
            INSERT INTO ASSINATURAS (
                ID_ASSINATURA, ID_USUARIO, PLANO, STATUS, VALOR, DATA_VENCIMENTO, CRIADO_EM
            ) VALUES (?, ?, 1, 0, ?, ?, ?)
            """,
            (id_assinatura, id_usuario, valor_assinatura_config(), ultima_paga[2], datetime.now()),
        )
        con.commit()
# Fim item 34


# Sprint item 2 - Integrar pagamentos pelo ARKHE - Cria ou reutiliza a cobrança Pix associada à fatura
def preparar_pagamento_fatura(cursor, con, id_assinatura, id_cobranca, valor, vencimento):
    # Reutiliza Pix válido ou cria nova cobrança para fatura aberta.
    
    # Consulta a cobrança associada à fatura.
    if id_cobranca:
        anterior = consultar_cobranca_pix(id_cobranca, exigir_codigo_pix=False)
        # Se já foi paga, sinaliza que falta confirmar a fatura.
        if str(anterior["status"]).strip().lower() in STATUS_PAGOS:
            return {"id_assinatura": id_assinatura, "pagamento_confirmado": True}

        # Reaproveita o código Pix enquanto ainda é válido.
        if (vencimento is None or vencimento >= datetime.now()) and anterior.get("codigo_pagamento"):
            return {
                "id_assinatura": id_assinatura,
                "id_cobranca": anterior["id_cobranca"],
                "valor": valor,
                "codigo_pagamento": anterior["codigo_pagamento"],
                "qr_code_png": anterior.get("qr_code_png"),
                "qr_code_svg": anterior.get("qr_code_svg"),
                "status": anterior["status"],
                "tipo_cobranca": anterior["tipo_cobranca"],
                "fatura_existente": True,
            }

    
    # Renova o Pix e estende o prazo por três dias.
    cobranca = criar_cobranca_pix(valor)
    cursor.execute(
        "UPDATE ASSINATURAS SET ID_COBRANCA_ARKHE = ?, DATA_VENCIMENTO = ? WHERE ID_ASSINATURA = ? AND STATUS = 0",
        (cobranca["id_cobranca"], datetime.now() + timedelta(days=3), id_assinatura),
    )
    con.commit()
    return {
        "id_assinatura": id_assinatura,
        "id_cobranca": cobranca["id_cobranca"],
        "valor": valor,
        "codigo_pagamento": cobranca["codigo_pagamento"],
        "qr_code_png": cobranca.get("qr_code_png"),
        "qr_code_svg": cobranca.get("qr_code_svg"),
        "status": cobranca["status"],
        "tipo_cobranca": cobranca["tipo_cobranca"],
        "fatura_existente": True,
    }



@app.route("/pagamentos/pix", methods=["POST"])
@jwt_required()
def criar_pagamento_pix():
    # Cria uma cobrança Pix avulsa no valor informado.
    try:
        
        
        # Lê os dados enviados pelo cliente autenticado.
        dados = request.get_json() or {}

        valor_recebido = dados.get("valor")

        if valor_recebido is None:
            return jsonify({
                "mensagem": "Valor do pagamento é obrigatório"
            }), 400

        
        try:
            # Valida valor finito, positivo e com até duas casas decimais.
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

        
        # Devolve o código de pagamento recebido da Arkhe.
        cobranca = criar_cobranca_pix(valor)

        return jsonify({
            "id_cobranca": cobranca["id_cobranca"],
            "valor": cobranca["valor"],
            "codigo_pagamento": cobranca["codigo_pagamento"],
            "qr_code_png": cobranca.get("qr_code_png"),
            "qr_code_svg": cobranca.get("qr_code_svg"),
            "status": cobranca["status"],
            "tipo_cobranca": cobranca["tipo_cobranca"],
        }), 201

    # Falhas de comunicação externa retornam erro 502.
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
    # Cria ou reutiliza uma cobrança de assinatura.
    # Carrega as dependências desta rota e prepara as tabelas.
    from estrutura_banco_1_5_6_9_15_19_20_21_27_28_32_33_36_37 import garantir_estrutura_banco
    from utilitarios_backend_5_9_12_15_20_24_28_34 import valor_assinatura_config

    garantir_estrutura_banco()
    con = get_db()
    cursor = con.cursor()

    try:
        id_usuario = get_jwt_identity()

        
        cursor.execute(
            """
            SELECT ID_ASSINATURA
            FROM ASSINATURAS
            WHERE ID_USUARIO = ?
              AND STATUS = 1
            """,
            (id_usuario,)
        )

        # Impede criar cobrança para assinatura já ativa.
        if cursor.fetchone():
            return jsonify({
                "mensagem": "Usuário já possui uma assinatura ativa"
            }), 409

        
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
        # Procura cobrança pendente ainda dentro do prazo.
        assinatura_pendente = cursor.fetchone()

        # Reaproveita o Pix anterior quando há valor válido.
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
                    "qr_code_png": cobranca.get("qr_code_png"),
                    "qr_code_svg": cobranca.get("qr_code_svg"),
                    "status": cobranca["status"],
                    "tipo_cobranca": cobranca["tipo_cobranca"],
                    "cobranca_existente": True
                }), 200

        
        # Consulta o preço atual para nova cobrança.
        valor = valor_assinatura_config()

        
        cobranca = criar_cobranca_pix(valor)

        
        
        
        
        # Obtém o próximo ID antes de gravar a assinatura pendente.
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

        
        # Persiste o vínculo entre assinatura e cobrança.
        con.commit()

        return jsonify({
            "id_assinatura": id_assinatura,
            "id_cobranca": cobranca["id_cobranca"],
            "valor": valor,
            "codigo_pagamento": cobranca["codigo_pagamento"],
            "qr_code_png": cobranca.get("qr_code_png"),
            "qr_code_svg": cobranca.get("qr_code_svg"),
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
    # Informa o estado da assinatura e confirma Pix pendente.
    # Prepara as tabelas antes da consulta.
    from estrutura_banco_1_5_6_9_15_19_20_21_27_28_32_33_36_37 import garantir_estrutura_banco

    garantir_estrutura_banco()
    con = get_db()
    cursor = con.cursor()

    try:
        id_usuario = get_jwt_identity()

        
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

        # Prioriza assinatura ativa válida; depois usa a mais recente.
        assinaturas = cursor.fetchall()
        assinatura = assinaturas[0] if assinaturas else None

        # Informa quando não há nenhuma assinatura.
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

        
        # Confere se o período ativo ainda não expirou.
        if status == 1:
            agora = datetime.now()

            
            if data_expiracao and data_expiracao >= agora:
                return jsonify({
                    "assinatura": True,
                    "status": "ativa",
                    "id_assinatura": id_assinatura,
                    "data_inicio": data_inicio.isoformat(),
                    "data_expiracao": data_expiracao.isoformat()
                }), 200

            
            # Uma assinatura vencida passa ao status 3.
            cursor.execute(
                """
                UPDATE ASSINATURAS
                SET STATUS = 3
                WHERE ID_ASSINATURA = ?
                """,
                (id_assinatura,)
            )

            # Persiste o status de assinatura expirada.
            con.commit()

            return jsonify({
                "assinatura": False,
                "status": "expirada",
                "mensagem": "A assinatura do usuário expirou."
            }), 200

        
        
        
        
        cobranca = None
        assinatura_paga = None
        # Busca cobrança pendente confirmada pela Arkhe.
        for assinatura_candidata in assinaturas:
            if assinatura_candidata[2] != 0 or not assinatura_candidata[1]:
                continue
            
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

        # Distingue pagamento pendente de assinatura expirada.
        if cobranca is None:
            existe_pendente = any(item[2] == 0 for item in assinaturas)
            return jsonify({
                "assinatura": False,
                "status": "pendente" if existe_pendente else "expirada",
                "mensagem": "Assinatura aguardando pagamento." if existe_pendente else "A assinatura do usuário expirou."
            }), 200

        status_cobranca = cobranca["status"]

        
        
        
        # O Pix confirmado libera trinta dias de acesso.
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
# Fim item 2
