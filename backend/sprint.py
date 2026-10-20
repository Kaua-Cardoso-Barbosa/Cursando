import io
import ast
import json
import mimetypes
import os
import secrets
import unicodedata
from datetime import datetime, timedelta
from threading import Lock
from decimal import Decimal, InvalidOperation
from uuid import uuid4

from flask import Response, current_app, jsonify, request, send_file
from flask_jwt_extended import get_jwt, get_jwt_identity, jwt_required
from werkzeug.utils import secure_filename

from app import app
from auditoria import garantir_gatilhos_auditoria
from banco import get_db
from log_banco import garantir_log_schema, get_log_db
from professor import de_blob_texto, para_blob_texto, salvar_upload
from servicos.arkhe import ArkheError, criar_cobranca_pix, consultar_cobranca_pix, solicitar_saque_conta


_schema_pronto = False
_faturas_lock = Lock()


def valor_assinatura_config():
    valor = float(current_app.config["VALOR_ASSINATURA"])
    if valor <= 0:
        raise ValueError("VALOR_ASSINATURA deve ser maior que zero.")
    return round(valor, 2)


def resposta(descricao, status=200, tipo="erro", **extra):
    payload = {
        "mensagem": {
            "tipo": tipo,
            "descricao": descricao,
        }
    }
    payload.update(extra)
    return jsonify(payload), status


def _existe_relacao(cursor, nome):
    cursor.execute(
        """
        SELECT 1
        FROM RDB$RELATIONS
        WHERE RDB$RELATION_NAME = ?
        """,
        (nome.upper(),),
    )
    return cursor.fetchone() is not None


def _criar_tabela(cursor, nome, ddl):
    if not _existe_relacao(cursor, nome):
        cursor.execute(ddl)


def _existe_coluna(cursor, tabela, coluna):
    cursor.execute(
        """
        SELECT 1
        FROM RDB$RELATION_FIELDS
        WHERE RDB$RELATION_NAME = ? AND RDB$FIELD_NAME = ?
        """,
        (tabela.upper(), coluna.upper()),
    )
    return cursor.fetchone() is not None


def _garantir_coluna(cursor, tabela, coluna, ddl):
    if not _existe_coluna(cursor, tabela, coluna):
        cursor.execute(f"ALTER TABLE {tabela} ADD {ddl}")


def garantir_sprint_schema():
    global _schema_pronto

    if _schema_pronto:
        return

    con = get_db()
    cursor = con.cursor()

    try:
        _criar_tabela(
            cursor,
            "MODULOS_CURSO",
            """
            CREATE TABLE MODULOS_CURSO (
                ID_MODULO INTEGER NOT NULL PRIMARY KEY,
                ID_CURSO INTEGER NOT NULL,
                TITULO VARCHAR(150) NOT NULL,
                DESCRICAO BLOB SUB_TYPE TEXT,
                IMAGEM_URL VARCHAR(500),
                ORDEM INTEGER DEFAULT 0,
                CRIADO_EM TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                ATUALIZADO_EM TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """,
        )
        _criar_tabela(
            cursor,
            "MATERIAIS_CURSO",
            """
            CREATE TABLE MATERIAIS_CURSO (
                ID_MATERIAL INTEGER NOT NULL PRIMARY KEY,
                ID_CURSO INTEGER NOT NULL,
                TITULO VARCHAR(150) NOT NULL,
                TIPO VARCHAR(30) NOT NULL,
                URL VARCHAR(1000) NOT NULL,
                DESCRICAO BLOB SUB_TYPE TEXT,
                CRIADO_EM TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """,
        )
        _criar_tabela(
            cursor,
            "AVALIACOES_CURSO",
            """
            CREATE TABLE AVALIACOES_CURSO (
                ID_AVALIACAO INTEGER NOT NULL PRIMARY KEY,
                ID_CURSO INTEGER NOT NULL,
                ID_USUARIO INTEGER NOT NULL,
                NOTA INTEGER NOT NULL,
                COMENTARIO BLOB SUB_TYPE TEXT,
                CRIADO_EM TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """,
        )
        _criar_tabela(
            cursor,
            "PROVAS_CURSO",
            """
            CREATE TABLE PROVAS_CURSO (
                ID_PROVA INTEGER NOT NULL PRIMARY KEY,
                ID_CURSO INTEGER NOT NULL,
                TITULO VARCHAR(150) NOT NULL,
                PUBLICADA INTEGER DEFAULT 0,
                CRIADO_EM TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """,
        )
        _criar_tabela(
            cursor,
            "QUESTOES_PROVA",
            """
            CREATE TABLE QUESTOES_PROVA (
                ID_QUESTAO INTEGER NOT NULL PRIMARY KEY,
                ID_PROVA INTEGER NOT NULL,
                ENUNCIADO BLOB SUB_TYPE TEXT NOT NULL,
                TIPO VARCHAR(20) NOT NULL,
                ALTERNATIVAS BLOB SUB_TYPE TEXT,
                RESPOSTA_ESPERADA BLOB SUB_TYPE TEXT
            )
            """,
        )
        _criar_tabela(
            cursor,
            "RESPOSTAS_PROVA",
            """
            CREATE TABLE RESPOSTAS_PROVA (
                ID_RESPOSTA INTEGER NOT NULL PRIMARY KEY,
                ID_PROVA INTEGER NOT NULL,
                ID_USUARIO INTEGER NOT NULL,
                RESPOSTAS BLOB SUB_TYPE TEXT,
                STATUS INTEGER DEFAULT 0,
                FEEDBACK BLOB SUB_TYPE TEXT,
                CRIADO_EM TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                CORRIGIDO_EM TIMESTAMP
            )
            """,
        )
        _criar_tabela(
            cursor,
            "CERTIFICADOS",
            """
            CREATE TABLE CERTIFICADOS (
                ID_CERTIFICADO INTEGER NOT NULL PRIMARY KEY,
                ID_CURSO INTEGER NOT NULL,
                ID_USUARIO INTEGER NOT NULL,
                CODIGO VARCHAR(80) NOT NULL,
                CRIADO_EM TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """,
        )
        _criar_tabela(
            cursor,
            "LOG_ACOES",
            """
            CREATE TABLE LOG_ACOES (
                ID_LOG INTEGER NOT NULL PRIMARY KEY,
                ID_USUARIO INTEGER,
                TIPO_USUARIO INTEGER,
                NOME VARCHAR(150),
                EMAIL VARCHAR(150),
                ACAO VARCHAR(80) NOT NULL,
                ROTA VARCHAR(300) NOT NULL,
                METODO VARCHAR(10) NOT NULL,
                DETALHES BLOB SUB_TYPE TEXT,
                CRIADO_EM TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """,
        )
        _criar_tabela(
            cursor,
            "CUSTOS_PLATAFORMA",
            """
            CREATE TABLE CUSTOS_PLATAFORMA (
                ID_CUSTO INTEGER NOT NULL PRIMARY KEY,
                DESCRICAO VARCHAR(200) NOT NULL,
                VALOR NUMERIC(15,2) NOT NULL,
                DATA_CUSTO DATE DEFAULT CURRENT_DATE,
                CRIADO_EM TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """,
        )
        _criar_tabela(
            cursor,
            "SAQUES_INSTRUTOR",
            """
            CREATE TABLE SAQUES_INSTRUTOR (
                ID_SAQUE INTEGER NOT NULL PRIMARY KEY,
                ID_USUARIO INTEGER NOT NULL,
                VALOR NUMERIC(15,2) NOT NULL,
                STATUS INTEGER DEFAULT 0,
                CRIADO_EM TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """,
        )
        _criar_tabela(
            cursor,
            "FINANCEIRO_CONFIG",
            """
            CREATE TABLE FINANCEIRO_CONFIG (
                ID_CONFIG INTEGER NOT NULL PRIMARY KEY,
                PERCENTUAL_INSTRUTORES NUMERIC(5,2) DEFAULT 50,
                ATUALIZADO_EM TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """,
        )
        _criar_tabela(
            cursor,
            "MENSAGENS_CHAT",
            """
            CREATE TABLE MENSAGENS_CHAT (
                ID_MENSAGEM INTEGER NOT NULL PRIMARY KEY,
                ID_CURSO INTEGER NOT NULL,
                ID_ALUNO INTEGER NOT NULL,
                ID_REMETENTE INTEGER NOT NULL,
                ID_DESTINATARIO INTEGER NOT NULL,
                TEXTO BLOB SUB_TYPE TEXT NOT NULL,
                LIDA INTEGER DEFAULT 0,
                CRIADO_EM TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """,
        )
        _criar_tabela(
            cursor,
            "CATEGORIAS_CURSO",
            """
            CREATE TABLE CATEGORIAS_CURSO (
                ID_CATEGORIA INTEGER NOT NULL PRIMARY KEY,
                NOME VARCHAR(120) NOT NULL,
                NOME_NORMALIZADO VARCHAR(120) NOT NULL
            )
            """,
        )
        _criar_tabela(
            cursor,
            "TEMAS_CURSO",
            """
            CREATE TABLE TEMAS_CURSO (
                ID_TEMA INTEGER NOT NULL PRIMARY KEY,
                NOME VARCHAR(120) NOT NULL,
                NOME_NORMALIZADO VARCHAR(120) NOT NULL
            )
            """,
        )
        _criar_tabela(
            cursor,
            "CURSO_TAXONOMIA",
            """
            CREATE TABLE CURSO_TAXONOMIA (
                ID_CURSO INTEGER NOT NULL PRIMARY KEY,
                ID_CATEGORIA INTEGER,
                ID_TEMA INTEGER
            )
            """,
        )
        # Sprint item 9: guarda visitas e inscrições únicas por aluno e mês para medir conversão por curso.
        _criar_tabela(
            cursor,
            "EVENTOS_CURSOS",
            """
            CREATE TABLE EVENTOS_CURSOS (
                ID_CURSO INTEGER NOT NULL,
                ID_USUARIO INTEGER NOT NULL,
                TIPO_EVENTO VARCHAR(20) NOT NULL,
                MES_REFERENCIA DATE NOT NULL,
                CRIADO_EM TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT PK_EVENTOS_CURSOS PRIMARY KEY (ID_CURSO, ID_USUARIO, TIPO_EVENTO, MES_REFERENCIA)
            )
            """,
        )
        con.commit()
        cursor.execute("SELECT COUNT(*) FROM FINANCEIRO_CONFIG")
        if int((cursor.fetchone() or (0,))[0] or 0) == 0:
            cursor.execute(
                """
                INSERT INTO FINANCEIRO_CONFIG (ID_CONFIG, PERCENTUAL_INSTRUTORES)
                VALUES (1, 50)
                """
            )
        # Sprint itens 1, 2, 3, 4 e 5: campos financeiros para faturas, custos, ticket medio e saques via Arkhe.
        _garantir_coluna(cursor, "ASSINATURAS", "VALOR", "VALOR NUMERIC(15,2)")
        _garantir_coluna(cursor, "ASSINATURAS", "DATA_VENCIMENTO", "DATA_VENCIMENTO TIMESTAMP")
        _garantir_coluna(cursor, "ASSINATURAS", "DATA_PAGAMENTO", "DATA_PAGAMENTO TIMESTAMP")
        _garantir_coluna(cursor, "ASSINATURAS", "CRIADO_EM", "CRIADO_EM TIMESTAMP DEFAULT CURRENT_TIMESTAMP")
        _garantir_coluna(cursor, "SAQUES_INSTRUTOR", "ID_SAQUE_ARKHE", "ID_SAQUE_ARKHE VARCHAR(120)")
        _garantir_coluna(cursor, "SAQUES_INSTRUTOR", "RESPOSTA_ARKHE", "RESPOSTA_ARKHE BLOB SUB_TYPE TEXT")
        _garantir_coluna(cursor, "CUSTOS_PLATAFORMA", "CATEGORIA", "CATEGORIA VARCHAR(80)")
        _garantir_coluna(cursor, "CUSTOS_PLATAFORMA", "ID_USUARIO", "ID_USUARIO INTEGER")
        # Sprint item 6: associa cada videoaula ao modulo do curso.
        _garantir_coluna(cursor, "VIDEOS", "ID_MODULO", "ID_MODULO INTEGER")
        # Sprint item 20: guarda quando o instrutor corrigiu a prova para aplicar o intervalo de nova tentativa.
        _garantir_coluna(cursor, "RESPOSTAS_PROVA", "CORRIGIDO_EM", "CORRIGIDO_EM TIMESTAMP")
        # Sprint item 19: garante a foto de perfil usada para identificar os participantes do chat.
        _garantir_coluna(cursor, "USUARIOS", "IMAGEM_PERFIL", "IMAGEM_PERFIL VARCHAR(500)")
        # Sprint item 21: guarda o nome original de arquivos privados dos complementos do curso.
        _garantir_coluna(cursor, "MATERIAIS_CURSO", "NOME_ARQUIVO", "NOME_ARQUIVO VARCHAR(255)")
        con.commit()
        garantir_log_schema()
        garantir_gatilhos_auditoria({
            "MODULOS_CURSO",
            "MATERIAIS_CURSO",
            "AVALIACOES_CURSO",
            "PROVAS_CURSO",
            "QUESTOES_PROVA",
            "RESPOSTAS_PROVA",
            "CERTIFICADOS",
            "CUSTOS_PLATAFORMA",
            "SAQUES_INSTRUTOR",
            "FINANCEIRO_CONFIG",
            "MENSAGENS_CHAT",
            "CATEGORIAS_CURSO",
            "TEMAS_CURSO",
            "CURSO_TAXONOMIA",
            "VIDEOS",
            "ASSINATURAS",
        }, force=True)
        _schema_pronto = True
    except Exception:
        con.rollback()
        raise
    finally:
        cursor.close()
        con.close()


def proximo_id(cursor, tabela, coluna):
    cursor.execute(f"SELECT COALESCE(MAX({coluna}), 0) + 1 FROM {tabela}")
    return cursor.fetchone()[0]


def _decodificar_respostas_prova(valor):
    texto = de_blob_texto(valor)
    if not texto:
        return {}
    try:
        return json.loads(texto)
    except (TypeError, ValueError):
        try:
            return ast.literal_eval(texto)
        except (ValueError, SyntaxError):
            return {}


def _decodificar_alternativas(valor):
    texto = de_blob_texto(valor)
    if not texto:
        return []
    try:
        dados = json.loads(texto)
        return dados if isinstance(dados, list) else []
    except (TypeError, ValueError):
        return [item.strip() for item in texto.splitlines() if item.strip()]


def registrar_evento_curso(cursor, id_curso, id_usuario, tipo_evento):
    # Sprint item 9: registra uma visita ou inscrição uma vez por aluno, curso e mês para manter taxas mensais consistentes.
    mes_referencia = datetime.now().date().replace(day=1)
    cursor.execute(
        """
        SELECT 1 FROM EVENTOS_CURSOS
        WHERE ID_CURSO = ? AND ID_USUARIO = ? AND TIPO_EVENTO = ? AND MES_REFERENCIA = ?
        """,
        (id_curso, id_usuario, tipo_evento, mes_referencia),
    )
    if cursor.fetchone():
        return False

    cursor.execute(
        """
        INSERT INTO EVENTOS_CURSOS (ID_CURSO, ID_USUARIO, TIPO_EVENTO, MES_REFERENCIA)
        VALUES (?, ?, ?, ?)
        """,
        (id_curso, id_usuario, tipo_evento, mes_referencia),
    )
    return True


def exigir_tipo(*tipos):
    tipo = int(get_jwt().get("tipo", -1))
    if tipo not in tipos:
        return resposta("Acesso negado para este perfil.", 403)
    return None


def percentual_instrutores(cursor):
    cursor.execute("SELECT PERCENTUAL_INSTRUTORES FROM FINANCEIRO_CONFIG WHERE ID_CONFIG = 1")
    return float((cursor.fetchone() or (50,))[0] or 50)


def pesos_pool_instrutores(cursor):
    cursor.execute(
        """
        SELECT
            PC.ID_USUARIO,
            COUNT(PA.ID_VIDEO)
        FROM PROFESSORES_CURSO PC
        JOIN CURSOS C ON C.ID_CURSO = PC.ID_CURSO AND C.EXCLUIDO = 0
        JOIN VIDEOS V ON V.ID_CURSO = C.ID_CURSO AND V.EXCLUIDO = 0 AND V.STATUS = 1
        LEFT JOIN PROGRESSO_AULAS PA ON PA.ID_VIDEO = V.ID_VIDEO
        GROUP BY PC.ID_USUARIO
        """
    )
    pesos = {int(row[0]): int(row[1] or 0) for row in cursor.fetchall()}

    if sum(pesos.values()) > 0:
        return pesos

    cursor.execute(
        """
        SELECT
            PC.ID_USUARIO,
            COUNT(DISTINCT M.ID_USUARIO)
        FROM PROFESSORES_CURSO PC
        JOIN CURSOS C ON C.ID_CURSO = PC.ID_CURSO AND C.EXCLUIDO = 0
        LEFT JOIN MATRICULAS M ON M.ID_CURSO = C.ID_CURSO AND M.STATUS_MATRICULA = 1
        GROUP BY PC.ID_USUARIO
        """
    )
    return {int(row[0]): int(row[1] or 0) for row in cursor.fetchall()}


