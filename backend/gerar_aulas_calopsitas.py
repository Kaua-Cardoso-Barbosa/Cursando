"""Gera clipes originais por API e substitui somente as seis aulas de teste.

Uso: python gerar_aulas_calopsitas.py --gerar [--cadastrar]
Os clipes prontos são reutilizados. Uma falha de API interrompe o lote sem
repetir solicitações pagas ou substituir vídeos ainda não validados.
"""
import argparse
import base64
import json
import math
import shutil
import subprocess
from datetime import datetime
from pathlib import Path

import requests
from dotenv import dotenv_values

RAIZ = Path(__file__).resolve().parent
PASTA = RAIZ / 'private_uploads' / 'geracao_calopsitas'
MODELO = 'gemini-omni-1.2-flash'
FFPROBE = RAIZ.parent / 'ferramentas' / 'ffmpeg' / 'bin' / 'ffprobe.exe'
FFMPEG = FFPROBE.with_name('ffmpeg.exe')
PACKAGER = RAIZ.parent / 'ferramentas' / 'shaka-packager' / 'packager-win-x64.exe'

AULAS = [
    (30, 'Conhecendo sua calopsita',
     'Observe sua calopsita antes de se aproximar. Note a postura e a distância que ela aceita. Se ela recuar, pare e dê espaço.',
     'Show an adult gray cockatiel with a yellow face, orange cheeks and a natural crest standing on a wooden perch. Close-up of its attentive posture, then a wider shot of a calm adult person sitting at a respectful distance. The bird turns its head naturally. The person stays still and allows the bird to choose whether to approach.',
     'Aprenda a observar a postura e a disposição da calopsita antes de iniciar uma interação. Veja como respeitar a distância escolhida pela ave e interromper a aproximação quando ela se afasta. O objetivo é começar a interação sem forçar contato.'),
    (31, 'Preparando o ambiente de treino',
     'Prepare um ambiente calmo, com janelas fechadas e ventilador desligado. Use um poleiro firme e mantenha outros animais afastados.',
     'Show a calm, uncluttered indoor room with closed windows and an obviously switched-off ceiling fan. An adult person checks a sturdy wooden training perch before the cockatiel perches on it. Cut to a relaxed gray cockatiel with yellow face and orange cheeks on that perch. There are no other pets, smoke or hazards.',
     'Conheça os cuidados de preparação do espaço de treino: ambiente tranquilo, janelas fechadas, ventilador desligado e um poleiro estável. A aula mostra uma organização simples que reduz distrações antes de começar a atividade.'),
    (32, 'Primeiros passos de aproximação',
     'Aproxime-se devagar e pare antes de causar desconforto. Espere a calopsita aceitar sua presença. Se ela se afastar, aumente a distância e tente depois.',
     'An adult person slowly approaches a gray cockatiel perched indoors. The person stops at a comfortable distance without reaching for the bird. The cockatiel shifts one step away; the person immediately takes a small step back and waits calmly. Final close-up of the bird relaxed again. Never grab, chase or corner the bird.',
     'Pratique uma aproximação gradual, com movimentos lentos e pausas para observar a resposta da calopsita. Entenda como recuar quando a ave aumenta a distância e como respeitar seu ritmo, sem perseguir ou tentar segurá-la.'),
    (33, 'Criando vínculo com reforço positivo',
     'Recompense a aproximação voluntária assim que ela acontecer. Use uma pequena recompensa que sua ave já conhece. Não force contato e respeite as pausas.',
     'Close-up of a gray cockatiel voluntarily taking a small step toward a calm adult trainer. Immediately afterward, the trainer offers a tiny familiar bird-safe treat on an open palm at a comfortable distance. The cockatiel calmly accepts it without being grabbed. Show the sequence clearly: voluntary approach, immediate reward, then a quiet pause. No food deprivation or forced touching.',
     'Entenda a sequência do reforço positivo: um comportamento voluntário é seguido de uma recompensa adequada. O exemplo apresenta a aproximação da ave e a oferta imediata de uma pequena recompensa familiar. Observe a importância do momento da recompensa e das pausas entre as tentativas.'),
    (34, 'Treino de subir no poleiro',
     'Ofereça um poleiro firme próximo ao apoio atual. Espere a calopsita dar o passo por vontade própria e recompense. Nunca empurre o peito nem puxe os pés.',
     'A calm gray cockatiel stands on a low sturdy wooden perch. An adult trainer holds a second stable wooden perch adjacent to the current perch, level with the bird feet, making a short safe step. The bird voluntarily steps onto the offered perch while the person keeps it steady, then receives a small reward. Show anatomically accurate bird feet and natural stepping. No pressure against the chest, grabbing or pulling toes.',
     'Veja uma introdução ao treino de subir em um poleiro oferecido: apoio firme, distância curta e participação voluntária da calopsita. A demonstração enfatiza esperar pelo passo da ave e recompensá-la, sem pressionar o peito ou retirar seus pés à força.'),
    (35, 'Assovios e rotina de prática',
     'Escolha um assovio curto e repita com calma. Faça pausas e valorize a atenção da ave. Nem toda calopsita vai imitar: respeite suas preferências.',
     'An adult trainer sits at a comfortable distance from a gray cockatiel on a wooden perch and gently whistles a simple two-note pattern once. The cockatiel turns its head and listens, then gives a natural soft chirp. The trainer smiles and pauses instead of repeatedly making loud sounds. Finish with a calm wide shot. Do not imply guaranteed imitation.',
     'Aprenda a organizar uma prática simples de assovios, usando um padrão curto, volume suave e pausas. A aula valoriza a atenção e a participação espontânea, sem prometer que toda calopsita aprenderá a imitar sons. Use a observação da ave para decidir quando encerrar a atividade.'),
]


