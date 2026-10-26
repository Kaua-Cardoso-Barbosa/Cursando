"""cálculos financeiros compartilhados.

``financeiro_resumo`` separa três perfis: aluno vê faturas pagas/em aberto;
professor vê a parcela estimada do fundo, receita por curso e saldo para saque;
admin vê arrecadação, despesas, repasses e margem. O cálculo usa pagamentos
confirmados, inclusive mensalidades cujo acesso já venceu (item 33).

O fundo (item 14) é uma porcentagem da arrecadação; aulas concluídas definem
o peso do professor (item 30). Sem conclusões, matrículas dão uma estimativa
provisória. Despesas futuras aparecem no histórico, mas só reduzem o caixa
quando chega a data prevista (item 36). Todos os clientes recebem o mesmo JSON.
"""

from datetime import date, datetime
from decimal import Decimal, InvalidOperation

from flask import jsonify, request
from flask_jwt_extended import get_jwt, get_jwt_identity, jwt_required

from app import app
from banco import get_db
from pagamento_arkhe import garantir_fatura_vencida


from estrutura_banco import garantir_estrutura_banco
from utilitarios_backend import calcular_saldo_saque, exigir_tipo, percentual_instrutores, pesos_pool_instrutores, proximo_id, resposta, valor_assinatura_config



