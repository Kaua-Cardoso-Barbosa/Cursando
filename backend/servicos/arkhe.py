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


def _json_resposta(resposta):
    try:
        return resposta.json()
    except ValueError as erro:
        raise ArkheError(
            f"Resposta invalida da Arkhe. HTTP {resposta.status_code}: {resposta.text[:200]}"
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


def _normalizar_cobranca(dados):
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
    status = _primeiro_valor(dados, "status", "situacao")
    tipo_cobranca = _primeiro_valor(dados, "tipo_cobranca", "tipo", "type")

    campos_faltando = [
        nome
        for nome, valor_campo in {
            "id_cobranca": id_cobranca,
            "valor": valor,
            "codigo_pagamento": codigo_pagamento,
            "status": status,
        }.items()
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
    # Envia o valor a Arkhe para criar a cobranca PIX.
    resposta = requests.post(
        _url("/api/v1/cobrancas/pix"),
        headers={
            **_headers(),
            "Content-Type": "application/json",
        },
        json={
            "valor": valor,
        },
        timeout=10,
    )

    dados = _json_resposta(resposta)

    if not resposta.ok:
        raise ArkheError(_mensagem_erro(dados, "Erro ao criar cobranca Pix"))

    return _normalizar_cobranca(dados)


def consultar_cobranca_pix(id_cobranca):
    # Busca o estado mais recente de uma cobranca ja criada.
    resposta = requests.get(
        _url(f"/api/v1/cobrancas/pix/{id_cobranca}"),
        headers=_headers(),
        timeout=10,
    )

    dados = _json_resposta(resposta)

    if not resposta.ok:
        raise ArkheError(_mensagem_erro(dados, "Erro ao consultar cobranca Pix"))

    return _normalizar_cobranca(dados)


def consultar_conta():
    resposta = requests.get(
        _url("/api/v1/conta"),
        headers=_headers(),
        timeout=10,
    )

    dados = _json_resposta(resposta)

    if not resposta.ok:
        raise ArkheError(_mensagem_erro(dados, "Erro ao consultar conta Arkhe"))

    return dados


def solicitar_saque_conta(valor, referencia=None):
    # Sprint item 1: envia a solicitacao de saque para a conta financeira da Arkhe.
    resposta = requests.post(
        _url("/api/v1/saques"),
        headers={
            **_headers(),
            "Content-Type": "application/json",
        },
        json={
            "valor": valor,
            "referencia": referencia,
        },
        timeout=10,
    )

    dados = _json_resposta(resposta)

    if not resposta.ok:
        raise ArkheError(_mensagem_erro(dados, "Erro ao solicitar saque na Arkhe"))

    return {
        **dados,
        "id_saque": _primeiro_valor(dados, "id_saque", "id", "saque_id", "withdraw_id"),
        "status": _primeiro_valor(dados, "status", "situacao") or "solicitado",
    }
