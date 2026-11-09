


import smtplib
import threading
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.utils import formataddr

from flask import current_app, jsonify, request
from flask_jwt_extended import get_jwt, get_jwt_identity, jwt_required

from app import app
from banco_37 import get_db
from professor_7 import de_blob_texto, para_blob_texto


from estrutura_banco_1_5_6_9_15_19_20_21_27_28_32_33_36_37 import garantir_estrutura_banco
from utilitarios_backend_5_9_12_15_20_24_28_34 import _aluno_matriculado, _bloqueio_assinatura_aluno, _curso_do_professor, _professor_responsavel, resposta






# Sprint item 19 - Implementar chat entre instrutor e aluno no aplicativo e no sistema web - Lista as conversas permitidas para o aluno ou instrutor
# A API valida vínculo com o curso antes de consultar ou enviar mensagens.
@app.route("/chat/conversas", methods=["GET"])
@jwt_required()
def chat_conversas():
    
    garantir_estrutura_banco()
    tipo = int(get_jwt().get("tipo", -1))
    id_usuario = int(get_jwt_identity())
    con = get_db()
    cursor = con.cursor()

    try:
        if tipo == 1:
            
            
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




def _mensagem_chat(row, id_usuario):
    return dict(id=row[0], id_remetente=row[1], nome=row[2], email=row[3],
                imagem_perfil=row[4], texto=de_blob_texto(row[5]), lida=row[6] == 1,
                criado_em=row[7].isoformat() if row[7] else None, minha=int(row[1]) == id_usuario)


_SELECT_MENSAGEM = """SELECT M.ID_MENSAGEM, M.ID_REMETENTE, U.NOME, U.EMAIL,
    U.IMAGEM_PERFIL, M.TEXTO, M.LIDA, M.CRIADO_EM
    FROM MENSAGENS_CHAT M JOIN USUARIOS U ON U.ID_USUARIO = M.ID_REMETENTE"""


def _inteiro_chat(valor, minimo=0):
    if isinstance(valor, bool) or not str(valor).isdigit():
        raise ValueError('Parametro inteiro invalido.')
    numero = int(valor)
    if not minimo <= numero <= 2147483647:
        raise ValueError('Parametro fora do intervalo permitido.')
    return numero


