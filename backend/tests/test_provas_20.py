import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from provas_cursos_20 import normalizar_nome, pontuar, validar_minimo, validar_questoes


class RegrasProvasTest(unittest.TestCase):
    def test_limites_percentual(self):
        for valor in (50, '50', 75, 100):
            self.assertEqual(validar_minimo(valor), int(valor))
        for valor in (49, 101, True, 50.5, '50.5', None, ''):
            with self.subTest(valor=valor), self.assertRaises(ValueError):
                validar_minimo(valor)

    def test_arredondamento_nao_aprova(self):
        questoes = [dict(id=i, tipo='objetiva', resposta_esperada='A') for i in range(3)]
        respostas = {'0': 'A', '1': 'A', '2': 'B'}
        self.assertEqual(pontuar(questoes, respostas, 67)['status'], 2)
        self.assertEqual(pontuar(questoes, respostas, 66)['status'], 1)
        self.assertEqual(pontuar(questoes, respostas, 67)['nota'], 66.67)

    def test_dissertativa_pendente_nao_publica_nota_nem_aprovacao(self):
        questoes = [dict(id=i, tipo='objetiva', resposta_esperada='A') for i in range(3)] + [dict(id=3, tipo='dissertativa')]
        respostas = {'0': 'A', '1': 'A', '2': 'A', '3': 'Texto'}
        pendente = pontuar(questoes, respostas, 50)
        self.assertEqual(pendente['status'], 0)
        self.assertIsNone(pendente['nota'])
        self.assertIsNone(pendente['acertos'])
        self.assertEqual(pontuar(questoes, respostas, 100, {'3': False})['status'], 2)
        self.assertEqual(pontuar(questoes, respostas, 100, {'3': True})['status'], 1)

    def test_resultado_so_e_publicado_apos_ultima_dissertativa(self):
        questoes = [dict(id=1, tipo='dissertativa'), dict(id=2, tipo='dissertativa')]
        respostas = {'1': 'Primeira resposta', '2': 'Segunda resposta'}
        pendente = pontuar(questoes, respostas, 50, {'1': True})
        self.assertEqual(pendente['status'], 0)
        self.assertIsNone(pendente['nota'])
        self.assertIsNone(pendente['acertos'])
        aprovado = pontuar(questoes, respostas, 50, {'1': True, '2': False})
        self.assertEqual((aprovado['status'], aprovado['nota'], aprovado['acertos']), (1, 50, 1))
        reprovado = pontuar(questoes, respostas, 51, {'1': True, '2': False})
        self.assertEqual((reprovado['status'], reprovado['nota'], reprovado['acertos']), (2, 50, 1))

    def test_busca_sem_acentos(self):
        self.assertEqual(normalizar_nome('João Ávila'), 'joao avila')

    def test_questoes_validas_e_alternativas_duplicadas(self):
        prova = dict(titulo='Prova', nota_minima=50, questoes=[dict(enunciado='Pergunta', tipo='objetiva', alternativas=['A', 'B'], resposta_esperada='A')])
        self.assertEqual(validar_questoes(prova)[1], 50)
        prova['questoes'][0]['alternativas'] = ['A', 'A']
        with self.assertRaises(ValueError):
            validar_questoes(prova)


if __name__ == '__main__':
    unittest.main()
