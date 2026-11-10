import BotaoVoltar from '../../components/BotaoVoltar/BotaoVoltar.jsx';
import { urlPerfil } from '../../utils/perfil.js';
import { corAvaliacao } from '../../utils/avaliacao.js';
import CabecalhoPagina from '../../components/CabecalhoPagina/CabecalhoPagina.jsx';
import videoCss from './PaginaVideo.module.css';
import MeusCursos from '../../components/MeusCursos/MeusCursos.jsx';
import CursoCardBase from '../../components/CursoCard/CursoCard.jsx';
import AvaliacoesCurso from '../../components/AvaliacoesCurso/AvaliacoesCurso.jsx';
import AutoTextarea from '../../components/AutoTextarea/AutoTextarea.jsx';
import PaginaIndisponivel from '../PaginaIndisponivel/PaginaIndisponivel.jsx';
import ProvaCursoAluno from '../../components/Provas/ProvaCursoAluno.jsx';
import HistoricoAlunoCursos from '../../components/Provas/HistoricoAlunoCursos.jsx';
import EtapaModulo, { ListaEtapasModulo } from '../../components/EtapaModulo/EtapaModulo.jsx';
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import {
    FaCheck,
    FaCalendarAlt,
    FaGraduationCap,
    FaBookOpen,
    FaCheckCircle,
    FaWallet,
    FaFileInvoiceDollar,
    FaPlay,
    FaSearch,
    FaShieldAlt
} from "react-icons/fa";
import MenuLateralAluno from "../../components/MenuLateral/MenuLateralAluno_3.jsx";
import Alerts from "../../components/Alerts/Alerts.jsx";
import Perfil from "../Perfil/Perfil.jsx";
import css from "./DashboardAluno_38.module.css";
import PlayerVideo from "../../components/PlayerVideo/PlayerVideo_4_10_26.jsx";
import ChatCurso from "../../components/ChatCurso/ChatCurso_19.jsx";
import ResumoAssinatura from "./ResumoAssinatura_34.jsx";
import PixQrCode from "../../components/PixQrCode/PixQrCode.jsx";

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

/* Sprint item 4 - Salvar o progresso das aulas para que o aluno continue de onde parou - Formata a posição salva para exibir o ponto de retomada */
function formatarPosicaoAula(segundos) {
    const total = Math.max(0, Math.floor(Number(segundos) || 0));
    const horas = Math.floor(total / 3600);
    const minutos = Math.floor((total % 3600) / 60);
    const restante = total % 60;
    return horas > 0
        ? `${horas}:${String(minutos).padStart(2, "0")}:${String(restante).padStart(2, "0")}`
        : `${minutos}:${String(restante).padStart(2, "0")}`;
}
/* Fim item 4 */

function resolverUrlMidia(api, caminho) {
    if (!caminho) return "";
    if (caminho.startsWith("http://") || caminho.startsWith("https://") || caminho.startsWith("/imagens_")) {
        return caminho;
    }
    return `${api}${caminho}`;
}

function ImagemComplemento({ api, material, avisar }) {
    const [urlImagem, setUrlImagem] = useState("");
    const [carregando, setCarregando] = useState(false);
    const urlAtual = useRef("");

    useEffect(() => () => {
        if (urlAtual.current) URL.revokeObjectURL(urlAtual.current);
    }, []);

    async function alternarImagem() {
        if (urlAtual.current) {
            URL.revokeObjectURL(urlAtual.current);
            urlAtual.current = "";
            setUrlImagem("");
            return;
        }

        setCarregando(true);
        try {
            const resposta = await fetch(`${api}${material.arquivo_url}`, { credentials: "include" });
            if (!resposta.ok) {
                const dados = await resposta.json().catch(() => ({}));
                throw new Error(dados?.mensagem?.descricao || "Não foi possível abrir a imagem.");
            }
            const url = URL.createObjectURL(await resposta.blob());
            urlAtual.current = url;
            setUrlImagem(url);
        } catch (erro) {
            avisar({ tipo: "erro", descricao: erro.message });
        } finally {
            setCarregando(false);
        }
    }

    return <>
        <button type="button" onClick={alternarImagem} disabled={carregando}>{carregando ? "Carregando imagem..." : urlImagem ? "Esconder imagem" : "Ver imagem"}</button>
        {urlImagem && <img className={css.imagemComplemento} src={urlImagem} alt={material.titulo} />}
    </>;
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
    return <CursoCardBase imagem={imagem} titulo={curso.titulo} descricao={curso.descricao}
        categoria={curso.categoria} avaliacao={curso.avaliacao_media} professor={curso.professor}
        totalAulas={curso.aulas_publicadas}
        onAbrir={() => onAbrir?.(curso)}
        capaExtra={mostrarProgresso && <div className={css.progressoCurso} aria-label={progresso + '% concluido'}>
            <span>{progresso}%</span><div className={css.barraProgresso} aria-hidden="true"><i style={{ width: progresso + '%' }} /></div>
        </div>} />;
}

function AulaCard({ aula, api, onAbrir, compacto = false, atual = false }) {
    const imagem = aula.thumb ? resolverUrlMidia(api, aula.thumb) : PLACEHOLDER_AULA;
    const duracao = Number(aula.duracao_segundos);
    const posicao = Number(aula.progresso_segundos) || 0;
    const percentual = aula.assistida ? 100 : duracao > 0 && Number.isFinite(duracao)
        ? Math.min(100, Math.max(0, posicao / duracao * 100)) : null;

    return (
        <article className={`${css.cardAula} ${compacto ? videoCss.aulaLateral : ''} ${atual ? videoCss.aulaAtual : ''}`}>
            {/* Sprint item 4 - Salvar o progresso das aulas para que o aluno continue de onde parou - Consulta, salva ou retoma a posição e a conclusão da aula */}
            <button className={css.areaCardClicavel} onClick={() => onAbrir?.(aula)} disabled={!onAbrir} aria-current={atual ? 'true' : undefined}>
                <div className={css.previewAula}>
                    <img src={imagem} alt={aula.titulo} />
                    <span className={css.playBadge}><FaPlay /></span>
                    {aula.assistida && <span className={css.seloAulaConcluida}><FaCheck aria-hidden="true" /> Concluída</span>}
                    {percentual !== null && percentual > 0 && (
                        <div className={`${css.progressoVideo} ${aula.assistida ? css.videoConcluido : ''}`}
                            role="progressbar" aria-label="Progresso do vídeo"
                            aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(percentual)}>
                            <span style={{ width: `${percentual}%` }} />
                        </div>
                    )}
                </div>
                <div className={css.infoAula}>
                    <div>
                        <h3>{aula.titulo}</h3>
                        {atual && <span className={videoCss.indicadorAtual}>Assistindo agora</span>}
                        {Number(aula.progresso_segundos) > 0 && (
                            <small className={css.retomadaAula}>
                                Continuar de {formatarPosicaoAula(aula.progresso_segundos)}
                            </small>
                        )}
                    </div>
                </div>
            </button>
            {/* Fim item 4 */}
        </article>
    );
}

