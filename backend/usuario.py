import os
import re
from funcao import *
from flask import request, jsonify, make_response, current_app
from flask_bcrypt import generate_password_hash, check_password_hash
from flask_jwt_extended import (
    create_access_token,
    jwt_required,
    get_jwt,
    get_jwt_identity,
    unset_jwt_cookies,
    set_access_cookies
)
import fdb

def get_db():
    return fdb.connect(
        host=current_app.config['DB_HOST'],
        database=current_app.config['DB_NAME'],
        user=current_app.config['DB_USER'],
        password=current_app.config['DB_PASSWORD'],
        charset='UTF8'
    )

def criar_mensagem(descricao, tipo='erro'):
    return {
        'id': os.urandom(8).hex(),
        'tipo': tipo,
        'descricao': descricao
    }

def resposta_mensagem(descricao, status=200, tipo='erro', **extra):
    payload = {'mensagem': criar_mensagem(descricao, tipo)}
    payload.update(extra)
    return jsonify(payload), status

@app.route('/cadastrar', methods=['POST'])
def cadastrar():
    dados = request.get_json() or {}
    nome = dados.get('nome')
    email = dados.get('email', '').lower().strip()
    cpf = dados.get('cpf')
    senha = dados.get('senha')
    confirmar_senha = dados.get('confirmar_senha')

    if not nome or not nome.strip():
        return resposta_mensagem('Nome é obrigatório', 400)
    if not email:
        return resposta_mensagem('E-mail é obrigatório', 400)
    if not cpf:
        return resposta_mensagem('CPF é obrigatório', 400)
    if not senha or not confirmar_senha:
        return resposta_mensagem('Senha e confirmação são obrigatórias', 400)

    if senha != confirmar_senha:
        return resposta_mensagem('As senhas não coincidem', 400)

    senha_valida = validar_senha(senha)
    if not senha_valida:
        return resposta_mensagem("A senha deve conter no mínimo 8 caracteres, pelo menos uma letra maiúscula e uma minúscula, um número e um caractere especial.", 400)

    con = get_db()
    cursor = con.cursor()

    try:
        cursor.execute("SELECT 1 FROM USUARIOS WHERE EMAIL = ?", (email,))
        if cursor.fetchone():
            return resposta_mensagem('E-mail já cadastrado', 400)

        cursor.execute("SELECT 1 FROM USUARIOS WHERE CPF = ?", (cpf,))
        if cursor.fetchone():
            return resposta_mensagem('CPF já cadastrado', 400)

        senha_hash = generate_password_hash(senha)

        cursor.execute("""
            INSERT INTO USUARIOS (NOME, EMAIL, CPF, SENHA, TIPO_USUARIO, SITUACAO, TENTATIVAS)
            VALUES (?, ?, ?, ?, 2, 0, 0)
            RETURNING ID_USUARIO
        """, (nome, email, cpf, senha_hash))

        id_usuario = cursor.fetchone()[0]
        con.commit()

        return resposta_mensagem(
            'Aluno cadastrado com sucesso',
            201,
            'sucesso',
            id_usuario=id_usuario
        )

    except Exception as e:
        con.rollback()
        return resposta_mensagem(f'Erro ao cadastrar: {str(e)}', 500)
    finally:
        cursor.close()
        con.close()


