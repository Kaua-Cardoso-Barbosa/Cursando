

import io
import json
import unicodedata
from datetime import datetime

from flask import current_app, jsonify
from flask_jwt_extended import get_jwt

from professor_7 import de_blob_texto



# Sprint item 15 - Exibir saldo disponível em caixa, assinatura de R$ 500 e desconto das comissões no saldo administrativo - Lê e valida o valor configurado para a assinatura
def valor_assinatura_config():
    valor = float(current_app.config["VALOR_ASSINATURA"])
    if valor <= 0:
        raise ValueError("VALOR_ASSINATURA deve ser maior que zero.")
    return round(valor, 2)
# Fim item 15



def resposta(descricao, status=200, tipo="erro", **extra):
    payload = {
        "mensagem": {
            "tipo": tipo,
            "descricao": descricao,
        }
    }
    payload.update(extra)
    return jsonify(payload), status



def proximo_id(cursor, tabela, coluna):
    
    cursor.execute(f"SELECT COALESCE(MAX({coluna}), 0) + 1 FROM {tabela}")
    return cursor.fetchone()[0]



# Sprint item 20 - Permitir que o instrutor cadastre provas para validar a conclusão do curso - Converte o JSON das respostas da avaliação
def _decodificar_respostas_prova(valor):
    
    texto = de_blob_texto(valor)
    if not texto:
        return {}
    try:
        dados = json.loads(texto)
        return dados if isinstance(dados, dict) else {}
    except (TypeError, ValueError):
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
# Fim item 20



# Sprint item 9 - Exibir acessos aos cursos, compras realizadas e taxa de conversão - Registra acesso ou compra sem duplicar o evento no mês
def registrar_evento_curso(cursor, id_curso, id_usuario, tipo_evento):
    
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
# Fim item 9



def exigir_tipo(*tipos):
    tipo = int(get_jwt().get("tipo", -1))
    if tipo not in tipos:
        return resposta("Acesso negado para este perfil.", 403)
    return None



# Sprint item 15 - Exibir saldo disponível em caixa, assinatura de R$ 500 e desconto das comissões no saldo administrativo - Consulta o percentual de comissão destinado aos instrutores
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
# Fim item 15



# Sprint item 12 - Exibir valores recebidos, disponíveis para saque e já sacados pelo instrutor - Apura o valor estimado, o total já pago e o saldo disponível do instrutor
def calcular_saldo_saque(cursor, id_usuario, pool_instrutores, pesos_instrutores, peso_total):
    
    peso_instrutor = pesos_instrutores.get(int(id_usuario), 0)
    estimado = pool_instrutores * (peso_instrutor / peso_total) if peso_total else 0
    cursor.execute(
        """SELECT COALESCE(CAST(SUM(CASE WHEN STATUS = 1 THEN VALOR ELSE 0 END) AS DOUBLE PRECISION), 0),
                  COALESCE(CAST(SUM(CASE WHEN STATUS = 0 THEN VALOR ELSE 0 END) AS DOUBLE PRECISION), 0)
           FROM SAQUES_INSTRUTOR WHERE ID_USUARIO = ?""",
        (id_usuario,),
    )
    pago, pendente = (float(valor or 0) for valor in cursor.fetchone())
    disponivel = round(max(estimado - pago - pendente, 0), 2)
    return peso_instrutor, estimado, pago, disponivel
# Fim item 12



# Sprint item 28 - Permitir filtro de cursos por tema, categoria e avaliação - Normaliza os termos usados nas categorias e nos temas
def normalizar_taxonomia(valor):
    
    return " ".join((valor or "").strip().casefold().split())
# Fim item 28



# Sprint item 24 - Registrar as ações realizadas pelos usuários no sistema - Converte os detalhes da ação em um resumo para o registro de auditoria
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
# Fim item 24



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



# Sprint item 5 - Gerar certificado ao concluir o curso - Desenha o certificado e gera o documento PDF
def _pdf_certificado(dados):
    
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
# Fim item 5



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



# Sprint item 34 - Exibir faturas em aberto - Reutiliza a validação de faturas antes de liberar a operação
def _bloqueio_assinatura_aluno(cursor, id_aluno):
    
    from aluno_4_6_34 import exigir_assinatura_ativa
    return exigir_assinatura_ativa(cursor, id_aluno)
# Fim item 34



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

__all__ = ['valor_assinatura_config', 'resposta', 'proximo_id', '_decodificar_respostas_prova', '_decodificar_alternativas', 'registrar_evento_curso', 'exigir_tipo', 'percentual_instrutores', 'pesos_pool_instrutores', 'calcular_saldo_saque', 'normalizar_taxonomia', '_resumo_detalhes_log', '_pdf_simples', '_pdf_certificado', '_data_certificado', '_curso_do_professor', '_aluno_matriculado', '_bloqueio_assinatura_aluno', '_professor_responsavel']