export default
function DashboardAluno({
    api,
    setMensagem,
    onPerfilAtualizado,
    usuario = { nome: "Aluno", tipo: 2 }
}) {
    const [dashboard, setDashboard] = useState(null);
    const [meusCursos, setMeusCursos] = useState([]);
    const [descobrir, setDescobrir] = useState([]);
    const [financeiro, setFinanceiro] = useState(null);
    /* Sprint item 33 - Exibir total gasto e histórico de faturas do aluno - Mantém as faturas e o histórico financeiro do aluno */
    const [faturas, setFaturas] = useState([]);
    /* Fim item 33 */
    /* Sprint item 2 - Integrar pagamentos pelo ARKHE - Solicita ou confere a cobrança Pix pela API de pagamentos */
    const [pagamentoFatura, setPagamentoFatura] = useState(null);
    /* Fim item 2 */
    const [verificandoFatura, setVerificandoFatura] = useState(false);
    const [criandoFatura, setCriandoFatura] = useState(false);
    const [codigoFaturaCopiado, setCodigoFaturaCopiado] = useState(false);
    const [busca, setBusca] = useState("");
    const [ordemDescobrir, setOrdemDescobrir] = useState("recentes");
    const [apenasNaoInscritos, setApenasNaoInscritos] = useState(false);

    /* Sprint item 28 - Permitir filtro de cursos por tema, categoria e avaliação - Aplica os filtros de busca, tema, categoria e avaliação */
    const [categoriasDescobrir, setCategoriasDescobrir] = useState([]);
    const [temasDescobrir, setTemasDescobrir] = useState([]);
    const [categoriaDescobrir, setCategoriaDescobrir] = useState("");
    const [temaDescobrir, setTemaDescobrir] = useState("");
    const [avaliacaoMinimaDescobrir, setAvaliacaoMinimaDescobrir] = useState("");
    /* Fim item 28 */
    const [detalheCurso, setDetalheCurso] = useState(null);
    const [materiaisCurso, setMateriaisCurso] = useState([]);
    /* Sprint item 20 - Permitir que o instrutor cadastre provas para validar a conclusão do curso - Prepara as questões, as respostas e a correção da prova */
    const [provaAluno, setProvaAluno] = useState(null);
    /* Fim item 20 */
    const [avaliacao, setAvaliacao] = useState({ nota: 5, comentario: "" });
    const [enviandoAvaliacao, setEnviandoAvaliacao] = useState(false);
    const [avaliacaoEnviada, setAvaliacaoEnviada] = useState(false);
    const [aulaAtual, setAulaAtual] = useState(null);
    const consultaAulaRef = useRef(0);
    /* Sprint item 26 - Bloquear gravação de tela durante o curso - Protege a reprodução diante de gravação ou ocultação da tela detectável */
    const [protecaoAtiva, setProtecaoAtiva] = useState(false);
    /* Fim item 26 */
    const temporizadorProtecaoRef = useRef(null);
    const [carregando, setCarregando] = useState(false);
    /* Sprint item 5 - Gerar certificado ao concluir o curso - Solicita ou apresenta o certificado de conclusão do curso */
    const [baixandoCertificado, setBaixandoCertificado] = useState(false);
    /* Fim item 5 */

    /* Sprint item 6 - Permitir que o instrutor divida o curso em módulos - Mantém os dados do módulo e sua seleção */
    const [parametros, setParametros] = useSearchParams();
    const idModuloAberto = parametros.get('modulo');
    function setIdModuloAberto(id) {
        setParametros((atuais) => {
            const novos = new URLSearchParams(atuais);
            if (id == null) novos.delete('modulo');
            else novos.set('modulo', String(id));
            return novos;
        }, { replace: true });
    }
    /* Fim item 6 */
    const location = useLocation();
    const navigate = useNavigate();
    const [abaCurso, setAbaCurso] = useState("modulos");

    /* Sprint item 3 - Sincronizar dados entre aplicativo e sistema web - Atualiza os dados da sessão compartilhados entre o site e o aplicativo */
    const visao = useMemo(
() => {
        if (location.pathname.endsWith("/perfil")) return "perfil";
        if (location.pathname.endsWith("/financeiro")) return "financeiro";

        if (location.pathname.endsWith("/assinatura")) return "financeiro";
        if (location.pathname.endsWith("/chat")) return "chat";
        if (location.pathname.endsWith("/provas")) return "provas";
        if (location.pathname.includes("/descobrir")) return "descobrir";
        if (location.pathname.includes("/aulas/")) return "aula";
        if (location.pathname.includes("/cursos")) return "meus-cursos";
        return "inicio";
    }
, [location.pathname]);
    /* Fim item 3 */

    const itemAtivo = visao === "provas" ? "provas" : visao === "descobrir" ? "descobrir" : visao === "financeiro" ? "financeiro" : visao === "chat" ? "chat" : visao === "perfil" ? "perfil" : visao === "inicio" ? "inicio" : "meus-cursos";

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

    const carregarDashboard = useCallback(
async () => {
        try {
            const resposta = await fetch(`${api}/aluno/dashboard`, { credentials: "include" });
            setDashboard(await lerResposta(resposta));
        } catch (erro) {
            console.error("Erro ao carregar dashboard do aluno:", erro);

            setDashboard({ metricas: { inscritos: 0, finalizados: 0, iniciados: 0 }, recentes: [], erro_assinatura: true, erro: erro.message, indisponivel: !erro.status || erro.status >= 500 });
        }
    }
, [api, lerResposta]);

    const carregarMeusCursos = useCallback(
async () => {
        setCarregando(true);
        try {
            const resposta = await fetch(`${api}/aluno/cursos`, { credentials: "include" });
            setMeusCursos(await lerResposta(resposta));
        } catch (erro) {
            console.error("Erro ao carregar cursos do aluno:", erro);
            if (erro.status === 402) {

                avisar({ tipo: "erro", descricao: erro.message });
                navigate(erro.dados?.redirecionar || "/DashboardAluno/financeiro");
            }
            setMeusCursos([]);
        } finally {
            setCarregando(false);
        }
    }
, [api, lerResposta]);


    /* Sprint item 29 - Criar recomendação inteligente de cursos com base nas buscas e compras recentes do aluno - Apresenta a ordenação de cursos recomendados pela API */
    const carregarDescobrir = useCallback(
async (termo = busca) => {
        setCarregando(true);
        try {
            const params = new URLSearchParams();
            if (termo.trim()) params.set("busca", termo.trim());
            params.set("ordem", ordemDescobrir);

            if (ordemDescobrir === "recomendados") params.set("recomendados", "1");
            if (apenasNaoInscritos) params.set("apenas_novos", "1");
            if (categoriaDescobrir) params.set("categoria", categoriaDescobrir);
            if (temaDescobrir) params.set("tema", temaDescobrir);
            if (avaliacaoMinimaDescobrir) params.set("avaliacao_min", avaliacaoMinimaDescobrir);
            const resposta = await fetch(`${api}/aluno/descobrir?${params.toString()}`, { credentials: "include" });
            setDescobrir(await lerResposta(resposta));
        } catch (erro) {
            console.error("Erro ao carregar cursos publicos:", erro);
            setDescobrir([]);
        } finally {
            setCarregando(false);
        }
    }
, [api, apenasNaoInscritos, avaliacaoMinimaDescobrir, busca, categoriaDescobrir, lerResposta, ordemDescobrir, temaDescobrir]);
    /* Fim item 29 */


    /* Sprint item 28 - Permitir filtro de cursos por tema, categoria e avaliação - Aplica os filtros de busca, tema, categoria e avaliação */
    useEffect(() => {
        let ativo = true;
        Promise.all([
            fetch(`${api}/taxonomias/categorias`, { credentials: "include" }),
            fetch(`${api}/taxonomias/temas`, { credentials: "include" })
        ]).then(async (respostas) => {
            const dados = await Promise.all(respostas.map((resposta) => resposta.json()));
            if (!respostas.every((resposta) => resposta.ok)) throw new Error("Não foi possível carregar os filtros de cursos.");
            if (ativo) {
                setCategoriasDescobrir(Array.isArray(dados[0]) ? dados[0] : []);
                setTemasDescobrir(Array.isArray(dados[1]) ? dados[1] : []);
            }
        }).catch((erro) => console.error("Erro ao carregar filtros de cursos:", erro));
        return () => { ativo = false; };
    }, [api]);
    /* Fim item 28 */

    const carregarDetalheCurso = useCallback(
async (idCurso) => {
        setCarregando(true);
        try {
            /* Sprint item 21 - Permitir que o instrutor publique materiais do curso, como livros, apostilas e códigos - Publica, lista ou permite baixar os materiais complementares */
            const requisicoes = [
                fetch(`${api}/aluno/cursos/${idCurso}`, { credentials: "include" }),
                fetch(`${api}/aluno/cursos/${idCurso}/materiais`, { credentials: "include" })
            ];
            /* Fim item 21 */
            const [resposta, respostaMateriais] = await Promise.all(requisicoes);
            const dadosCurso = await lerResposta(resposta);
            setDetalheCurso(dadosCurso);
            setMateriaisCurso(await lerResposta(respostaMateriais));

            if (dadosCurso?.curso?.matriculado) {
                try {
                    /* Sprint item 20 - Permitir que o instrutor cadastre provas para validar a conclusão do curso - Prepara as questões, as respostas e a correção da prova */
                    const respostaProva = await fetch(`${api}/aluno/cursos/${idCurso}/prova`, { credentials: "include" });
                    /* Fim item 20 */
                    /* Sprint item 20 - Permitir que o instrutor cadastre provas para validar a conclusão do curso - Prepara as questões, as respostas e a correção da prova */
                    if (respostaProva.ok) {
                        setProvaAluno(await lerResposta(respostaProva));
                    } else {
                        setProvaAluno(null);
                    }
                    /* Fim item 20 */
                } catch {
                    /* Sprint item 20 - Permitir que o instrutor cadastre provas para validar a conclusão do curso - Prepara as questões, as respostas e a correção da prova */
                    setProvaAluno(null);
                    /* Fim item 20 */
                }
            } else {
                /* Sprint item 20 - Permitir que o instrutor cadastre provas para validar a conclusão do curso - Prepara as questões, as respostas e a correção da prova */
                setProvaAluno(null);
                /* Fim item 20 */
            }
        } catch (erro) {
            console.error("Erro ao carregar curso:", erro);
            if (erro.status === 402) {

                avisar({ tipo: "erro", descricao: erro.message });
                navigate(erro.dados?.redirecionar || "/DashboardAluno/financeiro");
            }
            // Uma falha temporária na sincronização não deve fechar o módulo aberto.
            if (!erro.status || erro.status >= 500) {
                setDetalheCurso((anterior) => Number(anterior?.curso?.id) === Number(idCurso) ? anterior : null);
            } else {
                setDetalheCurso(null);
                setMateriaisCurso([]);
                setProvaAluno(null);
            }
            /* Sprint item 20 - Permitir que o instrutor cadastre provas para validar a conclusão do curso - Prepara as questões, as respostas e a correção da prova */
            /* Fim item 20 */
        } finally {
            setCarregando(false);
        }
    }
, [api, lerResposta]);

    const carregarAula = useCallback(async (idAula) => {
        const consulta = ++consultaAulaRef.current;
        setCarregando(true);
        try {
            const resposta = await fetch(`${api}/aluno/aulas/${idAula}`, { credentials: "include" });
            const dados = await lerResposta(resposta);
            if (consulta !== consultaAulaRef.current) return;
            setAulaAtual(dados);
        } catch (erro) {
            if (consulta !== consultaAulaRef.current) return;
            console.error("Erro ao carregar aula:", erro);
            if (erro.status === 402) {
                avisar({ tipo: "erro", descricao: erro.message });
                navigate(erro.dados?.redirecionar || "/DashboardAluno/financeiro");
            }
            setAulaAtual(null);
        } finally {
            if (consulta === consultaAulaRef.current) setCarregando(false);
        }
    }, [api, lerResposta]);



    /* Sprint item 4 - Salvar o progresso das aulas para que o aluno continue de onde parou - Consulta, salva ou retoma a posição e a conclusão da aula */
    const salvarProgressoAula = useCallback(async (idAula, posicaoSegundos) => {
        try {
            const resposta = await fetch(`${api}/aluno/aulas/${idAula}/progresso`, {
                method: "PUT",
                credentials: "include",
                keepalive: true,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ posicao_segundos: posicaoSegundos })
            });
            const dados = await resposta.json().catch(() => ({}));
            if (!resposta.ok) {
                throw new Error(dados?.mensagem?.descricao || "Nao foi possivel salvar a posicao da aula.");
            }
        } catch (erro) {
            console.error("Erro ao salvar posicao da aula:", erro);
        }
    }, [api, lerResposta]);
    /* Fim item 4 */

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

    /* Sprint item 33 - Exibir total gasto e histórico de faturas do aluno - Consulta e apresenta o total gasto e o histórico de faturas pagas */
    const carregarFinanceiro = useCallback(async () => {
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
    }, [api, avisar, lerResposta]);
    /* Fim item 33 */

    /* Sprint item 33 - Exibir total gasto e histórico de faturas do aluno - Consulta e apresenta o total gasto e o histórico de faturas pagas */
    useEffect(() => {
        if (visao === "financeiro") carregarFinanceiro();
    }, [carregarFinanceiro, visao]);
    /* Fim item 33 */

    useEffect(
() => {
        /* Sprint item 26 - Bloquear gravação de tela durante o curso - Protege a reprodução diante de gravação ou ocultação da tela detectável */
        if (visao !== "aula") {
            setProtecaoAtiva(false);
            return undefined;
        }
        /* Fim item 26 */

/* Sprint item 10 - Bloquear captura de tela durante o curso - Oculta temporariamente o conteúdo ao detectar atalho de captura */
function ativarProtecao(evento) {
            if (visao !== "aula") return;
            const tecla = evento?.key?.toLowerCase();
            const atalhoCaptura = evento?.key === "PrintScreen"
                || (evento?.shiftKey && evento?.metaKey && ["3", "4", "5"].includes(tecla))
                || (evento?.shiftKey && evento?.ctrlKey && tecla === "s");
            if (!atalhoCaptura) return;


            evento.preventDefault();
            evento.stopPropagation();
            setProtecaoAtiva(true);
            window.clearTimeout(temporizadorProtecaoRef.current);
            temporizadorProtecaoRef.current = window.setTimeout(() => setProtecaoAtiva(false), 2500);
        }
/* Fim item 10 */


        /* Sprint item 26 - Bloquear gravação de tela durante o curso - Protege o conteúdo quando a página fica oculta */
        function aoVisibilidade() {
            if (visao !== "aula") return;
            if (document.hidden) {
                setProtecaoAtiva(true);
                return;
            }
            window.clearTimeout(temporizadorProtecaoRef.current);
            temporizadorProtecaoRef.current = window.setTimeout(() => setProtecaoAtiva(false), 500);
        }
        /* Fim item 26 */

        /* Sprint item 10 - Bloquear captura de tela durante o curso - Trata os atalhos ou eventos detectáveis de captura de tela */
        document.addEventListener("keydown", ativarProtecao);
        /* Fim item 10 */
        /* Sprint item 26 - Bloquear gravação de tela durante o curso - Protege a reprodução diante de gravação ou ocultação da tela detectável */
        document.addEventListener("visibilitychange", aoVisibilidade);
        /* Fim item 26 */

        return () => {
            window.clearTimeout(temporizadorProtecaoRef.current);
            /* Sprint item 10 - Bloquear captura de tela durante o curso - Trata os atalhos ou eventos detectáveis de captura de tela */
            document.removeEventListener("keydown", ativarProtecao);
            /* Fim item 10 */
            /* Sprint item 26 - Bloquear gravação de tela durante o curso - Protege a reprodução diante de gravação ou ocultação da tela detectável */
            document.removeEventListener("visibilitychange", aoVisibilidade);
            /* Fim item 26 */
        };
    }
, [visao]);

    useEffect(() => {
        /* Sprint item 3 - Sincronizar dados entre aplicativo e sistema web - Atualiza os dados da sessão compartilhados entre o site e o aplicativo */
        let sincronizando = false;
        /* Fim item 3 */

/* Sprint item 3 - Sincronizar dados entre aplicativo e sistema web - Recarrega os dados da visão ativa após sincronizar a sessão */
async function sincronizarVisaoAtiva() {
            if (document.hidden || sincronizando) return;
            sincronizando = true;

            try {
                const tarefas = [carregarDashboard()];
                const caminho = location.pathname;
                const matchAula = caminho.match(/\/DashboardAluno\/aulas\/(\d+)/);
                const matchCurso = caminho.match(/\/DashboardAluno\/cursos\/(\d+)/);
                const matchDescobrir = caminho.match(/\/DashboardAluno\/descobrir\/(\d+)/);

                if (matchAula) {
                    tarefas.push(carregarAula(matchAula[1]));
                } else if (matchCurso || matchDescobrir) {
                    tarefas.push(carregarDetalheCurso((matchCurso || matchDescobrir)[1]));
                } else if (caminho.endsWith("/cursos")) {
                    tarefas.push(carregarMeusCursos());
                } else if (caminho.endsWith("/descobrir")) {
                    tarefas.push(carregarDescobrir());
                }

                if (visao === "financeiro") tarefas.push(carregarFinanceiro());


                await Promise.allSettled(tarefas);
            } finally {
                sincronizando = false;
            }
        }
/* Fim item 3 */

        /* Sprint item 3 - Sincronizar dados entre aplicativo e sistema web - Atualiza os dados da sessão compartilhados entre o site e o aplicativo */
        window.addEventListener("cursando:sincronizar", sincronizarVisaoAtiva);
        /* Fim item 3 */
        return () => window.removeEventListener("cursando:sincronizar", sincronizarVisaoAtiva);
    }, [
        carregarAula,
        carregarDashboard,
        carregarDescobrir,
        carregarDetalheCurso,
        carregarFinanceiro,
        carregarMeusCursos,
        location.pathname,
        visao
    ]);



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

                avisar({ tipo: "erro", descricao: erro.message });
                navigate(erro.dados?.redirecionar || "/DashboardAluno/financeiro");
                return;
            }
            avisar({ tipo: "erro", descricao: erro.message });
        }
    }