def calcular_saldo_saque(cursor, id_usuario, pool_instrutores, pesos_instrutores, peso_total):
    # Sprint item 15: calcula o saldo bruto do instrutor e desconta as solicitações de saque registradas.
    # Sprint item 1: usa o mesmo saldo apresentado no painel para limitar saques enviados à Arkhé.
    peso_instrutor = pesos_instrutores.get(int(id_usuario), 0)
    estimado = pool_instrutores * (peso_instrutor / peso_total) if peso_total else 0
    cursor.execute(
        "SELECT COALESCE(CAST(SUM(VALOR) AS DOUBLE PRECISION), 0) FROM SAQUES_INSTRUTOR WHERE ID_USUARIO = ?",
        (id_usuario,),
    )
    sacado = float((cursor.fetchone() or (0,))[0] or 0)
    disponivel = round(max(estimado - sacado, 0), 2)
    return peso_instrutor, estimado, sacado, disponivel


def normalizar_taxonomia(valor):
    return " ".join((valor or "").strip().lower().split())


def _resumo_detalhes_log(detalhes):
    try:
        dados = json.loads(detalhes)
    except (TypeError, ValueError):
        return detalhes

    descricao = dados.get("descricao") or dados.get("acao") or ""
    requisicao = dados.get("requisicao") or {}
    status = requisicao.get("status_http")
    rota = requisicao.get("rota")
    metodo = requisicao.get("metodo")
    partes = [
        parte
        for parte in [
            descricao,
            f"{metodo} {rota}".strip() if rota else "",
            f"status {status}" if status else "",
        ]
        if parte
    ]
    return " | ".join(partes)


@app.route("/professor/cursos/<int:id_curso>/modulos", methods=["GET", "POST"])
@jwt_required()
def modulos_professor(id_curso):
    negado = exigir_tipo(1)
    if negado:
        return negado

    garantir_sprint_schema()
    con = get_db()
    cursor = con.cursor()

    try:
        cursor.execute(
            """
            SELECT 1
            FROM CURSOS C
            JOIN PROFESSORES_CURSO PC ON PC.ID_CURSO = C.ID_CURSO
            WHERE C.ID_CURSO = ? AND PC.ID_USUARIO = ? AND C.EXCLUIDO = 0
            """,
            (id_curso, get_jwt_identity()),
        )
        if not cursor.fetchone():
            return resposta("Curso nao encontrado.", 404)

        if request.method == "GET":
            cursor.execute(
                """
                SELECT M.ID_MODULO, M.ID_CURSO, M.TITULO, M.DESCRICAO, M.IMAGEM_URL, M.ORDEM,
                       (SELECT COUNT(*) FROM VIDEOS V WHERE V.ID_MODULO = M.ID_MODULO AND V.EXCLUIDO = 0)
                FROM MODULOS_CURSO M
                JOIN PROFESSORES_CURSO PC ON PC.ID_CURSO = M.ID_CURSO
                WHERE M.ID_CURSO = ? AND PC.ID_USUARIO = ?
                ORDER BY M.ORDEM, M.ID_MODULO
                """,
                (id_curso, get_jwt_identity()),
            )
            return jsonify([
                {
                    "id": row[0],
                    "id_curso": row[1],
                    "titulo": row[2],
                    "descricao": de_blob_texto(row[3]),
                    "imagem": row[4],
                    "ordem": row[5] or 0,
                    "total_aulas": row[6] or 0,
                }
                for row in cursor.fetchall()
            ])

        dados = request.form if request.form else (request.get_json() or {})
        titulo = (dados.get("titulo") or "").strip()
        descricao = (dados.get("descricao") or "").strip()
        try:
            ordem = int(dados.get("ordem") or 0)
        except (TypeError, ValueError):
            return resposta("Ordem do modulo invalida.", 400)

        if not titulo:
            return resposta("Titulo do modulo e obrigatorio.", 400)

        try:
            imagem = salvar_upload(request.files.get("imagem"), "modulos", {"jpg", "jpeg", "png", "webp"})
        except ValueError as erro:
            return resposta(str(erro), 400)

        id_modulo = proximo_id(cursor, "MODULOS_CURSO", "ID_MODULO")
        # Sprint item 6: cadastra modulos para organizar aulas dentro do curso.
        cursor.execute(
            """
            INSERT INTO MODULOS_CURSO (ID_MODULO, ID_CURSO, TITULO, DESCRICAO, IMAGEM_URL, ORDEM)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (id_modulo, id_curso, titulo, para_blob_texto(descricao), imagem["url"] if imagem else None, ordem),
        )
        con.commit()
        return resposta("Modulo criado com sucesso.", 201, "sucesso", id_modulo=id_modulo)
    except Exception as erro:
        con.rollback()
        return resposta(f"Erro ao processar modulos: {erro}", 500)
    finally:
        cursor.close()
        con.close()


# Sprint item 21: autoriza o instrutor do curso a publicar links e arquivos privados como complementos.
@app.route("/professor/cursos/<int:id_curso>/materiais", methods=["GET", "POST"])
@jwt_required()
def materiais_professor(id_curso):
    negado = exigir_tipo(1)
    if negado:
        return negado

    garantir_sprint_schema()
    con = get_db()
    cursor = con.cursor()
    caminho_arquivo = ""

    try:
        if not _curso_do_professor(cursor, id_curso, int(get_jwt_identity())):
            return resposta("Curso nao encontrado para este instrutor.", 404)

        if request.method == "GET":
            cursor.execute(
                """
                SELECT ID_MATERIAL, TITULO, TIPO, URL, DESCRICAO, NOME_ARQUIVO
                FROM MATERIAIS_CURSO
                WHERE ID_CURSO = ?
                ORDER BY ID_MATERIAL DESC
                """,
                (id_curso,),
            )
            return jsonify([
                {
                    "id": row[0],
                    "titulo": row[1],
                    "tipo": row[2],
                    "url": row[3],
                    "descricao": de_blob_texto(row[4]),
                    "nome_arquivo": row[5] or "",
                    "arquivo": str(row[3] or "").startswith("privado:"),
                }
                for row in cursor.fetchall()
            ])

        dados = request.form if request.form else (request.get_json() or {})
        titulo = (dados.get("titulo") or "").strip()
        tipo = (dados.get("tipo") or "link").strip().lower()
        url = (dados.get("url") or "").strip()
        descricao = (dados.get("descricao") or "").strip()
        arquivo = request.files.get("arquivo")
        nome_arquivo = ""

        if not titulo or tipo not in {"link", "pdf", "livro", "apostila", "codigo", "arquivo", "outro"}:
            return resposta("Informe um titulo e um tipo valido para o complemento.", 400)

        if arquivo and arquivo.filename:
            extensao = arquivo.filename.rsplit(".", 1)[-1].lower() if "." in arquivo.filename else ""
            extensoes_permitidas = {"pdf", "epub", "mobi", "doc", "docx", "odt", "txt", "rtf", "zip", "rar", "7z", "py", "js", "java", "html", "css", "csv", "xlsx", "pptx"}
            if extensao not in extensoes_permitidas:
                return resposta("Tipo de arquivo nao permitido para complemento.", 400)
            nome_arquivo = secure_filename(arquivo.filename) or f"complemento.{extensao}"
            pasta = os.path.join(current_app.root_path, "private_uploads", "materiais")
            os.makedirs(pasta, exist_ok=True)
            nome_seguro = f"{uuid4().hex}.{extensao}"
            caminho_arquivo = os.path.join(pasta, nome_seguro)
            arquivo.save(caminho_arquivo)
            url = f"privado:{nome_seguro}"
        elif not (url.startswith("https://") or url.startswith("http://")):
            return resposta("Informe um link HTTP/HTTPS ou envie um arquivo.", 400)

        id_material = proximo_id(cursor, "MATERIAIS_CURSO", "ID_MATERIAL")
        # Sprint item 21: mantém os arquivos em diretório privado para exigir matrícula antes do download.
        cursor.execute(
            """
            INSERT INTO MATERIAIS_CURSO (ID_MATERIAL, ID_CURSO, TITULO, TIPO, URL, DESCRICAO, NOME_ARQUIVO)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (id_material, id_curso, titulo, tipo, url, para_blob_texto(descricao), nome_arquivo),
        )
        con.commit()
        return resposta("Material cadastrado com sucesso.", 201, "sucesso", id_material=id_material)
    except Exception as erro:
        con.rollback()
        if caminho_arquivo and os.path.exists(caminho_arquivo):
            os.remove(caminho_arquivo)
        return resposta(f"Erro ao processar materiais: {erro}", 500)
    finally:
        cursor.close()
        con.close()


# Sprint item 21: exibe os dados na prévia, mas só revela links e arquivos para aluno matriculado.
@app.route("/aluno/cursos/<int:id_curso>/materiais", methods=["GET"])
@jwt_required()
def materiais_aluno(id_curso):
    negado = exigir_tipo(2)
    if negado:
        return negado

    garantir_sprint_schema()
    con = get_db()
    cursor = con.cursor()

    try:
        cursor.execute(
            """
            SELECT CASE WHEN EXISTS (
                SELECT 1 FROM MATRICULAS
                WHERE ID_CURSO = ? AND ID_USUARIO = ? AND STATUS_MATRICULA = 1
            ) THEN 1 ELSE 0 END
            FROM RDB$DATABASE
            """,
            (id_curso, get_jwt_identity()),
        )
        matriculado = bool(cursor.fetchone()[0])
        if matriculado:
            bloqueio = _bloqueio_assinatura_aluno(cursor, int(get_jwt_identity()))
            if bloqueio:
                return bloqueio

        cursor.execute(
            """
            SELECT ID_MATERIAL, TITULO, TIPO, URL, DESCRICAO, NOME_ARQUIVO
            FROM MATERIAIS_CURSO
            WHERE ID_CURSO = ?
            ORDER BY ID_MATERIAL DESC
            """,
            (id_curso,),
        )
        materiais = []
        for row in cursor.fetchall():
            materiais.append({
                "id": row[0],
                "titulo": row[1],
                "tipo": row[2],
                "url": row[3] if matriculado and not str(row[3] or "").startswith("privado:") else "",
                "arquivo_url": f"/aluno/cursos/{id_curso}/materiais/{row[0]}/arquivo" if matriculado and str(row[3] or "").startswith("privado:") else "",
                "descricao": de_blob_texto(row[4]),
                "nome_arquivo": row[5] or "",
                "arquivo": str(row[3] or "").startswith("privado:"),
                "bloqueado": not matriculado,
            })
        return jsonify(materiais)
    except Exception as erro:
        return resposta(f"Erro ao carregar materiais: {erro}", 500)
    finally:
        cursor.close()
        con.close()


@app.route("/aluno/cursos/<int:id_curso>/avaliacoes", methods=["POST"])
@jwt_required()
def avaliar_curso(id_curso):
    negado = exigir_tipo(2)
    if negado:
        return negado

    garantir_sprint_schema()
    dados = request.get_json() or {}
    nota = int(dados.get("nota") or -1)
    comentario = (dados.get("comentario") or "").strip()

    if nota < 0 or nota > 5:
        return resposta("A nota deve estar entre 0 e 5.", 400)

    con = get_db()
    cursor = con.cursor()

    try:
        cursor.execute(
            """
            SELECT PROGRESSO
            FROM MATRICULAS
            WHERE ID_CURSO = ? AND ID_USUARIO = ? AND STATUS_MATRICULA = 1
            """,
            (id_curso, get_jwt_identity()),
        )
        matricula = cursor.fetchone()
        if not matricula or int(matricula[0] or 0) < 100:
            return resposta("Avaliacao liberada somente apos concluir o curso.", 403)

        bloqueio = _bloqueio_assinatura_aluno(cursor, int(get_jwt_identity()))
        if bloqueio:
            return bloqueio

        cursor.execute(
            """
            SELECT FIRST 1 R.STATUS
            FROM PROVAS_CURSO P
            JOIN RESPOSTAS_PROVA R ON R.ID_PROVA = P.ID_PROVA AND R.ID_USUARIO = ?
            WHERE P.ID_CURSO = ? AND P.PUBLICADA = 1
            ORDER BY R.ID_RESPOSTA DESC
            """,
            (get_jwt_identity(), id_curso),
        )
        status_prova = cursor.fetchone()
        if not status_prova or int(status_prova[0] or 0) != 1:
            return resposta("Avaliacao liberada somente apos aprovacao na prova.", 403)

        # Sprint item 27: permite avaliacao do curso somente depois da conclusao.
        cursor.execute(
            """
            UPDATE OR INSERT INTO AVALIACOES_CURSO (
                ID_AVALIACAO, ID_CURSO, ID_USUARIO, NOTA, COMENTARIO, CRIADO_EM
            )
            VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            MATCHING (ID_CURSO, ID_USUARIO)
            """,
            (
                proximo_id(cursor, "AVALIACOES_CURSO", "ID_AVALIACAO"),
                id_curso,
                get_jwt_identity(),
                nota,
                para_blob_texto(comentario),
            ),
        )
        con.commit()
        return resposta("Avaliacao registrada com sucesso.", 201, "sucesso")
    except Exception as erro:
        con.rollback()
        return resposta(f"Erro ao avaliar curso: {erro}", 500)
    finally:
        cursor.close()
        con.close()


def _pdf_simples(titulo, linhas):
    conteudo = [f"BT /F1 18 Tf 72 760 Td ({titulo}) Tj ET"]
    y = 720
    for linha in linhas:
        seguro = str(linha).replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")
        conteudo.append(f"BT /F1 12 Tf 72 {y} Td ({seguro}) Tj ET")
        y -= 24
    stream = "\n".join(conteudo).encode("latin-1", errors="replace")
    objetos = [
        b"<< /Type /Catalog /Pages 2 0 R >>",
        b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
        b"<< /Length " + str(len(stream)).encode() + b" >>\nstream\n" + stream + b"\nendstream",
    ]
    saida = io.BytesIO()
    saida.write(b"%PDF-1.4\n")
    offsets = [0]
    for i, obj in enumerate(objetos, 1):
        offsets.append(saida.tell())
        saida.write(f"{i} 0 obj\n".encode())
        saida.write(obj)
        saida.write(b"\nendobj\n")
    xref = saida.tell()
    saida.write(f"xref\n0 {len(objetos) + 1}\n".encode())
    saida.write(b"0000000000 65535 f \n")
    for offset in offsets[1:]:
        saida.write(f"{offset:010d} 00000 n \n".encode())
    saida.write(f"trailer << /Size {len(objetos) + 1} /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF".encode())
    return saida.getvalue()


