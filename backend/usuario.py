import os
import re
from flask import Flask, request, jsonify, make_response
from werkzeug.security import generate_password_hash, check_password_hash
from flask_jwt_extended import (
    JWTManager,
    create_access_token,
    jwt_required,
    get_jwt,
    unset_jwt_cookies
)
import firebird.driver as fb

app = Flask(__name__)

app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY', 'sua_chave_secreta_aqui')
jwt = JWTManager(app)

def get_db():
    return fb.connect(
        host=os.getenv('DB_HOST', 'localhost'),
        port=int(os.getenv('DB_PORT', 3050)),
        database=os.getenv('DB_PATH'),
        user=os.getenv('DB_USER', 'SYSDBA'),
        password=os.getenv('DB_PASSWORD', 'masterkey'),
        charset='UTF8'
    )

def validar_senha_forte(senha):
    if len(senha) < 8:
        return False, 'A senha deve conter no mínimo 8 caracteres.'
    if not re.search(r'[A-Z]', senha):
        return False, 'A senha deve conter pelo menos uma letra maiúscula.'
    if not re.search(r'[0-9]', senha):
        return False, 'A senha deve conter pelo menos um número.'
    if not re.search(r'[!@#$%^&*(),.?":{}|<>]', senha):
        return False, 'A senha deve conter pelo menos um caractere especial.'
    return True, ''

@app.route('/cadastrar', methods=['POST'])
def cadastrar():
    dados = request.get_json() or {}
    nome = dados.get('nome')
    email = dados.get('email', '').lower().strip()
    cpf = dados.get('cpf')
    senha = dados.get('senha')
    confirmar_senha = dados.get('confirmar_senha')

    if not nome or not nome.strip():
        return jsonify({'mensagem': 'Nome é obrigatório'}), 400
    if not email:
        return jsonify({'mensagem': 'E-mail é obrigatório'}), 400
    if not cpf:
        return jsonify({'mensagem': 'CPF é obrigatório'}), 400
    if not senha or not confirmar_senha:
        return jsonify({'mensagem': 'Senha e confirmação são obrigatórias'}), 400

    if senha != confirmar_senha:
        return jsonify({'mensagem': 'As senhas não coincidem'}), 400

    senha_valida, msg_erro = validar_senha_forte(senha)
    if not senha_valida:
        return jsonify({'mensagem': msg_erro}), 400

    con = get_db()
    cursor = con.cursor()

    try:
        cursor.execute("SELECT 1 FROM USUARIO WHERE EMAIL = ?", (email,))
        if cursor.fetchone():
            return jsonify({'mensagem': 'E-mail já cadastrado'}), 400

        cursor.execute("SELECT 1 FROM USUARIO WHERE CPF = ?", (cpf,))
        if cursor.fetchone():
            return jsonify({'mensagem': 'CPF já cadastrado'}), 400

        senha_hash = generate_password_hash(senha)

        cursor.execute("""
            INSERT INTO USUARIO (NOME, EMAIL, CPF, SENHA, TIPO, SITUACAO, TENTATIVA)
            VALUES (?, ?, ?, ?, 2, 0, 0)
            RETURNING ID_USUARIO
        """, (nome, email, cpf, senha_hash))

        id_usuario = cursor.fetchone()[0]
        con.commit()

        return jsonify({
            'mensagem': 'Aluno cadastrado com sucesso',
            'id_usuario': id_usuario
        }), 201

    except Exception as e:
        con.rollback()
        return jsonify({'mensagem': f'Erro ao cadastrar: {str(e)}'}), 500
    finally:
        cursor.close()
        con.close()


