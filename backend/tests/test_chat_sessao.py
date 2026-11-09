"""Contratos de autenticação e paginação, sem alterar os bancos locais."""
import sys
import unittest
from contextlib import ExitStack
from pathlib import Path
from unittest.mock import MagicMock, patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import chat_cursos_11_19_20 as chat
import funcao_1_3 as sessao
from app import app
from flask_jwt_extended import JWTManager, create_access_token

if 'flask-jwt-extended' not in app.extensions:
    JWTManager(app)


class ChatSessaoTest(unittest.TestCase):
    def setUp(self):
        self.stack = ExitStack()
        self.addCleanup(self.stack.close)
        self.con = MagicMock()
        self.cur = self.con.cursor.return_value
        self.stack.enter_context(patch.object(chat, 'garantir_estrutura_banco'))
        self.stack.enter_context(patch.object(chat, 'get_db', return_value=self.con))
        self.stack.enter_context(patch.object(sessao, 'get_db', return_value=self.con))
        self.stack.enter_context(patch.object(chat, '_curso_do_professor', return_value=True))
        self.stack.enter_context(patch.object(chat, '_aluno_matriculado', return_value=True))
        self.stack.enter_context(patch('auditoria_24_37.garantir_log_schema'))
        self.stack.enter_context(patch('auditoria_24_37.garantir_gatilhos_auditoria'))
        with app.app_context():
            token = create_access_token(identity='17', additional_claims={'tipo': 1})
        self.headers = {'Authorization': f'Bearer {token}'}
        self.client = app.test_client()

    def test_sessao_fecha_conexao_e_informa_expiracao(self):
        self.cur.fetchone.return_value = ('Professor', None, 1)
        resposta = self.client.get('/verificar_token', headers=self.headers)
        self.assertEqual(resposta.status_code, 200)
        self.assertGreater(resposta.json['expira_em'], 0)
        self.assertEqual(resposta.headers['Cache-Control'], 'no-store')
        self.con.close.assert_called_once()
        self.assertNotIn('RDB$RELATION_FIELDS', self.cur.execute.call_args[0][0])

    def test_falha_banco_preserva_distincao_de_sessao_invalida(self):
        self.cur.execute.side_effect = RuntimeError('banco indisponivel')
        with patch.object(app.logger, 'exception'):
            resposta = self.client.get('/verificar_token', headers=self.headers)
        self.assertEqual(resposta.status_code, 503)
        self.assertNotIn('autenticado', resposta.json)
        self.con.close.assert_called_once()

    def test_sem_token_e_sem_usuario_retorna_401(self):
        self.assertEqual(self.client.get('/verificar_token').status_code, 401)
        self.cur.fetchone.return_value = None
        self.assertEqual(self.client.get('/verificar_token', headers=self.headers).status_code, 401)

    def test_primeiro_lote_ordenado_e_get_nao_grava_leitura(self):
        self.cur.fetchall.return_value = [(n, 8, 'Aluno', '', None, 'texto', 0, None) for n in (6, 5, 4)]
        resposta = self.client.get('/chat/cursos/11/mensagens?id_aluno=8&paginado=1&limite=2', headers=self.headers)
        self.assertEqual(resposta.status_code, 200)
        self.assertEqual([m['id'] for m in resposta.json['mensagens']], [5, 6])
        self.assertTrue(resposta.json['tem_mais'])
        self.assertEqual(resposta.json['primeiro_id'], 5)
        self.con.commit.assert_not_called()
        self.assertNotIn('UPDATE', self.cur.execute.call_args[0][0])

    def test_cursor_incremental_nao_salta_lote_e_limita_consulta(self):
        self.cur.fetchall.return_value = [(n, 8, 'Aluno', '', None, 'texto', 0, None) for n in (7, 8, 9)]
        resposta = self.client.get('/chat/cursos/11/mensagens?id_aluno=8&paginado=1&depois_id=6&limite=2', headers=self.headers)
        self.assertEqual([m['id'] for m in resposta.json['mensagens']], [7, 8])
        self.assertEqual(resposta.json['ultimo_id'], 8)
        sql, params = self.cur.execute.call_args[0]
        self.assertIn('FIRST 3', sql)
        self.assertIn('M.ID_MENSAGEM > ?', sql)
        self.assertEqual(params[-1], 6)

    def test_cursor_invalido_e_rejeitado(self):
        for query in ('depois_id=-1', 'antes_id=abc', 'limite=0', 'antes_id=2&depois_id=1'):
            resposta = self.client.get('/chat/cursos/11/mensagens?id_aluno=8&' + query, headers=self.headers)
            self.assertEqual(resposta.status_code, 400)

    def test_novidades_apos_conversa_vazia_comecam_pelo_primeiro_id(self):
        self.cur.fetchall.return_value = [(n, 8, 'Aluno', '', None, 'texto', 0, None) for n in (1, 2, 3)]
        resposta = self.client.get('/chat/cursos/11/mensagens?id_aluno=8&paginado=1&depois_id=0&limite=2', headers=self.headers)
        self.assertEqual([m['id'] for m in resposta.json['mensagens']], [1, 2])
        self.assertTrue(resposta.json['tem_mais'])
        self.assertIn('ORDER BY M.ID_MENSAGEM ASC', self.cur.execute.call_args[0][0])

    def test_confirmacao_restringe_destinatario_e_intervalo(self):
        resposta = self.client.patch('/chat/cursos/11/mensagens?id_aluno=8', json={'ate_id': 12}, headers=self.headers)
        self.assertEqual(resposta.status_code, 200)
        sql, params = self.cur.execute.call_args[0]
        self.assertIn('LIDA = 0', sql)
        self.assertEqual(params, (11, 8, 17, 12))
        self.con.commit.assert_called_once()

    def test_reenvio_mesma_chave_retorna_mensagem_existente(self):
        self.cur.fetchone.side_effect = [(11,), (42, 11, 8), (42, 17, 'Professor', '', None, 'texto', 0, None)]
        resposta = self.client.post('/chat/cursos/11/mensagens?id_aluno=8', json={'texto': 'texto', 'chave_envio': 'envio-1'}, headers=self.headers)
        self.assertEqual(resposta.status_code, 200)
        self.assertEqual(resposta.json['mensagem']['id'], 42)
        self.assertFalse(any('INSERT' in chamada.args[0] for chamada in self.cur.execute.call_args_list))

    def test_professor_sem_vinculo_nao_le_conversa(self):
        with patch.object(chat, '_curso_do_professor', return_value=False):
            resposta = self.client.get('/chat/cursos/11/mensagens?id_aluno=8&paginado=1', headers=self.headers)
        self.assertEqual(resposta.status_code, 404)
        self.cur.fetchall.assert_not_called()


if __name__ == '__main__':
    unittest.main()
