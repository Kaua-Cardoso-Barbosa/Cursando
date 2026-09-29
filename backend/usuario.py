import os
import re
import unicodedata

import fdb
from flask import current_app, jsonify, make_response, request
from flask_bcrypt import check_password_hash, generate_password_hash
from flask_jwt_extended import (
    create_access_token,
    get_jwt,
    get_jwt_identity,
    jwt_required,
    set_access_cookies,
    unset_jwt_cookies,
    verify_jwt_in_request
)
from datetime import datetime, timedelta
from funcao import email_verificacao, validar_senha, verificar_codigo
from app import app
from banco import get_db
from functools import wraps
import requests

from servicos.arkhe import criar_cobranca_pix, consultar_cobranca_pix


def criar_mensagem(descricao, tipo="erro"):
    return {
        "id": os.urandom(8).hex(),
        "tipo": tipo,
        "descricao": descricao,
    }


def resposta_mensagem(descricao, status=200, tipo="erro", **extra):
    payload = {"mensagem": criar_mensagem(descricao, tipo)}
    payload.update(extra)
    return jsonify(payload), status


def email_valido(email):
    return re.match(r"^[^\s@]+@[^\s@]+\.[^\s@]+$", email or "") is not None


def cpf_valido(cpf):
    return len(re.sub(r"\D", "", cpf or "")) == 11


def nome_valido(nome):
    nome_normalizado = unicodedata.normalize("NFC", (nome or "").strip())

    if not 2 <= len(nome_normalizado) <= 100:
        return False

    if nome_normalizado.casefold() in {"teste", "test", "nome", "asdf", "abc"}:
        return False

    partes = nome_normalizado.split()
    if any(len(parte) < 1 for parte in partes):
        return False

    padrao_nome = r"^[^\W\d_]+(?:[ '’-][^\W\d_]+)*$"
    if not re.fullmatch(padrao_nome, nome_normalizado, flags=re.UNICODE):
        return False

    letras = re.findall(r"[^\W\d_]", nome_normalizado, flags=re.UNICODE)
    return len(set("".join(letras).casefold())) > 1


def mensagem_senha_invalida():
    return "A senha deve ter de 8 a 12 caracteres, com letra maiuscula, letra minuscula, numero e caractere especial."


def validar_dados_usuario(nome, email, cpf):
    if not nome or not nome.strip():
        return "Nome e obrigatorio"
    if not nome_valido(nome):
        return "Informe um nome valido, usando apenas letras, espacos, hifens ou apostrofos."
    if not email:
        return "E-mail e obrigatorio"
    if not email_valido(email):
        return "E-mail invalido"
    if not cpf:
        return "CPF e obrigatorio"
    if not cpf_valido(cpf):
        return "CPF invalido"
    return None


def validar_campos_senha(senha, confirmar_senha, obrigatoria=True):
    if obrigatoria and (not senha or not confirmar_senha):
        return "Senha e confirmacao sao obrigatorias"
    if not obrigatoria and not senha and not confirmar_senha:
        return None
    if not senha or not confirmar_senha:
        return "Preencha a senha e a confirmacao para alterar a senha"
    if senha != confirmar_senha:
        return "As senhas nao coincidem"
    if not validar_senha(senha):
        return mensagem_senha_invalida()
    return None


def exigir_admin():
    if int(get_jwt().get("tipo", -1)) != 0:
        return resposta_mensagem("Acesso negado. Apenas administradores podem acessar este recurso.", 403)
    return None


def usuario_para_dict(row):
    return {
        "id": row[0],
        "nome": row[1],
        "email": row[2],
        "cpf": row[3],
        "tipo": row[4],
        "bloqueado": row[5] == 1,
    }


