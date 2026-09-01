import os
import re
from uuid import uuid4

import fdb
from flask import current_app, jsonify, request
from flask_jwt_extended import get_jwt, get_jwt_identity, jwt_required
from werkzeug.utils import secure_filename

from main import app


STATUS_PRIVADO = 0
STATUS_PUBLICADO = 1
STATUS_ARQUIVADO = 2

STATUS_NOMES = {
    STATUS_PRIVADO: "privado",
    STATUS_PUBLICADO: "publicado",
    STATUS_ARQUIVADO: "arquivado",
}

CURSO_STATUS_FILTRO = {
    "todos": None,
    "privados": STATUS_PRIVADO,
    "publicados": STATUS_PUBLICADO,
    "arquivados": STATUS_ARQUIVADO,
}

AULA_STATUS_FILTRO = {
    "todos": None,
    "privadas": STATUS_PRIVADO,
    "publicadas": STATUS_PUBLICADO,
}


def get_db():
    return fdb.connect(
        host=current_app.config["DB_HOST"],
        database=current_app.config["DB_NAME"],
        user=current_app.config["DB_USER"],
        password=current_app.config["DB_PASSWORD"],
        charset="UTF8",
    )


def criar_mensagem(descricao, tipo="erro"):
    return {
        "id": os.urandom(8).hex(),
        "tipo": tipo,
        "descricao": descricao,
    }


def resposta(descricao, status=200, tipo="erro", **extra):
    payload = {"mensagem": criar_mensagem(descricao, tipo)}
    payload.update(extra)
    return jsonify(payload), status


def exigir_professor():
    tipo = get_jwt().get("tipo")

    if int(tipo or -1) != 1:
        return resposta("Acesso negado. Apenas professores podem usar este recurso.", 403)

    return None


def banco_nao_preparado(erro):
    texto = str(erro).upper()
    return (
        "IMAGEM_URL" in texto
        or "VIDEO_URL" in texto
        or "EXCLUIDO" in texto
        or "ATUALIZADO_EM" in texto
        or "DYNAMIC SQL ERROR" in texto
    )


def criar_slug(texto):
    slug = re.sub(r"[^a-z0-9]+", "-", texto.lower()).strip("-")
    return slug or uuid4().hex


def para_blob_texto(texto):
    return texto.encode("utf-8")


def de_blob_texto(valor):
    if valor is None:
        return ""

    if hasattr(valor, "read"):
        valor = valor.read()

    if isinstance(valor, bytes):
        return valor.decode("utf-8", errors="replace")

    return str(valor)


def salvar_upload(arquivo, subpasta, extensoes):
    if not arquivo or not arquivo.filename:
        return None

    extensao = arquivo.filename.rsplit(".", 1)[-1].lower() if "." in arquivo.filename else ""
    if extensao not in extensoes:
        raise ValueError(f"Arquivo inválido. Use: {', '.join(sorted(extensoes))}.")

    pasta = os.path.join(current_app.root_path, "static", "uploads", subpasta)
    os.makedirs(pasta, exist_ok=True)

    nome_seguro = secure_filename(arquivo.filename)
    nome_final = f"{uuid4().hex}_{nome_seguro}"
    caminho = os.path.join(pasta, nome_final)
    arquivo.save(caminho)

    return f"/static/uploads/{subpasta}/{nome_final}"


def curso_para_dict(row):
    return {
        "id": row[0],
        "titulo": row[1],
        "descricao": de_blob_texto(row[2]),
        "imagem": row[3],
        "status": row[4],
        "status_nome": STATUS_NOMES.get(row[4], "desconhecido"),
        "total_aulas": row[5] or 0,
        "aulas_publicadas": row[6] or 0,
    }


def aula_para_dict(row):
    return {
        "id": row[0],
        "id_curso": row[1],
        "titulo": row[2],
        "descricao": de_blob_texto(row[3]),
        "video": row[4],
        "status": row[5],
        "status_nome": STATUS_NOMES.get(row[5], "desconhecido"),
    }


