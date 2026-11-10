"""Baixa clipes licenciados em 16:9 e adiciona aulas ilustrativas aos módulos."""
import argparse
import json
import subprocess
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import requests

RAIZ = Path(__file__).resolve().parent
PASTA = RAIZ / 'private_uploads/clipes_cursos'
FFMPEG = RAIZ.parent / 'ferramentas/ffmpeg/bin/ffmpeg.exe'
FFPROBE = FFMPEG.with_name('ffprobe.exe')

# ID Pexels, arquivo original e autoria. As páginas contêm a licença e os créditos.
FONTES = {
    'abaco': (33747498, '14327783_3840_2160_25fps.mp4', 'Gokuldham Nar'),
    'equacoes': (9365666, '9365666-hd_1920_1080_25fps.mp4', 'Mikhail Nilov'),
    'calculadora': (6963484, '6963484-hd_1920_1080_25fps.mp4', 'Mikhail Nilov'),
    'planejamento': (7660015, '7660015-hd_1920_1080_25fps.mp4', 'Alena Darmel'),
    'metricas': (8141798, '8141798-hd_1920_1080_25fps.mp4', 'Alena Darmel'),
    'aves': (5324494, '5324494-hd_1920_1080_25fps.mp4', 'Biplab Sau'),
    'rua': (3772428, '3772428-hd_1920_1080_25fps.mp4', 'Taryn Elliott'),
    'estudio': (33607026, '14285050_1920_1080_25fps.mp4', 'ZEEL DIGITAL'),
}

# Dois módulos para cursos que ainda não possuem módulos. Nos demais, os
# títulos e a organização existentes são preservados e recebem uma aula extra.
CURSOS = {
    2: [('Contagem e valor posicional', 'abaco'), ('Trocas e operações', 'abaco')],
    8: [('Planejamento de campanhas', 'planejamento'), ('Leitura de resultados', 'metricas')],
    9: [('Operações e estimativas', 'calculadora'), ('Raciocínio e equações', 'equacoes')],
    11: [('Observação da ave', 'aves'), ('Comportamento e ambiente', 'aves')],
    12: [('Quantidades e agrupamentos', 'abaco'), ('Unidades, dezenas e centenas', 'abaco')],
    13: [('Decomposição de números', 'abaco'), ('Estratégias de cálculo', 'calculadora')],
    14: [('Comparação de preços', 'calculadora'), ('Orçamento e decisões', 'calculadora')],
    15: [('Leitura de problemas', 'equacoes'), ('Conferência de soluções', 'equacoes')],
    16: [('Indicadores de negócio', 'metricas'), ('Decisões a partir de dados', 'metricas')],
    17: [('Público e proposta de valor', 'planejamento'), ('Planejamento de anúncios', 'planejamento')],
    18: [('Observação e rotina', 'aves'), ('Interação e descanso', 'aves')],
    19: [('Exploração do ambiente', 'aves'), ('Planejamento de atividades', 'aves')],
    20: [('Preparação da fotografia', 'estudio'), ('Luz e enquadramento', 'rua')],
    21: [('Observação da cena urbana', 'rua'), ('Construção de narrativas', 'rua')],
}

ATIVIDADES = {
    'abaco': 'Observe a apresentação do ábaco e a disposição das contas. Pause o vídeo e desenhe uma representação de unidades e dezenas. Proponha uma troca de dez unidades por uma dezena.',
    'equacoes': 'Observe a escrita e a discussão das expressões no quadro. Depois, escolha um problema do módulo, identifique a incógnita e registre as etapas da sua solução em uma folha.',
    'calculadora': 'Observe o uso da calculadora. Faça uma estimativa antes de calcular: compare dois preços, aplique um desconto de 10% e confira o resultado. Anote o que cada operação representa.',
    'planejamento': 'Observe a organização das ideias e dos materiais da equipe. Esboce uma campanha com público, objetivo, mensagem principal e chamada para ação. Relacione suas escolhas ao tema do módulo.',
    'metricas': 'Observe a apresentação do relatório. Liste três indicadores que ajudariam um pequeno negócio e explique que decisão cada um permitiria tomar. Separe medidas de alcance das medidas de conversão.',
    'aves': 'Observe a postura, os movimentos e a interação das calopsitas no clipe. Registre o que é observável, sem presumir como a ave se sente. Pense em adaptações da rotina relacionadas ao módulo; o cenário filmado não deve ser tomado como modelo de recinto ou de manejo.',
    'rua': 'Observe o fotógrafo, o ponto de vista e a relação com a arquitetura ao redor. Planeje três enquadramentos de um mesmo lugar e descreva como cada escolha mudaria a leitura da cena.',
    'estudio': 'Observe a preparação do equipamento e a posição do fotógrafo. Antes de fotografar, faça uma lista com direção da luz, fundo, distância e ponto de atenção do retrato.',
}