/* Sprint item 2 - Integrar pagamentos pelo ARKHE - Solicita os dados Pix para pagar a próxima mensalidade */
async function criarFaturaFutura(idAssinatura = null) {
        if (criandoFatura) return;
        setCriandoFatura(true);
        try {
            const resposta = await fetch(`${api}/financeiro/faturas`, {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },

                body: JSON.stringify({ meses: 1, ...(idAssinatura ? { id_assinatura: idAssinatura } : {}) })
            });
            const dados = await lerResposta(resposta);
            if (dados.pagamento_confirmado) {
                await confirmarFatura(dados.id_assinatura);
                return;
            }
            setPagamentoFatura(dados);
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
/* Fim item 2 */

    /* Sprint item 2 - Integrar pagamentos pelo ARKHE - Copia o código da cobrança Pix da fatura */
    async function copiarCodigoFatura() {
        if (!pagamentoFatura?.codigo_pagamento) return;
        await navigator.clipboard.writeText(pagamentoFatura.codigo_pagamento);
        setCodigoFaturaCopiado(true);
        window.setTimeout(() => setCodigoFaturaCopiado(false), 2500);
    }
    /* Fim item 2 */

/* Sprint item 2 - Integrar pagamentos pelo ARKHE - Confirma o pagamento da fatura e atualiza a assinatura */
async function confirmarFatura(idAssinatura) {

        const resposta = await fetch(`${api}/financeiro/faturas/${idAssinatura}/verificar`, {
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
    }
/* Fim item 2 */

    /* Sprint item 2 - Integrar pagamentos pelo ARKHE - Consulta a confirmação da cobrança Pix da fatura */
    async function verificarPagamentoFatura() {
        if (!pagamentoFatura?.id_assinatura) return;
        setVerificandoFatura(true);
        try {
            await confirmarFatura(pagamentoFatura.id_assinatura);
        } catch (erro) {
            avisar({ tipo: "erro", descricao: erro.message });
        } finally {
            setVerificandoFatura(false);
        }
    }
    /* Fim item 2 */

    /* Sprint item 4 - Salvar o progresso das aulas para que o aluno continue de onde parou - Consulta, salva ou retoma a posição e a conclusão da aula */
    const marcarAssistida = useCallback(async (aula) => {
        try {
            const resposta = await fetch(`${api}/aluno/aulas/${aula.id}/assistir`, {
                method: "POST",
                credentials: "include"
            });
            await lerResposta(resposta);
            await carregarDashboard();
            setAulaAtual((atual) => Number(atual?.aula?.id) === Number(aula.id) ? { ...atual, aula: { ...atual.aula, assistida: true } } : atual);
        } catch (erro) {
            console.error("Erro ao marcar aula como assistida:", erro);
        }
    }, [api, carregarDashboard, lerResposta]);
    /* Fim item 4 */



    /* Sprint item 21 - Permitir que o instrutor publique materiais do curso, como livros, apostilas e códigos - Solicita o material privado e inicia o download */
    async function baixarMaterial(material) {
        try {
            const resposta = await fetch(`${api}${material.arquivo_url}`, { credentials: "include" });
            if (!resposta.ok) {
                const dados = await resposta.json().catch(() => ({}));
                throw new Error(dados?.mensagem?.descricao || dados?.mensagem || "Não foi possível acessar este material.");
            }
            const blob = await resposta.blob();
            const urlTemporaria = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = urlTemporaria;
            link.download = material.nome_arquivo || material.titulo || "complemento";
            document.body.appendChild(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(urlTemporaria);
        } catch (error) { avisar({ tipo: "erro", descricao: error.message }); }
    }
    /* Fim item 21 */

/* Sprint item 5 - Gerar certificado ao concluir o curso - Solicita o PDF e inicia o download do certificado */
async function baixarCertificado(curso) {
        setBaixandoCertificado(true);
        try {

            const resposta = await fetch(`${api}/aluno/cursos/${curso.id}/certificado`, {
                credentials: "include",
                headers: { Accept: "application/pdf" }
            });
            if (!resposta.ok) await lerResposta(resposta);

            const arquivo = await resposta.blob();
            if (!arquivo.size || !arquivo.type.includes("application/pdf")) {
                throw new Error("O servidor não retornou um certificado PDF válido.");
            }
            const urlTemporaria = URL.createObjectURL(arquivo);
            const link = document.createElement("a");
            link.href = urlTemporaria;
            link.download = `certificado-${curso.id}.pdf`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.setTimeout(() => URL.revokeObjectURL(urlTemporaria), 30000);
        } catch (erro) {
            avisar({ tipo: "erro", descricao: erro.message || "Não foi possível baixar o certificado." });
        } finally {
            setBaixandoCertificado(false);
        }
    }
/* Fim item 5 */


    /* Sprint item 20 - Permitir que o instrutor cadastre provas para validar a conclusão do curso - Envia as respostas do aluno e atualiza o resultado da prova */
    /* Fim item 20 */


    /* Sprint item 27 - Permitir que o aluno avalie o curso após a conclusão - Envia a nota e o comentário da avaliação do curso */
    async function enviarAvaliacaoCurso() {
        if (!podeAvaliar || enviandoAvaliacao || avaliacaoEnviada) return;
        setEnviandoAvaliacao(true);
        try {
            const resposta = await fetch(`${api}/aluno/cursos/${cursoDetalhe.id}/avaliacoes`, {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(avaliacao)
            });
            await lerResposta(resposta);
            setAvaliacaoEnviada(true);
            avisar({ tipo: "sucesso", descricao: "Avaliação cadastrada com sucesso." });
            // Atualiza os comentários sem desmontar a página nem apagar a nota enviada.
            try {
                const atualizacao = await fetch(`${api}/aluno/cursos/${cursoDetalhe.id}`, { credentials: "include" });
                if (atualizacao.ok) {
                    const dados = await atualizacao.json();
                    setDetalheCurso((anterior) => anterior?.curso?.id === dados.curso?.id ? dados : anterior);
                }
            } catch {
                // A avaliação já foi salva; os comentários serão atualizados na próxima visita.
            }
        } catch (erro) {
            if (!erro.status) avisar({ tipo: "erro", descricao: erro.message || "Não foi possível cadastrar a avaliação." });
        } finally {
            setEnviandoAvaliacao(false);
        }
    }
    /* Fim item 27 */

    const metricas = dashboard?.metricas || { inscritos: 0, finalizados: 0, iniciados: 0 };
    const recentes = dashboard?.recentes || [];
    const cursoDetalhe = detalheCurso?.curso;
    const liberacaoAvaliacao = detalheCurso?.avaliacao;
    const podeAvaliar = Boolean(liberacaoAvaliacao?.pode_avaliar);
    const ultimoCursoAvaliado = useRef(null);
    useEffect(() => {
        if (!cursoDetalhe?.id || ultimoCursoAvaliado.current === cursoDetalhe.id) return;
        ultimoCursoAvaliado.current = cursoDetalhe.id;
        setAvaliacaoEnviada(false);
        setAvaliacao({ nota: 5, comentario: "" });
        setAbaCurso("modulos");
    }, [cursoDetalhe?.id]);
    const aulasDetalhe = detalheCurso?.aulas || [];
    /* Sprint item 6 - Permitir que o instrutor divida o curso em módulos - Mantém os dados do módulo e sua seleção */
    const modulosDetalhe = detalheCurso?.modulos || [];
    const moduloAberto = idModuloAberto == null ? null : modulosDetalhe.find((modulo) => Number(modulo.id) === Number(idModuloAberto));
    const aulasSemModulo = aulasDetalhe.filter((aula) => !aula.id_modulo);
    /* Fim item 6 */
    const idAulaNaRota = location.pathname.match(/\/DashboardAluno\/aulas\/(\d+)$/)?.[1];
    const videoAula = Number(aulaAtual?.aula?.id) === Number(idAulaNaRota) ? aulaAtual.aula : null;
    const playlist = aulaAtual?.playlist || [];
    const totalAulasPlaylist = playlist.reduce((total, grupo) => total + grupo.aulas.length, 0);
    const origemCurso = location.state?.origemCurso;
    const retornoCurso = origemCurso && /^\/DashboardAluno\/(cursos|descobrir)\/\d+(\?|$)/.test(origemCurso)
        ? origemCurso : videoAula ? `/DashboardAluno/cursos/${videoAula.id_curso}` : '/DashboardAluno/cursos';

    function abrirVideo(aula) {
        const origem = visao === 'aula' ? origemCurso
            : /^\/DashboardAluno\/(cursos|descobrir)\/\d+$/.test(location.pathname)
                ? location.pathname + location.search : undefined;
        navigate(`/DashboardAluno/aulas/${aula.id}`, { state: { origemCurso: origem } });
    }
    /* Sprint item 34 - Exibir faturas em aberto - Seleciona as faturas ainda pendentes de pagamento */
    const faturasAbertas = faturas.filter((fatura) => fatura.aberta);
    /* Fim item 34 */

    /* Sprint item 33 - Exibir total gasto e histórico de faturas do aluno - Mantém as faturas e o histórico financeiro do aluno */
    const faturasPagas = faturas.filter((fatura) => [1, 3].includes(Number(fatura.status)));
    /* Fim item 33 */

    return (
        dashboard?.indisponivel
            ? <PaginaIndisponivel aoTentarNovamente={carregarDashboard} />
            : <div className={css.painelAluno}>
            <MenuLateralAluno itemAtivo={itemAtivo} />

            <div className={css.conteudoPrincipal}>
                <main className={css.areaConteudo}>
                    {visao === "inicio" && <CabecalhoAluno usuario={usuario} />}

                    {visao === "inicio" && (
                        <>
                                                                                                                                                                                            
                            <header className={css.cabecalhoPagina}>
                                <span className={css.etiquetaPagina}>ÁREA DO ALUNO</span>
                                <h2>Seu aprendizado em andamento</h2>
                                <p>Retome suas aulas, acompanhe sua assinatura e veja o progresso dos seus cursos.</p>
                            </header>
                            {dashboard === null && <p className={css.textoApoio} role="status">Carregando dashboard...</p>}
                            {dashboard?.erro && (
                                <div>
                                    <Alerts tipo="erro" descricao={dashboard.erro} duracao={0} />
                                    <button className={css.linkVoltar} type="button" onClick={carregarDashboard}>Tentar novamente</button>
                                </div>
                            )}
                            <section className={css.secaoUltimasAulas}>
                                <div className={css.tituloUltimasAulas}>
                                    <h2>Últimas aulas vistas:</h2>
                                    <span>{recentes.length} {recentes.length === 1 ? "aula" : "aulas"}</span>
                                </div>
                                {recentes.length === 0 && <EstadoVazio texto="Nenhuma aula assistida ainda." />}
                                <div className={css.carrosselCursos}>
                                    {recentes.map((aula) => (
                                        <AulaCard key={aula.id} aula={aula} api={api} onAbrir={() => abrirVideo(aula)} />
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
                                    <CardMetrica titulo="Cursos inscritos" detalhe="Matrículas ativas" valor={metricas.inscritos} icone={<FaBookOpen />} />
                                    <CardMetrica titulo="Cursos finalizados" detalhe="Conclusões registradas" valor={metricas.finalizados} icone={<FaCheckCircle />} />
                                </div>
                            </section>

                        </>
                    )}

                    {visao === "meus-cursos" && !cursoDetalhe && (
                        <MeusCursos descricao="Acesse os cursos em que você está inscrito e continue de onde parou."
                            carregando={carregando} vazio={meusCursos.length === 0}
                            mensagemVazia="Você ainda não se inscreveu em cursos.">
                            {meusCursos.map((curso) => <CursoCard key={curso.id} curso={curso} api={api} mostrarProgresso
                                onAbrir={() => navigate('/DashboardAluno/cursos/' + curso.id)} />)}
                        </MeusCursos>
                    )}

                    {visao === "provas" && <HistoricoAlunoCursos api={api} />}

                    {visao === "descobrir" && !cursoDetalhe && (
                        <section className={css.secaoCursos}>
                                                                                                                                                                                         
                            <header className={css.cabecalhoPagina}>
                                <span className={css.etiquetaPagina}>EXPLORE</span>
                                <h2>Encontre seu próximo curso</h2>
                                <p>Pesquise o catálogo, compare opções e abra um curso para ver os módulos e as aulas.</p>
                            </header>
                            <div className={css.filtrosDescobrir}>
                                <label className={css.campoBusca}>
                                    <FaSearch />
                                    <input
                                        value={busca}
                                        placeholder="Pesquisar em cursos"
                                        onChange={(evento) => setBusca(evento.target.value)}
                                    />
                                </label>
                                                                                                                                                                                     
                                {/* Sprint item 28 - Permitir filtro de cursos por tema, categoria e avaliação - Aplica os filtros de busca, tema, categoria e avaliação */}
                                <label className={css.filtroOrdenacao}>
                                    <span>Categoria</span>
                                    <select value={categoriaDescobrir} onChange={(evento) => setCategoriaDescobrir(evento.target.value)}>
                                        <option value="">Todas</option>
                                        {categoriasDescobrir.map((categoria) => <option key={categoria.id} value={categoria.nome}>{categoria.nome}</option>)}
                                    </select>
                                </label>
                                {/* Fim item 28 */}
                                {/* Sprint item 28 - Permitir filtro de cursos por tema, categoria e avaliação - Aplica os filtros de busca, tema, categoria e avaliação */}
                                <label className={css.filtroOrdenacao}>
                                    <span>Tema</span>
                                    <select value={temaDescobrir} onChange={(evento) => setTemaDescobrir(evento.target.value)}>
                                        <option value="">Todos</option>
                                        {temasDescobrir.map((tema) => <option key={tema.id} value={tema.nome}>{tema.nome}</option>)}
                                    </select>
                                </label>
                                {/* Fim item 28 */}
                                {/* Sprint item 28 - Permitir filtro de cursos por tema, categoria e avaliação - Aplica os filtros de busca, tema, categoria e avaliação */}
                                <label className={css.filtroOrdenacao}>
                                    <span>Avaliação mínima</span>
                                    <select value={avaliacaoMinimaDescobrir} onChange={(evento) => setAvaliacaoMinimaDescobrir(evento.target.value)}>
                                        <option value="">Qualquer nota</option>
                                        {[1, 2, 3, 4, 5].map((nota) => <option key={nota} value={nota}>{nota} {nota === 1 ? "estrela ou mais" : "estrelas ou mais"}</option>)}
                                    </select>
                                </label>
                                {/* Fim item 28 */}
                                {/* Sprint item 29 - Criar recomendação inteligente de cursos com base nas buscas e compras recentes do aluno - Apresenta a ordenação de cursos recomendados pela API */}
                                <label className={css.filtroOrdenacao}>
                                    <span>Ordenar por</span>
                                    <select value={ordemDescobrir} onChange={(evento) => setOrdemDescobrir(evento.target.value)}>
                                        <option value="recentes">Mais recentes</option>
                                        <option value="populares">Mais populares</option>
                                                                                                                                                                                                                                         
                                        <option value="recomendados">Recomendados para você</option>
                                    </select>
                                </label>
                                {/* Fim item 29 */}
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
                            {!carregando && descobrir.length === 0 && /* Sprint item 29 - Criar recomendação inteligente de cursos com base nas buscas e compras recentes do aluno - Apresenta a ordenação de cursos recomendados pela API */ <EstadoVazio texto={ordemDescobrir === "recomendados" ? "Ainda não há cursos relacionados às suas inscrições. Selecione outra ordenação para explorar o catálogo." : "Nenhum curso público encontrado."} /> /* Fim item 29 */}
                            <div className={css.gridCursos}>
                                {descobrir.map((curso) => (
                                    <CursoCard key={curso.id} curso={curso} api={api} onAbrir={() => navigate(`/DashboardAluno/descobrir/${curso.id}`)} />
                                ))}
                            </div>
                        </section>
                    )}

                    {(visao === "meus-cursos" || visao === "descobrir") && cursoDetalhe && (
                        <section className={css.secaoDetalheCurso}>
                            <BotaoVoltar  onClick={() => navigate(visao === "descobrir" ? "/DashboardAluno/descobrir" : "/DashboardAluno/cursos")}>
                                Voltar
                            </BotaoVoltar>

                            <div className={css.heroCurso}>
                                <img src={cursoDetalhe.imagem ? resolverUrlMidia(api, cursoDetalhe.imagem) : PLACEHOLDER_CURSO} alt={cursoDetalhe.titulo} />
                                <div className={css.resumoCurso}>
                                    <h2>{cursoDetalhe.titulo}</h2>
                                    <p><strong>Professor(a):</strong> {cursoDetalhe.professores?.length
                                        ? cursoDetalhe.professores.map((professor, indice) => <span key={professor.id}>
                                            {indice > 0 && ', '}{professor.identificador ? <Link className={css.linkPerfilProfessor} to={urlPerfil(professor.identificador)}>{professor.nome}</Link> : professor.nome}
                                        </span>) : cursoDetalhe.professor}</p>
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
                                {cursoDetalhe.matriculado && provaAluno && (
                                    <button
                                        className={abaCurso === "prova" ? css.abaAtiva : css.abaCurso}
                                        onClick={() => setAbaCurso("prova")}
                                    >
                                        Prova final
                                    </button>
                                )}
                            </div>

                            {abaCurso === "modulos" && moduloAberto && (
                                <div className={css.retornoModulos}>
                                    <BotaoVoltar emLinha onClick={() => setIdModuloAberto(null)}>Voltar aos módulos</BotaoVoltar>
                                </div>
                            )}
                            {abaCurso === "modulos" && (
                                <div className={css.conteudoCurso}>
                                    <h2>Módulos do curso</h2>
                                    {moduloAberto ? (
                                        <section className={css.detalheModuloAluno}>
                                            <h3>Módulo {modulosDetalhe.findIndex((item) => Number(item.id) === Number(moduloAberto.id)) + 1} · {moduloAberto.titulo}</h3>
                                            {moduloAberto.descricao && <p>{moduloAberto.descricao}</p>}
                                            <div className={css.cabecalhoAulasModulo}><h4>Aulas deste módulo</h4><span>{moduloAberto.aulas?.length || 0} aulas · {(moduloAberto.aulas || []).filter(aula => aula.assistida).length} concluídas</span></div>
                                            {!moduloAberto.aulas?.length && <EstadoVazio texto="Nenhuma aula publicada neste módulo." />}
                                            <div className={css.gridAulas}>
                                                {(moduloAberto.aulas || []).map((aula) => (
                                                    <AulaCard key={aula.id} aula={aula} api={api}
                                                        onAbrir={cursoDetalhe.matriculado ? () => abrirVideo(aula) : undefined} />
                                                ))}
                                            </div>
                                            {!cursoDetalhe.matriculado && <p className={css.avisoPreviewModulo}>Inscreva-se para assistir às aulas.</p>}
                                        </section>
                                    ) : (
                                        <>
                                            {modulosDetalhe.length > 0 && <ListaEtapasModulo>
                                                {modulosDetalhe.map((modulo, indice) => (
                                                    /* Sprint item 6 - Permitir que o instrutor divida o curso em módulos - Organiza os módulos e as aulas vinculadas ao curso */ <EtapaModulo key={modulo.id} modulo={modulo} numero={indice + 1} status={cursoDetalhe.matriculado ? `${(modulo.aulas || []).filter((aula) => aula.assistida).length} concluídas` : "Disponível após inscrição"} onAbrir={() => setIdModuloAberto(Number(modulo.id))} /> /* Fim item 6 */
                                                ))}
                                            </ListaEtapasModulo>}
                                        </>
                                    )}
                                </div>
                            )}

                            {abaCurso === "complementos" && (
                                <div className={`${css.conteudoCurso} ${css.conteudoComplementos}`}>
                                                                                                                                                                                                
                                                                                               
                                    <header className={css.cabecalhoComplementos}><div><span>MATERIAIS DE APOIO</span><h2>Vá além da aula</h2><p>Leituras, arquivos e links escolhidos pelo professor para este curso.</p></div><strong>{materiaisCurso.length} {materiaisCurso.length === 1 ? "material" : "materiais"}</strong></header>

                                    {materiaisCurso.length === 0 && <EstadoVazio texto="Nenhum complemento disponível neste curso." />}
                                    <div className={css.listaMateriais}>
                                        {materiaisCurso.map((material) => (
                                            /* Sprint item 21 - Permitir que o instrutor publique materiais do curso, como livros, apostilas e códigos - Publica, lista ou permite baixar os materiais complementares */ <article key={material.id} className={css.cardMaterial}>
                                                <span className={css.tipoMaterial}>{material.tipo}</span>
                                                <strong>{material.titulo}</strong>
                                                <p>{material.descricao}</p>
                                                {material.bloqueado ? (
                                                    <small>Disponível após inscrição no curso.</small>
                                                ) : (
                                                    material.arquivo_url ? <>
                                                        <button type="button" onClick={() => baixarMaterial(material)}>Baixar {material.nome_arquivo || "arquivo"}</button>
                                                        {material.tipo === "imagem" && <ImagemComplemento api={api} material={material} avisar={avisar} />}
                                                    </> : material.url ? <a href={material.url} target="_blank" rel="noreferrer">Abrir material ↗</a> : <small>Material indisponível.</small>
                                                )}
                                            </article> /* Fim item 21 */
                                        ))}
                                    </div>
                                </div>
                            )}

                            {abaCurso === "prova" && cursoDetalhe.matriculado && provaAluno && (
                                <section className={css.painelProva}>
                                    {/* Sprint item 20 - Permitir que o instrutor cadastre provas para validar a conclusão do curso - Prepara as questões, as respostas e a correção da prova */}
                                    <ProvaCursoAluno api={api} idCurso={cursoDetalhe.id} dados={provaAluno} onAtualizar={setProvaAluno} />
                                    {provaAluno.aprovado_curso && (
                                        <>
                                            {/* Sprint item 5 - Gerar certificado ao concluir o curso - Solicita ou apresenta o certificado de conclusão do curso */}
                                            <button className={css.botaoCertificado} type="button" onClick={() => baixarCertificado(cursoDetalhe)} disabled={baixandoCertificado}>
                                                {baixandoCertificado ? "Gerando certificado..." : "Baixar certificado PDF"}
                                            </button>
                                            {/* Fim item 5 */}
                                            {/* Sprint item 27 - Permitir que o aluno avalie o curso após a conclusão - Envia ou apresenta a nota e o comentário da avaliação do aluno */}

                                            {/* Fim item 27 */}
                                        </>
                                    )}
                                </section>
                            )}
                            {abaCurso === "modulos" && modulosDetalhe.length === 0 && (
                                <>
                                    <h2>{cursoDetalhe.matriculado ? "Videoaulas do curso" : "Videoaulas disponíveis após a inscrição"}</h2>
                                    {aulasDetalhe.length === 0 && <EstadoVazio texto="Nenhuma aula publicada neste curso." />}
                                    <div className={css.gridAulas}>
                                        {aulasDetalhe.map((aula) => (
                                            <AulaCard key={aula.id} aula={aula} api={api}
                                                onAbrir={cursoDetalhe.matriculado ? () => abrirVideo(aula) : undefined} />
                                        ))}
                                    </div>
                                </>
                            )}
                            {abaCurso === "modulos" && !moduloAberto && modulosDetalhe.length > 0 && aulasSemModulo.length > 0 && (
                                <section className={css.conteudoCurso}>
                                    <h2>Aulas sem módulo</h2>
                                    <div className={css.gridAulas}>
                                        {aulasSemModulo.map((aula) => (
                                            <AulaCard key={aula.id} aula={aula} api={api}
                                                onAbrir={cursoDetalhe.matriculado ? () => abrirVideo(aula) : undefined} />
                                        ))}
                                    </div>
                                </section>
                            )}

                                                                                                                                                                                     
                            {cursoDetalhe.matriculado && (
                                <div className={css.avaliacaoAposProva}>
                                    <h2>Avaliar curso</h2>
                                    <p>Assista e conclua pelo menos <strong>75% das aulas</strong> para dar uma nota ao curso.</p>
                                    <p role="status">{liberacaoAvaliacao?.mensagem || "Carregando seu progresso de aulas..."}</p>
                                    <fieldset className={css.camposAvaliacao} aria-label="Sua nota e comentário" disabled={!podeAvaliar || enviandoAvaliacao}>
                                        <div className={css.seletorEstrelas} role="radiogroup" aria-label="Nota de 0 a 5 estrelas">
                                            <button type="button" className={avaliacao.nota === 0 ? css.estrelasZeroAtivo : css.estrelasZero} aria-label="0 estrelas" aria-pressed={avaliacao.nota === 0} disabled={enviandoAvaliacao} onClick={() => { setAvaliacao({ ...avaliacao, nota: 0 }); setAvaliacaoEnviada(false); }}>0</button>
                                            {[1, 2, 3, 4, 5].map((nota) => (
                                                <button key={nota} type="button" style={nota <= avaliacao.nota ? { color: corAvaliacao(avaliacao.nota) } : undefined} className={nota <= avaliacao.nota ? css.estrelaAtiva : css.estrela} aria-label={`${nota} ${nota === 1 ? "estrela" : "estrelas"}`} aria-pressed={avaliacao.nota === nota} disabled={enviandoAvaliacao} onClick={() => { setAvaliacao({ ...avaliacao, nota }); setAvaliacaoEnviada(false); }}>★</button>
                                            ))}
                                            <span>{avaliacao.nota} de 5</span>
                                        </div>
                                        <AutoTextarea className={css.textoAvaliacao} rows="1" value={avaliacao.comentario} onChange={(e) => { setAvaliacao({ ...avaliacao, comentario: e.target.value }); setAvaliacaoEnviada(false); }} placeholder="Escreva sua avaliação (opcional)" disabled={enviandoAvaliacao} />
                                        <button type="button" className={`${css.botaoInscrever} ${css.botaoAvaliacao} ${avaliacaoEnviada ? css.botaoAvaliacaoEnviada : ""}`} onClick={enviarAvaliacaoCurso} disabled={!podeAvaliar || enviandoAvaliacao || avaliacaoEnviada} aria-busy={enviandoAvaliacao}>
                                            {enviandoAvaliacao ? "Enviando avaliação..." : avaliacaoEnviada ? "✓ Avaliação salva" : "Enviar avaliação"}
                                        </button>
                                    </fieldset>
                                </div>
                            )}

                            <AvaliacoesCurso api={api} avaliacoes={detalheCurso?.avaliacoes || []} />
                        </section>
                    )}

                    {visao === "aula" && (
                        <section className={css.secaoAulaAberta}>
                            <BotaoVoltar   onClick={() => navigate(retornoCurso)}>
                                {retornoCurso.includes('modulo=') ? 'Voltar ao módulo' : 'Voltar ao curso'}
                            </BotaoVoltar>
                            {carregando && !videoAula && <p role="status" className={css.textoApoio}>Carregando aula...</p>}
                            {!carregando && !videoAula && <EstadoVazio texto="Aula não encontrada." />}
                            {videoAula && <div className={videoCss.layoutVideo}>
                                <div className={videoCss.colunaVideo}>
                                    <div className={videoCss.molduraPlayer}>
                                    <div className={protecaoAtiva ? css.playerProtegido : ""}>
                                                                                                              
                                        <PlayerVideo
                                            videoAula={videoAula}
                                            videoUrl={videoAula.video ? resolverUrlMidia(api, videoAula.video) : undefined}
                                            mobileUrl={`${api}/aluno/aulas/${videoAula.id}/mobile.mp4`}
                                            posterUrl={
                                                videoAula.thumb
                                                    ? resolverUrlMidia(api, videoAula.thumb)
                                                    : undefined
                                            }
                                            marcaDagua={`${usuario?.nome || "Aluno"} · #${usuario?.id_usuario || "conta"}`}
                                            marcarAssistida={marcarAssistida}
                                            salvarProgresso={salvarProgressoAula}
                                        />
                                        {protecaoAtiva && (
                                            <div className={css.avisoProtecao}>
                                                <FaShieldAlt />
                                                <span>Reprodução temporariamente ocultada.</span>
                                            </div>
                                        )}
                                    </div>

                                    </div>
                                    <header className={videoCss.informacoesVideo}>
                                        <h1>{videoAula.titulo}</h1>
                                        <div className={videoCss.linhaInformacoesVideo}>
                                            <button type="button" onClick={() => navigate(retornoCurso)} className={videoCss.linkCursoVideo}>
                                                <FaGraduationCap aria-hidden="true" /> {aulaAtual?.curso?.titulo || 'Ver curso'}
                                            </button>
                                            {videoAula.assistida && <span className={videoCss.statusVideo}><FaCheckCircle aria-hidden="true" /> Aula concluída</span>}
                                        </div>
                                    </header>
                                    <div className={videoCss.descricaoVideo}>
                                        <h2>Sobre esta aula</h2>
                                        <p>{videoAula.descricao || 'Seu progresso é salvo automaticamente enquanto você assiste.'}</p>
                                    </div>
                                </div>
                                <aside className={videoCss.listaLateralVideo} aria-label="Aulas do curso">
                                    <div className={videoCss.tituloListaVideo}><h2>Aulas do curso</h2><span>{totalAulasPlaylist} aulas</span></div>
                                    {playlist.map((grupo) => (
                                        <section key={grupo.id ?? 'sem-modulo'} className={videoCss.grupoModulo}>
                                            <h3 className={videoCss.tituloModulo}>{grupo.numero ? `Módulo ${grupo.numero} · ${grupo.titulo}` : grupo.titulo}</h3>
                                            {grupo.aulas.map((aula) => {
                                                const atual = Number(aula.id) === Number(videoAula.id);
                                                return <AulaCard key={aula.id} aula={aula} api={api} compacto atual={atual}
                                                    onAbrir={() => { if (!atual) abrirVideo(aula); }} />;
                                            })}
                                        </section>
                                    ))}
                                    {totalAulasPlaylist === 0 && <p className={css.textoApoio}>Nenhuma aula disponível neste curso.</p>}
                                </aside>
                            </div>}
                        </section>
                    )}

                    {visao === "perfil" && (
                        <Perfil api={api} embutido setMensagem={setMensagem} onPerfilAtualizado={onPerfilAtualizado} />
                    )}

                    {visao === "financeiro" && (
                        <section className={`${css.secaoMetricas} ${css.paginaFinanceiro}`}>
                                                                                                                                                                                              
                            {/* Sprint item 33 - Exibir total gasto e histórico de faturas do aluno - Consulta e apresenta o total gasto e o histórico de faturas pagas */}
                            <CabecalhoPagina etiqueta="FINANCEIRO" titulo="Minha assinatura e financeiro" descricao="Acompanhe suas mensalidades, cobranças e pagamentos." />
                            {/* Fim item 33 */}
                            {/* Sprint item 34 - Exibir faturas em aberto - Identifica as faturas pendentes e a situação do acesso ao conteúdo */}
                            <ResumoAssinatura
                                assinatura={dashboard?.assinatura}
                                acessoBloqueado={dashboard?.acesso_bloqueado}
                                faturasAbertas={faturasAbertas.length}
                                carregando={dashboard === null}
                                erro={dashboard?.erro_assinatura === true}
                            />
                            {/* Fim item 34 */}
                                                                                
                            <div className={css.gridMetricas}>
                                                                                                                                                                       
                                {/* Sprint item 33 - Exibir total gasto e histórico de faturas do aluno - Consulta e apresenta o total gasto e o histórico de faturas pagas */}
                                <CardMetrica
                                    titulo="Total gasto"
                                    detalhe="Mensalidades pagas"
                                    valor={`R$ ${Number(financeiro?.total_gasto || 0).toFixed(2).replace(".", ",")}`}
                                    icone={<FaWallet />}
                                />
                                {/* Fim item 33 */}
                                {/* Sprint item 34 - Exibir faturas em aberto - Identifica as faturas pendentes e a situação do acesso ao conteúdo */}
                                <CardMetrica
                                    titulo="Em aberto"
                                    detalhe="Faturas pendentes"
                                    valor={`R$ ${Number(financeiro?.total_aberto || 0).toFixed(2).replace(".", ",")}`}
                                    icone={<FaFileInvoiceDollar />}
                                />
                                {/* Fim item 34 */}
                            </div>
                            <div className={css.areaFinanceiro}>
                                <div className={css.blocoFinanceiro}>
                                    {/* Sprint item 5 - Gerar certificado ao concluir o curso - Solicita ou apresenta o certificado de conclusão do curso */}
                                    <div className={css.cabecalhoBlocoFinanceiro}>
                                        <div>
                                            <h2>Pagamento de novas mensalidades</h2>
                                            <p>Gere uma nova cobrança sem interromper a mensalidade atual.</p>
                                        </div>
                                        <button className={css.botaoCertificado} type="button" onClick={() => criarFaturaFutura()} disabled={criandoFatura}>
                                            {criandoFatura ? "Gerando mensalidade..." : "Pagar nova mensalidade"}
                                        </button>
                                    </div>
                                    {/* Fim item 5 */}
                                    {pagamentoFatura?.codigo_pagamento && (
                                        <div className={css.cardPagamentoPix}>
                                            {/* Sprint item 2 - Integrar pagamentos pelo ARKHE - Solicita ou confere a cobrança Pix pela API de pagamentos */}
                                            <div className={css.pagamentoPixTopo}>
                                                <div>
                                                    <span>{pagamentoFatura.fatura_existente ? "Mensalidade pendente" : "PIX gerado"}</span>
                                                    <strong>R$ {Number(pagamentoFatura.valor || 0).toFixed(2).replace(".", ",")}</strong>
                                                </div>
                                                <small>Vencimento em até 3 dias</small>
                                            </div>
                                            {/* Fim item 2 */}
                                            {/* Sprint item 2 - Integrar pagamentos pelo ARKHE - Solicita ou confere a cobrança Pix pela API de pagamentos */}
                                            <PixQrCode pagamento={pagamentoFatura} />
                                            <div className={css.caixaCodigoPixFinanceiro}>
                                                <span>Pix copia e cola</span>
                                                <p className={css.codigoPixFinanceiro}>{pagamentoFatura.codigo_pagamento}</p>
                                            </div>
                                            {/* Fim item 2 */}
                                            <div className={css.acoesPagamentoPix}>
                                                {/* Sprint item 2 - Integrar pagamentos pelo ARKHE - Solicita ou confere a cobrança Pix pela API de pagamentos */}
                                                <button
                                                    className={`${css.botaoSecundarioFinanceiro} ${codigoFaturaCopiado ? css.botaoCodigoCopiado : ""}`}
                                                    type="button"
                                                    onClick={copiarCodigoFatura}
                                                >
                                                    {codigoFaturaCopiado ? "Código copiado" : "Copiar código"}
                                                </button>
                                                {/* Fim item 2 */}
                                                {/* Sprint item 2 - Integrar pagamentos pelo ARKHE - Solicita ou confere a cobrança Pix pela API de pagamentos */}
                                                <button
                                                    className={css.botaoCertificado}
                                                    type="button"
                                                    onClick={verificarPagamentoFatura}
                                                    disabled={verificandoFatura}
                                                >
                                                    {verificandoFatura ? "Verificando..." : "Já paguei"}
                                                </button>
                                                {/* Fim item 2 */}
                                            </div>
                                        </div>
                                    )}
                                    <div className={css.listaMateriais}>
                                        {faturasAbertas.map(
(fatura) => (
                                            <article className={css.cardMaterial} key={fatura.id}>
                                                <strong>Mensalidade #{fatura.numero || fatura.id} - {fatura.status_label}</strong>
                                                <span>R$ {Number(fatura.valor || 0).toFixed(2).replace(".", ",")}</span>
                                                <p>Vencimento: {formatarDataAssinatura(fatura.data_vencimento || fatura.data_expiracao || fatura.criado_em)}</p>
                                                                                                                                                                   
                                                <button className={css.botaoSecundarioFinanceiro} type="button" onClick={() => criarFaturaFutura(fatura.id)} disabled={criandoFatura}>
                                                    Pagar esta fatura
                                                </button>
                                            </article>
                                        )
)}
                                        {faturasAbertas.length === 0 && <EstadoVazio texto="Nenhuma mensalidade em aberto." />}
                                    </div>
                                </div>

                                {/* Sprint item 33 - Exibir total gasto e histórico de faturas do aluno - Consulta e apresenta o total gasto e o histórico de faturas pagas */}
                                <div className={css.blocoFinanceiro}>
                                                                                                                                                                                
                                    <h2>Histórico de mensalidades</h2>
                                    <div className={css.listaMateriais}>
                                        {faturasPagas.map((fatura) => (
                                            <article className={css.cardMaterial} key={fatura.id}>
                                                <strong>Mensalidade #{fatura.numero || fatura.id} - {fatura.status_label}</strong>
                                                <span>R$ {Number(fatura.valor || 0).toFixed(2).replace(".", ",")}</span>
                                                <p>{fatura.data_pagamento ? "Pagamento" : "Registro"}: {formatarDataAssinatura(fatura.data_pagamento || fatura.criado_em)}</p>
                                            </article>
                                        ))}
                                        {faturasPagas.length === 0 && <EstadoVazio texto="Nenhuma mensalidade paga registrada." />}
                                    </div>
                                </div>
                                {/* Fim item 33 */}
                            </div>
                        </section>
                    )}

                    {visao === "chat" && (
                        /* Sprint item 19 - Implementar chat entre instrutor e aluno no aplicativo e no sistema web - Carrega, envia e apresenta as mensagens da conversa do curso */ <section className={css.secaoCursos}>
                                                                                                                                                                                  
                            <ChatCurso api={api} perfil="aluno" setMensagem={setMensagem} />
                        </section> /* Fim item 19 */
                    )}
                </main>
            </div>
            <RodapeAluno />
        </div>
    );
}
