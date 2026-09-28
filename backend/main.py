from flask import Flask, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_bcrypt import Bcrypt
import fdb
import requests
app = Flask(__name__)
app.config.from_pyfile('config.py')

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

host = app.config['DB_HOST']
data_base = app.config['DB_NAME']
user = app.config['DB_USER']
password = app.config['DB_PASSWORD']


con = fdb.connect(
    host=host,
    database=data_base,
    user=user,
    password=password,
    charset='UTF8'
)


from usuario import *
from professor import *
from aluno import *
from servicos.arkhe import consultar_conta

print("\nROTAS REGISTRADAS ANTES DA ROTA ARKHÉ:")
for regra in app.url_map.iter_rules():
    print(regra, "->", regra.endpoint)

@app.route("/rodar-teste-arkhe", methods=["GET"])
def rodar_teste_arkhe():
    try:
        conta = consultar_conta()

        return jsonify(conta), 200

    except requests.RequestException as erro:
        return jsonify({
            "erro": "Erro ao comunicar com a Arkhé",
            "detalhes": str(erro)
        }), 502


if __name__ == '__main__':
    app.run(
        host='0.0.0.0',
        port=5000,
        debug=True,
        use_reloader=False
    )