@app.route("/financeiro/resumo", methods=["GET"])
@jwt_required()
def financeiro_resumo():
    """Itens 2, 12, 14 a 16, 30, 31, 33 a 35: devolve métricas por perfil.

    Primeiro soma pagamentos confirmados e calcula o fundo. Depois escolhe o
    ramo pelo tipo do token: professor, admin ou aluno. Cada ``return jsonify``
    transforma um dicionário Python na resposta JSON da tela correspondente.
    """
    garantir_estrutura_banco()
    tipo = int(get_jwt().get("tipo", -1))
    id_usuario = get_jwt_identity()
    con = get_db()
    cursor = con.cursor()

    try:
        valor_assinatura = valor_assinatura_config()
        percentual = percentual_instrutores(cursor)
        cursor.execute("SELECT COUNT(*) FROM ASSINATURAS WHERE STATUS = 1")
        assinaturas_ativas = int((cursor.fetchone() or (0,))[0] or 0)
        # Sprint item 33 - Exibir total gasto e histórico de faturas do aluno. a receita histórica inclui mensalidades pagas cuja assinatura já expirou.
        cursor.execute("SELECT COALESCE(CAST(SUM(VALOR) AS DOUBLE PRECISION), 0) FROM ASSINATURAS WHERE STATUS IN (1, 3)")
        total_arrecadado = float((cursor.fetchone() or (0,))[0] or 0)
        # Sprint item 15 - Exibir saldo disponível em caixa. (Esse é tanto para adm e instrutor, para o instrutor ele vai apenas mostrar o saldo bruto que ele pode sacar, para o adm, como o professor recebe uma comissão em porcentagem para cada aula que o aluno viu do curso dele, altere o valor da assinatura para 500 e para mostrar o saldo do adm, deve descontar as comissão e ai mostrar quanto vai sobrar para saque) reparte mensalidades pagas pelo percentual do fundo e pelo peso das aulas concluídas.
        pool_instrutores = total_arrecadado * (percentual / 100)
        # O mesmo fundo e o mesmo peso alimentam os três perfis: assim o
        # saldo do professor não diverge do repasse reservado pelo admin.
        pesos_instrutores = pesos_pool_instrutores(cursor)
        peso_total = sum(pesos_instrutores.values())

        if tipo == 1:
            # Sprint item 12 - Exibir valores recebidos, disponíveis para saque e já sacados pelo instrutor. além do valor estimado, mostramos o que já foi pago e
            # o que está em análise; pedido pendente reduz o saldo disponível.
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
            peso_instrutor, estimado, sacado, disponivel_saque = calcular_saldo_saque(
                cursor,
                id_usuario,
                pool_instrutores,
                pesos_instrutores,
                peso_total,
            )
            cursor.execute(
                "SELECT COALESCE(CAST(SUM(VALOR) AS DOUBLE PRECISION), 0) FROM SAQUES_INSTRUTOR WHERE ID_USUARIO = ? AND STATUS = 0",
                (id_usuario,),
            )
            em_analise = float((cursor.fetchone() or (0,))[0] or 0)
            cursor.execute(
                """
                SELECT COUNT(PA.ID_VIDEO)
                FROM PROFESSORES_CURSO PC
                JOIN CURSOS C ON C.ID_CURSO = PC.ID_CURSO AND C.EXCLUIDO = 0
                JOIN VIDEOS V ON V.ID_CURSO = C.ID_CURSO AND V.EXCLUIDO = 0 AND V.STATUS = 1
                LEFT JOIN PROGRESSO_AULAS PA ON PA.ID_VIDEO = V.ID_VIDEO
                """
            )
            total_views_pool = int((cursor.fetchone() or (0,))[0] or 0)
            # Sprint item 30 - Criar gestão financeira do instrutor. calcula o valor por aula somente quando há conclusões registradas no fundo de receita.
            # Sem uma única conclusão, None evita mostrar uma divisão por zero
            # como se fosse um valor real por aula.
            valor_por_view = (pool_instrutores / total_views_pool) if total_views_pool else None
            cursor.execute(
                """
                SELECT
                    C.ID_CURSO,
                    C.TITULO,
                    COUNT(DISTINCT CAST(PA.ID_USUARIO AS VARCHAR(20)) || '-' || CAST(PA.ID_VIDEO AS VARCHAR(20))),
                    COUNT(DISTINCT M.ID_USUARIO)
                FROM CURSOS C
                JOIN PROFESSORES_CURSO PC ON PC.ID_CURSO = C.ID_CURSO
                LEFT JOIN VIDEOS V ON V.ID_CURSO = C.ID_CURSO AND V.EXCLUIDO = 0 AND V.STATUS = 1
                LEFT JOIN PROGRESSO_AULAS PA ON PA.ID_VIDEO = V.ID_VIDEO
                LEFT JOIN MATRICULAS M ON M.ID_CURSO = C.ID_CURSO AND M.STATUS_MATRICULA = 1
                WHERE PC.ID_USUARIO = ? AND C.EXCLUIDO = 0
                GROUP BY C.ID_CURSO, C.TITULO
                ORDER BY COUNT(PA.ID_VIDEO) DESC, C.TITULO
                """,
                (id_usuario,),
            )
            cursos_receita = []
            for row in cursor.fetchall():
                views = int(row[2] or 0)
                alunos_curso = int(row[3] or 0)
                # Sprint item 31 - Exibir cursos que mais geraram receita para o instrutor. cada conclusão contribui com valor_por_view.
                # A distribuição por matrículas é provisória até existir view.
                if total_views_pool:
                    receita_curso = views * valor_por_view
                else:
                    # Sprint item 30 - Criar gestão financeira do instrutor. distribui a estimativa pelas matrículas ativas até haver a primeira aula concluída.
                    receita_curso = pool_instrutores * (alunos_curso / peso_total) if peso_total else 0
                cursos_receita.append({
                    "id_curso": row[0],
                    "curso": row[1],
                    "views": views,
                    "alunos": alunos_curso,
                    "receita_estimativa": round(receita_curso, 2),
                })
            # Sprint item 31 - Exibir cursos que mais geraram receita para o instrutor. ordena os cursos da maior para a menor receita estimada do instrutor.
            cursos_receita.sort(key=lambda curso: curso["receita_estimativa"], reverse=True)
            # apresenta o resumo financeiro do instrutor com base no fundo de receita.
            return jsonify({
                "perfil": "instrutor",
                "recebido_estimado": round(estimado, 2),
                "disponivel_saque": disponivel_saque,
                "saques_habilitados": True,
                "tipo_saque": "manual",
                "em_analise": round(em_analise, 2),
                "ja_sacado": round(sacado, 2),
                "alunos_ativos": alunos,
                "percentual_pool": round(percentual, 2),
                "peso_pool": peso_instrutor,
                "peso_total_pool": peso_total,
                "views_pool": total_views_pool,
                "valor_por_view": round(valor_por_view, 2) if valor_por_view is not None else None,
                "cursos_receita": cursos_receita,
            })

        if tipo == 0:
            # Itens 13, 16 e 36: este ramo reúne caixa, despesas e margem para
            # o administrador; custos com data futura ainda não abatem caixa.
            # Sprint item 36 - Permitir cadastro e acompanhamento dos custos da plataforma. despesas futuras ficam no histórico como programadas e só entram no caixa no mês devido.
            cursor.execute("SELECT COALESCE(CAST(SUM(VALOR) AS DOUBLE PRECISION), 0) FROM CUSTOS_PLATAFORMA WHERE DATA_CUSTO <= CURRENT_DATE")
            custos = float((cursor.fetchone() or (0,))[0] or 0)
            # Sprint item 33 - Exibir total gasto e histórico de faturas do aluno. mantém a contagem administrativa coerente com o total pago pelo aluno.
            # Sprint item 35 - Calcular ticket médio por aluno. calcula gasto médio por aluno pagante, sem tratar faturas mensais como alunos.
            cursor.execute("SELECT COUNT(*), COALESCE(CAST(SUM(VALOR) AS DOUBLE PRECISION), 0), COUNT(DISTINCT ID_USUARIO) FROM ASSINATURAS WHERE STATUS IN (1, 3)")
            faturas_pagas, total_pago, alunos_pagantes = cursor.fetchone() or (0, 0, 0)
            ticket_medio = (float(total_pago or 0) / int(alunos_pagantes or 0)) if int(alunos_pagantes or 0) else 0
            cursor.execute(
                """
                SELECT U.ID_USUARIO, U.NOME, U.EMAIL, COUNT(A.ID_ASSINATURA),
                       COALESCE(CAST(SUM(A.VALOR) AS DOUBLE PRECISION), 0)
                FROM USUARIOS U
                LEFT JOIN ASSINATURAS A ON A.ID_USUARIO = U.ID_USUARIO AND A.STATUS IN (1, 3)
                WHERE U.TIPO_USUARIO = 2
                GROUP BY U.ID_USUARIO, U.NOME, U.EMAIL
                ORDER BY U.NOME, U.ID_USUARIO
                """
            )
            ticket_alunos = []
            for linha in cursor.fetchall():
                qtd_faturas = int(linha[3] or 0)
                gasto_aluno = float(linha[4] or 0)
                ticket_alunos.append({
                    "id_usuario": linha[0],
                    "nome": linha[1],
                    "email": linha[2],
                    "faturas_pagas": qtd_faturas,
                    "total_pago": round(gasto_aluno, 2),
                    "ticket_medio": round(gasto_aluno / qtd_faturas, 2) if qtd_faturas else 0,
                })
            # Sprint item 15 - Exibir saldo disponível em caixa. (Esse é tanto para adm e instrutor, para o instrutor ele vai apenas mostrar o saldo bruto que ele pode sacar, para o adm, como o professor recebe uma comissão em porcentagem para cada aula que o aluno viu do curso dele, altere o valor da assinatura para 500 e para mostrar o saldo do adm, deve descontar as comissão e ai mostrar quanto vai sobrar para saque) calcula o fundo de receita estimado com a porcentagem definida pelo administrador.
            # Sprint item 15 - Exibir saldo disponível em caixa. (Esse é tanto para adm e instrutor, para o instrutor ele vai apenas mostrar o saldo bruto que ele pode sacar, para o adm, como o professor recebe uma comissão em porcentagem para cada aula que o aluno viu do curso dele, altere o valor da assinatura para 500 e para mostrar o saldo do adm, deve descontar as comissão e ai mostrar quanto vai sobrar para saque) reserva a comissão dos instrutores e as despesas antes de calcular o caixa sacável do administrador.
            pool_historico_instrutores = total_arrecadado * (percentual / 100)
            disponivel_saque_admin = max(total_arrecadado - pool_historico_instrutores - custos, 0)
            cursor.execute(
                "SELECT COALESCE(CAST(SUM(VALOR) AS DOUBLE PRECISION), 0) FROM SAQUES_INSTRUTOR WHERE STATUS = 1"
            )
            total_repassado = float((cursor.fetchone() or (0,))[0] or 0)
            resposta_financeiro = jsonify({
                "perfil": "admin",
                "total_arrecadado": round(total_arrecadado, 2),
                "total_repassado": round(total_repassado, 2),
                "total_repassado_estimado": round(pool_historico_instrutores, 2),
                "custos": round(custos, 2),
                "saldo_caixa": round(total_arrecadado - pool_historico_instrutores - custos, 2),
                "disponivel_saque_admin": round(disponivel_saque_admin, 2),
                "assinaturas_ativas": assinaturas_ativas,
                "faturas_pagas": int(faturas_pagas or 0),
                "percentual_instrutores": round(percentual, 2),
                "peso_total_pool": peso_total,
                "receita_media_assinatura": round(valor_assinatura, 2),
                "ticket_medio_aluno": round(ticket_medio, 2),
                "alunos_pagantes": int(alunos_pagantes or 0),
                "total_alunos": len(ticket_alunos),
                # Sprint item 35 - Calcular ticket médio por aluno. lista gastos individuais para a seção de ticket por aluno no financeiro.
                "ticket_alunos": ticket_alunos,
                # Sprint item 16 - Exibir indicadores da saúde financeira da empresa. calcula a margem financeira histórica após as comissões dos instrutores e as despesas registradas.
                "margem_caixa_percentual": round(((total_arrecadado - pool_historico_instrutores - custos) / total_arrecadado) * 100, 2) if total_arrecadado else 0,
            })
            resposta_financeiro.headers["Cache-Control"] = "no-store"
            return resposta_financeiro

        # Sprint item 34 - Exibir faturas em aberto. registra a mensalidade vencida antes de somar as faturas em aberto.
        # O ramo restante é do aluno: uma fatura vencida precisa existir antes
        # de devolver os cartões com total pago e total pendente.
        garantir_fatura_vencida(cursor, con, id_usuario)
        cursor.execute(
            "SELECT COUNT(*), COALESCE(CAST(SUM(VALOR) AS DOUBLE PRECISION), 0) FROM ASSINATURAS WHERE ID_USUARIO = ? AND STATUS IN (1, 3)",
            (id_usuario,),
        )
        qtd, gasto = cursor.fetchone() or (0, 0)
        cursor.execute(
            "SELECT COUNT(*), COALESCE(CAST(SUM(VALOR) AS DOUBLE PRECISION), 0) FROM ASSINATURAS WHERE ID_USUARIO = ? AND STATUS = 0",
            (id_usuario,),
        )
        abertas, aberto = cursor.fetchone() or (0, 0)
        # Sprint item 33 - Exibir total gasto e histórico de faturas do aluno. o resumo financeiro do aluno devolve contagens e
        # totais gastos/em aberto para os cartões do painel. O histórico de
        # cada fatura vem da rota de mensalidades em pagamento_arkhe.py.
        # Sprint item 33 - Exibir total gasto e histórico de faturas do aluno. soma pagas mesmo quando a assinatura já expirou.
        # Sprint item 34 - Exibir faturas em aberto. separa cobranças abertas do histórico pago.
        return jsonify({
            "perfil": "aluno",
            "faturas": int(qtd or 0),
            "faturas_abertas": int(abertas or 0),
            "total_gasto": float(gasto or 0),
            "total_aberto": float(aberto or 0),
        })
    except Exception as erro:
        return resposta(f"Erro ao carregar financeiro: {erro}", 500)
    finally:
        cursor.close()
        con.close()



