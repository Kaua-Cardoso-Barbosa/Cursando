# Rotas da sprint organizadas por assunto; os comentários dos itens seguem junto ao código.
import re

from flask import current_app, jsonify, make_response, request
from flask_bcrypt import check_password_hash, generate_password_hash
from flask_jwt_extended import create_access_token, set_access_cookies
from funcao import email_verificacao
from app import app
from banco import get_db




from usuario import criar_mensagem, email_valido, garantir_coluna_email_verificado, normalizar_email, resposta_mensagem, validar_campos_senha, validar_dados_usuario

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

__all__ = ['cadastrar', 'verificar_email_cadastro', 'reenviar_codigo_cadastro', 'corrigir_email_cadastro']
