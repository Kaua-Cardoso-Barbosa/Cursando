"""Provas versionadas, correção e histórico permanente por curso (item 20)."""
import json
import unicodedata
from datetime import datetime, timedelta

from flask import jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from app import app
from banco_37 import get_db
from professor_7 import de_blob_texto, para_blob_texto
from estrutura_banco_1_5_6_9_15_19_20_21_27_28_32_33_36_37 import garantir_estrutura_banco
from utilitarios_backend_5_9_12_15_20_24_28_34 import (
    _aluno_matriculado, _bloqueio_assinatura_aluno, _curso_do_professor,
    _decodificar_alternativas, _decodificar_respostas_prova, exigir_tipo, resposta,
)


def _id(cursor, gerador):
    cursor.execute(f"SELECT GEN_ID({gerador}, 1) FROM RDB$DATABASE")
    return cursor.fetchone()[0]


def normalizar_nome(nome):
    return ''.join(c for c in unicodedata.normalize('NFKD', nome or '') if not unicodedata.combining(c)).casefold()


def validar_minimo(valor):
    if isinstance(valor, bool) or not isinstance(valor, (int, str)):
        raise ValueError("A aprovação deve ser um percentual inteiro entre 50% e 100%.")
    try:
        minimo = int(valor)
    except (TypeError, ValueError):
        raise ValueError("A aprovação deve ser um percentual inteiro entre 50% e 100%.")
    if not 50 <= minimo <= 100:
        raise ValueError("A aprovação deve ser de no mínimo 50% e no máximo 100%.")
    return minimo


def validar_questoes(dados):
    if not isinstance(dados, dict):
        raise ValueError('Envie os dados da prova como um objeto JSON.')
    titulo = str(dados.get('titulo') or '').strip()
    if not titulo or len(titulo) > 150:
        raise ValueError('Informe um título de até 150 caracteres.')
    minimo = validar_minimo(dados.get('nota_minima', 70))
    questoes = dados.get('questoes')
    if not isinstance(questoes, list) or not 1 <= len(questoes) <= 100:
        raise ValueError('Cadastre entre 1 e 100 questões.')
    resultado = []
    for q in questoes:
        if not isinstance(q, dict):
            raise ValueError('Questão inválida.')
        enunciado = str(q.get('enunciado') or '').strip()
        tipo = q.get('tipo', 'objetiva')
        if not enunciado or tipo not in ('objetiva', 'dissertativa'):
            raise ValueError('Informe enunciado e tipo válido para todas as questões.')
        alternativas = q.get('alternativas') or []
        gabarito = str(q.get('resposta_esperada') or '').strip()
        if tipo == 'objetiva':
            if isinstance(alternativas, str):
                alternativas = alternativas.splitlines()
            if not isinstance(alternativas, list):
                raise ValueError('Alternativas inválidas.')
            alternativas = [str(a).strip() for a in alternativas if str(a).strip()]
            if len(alternativas) < 2 or len(set(alternativas)) != len(alternativas) or gabarito not in alternativas:
                raise ValueError('Cada objetiva precisa de duas alternativas diferentes ou mais e um gabarito válido.')
        else:
            alternativas, gabarito = [], ''
        resultado.append(dict(enunciado=enunciado, tipo=tipo, alternativas=alternativas, resposta_esperada=gabarito))
    return titulo, minimo, resultado


def pontuar(questoes, respostas, minimo, correcoes=None):
    """Publica a nota e o resultado somente após corrigir todas as questões."""
    correcoes = correcoes or {}
    acertos, pendentes = 0, []
    for q in questoes:
        chave = str(q['id'])
        if q['tipo'] == 'objetiva':
            acertos += respostas.get(chave) == q['resposta_esperada']
        elif chave in correcoes:
            acertos += correcoes[chave] is True
        else:
            pendentes.append(chave)
    total = len(questoes)
    aprovado = bool(total and acertos * 100 >= minimo * total)
    return dict(nota=None if pendentes else (round(100 * acertos / total, 2) if total else 0),
                acertos=None if pendentes else acertos,
                total_questoes=total, status=0 if pendentes else (1 if aprovado else 2), pendentes=pendentes)