def _pdf_certificado(dados):
    # Sprint item 5: monta um certificado A4 horizontal com dados de conclusao e validacao.
    largura = 842
    comandos = [
        "0.97 0.98 0.95 rg 0 0 842 595 re f",
        "0.02 0.31 0.19 RG 3 w 20 20 802 555 re S",
        "0.75 0.58 0.25 RG 1 w 31 31 780 533 re S",
        "0.02 0.31 0.19 rg 0 575 842 20 re f",
    ]

    larguras = {
        " ": 278, "i": 222, "l": 222, "j": 222, "f": 278, "t": 278,
        "r": 333, "m": 833, "w": 722, "a": 556, "b": 556, "c": 500,
        "d": 556, "e": 556, "g": 556, "h": 556, "n": 556, "o": 556,
        "p": 556, "q": 556, "s": 500, "u": 556, "v": 500, "x": 500,
        "y": 500, "z": 500, "A": 667, "B": 667, "C": 722, "D": 722,
        "E": 667, "F": 611, "G": 778, "H": 722, "I": 278, "J": 500,
        "K": 667, "L": 556, "M": 833, "N": 722, "O": 778, "P": 667,
        "Q": 778, "R": 722, "S": 667, "T": 611, "U": 722, "V": 667,
        "W": 944, "X": 667, "Y": 667, "Z": 611, ".": 278, ",": 278,
        ":": 278, ";": 278, "!": 278, "?": 444, "-": 333, "/": 278,
        "'": 191, "(": 333, ")": 333,
    }

    def largura_texto(texto, tamanho):
        base = unicodedata.normalize("NFD", str(texto))
        base = "".join(caractere for caractere in base if unicodedata.category(caractere) != "Mn")
        return sum(larguras.get(caractere, larguras.get(caractere.lower(), 556)) for caractere in base) * tamanho / 1000

    def texto(texto_exibido, y, tamanho, fonte="F1", cor=(0.12, 0.18, 0.15), centro=True, x=None):
        texto_seguro = str(texto_exibido or "").replace("\r", " ").replace("\n", " ")
        texto_seguro = texto_seguro.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")
        if x is None:
            x = max(55, (largura - largura_texto(texto_exibido, tamanho)) / 2) if centro else 58
        comandos.append(
            f"BT /{fonte} {tamanho} Tf {cor[0]:.3f} {cor[1]:.3f} {cor[2]:.3f} rg 1 0 0 1 {x:.2f} {y:.2f} Tm ({texto_seguro}) Tj ET"
        )

    def quebrar(texto_exibido, tamanho, max_largura):
        palavras = str(texto_exibido or "").split()
        linhas = []
        linha = ""
        for palavra in palavras:
            teste = f"{linha} {palavra}".strip()
            if linha and largura_texto(teste, tamanho) > max_largura:
                linhas.append(linha)
                linha = palavra
            else:
                linha = teste
        if linha:
            linhas.append(linha)
        return linhas or [""]

    texto("CURSANDO  •  EDUCAÇÃO E DESENVOLVIMENTO", 538, 10, "F2", (0.86, 0.72, 0.43))
    texto("CERTIFICADO DE CONCLUSÃO", 476, 25, "F2", (0.02, 0.31, 0.19))
    texto("Certificamos que", 435, 12, "F1", (0.38, 0.43, 0.40))

    nome = str(dados.get("aluno") or "Aluno")
    tamanho_nome = 25
    linhas_nome = quebrar(nome, tamanho_nome, 690)
    while len(linhas_nome) > 2 and tamanho_nome > 16:
        tamanho_nome -= 1
        linhas_nome = quebrar(nome, tamanho_nome, 690)
    y_nome = 395
    for linha in linhas_nome[:2]:
        texto(linha, y_nome, tamanho_nome, "F2", (0.02, 0.31, 0.19))
        y_nome -= tamanho_nome + 3
    deslocamento_nome = (len(linhas_nome[:2]) - 1) * (tamanho_nome + 4)
    texto("concluiu com aproveitamento o curso", 360 - deslocamento_nome, 13, "F1", (0.30, 0.36, 0.33))

    titulo_curso = str(dados.get("curso") or "Curso")
    tamanho_curso = 22
    linhas_curso = quebrar(titulo_curso, tamanho_curso, 690)
    while len(linhas_curso) > 4 and tamanho_curso > 13:
        tamanho_curso -= 1
        linhas_curso = quebrar(titulo_curso, tamanho_curso, 690)
    y_curso = 327 - deslocamento_nome
    for linha in linhas_curso[:4]:
        texto(linha, y_curso, tamanho_curso, "F2", (0.75, 0.48, 0.14))
        y_curso -= tamanho_curso + 5

    aulas = int(dados.get("aulas_concluidas") or 0)
    descricao_conclusao = "e foi aprovado(a) na avaliação final."
    if aulas:
        descricao_conclusao = f"e foi aprovado(a) na avaliação final após concluir {aulas} aula(s)."
    y_detalhe = y_curso - 1
    texto(descricao_conclusao, y_detalhe, 11, "F1", (0.30, 0.36, 0.33))
    texto(f"Concluído em {dados.get('data_conclusao', '')}  •  Emitido em {dados.get('data_emissao', '')}", y_detalhe - 22, 10, "F1", (0.38, 0.43, 0.40))

    comandos.extend([
        "0.75 0.58 0.25 RG 1 w 92 126 m 344 126 l S",
        "0.75 0.58 0.25 RG 1 w 498 126 m 750 126 l S",
    ])
    nome_professor = dados.get("professor") or "Instrutor(a) do curso"
    x_professor = 92 + max(0, (252 - largura_texto(nome_professor, 10)) / 2)
    x_plataforma = 498 + max(0, (252 - largura_texto("Cursando", 10)) / 2)
    texto(nome_professor, 143, 10, "F2", (0.12, 0.18, 0.15), x=x_professor)
    texto("Professor(a) responsável", 108, 9, "F1", (0.38, 0.43, 0.40), x=128)
    texto("Cursando", 143, 10, "F2", (0.12, 0.18, 0.15), x=x_plataforma)
    texto("Plataforma emissora", 108, 9, "F1", (0.38, 0.43, 0.40), x=584)
    texto(f"Código de autenticidade: {dados.get('codigo', '')}", 70, 9, "F2", (0.02, 0.31, 0.19))
    texto(f"Verifique em: {dados.get('url_verificacao', '')}", 51, 8, "F1", (0.38, 0.43, 0.40))

    stream = "\n".join(comandos).encode("cp1252", errors="replace")
    objetos = [
        b"<< /Type /Catalog /Pages 2 0 R >>",
        b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 842 595] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>",
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>",
        b"<< /Length " + str(len(stream)).encode() + b" >>\nstream\n" + stream + b"\nendstream",
    ]
    saida = io.BytesIO()
    saida.write(b"%PDF-1.4\n")
    offsets = [0]
    for indice, objeto in enumerate(objetos, 1):
        offsets.append(saida.tell())
        saida.write(f"{indice} 0 obj\n".encode())
        saida.write(objeto)
        saida.write(b"\nendobj\n")
    xref = saida.tell()
    saida.write(f"xref\n0 {len(objetos) + 1}\n".encode())
    saida.write(b"0000000000 65535 f \n")
    for offset in offsets[1:]:
        saida.write(f"{offset:010d} 00000 n \n".encode())
    saida.write(f"trailer << /Size {len(objetos) + 1} /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF".encode())
    return saida.getvalue()


def _data_certificado(valor):
    if hasattr(valor, "strftime"):
        return valor.strftime("%d/%m/%Y")
    texto_data = str(valor or "")
    try:
        return datetime.fromisoformat(texto_data).strftime("%d/%m/%Y")
    except ValueError:
        return texto_data[:10] if texto_data else ""


def _curso_do_professor(cursor, id_curso, id_professor):
    cursor.execute(
        """
        SELECT 1
        FROM PROFESSORES_CURSO PC
        JOIN CURSOS C ON C.ID_CURSO = PC.ID_CURSO AND C.EXCLUIDO = 0
        WHERE PC.ID_CURSO = ? AND PC.ID_USUARIO = ?
        """,
        (id_curso, id_professor),
    )
    return cursor.fetchone() is not None


def _aluno_matriculado(cursor, id_curso, id_aluno):
    cursor.execute(
        """
        SELECT 1
        FROM MATRICULAS
        WHERE ID_CURSO = ? AND ID_USUARIO = ? AND STATUS_MATRICULA = 1
        """,
        (id_curso, id_aluno),
    )
    return cursor.fetchone() is not None


def _bloqueio_assinatura_aluno(cursor, id_aluno):
    from aluno import aluno_tem_assinatura_ativa

    if aluno_tem_assinatura_ativa(cursor, id_aluno):
        return None

    return resposta(
        "Voce precisa de uma assinatura ativa para acessar este recurso.",
        402,
        "erro",
        redirecionar="/DashboardAluno/financeiro",
    )


def _professor_responsavel(cursor, id_curso):
    cursor.execute(
        """
        SELECT FIRST 1 ID_USUARIO
        FROM PROFESSORES_CURSO
        WHERE ID_CURSO = ?
        ORDER BY ID_USUARIO
        """,
        (id_curso,),
    )
    row = cursor.fetchone()
    return row[0] if row else None


# Sprint item 19: lista cursos matriculados para alunos e conversas recebidas para instrutores, com nome e avatar do contato.
@app.route("/chat/conversas", methods=["GET"])
@jwt_required()
def chat_conversas():
    garantir_sprint_schema()
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


@app.route("/taxonomias/<string:tipo>", methods=["GET", "POST"])
@jwt_required()
def taxonomias(tipo):
    if tipo not in {"categorias", "temas"}:
        return resposta("Tipo de taxonomia invalido.", 400)

    garantir_sprint_schema()
    tabela = "CATEGORIAS_CURSO" if tipo == "categorias" else "TEMAS_CURSO"
    coluna = "ID_CATEGORIA" if tipo == "categorias" else "ID_TEMA"
    con = get_db()
    cursor = con.cursor()

    try:
        if request.method == "GET":
            cursor.execute(f"SELECT {coluna}, NOME FROM {tabela} ORDER BY NOME")
            return jsonify([{"id": row[0], "nome": row[1]} for row in cursor.fetchall()])

        negado = exigir_tipo(1, 0)
        if negado:
            return negado

        nome = (request.get_json() or {}).get("nome") or ""
        nome = nome.strip()
        normalizado = normalizar_taxonomia(nome)

        if not normalizado:
            return resposta("Nome e obrigatorio.", 400)

        cursor.execute(f"SELECT {coluna}, NOME FROM {tabela} WHERE NOME_NORMALIZADO = ?", (normalizado,))
        existente = cursor.fetchone()
        if existente:
            return resposta(f"{tipo[:-1].capitalize()} ja existe: {existente[1]}", 409, id=existente[0], nome=existente[1])

        novo_id = proximo_id(cursor, tabela, coluna)
        cursor.execute(
            f"INSERT INTO {tabela} ({coluna}, NOME, NOME_NORMALIZADO) VALUES (?, ?, ?)",
            (novo_id, nome, normalizado),
        )
        con.commit()
        return resposta("Taxonomia cadastrada.", 201, "sucesso", id=novo_id, nome=nome)
    except Exception as erro:
        con.rollback()
        return resposta(f"Erro ao processar taxonomia: {erro}", 500)
    finally:
        cursor.close()
        con.close()


@app.route("/professor/cursos/<int:id_curso>/taxonomia", methods=["GET", "PUT"])
@jwt_required()
def taxonomia_curso_professor(id_curso):
    negado = exigir_tipo(1)
    if negado:
        return negado

    garantir_sprint_schema()
    con = get_db()
    cursor = con.cursor()

    try:
        if not _curso_do_professor(cursor, id_curso, int(get_jwt_identity())):
            return resposta("Curso nao encontrado para este instrutor.", 404)

        if request.method == "GET":
            cursor.execute(
                """
                SELECT CT.ID_CATEGORIA, CAT.NOME, CT.ID_TEMA, T.NOME
                FROM CURSO_TAXONOMIA CT
                LEFT JOIN CATEGORIAS_CURSO CAT ON CAT.ID_CATEGORIA = CT.ID_CATEGORIA
                LEFT JOIN TEMAS_CURSO T ON T.ID_TEMA = CT.ID_TEMA
                WHERE CT.ID_CURSO = ?
                """,
                (id_curso,),
            )
            row = cursor.fetchone()
            return jsonify({
                "id_curso": id_curso,
                "id_categoria": row[0] if row else None,
                "categoria": row[1] if row else "",
                "id_tema": row[2] if row else None,
                "tema": row[3] if row else "",
            })

        dados = request.get_json() or {}
        id_categoria = dados.get("id_categoria")
        id_tema = dados.get("id_tema")
        cursor.execute(
            """
            UPDATE OR INSERT INTO CURSO_TAXONOMIA (ID_CURSO, ID_CATEGORIA, ID_TEMA)
            VALUES (?, ?, ?)
            MATCHING (ID_CURSO)
            """,
            (id_curso, id_categoria, id_tema),
        )
        con.commit()
        return resposta("Taxonomia do curso atualizada.", 200, "sucesso")
    except Exception as erro:
        con.rollback()
        return resposta(f"Erro ao atualizar taxonomia do curso: {erro}", 500)
    finally:
        cursor.close()
        con.close()


# Sprint item 19: valida matrícula e autoria, registra mensagens e retorna identidade visual de cada remetente.
@app.route("/chat/cursos/<int:id_curso>/mensagens", methods=["GET", "POST"])
@jwt_required()
def chat_mensagens(id_curso):
    garantir_sprint_schema()
    tipo = int(get_jwt().get("tipo", -1))
    id_usuario = int(get_jwt_identity())
    con = get_db()
    cursor = con.cursor()

    try:
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
            id_aluno = int((request.args.get("id_aluno") or (request.get_json(silent=True) or {}).get("id_aluno") or 0))
            if not id_aluno or not _aluno_matriculado(cursor, id_curso, id_aluno):
                return resposta("Informe um aluno matriculado para a conversa.", 400)
        else:
            return resposta("Chat disponivel apenas para alunos e instrutores.", 403)

        if request.method == "GET":
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


