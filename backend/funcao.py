import jwt
import datetime
from main import app, con
from flask import request
import random
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from flask_bcrypt import check_password_hash
import qrcode
import os

senha_secreta = app.config['SECRET_KEY']

def validar_senha(senha):
    if not senha:
        return False

    maiuscula = minuscula = numero = especial = False

    for s in senha:
        if s.isupper():
            maiuscula = True
        elif s.islower():
            minuscula = True
        elif s.isdigit():
            numero = True
        elif not s.isalnum():
            especial = True

    if len(senha) < 8 or len(senha) > 12:
        return False

    if not (maiuscula and minuscula and numero and especial):
        return False
    return True

def gerar_token(id_usuario, tipo):
    payload = {
        'id_usuario': int(id_usuario),
        'tipo': int(tipo),
        'exp': datetime.datetime.utcnow() + datetime.timedelta(minutes=120)
    }
    token = jwt.encode(payload, app.config['SECRET_KEY'], algorithm='HS256')
    return token

def pegar_token_requisicao():
    token = request.cookies.get('access_token')

    if token:
        return token

    authorization = request.headers.get('Authorization')

    if authorization:
        partes = authorization.split()

        if len(partes) == 2 and partes[0].lower() == 'bearer':
            return partes[1]

    return None


def decodificar_token_requisicao():
    token = pegar_token_requisicao()

    if not token:
        return None

    try:
        payload = jwt.decode(
            token,
            app.config['SECRET_KEY'],
            algorithms=['HS256']
        )

        return payload

    except Exception as e:
        print("ERRO TOKEN:", e)
        return None


def descobre_tipo_usuario():
    payload = decodificar_token_requisicao()

    if not payload:
        return None

    try:
        return int(payload['tipo'])
    except:
        return None


def descobre_id_usuario():
    payload = decodificar_token_requisicao()

    if not payload:
        return None

    try:
        return int(payload['id_usuario'])
    except:
        return None