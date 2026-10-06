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

export default function DashboardAdm({
                                         api,
                                         setMensagem,
                                         onPerfilAtualizado,
                                         usuario
                                     }) {
    const location = useLocation();
    const exibindoPerfil = location.pathname.endsWith("/perfil");
    const exibindoFinanceiro = location.pathname.endsWith("/Financeiro");
    const exibindoLogs = location.pathname.endsWith("/Logs");
    const [dashboard, setDashboard] = useState(null);
    const [financeiro, setFinanceiro] = useState(null);
    const [percentualInstrutores, setPercentualInstrutores] = useState("");
    const [custos, setCustos] = useState([]);
    const [novoCusto, setNovoCusto] = useState({ descricao: "", categoria: "", valor: "", data_custo: "" });
    const [logs, setLogs] = useState([]);
    const [logsGravacao, setLogsGravacao] = useState([]);
    const [abaLogs, setAbaLogs] = useState("sistema");
    const [filtrosLogs, setFiltrosLogs] = useState({ busca: "", tipo: "", acao: "", inicio: "", fim: "" });

    function detalhesLog(log) {
        try {
            return JSON.parse(log.detalhes || "{}");
        } catch {
            return null;
        }
    }

    function formatarDataLog(valor) {
        if (!valor) return "";
        return new Date(valor).toLocaleString("pt-BR");
    }

    // Busca as métricas agregadas no endpoint administrativo ao abrir o dashboard.
    useEffect(() => {
        if (exibindoPerfil || exibindoFinanceiro || exibindoLogs) {
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
    }, [api, exibindoFinanceiro, exibindoLogs, exibindoPerfil, setMensagem]);

    useEffect(() => {
        if (!exibindoFinanceiro) return;

        async function carregarFinanceiro() {
            try {
                const resposta = await fetch(`${api}/financeiro/resumo`, { credentials: "include" });
                const dados = await resposta.json().catch(() => ({}));
                if (!resposta.ok) throw new Error(dados?.mensagem?.descricao || "Erro ao carregar financeiro.");
                setFinanceiro(dados);
                setPercentualInstrutores(String(dados.percentual_instrutores ?? 50));
                const respostaCustos = await fetch(`${api}/admin/custos-plataforma`, { credentials: "include" });
                const dadosCustos = await respostaCustos.json().catch(() => ([]));
                if (respostaCustos.ok) setCustos(Array.isArray(dadosCustos) ? dadosCustos : []);
            } catch (erro) {
                console.error("Erro ao carregar financeiro:", erro);
                setMensagem?.({ tipo: "erro", descricao: erro.message });
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

    async function cadastrarCusto(evento) {
        evento.preventDefault();
        try {
            const resposta = await fetch(`${api}/admin/custos-plataforma`, {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(novoCusto)
            });
            const dados = await resposta.json().catch(() => ({}));
            if (dados.mensagem) setMensagem?.(dados.mensagem);
            if (!resposta.ok) throw new Error(dados?.mensagem?.descricao || "Erro ao cadastrar custo.");
            setNovoCusto({ descricao: "", categoria: "", valor: "", data_custo: "" });
            const lista = await fetch(`${api}/admin/custos-plataforma`, { credentials: "include" });
            const custosAtualizados = await lista.json().catch(() => ([]));
            if (lista.ok) setCustos(Array.isArray(custosAtualizados) ? custosAtualizados : []);
        } catch (erro) {
            setMensagem?.({ tipo: "erro", descricao: erro.message });
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
                const resposta = await fetch(`${api}/admin/logs?${params.toString()}`, { credentials: "include" });
                const dados = await resposta.json().catch(() => ({}));
                if (!resposta.ok) throw new Error(dados?.mensagem?.descricao || "Erro ao carregar logs.");
                setLogs(Array.isArray(dados) ? dados : []);
                const respostaGravacao = await fetch(`${api}/admin/logs-gravacao?${params.toString()}`, { credentials: "include" });
                const dadosGravacao = await respostaGravacao.json().catch(() => ({}));
                if (respostaGravacao.ok) setLogsGravacao(Array.isArray(dadosGravacao) ? dadosGravacao : []);
            } catch (erro) {
                console.error("Erro ao carregar logs:", erro);
                setMensagem?.({ tipo: "erro", descricao: erro.message });
            }
        }

        carregarLogs();
    }, [api, exibindoLogs, filtrosLogs, setMensagem]);

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

    return (
        <div className={css.painelAdm}>
            <MenuLateralAdm itemAtivo={exibindoPerfil ? "perfil" : exibindoFinanceiro ? "financeiro" : exibindoLogs ? "logs" : "inicio"} />

            <div className={css.conteudoPrincipal}>
                <main className={css.areaConteudo}>
                    <header className={css.cabecalhoUsuario}>
                        <div className={css.dadosUsuario}>
                            <h1>Ola {usuario.nome}</h1>
                            <span className={css.cargoUsuario}>
                                {Number(usuario.tipo) === 0 && "Administrador"}
                                {Number(usuario.tipo) === 1 && "Professor"}
                                {Number(usuario.tipo) === 2 && "Aluno"}
                            </span>
                        </div>

                    </header>

                    {/* Sprint item 9: identifica a área administrativa atual e orienta a leitura da página. */}
                    <section className={css.cabecalhoPagina}>
                        <div>
                            <span className={css.etiquetaPagina}>
                                {exibindoPerfil ? "CONTA" : exibindoFinanceiro ? "FINANCEIRO" : exibindoLogs ? "AUDITORIA" : "ADMINISTRAÇÃO"}
                            </span>
                            <h2>{exibindoPerfil ? "Perfil do administrador" : exibindoFinanceiro ? "Visão financeira" : exibindoLogs ? "Atividade do sistema" : "Visão geral"}</h2>
                            <p>{exibindoPerfil
                                ? "Atualize seus dados e mantenha as informações da conta em dia."
                                : exibindoFinanceiro
                                    ? "Acompanhe arrecadação, repasses, custos e saldo da plataforma."
                                    : exibindoLogs
                                        ? "Consulte eventos e filtre registros para acompanhar as operações da plataforma."
                                        : "Acompanhe os principais indicadores de cursos e usuários da plataforma."}</p>
                        </div>
                    </section>

                    {exibindoPerfil ? (
                        <PerfilUsuario api={api} setMensagem={setMensagem} onPerfilAtualizado={onPerfilAtualizado} />
                    ) : exibindoFinanceiro ? (
                        <section className={`${css.secaoMetricas} ${css.paginaFinanceiro}`}>
                            {/* Sprint itens 13, 14, 15 e 16: cards de gestao financeira administrativa. */}
                            {[
                                ["Total arrecadado", financeiro?.total_arrecadado],
                                ["Total repassado", financeiro?.total_repassado_estimado],
                                ["Custos", financeiro?.custos],
                                ["Saldo em caixa", financeiro?.saldo_caixa]
                            ].map(([titulo, valor]) => (
                                <div key={titulo} className={css.cardMetrica}>
                                    <div className={css.metricaTopo}>
                                        <h2>{titulo}</h2>
                                        <div className={css.iconeBadge}><FaFolder /></div>
                                    </div>
                                    <span className={css.metricaVariacao}>Resumo financeiro</span>
                                    <div className={css.metricaNumero}>R$ {Number(valor || 0).toFixed(2).replace(".", ",")}</div>
                                </div>
                            ))}
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
                            <div className={css.cardMetrica}>
                                <div className={css.metricaTopo}>
                                    <h2>Saude financeira</h2>
                                    <div className={css.iconeBadge}><FaFolder /></div>
                                </div>
                                <span className={css.metricaVariacao}>Margem apos repasses e custos</span>
                                <div className={css.metricaNumero}>{Number(financeiro?.margem_caixa_percentual || 0).toFixed(2).replace(".", ",")}%</div>
                                <p className={css.textoFinanceiro}>
                                    {financeiro?.assinaturas_ativas || 0} assinaturas ativas, ticket de R$ {Number(financeiro?.receita_media_assinatura || 0).toFixed(2).replace(".", ",")}.
                                </p>
                            </div>
                            <div className={css.cardMetrica}>
                                <div className={css.metricaTopo}>
                                    <h2>Ticket medio por aluno</h2>
                                    <div className={css.iconeBadge}><FaUser /></div>
                                </div>
                                <span className={css.metricaVariacao}>Media sobre faturas pagas</span>
                                <div className={css.metricaNumero}>R$ {Number(financeiro?.ticket_medio_aluno || 0).toFixed(2).replace(".", ",")}</div>
                            </div>
                            <div className={css.cardMetrica}>
                                <div className={css.metricaTopo}>
                                    <h2>Custos da plataforma</h2>
                                    <div className={css.iconeBadge}><FaFolder /></div>
                                </div>
                                {/* Sprint item 5: formulario administrativo para cadastrar e acompanhar custos da plataforma. */}
                                <form className={css.formFinanceiro} onSubmit={cadastrarCusto}>
                                    <input placeholder="Descricao" value={novoCusto.descricao} onChange={(e) => setNovoCusto({ ...novoCusto, descricao: e.target.value })} />
                                    <input placeholder="Categoria" value={novoCusto.categoria} onChange={(e) => setNovoCusto({ ...novoCusto, categoria: e.target.value })} />
                                    <input type="number" min="0" step="0.01" placeholder="Valor" value={novoCusto.valor} onChange={(e) => setNovoCusto({ ...novoCusto, valor: e.target.value })} />
                                    <input type="date" value={novoCusto.data_custo} onChange={(e) => setNovoCusto({ ...novoCusto, data_custo: e.target.value })} />
                                    <button className={css.botaoFinanceiro} type="submit">Cadastrar custo</button>
                                </form>
                                <div className={css.listaCustos}>
                                    {custos.slice(0, 6).map((custo) => (
                                        <p key={custo.id}>{custo.descricao} - R$ {Number(custo.valor || 0).toFixed(2).replace(".", ",")}</p>
                                    ))}
                                </div>
                            </div>
                        </section>
                    ) : exibindoLogs ? (
                        <section className={css.listaLogs}>
                            <h2>Logs do sistema</h2>
                            <div className={css.abasLogs}>
                                <button className={abaLogs === "sistema" ? css.abaAtiva : css.abaLog} onClick={() => setAbaLogs("sistema")} type="button">Logs gerais</button>
                                <button className={abaLogs === "gravacao" ? css.abaAtiva : css.abaLog} onClick={() => setAbaLogs("gravacao")} type="button">Log de gravação</button>
                            </div>
                            <div className={css.filtrosLogs}>
                                <input placeholder="Buscar nome, email ou acao" value={filtrosLogs.busca} onChange={(e) => setFiltrosLogs({ ...filtrosLogs, busca: e.target.value })} />
                                <select value={filtrosLogs.tipo} onChange={(e) => setFiltrosLogs({ ...filtrosLogs, tipo: e.target.value })}>
                                    <option value="">Todos</option>
                                    <option value="0">Admins</option>
                                    <option value="1">Professores</option>
                                    <option value="2">Alunos</option>
                                </select>
                                <select value={filtrosLogs.acao} onChange={(e) => setFiltrosLogs({ ...filtrosLogs, acao: e.target.value })}>
                                    <option value="">Todas as acoes</option>
                                    <option value="criar_prova">Professor criou prova</option>
                                    <option value="criar_material">Professor criou material</option>
                                    <option value="enviar_prova">Aluno enviou prova</option>
                                    <option value="avaliar_curso">Aluno avaliou curso</option>
                                    <option value="solicitar_saque">Professor solicitou saque</option>
                                    <option value="requisicao_modificacao">Modificacoes gerais</option>
                                </select>
                                <input type="date" value={filtrosLogs.inicio} onChange={(e) => setFiltrosLogs({ ...filtrosLogs, inicio: e.target.value })} />
                                <input type="date" value={filtrosLogs.fim} onChange={(e) => setFiltrosLogs({ ...filtrosLogs, fim: e.target.value })} />
                            </div>
                            {/* Sprint item 6: alterna entre logs gerais e log de gravacao salvo em banco separado. */}
                            {(abaLogs === "sistema" ? logs : logsGravacao).length === 0 && <p>Nenhum log registrado.</p>}
                            {(abaLogs === "sistema" ? logs : logsGravacao).map((log) => {
                                const detalhes = detalhesLog(log);
                                const requisicao = detalhes?.requisicao || {};
                                const corpo = detalhes?.corpo?.json;

                                return (
                                    <article key={log.id} className={css.logItem}>
                                        <div className={css.logTopo}>
                                            <strong>{log.acao}</strong>
                                            <small>{formatarDataLog(log.criado_em)}</small>
                                        </div>
                                        <span>{log.nome || `Usuario ${log.id_usuario || "nao identificado"}`} - {log.email || "sem email"}</span>
                                        <small>{log.metodo} {log.rota} {requisicao.status_http ? `- status ${requisicao.status_http}` : ""}</small>
                                        <p>{log.resumo || log.detalhes}</p>
                                        {log.tabela && <small>Tabela afetada: {log.tabela}</small>}
                                        {detalhes?.parametros_rota && Object.keys(detalhes.parametros_rota).length > 0 && (
                                            <small>Recurso: {JSON.stringify(detalhes.parametros_rota)}</small>
                                        )}
                                        {corpo && Object.keys(corpo).length > 0 && (
                                            <pre className={css.logDetalhes}>{JSON.stringify(corpo, null, 2)}</pre>
                                        )}
                                    </article>
                                );
                            })}
                        </section>
                    ) : (
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
                    )}
                </main>

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
        </div>
    );
}
