

import mimetypes
import os
from uuid import uuid4

from flask import current_app, jsonify, request, send_file
from flask_jwt_extended import get_jwt_identity, jwt_required
from werkzeug.utils import secure_filename

from app import app
from banco_37 import get_db
from professor_6 import AULA_STATUS_FILTRO, CURSO_STATUS_FILTRO, STATUS_ARQUIVADO, STATUS_NOMES, STATUS_PRIVADO, STATUS_PUBLICADO, converter_video_dash, criar_slug, de_blob_texto, exigir_professor, para_blob_texto, resposta as resposta_professor, salvar_thumb_aula, salvar_upload


from estrutura_banco_6_9_19_20_21_32_36 import garantir_estrutura_banco
from utilitarios_backend_5_9_20_28_34 import _aluno_matriculado, _bloqueio_assinatura_aluno, _curso_do_professor, exigir_tipo, normalizar_taxonomia, proximo_id, resposta



# Sprint item 6 - Permitir que o instrutor divida o curso em módulos
@app.route("/professor/cursos/<int:id_curso>/modulos", methods=["GET", "POST"])
@jwt_required()
def modulos_professor(id_curso):
    
    negado = exigir_tipo(1)
    if negado:
        return negado

    garantir_estrutura_banco()
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
                       M.STATUS,
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
                    "status": row[6],
                    "status_nome": STATUS_NOMES.get(row[6], "desconhecido"),
                    "total_aulas": row[7] or 0,
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
        
        
        
        cursor.execute(
            """
            INSERT INTO MODULOS_CURSO (ID_MODULO, ID_CURSO, TITULO, DESCRICAO, IMAGEM_URL, ORDEM, STATUS)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (id_modulo, id_curso, titulo, para_blob_texto(descricao), imagem["url"] if imagem else None, ordem, STATUS_PUBLICADO),
        )
        con.commit()
        return resposta("Modulo criado com sucesso.", 201, "sucesso", id_modulo=id_modulo)
    except Exception as erro:
        con.rollback()
        return resposta(f"Erro ao processar modulos: {erro}", 500)
    finally:
        cursor.close()
        con.close()
# Fim item 6



# Sprint item 21 - Permitir que o instrutor publique materiais do curso, como livros, apostilas e códigos
@app.route("/professor/cursos/<int:id_curso>/materiais", methods=["GET", "POST"])
@jwt_required()
def materiais_professor(id_curso):
    
    negado = exigir_tipo(1)
    if negado:
        return negado

    garantir_estrutura_banco()
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
# Fim item 21




# Sprint item 21 - Permitir que o instrutor publique materiais do curso, como livros, apostilas e códigos
@app.route("/aluno/cursos/<int:id_curso>/materiais", methods=["GET"])
@jwt_required()
def materiais_aluno(id_curso):
    
    negado = exigir_tipo(2)
    if negado:
        return negado

    garantir_estrutura_banco()
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
# Fim item 21



# Sprint item 6 - Permitir que o instrutor divida o curso em módulos
@app.route("/professor/cursos/<int:id_curso>/modulos/<int:id_modulo>", methods=["PUT"])
@jwt_required()
def editar_modulo_professor(id_curso, id_modulo):
    negado = exigir_tipo(1)
    if negado:
        return negado

    garantir_estrutura_banco()
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
        
        return resposta("Modulo atualizado com sucesso.", 200, "sucesso")
    except Exception as erro:
        con.rollback()
        return resposta(f"Erro ao atualizar modulo: {erro}", 500)
    finally:
        cursor.close()
        con.close()
# Fim item 6


# Sprint item 6 - Permitir que o instrutor divida o curso em módulos
@app.route("/professor/cursos/<int:id_curso>/modulos/<int:id_modulo>/status", methods=["PATCH"])
@jwt_required()
def alterar_status_modulo_professor(id_curso, id_modulo):
    negado = exigir_tipo(1)
    if negado:
        return negado
    try:
        status = int((request.get_json() or {}).get("status"))
    except (TypeError, ValueError):
        return resposta("Status do modulo invalido.", 400)
    if status not in STATUS_NOMES:
        return resposta("Status do modulo invalido.", 400)

    garantir_estrutura_banco()
    con = get_db()
    cursor = con.cursor()
    try:
        if not _curso_do_professor(cursor, id_curso, int(get_jwt_identity())):
            return resposta("Curso nao encontrado.", 404)
        cursor.execute("SELECT STATUS FROM MODULOS_CURSO WHERE ID_MODULO = ? AND ID_CURSO = ?", (id_modulo, id_curso))
        registro = cursor.fetchone()
        if not registro:
            return resposta("Modulo nao encontrado.", 404)
        status_anterior = registro[0]
        cursor.execute(
            "UPDATE MODULOS_CURSO SET STATUS = ?, ATUALIZADO_EM = CURRENT_TIMESTAMP WHERE ID_MODULO = ? AND ID_CURSO = ?",
            (status, id_modulo, id_curso),
        )
        if status != STATUS_PUBLICADO:
            cursor.execute(
                "UPDATE VIDEOS SET STATUS = ?, ATUALIZADO_EM = CURRENT_TIMESTAMP WHERE ID_MODULO = ? AND ID_CURSO = ? AND EXCLUIDO = 0",
                (status, id_modulo, id_curso),
            )
        elif status_anterior == STATUS_ARQUIVADO:
            
            cursor.execute(
                "UPDATE VIDEOS SET STATUS = ?, ATUALIZADO_EM = CURRENT_TIMESTAMP WHERE ID_MODULO = ? AND ID_CURSO = ? AND EXCLUIDO = 0 AND STATUS = ?",
                (STATUS_PRIVADO, id_modulo, id_curso, STATUS_ARQUIVADO),
            )
        con.commit()
        mensagem = ("Modulo publicado. Publique as aulas individualmente para disponibiliza-las aos alunos."
                    if status == STATUS_PUBLICADO else f"Modulo definido como {STATUS_NOMES[status]}.")
        return resposta(mensagem, 200, "sucesso")
    except Exception as erro:
        con.rollback()
        return resposta(f"Erro ao alterar status do modulo: {erro}", 500)
    finally:
        cursor.close()
        con.close()
# Fim item 6


# Sprint item 6 - Permitir que o instrutor divida o curso em módulos
@app.route("/professor/cursos/<int:id_curso>/modulos/<int:id_modulo>", methods=["DELETE"])
@jwt_required()
def excluir_modulo_professor(id_curso, id_modulo):
    negado = exigir_tipo(1)
    if negado:
        return negado
    garantir_estrutura_banco()
    con = get_db()
    cursor = con.cursor()
    try:
        if not _curso_do_professor(cursor, id_curso, int(get_jwt_identity())):
            return resposta("Curso nao encontrado.", 404)
        cursor.execute("SELECT 1 FROM MODULOS_CURSO WHERE ID_MODULO = ? AND ID_CURSO = ?", (id_modulo, id_curso))
        if not cursor.fetchone():
            return resposta("Modulo nao encontrado.", 404)
        cursor.execute("SELECT COUNT(*) FROM VIDEOS WHERE ID_MODULO = ? AND ID_CURSO = ? AND EXCLUIDO = 0", (id_modulo, id_curso))
        if cursor.fetchone()[0]:
            return resposta("Exclua ou mova todas as aulas antes de excluir este modulo.", 409)
        cursor.execute("UPDATE VIDEOS SET ID_MODULO = NULL WHERE ID_MODULO = ? AND ID_CURSO = ? AND EXCLUIDO <> 0", (id_modulo, id_curso))
        cursor.execute("DELETE FROM MODULOS_CURSO WHERE ID_MODULO = ? AND ID_CURSO = ?", (id_modulo, id_curso))
        con.commit()
        return resposta("Modulo excluido com sucesso.", 200, "sucesso")
    except Exception as erro:
        con.rollback()
        return resposta(f"Erro ao excluir modulo: {erro}", 500)
    finally:
        cursor.close()
        con.close()
# Fim item 6




# Sprint item 21 - Permitir que o instrutor publique materiais do curso, como livros, apostilas e códigos
@app.route("/professor/cursos/<int:id_curso>/materiais/<int:id_material>", methods=["DELETE"])
@jwt_required()
def excluir_material_professor(id_curso, id_material):
    negado = exigir_tipo(1)
    if negado:
        return negado
    garantir_estrutura_banco()
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
# Fim item 21




# Sprint item 21 - Permitir que o instrutor publique materiais do curso, como livros, apostilas e códigos
@app.route("/aluno/cursos/<int:id_curso>/materiais/<int:id_material>/arquivo", methods=["GET"])
@jwt_required()
def baixar_material_aluno(id_curso, id_material):
    
    negado = exigir_tipo(2)
    if negado:
        return negado

    garantir_estrutura_banco()
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
# Fim item 21


# Sprint item 28 - Permitir filtro de cursos por tema, categoria e avaliação
@app.route("/taxonomias/<string:tipo>", methods=["GET", "POST"])
@jwt_required()
def taxonomias(tipo):
    
    if tipo not in {"categorias", "temas"}:
        return resposta("Tipo de taxonomia invalido.", 400)

    garantir_estrutura_banco()
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
            nome_tipo = "Categoria" if tipo == "categorias" else "Tema"
            return resposta(f"{nome_tipo} já existe: {existente[1]}. Selecione a opção existente.", 409, id=existente[0], nome=existente[1])

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
# Fim item 28



# Sprint item 28 - Permitir filtro de cursos por tema, categoria e avaliação
@app.route("/professor/cursos/<int:id_curso>/taxonomia", methods=["GET", "PUT"])
@jwt_required()
def taxonomia_curso_professor(id_curso):
    
    negado = exigir_tipo(1)
    if negado:
        return negado

    garantir_estrutura_banco()
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
        for tabela_taxonomia, coluna_taxonomia, valor_id in (
            ("CATEGORIAS_CURSO", "ID_CATEGORIA", id_categoria),
            ("TEMAS_CURSO", "ID_TEMA", id_tema),
        ):
            if valor_id in (None, ""):
                continue
            
            
            try:
                valor_id = int(valor_id)
            except (TypeError, ValueError):
                return resposta("Categoria ou tema invalido.", 400)
            cursor.execute(f"SELECT 1 FROM {tabela_taxonomia} WHERE {coluna_taxonomia} = ?", (valor_id,))
            if not cursor.fetchone():
                return resposta("Categoria ou tema nao encontrado.", 400)
            if coluna_taxonomia == "ID_CATEGORIA":
                id_categoria = valor_id
            else:
                id_tema = valor_id

        
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
# Fim item 28



# Sprint item 6 - Permitir que o instrutor divida o curso em módulos
@app.route("/professor/cursos/<int:id_curso>/aulas", methods=["POST"])
@jwt_required()
def criar_aula_professor(id_curso):
    
    negado = exigir_professor()
    if negado:
        return negado

    
    from estrutura_banco_6_9_19_20_21_32_36 import garantir_estrutura_banco
    garantir_estrutura_banco()

    titulo = (request.form.get("titulo") or "").strip()
    descricao = (request.form.get("descricao") or "").strip()
    id_modulo = request.form.get("id_modulo", type=int)

    if not titulo or not descricao:
        return resposta_professor("Título e descrição são obrigatórios.", 400)

    if not id_modulo:
        return resposta_professor("Selecione um modulo para esta aula.", 400)

    con = get_db()
    cursor = con.cursor()

    try:
        cursor.execute(
            """
            SELECT M.STATUS
            FROM CURSOS C
            JOIN PROFESSORES_CURSO PC ON PC.ID_CURSO = C.ID_CURSO
            JOIN MODULOS_CURSO M ON M.ID_CURSO = C.ID_CURSO
            WHERE C.ID_CURSO = ? AND PC.ID_USUARIO = ? AND C.EXCLUIDO = 0 AND M.ID_MODULO = ?
            """,
            (id_curso, get_jwt_identity(), id_modulo),
        )

        modulo = cursor.fetchone()
        if not modulo:
            return resposta_professor("Curso não encontrado.", 404)

        cursor.execute("SELECT GEN_ID(GEN_VIDEOS_ID, 1) FROM RDB$DATABASE")
        id_aula = cursor.fetchone()[0]

        try:
            video = salvar_upload(
                request.files.get("video"),
                "aulas",
                {"mp4", "webm", "ogg", "mov"}
            )

            if not video:
                return resposta_professor("O vídeo da aula é obrigatório.", 400)

            video_url = converter_video_dash(
                                video["caminho"],
                                id_aula
                            )

            thumb_url = salvar_thumb_aula(id_aula, request.files.get("thumb"))
        except ValueError as erro:
            return resposta_professor(str(erro), 400)

        cursor.execute(
            """
            INSERT INTO VIDEOS (
                ID_VIDEO, ID_CURSO, ID_MODULO, ID_PUBLICO, TITULO, TITULO_SLUG, DESCRICAO,
                POSICAO_PLAYLIST, DURACAO, DATA_UPLOAD, VIDEO_URL, STATUS, EXCLUIDO, ATUALIZADO_EM
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, CURRENT_TIMESTAMP, ?, ?, 0, CURRENT_TIMESTAMP)
            """,
            (id_aula, id_curso, id_modulo, uuid4().hex, titulo, criar_slug(titulo), para_blob_texto(descricao), video_url,
             STATUS_ARQUIVADO if modulo[0] == STATUS_ARQUIVADO else STATUS_PRIVADO),
        )
        con.commit()
        return resposta_professor(
            "Aula cadastrada como arquivada." if modulo[0] == STATUS_ARQUIVADO else "Aula cadastrada como privada.",
            201, "sucesso", id_aula=id_aula, thumb=thumb_url,
        )
    except Exception as erro:
        con.rollback()
        return resposta_professor(f"Erro ao cadastrar aula: {erro}", 500)
    finally:
        cursor.close()
        con.close()
# Fim item 6


# Sprint item 6 - Permitir que o instrutor divida o curso em módulos
@app.route("/professor/aulas/<int:id_aula>/modulo", methods=["PATCH"])
@jwt_required()
def mover_aula_para_modulo(id_aula):
    negado = exigir_professor()
    if negado:
        return negado

    from estrutura_banco_6_9_19_20_21_32_36 import garantir_estrutura_banco
    garantir_estrutura_banco()
    try:
        id_modulo = int((request.get_json() or {}).get("id_modulo"))
    except (TypeError, ValueError):
        return resposta_professor("Selecione um modulo valido.", 400)

    con = get_db()
    cursor = con.cursor()
    try:
        cursor.execute(
            """
            SELECT V.ID_CURSO
            FROM VIDEOS V
            JOIN CURSOS C ON C.ID_CURSO = V.ID_CURSO
            JOIN PROFESSORES_CURSO PC ON PC.ID_CURSO = C.ID_CURSO
            WHERE V.ID_VIDEO = ? AND V.EXCLUIDO = 0 AND C.EXCLUIDO = 0
              AND PC.ID_USUARIO = ?
            """,
            (id_aula, get_jwt_identity()),
        )
        curso = cursor.fetchone()
        if not curso:
            return resposta_professor("Aula nao encontrada.", 404)

        cursor.execute(
            "SELECT STATUS FROM MODULOS_CURSO WHERE ID_MODULO = ? AND ID_CURSO = ?",
            (id_modulo, curso[0]),
        )
        modulo = cursor.fetchone()
        if not modulo:
            return resposta_professor("Modulo nao pertence a este curso.", 400)

        if modulo[0] == STATUS_PUBLICADO:
            cursor.execute("UPDATE VIDEOS SET ID_MODULO = ?, ATUALIZADO_EM = CURRENT_TIMESTAMP WHERE ID_VIDEO = ?", (id_modulo, id_aula))
        else:
            cursor.execute("UPDATE VIDEOS SET ID_MODULO = ?, STATUS = ?, ATUALIZADO_EM = CURRENT_TIMESTAMP WHERE ID_VIDEO = ?", (id_modulo, modulo[0], id_aula))
        con.commit()
        
        return resposta_professor("Aula movida para o modulo.", 200, "sucesso")
    except Exception as erro:
        con.rollback()
        return resposta_professor(f"Erro ao mover aula: {erro}", 500)
    finally:
        cursor.close()
        con.close()
# Fim item 6



# Sprint item 11 - Enviar e-mail aos alunos que já compraram cursos do instrutor quando um novo curso for cadastrado
# Sprint item 20 - Permitir que o instrutor cadastre provas para validar a conclusão do curso
@app.route("/professor/cursos/<int:id_curso>/status", methods=["PATCH"])
@jwt_required()
def alterar_status_curso(id_curso):
    
    negado = exigir_professor()
    if negado:
        return negado

    try:
        status = int((request.get_json() or {}).get("status"))
    except (TypeError, ValueError):
        return resposta_professor("Status inválido.", 400)

    if status not in STATUS_NOMES:
        return resposta_professor("Status inválido.", 400)

    con = get_db()
    cursor = con.cursor()

    try:
        cursor.execute(
            """
            SELECT C.STATUS, C.TITULO
            FROM CURSOS C
            JOIN PROFESSORES_CURSO PC ON PC.ID_CURSO = C.ID_CURSO
            WHERE C.ID_CURSO = ? AND PC.ID_USUARIO = ? AND C.EXCLUIDO = 0
            """,
            (id_curso, get_jwt_identity()),
        )
        curso_atual = cursor.fetchone()
        if not curso_atual:
            return resposta_professor("Curso não encontrado.", 404)
        status_anterior, titulo_curso = curso_atual

        if status == STATUS_PUBLICADO:
            
            try:
                cursor.execute(
                    """
                    SELECT COUNT(*)
                    FROM PROVAS_CURSO
                    WHERE ID_CURSO = ? AND PUBLICADA = 1
                    """,
                    (id_curso,),
                )
                if int((cursor.fetchone() or (0,))[0] or 0) == 0:
                    return resposta_professor("Cadastre e publique uma prova antes de publicar o curso.", 400)
            except Exception:
                return resposta_professor("Cadastre e publique uma prova antes de publicar o curso.", 400)

        
        destinatarios = []
        if status == STATUS_PUBLICADO and status_anterior != STATUS_PUBLICADO:
            cursor.execute(
                """
                SELECT DISTINCT U.EMAIL
                FROM USUARIOS U
                JOIN MATRICULAS M ON M.ID_USUARIO = U.ID_USUARIO
                JOIN PROFESSORES_CURSO PC ON PC.ID_CURSO = M.ID_CURSO
                JOIN CURSOS C ON C.ID_CURSO = PC.ID_CURSO
                WHERE PC.ID_USUARIO = ?
                  AND M.STATUS_MATRICULA = 1
                  AND C.EXCLUIDO = 0
                  AND U.EMAIL IS NOT NULL
                  AND TRIM(U.EMAIL) <> ''
                """,
                (get_jwt_identity(),),
            )
            destinatarios = [row[0] for row in cursor.fetchall()]

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
        if status == STATUS_PUBLICADO and status_anterior != STATUS_PUBLICADO:
            
            from chat_cursos_11_19_20 import notificar_alunos_novo_curso
            notificar_alunos_novo_curso(destinatarios, titulo_curso)
        return resposta_professor(f"Curso definido como {STATUS_NOMES[status]}.", 200, "sucesso")
    except Exception as erro:
        con.rollback()
        return resposta_professor(f"Erro ao alterar status do curso: {erro}", 500)
    finally:
        cursor.close()
        con.close()
# Fim item 20
# Fim item 11
