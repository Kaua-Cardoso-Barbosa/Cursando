
from flask import jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from app import app
from banco import get_db


from sprint_schema import garantir_sprint_schema
from sprint_comum import _curso_do_professor, exigir_tipo, normalizar_taxonomia, proximo_id, resposta



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

        # Sprint item 28: rejeita nomes já cadastrados sem diferenciar maiúsculas de minúsculas.
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

        # Sprint item 28: associa ao curso somente categorias e temas existentes.
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

__all__ = ['taxonomias', 'taxonomia_curso_professor']
