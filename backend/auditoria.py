"""Sprint item 37 - Desenvolver rotina de gravação de log de todas as rotinas como gravar, editar e excluir em banco separado. prepara os triggers que auditam alteraÃ§Ãµes no Firebird.

1. ``get_db`` informa Ã  conexÃ£o quem estÃ¡ fazendo a requisiÃ§Ã£o.
2. Antes de uma escrita, garantimos que os triggers existem nas tabelas usadas.
3. Cada trigger compara OLD com NEW e escreve no banco de logs, na mesma
   transaÃ§Ã£o, a aÃ§Ã£o, o registro e os valores permitidos antes/depois.
4. Se a alteraÃ§Ã£o for desfeita, o log da mesma transaÃ§Ã£o tambÃ©m Ã© desfeito.

A lista VALORES_AUDITAVEIS limita o conteÃºdo copiado: o nome pode entrar no
log, mas senha, CPF, e-mail e conteÃºdo de mensagens/provas ficam de fora.
"""

import re
import textwrap
from threading import RLock
from uuid import uuid4

import fdb
from flask import current_app, g, has_request_context, jsonify, request
from flask_jwt_extended import get_jwt, get_jwt_identity

from app import app
from log_banco import garantir_log_schema


TABELAS_AUDITADAS = {
    "USUARIOS",
    "CURSOS",
    "PROFESSORES_CURSO",
    "VIDEOS",
    "MATRICULAS",
    "ASSINATURAS",
    "MODULOS_CURSO",
    "MATERIAIS_CURSO",
    "AVALIACOES_CURSO",
    "PROVAS_CURSO",
    "QUESTOES_PROVA",
    "RESPOSTAS_PROVA",
    "CERTIFICADOS",
    "CUSTOS_PLATAFORMA",
    "CATEGORIAS_CUSTO",
    "SAQUES_INSTRUTOR",
    "FINANCEIRO_CONFIG",
    "MENSAGENS_CHAT",
    "CATEGORIAS_CURSO",
    "TEMAS_CURSO",
    "CURSO_TAXONOMIA",
    "PROGRESSO_AULAS",
}

# SÃ³ estes campos podem ter valores antigos/novos copiados para o banco de logs.
# Senhas, cÃ³digos, CPF, e-mail, conteÃºdo de chat/provas e respostas do provedor
# nunca entram nesses snapshots.
# Para apresentar: TABELAS_AUDITADAS decide onde instalar triggers; este mapa
# decide quais valores podem aparecer nas colunas "antes" e "depois" do Admin.
VALORES_AUDITAVEIS = {
    # Sprint item 37 - Desenvolver rotina de gravação de log de todas as rotinas como gravar, editar e excluir em banco separado. o nome tambÃ©m entra no antes/depois; CPF, e-mail e senha permanecem fora.
    "USUARIOS": {"NOME", "TIPO_USUARIO", "SITUACAO", "TENTATIVAS", "EMAIL_VERIFICADO"},
    "CURSOS": {"TITULO", "STATUS", "EXCLUIDO"},
    "PROFESSORES_CURSO": {"ID_CURSO", "ID_USUARIO"},
    # Sprint item 37 - Desenvolver rotina de gravação de log de todas as rotinas como gravar, editar e excluir em banco separado. guarda o nome da aula nos registros para contextualizar a auditoria por curso.
    "VIDEOS": {"ID_CURSO", "ID_MODULO", "TITULO", "STATUS", "EXCLUIDO"},
    "MATRICULAS": {"ID_CURSO", "ID_USUARIO", "STATUS_MATRICULA"},
    "ASSINATURAS": {
        "ID_USUARIO", "VALOR", "STATUS", "DATA_VENCIMENTO", "DATA_PAGAMENTO", "DATA_EXPIRACAO"
    },
    "MODULOS_CURSO": {"ID_CURSO", "TITULO", "ORDEM", "STATUS"},
    "MATERIAIS_CURSO": {"ID_CURSO", "TITULO", "TIPO"},
    "AVALIACOES_CURSO": {"ID_CURSO", "ID_USUARIO", "NOTA"},
    "PROVAS_CURSO": {"ID_CURSO", "TITULO", "PUBLICADA"},
    "QUESTOES_PROVA": {"ID_PROVA", "TIPO"},
    "RESPOSTAS_PROVA": {"ID_PROVA", "ID_USUARIO", "STATUS", "CORRIGIDO_EM"},
    "CERTIFICADOS": {"ID_CURSO", "ID_USUARIO", "CRIADO_EM"},
    "CUSTOS_PLATAFORMA": {"VALOR", "DATA_CUSTO", "CATEGORIA", "ID_CATEGORIA", "TIPO_CUSTO", "DATA_INICIO", "DATA_FIM", "ID_GRUPO_MENSAL", "ID_USUARIO"},
    "CATEGORIAS_CUSTO": {"NOME"},
    "SAQUES_INSTRUTOR": {"ID_USUARIO", "VALOR", "STATUS", "CRIADO_EM"},
    "FINANCEIRO_CONFIG": {"PERCENTUAL_INSTRUTORES", "ATUALIZADO_EM"},
    "MENSAGENS_CHAT": {"ID_CURSO", "ID_ALUNO", "ID_REMETENTE", "ID_DESTINATARIO", "CRIADO_EM"},
    "CATEGORIAS_CURSO": {"NOME", "NOME_NORMALIZADO"},
    "TEMAS_CURSO": {"NOME", "NOME_NORMALIZADO"},
    "CURSO_TAXONOMIA": {"ID_CURSO", "ID_CATEGORIA", "ID_TEMA"},
    "PROGRESSO_AULAS": {"ID_USUARIO", "ID_VIDEO", "ASSISTIDO_EM"},
}

