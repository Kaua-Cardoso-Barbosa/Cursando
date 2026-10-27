

from flask import Flask, jsonify, request
from app import app
from flask_cors import CORS
from flask_jwt_extended import JWTManager, jwt_required
from flask_bcrypt import Bcrypt
import requests

jwt = JWTManager(app)
bcrypt = Bcrypt(app)

CORS(
    app,
    supports_credentials=True,
    origins="*",
    allow_headers=["Content-Type", "Authorization"],
    methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
)

@app.route("/health", methods=["GET"])
def health():
    return {"status": "ok"}, 200

from usuario_1_3_8_34 import *
from professor_7 import *
from aluno_4_6_34 import *

import curso_conteudo_6_11_20_21_28 as curso_conteudo
import chat_cursos_11_19_20 as chat_cursos
import provas_cursos_20 as provas_cursos
import gravacao_log_25 as gravacao_log
import financeiro_12_13_14_15_16_30_31_32_33_34_35_36 as financeiro
import pagamento_arkhe_2_32_33_34 as pagamento_arkhe
import relatorio_7_9_22_23 as relatorio
from utilitarios_backend_5_9_12_15_20_24_28_34 import exigir_tipo
from servicos.arkhe_2 import ArkheError, consultar_conta

print("\nROTAS REGISTRADAS ANTES DA ROTA ARKHÉ:")
for regra in app.url_map.iter_rules():
    print(regra, "->", regra.endpoint)


# Sprint item 2 - Integrar pagamentos pelo ARKHE - Permite ao administrador verificar a comunicação com a Arkhé
@app.route("/rodar-teste-arkhe", methods=["GET"])
@jwt_required()
def rodar_teste_arkhe():
    negado = exigir_tipo(0)
    if negado:
        return negado

    try:
        consultar_conta()
        return jsonify({
            "status": "ok",
            "mensagem": "Conexão com a Arkhé confirmada."
        }), 200

    except (requests.RequestException, ArkheError):
        return jsonify({
            "status": "erro",
            "mensagem": "Não foi possível validar a conexão com a Arkhé."
        }), 502
# Fim item 2


if __name__ == '__main__':
    app.run(
        host='0.0.0.0',
        port=5000,
        debug=True,
        use_reloader=False
    )