@app.route("/professor/dashboard", methods=["GET"])
@jwt_required()
def professor_dashboard():
    negado = exigir_professor()
    if negado:
        return negado

    id_professor = get_jwt_identity()
    con = get_db()
    cursor = con.cursor()

    try:
        cursor.execute(
            """
            SELECT
                COUNT(*),
                SUM(CASE WHEN C.STATUS = 1 THEN 1 ELSE 0 END),
                SUM(CASE WHEN C.STATUS = 0 THEN 1 ELSE 0 END),
                SUM(CASE WHEN C.STATUS = 2 THEN 1 ELSE 0 END)
            FROM CURSOS C
            JOIN PROFESSORES_CURSO PC ON PC.ID_CURSO = C.ID_CURSO
            WHERE PC.ID_USUARIO = ? AND C.EXCLUIDO = 0
            """,
            (id_professor,),
        )
        cursos = cursor.fetchone() or (0, 0, 0, 0)

        cursor.execute(
            """
            SELECT
                COUNT(*),
                SUM(CASE WHEN V.STATUS = 1 THEN 1 ELSE 0 END)
            FROM VIDEOS V
            JOIN CURSOS C ON C.ID_CURSO = V.ID_CURSO
            JOIN PROFESSORES_CURSO PC ON PC.ID_CURSO = C.ID_CURSO
            WHERE PC.ID_USUARIO = ? AND C.EXCLUIDO = 0 AND V.EXCLUIDO = 0
            """,
            (id_professor,),
        )
        aulas = cursor.fetchone() or (0, 0)

        cursor.execute(
            """
            SELECT COUNT(DISTINCT M.ID_USUARIO)
            FROM MATRICULAS M
            JOIN CURSOS C ON C.ID_CURSO = M.ID_CURSO
            JOIN PROFESSORES_CURSO PC ON PC.ID_CURSO = C.ID_CURSO
            WHERE PC.ID_USUARIO = ? AND C.EXCLUIDO = 0 AND M.STATUS_MATRICULA = 1
            """,
            (id_professor,),
        )
        total_alunos = (cursor.fetchone() or (0,))[0] or 0

        cursor.execute(
            """
            SELECT FIRST 6
                C.ID_CURSO,
                C.TITULO,
                C.DESCRICAO,
                C.IMAGEM_URL,
                C.STATUS,
                (SELECT COUNT(*) FROM VIDEOS V WHERE V.ID_CURSO = C.ID_CURSO AND V.EXCLUIDO = 0),
                (SELECT COUNT(*) FROM VIDEOS V WHERE V.ID_CURSO = C.ID_CURSO AND V.EXCLUIDO = 0 AND V.STATUS = 1)
            FROM CURSOS C
            JOIN PROFESSORES_CURSO PC ON PC.ID_CURSO = C.ID_CURSO
            WHERE PC.ID_USUARIO = ? AND C.EXCLUIDO = 0
            ORDER BY C.ATUALIZADO_EM DESC
            """,
            (id_professor,),
        )
        recentes = [curso_para_dict(row) for row in cursor.fetchall()]

        return jsonify(
            {
                "metricas": {
                    "cursos_cadastrados": cursos[0] or 0,
                    "cursos_publicados": cursos[1] or 0,
                    "cursos_privados": cursos[2] or 0,
                    "cursos_arquivados": cursos[3] or 0,
                    "aulas_total": aulas[0] or 0,
                    "aulas_publicadas": aulas[1] or 0,
                    "total_alunos": total_alunos,
                },
                "recentes": recentes,
            }
        )
    except Exception as erro:
        if banco_nao_preparado(erro):
            return jsonify(
                {
                    "metricas": {
                        "cursos_cadastrados": 0,
                        "cursos_publicados": 0,
                        "cursos_privados": 0,
                        "cursos_arquivados": 0,
                        "aulas_total": 0,
                        "aulas_publicadas": 0,
                        "total_alunos": 0,
                    },
                    "recentes": [],
                    "mensagem": criar_mensagem("Banco ainda não preparado para a dashboard do professor.", "erro"),
                }
            )
        return resposta(f"Erro ao carregar dashboard: {erro}", 500)
    finally:
        cursor.close()
        con.close()


