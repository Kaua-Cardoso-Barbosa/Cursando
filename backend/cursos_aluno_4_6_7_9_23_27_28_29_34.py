
import math
from datetime import datetime
from flask import jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from app import app
from banco_37 import get_db
from professor_6 import aula_para_dict, de_blob_texto



from aluno_4_34 import curso_publico_para_dict, exigir_aluno, exigir_assinatura_ativa, query_cursos_base, resposta
from auditoria_24_37 import garantir_gatilhos_auditoria

# Sprint item 6 - Permitir que o instrutor divida o curso em módulos
# Sprint item 27 - Permitir que o aluno avalie o curso após a conclusão
# Sprint item 34 - Exibir faturas em aberto
@app.route("/aluno/cursos/<int:id_curso>", methods=["GET"])
@jwt_required()
def detalhe_curso_aluno(id_curso):
    
    negado = exigir_aluno()
    if negado:
        return negado

    id_aluno = get_jwt_identity()
    
    from estrutura_banco_6_9_19_20_21_32_36 import garantir_estrutura_banco
    from utilitarios_backend_5_9_20_28_34 import registrar_evento_curso
    garantir_estrutura_banco()
    con = get_db()
    cursor = con.cursor()

    try:
        garantir_tabela_progresso(con)
        cursor.execute(
            query_cursos_base("AND C.ID_CURSO = ?"),
            (id_aluno, id_aluno, id_curso),
        )
        row = cursor.fetchone()

        if not row:
            return resposta("Curso nao encontrado.", 404)

        
        bloqueio = exigir_assinatura_ativa(cursor, id_aluno)
        if bloqueio:
            return bloqueio

        registrar_evento_curso(cursor, id_curso, id_aluno, "ACESSO")

        curso = curso_publico_para_dict(row)

        cursor.execute(
            """
            SELECT ID_MODULO, TITULO, DESCRICAO, IMAGEM_URL, ORDEM
            FROM MODULOS_CURSO
            WHERE ID_CURSO = ? AND STATUS = 1
            ORDER BY ORDEM, ID_MODULO
            """,
            (id_curso,),
        )
        modulos = [
            {
                "id": row[0],
                "id_curso": id_curso,
                "titulo": row[1],
                "descricao": de_blob_texto(row[2]),
                "imagem": row[3],
                "ordem": row[4] or 0,
                "aulas": [],
            }
            for row in cursor.fetchall()
        ]
        modulos_por_id = {int(modulo["id"]): modulo for modulo in modulos}

        cursor.execute(
            """
            SELECT V.ID_VIDEO, V.ID_CURSO, V.TITULO, V.DESCRICAO, V.VIDEO_URL, V.STATUS, V.ID_MODULO,
                   CASE WHEN PA.ID_VIDEO IS NULL THEN 0 ELSE 1 END,
                   COALESCE(PR.POSICAO_SEGUNDOS, 0)
            FROM VIDEOS V
            LEFT JOIN PROGRESSO_AULAS PA ON PA.ID_VIDEO = V.ID_VIDEO AND PA.ID_USUARIO = ?
            LEFT JOIN PROGRESSO_REPRODUCAO PR ON PR.ID_VIDEO = V.ID_VIDEO AND PR.ID_USUARIO = ?
            WHERE V.ID_CURSO = ? AND V.EXCLUIDO = 0 AND V.STATUS = 1
              AND (V.ID_MODULO IS NULL OR EXISTS (
                  SELECT 1 FROM MODULOS_CURSO MC WHERE MC.ID_MODULO = V.ID_MODULO AND MC.STATUS = 1
              ))
            ORDER BY V.POSICAO_PLAYLIST, V.DATA_UPLOAD, V.ID_VIDEO
            """,
            (id_aluno, id_aluno, id_curso),
        )
        aulas = []
        for aula_row in cursor.fetchall():
            aula = aula_para_dict(aula_row[:6])
            aula["id_modulo"] = aula_row[6]
            aula["assistida"] = bool(aula_row[7])
            aula["progresso_segundos"] = float(aula_row[8] or 0)
            if not curso["matriculado"]:
                aula["video"] = ""
                aula["progresso_segundos"] = 0
            aulas.append(aula)
            modulo = modulos_por_id.get(int(aula["id_modulo"])) if aula["id_modulo"] is not None else None
            if modulo:
                modulo["aulas"].append(aula)

        for modulo in modulos:
            modulo["total_aulas"] = len(modulo["aulas"])

        
        cursor.execute(
            """
            SELECT A.ID_AVALIACAO, U.NOME, U.IMAGEM_PERFIL, A.NOTA, A.COMENTARIO
            FROM AVALIACOES_CURSO A
            JOIN USUARIOS U ON U.ID_USUARIO = A.ID_USUARIO
            WHERE A.ID_CURSO = ?
            ORDER BY A.CRIADO_EM DESC, A.ID_AVALIACAO DESC
            """,
            (id_curso,),
        )
        avaliacoes = [
            {
                "id": avaliacao_row[0],
                "nome": avaliacao_row[1] or "Aluno",
                "imagem_perfil": avaliacao_row[2],
                "nota": int(avaliacao_row[3] or 0),
                "comentario": de_blob_texto(avaliacao_row[4]) or "",
            }
            for avaliacao_row in cursor.fetchall()
        ]

        con.commit()
        return jsonify({"curso": curso, "modulos": modulos, "aulas": aulas, "avaliacoes": avaliacoes})
    except Exception as erro:
        return resposta(f"Erro ao carregar curso: {erro}", 500)
    finally:
        cursor.close()
        con.close()
