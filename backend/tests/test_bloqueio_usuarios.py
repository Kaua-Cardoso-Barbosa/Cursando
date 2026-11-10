import unittest
from unittest.mock import MagicMock, patch

from flask_jwt_extended import JWTManager, create_access_token
from app import app
import usuario_1_3_8_34 as usuarios


class BloqueioUsuariosTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        if 'flask-jwt-extended' not in app.extensions:
            JWTManager(app)

    def setUp(self):
        self.client = app.test_client()
        with app.app_context():
            self.admin = create_access_token(identity='1', additional_claims={'tipo': 0})
            self.aluno = create_access_token(identity='8', additional_claims={'tipo': 2})
        self.headers = {'Authorization': 'Bearer ' + self.admin}

    def test_bloqueio_exige_motivo_valido(self):
        for dados in ({'bloqueado': True}, {'bloqueado': True, 'motivo': '  '},
                      {'bloqueado': True, 'motivo': 'x' * 501}, {'bloqueado': True, 'motivo': 123},
                      {'bloqueado': 'false', 'motivo': 'Texto'}, ['invalido']):
            with self.subTest(dados=dados), patch.object(usuarios, 'get_db') as db:
                retorno = self.client.patch('/usuarios/8/status', json=dados, headers=self.headers)
                self.assertEqual(retorno.status_code, 400)
                db.assert_not_called()

    def test_grava_motivo_e_limpa_ao_desbloquear(self):
        for bloqueado, motivo, esperado in ((True, '  Descumprimento das regras  ', 'Descumprimento das regras'),
                                           (False, '', None)):
            with self.subTest(bloqueado=bloqueado), patch.object(usuarios, 'get_db') as db:
                con = MagicMock(); cursor = con.cursor.return_value; cursor.fetchone.return_value = (1,)
                db.return_value = con
                retorno = self.client.patch('/usuarios/8/status', json={'bloqueado': bloqueado, 'motivo': motivo}, headers=self.headers)
                self.assertEqual(retorno.status_code, 200)
                sql, valores = cursor.execute.call_args_list[-1].args
                self.assertIn('MOTIVO_BLOQUEIO', sql)
                self.assertIn('TENTATIVAS = 0', sql)
                self.assertEqual(valores, (1 if bloqueado else 0, esperado, 8))
                con.commit.assert_called_once()

    def test_permissoes_e_propria_conta(self):
        dados = {'bloqueado': True, 'motivo': 'Motivo'}
        self.assertEqual(self.client.patch('/usuarios/8/status', json=dados).status_code, 401)
        self.assertEqual(self.client.patch('/usuarios/8/status', json=dados, headers={'Authorization': 'Bearer ' + self.aluno}).status_code, 403)
        self.assertEqual(self.client.patch('/usuarios/1/status', json=dados, headers=self.headers).status_code, 400)


if __name__ == '__main__':
    unittest.main()