def medir(arquivo):
    r = subprocess.run([str(FFPROBE), '-v', 'error', '-show_entries', 'format=duration:stream=codec_type,width,height', '-of', 'json', str(arquivo)], capture_output=True, text=True, timeout=30, check=True)
    d = json.loads(r.stdout)
    duracao = float(d['format']['duration'])
    if not math.isfinite(duracao) or duracao < 10 or not any(s.get('codec_type') == 'video' for s in d.get('streams', [])):
        raise ValueError('O arquivo gerado não contém um vídeo válido com a duração esperada.')
    return duracao


def gerar():
    chave = dotenv_values(RAIZ / '.env').get('GEMINI_API_KEY', '').strip()
    if not chave:
        raise ValueError('GEMINI_API_KEY não configurada.')
    PASTA.mkdir(parents=True, exist_ok=True)
    for ident, titulo, narracao, cena, descricao in AULAS:
        destino = PASTA / f'{ident}.mp4'
        if destino.is_file():
            medir(destino)
            print(f'Aula {ident}: usando vídeo já gerado.', flush=True)
            continue
        prompt = ('Create an original photorealistic educational video, landscape 16:9, with natural cockatiel motion and correct anatomy. '
                  'Soft daylight, stable documentary camera, gentle animal handling, no text, logos, music or subtitles. '
                  'Only one cockatiel and an adult trainer. This is an introductory illustration of a training concept. '
                  + cena + ' Native audio: clear warm Brazilian Portuguese narration saying exactly: "' + narracao + '". '
                  'Narration must finish within the clip; natural soft room sound underneath. Avoid cartoon rendering and any distressed animal.')
        pedido = {'model': MODELO, 'input': prompt, 'background': False, 'store': False, 'stream': False,
                  'response_format': {'type': 'video', 'aspect_ratio': '16:9', 'resolution': '720p', 'duration': '15s'}}
        print(f'Gerando aula {ident}: {titulo}', flush=True)
        try:
            r = requests.post('https://generativelanguage.googleapis.com/v1beta/interactions',
                              headers={'x-goog-api-key': chave, 'Content-Type': 'application/json'}, json=pedido, timeout=(15, 600))
        except requests.RequestException as e:
            raise RuntimeError(f'Falha de conexão ({type(e).__name__}). O pedido não será repetido automaticamente.') from None
        if not r.ok:
            try:
                erro = r.json().get('error', {})
                mensagem = str(erro.get('message', 'Sem detalhes')).replace(chave, '[CHAVE OCULTA]')
                status = erro.get('status', '')
            except ValueError:
                mensagem, status = 'Resposta não JSON.', ''
            raise RuntimeError(f'API HTTP {r.status_code} {status}: {mensagem[:1500]}')
        resposta = r.json()
        partes = [p for step in resposta.get('steps', []) for p in step.get('content', []) if p.get('type') == 'video' and p.get('data')]
        if not partes:
            raise RuntimeError('A API não devolveu vídeo. Status: ' + str(resposta.get('status')) + '. Nenhum pedido será repetido automaticamente.')
        temporario = destino.with_suffix('.tmp.mp4')
        temporario.write_bytes(base64.b64decode(partes[0]['data'], validate=True))
        duracao = medir(temporario)
        temporario.replace(destino)
        (PASTA / f'{ident}.json').write_text(json.dumps({'id_aula': ident, 'titulo': titulo, 'descricao': descricao,
            'modelo': MODELO, 'narracao': narracao, 'prompt': prompt, 'duracao': duracao,
            'interaction_id': resposta.get('id'), 'gerado_em': datetime.now().isoformat()}, ensure_ascii=False, indent=2), encoding='utf-8')
        print(f'Aula {ident}: vídeo gerado e validado ({duracao:.2f}s).', flush=True)