def aluno_aprovado(cursor, id_curso, id_aluno):
    cursor.execute('SELECT FIRST 1 ID_RESPOSTA FROM RESPOSTAS_PROVA WHERE ID_CURSO = ? AND ID_USUARIO = ? AND STATUS = 1', (id_curso, id_aluno))
    return cursor.fetchone() is not None


def _questoes(cursor, id_prova):
    cursor.execute('SELECT ID_QUESTAO, ENUNCIADO, TIPO, ALTERNATIVAS, RESPOSTA_ESPERADA FROM QUESTOES_PROVA WHERE ID_PROVA = ? ORDER BY ID_QUESTAO', (id_prova,))
    return [dict(id=r[0], enunciado=de_blob_texto(r[1]), tipo=r[2], alternativas=_decodificar_alternativas(r[3]), resposta_esperada=de_blob_texto(r[4])) for r in cursor.fetchall()]


def _inserir_questoes(cursor, id_prova, questoes):
    for q in questoes:
        cursor.execute('INSERT INTO QUESTOES_PROVA (ID_QUESTAO, ID_PROVA, ENUNCIADO, TIPO, ALTERNATIVAS, RESPOSTA_ESPERADA) VALUES (?, ?, ?, ?, ?, ?)',
                       (_id(cursor, 'GEN_EX_QUESTAO'), id_prova, para_blob_texto(q['enunciado']), q['tipo'], para_blob_texto(json.dumps(q['alternativas'], ensure_ascii=False)), para_blob_texto(q['resposta_esperada'])))


def _prova_dict(r):
    return dict(id=r[0], id_curso=r[1], titulo=r[2], estado=r[3], nota_minima=r[4], versao=r[5], publicada=r[3] == 'vigente')


def _prova(cursor, id_prova):
    cursor.execute('SELECT ID_PROVA, ID_CURSO, TITULO, ESTADO, NOTA_MINIMA, VERSAO FROM PROVAS_CURSO WHERE ID_PROVA = ?', (id_prova,))
    r = cursor.fetchone()
    return _prova_dict(r) if r else None


def _travar_curso(cursor, id_curso):
    # Publicação, arquivamento e envio usam a mesma trava para não trocar a versão durante o envio.
    cursor.execute('SELECT ID_CURSO FROM CURSOS WHERE ID_CURSO = ? WITH LOCK', (id_curso,))
    cursor.fetchone()


def _acesso_historico(cursor, id_curso, id_aluno):
    cursor.execute('SELECT FIRST 1 ID_USUARIO FROM MATRICULAS WHERE ID_CURSO = ? AND ID_USUARIO = ?', (id_curso, id_aluno))
    if cursor.fetchone():
        return True
    cursor.execute('SELECT FIRST 1 ID_RESPOSTA FROM RESPOSTAS_PROVA WHERE ID_CURSO = ? AND ID_USUARIO = ?', (id_curso, id_aluno))
    return cursor.fetchone() is not None


@app.route('/aluno/provas/cursos', methods=['GET'])
@jwt_required()
def cursos_historico_aluno():
    if (negado := exigir_tipo(2)):
        return negado
    garantir_estrutura_banco()
    con = get_db(); cur = con.cursor()
    try:
        cur.execute('''SELECT C.ID_CURSO, C.TITULO FROM CURSOS C
            WHERE EXISTS (SELECT 1 FROM MATRICULAS M WHERE M.ID_CURSO = C.ID_CURSO AND M.ID_USUARIO = ?)
               OR EXISTS (SELECT 1 FROM RESPOSTAS_PROVA R WHERE R.ID_CURSO = C.ID_CURSO AND R.ID_USUARIO = ?)
            ORDER BY C.TITULO''', (get_jwt_identity(), get_jwt_identity()))
        return jsonify(cursos=[dict(id=r[0], titulo=r[1]) for r in cur.fetchall()])
    finally:
        cur.close(); con.close()