# Sprint item 20: cria ou atualiza o rascunho da prova e publica questões objetivas e dissertativas.
@app.route("/professor/cursos/<int:id_curso>/prova", methods=["GET", "POST"])
@jwt_required()
def prova_professor(id_curso):
    negado = exigir_tipo(1)
    if negado:
        return negado

    garantir_sprint_schema()
    con = get_db()
    cursor = con.cursor()

    try:
        if not _curso_do_professor(cursor, id_curso, int(get_jwt_identity())):
            return resposta("Curso nao encontrado para este instrutor.", 404)

        if request.method == "GET":
            cursor.execute(
                """
                SELECT FIRST 1 ID_PROVA, TITULO, PUBLICADA
                FROM PROVAS_CURSO
                WHERE ID_CURSO = ?
                ORDER BY ID_PROVA DESC
                """,
                (id_curso,),
            )
            prova = cursor.fetchone()
            if not prova:
                return jsonify({"prova": None, "questoes": []})

            cursor.execute(
                """
                SELECT ID_QUESTAO, ENUNCIADO, TIPO, ALTERNATIVAS, RESPOSTA_ESPERADA
                FROM QUESTOES_PROVA
                WHERE ID_PROVA = ?
                ORDER BY ID_QUESTAO
                """,
                (prova[0],),
            )
            return jsonify({
                "prova": {
                    "id": prova[0],
                    "titulo": prova[1],
                    "publicada": prova[2] == 1,
                },
                "questoes": [
                    {
                        "id": row[0],
                        "enunciado": de_blob_texto(row[1]),
                        "tipo": row[2],
                        "alternativas": _decodificar_alternativas(row[3]),
                        "resposta_esperada": de_blob_texto(row[4]),
                    }
                    for row in cursor.fetchall()
                ],
            })

        dados = request.get_json() or {}
        titulo = (dados.get("titulo") or "").strip()
        questoes = dados.get("questoes") or []

        if not titulo:
            return resposta("Titulo da prova e obrigatorio.", 400)

        if not isinstance(questoes, list) or len(questoes) == 0:
            return resposta("Cadastre ao menos uma questao.", 400)

        questoes_validadas = []
        for questao in questoes:
            enunciado = (questao.get("enunciado") or "").strip()
            tipo = (questao.get("tipo") or "objetiva").strip().lower()
            alternativas = questao.get("alternativas") or ""
            resposta_esperada = questao.get("resposta_esperada") or ""

            if not enunciado or tipo not in {"objetiva", "dissertativa"}:
                return resposta("Questao invalida.", 400)

            if tipo == "objetiva":
                if isinstance(alternativas, str):
                    alternativas = [opcao.strip() for opcao in alternativas.splitlines() if opcao.strip()]
                if not isinstance(alternativas, list) or len(alternativas) < 2:
                    return resposta("Cada questao objetiva precisa ter ao menos duas alternativas.", 400)
                alternativas = [str(opcao).strip() for opcao in alternativas if str(opcao).strip()]
                if len(alternativas) < 2:
                    return resposta("Cada questao objetiva precisa ter ao menos duas alternativas.", 400)
            else:
                alternativas = []
            questoes_validadas.append((enunciado, tipo, alternativas, str(resposta_esperada).strip()))

        cursor.execute("SELECT FIRST 1 ID_PROVA, PUBLICADA FROM PROVAS_CURSO WHERE ID_CURSO = ? ORDER BY ID_PROVA DESC", (id_curso,))
        prova_existente = cursor.fetchone()
        if prova_existente and int(prova_existente[1] or 0) == 1:
            return resposta("A prova publicada nao pode ser alterada.", 409)

        if prova_existente:
            id_prova = prova_existente[0]
            cursor.execute("UPDATE PROVAS_CURSO SET TITULO = ? WHERE ID_PROVA = ?", (titulo, id_prova))
            cursor.execute("DELETE FROM QUESTOES_PROVA WHERE ID_PROVA = ?", (id_prova,))
        else:
            id_prova = proximo_id(cursor, "PROVAS_CURSO", "ID_PROVA")
            cursor.execute(
                "INSERT INTO PROVAS_CURSO (ID_PROVA, ID_CURSO, TITULO, PUBLICADA) VALUES (?, ?, ?, 0)",
                (id_prova, id_curso, titulo),
            )

        for enunciado, tipo, alternativas, resposta_esperada in questoes_validadas:

            cursor.execute(
                """
                INSERT INTO QUESTOES_PROVA (
                    ID_QUESTAO, ID_PROVA, ENUNCIADO, TIPO, ALTERNATIVAS, RESPOSTA_ESPERADA
                )
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (
                    proximo_id(cursor, "QUESTOES_PROVA", "ID_QUESTAO"),
                    id_prova,
                    para_blob_texto(enunciado),
                    tipo,
                    para_blob_texto(json.dumps(alternativas, ensure_ascii=False)),
                    para_blob_texto(resposta_esperada),
                ),
            )

        con.commit()
        return resposta("Prova cadastrada como rascunho.", 201, "sucesso", id_prova=id_prova)
    except Exception as erro:
        con.rollback()
        return resposta(f"Erro ao processar prova: {erro}", 500)
    finally:
        cursor.close()
        con.close()


@app.route("/professor/provas/<int:id_prova>/publicar", methods=["PATCH"])
@jwt_required()
def publicar_prova(id_prova):
    negado = exigir_tipo(1)
    if negado:
        return negado

    garantir_sprint_schema()
    con = get_db()
    cursor = con.cursor()

    try:
        cursor.execute(
            """
            SELECT P.ID_CURSO
            FROM PROVAS_CURSO P
            JOIN PROFESSORES_CURSO PC ON PC.ID_CURSO = P.ID_CURSO
            WHERE P.ID_PROVA = ? AND PC.ID_USUARIO = ?
            """,
            (id_prova, get_jwt_identity()),
        )
        if not cursor.fetchone():
            return resposta("Prova nao encontrada para este instrutor.", 404)

        cursor.execute("SELECT COUNT(*) FROM QUESTOES_PROVA WHERE ID_PROVA = ?", (id_prova,))
        if int((cursor.fetchone() or (0,))[0] or 0) == 0:
            return resposta("Cadastre questoes antes de publicar a prova.", 400)

        cursor.execute("UPDATE PROVAS_CURSO SET PUBLICADA = 1 WHERE ID_PROVA = ?", (id_prova,))
        con.commit()
        return resposta("Prova publicada com sucesso.", 200, "sucesso")
    except Exception as erro:
        con.rollback()
        return resposta(f"Erro ao publicar prova: {erro}", 500)
    finally:
        cursor.close()
        con.close()


# Sprint item 20: libera a avaliação após a conclusão e bloqueia reenvio até um dia após uma reprovação.
@app.route("/aluno/cursos/<int:id_curso>/prova", methods=["GET", "POST"])
@jwt_required()
def prova_aluno(id_curso):
    negado = exigir_tipo(2)
    if negado:
        return negado

    garantir_sprint_schema()
    id_aluno = int(get_jwt_identity())
    con = get_db()
    cursor = con.cursor()

    try:
        if not _aluno_matriculado(cursor, id_curso, id_aluno):
            return resposta("Aluno sem matricula ativa neste curso.", 403)

        bloqueio = _bloqueio_assinatura_aluno(cursor, id_aluno)
        if bloqueio:
            return bloqueio

        cursor.execute(
            """
            SELECT PROGRESSO
            FROM MATRICULAS
            WHERE ID_CURSO = ? AND ID_USUARIO = ?
            """,
            (id_curso, id_aluno),
        )
        if int((cursor.fetchone() or (0,))[0] or 0) < 100:
            return resposta("Prova liberada somente apos concluir as aulas.", 403)

        cursor.execute(
            """
            SELECT FIRST 1 ID_PROVA, TITULO
            FROM PROVAS_CURSO
            WHERE ID_CURSO = ? AND PUBLICADA = 1
            ORDER BY ID_PROVA DESC
            """,
            (id_curso,),
        )
        prova = cursor.fetchone()
        if not prova:
            return resposta("Curso ainda nao possui prova publicada.", 403)

        if request.method == "GET":
            cursor.execute(
                """
                SELECT FIRST 1 STATUS, FEEDBACK, CRIADO_EM, CORRIGIDO_EM, RESPOSTAS
                FROM RESPOSTAS_PROVA
                WHERE ID_PROVA = ? AND ID_USUARIO = ?
                ORDER BY ID_RESPOSTA DESC
                """,
                (prova[0], id_aluno),
            )
            envio = cursor.fetchone()
            data_reprovacao = (envio[3] or envio[2]) if envio and int(envio[0] or 0) == 2 else None
            reaplicar_em = data_reprovacao + timedelta(days=1) if data_reprovacao else None
            cursor.execute(
                """
                SELECT ID_QUESTAO, ENUNCIADO, TIPO, ALTERNATIVAS
                FROM QUESTOES_PROVA
                WHERE ID_PROVA = ?
                ORDER BY ID_QUESTAO
                """,
                (prova[0],),
            )
            return jsonify({
                "prova": {
                    "id": prova[0],
                    "titulo": prova[1],
                },
                "envio": {
                    "status": envio[0],
                    "feedback": de_blob_texto(envio[1]),
                    "criado_em": envio[2].isoformat() if envio and envio[2] else None,
                    "corrigido_em": envio[3].isoformat() if envio and envio[3] else None,
                    "pode_tentar_em": reaplicar_em.isoformat() if reaplicar_em else None,
                    "respostas": _decodificar_respostas_prova(envio[4]) if envio else None,
                } if envio else None,
                "questoes": [
                    {
                        "id": row[0],
                        "enunciado": de_blob_texto(row[1]),
                        "tipo": row[2],
                        "alternativas": _decodificar_alternativas(row[3]),
                    }
                    for row in cursor.fetchall()
                ],
            })

        dados = request.get_json() or {}
        respostas = dados.get("respostas")
        if not isinstance(respostas, dict) or not respostas:
            return resposta("Envie as respostas da prova.", 400)

        cursor.execute(
            "SELECT FIRST 1 STATUS, CORRIGIDO_EM FROM RESPOSTAS_PROVA WHERE ID_PROVA = ? AND ID_USUARIO = ? ORDER BY ID_RESPOSTA DESC",
            (prova[0], id_aluno),
        )
        envio_anterior = cursor.fetchone()
        if envio_anterior:
            if int(envio_anterior[0] or 0) == 0:
                return resposta("Sua prova ainda aguarda correcao do instrutor.", 409)
            if int(envio_anterior[0] or 0) == 1:
                return resposta("Esta prova ja foi aprovada.", 409)
            pode_tentar_em = envio_anterior[1] + timedelta(days=1) if envio_anterior[1] else datetime.now() + timedelta(days=1)
            if datetime.now() < pode_tentar_em:
                return resposta("Voce podera refazer a prova apos 1 dia da reprovacao.", 429, pode_tentar_em=pode_tentar_em.isoformat())

        cursor.execute("SELECT ID_QUESTAO, TIPO, ALTERNATIVAS FROM QUESTOES_PROVA WHERE ID_PROVA = ?", (prova[0],))
        questoes_da_prova = cursor.fetchall()
        chaves_questoes = {str(row[0]) for row in questoes_da_prova}
        if set(respostas) != chaves_questoes or any(not str(valor).strip() for valor in respostas.values()):
            return resposta("Responda todas as questoes antes de enviar.", 400)
        for id_questao, tipo_questao, alternativas_salvas in questoes_da_prova:
            if tipo_questao != "objetiva":
                continue
            try:
                alternativas = json.loads(de_blob_texto(alternativas_salvas) or "[]")
            except (TypeError, ValueError):
                alternativas = [item.strip() for item in de_blob_texto(alternativas_salvas).splitlines() if item.strip()]
            if str(respostas.get(str(id_questao))) not in [str(opcao) for opcao in alternativas]:
                return resposta("Selecione uma alternativa valida para cada questao objetiva.", 400)

        cursor.execute(
            """
            INSERT INTO RESPOSTAS_PROVA (ID_RESPOSTA, ID_PROVA, ID_USUARIO, RESPOSTAS, STATUS)
            VALUES (?, ?, ?, ?, 0)
            """,
            (
                proximo_id(cursor, "RESPOSTAS_PROVA", "ID_RESPOSTA"),
                prova[0],
                id_aluno,
                para_blob_texto(json.dumps(respostas, ensure_ascii=False)),
            ),
        )
        con.commit()
        return resposta("Prova enviada para correcao.", 201, "sucesso")
    except Exception as erro:
        con.rollback()
        return resposta(f"Erro ao processar prova do aluno: {erro}", 500)
    finally:
        cursor.close()
        con.close()


# Sprint item 20: entrega ao instrutor as respostas dos alunos com as perguntas correspondentes para correção manual.
@app.route("/professor/provas/respostas", methods=["GET"])
@jwt_required()
def respostas_prova_professor():
    negado = exigir_tipo(1)
    if negado:
        return negado

    garantir_sprint_schema()
    con = get_db()
    cursor = con.cursor()

    try:
        cursor.execute(
            """
            SELECT FIRST 200
                R.ID_RESPOSTA, P.ID_PROVA, P.ID_CURSO, P.TITULO, C.TITULO, U.NOME, U.EMAIL,
                R.RESPOSTAS, R.STATUS, R.FEEDBACK, R.CRIADO_EM, R.ID_USUARIO
            FROM RESPOSTAS_PROVA R
            JOIN PROVAS_CURSO P ON P.ID_PROVA = R.ID_PROVA
            JOIN CURSOS C ON C.ID_CURSO = P.ID_CURSO
            JOIN USUARIOS U ON U.ID_USUARIO = R.ID_USUARIO
            JOIN PROFESSORES_CURSO PC ON PC.ID_CURSO = P.ID_CURSO
            WHERE PC.ID_USUARIO = ?
            ORDER BY R.ID_RESPOSTA DESC
            """,
            (get_jwt_identity(),),
        )
        envios = cursor.fetchall()
        questoes_por_prova = {}
        for envio in envios:
            if envio[1] in questoes_por_prova:
                continue
            cursor.execute("SELECT ID_QUESTAO, ENUNCIADO, TIPO FROM QUESTOES_PROVA WHERE ID_PROVA = ? ORDER BY ID_QUESTAO", (envio[1],))
            questoes_por_prova[envio[1]] = [
                {"id": q[0], "enunciado": de_blob_texto(q[1]), "tipo": q[2]}
                for q in cursor.fetchall()
            ]

        return jsonify([
            {
                "id": row[0],
                "id_prova": row[1],
                "id_curso": row[2],
                "prova": row[3],
                "curso": row[4],
                "aluno": row[5],
                "email": row[6],
                "respostas": _decodificar_respostas_prova(row[7]),
                "status": row[8],
                "feedback": de_blob_texto(row[9]),
                "criado_em": row[10].isoformat() if row[10] else None,
                "id_aluno": row[11],
                "questoes": questoes_por_prova.get(row[1], []),
            }
            for row in envios
        ])
    except Exception as erro:
        return resposta(f"Erro ao listar respostas: {erro}", 500)
    finally:
        cursor.close()
        con.close()


# Sprint item 20: salva aprovação/reprovação e dispara o aviso de e-mail ao aluno reprovado.
@app.route("/professor/provas/respostas/<int:id_resposta>", methods=["PATCH"])
@jwt_required()
def corrigir_resposta_prova(id_resposta):
    negado = exigir_tipo(1)
    if negado:
        return negado

    garantir_sprint_schema()
    dados = request.get_json() or {}
    if not isinstance(dados.get("aprovado"), bool):
        return resposta("Informe se a prova foi aprovada ou reprovada.", 400)
    aprovado = bool(dados.get("aprovado"))
    feedback = (dados.get("feedback") or "").strip()
    con = get_db()
    cursor = con.cursor()

    try:
        cursor.execute(
            """
            SELECT U.EMAIL, C.TITULO, R.STATUS
            FROM RESPOSTAS_PROVA R
            JOIN PROVAS_CURSO P ON P.ID_PROVA = R.ID_PROVA
            JOIN CURSOS C ON C.ID_CURSO = P.ID_CURSO
            JOIN USUARIOS U ON U.ID_USUARIO = R.ID_USUARIO
            JOIN PROFESSORES_CURSO PC ON PC.ID_CURSO = P.ID_CURSO
            WHERE R.ID_RESPOSTA = ? AND PC.ID_USUARIO = ?
            """,
            (id_resposta, get_jwt_identity()),
        )
        aluno_e_curso = cursor.fetchone()
        if not aluno_e_curso:
            return resposta("Resposta nao encontrada para este instrutor.", 404)
        if int(aluno_e_curso[2] or 0) != 0:
            return resposta("Esta resposta ja foi corrigida.", 409)

        cursor.execute(
            """
            UPDATE RESPOSTAS_PROVA
            SET STATUS = ?, FEEDBACK = ?, CORRIGIDO_EM = CURRENT_TIMESTAMP
            WHERE ID_RESPOSTA = ?
            """,
            (1 if aprovado else 2, para_blob_texto(feedback), id_resposta),
        )
        con.commit()
        if not aprovado and aluno_e_curso[0]:
            from email_cursos import notificar_reprovacao_prova
            notificar_reprovacao_prova(aluno_e_curso[0], aluno_e_curso[1], feedback)
        return resposta("Correcao registrada.", 200, "sucesso")
    except Exception as erro:
        con.rollback()
        return resposta(f"Erro ao corrigir prova: {erro}", 500)
    finally:
        cursor.close()
        con.close()


@app.route("/aluno/cursos/<int:id_curso>/certificado", methods=["GET"])
@jwt_required()
def certificado_aluno(id_curso):
    negado = exigir_tipo(2)
    if negado:
        return negado

    garantir_sprint_schema()
    con = get_db()
    cursor = con.cursor()

    try:
        bloqueio = _bloqueio_assinatura_aluno(cursor, int(get_jwt_identity()))
        if bloqueio:
            return bloqueio

        cursor.execute(
            """
            SELECT U.NOME, C.TITULO, M.PROGRESSO
            FROM MATRICULAS M
            JOIN USUARIOS U ON U.ID_USUARIO = M.ID_USUARIO
            JOIN CURSOS C ON C.ID_CURSO = M.ID_CURSO
            WHERE M.ID_CURSO = ? AND M.ID_USUARIO = ? AND M.STATUS_MATRICULA = 1
            """,
            (id_curso, get_jwt_identity()),
        )
        row = cursor.fetchone()
        if not row or int(row[2] or 0) < 100:
            return resposta("Certificado liberado somente apos concluir o curso.", 403)

        # Sprint item 5: confirma que todas as aulas publicadas foram marcadas como concluidas.
        cursor.execute(
            """
            SELECT COUNT(V.ID_VIDEO), COUNT(PA.ID_VIDEO), MAX(PA.ASSISTIDO_EM)
            FROM VIDEOS V
            LEFT JOIN PROGRESSO_AULAS PA
              ON PA.ID_VIDEO = V.ID_VIDEO AND PA.ID_USUARIO = ?
            WHERE V.ID_CURSO = ? AND V.EXCLUIDO = 0 AND V.STATUS = 1
            """,
            (get_jwt_identity(), id_curso),
        )
        total_aulas, aulas_concluidas, concluido_em = cursor.fetchone() or (0, 0, None)
        if not total_aulas or aulas_concluidas != total_aulas:
            return resposta("Certificado liberado somente apos concluir todas as aulas do curso.", 403)

        # Sprint item 20: exige uma submissão aprovada na prova final antes de emitir ou baixar o PDF.
        cursor.execute(
            """
            SELECT FIRST 1 P.ID_PROVA, R.STATUS, R.FEEDBACK
            FROM PROVAS_CURSO P
            LEFT JOIN RESPOSTAS_PROVA R
              ON R.ID_PROVA = P.ID_PROVA AND R.ID_USUARIO = ?
            WHERE P.ID_CURSO = ? AND P.PUBLICADA = 1
            ORDER BY P.ID_PROVA DESC, R.ID_RESPOSTA DESC
            """,
            (get_jwt_identity(), id_curso),
        )
        prova = cursor.fetchone()
        if not prova:
            return resposta("Certificado bloqueado: curso sem prova publicada.", 403)

        if int(prova[1] or 0) == 0:
            return resposta("Certificado bloqueado: prova aguardando correcao.", 403)

        if int(prova[1] or 0) != 1:
            feedback = de_blob_texto(prova[2])
            detalhe = f" Feedback: {feedback}" if feedback else ""
            return resposta(f"Certificado bloqueado: aluno reprovado na prova. Tente novamente apos 1 dia.{detalhe}", 403)

        cursor.execute(
            """
            SELECT FIRST 1 CODIGO, CRIADO_EM
            FROM CERTIFICADOS
            WHERE ID_CURSO = ? AND ID_USUARIO = ?
            ORDER BY ID_CERTIFICADO
            """,
            (id_curso, get_jwt_identity()),
        )
        certificado = cursor.fetchone()
        if not certificado:
            # Sprint item 5: reutiliza sempre o mesmo código para cada certificado emitido.
            codigo = f"CURSANDO-{secrets.token_hex(6).upper()}"
            cursor.execute(
                """
                UPDATE OR INSERT INTO CERTIFICADOS (ID_CERTIFICADO, ID_CURSO, ID_USUARIO, CODIGO)
                VALUES (?, ?, ?, ?)
                MATCHING (ID_CURSO, ID_USUARIO)
                """,
                (proximo_id(cursor, "CERTIFICADOS", "ID_CERTIFICADO"), id_curso, get_jwt_identity(), codigo),
            )
            con.commit()
            cursor.execute(
                """
                SELECT FIRST 1 CODIGO, CRIADO_EM
                FROM CERTIFICADOS
                WHERE ID_CURSO = ? AND ID_USUARIO = ?
                ORDER BY ID_CERTIFICADO
                """,
                (id_curso, get_jwt_identity()),
            )
            certificado = cursor.fetchone()

        codigo = certificado[0]
        emitido_em = certificado[1] or datetime.now()
        cursor.execute(
            """
            SELECT FIRST 1 U.NOME
            FROM PROFESSORES_CURSO PC
            JOIN USUARIOS U ON U.ID_USUARIO = PC.ID_USUARIO
            WHERE PC.ID_CURSO = ?
            ORDER BY U.NOME
            """,
            (id_curso,),
        )
        professor = (cursor.fetchone() or ("Instrutor(a) do curso",))[0]
        concluido_em = concluido_em or emitido_em
        url_verificacao = request.url_root.rstrip("/") + f"/certificados/{codigo}/verificar"

        # Sprint item 5: o PDF reúne aluno, curso, aprovação, instrutor, datas e código verificável.
        pdf = _pdf_certificado({
            "aluno": row[0],
            "curso": row[1],
            "professor": professor,
            "aulas_concluidas": total_aulas,
            "data_conclusao": _data_certificado(concluido_em),
            "data_emissao": _data_certificado(emitido_em),
            "codigo": codigo,
            "url_verificacao": url_verificacao,
        })
        return Response(
            pdf,
            mimetype="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename=certificado-{id_curso}.pdf",
                "Cache-Control": "private, no-store",
            },
        )
    except Exception as erro:
        con.rollback()
        return resposta(f"Erro ao gerar certificado: {erro}", 500)
    finally:
        cursor.close()
        con.close()


@app.route("/professor/cursos/<int:id_curso>/modulos/<int:id_modulo>", methods=["PUT"])
@jwt_required()
def editar_modulo_professor(id_curso, id_modulo):
    negado = exigir_tipo(1)
    if negado:
        return negado

    garantir_sprint_schema()
    dados = request.form if request.form else (request.get_json() or {})
    titulo = (dados.get("titulo") or "").strip()
    descricao = (dados.get("descricao") or "").strip()
    try:
        ordem = int(dados.get("ordem") or 0)
        imagem = salvar_upload(request.files.get("imagem"), "modulos", {"jpg", "jpeg", "png", "webp"})
    except (TypeError, ValueError) as erro:
        return resposta(str(erro) or "Ordem do modulo invalida.", 400)

    if not titulo:
        return resposta("Titulo do modulo e obrigatorio.", 400)

    con = get_db()
    cursor = con.cursor()
    try:
        campos = "TITULO = ?, DESCRICAO = ?, ORDEM = ?, ATUALIZADO_EM = CURRENT_TIMESTAMP"
        parametros = [titulo, para_blob_texto(descricao), ordem]
        if imagem:
            campos += ", IMAGEM_URL = ?"
            parametros.append(imagem["url"])
        parametros.extend([id_modulo, id_curso, get_jwt_identity()])
        cursor.execute(
            f"""
            UPDATE MODULOS_CURSO M SET {campos}
            WHERE M.ID_MODULO = ? AND M.ID_CURSO = ?
              AND EXISTS (
                  SELECT 1 FROM PROFESSORES_CURSO PC
                  WHERE PC.ID_CURSO = M.ID_CURSO AND PC.ID_USUARIO = ?
              )
            """,
            tuple(parametros),
        )
        if cursor.rowcount == 0:
            return resposta("Modulo nao encontrado.", 404)
        con.commit()
        # Sprint item 6: permite atualizar dados e imagem de um modulo.
        return resposta("Modulo atualizado com sucesso.", 200, "sucesso")
    except Exception as erro:
        con.rollback()
        return resposta(f"Erro ao atualizar modulo: {erro}", 500)
    finally:
        cursor.close()
        con.close()


@app.route("/certificados/<string:codigo>/verificar", methods=["GET"])
def verificar_certificado(codigo):
    # Sprint item 5: permite conferir publicamente se o código do PDF foi emitido pelo Cursando.
    garantir_sprint_schema()
    con = get_db()
    cursor = con.cursor()
    try:
        cursor.execute(
            """
            SELECT FIRST 1 C.CODIGO, U.NOME, CUR.TITULO, C.CRIADO_EM
            FROM CERTIFICADOS C
            JOIN USUARIOS U ON U.ID_USUARIO = C.ID_USUARIO
            JOIN CURSOS CUR ON CUR.ID_CURSO = C.ID_CURSO
            WHERE C.CODIGO = ?
            """,
            (codigo,),
        )
        certificado = cursor.fetchone()
        if not certificado:
            return resposta("Código de certificado não encontrado.", 404)

        cursor.execute(
            """
            SELECT FIRST 1 U.NOME
            FROM PROFESSORES_CURSO PC
            JOIN USUARIOS U ON U.ID_USUARIO = PC.ID_USUARIO
            JOIN CERTIFICADOS C ON C.ID_CURSO = PC.ID_CURSO
            WHERE C.CODIGO = ?
            ORDER BY U.NOME
            """,
            (codigo,),
        )
        professor = (cursor.fetchone() or ("Instrutor(a) do curso",))[0]
        emitido_em = certificado[3]
        return jsonify({
            "valido": True,
            "certificado": {
                "codigo": certificado[0],
                "aluno": certificado[1],
                "curso": certificado[2],
                "professor": professor,
                "emitido_em": emitido_em.isoformat() if hasattr(emitido_em, "isoformat") else str(emitido_em or ""),
            },
        })
    except Exception as erro:
        return resposta(f"Erro ao verificar certificado: {erro}", 500)
    finally:
        cursor.close()
        con.close()


@app.route("/admin/logs", methods=["GET"])
@jwt_required()
def logs_admin():
    negado = exigir_tipo(0)
    if negado:
        return negado

    garantir_sprint_schema()
    termo = (request.args.get("busca") or "").lower().strip()
    tipo = request.args.get("tipo")
    acao = (request.args.get("acao") or "").strip()
    id_usuario_filtro = request.args.get("id_usuario")
    inicio = request.args.get("inicio")
    fim = request.args.get("fim")
    con = get_db()
    cursor = con.cursor()

    try:
        filtros = []
        params = []
        if termo:
            filtros.append("(LOWER(NOME) LIKE ? OR LOWER(EMAIL) LIKE ? OR LOWER(ACAO) LIKE ? OR LOWER(DETALHES) LIKE ?)")
            params.extend([f"%{termo}%", f"%{termo}%", f"%{termo}%", f"%{termo}%"])
        if tipo not in (None, ""):
            filtros.append("TIPO_USUARIO = ?")
            params.append(int(tipo))
        if acao:
            filtros.append("ACAO = ?")
            params.append(acao)
        if id_usuario_filtro:
            filtros.append("ID_USUARIO = ?")
            params.append(int(id_usuario_filtro))
        if inicio:
            filtros.append("CAST(CRIADO_EM AS DATE) >= ?")
            params.append(inicio)
        if fim:
            filtros.append("CAST(CRIADO_EM AS DATE) <= ?")
            params.append(fim)
        where = f"WHERE {' AND '.join(filtros)}" if filtros else ""
        cursor.execute(
            f"""
            SELECT FIRST 200 ID_LOG, ID_USUARIO, TIPO_USUARIO, NOME, EMAIL, ACAO, ROTA, METODO, DETALHES, CRIADO_EM
            FROM LOG_ACOES
            {where}
            ORDER BY ID_LOG DESC
            """,
            tuple(params),
        )
        return jsonify([
            {
                "id": row[0],
                "id_usuario": row[1],
                "tipo_usuario": row[2],
                "nome": row[3],
                "email": row[4],
                "acao": row[5],
                "rota": row[6],
                "metodo": row[7],
                "detalhes": de_blob_texto(row[8]),
                "resumo": _resumo_detalhes_log(de_blob_texto(row[8])),
                "criado_em": row[9].isoformat() if row[9] else None,
            }
            for row in cursor.fetchall()
        ])
    except Exception as erro:
        return resposta(f"Erro ao listar logs: {erro}", 500)
    finally:
        cursor.close()
        con.close()


@app.route("/financeiro/resumo", methods=["GET"])
@jwt_required()
def financeiro_resumo():
    garantir_sprint_schema()
    tipo = int(get_jwt().get("tipo", -1))
    id_usuario = get_jwt_identity()
    con = get_db()
    cursor = con.cursor()

    try:
        valor_assinatura = valor_assinatura_config()
        percentual = percentual_instrutores(cursor)
        cursor.execute("SELECT COUNT(*) FROM ASSINATURAS WHERE STATUS = 1")
        assinaturas_ativas = int((cursor.fetchone() or (0,))[0] or 0)
        cursor.execute("SELECT COALESCE(CAST(SUM(VALOR) AS DOUBLE PRECISION), 0) FROM ASSINATURAS WHERE STATUS = 1")
        total_arrecadado = float((cursor.fetchone() or (0,))[0] or 0)
        # Sprint item 15: reparte o total de mensalidades efetivamente pagas pelo percentual do pool e pelo peso das aulas assistidas.
        pool_instrutores = total_arrecadado * (percentual / 100)
        pesos_instrutores = pesos_pool_instrutores(cursor)
        peso_total = sum(pesos_instrutores.values())

        if tipo == 1:
            cursor.execute(
                """
                SELECT COUNT(DISTINCT M.ID_USUARIO)
                FROM MATRICULAS M
                JOIN PROFESSORES_CURSO PC ON PC.ID_CURSO = M.ID_CURSO
                WHERE PC.ID_USUARIO = ? AND M.STATUS_MATRICULA = 1
                """,
                (id_usuario,),
            )
            alunos = int((cursor.fetchone() or (0,))[0] or 0)
            peso_instrutor, estimado, sacado, disponivel_saque = calcular_saldo_saque(
                cursor,
                id_usuario,
                pool_instrutores,
                pesos_instrutores,
                peso_total,
            )
            valor_por_view = (pool_instrutores / peso_total) if peso_total else 0
            cursor.execute(
                """
                SELECT
                    C.ID_CURSO,
                    C.TITULO,
                    COUNT(DISTINCT CAST(PA.ID_USUARIO AS VARCHAR(20)) || '-' || CAST(PA.ID_VIDEO AS VARCHAR(20))),
                    COUNT(DISTINCT M.ID_USUARIO)
                FROM CURSOS C
                JOIN PROFESSORES_CURSO PC ON PC.ID_CURSO = C.ID_CURSO
                LEFT JOIN VIDEOS V ON V.ID_CURSO = C.ID_CURSO AND V.EXCLUIDO = 0 AND V.STATUS = 1
                LEFT JOIN PROGRESSO_AULAS PA ON PA.ID_VIDEO = V.ID_VIDEO
                LEFT JOIN MATRICULAS M ON M.ID_CURSO = C.ID_CURSO AND M.STATUS_MATRICULA = 1
                WHERE PC.ID_USUARIO = ? AND C.EXCLUIDO = 0
                GROUP BY C.ID_CURSO, C.TITULO
                ORDER BY COUNT(PA.ID_VIDEO) DESC, C.TITULO
                """,
                (id_usuario,),
            )
            cursos_receita = []
            for row in cursor.fetchall():
                views = int(row[2] or 0)
                cursos_receita.append({
                    "id_curso": row[0],
                    "curso": row[1],
                    "views": views,
                    "alunos": int(row[3] or 0),
                    "receita_estimativa": round(views * valor_por_view, 2),
                })
            # Sprint itens 12, 30 e 31: resumo financeiro inicial do instrutor baseado no pool de receita.
            return jsonify({
                "perfil": "instrutor",
                "recebido_estimado": round(estimado, 2),
                "disponivel_saque": disponivel_saque,
                "ja_sacado": round(sacado, 2),
                "alunos_ativos": alunos,
                "percentual_pool": round(percentual, 2),
                "peso_pool": peso_instrutor,
                "peso_total_pool": peso_total,
                "valor_por_view": round(valor_por_view, 2),
                "cursos_receita": cursos_receita,
            })

        if tipo == 0:
            cursor.execute("SELECT COALESCE(CAST(SUM(VALOR) AS DOUBLE PRECISION), 0) FROM CUSTOS_PLATAFORMA")
            custos = float((cursor.fetchone() or (0,))[0] or 0)
            cursor.execute("SELECT COUNT(*), COALESCE(CAST(SUM(VALOR) AS DOUBLE PRECISION), 0) FROM ASSINATURAS WHERE STATUS = 1")
            faturas_pagas, total_pago = cursor.fetchone() or (0, 0)
            ticket_medio = (float(total_pago or 0) / int(faturas_pagas or 0)) if int(faturas_pagas or 0) else 0
            # Sprint item 14: calcula o pool acumulado estimado usando a porcentagem definida pelo administrador.
            # Sprint item 15: reserva a comissão dos instrutores e as despesas antes de calcular o caixa sacável do administrador.
            pool_historico_instrutores = total_arrecadado * (percentual / 100)
            disponivel_saque_admin = max(total_arrecadado - pool_historico_instrutores - custos, 0)
            cursor.execute(
                "SELECT COALESCE(CAST(SUM(VALOR) AS DOUBLE PRECISION), 0) FROM SAQUES_INSTRUTOR WHERE STATUS = 1"
            )
            total_repassado = float((cursor.fetchone() or (0,))[0] or 0)
            return jsonify({
                "perfil": "admin",
                "total_arrecadado": round(total_arrecadado, 2),
                "total_repassado": round(total_repassado, 2),
                "total_repassado_estimado": round(pool_historico_instrutores, 2),
                "custos": round(custos, 2),
                "saldo_caixa": round(total_arrecadado - pool_historico_instrutores - custos, 2),
                "disponivel_saque_admin": round(disponivel_saque_admin, 2),
                "assinaturas_ativas": assinaturas_ativas,
                "faturas_pagas": int(faturas_pagas or 0),
                "percentual_instrutores": round(percentual, 2),
                "peso_total_pool": peso_total,
                "receita_media_assinatura": round(valor_assinatura, 2),
                "ticket_medio_aluno": round(ticket_medio, 2),
                # Sprint item 16: calcula a margem financeira histórica após pool de instrutores e despesas registradas.
                "margem_caixa_percentual": round(((total_arrecadado - pool_historico_instrutores - custos) / total_arrecadado) * 100, 2) if total_arrecadado else 0,
            })

        cursor.execute(
            "SELECT COUNT(*), COALESCE(CAST(SUM(VALOR) AS DOUBLE PRECISION), 0) FROM ASSINATURAS WHERE ID_USUARIO = ? AND STATUS = 1",
            (id_usuario,),
        )
        qtd, gasto = cursor.fetchone() or (0, 0)
        cursor.execute(
            "SELECT COUNT(*), COALESCE(CAST(SUM(VALOR) AS DOUBLE PRECISION), 0) FROM ASSINATURAS WHERE ID_USUARIO = ? AND STATUS <> 1",
            (id_usuario,),
        )
        abertas, aberto = cursor.fetchone() or (0, 0)
        # Sprint itens 2 e 3: resumo de gasto e faturas abertas do aluno.
        return jsonify({
            "perfil": "aluno",
            "faturas": int(qtd or 0),
            "faturas_abertas": int(abertas or 0),
            "total_gasto": float(gasto or 0),
            "total_aberto": float(aberto or 0),
        })
    except Exception as erro:
        return resposta(f"Erro ao carregar financeiro: {erro}", 500)
    finally:
        cursor.close()
        con.close()


@app.route("/admin/logs/<int:id_log>", methods=["GET"])
@jwt_required()
def detalhe_log_admin(id_log):
    negado = exigir_tipo(0)
    if negado:
        return negado

    garantir_sprint_schema()
    con = get_db()
    cursor = con.cursor()

    try:
        cursor.execute(
            """
            SELECT ID_LOG, ID_USUARIO, TIPO_USUARIO, NOME, EMAIL, ACAO, ROTA, METODO, DETALHES, CRIADO_EM
            FROM LOG_ACOES
            WHERE ID_LOG = ?
            """,
            (id_log,),
        )
        row = cursor.fetchone()
        if not row:
            return resposta("Log nao encontrado.", 404)

        return jsonify({
            "id": row[0],
            "id_usuario": row[1],
            "tipo_usuario": row[2],
            "nome": row[3],
            "email": row[4],
            "acao": row[5],
            "rota": row[6],
            "metodo": row[7],
            "detalhes": de_blob_texto(row[8]),
            "resumo": _resumo_detalhes_log(de_blob_texto(row[8])),
            "criado_em": row[9].isoformat() if row[9] else None,
        })
    except Exception as erro:
        return resposta(f"Erro ao carregar log: {erro}", 500)
    finally:
        cursor.close()
        con.close()


def _contexto_log_gravacao(cursor, tabela, id_registro, valores_antes, valores_depois):
    """Resolve nomes dos recursos relacionados ao registro auditado quando ainda existem."""
    def ler_snapshot(valor):
        try:
            return json.loads(de_blob_texto(valor) or "{}")
        except (TypeError, ValueError):
            return {}

    depois = ler_snapshot(valores_depois)
    antes = ler_snapshot(valores_antes)
    dados = depois or antes
    contexto = {}
    id_alvo = str(id_registro or "").split(":", 1)[0].strip()
    id_curso = dados.get("ID_CURSO")

    if tabela == "USUARIOS" and id_alvo.isdigit():
        cursor.execute("SELECT NOME, EMAIL, TIPO_USUARIO FROM USUARIOS WHERE ID_USUARIO = ?", (int(id_alvo),))
        usuario = cursor.fetchone()
        if usuario:
            contexto["usuario_afetado"] = {"nome": usuario[0], "email": usuario[1], "tipo": usuario[2]}

    if tabela == "CURSOS" and id_alvo.isdigit():
        id_curso = int(id_alvo)
    elif tabela == "VIDEOS" and id_alvo.isdigit():
        cursor.execute("SELECT TITULO, ID_CURSO FROM VIDEOS WHERE ID_VIDEO = ?", (int(id_alvo),))
        aula = cursor.fetchone()
        if aula:
            contexto["aula"] = aula[0]
            id_curso = aula[1]
        elif dados.get("TITULO"):
            contexto["aula"] = dados["TITULO"]

    if id_curso is not None:
        try:
            id_curso = int(id_curso)
        except (TypeError, ValueError):
            id_curso = None
    if id_curso is not None:
        cursor.execute(
            """
            SELECT C.TITULO, U.NOME, U.EMAIL
            FROM CURSOS C
            LEFT JOIN PROFESSORES_CURSO PC ON PC.ID_CURSO = C.ID_CURSO
            LEFT JOIN USUARIOS U ON U.ID_USUARIO = PC.ID_USUARIO
            WHERE C.ID_CURSO = ?
            """,
            (id_curso,),
        )
        curso = cursor.fetchone()
        if curso:
            contexto["curso"] = curso[0]
            if curso[1]:
                contexto["professor"] = {"nome": curso[1], "email": curso[2]}
    return contexto


# Sprint item 24: filtra e identifica as alteracoes de negocio feitas por cada perfil para auditoria administrativa.
@app.route("/admin/logs-gravacao", methods=["GET"])
@jwt_required()
def logs_gravacao_admin():
    negado = exigir_tipo(0)
    if negado:
        return negado

    garantir_sprint_schema()
    termo = (request.args.get("busca") or "").lower().strip()
    log_con = get_log_db()
    cursor = log_con.cursor()
    contexto_con = get_db()
    contexto_cursor = contexto_con.cursor()

    try:
        filtros = []
        params = []
        if termo:
            contexto_cursor.execute(
                "SELECT ID_USUARIO FROM USUARIOS WHERE LOWER(NOME) LIKE ? OR LOWER(EMAIL) LIKE ?",
                (f"%{termo}%", f"%{termo}%"),
            )
            ids_correspondentes = [int(row[0]) for row in contexto_cursor.fetchall()]
            busca_log = "(LOWER(LG.ACAO) LIKE ? OR LOWER(LG.TABELA_AFETADA) LIKE ? OR LOWER(LG.ID_REGISTRO) LIKE ? OR LOWER(LG.DETALHES) LIKE ?"
            params.extend([f"%{termo}%"] * 4)
            if ids_correspondentes:
                busca_log += " OR LG.ID_USUARIO IN (" + ", ".join("?" for _ in ids_correspondentes) + ")"
                params.extend(ids_correspondentes)
            filtros.append(busca_log + ")")
        tipo_usuario = request.args.get("tipo")
        if tipo_usuario not in (None, ""):
            filtros.append("LG.TIPO_USUARIO = ?")
            params.append(int(tipo_usuario))
        acao = (request.args.get("acao") or "").strip()
        if acao:
            filtros.append("LG.ACAO = ?")
            params.append(acao.upper())
        evento = (request.args.get("evento") or "").strip().lower()
        eventos = {
            "cadastro_professor": ("USUARIOS", "INSERT"),
            "cadastro_aluno": ("USUARIOS", "INSERT"),
            "alterar_usuario": ("USUARIOS", "UPDATE"),
            "criar_curso": ("CURSOS", "INSERT"),
            "editar_curso": ("CURSOS", "UPDATE"),
            "excluir_curso": ("CURSOS", "DELETE"),
            "criar_aula": ("VIDEOS", "INSERT"),
            "editar_aula": ("VIDEOS", "UPDATE"),
            "excluir_aula": ("VIDEOS", "DELETE"),
            "criar_modulo": ("MODULOS_CURSO", "INSERT"),
            "criar_material": ("MATERIAIS_CURSO", "INSERT"),
            "criar_prova": ("PROVAS_CURSO", "INSERT"),
            "corrigir_prova": ("RESPOSTAS_PROVA", "UPDATE"),
            "inscricao_curso": ("MATRICULAS", "INSERT"),
            "avaliar_curso": ("AVALIACOES_CURSO", "INSERT"),
            "enviar_prova": ("RESPOSTAS_PROVA", "INSERT"),
            "assinar": ("ASSINATURAS", "INSERT"),
            "assistir_aula": ("PROGRESSO_AULAS", "INSERT"),
            "mensagem_chat": ("MENSAGENS_CHAT", "INSERT"),
            "solicitar_saque": ("SAQUES_INSTRUTOR", "INSERT"),
            "aprovar_saque": ("SAQUES_INSTRUTOR", "UPDATE"),
            "registrar_custo": ("CUSTOS_PLATAFORMA", "INSERT"),
            "alterar_configuracao": ("FINANCEIRO_CONFIG", "UPDATE"),
        }
        if evento in eventos:
            tabela_evento, acao_evento = eventos[evento]
            filtros.extend(["LG.TABELA_AFETADA = ?", "LG.ACAO = ?"])
            params.extend([tabela_evento, acao_evento])
            if evento in {"cadastro_professor", "cadastro_aluno"}:
                tipo_alvo = "1" if evento == "cadastro_professor" else "2"
                filtros.append("CAST(LG.VALORES_DEPOIS AS VARCHAR(8191)) CONTAINING ?")
                params.append(f'"TIPO_USUARIO":"{tipo_alvo}"')
        id_usuario = request.args.get("id_usuario")
        if id_usuario:
            filtros.append("LG.ID_USUARIO = ?")
            params.append(int(id_usuario))
        inicio = request.args.get("inicio")
        if inicio:
            filtros.append("CAST(CRIADO_EM AS DATE) >= ?")
            params.append(inicio)
        fim = request.args.get("fim")
        if fim:
            filtros.append("CAST(CRIADO_EM AS DATE) <= ?")
            params.append(fim)

        where = f"WHERE {' AND '.join(filtros)}" if filtros else ""
        try:
            limite = min(max(int(request.args.get("limite", 100)), 1), 100)
        except (TypeError, ValueError):
            limite = 100
        try:
            offset = max(int(request.args.get("offset", 0)), 0)
        except (TypeError, ValueError):
            offset = 0
        cursor.execute(
            f"""
            SELECT
                LG.ID_LOG, LG.ID_USUARIO, LG.TIPO_USUARIO, LG.ACAO, LG.TABELA_AFETADA, LG.ID_REGISTRO,
                LG.ROTA, LG.METODO, LG.CAMPOS_ALTERADOS, LG.VALORES_ANTES, LG.VALORES_DEPOIS,
                LG.DETALHES, LG.IP, LG.USER_AGENT, LG.REQUEST_ID, LG.ORIGEM, LG.USUARIO_BANCO, LG.CRIADO_EM
            FROM LOG_GRAVACAO LG
            {where}
            ORDER BY LG.ID_LOG DESC
            ROWS {offset + 1} TO {offset + limite + 1}
            """,
            tuple(params),
        )
        # Sprint item 6: lista o log de gravacao salvo no banco separado para a aba administrativa.
        rows = cursor.fetchall()
        ids_atores = sorted({int(row[1]) for row in rows if row[1] is not None})
        atores = {}
        if ids_atores:
            contexto_cursor.execute(
                "SELECT ID_USUARIO, NOME, EMAIL FROM USUARIOS WHERE ID_USUARIO IN (" + ", ".join("?" for _ in ids_atores) + ")",
                tuple(ids_atores),
            )
            atores = {int(row[0]): {"nome": row[1], "email": row[2]} for row in contexto_cursor.fetchall()}
        logs = []
        for row in rows:
            ator = atores.get(int(row[1])) if row[1] is not None else None
            log = {
                "id": row[0],
                "id_usuario": row[1],
                "tipo_usuario": row[2],
                "nome": ator["nome"] if ator else None,
                "email": ator["email"] if ator else None,
                "acao": row[3],
                "tabela": row[4],
                "id_registro": row[5],
                "rota": row[6],
                "metodo": row[7],
                "campos_alterados": de_blob_texto(row[8]),
                "valores_antes": de_blob_texto(row[9]),
                "valores_depois": de_blob_texto(row[10]),
                "detalhes": de_blob_texto(row[11]),
                "resumo": _resumo_detalhes_log(de_blob_texto(row[11])),
                "ip": row[12],
                "user_agent": row[13],
                "request_id": row[14],
                "origem": row[15],
                "usuario_banco": row[16],
                "criado_em": row[17].isoformat() if row[17] else None,
            }
            log["contexto"] = _contexto_log_gravacao(contexto_cursor, row[4], row[5], row[9], row[10])
            logs.append(log)
        return jsonify(logs)
    except Exception as erro:
        return resposta(f"Erro ao listar log de gravacao: {erro}", 500)
    finally:
        cursor.close()
        log_con.close()
        contexto_cursor.close()
        contexto_con.close()


def _fatura_para_dict(row, numero=None):
    status = int(row[2] or 0)
    valor_padrao = valor_assinatura_config()
    return {
        "id": row[0],
        "numero": numero or row[0],
        "id_cobranca": row[1],
        "status": status,
        "status_label": "paga" if status == 1 else "em aberto",
        "valor": float(row[3] or valor_padrao),
        "data_inicio": row[4].isoformat() if row[4] else None,
        "data_expiracao": row[5].isoformat() if row[5] else None,
        "data_vencimento": row[6].isoformat() if row[6] else None,
        "data_pagamento": row[7].isoformat() if row[7] else None,
        "criado_em": row[8].isoformat() if row[8] else None,
        "aberta": status != 1,
    }


def aluno_tem_fatura_aberta(cursor, id_usuario):
    garantir_sprint_schema()
    agora = datetime.now()
    cursor.execute(
        """
        SELECT FIRST 1 ID_ASSINATURA
        FROM ASSINATURAS
        WHERE ID_USUARIO = ?
          AND STATUS = 1
          AND (DATA_EXPIRACAO IS NULL OR DATA_EXPIRACAO >= ?)
        ORDER BY DATA_EXPIRACAO DESC, ID_ASSINATURA DESC
        """,
        (id_usuario, agora),
    )
    if cursor.fetchone() is not None:
        return False

    cursor.execute(
        """
        SELECT FIRST 1 ID_ASSINATURA
        FROM ASSINATURAS
        WHERE ID_USUARIO = ? AND STATUS <> 1
        ORDER BY ID_ASSINATURA DESC
        """,
        (id_usuario,),
    )
    return cursor.fetchone() is not None


# Sprint item 1: gera e lista cobranças PIX de mensalidades usando a Arkhé.
@app.route("/financeiro/faturas", methods=["GET", "POST"])
@jwt_required()
def faturas_aluno():
    negado = exigir_tipo(2)
    if negado:
        return negado

    garantir_sprint_schema()
    id_usuario = get_jwt_identity()
    con = get_db()
    cursor = con.cursor()

    try:
        if request.method == "POST":
            # Sprint item 1: serializa a criacao para evitar cobrancas duplicadas em pedidos simultaneos.
            with _faturas_lock:
                dados = request.get_json(silent=True) or {}
                valor = valor_assinatura_config()
                meses = max(1, min(int(dados.get("meses") or 1), 12))
                valor_total = round(valor * meses, 2)
                cursor.execute(
                    """
                    SELECT FIRST 1 ID_ASSINATURA, ID_COBRANCA_ARKHE, VALOR
                    FROM ASSINATURAS
                    WHERE ID_USUARIO = ?
                      AND STATUS = 0
                      AND ID_COBRANCA_ARKHE IS NOT NULL
                      AND (DATA_VENCIMENTO IS NULL OR DATA_VENCIMENTO >= CURRENT_TIMESTAMP)
                    ORDER BY ID_ASSINATURA DESC
                    """,
                    (id_usuario,),
                )
                fatura_aberta = cursor.fetchone()
                if fatura_aberta:
                    id_assinatura, id_cobranca, valor_fatura = fatura_aberta
                    valor_pendente = float(valor_fatura or 0)
                    if valor_pendente > 0:
                        cobranca = consultar_cobranca_pix(id_cobranca)
                        return jsonify({
                            "id_assinatura": id_assinatura,
                            "id_cobranca": cobranca["id_cobranca"],
                            "valor": valor_pendente,
                            "codigo_pagamento": cobranca["codigo_pagamento"],
                            "status": cobranca["status"],
                            "tipo_cobranca": cobranca["tipo_cobranca"],
                            "fatura_existente": True,
                            "mensagem": "Ja existe uma mensalidade em aberto para pagamento.",
                        }), 200

                cobranca = criar_cobranca_pix(valor_total)
                agora = datetime.now()
                vencimento = agora + timedelta(days=3)
                id_assinatura = proximo_id(cursor, "ASSINATURAS", "ID_ASSINATURA")
                cursor.execute(
                    """
                    INSERT INTO ASSINATURAS (
                        ID_ASSINATURA, ID_USUARIO, PLANO, STATUS, ID_COBRANCA_ARKHE,
                        VALOR, DATA_VENCIMENTO, CRIADO_EM
                    )
                    VALUES (?, ?, 1, 0, ?, ?, ?, ?)
                    """,
                    (id_assinatura, id_usuario, cobranca["id_cobranca"], valor_total, vencimento, agora),
                )
                con.commit()
                return jsonify({
                    "id_assinatura": id_assinatura,
                    "id_cobranca": cobranca["id_cobranca"],
                    "valor": valor_total,
                    "codigo_pagamento": cobranca["codigo_pagamento"],
                    "status": cobranca["status"],
                    "tipo_cobranca": cobranca["tipo_cobranca"],
                }), 201

        cursor.execute(
            """
            SELECT ID_ASSINATURA, ID_COBRANCA_ARKHE, STATUS, VALOR, DATA_INICIO,
                   DATA_EXPIRACAO, DATA_VENCIMENTO, DATA_PAGAMENTO, CRIADO_EM
            FROM ASSINATURAS
            WHERE ID_USUARIO = ?
            ORDER BY ID_ASSINATURA ASC
            """,
            (id_usuario,),
        )
        faturas = [_fatura_para_dict(row, indice + 1) for indice, row in enumerate(cursor.fetchall())]
        faturas = list(reversed(faturas))
        faturas_abertas = [item for item in faturas if item["status"] != 1]
        faturas_pagas = [item for item in faturas if item["status"] == 1]
        # Sprint item 2: devolve total gasto, total em aberto e historico de faturas do aluno.
        total_gasto = sum(item["valor"] for item in faturas_pagas)
        total_aberto = sum(item["valor"] for item in faturas_abertas)
        return jsonify({
            "faturas": faturas,
            "faturas_abertas": faturas_abertas,
            "faturas_pagas": faturas_pagas,
            "total_gasto": round(total_gasto, 2),
            "total_aberto": round(total_aberto, 2),
            "tem_fatura_aberta": aluno_tem_fatura_aberta(cursor, id_usuario),
        })
    except ArkheError as erro:
        con.rollback()
        return resposta(f"Erro ao comunicar com a Arkhe: {erro}", 502)
    except Exception as erro:
        con.rollback()
        return resposta(f"Erro ao processar faturas: {erro}", 500)
    finally:
        cursor.close()
        con.close()


# Sprint item 1: consulta e baixa a cobrança da mensalidade antes de atualizar a assinatura.
@app.route("/financeiro/faturas/<int:id_assinatura>/verificar", methods=["POST"])
@jwt_required()
def verificar_fatura_aluno(id_assinatura):
    negado = exigir_tipo(2)
    if negado:
        return negado

    garantir_sprint_schema()
    id_usuario = get_jwt_identity()
    con = get_db()
    cursor = con.cursor()

    try:
        cursor.execute(
            """
            SELECT ID_COBRANCA_ARKHE, STATUS
            FROM ASSINATURAS
            WHERE ID_ASSINATURA = ? AND ID_USUARIO = ?
            """,
            (id_assinatura, id_usuario),
        )
        fatura = cursor.fetchone()

        if not fatura:
            return resposta("Mensalidade nao encontrada.", 404)

        id_cobranca, status = fatura
        if int(status or 0) == 1:
            return jsonify({"assinatura": True, "status": "ativa", "id_assinatura": id_assinatura}), 200

        if not id_cobranca:
            return resposta("Mensalidade aguardando codigo de cobranca.", 409)

        # Sprint item 1: confirma o status remoto sem depender do campo de cópia do Pix.
        cobranca = consultar_cobranca_pix(id_cobranca, exigir_codigo_pix=False)
        # Sprint item 1: confirma apenas o status pago informado pela Arkhé, tolerando espaços no retorno.
        if str(cobranca["status"]).strip() != "1":
            return resposta("Pagamento ainda nao confirmado.", 402, status_cobranca=cobranca["status"])

        agora = datetime.now()
        cursor.execute(
            """
            SELECT FIRST 1 DATA_EXPIRACAO
            FROM ASSINATURAS
            WHERE ID_USUARIO = ?
              AND STATUS = 1
              AND (DATA_EXPIRACAO IS NULL OR DATA_EXPIRACAO >= ?)
            ORDER BY DATA_EXPIRACAO DESC, ID_ASSINATURA DESC
            """,
            (id_usuario, agora),
        )
        assinatura_ativa = cursor.fetchone()
        data_inicio = assinatura_ativa[0] if assinatura_ativa and assinatura_ativa[0] and assinatura_ativa[0] > agora else agora
        data_expiracao = data_inicio + timedelta(days=30)

        cursor.execute(
            """
            UPDATE ASSINATURAS
            SET STATUS = 1,
                DATA_INICIO = ?,
                DATA_EXPIRACAO = ?,
                DATA_PAGAMENTO = ?,
                VALOR = COALESCE(VALOR, ?)
            WHERE ID_ASSINATURA = ? AND ID_USUARIO = ?
            """,
            (data_inicio, data_expiracao, agora, valor_assinatura_config(), id_assinatura, id_usuario),
        )
        con.commit()

        return jsonify({
            "assinatura": True,
            "status": "ativa",
            "id_assinatura": id_assinatura,
            "data_inicio": data_inicio.isoformat(),
            "data_expiracao": data_expiracao.isoformat(),
            "mensagem": {"tipo": "sucesso", "descricao": "Pagamento confirmado."},
        }), 200
    except ArkheError as erro:
        con.rollback()
        return resposta(f"Erro ao comunicar com a Arkhe: {erro}", 502)
    except Exception as erro:
        con.rollback()
        return resposta(f"Erro ao verificar pagamento: {erro}", 500)
    finally:
        cursor.close()
        con.close()


@app.route("/admin/alunos/<int:id_aluno>/financeiro", methods=["GET"])
@jwt_required()
def financeiro_aluno_admin(id_aluno):
    negado = exigir_tipo(0)
    if negado:
        return negado

    garantir_sprint_schema()
    con = get_db()
    cursor = con.cursor()

    try:
        cursor.execute("SELECT ID_USUARIO, NOME, EMAIL FROM USUARIOS WHERE ID_USUARIO = ? AND TIPO_USUARIO = 2", (id_aluno,))
        aluno = cursor.fetchone()
        if not aluno:
            return resposta("Aluno nao encontrado.", 404)

        cursor.execute("SELECT COUNT(*), COALESCE(CAST(SUM(VALOR) AS DOUBLE PRECISION), 0) FROM ASSINATURAS WHERE ID_USUARIO = ? AND STATUS = 1", (id_aluno,))
        faturas_pagas, total_pago = cursor.fetchone() or (0, 0)
        faturas_pagas = int(faturas_pagas or 0)
        total_pago = float(total_pago or 0)

        cursor.execute(
            """
            SELECT C.ID_CURSO, C.TITULO, M.PROGRESSO
            FROM MATRICULAS M
            JOIN CURSOS C ON C.ID_CURSO = M.ID_CURSO
            WHERE M.ID_USUARIO = ? AND M.STATUS_MATRICULA = 1
            ORDER BY C.TITULO
            """,
            (id_aluno,),
        )
        cursos = [{"id": row[0], "titulo": row[1], "progresso": int(row[2] or 0)} for row in cursor.fetchall()]
        cursor.execute("SELECT COUNT(*) FROM PROGRESSO_AULAS WHERE ID_USUARIO = ?", (id_aluno,))
        aulas_assistidas = int((cursor.fetchone() or (0,))[0] or 0)
        # Sprint item 4: calcula ticket medio por aluno com contexto academico para o perfil administrativo.
        return jsonify({
            "aluno": {"id": aluno[0], "nome": aluno[1], "email": aluno[2]},
            "ticket_medio": round(total_pago / faturas_pagas, 2) if faturas_pagas else 0,
            "total_pago": round(total_pago, 2),
            "faturas_pagas": faturas_pagas,
            "cursos": cursos,
            "aulas_assistidas": aulas_assistidas,
        })
    except Exception as erro:
        return resposta(f"Erro ao carregar financeiro do aluno: {erro}", 500)
    finally:
        cursor.close()
        con.close()


@app.route("/admin/custos-plataforma", methods=["GET", "POST"])
@jwt_required()
def custos_plataforma_admin():
    negado = exigir_tipo(0)
    if negado:
        return negado

    garantir_sprint_schema()
    con = get_db()
    cursor = con.cursor()

    try:
        if request.method == "POST":
            dados = request.get_json() or {}
            descricao = (dados.get("descricao") or "").strip()
            categoria = (dados.get("categoria") or "geral").strip()
            valor = float(dados.get("valor") or 0)
            data_custo = dados.get("data_custo") or datetime.now().date().isoformat()
            if not descricao or valor <= 0:
                return resposta("Descricao e valor positivo sao obrigatorios.", 400)
            # Sprint item 5: cadastra custos operacionais para acompanhamento financeiro da plataforma.
            cursor.execute(
                """
                INSERT INTO CUSTOS_PLATAFORMA (ID_CUSTO, DESCRICAO, VALOR, DATA_CUSTO, CATEGORIA, ID_USUARIO)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (proximo_id(cursor, "CUSTOS_PLATAFORMA", "ID_CUSTO"), descricao, valor, data_custo, categoria, get_jwt_identity()),
            )
            con.commit()
            return resposta("Custo cadastrado com sucesso.", 201, "sucesso")

        cursor.execute(
            """
            SELECT ID_CUSTO, DESCRICAO, VALOR, DATA_CUSTO, CATEGORIA, CRIADO_EM
            FROM CUSTOS_PLATAFORMA
            ORDER BY DATA_CUSTO DESC, ID_CUSTO DESC
            """
        )
        return jsonify([
            {
                "id": row[0],
                "descricao": row[1],
                "valor": float(row[2] or 0),
                "data_custo": row[3].isoformat() if row[3] else None,
                "categoria": row[4] or "geral",
                "criado_em": row[5].isoformat() if row[5] else None,
            }
            for row in cursor.fetchall()
        ])
    except Exception as erro:
        con.rollback()
        return resposta(f"Erro ao processar custos: {erro}", 500)
    finally:
        cursor.close()
        con.close()