# Progresso de reproduÃ§Ã£o e tempo assistido sÃ£o atualizados em intervalos curtos.
# Eles nÃ£o sÃ£o incluÃ­dos para evitar um log de alto volume sem valor de auditoria.
_OPERACOES_LIMITADAS = {
    "MENSAGENS_CHAT": "AFTER INSERT OR DELETE",
    "PROGRESSO_AULAS": "AFTER INSERT OR DELETE",
}

_lock_instalacao = RLock()
_gatilhos_prontos = False
_gatilhos_instalados = set()


def definir_contexto_auditoria(con):
    """Sprint item 37 - Desenvolver rotina de gravação de log de todas as rotinas como gravar, editar e excluir em banco separado. coloca ID, perfil e dados da requisiÃ§Ã£o na sessÃ£o Firebird.

    ``RDB$SET_CONTEXT`` salva valores apenas nesta conexÃ£o. O trigger usa
    ``RDB$GET_CONTEXT`` ao gravar o log; uma operaÃ§Ã£o direta no banco pode
    aparecer sem usuÃ¡rio da API, mas continua identificada como origem BANCO.
    """
    valores = {
        "AUDIT_USER_ID": None,
        "AUDIT_USER_TYPE": None,
        "AUDIT_REQUEST_ID": None,
        "AUDIT_ROUTE": None,
        "AUDIT_METHOD": None,
        "AUDIT_IP": None,
        "AUDIT_USER_AGENT": None,
        "AUDIT_ORIGIN": "BANCO",
        "AUDIT_LOG_USER": current_app.config.get("AUDIT_LOG_USER"),
        "AUDIT_LOG_PASSWORD": current_app.config.get("AUDIT_LOG_PASSWORD"),
    }

    if has_request_context():
        # O JWT identifica quem usou a API. Sem requisiÃ§Ã£o HTTP, por exemplo
        # numa alteraÃ§Ã£o direta no Firebird, a origem permanece como BANCO.
        try:
            actor_id = get_jwt_identity()
            claims = get_jwt() or {}
        except Exception:
            actor_id = None
            claims = {}

        request_id = (request.headers.get("X-Request-ID") or "").strip()
        # Um ID curto e seguro relaciona vÃ¡rias alteraÃ§Ãµes da mesma chamada;
        # se o cliente nÃ£o enviou um vÃ¡lido, criamos um aqui.
        if not re.fullmatch(r"[A-Za-z0-9._:-]{1,80}", request_id):
            request_id = getattr(g, "audit_request_id", None) or uuid4().hex
        g.audit_request_id = request_id

        valores.update({
            "AUDIT_USER_ID": str(actor_id) if actor_id is not None else None,
            "AUDIT_USER_TYPE": str(claims.get("tipo")) if claims.get("tipo") is not None else None,
            "AUDIT_REQUEST_ID": request_id,
            "AUDIT_ROUTE": request.path[:255],
            "AUDIT_METHOD": request.method[:10],
            "AUDIT_IP": (request.remote_addr or "")[:80] or None,
            "AUDIT_USER_AGENT": (request.headers.get("User-Agent") or "")[:255] or None,
            "AUDIT_ORIGIN": "API",
        })

    chaves = tuple(valores)
    parametros = tuple(valores[chave] for chave in chaves)
    definicoes = ", ".join(
        "RDB$SET_CONTEXT('USER_SESSION', ?, ?)" for _ in chaves
    )
    # Todos os valores sÃ£o parÃ¢metros de uma Ãºnica consulta. O trigger lÃª
    # esse contexto da conexÃ£o, sem confiar em campos enviados no corpo JSON.
    cursor = con.cursor()
    try:
        cursor.execute(
            f"SELECT {definicoes} FROM RDB$DATABASE",
            tuple(valor for par in zip(chaves, parametros) for valor in par),
        )
        cursor.fetchone()
    finally:
        cursor.close()