@app.route('/login', methods=['POST'])
def login():
    dados = request.get_json() or {}
    email = dados.get('email', '').lower().strip()
    senha = dados.get('senha')

    if not email or not senha:
        return resposta_mensagem('E-mail e senha são obrigatórios', 400)

    con = get_db()
    cursor = con.cursor()

    try:
        cursor.execute("""
            SELECT ID_USUARIO, NOME, EMAIL, SENHA, TIPO_USUARIO, SITUACAO, TENTATIVAS, CPF
            FROM USUARIOS
            WHERE EMAIL = ?
        """, (email,))

        usuario = cursor.fetchone()

        if not usuario:
            return resposta_mensagem('E-mail ou senha inválida', 401)

        id_usuario, nome_usuario, email_usuario, senha_banco, tipo, situacao, tentativa, cpf = usuario
        tentativa = tentativa or 0

        if situacao == 1:
            return resposta_mensagem('Usuário Bloqueado. Entre em contato com o suporte.', 403)

        if not check_password_hash(senha_banco, senha):
            nova_tentativa = tentativa + 1

            if nova_tentativa >= 3 and tipo != 0:
                cursor.execute("""
                    UPDATE USUARIOS
                    SET SITUACAO = 1, TENTATIVAS = ?
                    WHERE ID_USUARIO = ?
                """, (nova_tentativa, id_usuario))
                con.commit()
                return resposta_mensagem('Usuário bloqueado por excesso de tentativas inválidas.', 403)

            cursor.execute("""
                UPDATE USUARIOS
                SET TENTATIVAS = ?
                WHERE ID_USUARIO = ?
            """, (nova_tentativa, id_usuario))
            con.commit()
            return resposta_mensagem('E-mail ou senha inválida', 401)

        cursor.execute("UPDATE USUARIOS SET TENTATIVAS = 0 WHERE ID_USUARIO = ?", (id_usuario,))
        con.commit()

        token = create_access_token(
            identity=str(id_usuario),
            additional_claims={'tipo': tipo}
        )

        resposta = make_response(jsonify({
            'mensagem': criar_mensagem('Login realizado com sucesso', 'sucesso'),
            'usuario': {
                'id_usuario': id_usuario,
                'nome': nome_usuario,
                'email': email_usuario,
                'cpf': cpf
            },
            'token': token
        }), 200)

        set_access_cookies(resposta, token)

        return resposta

    except Exception as e:
        return resposta_mensagem(f'Erro no login: {str(e)}', 500)
    finally:
        cursor.close()
        con.close()


@app.route('/cadastrar_colaborador', methods=['POST'])
@jwt_required()
def cadastrar_colaborador():
    claims = get_jwt()
    if claims.get('tipo') != 0:
        return resposta_mensagem('Acesso negado. Apenas administradores podem cadastrar colaboradores.', 403)

    dados = request.get_json() or {}
    nome = dados.get('nome')
    email = dados.get('email', '').lower().strip()
    cpf = dados.get('cpf')
    senha = dados.get('senha')
    confirmar_senha = dados.get('confirmar_senha')
    tipo = dados.get('tipo')

    if not nome or not nome.strip():
        return resposta_mensagem('Nome é obrigatório', 400)
    if not email:
        return resposta_mensagem('E-mail é obrigatório', 400)
    if not cpf:
        return resposta_mensagem('CPF é obrigatório', 400)
    if not senha or not confirmar_senha:
        return resposta_mensagem('Senha e confirmação são obrigatórias', 400)

    if senha != confirmar_senha:
        return resposta_mensagem('As senhas não coincidem', 400)

    senha_valida = validar_senha(senha)
    if not senha_valida:
        return resposta_mensagem("A senha deve conter no mÃ­nimo 8 caracteres, pelo menos uma letra maiÃºscula e uma minÃºscula, um nÃºmero e um caractere especial.", 400)

    try:
        tipo = int(tipo)
        if tipo not in [0, 1]:
            return resposta_mensagem('Tipo inválido de usuário.', 400)
    except (TypeError, ValueError):
        return resposta_mensagem('O campo tipo é obrigatório.', 400)

    con = get_db()
    cursor = con.cursor()

    try:
        cursor.execute("SELECT 1 FROM USUARIOS WHERE EMAIL = ?", (email,))
        if cursor.fetchone():
            return resposta_mensagem('E-mail já cadastrado', 400)

        cursor.execute("SELECT 1 FROM USUARIOS WHERE CPF = ?", (cpf,))
        if cursor.fetchone():
            return resposta_mensagem('CPF já cadastrado', 400)

        senha_hash = generate_password_hash(senha)

        cursor.execute("""
            INSERT INTO USUARIOS (NOME, EMAIL, CPF, SENHA, TIPO_USUARIO, SITUACAO, TENTATIVAS)
            VALUES (?, ?, ?, ?, ?, 0, 0)
            RETURNING ID_USUARIO
        """, (nome, email, cpf, senha_hash, tipo))

        id_usuario = cursor.fetchone()[0]
        con.commit()

        cargo = "Administrador" if tipo == 0 else "Professor"
        return resposta_mensagem(
            f'{cargo} cadastrado com sucesso',
            201,
            'sucesso',
            id_usuario=id_usuario
        )

    except Exception as e:
        con.rollback()
        return resposta_mensagem(f'Erro ao cadastrar: {str(e)}', 500)
    finally:
        cursor.close()
        con.close()


