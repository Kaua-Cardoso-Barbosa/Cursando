import jwt
import datetime
from app import app
from banco import get_db
from flask import request, render_template, jsonify
import random
import smtplib
import threading
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.utils import formataddr
from flask_bcrypt import check_password_hash
import qrcode
import os
import subprocess
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

    if len(senha) < 8:
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


def garantir_coluna_imagem_perfil(cursor):
    cursor.execute(
        """
        SELECT 1
        FROM RDB$RELATION_FIELDS
        WHERE RDB$RELATION_NAME = 'USUARIOS'
          AND RDB$FIELD_NAME = 'IMAGEM_PERFIL'
        """
    )
    if cursor.fetchone():
        return False

    cursor.execute("ALTER TABLE USUARIOS ADD IMAGEM_PERFIL VARCHAR(500)")
    return True


@app.route('/verificar_token', methods=['GET'])
def verificar_token():
    try:
        verify_jwt_in_request()

        id_usuario = get_jwt_identity()
        tipo = get_jwt().get('tipo')

        con = get_db()
        cursor = con.cursor()

        if garantir_coluna_imagem_perfil(cursor):
            con.commit()

        cursor.execute("""
            SELECT NOME, IMAGEM_PERFIL
            FROM USUARIOS
            WHERE ID_USUARIO = ?
        """, (id_usuario,))

        usuario = cursor.fetchone()
        redirecionar = None

        if usuario and int(tipo) == 2:
            cursor.execute(
                """
                SELECT
                    COUNT(*),
                    SUM(
                        CASE
                            WHEN STATUS = 1
                             AND (DATA_EXPIRACAO IS NULL OR DATA_EXPIRACAO >= CURRENT_TIMESTAMP)
                            THEN 1
                            ELSE 0
                        END
                    )
                FROM ASSINATURAS
                WHERE ID_USUARIO = ?
                """,
                (id_usuario,),
            )
            total_assinaturas, assinaturas_ativas = cursor.fetchone() or (0, 0)

            # Redireciona qualquer aluno sem assinatura ativa para concluir o pagamento.
            if int(assinaturas_ativas or 0) == 0:
                redirecionar = "/assinatura"

        cursor.close()

        if not usuario:
            return jsonify({
                'autenticado': False
            }), 200

        return jsonify({
            'autenticado': True,
            'id_usuario': id_usuario,
            'nome': usuario[0],
            'imagem_perfil': usuario[1],
            'tipo': tipo,
            'redirecionar': redirecionar
        }), 200

    except Exception as e:
        print("ERRO AO VERIFICAR JWT:", repr(e))

        return jsonify({
            'autenticado': False
        }), 200



def email_verificacao(destinatario, assunto, mensagem, mensagem_secundaria=""):
    if not app.config.get("SMTP_PASSWORD"):
        return "Configure SMTP_PASSWORD no arquivo backend/.env para enviar codigos.", "erro"

    con = get_db()
    cur = con.cursor()
    try:
        cur.execute(
            "SELECT ID_USUARIO, NOME FROM USUARIOS WHERE EMAIL = ?",
            (destinatario,),
        )
        usuario = cur.fetchone()
        if not usuario:
            return "Email informado nao encontrado.", "erro"

        id_usuario, nome = usuario
        codigo = random.randint(100000, 999999)
        cur.execute(
            "UPDATE USUARIOS SET CODIGO = ? WHERE ID_USUARIO = ?",
            (codigo, id_usuario),
        )
        con.commit()
    except Exception as erro:
        con.rollback()
        print("Erro ao preparar codigo de e-mail:", type(erro).__name__)
        return "Ocorreu um erro ao preparar o e-mail. Tente novamente.", "erro"
    finally:
        cur.close()
        con.close()

    thread = threading.Thread(
        target=enviando_email,
        args=(destinatario, assunto, mensagem, codigo, nome, mensagem_secundaria),
        daemon=True,
    )
    thread.start()
    return "Seu codigo foi enviado para o e-mail informado.", "sucesso"


def verificar_codigo(email, codigo):
    con = get_db()
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
    user = app.config.get("SMTP_EMAIL", "cursandoemail@gmail.com")
    senha = app.config.get("SMTP_PASSWORD", "")
    host = app.config.get("SMTP_HOST", "smtp.gmail.com")
    porta = app.config.get("SMTP_PORT", 465)
    try:
        with app.app_context():
            html = render_template(
                "codigo_verificacao.html",
                mensagem=mensagem,
                codigo=codigo,
                nome=nome,
                mensagem_secundaria=mensagem_secundaria,
            )

        msg = MIMEText(html, "html", "utf-8")
        msg["Subject"] = assunto
        msg["From"] = formataddr(("Cursando", user))
        msg["To"] = destinatario

        if app.config.get("SMTP_USE_SSL", True):
            server = smtplib.SMTP_SSL(host, porta, timeout=20)
        else:
            server = smtplib.SMTP(host, porta, timeout=20)
            server.starttls()
        try:
            server.login(user, senha)
            server.send_message(msg)
        finally:
            server.quit()
        print("Email enviado com sucesso!")
    except Exception as erro:
        print("Erro ao enviar email. Confira as configuracoes SMTP.", type(erro).__name__)