def cadastrar():
    from app import app
    from banco_37 import get_db
    # Nenhum registro é alterado até que os seis arquivos estejam disponíveis.
    for ident, *_ in AULAS:
        medir(PASTA / f'{ident}.mp4')
    momento = datetime.now().strftime('%Y%m%d_%H%M%S')
    backup = RAIZ / 'private_uploads' / 'backups' / f'calopsitas_{momento}'
    backup.mkdir(parents=True, exist_ok=True)
    preparados = []
    for ident, *_ in AULAS:
        pasta = PASTA / f'pacote_{ident}'
        pasta.mkdir(exist_ok=True)
        r = subprocess.run([str(PACKAGER), f'in={PASTA / str(ident)}.mp4,stream=video,drm_label=VIDEO,output={pasta / "video.mp4"}',
            f'in={PASTA / str(ident)}.mp4,stream=audio,drm_label=AUDIO,output={pasta / "audio.mp4"}',
            '--enable_raw_key_encryption', '--keys',
            'label=VIDEO:key_id=00112233445566778899aabbccddeeff:key=000102030405060708090a0b0c0d0e0f,label=AUDIO:key_id=11112222333344445555666677778888:key=101112131415161718191a1b1c1d1e1f',
            '--protection_systems', 'CommonSystem', '--segment_duration', '2', '--mpd_output', str(pasta / 'manifest.mpd')],
            capture_output=True, text=True, timeout=90)
        if r.returncode or not (pasta / 'manifest.mpd').is_file():
            raise RuntimeError(f'Falha ao preparar a aula {ident}: {r.stderr[-1000:]}')
        subprocess.run([str(FFMPEG), '-hide_banner', '-loglevel', 'error', '-nostdin', '-y', '-ss', '2', '-i', str(PASTA / f'{ident}.mp4'), '-frames:v', '1', str(pasta / 'thumb.jpg')], check=True, capture_output=True, timeout=30)
        preparados.append((ident, pasta))
    with app.app_context():
        con = get_db()
        cur = con.cursor()
        substituidos = []
        try:
            anteriores = []
            for ident, titulo, *_ in AULAS:
                cur.execute('SELECT ID_CURSO,TITULO,DESCRICAO,VIDEO_URL,DURACAO FROM VIDEOS WHERE ID_VIDEO=? AND EXCLUIDO=0', (ident,))
                row = cur.fetchone()
                if not row or row[0] != 11 or row[1] != titulo:
                    raise ValueError(f'A aula {ident} não corresponde ao cadastro esperado.')
                descricao = row[2].read() if hasattr(row[2], 'read') else row[2]
                if isinstance(descricao, bytes): descricao = descricao.decode('utf-8')
                anteriores.append({'id': ident, 'descricao': descricao, 'url': row[3], 'duracao': row[4]})
            (backup / 'cadastros.json').write_text(json.dumps(anteriores, ensure_ascii=False, indent=2, default=str), encoding='utf-8')
            for ident, pasta in preparados:
                destino = RAIZ / 'static' / 'uploads' / 'drm' / str(ident)
                shutil.copytree(destino, backup / str(ident))
                substituidos.append(ident)
                for nome in ('video.mp4', 'audio.mp4', 'manifest.mpd'):
                    shutil.copy2(pasta / nome, destino / nome)
                thumb = RAIZ / 'static' / 'uploads' / 'thumbs' / f'{ident}.jpg'
                if thumb.exists(): shutil.copy2(thumb, backup / f'{ident}.jpg')
                thumb.parent.mkdir(exist_ok=True)
                shutil.copy2(pasta / 'thumb.jpg', thumb)
                descricao = next(a[4] for a in AULAS if a[0] == ident) + '\n\nVídeo original com cenas e narração geradas por IA, usado como ilustração educativa.'
                cur.execute('UPDATE VIDEOS SET DESCRICAO=?,DURACAO=?,ATUALIZADO_EM=CURRENT_TIMESTAMP WHERE ID_VIDEO=? AND ID_CURSO=11',
                            (descricao.encode('utf-8'), round(medir(PASTA / f'{ident}.mp4')), ident))
            con.commit()
            print('Seis aulas atualizadas. Vídeos anteriores preservados em: ' + str(backup), flush=True)
        except Exception:
            con.rollback()
            for ident in substituidos:
                shutil.copytree(backup / str(ident), RAIZ / 'static' / 'uploads' / 'drm' / str(ident), dirs_exist_ok=True)
            raise
        finally:
            cur.close()
            con.close()


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--gerar', action='store_true')
    parser.add_argument('--cadastrar', action='store_true')
    args = parser.parse_args()
    if not (args.gerar or args.cadastrar): parser.error('Informe --gerar ou --cadastrar.')
    if args.gerar: gerar()
    if args.cadastrar: cadastrar()
