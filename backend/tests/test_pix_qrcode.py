import base64
import sys
import unittest
from io import BytesIO
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from servicos import arkhe_2


class PixQrCodeTest(unittest.TestCase):
    def setUp(self):
        self.cobranca = dict(id_cobranca=123, valor=125.5, status=0,
                             codigo_pagamento='ARKHEPIX:TESTE-SEM-VALOR-REAL')

    def verificar_png(self, cobranca):
        prefixo, conteudo = cobranca['qr_code_png'].split(',', 1)
        self.assertEqual(prefixo, 'data:image/png;base64')
        with Image.open(BytesIO(base64.b64decode(conteudo))) as imagem:
            self.assertEqual(imagem.format, 'PNG')
            self.assertEqual(imagem.width, imagem.height)
            self.assertGreater(imagem.width, 0)

    def test_cria_uma_unica_cobranca_no_endpoint_qrcode_e_preserva_svg(self):
        svg = '<svg xmlns="http://www.w3.org/2000/svg"></svg>'
        retorno = SimpleNamespace(ok=True, json=lambda: dict(self.cobranca, qr_code_svg=svg))
        with patch.object(arkhe_2, '_headers', return_value={}), \
                patch.object(arkhe_2, '_requisitar_arkhe', return_value=retorno) as requisitar:
            resultado = arkhe_2.criar_cobranca_pix(125.5)
        requisitar.assert_called_once_with('POST', '/api/v1/cobrancas/pix/qrcode',
                                           headers={'Content-Type': 'application/json'}, json={'valor': 125.5})
        self.assertEqual(resultado['qr_code_svg'], svg)
        self.assertEqual(resultado['codigo_pagamento'], self.cobranca['codigo_pagamento'])
        self.verificar_png(resultado)

    def test_consulta_cobranca_antiga_gera_imagem_do_mesmo_codigo_sem_criar_outra(self):
        retorno = SimpleNamespace(ok=True, json=lambda: self.cobranca)
        with patch.object(arkhe_2, '_headers', return_value={}), \
                patch.object(arkhe_2, '_requisitar_arkhe', return_value=retorno) as requisitar, \
                patch.object(arkhe_2.qrcode, 'make', wraps=arkhe_2.qrcode.make) as gerar:
            resultado = arkhe_2.consultar_cobranca_pix(123)
        requisitar.assert_called_once_with('GET', '/api/v1/cobrancas/pix/123', headers={})
        gerar.assert_called_once_with(self.cobranca['codigo_pagamento'])
        self.assertIsNone(resultado['qr_code_svg'])
        self.verificar_png(resultado)

    def test_consulta_apenas_status_nao_exige_codigo_nem_imagem(self):
        resultado = arkhe_2._normalizar_cobranca(
            dict(id_cobranca=123, valor=125.5, status=1), exigir_codigo_pix=False)
        self.assertIsNone(resultado['qr_code_png'])
        self.assertEqual(resultado['status'], 1)


if __name__ == '__main__':
    unittest.main()
