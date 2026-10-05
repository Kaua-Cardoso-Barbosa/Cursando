import io
from datetime import datetime, timedelta

from flask import Response, jsonify, request
from flask_jwt_extended import get_jwt, get_jwt_identity, jwt_required, verify_jwt_in_request

from app import app
from banco import get_db
from professor import de_blob_texto, para_blob_texto


_schema_pronto = False


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
            "LOG_GRAVACAO",
            """
            CREATE TABLE LOG_GRAVACAO (
                ID_LOG INTEGER NOT NULL PRIMARY KEY,
                ID_USUARIO INTEGER,
                ACAO VARCHAR(20) NOT NULL,
                TABELA_AFETADA VARCHAR(80),
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
        con.commit()
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


def exigir_tipo(*tipos):
    tipo = int(get_jwt().get("tipo", -1))
    if tipo not in tipos:
        return resposta("Acesso negado para este perfil.", 403)
    return None


def registrar_log(acao, detalhes="", tabela=None):
    try:
        garantir_sprint_schema()
        id_usuario = get_jwt_identity()
        tipo = get_jwt().get("tipo") if get_jwt() else None
        con = get_db()
        cursor = con.cursor()
        nome = email = None

        if id_usuario:
            cursor.execute("SELECT NOME, EMAIL FROM USUARIOS WHERE ID_USUARIO = ?", (id_usuario,))
            usuario = cursor.fetchone()
            if usuario:
                nome, email = usuario

        cursor.execute(
            """
            INSERT INTO LOG_ACOES (
                ID_LOG, ID_USUARIO, TIPO_USUARIO, NOME, EMAIL, ACAO, ROTA, METODO, DETALHES
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                proximo_id(cursor, "LOG_ACOES", "ID_LOG"),
                id_usuario,
                tipo,
                nome,
                email,
                acao,
                request.path[:300],
                request.method,
                para_blob_texto(detalhes),
            ),
        )

        if request.method in {"POST", "PUT", "PATCH", "DELETE"}:
            cursor.execute(
                """
                INSERT INTO LOG_GRAVACAO (ID_LOG, ID_USUARIO, ACAO, TABELA_AFETADA, DETALHES)
                VALUES (?, ?, ?, ?, ?)
                """,
                (
                    proximo_id(cursor, "LOG_GRAVACAO", "ID_LOG"),
                    id_usuario,
                    request.method,
                    tabela,
                    para_blob_texto(detalhes),
                ),
            )

        con.commit()
    except Exception as erro:
        print("Erro ao registrar log:", erro)
    finally:
        try:
            cursor.close()
            con.close()
        except Exception:
            pass


