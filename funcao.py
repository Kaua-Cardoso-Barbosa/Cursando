import jwt
import datetime
from main import app, con
from flask import request, render_template, jsonify
import random
import smtplib
import threading
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from flask_bcrypt import check_password_hash
import qrcode
import os
from flask_jwt_extended import (
    JWTManager,
    create_access_token,
    verify_jwt_in_request,
    get_jwt_identity,
    get_jwt,
    set_access_cookies,
    unset_jwt_cookies
)

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
        'exp': datetime.datetime.utcnow() + datetime.timedelta(minutes=90)
    }
    token = jwt.encode(payload, app.config['SECRET_KEY'], algorithm='HS256')

    if isinstance(token, bytes):
        token = token.decode('utf-8')

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

@app.route('/verificar_token', methods=['GET'])
def verificar_token():
    try:
        verify_jwt_in_request()

        id_usuario = get_jwt_identity()
        tipo = get_jwt().get('tipo')

        cursor = con.cursor()

        cursor.execute("""
            SELECT NOME
            FROM USUARIOS
            WHERE ID_USUARIO = ?
        """, (id_usuario,))

        usuario = cursor.fetchone()

        cursor.close()

        if not usuario:
            return jsonify({
                'autenticado': False
            }), 200

        return jsonify({
            'autenticado': True,
            'id_usuario': id_usuario,
            'nome': usuario[0],
            'tipo': tipo
        }), 200

    except Exception as e:
        print("ERRO AO VERIFICAR JWT:", repr(e))

        return jsonify({
            'autenticado': False
        }), 200



def email_verificacao(destinatario, assunto, mensagem, mensagem_secundaria=""):
    cur = con.cursor()

    cur.execute("""SELECT id_usuario, nome
                   FROM USUARIOS
                   WHERE email = ?""", (destinatario,))
    usuario = cur.fetchone()
    if usuario:
        try:
            id_usuario = usuario[0]
            nome = usuario[1]
            assunto_email = f"{assunto}"
            codigo = random.randint(100000, 999999)
            cur.execute("""UPDATE USUARIOS SET codigo = ? WHERE id_usuario = ?""", (codigo, id_usuario))
            con.commit()

            mensagem_email = f"{mensagem}:"
            mensagem_secundaria_email = f"{mensagem_secundaria}"

            thread = threading.Thread(target=enviando_email, args=(destinatario, assunto_email, mensagem_email, codigo, nome, mensagem_secundaria_email))

            thread.start()
            return "Seu código foi enviado para o email informado, por favor verifique sua caixa de entrada.", 'sucesso'
        except Exception as e:
            print("Erro ao enviar email:", e)
            return "Ocorreu um erro ao enviar o email. Por favor, tente novamente mais tarde.", 'erro'
    else:
        return "Email informado não encontrado.", 'erro'



def verificar_codigo(email, codigo):
    cur = con.cursor()

    cur.execute("""SELECT codigo from USUARIOS where email = ?""", (email,))
    codigo_real = cur.fetchone()

    if not codigo_real:
        return jsonify({'descricao': 'Usuário não encontrado'}), 404

    if str(codigo_real[0]) == str(codigo) and codigo != "None":
        return True, "Código válido"
    else:
        return False, "Código inválido"



def enviando_email(destinatario, assunto, mensagem, codigo, nome, mensagem_secundaria):

    user = "nikola11tech@gmail.com"
    senha = "ucqs orwa wmdu zgse"
    try:
        with app.app_context():
            html = render_template("codigo_verificacao.html", mensagem=mensagem, codigo=codigo, nome=nome, mensagem_secundaria=mensagem_secundaria)

        msg = MIMEText(html, "html", "utf-8")
        msg["Subject"] = assunto
        msg["From"] = user
        msg["To"] = destinatario



        server = smtplib.SMTP_SSL("smtp.gmail.com", 465)
        # para trocar a porta para 587 que é uma existente deve adicionar essa linha a mais, é uma porta que começa sem criptografia
        # server = smtplib.SMTP("smtp.gmail.com", 587)
        # server.starttls()
        server.login(user, senha)
        server.send_message(msg)
        server.quit()
        print("Email enviado com sucesso!")
    except Exception as e:
        print("Erro ao enviar email:", e)