def _filtros_periodo(prefixo=""):
    inicio = request.args.get("inicio")
    fim = request.args.get("fim")
    filtros = []
    params = []
    campo = f"{prefixo}CRIADO_EM" if prefixo else "CRIADO_EM"

    if inicio:
        filtros.append(f"CAST({campo} AS DATE) >= ?")
        params.append(inicio)

    if fim:
        filtros.append(f"CAST({campo} AS DATE) <= ?")
        params.append(fim)

    return filtros, params


# Sprint item 22: fornece relatórios por período de criação do curso, instrutor e curso; instrutores ficam limitados aos próprios cursos.
@app.route("/relatorios/professor", methods=["GET"])
@jwt_required()
def relatorio_professor():
    garantir_sprint_schema()
    tipo = int(get_jwt().get("tipo", -1))
    id_usuario = int(get_jwt_identity())
    id_curso = request.args.get("id_curso")
    id_instrutor = request.args.get("id_instrutor")
    formato = request.args.get("formato")

    if tipo not in {0, 1}:
        return resposta("Relatorios disponiveis apenas para administradores e instrutores.", 403)

    con = get_db()
    cursor = con.cursor()

    try:
        # Sprint item 7: prepara progresso e tempo de reprodução para o relatório do instrutor.
        from aluno import garantir_tabela_progresso
        garantir_tabela_progresso(con)

        params = []
        where = ["C.EXCLUIDO = 0"]

        if tipo == 1:
            where.append("PC.ID_USUARIO = ?")
            params.append(id_usuario)
        elif id_instrutor:
            where.append("PC.ID_USUARIO = ?")
            params.append(int(id_instrutor))

        if id_curso:
            where.append("C.ID_CURSO = ?")
            params.append(int(id_curso))

        periodo_filtros, periodo_params = _filtros_periodo("C.")
        where.extend(periodo_filtros)
        params.extend(periodo_params)

        cursor.execute(
            f"""
            SELECT
                C.ID_CURSO,
                C.TITULO,
                U.NOME,
                COUNT(DISTINCT M.ID_USUARIO),
                COUNT(DISTINCT V.ID_VIDEO),
                COUNT(DISTINCT CAST(PA.ID_USUARIO AS VARCHAR(20)) || '-' || CAST(PA.ID_VIDEO AS VARCHAR(20))),
                COALESCE(AVG(A.NOTA), 0),
                (SELECT COUNT(DISTINCT CAST(MC.ID_USUARIO AS VARCHAR(20)) || '-' || CAST(C.ID_CURSO AS VARCHAR(20)))
                 FROM MATRICULAS MC
                 WHERE MC.ID_CURSO = C.ID_CURSO AND MC.STATUS_MATRICULA = 1
                   AND EXISTS (
                       SELECT 1 FROM VIDEOS VC
                       WHERE VC.ID_CURSO = C.ID_CURSO AND VC.EXCLUIDO = 0 AND VC.STATUS = 1
                   )
                   AND NOT EXISTS (
                       SELECT 1 FROM VIDEOS VC
                       WHERE VC.ID_CURSO = C.ID_CURSO AND VC.EXCLUIDO = 0 AND VC.STATUS = 1
                         AND NOT EXISTS (
                             SELECT 1 FROM PROGRESSO_AULAS PAC
                             WHERE PAC.ID_VIDEO = VC.ID_VIDEO AND PAC.ID_USUARIO = MC.ID_USUARIO
                         )
                   )),
                (SELECT COUNT(DISTINCT CAST(MM.ID_USUARIO AS VARCHAR(20)) || '-' || CAST(MO.ID_MODULO AS VARCHAR(20)))
                 FROM MATRICULAS MM
                 JOIN MODULOS_CURSO MO ON MO.ID_CURSO = MM.ID_CURSO
                 WHERE MM.ID_CURSO = C.ID_CURSO AND MM.STATUS_MATRICULA = 1
                   AND EXISTS (
                       SELECT 1 FROM VIDEOS VM
                       WHERE VM.ID_MODULO = MO.ID_MODULO AND VM.EXCLUIDO = 0 AND VM.STATUS = 1
                   )
                   AND NOT EXISTS (
                       SELECT 1 FROM VIDEOS VM
                       WHERE VM.ID_MODULO = MO.ID_MODULO AND VM.EXCLUIDO = 0 AND VM.STATUS = 1
                         AND NOT EXISTS (
                             SELECT 1 FROM PROGRESSO_AULAS PAM
                             WHERE PAM.ID_VIDEO = VM.ID_VIDEO AND PAM.ID_USUARIO = MM.ID_USUARIO
                         )
                   )),
                (SELECT COALESCE(SUM(TA.SEGUNDOS_ASSISTIDOS), 0)
                 FROM TEMPO_ASSISTIDO_AULAS TA
                 JOIN VIDEOS VT ON VT.ID_VIDEO = TA.ID_VIDEO
                 WHERE VT.ID_CURSO = C.ID_CURSO AND VT.EXCLUIDO = 0)
            FROM CURSOS C
            JOIN PROFESSORES_CURSO PC ON PC.ID_CURSO = C.ID_CURSO
            JOIN USUARIOS U ON U.ID_USUARIO = PC.ID_USUARIO
            LEFT JOIN MATRICULAS M ON M.ID_CURSO = C.ID_CURSO AND M.STATUS_MATRICULA = 1
            LEFT JOIN VIDEOS V ON V.ID_CURSO = C.ID_CURSO AND V.EXCLUIDO = 0
            LEFT JOIN PROGRESSO_AULAS PA ON PA.ID_VIDEO = V.ID_VIDEO
            LEFT JOIN AVALIACOES_CURSO A ON A.ID_CURSO = C.ID_CURSO
            WHERE {' AND '.join(where)}
            GROUP BY C.ID_CURSO, C.TITULO, U.NOME
            ORDER BY C.TITULO
            """,
            tuple(params),
        )
        cursos = [
            {
                "id_curso": row[0],
                "curso": row[1],
                "instrutor": row[2],
                "alunos": int(row[3] or 0),
                "modulos": int(row[8] or 0),
                "aulas": int(row[4] or 0),
                "aulas_assistidas": int(row[5] or 0),
                "conclusoes": int(row[7] or 0),
                "horas_assistidas": round(float(row[9] or 0) / 3600, 2),
                "avaliacao_media": round(float(row[6] or 0), 2),
            }
            for row in cursor.fetchall()
        ]

        # Sprint item 23: agrupa alunos inscritos, cursos e módulos criados e horas assistidas por mês.
        mensal = {}
        def linha_mensal(ano, mes):
            chave = f"{int(ano):04d}-{int(mes):02d}"
            if chave not in mensal:
                mensal[chave] = {"mes": chave, "alunos": 0, "cursos": 0, "modulos": 0, "horas_assistidas": 0.0}
            return mensal[chave]

        cursor.execute(
            f"""
            SELECT EXTRACT(YEAR FROM E.MES_REFERENCIA), EXTRACT(MONTH FROM E.MES_REFERENCIA), COUNT(DISTINCT E.ID_USUARIO)
            FROM EVENTOS_CURSOS E
            JOIN CURSOS C ON C.ID_CURSO = E.ID_CURSO
            JOIN PROFESSORES_CURSO PC ON PC.ID_CURSO = C.ID_CURSO
            WHERE {' AND '.join(where)} AND E.TIPO_EVENTO = ?
            GROUP BY EXTRACT(YEAR FROM E.MES_REFERENCIA), EXTRACT(MONTH FROM E.MES_REFERENCIA)
            """,
            tuple(params + ["INSCRICAO"]),
        )
        for ano, mes, quantidade in cursor.fetchall():
            linha_mensal(ano, mes)["alunos"] = int(quantidade or 0)

        cursor.execute(
            f"""
            SELECT EXTRACT(YEAR FROM C.CRIADO_EM), EXTRACT(MONTH FROM C.CRIADO_EM), COUNT(DISTINCT C.ID_CURSO)
            FROM CURSOS C
            JOIN PROFESSORES_CURSO PC ON PC.ID_CURSO = C.ID_CURSO
            WHERE {' AND '.join(where)}
            GROUP BY EXTRACT(YEAR FROM C.CRIADO_EM), EXTRACT(MONTH FROM C.CRIADO_EM)
            """,
            tuple(params),
        )
        for ano, mes, quantidade in cursor.fetchall():
            linha_mensal(ano, mes)["cursos"] = int(quantidade or 0)

        cursor.execute(
            f"""
            SELECT EXTRACT(YEAR FROM MC.CRIADO_EM), EXTRACT(MONTH FROM MC.CRIADO_EM), COUNT(DISTINCT MC.ID_MODULO)
            FROM MODULOS_CURSO MC
            JOIN CURSOS C ON C.ID_CURSO = MC.ID_CURSO
            JOIN PROFESSORES_CURSO PC ON PC.ID_CURSO = C.ID_CURSO
            WHERE {' AND '.join(where)}
            GROUP BY EXTRACT(YEAR FROM MC.CRIADO_EM), EXTRACT(MONTH FROM MC.CRIADO_EM)
            """,
            tuple(params),
        )
        for ano, mes, quantidade in cursor.fetchall():
            linha_mensal(ano, mes)["modulos"] = int(quantidade or 0)

        cursor.execute(
            f"""
            SELECT EXTRACT(YEAR FROM TM.MES_REFERENCIA), EXTRACT(MONTH FROM TM.MES_REFERENCIA),
                   COALESCE(SUM(TM.SEGUNDOS_ASSISTIDOS), 0)
            FROM TEMPO_ASSISTIDO_AULAS_MENSAL TM
            JOIN VIDEOS V ON V.ID_VIDEO = TM.ID_VIDEO
            JOIN CURSOS C ON C.ID_CURSO = V.ID_CURSO
            JOIN PROFESSORES_CURSO PC ON PC.ID_CURSO = C.ID_CURSO
            WHERE {' AND '.join(where)}
            GROUP BY EXTRACT(YEAR FROM TM.MES_REFERENCIA), EXTRACT(MONTH FROM TM.MES_REFERENCIA)
            """,
            tuple(params),
        )
        for ano, mes, segundos in cursor.fetchall():
            linha_mensal(ano, mes)["horas_assistidas"] = round(float(segundos or 0) / 3600, 2)
        mensal = [mensal[chave] for chave in sorted(mensal)]

        # Sprint item 23: identifica tempo acumulado antes da captura mensal, cuja competência antiga não pode ser recuperada.
        cursor.execute(
            f"""
            SELECT COALESCE(SUM(TA.SEGUNDOS_ASSISTIDOS), 0) - COALESCE((
                SELECT SUM(TM.SEGUNDOS_ASSISTIDOS)
                FROM TEMPO_ASSISTIDO_AULAS_MENSAL TM
                JOIN VIDEOS VM ON VM.ID_VIDEO = TM.ID_VIDEO
                JOIN CURSOS CM ON CM.ID_CURSO = VM.ID_CURSO
                JOIN PROFESSORES_CURSO PCM ON PCM.ID_CURSO = CM.ID_CURSO
                WHERE {' AND '.join(where).replace('C.', 'CM.').replace('PC.', 'PCM.')}
            ), 0)
            FROM TEMPO_ASSISTIDO_AULAS TA
            JOIN VIDEOS V ON V.ID_VIDEO = TA.ID_VIDEO
            JOIN CURSOS C ON C.ID_CURSO = V.ID_CURSO
            JOIN PROFESSORES_CURSO PC ON PC.ID_CURSO = C.ID_CURSO
            WHERE {' AND '.join(where)}
            """,
            tuple(params + params),
        )
        segundos_sem_competencia = max(float((cursor.fetchone() or (0,))[0] or 0), 0)

        total_alunos = sum(item["alunos"] for item in cursos)
        total_aulas_assistidas = sum(item["aulas_assistidas"] for item in cursos)
        total_horas = sum(item["horas_assistidas"] for item in cursos)
        total_conclusoes = sum(item["conclusoes"] for item in cursos)
        total_modulos_concluidos = sum(item["modulos"] for item in cursos)

        payload = {
            "filtros": {
                "inicio": request.args.get("inicio"),
                "fim": request.args.get("fim"),
                "id_instrutor": id_instrutor,
                "id_curso": id_curso,
            },
            "resumo": {
                "alunos": total_alunos,
                "cursos": len(cursos),
                "modulos": total_modulos_concluidos,
                "conclusoes": total_conclusoes,
                "aulas_assistidas": total_aulas_assistidas,
                "horas_assistidas": round(total_horas, 2),
            },
            "cursos": cursos,
            "mensal": mensal,
            "horas_sem_competencia": round(segundos_sem_competencia / 3600, 2),
        }

        if formato == "pdf":
            linhas = [
                f"Alunos: {payload['resumo']['alunos']}",
                f"Cursos: {payload['resumo']['cursos']}",
                f"Cursos concluídos: {payload['resumo']['conclusoes']}",
                f"Módulos concluídos: {payload['resumo']['modulos']}",
                f"Aulas assistidas: {payload['resumo']['aulas_assistidas']}",
                f"Horas assistidas: {payload['resumo']['horas_assistidas']}",
                f"Horas sem competência mensal anterior ao registro: {payload['horas_sem_competencia']}",
                "",
            ]
            for curso in cursos:
                linhas.append(
                    f"{curso['curso']} | Instrutor: {curso['instrutor']} | Alunos: {curso['alunos']} | "
                    f"Cursos concluídos: {curso['conclusoes']} | Módulos concluídos: {curso['modulos']} | "
                    f"Horas: {curso['horas_assistidas']}"
                )
            linhas.extend(["", "Detalhamento mensal:"])
            for item in mensal:
                linhas.append(
                    f"{item['mes']} | Alunos inscritos: {item['alunos']} | Cursos: {item['cursos']} | "
                    f"Modulos: {item['modulos']} | Horas assistidas: {item['horas_assistidas']}"
                )

            return Response(
                _pdf_simples("Relatorio do Professor", linhas),
                mimetype="application/pdf",
                headers={"Content-Disposition": "attachment; filename=relatorio-professor.pdf"},
            )

        return jsonify(payload)
    except Exception as erro:
        return resposta(f"Erro ao gerar relatorio: {erro}", 500)
    finally:
        cursor.close()
        con.close()


