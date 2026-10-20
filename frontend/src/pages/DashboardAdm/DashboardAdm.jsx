import React, { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import {
    FaGraduationCap,
    FaUser,
    FaPlay,
    FaFolder,
    FaGooglePlay,
    FaLinux,
    FaWindows
} from "react-icons/fa";
import MenuLateralAdm from "../../components/MenuLateral/MenuLateralAdm.jsx";
import css from "./DashboardAdm.module.css";
import PerfilUsuario from "../../components/PerfilUsuario/PerfilUsuario.jsx";
import GoogleChart from "../../components/GoogleChart/GoogleChart.jsx";

export default function DashboardAdm({
                                         api,
                                         setMensagem,
                                         onPerfilAtualizado,
                                         usuario
                                     }) {
    const location = useLocation();
    const exibindoInicio = location.pathname === "/DashboardAdm";
    const exibindoPerfil = location.pathname.endsWith("/perfil");
    const exibindoFinanceiro = location.pathname.endsWith("/Financeiro");
    const exibindoLogs = location.pathname.endsWith("/Logs");
    // Sprint item 22: identifica a tela administrativa de relatórios e seus filtros selecionados.
    const exibindoRelatorios = location.pathname.endsWith("/Relatorios");
    const [dashboard, setDashboard] = useState(null);
    const [financeiro, setFinanceiro] = useState(null);
    const [percentualInstrutores, setPercentualInstrutores] = useState("");
    const [categoriasCusto, setCategoriasCusto] = useState([]);
    const [transacoes, setTransacoes] = useState([]);
    const [novoCustoUnico, setNovoCustoUnico] = useState({ descricao: "", id_categoria: "", valor: "", data_custo: "" });
    const [novoCustoMensal, setNovoCustoMensal] = useState({ descricao: "", id_categoria: "", valor: "", data_inicio: "", data_fim: "" });
    const [novaCategoriaCusto, setNovaCategoriaCusto] = useState("");
    const [filtrosTransacoes, setFiltrosTransacoes] = useState({ tipo: "", categoria: "", inicio: "", fim: "", status: "" });
    const [logsGravacao, setLogsGravacao] = useState([]);
    // Sprint item 24: separa a consulta de auditoria por perfil e categoria de atividade.
    const [filtrosLogs, setFiltrosLogs] = useState({ busca: "", tipo: "0", evento: "", acao: "", inicio: "", fim: "" });
    const [logExpandido, setLogExpandido] = useState(null);
    const [temMaisLogs, setTemMaisLogs] = useState(false);
    const [carregandoMaisLogs, setCarregandoMaisLogs] = useState(false);
    const [relatorio, setRelatorio] = useState(null);
    const [cursosRelatorio, setCursosRelatorio] = useState([]);
    const [instrutoresRelatorio, setInstrutoresRelatorio] = useState([]);
    const [filtrosRelatorio, setFiltrosRelatorio] = useState({ inicio: "", fim: "", id_instrutor: "", id_curso: "" });
    const [carregandoRelatorio, setCarregandoRelatorio] = useState(false);

    function descricaoErroApi(erro) {
        if (erro instanceof TypeError && erro.message === "Failed to fetch") {
            return `Não foi possível conectar à API (${api}). Verifique se o backend está ativo e acessível pelo navegador.`;
        }
        return erro?.message || "Ocorreu um erro ao comunicar com o servidor.";
    }

    function rotuloAcaoLog(acao) {
        return ({ INSERT: "Inclusao", UPDATE: "Alteracao", DELETE: "Exclusao" })[acao] || acao;
    }

    function formatarDataLog(valor) {
        if (!valor) return "";
        return new Date(valor).toLocaleString("pt-BR");
    }

    // Sprint item 24: formata os snapshots de valores do log para leitura detalhada no site.
    function formatarJson(valor) {
        if (!valor) return "Sem dados registrados";
        try { return JSON.stringify(JSON.parse(valor), null, 2); }
        catch { return valor; }
    }

    // Busca as métricas agregadas no endpoint administrativo ao abrir o dashboard.
    useEffect(() => {
        if (exibindoPerfil || exibindoFinanceiro || exibindoLogs || exibindoRelatorios) {
            return;
        }

        async function carregarDashboard() {
            try {
                const resposta = await fetch(`${api}/admin/dashboard`, {
                    credentials: "include"
                });
                const dados = await resposta.json().catch(() => ({}));

                if (dados.mensagem && setMensagem) {
                    setMensagem(dados.mensagem);
                }

                if (!resposta.ok) {
                    throw new Error(dados?.mensagem?.descricao || "Erro ao carregar dashboard.");
                }

                setDashboard(dados.metricas || {});
            } catch (erro) {
                console.error("Erro ao carregar dashboard do administrador:", erro);
                if (setMensagem) {
                    setMensagem({
                        tipo: "erro",
                        descricao: erro.message
                    });
                }
            }
        }

        carregarDashboard();
    }, [api, exibindoFinanceiro, exibindoLogs, exibindoPerfil, exibindoRelatorios, setMensagem]);

    // Sprint item 22: carrega as opções administrativas e gera relatório geral filtrável por período, instrutor e curso.
    useEffect(() => {
        if (!exibindoRelatorios) return;
        let ativo = true;
        async function carregarOpcoes() {
            try {
                const [respostaUsuarios, respostaRelatorio] = await Promise.all([
                    fetch(`${api}/usuarios`, { credentials: "include" }),
                    fetch(`${api}/relatorios/professor`, { credentials: "include" })
                ]);
                const [usuarios, dadosRelatorio] = await Promise.all([
                    respostaUsuarios.json().catch(() => []),
                    respostaRelatorio.json().catch(() => ({}))
                ]);
                if (!respostaUsuarios.ok) throw new Error(usuarios?.mensagem?.descricao || "Não foi possível carregar instrutores.");
                if (!respostaRelatorio.ok) throw new Error(dadosRelatorio?.mensagem?.descricao || "Não foi possível carregar os cursos.");
                if (!ativo) return;
                setInstrutoresRelatorio((Array.isArray(usuarios) ? usuarios : []).filter((item) => Number(item.tipo_usuario ?? item.tipo) === 1));
                setCursosRelatorio(dadosRelatorio.cursos || []);
                setRelatorio(dadosRelatorio);
            } catch (erro) { setMensagem?.({ tipo: "erro", descricao: erro.message }); }
        }
        carregarOpcoes();
        return () => { ativo = false; };
    }, [api, exibindoRelatorios, setMensagem]);

    async function carregarRelatorio() {
        setCarregandoRelatorio(true);
        try {
            const params = new URLSearchParams();
            Object.entries(filtrosRelatorio).forEach(([chave, valor]) => { if (valor) params.set(chave, valor); });
            const resposta = await fetch(`${api}/relatorios/professor?${params.toString()}`, { credentials: "include" });
            const dados = await resposta.json().catch(() => ({}));
            if (!resposta.ok) throw new Error(dados?.mensagem?.descricao || "Não foi possível gerar o relatório.");
            setRelatorio(dados);
        } catch (erro) { setMensagem?.({ tipo: "erro", descricao: erro.message }); }
        finally { setCarregandoRelatorio(false); }
    }

    useEffect(() => {
        if (!exibindoFinanceiro) return;

        async function carregarFinanceiro() {
            // Carrega cada área em paralelo: falha no resumo não deve bloquear categorias ou transações.
            const resultados = await Promise.allSettled([
                fetch(`${api}/financeiro/resumo`, { credentials: "include", cache: "no-store" }),
                fetch(`${api}/admin/categorias-custo`, { credentials: "include", cache: "no-store" }),
                fetch(`${api}/admin/financeiro/transacoes`, { credentials: "include", cache: "no-store" }),
            ]);
            const erros = [];

            const [resumo, categorias, transacoesAtuais] = resultados.map((resultado) => {
                if (resultado.status === "rejected") {
                    erros.push(resultado.reason);
                    return null;
                }
                return resultado.value;
            });

            if (resumo) {
                const dados = await resumo.json().catch(() => ({}));
                if (resumo.ok) {
                    setFinanceiro(dados);
                    setPercentualInstrutores(String(dados.percentual_instrutores ?? 50));
                } else {
                    erros.push(new Error(dados?.mensagem?.descricao || "Erro ao carregar o resumo financeiro."));
                }
            }

            if (categorias) {
                const dadosCategorias = await categorias.json().catch(() => ([]));
                if (categorias.ok) setCategoriasCusto(Array.isArray(dadosCategorias) ? dadosCategorias : []);
                else erros.push(new Error(dadosCategorias?.mensagem?.descricao || "Erro ao carregar categorias de custo."));
            }

            if (transacoesAtuais) {
                const dadosTransacoes = await transacoesAtuais.json().catch(() => ([]));
                if (transacoesAtuais.ok) setTransacoes(Array.isArray(dadosTransacoes) ? dadosTransacoes : []);
                else erros.push(new Error(dadosTransacoes?.mensagem?.descricao || "Erro ao carregar transações financeiras."));
            }

            if (erros.length) {
                console.error("Erros ao carregar áreas do financeiro:", erros);
                setMensagem?.({ tipo: "erro", descricao: descricaoErroApi(erros[0]) });
            }
        }

        carregarFinanceiro();
    }, [api, exibindoFinanceiro, setMensagem]);

    async function salvarPercentualInstrutores() {
        try {
            const resposta = await fetch(`${api}/admin/financeiro/config`, {
                method: "PATCH",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    percentual_instrutores: Number(percentualInstrutores)
                })
            });
            const dados = await resposta.json().catch(() => ({}));

            if (dados.mensagem && setMensagem) {
                setMensagem(dados.mensagem);
            }

            if (!resposta.ok) {
                throw new Error(dados?.mensagem?.descricao || "Erro ao atualizar percentual.");
            }

            const resumo = await fetch(`${api}/financeiro/resumo`, { credentials: "include" });
            const financeiroAtualizado = await resumo.json().catch(() => ({}));
            if (!resumo.ok) throw new Error(financeiroAtualizado?.mensagem?.descricao || "Erro ao recarregar financeiro.");
            setFinanceiro(financeiroAtualizado);
            setPercentualInstrutores(String(financeiroAtualizado.percentual_instrutores ?? percentualInstrutores));
        } catch (erro) {
            console.error("Erro ao salvar percentual:", erro);
            setMensagem?.({ tipo: "erro", descricao: erro.message });
        }
    }

    async function atualizarTransacoesFinanceiras() {
        const respostaTransacoes = await fetch(`${api}/admin/financeiro/transacoes`, { credentials: "include", cache: "no-store" });
        const dadosTransacoes = await respostaTransacoes.json().catch(() => ([]));
        if (respostaTransacoes.ok) setTransacoes(Array.isArray(dadosTransacoes) ? dadosTransacoes : []);
    }

    async function cadastrarCusto(evento, tipoCusto) {
        evento.preventDefault();
        const dadosCusto = tipoCusto === "MENSAL" ? novoCustoMensal : novoCustoUnico;
        try {
            const resposta = await fetch(`${api}/admin/custos-plataforma`, {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...dadosCusto, tipo_custo: tipoCusto })
            });
            const dados = await resposta.json().catch(() => ({}));
            if (dados.mensagem) setMensagem?.(dados.mensagem);
            if (!resposta.ok) throw new Error(dados?.mensagem?.descricao || "Erro ao cadastrar custo.");
            if (tipoCusto === "MENSAL") setNovoCustoMensal({ descricao: "", id_categoria: "", valor: "", data_inicio: "", data_fim: "" });
            else setNovoCustoUnico({ descricao: "", id_categoria: "", valor: "", data_custo: "" });
            await atualizarTransacoesFinanceiras();
            const resumo = await fetch(`${api}/financeiro/resumo`, { credentials: "include", cache: "no-store" });
            if (resumo.ok) setFinanceiro(await resumo.json());
        } catch (erro) {
            setMensagem?.({ tipo: "erro", descricao: descricaoErroApi(erro) });
        }
    }

    async function cadastrarCategoriaCusto(evento) {
        evento.preventDefault();
        try {
            const resposta = await fetch(`${api}/admin/categorias-custo`, {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ nome: novaCategoriaCusto })
            });
            const dados = await resposta.json().catch(() => ({}));
            if (dados.mensagem) setMensagem?.(dados.mensagem);
            if (!resposta.ok) throw new Error(dados?.mensagem?.descricao || "Erro ao cadastrar categoria.");
            setNovaCategoriaCusto("");
            const lista = await fetch(`${api}/admin/categorias-custo`, { credentials: "include", cache: "no-store" });
            const categorias = await lista.json().catch(() => ([]));
            if (lista.ok) setCategoriasCusto(Array.isArray(categorias) ? categorias : []);
        } catch (erro) {
            setMensagem?.({ tipo: "erro", descricao: descricaoErroApi(erro) });
        }
    }

    useEffect(() => {
        if (!exibindoLogs) return;

        async function carregarLogs() {
            try {
                const params = new URLSearchParams();
                Object.entries(filtrosLogs).forEach(([chave, valor]) => {
                    if (valor) params.set(chave, valor);
                });
                const respostaGravacao = await fetch(`${api}/admin/logs-gravacao?${params.toString()}`, { credentials: "include" });
                const dadosGravacao = await respostaGravacao.json().catch(() => ({}));
                if (!respostaGravacao.ok) throw new Error(dadosGravacao?.mensagem?.descricao || "Erro ao carregar logs.");
                const registros = Array.isArray(dadosGravacao) ? dadosGravacao : [];
                setLogsGravacao(registros.slice(0, 100));
                setTemMaisLogs(registros.length > 100);
            } catch (erro) {
                console.error("Erro ao carregar logs:", erro);
                setMensagem?.({ tipo: "erro", descricao: erro.message });
            }
        }

        carregarLogs();
    }, [api, exibindoLogs, filtrosLogs, setMensagem]);

    // Sprint item 24: pagina os registros para que a busca de um usuario possa percorrer todo o historico.
    async function carregarMaisLogs() {
        setCarregandoMaisLogs(true);
        try {
            const params = new URLSearchParams();
            Object.entries(filtrosLogs).forEach(([chave, valor]) => { if (valor) params.set(chave, valor); });
            params.set("offset", String(logsGravacao.length));
            const resposta = await fetch(`${api}/admin/logs-gravacao?${params.toString()}`, { credentials: "include" });
            const dados = await resposta.json().catch(() => ([]));
            if (!resposta.ok) throw new Error(dados?.mensagem?.descricao || "Erro ao carregar mais logs.");
            const registros = Array.isArray(dados) ? dados : [];
            setLogsGravacao((atuais) => [...atuais, ...registros.slice(0, 100)]);
            setTemMaisLogs(registros.length > 100);
        } catch (erro) { setMensagem?.({ tipo: "erro", descricao: erro.message }); }
        finally { setCarregandoMaisLogs(false); }
    }

    // Converte a resposta da API nos indicadores apresentados nos cards.
    const metricas = useMemo(() => {
        const dados = dashboard || {};

        return [
            {
                id: 1,
                titulo: "Total de professores",
                textoMes: "Total real cadastrado",
                quantidade: dados.total_professores ?? 0,
                icone: <FaGraduationCap />
            },
            {
                id: 2,
                titulo: "Total de alunos",
                textoMes: "Total real cadastrado",
                quantidade: dados.total_alunos ?? 0,
                icone: <FaUser />
            },
            {
                id: 3,
                titulo: "Aulas publicadas",
                textoMes: `${dados.aulas_mes ?? 0} video-aulas esse mes`,
                quantidade: dados.aulas_publicadas ?? 0,
                icone: <FaPlay />
            },
            {
                id: 4,
                titulo: "Cursos",
                textoMes: `+${dados.cursos_mes ?? 0} cursos criados esse mes`,
                quantidade: dados.cursos ?? 0,
                icone: <FaFolder />
            }
        ];
    }, [dashboard]);

    // Sprint item 8: prepara os indicadores administrativos para o gráfico único de resumo da plataforma.
    const dadosGraficoAdmin = useMemo(() => [
        ["Indicador", "Quantidade"],
        ["Professores", Number(dashboard?.total_professores || 0)],
        ["Alunos", Number(dashboard?.total_alunos || 0)],
        ["Aulas publicadas", Number(dashboard?.aulas_publicadas || 0)],
        ["Cursos", Number(dashboard?.cursos || 0)]
    ], [dashboard]);
    const opcoesGraficoAdmin = useMemo(() => ({
        legend: { position: "none" },
        colors: ["#139a58"],
        chartArea: { left: 55, top: 12, width: "86%", height: "76%" },
        height: 300,
        vAxis: { minValue: 0, format: "0", textStyle: { color: "#4c5b53" } },
        hAxis: { textStyle: { color: "#4c5b53" } },
        backgroundColor: "transparent"
    }), []);
    // Sprint item 36: filtra o livro de transações por período, tipo, categoria e status.
    const transacoesFiltradas = useMemo(() => transacoes.filter((transacao) => {
        const data = (transacao.data || "").slice(0, 10);
        return (!filtrosTransacoes.tipo || transacao.tipo === filtrosTransacoes.tipo)
            && (!filtrosTransacoes.categoria || transacao.categoria === filtrosTransacoes.categoria)
            && (!filtrosTransacoes.inicio || data >= filtrosTransacoes.inicio)
            && (!filtrosTransacoes.fim || data <= filtrosTransacoes.fim)
            && (!filtrosTransacoes.status || transacao.status === filtrosTransacoes.status);
    }), [transacoes, filtrosTransacoes]);

    return (
        <div className={css.painelAdm}>
            <MenuLateralAdm itemAtivo={exibindoPerfil ? "perfil" : exibindoFinanceiro ? "financeiro" : exibindoLogs ? "logs" : exibindoRelatorios ? "relatorios" : "inicio"} />

            <div className={css.conteudoPrincipal}>
                <main className={css.areaConteudo}>
                    {exibindoInicio && (
                        <header className={css.cabecalhoUsuario}>
                            <div className={css.dadosUsuario}>
                                <h1>Olá {usuario.nome}</h1>
                                <span className={css.cargoUsuario}>
                                    {Number(usuario.tipo) === 0 && "Administrador"}
                                    {Number(usuario.tipo) === 1 && "Professor"}
                                    {Number(usuario.tipo) === 2 && "Aluno"}
                                </span>
                            </div>
                        </header>
                    )}

                    {/* Sprint item 9: identifica a área administrativa atual e orienta a leitura da página. */}
                    <section className={css.cabecalhoPagina}>
                        <div>
                            <span className={css.etiquetaPagina}>
                                {exibindoPerfil ? "CONTA" : exibindoFinanceiro ? "FINANCEIRO" : exibindoLogs ? "AUDITORIA" : exibindoRelatorios ? "RELATÓRIOS" : "ADMINISTRAÇÃO"}
                            </span>
                            <h2>{exibindoPerfil ? "Perfil do administrador" : exibindoFinanceiro ? "Visão financeira" : exibindoLogs ? "Atividade do sistema" : exibindoRelatorios ? "Relatórios da plataforma" : "Visão geral"}</h2>
                            <p>{exibindoPerfil
                                ? "Atualize seus dados e mantenha as informações da conta em dia."
                                : exibindoFinanceiro
                                    ? "Acompanhe arrecadação, repasses, custos e saldo da plataforma."
                                    : exibindoLogs
                                        ? "Consulte eventos e filtre registros para acompanhar as operações da plataforma."
                                        : exibindoRelatorios
                                            ? "Analise matrículas, conclusões e atividade por período, instrutor e curso."
                                        : "Acompanhe os principais indicadores de cursos e usuários da plataforma."}</p>
                        </div>
                    </section>

                    {exibindoPerfil ? (
                        <PerfilUsuario api={api} setMensagem={setMensagem} onPerfilAtualizado={onPerfilAtualizado} />
                    ) : exibindoFinanceiro ? (
                        <section className={`${css.secaoMetricas} ${css.paginaFinanceiro}`}>
                            {/* Sprint itens 13, 14, 15 e 16: cards de gestao financeira administrativa. */}
                            {/* Sprint item 15: mostra o caixa administrativo após reservar as comissões do fundo de receita e os custos. */}
                            {[
                                ["Assinaturas pagas (total)", financeiro?.total_arrecadado, "Soma das mensalidades confirmadas"],
                                ["Saques concluídos", financeiro?.total_repassado, "Transferências registradas como concluídas"],
                                ["Total do Revenue Pool (estimado)", financeiro?.total_repassado_estimado, "Percentual aplicado sobre mensalidades pagas"],
                                ["Despesas cadastradas", financeiro?.custos, "Total de despesas registradas"],
                                ["Disponível para saque (admin)", financeiro?.disponivel_saque_admin, "Receita paga menos comissão dos instrutores e despesas"]
                            ].map(([titulo, valor, detalhe]) => (
                                <div key={titulo} className={css.cardMetrica}>
                                    <div className={css.metricaTopo}>
                                        <h2>{titulo}</h2>
                                        <div className={css.iconeBadge}><FaFolder /></div>
                                    </div>
                                    <span className={css.metricaVariacao}>{detalhe}</span>
                                    <div className={css.metricaNumero}>R$ {Number(valor || 0).toFixed(2).replace(".", ",")}</div>
                                </div>
                            ))}
                            <div className={css.cardMetrica}>
                                <div className={css.metricaTopo}>
                                    <h2>Ticket médio por aluno</h2>
                                    <div className={css.iconeBadge}><FaUser /></div>
                                </div>
                                <span className={css.metricaVariacao}>{financeiro?.alunos_pagantes || 0} alunos com mensalidade paga</span>
                                <div className={css.metricaNumero}>R$ {Number(financeiro?.ticket_medio_aluno || 0).toFixed(2).replace(".", ",")}</div>
                            </div>
                            {/* Sprint item 16: apresenta a margem histórica da empresa depois das comissões do fundo de receita e dos custos. */}
                            <div className={css.cardMetrica}>
                                <div className={css.metricaTopo}>
                                    <h2>Saude financeira</h2>
                                    <div className={css.iconeBadge}><FaFolder /></div>
                                </div>
                                <span className={css.metricaVariacao}>Margem histórica estimada após pool e custos</span>
                                <div className={css.metricaNumero}>{Number(financeiro?.margem_caixa_percentual || 0).toFixed(2).replace(".", ",")}%</div>
                                <p className={css.textoFinanceiro}>
                                    {financeiro?.faturas_pagas || 0} mensalidades pagas, ticket base de R$ {Number(financeiro?.receita_media_assinatura || 0).toFixed(2).replace(".", ",")}.
                                </p>
                            </div>
                            <div className={css.cardMetrica}>
                                <div className={css.metricaTopo}>
                                    <h2>Pool dos instrutores</h2>
                                    <div className={css.iconeBadge}><FaGraduationCap /></div>
                                </div>
                                <span className={css.metricaVariacao}>Percentual da receita</span>
                                <div className={css.metricaNumero}>{Number(financeiro?.percentual_instrutores || 0).toFixed(2).replace(".", ",")}%</div>
                                <label className={css.campoFinanceiro}>
                                    Ajustar percentual
                                    <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        step="0.01"
                                        value={percentualInstrutores}
                                        onChange={(evento) => setPercentualInstrutores(evento.target.value)}
                                    />
                                </label>
                                <button className={css.botaoFinanceiro} type="button" onClick={salvarPercentualInstrutores}>
                                    Salvar percentual
                                </button>
                            </div>
                            {/* Sprint item 35: detalha faturas pagas, gasto total e média mensal de cada aluno. */}
                            <section className={css.listaTransacoes}>
                                <h2>Ticket por aluno</h2>
                                <div className={css.tabelaTransacoes}>
                                    <table>
                                        <thead>
                                            <tr><th>Aluno</th><th>Mensalidades pagas</th><th>Total pago</th><th>Média por mensalidade</th></tr>
                                        </thead>
                                        <tbody>
                                            {(financeiro?.ticket_alunos || []).map((aluno) => (
                                                <tr key={aluno.id_usuario}>
                                                    <td>{aluno.nome}<br /><small>{aluno.email}</small></td>
                                                    <td>{aluno.faturas_pagas}</td>
                                                    <td>R$ {Number(aluno.total_pago || 0).toFixed(2).replace(".", ",")}</td>
                                                    <td>R$ {Number(aluno.ticket_medio || 0).toFixed(2).replace(".", ",")}</td>
                                                </tr>
                                            ))}
                                            {!(financeiro?.ticket_alunos || []).length && <tr><td colSpan="4">{financeiro?.total_alunos ? "Nenhuma mensalidade paga encontrada para os alunos." : "Nenhum aluno cadastrado."}</td></tr>}
                                        </tbody>
                                    </table>
                                </div>
                            </section>
                            {/* Sprint item 36: separa cadastro de categorias, pagamentos únicos e despesas mensais. */}
                            <div className={`${css.cardMetrica} ${css.cardCadastroCusto}`}>
                                <div className={css.metricaTopo}>
                                    <h2>Pagamento Único</h2>
                                    <div className={css.iconeBadge}><FaFolder /></div>
                                </div>
                                <form className={css.formFinanceiro} onSubmit={(evento) => cadastrarCusto(evento, "UNICO")}>
                                    <label>Descrição<input required maxLength="200" value={novoCustoUnico.descricao} onChange={(evento) => setNovoCustoUnico({ ...novoCustoUnico, descricao: evento.target.value })} /></label>
                                    <label>Categoria<select required value={novoCustoUnico.id_categoria} onChange={(evento) => setNovoCustoUnico({ ...novoCustoUnico, id_categoria: evento.target.value })}><option value="">Selecione</option>{categoriasCusto.map((categoria) => <option key={categoria.id} value={categoria.id}>{categoria.nome}</option>)}</select></label>
                                    <label>Valor<input required type="number" min="0.01" step="0.01" value={novoCustoUnico.valor} onChange={(evento) => setNovoCustoUnico({ ...novoCustoUnico, valor: evento.target.value })} /></label>
                                    <label>Data do pagamento<input required type="date" value={novoCustoUnico.data_custo} onChange={(evento) => setNovoCustoUnico({ ...novoCustoUnico, data_custo: evento.target.value })} /></label>
                                    <button className={css.botaoFinanceiro} type="submit">Cadastrar pagamento único</button>
                                </form>
                            </div>
                            <div className={`${css.cardMetrica} ${css.cardCadastroCusto}`}>
                                <div className={css.metricaTopo}>
                                    <h2>Pagamento mensal</h2>
                                    <div className={css.iconeBadge}><FaFolder /></div>
                                </div>
                                <p className={css.textoFinanceiro}>O valor será lançado em cada mês entre as datas escolhidas.</p>
                                <form className={css.formFinanceiro} onSubmit={(evento) => cadastrarCusto(evento, "MENSAL")}>
                                    <label>Descrição<input required maxLength="200" value={novoCustoMensal.descricao} onChange={(evento) => setNovoCustoMensal({ ...novoCustoMensal, descricao: evento.target.value })} /></label>
                                    <label>Categoria<select required value={novoCustoMensal.id_categoria} onChange={(evento) => setNovoCustoMensal({ ...novoCustoMensal, id_categoria: evento.target.value })}><option value="">Selecione</option>{categoriasCusto.map((categoria) => <option key={categoria.id} value={categoria.id}>{categoria.nome}</option>)}</select></label>
                                    <label>Valor mensal<input required type="number" min="0.01" step="0.01" value={novoCustoMensal.valor} onChange={(evento) => setNovoCustoMensal({ ...novoCustoMensal, valor: evento.target.value })} /></label>
                                    <label>Data de início<input required type="date" value={novoCustoMensal.data_inicio} onChange={(evento) => setNovoCustoMensal({ ...novoCustoMensal, data_inicio: evento.target.value })} /></label>
                                    <label>Data de fim<input required type="date" value={novoCustoMensal.data_fim} onChange={(evento) => setNovoCustoMensal({ ...novoCustoMensal, data_fim: evento.target.value })} /></label>
                                    <button className={css.botaoFinanceiro} type="submit">Cadastrar custo mensal</button>
                                </form>
                            </div>
                            <div className={`${css.cardMetrica} ${css.cardCadastroCusto}`}>
                                <div className={css.metricaTopo}>
                                    <h2>Cadastrar categoria de custo</h2>
                                    <div className={css.iconeBadge}><FaFolder /></div>
                                </div>
                                <form className={`${css.formFinanceiro} ${css.formCategoriaCusto}`} onSubmit={cadastrarCategoriaCusto}>
                                    <label>Nome da categoria<input required maxLength="80" value={novaCategoriaCusto} onChange={(evento) => setNovaCategoriaCusto(evento.target.value)} /></label>
                                    <button className={css.botaoFinanceiro} type="submit">Cadastrar categoria</button>
                                </form>
                                <p className={css.textoFinanceiro}>{categoriasCusto.length} categorias disponíveis para selecionar.</p>
                            </div>
                            <section className={css.listaTransacoes}>
                                {/* Sprint item 13: exibe as assinaturas pagas ou pendentes, despesas e saques enviados ao administrador. */}
                                <h2>Transações financeiras</h2>
                                <form className={css.formFinanceiro + " " + css.filtrosTransacoes}>
                                    <label>Tipo<select value={filtrosTransacoes.tipo} onChange={(evento) => setFiltrosTransacoes({ ...filtrosTransacoes, tipo: evento.target.value })}><option value="">Todos</option><option>Assinatura</option><option>Despesa mensal</option><option>Pagamento Único</option><option>Saque de instrutor</option></select></label>
                                    <label>Categoria<select value={filtrosTransacoes.categoria} onChange={(evento) => setFiltrosTransacoes({ ...filtrosTransacoes, categoria: evento.target.value })}><option value="">Todas</option>{categoriasCusto.map((categoria) => <option key={categoria.id} value={categoria.nome}>{categoria.nome}</option>)}</select></label>
                                    <label>Data inicial<input type="date" value={filtrosTransacoes.inicio} onChange={(evento) => setFiltrosTransacoes({ ...filtrosTransacoes, inicio: evento.target.value })} /></label>
                                    <label>Data final<input type="date" value={filtrosTransacoes.fim} onChange={(evento) => setFiltrosTransacoes({ ...filtrosTransacoes, fim: evento.target.value })} /></label>
                                    <label>Status<select value={filtrosTransacoes.status} onChange={(evento) => setFiltrosTransacoes({ ...filtrosTransacoes, status: evento.target.value })}><option value="">Todos</option><option>Paga</option><option>Pendente</option><option>Registrada</option><option>Programada</option><option>Concluído</option><option>Solicitado</option></select></label>
                                    <button className={css.botaoLimparFiltros} type="button" onClick={() => setFiltrosTransacoes({ tipo: "", categoria: "", inicio: "", fim: "", status: "" })}>Limpar filtros</button>
                                </form>
                                <div className={css.tabelaTransacoes}>
                                    <table>
                                        <thead>
                                            <tr><th>Data</th><th>Tipo</th><th>Categoria</th><th>Descrição</th><th>Status</th><th>Valor</th></tr>
                                        </thead>
                                        <tbody>
                                            {transacoesFiltradas.map((transacao) => (
                                                <tr key={transacao.id}>
                                                    <td>{transacao.data ? new Date(transacao.data).toLocaleDateString("pt-BR") : "—"}</td>
                                                    <td>{transacao.tipo}</td>
                                                    <td>{transacao.categoria || "—"}</td>
                                                    <td>{transacao.descricao}</td>
                                                    <td>{transacao.status}</td>
                                                    <td className={transacao.direcao === "saida" ? css.valorSaida : transacao.direcao === "entrada" ? css.valorEntrada : ""}>
                                                        {transacao.direcao === "saida" ? "− " : transacao.direcao === "entrada" ? "+ " : ""}R$ {Number(transacao.valor || 0).toFixed(2).replace(".", ",")}
                                                    </td>
                                                </tr>
                                            ))}
                                            {!transacoesFiltradas.length && <tr><td colSpan="6">Nenhuma transação encontrada para os filtros selecionados.</td></tr>}
                                        </tbody>
                                    </table>
                                </div>
                            </section>
                        </section>
                    ) : exibindoRelatorios ? (
                        <section className={css.listaTransacoes}>
                            {/* Sprint item 22: aplica os filtros de período, instrutor e curso ao relatório geral da plataforma. */}
                            <h2>Filtros do relatório</h2>
                            <p>O período considera a data de criação dos cursos.</p>
                            <form className={`${css.formFinanceiro} ${css.filtrosRelatorio}`} onSubmit={(evento) => { evento.preventDefault(); carregarRelatorio(); }}>
                                <label>Início do período<input type="date" value={filtrosRelatorio.inicio} onChange={(evento) => setFiltrosRelatorio({ ...filtrosRelatorio, inicio: evento.target.value })} /></label>
                                <label>Fim do período<input type="date" value={filtrosRelatorio.fim} onChange={(evento) => setFiltrosRelatorio({ ...filtrosRelatorio, fim: evento.target.value })} /></label>
                                <label>Instrutor<select value={filtrosRelatorio.id_instrutor} onChange={(evento) => setFiltrosRelatorio({ ...filtrosRelatorio, id_instrutor: evento.target.value })}><option value="">Todos</option>{instrutoresRelatorio.map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}</select></label>
                                <label>Curso<select value={filtrosRelatorio.id_curso} onChange={(evento) => setFiltrosRelatorio({ ...filtrosRelatorio, id_curso: evento.target.value })}><option value="">Todos</option>{cursosRelatorio.map((item) => <option key={item.id_curso} value={item.id_curso}>{item.curso} — {item.instrutor}</option>)}</select></label>
                                <button className={css.botaoFinanceiro} type="submit" disabled={carregandoRelatorio}>{carregandoRelatorio ? "Gerando..." : "Aplicar filtros"}</button>
                            </form>
                            <div className={css.secaoMetricas}>
                                {[["Matrículas", relatorio?.resumo?.alunos], ["Cursos", relatorio?.resumo?.cursos], ["Aulas concluídas", relatorio?.resumo?.aulas_assistidas], ["Cursos concluídos", relatorio?.resumo?.conclusoes], ["Módulos concluídos", relatorio?.resumo?.modulos], ["Horas assistidas", `${Number(relatorio?.resumo?.horas_assistidas || 0).toFixed(2).replace(".", ",")}h`]].map(([titulo, valor]) => <div className={css.cardMetrica} key={titulo}><h2>{titulo}</h2><div className={css.metricaNumero}>{valor ?? 0}</div></div>)}
                            </div>
                            <h2>Detalhamento por curso</h2>
                            <div className={css.tabelaTransacoes}><table><thead><tr><th>Curso</th><th>Instrutor</th><th>Matrículas</th><th>Aulas concluídas</th><th>Conclusões</th><th>Horas</th><th>Avaliação</th></tr></thead><tbody>
                                {(relatorio?.cursos || []).map((curso) => <tr key={curso.id_curso}><td>{curso.curso}</td><td>{curso.instrutor}</td><td>{curso.alunos}</td><td>{curso.aulas_assistidas}</td><td>{curso.conclusoes}</td><td>{Number(curso.horas_assistidas || 0).toFixed(2).replace(".", ",")}</td><td>{Number(curso.avaliacao_media || 0).toFixed(2)}</td></tr>)}
                                {!relatorio?.cursos?.length && <tr><td colSpan="7">Nenhum resultado para os filtros selecionados.</td></tr>}
                            </tbody></table></div>
                        </section>
                    ) : exibindoLogs ? (
                        <section className={css.listaLogs}>
                            <h2>Logs do sistema</h2>
                            {/* Sprint item 25: permite filtrar os logs por usuário e datas no painel administrativo. */}
                            <div className={css.abasLogs}>
                                {[["0", "Administradores"], ["1", "Professores"], ["2", "Alunos"]].map(([tipo, label]) => (
                                    <button key={tipo} className={filtrosLogs.tipo === tipo ? css.abaAtiva : css.abaLog} onClick={() => { setFiltrosLogs({ ...filtrosLogs, tipo, evento: "", acao: "" }); setLogExpandido(null); }} type="button">{label}</button>
                                ))}
                            </div>
                            <div className={css.filtrosLogs}>
                                <input placeholder="Buscar nome, e-mail, acao ou registro" value={filtrosLogs.busca} onChange={(e) => setFiltrosLogs({ ...filtrosLogs, busca: e.target.value })} />
                                <select value={filtrosLogs.evento} onChange={(e) => setFiltrosLogs({ ...filtrosLogs, evento: e.target.value })}>
                                    <option value="">Todas as acoes</option>
                                    {filtrosLogs.tipo === "0" && <><option value="cadastro_professor">Cadastro de professor</option><option value="cadastro_aluno">Cadastro de aluno</option><option value="alterar_usuario">Alterou usuario</option><option value="registrar_custo">Registrou custo</option><option value="alterar_configuracao">Alterou configuracao financeira</option><option value="aprovar_saque">Atualizou saque</option></>}
                                    {filtrosLogs.tipo === "1" && <><option value="criar_curso">Criou curso</option><option value="editar_curso">Alterou curso</option><option value="excluir_curso">Excluiu curso</option><option value="criar_aula">Criou aula</option><option value="editar_aula">Alterou aula</option><option value="excluir_aula">Excluiu aula</option><option value="criar_modulo">Criou modulo</option><option value="criar_material">Criou material</option><option value="criar_prova">Criou prova</option><option value="corrigir_prova">Corrigiu prova</option><option value="solicitar_saque">Solicitou saque</option><option value="mensagem_chat">Enviou mensagem</option></>}
                                    {filtrosLogs.tipo === "2" && <><option value="inscricao_curso">Inscricao em curso</option><option value="assinar">Criou assinatura</option><option value="assistir_aula">Assistiu aula</option><option value="avaliar_curso">Avaliou curso</option><option value="enviar_prova">Enviou prova</option><option value="mensagem_chat">Enviou mensagem</option></>}
                                </select>
                                <input type="date" value={filtrosLogs.inicio} onChange={(e) => setFiltrosLogs({ ...filtrosLogs, inicio: e.target.value })} />
                                <input type="date" value={filtrosLogs.fim} onChange={(e) => setFiltrosLogs({ ...filtrosLogs, fim: e.target.value })} />
                            </div>
                            {/* Sprint item 24: permite abrir cada acao para conferir campos e valores registrados. */}
                            {logsGravacao.length === 0 && <p>Nenhum log registrado.</p>}
                            {logsGravacao.map((log) => {
                                const expandido = logExpandido === log.id;
                                const perfilUsuario = { 0: "Administrador", 1: "Professor", 2: "Aluno" }[log.tipo_usuario];
                                const rotuloTabela = { USUARIOS: "usuario", CURSOS: "curso", VIDEOS: "aula", MATRICULAS: "inscricao em curso", MODULOS_CURSO: "modulo", MATERIAIS_CURSO: "material", PROVAS_CURSO: "prova", AVALIACOES_CURSO: "avaliacao", RESPOSTAS_PROVA: "resposta de prova", SAQUES_INSTRUTOR: "solicitacao de saque" }[log.tabela] || log.tabela;
                                return (
                                    <article key={log.id} className={css.logItem} onClick={() => setLogExpandido(expandido ? null : log.id)} role="button" tabIndex={0} onKeyDown={(evento) => { if (evento.key === "Enter" || evento.key === " ") { evento.preventDefault(); setLogExpandido(expandido ? null : log.id); } }}>
                                        <div className={css.logTopo}>
                                            <strong>{rotuloAcaoLog(log.acao)}: {rotuloTabela}</strong>
                                            <small>{formatarDataLog(log.criado_em)}</small>
                                        </div>
                                        <span>{log.nome || `Usuario ${log.id_usuario || "nao identificado"}`} - {log.email || "e-mail nao armazenado"}{perfilUsuario ? ` - ${perfilUsuario}` : ""}</span>
                                        <small>{log.metodo} {log.rota}</small>
                                        <p>{log.resumo || log.detalhes}</p>
                                        <small>Registro {log.id_registro || "indisponivel"} - {expandido ? "Clique para recolher" : "Clique para ver detalhes"}</small>
                                        {expandido && <div className={css.logDetalhes}>
                                            {log.contexto?.usuario_afetado && <p>Usuario cadastrado: {log.contexto.usuario_afetado.nome} - {log.contexto.usuario_afetado.email} - tipo {log.contexto.usuario_afetado.tipo}</p>}
                                            {log.contexto?.curso && <p>Curso: {log.contexto.curso}</p>}
                                            {log.contexto?.professor && <p>Professor: {log.contexto.professor.nome} - {log.contexto.professor.email}</p>}
                                            {log.contexto?.aula && <p>Aula: {log.contexto.aula}</p>}
                                            <strong>Campos alterados</strong><pre>{log.campos_alterados || "Nao informado"}</pre>
                                            <strong>Valores anteriores</strong><pre>{formatarJson(log.valores_antes)}</pre>
                                            <strong>Valores atuais</strong><pre>{formatarJson(log.valores_depois)}</pre>
                                        </div>}
                                    </article>
                                );
                            })}
                            {temMaisLogs && <button className={css.botaoFinanceiro} type="button" onClick={carregarMaisLogs} disabled={carregandoMaisLogs}>{carregandoMaisLogs ? "Carregando..." : "Carregar mais registros"}</button>}
                        </section>
                    ) : (
                        <>
                            {/* Sprint item 8: apresenta um gráfico único com os totais principais disponíveis para o administrador. */}
                            <GoogleChart titulo="Indicadores da plataforma" data={dadosGraficoAdmin} options={opcoesGraficoAdmin} />
                            <section className={css.secaoMetricas}>
                                {metricas.map((metrica) => (
                                    <div key={metrica.id} className={css.cardMetrica}>
                                        <div className={css.metricaTopo}>
                                            <h2>{metrica.titulo}</h2>
                                            <div className={css.iconeBadge}>{metrica.icone}</div>
                                        </div>
                                        <span className={css.metricaVariacao}>{metrica.textoMes}</span>
                                        <div className={css.metricaNumero}>{metrica.quantidade}</div>
                                    </div>
                                ))}
                            </section>
                        </>
                    )}
                </main>
            </div>

            <footer className={css.rodapePagina}>
                <div className={css.colunaRodape}>
                    <h4>Contato</h4>
                    <p>Birigui - SP</p>
                    <p>(18)98131-3801</p>
                    <p>cursando@gmail.com</p>
                </div>

                <div className={css.colunaRodape}>
                    <h4>Navegacao</h4>
                    <a href="#home">Home</a>
                    <a href="#login">Login</a>
                    <a href="#cadastro">Cadastro</a>
                </div>

                <div className={css.colunaRodape}>
                    <h4>Baixe nosso aplicativo</h4>
                    <ul className={css.listaApps}>
                        <li><FaGooglePlay /> Playstore</li>
                        <li><FaLinux /> Linux</li>
                        <li><FaWindows /> Windows</li>
                    </ul>
                </div>
            </footer>
        </div>
    );
}