def definir_ator_auditoria(con, id_usuario, tipo_usuario):
    """Atualiza o ator da conexao depois de autenticar um login."""
    cursor = con.cursor()
    try:
        cursor.execute(
            """
            SELECT
                RDB$SET_CONTEXT('USER_SESSION', 'AUDIT_USER_ID', ?),
                RDB$SET_CONTEXT('USER_SESSION', 'AUDIT_USER_TYPE', ?)
            FROM RDB$DATABASE
            """,
            (str(id_usuario), str(tipo_usuario)),
        )
        cursor.fetchone()
    finally:
        cursor.close()


def preparar_auditoria_antes_de_modificar():
    """Sprint item 37 - Desenvolver rotina de gravação de log de todas as rotinas como gravar, editar e excluir em banco separado. prepara o banco de log e os triggers antes de uma escrita.

    GET nÃ£o modifica dados e passa direto. Se a preparaÃ§Ã£o falhar, a API
    devolve 503 antes de entrar na rota de criaÃ§Ã£o, ediÃ§Ã£o ou exclusÃ£o.
    """
    if request.method not in {"POST", "PUT", "PATCH", "DELETE"}:
        return None

    try:
        # Reconciliamos o gerador em cada escrita para recuperar bancos em que
        # registros tenham sido inseridos sem atualizar GEN_LOG_GRAVACAO.
        garantir_log_schema()
        garantir_gatilhos_auditoria()
    except Exception:
        current_app.logger.exception("NÃ£o foi possÃ­vel preparar a auditoria do banco.")
        return jsonify({
            "mensagem": {
                "tipo": "erro",
                "descricao": "Nao foi possivel concluir sua solicitacao agora. Tente novamente em instantes.",
            }
        }), 503

    return None


app.before_request(preparar_auditoria_antes_de_modificar)