@app.route("/professor/cursos", methods=["GET"])
@jwt_required()
def listar_cursos_professor():
    negado = exigir_professor()
    if negado:
        return negado

    filtro = request.args.get("status", "todos")
    status = CURSO_STATUS_FILTRO.get(filtro, None)
    parametros = [get_jwt_identity()]
    filtro_status = ""

    if filtro in CURSO_STATUS_FILTRO and status is not None:
        filtro_status = "AND C.STATUS = ?"
        parametros.append(status)

    con = get_db()
    cursor = con.cursor()

    try:
        cursor.execute(
            f"""
            SELECT
                C.ID_CURSO,
                C.TITULO,
                C.DESCRICAO,
                C.IMAGEM_URL,
                C.STATUS,
                (SELECT COUNT(*) FROM VIDEOS V WHERE V.ID_CURSO = C.ID_CURSO AND V.EXCLUIDO = 0),
                (SELECT COUNT(*) FROM VIDEOS V WHERE V.ID_CURSO = C.ID_CURSO AND V.EXCLUIDO = 0 AND V.STATUS = 1)
            FROM CURSOS C
            JOIN PROFESSORES_CURSO PC ON PC.ID_CURSO = C.ID_CURSO
            WHERE PC.ID_USUARIO = ? AND C.EXCLUIDO = 0 {filtro_status}
            ORDER BY C.CRIADO_EM DESC
            """,
            tuple(parametros),
        )
        return jsonify([curso_para_dict(row) for row in cursor.fetchall()])
    except Exception as erro:
        if banco_nao_preparado(erro):
            return jsonify([])
        return resposta(f"Erro ao listar cursos: {erro}", 500)
    finally:
        cursor.close()
        con.close()


@app.route("/professor/cursos", methods=["POST"])
@jwt_required()
def criar_curso_professor():
    negado = exigir_professor()
    if negado:
        return negado

    titulo = (request.form.get("titulo") or "").strip()
    descricao = (request.form.get("descricao") or "").strip()

    if not titulo or not descricao:
        return resposta("Título e descrição são obrigatórios.", 400)

    try:
        imagem_url = salvar_upload(request.files.get("imagem"), "cursos", {"jpg", "jpeg", "png", "webp"})
    except ValueError as erro:
        return resposta(str(erro), 400)

    con = get_db()
    cursor = con.cursor()

    try:
        cursor.execute("SELECT GEN_ID(GEN_CURSOS_ID, 1) FROM RDB$DATABASE")
        id_curso = cursor.fetchone()[0]
        cursor.execute(
            """
            INSERT INTO CURSOS (ID_CURSO, TITULO, DESCRICAO, IMAGEM_URL, STATUS, EXCLUIDO, CRIADO_EM, ATUALIZADO_EM)
            VALUES (?, ?, ?, ?, 0, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            """,
            (id_curso, titulo, para_blob_texto(descricao), imagem_url),
        )
        cursor.execute(
            "INSERT INTO PROFESSORES_CURSO (ID_CURSO, ID_USUARIO) VALUES (?, ?)",
            (id_curso, get_jwt_identity()),
        )
        con.commit()
        return resposta("Curso cadastrado como privado.", 201, "sucesso", id_curso=id_curso)
    except Exception as erro:
        con.rollback()
        return resposta(f"Erro ao cadastrar curso: {erro}", 500)
    finally:
        cursor.close()
        con.close()


