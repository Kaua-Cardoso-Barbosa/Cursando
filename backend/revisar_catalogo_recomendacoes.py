"""Atualiza somente os cursos de teste do professor de recomendações."""
import argparse
import json
from concurrent.futures import ThreadPoolExecutor
from io import BytesIO
from pathlib import Path

import requests
from PIL import Image


# Título original sem [Teste], novo título, descrição, foto Pexels e autoria.
CATALOGO = [
    ('Ábaco: prática de operações', 'Números e quantidades na alfabetização matemática',
     'Explore contagem, agrupamentos e valor posicional com materiais concretos. Um percurso introdutório para compreender unidades, dezenas e centenas, usando o ábaco como apoio visual antes de passar às operações no papel.',
     14453482, 'Vural Yavas'),
    ('Ábaco: cálculo mental', 'Cálculo rápido: estratégias para somar e subtrair',
     'Desenvolva agilidade com decomposição de números, compensação e estimativas. Em nível intermediário, use representações no ábaco para visualizar trocas e avançar para cálculos mentais com números de dois e três algarismos.',
     1019470, 'ClickerHappy'),
    ('Frações e porcentagens na prática', 'Matemática financeira do dia a dia',
     'Entenda descontos, acréscimos, juros simples e comparação de preços. Para quem já conhece as quatro operações e quer aplicar porcentagens ao orçamento, às compras parceladas e a decisões financeiras cotidianas.',
     5877591, 'Kaboompics'),
    ('Resolução de problemas matemáticos', 'Do enunciado à equação: desafios de raciocínio',
     'Aprenda a identificar incógnitas, organizar informações e transformar situações em equações de primeiro grau. Exercícios de dificuldade crescente abordam proporções, sequências e problemas com várias etapas, com foco na justificativa de cada solução.',
     5184955, 'cottonbro studio'),
    ('Marketing de conteúdo para iniciantes', 'Métricas e resultados para pequenos negócios',
     'Saia das curtidas e entenda alcance, conversão, custo por aquisição e retorno de campanhas. Um curso intermediário de marketing digital para interpretar relatórios, escolher indicadores e decidir o que ajustar em ações de divulgação.',
     5466250, 'Antoni Shkraba'),
    ('Redes sociais e planejamento digital', 'Escrita persuasiva para páginas e anúncios',
     'Construa mensagens claras a partir das necessidades do público. Pratique propostas de valor, títulos, descrições e chamadas para ação em páginas de venda e anúncios digitais, com exemplos para quem está começando a escrever para negócios.',
     3183174, 'fauxels'),
    ('Calopsitas: vínculo e aproximação', 'Rotina e bem-estar de aves de companhia',
     'Organize uma rotina que respeite descanso, alimentação e interação. Voltado a tutores iniciantes, o curso usa calopsitas como referência para reconhecer comportamentos cotidianos e planejar cuidados responsáveis, sem substituir o acompanhamento veterinário.',
     32276363, 'Kamakshi'),
    ('Calopsitas: assovios e enriquecimento', 'Ambientes estimulantes para aves domésticas',
     'Planeje atividades de exploração e busca de alimento para aves de companhia. Para tutores com experiência básica, apresenta enriquecimento ambiental, rodízio de atividades e observação de preferências, com aplicações à rotina de calopsitas.',
     11961251, 'Connor Scott McManus'),
    ('Fotografia: composição para iniciantes', 'Composição de retratos com luz natural',
     'Observe direção da luz, posição do rosto e relação entre pessoa e fundo. Um curso introdutório para compor retratos com câmera ou celular, trabalhando enquadramento, pontos de atenção e uso de janelas e áreas de sombra.',
     7619784, 'Vlado Krstevski'),
    ('Fotografia: enquadramento criativo', 'Narrativas visuais na fotografia de rua',
     'Aprofunde composição com camadas, linhas, contrastes e escolha do instante. Para quem já domina o enquadramento básico, propõe exercícios de observação e sequências fotográficas que conectam pessoas, arquitetura e movimento em uma narrativa.',
     8119479, 'Lucas Pezeta'),
]

PASTA = Path(__file__).resolve().parent / 'static/uploads/cursos/recomendacoes'


def caminho_capa(foto):
    return f'/static/uploads/cursos/recomendacoes/pexels-{foto}.jpg'


def baixar_capa(item):
    foto = item[3]
    arquivo = 'abacus-mathematics-addition-subtraction-1019470.jpeg' if foto == 1019470 else f'pexels-photo-{foto}.jpeg'
    url = f'https://images.pexels.com/photos/{foto}/{arquivo}?auto=compress&cs=tinysrgb&w=1280&h=720&fit=crop'
    resposta = requests.get(url, timeout=40)
    resposta.raise_for_status()
    with Image.open(BytesIO(resposta.content)) as imagem:
        imagem.verify()
    with Image.open(BytesIO(resposta.content)) as imagem:
        if imagem.size != (1280, 720):
            raise ValueError(f'Capa {foto} fora do tamanho esperado: {imagem.size}')
    destino = PASTA / f'pexels-{foto}.jpg'
    destino.write_bytes(resposta.content)
    return dict(arquivo=destino.name, curso=item[1], autor=item[4],
                fonte=f'https://www.pexels.com/photo/{foto}/', download=url,
                licenca='https://www.pexels.com/license/')


def atualizar():
    from app import app
    from banco_37 import get_db

    PASTA.mkdir(parents=True, exist_ok=True)
    # Só altera o banco após baixar e validar todas as imagens.
    with ThreadPoolExecutor(max_workers=4) as executor:
        creditos = list(executor.map(baixar_capa, CATALOGO))
    (PASTA / 'creditos.json').write_text(json.dumps(creditos, ensure_ascii=False, indent=2), encoding='utf-8')
    with app.app_context():
        con = get_db()
        cur = con.cursor()
        try:
            atualizados = []
            for original, titulo, descricao, foto, _ in CATALOGO:
                cur.execute('''SELECT C.ID_CURSO FROM CURSOS C
                    JOIN PROFESSORES_CURSO PC ON PC.ID_CURSO=C.ID_CURSO
                    JOIN USUARIOS U ON U.ID_USUARIO=PC.ID_USUARIO
                    WHERE U.EMAIL=? AND C.EXCLUIDO=0 AND C.TITULO IN (?, ?)''',
                    ('professor.recomendacoes@cursando.test', original + ' [Teste]', titulo))
                encontrados = cur.fetchall()
                if len(encontrados) != 1:
                    raise ValueError(f'Esperado exatamente um curso do professor: {original}')
                curso = encontrados[0][0]
                cur.execute('''UPDATE CURSOS SET TITULO=?,DESCRICAO=?,IMAGEM_URL=?,
                    ATUALIZADO_EM=CURRENT_TIMESTAMP WHERE ID_CURSO=?''',
                    (titulo, descricao.encode('utf-8'), caminho_capa(foto), curso))
                atualizados.append((curso, titulo))
            con.commit()
            for curso, titulo in atualizados:
                print(f'{curso}: {titulo}')
            print(f'{len(atualizados)} cursos atualizados com capas locais 1280x720.')
        except Exception:
            con.rollback()
            raise
        finally:
            cur.close()
            con.close()


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--atualizar', action='store_true', required=True)
    parser.parse_args()
    atualizar()