def _tentativa_dict(r, professor=False, detalhes=False):
    conteudo = _decodificar_respostas_prova(r[15])
    item = dict(id=r[0], id_prova=r[1], id_curso=r[2], id_aluno=r[3], aluno=r[4], prova=r[5],
                versao=r[6], nota_minima=r[7], tentativa=r[8], status=r[9], nota=float(r[10]) if r[10] is not None else None,
                acertos=r[11], total_questoes=r[12], criado_em=r[13].isoformat() if r[13] else None,
                corrigido_em=r[14].isoformat() if r[14] else None, feedback=de_blob_texto(r[16]),
                estado_prova=r[18] or 'arquivada')
    # Tentativas antigas também ocultam a pontuação enquanto a correção não terminou.
    if item['status'] == 0:
        item['nota'] = None
        item['acertos'] = None
    if item['status'] == 2:
        item['pode_tentar_em'] = ((r[14] or r[13]) + timedelta(days=1)).isoformat()
    if detalhes:
        item['questoes'] = conteudo.get('questoes', [])
        if not professor:
            item['questoes'] = [{k: v for k, v in q.items() if k != 'resposta_esperada'} for q in item['questoes']]
        item['respostas'] = _decodificar_respostas_prova(r[19])
        item['correcoes_dissertativas'] = _decodificar_respostas_prova(r[17])
    return item


SELECAO_TENTATIVA = '''R.ID_RESPOSTA, R.ID_PROVA, R.ID_CURSO, R.ID_USUARIO, R.ALUNO_NOME,
 R.PROVA_TITULO, R.VERSAO, R.NOTA_MINIMA, R.TENTATIVA, R.STATUS, R.NOTA, R.ACERTOS,
 R.TOTAL_QUESTOES, R.CRIADO_EM, R.CORRIGIDO_EM, R.CONTEUDO, R.FEEDBACK,
 R.CORRECOES_DISSERTATIVAS, P.ESTADO, R.RESPOSTAS'''