@app.route("/admin/alunos/<int:id_aluno>/financeiro", methods=["GET"])
@jwt_required()
def financeiro_aluno_admin(id_aluno):
    """Itens 33 a 35: mostra o histórico e o ticket de um aluno ao admin.

    Mensalidades pagas continuam no total mesmo após vencerem; faturas abertas
    são somadas à parte. O ticket médio divide o total pago pelo número de
    mensalidades pagas, não pelo número de cursos.
    """
    negado = exigir_tipo(0)
    if negado:
        return negado

    garantir_estrutura_banco()
    con = get_db()
    cursor = con.cursor()

    try:
        cursor.execute(
            "SELECT ID_USUARIO, NOME, EMAIL, CPF, SITUACAO, EMAIL_VERIFICADO, CRIADO_EM "
            "FROM USUARIOS WHERE ID_USUARIO = ? AND TIPO_USUARIO = 2",
            (id_aluno,),
        )
        aluno = cursor.fetchone()
        if not aluno:
            return resposta("Aluno não encontrado.", 404)

        # Sprint item 33 - Exibir total gasto e histórico de faturas do aluno. inclui mensalidades expiradas no histórico financeiro do aluno visto pelo administrador.
        cursor.execute("SELECT COUNT(*), COALESCE(CAST(SUM(VALOR) AS DOUBLE PRECISION), 0) FROM ASSINATURAS WHERE ID_USUARIO = ? AND STATUS IN (1, 3)", (id_aluno,))
        faturas_pagas, total_pago = cursor.fetchone() or (0, 0)
        faturas_pagas = int(faturas_pagas or 0)
        total_pago = float(total_pago or 0)

        cursor.execute(
            """
            SELECT C.ID_CURSO, C.TITULO, M.PROGRESSO, M.DATA_INSCRICAO
            FROM MATRICULAS M
            JOIN CURSOS C ON C.ID_CURSO = M.ID_CURSO
            WHERE M.ID_USUARIO = ? AND M.STATUS_MATRICULA = 1
            ORDER BY C.TITULO
            """,
            (id_aluno,),
        )
        cursos = [{
            "id": row[0], "titulo": row[1], "progresso": int(row[2] or 0),
            "data_inscricao": row[3].isoformat() if row[3] else None,
        } for row in cursor.fetchall()]
        cursor.execute("SELECT COUNT(*) FROM PROGRESSO_AULAS WHERE ID_USUARIO = ? AND ASSISTIDO_EM IS NOT NULL", (id_aluno,))
        aulas_concluidas = int((cursor.fetchone() or (0,))[0] or 0)
        cursor.execute(
            "SELECT COUNT(*), COALESCE(CAST(SUM(VALOR) AS DOUBLE PRECISION), 0) FROM ASSINATURAS WHERE ID_USUARIO = ? AND STATUS = 0",
            (id_aluno,),
        )
        faturas_abertas, total_aberto = cursor.fetchone() or (0, 0)
        cursor.execute(
            """
            SELECT ID_ASSINATURA, STATUS, VALOR, DATA_PAGAMENTO, DATA_VENCIMENTO, CRIADO_EM, DATA_EXPIRACAO
            FROM ASSINATURAS
            WHERE ID_USUARIO = ? AND STATUS IN (0, 1, 3)
            ORDER BY ID_ASSINATURA DESC
            """,
            (id_aluno,),
        )
        faturas = []
        for row in cursor.fetchall():
            status = int(row[1] or 0)
            expiracao = row[6]
            acesso_expirado = status == 3 or bool(expiracao and expiracao <= datetime.now())
            faturas.append({
                "id": row[0],
                "status": status,
                "status_label": "Paga" if status in (1, 3) else "Em aberto",
                "acesso_label": (
                    "Acesso expirado" if acesso_expirado else
                    "Acesso válido" if status == 1 and expiracao else
                    "Validade não informada" if status == 1 else None
                ),
                "valor": float(row[2] or 0),
                "data_pagamento": row[3].isoformat() if row[3] else None,
                "data_vencimento": row[4].isoformat() if row[4] else None,
                "criado_em": row[5].isoformat() if row[5] else None,
                "data_expiracao": expiracao.isoformat() if expiracao else None,
            })
        acesso_atual = (
            "Pagamento pendente" if int(faturas_abertas or 0) else
            "Ativo" if any(fatura["acesso_label"] == "Acesso válido" for fatura in faturas) else
            "Sem assinatura ativa"
        )
        # Sprint item 35 - Calcular ticket médio por aluno. apresenta ticket mensal, gasto total, faturas, cursos ativos e aulas concluídas.
        return jsonify({
            "aluno": {
                "id": aluno[0], "nome": aluno[1], "email": aluno[2], "cpf": aluno[3],
                "bloqueado": aluno[4] == 1,
                "email_verificado": None if aluno[5] is None else aluno[5] == 1,
                "criado_em": aluno[6].isoformat() if aluno[6] else None,
            },
            "acesso_atual": acesso_atual,
            "ticket_medio": round(total_pago / faturas_pagas, 2) if faturas_pagas else 0,
            "total_pago": round(total_pago, 2),
            "faturas_pagas": faturas_pagas,
            "faturas_abertas": int(faturas_abertas or 0),
            "total_aberto": round(float(total_aberto or 0), 2),
            "faturas": faturas,
            "cursos": cursos,
            "aulas_concluidas": aulas_concluidas,
        })
    except Exception as erro:
        return resposta(f"Erro ao carregar financeiro do aluno: {erro}", 500)
    finally:
        cursor.close()
        con.close()