@app.route("/professor/cursos/<int:id_curso>", methods=["PUT"])
@jwt_required()
def editar_curso_professor(id_curso):
    negado = exigir_professor()
    if negado:
        return negado

    titulo = (request.form.get("titulo") or "").strip()
    descricao = (request.form.get("descricao") or "").strip()

    if not titulo or not descricao:
        return resposta("Título e descrição são obrigatórios.", 400)

    try:
        nova_imagem = salvar_upload(request.files.get("imagem"), "cursos", {"jpg", "jpeg", "png", "webp"})
    except ValueError as erro:
        return resposta(str(erro), 400)

    campos = "TITULO = ?, DESCRICAO = ?, ATUALIZADO_EM = CURRENT_TIMESTAMP"
    parametros = [titulo, para_blob_texto(descricao)]

    if nova_imagem:
        campos = "TITULO = ?, DESCRICAO = ?, IMAGEM_URL = ?, ATUALIZADO_EM = CURRENT_TIMESTAMP"
        parametros.append(nova_imagem)

    parametros.extend([id_curso, get_jwt_identity()])
    con = get_db()
    cursor = con.cursor()

    try:
        cursor.execute(
            f"""
            UPDATE CURSOS
            SET {campos}
            WHERE ID_CURSO = ? AND EXCLUIDO = 0
              AND EXISTS (
                  SELECT 1 FROM PROFESSORES_CURSO PC
                  WHERE PC.ID_CURSO = CURSOS.ID_CURSO AND PC.ID_USUARIO = ?
              )
            """,
            tuple(parametros),
        )
        con.commit()
        return resposta("Curso atualizado com sucesso.", 200, "sucesso")
    except Exception as erro:
        con.rollback()
        return resposta(f"Erro ao atualizar curso: {erro}", 500)
    finally:
        cursor.close()
        con.close()


@app.route("/professor/cursos/<int:id_curso>/status", methods=["PATCH"])
@jwt_required()
def alterar_status_curso(id_curso):
    negado = exigir_professor()
    if negado:
        return negado

    try:
        status = int((request.get_json() or {}).get("status"))
    except (TypeError, ValueError):
        return resposta("Status inválido.", 400)

    if status not in STATUS_NOMES:
        return resposta("Status inválido.", 400)

    con = get_db()
    cursor = con.cursor()

    try:
        cursor.execute(
            """
            UPDATE CURSOS
            SET STATUS = ?, ATUALIZADO_EM = CURRENT_TIMESTAMP
            WHERE ID_CURSO = ? AND EXCLUIDO = 0
              AND EXISTS (
                  SELECT 1 FROM PROFESSORES_CURSO PC
                  WHERE PC.ID_CURSO = CURSOS.ID_CURSO AND PC.ID_USUARIO = ?
              )
            """,
            (status, id_curso, get_jwt_identity()),
        )
        con.commit()
        return resposta(f"Curso definido como {STATUS_NOMES[status]}.", 200, "sucesso")
    except Exception as erro:
        con.rollback()
        return resposta(f"Erro ao alterar status do curso: {erro}", 500)
    finally:
        cursor.close()
        con.close()


@app.route("/professor/cursos/<int:id_curso>", methods=["DELETE"])
@jwt_required()
def excluir_curso_professor(id_curso):
    negado = exigir_professor()
    if negado:
        return negado

    con = get_db()
    cursor = con.cursor()

    try:
        cursor.execute(
            """
            UPDATE CURSOS
            SET EXCLUIDO = 1, ATUALIZADO_EM = CURRENT_TIMESTAMP
            WHERE ID_CURSO = ?
              AND EXISTS (
                  SELECT 1 FROM PROFESSORES_CURSO PC
                  WHERE PC.ID_CURSO = CURSOS.ID_CURSO AND PC.ID_USUARIO = ?
              )
            """,
            (id_curso, get_jwt_identity()),
        )
        cursor.execute(
            "UPDATE VIDEOS SET EXCLUIDO = 1, ATUALIZADO_EM = CURRENT_TIMESTAMP WHERE ID_CURSO = ?",
            (id_curso,),
        )
        con.commit()
        return resposta("Curso excluído com sucesso.", 200, "sucesso")
    except Exception as erro:
        con.rollback()
        return resposta(f"Erro ao excluir curso: {erro}", 500)
    finally:
        cursor.close()
        con.close()


