import os
import re
import unicodedata
from uuid import uuid4
from decimal import Decimal, InvalidOperation

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
from werkzeug.utils import secure_filename

from servicos.arkhe import ArkheError, criar_cobranca_pix, consultar_cobranca_pix


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


def salvar_imagem_perfil(arquivo):
    if not arquivo or not arquivo.filename:
        return None

    extensao = arquivo.filename.rsplit(".", 1)[-1].lower() if "." in arquivo.filename else ""
    if extensao not in {"jpg", "jpeg", "png", "webp"}:
        raise ValueError("Imagem invalida. Use: jpg, jpeg, png ou webp.")

    pasta = os.path.join(current_app.root_path, "static", "uploads", "perfis")
    os.makedirs(pasta, exist_ok=True)

    nome_seguro = secure_filename(arquivo.filename)
    nome_final = f"{uuid4().hex}_{nome_seguro}"
    caminho = os.path.join(pasta, nome_final)
    arquivo.save(caminho)

    return f"/static/uploads/perfis/{nome_final}"


def email_valido(email):
    return re.fullmatch(
        r"[^\s@]+@[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?)+",
        email or "",
    ) is not None


def normalizar_email(email):
    # Um ponto final costuma ser incluído por engano ao colar/digitar o endereço.
    return (email or "").strip().lower().rstrip(".")


def cpf_valido(cpf):
    digitos = re.sub(r"\D", "", cpf or "")
    if len(digitos) != 11 or len(set(digitos)) == 1:
        return False

    def calcular_digito(base, pesos):
        resto = sum(int(numero) * peso for numero, peso in zip(base, pesos)) % 11
        return "0" if resto < 2 else str(11 - resto)

    primeiro = calcular_digito(digitos[:9], range(10, 1, -1))
    segundo = calcular_digito(digitos[:9] + primeiro, range(11, 1, -1))
    return digitos[-2:] == primeiro + segundo


def garantir_coluna_email_verificado(cursor, con):
    cursor.execute("""
        SELECT 1 FROM RDB$RELATION_FIELDS
        WHERE RDB$RELATION_NAME = 'USUARIOS'
          AND RDB$FIELD_NAME = 'EMAIL_VERIFICADO'
    """)
    if not cursor.fetchone():
        cursor.execute(
            "ALTER TABLE USUARIOS ADD EMAIL_VERIFICADO SMALLINT DEFAULT 1 NOT NULL"
        )
        con.commit()


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
    return "A senha deve ter no minimo 8 caracteres, com letra maiuscula, letra minuscula, numero e caractere especial."


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


# Lista usuários para a tela administrativa; exigir_admin restringe o acesso ao perfil 0.
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


# Agrega os totais usados nos indicadores do dashboard administrativo.
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
                    # Indicadores mensais de cadastro ainda não são calculados.
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


# Atualiza o bloqueio da conta e impede que o administrador bloqueie a própria sessão.
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



# Edita os dados cadastrais e troca a senha somente quando uma nova senha é enviada.
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
    email_recebido = normalizar_email(dados.get("email"))
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


