import os

SECRET_KEY = 'senha.secreta.a'
DEBUG = True
HOST = "0.0.0.0"
PORT = 5000
WAITRESS_THREADS = 4

DB_HOST = 'localhost'
DB_NAME = os.path.join(os.path.dirname(__file__), 'BANCO.FDB')
DB_USER = 'sysdba'
DB_PASSWORD = 'sysdba'

JWT_SECRET_KEY = SECRET_KEY
JWT_TOKEN_LOCATION = ["cookies", "headers"]
JWT_ACCESS_COOKIE_NAME = "token"
JWT_COOKIE_SECURE = False
JWT_COOKIE_CSRF_PROTECT = False
JWT_COOKIE_SAMESITE = "Lax"