@app.route("/professor/cursos/<int:id_curso>/aulas", methods=["GET"])
@jwt_required()
def listar_aulas_professor(id_curso):
    negado = exigir_professor()
    if negado:
        return negado

    filtro = request.args.get("status", "todos")
    status = AULA_STATUS_FILTRO.get(filtro, None)
    parametros = [id_curso, get_jwt_identity()]
    filtro_status = ""

    if filtro in AULA_STATUS_FILTRO and status is not None:
        filtro_status = "AND V.STATUS = ?"
        parametros.append(status)

    con = get_db()
    cursor = con.cursor()

    try:
        cursor.execute(
            f"""
            SELECT V.ID_VIDEO, V.ID_CURSO, V.TITULO, V.DESCRICAO, V.VIDEO_URL, V.STATUS
            FROM VIDEOS V
            JOIN CURSOS C ON C.ID_CURSO = V.ID_CURSO
            JOIN PROFESSORES_CURSO PC ON PC.ID_CURSO = C.ID_CURSO
            WHERE V.ID_CURSO = ? AND PC.ID_USUARIO = ? AND V.EXCLUIDO = 0 AND C.EXCLUIDO = 0 {filtro_status}
            ORDER BY V.DATA_UPLOAD DESC
            """,
            tuple(parametros),
        )
        return jsonify([aula_para_dict(row) for row in cursor.fetchall()])
    except Exception as erro:
        if banco_nao_preparado(erro):
            return jsonify([])
        return resposta(f"Erro ao listar aulas: {erro}", 500)
    finally:
        cursor.close()
        con.close()


@app.route("/professor/cursos/<int:id_curso>/aulas", methods=["POST"])
@jwt_required()
def criar_aula_professor(id_curso):
    negado = exigir_professor()
    if negado:
        return negado

    titulo = (request.form.get("titulo") or "").strip()
    descricao = (request.form.get("descricao") or "").strip()

    if not titulo or not descricao:
        return resposta("Título e descrição são obrigatórios.", 400)

    try:
        video_url = salvar_upload(request.files.get("video"), "aulas", {"mp4", "webm", "ogg", "mov"})
    except ValueError as erro:
        return resposta(str(erro), 400)

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
            return resposta("Curso não encontrado.", 404)

        cursor.execute("SELECT GEN_ID(GEN_VIDEOS_ID, 1) FROM RDB$DATABASE")
        id_aula = cursor.fetchone()[0]
        cursor.execute(
            """
            INSERT INTO VIDEOS (
                ID_VIDEO, ID_CURSO, ID_PUBLICO, TITULO, TITULO_SLUG, DESCRICAO,
                POSICAO_PLAYLIST, DURACAO, DATA_UPLOAD, VIDEO_URL, STATUS, EXCLUIDO, ATUALIZADO_EM
            )
            VALUES (?, ?, ?, ?, ?, ?, 0, 0, CURRENT_TIMESTAMP, ?, 0, 0, CURRENT_TIMESTAMP)
            """,
            (id_aula, id_curso, uuid4().hex, titulo, criar_slug(titulo), para_blob_texto(descricao), video_url),
        )
        con.commit()
        return resposta("Aula cadastrada como privada.", 201, "sucesso", id_aula=id_aula)
    except Exception as erro:
        con.rollback()
        return resposta(f"Erro ao cadastrar aula: {erro}", 500)
    finally:
        cursor.close()
        con.close()