@app.route("/admin/custos-plataforma", methods=["GET", "POST"])
@jwt_required()
def custos_plataforma_admin():
    """Sprint item 36 - Permitir cadastro e acompanhamento dos custos da plataforma. lista ou cadastra despesas, validando categoria, valor e datas.

    Um custo mensal vira ocorrências separadas para que cada competência entre
    no caixa no mês devido. A operação inteira é confirmada com ``commit``.
    """
    negado = exigir_tipo(0)
    if negado:
        return negado

    garantir_estrutura_banco()
    con = get_db()
    cursor = con.cursor()
    try:
        if request.method == "POST":
            dados = request.get_json() or {}
            descricao = (dados.get("descricao") or "").strip()
            tipo_custo = (dados.get("tipo_custo") or "UNICO").strip().upper()
            try:
                id_categoria = int(dados.get("id_categoria"))
                valor = Decimal(str(dados.get("valor", ""))).quantize(Decimal("0.01"))
            except (InvalidOperation, TypeError, ValueError):
                return resposta("Selecione uma categoria e informe um valor válido.", 400)
            if not descricao or len(descricao) > 200:
                return resposta("A descrição é obrigatória e deve ter até 200 caracteres.", 400)
            if not valor.is_finite() or valor <= 0:
                return resposta("O valor do custo deve ser maior que zero.", 400)
            if tipo_custo not in {"UNICO", "MENSAL"}:
                return resposta("O tipo de custo deve ser pagamento único ou mensal.", 400)
            cursor.execute("SELECT NOME FROM CATEGORIAS_CUSTO WHERE ID_CATEGORIA = ?", (id_categoria,))
            categoria = cursor.fetchone()
            if not categoria:
                return resposta("A categoria selecionada não existe.", 400)
            categoria_nome = categoria[0]
            try:
                if tipo_custo == "UNICO":
                    data_inicio = date.fromisoformat(dados.get("data_custo") or "")
                    data_fim = data_inicio
                    meses = [data_inicio]
                else:
                    data_inicio = date.fromisoformat(dados.get("data_inicio") or "")
                    data_fim = date.fromisoformat(dados.get("data_fim") or "")
                    if data_inicio > data_fim:
                        return resposta("A data de início deve ser anterior ou igual à data de fim.", 400)
                    quantidade_meses = (data_fim.year - data_inicio.year) * 12 + data_fim.month - data_inicio.month + 1
                    if quantidade_meses > 120:
                        return resposta("O período mensal não pode ultrapassar 120 meses.", 400)
                    meses = []
                    ano, mes = data_inicio.year, data_inicio.month
                    # Avança calendário mês a mês. A primeira ocorrência usa
                    # a data inicial real; as seguintes começam no dia 1.
                    while (ano, mes) <= (data_fim.year, data_fim.month):
                        data_mes = date(ano, mes, 1)
                        meses.append(max(data_inicio, data_mes))
                        mes += 1
                        if mes == 13:
                            ano, mes = ano + 1, 1
            except (TypeError, ValueError):
                return resposta("Informe datas válidas para o período do custo.", 400)

            # Sprint item 36 - Permitir cadastro e acompanhamento dos custos da plataforma. registra pagamento único ou uma ocorrência para cada mês do período mensal.
            id_custo_inicial = proximo_id(cursor, "CUSTOS_PLATAFORMA", "ID_CUSTO")
            id_grupo = id_custo_inicial if tipo_custo == "MENSAL" else None
            # Mesmo grupo mensal permite reconhecer as parcelas como uma
            # despesa recorrente; cada linha tem sua própria data e ID.
            for indice, data_mes in enumerate(meses):
                cursor.execute(
                    """
                    INSERT INTO CUSTOS_PLATAFORMA
                        (ID_CUSTO, DESCRICAO, VALOR, DATA_CUSTO, CATEGORIA, ID_USUARIO,
                         ID_CATEGORIA, TIPO_CUSTO, DATA_INICIO, DATA_FIM, ID_GRUPO_MENSAL)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        id_custo_inicial + indice, descricao, float(valor), data_mes,
                        categoria_nome, get_jwt_identity(), id_categoria, tipo_custo,
                        data_inicio, data_fim, id_grupo,
                    ),
                )
            con.commit()
            return resposta(
                f"Custo cadastrado. Meses registrados: {len(meses)}.",
                201,
                "sucesso",
            )

        cursor.execute(
            """
            SELECT ID_CUSTO, DESCRICAO, VALOR, DATA_CUSTO, CATEGORIA, CRIADO_EM,
                   TIPO_CUSTO, DATA_INICIO, DATA_FIM, ID_GRUPO_MENSAL
            FROM CUSTOS_PLATAFORMA
            ORDER BY DATA_CUSTO DESC, ID_CUSTO DESC
            """
        )
        return jsonify([
            {
                "id": row[0],
                "descricao": row[1],
                "valor": float(row[2] or 0),
                "data_custo": row[3].isoformat() if row[3] else None,
                "categoria": row[4] or "geral",
                "criado_em": row[5].isoformat() if row[5] else None,
                "tipo_custo": row[6] or "UNICO",
                "data_inicio": row[7].isoformat() if row[7] else None,
                "data_fim": row[8].isoformat() if row[8] else None,
                "id_grupo_mensal": row[9],
            }
            for row in cursor.fetchall()
        ])
    except Exception as erro:
        con.rollback()
        return resposta(f"Erro ao processar custos: {erro}", 500)
    finally:
        cursor.close()
        con.close()


@app.route("/admin/categorias-custo", methods=["GET", "POST"])
@jwt_required()
def categorias_custo_admin():
    """Sprint item 36 - Permitir cadastro e acompanhamento dos custos da plataforma. lista categorias ou cadastra uma nova sem repetir o nome."""
    negado = exigir_tipo(0)
    if negado:
        return negado
    garantir_estrutura_banco()
    con = get_db()
    cursor = con.cursor()
    try:
        if request.method == "POST":
            dados = request.get_json() or {}
            nome = (dados.get("nome") or "").strip()
            if not nome or len(nome) > 80:
                return resposta("Informe uma categoria com até 80 caracteres.", 400)
            cursor.execute("SELECT ID_CATEGORIA FROM CATEGORIAS_CUSTO WHERE UPPER(NOME) = UPPER(?)", (nome,))
            if cursor.fetchone():
                return resposta("Essa categoria já está cadastrada.", 409)
            cursor.execute(
                "INSERT INTO CATEGORIAS_CUSTO (ID_CATEGORIA, NOME) VALUES (?, ?)",
                (proximo_id(cursor, "CATEGORIAS_CUSTO", "ID_CATEGORIA"), nome),
            )
            con.commit()
            return resposta("Categoria de custo cadastrada.", 201, "sucesso")
        cursor.execute("SELECT ID_CATEGORIA, NOME FROM CATEGORIAS_CUSTO ORDER BY NOME")
        return jsonify([{"id": row[0], "nome": row[1]} for row in cursor.fetchall()])
    except Exception as erro:
        con.rollback()
        return resposta(f"Erro ao processar categorias de custo: {erro}", 500)
    finally:
        cursor.close()
        con.close()


@app.route("/admin/financeiro/transacoes", methods=["GET"])
@jwt_required()
def transacoes_financeiras_admin():
    """Sprint item 13 - Criar gestão financeira do sistema. junta mensalidades, custos e pagamentos em uma lista única.

    As consultas trazem movimentos de tabelas distintas; o código converte
    cada linha para o mesmo formato antes de ordenar e devolver ao painel.
    """
    negado = exigir_tipo(0)
    if negado:
        return negado

    garantir_estrutura_banco()
    con = get_db()
    cursor = con.cursor()

    try:
        transacoes = []
        # Sprint item 13 - Criar gestão financeira do sistema. reúne pagamentos de assinaturas, despesas e saques numa visão administrativa única.
        cursor.execute(
            """
            SELECT A.ID_ASSINATURA, A.ID_USUARIO, U.NOME, A.VALOR, A.STATUS,
                   A.DATA_PAGAMENTO, A.DATA_VENCIMENTO, A.CRIADO_EM
            FROM ASSINATURAS A
            LEFT JOIN USUARIOS U ON U.ID_USUARIO = A.ID_USUARIO
            ORDER BY COALESCE(A.DATA_PAGAMENTO, A.CRIADO_EM) DESC
            """
        )
        for row in cursor.fetchall():
            data = row[5] or row[7] or row[6]
            transacoes.append({
                "id": f"assinatura-{row[0]}",
                "data": data.isoformat() if data else None,
                "tipo": "Assinatura",
                "descricao": f"Mensalidade de {row[2] or 'aluno'}",
                # Sprint item 33 - Exibir total gasto e histórico de faturas do aluno. o vencimento da assinatura não altera o pagamento da transação.
                "status": "Paga" if int(row[4] or 0) in (1, 3) else "Pendente",
                "valor": float(row[3] or 0),
                "direcao": "entrada" if int(row[4] or 0) in (1, 3) else "pendente",
            })

        cursor.execute(
            """
            SELECT ID_CUSTO, DESCRICAO, CATEGORIA, VALOR, DATA_CUSTO, CRIADO_EM, TIPO_CUSTO
            FROM CUSTOS_PLATAFORMA
            """
        )
        for row in cursor.fetchall():
            data = row[4] or row[5]
            transacoes.append({
                "id": f"despesa-{row[0]}",
                "data": data.isoformat() if data else None,
                "tipo": "Despesa mensal" if row[6] == "MENSAL" else "Pagamento \u00danico",
                "descricao": row[1],
                "categoria": row[2] or "Geral",
                "status": "Programada" if data and (data.date() if isinstance(data, datetime) else data) > date.today() else "Registrada",
                "valor": float(row[3] or 0),
                "direcao": "saida",
            })

        cursor.execute(
            """
            SELECT S.ID_SAQUE, U.NOME, S.VALOR, S.STATUS, S.CRIADO_EM
            FROM SAQUES_INSTRUTOR S
            LEFT JOIN USUARIOS U ON U.ID_USUARIO = S.ID_USUARIO
            """
        )
        for row in cursor.fetchall():
            status = int(row[3] or 0)
            transacoes.append({
                "id": f"saque-{row[0]}",
                "data": row[4].isoformat() if row[4] else None,
                "tipo": "Pagamento ao professor",
                "descricao": f"Solicitação de {row[1] or 'professor'}",
                "status": {0: "Solicitado", 1: "Concluído", 2: "Recusado"}.get(status, "Desconhecido"),
                "valor": float(row[2] or 0),
                "direcao": "saida" if status == 1 else "neutra",
            })

        transacoes.sort(key=lambda item: item["data"] or "", reverse=True)
        return jsonify(transacoes)
    except Exception as erro:
        return resposta(f"Erro ao listar transações financeiras: {erro}", 500)
    finally:
        cursor.close()
        con.close()



@app.route("/admin/financeiro/config", methods=["GET", "PATCH"])
@jwt_required()
def financeiro_config_admin():
    """Sprint item 14 - Exibir total arrecadado e total repassado aos instrutores. consulta ou altera a porcentagem do fundo dos instrutores.

    O administrador escolhe de 0 a 100; as rotas de resumo financeiro leem o
    valor persistido para calcular as estimativas exibidas nos painéis.
    """
    negado = exigir_tipo(0)
    if negado:
        return negado

    garantir_estrutura_banco()
    con = get_db()
    cursor = con.cursor()

    try:
        if request.method == "GET":
            return jsonify({
                "percentual_instrutores": round(percentual_instrutores(cursor), 2)
            })

        dados = request.get_json() or {}
        percentual = float(dados.get("percentual_instrutores"))

        if percentual < 0 or percentual > 100:
            return resposta("Percentual dos instrutores deve ficar entre 0 e 100.", 400)

        cursor.execute(
            """
            UPDATE FINANCEIRO_CONFIG
            SET PERCENTUAL_INSTRUTORES = ?, ATUALIZADO_EM = CURRENT_TIMESTAMP
            WHERE ID_CONFIG = 1
            """,
            (percentual,),
        )
        con.commit()
        return resposta("Percentual do pool atualizado com sucesso.", 200, "sucesso", percentual_instrutores=round(percentual, 2))
    except (TypeError, ValueError):
        con.rollback()
        return resposta("Percentual dos instrutores invalido.", 400)
    except Exception as erro:
        con.rollback()
        return resposta(f"Erro ao atualizar configuracao financeira: {erro}", 500)
    finally:
        cursor.close()
        con.close()

__all__ = ['financeiro_resumo', 'financeiro_aluno_admin', 'custos_plataforma_admin', 'categorias_custo_admin', 'transacoes_financeiras_admin', 'financeiro_config_admin']