def garantir_gatilhos_auditoria(tabelas=None, force=False):
    """Sprint item 37 - Desenvolver rotina de gravação de log de todas as rotinas como gravar, editar e excluir em banco separado. cria ou atualiza os triggers das tabelas auditadas.

    O lock evita duas instalaÃ§Ãµes simultÃ¢neas. A funÃ§Ã£o consulta metadados do
    Firebird para descobrir colunas reais antes de gerar cada trigger; ``force``
    recompila uma tabela apÃ³s mudanÃ§a de esquema ou regra de auditoria.
    """
    global _gatilhos_prontos

    solicitados = None if tabelas is None else {
        str(nome).upper() for nome in tabelas
    } & TABELAS_AUDITADAS

    if not force and solicitados is not None and solicitados <= _gatilhos_instalados:
        return
    if tabelas is None and _gatilhos_prontos:
        return

    with _lock_instalacao:
        if not force and solicitados is not None and solicitados <= _gatilhos_instalados:
            return
        if tabelas is None and _gatilhos_prontos:
            return

        nomes = solicitados or set(TABELAS_AUDITADAS)
        if not force:
            nomes -= _gatilhos_instalados
        if not nomes:
            _gatilhos_prontos = True
            return

        garantir_log_schema()
        con = fdb.connect(
            host=current_app.config["DB_HOST"],
            database=current_app.config["DB_NAME"],
            user=current_app.config["DB_USER"],
            password=current_app.config["DB_PASSWORD"],
            charset="UTF8",
        )
        cursor = con.cursor()
        try:
            cursor.execute(
                "SELECT RDB$GET_CONTEXT('SYSTEM', 'ENGINE_VERSION') FROM RDB$DATABASE"
            )
            versao = str((cursor.fetchone() or ("",))[0] or "").strip()
            encontrado = re.search(r"(\d+)\.(\d+)", versao)
            if not encontrado or tuple(map(int, encontrado.groups())) < (3, 0):
                raise RuntimeError(
                    "A funÃ§Ã£o AUDIT_JSON exige Firebird 3 ou posterior. "
                    f"VersÃ£o detectada: {versao or 'desconhecida'}."
                )

            # A funÃ§Ã£o PSQL encurta todos os triggers. Os escapes ficam em um
            # lugar, e a funÃ§Ã£o Ã© instalada antes dos gatilhos que a chamam.
            cursor.execute(_DDL_FUNCAO_JSON)

            instalados = set()
            # As colunas vÃªm dos metadados do banco real. Isso permite gerar
            # o SQL sÃ³ com campos que de fato existem nesta instalaÃ§Ã£o.
            for tabela in sorted(nomes):
                if not _tabela_existe(cursor, tabela):
                    continue
                campos = _campos_tabela(cursor, tabela)
                chaves = _chaves_primarias(cursor, tabela)
                if not campos or not chaves:
                    raise RuntimeError(
                        f"A tabela auditada {tabela} precisa de campos e chave primÃ¡ria."
                    )
                cursor.execute(_ddl_gatilho(tabela, campos, chaves))
                instalados.add(tabela)

            con.commit()
            _gatilhos_instalados.update(instalados)
            if tabelas is None:
                _gatilhos_prontos = True
        except Exception:
            con.rollback()
            raise
        finally:
            cursor.close()
            con.close()


def _tabela_existe(cursor, tabela):
    cursor.execute(
        """
        SELECT 1
        FROM RDB$RELATIONS
        WHERE RDB$RELATION_NAME = ?
          AND RDB$VIEW_BLR IS NULL
          AND COALESCE(RDB$SYSTEM_FLAG, 0) = 0
        """,
        (tabela,),
    )
    return cursor.fetchone() is not None


def _campos_tabela(cursor, tabela):
    cursor.execute(
        """
        SELECT
            TRIM(RF.RDB$FIELD_NAME),
            F.RDB$FIELD_TYPE,
            F.RDB$FIELD_SUB_TYPE,
            F.RDB$COMPUTED_BLR,
            (
                SELECT FIRST 1 D.RDB$DIMENSION
                FROM RDB$FIELD_DIMENSIONS D
                WHERE D.RDB$FIELD_NAME = RF.RDB$FIELD_SOURCE
            )
        FROM RDB$RELATION_FIELDS RF
        JOIN RDB$FIELDS F ON F.RDB$FIELD_NAME = RF.RDB$FIELD_SOURCE
        WHERE RF.RDB$RELATION_NAME = ?
        ORDER BY RF.RDB$FIELD_POSITION
        """,
        (tabela,),
    )
    campos = []
    for nome, tipo, subtipo, calculado, dimensoes in cursor.fetchall():
        nome = str(nome).upper()
        if not re.fullmatch(r"[A-Z_][A-Z0-9_$]*", nome):
            continue
        if calculado is not None or dimensoes is not None:
            continue
        campos.append({
            "nome": nome,
            "tipo": int(tipo),
            "subtipo": int(subtipo or 0),
        })
    return campos


def _chaves_primarias(cursor, tabela):
    cursor.execute(
        """
        SELECT TRIM(S.RDB$FIELD_NAME)
        FROM RDB$RELATION_CONSTRAINTS RC
        JOIN RDB$INDEX_SEGMENTS S ON S.RDB$INDEX_NAME = RC.RDB$INDEX_NAME
        WHERE RC.RDB$RELATION_NAME = ?
          AND RC.RDB$CONSTRAINT_TYPE = 'PRIMARY KEY'
        ORDER BY S.RDB$FIELD_POSITION
        """,
        (tabela,),
    )
    return [str(row[0]).upper() for row in cursor.fetchall()]


def _identificador(nome):
    return '"' + nome.replace('"', '""') + '"'


def _literal(valor):
    return "'" + valor.replace("'", "''") + "'"