def _historico(cursor, id_curso, id_aluno=None):
    pagina = max(1, request.args.get('pagina', 1, type=int))
    tamanho = min(50, max(1, request.args.get('por_pagina', 10, type=int)))
    filtros, params = ['R.ID_CURSO = ?'], [id_curso]
    if id_aluno is not None:
        filtros.append('R.ID_USUARIO = ?')
        params.append(id_aluno)
    busca = normalizar_nome((request.args.get('busca') or '').strip())[:150]
    if busca and id_aluno is None:
        filtros.append('R.ALUNO_BUSCA CONTAINING ?')
        params.append(busca)
    estado = request.args.get('estado', 'todas')
    if estado not in ('todas', 'vigente', 'arquivada'):
        raise ValueError('Filtro de prova inválido.')
    if estado != 'todas':
        filtros.append('P.ESTADO = ?')
        params.append(estado)
    resultado = request.args.get('resultado', 'todos')
    if resultado != 'todos':
        if resultado not in ('0', '1', '2'):
            raise ValueError('Filtro de resultado inválido.')
        filtros.append('R.STATUS = ?')
        params.append(int(resultado))
    ordem = request.args.get('ordem', 'recentes')
    ordenacoes = {
        'recentes': 'R.CRIADO_EM DESC, R.ID_RESPOSTA DESC',
        'nota_asc': 'CASE WHEN R.STATUS = 0 OR R.NOTA IS NULL THEN 1 ELSE 0 END, R.NOTA ASC, R.CRIADO_EM DESC, R.ID_RESPOSTA DESC',
        'nota_desc': 'CASE WHEN R.STATUS = 0 OR R.NOTA IS NULL THEN 1 ELSE 0 END, R.NOTA DESC, R.CRIADO_EM DESC, R.ID_RESPOSTA DESC',
    }
    if ordem not in ordenacoes:
        raise ValueError('Ordenação inválida.')
    origem = 'FROM RESPOSTAS_PROVA R LEFT JOIN PROVAS_CURSO P ON P.ID_PROVA = R.ID_PROVA WHERE ' + ' AND '.join(filtros)
    cursor.execute('SELECT COUNT(*) ' + origem, params)
    total = cursor.fetchone()[0]
    cursor.execute(f'SELECT FIRST {tamanho} SKIP {(pagina - 1) * tamanho} {SELECAO_TENTATIVA} {origem} ORDER BY {ordenacoes[ordem]}', params)
    return dict(itens=[_tentativa_dict(r) for r in cursor.fetchall()], total=total, pagina=pagina,
                por_pagina=tamanho, paginas=max(1, (total + tamanho - 1) // tamanho))


@app.route('/professor/cursos/<int:id_curso>/provas', methods=['GET', 'POST'])
@jwt_required()
def provas_professor(id_curso):
    if (negado := exigir_tipo(1)):
        return negado
    garantir_estrutura_banco()
    con = get_db(); cur = con.cursor()
    try:
        if not _curso_do_professor(cur, id_curso, int(get_jwt_identity())):
            return resposta('Curso não encontrado para este professor.', 404)
        if request.method == 'GET':
            cur.execute('SELECT ID_PROVA, ID_CURSO, TITULO, ESTADO, NOTA_MINIMA, VERSAO FROM PROVAS_CURSO WHERE ID_CURSO = ? ORDER BY ID_PROVA DESC', (id_curso,))
            return jsonify({'provas': [_prova_dict(r) for r in cur.fetchall()]})
        dados = request.get_json(silent=True) or {}
        titulo, minimo, questoes = validar_questoes(dados)
        _travar_curso(cur, id_curso)
        cur.execute('SELECT COALESCE(MAX(VERSAO), 0) + 1 FROM PROVAS_CURSO WHERE ID_CURSO = ?', (id_curso,))
        versao = cur.fetchone()[0]
        id_prova = _id(cur, 'GEN_EX_PROVA')
        cur.execute('INSERT INTO PROVAS_CURSO (ID_PROVA, ID_CURSO, TITULO, NOTA_MINIMA, VERSAO) VALUES (?, ?, ?, ?, ?)', (id_prova, id_curso, titulo, minimo, versao))
        _inserir_questoes(cur, id_prova, questoes)
        con.commit()
        return resposta('Rascunho criado.', 201, 'sucesso', id_prova=id_prova)
    except ValueError as error:
        con.rollback(); return resposta(str(error), 400)
    except Exception:
        con.rollback(); app.logger.exception('Erro nas provas'); return resposta('Não foi possível processar a prova.', 500)
    finally:
        cur.close(); con.close()


@app.route('/professor/provas/<int:id_prova>', methods=['GET', 'PUT', 'DELETE'])
@jwt_required()
def prova_por_id(id_prova):
    if (negado := exigir_tipo(1)):
        return negado
    garantir_estrutura_banco()
    con = get_db(); cur = con.cursor()
    try:
        prova = _prova(cur, id_prova)
        if not prova or not _curso_do_professor(cur, prova['id_curso'], int(get_jwt_identity())):
            return resposta('Prova não encontrada.', 404)
        if request.method == 'GET':
            return jsonify(prova=prova, questoes=_questoes(cur, id_prova))
        _travar_curso(cur, prova['id_curso'])
        prova = _prova(cur, id_prova)
        if prova['estado'] != 'rascunho':
            return resposta('Uma prova publicada é permanente. Crie outra versão ou arquive esta prova.', 409)
        cur.execute('SELECT FIRST 1 ID_RESPOSTA FROM RESPOSTAS_PROVA WHERE ID_PROVA = ?', (id_prova,))
        if cur.fetchone():
            return resposta('Esta prova possui respostas e não pode ser alterada ou excluída.', 409)
        if request.method == 'DELETE':
            cur.execute('DELETE FROM QUESTOES_PROVA WHERE ID_PROVA = ?', (id_prova,))
            cur.execute('DELETE FROM PROVAS_CURSO WHERE ID_PROVA = ?', (id_prova,))
        else:
            titulo, minimo, questoes = validar_questoes(request.get_json(silent=True) or {})
            cur.execute('UPDATE PROVAS_CURSO SET TITULO = ?, NOTA_MINIMA = ? WHERE ID_PROVA = ?', (titulo, minimo, id_prova))
            cur.execute('DELETE FROM QUESTOES_PROVA WHERE ID_PROVA = ?', (id_prova,))
            _inserir_questoes(cur, id_prova, questoes)
        con.commit()
        return resposta('Rascunho excluído.' if request.method == 'DELETE' else 'Rascunho salvo.', 200, 'sucesso')
    except ValueError as error:
        con.rollback(); return resposta(str(error), 400)
    except Exception:
        con.rollback(); app.logger.exception('Erro na prova'); return resposta('Não foi possível processar a prova.', 500)
    finally:
        cur.close(); con.close()


@app.route('/professor/provas/<int:id_prova>/publicar', methods=['PATCH'])
@app.route('/professor/provas/<int:id_prova>/arquivar', methods=['PATCH'])
@jwt_required()
def mudar_estado_prova(id_prova):
    if (negado := exigir_tipo(1)):
        return negado
    garantir_estrutura_banco()
    con = get_db(); cur = con.cursor()
    try:
        prova = _prova(cur, id_prova)
        if not prova or not _curso_do_professor(cur, prova['id_curso'], int(get_jwt_identity())):
            return resposta('Prova não encontrada.', 404)
        _travar_curso(cur, prova['id_curso'])
        prova = _prova(cur, id_prova)
        publicar = request.path.endswith('/publicar')
        if publicar:
            if prova['estado'] != 'rascunho':
                return resposta('Somente rascunhos podem ser publicados. Para reutilizar uma arquivada, crie outra versão.', 409)
            validar_questoes({**prova, 'questoes': _questoes(cur, id_prova)})
            cur.execute("UPDATE PROVAS_CURSO SET ESTADO = 'arquivada', PUBLICADA = 0, ATIVA_CURSO = NULL, ARQUIVADA_EM = CURRENT_TIMESTAMP WHERE ID_CURSO = ? AND ESTADO = 'vigente'", (prova['id_curso'],))
            cur.execute("UPDATE PROVAS_CURSO SET ESTADO = 'vigente', PUBLICADA = 1, ATIVA_CURSO = ID_CURSO, PUBLICADA_EM = CURRENT_TIMESTAMP WHERE ID_PROVA = ?", (id_prova,))
        else:
            if prova['estado'] != 'vigente':
                return resposta('Somente provas vigentes podem ser arquivadas.', 409)
            cur.execute("UPDATE PROVAS_CURSO SET ESTADO = 'arquivada', PUBLICADA = 0, ATIVA_CURSO = NULL, ARQUIVADA_EM = CURRENT_TIMESTAMP WHERE ID_PROVA = ?", (id_prova,))
        con.commit()
        return resposta('Prova publicada; a anterior foi arquivada.' if publicar else 'Prova arquivada. O histórico foi preservado.', 200, 'sucesso')
    except ValueError as error:
        con.rollback(); return resposta(str(error), 400)
    except Exception:
        con.rollback(); app.logger.exception('Erro no estado da prova'); return resposta('Não foi possível alterar o estado da prova.', 500)
    finally:
        cur.close(); con.close()


# Clientes antigos não podem executar a edição destrutiva ou a exclusão por curso.
@app.route('/professor/cursos/<int:id_curso>/prova', methods=['GET', 'POST', 'DELETE'])
@jwt_required()
def prova_professor(id_curso):
    if (negado := exigir_tipo(1)):
        return negado
    return resposta('Use a gestão de provas versionadas. Atualize o site ou aplicativo.', 409)


@app.route('/professor/cursos/<int:id_curso>/provas/historico', methods=['GET'])
@app.route('/aluno/cursos/<int:id_curso>/provas/historico', methods=['GET'])
@jwt_required()
def historico_provas(id_curso):
    professor = request.path.startswith('/professor/')
    if (negado := exigir_tipo(1 if professor else 2)):
        return negado
    garantir_estrutura_banco()
    con = get_db(); cur = con.cursor()
    try:
        usuario = int(get_jwt_identity())
        permitido = _curso_do_professor(cur, id_curso, usuario) if professor else _acesso_historico(cur, id_curso, usuario)
        if not permitido:
            return resposta('Curso não encontrado para este usuário.', 404)
        return jsonify(_historico(cur, id_curso, None if professor else usuario))
    except ValueError as error:
        return resposta(str(error), 400)
    finally:
        cur.close(); con.close()


@app.route('/professor/provas/tentativas/<int:id_resposta>', methods=['GET'])
@app.route('/aluno/provas/tentativas/<int:id_resposta>', methods=['GET'])
@jwt_required()
def detalhe_tentativa(id_resposta):
    professor = request.path.startswith('/professor/')
    if (negado := exigir_tipo(1 if professor else 2)):
        return negado
    garantir_estrutura_banco()
    con = get_db(); cur = con.cursor()
    try:
        cur.execute(f'SELECT {SELECAO_TENTATIVA} FROM RESPOSTAS_PROVA R LEFT JOIN PROVAS_CURSO P ON P.ID_PROVA = R.ID_PROVA WHERE R.ID_RESPOSTA = ?', (id_resposta,))
        row = cur.fetchone()
        usuario = int(get_jwt_identity())
        if not row or (professor and not _curso_do_professor(cur, row[2], usuario)) or (not professor and row[3] != usuario):
            return resposta('Tentativa não encontrada.', 404)
        return jsonify(_tentativa_dict(row, professor, True))
    finally:
        cur.close(); con.close()


@app.route('/aluno/cursos/<int:id_curso>/prova', methods=['GET', 'POST'])
@jwt_required()
def prova_aluno(id_curso):
    if (negado := exigir_tipo(2)):
        return negado
    garantir_estrutura_banco()
    usuario = int(get_jwt_identity())
    con = get_db(); cur = con.cursor()
    try:
        if not _acesso_historico(cur, id_curso, usuario):
            return resposta('Aluno sem matrícula neste curso.', 403)
        if request.method == 'POST':
            _travar_curso(cur, id_curso)
        cur.execute("SELECT ID_PROVA, ID_CURSO, TITULO, ESTADO, NOTA_MINIMA, VERSAO FROM PROVAS_CURSO WHERE ID_CURSO = ? AND ESTADO = 'vigente'", (id_curso,))
        row = cur.fetchone()
        prova = _prova_dict(row) if row else None
        aprovado = aluno_aprovado(cur, id_curso, usuario)
        envio = None
        if prova:
            cur.execute(f'SELECT FIRST 1 {SELECAO_TENTATIVA} FROM RESPOSTAS_PROVA R LEFT JOIN PROVAS_CURSO P ON P.ID_PROVA = R.ID_PROVA WHERE R.ID_PROVA = ? AND R.ID_USUARIO = ? ORDER BY R.ID_RESPOSTA DESC', (prova['id'], usuario))
            ultimo = cur.fetchone()
            envio = _tentativa_dict(ultimo) if ultimo else None
        cur.execute('SELECT PROGRESSO, STATUS_MATRICULA FROM MATRICULAS WHERE ID_CURSO = ? AND ID_USUARIO = ?', (id_curso, usuario))
        matricula = cur.fetchone()
        motivo = ''
        if not prova:
            motivo = 'Nenhuma prova vigente neste curso. Seu histórico continua disponível.'
        elif aprovado:
            motivo = 'Você já foi aprovado neste curso. A aprovação foi preservada.'
        elif not matricula or matricula[1] != 1 or (matricula[0] or 0) < 100:
            motivo = 'Conclua as aulas e mantenha sua matrícula ativa para realizar a prova.'
        elif _bloqueio_assinatura_aluno(cur, usuario):
            motivo = 'Sua assinatura precisa estar ativa para realizar a prova.'
        elif envio and envio['status'] == 0:
            motivo = 'Sua tentativa aguarda correção do professor.'
        elif envio and envio['status'] == 2 and datetime.now() < datetime.fromisoformat(envio['pode_tentar_em']):
            motivo = 'Nova tentativa disponível após ' + datetime.fromisoformat(envio['pode_tentar_em']).strftime('%d/%m/%Y %H:%M') + '.'
        questoes = _questoes(cur, prova['id']) if prova else []
        if request.method == 'GET':
            return jsonify(prova=prova, aprovado_curso=aprovado, envio=envio, pode_responder=not motivo, motivo=motivo,
                           questoes=[{k: v for k, v in q.items() if k != 'resposta_esperada'} for q in questoes])
        dados = request.get_json(silent=True) or {}
        if not isinstance(dados, dict):
            return resposta('Envie as respostas como um objeto JSON.', 400)
        if not prova or dados.get('id_prova') != prova['id']:
            return resposta('A prova foi substituída ou arquivada. Atualize a página antes de responder.', 409)
        if motivo:
            return resposta(motivo, 409)
        respostas_aluno = dados.get('respostas')
        if not isinstance(respostas_aluno, dict) or set(respostas_aluno) != {str(q['id']) for q in questoes}:
            return resposta('Responda todas as questões desta prova.', 400)
        for q in questoes:
            valor = respostas_aluno[str(q['id'])]
            if not isinstance(valor, str) or not valor.strip() or len(valor) > 20000 or (q['tipo'] == 'objetiva' and valor not in q['alternativas']):
                return resposta('Respostas inválidas ou incompletas.', 400)
        resultado = pontuar(questoes, respostas_aluno, prova['nota_minima'])
        cur.execute('SELECT NOME FROM USUARIOS WHERE ID_USUARIO = ?', (usuario,))
        nome = cur.fetchone()[0]
        cur.execute('SELECT COUNT(*) + 1 FROM RESPOSTAS_PROVA WHERE ID_PROVA = ? AND ID_USUARIO = ?', (prova['id'], usuario))
        numero = cur.fetchone()[0]
        id_resposta = _id(cur, 'GEN_EX_RESPOSTA')
        snapshot = json.dumps(dict(titulo=prova['titulo'], questoes=questoes, nota_minima=prova['nota_minima']), ensure_ascii=False)
        cur.execute('''INSERT INTO RESPOSTAS_PROVA (ID_RESPOSTA, ID_PROVA, ID_CURSO, ID_USUARIO, ALUNO_NOME, ALUNO_BUSCA, PROVA_TITULO,
                       VERSAO, NOTA_MINIMA, TENTATIVA, CONTEUDO, RESPOSTAS, STATUS, NOTA, ACERTOS, TOTAL_QUESTOES, CORRIGIDO_EM)
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CASE WHEN ? = 0 THEN NULL ELSE CURRENT_TIMESTAMP END)''',
                    (id_resposta, prova['id'], id_curso, usuario, nome, normalizar_nome(nome), prova['titulo'], prova['versao'],
                     prova['nota_minima'], numero, para_blob_texto(snapshot), para_blob_texto(json.dumps(respostas_aluno, ensure_ascii=False)),
                     resultado['status'], resultado['nota'], resultado['acertos'], resultado['total_questoes'], resultado['status']))
        con.commit()
        _notificar(cur, id_curso, usuario, resultado['status'], '')
        return resposta('Tentativa registrada. As dissertativas aguardam correção.' if resultado['status'] == 0 else 'Prova corrigida automaticamente.', 201, 'sucesso', resultado=resultado, id_resposta=id_resposta)
    except Exception:
        con.rollback(); app.logger.exception('Erro na tentativa'); return resposta('Não foi possível processar a tentativa.', 500)
    finally:
        cur.close(); con.close()


def _notificar(cursor, curso, aluno, status, feedback):
    if status != 2:
        return
    try:
        from chat_cursos_11_19_20 import notificar_reprovacao_prova
        cursor.execute('SELECT EMAIL FROM USUARIOS WHERE ID_USUARIO = ?', (aluno,))
        email = cursor.fetchone()[0]
        cursor.execute('SELECT TITULO FROM CURSOS WHERE ID_CURSO = ?', (curso,))
        titulo = cursor.fetchone()[0]
        if email:
            notificar_reprovacao_prova(email, titulo, feedback)
    except Exception:
        app.logger.exception('Não foi possível enviar o aviso de reprovação.')


@app.route('/professor/provas/respostas', methods=['GET'])
@jwt_required()
def respostas_prova_professor():
    if (negado := exigir_tipo(1)):
        return negado
    return resposta('Consulte o histórico por curso na nova gestão de provas.', 409)


@app.route('/professor/provas/respostas/<int:id_resposta>/questoes/<int:id_questao>', methods=['PATCH'])
@jwt_required()
def corrigir_questao_dissertativa(id_resposta, id_questao):
    if (negado := exigir_tipo(1)):
        return negado
    dados = request.get_json(silent=True) or {}
    if not isinstance(dados, dict):
        return resposta('Correção inválida.', 400)
    if not isinstance(dados.get('correta'), bool):
        return resposta('Informe se a resposta está correta.', 400)
    garantir_estrutura_banco()
    con = get_db(); cur = con.cursor()
    try:
        cur.execute('SELECT ID_CURSO FROM RESPOSTAS_PROVA WHERE ID_RESPOSTA = ?', (id_resposta,))
        curso = cur.fetchone()
        if not curso or not _curso_do_professor(cur, curso[0], int(get_jwt_identity())):
            return resposta('Tentativa não encontrada.', 404)
        cur.execute('SELECT STATUS, CONTEUDO, RESPOSTAS, CORRECOES_DISSERTATIVAS, NOTA_MINIMA, ID_USUARIO FROM RESPOSTAS_PROVA WHERE ID_RESPOSTA = ? WITH LOCK', (id_resposta,))
        row = cur.fetchone()
        if row[0] != 0:
            return resposta('Esta tentativa já foi finalizada.', 409)
        questoes = _decodificar_respostas_prova(row[1]).get('questoes', [])
        if not any(q['id'] == id_questao and q['tipo'] == 'dissertativa' for q in questoes):
            return resposta('Questão dissertativa não encontrada nesta tentativa.', 404)
        correcoes = _decodificar_respostas_prova(row[3])
        correcoes[str(id_questao)] = dados['correta']
        resultado = pontuar(questoes, _decodificar_respostas_prova(row[2]), row[4], correcoes)
        feedback = str(dados.get('feedback') or '').strip()[:2000]
        cur.execute('''UPDATE RESPOSTAS_PROVA SET CORRECOES_DISSERTATIVAS = ?, STATUS = ?, NOTA = ?, ACERTOS = ?,
                       TOTAL_QUESTOES = ?, FEEDBACK = ?, CORRIGIDO_POR = ?, CORRIGIDO_EM = CASE WHEN ? = 0 THEN NULL ELSE CURRENT_TIMESTAMP END
                       WHERE ID_RESPOSTA = ? AND STATUS = 0''',
                    (para_blob_texto(json.dumps(correcoes)), resultado['status'], resultado['nota'], resultado['acertos'],
                     resultado['total_questoes'], para_blob_texto(feedback), get_jwt_identity(), resultado['status'], id_resposta))
        con.commit()
        _notificar(cur, curso[0], row[5], resultado['status'], feedback)
        return resposta('Questão corrigida.', 200, 'sucesso', resultado=resultado)
    except Exception:
        con.rollback(); app.logger.exception('Erro na correção'); return resposta('Não foi possível corrigir a tentativa.', 500)
    finally:
        cur.close(); con.close()