# Fim item 34
# Fim item 27
# Fim item 6



# Sprint item 9 - Exibir acessos aos cursos, compras realizadas e taxa de conversão
@app.route("/aluno/cursos/<int:id_curso>/inscrever", methods=["POST"])
@jwt_required()
def inscrever_curso(id_curso):
    
    negado = exigir_aluno()
    if negado:
        return negado

    id_aluno = get_jwt_identity()
    from estrutura_banco_6_9_19_20_21_32_36 import garantir_estrutura_banco
    from utilitarios_backend_5_9_20_28_34 import registrar_evento_curso
    garantir_estrutura_banco()
    con = get_db()
    cursor = con.cursor()

    try:
        bloqueio = exigir_assinatura_ativa(cursor, id_aluno)
        if bloqueio:
            return bloqueio

        cursor.execute(
            "SELECT 1 FROM CURSOS WHERE ID_CURSO = ? AND STATUS = 1 AND EXCLUIDO = 0",
            (id_curso,),
        )

        if not cursor.fetchone():
            return resposta("Curso nao encontrado ou indisponivel.", 404)

        
        registrar_evento_curso(cursor, id_curso, id_aluno, "ACESSO")

        cursor.execute(
            "SELECT STATUS_MATRICULA FROM MATRICULAS WHERE ID_USUARIO = ? AND ID_CURSO = ?",
            (id_aluno, id_curso),
        )
        matricula = cursor.fetchone()

        if matricula:
            
            
            cursor.execute(
                """
                UPDATE MATRICULAS
                SET STATUS_MATRICULA = 1,
                    PROGRESSO = COALESCE(PROGRESSO, 0)
                WHERE ID_USUARIO = ? AND ID_CURSO = ?
                """,
                (id_aluno, id_curso),
            )
        else:
            cursor.execute(
                "INSERT INTO MATRICULAS (ID_USUARIO, ID_CURSO, STATUS_MATRICULA, PROGRESSO) VALUES (?, ?, 1, 0)",
                (id_aluno, id_curso),
            )

        if not matricula or int(matricula[0] or 0) != 1:
            
            registrar_evento_curso(cursor, id_curso, id_aluno, "INSCRICAO")

        con.commit()
        return resposta("Inscricao realizada com sucesso.", 200, "sucesso")
    except Exception as erro:
        con.rollback()
        return resposta(f"Erro ao realizar inscricao: {erro}", 500)
    finally:
        cursor.close()
        con.close()
# Fim item 9


# Sprint item 28 - Permitir filtro de cursos por tema, categoria e avaliação
# Sprint item 29 - Criar recomendação inteligente de cursos com base nas buscas e compras recentes do aluno
@app.route("/aluno/descobrir", methods=["GET"])
@jwt_required()
def descobrir_cursos():
    
    
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
# Fim item 29
# Fim item 28




