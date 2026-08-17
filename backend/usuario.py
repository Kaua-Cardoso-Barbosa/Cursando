from flask import jsonify, request, make_response, render_template, send_from_directory
from main import app, con
from funcao import validar_senha, gerar_token, descobre_tipo_usuario, descobre_id_usuario, gerar_codigo, enviando_email, senha_repetida
from flask_bcrypt import generate_password_hash, check_password_hash
import os
import threading
import uuid

@app.route('/adicionar_usuario', methods=['POST'])
def adicionar_usuario():
    nome = request.form.get('nome')
    email = request.form.get('email').lower()
    cpf = request.form.get('cpf')
    senha = request.form.get('senha')
    tipo = request.form.get('tipo')
    confirma = request.form.get('confirma')
    imagem = request.files.get('imagem')

    validado = validar_senha(senha)

    if not nome or not nome.strip():
        return jsonify({'mensagem': 'Nome é obrigatório'}), 400

    if not validado:
        return jsonify({'mensagem': 'Senha fora do padrão'}), 400

    if confirma != senha:
        return jsonify({'mensagem': 'Senhas não coincidem'}), 400

    tipo_usuario = descobre_tipo_usuario()

    if tipo == "0" or tipo == "1":
        if tipo_usuario is None:
            return jsonify({'mensagem': 'usuario nao logado'}), 403

        if tipo_usuario != 0:
            return jsonify({'mensagem': 'Apenas ADM pode cadastrar ADM ou Professor'}), 403

    try:
        cursor = con.cursor()

        cursor.execute("SELECT 1 FROM USUARIO WHERE EMAIL = ?", (email,))
        if cursor.fetchone():
            return jsonify({'mensagem': 'Email já cadastrado'}), 400

        cursor.execute("SELECT 1 FROM USUARIO WHERE cpf = ?", (cpf,))
        if cursor.fetchone():
            return jsonify({'mensagem': 'CPF já cadastrado'}), 400

        senha_hash = generate_password_hash(senha).decode('utf-8')

        situacao_inicial = 0 if tipo in ("0", "1") else 2

        cursor.execute("""
            INSERT INTO USUARIO (NOME, EMAIL, CPF, SENHA, TIPO, SITUACAO, TENTATIVA)
            VALUES (?, ?, ?, ?, ?, ?, 1)
            RETURNING ID_USUARIO
        """, (nome, email, cpf, senha_hash, tipo, situacao_inicial))

        id_usuario = cursor.fetchone()[0]
        con.commit()

        cursor.execute("""
            INSERT INTO historico_senha(id_usuario, senha_anterior)
            VALUES (?, ?)
        """, (id_usuario, senha_hash))
        con.commit()

        if imagem:
            pasta = os.path.join(app.config['UPLOAD_FOLDER'], "Usuarios")
            os.makedirs(pasta, exist_ok=True)

            caminho = os.path.join(pasta, f"{id_usuario}.jpg")
            imagem.save(caminho)

        if tipo == "2":
            codigo = gerar_codigo()

            cursor.execute("""
                INSERT INTO recuperacao_senha (id_usuario, codigo)
                VALUES (?, ?)
            """, (id_usuario, codigo))

            con.commit()

            html = render_template('codigo_verificacao.html', codigo=codigo)

            try:
                thread = threading.Thread(
                    target=enviando_email,
                    args=(email, "Código de Verificação - WebCar", html)
                )
                thread.start()
            except Exception as e:
                return jsonify({"messagem": f"Erro ao enviar email: {e}"}), 500

        return jsonify({
            'mensagem': 'Usuário cadastrado com sucesso',
            'id_usuario': id_usuario
        }), 201

    except Exception as e:
        return jsonify({'mensagem': f'Erro: {e}'}), 500

    finally:
        cursor.close()