@app.route("/professor/analiticos-mensais", methods=["GET"])
@jwt_required()
def analiticos_mensais_professor():
    negado = exigir_tipo(1)
    if negado:
        return negado

    garantir_sprint_schema()
    id_instrutor = int(get_jwt_identity())
    hoje = datetime.now().date()
    inicio_mes = hoje.replace(day=1)
    inicio_proximo_mes = (inicio_mes.replace(day=28) + timedelta(days=4)).replace(day=1)
    fim_mes = inicio_proximo_mes - timedelta(days=1)
    con = get_db()
    cursor = con.cursor()

    try:
        # Sprint item 9: reúne visitas, inscrições convertidas e alunos ativos apenas no mês civil atual para o instrutor autenticado.
        cursor.execute(
            """
            SELECT
                C.ID_CURSO,
                C.TITULO,
                (SELECT COUNT(*) FROM EVENTOS_CURSOS E
                 WHERE E.ID_CURSO = C.ID_CURSO AND E.TIPO_EVENTO = 'ACESSO' AND E.MES_REFERENCIA = ?),
                (SELECT COUNT(*) FROM EVENTOS_CURSOS E
                 WHERE E.ID_CURSO = C.ID_CURSO AND E.TIPO_EVENTO = 'INSCRICAO' AND E.MES_REFERENCIA = ?),
                (SELECT COUNT(DISTINCT M.ID_USUARIO) FROM MATRICULAS M
                 WHERE M.ID_CURSO = C.ID_CURSO AND M.STATUS_MATRICULA = 1)
            FROM CURSOS C
            JOIN PROFESSORES_CURSO PC ON PC.ID_CURSO = C.ID_CURSO
            WHERE PC.ID_USUARIO = ? AND C.EXCLUIDO = 0
            ORDER BY C.TITULO
            """,
            (inicio_mes, inicio_mes, id_instrutor),
        )
        cursos = []
        for row in cursor.fetchall():
            acessos = int(row[2] or 0)
            inscricoes = int(row[3] or 0)
            cursos.append({
                "id_curso": int(row[0]),
                "curso": row[1],
                "acessos": acessos,
                "inscricoes_mes": inscricoes,
                "alunos_inscritos": int(row[4] or 0),
                "conversao_percentual": round((inscricoes / acessos) * 100, 2) if acessos else 0,
            })

        total_acessos = sum(curso["acessos"] for curso in cursos)
        total_inscricoes = sum(curso["inscricoes_mes"] for curso in cursos)
        cursor.execute(
            """
            SELECT COUNT(DISTINCT M.ID_USUARIO)
            FROM MATRICULAS M
            JOIN CURSOS C ON C.ID_CURSO = M.ID_CURSO AND C.EXCLUIDO = 0
            JOIN PROFESSORES_CURSO PC ON PC.ID_CURSO = C.ID_CURSO
            WHERE PC.ID_USUARIO = ? AND M.STATUS_MATRICULA = 1
            """,
            (id_instrutor,),
        )
        total_alunos_inscritos = int((cursor.fetchone() or (0,))[0] or 0)
        return jsonify({
            "mes": inicio_mes.strftime("%Y-%m"),
            "inicio": inicio_mes.isoformat(),
            "fim": fim_mes.isoformat(),
            "total_acessos": total_acessos,
            "inscricoes_mes": total_inscricoes,
            "alunos_inscritos": total_alunos_inscritos,
            "conversao_percentual": round((total_inscricoes / total_acessos) * 100, 2) if total_acessos else 0,
            "cursos": cursos,
        })
    except Exception as erro:
        return resposta(f"Erro ao carregar os indicadores mensais: {erro}", 500)
    finally:
        cursor.close()
        con.close()