@app.after_request
def registrar_modificacoes(response):
    if request.path.startswith("/static") or request.path.startswith("/admin/logs"):
        return response

    if request.method in {"POST", "PUT", "PATCH", "DELETE"} and response.status_code < 400:
        try:
            verify_jwt_in_request(optional=True)
            registrar_log("requisicao_modificacao", f"{request.method} {request.path}")
        except Exception as erro:
            print("Erro no log automatico:", erro)

    return response


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
        if request.method == "GET":
            cursor.execute(
                """
                SELECT M.ID_MODULO, M.ID_CURSO, M.TITULO, M.DESCRICAO, M.IMAGEM_URL, M.ORDEM
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
                }
                for row in cursor.fetchall()
            ])

        dados = request.get_json() or {}
        titulo = (dados.get("titulo") or "").strip()
        descricao = (dados.get("descricao") or "").strip()
        ordem = int(dados.get("ordem") or 0)

        if not titulo:
            return resposta("Titulo do modulo e obrigatorio.", 400)

        id_modulo = proximo_id(cursor, "MODULOS_CURSO", "ID_MODULO")
        # Sprint item 6: cadastra modulos para organizar aulas dentro do curso.
        cursor.execute(
            """
            INSERT INTO MODULOS_CURSO (ID_MODULO, ID_CURSO, TITULO, DESCRICAO, ORDEM)
            VALUES (?, ?, ?, ?, ?)
            """,
            (id_modulo, id_curso, titulo, para_blob_texto(descricao), ordem),
        )
        con.commit()
        registrar_log("criar_modulo", f"Modulo {titulo} criado no curso {id_curso}", "MODULOS_CURSO")
        return resposta("Modulo criado com sucesso.", 201, "sucesso", id_modulo=id_modulo)
    except Exception as erro:
        con.rollback()
        return resposta(f"Erro ao processar modulos: {erro}", 500)
    finally:
        cursor.close()
        con.close()


@app.route("/professor/cursos/<int:id_curso>/materiais", methods=["GET", "POST"])
@jwt_required()
def materiais_professor(id_curso):
    negado = exigir_tipo(1)
    if negado:
        return negado

    garantir_sprint_schema()
    con = get_db()
    cursor = con.cursor()

    try:
        if request.method == "GET":
            cursor.execute(
                """
                SELECT ID_MATERIAL, TITULO, TIPO, URL, DESCRICAO
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
                }
                for row in cursor.fetchall()
            ])

        dados = request.get_json() or {}
        titulo = (dados.get("titulo") or "").strip()
        tipo = (dados.get("tipo") or "link").strip().lower()
        url = (dados.get("url") or "").strip()
        descricao = (dados.get("descricao") or "").strip()

        if not titulo or not url:
            return resposta("Titulo e URL do material sao obrigatorios.", 400)

        id_material = proximo_id(cursor, "MATERIAIS_CURSO", "ID_MATERIAL")
        # Sprint item 21: registra complementos do curso como links, PDFs e apostilas.
        cursor.execute(
            """
            INSERT INTO MATERIAIS_CURSO (ID_MATERIAL, ID_CURSO, TITULO, TIPO, URL, DESCRICAO)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (id_material, id_curso, titulo, tipo, url, para_blob_texto(descricao)),
        )
        con.commit()
        registrar_log("criar_material", f"Material {titulo} criado no curso {id_curso}", "MATERIAIS_CURSO")
        return resposta("Material cadastrado com sucesso.", 201, "sucesso", id_material=id_material)
    except Exception as erro:
        con.rollback()
        return resposta(f"Erro ao processar materiais: {erro}", 500)
    finally:
        cursor.close()
        con.close()


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
        cursor.execute(
            """
            SELECT ID_MATERIAL, TITULO, TIPO, URL, DESCRICAO
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
                "url": row[3] if matriculado else "",
                "descricao": de_blob_texto(row[4]),
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
        registrar_log("avaliar_curso", f"Curso {id_curso} avaliado com nota {nota}", "AVALIACOES_CURSO")
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

        codigo = f"CERT-{id_curso}-{get_jwt_identity()}-{datetime.now().strftime('%Y%m%d')}"
        cursor.execute(
            """
            UPDATE OR INSERT INTO CERTIFICADOS (ID_CERTIFICADO, ID_CURSO, ID_USUARIO, CODIGO)
            VALUES (?, ?, ?, ?)
            MATCHING (ID_CURSO, ID_USUARIO)
            """,
            (proximo_id(cursor, "CERTIFICADOS", "ID_CERTIFICADO"), id_curso, get_jwt_identity(), codigo),
        )
        con.commit()
        # Sprint item 5: gera um PDF simples de certificado para download.
        pdf = _pdf_simples(
            "Certificado de Conclusao",
            [
                f"Aluno: {row[0]}",
                f"Curso: {row[1]}",
                f"Codigo: {codigo}",
                f"Emitido em: {datetime.now().strftime('%d/%m/%Y')}",
            ],
        )
        return Response(
            pdf,
            mimetype="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=certificado-{id_curso}.pdf"},
        )
    except Exception as erro:
        con.rollback()
        return resposta(f"Erro ao gerar certificado: {erro}", 500)
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
    termo = (request.args.get("busca") or "").lower()
    tipo = request.args.get("tipo")
    con = get_db()
    cursor = con.cursor()

    try:
        filtros = []
        params = []
        if termo:
            filtros.append("(LOWER(NOME) LIKE ? OR LOWER(EMAIL) LIKE ? OR LOWER(ACAO) LIKE ?)")
            params.extend([f"%{termo}%", f"%{termo}%", f"%{termo}%"])
        if tipo not in (None, ""):
            filtros.append("TIPO_USUARIO = ?")
            params.append(int(tipo))
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
        valor_assinatura = float(app.config.get("VALOR_ASSINATURA", 0) or 0)
        cursor.execute("SELECT COUNT(*) FROM ASSINATURAS WHERE STATUS = 1")
        assinaturas_ativas = int((cursor.fetchone() or (0,))[0] or 0)
        total_arrecadado = assinaturas_ativas * valor_assinatura

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
            estimado = alunos * valor_assinatura * 0.5
            cursor.execute(
                "SELECT COALESCE(CAST(SUM(VALOR) AS DOUBLE PRECISION), 0) FROM SAQUES_INSTRUTOR WHERE ID_USUARIO = ?",
                (id_usuario,),
            )
            sacado = float((cursor.fetchone() or (0,))[0] or 0)
            # Sprint itens 12, 30 e 31: resumo financeiro inicial do instrutor baseado no pool de receita.
            return jsonify({
                "perfil": "instrutor",
                "recebido_estimado": round(estimado, 2),
                "disponivel_saque": round(max(estimado - sacado, 0), 2),
                "ja_sacado": round(sacado, 2),
                "alunos_ativos": alunos,
            })

        if tipo == 0:
            cursor.execute(
                "SELECT COALESCE(CAST(SUM(VALOR) AS DOUBLE PRECISION), 0) FROM CUSTOS_PLATAFORMA"
            )
            custos = float((cursor.fetchone() or (0,))[0] or 0)
            repasse_estimado = total_arrecadado * 0.5
            # Sprint itens 13, 14, 15 e 16: indicadores financeiros administrativos iniciais.
            return jsonify({
                "perfil": "admin",
                "total_arrecadado": round(total_arrecadado, 2),
                "total_repassado_estimado": round(repasse_estimado, 2),
                "custos": round(custos, 2),
                "saldo_caixa": round(total_arrecadado - repasse_estimado - custos, 2),
                "assinaturas_ativas": assinaturas_ativas,
            })

        cursor.execute(
            "SELECT COUNT(*) FROM ASSINATURAS WHERE ID_USUARIO = ?",
            (id_usuario,),
        )
        qtd = int((cursor.fetchone() or (0,))[0] or 0)
        gasto = qtd * valor_assinatura
        # Sprint itens 33 e 34: resumo inicial de faturas do aluno.
        return jsonify({
            "perfil": "aluno",
            "faturas": qtd or 0,
            "total_gasto": float(gasto or 0),
        })
    except Exception as erro:
        return resposta(f"Erro ao carregar financeiro: {erro}", 500)
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
    valor = float((request.get_json() or {}).get("valor") or 0)
    if valor <= 0:
        return resposta("Valor de saque invalido.", 400)

    con = get_db()
    cursor = con.cursor()

    try:
        # Sprint item 32: registra a solicitacao de saque; a liquidacao ARKHE fica pendente de endpoint do provedor.
        cursor.execute(
            """
            INSERT INTO SAQUES_INSTRUTOR (ID_SAQUE, ID_USUARIO, VALOR, STATUS)
            VALUES (?, ?, ?, 0)
            """,
            (proximo_id(cursor, "SAQUES_INSTRUTOR", "ID_SAQUE"), get_jwt_identity(), valor),
        )
        con.commit()
        registrar_log("solicitar_saque", f"Saque solicitado no valor {valor}", "SAQUES_INSTRUTOR")
        return resposta("Solicitacao de saque registrada.", 201, "sucesso")
    except Exception as erro:
        con.rollback()
        return resposta(f"Erro ao solicitar saque: {erro}", 500)
    finally:
        cursor.close()
        con.close()