# Sprint item 37 - Desenvolver rotina de gravação de log de todas as rotinas como gravar, editar e excluir em banco separado. recebe texto jÃ¡ limitado por _valor_texto e devolve um literal JSON.
# NULL vira null; barras, aspas e todos os controles U+0000 a U+001F sÃ£o
# escapados. Os triggers sÃ³ precisam chamar AUDIT_JSON(OLD/NEW.campo).
_DDL_FUNCAO_JSON = """
CREATE OR ALTER FUNCTION AUDIT_JSON (VALOR VARCHAR(1000))
RETURNS BLOB SUB_TYPE TEXT
AS
    /* Guarda a versÃ£o em texto, que pode crescer apÃ³s aplicar os escapes. */
    DECLARE VARIABLE TEXTO BLOB SUB_TYPE TEXT;
    /* CODIGO percorre os controles ASCII que nÃ£o podem ficar crus em JSON. */
    DECLARE VARIABLE CODIGO SMALLINT;
    /* Tabela usada para converter cada metade do cÃ³digo em um dÃ­gito hexadecimal. */
    DECLARE VARIABLE DIGITOS VARCHAR(16);
BEGIN
    /* JSON representa a ausÃªncia de valor com a palavra null, sem aspas. */
    IF (VALOR IS NULL) THEN
        RETURN 'null';

    /* Uma barra invertida ou aspas dentro do texto precisam ser protegidas. */
    TEXTO = REPLACE(VALOR, ASCII_CHAR(92), ASCII_CHAR(92) || ASCII_CHAR(92));
    TEXTO = REPLACE(TEXTO, ASCII_CHAR(34), ASCII_CHAR(92) || ASCII_CHAR(34));
    DIGITOS = '0123456789ABCDEF';
    CODIGO = 0;
    /* Transforma cada controle U+0000..U+001F em uma sequÃªncia JSON \\u00XX. */
    WHILE (CODIGO < 32) DO
    BEGIN
        TEXTO = REPLACE(
            TEXTO,
            ASCII_CHAR(CODIGO),
            ASCII_CHAR(92) || 'u00' ||
            SUBSTRING(DIGITOS FROM FLOOR(CODIGO / 16) + 1 FOR 1) ||
            SUBSTRING(DIGITOS FROM MOD(CODIGO, 16) + 1 FOR 1)
        );
        CODIGO = CODIGO + 1;
    END
    /* Texto JSON precisa comeÃ§ar e terminar com aspas. */
    RETURN ASCII_CHAR(34) || TEXTO || ASCII_CHAR(34);
END
"""


def _valor_texto(alias, campo):
    coluna = f"{alias}.{_identificador(campo['nome'])}"
    if campo["tipo"] in {14, 37}:
        return f"SUBSTRING({coluna} FROM 1 FOR 1000)"
    return f"CAST({coluna} AS VARCHAR(100))"


def _json_campo(alias, campo):
    chave = _literal('"' + campo['nome'] + '":')
    return f"{chave} || AUDIT_JSON({_valor_texto(alias, campo)})"


def _snapshot_json(alias, campos):
    """Sprint item 37 - Desenvolver rotina de gravação de log de todas as rotinas como gravar, editar e excluir em banco separado. pÃµe cada campo do snapshot em uma linha lÃ³gica separada.

    INSERT usa NEW, DELETE usa OLD. Sem campos permitidos, o log guarda NULL.
    AUDIT_JSON faz o escape de cada valor, sem repetir sete REPLACE por campo.
    """
    partes = [_json_campo(alias, campo) for campo in campos]
    if not partes:
        return "NULL"
    return (
        "'{' ||\n"
        + "\n    || ',' ||\n".join(textwrap.indent(parte, "    ") for parte in partes)
        + "\n    || '}'"
    )


def _expressao_chave(alias, chaves):
    partes = [
        f"COALESCE(CAST({alias}.{_identificador(chave)} AS VARCHAR(80)), '')"
        for chave in chaves
    ]
    return " || ':' || ".join(partes)


