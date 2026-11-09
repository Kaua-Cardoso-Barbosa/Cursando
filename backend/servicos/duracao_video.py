"""Consulta a duração de arquivos existentes sem carregar vídeos no navegador."""
import math
import re
import shutil
import subprocess
from functools import lru_cache
from pathlib import Path
from xml.etree import ElementTree

from servicos.video_mobile import _fontes


@lru_cache(maxsize=2048)
def _ler_duracao(caminho, atualizado_em, ffprobe):
    try:
        if Path(caminho).suffix == '.mpd':
            raiz = ElementTree.parse(caminho).getroot()
            tempo = raiz.get('mediaPresentationDuration', '')
            partes = re.fullmatch(r'PT(?:(\d+(?:\.\d+)?)H)?(?:(\d+(?:\.\d+)?)M)?(?:(\d+(?:\.\d+)?)S)?', tempo)
            if not partes:
                return 0
            horas, minutos, segundos = (float(v or 0) for v in partes.groups())
            duracao = horas * 3600 + minutos * 60 + segundos
        elif ffprobe:
            resultado = subprocess.run(
                [ffprobe, '-v', 'error', '-show_entries', 'format=duration',
                 '-of', 'default=noprint_wrappers=1:nokey=1', caminho],
                capture_output=True, text=True, timeout=5,
            )
            duracao = float(resultado.stdout) if resultado.returncode == 0 else 0
        else:
            return 0
        return duracao if math.isfinite(duracao) and duracao > 0 else 0
    except (OSError, ValueError, ElementTree.ParseError, subprocess.TimeoutExpired):
        return 0


def duracao_video(raiz_backend, id_aula, video_url):
    try:
        video, _, protegido = _fontes(raiz_backend, id_aula, video_url)
        caminho = video.parent / 'manifest.mpd' if protegido else video
        probe_local = Path(raiz_backend).parent / 'ferramentas' / 'ffmpeg' / 'bin' / 'ffprobe.exe'
        ffprobe = str(probe_local) if probe_local.is_file() else shutil.which('ffprobe')
        return _ler_duracao(str(caminho), caminho.stat().st_mtime_ns, ffprobe)
    except (OSError, ValueError, TypeError):
        return 0