@app.route("/chat/cursos/<int:id_curso>/mensagens", methods=["GET", "POST", "PATCH"])
@jwt_required()
def chat_mensagens(id_curso):
    garantir_estrutura_banco()
    tipo = int(get_jwt().get("tipo", -1))
    id_usuario = int(get_jwt_identity())
    con = get_db()
    cursor = con.cursor()
    try:
        dados = request.get_json(silent=True) or {}
        if not isinstance(dados, dict):
            raise ValueError('Envie um objeto JSON.')
        if tipo == 2:
            id_aluno = id_usuario
            if not _aluno_matriculado(cursor, id_curso, id_aluno):
                return resposta("Aluno sem matricula ativa neste curso.", 403)
            bloqueio = _bloqueio_assinatura_aluno(cursor, id_aluno)
            if bloqueio:
                return bloqueio
        elif tipo == 1:
            if not _curso_do_professor(cursor, id_curso, id_usuario):
                return resposta("Curso nao encontrado para este instrutor.", 404)
            id_aluno = _inteiro_chat(request.args.get('id_aluno') or dados.get('id_aluno') or 0, 1)
            if not _aluno_matriculado(cursor, id_curso, id_aluno):
                return resposta("Informe um aluno matriculado para a conversa.", 400)
        else:
            return resposta("Chat disponivel apenas para alunos e instrutores.", 403)

        if request.method == 'PATCH':
            # Confirma somente o intervalo efetivamente carregado e visualizado.
            ate = _inteiro_chat(dados.get('ate_id'), 1)
            cursor.execute("""UPDATE MENSAGENS_CHAT SET LIDA = 1 WHERE ID_CURSO = ?
                AND ID_ALUNO = ? AND ID_DESTINATARIO = ? AND LIDA = 0 AND ID_MENSAGEM <= ?""",
                (id_curso, id_aluno, id_usuario, ate))
            con.commit()
            return jsonify(lidas_ate=ate)

        if request.method == 'GET':
            incremental = 'depois_id' in request.args
            depois = _inteiro_chat(request.args.get('depois_id', 0))
            antes = _inteiro_chat(request.args.get('antes_id', 0))
            limite = min(_inteiro_chat(request.args.get('limite', 50), 1), 100)
            if incremental and 'antes_id' in request.args:
                raise ValueError('Use apenas um cursor de mensagens.')
            filtro, parametros = 'M.ID_CURSO = ? AND M.ID_ALUNO = ?', [id_curso, id_aluno]
            if incremental or antes:
                filtro += ' AND M.ID_MENSAGEM ' + ('> ?' if incremental else '< ?')
                parametros.append(depois if incremental else antes)
            ordem = 'ASC' if incremental else 'DESC'
            consulta = _SELECT_MENSAGEM.replace('SELECT ', f'SELECT FIRST {limite + 1} ', 1)
            cursor.execute(consulta + f' WHERE {filtro} ORDER BY M.ID_MENSAGEM {ordem}', parametros)
            rows = cursor.fetchall()
            tem_mais = len(rows) > limite
            rows = rows[:limite]
            if not incremental:
                rows.reverse()
            mensagens = [_mensagem_chat(r, id_usuario) for r in rows]
            if request.args.get('paginado') == '1':
                return jsonify(mensagens=mensagens, tem_mais=tem_mais,
                               primeiro_id=mensagens[0]['id'] if mensagens else None,
                               ultimo_id=mensagens[-1]['id'] if mensagens else depois or None)
            # Clientes anteriores recebem um array limitado, sem gravacoes em GET.
            return jsonify(mensagens)

        texto = dados.get('texto')
        if not isinstance(texto, str) or not 1 <= len(texto.strip()) <= 10000:
            raise ValueError('A mensagem deve conter de 1 a 10000 caracteres.')
        texto = texto.strip()
        chave = dados.get('chave_envio')
        if chave is not None and (not isinstance(chave, str) or not 1 <= len(chave) <= 80):
            raise ValueError('Identificador de envio invalido.')
        # O bloqueio ordena os commits deste curso antes de disponibilizar o cursor.
        # A sequencia elimina a disputa de MAX(ID)+1 entre cursos e processos.
        cursor.execute('SELECT ID_CURSO FROM CURSOS WHERE ID_CURSO = ? WITH LOCK', (id_curso,))
        cursor.fetchone()
        if chave:
            cursor.execute("SELECT ID_MENSAGEM, ID_CURSO, ID_ALUNO FROM MENSAGENS_CHAT WHERE (CAST(ID_REMETENTE AS VARCHAR(20)) || ':' || CHAVE_ENVIO) = ?", (f'{id_usuario}:{chave}',))
            existente = cursor.fetchone()
            if existente:
                if existente[1:] != (id_curso, id_aluno):
                    return resposta('Identificador ja utilizado em outra conversa.', 409)
                cursor.execute(_SELECT_MENSAGEM + ' WHERE M.ID_MENSAGEM = ?', (existente[0],))
                return jsonify(mensagem=_mensagem_chat(cursor.fetchone(), id_usuario)), 200
        destinatario = _professor_responsavel(cursor, id_curso) if tipo == 2 else id_aluno
        if not destinatario:
            return resposta('Curso sem instrutor responsavel.', 400)
        cursor.execute('SELECT GEN_ID(GEN_CHAT_MENSAGEM, 1) FROM RDB$DATABASE')
        id_mensagem = cursor.fetchone()[0]
        cursor.execute("""INSERT INTO MENSAGENS_CHAT
            (ID_MENSAGEM, ID_CURSO, ID_ALUNO, ID_REMETENTE, ID_DESTINATARIO, TEXTO, CHAVE_ENVIO)
            VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (id_mensagem, id_curso, id_aluno, id_usuario, destinatario, para_blob_texto(texto), chave))
        cursor.execute(_SELECT_MENSAGEM + ' WHERE M.ID_MENSAGEM = ?', (id_mensagem,))
        mensagem = _mensagem_chat(cursor.fetchone(), id_usuario)
        con.commit()
        return jsonify(mensagem=mensagem), 201
    except ValueError as erro:
        con.rollback()
        return resposta(str(erro), 400)
    except Exception:
        con.rollback()
        current_app.logger.exception('Falha ao processar chat')
        return resposta('Nao foi possivel atualizar o chat. Tente novamente.', 500)
    finally:
        cursor.close()
        con.close()
# Fim item 19



# Sprint item 11 - Enviar e-mail aos alunos que já compraram cursos do instrutor quando um novo curso for cadastrado - Inicia o envio de avisos sobre a publicação do curso
# A publicação de novo curso envia avisos aos alunos elegíveis sem desfazer o curso se o e-mail falhar.
def notificar_alunos_novo_curso(destinatarios, titulo_curso):
    
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

    
    thread = threading.Thread(
        target=_enviar_avisos,
        args=(list(set(destinatarios)), titulo_curso, config),
        daemon=True,
    )
    thread.start()
# Fim item 11



# Sprint item 20 - Permitir que o instrutor cadastre provas para validar a conclusão do curso - Agenda a notificação do resultado e do feedback da prova
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
# Fim item 20


# Sprint item 11 - Enviar e-mail aos alunos que já compraram cursos do instrutor quando um novo curso for cadastrado - Monta o e-mail de novo curso e envia aos destinatários
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
        
        print("Erro ao enviar aviso de novo curso; confira as configurações SMTP.")
# Fim item 11


def _escapar_html(valor):
    return (str(valor).replace("&", "&amp;").replace("<", "&lt;")
            .replace(">", "&gt;").replace('"', "&quot;").replace("'", "&#39;"))