# Sprint item 21: permite ao instrutor remover apenas complementos do próprio curso e apaga uploads privados.
@app.route("/professor/cursos/<int:id_curso>/materiais/<int:id_material>", methods=["DELETE"])
@jwt_required()
def excluir_material_professor(id_curso, id_material):
    negado = exigir_tipo(1)
    if negado:
        return negado
    garantir_sprint_schema()
    con = get_db()
    cursor = con.cursor()
    try:
        if not _curso_do_professor(cursor, id_curso, int(get_jwt_identity())):
            return resposta("Curso nao encontrado para este instrutor.", 404)
        cursor.execute(
            "SELECT URL FROM MATERIAIS_CURSO WHERE ID_MATERIAL = ? AND ID_CURSO = ?",
            (id_material, id_curso),
        )
        registro = cursor.fetchone()
        if not registro:
            return resposta("Complemento nao encontrado.", 404)
        url = str(registro[0] or "")
        cursor.execute("DELETE FROM MATERIAIS_CURSO WHERE ID_MATERIAL = ? AND ID_CURSO = ?", (id_material, id_curso))
        con.commit()
        if url.startswith("privado:"):
            nome = os.path.basename(url.split(":", 1)[1])
            caminho = os.path.join(current_app.root_path, "private_uploads", "materiais", nome)
            if os.path.isfile(caminho):
                os.remove(caminho)
        return resposta("Complemento removido com sucesso.")
    except Exception as erro:
        con.rollback()
        return resposta(f"Erro ao remover complemento: {erro}", 500)
    finally:
        cursor.close()
        con.close()


