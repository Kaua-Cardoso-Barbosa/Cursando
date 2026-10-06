import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
    FaCheck,
    FaCalendarAlt,
    FaGraduationCap,
    FaPlay,
    FaSearch,
    FaShieldAlt
} from "react-icons/fa";
import MenuLateralAluno from "../../components/MenuLateral/MenuLateralAluno.jsx";
import PerfilUsuario from "../../components/PerfilUsuario/PerfilUsuario.jsx";
import css from "./DashboardAluno.module.css";
import PlayerVideo from "../../components/PlayerVideo/PlayerVideo.jsx";
import ChatCurso from "../../components/ChatCurso/ChatCurso.jsx";

const PLACEHOLDER_CURSO = "/imagens_banner_curso/Placholder.png";
const PLACEHOLDER_AULA = "/imagens_thumb_video/Placeholder.png";

function formatarDataAssinatura(data) {
    if (!data) return "Não disponível";
    const valor = new Date(data);
    if (Number.isNaN(valor.getTime())) return "Não disponível";
    return new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
    }).format(valor);
}

function resolverUrlMidia(api, caminho) {
    if (!caminho) return "";
    if (caminho.startsWith("http://") || caminho.startsWith("https://") || caminho.startsWith("/imagens_")) {
        return caminho;
    }
    return `${api}${caminho}`;
}

function CabecalhoAluno({ usuario }) {
    return (
        <header className={css.cabecalhoUsuario}>
            <div className={css.dadosUsuario}>
                <h1>Olá {usuario.nome}</h1>
                <span className={css.cargoUsuario}>Aluno</span>
            </div>

        </header>
    );
}

function RodapeAluno() {
    return (
        <footer className={css.rodapePagina}>
            <div className={css.colunaRodape}>
                <h4>Contato</h4>
                <p>Birigui - SP</p>
                <p>(18)98131-3801</p>
                <p>cursando@gmail.com</p>
            </div>

            <div className={css.colunaRodape}>
                <h4>Navegação</h4>
                <a href="/">Home</a>
                <a href="/login">Login</a>
                <a href="/cadastro">Cadastro</a>
            </div>

            <div className={css.colunaRodape}>
                <h4>Baixe nosso aplicativo</h4>
                <p>Playstore</p>
                <p>Linux</p>
                <p>Windows</p>
            </div>
        </footer>
    );
}

function EstadoVazio({ texto }) {
    return (
        <div className={css.estadoVazio}>
            <FaGraduationCap />
            <span>{texto}</span>
        </div>
    );
}

function CardMetrica({ titulo, detalhe, valor, icone = <FaGraduationCap /> }) {
    return (
        <article className={css.cardMetrica}>
            <div className={css.metricaTopo}>
                <h2>{titulo}</h2>
                <div className={css.iconeBadge}>
                    {icone}
                </div>
            </div>
            <span className={css.metricaVariacao}>{detalhe}</span>
            <strong className={css.metricaNumero}>{valor}</strong>
        </article>
    );
}

function CursoCard({ curso, api, onAbrir, mostrarProgresso = false }) {
    const imagem = curso.imagem ? resolverUrlMidia(api, curso.imagem) : PLACEHOLDER_CURSO;
    const progresso = Number(curso.progresso || 0);

    return (
        <article className={css.cardCurso}>
            <button className={css.areaCardClicavel} onClick={() => onAbrir?.(curso)}>
                <img src={imagem} alt={curso.titulo} className={css.imagemCurso} />
                <div className={css.infoCurso}>
                    <div>
                        <h3>{curso.titulo}</h3>
                        <p>{curso.descricao}</p>
                    </div>
                    {mostrarProgresso && (
                        <div className={css.progressoCurso} aria-label={`${progresso}% concluido`}>
                            <span>{progresso}%</span>
                            <div className={css.barraProgresso}>
                                <i style={{ width: `${progresso}%` }} />
                            </div>
                        </div>
                    )}
                </div>
            </button>
        </article>
    );
}

function AulaCard({ aula, api, onAbrir }) {
    const imagem = aula.thumb ? resolverUrlMidia(api, aula.thumb) : PLACEHOLDER_AULA;

    return (
        <article className={css.cardAula}>
            <button className={css.areaCardClicavel} onClick={() => onAbrir?.(aula)}>
                <div className={css.previewAula}>
                    <img src={imagem} alt={aula.titulo} />
                    <span className={css.playBadge}><FaPlay /></span>
                </div>
                <div className={css.infoAula}>
                    <div>
                        <h3>{aula.titulo}</h3>
                        <p>{aula.descricao}</p>
                    </div>
                    {aula.assistida && <FaCheck className={css.checkAula} />}
                </div>
            </button>
        </article>
    );
}