def _ddl_gatilho(tabela, campos, chaves):
    """Sprint item 37 - Desenvolver rotina de gravação de log de todas as rotinas como gravar, editar e excluir em banco separado. monta o SQL de um trigger a partir da estrutura da tabela.

    INSERT guarda somente depois, DELETE somente antes. UPDATE compara OLD e
    NEW com ``IS DISTINCT FROM`` (inclusive NULL) e registra os campos
    alterados; valores sensÃ­veis nÃ£o entram nos snapshots. O log usa
    ``WITH COMMON TRANSACTION`` para acompanhar commit/rollback da operaÃ§Ã£o.
    """
    por_nome = {campo["nome"]: campo for campo in campos}
    chaves = [chave for chave in chaves if chave in por_nome]
    if not chaves:
        raise RuntimeError(f"A tabela {tabela} nÃ£o possui chave primÃ¡ria auditÃ¡vel.")

    valores = [
        por_nome[nome]
        for nome in sorted(VALORES_AUDITAVEIS.get(tabela, set()))
        if nome in por_nome and por_nome[nome]["tipo"] != 261
    ]
    tem_update = tabela not in _OPERACOES_LIMITADAS
    colunas_escalars = [campo for campo in campos if campo["tipo"] != 261] if tem_update else []
    novo = _expressao_chave("NEW", chaves)
    antigo = _expressao_chave("OLD", chaves)
    nome_trigger = f"TRG_AUDIT_{tabela}"

    snapshot_novo = _snapshot_json("NEW", valores)
    snapshot_antigo = _snapshot_json("OLD", valores)

    linhas_alteracao = []
    for campo in colunas_escalars:
        nome = campo["nome"]
        coluna_nova = f"NEW.{_identificador(nome)}"
        coluna_antiga = f"OLD.{_identificador(nome)}"
        linhas_alteracao.extend([
            f"/* Compara o valor antigo e o novo de {nome}; IS DISTINCT FROM tambÃ©m detecta mudanÃ§as envolvendo NULL. */",
            f"IF ({coluna_nova} IS DISTINCT FROM {coluna_antiga}) THEN",
            "BEGIN",
            "  /* Registra o nome do campo. O valor sÃ³ Ã© copiado se estiver na lista permitida. */",
            f"  v_campos = v_campos || {_literal(nome + ', ')};",
        ])
        if nome in {c["nome"] for c in valores}:
            linhas_alteracao.extend([
                "  /* Insere vÃ­rgulas entre os pares campo/valor do objeto JSON. */",
                "  IF (v_contagem > 0) THEN",
                "  BEGIN",
                "    v_antes = v_antes || ',';",
                "    v_depois = v_depois || ',';",
                "  END",
                "  /* Snapshot autorizado: OLD Ã© antes da ediÃ§Ã£o e NEW Ã© depois dela. */",
                f"  v_antes = v_antes || {_json_campo('OLD', campo)};",
                f"  v_depois = v_depois || {_json_campo('NEW', campo)};",
                "  /* Conta apenas os campos incluÃ­dos nos snapshots. */",
                "  v_contagem = v_contagem + 1;",
            ])
        else:
            linhas_alteracao.append(
                "  /* Este campo Ã© identificado, mas seu valor nÃ£o Ã© copiado para proteger dados nÃ£o autorizados. */"
            )
        linhas_alteracao.append("END")

    log_path = str(current_app.config["DB_LOG_NAME"]).replace("'", "''")
    operations = _OPERACOES_LIMITADAS.get(tabela, "AFTER INSERT OR UPDATE OR DELETE")
    linhas_alteracao_sql = "\n".join(linhas_alteracao)
    # As tabelas de chat e progresso auditam sÃ³ INSERT/DELETE. Nelas nÃ£o hÃ¡
    # motivo para gerar comparaÃ§Ãµes OLD/NEW de UPDATE que nunca executariam.
    declaracoes_update = "" if not tem_update else """
    DECLARE VARIABLE v_id_novo VARCHAR(200);
    DECLARE VARIABLE v_id_antigo VARCHAR(200);
    DECLARE VARIABLE v_contagem SMALLINT;"""
    ramo_update = "" if not tem_update else f"""
    ELSE
    BEGIN
        /* A linha Ã© executada quando a operaÃ§Ã£o nÃ£o foi INSERT nem DELETE. */
        v_operacao = 'UPDATE';
        /* Guarda as chaves antes e depois para localizar atÃ© uma ediÃ§Ã£o da prÃ³pria chave. */
        v_id_novo = {novo};
        v_id_antigo = {antigo};
        v_id_registro = v_id_novo;
        /* Se a chave mudou, deixa os dois identificadores explÃ­citos no log. */
        IF ({' OR '.join(f'OLD.{_identificador(chave)} IS DISTINCT FROM NEW.{_identificador(chave)}' for chave in chaves)}) THEN
            v_id_registro = v_id_antigo || ' -> ' || v_id_novo;
        /* Abre a lista de campos e os objetos JSON que receberÃ£o as diferenÃ§as. */
        v_campos = '';
        v_antes = '{{';
        v_depois = '{{';
        v_contagem = 0;
        /* Para cada coluna, o bloco gerado registra o nome alterado e, quando permitido, OLD/NEW. */
        {linhas_alteracao_sql}
        /* Remove a vÃ­rgula e o espaÃ§o finais acumulados em v_campos. */
        IF (CHAR_LENGTH(v_campos) > 0) THEN
            v_campos = SUBSTRING(v_campos FROM 1 FOR CHAR_LENGTH(v_campos) - 2);
        ELSE
            v_campos = '[conteÃºdo textual/sensÃ­vel omitido ou sem alteraÃ§Ã£o escalar]';
        /* Sem valores permitidos alterados, nÃ£o grava objetos JSON vazios. */
        IF (v_contagem = 0) THEN
        BEGIN
            v_antes = NULL;
            v_depois = NULL;
        END
        ELSE
        BEGIN
            /* Fecha os dois objetos JSON apÃ³s acrescentar seus pares de valores. */
            v_antes = v_antes || '}}';
            v_depois = v_depois || '}}';
        END
    END"""
    # Quebramos o comando enviado ao banco de logs nas mesmas partes em que
    # explicarÃ­amos o INSERT: tabela, colunas e valores. O || as une no trigger.
    partes_sql_insert = (
        "INSERT INTO LOG_GRAVACAO ",
        "(ID_LOG, ID_USUARIO, TIPO_USUARIO, ACAO, TABELA_AFETADA, ID_REGISTRO, ",
        "ROTA, METODO, CAMPOS_ALTERADOS, VALORES_ANTES, VALORES_DEPOIS, DETALHES, ",
        "IP, USER_AGENT, REQUEST_ID, ORIGEM, USUARIO_BANCO, CRIADO_EM) ",
        "VALUES (GEN_ID(GEN_LOG_GRAVACAO, 1), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ",
        "?, ?, ?, ?, ?, CURRENT_TIMESTAMP)",
    )
    sql_insert = " ||\n        ".join(_literal(parte) for parte in partes_sql_insert)
    parametros_insert = f"""
        CAST(NULLIF(v_actor_id, '') AS INTEGER),
        CAST(NULLIF(v_actor_type, '') AS SMALLINT),
        v_operacao,
        {_literal(tabela)},
        v_id_registro,
        v_rota,
        v_metodo,
        v_campos,
        v_antes,
        v_depois,
        NULL,
        v_ip,
        v_user_agent,
        v_request_id,
        v_origem,
        CURRENT_USER
    """

    return f"""
/*
  Sprint item 37 - Desenvolver rotina de gravação de log de todas as rotinas como gravar, editar e excluir em banco separado. este trigger registra INSERT, UPDATE e DELETE de {tabela}.
  Ele Ã© AFTER para observar NEW/OLD finais e roda antes do commit da transaÃ§Ã£o.
  O Python gera esta definiÃ§Ã£o a partir dos metadados e da lista de campos permitidos.
*/
CREATE OR ALTER TRIGGER {nome_trigger}
ACTIVE {operations} POSITION 32760 ON {tabela}
AS
    /* Identifica a operaÃ§Ã£o e a chave do registro que mudou. */
    DECLARE VARIABLE v_operacao VARCHAR(10);
    DECLARE VARIABLE v_id_registro VARCHAR(200);
    /* Estas trÃªs variÃ¡veis sÃ³ sÃ£o necessÃ¡rias nos triggers que tambÃ©m auditam UPDATE. */
    {declaracoes_update}
    /* v_campos lista nomes; v_antes/v_depois guardam os valores permitidos em JSON. */
    DECLARE VARIABLE v_campos VARCHAR(8191);
    DECLARE VARIABLE v_antes BLOB SUB_TYPE TEXT;
    DECLARE VARIABLE v_depois BLOB SUB_TYPE TEXT;
    /* v_sql recebe o INSERT que serÃ¡ executado no outro arquivo de banco. */
    DECLARE VARIABLE v_sql VARCHAR(2000);
    /* Identidade do usuÃ¡rio da aplicaÃ§Ã£o, lida do contexto da conexÃ£o. */
    DECLARE VARIABLE v_actor_id VARCHAR(255);
    DECLARE VARIABLE v_actor_type VARCHAR(255);
    /* Credenciais opcionais para abrir o banco de log externo. */
    DECLARE VARIABLE v_log_user VARCHAR(255);
    DECLARE VARIABLE v_log_password VARCHAR(255);
    /* Metadados HTTP definidos pela API antes da consulta que altera os dados. */
    DECLARE VARIABLE v_request_id VARCHAR(255);
    DECLARE VARIABLE v_rota VARCHAR(255);
    DECLARE VARIABLE v_metodo VARCHAR(255);
    DECLARE VARIABLE v_ip VARCHAR(255);
    DECLARE VARIABLE v_user_agent VARCHAR(255);
    /* Distingue uma mudanÃ§a pela API de uma mudanÃ§a feita diretamente no Firebird. */
    DECLARE VARIABLE v_origem VARCHAR(255);
BEGIN
    /*
      A API grava estes valores com RDB$SET_CONTEXT na mesma conexÃ£o.
      USER_SESSION mantÃ©m o contexto separado para cada conexÃ£o aberta.
    */
    v_actor_id = RDB$GET_CONTEXT('USER_SESSION', 'AUDIT_USER_ID');
    v_actor_type = RDB$GET_CONTEXT('USER_SESSION', 'AUDIT_USER_TYPE');
    v_log_user = RDB$GET_CONTEXT('USER_SESSION', 'AUDIT_LOG_USER');
    v_log_password = RDB$GET_CONTEXT('USER_SESSION', 'AUDIT_LOG_PASSWORD');
    v_request_id = RDB$GET_CONTEXT('USER_SESSION', 'AUDIT_REQUEST_ID');
    v_rota = RDB$GET_CONTEXT('USER_SESSION', 'AUDIT_ROUTE');
    v_metodo = RDB$GET_CONTEXT('USER_SESSION', 'AUDIT_METHOD');
    v_ip = RDB$GET_CONTEXT('USER_SESSION', 'AUDIT_IP');
    v_user_agent = RDB$GET_CONTEXT('USER_SESSION', 'AUDIT_USER_AGENT');
    v_origem = COALESCE(RDB$GET_CONTEXT('USER_SESSION', 'AUDIT_ORIGIN'), 'BANCO');

    /* INSERT nÃ£o tem estado anterior: registra a chave e os campos apÃ³s a criaÃ§Ã£o. */
    IF (INSERTING) THEN
    BEGIN
        v_operacao = 'INSERT';
        v_id_registro = {novo};
        v_campos = '*';
        v_antes = NULL;
        /* O mapa VALORES_AUDITAVEIS limita quais valores NEW podem ser copiados. */
        v_depois = {snapshot_novo};
    END
    /* DELETE nÃ£o tem estado novo: registra a Ãºltima versÃ£o disponÃ­vel, OLD. */
    ELSE IF (DELETING) THEN
    BEGIN
        v_operacao = 'DELETE';
        v_id_registro = {antigo};
        v_campos = '*';
        /* O mapa VALORES_AUDITAVEIS tambÃ©m limita quais valores OLD sÃ£o copiados. */
        v_antes = {snapshot_antigo};
        v_depois = NULL;
    END
    {ramo_update}

    /*
      Prepara o comando com parÃ¢metros. Os ? separam dados do SQL e evitam
      montar valores de usuÃ¡rio diretamente dentro do texto do comando.
    */
    v_sql = {sql_insert};
    /* Sem credencial separada, o Firebird usa a identidade disponÃ­vel na conexÃ£o. */
    IF (v_log_user IS NULL OR TRIM(v_log_user) = '') THEN
    BEGIN
        EXECUTE STATEMENT (v_sql)
        ({parametros_insert})
        /* Grava no banco separado e inclui o registro na mesma transaÃ§Ã£o. */
        ON EXTERNAL DATA SOURCE '{log_path}'
        WITH COMMON TRANSACTION;
    END
    /* Se configurada, usa a credencial prÃ³pria para o arquivo de logs. */
    ELSE
    BEGIN
        EXECUTE STATEMENT (v_sql)
        ({parametros_insert})
        ON EXTERNAL DATA SOURCE '{log_path}'
        AS USER v_log_user
        PASSWORD v_log_password
        /* Commit ou rollback do dado principal tambÃ©m se aplica ao log. */
        WITH COMMON TRANSACTION;
    END
END
"""

