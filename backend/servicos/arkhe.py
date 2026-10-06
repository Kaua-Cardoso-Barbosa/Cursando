import requests
from flask import current_app


class ArkheError(Exception):
    pass


def _config(nome):
    valor = current_app.config.get(nome)

    if valor is None or str(valor).strip() == "":
        raise ArkheError(f"Configuracao {nome} da Arkhe nao definida")

    return str(valor).strip()


def _headers():
    # As credenciais ficam na configuracao do servidor e nao sao enviadas ao frontend.
    return {
        "X-Client-ID": _config("ARKHE_CLIENT_ID"),
        "X-Client-Secret": _config("ARKHE_CLIENT_SECRET"),
    }


def _url(caminho):
    return f'{_config("ARKHE_BASE_URL").rstrip("/")}{caminho}'


def _requisitar_arkhe(metodo, caminho, **opcoes):
    # Sprint item 1: converte falhas de rede da Arkhé em erro de integração tratável pelas rotas.
    try:
        return requests.request(metodo, _url(caminho), timeout=10, **opcoes)
    except requests.RequestException as erro:
        raise ArkheError("Não foi possível comunicar com a Arkhé.") from erro


def _json_resposta(resposta):
    try:
        return resposta.json()
    except ValueError as erro:
        raise ArkheError(
            f"Resposta inválida da Arkhé (HTTP {resposta.status_code})."
        ) from erro


def _mensagem_erro(dados, padrao):
    if isinstance(dados, dict):
        mensagem = (
            dados.get("mensagem")
            or dados.get("message")
            or dados.get("erro")
            or dados.get("error")
        )

        if isinstance(mensagem, dict):
            return mensagem.get("descricao") or mensagem.get("message") or padrao

        if mensagem:
            return str(mensagem)

    return padrao


def _primeiro_valor(dados, *chaves):
    if not isinstance(dados, dict):
        return None

    for chave in chaves:
        if dados.get(chave) is not None:
            return dados.get(chave)

    return None


def _normalizar_cobranca(dados, exigir_codigo_pix=True):
    # Sprint item 1: padroniza os campos da resposta da Arkhé consumidos pelo site e aplicativo.
    id_cobranca = _primeiro_valor(dados, "id_cobranca", "id", "cobranca_id", "charge_id")
    valor = _primeiro_valor(dados, "valor", "amount")
    codigo_pagamento = _primeiro_valor(
        dados,
        "codigo_pagamento",
        "codigo_pix",
        "pix_copia_cola",
        "qr_code",
        "brcode",
        "emv",
    )
    # Sprint item 1: impede exibir ou copiar um identificador que não seja o Pix Copia e Cola BR Code.
    if exigir_codigo_pix and (
        not isinstance(codigo_pagamento, str)
        or not codigo_pagamento.startswith("000201")
    ):
        raise ArkheError("A Arkhé não retornou um código Pix Copia e Cola válido.")

    status = _primeiro_valor(dados, "status", "situacao")
    tipo_cobranca = _primeiro_valor(dados, "tipo_cobranca", "tipo", "type")

    campos_obrigatorios = {
        "id_cobranca": id_cobranca,
        "valor": valor,
        "status": status,
    }
    if exigir_codigo_pix:
        campos_obrigatorios["codigo_pagamento"] = codigo_pagamento

    campos_faltando = [
        nome
        for nome, valor_campo in campos_obrigatorios.items()
        if valor_campo is None
    ]

    if campos_faltando:
        raise ArkheError(
            "Resposta da Arkhe sem os campos obrigatorios: "
            + ", ".join(campos_faltando)
        )

    return {
        **dados,
        "id_cobranca": id_cobranca,
        "valor": valor,
        "codigo_pagamento": codigo_pagamento,
        "status": status,
        "tipo_cobranca": tipo_cobranca or "pix",
    }


def criar_cobranca_pix(valor):
    # Sprint item 1: cria a cobrança PIX na Arkhé para o fluxo de assinatura e financeiro.
    resposta = _requisitar_arkhe(
        "POST",
        "/api/v1/cobrancas/pix",
        headers={
            **_headers(),
            "Content-Type": "application/json",
        },
        json={
            "valor": valor,
        },
    )

    dados = _json_resposta(resposta)

    if not resposta.ok:
        raise ArkheError(_mensagem_erro(dados, "Erro ao criar cobranca Pix"))

    return _normalizar_cobranca(dados)


def consultar_cobranca_pix(id_cobranca, exigir_codigo_pix=True):
    # Sprint item 1: consulta a cobrança na Arkhé para confirmar o pagamento antes de liberar acesso.
    resposta = _requisitar_arkhe(
        "GET",
        f"/api/v1/cobrancas/pix/{id_cobranca}",
        headers=_headers(),
    )

    dados = _json_resposta(resposta)

    if not resposta.ok:
        raise ArkheError(_mensagem_erro(dados, "Erro ao consultar cobranca Pix"))

    # Sprint item 1: consultas de confirmação precisam do status, mesmo se a Arkhé omitir o código Pix.
    return _normalizar_cobranca(dados, exigir_codigo_pix=exigir_codigo_pix)


def consultar_conta():
    resposta = _requisitar_arkhe(
        "GET",
        "/api/v1/conta",
        headers=_headers(),
    )

    dados = _json_resposta(resposta)

    if not resposta.ok:
        raise ArkheError(_mensagem_erro(dados, "Erro ao consultar conta Arkhe"))

    return dados


def solicitar_saque_conta(valor, referencia=None):
    # Sprint item 1: envia a solicitacao de saque para a conta financeira da Arkhe.
    resposta = _requisitar_arkhe(
        "POST",
        "/api/v1/saques",
        headers={
            **_headers(),
            "Content-Type": "application/json",
        },
        json={
            "valor": valor,
            "referencia": referencia,
        },
    )

    dados = _json_resposta(resposta)

    if not resposta.ok:
        raise ArkheError(_mensagem_erro(dados, "Erro ao solicitar saque na Arkhe"))

    id_saque = _primeiro_valor(dados, "id_saque", "id", "saque_id", "withdraw_id")

    return {
        **dados,
        "id_saque": id_saque,
        "status": _primeiro_valor(dados, "status", "situacao") or "solicitado",
    }