# Sprint item 1: endpoint compartilhado pelo site e aplicativo para criar cadastro de aluno pendente de e-mail.
@app.route("/cadastrar", methods=["POST"])
def cadastrar():
    dados = request.get_json() or {}
    nome = (dados.get("nome") or "").strip()
    email = normalizar_email(dados.get("email"))
    cpf = re.sub(r"\D", "", dados.get("cpf") or "")
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
        garantir_coluna_email_verificado(cursor, con)
        cursor.execute("SELECT 1 FROM USUARIOS WHERE EMAIL = ?", (email,))
        if cursor.fetchone():
            return resposta_mensagem("E-mail ja cadastrado", 400)

        cursor.execute("SELECT 1 FROM USUARIOS WHERE CPF = ?", (cpf,))
        if cursor.fetchone():
            return resposta_mensagem("CPF ja cadastrado", 400)

        cursor.execute(
            """
            INSERT INTO USUARIOS (NOME, EMAIL, CPF, SENHA, TIPO_USUARIO, SITUACAO, TENTATIVAS, EMAIL_VERIFICADO)
            VALUES (?, ?, ?, ?, 2, 0, 0, 0)
            RETURNING ID_USUARIO
            """,
            (nome, email, cpf, generate_password_hash(senha)),
        )
        id_usuario = cursor.fetchone()[0]
        con.commit()

        mensagem, tipo_envio = email_verificacao(
            email,
            "Seu codigo de confirmacao | Cursando",
            "Seu codigo de confirmacao de e-mail e:",
            "Digite este codigo no aplicativo ou site para concluir seu cadastro.",
        )
        return resposta_mensagem(
            "Cadastro iniciado. Enviamos um codigo de verificacao para seu e-mail."
            if tipo_envio == "sucesso"
            else "Cadastro iniciado, mas o codigo nao foi enviado. Toque em Reenviar codigo depois de configurar o envio de e-mail.",
            201,
            "sucesso",
            id_usuario=id_usuario,
            email=email,
            codigo_enviado=tipo_envio == "sucesso",
        )
    except Exception as erro:
        con.rollback()
        return resposta_mensagem(f"Erro ao cadastrar usuario: {erro}", 500)
    finally:
        cursor.close()
        con.close()