# Sprint item 21: serve arquivos complementares privados apenas a alunos matriculados com assinatura ativa.
@app.route("/aluno/cursos/<int:id_curso>/materiais/<int:id_material>/arquivo", methods=["GET"])
@jwt_required()
def baixar_material_aluno(id_curso, id_material):
    negado = exigir_tipo(2)
    if negado:
        return negado

    garantir_sprint_schema()
    con = get_db()
    cursor = con.cursor()
    try:
        id_aluno = int(get_jwt_identity())
        if not _aluno_matriculado(cursor, id_curso, id_aluno):
            return resposta("Material disponivel somente para alunos matriculados.", 403)
        bloqueio = _bloqueio_assinatura_aluno(cursor, id_aluno)
        if bloqueio:
            return bloqueio
        cursor.execute("SELECT URL, NOME_ARQUIVO FROM MATERIAIS_CURSO WHERE ID_CURSO = ? AND ID_MATERIAL = ?", (id_curso, id_material))
        material = cursor.fetchone()
        if not material or not str(material[0] or "").startswith("privado:"):
            return resposta("Arquivo complementar nao encontrado.", 404)
        nome_seguro = os.path.basename(str(material[0]).split(":", 1)[1])
        caminho = os.path.join(current_app.root_path, "private_uploads", "materiais", nome_seguro)
        if not os.path.isfile(caminho):
            return resposta("Arquivo complementar nao encontrado.", 404)
        tipo_mime = mimetypes.guess_type(material[1] or caminho)[0] or "application/octet-stream"
        return send_file(caminho, mimetype=tipo_mime, as_attachment=True, download_name=material[1] or nome_seguro)
    except Exception as erro:
        return resposta(f"Erro ao baixar complemento: {erro}", 500)
    finally:
        cursor.close()
        con.close()


@app.route("/admin/financeiro/transacoes", methods=["GET"])
@jwt_required()
def transacoes_financeiras_admin():
    negado = exigir_tipo(0)
    if negado:
        return negado

    garantir_sprint_schema()
    con = get_db()
    cursor = con.cursor()

    try:
        transacoes = []
        # Sprint item 13: reúne pagamentos de assinaturas, despesas e saques numa visão administrativa única.
        cursor.execute(
            """
            SELECT A.ID_ASSINATURA, A.ID_USUARIO, U.NOME, A.VALOR, A.STATUS,
                   A.DATA_PAGAMENTO, A.DATA_VENCIMENTO, A.CRIADO_EM
            FROM ASSINATURAS A
            LEFT JOIN USUARIOS U ON U.ID_USUARIO = A.ID_USUARIO
            ORDER BY COALESCE(A.DATA_PAGAMENTO, A.CRIADO_EM) DESC
            """
        )
        for row in cursor.fetchall():
            data = row[5] or row[7] or row[6]
            transacoes.append({
                "id": f"assinatura-{row[0]}",
                "data": data.isoformat() if data else None,
                "tipo": "Assinatura",
                "descricao": f"Mensalidade de {row[2] or 'aluno'}",
                "status": "Paga" if int(row[4] or 0) == 1 else "Pendente",
                "valor": float(row[3] or 0),
                "direcao": "entrada" if int(row[4] or 0) == 1 else "pendente",
            })

        cursor.execute(
            """
            SELECT ID_CUSTO, DESCRICAO, CATEGORIA, VALOR, DATA_CUSTO, CRIADO_EM
            FROM CUSTOS_PLATAFORMA
            """
        )
        for row in cursor.fetchall():
            data = row[4] or row[5]
            transacoes.append({
                "id": f"despesa-{row[0]}",
                "data": data.isoformat() if data else None,
                "tipo": "Despesa",
                "descricao": row[1],
                "status": row[2] or "Registrada",
                "valor": float(row[3] or 0),
                "direcao": "saida",
            })

        cursor.execute(
            """
            SELECT S.ID_SAQUE, U.NOME, S.VALOR, S.STATUS, S.CRIADO_EM
            FROM SAQUES_INSTRUTOR S
            LEFT JOIN USUARIOS U ON U.ID_USUARIO = S.ID_USUARIO
            """
        )
        for row in cursor.fetchall():
            status = int(row[3] or 0)
            transacoes.append({
                "id": f"saque-{row[0]}",
                "data": row[4].isoformat() if row[4] else None,
                "tipo": "Saque de instrutor",
                "descricao": f"Solicitação de {row[1] or 'instrutor'}",
                "status": "Concluído" if status == 1 else "Solicitado",
                "valor": float(row[2] or 0),
                "direcao": "saida",
            })

        transacoes.sort(key=lambda item: item["data"] or "", reverse=True)
        return jsonify(transacoes)
    except Exception as erro:
        return resposta(f"Erro ao listar transações financeiras: {erro}", 500)
    finally:
        cursor.close()
        con.close()


@app.route("/admin/financeiro/config", methods=["GET", "PATCH"])
@jwt_required()
def financeiro_config_admin():
    negado = exigir_tipo(0)
    if negado:
        return negado

    garantir_sprint_schema()
    con = get_db()
    cursor = con.cursor()

    try:
        if request.method == "GET":
            return jsonify({
                "percentual_instrutores": round(percentual_instrutores(cursor), 2)
            })

        dados = request.get_json() or {}
        percentual = float(dados.get("percentual_instrutores"))

        if percentual < 0 or percentual > 100:
            return resposta("Percentual dos instrutores deve ficar entre 0 e 100.", 400)

        cursor.execute(
            """
            UPDATE FINANCEIRO_CONFIG
            SET PERCENTUAL_INSTRUTORES = ?, ATUALIZADO_EM = CURRENT_TIMESTAMP
            WHERE ID_CONFIG = 1
            """,
            (percentual,),
        )
        con.commit()
        return resposta("Percentual do pool atualizado com sucesso.", 200, "sucesso", percentual_instrutores=round(percentual, 2))
    except (TypeError, ValueError):
        con.rollback()
        return resposta("Percentual dos instrutores invalido.", 400)
    except Exception as erro:
        con.rollback()
        return resposta(f"Erro ao atualizar configuracao financeira: {erro}", 500)
    finally:
        cursor.close()
        con.close()


@app.route("/professor/saques", methods=["POST"])
@jwt_required()
def solicitar_saque():
    negado = exigir_tipo(1)
    if negado:
        return negado

    garantir_sprint_schema()
    valor_recebido = (request.get_json(silent=True) or {}).get("valor")
    try:
        valor_decimal = Decimal(str(valor_recebido))
        if not valor_decimal.is_finite() or valor_decimal <= 0:
            return resposta("Valor de saque invalido.", 400)
        valor_centavos = valor_decimal.quantize(Decimal("0.01"))
    except (InvalidOperation, TypeError, ValueError):
        return resposta("Informe um valor de saque valido com ate duas casas decimais.", 400)

    if valor_decimal != valor_centavos:
        return resposta("O valor do saque deve ter ate duas casas decimais.", 400)

    valor = float(valor_centavos)

    con = get_db()
    cursor = con.cursor()

    try:
        # Sprint item 1: valida o saque contra o saldo disponível calculado no backend.
        percentual = percentual_instrutores(cursor)
        cursor.execute("SELECT COALESCE(CAST(SUM(VALOR) AS DOUBLE PRECISION), 0) FROM ASSINATURAS WHERE STATUS = 1")
        total_arrecadado = float((cursor.fetchone() or (0,))[0] or 0)
        # Sprint item 15: valida o saque usando o mesmo pool baseado em pagamentos reais mostrado aos dois perfis.
        pool_instrutores = total_arrecadado * (percentual / 100)
        pesos_instrutores = pesos_pool_instrutores(cursor)
        peso_total = sum(pesos_instrutores.values())
        _, _, _, disponivel_saque = calcular_saldo_saque(
            cursor,
            get_jwt_identity(),
            pool_instrutores,
            pesos_instrutores,
            peso_total,
        )

        if valor > disponivel_saque:
            return resposta(
                "O valor solicitado excede o saldo disponível para saque.",
                400,
                disponivel_saque=disponivel_saque,
            )

        id_saque = proximo_id(cursor, "SAQUES_INSTRUTOR", "ID_SAQUE")
        # Sprint item 1: solicita o saque na Arkhé somente após validar o saldo do instrutor.
        saque_arkhe = solicitar_saque_conta(valor, referencia=f"SAQUE-{id_saque}-{get_jwt_identity()}")
        cursor.execute(
            """
            INSERT INTO SAQUES_INSTRUTOR (ID_SAQUE, ID_USUARIO, VALOR, STATUS, ID_SAQUE_ARKHE, RESPOSTA_ARKHE)
            VALUES (?, ?, ?, 0, ?, ?)
            """,
            (id_saque, get_jwt_identity(), valor, saque_arkhe.get("id_saque"), para_blob_texto(str(saque_arkhe))),
        )
        con.commit()
        return resposta("Solicitacao de saque registrada.", 201, "sucesso")
    except ArkheError as erro:
        con.rollback()
        return resposta(f"Erro ao solicitar saque na Arkhe: {erro}", 502)
    except Exception as erro:
        con.rollback()
        return resposta(f"Erro ao solicitar saque: {erro}", 500)
    finally:
        cursor.close()
        con.close()
