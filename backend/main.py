

from flask import Flask, jsonify, request
from app import app
from flask_cors import CORS
from flask_jwt_extended import JWTManager, jwt_required
from flask_bcrypt import Bcrypt
import requests

jwt = JWTManager(app)
bcrypt = Bcrypt(app)

@jwt.invalid_token_loader
def token_invalido(motivo):
    return jsonify(mensagem="Sessão inválida. Entre novamente."), 401

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
import certificados_5_20 as certificados
# A importação registra as rotas administrativas de consulta aos logs.
import gravacao_log_25 as gravacao_log
import financeiro_12_13_14_15_16_30_31_32_33_34_35_36 as financeiro
import pagamento_arkhe_2_32_33_34 as pagamento_arkhe
import relatorio_7_9_22_23 as relatorio
from utilitarios_backend_5_9_12_15_20_24_28_34 import exigir_tipo
from servicos.arkhe_2 import ArkheError, consultar_conta

# Prepara colunas, índices e geradores antes de começar a atender requisições.
from estrutura_banco_1_5_6_9_15_19_20_21_27_28_32_33_36_37 import garantir_estrutura_banco
with app.app_context():
    garantir_estrutura_banco()

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
    import socket
    # No Windows, o servidor de desenvolvimento pode compartilhar a porta e
    # alternar respostas entre instâncias antigas e novas. Recusa a duplicação.
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as verificacao:
        if hasattr(socket, 'SO_EXCLUSIVEADDRUSE'):
            verificacao.setsockopt(socket.SOL_SOCKET, socket.SO_EXCLUSIVEADDRUSE, 1)
        try:
            verificacao.bind(('0.0.0.0', 5000))
        except OSError:
            raise SystemExit('A porta 5000 já está ocupada. Encerre o backend anterior antes de iniciar outro.')
    app.run(
        host='0.0.0.0',
        port=5000,
        debug=True,
        use_reloader=False
    )