def assinatura_obrigatoria(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        verify_jwt_in_request()

        id_usuario = get_jwt_identity()

        con = get_db()
        cursor = con.cursor()

        try:
            cursor.execute(
                """
                SELECT STATUS, DATA_EXPIRACAO
                FROM ASSINATURAS
                WHERE ID_USUARIO = ?
                ORDER BY ID_ASSINATURA DESC
                """,
                (id_usuario,)
            )

            assinatura = cursor.fetchone()

            if not assinatura:
                return jsonify({
                    "mensagem": "Você precisa de uma assinatura ativa para acessar este recurso."
                }), 403

            status, data_expiracao = assinatura

            if status != 1:
                return jsonify({
                    "mensagem": "Você precisa de uma assinatura ativa para acessar este recurso."
                }), 403

            if not data_expiracao or data_expiracao < datetime.now():
                return jsonify({
                    "mensagem": "Sua assinatura expirou."
                }), 403

            return func(*args, **kwargs)

        finally:
            cursor.close()
            con.close()

    return wrapper


@app.route("/usuarios", methods=["GET"])
@jwt_required()
def listar_usuarios():
    negado = exigir_admin()
    if negado:
        return negado

    con = get_db()
    cursor = con.cursor()

    try:
        cursor.execute(
            """
            SELECT ID_USUARIO, NOME, EMAIL, CPF, TIPO_USUARIO, SITUACAO
            FROM USUARIOS
            ORDER BY TIPO_USUARIO, NOME
            """
        )
        usuarios = [usuario_para_dict(row) for row in cursor.fetchall()]
        return jsonify(usuarios), 200
    except Exception as erro:
        return resposta_mensagem(f"Erro ao listar usuarios: {erro}", 500)
    finally:
        cursor.close()
        con.close()


@app.route("/admin/dashboard", methods=["GET"])
@jwt_required()
def admin_dashboard():
    negado = exigir_admin()
    if negado:
        return negado

    con = get_db()
    cursor = con.cursor()

    try:
        cursor.execute(
            """
            SELECT
                SUM(CASE WHEN TIPO_USUARIO = 1 THEN 1 ELSE 0 END),
                SUM(CASE WHEN TIPO_USUARIO = 2 THEN 1 ELSE 0 END)
            FROM USUARIOS
            """
        )
        professores, alunos = cursor.fetchone() or (0, 0)

        cursor.execute(
            """
            SELECT
                COUNT(*),
                SUM(CASE
                    WHEN EXTRACT(YEAR FROM CRIADO_EM) = EXTRACT(YEAR FROM CURRENT_DATE)
                     AND EXTRACT(MONTH FROM CRIADO_EM) = EXTRACT(MONTH FROM CURRENT_DATE)
                    THEN 1 ELSE 0
                END)
            FROM CURSOS
            WHERE EXCLUIDO = 0
            """
        )
        cursos_total, cursos_mes = cursor.fetchone() or (0, 0)

        cursor.execute(
            """
            SELECT
                COUNT(*),
                SUM(CASE
                    WHEN EXTRACT(YEAR FROM DATA_UPLOAD) = EXTRACT(YEAR FROM CURRENT_DATE)
                     AND EXTRACT(MONTH FROM DATA_UPLOAD) = EXTRACT(MONTH FROM CURRENT_DATE)
                    THEN 1 ELSE 0
                END)
            FROM VIDEOS
            WHERE EXCLUIDO = 0 AND STATUS = 1
            """
        )
        aulas_total, aulas_mes = cursor.fetchone() or (0, 0)

        return jsonify(
            {
                "metricas": {
                    "total_professores": professores or 0,
                    "professores_mes": 0,
                    "total_alunos": alunos or 0,
                    "alunos_mes": 0,
                    "aulas_publicadas": aulas_total or 0,
                    "aulas_mes": aulas_mes or 0,
                    "cursos": cursos_total or 0,
                    "cursos_mes": cursos_mes or 0,
                }
            }
        ), 200
    except Exception as erro:
        return resposta_mensagem(f"Erro ao carregar dashboard do administrador: {erro}", 500)
    finally:
        cursor.close()
        con.close()


@app.route("/usuarios/<int:id_usuario>/status", methods=["PATCH"])
@jwt_required()
def alterar_status_usuario(id_usuario):
    negado = exigir_admin()
    if negado:
        return negado

    dados = request.get_json() or {}
    bloqueado = bool(dados.get("bloqueado"))
    id_admin = int(get_jwt_identity())

    if id_usuario == id_admin:
        return resposta_mensagem("Voce nao pode bloquear sua propria conta.", 400)

    con = get_db()
    cursor = con.cursor()

    try:
        cursor.execute("SELECT 1 FROM USUARIOS WHERE ID_USUARIO = ?", (id_usuario,))
        if not cursor.fetchone():
            return resposta_mensagem("Usuario nao encontrado", 404)

        cursor.execute(
            "UPDATE USUARIOS SET SITUACAO = ? WHERE ID_USUARIO = ?",
            (1 if bloqueado else 0, id_usuario),
        )
        con.commit()

        mensagem = "Usuario bloqueado com sucesso" if bloqueado else "Usuario desbloqueado com sucesso"
        return resposta_mensagem(mensagem, 200, "sucesso")
    except Exception as erro:
        con.rollback()
        return resposta_mensagem(f"Erro ao atualizar status do usuario: {erro}", 500)
    finally:
        cursor.close()
        con.close()



@app.route("/usuarios/<int:id_usuario>", methods=["PUT"])
@jwt_required()
def editar_usuario_admin(id_usuario):
    negado = exigir_admin()
    if negado:
        return negado

    id_admin = int(get_jwt_identity())

    if id_usuario == id_admin:
        return resposta_mensagem("Edite sua propria conta pela pagina de perfil.", 400)

    dados = request.get_json() or {}
    nome_recebido = (dados.get("nome") or "").strip()
    email_recebido = (dados.get("email") or "").lower().strip()
    cpf_recebido = (dados.get("cpf") or "").strip()
    senha = dados.get("senha") or ""
    confirmar_senha = dados.get("confirmar_senha") or ""

    if nome_recebido and not nome_valido(nome_recebido):
        return resposta_mensagem("Informe um nome valido, usando apenas letras, espacos, hifens ou apostrofos.", 400)

    erro_senha = validar_campos_senha(senha, confirmar_senha, obrigatoria=False)
    if erro_senha:
        return resposta_mensagem(erro_senha, 400)

    con = get_db()
    cursor = con.cursor()

    try:
        cursor.execute(
            """
            SELECT NOME, EMAIL, CPF
            FROM USUARIOS
            WHERE ID_USUARIO = ?
            """,
            (id_usuario,),
        )
        usuario_atual = cursor.fetchone()

        if not usuario_atual:
            return resposta_mensagem("Usuario nao encontrado", 404)

        nome = nome_recebido or usuario_atual[0]
        email = email_recebido or usuario_atual[1]
        cpf = cpf_recebido or usuario_atual[2]

        if email_recebido and not email_valido(email):
            return resposta_mensagem("E-mail invalido", 400)
        if cpf_recebido and not cpf_valido(cpf):
            return resposta_mensagem("CPF invalido", 400)

        cursor.execute(
            "SELECT 1 FROM USUARIOS WHERE EMAIL = ? AND ID_USUARIO <> ?",
            (email, id_usuario),
        )
        if cursor.fetchone():
            return resposta_mensagem("E-mail ja cadastrado", 400)

        cursor.execute(
            "SELECT 1 FROM USUARIOS WHERE CPF = ? AND ID_USUARIO <> ?",
            (cpf, id_usuario),
        )
        if cursor.fetchone():
            return resposta_mensagem("CPF ja cadastrado", 400)

        if senha:
            cursor.execute(
                """
                UPDATE USUARIOS
                SET NOME = ?, EMAIL = ?, CPF = ?, SENHA = ?
                WHERE ID_USUARIO = ?
                """,
                (nome, email, cpf, generate_password_hash(senha), id_usuario),
            )
        else:
            cursor.execute(
                """
                UPDATE USUARIOS
                SET NOME = ?, EMAIL = ?, CPF = ?
                WHERE ID_USUARIO = ?
                """,
                (nome, email, cpf, id_usuario),
            )

        con.commit()
        return resposta_mensagem("Usuario atualizado com sucesso", 200, "sucesso")
    except Exception as erro:
        con.rollback()
        return resposta_mensagem(f"Erro ao editar usuario: {erro}", 500)
    finally:
        cursor.close()
        con.close()


@app.route("/cadastrar", methods=["POST"])
def cadastrar():
    dados = request.get_json() or {}
    nome = (dados.get("nome") or "").strip()
    email = (dados.get("email") or "").lower().strip()
    cpf = (dados.get("cpf") or "").strip()
    senha = dados.get("senha") or ""
    confirmar_senha = dados.get("confirmar_senha") or ""

    erro = validar_dados_usuario(nome, email, cpf)
    if erro:
        return resposta_mensagem(erro, 400)

    erro_senha = validar_campos_senha(senha, confirmar_senha)
    if erro_senha:
        return resposta_mensagem(erro_senha, 400)

    con = get_db()
    cursor = con.cursor()

    try:
        cursor.execute("SELECT 1 FROM USUARIOS WHERE EMAIL = ?", (email,))
        if cursor.fetchone():
            return resposta_mensagem("E-mail ja cadastrado", 400)

        cursor.execute("SELECT 1 FROM USUARIOS WHERE CPF = ?", (cpf,))
        if cursor.fetchone():
            return resposta_mensagem("CPF ja cadastrado", 400)

        cursor.execute(
            """
            INSERT INTO USUARIOS (NOME, EMAIL, CPF, SENHA, TIPO_USUARIO, SITUACAO, TENTATIVAS)
            VALUES (?, ?, ?, ?, 2, 0, 0)
            RETURNING ID_USUARIO
            """,
            (nome, email, cpf, generate_password_hash(senha)),
        )
        id_usuario = cursor.fetchone()[0]
        con.commit()

        return resposta_mensagem("Aluno cadastrado com sucesso", 201, "sucesso", id_usuario=id_usuario)
    except Exception as erro:
        con.rollback()
        return resposta_mensagem(f"Erro ao cadastrar usuario: {erro}", 500)
    finally:
        cursor.close()
        con.close()


@app.route("/login", methods=["POST"])
def login():
    dados = request.get_json() or {}
    email = (dados.get("email") or "").lower().strip()
    senha = dados.get("senha") or ""

    if not email or not senha:
        return resposta_mensagem("E-mail e senha sao obrigatorios", 400)

    con = get_db()
    cursor = con.cursor()

    try:
        cursor.execute(
            """
            SELECT ID_USUARIO, NOME, EMAIL, SENHA, TIPO_USUARIO, SITUACAO, TENTATIVAS, CPF
            FROM USUARIOS
            WHERE EMAIL = ?
            """,
            (email,),
        )
        usuario = cursor.fetchone()

        if not usuario:
            return resposta_mensagem("E-mail ou senha invalida", 401)

        id_usuario, nome_usuario, email_usuario, senha_banco, tipo, situacao, tentativa, cpf = usuario
        tentativa = tentativa or 0

        if situacao == 1:
            return resposta_mensagem("Usuario bloqueado. Entre em contato com o suporte.", 403)

        if not check_password_hash(senha_banco, senha):
            nova_tentativa = tentativa + 1

            if nova_tentativa >= 3 and tipo != 0:
                cursor.execute(
                    "UPDATE USUARIOS SET SITUACAO = 1, TENTATIVAS = ? WHERE ID_USUARIO = ?",
                    (nova_tentativa, id_usuario),
                )
                con.commit()
                return resposta_mensagem("Usuario bloqueado por excesso de tentativas invalidas.", 403)

            cursor.execute(
                "UPDATE USUARIOS SET TENTATIVAS = ? WHERE ID_USUARIO = ?",
                (nova_tentativa, id_usuario),
            )
            con.commit()
            return resposta_mensagem("E-mail ou senha invalida", 401)

        cursor.execute("UPDATE USUARIOS SET TENTATIVAS = 0 WHERE ID_USUARIO = ?", (id_usuario,))
        con.commit()

        token = create_access_token(identity=str(id_usuario), additional_claims={"tipo": tipo})
        resposta = make_response(
            jsonify(
                {
                    "mensagem": criar_mensagem("Login realizado com sucesso", "sucesso"),
                    "usuario": {
                        "id_usuario": id_usuario,
                        "nome": nome_usuario,
                        "email": email_usuario,
                        "cpf": cpf,
                    },
                    "token": token,
                }
            ),
            200,
        )
        set_access_cookies(resposta, token)
        return resposta
    except Exception as erro:
        return resposta_mensagem(f"Erro no login: {erro}", 500)
    finally:
        cursor.close()
        con.close()


@app.route("/perfil", methods=["GET"])
@jwt_required()
def buscar_perfil():
    id_usuario = get_jwt_identity()
    con = get_db()
    cursor = con.cursor()

    try:
        cursor.execute(
            """
            SELECT ID_USUARIO, NOME, EMAIL, CPF, TIPO_USUARIO
            FROM USUARIOS
            WHERE ID_USUARIO = ?
            """,
            (id_usuario,),
        )
        usuario = cursor.fetchone()

        if not usuario:
            return resposta_mensagem("Usuario nao encontrado", 404)

        return jsonify(
            {
                "id_usuario": usuario[0],
                "nome": usuario[1],
                "email": usuario[2],
                "cpf": usuario[3],
                "tipo": usuario[4],
            }
        ), 200
    except Exception as erro:
        return resposta_mensagem(f"Erro ao buscar perfil: {erro}", 500)
    finally:
        cursor.close()
        con.close()


@app.route("/perfil", methods=["PUT"])
@jwt_required()
def editar_perfil():
    id_usuario = get_jwt_identity()
    dados = request.get_json() or {}
    nome_recebido = (dados.get("nome") or "").strip()
    email_recebido = (dados.get("email") or "").lower().strip()
    cpf_recebido = (dados.get("cpf") or "").strip()
    senha = dados.get("senha") or ""
    confirmar_senha = dados.get("confirmar_senha") or ""

    if nome_recebido and not nome_valido(nome_recebido):
        return resposta_mensagem("Informe um nome valido, usando apenas letras, espacos, hifens ou apostrofos.", 400)

    erro_senha = validar_campos_senha(senha, confirmar_senha, obrigatoria=False)
    if erro_senha:
        return resposta_mensagem(erro_senha, 400)

    con = get_db()
    cursor = con.cursor()

    try:
        cursor.execute(
            """
            SELECT NOME, EMAIL, CPF
            FROM USUARIOS
            WHERE ID_USUARIO = ?
            """,
            (id_usuario,),
        )
        usuario_atual = cursor.fetchone()

        if not usuario_atual:
            return resposta_mensagem("Usuario nao encontrado", 404)

        nome = nome_recebido or usuario_atual[0]
        email = email_recebido or usuario_atual[1]
        cpf = cpf_recebido or usuario_atual[2]

        if email_recebido and not email_valido(email):
            return resposta_mensagem("E-mail invalido", 400)
        if cpf_recebido and not cpf_valido(cpf):
            return resposta_mensagem("CPF invalido", 400)

        cursor.execute(
            "SELECT 1 FROM USUARIOS WHERE EMAIL = ? AND ID_USUARIO <> ?",
            (email, id_usuario),
        )
        if cursor.fetchone():
            return resposta_mensagem("E-mail ja cadastrado", 400)

        cursor.execute(
            "SELECT 1 FROM USUARIOS WHERE CPF = ? AND ID_USUARIO <> ?",
            (cpf, id_usuario),
        )
        if cursor.fetchone():
            return resposta_mensagem("CPF ja cadastrado", 400)

        if senha:
            cursor.execute(
                """
                UPDATE USUARIOS
                SET NOME = ?, EMAIL = ?, CPF = ?, SENHA = ?
                WHERE ID_USUARIO = ?
                """,
                (nome, email, cpf, generate_password_hash(senha), id_usuario),
            )
        else:
            cursor.execute(
                """
                UPDATE USUARIOS
                SET NOME = ?, EMAIL = ?, CPF = ?
                WHERE ID_USUARIO = ?
                """,
                (nome, email, cpf, id_usuario),
            )

        con.commit()

        return resposta_mensagem(
            "Perfil atualizado com sucesso",
            200,
            "sucesso",
            usuario={
                "id_usuario": id_usuario,
                "nome": nome,
                "email": email,
                "cpf": cpf,
                "tipo": get_jwt().get("tipo"),
            },
        )
    except Exception as erro:
        con.rollback()
        return resposta_mensagem(f"Erro ao atualizar perfil: {erro}", 500)
    finally:
        cursor.close()
        con.close()


@app.route("/cadastrar_colaborador", methods=["POST"])
@jwt_required()
def cadastrar_colaborador():
    claims = get_jwt()
    if int(claims.get("tipo", -1)) != 0:
        return resposta_mensagem("Acesso negado. Apenas administradores podem cadastrar colaboradores.", 403)

    dados = request.get_json() or {}
    nome = (dados.get("nome") or "").strip()
    email = (dados.get("email") or "").lower().strip()
    cpf = (dados.get("cpf") or "").strip()
    senha = dados.get("senha") or ""
    confirmar_senha = dados.get("confirmar_senha") or ""
    tipo = dados.get("tipo")

    erro = validar_dados_usuario(nome, email, cpf)
    if erro:
        return resposta_mensagem(erro, 400)

    erro_senha = validar_campos_senha(senha, confirmar_senha)
    if erro_senha:
        return resposta_mensagem(erro_senha, 400)

    try:
        tipo = int(tipo)
    except (TypeError, ValueError):
        return resposta_mensagem("O campo tipo e obrigatorio.", 400)

    if tipo not in [0, 1]:
        return resposta_mensagem("Tipo invalido de usuario.", 400)

    con = get_db()
    cursor = con.cursor()

    try:
        cursor.execute("SELECT 1 FROM USUARIOS WHERE EMAIL = ?", (email,))
        if cursor.fetchone():
            return resposta_mensagem("E-mail ja cadastrado", 400)

        cursor.execute("SELECT 1 FROM USUARIOS WHERE CPF = ?", (cpf,))
        if cursor.fetchone():
            return resposta_mensagem("CPF ja cadastrado", 400)

        cursor.execute(
            """
            INSERT INTO USUARIOS (NOME, EMAIL, CPF, SENHA, TIPO_USUARIO, SITUACAO, TENTATIVAS)
            VALUES (?, ?, ?, ?, ?, 0, 0)
            RETURNING ID_USUARIO
            """,
            (nome, email, cpf, generate_password_hash(senha), tipo),
        )
        id_usuario = cursor.fetchone()[0]
        con.commit()

        cargo = "Administrador" if tipo == 0 else "Professor"
        return resposta_mensagem(f"{cargo} cadastrado com sucesso", 201, "sucesso", id_usuario=id_usuario)
    except Exception as erro:
        con.rollback()
        return resposta_mensagem(f"Erro ao cadastrar colaborador: {erro}", 500)
    finally:
        cursor.close()
        con.close()


@app.route("/logout", methods=["POST"])
def logout():
    resposta = make_response(
        jsonify({"mensagem": criar_mensagem("Logout realizado com sucesso", "sucesso")}),
        200,
    )
    unset_jwt_cookies(resposta)
    return resposta


@app.route("/esqueci_minha_senha", methods=["POST"])
def esqueci_minha_senha():
    dados = request.get_json() or {}
    destinatario = (dados.get("email") or "").lower().strip()

    if not destinatario:
        return resposta_mensagem("E-mail e obrigatorio", 400)
    if not email_valido(destinatario):
        return resposta_mensagem("E-mail invalido", 400)

    try:
        mensagem, tipo = email_verificacao(
            destinatario,
            "Recuperacao de senha",
            "Seu codigo para recuperar sua senha e",
        )
        status = 200 if tipo == "sucesso" else 404
        return resposta_mensagem(mensagem, status, tipo)
    except Exception as erro:
        return resposta_mensagem(f"Erro ao enviar e-mail de recuperacao: {erro}", 500)


@app.route("/alterar_senha", methods=["POST"])
def alterar_senha():
    dados = request.get_json() or {}
    email = (dados.get("email") or "").lower().strip()
    codigo = dados.get("codigo")
    nova_senha = dados.get("nova_senha") or ""
    confirmar_nova_senha = dados.get("confirmar_nova_senha") or ""

    if not email:
        return resposta_mensagem("E-mail e obrigatorio", 400)
    if not email_valido(email):
        return resposta_mensagem("E-mail invalido", 400)
    if not codigo:
        return resposta_mensagem("Codigo e obrigatorio", 400)

    con = get_db()
    cursor = con.cursor()

    try:
        cursor.execute("SELECT ID_USUARIO FROM USUARIOS WHERE EMAIL = ?", (email,))
        usuario = cursor.fetchone()
        if not usuario:
            return resposta_mensagem("E-mail nao encontrado", 404)

        sucesso, mensagem = verificar_codigo(email, codigo)
        if not sucesso:
            return resposta_mensagem(mensagem, 400)

        if not nova_senha and not confirmar_nova_senha:
            return resposta_mensagem("Codigo valido", 200, "sucesso")

        erro_senha = validar_campos_senha(nova_senha, confirmar_nova_senha)
        if erro_senha:
            return resposta_mensagem(erro_senha, 400)

        cursor.execute(
            "UPDATE USUARIOS SET SENHA = ?, CODIGO = NULL WHERE ID_USUARIO = ?",
            (generate_password_hash(nova_senha), usuario[0]),
        )
        con.commit()

        return resposta_mensagem("Senha alterada com sucesso", 200, "sucesso")
    except Exception as erro:
        con.rollback()
        return resposta_mensagem(f"Erro ao alterar senha: {erro}", 500)
    finally:
        cursor.close()
        con.close()


@app.route("/pagamentos/pix", methods=["POST"])
@jwt_required()
def criar_pagamento_pix():
    try:
        dados = request.get_json() or {}

        valor = dados.get("valor")

        if valor is None:
            return jsonify({
                "mensagem": "Valor do pagamento é obrigatório"
            }), 400

        valor = float(valor)

        if valor <= 0:
            return jsonify({
                "mensagem": "Valor do pagamento deve ser maior que zero"
            }), 400

        cobranca = criar_cobranca_pix(valor)

        return jsonify({
            "id_cobranca": cobranca["id_cobranca"],
            "valor": cobranca["valor"],
            "codigo_pagamento": cobranca["codigo_pagamento"],
            "status": cobranca["status"],
            "tipo_cobranca": cobranca["tipo_cobranca"],
        }), 201

    except requests.RequestException as erro:
        return jsonify({
            "mensagem": "Não foi possível comunicar com a Arkhé",
            "detalhes": str(erro)
        }), 502

    except Exception as erro:
        return jsonify({
            "mensagem": str(erro)
        }), 500


@app.route("/assinaturas/pix", methods=["POST"])
@jwt_required()
def criar_pix_assinatura():
    con = get_db()
    cursor = con.cursor()

    try:
        id_usuario = get_jwt_identity()

        # Verifica se o usuário já possui uma assinatura ativa
        cursor.execute(
            """
            SELECT ID_ASSINATURA
            FROM ASSINATURAS
            WHERE ID_USUARIO = ?
              AND STATUS = 1
            """,
            (id_usuario,)
        )

        if cursor.fetchone():
            return jsonify({
                "mensagem": "Usuário já possui uma assinatura ativa"
            }), 409

        # Valor único da assinatura
        valor = current_app.config["VALOR_ASSINATURA"]

        # Cria cobrança na Arkhé
        cobranca = criar_cobranca_pix(valor)

        # Cria a assinatura como pendente
        cursor.execute(
            """
            INSERT INTO ASSINATURAS (
                ID_USUARIO,
                STATUS,
                PLANO,
                ID_COBRANCA_ARKHE
            )
            VALUES (?, ?, ?, ?)
            RETURNING ID_ASSINATURA
            """,
            (
                id_usuario,
                0,
                1,
                cobranca["id_cobranca"]
            )
        )

        id_assinatura = cursor.fetchone()[0]

        con.commit()

        return jsonify({
            "id_assinatura": id_assinatura,
            "id_cobranca": cobranca["id_cobranca"],
            "valor": cobranca["valor"],
            "codigo_pagamento": cobranca["codigo_pagamento"],
            "status": cobranca["status"],
            "tipo_cobranca": cobranca["tipo_cobranca"]
        }), 201

    except requests.RequestException as erro:
        con.rollback()

        return jsonify({
            "mensagem": "Não foi possível comunicar com a Arkhé",
            "detalhes": str(erro)
        }), 502

    except Exception as erro:
        con.rollback()

        return jsonify({
            "mensagem": str(erro)
        }), 500

    finally:
        cursor.close()
        con.close()



@app.route("/assinaturas/verificar", methods=["GET"])
@jwt_required()
def verificar_pagamento_assinatura():
    con = get_db()
    cursor = con.cursor()

    try:
        id_usuario = get_jwt_identity()

        # Procura a assinatura pendente mais recente do usuário
        cursor.execute(
            """
            SELECT
                ID_ASSINATURA,
                ID_COBRANCA_ARKHE,
                STATUS,
                DATA_INICIO,
                DATA_EXPIRACAO
            FROM ASSINATURAS
            WHERE ID_USUARIO = ?
            ORDER BY ID_ASSINATURA DESC
            """,
            (id_usuario,)
        )

        assinatura = cursor.fetchone()

        if not assinatura:
            return jsonify({
                "assinatura": False,
                "status": "sem_assinatura",
                "mensagem": "Usuário não possui assinatura."
            }), 403

        (
            id_assinatura,
            id_cobranca,
            status,
            data_inicio,
            data_expiracao
        ) = assinatura

        # Já existe uma assinatura ativa
        if status == 1:
            agora = datetime.now()

            # Verifica se ela ainda está dentro da validade
            if data_expiracao and data_expiracao >= agora:
                return jsonify({
                    "assinatura": True,
                    "status": "ativa",
                    "id_assinatura": id_assinatura,
                    "data_inicio": data_inicio.isoformat(),
                    "data_expiracao": data_expiracao.isoformat()
                }), 200

            # Assinatura expirou
            cursor.execute(
                """
                UPDATE ASSINATURAS
                SET STATUS = 3
                WHERE ID_ASSINATURA = ?
                """,
                (id_assinatura,)
            )

            con.commit()

            return jsonify({
                "assinatura": False,
                "status": "expirada",
                "mensagem": "A assinatura do usuário expirou."
            }), 403

        # Se não houver cobrança vinculada, não há como verificar o pagamento
        if not id_cobranca:
            return jsonify({
                "assinatura": False,
                "status": "pendente",
                "mensagem": "Assinatura aguardando pagamento."
            }), 403

        # Consulta o status atual da cobrança na Arkhé
        cobranca = consultar_cobranca_pix(id_cobranca)

        status_cobranca = cobranca["status"]

        # Pagamento confirmado
        if status_cobranca == 1:
            agora = datetime.now()
            data_expiracao = agora + timedelta(days=30)

            cursor.execute(
                """
                UPDATE ASSINATURAS
                SET
                    STATUS = 1,
                    DATA_INICIO = ?,
                    DATA_EXPIRACAO = ?
                WHERE ID_ASSINATURA = ?
                """,
                (
                    agora,
                    data_expiracao,
                    id_assinatura
                )
            )

            con.commit()

            return jsonify({
                "assinatura": True,
                "status": "ativa",
                "id_assinatura": id_assinatura,
                "data_inicio": agora.isoformat(),
                "data_expiracao": data_expiracao.isoformat()
            }), 200

        # Ainda não foi pago
        return jsonify({
            "assinatura": False,
            "status": "pendente",
            "id_assinatura": id_assinatura,
            "id_cobranca": id_cobranca,
            "status_cobranca": status_cobranca,
            "mensagem": "Pagamento ainda não confirmado."
        }), 403

    except requests.RequestException as erro:
        con.rollback()

        return jsonify({
            "assinatura": False,
            "mensagem": "Não foi possível verificar o pagamento.",
            "detalhes": str(erro)
        }), 502

    except Exception as erro:
        con.rollback()

        return jsonify({
            "assinatura": False,
            "mensagem": str(erro)
        }), 500

    finally:
        cursor.close()
        con.close()