@app.route("/professor/aulas/<int:id_aula>", methods=["PUT"])
@jwt_required()
def editar_aula_professor(id_aula):
    negado = exigir_professor()
    if negado:
        return negado

    titulo = (request.form.get("titulo") or "").strip()
    descricao = (request.form.get("descricao") or "").strip()

    if not titulo or not descricao:
        return resposta("Título e descrição são obrigatórios.", 400)

    try:
        novo_video = salvar_upload(request.files.get("video"), "aulas", {"mp4", "webm", "ogg", "mov"})
    except ValueError as erro:
        return resposta(str(erro), 400)

    campos = "TITULO = ?, DESCRICAO = ?, ATUALIZADO_EM = CURRENT_TIMESTAMP"
    parametros = [titulo, para_blob_texto(descricao)]

    if novo_video:
        campos = "TITULO = ?, DESCRICAO = ?, VIDEO_URL = ?, ATUALIZADO_EM = CURRENT_TIMESTAMP"
        parametros.append(novo_video)

    parametros.extend([id_aula, get_jwt_identity()])
    con = get_db()
    cursor = con.cursor()

    try:
        cursor.execute(
            f"""
            UPDATE VIDEOS V
            SET {campos}
            WHERE V.ID_VIDEO = ? AND V.EXCLUIDO = 0
              AND EXISTS (
                  SELECT 1 FROM CURSOS C
                  JOIN PROFESSORES_CURSO PC ON PC.ID_CURSO = C.ID_CURSO
                  WHERE C.ID_CURSO = V.ID_CURSO AND PC.ID_USUARIO = ? AND C.EXCLUIDO = 0
              )
            """,
            tuple(parametros),
        )
        con.commit()
        return resposta("Aula atualizada com sucesso.", 200, "sucesso")
    except Exception as erro:
        con.rollback()
        return resposta(f"Erro ao atualizar aula: {erro}", 500)
    finally:
        cursor.close()
        con.close()


@app.route("/professor/aulas/<int:id_aula>/status", methods=["PATCH"])
@jwt_required()
def alterar_status_aula(id_aula):
    negado = exigir_professor()
    if negado:
        return negado

    try:
        status = int((request.get_json() or {}).get("status"))
    except (TypeError, ValueError):
        return resposta("Status inválido.", 400)

    if status not in [STATUS_PRIVADO, STATUS_PUBLICADO]:
        return resposta("Status inválido para aula.", 400)

    con = get_db()
    cursor = con.cursor()

    try:
        cursor.execute(
            """
            UPDATE VIDEOS V
            SET STATUS = ?, ATUALIZADO_EM = CURRENT_TIMESTAMP
            WHERE V.ID_VIDEO = ? AND V.EXCLUIDO = 0
              AND EXISTS (
                  SELECT 1 FROM CURSOS C
                  JOIN PROFESSORES_CURSO PC ON PC.ID_CURSO = C.ID_CURSO
                  WHERE C.ID_CURSO = V.ID_CURSO AND PC.ID_USUARIO = ? AND C.EXCLUIDO = 0
              )
            """,
            (status, id_aula, get_jwt_identity()),
        )
        con.commit()
        return resposta(f"Aula definida como {STATUS_NOMES[status]}.", 200, "sucesso")
    except Exception as erro:
        con.rollback()
        return resposta(f"Erro ao alterar status da aula: {erro}", 500)
    finally:
        cursor.close()
        con.close()


@app.route("/professor/aulas/<int:id_aula>", methods=["DELETE"])
@jwt_required()
def excluir_aula_professor(id_aula):
    negado = exigir_professor()
    if negado:
        return negado

    con = get_db()
    cursor = con.cursor()

    try:
        cursor.execute(
            """
            UPDATE VIDEOS V
            SET EXCLUIDO = 1, ATUALIZADO_EM = CURRENT_TIMESTAMP
            WHERE V.ID_VIDEO = ?
              AND EXISTS (
                  SELECT 1 FROM CURSOS C
                  JOIN PROFESSORES_CURSO PC ON PC.ID_CURSO = C.ID_CURSO
                  WHERE C.ID_CURSO = V.ID_CURSO AND PC.ID_USUARIO = ? AND C.EXCLUIDO = 0
              )
            """,
            (id_aula, get_jwt_identity()),
        )
        con.commit()
        return resposta("Aula excluída com sucesso.", 200, "sucesso")
    except Exception as erro:
        con.rollback()
        return resposta(f"Erro ao excluir aula: {erro}", 500)
    finally:
        cursor.close()
        con.close()
