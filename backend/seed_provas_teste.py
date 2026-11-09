"""Recria somente provas, tentativas e certificados de teste; mantém usuários e cursos."""
import argparse
import json
from datetime import datetime, timedelta

from app import app
from banco_37 import get_db
from professor_7 import para_blob_texto
from provas_cursos_20 import _id, _inserir_questoes, _questoes, normalizar_nome, pontuar
from estrutura_banco_1_5_6_9_15_19_20_21_27_28_32_33_36_37 import garantir_estrutura_banco


def recriar():
    garantir_estrutura_banco()
    con = get_db(); cur = con.cursor()
    try:
        cur.execute('DELETE FROM CERTIFICADOS WHERE ID_CURSO IN (SELECT ID_CURSO FROM PROVAS_CURSO)')
        cur.execute('DELETE FROM RESPOSTAS_PROVA')
        cur.execute('DELETE FROM QUESTOES_PROVA')
        cur.execute('DELETE FROM PROVAS_CURSO')
        cur.execute('SELECT C.ID_CURSO, C.TITULO FROM CURSOS C WHERE C.EXCLUIDO = 0 AND EXISTS (SELECT 1 FROM PROFESSORES_CURSO PC WHERE PC.ID_CURSO = C.ID_CURSO) ORDER BY C.ID_CURSO')
        cursos = cur.fetchall()
        quantidade = 0
        for curso, titulo_curso in cursos:
            cur.execute('SELECT U.ID_USUARIO, U.NOME FROM MATRICULAS M JOIN USUARIOS U ON U.ID_USUARIO = M.ID_USUARIO WHERE M.ID_CURSO = ? AND M.STATUS_MATRICULA = 1 ORDER BY U.ID_USUARIO', (curso,))
            alunos = cur.fetchall()
            provas = {}
            for versao, estado, minimo in [(1, 'arquivada', 60), (2, 'vigente', 75), (3, 'rascunho', 50)]:
                prova = _id(cur, 'GEN_EX_PROVA')
                titulo = f'Demonstração: {titulo_curso}'[:150]
                cur.execute('''INSERT INTO PROVAS_CURSO (ID_PROVA, ID_CURSO, TITULO, ESTADO, PUBLICADA, ATIVA_CURSO, NOTA_MINIMA, VERSAO, PUBLICADA_EM, ARQUIVADA_EM)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)''',
                    (prova, curso, titulo, estado, int(estado == 'vigente'), curso if estado == 'vigente' else None, minimo, versao,
                     datetime.now() - timedelta(days=8-versao) if estado != 'rascunho' else None,
                     datetime.now() - timedelta(days=3) if estado == 'arquivada' else None))
                perguntas = [
                    dict(enunciado='A qual curso pertence esta avaliação de demonstração?', tipo='objetiva', alternativas=[titulo_curso, 'Outro curso'], resposta_esperada=titulo_curso),
                    dict(enunciado='Qual ação ajuda a consolidar o aprendizado?', tipo='objetiva', alternativas=['Praticar e revisar o conteúdo', 'Ignorar as atividades'], resposta_esperada='Praticar e revisar o conteúdo'),
                    dict(enunciado='Como esclarecer uma dúvida sobre o conteúdo?', tipo='objetiva', alternativas=['Consultar o material e perguntar ao professor', 'Abandonar os estudos'], resposta_esperada='Consultar o material e perguntar ao professor'),
                    dict(enunciado='Descreva uma aplicação prática do conteúdo estudado.', tipo='dissertativa', alternativas=[], resposta_esperada=''),
                ]
                _inserir_questoes(cur, prova, perguntas)
                provas[versao] = (prova, titulo, minimo, _questoes(cur, prova))

            def tentativa(indice_aluno, versao, acertos_objetivos, correcao, numero, dias):
                nonlocal quantidade
                if indice_aluno >= len(alunos):
                    return
                usuario, nome = alunos[indice_aluno]
                prova, titulo, minimo, questoes = provas[versao]
                respostas = {str(q['id']): q['resposta_esperada'] if i < acertos_objetivos else next((a for a in q['alternativas'] if a != q['resposta_esperada']), 'Aplicação prática de demonstração.') for i, q in enumerate(questoes)}
                correcoes = {} if correcao is None else {str(questoes[-1]['id']): correcao}
                resultado = pontuar(questoes, respostas, minimo, correcoes)
                quando = datetime.now() - timedelta(days=dias)
                cur.execute('''INSERT INTO RESPOSTAS_PROVA (ID_RESPOSTA, ID_PROVA, ID_CURSO, ID_USUARIO, ALUNO_NOME, ALUNO_BUSCA, PROVA_TITULO, VERSAO,
                    NOTA_MINIMA, TENTATIVA, CONTEUDO, RESPOSTAS, STATUS, NOTA, ACERTOS, TOTAL_QUESTOES, CORRECOES_DISSERTATIVAS, FEEDBACK, CRIADO_EM, CORRIGIDO_EM)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)''',
                    (_id(cur, 'GEN_EX_RESPOSTA'), prova, curso, usuario, nome, normalizar_nome(nome), titulo, versao, minimo, numero,
                     para_blob_texto(json.dumps(dict(titulo=titulo, nota_minima=minimo, questoes=questoes), ensure_ascii=False)),
                     para_blob_texto(json.dumps(respostas, ensure_ascii=False)), resultado['status'], resultado['nota'], resultado['acertos'], resultado['total_questoes'],
                     para_blob_texto(json.dumps(correcoes)), para_blob_texto('Registro de demonstração do histórico de provas.'), quando,
                     quando + timedelta(hours=1) if resultado['status'] else None))
                quantidade += 1
            tentativa(0, 1, 1, False, 1, 7)
            tentativa(0, 1, 2, True, 2, 5)
            tentativa(1, 1, 2, False, 1, 6)
            tentativa(2, 1, 2, None, 1, 4)
            tentativa(1, 2, 3, None, 1, 1)
            tentativa(2, 2, 2, False, 1, 2)
            tentativa(3, 2, 2, True, 1, 1)
        con.commit()
        print(f'Criadas {len(cursos) * 3} provas e {quantidade} tentativas de demonstração em {len(cursos)} cursos.')
    except Exception:
        con.rollback(); raise
    finally:
        cur.close(); con.close()


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--recriar-provas-de-teste', action='store_true', required=True)
    parser.parse_args()
    with app.app_context():
        recriar()
