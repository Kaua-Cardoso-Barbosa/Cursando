"""Ponto de entrada da API: registra autenticação e rotas de cada sprint.

Os imports dos módulos carregam seus ``@app.route`` no Flask. Site e app
chamam essas mesmas rotas; a regra de acesso fica no servidor. O endpoint de
diagnóstico da Arkhé (item 1) só responde a administradores autenticados.
"""

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

from usuario import *
from professor import *
from aluno import *
# Registra explicitamente as rotas por área funcional.
import curso_conteudo
import chat_cursos
import provas_cursos
import gravacao_log
import financeiro
import pagamento_arkhe
import relatorio
from utilitarios_backend import exigir_tipo
from servicos.arkhe import ArkheError, consultar_conta

print("\nROTAS REGISTRADAS ANTES DA ROTA ARKHÉ:")
for regra in app.url_map.iter_rules():
    print(regra, "->", regra.endpoint)

# Sprint item 2 - Integrar pagamentos pelo ARKHE. deixa o diagnóstico ARKHÉ restrito a administradores e não retorna dados bancários.
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


if __name__ == '__main__':
    app.run(
        host='0.0.0.0',
        port=5000,
        debug=True,
        use_reloader=False
    )
