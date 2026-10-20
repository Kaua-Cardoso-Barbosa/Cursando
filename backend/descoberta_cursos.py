# Rotas da sprint organizadas por assunto; os comentários dos itens seguem junto ao código.
from flask import jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from app import app
from banco import get_db



from aluno import curso_publico_para_dict, exigir_aluno, query_cursos_base, resposta
from progresso_aulas import garantir_tabela_progresso

# Busca cursos públicos por título, com ordenação e opção de ocultar cursos já inscritos.
@app.route("/aluno/descobrir", methods=["GET"])
@jwt_required()
def descobrir_cursos():
    # Sprint item 28: aplica filtros de categoria, tema e avaliação mínima de 1 a 5 estrelas na descoberta.
    negado = exigir_aluno()
    if negado:
        return negado

    id_aluno = get_jwt_identity()
    busca = (request.args.get("busca") or "").strip().lower()
    categoria = (request.args.get("categoria") or "").strip().casefold()
    tema = (request.args.get("tema") or "").strip().casefold()
    avaliacao_min = request.args.get("avaliacao_min")
    if avaliacao_min not in (None, ""):
        try:
            avaliacao_min = int(avaliacao_min)
        except (TypeError, ValueError):
            return resposta("A avaliação deve ser um número inteiro de 1 a 5.", 400)
        if avaliacao_min < 1 or avaliacao_min > 5:
            return resposta("A avaliação deve ser um número inteiro de 1 a 5.", 400)
    filtros = []
    parametros = [id_aluno, id_aluno]

    if busca:
        filtros.append("AND (LOWER(C.TITULO) LIKE ? OR LOWER(COALESCE(CAT.NOME, '')) LIKE ? OR LOWER(COALESCE(TEMA.NOME, '')) LIKE ?)")
        parametros.extend([f"%{busca}%", f"%{busca}%", f"%{busca}%"])

    if categoria:
        filtros.append("AND LOWER(COALESCE(CAT.NOME, '')) = ?")
        parametros.append(categoria)

    if tema:
        filtros.append("AND LOWER(COALESCE(TEMA.NOME, '')) = ?")
        parametros.append(tema)

    if avaliacao_min is not None:
        filtros.append("AND COALESCE((SELECT AVG(A.NOTA) FROM AVALIACOES_CURSO A WHERE A.ID_CURSO = C.ID_CURSO), 0) >= ?")
        parametros.append(avaliacao_min)

    recomendacoes_ativas = request.args.get("recomendados") == "1"
    if recomendacoes_ativas:
        # Sprint item 29: recomenda cursos públicos com categorias ou temas dos cursos do aluno.
        filtros.append(
            """
            AND EXISTS (
                SELECT 1
                FROM MATRICULAS MR
                JOIN CURSO_TAXONOMIA CTR ON CTR.ID_CURSO = MR.ID_CURSO
                WHERE MR.ID_USUARIO = ?
                  AND MR.STATUS_MATRICULA = 1
                  AND (
                    CTR.ID_CATEGORIA = CT.ID_CATEGORIA
                    OR CTR.ID_TEMA = CT.ID_TEMA
                  )
            )
            AND NOT EXISTS (
                SELECT 1 FROM MATRICULAS MX
                WHERE MX.ID_CURSO = C.ID_CURSO
                  AND MX.ID_USUARIO = ?
                  AND MX.STATUS_MATRICULA = 1
            )
            """
        )
        parametros.extend([id_aluno, id_aluno])

    if request.args.get("apenas_novos") == "1":
        filtros.append(
            """
            AND NOT EXISTS (
                SELECT 1 FROM MATRICULAS M
                WHERE M.ID_CURSO = C.ID_CURSO
                  AND M.ID_USUARIO = ?
                  AND M.STATUS_MATRICULA = 1
            )
            """
        )
        parametros.append(id_aluno)

    ordenacoes = {
        "recentes": "C.CRIADO_EM DESC, C.ID_CURSO DESC",
        "populares": "(SELECT COUNT(*) FROM MATRICULAS M WHERE M.ID_CURSO = C.ID_CURSO AND M.STATUS_MATRICULA = 1) DESC, C.CRIADO_EM DESC, C.ID_CURSO DESC",
    }
    if recomendacoes_ativas:
        # Sprint item 29: prioriza categorias e temas que aparecem em mais cursos inscritos.
        ordenacao = """
            (
                COALESCE((SELECT COUNT(DISTINCT MR.ID_CURSO) FROM MATRICULAS MR
                    JOIN CURSO_TAXONOMIA CTR ON CTR.ID_CURSO = MR.ID_CURSO
                    WHERE MR.ID_USUARIO = ? AND MR.STATUS_MATRICULA = 1
                      AND CTR.ID_CATEGORIA = CT.ID_CATEGORIA), 0)
                +
                COALESCE((SELECT COUNT(DISTINCT MR.ID_CURSO) FROM MATRICULAS MR
                    JOIN CURSO_TAXONOMIA CTR ON CTR.ID_CURSO = MR.ID_CURSO
                    WHERE MR.ID_USUARIO = ? AND MR.STATUS_MATRICULA = 1
                      AND CTR.ID_TEMA = CT.ID_TEMA), 0)
            ) DESC,
            COALESCE((SELECT AVG(A.NOTA) FROM AVALIACOES_CURSO A WHERE A.ID_CURSO = C.ID_CURSO), 0) DESC,
            (SELECT COUNT(*) FROM MATRICULAS M WHERE M.ID_CURSO = C.ID_CURSO AND M.STATUS_MATRICULA = 1) DESC,
            C.CRIADO_EM DESC, C.ID_CURSO DESC
        """
        parametros.extend([id_aluno, id_aluno])
    else:
        ordenacao = ordenacoes.get(request.args.get("ordem"), ordenacoes["recentes"])

    con = get_db()
    cursor = con.cursor()

    try:
        garantir_tabela_progresso(con)
        cursor.execute(
            query_cursos_base(f"{' '.join(filtros)} ORDER BY {ordenacao}"),
            tuple(parametros),
        )
        return jsonify([curso_publico_para_dict(row) for row in cursor.fetchall()])
    except Exception as erro:
        return resposta(f"Erro ao listar cursos publicos: {erro}", 500)
    finally:
        cursor.close()
        con.close()

__all__ = ['descobrir_cursos']
