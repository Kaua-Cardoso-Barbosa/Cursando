import requests
from flask import current_app


def _headers():
    # As credenciais ficam na configuração do servidor e não são enviadas ao frontend.
    return {
        "X-Client-ID": current_app.config["ARKHE_CLIENT_ID"],
        "X-Client-Secret": current_app.config["ARKHE_CLIENT_SECRET"],
    }


def criar_cobranca_pix(valor):
    # Envia o valor à Arkhé para criar a cobrança PIX.
    url = (
        f'{current_app.config["ARKHE_BASE_URL"]}'
        "/api/v1/cobrancas/pix"
    )

    resposta = requests.post(
        url,
        headers={
            **_headers(),
            "Content-Type": "application/json",
        },
        json={
            "valor": valor
        },
        timeout=10,
    )

    dados = resposta.json()

    # Converte erros HTTP do provedor em exceções tratadas pela rota Flask.
    if not resposta.ok:
        raise Exception(
            dados.get("mensagem", "Erro ao criar cobrança Pix")
        )

    return dados


def consultar_cobranca_pix(id_cobranca):
    # Busca o estado mais recente de uma cobrança já criada.
    url = (
        f'{current_app.config["ARKHE_BASE_URL"]}'
        f"/api/v1/cobrancas/pix/{id_cobranca}"
    )

    resposta = requests.get(
        url,
        headers=_headers(),
        timeout=10,
    )

    dados = resposta.json()

    # Se o provedor rejeitar a consulta, a rota poderá responder com erro adequado.
    if not resposta.ok:
        raise Exception(
            dados.get("mensagem", "Erro ao consultar cobrança Pix")
        )

    return dados


def consultar_conta():
    url = (
        f'{current_app.config["ARKHE_BASE_URL"]}'
        "/api/v1/conta"
    )

    resposta = requests.get(
        url,
        headers=_headers(),
        timeout=10,
    )

    print("URL ARKHÉ:", url)
    print("STATUS ARKHÉ:", resposta.status_code)
    print("RESPOSTA ARKHÉ:", repr(resposta.text))

    dados = resposta.json()

    if not resposta.ok:
        raise Exception(
            dados.get("mensagem", "Erro ao consultar conta Arkhé")
        )

    return dados