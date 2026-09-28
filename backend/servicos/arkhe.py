import requests

from config import (
    ARKHE_BASE_URL,
    ARKHE_CLIENT_ID,
    ARKHE_CLIENT_SECRET
)


def consultar_conta():
    headers = {
        "X-Client-ID": ARKHE_CLIENT_ID,
        "X-Client-Secret": ARKHE_CLIENT_SECRET
    }

    resposta = requests.get(
        f"{ARKHE_BASE_URL}/api/v1/conta",
        headers=headers,
        timeout=10
    )

    resposta.raise_for_status()

    return resposta.json()