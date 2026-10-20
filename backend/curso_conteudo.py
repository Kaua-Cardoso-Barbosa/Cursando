import mimetypes
import os
from uuid import uuid4

from flask import current_app, jsonify, request, send_file
from flask_jwt_extended import get_jwt_identity, jwt_required
from werkzeug.utils import secure_filename

from app import app
from banco import get_db
from professor import de_blob_texto, para_blob_texto, salvar_upload


from sprint_schema import garantir_sprint_schema
from sprint_comum import _aluno_matriculado, _bloqueio_assinatura_aluno, _curso_do_professor, exigir_tipo, proximo_id, resposta



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

__all__ = ['modulos_professor', 'materiais_professor', 'materiais_aluno', 'editar_modulo_professor', 'excluir_material_professor', 'baixar_material_aluno']
