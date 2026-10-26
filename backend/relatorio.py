"""métricas e relatórios do professor/admin.

O filtro de identidade entra na consulta SQL antes de somar resultados. Assim,
o professor vê somente seus cursos; o administrador pode filtrar por instrutor.
Visitas e inscrições usam o mês civil; tempo assistido vem de avanços reais do
player. Dados anteriores à coleta mensal não podem ganhar mês retroativo.
``?`` nas consultas representa um parâmetro, evitando juntar texto do usuário
diretamente ao SQL.
"""

from datetime import datetime, timedelta

from flask import Response, jsonify, request
from flask_jwt_extended import get_jwt, get_jwt_identity, jwt_required

from app import app
from banco import get_db


from professor import AULA_STATUS_FILTRO, CURSO_STATUS_FILTRO, STATUS_ARQUIVADO, STATUS_NOMES, STATUS_PRIVADO, STATUS_PUBLICADO, banco_nao_preparado, criar_mensagem, curso_para_dict, exigir_professor, resposta as resposta_professor
from estrutura_banco import garantir_estrutura_banco
from utilitarios_backend import _pdf_simples, exigir_tipo, resposta



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



# Sprint item 22 - Criar relatórios com filtros por período, instrutor e curso. fornece relatórios por período de criação do curso, instrutor e curso; instrutores ficam limitados aos próprios cursos.
@app.route("/relatorios/professor", methods=["GET"])
@jwt_required()
def relatorio_professor():
    """Itens 7, 22 e 23: aplica filtros e agrega progresso por curso e mês.

    O perfil do token decide o limite de acesso antes do SQL: professor só vê
    vínculo próprio; admin pode escolher instrutor. O período filtra criação
    dos cursos, enquanto horas mensais vêm da competência de reprodução.
    """
    garantir_estrutura_banco()
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
        # Sprint item 7 - Criar métricas para o instrutor: alunos, conclusões, módulos concluídos e horas assistidas. prepara progresso e tempo de reprodução para o relatório do instrutor.
        from aluno import garantir_tabela_progresso
        garantir_tabela_progresso(con)

        params = []
        where = ["C.EXCLUIDO = 0"]

        # Sprint item 22 - Criar relatórios com filtros por período, instrutor e curso. a restrição do professor entra no WHERE antes de agregar.
        # Filtrar só a resposta depois da consulta poderia expor outros cursos.
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
        # O período desta seção se refere à criação do curso. A distribuição
        # das horas assistidas por mês é calculada em outra consulta.
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

        # Sprint item 23 - Exibir relatórios de alunos, cursos, módulos e horas assistidas. agrupa alunos inscritos, cursos e módulos criados e horas assistidas por mês.
        mensal = {}
        def linha_mensal(ano, mes):
            # Várias consultas alimentam o mesmo mês. Esta função cria a linha
            # apenas na primeira ocorrência e evita perder os campos já somados.
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

        # Sprint item 23 - Exibir relatórios de alunos, cursos, módulos e horas assistidas. identifica tempo acumulado antes da captura mensal, cuja competência antiga não pode ser recuperada.
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
        # Dados de reprodução anteriores à tabela mensal não têm mês seguro.
        # Mostramos a diferença separadamente, sem inventar uma competência.

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
    """Sprint item 9 - Exibir acessos aos cursos, compras realizadas e taxa de conversão. mede visitas e inscrições do mês civil vigente.

    A taxa divide matrículas do mês pelos acessos únicos; sem acesso, devolve
    zero para evitar divisão por zero no painel.
    """
    negado = exigir_tipo(1)
    if negado:
        return negado

    garantir_estrutura_banco()
    id_instrutor = int(get_jwt_identity())
    hoje = datetime.now().date()
    inicio_mes = hoje.replace(day=1)
    inicio_proximo_mes = (inicio_mes.replace(day=28) + timedelta(days=4)).replace(day=1)
    fim_mes = inicio_proximo_mes - timedelta(days=1)
    con = get_db()
    cursor = con.cursor()

    try:
        # Sprint item 9 - Exibir acessos aos cursos, compras realizadas e taxa de conversão. reúne visitas, inscrições convertidas e alunos ativos apenas no mês civil atual para o instrutor autenticado.
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

