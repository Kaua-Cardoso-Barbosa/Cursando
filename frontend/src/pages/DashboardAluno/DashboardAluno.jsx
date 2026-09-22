import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
    FaCheck,
    FaGraduationCap,
    FaPlay,
    FaSearch,
    FaUser
} from "react-icons/fa";
import MenuLateralAluno from "../../components/MenuLateral/MenuLateralAluno.jsx";
import Button from "../../components/Button/Button.jsx";
import PerfilUsuario from "../../components/PerfilUsuario/PerfilUsuario.jsx";
import css from "./DashboardAluno.module.css";
import PlayerVideo from "../../components/PlayerVideo/PlayerVideo.jsx";

const PLACEHOLDER_CURSO = "/imagens_banner_curso/Placholder.png";
const PLACEHOLDER_AULA = "/imagens_thumb_video/Placeholder.png";

function resolverUrlMidia(api, caminho) {
    if (!caminho) return "";
    if (caminho.startsWith("http://") || caminho.startsWith("https://") || caminho.startsWith("/imagens_")) {
        return caminho;
    }
    return `${api}${caminho}`;
}

function CabecalhoAluno({ usuario, sair }) {
    return (
        <header className={css.cabecalhoUsuario}>
            <div className={css.dadosUsuario}>
                <h1>Ola {usuario.nome}</h1>
                <span className={css.cargoUsuario}>Aluno</span>
            </div>

            <div className={css.acoesUsuario}>
                <Button texto="Sair" fundoCor="vermelho" tamanho="pequeno" onClick={sair} />
                <div className={css.fotoPerfil}>
                    <FaUser />
                </div>
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
                <h4>Navegacao</h4>
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

function CardMetrica({ titulo, detalhe, valor }) {
    return (
        <article className={css.cardMetrica}>
            <div className={css.metricaTopo}>
                <h2>{titulo}</h2>
                <div className={css.iconeBadge}>
                    <FaGraduationCap />
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
    sair,
    setMensagem,
    onPerfilAtualizado,
    usuario = { nome: "Aluno", tipo: 2 }
}) {
    const [dashboard, setDashboard] = useState(null);
    const [meusCursos, setMeusCursos] = useState([]);
    const [descobrir, setDescobrir] = useState([]);
    const [busca, setBusca] = useState("");
    const [detalheCurso, setDetalheCurso] = useState(null);
    const [aulaAtual, setAulaAtual] = useState(null);
    const [carregando, setCarregando] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();

    const visao = useMemo(() => {
        if (location.pathname.endsWith("/perfil")) return "perfil";
        if (location.pathname.includes("/descobrir")) return "descobrir";
        if (location.pathname.includes("/aulas/")) return "aula";
        if (location.pathname.includes("/cursos")) return "meus-cursos";
        return "inicio";
    }, [location.pathname]);

    const itemAtivo = visao === "descobrir" ? "descobrir" : visao === "perfil" ? "perfil" : visao === "inicio" ? "inicio" : "meus-cursos";

    const avisar = useCallback((mensagem) => {
        if (mensagem && setMensagem) setMensagem(mensagem);
    }, [setMensagem]);

    const lerResposta = useCallback(async (resposta) => {
        const dados = await resposta.json().catch(() => ({}));
        if (dados.mensagem) avisar(dados.mensagem);
        if (!resposta.ok) throw new Error(dados?.mensagem?.descricao || "Erro ao conectar com a API.");
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
            setMeusCursos([]);
        } finally {
            setCarregando(false);
        }
    }, [api, lerResposta]);

    const carregarDescobrir = useCallback(async (termo = busca) => {
        setCarregando(true);
        try {
            const params = termo ? `?busca=${encodeURIComponent(termo)}` : "";
            const resposta = await fetch(`${api}/aluno/descobrir${params}`, { credentials: "include" });
            setDescobrir(await lerResposta(resposta));
        } catch (erro) {
            console.error("Erro ao carregar cursos publicos:", erro);
            setDescobrir([]);
        } finally {
            setCarregando(false);
        }
    }, [api, busca, lerResposta]);

    const carregarDetalheCurso = useCallback(async (idCurso) => {
        setCarregando(true);
        try {
            const resposta = await fetch(`${api}/aluno/cursos/${idCurso}`, { credentials: "include" });
            setDetalheCurso(await lerResposta(resposta));
        } catch (erro) {
            console.error("Erro ao carregar curso:", erro);
            setDetalheCurso(null);
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
            carregarMeusCursos();
            return;
        }

        if (location.pathname.endsWith("/descobrir")) {
            carregarDescobrir();
        }
    }, [carregarAula, carregarDescobrir, carregarDetalheCurso, carregarMeusCursos, location.pathname]);

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
            avisar({ tipo: "erro", descricao: erro.message });
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

            setAulaAtual((atual) =>
                atual
                    ? {
                        ...atual,
                        aula: {
                            ...atual.aula,
                            assistida: true
                        }
                    }
                    : atual
            );
        } catch (erro) {
            console.error("Erro ao marcar aula como assistida:", erro);
        }
    }, [api, lerResposta, carregarDashboard]);

    const metricas = dashboard?.metricas || { inscritos: 0, finalizados: 0, iniciados: 0 };
    const recentes = dashboard?.recentes || [];
    const cursoDetalhe = detalheCurso?.curso;
    const aulasDetalhe = detalheCurso?.aulas || [];
    const videoAula = aulaAtual?.aula;
    const proximas = aulaAtual?.proximas || [];

    return (
        <div className={css.painelAluno}>
            <MenuLateralAluno itemAtivo={itemAtivo} />

            <div className={css.conteudoPrincipal}>
                <main className={css.areaConteudo}>
                    {visao !== "aula" && <CabecalhoAluno usuario={usuario} sair={sair} />}

                    {visao === "inicio" && (
                        <>
                            <section className={css.gridMetricas}>
                                <CardMetrica titulo="Cursos inscritos" detalhe="+0 nesse mes" valor={metricas.inscritos} />
                                <CardMetrica titulo="Cursos finalizados" detalhe="+0 nesse mes" valor={metricas.finalizados} />
                                <CardMetrica titulo="Cursos iniciados" detalhe="+0 nesse mes" valor={metricas.iniciados} />
                            </section>

                            <section className={css.secaoCursos}>
                                <h2>Ultimas aulas vistas:</h2>
                                {recentes.length === 0 && <EstadoVazio texto="Nenhuma aula assistida ainda." />}
                                <div className={css.carrosselCursos}>
                                    {recentes.map((aula) => (
                                        <AulaCard key={aula.id} aula={aula} api={api} onAbrir={() => navigate(`/DashboardAluno/aulas/${aula.id}`)} />
                                    ))}
                                </div>
                            </section>
                        </>
                    )}

                    {visao === "meus-cursos" && !cursoDetalhe && (
                        <section className={css.secaoCursos}>
                            <h2>Todos os Cursos</h2>
                            {!carregando && meusCursos.length === 0 && <EstadoVazio texto="Voce ainda nao se inscreveu em cursos." />}
                            <div className={css.gridCursos}>
                                {meusCursos.map((curso) => (
                                    <CursoCard key={curso.id} curso={curso} api={api} mostrarProgresso onAbrir={() => navigate(`/DashboardAluno/cursos/${curso.id}`)} />
                                ))}
                            </div>
                        </section>
                    )}

                    {visao === "descobrir" && !cursoDetalhe && (
                        <section className={css.secaoCursos}>
                            <div className={css.areaBusca}>
                                <div className={css.campoBusca}>
                                    <FaSearch />
                                    <input
                                        value={busca}
                                        placeholder="Pesquisar em Cursos"
                                        onChange={(evento) => setBusca(evento.target.value)}
                                        onKeyDown={(evento) => {
                                            if (evento.key === "Enter") carregarDescobrir(evento.currentTarget.value);
                                        }}
                                    />
                                </div>
                                <button className={css.campoBuscaButton} onClick={() => carregarDescobrir(busca)}>Buscar</button>
                            </div>


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
                                    {!cursoDetalhe.matriculado && (
                                        <button className={css.botaoInscrever} onClick={() => inscrever(cursoDetalhe)}>
                                            Inscrever-se
                                        </button>
                                    )}
                                </div>
                            </div>

                            <p className={css.descricaoCurso}>{cursoDetalhe.descricao}</p>
                            <h2>{cursoDetalhe.matriculado ? "Todas video-aulas do curso:" : "Video-aulas disponiveis apos inscrever-se:"}</h2>

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
                            {!carregando && !videoAula && <EstadoVazio texto="Aula nao encontrada." />}

                            {videoAula && (
                                <>
                                    <div>
                                        <PlayerVideo
                                            videoAula={videoAula}
                                            videoUrl={
                                                videoAula.video
                                                    ? resolverUrlMidia(api, videoAula.video)
                                                    : undefined
                                            }
                                            posterUrl={
                                                videoAula.thumb
                                                    ? resolverUrlMidia(api, videoAula.thumb)
                                                    : undefined
                                            }
                                            marcarAssistida={marcarAssistida}
                                        />
                                        <div className={css.tituloNoVideo}>
                                            <h1>{videoAula.titulo}</h1>
                                            <p>{videoAula.descricao}</p>
                                        </div>
                                    </div>

                                    <h2>Proximas video-aulas:</h2>
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
                </main>

                <RodapeAluno />
            </div>
        </div>
    );
}
