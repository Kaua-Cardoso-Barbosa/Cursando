
"""conversa privada e avisos por e-mail.

Aluno só acessa chat do curso em que está matriculado; professor só acessa
alunos de cursos sob sua responsabilidade. Abrir um chat vazio não grava
mensagem: a conversa entra na caixa de entrada após o primeiro envio.
Ao publicar curso novo ou reprovar prova, o servidor prepara destinatários e
dispara e-mails em segundo plano, sem transformar falha de SMTP em falha do
curso ou da correção já confirmada no banco.
"""

import smtplib
import threading
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.utils import formataddr

from flask import current_app, jsonify, request
from flask_jwt_extended import get_jwt, get_jwt_identity, jwt_required

from app import app
from banco import get_db
from professor import de_blob_texto, para_blob_texto


from estrutura_banco import garantir_estrutura_banco
from utilitarios_backend import _aluno_matriculado, _bloqueio_assinatura_aluno, _curso_do_professor, _professor_responsavel, proximo_id, resposta



# Sprint item 19 - Implementar chat entre instrutor e aluno no aplicativo e no sistema web. lista cursos matriculados para alunos e somente conversas
# com mensagens para instrutores. O professor pode abrir um chat pela lista de
# alunos do curso; a conversa entra na caixa de entrada apos o primeiro envio.
@app.route("/chat/conversas", methods=["GET"])
@jwt_required()
def chat_conversas():
    """Sprint item 19 - Implementar chat entre instrutor e aluno no aplicativo e no sistema web. lista as conversas visíveis para o perfil do token.

    O professor só recebe conversas que já têm mensagem; para iniciar outra,
    abre um aluno da lista do curso. O aluno vê os cursos em que está inscrito.
    """
    garantir_estrutura_banco()
    tipo = int(get_jwt().get("tipo", -1))
    id_usuario = int(get_jwt_identity())
    con = get_db()
    cursor = con.cursor()

    try:
        if tipo == 1:
            # Sprint item 19 - Implementar chat entre instrutor e aluno no aplicativo e no sistema web. a lista do professor nasce de MENSAGENS_CHAT. Um aluno
            # selecionado no curso ainda não aparece aqui até o primeiro POST.
            cursor.execute(
                """
                SELECT
                    M.ID_CURSO,
                    M.ID_ALUNO,
                    C.TITULO,
                    U.NOME,
                    U.EMAIL,
                    U.IMAGEM_PERFIL,
                    MAX(M.CRIADO_EM),
                    SUM(CASE WHEN M.ID_DESTINATARIO = ? AND M.LIDA = 0 THEN 1 ELSE 0 END)
                FROM MENSAGENS_CHAT M
                JOIN CURSOS C ON C.ID_CURSO = M.ID_CURSO
                JOIN USUARIOS U ON U.ID_USUARIO = M.ID_ALUNO
                JOIN PROFESSORES_CURSO PC ON PC.ID_CURSO = M.ID_CURSO AND PC.ID_USUARIO = ?
                GROUP BY M.ID_CURSO, M.ID_ALUNO, C.TITULO, U.NOME, U.EMAIL, U.IMAGEM_PERFIL
                ORDER BY MAX(M.CRIADO_EM) DESC
                """,
                (id_usuario, id_usuario),
            )
            return jsonify([
                {
                    "id_curso": row[0],
                    "id_aluno": row[1],
                    "curso": row[2],
                    "nome": row[3],
                    "email": row[4],
                    "imagem_perfil": row[5],
                    "ultima_mensagem_em": row[6].isoformat() if row[6] else None,
                    "nao_lidas": int(row[7] or 0),
                }
                for row in cursor.fetchall()
            ])

        if tipo == 2:
            # O aluno vê seus cursos com matrícula ativa, mesmo que ainda não
            # exista mensagem. LEFT JOIN preserva essas conversas vazias.
            cursor.execute(
                """
                SELECT
                    C.ID_CURSO,
                    MT.ID_USUARIO,
                    C.TITULO,
                    U.NOME,
                    U.EMAIL,
                    U.IMAGEM_PERFIL,
                    MAX(M.CRIADO_EM),
                    SUM(CASE WHEN M.ID_DESTINATARIO = ? AND M.LIDA = 0 THEN 1 ELSE 0 END)
                FROM MATRICULAS MT
                JOIN CURSOS C ON C.ID_CURSO = MT.ID_CURSO AND C.EXCLUIDO = 0
                JOIN PROFESSORES_CURSO PC ON PC.ID_CURSO = C.ID_CURSO
                JOIN USUARIOS U ON U.ID_USUARIO = PC.ID_USUARIO
                LEFT JOIN MENSAGENS_CHAT M ON M.ID_CURSO = C.ID_CURSO AND M.ID_ALUNO = MT.ID_USUARIO
                WHERE MT.ID_USUARIO = ? AND MT.STATUS_MATRICULA = 1
                GROUP BY C.ID_CURSO, MT.ID_USUARIO, C.TITULO, U.NOME, U.EMAIL, U.IMAGEM_PERFIL
                ORDER BY MAX(M.CRIADO_EM) DESC, C.TITULO
                """,
                (id_usuario, id_usuario),
            )
            return jsonify([
                {
                    "id_curso": row[0],
                    "id_aluno": row[1],
                    "curso": row[2],
                    "nome": row[3],
                    "email": row[4],
                    "imagem_perfil": row[5],
                    "ultima_mensagem_em": row[6].isoformat() if row[6] else None,
                    "nao_lidas": int(row[7] or 0),
                }
                for row in cursor.fetchall()
            ])

        return resposta("Chat disponivel apenas para alunos e instrutores.", 403)
    except Exception as erro:
        return resposta(f"Erro ao listar conversas: {erro}", 500)
    finally:
        cursor.close()
        con.close()



