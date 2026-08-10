from flask import Flask
import fdb
from flask_cors import CORS
app = Flask(__name__)
app.config.from_pyfile('config.py')

CORS(app, supports_credentials=True, origins=[''])

host = app.config['DB_HOST']
data_base = app.config['DB_NAME']
user = app.config['DB_USER']
password = app.config['DB_PASSWORD']

try:
    con = fdb.connect(host=host, database=data_base, user=user, password=password, charset='UTF8'
)
    print('Conectado com sucesso!')
except Exception as e:
    print(e)

from view import *

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)