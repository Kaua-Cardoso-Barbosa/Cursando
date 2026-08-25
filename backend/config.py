import os

SECRET_KEY = 'senha.secreta.a'
DEBUG = True

DB_HOST = 'localhost'
DB_NAME = r'C:\Users\Aluno\Documents\GitHub\Cursando\backend\BANCO.FDB'
DB_USER = 'sysdba'
DB_PASSWORD = 'sysdba'

JWT_SECRET_KEY = SECRET_KEY
JWT_TOKEN_LOCATION = ["cookies"]
JWT_ACCESS_COOKIE_NAME = "token"
JWT_COOKIE_SECURE = False
JWT_COOKIE_CSRF_PROTECT = False
JWT_COOKIE_SAMESITE = "Lax"