# Sprint item 19 - Implementar chat entre instrutor e aluno no aplicativo e no sistema web. valida matrícula e autoria, registra mensagens e retorna identidade visual de cada remetente.
@app.route("/chat/cursos/<int:id_curso>/mensagens", methods=["GET", "POST"])
@jwt_required()
def chat_mensagens(id_curso):
    """Sprint item 19 - Implementar chat entre instrutor e aluno no aplicativo e no sistema web. GET lê mensagens; POST valida participantes e grava o envio.

    A checagem no backend impede consultar ou mandar mensagens para qualquer
    aluno/curso por simples alteração da URL. O primeiro POST cria a conversa
    que passa a aparecer na caixa de entrada do professor.
    """
    garantir_estrutura_banco()
    tipo = int(get_jwt().get("tipo", -1))
    id_usuario = int(get_jwt_identity())
    con = get_db()
    cursor = con.cursor()

    try:
        if tipo == 2:
            # Para aluno, o ID da conversa é o próprio ID do token; ele não
            # pode escolher outro aluno alterando parâmetros da requisição.
            id_aluno = id_usuario
            if not _aluno_matriculado(cursor, id_curso, id_aluno):
                return resposta("Aluno sem matricula ativa neste curso.", 403)
            bloqueio = _bloqueio_assinatura_aluno(cursor, id_aluno)
            if bloqueio:
                return bloqueio
        elif tipo == 1:
            # O professor escolhe o aluno, mas o backend confere tanto o seu
            # vínculo com o curso quanto a matrícula ativa do destinatário.
            if not _curso_do_professor(cursor, id_curso, id_usuario):
                return resposta("Curso nao encontrado para este instrutor.", 404)
            id_aluno = int((request.args.get("id_aluno") or (request.get_json(silent=True) or {}).get("id_aluno") or 0))
            if not id_aluno or not _aluno_matriculado(cursor, id_curso, id_aluno):
                return resposta("Informe um aluno matriculado para a conversa.", 400)
        else:
            return resposta("Chat disponivel apenas para alunos e instrutores.", 403)

        if request.method == "GET":
            # Abrir a conversa marca apenas as mensagens recebidas como lidas;
            # a seleção seguinte devolve o histórico em ordem de envio.
            cursor.execute(
                """
                UPDATE MENSAGENS_CHAT
                SET LIDA = 1
                WHERE ID_CURSO = ? AND ID_ALUNO = ? AND ID_DESTINATARIO = ?
                """,
                (id_curso, id_aluno, id_usuario),
            )
            cursor.execute(
                """
                SELECT M.ID_MENSAGEM, M.ID_REMETENTE, U.NOME, U.EMAIL, U.IMAGEM_PERFIL, M.TEXTO, M.LIDA, M.CRIADO_EM
                FROM MENSAGENS_CHAT M
                JOIN USUARIOS U ON U.ID_USUARIO = M.ID_REMETENTE
                WHERE M.ID_CURSO = ? AND M.ID_ALUNO = ?
                ORDER BY M.ID_MENSAGEM
                """,
                (id_curso, id_aluno),
            )
            mensagens = [
                {
                    "id": row[0],
                    "id_remetente": row[1],
                    "nome": row[2],
                    "email": row[3],
                    "imagem_perfil": row[4],
                    "texto": de_blob_texto(row[5]),
                    "lida": row[6] == 1,
                    "criado_em": row[7].isoformat() if row[7] else None,
                    "minha": int(row[1]) == id_usuario,
                }
                for row in cursor.fetchall()
            ]
            con.commit()
            return jsonify(mensagens)

        dados = request.get_json() or {}
        texto = (dados.get("texto") or "").strip()
        if not texto:
            return resposta("Mensagem nao pode ficar vazia.", 400)

        if tipo == 2:
            # O aluno envia ao professor responsável; o professor envia ao
            # aluno escolhido. ID_ALUNO identifica a conversa nos dois casos.
            id_destinatario = _professor_responsavel(cursor, id_curso)
            if not id_destinatario:
                return resposta("Curso sem instrutor responsavel.", 400)
        else:
            id_destinatario = id_aluno

        cursor.execute(
            """
            INSERT INTO MENSAGENS_CHAT (
                ID_MENSAGEM, ID_CURSO, ID_ALUNO, ID_REMETENTE, ID_DESTINATARIO, TEXTO
            )
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (
                proximo_id(cursor, "MENSAGENS_CHAT", "ID_MENSAGEM"),
                id_curso,
                id_aluno,
                id_usuario,
                id_destinatario,
                para_blob_texto(texto),
            ),
        )
        con.commit()
        return resposta("Mensagem enviada.", 201, "sucesso")
    except Exception as erro:
        con.rollback()
        return resposta(f"Erro ao processar chat: {erro}", 500)
    finally:
        cursor.close()
        con.close()


# avisos por e-mail relacionados a cursos e provas.
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

    # Sprint item 11 - Enviar e-mail aos alunos que já compraram cursos do instrutor quando um novo curso for cadastrado. envia avisos individuais em segundo plano para não atrasar a publicação do curso.
    thread = threading.Thread(
        target=_enviar_avisos,
        args=(list(set(destinatarios)), titulo_curso, config),
        daemon=True,
    )
    thread.start()


# Sprint item 20 - Permitir que o instrutor cadastre provas para validar a conclusão do curso. comunica ao aluno a reprovação e informa quando poderá refazer a avaliação.
def notificar_reprovacao_prova(destinatario, titulo_curso, feedback=""):
    if not destinatario:
        return
    config = {
        "SMTP_HOST": current_app.config.get("SMTP_HOST", "smtp.gmail.com"),
        "SMTP_PORT": current_app.config.get("SMTP_PORT", 465),
        "SMTP_EMAIL": current_app.config.get("SMTP_EMAIL", ""),
        "SMTP_PASSWORD": current_app.config.get("SMTP_PASSWORD", ""),
        "SMTP_USE_SSL": current_app.config.get("SMTP_USE_SSL", True),
    }
    if not config["SMTP_PASSWORD"]:
        current_app.logger.warning("Aviso de reprovacao nao enviado: SMTP_PASSWORD nao configurada.")
        return
    thread = threading.Thread(
        target=_enviar_aviso_reprovacao,
        args=(destinatario, titulo_curso, feedback, config),
        daemon=True,
    )
    thread.start()


def _enviar_aviso_reprovacao(destinatario, titulo_curso, feedback, config):
    try:
        if config["SMTP_USE_SSL"]:
            servidor = smtplib.SMTP_SSL(config["SMTP_HOST"], config["SMTP_PORT"], timeout=20)
        else:
            servidor = smtplib.SMTP(config["SMTP_HOST"], config["SMTP_PORT"], timeout=20)
            servidor.starttls()
        try:
            servidor.login(config["SMTP_EMAIL"], config["SMTP_PASSWORD"])
            mensagem = MIMEMultipart("alternative")
            mensagem["Subject"] = f"Resultado da prova: {titulo_curso}"
            mensagem["From"] = formataddr(("Cursando", config["SMTP_EMAIL"]))
            mensagem["To"] = destinatario
            motivo = f"\nFeedback do instrutor: {feedback}" if feedback else ""
            mensagem.attach(MIMEText(
                f"Sua prova do curso {titulo_curso} foi corrigida e voce foi reprovado. "
                f"Voce podera tentar novamente depois de 1 dia da correcao.{motivo}",
                "plain",
                "utf-8",
            ))
            servidor.send_message(mensagem)
        finally:
            servidor.quit()
    except Exception:
        print("Erro ao enviar aviso de reprovacao; confira as configuracoes SMTP.")


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