def executar(comando):
    resultado = subprocess.run([str(p) for p in comando], capture_output=True, text=True, timeout=180)
    if resultado.returncode:
        raise RuntimeError(resultado.stderr[-1500:])
    return resultado.stdout


def medir(arquivo):
    dados = json.loads(executar([FFPROBE, '-v', 'error', '-show_entries',
        'format=duration:stream=codec_type,width,height', '-of', 'json', arquivo]))
    video = next(s for s in dados['streams'] if s['codec_type'] == 'video')
    if video['width'] * 9 != video['height'] * 16:
        raise ValueError(f'Vídeo fora de 16:9: {arquivo}')
    return float(dados['format']['duration'])


def preparar_fonte(chave):
    ident, nome, autor = FONTES[chave]
    original = PASTA / f'{ident}-original.mp4'
    saida = PASTA / f'{ident}-720p.mp4'
    url = f'https://videos.pexels.com/video-files/{ident}/{nome}'
    if not original.exists():
        temporario = original.with_suffix('.download')
        with requests.get(url, stream=True, timeout=(15, 90)) as resposta:
            resposta.raise_for_status()
            with temporario.open('wb') as arquivo:
                for trecho in resposta.iter_content(1024 * 1024):
                    arquivo.write(trecho)
        temporario.replace(original)
    duracao = min(20, medir(original))
    pronta = False
    if saida.exists():
        try:
            pronta = 5 <= medir(saida) <= 21
        except (RuntimeError, ValueError, KeyError, StopIteration, json.JSONDecodeError):
            pass
    if not pronta:
        temporario_video = saida.with_name(f'{ident}-preparando.mp4')
        executar([FFMPEG, '-hide_banner', '-loglevel', 'error', '-nostdin', '-y',
            '-i', original, '-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=stereo',
            '-map', '0:v:0', '-map', '1:a:0', '-t', str(duracao),
            '-vf', 'scale=1280:720,setsar=1', '-r', '25', '-c:v', 'libx264',
            '-preset', 'fast', '-crf', '24', '-pix_fmt', 'yuv420p', '-c:a', 'aac',
            '-b:a', '64k', '-movflags', '+faststart', temporario_video])
        medir(temporario_video)
        temporario_video.replace(saida)
    duracao = medir(saida)
    thumb = PASTA / f'{ident}.jpg'
    if not thumb.exists():
        executar([FFMPEG, '-hide_banner', '-loglevel', 'error', '-nostdin', '-y',
                  '-ss', '1', '-i', saida, '-frames:v', '1', thumb])
    print(f'Clipe pronto: {chave} ({duracao:.1f}s, 1280x720)', flush=True)
    return chave, dict(arquivo=str(saida), thumb=str(thumb), duracao=duracao,
        autor=autor, fonte=f'https://www.pexels.com/video/{ident}/', download=url,
        licenca='https://www.pexels.com/license/')