# Sprint item 4 - Salvar o progresso das aulas para que o aluno continue de onde parou
# Sprint item 7 - Criar métricas para o instrutor: alunos, conclusões, módulos concluídos e horas assistidas
# Sprint item 23 - Exibir relatórios de alunos, cursos, módulos e horas assistidas
def garantir_tabela_progresso(con):
    
    cursor = con.cursor()

    try:
        cursor.execute(
            """
            SELECT 1
            FROM RDB$RELATIONS
            WHERE RDB$RELATION_NAME = 'PROGRESSO_AULAS'
            """
        )

        if cursor.fetchone():
            progresso_existe = True
        else:
            progresso_existe = False

        if not progresso_existe:
            cursor.execute(
                """
                CREATE TABLE PROGRESSO_AULAS (
                    ID_USUARIO INTEGER NOT NULL,
                    ID_VIDEO INTEGER NOT NULL,
                    ASSISTIDO_EM TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    CONSTRAINT PK_PROGRESSO_AULAS PRIMARY KEY (ID_USUARIO, ID_VIDEO)
                )
                """
            )

        cursor.execute(
            """
            SELECT 1
            FROM RDB$RELATIONS
            WHERE RDB$RELATION_NAME = 'PROGRESSO_REPRODUCAO'
            """
        )
        if not cursor.fetchone():
            
            cursor.execute(
                """
                CREATE TABLE PROGRESSO_REPRODUCAO (
                    ID_USUARIO INTEGER NOT NULL,
                    ID_VIDEO INTEGER NOT NULL,
                    POSICAO_SEGUNDOS DOUBLE PRECISION DEFAULT 0 NOT NULL,
                    ATUALIZADO_EM TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    CONSTRAINT PK_PROGRESSO_REPRODUCAO PRIMARY KEY (ID_USUARIO, ID_VIDEO)
                )
                """
            )

        
        cursor.execute(
            """
            SELECT 1
            FROM RDB$RELATIONS
            WHERE RDB$RELATION_NAME = 'TEMPO_ASSISTIDO_AULAS'
            """
        )
        if not cursor.fetchone():
            cursor.execute(
                """
                CREATE TABLE TEMPO_ASSISTIDO_AULAS (
                    ID_USUARIO INTEGER NOT NULL,
                    ID_VIDEO INTEGER NOT NULL,
                    SEGUNDOS_ASSISTIDOS DOUBLE PRECISION DEFAULT 0 NOT NULL,
                    CONSTRAINT PK_TEMPO_ASSISTIDO_AULAS PRIMARY KEY (ID_USUARIO, ID_VIDEO)
                )
                """
            )

        
        cursor.execute(
            """
            SELECT 1 FROM RDB$RELATIONS
            WHERE RDB$RELATION_NAME = 'TEMPO_ASSISTIDO_AULAS_MENSAL'
            """
        )
        if not cursor.fetchone():
            cursor.execute(
                """
                CREATE TABLE TEMPO_ASSISTIDO_AULAS_MENSAL (
                    ID_USUARIO INTEGER NOT NULL,
                    ID_VIDEO INTEGER NOT NULL,
                    MES_REFERENCIA DATE NOT NULL,
                    SEGUNDOS_ASSISTIDOS DOUBLE PRECISION DEFAULT 0 NOT NULL,
                    CONSTRAINT PK_TEMPO_ASSISTIDO_MES PRIMARY KEY (ID_USUARIO, ID_VIDEO, MES_REFERENCIA)
                )
                """
            )

        for nome, ddl in {
            "CATEGORIAS_CURSO": """
                CREATE TABLE CATEGORIAS_CURSO (
                    ID_CATEGORIA INTEGER NOT NULL PRIMARY KEY,
                    NOME VARCHAR(120) NOT NULL,
                    NOME_NORMALIZADO VARCHAR(120) NOT NULL
                )
            """,
            "TEMAS_CURSO": """
                CREATE TABLE TEMAS_CURSO (
                    ID_TEMA INTEGER NOT NULL PRIMARY KEY,
                    NOME VARCHAR(120) NOT NULL,
                    NOME_NORMALIZADO VARCHAR(120) NOT NULL
                )
            """,
            "CURSO_TAXONOMIA": """
                CREATE TABLE CURSO_TAXONOMIA (
                    ID_CURSO INTEGER NOT NULL PRIMARY KEY,
                    ID_CATEGORIA INTEGER,
                    ID_TEMA INTEGER
                )
            """,
        }.items():
            cursor.execute(
                "SELECT 1 FROM RDB$RELATIONS WHERE RDB$RELATION_NAME = ?",
                (nome,),
            )
            if not cursor.fetchone():
                cursor.execute(ddl)
        con.commit()
        garantir_gatilhos_auditoria({
            "PROGRESSO_AULAS",
            "CATEGORIAS_CURSO",
            "TEMAS_CURSO",
            "CURSO_TAXONOMIA",
        })
    except Exception:
        con.rollback()
        raise
    finally:
        cursor.close()
