import smtplib
import threading
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.utils import formataddr

from flask import current_app


def notificar_alunos_novo_curso(destinatarios, titulo_curso):
    """Envia, em segundo plano, um aviso para cada aluno elegível."""
    if not destinatarios:
        return

    config = {
        "SMTP_HOST": current_app.config.get("SMTP_HOST", "smtp.gmail.com"),
        "SMTP_PORT": current_app.config.get("SMTP_PORT", 465),
        "SMTP_EMAIL": current_app.config.get("SMTP_EMAIL", ""),
        "SMTP_PASSWORD": current_app.config.get("SMTP_PASSWORD", ""),
        "SMTP_USE_SSL": current_app.config.get("SMTP_USE_SSL", True),
    }
    if not config["SMTP_PASSWORD"]:
        current_app.logger.warning("Aviso de novo curso não enviado: SMTP_PASSWORD não configurada.")
        return

    # Sprint item 11: envia avisos individuais em segundo plano para não atrasar a publicação do curso.
    thread = threading.Thread(
        target=_enviar_avisos,
        args=(list(set(destinatarios)), titulo_curso, config),
        daemon=True,
    )
    thread.start()


def _enviar_avisos(destinatarios, titulo_curso, config):
    try:
        if config["SMTP_USE_SSL"]:
            servidor = smtplib.SMTP_SSL(config["SMTP_HOST"], config["SMTP_PORT"], timeout=20)
        else:
            servidor = smtplib.SMTP(config["SMTP_HOST"], config["SMTP_PORT"], timeout=20)
            servidor.starttls()
        try:
            servidor.login(config["SMTP_EMAIL"], config["SMTP_PASSWORD"])
            for destinatario in destinatarios:
                mensagem = MIMEMultipart("alternative")
                mensagem["Subject"] = f"Novo curso disponível: {titulo_curso}"
                mensagem["From"] = formataddr(("Cursando", config["SMTP_EMAIL"]))
                mensagem["To"] = destinatario
                texto = (
                    f"Um instrutor de quem você já acompanha cursos publicou um novo curso: {titulo_curso}.\n\n"
                    "Acesse a plataforma Cursando para conferir."
                )
                html = (
                    "<html><body>"
                    "<p>Um instrutor de quem você já acompanha cursos publicou um novo curso:</p>"
                    f"<p><strong>{_escapar_html(titulo_curso)}</strong></p>"
                    "<p>Acesse a plataforma Cursando para conferir.</p>"
                    "</body></html>"
                )
                mensagem.attach(MIMEText(texto, "plain", "utf-8"))
                mensagem.attach(MIMEText(html, "html", "utf-8"))
                servidor.send_message(mensagem)
        finally:
            servidor.quit()
    except Exception:
        # O aviso falhar não desfaz a publicação do curso.
        print("Erro ao enviar aviso de novo curso; confira as configurações SMTP.")


def _escapar_html(valor):
    return (str(valor).replace("&", "&amp;").replace("<", "&lt;")
            .replace(">", "&gt;").replace('"', "&quot;").replace("'", "&#39;"))