export default function DashboardAluno({
    api,
    setMensagem,
    onPerfilAtualizado,
    usuario = { nome: "Aluno", tipo: 2 }
}) {
    const [dashboard, setDashboard] = useState(null);
    const [meusCursos, setMeusCursos] = useState([]);
    const [descobrir, setDescobrir] = useState([]);
    const [financeiro, setFinanceiro] = useState(null);
    const [faturas, setFaturas] = useState([]);
    const [pagamentoFatura, setPagamentoFatura] = useState(null);
    const [verificandoFatura, setVerificandoFatura] = useState(false);
    const [criandoFatura, setCriandoFatura] = useState(false);
    const [codigoFaturaCopiado, setCodigoFaturaCopiado] = useState(false);
    const [busca, setBusca] = useState("");
    const [ordemDescobrir, setOrdemDescobrir] = useState("recentes");
    const [apenasNaoInscritos, setApenasNaoInscritos] = useState(false);
    const [detalheCurso, setDetalheCurso] = useState(null);
    const [materiaisCurso, setMateriaisCurso] = useState([]);
    const [provaAluno, setProvaAluno] = useState(null);
    const [respostasProva, setRespostasProva] = useState({});
    const [avaliacao, setAvaliacao] = useState({ nota: 5, comentario: "" });
    const [aulaAtual, setAulaAtual] = useState(null);
    const [protecaoAtiva, setProtecaoAtiva] = useState(false);
    const [carregando, setCarregando] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();
    const [abaCurso, setAbaCurso] = useState("modulos");

    const visao = useMemo(() => {
        if (location.pathname.endsWith("/perfil")) return "perfil";
        if (location.pathname.endsWith("/financeiro")) return "financeiro";
        if (location.pathname.endsWith("/chat")) return "chat";
        if (location.pathname.includes("/descobrir")) return "descobrir";
        if (location.pathname.includes("/aulas/")) return "aula";
        if (location.pathname.includes("/cursos")) return "meus-cursos";
        return "inicio";
    }, [location.pathname]);

    const itemAtivo = visao === "descobrir" ? "descobrir" : visao === "financeiro" ? "financeiro" : visao === "chat" ? "chat" : visao === "perfil" ? "perfil" : visao === "inicio" ? "inicio" : "meus-cursos";

    const avisar = useCallback((mensagem) => {
        if (mensagem && setMensagem) setMensagem(mensagem);
    }, [setMensagem]);

    const lerResposta = useCallback(async (resposta) => {
        const dados = await resposta.json().catch(() => ({}));
        if (dados.mensagem && typeof dados.mensagem === "object") avisar(dados.mensagem);
        if (!resposta.ok) {
            const erro = new Error(
                typeof dados?.mensagem === "string"
                    ? dados.mensagem
                    : dados?.mensagem?.descricao || "Erro ao conectar com a API."
            );
            erro.dados = dados;
            erro.status = resposta.status;
            throw erro;
        }
        return dados;
    }, [avisar]);

    const carregarDashboard = useCallback(async () => {
        try {
            const resposta = await fetch(`${api}/aluno/dashboard`, { credentials: "include" });
            setDashboard(await lerResposta(resposta));
        } catch (erro) {
            console.error("Erro ao carregar dashboard do aluno:", erro);
            setDashboard({ metricas: { inscritos: 0, finalizados: 0, iniciados: 0 }, recentes: [] });
        }
    }, [api, lerResposta]);

    const carregarMeusCursos = useCallback(async () => {
        setCarregando(true);
        try {
            const resposta = await fetch(`${api}/aluno/cursos`, { credentials: "include" });
            setMeusCursos(await lerResposta(resposta));
        } catch (erro) {
            console.error("Erro ao carregar cursos do aluno:", erro);
            if (erro.status === 402) navigate(erro.dados?.redirecionar || "/DashboardAluno/financeiro");
            setMeusCursos([]);
        } finally {
            setCarregando(false);
        }
    }, [api, lerResposta]);

    // Envia busca, ordenação e filtro de não inscritos para a listagem pública de cursos.
    const carregarDescobrir = useCallback(async (termo = busca) => {
        setCarregando(true);
        try {
            const params = new URLSearchParams();
            if (termo.trim()) params.set("busca", termo.trim());
            params.set("ordem", ordemDescobrir);
            if (apenasNaoInscritos) params.set("apenas_novos", "1");
            const resposta = await fetch(`${api}/aluno/descobrir?${params.toString()}`, { credentials: "include" });
            setDescobrir(await lerResposta(resposta));
        } catch (erro) {
            console.error("Erro ao carregar cursos publicos:", erro);
            setDescobrir([]);
        } finally {
            setCarregando(false);
        }
    }, [api, apenasNaoInscritos, busca, lerResposta, ordemDescobrir]);

    const carregarDetalheCurso = useCallback(async (idCurso) => {
        setCarregando(true);
        try {
            const requisicoes = [
                fetch(`${api}/aluno/cursos/${idCurso}`, { credentials: "include" }),
                fetch(`${api}/aluno/cursos/${idCurso}/materiais`, { credentials: "include" })
            ];
            const [resposta, respostaMateriais] = await Promise.all(requisicoes);
            const dadosCurso = await lerResposta(resposta);
            setDetalheCurso(dadosCurso);
            setMateriaisCurso(await lerResposta(respostaMateriais));

            if (dadosCurso?.curso?.matriculado) {
                try {
                    const respostaProva = await fetch(`${api}/aluno/cursos/${idCurso}/prova`, { credentials: "include" });
                    setProvaAluno(await lerResposta(respostaProva));
                } catch {
                    setProvaAluno(null);
                }
            } else {
                setProvaAluno(null);
            }
        } catch (erro) {
            console.error("Erro ao carregar curso:", erro);
            if (erro.status === 402) navigate(erro.dados?.redirecionar || "/DashboardAluno/financeiro");
            setDetalheCurso(null);
            setMateriaisCurso([]);
            setProvaAluno(null);
        } finally {
            setCarregando(false);
        }
    }, [api, lerResposta]);

    const carregarAula = useCallback(async (idAula) => {
        setCarregando(true);
        try {
            const resposta = await fetch(`${api}/aluno/aulas/${idAula}`, { credentials: "include" });
            setAulaAtual(await lerResposta(resposta));
        } catch (erro) {
            console.error("Erro ao carregar aula:", erro);
            if (erro.status === 402) navigate(erro.dados?.redirecionar || "/DashboardAluno/financeiro");
            setAulaAtual(null);
        } finally {
            setCarregando(false);
        }
    }, [api, lerResposta]);

    useEffect(() => {
        carregarDashboard();
    }, [carregarDashboard]);

    useEffect(() => {
        const matchAula = location.pathname.match(/\/DashboardAluno\/aulas\/(\d+)/);
        const matchCurso = location.pathname.match(/\/DashboardAluno\/cursos\/(\d+)/);
        const matchDescobrir = location.pathname.match(/\/DashboardAluno\/descobrir\/(\d+)/);

        if (!matchAula) {
            setAulaAtual(null);
        }

        if (!matchCurso && !matchDescobrir) {
            setDetalheCurso(null);
        }

        if (matchAula) {
            carregarAula(matchAula[1]);
            return;
        }

        if (matchCurso) {
            carregarDetalheCurso(matchCurso[1]);
            return;
        }

        if (matchDescobrir) {
            carregarDetalheCurso(matchDescobrir[1]);
            return;
        }

        if (location.pathname.endsWith("/cursos")) {
            setDetalheCurso(null);
            carregarMeusCursos();
            return;
        }

        if (location.pathname.endsWith("/descobrir")) {
            setDetalheCurso(null);
            carregarDescobrir();
        }
    }, [carregarAula, carregarDescobrir, carregarDetalheCurso, carregarMeusCursos, location.pathname]);

    useEffect(() => {
        if (visao !== "financeiro") return;

        async function carregarFinanceiro() {
            try {
                const resposta = await fetch(`${api}/financeiro/resumo`, { credentials: "include" });
                setFinanceiro(await lerResposta(resposta));
                const respostaFaturas = await fetch(`${api}/financeiro/faturas`, { credentials: "include" });
                const dadosFaturas = await lerResposta(respostaFaturas);
                setFaturas(dadosFaturas.faturas || []);
            } catch (erro) {
                console.error("Erro ao carregar financeiro do aluno:", erro);
                avisar({ tipo: "erro", descricao: erro.message });
            }
        }

        carregarFinanceiro();
    }, [api, avisar, lerResposta, visao]);

    useEffect(() => {
        function ativarProtecao(evento) {
            if (visao !== "aula") return;
            if (evento?.key === "PrintScreen" || (evento?.ctrlKey && evento?.shiftKey) || evento?.type === "contextmenu") {
                evento.preventDefault();
            }
            setProtecaoAtiva(true);
            window.setTimeout(() => setProtecaoAtiva(false), 1800);
        }

        function aoVisibilidade() {
            if (document.hidden && visao === "aula") setProtecaoAtiva(true);
        }

        window.addEventListener("keydown", ativarProtecao);
        window.addEventListener("blur", ativarProtecao);
        document.addEventListener("visibilitychange", aoVisibilidade);
        document.addEventListener("contextmenu", ativarProtecao);

        return () => {
            window.removeEventListener("keydown", ativarProtecao);
            window.removeEventListener("blur", ativarProtecao);
            document.removeEventListener("visibilitychange", aoVisibilidade);
            document.removeEventListener("contextmenu", ativarProtecao);
        };
    }, [visao]);

    // Solicita a matrícula e abre o detalhe do curso após a confirmação da API.
    // Solicita a matrícula e abre o detalhe do curso após a confirmação da API.
    async function inscrever(curso) {
        try {
            const resposta = await fetch(`${api}/aluno/cursos/${curso.id}/inscrever`, {
                method: "POST",
                credentials: "include"
            });
            await lerResposta(resposta);
            await carregarDashboard();
            navigate(`/DashboardAluno/cursos/${curso.id}`);
        } catch (erro) {
            console.error("Erro ao inscrever:", erro);
            if (erro.status === 402) {
                navigate(erro.dados?.redirecionar || "/DashboardAluno/financeiro");
                return;
            }
            avisar({ tipo: "erro", descricao: erro.message });
        }
    }

    async function criarFaturaFutura() {
        if (criandoFatura) return;
        setCriandoFatura(true);
        try {
            const resposta = await fetch(`${api}/financeiro/faturas`, {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ meses: 1 })
            });
            const dados = await lerResposta(resposta);
            setPagamentoFatura(dados);
            if (dados.fatura_existente) {
                avisar({ tipo: "info", descricao: dados.mensagem || "Use a mensalidade em aberto para concluir o pagamento." });
            }
            const respostaFaturas = await fetch(`${api}/financeiro/faturas`, { credentials: "include" });
            const lista = await lerResposta(respostaFaturas);
            setFaturas(lista.faturas || []);
            setFinanceiro((atual) => ({
                ...(atual || {}),
                total_aberto: lista.total_aberto,
                faturas_abertas: (lista.faturas_abertas || []).length
            }));
        } catch (erro) {
            avisar({ tipo: "erro", descricao: erro.message });
        } finally {
            setCriandoFatura(false);
        }
    }

    async function copiarCodigoFatura() {
        if (!pagamentoFatura?.codigo_pagamento) return;
        await navigator.clipboard.writeText(pagamentoFatura.codigo_pagamento);
        setCodigoFaturaCopiado(true);
        window.setTimeout(() => setCodigoFaturaCopiado(false), 2500);
    }

    async function verificarPagamentoFatura() {
        if (!pagamentoFatura?.id_assinatura) return;
        setVerificandoFatura(true);
        try {
            const resposta = await fetch(`${api}/financeiro/faturas/${pagamentoFatura.id_assinatura}/verificar`, {
                method: "POST",
                credentials: "include"
            });
            await lerResposta(resposta);
            const respostaFaturas = await fetch(`${api}/financeiro/faturas`, { credentials: "include" });
            const lista = await lerResposta(respostaFaturas);
            setFaturas(lista.faturas || []);
            setFinanceiro((atual) => ({
                ...(atual || {}),
                total_gasto: lista.total_gasto,
                total_aberto: lista.total_aberto,
                faturas_abertas: (lista.faturas_abertas || []).length,
                faturas: (lista.faturas_pagas || []).length
            }));
            setPagamentoFatura(null);
            await carregarDashboard();
        } catch (erro) {
            avisar({ tipo: "erro", descricao: erro.message });
        } finally {
            setVerificandoFatura(false);
        }
    }

    const marcarAssistida = useCallback(async (aula) => {
        try {
            const resposta = await fetch(`${api}/aluno/aulas/${aula.id}/assistir`, {
                method: "POST",
                credentials: "include"
            });
            await lerResposta(resposta);
            await carregarDashboard();
            setAulaAtual((atual) => atual ? { ...atual, aula: { ...atual.aula, assistida: true } } : atual);
        } catch (erro) {
            console.error("Erro ao marcar aula como assistida:", erro);
        }
    }, [api, carregarDashboard, lerResposta]);

    function baixarCertificado(curso) {
        // Sprint item 5: abre o PDF de certificado liberado quando o curso chegou a 100%.
        window.open(`${api}/aluno/cursos/${curso.id}/certificado`, "_blank", "noopener,noreferrer");
    }

    async function enviarProvaAluno() {
        const resposta = await fetch(`${api}/aluno/cursos/${cursoDetalhe.id}/prova`, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ respostas: respostasProva })
        });
        await lerResposta(resposta);
        await carregarDetalheCurso(cursoDetalhe.id);
    }

    async function enviarAvaliacaoCurso() {
        const resposta = await fetch(`${api}/aluno/cursos/${cursoDetalhe.id}/avaliacoes`, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(avaliacao)
        });
        await lerResposta(resposta);
    }

    const metricas = dashboard?.metricas || { inscritos: 0, finalizados: 0, iniciados: 0 };
    const recentes = dashboard?.recentes || [];
    const cursoDetalhe = detalheCurso?.curso;
    const aulasDetalhe = detalheCurso?.aulas || [];
    const videoAula = aulaAtual?.aula;
    const proximas = aulaAtual?.proximas || [];
    const faturasAbertas = faturas.filter((fatura) => fatura.aberta);
    const faturasPagas = faturas.filter((fatura) => !fatura.aberta);

    return (
        <div className={css.painelAluno}>
            <MenuLateralAluno itemAtivo={itemAtivo} />

            <div className={css.conteudoPrincipal}>
                <main className={css.areaConteudo}>
                    {visao !== "aula" && <CabecalhoAluno usuario={usuario} />}

                    {visao === "inicio" && (
                        <>
                            <section className={css.secaoUltimasAulas}>
                                <div className={css.tituloUltimasAulas}>
                                    <h2>Últimas aulas vistas:</h2>
                                    <span>{recentes.length} {recentes.length === 1 ? "aula" : "aulas"}</span>
                                </div>
                                {recentes.length === 0 && <EstadoVazio texto="Nenhuma aula assistida ainda." />}
                                <div className={css.carrosselCursos}>
                                    {recentes.map((aula) => (
                                        <AulaCard key={aula.id} aula={aula} api={api} onAbrir={() => navigate(`/DashboardAluno/aulas/${aula.id}`)} />
                                    ))}
                                </div>
                            </section>

                            <section className={css.secaoMetricas}>
                                <div className={css.tituloUltimasAulas}>
                                    <h2>Métricas</h2>
                                    <span>Resumo</span>
                                </div>
                                <div className={css.gridMetricas}>
                                    <CardMetrica
                                        titulo="Iniciada em"
                                        detalhe="Data de início"
                                        valor={formatarDataAssinatura(dashboard?.assinatura?.data_inicio)}
                                        icone={<FaCalendarAlt />}
                                    />
                                    <CardMetrica
                                        titulo="Válida até"
                                        detalhe="Data de término"
                                        valor={formatarDataAssinatura(dashboard?.assinatura?.data_expiracao)}
                                        icone={<FaCalendarAlt />}
                                    />
                                    <CardMetrica titulo="Cursos inscritos" detalhe="" valor={metricas.inscritos} />
                                    <CardMetrica titulo="Cursos finalizados" detalhe="" valor={metricas.finalizados} />
                                </div>
                            </section>

                        </>
                    )}

                    {visao === "meus-cursos" && !cursoDetalhe && (
                        <section className={css.secaoCursos}>
                            <h2>Todos os Cursos</h2>
                            {carregando && <p className={css.textoApoio}>Carregando cursos...</p>}
                            {!carregando && meusCursos.length === 0 && <EstadoVazio texto="Você ainda não se inscreveu em cursos." />}
                            <div className={css.gridCursos}>
                                {meusCursos.map((curso) => (
                                    <CursoCard key={curso.id} curso={curso} api={api} mostrarProgresso onAbrir={() => navigate(`/DashboardAluno/cursos/${curso.id}`)} />
                                ))}
                            </div>
                        </section>
                    )}

                    {visao === "descobrir" && !cursoDetalhe && (
                        <section className={css.secaoCursos}>
                            <div className={css.filtrosDescobrir}>
                                <label className={css.campoBusca}>
                                    <FaSearch />
                                    <input
                                        value={busca}
                                        placeholder="Pesquisar em cursos"
                                        onChange={(evento) => setBusca(evento.target.value)}
                                    />
                                </label>
                                <label className={css.filtroOrdenacao}>
                                    <span>Ordenar por</span>
                                    <select value={ordemDescobrir} onChange={(evento) => setOrdemDescobrir(evento.target.value)}>
                                        <option value="recentes">Mais recentes</option>
                                        <option value="populares">Mais populares</option>
                                    </select>
                                </label>
                                <label className={css.filtroNovos}>
                                    <input
                                        type="checkbox"
                                        checked={apenasNaoInscritos}
                                        onChange={(evento) => setApenasNaoInscritos(evento.target.checked)}
                                    />
                                    <span>Somente não inscritos</span>
                                </label>
                            </div>

                            {carregando && <p className={css.textoApoio}>Buscando cursos...</p>}
                            {!carregando && descobrir.length === 0 && <EstadoVazio texto="Nenhum curso público encontrado." />}
                            <div className={css.gridCursos}>
                                {descobrir.map((curso) => (
                                    <CursoCard key={curso.id} curso={curso} api={api} onAbrir={() => navigate(`/DashboardAluno/descobrir/${curso.id}`)} />
                                ))}
                            </div>
                        </section>
                    )}

                    {(visao === "meus-cursos" || visao === "descobrir") && cursoDetalhe && (
                        <section className={css.secaoDetalheCurso}>
                            <button className={css.linkVoltar} onClick={() => navigate(visao === "descobrir" ? "/DashboardAluno/descobrir" : "/DashboardAluno/cursos")}>
                                Voltar
                            </button>

                            <div className={css.heroCurso}>
                                <img src={cursoDetalhe.imagem ? resolverUrlMidia(api, cursoDetalhe.imagem) : PLACEHOLDER_CURSO} alt={cursoDetalhe.titulo} />
                                <div className={css.resumoCurso}>
                                    <h2>{cursoDetalhe.titulo}</h2>
                                    <p><strong>Professor(a):</strong> {cursoDetalhe.professor}</p>
                                    <p className={css.descricaoCurso}>{cursoDetalhe.descricao}</p>
                                    {!cursoDetalhe.matriculado && (
                                        <button className={css.botaoInscrever} onClick={() => inscrever(cursoDetalhe)}>
                                            Inscrever-se
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className={css.navegacaoCurso}>
                                <button
                                    className={abaCurso === "modulos" ? css.abaAtiva : css.abaCurso}
                                    onClick={() => setAbaCurso("modulos")}
                                >
                                    Módulos
                                </button>

                                <button
                                    className={abaCurso === "complementos" ? css.abaAtiva : css.abaCurso}
                                    onClick={() => setAbaCurso("complementos")}
                                >
                                    Complementos
                                </button>
                            </div>

                            {abaCurso === "modulos" && (
                                <div className={css.conteudoCurso}>
                                    <h2>Módulos</h2>

                                    <EstadoVazio texto="Nenhum módulo disponível neste curso." />
                                </div>
                            )}

                            {abaCurso === "complementos" && (
                                <div className={css.conteudoCurso}>
                                    <h2>Complementos</h2>

                                    {materiaisCurso.length === 0 && <EstadoVazio texto="Nenhum complemento disponível neste curso." />}
                                    <div className={css.listaMateriais}>
                                        {materiaisCurso.map((material) => (
                                            <article key={material.id} className={css.cardMaterial}>
                                                <strong>{material.titulo}</strong>
                                                <span>{material.tipo}</span>
                                                <p>{material.descricao}</p>
                                                {material.bloqueado ? (
                                                    <small>Disponível após inscrição no curso.</small>
                                                ) : (
                                                    <a href={material.url} target="_blank" rel="noreferrer">Abrir material</a>
                                                )}
                                            </article>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {cursoDetalhe.matriculado && Number(cursoDetalhe.progresso || 0) >= 100 && (
                                <>
                                    {provaAluno?.prova && (
                                        <section className={css.conteudoCurso}>
                                            <h2>Prova final</h2>
                                            {provaAluno.envio && <p>Status: {provaAluno.envio.status === 1 ? "Aprovado" : provaAluno.envio.status === 2 ? "Reprovado" : "Aguardando correção"}</p>}
                                            {provaAluno.questoes?.map((questao) => (
                                                <label key={questao.id} className={css.campoBusca}>
                                                    {questao.enunciado}
                                                    <input value={respostasProva[questao.id] || ""} onChange={(e) => setRespostasProva({ ...respostasProva, [questao.id]: e.target.value })} />
                                                </label>
                                            ))}
                                            <button className={css.botaoInscrever} onClick={enviarProvaAluno}>Enviar prova</button>
                                            {provaAluno.envio?.status === 1 && (
                                                <>
                                                    <button className={css.botaoCertificado} onClick={() => baixarCertificado(cursoDetalhe)}>Baixar certificado</button>
                                                    <div className={css.conteudoCurso}>
                                                        <h2>Avaliar curso</h2>
                                                        <input type="number" min="0" max="5" value={avaliacao.nota} onChange={(e) => setAvaliacao({ ...avaliacao, nota: Number(e.target.value) })} />
                                                        <input value={avaliacao.comentario} onChange={(e) => setAvaliacao({ ...avaliacao, comentario: e.target.value })} placeholder="Comentário" />
                                                        <button className={css.botaoInscrever} onClick={enviarAvaliacaoCurso}>Enviar avaliação</button>
                                                    </div>
                                                </>
                                            )}
                                        </section>
                                    )}
                                </>
                            )}
                            <h2>{cursoDetalhe.matriculado ? "Videoaulas do curso" : "Videoaulas disponíveis após a inscrição"}</h2>

                            {aulasDetalhe.length === 0 && <EstadoVazio texto="Nenhuma aula publicada neste curso." />}
                            <div className={css.gridAulas}>
                                {aulasDetalhe.map((aula) => (
                                    <AulaCard
                                        key={aula.id}
                                        aula={aula}
                                        api={api}
                                        onAbrir={cursoDetalhe.matriculado ? () => navigate(`/DashboardAluno/aulas/${aula.id}`) : undefined}
                                    />
                                ))}
                            </div>
                        </section>
                    )}

                    {visao === "aula" && (
                        <section className={css.secaoAulaAberta}>
                            <button className={css.linkVoltar} onClick={() => navigate(videoAula ? `/DashboardAluno/cursos/${videoAula.id_curso}` : "/DashboardAluno/cursos")}>
                                Voltar
                            </button>

                            {carregando && <p className={css.textoApoio}>Carregando aula...</p>}
                            {!carregando && !videoAula && <EstadoVazio texto="Aula não encontrada." />}

                            {videoAula && (
                                <>
                                    <div className={protecaoAtiva ? css.playerProtegido : ""}>
                                        {/* O player carrega o manifesto protegido devolvido pelo backend. */}
                                        <PlayerVideo
                                            videoAula={videoAula}
                                            videoUrl={videoAula.video ? resolverUrlMidia(api, videoAula.video) : undefined}
                                            posterUrl={
                                                videoAula.thumb
                                                    ? resolverUrlMidia(api, videoAula.thumb)
                                                    : undefined
                                            }
                                            marcarAssistida={marcarAssistida}
                                        />
                                        {protecaoAtiva && (
                                            <div className={css.avisoProtecao}>
                                                <FaShieldAlt />
                                                <span>Conteúdo protegido contra captura.</span>
                                            </div>
                                        )}
                                    </div>

                                    <h2>Próximas videoaulas</h2>
                                    <div className={css.gridAulas}>
                                        {proximas.map((aula) => (
                                            <AulaCard key={aula.id} aula={aula} api={api} onAbrir={() => navigate(`/DashboardAluno/aulas/${aula.id}`)} />
                                        ))}
                                    </div>
                                </>
                            )}
                        </section>
                    )}

                    {visao === "perfil" && (
                        <section className={css.secaoPerfil}>
                            <PerfilUsuario api={api} setMensagem={setMensagem} onPerfilAtualizado={onPerfilAtualizado} />
                        </section>
                    )}

                    {visao === "financeiro" && (
                        <section className={css.secaoMetricas}>
                            <div className={css.tituloUltimasAulas}>
                                <h2>Financeiro</h2>
                                <span>Assinatura</span>
                            </div>
                            {/* Sprint itens 33 e 34: resumo inicial de gastos e faturas do aluno. */}
                            <div className={css.gridMetricas}>
                                {/* Sprint item 2: mostra total gasto e historico de faturas do aluno. */}
                                <CardMetrica
                                    titulo="Total gasto"
                                    detalhe="Mensalidades registradas"
                                    valor={`R$ ${Number(financeiro?.total_gasto || 0).toFixed(2).replace(".", ",")}`}
                                />
                                <CardMetrica
                                    titulo="Em aberto"
                                    detalhe="Faturas pendentes"
                                    valor={`R$ ${Number(financeiro?.total_aberto || 0).toFixed(2).replace(".", ",")}`}
                                />
                            </div>
                            <div className={css.areaFinanceiro}>
                                <div className={css.blocoFinanceiro}>
                                    <div className={css.cabecalhoBlocoFinanceiro}>
                                        <div>
                                            <h2>Pagamento de novas mensalidades</h2>
                                            <p>Gere uma nova cobrança sem interromper a mensalidade atual.</p>
                                        </div>
                                        <button className={css.botaoCertificado} type="button" onClick={criarFaturaFutura} disabled={criandoFatura}>
                                            {criandoFatura ? "Gerando mensalidade..." : "Pagar nova mensalidade"}
                                        </button>
                                    </div>
                                    {pagamentoFatura?.codigo_pagamento && (
                                        <div className={css.cardPagamentoPix}>
                                            <div className={css.pagamentoPixTopo}>
                                                <div>
                                                    <span>{pagamentoFatura.fatura_existente ? "Mensalidade pendente" : "PIX gerado"}</span>
                                                    <strong>R$ {Number(pagamentoFatura.valor || 0).toFixed(2).replace(".", ",")}</strong>
                                                </div>
                                                <small>Vencimento em ate 3 dias</small>
                                            </div>
                                            <div className={css.caixaCodigoPixFinanceiro}>
                                                <span>Pix copia e cola</span>
                                                <p className={css.codigoPixFinanceiro}>{pagamentoFatura.codigo_pagamento}</p>
                                            </div>
                                            <div className={css.acoesPagamentoPix}>
                                                <button
                                                    className={`${css.botaoSecundarioFinanceiro} ${codigoFaturaCopiado ? css.botaoCodigoCopiado : ""}`}
                                                    type="button"
                                                    onClick={copiarCodigoFatura}
                                                >
                                                    {codigoFaturaCopiado ? "Código copiado" : "Copiar código"}
                                                </button>
                                                <button
                                                    className={css.botaoCertificado}
                                                    type="button"
                                                    onClick={verificarPagamentoFatura}
                                                    disabled={verificandoFatura}
                                                >
                                                    {verificandoFatura ? "Verificando..." : "Já paguei"}
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                    <div className={css.listaMateriais}>
                                        {faturasAbertas.map((fatura) => (
                                            <article className={css.cardMaterial} key={fatura.id}>
                                                <strong>Mensalidade #{fatura.numero || fatura.id} - {fatura.status_label}</strong>
                                                <span>R$ {Number(fatura.valor || 0).toFixed(2).replace(".", ",")}</span>
                                                <p>Vencimento: {formatarDataAssinatura(fatura.data_vencimento || fatura.data_expiracao || fatura.criado_em)}</p>
                                            </article>
                                        ))}
                                        {faturasAbertas.length === 0 && <EstadoVazio texto="Nenhuma mensalidade em aberto." />}
                                    </div>
                                </div>

                                <div className={css.blocoFinanceiro}>
                                    <h2>Histórico de mensalidades</h2>
                                    <div className={css.listaMateriais}>
                                        {faturasPagas.map((fatura) => (
                                            <article className={css.cardMaterial} key={fatura.id}>
                                                <strong>Mensalidade #{fatura.numero || fatura.id} - {fatura.status_label}</strong>
                                                <span>R$ {Number(fatura.valor || 0).toFixed(2).replace(".", ",")}</span>
                                                <p>Vencimento: {formatarDataAssinatura(fatura.data_vencimento || fatura.data_expiracao || fatura.criado_em)}</p>
                                            </article>
                                        ))}
                                        {faturasPagas.length === 0 && <EstadoVazio texto="Nenhuma mensalidade paga registrada." />}
                                    </div>
                                </div>
                            </div>
                        </section>
                    )}

                    {visao === "chat" && (
                        <section className={css.secaoCursos}>
                            <ChatCurso api={api} perfil="aluno" setMensagem={setMensagem} />
                        </section>
                    )}
                </main>

                <RodapeAluno />
            </div>
        </div>
    );
}
