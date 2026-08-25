from flask import Flask
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_bcrypt import Bcrypt
import fdb
app = Flask(__name__)
app.config.from_pyfile('config.py')

jwt = JWTManager(app)
bcrypt = Bcrypt(app)

CORS(app, supports_credentials=True, origins=["http://10.92.11.31:5173", "http://10.92.11.58:5173", "http://localhost:5173"])

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

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)