@app.route('/login', methods=['POST'])
def login():
    dados = request.get_json() or {}
    email = dados.get('email', '').lower().strip()
    senha = dados.get('senha')

    if not email or not senha:
        return jsonify({'mensagem': 'E-mail e senha são obrigatórios'}), 400

    con = get_db()
    cursor = con.cursor()

    try:
        cursor.execute("""
            SELECT ID_USUARIO, NOME, EMAIL, SENHA, TIPO, SITUACAO, TENTATIVA, CPF
            FROM USUARIO
            WHERE EMAIL = ?
        """, (email,))

        usuario = cursor.fetchone()

        if not usuario:
            return jsonify({'mensagem': 'E-mail ou senha inválida'}), 401

        id_usuario, nome_usuario, email_usuario, senha_banco, tipo, situacao, tentativa, cpf = usuario
        tentativa = tentativa or 0

        if situacao == 1:
            return jsonify({'mensagem': 'Usuário Bloqueado. Entre em contato com o suporte.'}), 403

        if not check_password_hash(senha_banco, senha):
            nova_tentativa = tentativa + 1

            if nova_tentativa >= 3 and tipo != 0:
                cursor.execute("""
                    UPDATE USUARIO
                    SET SITUACAO = 1, TENTATIVA = ?
                    WHERE ID_USUARIO = ?
                """, (nova_tentativa, id_usuario))
                con.commit()
                return jsonify({'mensagem': 'Usuário bloqueado por excesso de tentativas inválidas.'}), 403

            cursor.execute("""
                UPDATE USUARIO
                SET TENTATIVA = ?
                WHERE ID_USUARIO = ?
            """, (nova_tentativa, id_usuario))
            con.commit()
            return jsonify({'mensagem': 'E-mail ou senha inválida'}), 401

        cursor.execute("UPDATE USUARIO SET TENTATIVA = 0 WHERE ID_USUARIO = ?", (id_usuario,))
        con.commit()

        token = create_access_token(
            identity=str(id_usuario),
            additional_claims={'tipo': tipo}
        )

        resposta = make_response(jsonify({
            'mensagem': 'Login realizado com sucesso',
            'usuario': {
                'id_usuario': id_usuario,
                'nome': nome_usuario,
                'email': email_usuario,
                'tipo': tipo,
                'cpf': cpf
            },
            'token': token
        }), 200)

        resposta.set_cookie(
            'access_token',
            token,
            httponly=True,
            secure=False,
            samesite='Lax',
            path="/",
            max_age=7200
        )

        return resposta

    except Exception as e:
        return jsonify({'mensagem': f'Erro no login: {str(e)}'}), 500
    finally:
        cursor.close()
        con.close()


@app.route('/cadastrar-colaborador', methods=['POST'])
@jwt_required()
def cadastrar_colaborador():
    claims = get_jwt()
    if claims.get('tipo') != 0:
        return jsonify({'mensagem': 'Acesso negado. Apenas administradores podem cadastrar colaboradores.'}), 403

    dados = request.get_json() or {}
    nome = dados.get('nome')
    email = dados.get('email', '').lower().strip()
    cpf = dados.get('cpf')
    senha = dados.get('senha')
    confirmar_senha = dados.get('confirmar_senha')
    tipo = dados.get('tipo')

    if not nome or not nome.strip():
        return jsonify({'mensagem': 'Nome é obrigatório'}), 400
    if not email:
        return jsonify({'mensagem': 'E-mail é obrigatório'}), 400
    if not cpf:
        return jsonify({'mensagem': 'CPF é obrigatório'}), 400
    if not senha or not confirmar_senha:
        return jsonify({'mensagem': 'Senha e confirmação são obrigatórias'}), 400

    if senha != confirmar_senha:
        return jsonify({'mensagem': 'As senhas não coincidem'}), 400

    senha_valida, msg_erro = validar_senha_forte(senha)
    if not senha_valida:
        return jsonify({'mensagem': msg_erro}), 400

    try:
        tipo = int(tipo)
        if tipo not in [0, 1]:
            return jsonify({'mensagem': 'Tipo inválido. Use 0 para ADM ou 1 para Professor.'}), 400
    except (TypeError, ValueError):
        return jsonify({'mensagem': 'O campo tipo é obrigatório e deve ser 0 ou 1.'}), 400

    con = get_db()
    cursor = con.cursor()

    try:
        cursor.execute("SELECT 1 FROM USUARIO WHERE EMAIL = ?", (email,))
        if cursor.fetchone():
            return jsonify({'mensagem': 'E-mail já cadastrado'}), 400

        cursor.execute("SELECT 1 FROM USUARIO WHERE CPF = ?", (cpf,))
        if cursor.fetchone():
            return jsonify({'mensagem': 'CPF já cadastrado'}), 400

        senha_hash = generate_password_hash(senha)

        cursor.execute("""
            INSERT INTO USUARIO (NOME, EMAIL, CPF, SENHA, TIPO, SITUACAO, TENTATIVA)
            VALUES (?, ?, ?, ?, ?, 0, 0)
            RETURNING ID_USUARIO
        """, (nome, email, cpf, senha_hash, tipo))

        id_usuario = cursor.fetchone()[0]
        con.commit()

        cargo = "Administrador" if tipo == 0 else "Professor"
        return jsonify({
            'mensagem': f'{cargo} cadastrado com sucesso',
            'id_usuario': id_usuario
        }), 201

    except Exception as e:
        con.rollback()
        return jsonify({'mensagem': f'Erro ao cadastrar: {str(e)}'}), 500
    finally:
        cursor.close()
        con.close()


