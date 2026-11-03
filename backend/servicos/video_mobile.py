"""Prepara cópias MP4 para navegadores sem suporte ao DASH com ClearKey."""

import os
import shutil
import subprocess
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from threading import Lock
from uuid import uuid4


CHAVE_VIDEO = "000102030405060708090a0b0c0d0e0f"
CHAVE_AUDIO = "101112131415161718191a1b1c1d1e1f"
_executor = ThreadPoolExecutor(max_workers=2, thread_name_prefix="video-mobile")
_tarefas = {}
_trava = Lock()


def _fontes(raiz_backend, id_aula, video_url):
    """Resolve apenas arquivos da aula indicada pela URL salva no banco."""
    raiz = Path(raiz_backend)
    prefixo_drm = f"/static/uploads/drm/{id_aula}/manifest.mpd"
    if video_url == prefixo_drm:
        pasta = raiz / "static" / "uploads" / "drm" / str(id_aula)
        video = pasta / "video.mp4"
        audio = pasta / "audio.mp4"
        if not (pasta / "manifest.mpd").is_file() or not video.is_file():
            raise FileNotFoundError("Arquivos da aula não encontrados.")
        return video, audio if audio.is_file() else None, True

    # Aulas antigas podem ter um arquivo direto em vez de um manifesto DASH.
    prefixo_aulas = "/static/uploads/aulas/"
    if video_url and video_url.startswith(prefixo_aulas):
        nome = video_url[len(prefixo_aulas):]
        if "/" not in nome and "\\" not in nome and Path(nome).suffix.lower() in {".mp4", ".webm", ".ogg", ".mov"}:
            video = raiz / "static" / "uploads" / "aulas" / nome
            if video.is_file():
                return video, None, False

    raise FileNotFoundError("Arquivo de vídeo da aula não encontrado.")


def _converter(raiz_backend, id_aula, video_url, destino, fontes):
    video, audio, protegido = fontes
    raiz = Path(raiz_backend).parent
    ffmpeg_local = raiz / "ferramentas" / "ffmpeg" / "bin" / "ffmpeg.exe"
    ffmpeg = str(ffmpeg_local) if ffmpeg_local.is_file() else shutil.which("ffmpeg")
    if not ffmpeg:
        raise FileNotFoundError("FFmpeg não encontrado para preparar o vídeo móvel.")

    temporario = destino.with_name(f"{id_aula}.{uuid4().hex}.mp4")
    comando = [ffmpeg, "-hide_banner", "-loglevel", "error", "-nostdin", "-y"]
    if protegido:
        comando += ["-decryption_key", CHAVE_VIDEO]
    comando += ["-i", str(video)]
    if audio:
        if protegido:
            comando += ["-decryption_key", CHAVE_AUDIO]
        comando += ["-i", str(audio)]
    comando += ["-map", "0:v:0"]
    if audio:
        comando += ["-map", "1:a:0"]
    elif not protegido:
        comando += ["-map", "0:a:0?"]
    else:
        comando += ["-an"]
    comando += [
        "-vf", "scale=1280:720:force_original_aspect_ratio=decrease:force_divisible_by=2,fps=30",
        "-c:v", "libx264", "-preset", "veryfast", "-crf", "24",
        "-profile:v", "main", "-level:v", "3.1", "-pix_fmt", "yuv420p",
        "-c:a", "aac", "-b:a", "128k",
        "-movflags", "+faststart", "-map_metadata", "-1",
        str(temporario),
    ]

    try:
        resultado = subprocess.run(comando, capture_output=True, text=True, timeout=900)
        if resultado.returncode != 0 or not temporario.is_file() or temporario.stat().st_size == 0:
            raise RuntimeError(f"Falha ao preparar o vídeo móvel: {resultado.stderr[-1200:]}")
        os.replace(temporario, destino)
    finally:
        temporario.unlink(missing_ok=True)


def arquivo_mobile(raiz_backend, id_aula, video_url):
    """Retorna o MP4 pronto ou None enquanto a conversão acontece."""
    fontes = _fontes(raiz_backend, id_aula, video_url)
    destino = Path(raiz_backend) / "private_uploads" / "mobile" / f"{id_aula}.mp4"
    atualizado_em = max(arquivo.stat().st_mtime for arquivo in fontes[:2] if arquivo)

    if destino.is_file() and destino.stat().st_size > 0 and destino.stat().st_mtime >= atualizado_em:
        return destino

    with _trava:
        tarefa = _tarefas.get(id_aula)
        if tarefa is not None and tarefa.done():
            del _tarefas[id_aula]
            # A falha chega à rota para que o player mostre um erro e permita tentar de novo.
            tarefa.result()
            if destino.is_file() and destino.stat().st_size > 0:
                return destino

        if id_aula not in _tarefas:
            destino.parent.mkdir(parents=True, exist_ok=True)
            _tarefas[id_aula] = _executor.submit(
                _converter, raiz_backend, id_aula, video_url, destino, fontes
            )
    return None