# Sprint item 7 - Criar métricas para o instrutor: alunos, conclusões, módulos concluídos e horas assistidas. métricas do painel do professor.
@app.route("/professor/dashboard", methods=["GET"])
@jwt_required()
def professor_dashboard():
    """Sprint item 7 - Criar métricas para o instrutor: alunos, conclusões, módulos concluídos e horas assistidas. conta alunos, aulas, módulos e cursos concluídos.

    Conclusão é contada por aluno e exige todas as aulas publicadas daquela
    unidade. Segundos de reprodução são transformados em horas para a tela.
    """
    negado = exigir_professor()
    if negado:
        return negado

    id_professor = get_jwt_identity()
    # Sprint item 7 - Criar métricas para o instrutor: alunos, conclusões, módulos concluídos e horas assistidas. garante as tabelas de módulos e progresso usadas pelas métricas do painel.
    from estrutura_banco import garantir_estrutura_banco
    from aluno import garantir_tabela_progresso

    garantir_estrutura_banco()
    con = get_db()
    cursor = con.cursor()

    try:
        garantir_tabela_progresso(con)
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

        # Sprint item 7 - Criar métricas para o instrutor: alunos, conclusões, módulos concluídos e horas assistidas. conta cada conclusão de curso por aluno usando somente aulas publicadas.
        cursor.execute(
            """
            SELECT COUNT(DISTINCT CAST(M.ID_USUARIO AS VARCHAR(20)) || '-' || CAST(C.ID_CURSO AS VARCHAR(20)))
            FROM MATRICULAS M
            JOIN CURSOS C ON C.ID_CURSO = M.ID_CURSO
            JOIN PROFESSORES_CURSO PC ON PC.ID_CURSO = C.ID_CURSO
            WHERE PC.ID_USUARIO = ? AND C.EXCLUIDO = 0 AND M.STATUS_MATRICULA = 1
              AND EXISTS (
                  SELECT 1 FROM VIDEOS V
                  WHERE V.ID_CURSO = C.ID_CURSO AND V.EXCLUIDO = 0 AND V.STATUS = 1
              )
              AND NOT EXISTS (
                  SELECT 1
                  FROM VIDEOS V
                  WHERE V.ID_CURSO = C.ID_CURSO AND V.EXCLUIDO = 0 AND V.STATUS = 1
                    AND NOT EXISTS (
                        SELECT 1 FROM PROGRESSO_AULAS PA
                        WHERE PA.ID_VIDEO = V.ID_VIDEO AND PA.ID_USUARIO = M.ID_USUARIO
                    )
              )
            """,
            (id_professor,),
        )
        cursos_concluidos = (cursor.fetchone() or (0,))[0] or 0

        # Sprint item 7 - Criar métricas para o instrutor: alunos, conclusões, módulos concluídos e horas assistidas. conta módulos concluídos por aluno, exigindo ao menos uma aula publicada.
        cursor.execute(
            """
            SELECT COUNT(DISTINCT CAST(M.ID_USUARIO AS VARCHAR(20)) || '-' || CAST(MC.ID_MODULO AS VARCHAR(20)))
            FROM MATRICULAS M
            JOIN CURSOS C ON C.ID_CURSO = M.ID_CURSO
            JOIN PROFESSORES_CURSO PC ON PC.ID_CURSO = C.ID_CURSO
            JOIN MODULOS_CURSO MC ON MC.ID_CURSO = C.ID_CURSO
            WHERE PC.ID_USUARIO = ? AND C.EXCLUIDO = 0 AND M.STATUS_MATRICULA = 1
              AND EXISTS (
                  SELECT 1 FROM VIDEOS V
                  WHERE V.ID_MODULO = MC.ID_MODULO AND V.EXCLUIDO = 0 AND V.STATUS = 1
              )
              AND NOT EXISTS (
                  SELECT 1
                  FROM VIDEOS V
                  WHERE V.ID_MODULO = MC.ID_MODULO AND V.EXCLUIDO = 0 AND V.STATUS = 1
                    AND NOT EXISTS (
                        SELECT 1 FROM PROGRESSO_AULAS PA
                        WHERE PA.ID_VIDEO = V.ID_VIDEO AND PA.ID_USUARIO = M.ID_USUARIO
                    )
              )
            """,
            (id_professor,),
        )
        modulos_concluidos = (cursor.fetchone() or (0,))[0] or 0

        # Sprint item 7 - Criar métricas para o instrutor: alunos, conclusões, módulos concluídos e horas assistidas. transforma os segundos efetivamente registrados em horas assistidas.
        cursor.execute(
            """
            SELECT COALESCE(SUM(T.SEGUNDOS_ASSISTIDOS), 0)
            FROM TEMPO_ASSISTIDO_AULAS T
            JOIN VIDEOS V ON V.ID_VIDEO = T.ID_VIDEO
            JOIN CURSOS C ON C.ID_CURSO = V.ID_CURSO
            JOIN PROFESSORES_CURSO PC ON PC.ID_CURSO = C.ID_CURSO
            WHERE PC.ID_USUARIO = ? AND C.EXCLUIDO = 0 AND V.EXCLUIDO = 0
            """,
            (id_professor,),
        )
        horas_assistidas = round(float((cursor.fetchone() or (0,))[0] or 0) / 3600, 2)

        cursor.execute(
            """
            SELECT FIRST 6
                C.ID_CURSO,
                C.TITULO,
                C.DESCRICAO,
                C.IMAGEM_URL,
                C.STATUS,
                (SELECT COUNT(*) FROM VIDEOS V WHERE V.ID_CURSO = C.ID_CURSO AND V.EXCLUIDO = 0),
                (SELECT COUNT(*) FROM VIDEOS V WHERE V.ID_CURSO = C.ID_CURSO AND V.EXCLUIDO = 0 AND V.STATUS = 1),
                (SELECT COUNT(DISTINCT M.ID_USUARIO) FROM MATRICULAS M WHERE M.ID_CURSO = C.ID_CURSO AND M.STATUS_MATRICULA = 1)
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
                    "cursos_concluidos": cursos_concluidos,
                    "modulos_concluidos": modulos_concluidos,
                    "horas_assistidas": horas_assistidas,
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
                        "cursos_concluidos": 0,
                        "modulos_concluidos": 0,
                        "horas_assistidas": 0,
                    },
                    "recentes": [],
                    "mensagem": criar_mensagem("Banco ainda não preparado para a dashboard do professor.", "erro"),
                }
            )
        return resposta_professor(f"Erro ao carregar dashboard: {erro}", 500)
    finally:
        cursor.close()
        con.close()