@app.route('/logout', methods=['POST'])
def logout():
    resposta = make_response(jsonify({'mensagem': 'Logout realizado com sucesso'}), 200)
    unset_jwt_cookies(resposta)
    resposta.set_cookie('access_token', '', expires=0, httponly=True, samesite='Lax', path="/")
    return resposta

if __name__ == '__main__':
    app.run(debug=True)


@app.route('/esqueci_minha_senha', methods=['POST'])
def esqueci_minha_senha():
    try:
        data = request.get_json()
        destinatario = data.get('email')

        assunto = "Recuperação de senha"
        mensagem = f"Seu código para recuperar sua senha é"

        email, tipo = email_verificacao(destinatario, assunto, mensagem)

        return jsonify({'mensagem': {
            'tipo': tipo,
            'descricao': email
        }})
    except Exception as e:
        return jsonify({'mensagem': {
            'tipo': 'erro',
            'descricao': f'Erro ao enviar email {e}'
        }})


@app.route('/alterar_senha', methods=['POST'])
def alterar_senha():
    cur = con.cursor()
    try:
        dados = request.get_json()

        email = dados.get('email')
        codigo = dados.get('codigo')
        nova_senha = dados.get('nova_senha')
        confirmar_nova_senha = dados.get('confirmar_nova_senha')

        cur.execute("""select 1
                       from usuario
                       where email = ?""", (email,))
        if not cur.fetchone():
            return jsonify({"mensagem": {
                'tipo': 'erro',
                'descricao': "Email não encontrado"
            }}), 404

        if not nova_senha and not confirmar_nova_senha:
            # 1. Verifica código
            sucesso, mensagem = verificar_codigo(email, codigo)
            if sucesso:
                tipo = 'sucesso'
            else:
                tipo = 'erro'

            if not sucesso:
                return jsonify({"mensagem": {
                    'tipo': 'erro',
                    'descricao': mensagem
                }}), 400
            else:
                return jsonify({"mensagem": {
                    'tipo': 'sucesso',
                    'descricao': mensagem
                }}), 201
        else:
            if not email or not codigo or not nova_senha or not confirmar_nova_senha:
                return jsonify({"mensagem": {
                    'tipo': 'erro',
                    'descricao': "Email, código e nova senha são obrigatórios"
                }}), 400

            cur.execute("""select 1
                           from usuario
                           where email = ?""", (email,))
            if not cur.fetchone():
                return jsonify({"mensagem": {
                    'tipo': 'erro',
                    'descricao': "Email não encontrado"
                }}), 404

            sucesso, mensagem = verificar_codigo(email, codigo)
            if sucesso:
                tipo = 'sucesso'
            else:
                tipo = 'erro'

            if not sucesso:
                return jsonify({"mensagem": {
                    'tipo': 'erro',
                    'descricao': mensagem
                }}), 400


            # Busca usuário
            cur.execute("""
                SELECT ID_USUARIO, SENHA
                FROM USUARIO
                WHERE EMAIL = ?
            """, (email,))
            usuario = cur.fetchone()

            if not usuario:
                return jsonify({"mensagem": {
                    'tipo': 'erro',
                    'descricao': "Usuário não encontrado"
                }}), 404

            mensagem, senha_criptografada = valida_nova_senha(nova_senha, usuario[0], cur)
            if mensagem is not None:
                return jsonify({'mensagem': {
                    'tipo': 'erro',
                    'descricao': mensagem
                }}), 400

            mensagem_validacao = validar_senha(nova_senha, confirmar_nova_senha)
            if mensagem_validacao is not None:
                return jsonify({'mensagem': {
                    'tipo': 'erro',
                    'descricao': mensagem_validacao
                }}), 400

            senha = criptografar(nova_senha)
            # Atualiza senha e limpa código
            cur.execute("""
                UPDATE USUARIO
                SET SENHA = ?,
                    SENHA_ANTIGA_3 = SENHA_ANTIGA_2,
                    SENHA_ANTIGA_2 = ?,
                    CODIGO = NULL
                WHERE ID_USUARIO = ?
            """, (senha, senha_criptografada, usuario[0]))
            con.commit()

            return jsonify({"mensagem": {
                'tipo': 'sucesso',
                'descricao': "Senha alterada com sucesso"
            }}), 200

    except Exception as e:
        if con:
            con.rollback()
        return jsonify({"mensagem": {
            'tipo': 'erro',
            'descricao': f"Erro ao alterar senha: {e}"
        }}), 500
    finally:
        cur.close()