@app.route("/login", methods=["POST"])
def login():
    dados = request.get_json() or {}
    email = normalizar_email(dados.get("email"))
    senha = dados.get("senha") or ""

    if not email or not senha:
        return resposta_mensagem("E-mail e senha sao obrigatorios", 400)

    con = get_db()
    cursor = con.cursor()

    try:
        garantir_coluna_email_verificado(cursor, con)
        if garantir_coluna_imagem_perfil(cursor):
            con.commit()

        cursor.execute(
            """
            SELECT ID_USUARIO, NOME, EMAIL, SENHA, TIPO_USUARIO, SITUACAO, TENTATIVAS, CPF, EMAIL_VERIFICADO, IMAGEM_PERFIL
            FROM USUARIOS
            WHERE EMAIL = ?
            """,
            (email,),
        )
        usuario = cursor.fetchone()

        if not usuario:
            return resposta_mensagem("E-mail ou senha invalida", 401)

        id_usuario, nome_usuario, email_usuario, senha_banco, tipo, situacao, tentativa, cpf, email_verificado, imagem_perfil = usuario
        tentativa = tentativa or 0

        if situacao == 1:
            return resposta_mensagem("Usuario bloqueado. Entre em contato com o suporte.", 403)

        if not email_verificado:
            return resposta_mensagem("Verifique seu e-mail usando o codigo enviado para concluir o cadastro.", 403)

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

        duracao_token = (
            current_app.config["JWT_ADMIN_ACCESS_TOKEN_EXPIRES"]
            if int(tipo) == 0
            else current_app.config["JWT_ACCESS_TOKEN_EXPIRES"]
        )
        token = create_access_token(
            identity=str(id_usuario),
            expires_delta=duracao_token,
            additional_claims={"tipo": tipo},
        )
        redirecionar = None

        if int(tipo) == 2:
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

            # Alunos sem nenhuma assinatura ativa precisam concluir o pagamento.
            # Isso cobre tanto quem ainda não possui mensalidade quanto quem
            # possui apenas mensalidades pendentes ou expiradas.
            if int(assinaturas_ativas or 0) == 0:
                redirecionar = "/assinatura"

        resposta = make_response(
            jsonify(
                {
                    "mensagem": criar_mensagem("Login realizado com sucesso", "sucesso"),
                    "usuario": {
                        "id_usuario": id_usuario,
                        "nome": nome_usuario,
                        "email": email_usuario,
                        "cpf": cpf,
                        "imagem_perfil": imagem_perfil,
                    },
                    "token": token,
                    "redirecionar": redirecionar,
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


# Sprint item 1: valida o código do cadastro e devolve a sessão para o app seguir à etapa de pagamento.
@app.route("/verificar_email_cadastro", methods=["POST"])
def verificar_email_cadastro():
    dados = request.get_json() or {}
    email = normalizar_email(dados.get("email"))
    codigo = str(dados.get("codigo") or "").strip()
    if not email_valido(email) or not re.fullmatch(r"\d{6}", codigo):
        return resposta_mensagem("Informe um e-mail e um codigo valido de 6 digitos.", 400)

    con = get_db()
    cursor = con.cursor()
    try:
        garantir_coluna_email_verificado(cursor, con)
        cursor.execute(
            "SELECT ID_USUARIO, NOME, EMAIL, CPF, TIPO_USUARIO, SITUACAO, EMAIL_VERIFICADO, CODIGO FROM USUARIOS WHERE EMAIL = ?",
            (email,),
        )
        usuario = cursor.fetchone()
        if not usuario:
            cursor.execute(
                "SELECT ID_USUARIO, NOME, EMAIL, CPF, TIPO_USUARIO, SITUACAO, EMAIL_VERIFICADO, CODIGO FROM USUARIOS WHERE EMAIL = ?",
                (email + ".",),
            )
            usuario = cursor.fetchone()
        if not usuario:
            return resposta_mensagem("Cadastro nao encontrado para este e-mail.", 404)
        id_usuario, nome, email, cpf, tipo, situacao, email_verificado, codigo_real = usuario
        if situacao == 1:
            return resposta_mensagem("Usuario bloqueado. Entre em contato com o suporte.", 403)
        if email_verificado:
            return resposta_mensagem("Este e-mail ja foi verificado.", 400)
        if str(codigo_real) != codigo:
            return resposta_mensagem("Codigo de verificacao invalido.", 400)

        cursor.execute(
            "UPDATE USUARIOS SET EMAIL = ?, EMAIL_VERIFICADO = 1, CODIGO = NULL WHERE ID_USUARIO = ?",
            (normalizar_email(email), id_usuario),
        )
        con.commit()
        duracao_token = current_app.config["JWT_ACCESS_TOKEN_EXPIRES"]
        token = create_access_token(
            identity=str(id_usuario),
            expires_delta=duracao_token,
            additional_claims={"tipo": tipo},
        )
        resposta = make_response(jsonify({
            "mensagem": criar_mensagem("E-mail verificado com sucesso", "sucesso"),
            "usuario": {"id_usuario": id_usuario, "nome": nome, "email": email, "cpf": cpf, "tipo": tipo},
            "token": token,
        }), 200)
        set_access_cookies(resposta, token)
        return resposta
    except Exception as erro:
        con.rollback()
        return resposta_mensagem(f"Erro ao verificar e-mail: {erro}", 500)
    finally:
        cursor.close()
        con.close()


# Sprint item 1: permite ao site e aplicativo pedir outro código para o cadastro pendente.
@app.route("/reenviar_codigo_cadastro", methods=["POST"])
def reenviar_codigo_cadastro():
    dados = request.get_json() or {}
    email = normalizar_email(dados.get("email"))
    if not email_valido(email):
        return resposta_mensagem("Informe um e-mail valido.", 400)

    con = get_db()
    cursor = con.cursor()
    try:
        garantir_coluna_email_verificado(cursor, con)
        cursor.execute("SELECT EMAIL_VERIFICADO FROM USUARIOS WHERE EMAIL = ?", (email,))
        usuario = cursor.fetchone()
        if not usuario:
            cursor.execute("SELECT EMAIL_VERIFICADO FROM USUARIOS WHERE EMAIL = ?", (email + ".",))
            usuario = cursor.fetchone()
        if not usuario or usuario[0]:
            return resposta_mensagem("Nao ha cadastro pendente de verificacao para este e-mail.", 404)
        cursor.execute("UPDATE USUARIOS SET EMAIL = ? WHERE EMAIL = ?", (email, email + "."))
        con.commit()
    finally:
        cursor.close()
        con.close()

    mensagem, tipo_envio = email_verificacao(
        email,
        "Seu novo codigo de confirmacao | Cursando",
        "Seu novo codigo de confirmacao de e-mail e:",
        "Digite este codigo no aplicativo ou site para concluir seu cadastro.",
    )
    return resposta_mensagem(mensagem, 200 if tipo_envio == "sucesso" else 503, tipo_envio)


# Sprint item 1: corrige o endereço do cadastro pendente nos dois clientes e dispara nova verificação.
@app.route("/corrigir_email_cadastro", methods=["POST"])
def corrigir_email_cadastro():
    dados = request.get_json() or {}
    email_atual = (dados.get("email_atual") or "").lower().strip()
    novo_email = normalizar_email(dados.get("novo_email"))
    senha = dados.get("senha") or ""
    if not email_valido(normalizar_email(email_atual)) or not email_valido(novo_email) or not senha:
        return resposta_mensagem("Informe o e-mail atual, o novo e-mail e a senha do cadastro.", 400)
    if email_atual == novo_email:
        return resposta_mensagem("O novo e-mail deve ser diferente do atual.", 400)

    con = get_db()
    cursor = con.cursor()
    try:
        garantir_coluna_email_verificado(cursor, con)
        cursor.execute(
            "SELECT ID_USUARIO, SENHA, EMAIL_VERIFICADO FROM USUARIOS WHERE EMAIL = ?",
            (email_atual,),
        )
        usuario = cursor.fetchone()
        if not usuario and normalizar_email(email_atual) != email_atual:
            cursor.execute(
                "SELECT ID_USUARIO, SENHA, EMAIL_VERIFICADO FROM USUARIOS WHERE EMAIL = ?",
                (normalizar_email(email_atual),),
            )
            usuario = cursor.fetchone()
        if not usuario:
            cursor.execute(
                "SELECT ID_USUARIO, SENHA, EMAIL_VERIFICADO FROM USUARIOS WHERE EMAIL = ?",
                (normalizar_email(email_atual) + ".",),
            )
            usuario = cursor.fetchone()
        if not usuario or usuario[2]:
            return resposta_mensagem("Cadastro pendente nao encontrado.", 404)
        if not check_password_hash(usuario[1], senha):
            return resposta_mensagem("Senha do cadastro incorreta.", 401)

        cursor.execute("SELECT 1 FROM USUARIOS WHERE EMAIL = ?", (novo_email,))
        if cursor.fetchone():
            return resposta_mensagem("O novo e-mail ja esta cadastrado.", 400)

        cursor.execute(
            "UPDATE USUARIOS SET EMAIL = ?, CODIGO = NULL WHERE ID_USUARIO = ?",
            (novo_email, usuario[0]),
        )
        con.commit()
    except Exception as erro:
        con.rollback()
        return resposta_mensagem(f"Erro ao corrigir e-mail: {erro}", 500)
    finally:
        cursor.close()
        con.close()

    mensagem, tipo_envio = email_verificacao(
        novo_email,
        "Verificacao de e-mail",
        "Seu codigo para verificar seu e-mail e",
        "Digite este codigo no aplicativo ou site para concluir seu cadastro.",
    )
    return resposta_mensagem(
        mensagem,
        200,
        tipo_envio,
        email=novo_email,
        codigo_enviado=tipo_envio == "sucesso",
    )


@app.route("/perfil", methods=["GET"])
@jwt_required()
def buscar_perfil():
    id_usuario = get_jwt_identity()
    con = get_db()
    cursor = con.cursor()

    try:
        if garantir_coluna_imagem_perfil(cursor):
            con.commit()

        cursor.execute(
            """
            SELECT ID_USUARIO, NOME, EMAIL, CPF, TIPO_USUARIO, IMAGEM_PERFIL
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
                "imagem_perfil": usuario[5],
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
    if request.content_type and request.content_type.startswith("multipart/form-data"):
        dados = request.form
    else:
        dados = request.get_json() or {}
    nome_recebido = (dados.get("nome") or "").strip()
    email_recebido = normalizar_email(dados.get("email"))
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
        if garantir_coluna_imagem_perfil(cursor):
            con.commit()

        cursor.execute(
            """
            SELECT NOME, EMAIL, CPF, IMAGEM_PERFIL
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
        imagem_perfil = usuario_atual[3]

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

        arquivo_imagem = request.files.get("imagem_perfil") or request.files.get("imagem")
        if arquivo_imagem and arquivo_imagem.filename:
            try:
                imagem_perfil = salvar_imagem_perfil(arquivo_imagem)
            except ValueError as erro:
                return resposta_mensagem(str(erro), 400)

        if senha:
            cursor.execute(
                """
                UPDATE USUARIOS
                SET NOME = ?, EMAIL = ?, CPF = ?, SENHA = ?, IMAGEM_PERFIL = ?
                WHERE ID_USUARIO = ?
                """,
                (nome, email, cpf, generate_password_hash(senha), imagem_perfil, id_usuario),
            )
        else:
            cursor.execute(
                """
                UPDATE USUARIOS
                SET NOME = ?, EMAIL = ?, CPF = ?, IMAGEM_PERFIL = ?
                WHERE ID_USUARIO = ?
                """,
                (nome, email, cpf, imagem_perfil, id_usuario),
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
                "imagem_perfil": imagem_perfil,
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
    email = normalizar_email(dados.get("email"))
    cpf = re.sub(r"\D", "", dados.get("cpf") or "")
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
    destinatario = normalizar_email(dados.get("email"))

    if not destinatario:
        return resposta_mensagem("E-mail e obrigatorio", 400)
    if not email_valido(destinatario):
        return resposta_mensagem("E-mail invalido", 400)

    try:
        mensagem, tipo = email_verificacao(
            destinatario,
            "Codigo para redefinir sua senha | Cursando",
            "Seu codigo para redefinir a senha e:",
        )
        status = 200 if tipo == "sucesso" else 404
        return resposta_mensagem(mensagem, status, tipo)
    except Exception as erro:
        return resposta_mensagem(f"Erro ao enviar e-mail de recuperacao: {erro}", 500)


@app.route("/alterar_senha", methods=["POST"])
def alterar_senha():
    dados = request.get_json() or {}
    email = normalizar_email(dados.get("email"))
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
        # Esta rota gera uma cobrança avulsa; diferente da rota de assinatura,
        # ela não grava uma assinatura no banco.
        dados = request.get_json() or {}

        valor_recebido = dados.get("valor")

        if valor_recebido is None:
            return jsonify({
                "mensagem": "Valor do pagamento é obrigatório"
            }), 400

        # Sprint item 1: rejeita valores PIX inválidos antes de chamar a Arkhé.
        try:
            valor_decimal = Decimal(str(valor_recebido))
            if not valor_decimal.is_finite():
                raise InvalidOperation
            valor_centavos = valor_decimal.quantize(Decimal("0.01"))
        except (InvalidOperation, TypeError, ValueError):
            return jsonify({
                "mensagem": "Valor do pagamento deve ser um número válido com até duas casas decimais"
            }), 400

        if valor_decimal <= 0:
            return jsonify({
                "mensagem": "Valor do pagamento deve ser maior que zero"
            }), 400

        if valor_decimal != valor_centavos:
            return jsonify({
                "mensagem": "Valor do pagamento deve ter até duas casas decimais"
            }), 400

        valor = float(valor_centavos)

        # A Arkhé cria a cobrança e retorna o código PIX para o cliente pagar.
        cobranca = criar_cobranca_pix(valor)

        return jsonify({
            "id_cobranca": cobranca["id_cobranca"],
            "valor": cobranca["valor"],
            "codigo_pagamento": cobranca["codigo_pagamento"],
            "status": cobranca["status"],
            "tipo_cobranca": cobranca["tipo_cobranca"],
        }), 201

    except (requests.RequestException, ArkheError) as erro:
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
    from sprint import garantir_sprint_schema

    garantir_sprint_schema()
    con = get_db()
    cursor = con.cursor()

    try:
        id_usuario = get_jwt_identity()

        # Impede criar outra cobrança de assinatura enquanto houver uma ativa.
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

        # Sprint item 1: reutiliza apenas PIX pendente e dentro do vencimento, sem gerar cobranças duplicadas.
        cursor.execute(
            """
            SELECT FIRST 1 ID_ASSINATURA, ID_COBRANCA_ARKHE
            FROM ASSINATURAS
            WHERE ID_USUARIO = ?
              AND STATUS = 0
              AND ID_COBRANCA_ARKHE IS NOT NULL
              AND (DATA_VENCIMENTO IS NULL OR DATA_VENCIMENTO >= CURRENT_TIMESTAMP)
            ORDER BY ID_ASSINATURA DESC
            """,
            (id_usuario,)
        )
        assinatura_pendente = cursor.fetchone()

        if assinatura_pendente:
            id_assinatura, id_cobranca = assinatura_pendente
            cobranca = consultar_cobranca_pix(id_cobranca)
            return jsonify({
                "id_assinatura": id_assinatura,
                "id_cobranca": cobranca["id_cobranca"],
                "valor": cobranca["valor"],
                "codigo_pagamento": cobranca["codigo_pagamento"],
                "status": cobranca["status"],
                "tipo_cobranca": cobranca["tipo_cobranca"],
                "cobranca_existente": True
            }), 200

        # Sprint item 1: usa o preco do servidor quando nao houver PIX pendente reutilizavel.
        valor = current_app.config["VALOR_ASSINATURA"]

        # Solicita à Arkhé uma cobrança PIX vinculada ao valor do plano.
        cobranca = criar_cobranca_pix(valor)

        # Guarda a assinatura como pendente (STATUS 0) até confirmar o pagamento.
        # O ID da cobrança permite consultar depois o estado do PIX na Arkhé.
        # Bases antigas podem ter o generator da tabela defasado. Usar o
        # próximo ID livre evita reutilizar uma chave primária já existente.
        cursor.execute("SELECT COALESCE(MAX(ID_ASSINATURA), 0) + 1 FROM ASSINATURAS")
        id_assinatura = cursor.fetchone()[0]
        cursor.execute(
            """
            INSERT INTO ASSINATURAS (
                ID_ASSINATURA,
                ID_USUARIO,
                STATUS,
                PLANO,
                ID_COBRANCA_ARKHE,
                VALOR,
                DATA_VENCIMENTO
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                id_assinatura,
                id_usuario,
                0,
                1,
                cobranca["id_cobranca"],
                valor,
                datetime.now() + timedelta(days=3)
            )
        )

        # Persiste a assinatura pendente antes de devolver o código PIX.
        con.commit()

        return jsonify({
            "id_assinatura": id_assinatura,
            "id_cobranca": cobranca["id_cobranca"],
            "valor": cobranca["valor"],
            "codigo_pagamento": cobranca["codigo_pagamento"],
            "status": cobranca["status"],
            "tipo_cobranca": cobranca["tipo_cobranca"]
        }), 201

    except (requests.RequestException, ArkheError) as erro:
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
    from sprint import garantir_sprint_schema

    garantir_sprint_schema()
    con = get_db()
    cursor = con.cursor()

    try:
        id_usuario = get_jwt_identity()

        # Usa a assinatura mais recente do usuário para decidir se pode acessar.
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
            ORDER BY
                CASE
                    WHEN STATUS = 1 AND (DATA_EXPIRACAO IS NULL OR DATA_EXPIRACAO >= CURRENT_TIMESTAMP) THEN 0
                    ELSE 1
                END,
                ID_ASSINATURA DESC
            """,
            (id_usuario,)
        )

        assinaturas = cursor.fetchall()
        assinatura = assinaturas[0] if assinaturas else None

        if not assinatura:
            return jsonify({
                "assinatura": False,
                "status": "sem_assinatura",
                "mensagem": "Usuário não possui assinatura."
            }), 200

        (
            id_assinatura,
            id_cobranca,
            status,
            data_inicio,
            data_expiracao
        ) = assinatura

        # STATUS 1 significa ativa; ainda é preciso conferir se não venceu.
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

            # Registra STATUS 3 quando a data de validade já passou.
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
            }), 200

        # Sem o identificador da cobrança não é possível confirmar o PIX na Arkhé.
        # A confirmação é consultada na Arkhé quando esta rota é chamada.
        # Verifica todas as cobranças pendentes para aceitar o pagamento de
        # uma mensalidade antiga caso existam duplicatas no histórico.
        cobranca = None
        assinatura_paga = None
        for assinatura_candidata in assinaturas:
            if assinatura_candidata[2] == 1 or not assinatura_candidata[1]:
                continue
            # Sprint item 1: consulta o status sem depender de um novo código para a cobrança existente.
            cobranca_candidata = consultar_cobranca_pix(
                assinatura_candidata[1],
                exigir_codigo_pix=False,
            )
            if str(cobranca_candidata["status"]).strip().lower() in {
                "1", "pago", "paid", "confirmado", "confirmed", "aprovado", "approved"
            }:
                assinatura_paga = assinatura_candidata
                cobranca = cobranca_candidata
                break

        if cobranca is None and id_cobranca:
            # Sprint item 1: consulta o status sem depender de um novo código para a cobrança existente.
            cobranca = consultar_cobranca_pix(id_cobranca, exigir_codigo_pix=False)

        if cobranca is None:
            return jsonify({
                "assinatura": False,
                "status": "pendente",
                "mensagem": "Assinatura aguardando pagamento."
            }), 200

        status_cobranca = cobranca["status"]

        # Sprint item 1: reconhece status numérico ou textual da cobrança confirmada pela Arkhé.
        # STATUS 1 da cobrança indica pagamento confirmado: ativa por 30 dias
        # a partir do momento desta confirmação e salva as duas datas no banco.
        if str(status_cobranca).strip().lower() in {
            "1", "pago", "paid", "confirmado", "confirmed", "aprovado", "approved"
        }:
            agora = datetime.now()
            data_expiracao = agora + timedelta(days=30)

            cursor.execute(
                """
                UPDATE ASSINATURAS
                SET
                    STATUS = 1,
                    DATA_INICIO = ?,
                    DATA_EXPIRACAO = ?,
                    DATA_PAGAMENTO = ?,
                    VALOR = COALESCE(VALOR, ?)
                WHERE ID_ASSINATURA = ?
                """,
                (
                    agora,
                    data_expiracao,
                    agora,
                    current_app.config["VALOR_ASSINATURA"],
                    (assinatura_paga or assinatura)[0]
                )
            )

            con.commit()

            return jsonify({
                "assinatura": True,
                "status": "ativa",
                "id_assinatura": (assinatura_paga or assinatura)[0],
                "data_inicio": agora.isoformat(),
                "data_expiracao": data_expiracao.isoformat()
            }), 200

        # Qualquer status diferente de confirmado mantém a assinatura pendente.
        return jsonify({
            "assinatura": False,
            "status": "pendente",
            "id_assinatura": id_assinatura,
            "id_cobranca": id_cobranca,
            "status_cobranca": status_cobranca,
            "mensagem": "Pagamento ainda não confirmado."
        }), 200

    except (requests.RequestException, ArkheError) as erro:
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
