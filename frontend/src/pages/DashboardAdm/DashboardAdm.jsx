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
import Button from "../../components/Button/Button.jsx";
import PerfilUsuario from "../../components/PerfilUsuario/PerfilUsuario.jsx";

export default function DashboardAdm({
                                         api,
                                         sair,
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
    const [logs, setLogs] = useState([]);

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
            } catch (erro) {
                console.error("Erro ao carregar financeiro:", erro);
                setMensagem?.({ tipo: "erro", descricao: erro.message });
            }
        }

        carregarFinanceiro();
    }, [api, exibindoFinanceiro, setMensagem]);

    useEffect(() => {
        if (!exibindoLogs) return;

        async function carregarLogs() {
            try {
                const resposta = await fetch(`${api}/admin/logs`, { credentials: "include" });
                const dados = await resposta.json().catch(() => ({}));
                if (!resposta.ok) throw new Error(dados?.mensagem?.descricao || "Erro ao carregar logs.");
                setLogs(Array.isArray(dados) ? dados : []);
            } catch (erro) {
                console.error("Erro ao carregar logs:", erro);
                setMensagem?.({ tipo: "erro", descricao: erro.message });
            }
        }

        carregarLogs();
    }, [api, exibindoLogs, setMensagem]);

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

                        <div className={css.acoesUsuario}>
                            <Button
                                texto="Sair"
                                fundoCor="vermelho"
                                tamanho="pequeno"
                                onClick={sair}
                            />
                            <div className={css.fotoPerfil}>
                                <FaUser />
                            </div>
                        </div>
                    </header>

                    {exibindoPerfil ? (
                        <PerfilUsuario api={api} setMensagem={setMensagem} onPerfilAtualizado={onPerfilAtualizado} />
                    ) : exibindoFinanceiro ? (
                        <section className={css.secaoMetricas}>
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
                        </section>
                    ) : exibindoLogs ? (
                        <section className={css.listaLogs}>
                            <h2>Logs do sistema</h2>
                            {/* Sprint itens 24 e 25: lista administrativa das acoes registradas por usuario. */}
                            {logs.length === 0 && <p>Nenhum log registrado.</p>}
                            {logs.map((log) => (
                                <article key={log.id} className={css.logItem}>
                                    <strong>{log.acao}</strong>
                                    <span>{log.nome || "Usuario"} - {log.email || "sem email"}</span>
                                    <small>{log.metodo} {log.rota}</small>
                                    <p>{log.detalhes}</p>
                                </article>
                            ))}
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