@app.route('/logout', methods=['POST'])
def logout():
    resposta = make_response(
        jsonify({
            'mensagem': criar_mensagem(
                'Logout realizado com sucesso',
                'sucesso'
            )
        }),
        200
    )

    unset_jwt_cookies(resposta)

    return resposta

@app.route('/esqueci_minha_senha', methods=['POST'])
def esqueci_minha_senha():
    try:
        data = request.get_json()
        destinatario = data.get('email')

        assunto = "Recuperação de senha"
        mensagem = f"Seu código para recuperar sua senha é"

        email, tipo = email_verificacao(destinatario, assunto, mensagem)

        return jsonify({'mensagem': criar_mensagem(email, tipo)})
    except Exception as e:
        return jsonify({'mensagem': criar_mensagem(f'Erro ao enviar email {e}')})


@app.route('/alterar_senha', methods=['POST'])
def alterar_senha():
    con = get_db()
    cur = con.cursor()
    try:
        dados = request.get_json()

        email = dados.get('email')
        codigo = dados.get('codigo')
        nova_senha = dados.get('nova_senha')
        confirmar_nova_senha = dados.get('confirmar_nova_senha')

        cur.execute("""select 1
                       FROM USUARIOS
                       where email = ?""", (email,))
        if not cur.fetchone():
            return resposta_mensagem("Email não encontrado", 404)

        if not nova_senha and not confirmar_nova_senha:
            # 1. Verifica código
            sucesso, mensagem = verificar_codigo(email, codigo)
            if sucesso:
                tipo = 'sucesso'
            else:
                tipo = 'erro'

            if not sucesso:
                return resposta_mensagem(mensagem, 400)
            else:
                return resposta_mensagem(mensagem, 201, 'sucesso')
        else:
            if not email or not codigo or not nova_senha or not confirmar_nova_senha:
                return resposta_mensagem("Email, código e nova senha são obrigatórios", 400)

            cur.execute("""select 1
                           FROM USUARIOS
                           where email = ?""", (email,))
            if not cur.fetchone():
                return resposta_mensagem("Email não encontrado", 404)

            sucesso, mensagem = verificar_codigo(email, codigo)
            if sucesso:
                tipo = 'sucesso'
            else:
                tipo = 'erro'

            if not sucesso:
                return resposta_mensagem(mensagem, 400)


            # Busca usuário
            cur.execute("""
                SELECT ID_USUARIO, SENHA
                FROM USUARIOS
                WHERE EMAIL = ?
            """, (email,))
            usuario = cur.fetchone()

            if not usuario:
                return resposta_mensagem("Usuário não encontrado", 404)

            mensagem, senha_criptografada = valida_nova_senha(nova_senha, usuario[0], cur)
            if mensagem is not None:
                return resposta_mensagem(mensagem, 200)

            mensagem_validacao = validar_senha(nova_senha, confirmar_nova_senha)
            if mensagem_validacao is not None:
                return resposta_mensagem(mensagem_validacao, 400)

            senha = criptografar(nova_senha)
            # Atualiza senha e limpa código
            cur.execute("""
                UPDATE USUARIOS
                SET SENHA = ?,
                    SENHA_ANTIGA_3 = SENHA_ANTIGA_2,
                    SENHA_ANTIGA_2 = ?,
                    CODIGO = NULL
                WHERE ID_USUARIO = ?
            """, (senha, senha_criptografada, usuario[0]))
            con.commit()

            return resposta_mensagem("Senha alterada com sucesso", 200, 'sucesso')

    except Exception as e:
        if con:
            con.rollback()
        return resposta_mensagem(f"Erro ao alterar senha: {e}", 500)
    finally:
        cur.close()
        con.close()