# Fim item 23
# Fim item 7
# Fim item 4







# Sprint item 4 - Salvar o progresso das aulas para que o aluno continue de onde parou
# Sprint item 7 - Criar métricas para o instrutor: alunos, conclusões, módulos concluídos e horas assistidas
# Sprint item 23 - Exibir relatórios de alunos, cursos, módulos e horas assistidas
@app.route("/aluno/aulas/<int:id_aula>/progresso", methods=["PUT"])
@jwt_required()
def salvar_progresso_aula(id_aula):
    
    negado = exigir_aluno()
    if negado:
        return negado

    dados = request.get_json(silent=True) or {}
    valor_posicao = dados.get("posicao_segundos", 0)
    if isinstance(valor_posicao, bool):
        return resposta("A posicao da aula e invalida.", 400)

    try:
        posicao = float(valor_posicao)
    except (TypeError, ValueError):
        return resposta("A posicao da aula e invalida.", 400)

    if not math.isfinite(posicao) or posicao < 0 or posicao > 604800:
        return resposta("A posicao da aula e invalida.", 400)

    id_aluno = get_jwt_identity()
    con = get_db()
    cursor = con.cursor()

    try:
        garantir_tabela_progresso(con)
        bloqueio = exigir_assinatura_ativa(cursor, id_aluno)
        if bloqueio:
            return bloqueio

        cursor.execute(
            """
            SELECT 1
            FROM VIDEOS V
            JOIN CURSOS C ON C.ID_CURSO = V.ID_CURSO
            JOIN MATRICULAS M ON M.ID_CURSO = C.ID_CURSO
            WHERE V.ID_VIDEO = ? AND M.ID_USUARIO = ? AND M.STATUS_MATRICULA = 1
              AND V.EXCLUIDO = 0 AND V.STATUS = 1 AND C.EXCLUIDO = 0 AND C.STATUS = 1
            """,
            (id_aula, id_aluno),
        )
        if not cursor.fetchone():
            return resposta("Aula nao encontrada para seus cursos.", 404)

        
        cursor.execute(
            """
            SELECT POSICAO_SEGUNDOS,
                   DATEDIFF(MILLISECOND FROM ATUALIZADO_EM TO CURRENT_TIMESTAMP)
            FROM PROGRESSO_REPRODUCAO
            WHERE ID_USUARIO = ? AND ID_VIDEO = ?
            """,
            (id_aluno, id_aula),
        )
        progresso_anterior = cursor.fetchone()
        if progresso_anterior:
            posicao_anterior = float(progresso_anterior[0] or 0)
            segundos_transcorridos = max(0, float(progresso_anterior[1] or 0) / 1000)
            
            
            
            segundos_novos = min(max(0.0, posicao - posicao_anterior), segundos_transcorridos)
            if segundos_novos > 0:
                cursor.execute(
                    """
                    UPDATE TEMPO_ASSISTIDO_AULAS
                    SET SEGUNDOS_ASSISTIDOS = SEGUNDOS_ASSISTIDOS + ?
                    WHERE ID_USUARIO = ? AND ID_VIDEO = ?
                    """,
                    (segundos_novos, id_aluno, id_aula),
                )
                if cursor.rowcount == 0:
                    cursor.execute(
                        """
                        INSERT INTO TEMPO_ASSISTIDO_AULAS (ID_USUARIO, ID_VIDEO, SEGUNDOS_ASSISTIDOS)
                        VALUES (?, ?, ?)
                        """,
                        (id_aluno, id_aula, segundos_novos),
                    )
                
                mes_referencia = datetime.now().date().replace(day=1)
                cursor.execute(
                    """
                    UPDATE TEMPO_ASSISTIDO_AULAS_MENSAL
                    SET SEGUNDOS_ASSISTIDOS = SEGUNDOS_ASSISTIDOS + ?
                    WHERE ID_USUARIO = ? AND ID_VIDEO = ? AND MES_REFERENCIA = ?
                    """,
                    (segundos_novos, id_aluno, id_aula, mes_referencia),
                )
                if cursor.rowcount == 0:
                    cursor.execute(
                        """
                        INSERT INTO TEMPO_ASSISTIDO_AULAS_MENSAL
                            (ID_USUARIO, ID_VIDEO, MES_REFERENCIA, SEGUNDOS_ASSISTIDOS)
                        VALUES (?, ?, ?, ?)
                        """,
                        (id_aluno, id_aula, mes_referencia, segundos_novos),
                    )

        
        
        
        cursor.execute(
            """
            UPDATE OR INSERT INTO PROGRESSO_REPRODUCAO (
                ID_USUARIO, ID_VIDEO, POSICAO_SEGUNDOS, ATUALIZADO_EM
            )
            VALUES (?, ?, ?, CURRENT_TIMESTAMP)
            MATCHING (ID_USUARIO, ID_VIDEO)
            """,
            (id_aluno, id_aula, posicao),
        )
        con.commit()
        return resposta("Progresso da aula salvo.", 200, "sucesso", posicao_segundos=posicao)
    except Exception as erro:
        con.rollback()
        return resposta(f"Erro ao salvar progresso da aula: {erro}", 500)
    finally:
        cursor.close()
        con.close()
