"""Adiciona professor e catálogo para testar recomendações, preservando matrículas."""
import argparse
import secrets
import unicodedata

from flask_bcrypt import generate_password_hash
from app import app
from banco_37 import get_db
from revisar_catalogo_recomendacoes import CATALOGO, PASTA, caminho_capa

EMAIL = 'professor.recomendacoes@cursando.test'


def normalizar(nome):
    return ' '.join(unicodedata.normalize('NFKD', nome).encode('ascii', 'ignore').decode().lower().split())


def cadastrar():
    con = get_db()
    cur = con.cursor()
    senha = None
    try:
        cur.execute('SELECT ID_USUARIO, TIPO_USUARIO FROM USUARIOS WHERE EMAIL = ?', (EMAIL,))
        existente = cur.fetchone()
        if existente:
            if existente[1] != 1:
                raise ValueError('O e-mail de teste pertence a outro tipo de usuário.')
            professor = existente[0]
        else:
            # CPF sintético válido e sem colisão com os cadastros locais.
            while True:
                digitos = [secrets.randbelow(10) for _ in range(9)]
                for tamanho in (9, 10):
                    resto = sum(n * peso for n, peso in zip(digitos, range(tamanho + 1, 1, -1))) % 11
                    digitos.append(0 if resto < 2 else 11 - resto)
                cpf = ''.join(map(str, digitos))
                cur.execute('SELECT 1 FROM USUARIOS WHERE CPF = ?', (cpf,))
                if not cur.fetchone():
                    break
            senha = secrets.token_urlsafe(14)
            cur.execute('''INSERT INTO USUARIOS (NOME, EMAIL, CPF, SENHA, TIPO_USUARIO,
                SITUACAO, TENTATIVAS, EMAIL_VERIFICADO, CRIADO_EM)
                VALUES (?, ?, ?, ?, 1, 0, 0, 1, CURRENT_TIMESTAMP) RETURNING ID_USUARIO''',
                ('Lucas Almeida', EMAIL, cpf, generate_password_hash(senha)))
            professor = cur.fetchone()[0]

        def taxonomia(tabela, coluna, nome):
            chave = normalizar(nome)
            cur.execute(f'SELECT {coluna} FROM {tabela} WHERE NOME_NORMALIZADO = ?', (chave,))
            row = cur.fetchone()
            if row:
                return row[0]
            cur.execute(f'SELECT COALESCE(MAX({coluna}),0)+1 FROM {tabela}')
            ident = cur.fetchone()[0]
            cur.execute(f'INSERT INTO {tabela} ({coluna},NOME,NOME_NORMALIZADO) VALUES (?,?,?)', (ident, nome, chave))
            return ident

        categoria_aves = taxonomia('CATEGORIAS_CURSO', 'ID_CATEGORIA', 'Aves')
        tema_aves = taxonomia('TEMAS_CURSO', 'ID_TEMA', 'Calopsitas')
        foto = taxonomia('CATEGORIAS_CURSO', 'ID_CATEGORIA', 'Fotografia')
        composicao = taxonomia('TEMAS_CURSO', 'ID_TEMA', 'Composição fotográfica')
        # Só completa a classificação ausente do curso de referência.
        cur.execute("SELECT ID_CURSO FROM CURSOS WHERE EXCLUIDO=0 AND UPPER(TITULO) CONTAINING 'CALOPS'")
        referencias = cur.fetchall()
        for (curso,) in referencias:
            cur.execute('SELECT ID_CATEGORIA, ID_TEMA FROM CURSO_TAXONOMIA WHERE ID_CURSO=?', (curso,))
            row = cur.fetchone()
            cur.execute('''UPDATE OR INSERT INTO CURSO_TAXONOMIA (ID_CURSO,ID_CATEGORIA,ID_TEMA)
                VALUES (?,?,?) MATCHING(ID_CURSO)''',
                (curso, row[0] if row and row[0] is not None else categoria_aves,
                 row[1] if row and row[1] is not None else tema_aves))

        def afinidade(curso):
            cur.execute('''SELECT CT.ID_CATEGORIA,CT.ID_TEMA,C.IMAGEM_URL FROM CURSO_TAXONOMIA CT
                JOIN CURSOS C ON C.ID_CURSO=CT.ID_CURSO WHERE CT.ID_CURSO=? AND C.EXCLUIDO=0''', (curso,))
            row = cur.fetchone()
            if not row or row[0] is None or row[1] is None:
                raise ValueError(f'Curso de referência sem taxonomia: {curso}')
            return row

        abaco, matematica, marketing = afinidade(2), afinidade(9), afinidade(8)
        aves = afinidade(referencias[0][0]) if referencias else (categoria_aves, tema_aves, None)
        catalogo = [
            ('Ábaco: prática de operações', abaco, 'Exercícios de cálculo com ábaco.'),
            ('Ábaco: cálculo mental', abaco, 'Prática de agilidade e representação de números.'),
            ('Frações e porcentagens na prática', matematica, 'Revisão de frações e porcentagens.'),
            ('Resolução de problemas matemáticos', matematica, 'Organização do raciocínio em problemas cotidianos.'),
            ('Marketing de conteúdo para iniciantes', marketing, 'Planejamento de conteúdo para canais digitais.'),
            ('Redes sociais e planejamento digital', marketing, 'Organização de campanhas e presença digital.'),
            ('Calopsitas: vínculo e aproximação', aves, 'Introdução à interação e às atividades com calopsitas.'),
            ('Calopsitas: assovios e enriquecimento', aves, 'Ideias de prática e atividades para o curso de calopsitas.'),
            ('Fotografia: composição para iniciantes', (foto, composicao, None), 'Curso sem afinidade com as matrículas atuais, para comparação.'),
            ('Fotografia: enquadramento criativo', (foto, composicao, None), 'Segundo curso de controle para comparar o filtro de recomendações.'),
        ]
        criados = []
        revisoes = {item[0]: item[1:] for item in CATALOGO}
        for titulo, (categoria, tema, imagem), resumo in catalogo:
            titulo_original = titulo + ' [Teste]'
            titulo, resumo, foto_capa, _ = revisoes[titulo]
            if (PASTA / f'pexels-{foto_capa}.jpg').exists():
                imagem = caminho_capa(foto_capa)
            cur.execute('''SELECT C.ID_CURSO FROM CURSOS C JOIN PROFESSORES_CURSO P ON P.ID_CURSO=C.ID_CURSO
                WHERE P.ID_USUARIO=? AND C.TITULO IN (?, ?) AND C.EXCLUIDO=0''', (professor, titulo, titulo_original))
            if cur.fetchone():
                continue
            cur.execute('SELECT COALESCE(MAX(ID_CURSO),0) FROM CURSOS')
            maior = cur.fetchone()[0]
            while True:
                cur.execute('SELECT GEN_ID(GEN_CURSOS_ID,1) FROM RDB$DATABASE')
                curso = cur.fetchone()[0]
                if curso > maior:
                    break
            descricao = resumo
            cur.execute('''INSERT INTO CURSOS (ID_CURSO,TITULO,DESCRICAO,IMAGEM_URL,STATUS,EXCLUIDO,CRIADO_EM,ATUALIZADO_EM)
                VALUES (?,?,?,?,1,0,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)''', (curso, titulo, descricao.encode('utf-8'), imagem))
            cur.execute('INSERT INTO PROFESSORES_CURSO (ID_CURSO,ID_USUARIO) VALUES (?,?)', (curso, professor))
            cur.execute('INSERT INTO CURSO_TAXONOMIA (ID_CURSO,ID_CATEGORIA,ID_TEMA) VALUES (?,?,?)', (curso, categoria, tema))
            criados.append((curso, titulo))
        con.commit()
        print('Professor:', professor)
        print('E-mail:', EMAIL)
        print('Senha:', senha if senha else '(mantida; professor já existente)')
        print('Cursos criados:', len(criados))
        for curso in criados:
            print(*curso, sep=' - ')
    except Exception:
        con.rollback()
        raise
    finally:
        cur.close()
        con.close()


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--cadastrar', action='store_true', required=True)
    parser.parse_args()
    with app.app_context():
        cadastrar()