@app.route('/login', methods=['POST'])
def login():
    dados = request.get_json()
    email = dados.get('email').lower()
    senha = dados.get('senha')

    try:
        cursor = con.cursor()

        cursor.execute("""
            SELECT ID_USUARIO, NOME, EMAIL, SENHA, TIPO, SITUACAO, TENTATIVA, CPF
            FROM USUARIO
            WHERE EMAIL = ?
        """, (email,))

        dados_do_banco = cursor.fetchone()

        if not dados_do_banco:
            return jsonify({'mensagem': 'Email ou senha invalida'}), 401

        id_usuario = dados_do_banco[0]
        nome_usuario = dados_do_banco[1]
        email_usuario = dados_do_banco[2]
        senha_escritanobanco = dados_do_banco[3]
        tipo = dados_do_banco[4]
        situacao = dados_do_banco[5]
        tentativa = dados_do_banco[6]
        cpf = dados_do_banco[7]

        if situacao == 2:
            return jsonify({'mensagem': 'Verifique seu email antes de logar'}), 403

        if situacao == 1:
            return jsonify({'mensagem': 'Usuário Bloqueado'}), 403

        if not check_password_hash(senha_escritanobanco, senha):
            cursor.execute("""
                UPDATE usuario
                SET tentativa = tentativa + 1
                WHERE email = ?
            """, (email,))

            if tentativa == 3 and tipo != 0:
                motivo_bloqueio = "Sua conta foi bloqueada por excesso de tentativas inválidas de login."

                cursor.execute("""
                    UPDATE usuario
                    SET situacao = ?,
                        motivo_bloqueio = ?
                    WHERE email = ?
                """, (1, motivo_bloqueio, email))

                con.commit()

                html = render_template(
                    'email_bloqueio_usuario.html',
                    nome=nome_usuario,
                    motivo_bloqueio=motivo_bloqueio
                )

                thread = threading.Thread(
                    target=enviando_email,
                    args=(email_usuario, "Conta bloqueada - Cursando", html)
                )
                thread.start()

                return jsonify({
                    'mensagem': 'usuario bloqueado por excesso de tentativas. Verifique seu email.'
                }), 403

            con.commit()

            return jsonify({'mensagem': 'Email ou senha inválida'}), 401

        token = gerar_token(id_usuario, tipo)

        cursor.execute("""
            UPDATE usuario
            SET tentativa = ?
            WHERE email = ?
        """, (1, email))

        con.commit()

        resposta = make_response(jsonify({
            'mensagem': 'login com sucesso',
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
            secure=True,
            samesite='None',
            path="/",
            max_age=7200
        )

        return resposta

    except Exception as e:
        return jsonify({'mensagem': f'Erro no login: {e}'}), 500

    finally:
        cursor.close()

@app.route('/edicao_usuario/<int:id_usuario>', methods=['PUT'])
def edicao_usuario(id_usuario):

    tipo_usuario = descobre_tipo_usuario()
    id_usuario_logado = descobre_id_usuario()

    if tipo_usuario is None:
        return jsonify({'mensagem': 'usuario nao logado'}), 403

    if tipo_usuario != 0:
        if id_usuario_logado != id_usuario:
            return jsonify({'mensagem': 'usuario nao pertence a essa conta'}), 403

    cursor = con.cursor()

    try:
        cursor.execute("""
            SELECT NOME, EMAIL, CPF, SENHA, TIPO
            FROM USUARIO
            WHERE ID_USUARIO = ?
        """, (id_usuario,))

        existe_usuario = cursor.fetchone()

        if not existe_usuario:
            return jsonify({'mensagem': 'Usuário não encontrado'}), 404

        nome = request.form.get('nome')
        email = request.form.get('email')
        cpf = request.form.get('cpf')
        senha = request.form.get('senha')
        tipo = request.form.get('tipo', existe_usuario[5])
        imagem = request.files.get('imagem')

        if not nome or not nome.strip():
            return jsonify({'mensagem': 'Nome é obrigatório'}), 400

        if not email or not email.strip():
            return jsonify({'mensagem': 'Email é obrigatório'}), 400

        if not cpf or not cpf.strip():
            return jsonify({'mensagem': 'CPF é obrigatório'}), 400

        alterar_senha = senha is not None and senha.strip() != ""

        cursor.execute("""
            SELECT 1
            FROM USUARIO
            WHERE EMAIL = ?
            AND ID_USUARIO != ?
        """, (email, id_usuario))

        if cursor.fetchone():
            return jsonify({'mensagem': 'Email já cadastrado'}), 400

        cursor.execute("""
            SELECT 1
            FROM USUARIO
            WHERE CPF = ?
            AND ID_USUARIO != ?
        """, (cpf, id_usuario))

        if cursor.fetchone():
            return jsonify({'mensagem': 'CPF já cadastrado'}), 400

        if alterar_senha:
            if not validar_senha(senha):
                return jsonify({'mensagem': 'Senha fora do padrão'}), 400

            if senha_repetida(id_usuario, senha):
                return jsonify({'mensagem': 'Não pode repetir as últimas 3 senhas'}), 400

            senha_hash = generate_password_hash(senha).decode('utf-8')

            cursor.execute("""
                UPDATE USUARIO
                SET NOME = ?,
                    EMAIL = ?,
                    CPF = ?,
                    SENHA = ?,
                    TIPO = ?
                WHERE ID_USUARIO = ?
            """, (nome, email, cpf, senha_hash, tipo, id_usuario))

            cursor.execute("""
                INSERT INTO historico_senha(id_usuario, senha_anterior)
                VALUES (?, ?)
            """, (id_usuario, senha_hash))

            con.commit()

            cursor.execute("""
                DELETE FROM historico_senha
                WHERE id_usuario = ?
                AND id_historico_senha NOT IN (
                    SELECT FIRST 3 id_historico_senha
                    FROM historico_senha
                    WHERE id_usuario = ?
                    ORDER BY id_historico_senha DESC
                )
            """, (id_usuario, id_usuario))

            con.commit()

        else:
            cursor.execute("""
                UPDATE USUARIO
                SET NOME = ?,
                    EMAIL = ?,
                    CPF = ?,
                    TIPO = ?
                WHERE ID_USUARIO = ?
            """, (nome, email, cpf, tipo, id_usuario))

            con.commit()

        if imagem:
            pasta = os.path.join(app.config['UPLOAD_FOLDER'], "Usuarios")
            os.makedirs(pasta, exist_ok=True)

            caminho = os.path.join(pasta, f"{id_usuario}.jpg")
            imagem.save(caminho)

        return jsonify({
            'mensagem': 'Usuário atualizado com sucesso',
            'id_usuario': id_usuario
        }), 200

    except Exception as e:
        con.rollback()
        return jsonify({'mensagem': f'erro ao editar: {e}'}), 500

    finally:
        cursor.close()

@app.route('/deletar_usuario/<int:id_usuario>', methods=['DELETE'])
def deletar_usuario(id_usuario):

    tipo_usuario = descobre_tipo_usuario()

    if tipo_usuario is None:  # isso significa que a funcao returnou null entao, o usuario nao esta logado
        return jsonify({'mensagem': 'usuario nao logado'}), 403

    if tipo_usuario !=0:
        return jsonify({'mensagem': 'Apenas ADM Pode deletar'})
    try:
        cursor = con.cursor()
        cursor.execute('select 1 from usuario where id_usuario = ?', (id_usuario,))
        if not cursor.fetchone():
            return jsonify({'mensagem': 'Usuário nao encontrado'})

        cursor.execute('delete from usuario where id_usuario = ?', (id_usuario,))
        con.commit()
        return jsonify({'mensagem': 'Usuário deletado com sucesso'})

    except Exception as e:
        return jsonify({'mensagem': 'erro ao deletar usuario em mais de uma tabela'})
    finally:
        cursor.close()

@app.route('/esqueci_senha', methods=['POST'])
def esqueci_senha():
    dados = request.get_json()
    email = dados.get('email')

    try:
        cursor = con.cursor()

        cursor.execute("SELECT id_usuario FROM usuario WHERE email = ?", (email,))
        usuario = cursor.fetchone()

        if not usuario:
            return jsonify({'mensagem': 'Email não encontrado'}), 404

        id_usuario = usuario[0]
        codigo = gerar_codigo()

        cursor.execute("DELETE FROM recuperacao_senha WHERE id_usuario = ?", (id_usuario,))

        cursor.execute("""
            INSERT INTO recuperacao_senha (id_usuario, codigo)
            VALUES (?, ?)
        """, (id_usuario, codigo))

        con.commit()
        html = render_template('codigo_verificacao.html', codigo=codigo)

        thread = threading.Thread(
            target=enviando_email,
            args=(email, "Código de Recuperação de Senha - WebCar", html)
        )
        thread.start()

        return jsonify({'mensagem': 'Código enviado com sucesso'}), 200

    except:
        return jsonify({'mensagem': 'Erro ao enviar código'}), 500

    finally:
        cursor.close()

@app.route('/verificar_codigo', methods=['POST'])
def verificar_codigo():
    dados = request.get_json()
    email = dados.get('email')
    codigo = int(dados.get('codigo'))

    try:
        cursor = con.cursor()
        cursor.execute("""
            SELECT r.codigo
            FROM usuario u
            INNER JOIN recuperacao_senha r ON u.id_usuario = r.id_usuario
            WHERE u.email = ?
        """, (email,))

        resultado = cursor.fetchone()

        if not resultado:
            return jsonify({'mensagem': 'Código inválido'}), 400

        codigo_banco = int(resultado[0])

        if codigo != codigo_banco:
            return jsonify({'mensagem': 'Código inválido'}), 400

        return jsonify({'mensagem': 'Código válido'}), 200

    except:
        return jsonify({'mensagem': 'Erro ao verificar código'}), 500

    finally:
        cursor.close()
@app.route('/trocar_senha', methods=['POST'])
def trocar_senha():
    dados = request.get_json()
    email = dados.get('email')
    codigo = dados.get('codigo')
    nova_senha = dados.get('nova_senha')
    confirmar_senha = dados.get('confirmar_senha')
    valida = validar_senha(nova_senha)

    if nova_senha != confirmar_senha:
        return jsonify({'mensagem': 'Senhas não coincidem'}), 400
    if not valida:
        return jsonify({'mensagem': 'Senhas fraca'}), 400

    try:
        cursor = con.cursor()

        cursor.execute("""
            SELECT u.id_usuario, u.senha
            FROM usuario u
            INNER JOIN recuperacao_senha r ON u.id_usuario = r.id_usuario
            WHERE u.email = ? AND r.codigo = ?
        """, (email, codigo))

        usuario = cursor.fetchone()

        if not usuario:
            return jsonify({'mensagem': 'Código inválido'}), 400

        id_usuario = usuario[0]
        senha_atual = usuario[1]

        if senha_repetida(id_usuario, nova_senha):
            return jsonify({'mensagem': 'Não pode repetir as últimas 3 senhas'}), 400

        nova_senha_hash = generate_password_hash(nova_senha).decode('utf-8')

        cursor.execute("""
            INSERT INTO historico_senha (id_usuario, senha_anterior)
            VALUES (?, ?)
        """, (id_usuario, senha_atual))

        cursor.execute("""
            UPDATE usuario
            SET senha = ?
            WHERE id_usuario = ?
        """, (nova_senha_hash, id_usuario))

        cursor.execute("""
            DELETE FROM recuperacao_senha
            WHERE id_usuario = ?
        """, (id_usuario,))

        con.commit()
        cursor.execute("""
            DELETE FROM historico_senha
            WHERE id_usuario = ?
            AND id_historico_senha NOT IN (
                SELECT FIRST 3 id_historico_senha
                FROM historico_senha
                WHERE id_usuario = ?
                ORDER BY id_historico_senha DESC
            )
        """, (id_usuario, id_usuario))

        con.commit()

        return jsonify({'mensagem': 'Senha alterada com sucesso'}), 200

    except:
        return jsonify({'mensagem': 'Erro ao trocar senha'}), 500

    finally:
        cursor.close()

@app.route('/buscar_usuario', methods=['POST'])
def buscar_usuario():
    dados = request.get_json()
    nome = dados.get('nome')
    id_usuario = dados.get('id_usuario')

    tipo_usuario = descobre_tipo_usuario()

    if tipo_usuario is None:
        return jsonify({'mensagem': 'usuario nao logado'}), 403

    if tipo_usuario != 0:
        return jsonify({'mensagem': 'Apenas ADM pode acessar'}), 403

    try:
        cursor = con.cursor()
        lista_usuarios = []

        if nome:
            nome = nome.upper()
            cursor.execute("""
                SELECT id_usuario, nome, email, cpf, tipo, situacao
                FROM usuario
                WHERE upper(nome) LIKE ?
            """, (f'%{nome}%',))


        elif id_usuario:
            cursor.execute("""
                SELECT id_usuario, nome, email, cpf, tipo, situacao
                FROM usuario
                WHERE id_usuario = ?
            """, (id_usuario,))

        else:
            cursor.execute("""
                SELECT id_usuario, nome, email, cpf, tipo, situacao
                FROM usuario
            """)

        usuarios = cursor.fetchall()

        for usuario in usuarios:
            lista_usuarios.append({
                'id_usuario': usuario[0],
                'nome': usuario[1],
                'email': usuario[2],
                'cpf': usuario[3],
                'telefone': usuario[4],
                'tipo': usuario[5],
                'situacao': usuario[6],
                'imagem': f'{request.host_url}uploads/Usuarios/{usuario[0]}.jpg'

            })

        if not lista_usuarios:
            return jsonify({'mensagem': 'Usuário não encontrado'}), 404

        return jsonify({'usuarios': lista_usuarios}), 200

    except:
        return jsonify({'mensagem': 'Erro ao listar usuários'}), 500

    finally:
        cursor.close()

@app.route('/uploads/Usuarios/<arquivo>', methods=['GET'])
def imagem_usuario(arquivo):
    pasta = os.path.join(app.config['UPLOAD_FOLDER'], "Usuarios")
    return send_from_directory(pasta, arquivo)

@app.route('/alterar_situacao/<int:id_usuario>', methods=['PUT'])
def alterar_situacao(id_usuario):
    tipo_usuario = descobre_tipo_usuario()
    if tipo_usuario is None:
        return jsonify({'mensagem': 'usuario nao logado'}), 403

    if tipo_usuario != 0:
        return jsonify({'mensagem': 'sem permissao, apenas adm pode mudar a situação'}), 403


    try:

        situacao = request.form.get('situacao')
        print(situacao)
        cursor = con.cursor()
        cursor.execute("select situacao from usuario where id_usuario = ?",
                       (id_usuario,))
        logado = cursor.fetchone()
        if logado is None:
            return jsonify({'mensagem': 'id nao encontrado'}), 404
        if situacao is None:
            return jsonify({'mensagem': 'situacao obrigatoria'}), 400

        try:
            situacao = int(situacao)
        except:
            return jsonify({'mensagem': 'situacao deve ser 0 ou 1'}), 400

        # Validação: só 0 ou 1
        if situacao != 1 and situacao != 0:
            return jsonify({'mensagem': 'situacao invalida (use 0 ou 1)'}), 400

        cursor = con.cursor()

        cursor.execute(
            'UPDATE usuario SET situacao = ?, tentativa= ? WHERE id_usuario = ?',
            (situacao, 1 , id_usuario)
        )


        con.commit()
        return jsonify({'mensagem': 'situacao atualizada com sucesso'}), 200

    except Exception as e:
        return jsonify({'erro no mudar situação'}), 500


@app.route('/verificar_email', methods=['POST'])
def verificar_email():
    dados = request.get_json()
    email = dados.get('email')
    codigo = dados.get('codigo')

    if not email or not codigo:
        return jsonify({'mensagem': 'Email e código são obrigatórios'}), 400

    try:
        cursor = con.cursor()

        cursor.execute("""
            SELECT u.id_usuario, r.codigo
            FROM usuario u
            INNER JOIN recuperacao_senha r ON u.id_usuario = r.id_usuario
            WHERE u.email = ?
        """, (email.lower(),))

        resultado = cursor.fetchone()

        if not resultado:
            return jsonify({'mensagem': 'Código inválido'}), 400

        id_usuario = resultado[0]
        codigo_banco = str(resultado[1])

        if str(codigo) != codigo_banco:
            return jsonify({'mensagem': 'Código inválido'}), 400

        cursor.execute("""
            UPDATE usuario
            SET situacao = 0
            WHERE id_usuario = ?
        """, (id_usuario,))

        cursor.execute("""
            DELETE FROM recuperacao_senha
            WHERE id_usuario = ?
        """, (id_usuario,))

        con.commit()

        return jsonify({'mensagem': 'Email verificado com sucesso'}), 200

    except Exception as e:
        return jsonify({'mensagem': f'Erro ao verificar email: {e}'}), 500

    finally:
        cursor.close()

@app.route('/bloquear_usuario/<int:id_usuario>', methods=['PUT'])
def bloquear_usuario(id_usuario):
    dados = request.get_json()

    motivo_bloqueio = dados.get('motivo_bloqueio')
    tipo_usuario = descobre_tipo_usuario()

    if tipo_usuario != 0:
        return jsonify({'mensagem': 'Apenas ADM pode bloquear usuários'}), 403

    if not motivo_bloqueio:
        return jsonify({'mensagem': 'Informe o motivo do bloqueio'}), 400

    cursor = con.cursor()

    try:
        cursor.execute("""
            SELECT nome, email, situacao
            FROM usuario
            WHERE id_usuario = ?
        """, (id_usuario,))

        usuario = cursor.fetchone()

        if not usuario:
            return jsonify({'mensagem': 'Usuário não encontrado'}), 404

        nome_usuario = usuario[0]
        email_usuario = usuario[1]
        situacao = usuario[2]

        if situacao == 1:
            return jsonify({'mensagem': 'Usuário já está bloqueado'}), 400

        cursor.execute("""
            UPDATE usuario
            SET situacao = ?,
                motivo_bloqueio = ?
            WHERE id_usuario = ?
        """, (1, motivo_bloqueio, id_usuario))

        con.commit()

        html = render_template(
            'email_bloqueio_usuario.html',
            nome=nome_usuario,
            motivo_bloqueio=motivo_bloqueio
        )

        enviando_email(
            email_usuario,
            "Conta bloqueada - WebCar",
            html
        )

        return jsonify({'mensagem': 'Usuário bloqueado e e-mail enviado com sucesso'}), 200

    except Exception as e:
        con.rollback()
        return jsonify({'mensagem': f'Erro ao bloquear usuário: {e}'}), 500

@app.route('/minhas_vendas', methods=['GET'])
def minhas_vendas():
    tipo_usuario = descobre_tipo_usuario()
    id_usuario_logado = descobre_id_usuario()
    id_usuario_parametro = request.args.get('id_usuario')

    if tipo_usuario is None:
        return jsonify({'mensagem': 'Usuário não logado'}), 403

    if tipo_usuario == 2:
        return jsonify({'mensagem': 'Apenas vendedor/adm pode acessar suas vendas'}), 403

    id_vendedor_consulta = id_usuario_logado

    if tipo_usuario == 0 and id_usuario_parametro:
        id_vendedor_consulta = int(id_usuario_parametro)

    cursor = con.cursor()

    try:
        hoje = date.today()

        lista_vendas = []
        calendario_dict = {}
        grafico_mensal_dict = {}
        formas_pagamento_dict = {}

        qtd_vendas = 0
        valor_total_vendido = 0
        lucro_bruto_total = 0
        ticket_medio = 0
        vendas_mes_atual = 0
        valor_mes_atual = 0

        cursor.execute("""
            SELECT
                vd.id_venda,
                vd.data_venda,
                cliente.nome,
                marca.nome,
                ve.modelo,
                ve.placa,
                vd.forma_pagamento,
                vd.valor_venda,
                ve.preco_custo
            FROM venda vd
            LEFT JOIN usuario cliente ON cliente.id_usuario = vd.id_usuario_cliente
            INNER JOIN veiculo ve ON ve.id_veiculo = vd.id_veiculo
            INNER JOIN marca marca ON marca.id_marca = ve.id_marca
            WHERE vd.id_usuario_vendedor = ?
            ORDER BY vd.data_venda DESC
        """, (id_vendedor_consulta,))

        vendas = cursor.fetchall()

        for venda in vendas:
            id_venda = venda[0]
            data_venda = venda[1]
            cliente = venda[2] or 'Sem cliente'
            marca = venda[3] or 'Sem marca'
            modelo = venda[4] or ''
            placa = venda[5] or ''
            forma_pagamento = venda[6]
            valor_venda = float(venda[7] or 0)
            preco_custo = float(venda[8] or 0)

            lucro_bruto = valor_venda - preco_custo

            nome_forma_pagamento = 'Não informado'

            if forma_pagamento == 0:
                nome_forma_pagamento = 'Pix / À vista'
            elif forma_pagamento == 1:
                nome_forma_pagamento = 'Financiado'

            nome_veiculo = f'{marca} {modelo}'.strip()

            lista_vendas.append({
                'id_venda': id_venda,
                'data_venda': str(data_venda) if data_venda else None,
                'cliente': cliente,
                'veiculo': nome_veiculo,
                'marca': marca,
                'modelo': modelo,
                'placa': placa,
                'forma_pagamento': nome_forma_pagamento,
                'valor_venda': round(valor_venda, 2),
                'preco_custo': round(preco_custo, 2),
                'lucro_bruto': round(lucro_bruto, 2)
            })

            qtd_vendas += 1
            valor_total_vendido += valor_venda
            lucro_bruto_total += lucro_bruto

            if data_venda:
                data_comparar = data_venda

                if isinstance(data_venda, datetime):
                    data_comparar = data_venda.date()

                if data_comparar.month == hoje.month and data_comparar.year == hoje.year:
                    vendas_mes_atual += 1
                    valor_mes_atual += valor_venda

                chave_data = str(data_comparar)

                if chave_data not in calendario_dict:
                    calendario_dict[chave_data] = {
                        'data': chave_data,
                        'quantidade': 0,
                        'valor_total': 0
                    }

                calendario_dict[chave_data]['quantidade'] += 1
                calendario_dict[chave_data]['valor_total'] += valor_venda

                chave_mes = f'{data_comparar.year}-{str(data_comparar.month).zfill(2)}'

                if chave_mes not in grafico_mensal_dict:
                    grafico_mensal_dict[chave_mes] = {
                        'mes': chave_mes,
                        'quantidade': 0,
                        'valor_total': 0,
                        'lucro_bruto': 0
                    }

                grafico_mensal_dict[chave_mes]['quantidade'] += 1
                grafico_mensal_dict[chave_mes]['valor_total'] += valor_venda
                grafico_mensal_dict[chave_mes]['lucro_bruto'] += lucro_bruto

            if nome_forma_pagamento not in formas_pagamento_dict:
                formas_pagamento_dict[nome_forma_pagamento] = {
                    'forma_pagamento': nome_forma_pagamento,
                    'quantidade': 0,
                    'valor_total': 0
                }

            formas_pagamento_dict[nome_forma_pagamento]['quantidade'] += 1
            formas_pagamento_dict[nome_forma_pagamento]['valor_total'] += valor_venda

        if qtd_vendas > 0:
            ticket_medio = valor_total_vendido / qtd_vendas

        calendario = []

        for chave in sorted(calendario_dict.keys()):
            item = calendario_dict[chave]
            calendario.append({
                'data': item['data'],
                'quantidade': item['quantidade'],
                'valor_total': round(item['valor_total'], 2)
            })

        grafico_mensal = []

        for chave in sorted(grafico_mensal_dict.keys()):
            item = grafico_mensal_dict[chave]
            grafico_mensal.append({
                'mes': item['mes'],
                'quantidade': item['quantidade'],
                'valor_total': round(item['valor_total'], 2),
                'lucro_bruto': round(item['lucro_bruto'], 2)
            })

        formas_pagamento = []

        for chave in formas_pagamento_dict:
            item = formas_pagamento_dict[chave]
            formas_pagamento.append({
                'forma_pagamento': item['forma_pagamento'],
                'quantidade': item['quantidade'],
                'valor_total': round(item['valor_total'], 2)
            })

        formas_pagamento = sorted(
            formas_pagamento,
            key=lambda item: item['valor_total'],
            reverse=True
        )

        return jsonify({
            'resumo': {
                'qtd_vendas': qtd_vendas,
                'valor_total_vendido': round(valor_total_vendido, 2),
                'lucro_bruto_total': round(lucro_bruto_total, 2),
                'ticket_medio': round(ticket_medio, 2),
                'vendas_mes_atual': vendas_mes_atual,
                'valor_mes_atual': round(valor_mes_atual, 2)
            },
            'vendas': lista_vendas,
            'calendario': calendario,
            'grafico_mensal': grafico_mensal,
            'formas_pagamento': formas_pagamento
        }), 200

    except Exception as e:
        return jsonify({'mensagem': f'Erro ao buscar minhas vendas: {e}'}), 500

    finally:
        cursor.close()