# Fim item 23
# Fim item 7
# Fim item 4



# Sprint item 4 - Salvar o progresso das aulas para que o aluno continue de onde parou
@app.route("/aluno/aulas/<int:id_aula>/assistir", methods=["POST"])
@jwt_required()
def marcar_aula_assistida(id_aula):
    
    negado = exigir_aluno()
    if negado:
        return negado

    id_aluno = get_jwt_identity()
    con = get_db()
    cursor = con.cursor()

    try:
        garantir_tabela_progresso(con)
        bloqueio = exigir_assinatura_ativa(cursor, id_aluno)
        if bloqueio:
            return bloqueio

        cursor.execute(
            """
            SELECT 1
            FROM VIDEOS V
            JOIN CURSOS C ON C.ID_CURSO = V.ID_CURSO
            JOIN MATRICULAS M ON M.ID_CURSO = C.ID_CURSO
            WHERE V.ID_VIDEO = ? AND M.ID_USUARIO = ? AND M.STATUS_MATRICULA = 1
              AND V.EXCLUIDO = 0 AND V.STATUS = 1 AND C.EXCLUIDO = 0 AND C.STATUS = 1
            """,
            (id_aula, id_aluno),
        )

        if not cursor.fetchone():
            return resposta("Aula nao encontrada para seus cursos.", 404)

        cursor.execute(
            """
            UPDATE OR INSERT INTO PROGRESSO_AULAS (ID_USUARIO, ID_VIDEO, ASSISTIDO_EM)
            VALUES (?, ?, CURRENT_TIMESTAMP)
            MATCHING (ID_USUARIO, ID_VIDEO)
            """,
            (id_aluno, id_aula),
        )
        
        cursor.execute(
            "DELETE FROM PROGRESSO_REPRODUCAO WHERE ID_USUARIO = ? AND ID_VIDEO = ?",
            (id_aluno, id_aula),
        )
        cursor.execute(
            """
            UPDATE MATRICULAS M
            SET PROGRESSO = (
                SELECT
                    CASE
                        WHEN COUNT(V.ID_VIDEO) = 0 THEN 0
                        ELSE CAST((COUNT(PA.ID_VIDEO) * 100.0 / COUNT(V.ID_VIDEO)) AS INTEGER)
                    END
                FROM VIDEOS V
                LEFT JOIN PROGRESSO_AULAS PA
                    ON PA.ID_VIDEO = V.ID_VIDEO
                   AND PA.ID_USUARIO = M.ID_USUARIO
                WHERE V.ID_CURSO = M.ID_CURSO
                  AND V.EXCLUIDO = 0
                  AND V.STATUS = 1
            )
            WHERE M.ID_USUARIO = ?
              AND M.ID_CURSO = (
                  SELECT V2.ID_CURSO
                  FROM VIDEOS V2
                  WHERE V2.ID_VIDEO = ?
              )
            """,
            (id_aluno, id_aula),
        )
        con.commit()
        return resposta("Aula marcada como assistida.", 200, "sucesso")
    except Exception as erro:
        con.rollback()
        return resposta(f"Erro ao atualizar progresso: {erro}", 500)
    finally:
        cursor.close()
        con.close()
# Fim item 4