def cadastrar():
    # O cliente Flask chama as rotas reais, com JWT, multipart, validacoes e
    # persistencia normais. Nao inicia outro servidor nem altera tabelas por SQL.
    from datetime import timedelta
    from app import app
    from banco_37 import get_db
    from flask_jwt_extended import JWTManager, create_access_token, decode_token
    import professor_7
    import aluno_4_6_34
    import curso_conteudo_6_11_20_21_28

    JWTManager(app)
    PASTA.mkdir(parents=True, exist_ok=True)
    with ThreadPoolExecutor(max_workers=3) as executor:
        fontes = dict(executor.map(preparar_fonte, FONTES))
    (PASTA / 'fontes.json').write_text(json.dumps(fontes, ensure_ascii=False, indent=2), encoding='utf-8')
    criados = []
    arquivo_registro = PASTA / 'aulas_cadastradas.json'
    registro_anterior = json.loads(arquivo_registro.read_text(encoding='utf-8')) if arquivo_registro.exists() else []
    with app.app_context():
        # Somente leitura: identifica o professor correto para cada curso.
        con = get_db()
        cur = con.cursor()
        try:
            cur.execute("""SELECT C.ID_CURSO,MIN(PC.ID_USUARIO) FROM CURSOS C
                JOIN PROFESSORES_CURSO PC ON PC.ID_CURSO=C.ID_CURSO
                WHERE C.EXCLUIDO=0 GROUP BY C.ID_CURSO""")
            professores = dict(cur.fetchall())
        finally:
            cur.close()
            con.close()
        for curso, plano in CURSOS.items():
            if curso not in professores:
                raise ValueError(f'Curso esperado nao encontrado: {curso}')
            client = app.test_client()
            token = create_access_token(identity=str(professores[curso]),
                additional_claims={'tipo': 1}, expires_delta=timedelta(hours=2))
            client.set_cookie(app.config.get('JWT_ACCESS_COOKIE_NAME','access_token_cookie'), token)
            headers = {'Authorization': f'Bearer {token}'}
            csrf = decode_token(token).get('csrf')
            if csrf:
                headers[app.config.get('JWT_ACCESS_CSRF_HEADER_NAME','X-CSRF-TOKEN')] = csrf

            def chamar(metodo, rota, **parametros):
                resposta = client.open(rota, method=metodo, headers=headers, **parametros)
                if not 200 <= resposta.status_code < 300:
                    raise RuntimeError(f'{metodo} {rota}: {resposta.status_code} {resposta.get_json()}')
                return resposta.get_json()

            modulos = chamar('GET', f'/professor/cursos/{curso}/modulos')
            if not modulos:
                for ordem, (titulo, _) in enumerate(plano):
                    chamar('POST', f'/professor/cursos/{curso}/modulos', json={
                        'titulo': titulo, 'descricao': f'Atividades de observacao e pratica: {titulo}.', 'ordem': ordem})
                modulos = chamar('GET', f'/professor/cursos/{curso}/modulos')
            for indice, modulo in enumerate(modulos):
                if modulo['status'] not in (0,1):
                    continue
                tema, chave = plano[min(indice,len(plano)-1)]
                fonte = fontes[chave]
                titulo = f'{tema}: observa\u00e7\u00e3o e pr\u00e1tica'
                aulas = chamar('GET', f'/professor/cursos/{curso}/aulas?id_modulo={modulo["id"]}')
                existente = next((a for a in aulas if a['titulo'] == titulo), None)
                if existente:
                    video = existente['id']
                else:
                    descricao = (f'{ATIVIDADES[chave]}\n\nModulo: {modulo["titulo"]}. '
                        f'Clipe ilustrativo curto para uma atividade de observacao, sem narracao didatica. '
                        f'Video: {fonte["autor"]}, Pexels. Fonte: {fonte["fonte"]}')
                    with open(fonte['arquivo'],'rb') as video_arquivo, open(fonte['thumb'],'rb') as thumb_arquivo:
                        resposta = chamar('POST', f'/professor/cursos/{curso}/aulas', data={
                            'id_modulo': str(modulo['id']), 'titulo': titulo, 'descricao': descricao,
                            'video': (video_arquivo, Path(fonte['arquivo']).name),
                            'thumb': (thumb_arquivo, Path(fonte['thumb']).name)}, content_type='multipart/form-data')
                    video = resposta['id_aula']
                    criados.append(dict(id=video,curso=curso,modulo=modulo['id'],titulo=titulo,fonte=fonte['fonte']))
                    arquivo_registro.write_text(json.dumps(registro_anterior+criados,ensure_ascii=False,indent=2),encoding='utf-8')
                if modulo['status'] == 1:
                    chamar('PATCH', f'/professor/aulas/{video}/status', json={'status':1})
                print(f'Aula cadastrada pelas rotas: curso {curso}, modulo {modulo["id"]}, video {video}', flush=True)
    print(f'Concluido: {len(criados)} novas aulas cadastradas pelas rotas. Aulas anteriores preservadas.', flush=True)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--cadastrar', action='store_true', required=True)
    parser.parse_args()
    cadastrar()
