

import json

from flask import jsonify, request
from flask_jwt_extended import jwt_required

from app import app
from banco_37 import get_db
from log_banco_37 import get_log_db
from professor_7 import de_blob_texto


from estrutura_banco_1_5_6_9_15_19_20_21_27_28_32_33_36_37 import garantir_estrutura_banco
from utilitarios_backend_5_9_12_15_20_24_28_34 import _resumo_detalhes_log, exigir_tipo, resposta



# Sprint item 25 - Permitir acesso e relatórios dos logs somente para o administrador por data e usuário - Restringe os registros ao administrador e aplica filtros por data e usuário
@app.route("/admin/logs", methods=["GET"])
@jwt_required()
def logs_admin():
    
    negado = exigir_tipo(0)
    if negado:
        return negado

    garantir_estrutura_banco()
    termo = (request.args.get("busca") or "").lower().strip()
    tipo = request.args.get("tipo")
    acao = (request.args.get("acao") or "").strip()
    id_usuario_filtro = request.args.get("id_usuario")
    inicio = request.args.get("inicio")
    fim = request.args.get("fim")
    
    con = get_log_db()
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



@app.route("/admin/logs/<int:id_log>", methods=["GET"])
@jwt_required()
def detalhe_log_admin(id_log):
    
    negado = exigir_tipo(0)
    if negado:
        return negado

    garantir_estrutura_banco()
    con = get_log_db()
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

    if tabela == "MODULOS_CURSO" and id_alvo.isdigit():
        cursor.execute("SELECT TITULO, ID_CURSO FROM MODULOS_CURSO WHERE ID_MODULO = ?", (int(id_alvo),))
        registro = cursor.fetchone()
        if registro:
            contexto["modulo"] = registro[0]
            id_curso = registro[1]
        elif dados.get("TITULO"):
            contexto["modulo"] = dados["TITULO"]
    elif tabela == "MATERIAIS_CURSO" and id_alvo.isdigit():
        cursor.execute("SELECT TITULO, ID_CURSO FROM MATERIAIS_CURSO WHERE ID_MATERIAL = ?", (int(id_alvo),))
        registro = cursor.fetchone()
        if registro:
            contexto["material"] = registro[0]
            id_curso = registro[1]
        elif dados.get("TITULO"):
            contexto["material"] = dados["TITULO"]
    elif tabela == "PROVAS_CURSO" and id_alvo.isdigit():
        cursor.execute("SELECT TITULO, ID_CURSO FROM PROVAS_CURSO WHERE ID_PROVA = ?", (int(id_alvo),))
        registro = cursor.fetchone()
        if registro:
            contexto["prova"] = registro[0]
            id_curso = registro[1]
        elif dados.get("TITULO"):
            contexto["prova"] = dados["TITULO"]
    elif tabela in {"RESPOSTAS_PROVA", "QUESTOES_PROVA"} and dados.get("ID_PROVA") is not None:
        cursor.execute("SELECT TITULO, ID_CURSO FROM PROVAS_CURSO WHERE ID_PROVA = ?", (int(dados["ID_PROVA"]),))
        prova = cursor.fetchone()
        if prova:
            contexto["prova"] = prova[0]
            id_curso = prova[1]

    if tabela == "PROGRESSO_AULAS" and dados.get("ID_VIDEO") is not None:
        cursor.execute("SELECT TITULO, ID_CURSO FROM VIDEOS WHERE ID_VIDEO = ?", (int(dados["ID_VIDEO"]),))
        aula = cursor.fetchone()
        if aula:
            contexto["aula"] = aula[0]
            id_curso = aula[1]

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




@app.route("/admin/logs-gravacao", methods=["GET"])
@jwt_required()
def logs_gravacao_admin():
    
    negado = exigir_tipo(0)
    if negado:
        return negado

    garantir_estrutura_banco()
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
            detalhes = de_blob_texto(row[11])
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
                "detalhes": detalhes,
                
                
                "resumo": _resumo_detalhes_log(detalhes) if detalhes else f"{row[3]} em {row[4]}",
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
# Fim item 25

__all__ = ['logs_admin', 'detalhe_log_admin', '_contexto_log_gravacao', 'logs_gravacao_admin']
