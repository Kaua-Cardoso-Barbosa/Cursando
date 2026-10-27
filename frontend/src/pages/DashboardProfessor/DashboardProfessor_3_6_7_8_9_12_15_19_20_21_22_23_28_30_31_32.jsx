import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
    FaBookOpen,
    FaArchive,
    FaCheckCircle,
    FaChartLine,
    FaCommentDots,
    FaClock,
    FaEdit,
    FaEye,
    FaFilePdf,
    FaFolderOpen,
    FaGraduationCap,
    FaListAlt,
    FaLock,
    FaMoneyBillWave,
    FaPlayCircle,
    FaPlus,
    FaTrash,
    FaUserPlus,
    FaWallet,
    FaUsers
} from "react-icons/fa";
import MenuLateralProf from "../../components/MenuLateral/MenuLateralProf_3_23.jsx";
import ConfirmAlert from "../../components/ConfirmAlert/ConfirmAlert.jsx";
import CabecalhoProfessor from "../../components/DashboardProfessor/CabecalhoProfessor.jsx";
import CardMetricaProfessor from "../../components/DashboardProfessor/CardMetricaProfessor_7.jsx";
import ItemCardProfessor from "../../components/DashboardProfessor/ItemCardProfessor.jsx";
import FormularioModalProfessor from "../../components/DashboardProfessor/FormularioModalProfessor_6_28.jsx";
import EstadoVazioProfessor from "../../components/DashboardProfessor/EstadoVazioProfessor.jsx";
import RodapeProfessor from "../../components/DashboardProfessor/RodapeProfessor.jsx";
import PerfilUsuario from "../../components/PerfilUsuario/PerfilUsuario_3.jsx";
import ChatCurso from "../../components/ChatCurso/ChatCurso_19.jsx";
import ProvasProfessor from "../../components/ProvasProfessor/ProvasProfessor_5_20.jsx";
import MateriaisProfessor from "../../components/MateriaisProfessor/MateriaisProfessor_21.jsx";
import GoogleChart from "../../components/GoogleChart/GoogleChart_8.jsx";
import css from "./DashboardProfessor_38.module.css";

const PLACEHOLDER_CURSO = "/imagens_banner_curso/Placholder.png";

function resolverUrlMidia(api, caminho) {
    if (!caminho) return "";
    if (caminho.startsWith("http://") || caminho.startsWith("https://") || caminho.startsWith("/imagens_")) {
        return caminho;
    }
    return `${api}${caminho}`;
}

function formatarMoeda(valor) {
    return `R$ ${Number(valor || 0).toFixed(2).replace(".", ",")}`;
}

function formatarNumero(valor) {
    return Number(valor || 0).toLocaleString("pt-BR");
}

export default
function DashboardProfessor({
                                               api,
                                               setMensagem,
                                               onPerfilAtualizado,
                                               usuario = { nome: "Professor", tipo: 1 }
                                           }) {
    const [visao, setVisao] = useState("inicio");
    const [filtroCursos, setFiltroCursos] = useState("publicados");
    const [filtroAulas, setFiltroAulas] = useState("todos");
    const [dashboard, setDashboard] = useState(null);
    /* Sprint item 9 - Exibir acessos aos cursos, compras realizadas e taxa de conversão - Apresenta os acessos, as inscrições e a conversão dos cursos */
    const [analiticosMensais, setAnaliticosMensais] = useState(null);
    /* Fim item 9 */
    const [cursos, setCursos] = useState([]);
    const [aulas, setAulas] = useState([]);

    /* Sprint item 6 - Permitir que o instrutor divida o curso em módulos - Mantém os dados do módulo e sua seleção */
    const [modulos, setModulos] = useState([]);
    const [idModuloSelecionado, setIdModuloSelecionado] = useState(null);
    /* Fim item 6 */

    const [abaGestaoCurso, setAbaGestaoCurso] = useState("modulos");
    const [destinosModulo, setDestinosModulo] = useState({});
    const [alunos, setAlunos] = useState([]);
    const [financeiro, setFinanceiro] = useState(null);
    /* Sprint item 23 - Exibir relatórios de alunos, cursos, módulos e horas assistidas - Apresenta os dados consolidados de alunos, cursos, módulos e horas */
    const [relatorio, setRelatorio] = useState(null);
    /* Fim item 23 */

    /* Sprint item 22 - Criar relatórios com filtros por período, instrutor e curso - Aplica os filtros de período e curso à consulta do relatório */
    const [filtrosRelatorio, setFiltrosRelatorio] = useState({ inicio: "", fim: "", id_curso: "" });
    /* Fim item 22 */
    /* Sprint item 32 - Permitir solicitação de saque para a conta ARKHE - Envia ou acompanha solicitações de saque e sua análise manual */
    const [valorSaque, setValorSaque] = useState("");
    const [chavePix, setChavePix] = useState("");
    /* Fim item 32 */
    const [saques, setSaques] = useState([]);
    const [cursoSelecionado, setCursoSelecionado] = useState(null);
    const [modal, setModal] = useState(null);
    const [confirmacao, setConfirmacao] = useState(null);
    const [carregando, setCarregando] = useState(false);
    const [salvando, setSalvando] = useState(false);
    const [solicitandoSaque, setSolicitandoSaque] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();

    const avisar = useCallback((mensagem) => {
        if (mensagem && setMensagem) {
            setMensagem(mensagem);
        }
    }, [setMensagem]);

    const lerResposta = useCallback(async (resposta) => {
        const dados = await resposta.json().catch(() => ({}));

        if (dados.mensagem) {
            avisar(dados.mensagem);
        }

        if (!resposta.ok) {
            const descricao = dados?.mensagem?.descricao
                || (resposta.status === 404
                    ? "Esta parte do financeiro ainda não está disponível no servidor. Tente atualizar a página em instantes."
                    : resposta.status >= 500
                        ? "O financeiro está indisponível no momento. Tente novamente em instantes."
                        : "Não foi possível carregar as informações financeiras.");
            throw new Error(descricao);
        }

        return dados;
    }, [avisar]);

    /* Sprint item 23 - Exibir relatórios de alunos, cursos, módulos e horas assistidas - Apresenta os dados consolidados de alunos, cursos, módulos e horas */
    const carregarDashboard = useCallback(async () => {
        try {
            const resposta = await fetch(`${api}/professor/dashboard`, {
                credentials: "include"
            });
            const dados = await lerResposta(resposta);
            setDashboard(dados);
        } catch (erro) {
            console.error("Erro ao carregar dashboard:", erro);
            setDashboard({
                metricas: {
                    cursos_cadastrados: 0,
                    total_alunos: 0,
                    aulas_publicadas: 0,
                    cursos_privados: 0,
                    cursos_concluidos: 0,
                    modulos_concluidos: 0,
                    horas_assistidas: 0
                },
                recentes: []
            });
        }
    }, [api, lerResposta]);
    /* Fim item 23 */

    const carregarAnaliticosMensais = useCallback(async () => {
        try {
            const resposta = await fetch(`${api}/professor/analiticos-mensais`, { credentials: "include" });
            setAnaliticosMensais(await lerResposta(resposta));
        } catch (erro) {
            console.error("Erro ao carregar os indicadores mensais:", erro);
        }
    }, [api, lerResposta]);

    const carregarCursos = useCallback(async (status = filtroCursos) => {
        setCarregando(true);

        try {
            const resposta = await fetch(`${api}/professor/cursos?status=${status}`, {
                credentials: "include"
            });
            const dados = await lerResposta(resposta);
            setCursos(Array.isArray(dados) ? dados : []);
        } catch (erro) {
            console.error("Erro ao carregar cursos:", erro);
            setCursos([]);
        } finally {
            setCarregando(false);
        }
    }, [api, filtroCursos, lerResposta]);

    /* Sprint item 6 - Permitir que o instrutor divida o curso em módulos - Organiza os módulos e as aulas vinculadas ao curso */
    const carregarAulas = useCallback(async (idCurso, status = filtroAulas, idModulo = null) => {
        setCarregando(true);

        try {
            const params = new URLSearchParams({ status });
            if (idModulo) params.set("id_modulo", idModulo);
            const resposta = await fetch(`${api}/professor/cursos/${idCurso}/aulas?${params.toString()}`, { credentials: "include" });
            const dados = await lerResposta(resposta);
            setAulas(Array.isArray(dados) ? dados : []);
        } catch (erro) {
            console.error("Erro ao carregar aulas:", erro);
            setAulas([]);
        } finally {
            setCarregando(false);
        }
    }, [api, filtroAulas, lerResposta]);

    const carregarModulos = useCallback(async (idCurso) => {
        try {
            const resposta = await fetch(`${api}/professor/cursos/${idCurso}/modulos`, { credentials: "include" });
            const dados = await lerResposta(resposta);
            setModulos(Array.isArray(dados) ? dados : []);
        } catch (erro) {
            console.error("Erro ao carregar módulos:", erro);
            setModulos([]);
        }
    }, [api, lerResposta]);
    /* Fim item 6 */

    const carregarAlunos = useCallback(async (idCurso) => {
        setCarregando(true);

        try {
            const resposta = await fetch(`${api}/professor/cursos/${idCurso}/alunos`, {
                credentials: "include"
            });
            const dados = await lerResposta(resposta);
            setAlunos(Array.isArray(dados) ? dados : []);
        } catch (erro) {
            console.error("Erro ao carregar alunos do curso:", erro);
            setAlunos([]);
        } finally {
            setCarregando(false);
        }
    }, [api, lerResposta]);

    useEffect(() => {
        const matchAlunos = location.pathname.match(/\/DashboardProfessor\/cursos\/(\d+)\/alunos$/);
        /* Sprint item 6 - Permitir que o instrutor divida o curso em módulos - Organiza os módulos e as aulas vinculadas ao curso */
        const matchModulo = location.pathname.match(/\/DashboardProfessor\/cursos\/(\d+)\/modulos\/(\d+)$/);
        /* Fim item 6 */
        const matchAulas = location.pathname.match(/\/DashboardProfessor\/cursos\/(\d+)\/aulas$/);

        if (matchAlunos) {
            setVisao("alunos");
            const idCurso = Number(matchAlunos[1]);

            if (cursoSelecionado?.id !== idCurso) {
                const curso = cursos.find((item) => Number(item.id) === idCurso);

                if (curso) {
                    setCursoSelecionado(curso);
                } else {
                    carregarCursos("todos");
                }
            }

            return;
        }

        if (matchAulas) {
            setVisao("aulas");
            setIdModuloSelecionado(null);
            const idCurso = Number(matchAulas[1]);

            if (cursoSelecionado?.id !== idCurso) {
                const curso = cursos.find((item) => Number(item.id) === idCurso);

                if (curso) {
                    setCursoSelecionado(curso);
                } else {
                    carregarCursos("todos");
                }
            }

            return;
        }

        if (matchModulo) {
            setVisao("aulas");
            setIdModuloSelecionado(Number(matchModulo[2]));
            const idCurso = Number(matchModulo[1]);
            if (cursoSelecionado?.id !== idCurso) {
                const curso = cursos.find((item) => Number(item.id) === idCurso);
                if (curso) setCursoSelecionado(curso);
                else carregarCursos("todos");
            }
            return;
        }

        if (location.pathname.endsWith("/cursos")) {
            setVisao("cursos");
            setCursoSelecionado(null);
            setIdModuloSelecionado(null);
            return;
        }

        /* Sprint item 3 - Sincronizar dados entre aplicativo e sistema web - Atualiza os dados da sessão compartilhados entre o site e o aplicativo */
        if (location.pathname.endsWith("/perfil")) {
            setVisao("perfil");
            setCursoSelecionado(null);
            return;
        }
        /* Fim item 3 */

        if (location.pathname.endsWith("/financeiro")) {
            setVisao("financeiro");
            setCursoSelecionado(null);
            return;
        }

        if (location.pathname.endsWith("/chat")) {
            setVisao("chat");
            setCursoSelecionado(null);
            return;
        }

        /* Sprint item 20 - Permitir que o instrutor cadastre provas para validar a conclusão do curso - Prepara as questões, as respostas e a correção da prova */
        if (location.pathname.endsWith("/provas")) {
            navigate("/DashboardProfessor/cursos", { replace: true });
            return;
        }
        /* Fim item 20 */

        if (location.pathname.endsWith("/relatorios")) {
            setVisao("relatorios");
            setCursoSelecionado(null);
            return;
        }

        setVisao("inicio");
        setCursoSelecionado(null);
        setIdModuloSelecionado(null);
    }, [carregarCursos, cursos, cursoSelecionado, location.pathname, navigate]);

    /* Sprint item 8 - Criar dashboard com gráficos para administrador e instrutor - Monta os gráficos e os indicadores do painel */
    useEffect(() => {
        carregarDashboard();
    }, [carregarDashboard]);
    /* Fim item 8 */

    useEffect(
() => {
        if (visao !== "inicio") return undefined;


        carregarAnaliticosMensais();
        const dataInicial = new Date();
        const mesInicial = `${dataInicial.getFullYear()}-${String(dataInicial.getMonth() + 1).padStart(2, "0")}`;
        const intervalo = window.setInterval(() => {
            const agora = new Date();
            const mesAtual = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, "0")}`;
            if (mesAtual !== mesInicial) {
                window.clearInterval(intervalo);
                return;
            }
            if (!document.hidden) carregarAnaliticosMensais();
        }, 60000);
        return () => window.clearInterval(intervalo);
    }
, [carregarAnaliticosMensais, visao]);

    useEffect(() => {
        if (visao === "cursos") {
            carregarCursos(filtroCursos);
        }
    }, [carregarCursos, filtroCursos, visao]);

    /* Sprint item 6 - Permitir que o instrutor divida o curso em módulos - Organiza os módulos e as aulas vinculadas ao curso */
    useEffect(() => {
        if (visao === "aulas" && cursoSelecionado) {
            carregarModulos(cursoSelecionado.id);
            carregarAulas(cursoSelecionado.id, filtroAulas, idModuloSelecionado);
        }
    }, [carregarAulas, carregarModulos, filtroAulas, visao, cursoSelecionado, idModuloSelecionado]);
    /* Fim item 6 */

    useEffect(() => {
        if (visao === "alunos" && cursoSelecionado) {
            carregarAlunos(cursoSelecionado.id);
        }
    }, [carregarAlunos, visao, cursoSelecionado]);

    useEffect(() => {
        if (visao !== "financeiro") return;

        async function carregarFinanceiro() {
            try {
                /* Sprint item 30 - Criar gestão financeira do instrutor - Carrega e apresenta o resumo financeiro do instrutor */
                const resposta = await fetch(`${api}/financeiro/resumo`, {
                    credentials: "include"
                });
                /* Fim item 30 */
                setFinanceiro(await lerResposta(resposta));
            } catch (erro) {
                console.error("Erro ao carregar financeiro:", erro);
                avisar({ tipo: "erro", descricao: erro.message });
            }
        }

        /* Sprint item 30 - Criar gestão financeira do instrutor - Carrega e apresenta o resumo financeiro do instrutor */
        carregarFinanceiro();
        /* Fim item 30 */
        /* Sprint item 32 - Permitir solicitação de saque para a conta ARKHE - Envia ou acompanha solicitações de saque e sua análise manual */
        fetch(`${api}/professor/saques`, { credentials: "include", cache: "no-store" })
            .then(async (resposta) => {
                const dados = await lerResposta(resposta);
                setSaques(Array.isArray(dados) ? dados : []);
            })
            .catch((erro) => avisar({ tipo: "erro", descricao: erro.message }));
        /* Fim item 32 */
        const sincronizarFinanceiro = () => {
            /* Sprint item 30 - Criar gestão financeira do instrutor - Carrega e apresenta o resumo financeiro do instrutor */
            carregarFinanceiro();
            /* Fim item 30 */
            /* Sprint item 32 - Permitir solicitação de saque para a conta ARKHE - Envia ou acompanha solicitações de saque e sua análise manual */
            fetch(`${api}/professor/saques`, { credentials: "include", cache: "no-store" })
                .then((resposta) => lerResposta(resposta))
                .then((dados) => setSaques(Array.isArray(dados) ? dados : []))
                .catch((erro) => avisar({ tipo: "erro", descricao: erro.message }));
            /* Fim item 32 */
        };
        /* Sprint item 3 - Sincronizar dados entre aplicativo e sistema web - Atualiza os dados da sessão compartilhados entre o site e o aplicativo */
        window.addEventListener("cursando:sincronizar", sincronizarFinanceiro);
        /* Fim item 3 */
        return () => window.removeEventListener("cursando:sincronizar", sincronizarFinanceiro);
    }, [api, avisar, lerResposta, visao]);

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
                if (visao === "inicio") tarefas.push(carregarAnaliticosMensais());
                if (visao === "cursos") tarefas.push(carregarCursos(filtroCursos));
                if (visao === "aulas" && cursoSelecionado) {
                    tarefas.push(carregarAulas(cursoSelecionado.id, filtroAulas, idModuloSelecionado));
                }
                if (visao === "alunos" && cursoSelecionado) {
                    tarefas.push(carregarAlunos(cursoSelecionado.id));
                }
                if (visao === "financeiro") {
                    tarefas.push((async () => {
                        const resposta = await fetch(`${api}/financeiro/resumo`, { credentials: "include" });
                        setFinanceiro(await lerResposta(resposta));
                    })());
                }


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
        api,
        carregarAlunos,
        carregarAulas,
        carregarCursos,
        carregarDashboard,
        carregarAnaliticosMensais,
        cursoSelecionado,
        idModuloSelecionado,
        filtroAulas,
        filtroCursos,
        lerResposta,
        visao
    ]);

    /* Sprint item 22 - Criar relatórios com filtros por período, instrutor e curso - Aplica os filtros de período e curso à consulta do relatório */
    const carregarRelatorio = useCallback(async () => {
        const params = new URLSearchParams();
        if (filtrosRelatorio.inicio) params.set("inicio", filtrosRelatorio.inicio);
        if (filtrosRelatorio.fim) params.set("fim", filtrosRelatorio.fim);
        if (filtrosRelatorio.id_curso) params.set("id_curso", filtrosRelatorio.id_curso);

        try {
            const resposta = await fetch(`${api}/relatorios/professor?${params.toString()}`, {
                credentials: "include"
            });
            setRelatorio(await lerResposta(resposta));
        } catch (erro) {
            console.error("Erro ao carregar relatorio:", erro);
            avisar({ tipo: "erro", descricao: erro.message });
        }
    }, [api, avisar, filtrosRelatorio, lerResposta]);
    /* Fim item 22 */

    /* Sprint item 23 - Exibir relatórios de alunos, cursos, módulos e horas assistidas - Apresenta os dados consolidados de alunos, cursos, módulos e horas */
    useEffect(() => {
        if (visao === "relatorios") {
            if (cursos.length === 0) {
                carregarCursos("todos");
            }
            carregarRelatorio();
        }
    }, [carregarCursos, carregarRelatorio, cursos.length, visao]);
    /* Fim item 23 */

    /* Sprint item 23 - Exibir relatórios de alunos, cursos, módulos e horas assistidas - Apresenta os dados consolidados de alunos, cursos, módulos e horas */
    useEffect(() => {
function sincronizarRelatorio() {
            if (!document.hidden && visao === "relatorios") {

                carregarRelatorio();
            }
        }

        window.addEventListener("cursando:sincronizar", sincronizarRelatorio);
        return () => window.removeEventListener("cursando:sincronizar", sincronizarRelatorio);
    }, [carregarRelatorio, visao]);
    /* Fim item 23 */

    function baixarRelatorioPdf() {
        const params = new URLSearchParams({ formato: "pdf" });
        /* Sprint item 22 - Criar relatórios com filtros por período, instrutor e curso - Aplica os filtros de período e curso à consulta do relatório */
        if (filtrosRelatorio.inicio) params.set("inicio", filtrosRelatorio.inicio);
        /* Fim item 22 */
        /* Sprint item 22 - Criar relatórios com filtros por período, instrutor e curso - Aplica os filtros de período e curso à consulta do relatório */
        if (filtrosRelatorio.fim) params.set("fim", filtrosRelatorio.fim);
        /* Fim item 22 */
        /* Sprint item 22 - Criar relatórios com filtros por período, instrutor e curso - Aplica os filtros de período e curso à consulta do relatório */
        if (filtrosRelatorio.id_curso) params.set("id_curso", filtrosRelatorio.id_curso);
        /* Fim item 22 */
        window.open(`${api}/relatorios/professor?${params.toString()}`, "_blank", "noopener,noreferrer");
    }

    function montarFormData(form) {
        const dados = new FormData();
        dados.append("titulo", form.titulo);
        dados.append("descricao", form.descricao);

        if (modal.tipo === "curso" || modal.tipo === "modulo") {
            if (form.arquivo) {
                dados.append("imagem", form.arquivo);
            }
        } else {
            if (form.arquivo) {
                dados.append("video", form.arquivo);
            }

            if (form.thumb) {
                dados.append("thumb", form.thumb);
            }
            /* Sprint item 6 - Permitir que o instrutor divida o curso em módulos - Organiza os módulos e as aulas vinculadas ao curso */
            if (!modal.item && idModuloSelecionado) {
                dados.append("id_modulo", String(idModuloSelecionado));
            }
            /* Fim item 6 */
        }

        return dados;
    }

async function salvarModal(form) {
        setSalvando(true);

        try {
            const editando = Boolean(modal.item);
            /* Sprint item 28 - Permitir filtro de cursos por tema, categoria e avaliação - Aplica os filtros de busca, tema, categoria e avaliação */
            let idCategoria = form.id_categoria && form.id_categoria !== "__nova__" ? Number(form.id_categoria) : null;
            let idTema = form.id_tema && form.id_tema !== "__novo__" ? Number(form.id_tema) : null;
            /* Fim item 28 */


            /* Sprint item 28 - Permitir filtro de cursos por tema, categoria e avaliação - Aplica os filtros de busca, tema, categoria e avaliação */
            if (modal.tipo === "curso" && form.id_categoria === "__nova__") {
                const nome = form.nova_categoria?.trim();
                if (!nome) throw new Error("Digite o nome da nova categoria.");
            }
            /* Fim item 28 */
            /* Sprint item 28 - Permitir filtro de cursos por tema, categoria e avaliação - Aplica os filtros de busca, tema, categoria e avaliação */
            if (modal.tipo === "curso" && form.id_tema === "__novo__") {
                const nome = form.novo_tema?.trim();
                if (!nome) throw new Error("Digite o nome do novo tema.");
            }
            /* Fim item 28 */

            if (modal.tipo === "curso" && form.id_categoria === "__nova__" && form.nova_categoria?.trim()) {
                /* Sprint item 28 - Permitir filtro de cursos por tema, categoria e avaliação - Aplica os filtros de busca, tema, categoria e avaliação */
                const respostaCategoria = await fetch(`${api}/taxonomias/categorias`, {
                    method: "POST",
                    credentials: "include",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ nome: form.nova_categoria })
                });
                /* Fim item 28 */
                idCategoria = (await lerResposta(respostaCategoria)).id;
            }
            if (modal.tipo === "curso" && form.id_tema === "__novo__" && form.novo_tema?.trim()) {
                /* Sprint item 28 - Permitir filtro de cursos por tema, categoria e avaliação - Aplica os filtros de busca, tema, categoria e avaliação */
                const respostaTema = await fetch(`${api}/taxonomias/temas`, {
                    method: "POST",
                    credentials: "include",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ nome: form.novo_tema })
                });
                /* Fim item 28 */
                idTema = (await lerResposta(respostaTema)).id;
            }

            /* Sprint item 6 - Permitir que o instrutor divida o curso em módulos - Organiza os módulos e as aulas vinculadas ao curso */
            const url = modal.tipo === "curso"
                ? `${api}/professor/cursos${editando ? `/${modal.item.id}` : ""}`
                : modal.tipo === "modulo"
                    ? `${api}/professor/cursos/${cursoSelecionado.id}/modulos${editando ? `/${modal.item.id}` : ""}`
                : editando
                    ? `${api}/professor/aulas/${modal.item.id}`
                    : `${api}/professor/cursos/${cursoSelecionado.id}/aulas`;
            /* Fim item 6 */

            const resposta = await fetch(url, {
                method: editando ? "PUT" : "POST",
                credentials: "include",
                body: montarFormData(form)
            });

            const dados = await lerResposta(resposta);
            if (modal.tipo === "curso") {
                const idCurso = editando ? modal.item.id : dados.id_curso;
                /* Sprint item 28 - Permitir filtro de cursos por tema, categoria e avaliação - Aplica os filtros de busca, tema, categoria e avaliação */
                const respostaTaxonomia = await fetch(`${api}/professor/cursos/${idCurso}/taxonomia`, {
                    method: "PUT",
                    credentials: "include",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ id_categoria: idCategoria, id_tema: idTema })
                });
                /* Fim item 28 */
                await lerResposta(respostaTaxonomia);
            }
            setModal(null);
            /* Sprint item 8 - Criar dashboard com gráficos para administrador e instrutor - Monta os gráficos e os indicadores do painel */
            await carregarDashboard();
            /* Fim item 8 */

            if (modal.tipo === "curso") {
                const proximoFiltro = editando ? filtroCursos : "privados";
                if (!editando) {
                    setFiltroCursos(proximoFiltro);
                }
                await carregarCursos(proximoFiltro);
            } else if (modal.tipo === "modulo") {
                await carregarModulos(cursoSelecionado.id);
                /* Sprint item 6 - Permitir que o instrutor divida o curso em módulos - Organiza os módulos e as aulas vinculadas ao curso */
                if (!editando && dados.id_modulo) {
                    setIdModuloSelecionado(Number(dados.id_modulo));
                    navigate(`/DashboardProfessor/cursos/${cursoSelecionado.id}/modulos/${dados.id_modulo}`);
                }
                /* Fim item 6 */
            } else /* Sprint item 6 - Permitir que o instrutor divida o curso em módulos - Organiza os módulos e as aulas vinculadas ao curso */
            if (cursoSelecionado) {
                await carregarAulas(cursoSelecionado.id, filtroAulas, idModuloSelecionado);
            }
            /* Fim item 6 */
        } catch (erro) {
            console.error("Erro ao salvar:", erro);
            avisar({ tipo: "erro", descricao: erro.message });
        } finally {
            setSalvando(false);
        }
    }

    async function alterarStatusCurso(curso, status) {
        try {
            const resposta = await fetch(`${api}/professor/cursos/${curso.id}/status`, {
                method: "PATCH",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status })
            });

            await lerResposta(resposta);
            /* Sprint item 8 - Criar dashboard com gráficos para administrador e instrutor - Monta os gráficos e os indicadores do painel */
            await carregarDashboard();
            /* Fim item 8 */
            await carregarCursos(filtroCursos);

            if (cursoSelecionado?.id === curso.id) {
                setCursoSelecionado({ ...cursoSelecionado, status });
            }
        } catch (erro) {
            console.error("Erro ao alterar status do curso:", erro);
        }
    }

    async function executarExclusaoCurso(curso) {
        try {
            const resposta = await fetch(`${api}/professor/cursos/${curso.id}`, {
                method: "DELETE",
                credentials: "include"
            });

            await lerResposta(resposta);
            /* Sprint item 8 - Criar dashboard com gráficos para administrador e instrutor - Monta os gráficos e os indicadores do painel */
            await carregarDashboard();
            /* Fim item 8 */
            await carregarCursos(filtroCursos);

            if (cursoSelecionado?.id === curso.id) {
                setCursoSelecionado(null);
                setVisao("cursos");
            }
        } catch (erro) {
            console.error("Erro ao excluir curso:", erro);
        } finally {
            setConfirmacao(null);
        }
    }

    async function alterarStatusAula(aula, status) {
        try {
            const resposta = await fetch(`${api}/professor/aulas/${aula.id}/status`, {
                method: "PATCH",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status })
            });

            await lerResposta(resposta);
            /* Sprint item 8 - Criar dashboard com gráficos para administrador e instrutor - Monta os gráficos e os indicadores do painel */
            await carregarDashboard();
            /* Fim item 8 */
            /* Sprint item 6 - Permitir que o instrutor divida o curso em módulos - Organiza os módulos e as aulas vinculadas ao curso */
            await carregarAulas(cursoSelecionado.id, filtroAulas, idModuloSelecionado);
            /* Fim item 6 */
        } catch (erro) {
            console.error("Erro ao alterar status da aula:", erro);
        }
    }

    /* Sprint item 6 - Permitir que o instrutor divida o curso em módulos - Altera a disponibilidade do módulo selecionado */
    async function alterarStatusModulo(modulo, status) {
        try {
            const resposta = await fetch(`${api}/professor/cursos/${cursoSelecionado.id}/modulos/${modulo.id}/status`, {
                method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status })
            });
            await lerResposta(resposta);
            await carregarModulos(cursoSelecionado.id);
            await carregarAulas(cursoSelecionado.id, filtroAulas, idModuloSelecionado);
        } catch (erro) {
            avisar({ tipo: "erro", descricao: erro.message });
        }
    }
    /* Fim item 6 */

    /* Sprint item 6 - Permitir que o instrutor divida o curso em módulos - Solicita a exclusão do módulo e atualiza a listagem */
    async function executarExclusaoModulo(modulo) {
        try {
            const resposta = await fetch(`${api}/professor/cursos/${cursoSelecionado.id}/modulos/${modulo.id}`, {
                method: "DELETE", credentials: "include"
            });
            await lerResposta(resposta);
            await carregarModulos(cursoSelecionado.id);
        } catch (erro) {
            avisar({ tipo: "erro", descricao: erro.message });
        } finally {
            setConfirmacao(null);
        }
    }
    /* Fim item 6 */

    /* Sprint item 6 - Permitir que o instrutor divida o curso em módulos - Envia o vínculo da aula com o módulo de destino */
    async function moverAulaParaModulo(aula) {
        const idModulo = Number(destinosModulo[aula.id]);
        if (!idModulo) return;
        try {
            const resposta = await fetch(`${api}/professor/aulas/${aula.id}/modulo`, {
                method: "PATCH",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id_modulo: idModulo })
            });
            await lerResposta(resposta);
            await carregarAulas(cursoSelecionado.id, filtroAulas);
            await carregarModulos(cursoSelecionado.id);
            setDestinosModulo((atual) => ({ ...atual, [aula.id]: "" }));
        } catch (erro) {
            avisar({ tipo: "erro", descricao: erro.message });
        }
    }
    /* Fim item 6 */

    async function executarExclusaoAula(aula) {
        try {
            const resposta = await fetch(`${api}/professor/aulas/${aula.id}`, {
                method: "DELETE",
                credentials: "include"
            });

            await lerResposta(resposta);
            /* Sprint item 8 - Criar dashboard com gráficos para administrador e instrutor - Monta os gráficos e os indicadores do painel */
            await carregarDashboard();
            /* Fim item 8 */
            /* Sprint item 6 - Permitir que o instrutor divida o curso em módulos - Organiza os módulos e as aulas vinculadas ao curso */
            await carregarAulas(cursoSelecionado.id, filtroAulas, idModuloSelecionado);
            /* Fim item 6 */
        } catch (erro) {
            console.error("Erro ao excluir aula:", erro);
        } finally {
            setConfirmacao(null);
        }
    }

/* Sprint item 32 - Permitir solicitação de saque para a conta ARKHE - Valida o valor disponível e envia o pedido de saque */
async function solicitarSaque() {

        if (solicitandoSaque) return;
        if (!saqueValido) {
            avisar({ tipo: "erro", descricao: "Informe um valor de saque válido dentro do saldo disponível." });
            return;
        }
        setSolicitandoSaque(true);
        try {

            const resposta = await fetch(`${api}/professor/saques`, {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ valor: Number(valorSaque), chave_pix: chavePix.trim() })
            });
            await lerResposta(resposta);
            setValorSaque("");
            setChavePix("");
            const resumo = await fetch(`${api}/financeiro/resumo`, { credentials: "include" });
            setFinanceiro(await lerResposta(resumo));
            const lista = await fetch(`${api}/professor/saques`, { credentials: "include", cache: "no-store" });
            setSaques(await lerResposta(lista));
        } catch (erro) {
            console.error("Erro ao solicitar saque:", erro);
            avisar({ tipo: "erro", descricao: erro.message });
        } finally {
            setSolicitandoSaque(false);
        }
    }
/* Fim item 32 */

    function abrirAulas(curso) {
        setCursoSelecionado(curso);
        setFiltroAulas("todos");
        setAbaGestaoCurso("modulos");
        setIdModuloSelecionado(null);
        navigate(`/DashboardProfessor/cursos/${curso.id}/aulas`);
    }

    /* Sprint item 6 - Permitir que o instrutor divida o curso em módulos - Seleciona o módulo e carrega suas aulas */
    function abrirModulo(modulo) {
        if (!cursoSelecionado) return;
        setIdModuloSelecionado(Number(modulo.id));
        setFiltroAulas("todos");
        navigate(`/DashboardProfessor/cursos/${cursoSelecionado.id}/modulos/${modulo.id}`);
    }
    /* Fim item 6 */

    function abrirAlunos(curso) {
        setCursoSelecionado(curso);
        navigate(`/DashboardProfessor/cursos/${curso.id}/alunos`);
    }

    const metricas = dashboard?.metricas || {};
    /* Sprint item 8 - Criar dashboard com gráficos para administrador e instrutor - Monta os gráficos e os indicadores do painel */
    const opcoesGraficoInstrutor = useMemo(() => ({
        legend: { position: "bottom", textStyle: { color: "#4c5b53" } },
        colors: ["#168a55", "#f0a43c"],
        chartArea: { left: 60, top: 28, width: "78%", height: "64%" },
        height: 340,
        vAxis: { minValue: 0, format: "0", textStyle: { color: "#4c5b53" } },
        hAxis: { textStyle: { color: "#4c5b53" } },
        backgroundColor: "transparent"
    }), []);
    /* Fim item 8 */

    /* Sprint item 9 - Exibir acessos aos cursos, compras realizadas e taxa de conversão - Apresenta os acessos, as inscrições e a conversão dos cursos */
    const dadosGraficoMensal = useMemo(() => {
        const linhas = (analiticosMensais?.cursos || []).map((curso) => [curso.curso, curso.acessos, curso.inscricoes_mes]);
        return [["Curso", "Acessos no mês", "Inscrições no mês"], ...(linhas.length ? linhas : [["Sem dados no mês", 0, 0]])];
    }, [analiticosMensais]);
    /* Fim item 9 */
    const recentes = dashboard?.recentes || [];
    /* Sprint item 23 - Exibir relatórios de alunos, cursos, módulos e horas assistidas - Apresenta os dados consolidados de alunos, cursos, módulos e horas */
    const cursosRelatorio = relatorio?.cursos || [];

    const relatorioMensal = relatorio?.mensal || [];
    /* Fim item 23 */
    /* Sprint item 6 - Permitir que o instrutor divida o curso em módulos - Mantém os dados do módulo e sua seleção */
    const moduloSelecionado = modulos.find((modulo) => Number(modulo.id) === Number(idModuloSelecionado));
    /* Fim item 6 */
    /* Sprint item 32 - Permitir solicitação de saque para a conta ARKHE - Envia ou acompanha solicitações de saque e sua análise manual */
    const valorSaqueNumero = Number(valorSaque);
    const saqueValido = Number.isFinite(valorSaqueNumero)
        && valorSaqueNumero > 0
        && valorSaqueNumero <= Number(financeiro?.disponivel_saque || 0)
        && chavePix.trim().length >= 5;
    /* Fim item 32 */
    const tituloCursos = useMemo(() => {
        if (filtroCursos === "arquivados") return "Cursos Arquivados";
        if (filtroCursos === "privados") return "Cursos Privados";
        return "Cursos Publicados";
    }, [filtroCursos]);

    return (
        <div className={css.painelProfessor}>
            <MenuLateralProf itemAtivo={visao === "inicio" ? "inicio" : visao === "perfil" ? "perfil" : visao === "financeiro" ? "financeiro" : visao === "chat" ? "chat" : visao === "relatorios" ? "relatorios" : "meus-cursos"} />

            <div className={css.conteudoPrincipal}>
                <main className={css.areaConteudo}>
                    {visao === "inicio" && <CabecalhoProfessor usuario={usuario} />}

                    {visao === "inicio" && (
                        <>
                                                                                                                                                                                        
                            <section className={css.cabecalhoInicio}>
                                <div>
                                    <span className={css.etiquetaPagina}>PAINEL DO PROFESSOR</span>
                                    <h2>Visão geral</h2>
                                    <p>Acompanhe o engajamento dos alunos e a atividade dos seus cursos.</p>
                                </div>
                                <button className={css.botaoPrimario} onClick={() => navigate("/DashboardProfessor/cursos")}>
                                    <FaBookOpen /> Gerenciar cursos
                                </button>
                            </section>

                            <section className={css.secaoPainel}>
                                <div className={css.cabecalhoBloco}>
                                    <div>
                                        <h3>Engajamento dos alunos</h3>
                                        <p>Veja quantos alunos estão ativos e quanto do conteúdo já foi concluído.</p>
                                    </div>
                                </div>
                                <div className={css.gridMetricasInicio}>
                                    {/* Sprint item 7 - Criar métricas para o instrutor: alunos, conclusões, módulos concluídos e horas assistidas - Apresenta as métricas de alunos e de consumo das aulas */}
                                    <CardMetricaProfessor titulo="Total de alunos" detalhe="Alunos matriculados nos seus cursos" valor={formatarNumero(metricas.total_alunos)} icone={<FaUsers />} />
                                    {/* Fim item 7 */}
                                                                                                                                                                                                                                
                                    {/* Sprint item 7 - Criar métricas para o instrutor: alunos, conclusões, módulos concluídos e horas assistidas - Apresenta as métricas de alunos e de consumo das aulas */}
                                    <CardMetricaProfessor titulo="Cursos concluídos" detalhe="Conclusões por aluno" valor={formatarNumero(metricas.cursos_concluidos)} icone={<FaCheckCircle />} />
                                    {/* Fim item 7 */}
                                    {/* Sprint item 23 - Exibir relatórios de alunos, cursos, módulos e horas assistidas - Apresenta os dados consolidados de alunos, cursos, módulos e horas */}
                                    <CardMetricaProfessor titulo="Módulos concluídos" detalhe="Conclusões por aluno" valor={formatarNumero(metricas.modulos_concluidos)} icone={<FaListAlt />} />
                                    {/* Fim item 23 */}
                                    {/* Sprint item 23 - Exibir relatórios de alunos, cursos, módulos e horas assistidas - Apresenta os dados consolidados de alunos, cursos, módulos e horas */}
                                    <CardMetricaProfessor titulo="Horas assistidas" detalhe="Tempo registrado pelo player" valor={`${Number(metricas.horas_assistidas || 0).toFixed(2).replace(".", ",")}h`} icone={<FaClock />} />
                                    {/* Fim item 23 */}
                                </div>
                            </section>

                            <section className={`${css.secaoPainel} ${css.resultadosMes}`}>
                                                                                                                                                                                                                             
                                {/* Sprint item 9 - Exibir acessos aos cursos, compras realizadas e taxa de conversão - Apresenta os acessos, as inscrições e a conversão dos cursos */}
                                <div className={css.cabecalhoBloco}>
                                    <div>
                                        <h3>Resultados do mês</h3>
                                        <p>{analiticosMensais?.inicio && analiticosMensais?.fim
                                            ? `${analiticosMensais.inicio.split("-").reverse().join("/")} a ${analiticosMensais.fim.split("-").reverse().join("/")}`
                                            : "Carregando período mensal..."}</p>
                                    </div>
                                </div>
                                {/* Fim item 9 */}
                                {/* Sprint item 9 - Exibir acessos aos cursos, compras realizadas e taxa de conversão - Apresenta os acessos, as inscrições e a conversão dos cursos */}
                                <div className={css.gridMetricasInicio}>
                                    <CardMetricaProfessor titulo="Acessos aos cursos" detalhe="Alunos únicos neste mês" valor={formatarNumero(analiticosMensais?.total_acessos)} icone={<FaEye />} />
                                    <CardMetricaProfessor titulo="Inscrições no mês" detalhe="Novas matrículas convertidas" valor={formatarNumero(analiticosMensais?.inscricoes_mes)} icone={<FaUserPlus />} />
                                    <CardMetricaProfessor titulo="Taxa de conversão" detalhe="Inscrições ÷ acessos únicos" valor={`${Number(analiticosMensais?.conversao_percentual || 0).toFixed(2).replace(".", ",")}%`} icone={<FaChartLine />} />
                                    <CardMetricaProfessor titulo="Alunos inscritos" detalhe="Matrículas ativas nos cursos" valor={formatarNumero(analiticosMensais?.alunos_inscritos)} icone={<FaUsers />} />
                                </div>
                                {/* Fim item 9 */}
                                                                                                                                                                                                     
                                {/* Sprint item 9 - Exibir acessos aos cursos, compras realizadas e taxa de conversão - Apresenta os acessos, as inscrições e a conversão dos cursos */}
                                <GoogleChart titulo="Acessos e conversões por curso" data={dadosGraficoMensal} options={opcoesGraficoInstrutor} />
                                {/* Fim item 9 */}
                                <p className={css.textoApoio}>O Cursando cobra uma assinatura geral, não compras por curso. As inscrições são exibidas como conversões; a contagem mensal fica associada ao mês em que ocorreu.</p>
                                {/* Sprint item 23 - Exibir relatórios de alunos, cursos, módulos e horas assistidas - Apresenta os dados consolidados de alunos, cursos, módulos e horas */}
                                <div className={css.containerTabelaRelatorio}>
                                    <table className={css.tabelaRelatorio}>
                                        <thead>
                                            <tr><th>Curso</th><th>Acessos no mês</th><th>Inscrições no mês</th><th>Conversão</th><th>Alunos inscritos</th></tr>
                                        </thead>
                                        <tbody>
                                            {(analiticosMensais?.cursos || []).map((curso) => (
                                                <tr key={curso.id_curso}>
                                                    <td>{curso.curso}</td>
                                                    <td>{formatarNumero(curso.acessos)}</td>
                                                    <td>{formatarNumero(curso.inscricoes_mes)}</td>
                                                    <td>{Number(curso.conversao_percentual || 0).toFixed(2).replace(".", ",")}%</td>
                                                    <td>{formatarNumero(curso.alunos_inscritos)}</td>
                                                </tr>
                                            ))}
                                            {!analiticosMensais?.cursos?.length && (
                                                <tr><td className={css.celulaVazia} colSpan="5">Nenhum acesso ou inscrição registrado neste mês.</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                                {/* Fim item 23 */}
                            </section>

                            <section className={css.secaoPainel}>
                                <div className={css.cabecalhoBloco}>
                                    <div>
                                        <h3>Seus cursos</h3>
                                        <p>Resumo do conteúdo que você criou e mantém disponível.</p>
                                    </div>
                                </div>
                                {/* Sprint item 7 - Criar métricas para o instrutor: alunos, conclusões, módulos concluídos e horas assistidas - Apresenta as métricas de alunos e de consumo das aulas */}
                                <div className={css.gridMetricasSecundarias}>
                                    <CardMetricaProfessor titulo="Cursos cadastrados" detalhe="Total criado por você" valor={formatarNumero(metricas.cursos_cadastrados)} icone={<FaGraduationCap />} />
                                    <CardMetricaProfessor titulo="Aulas publicadas" detalhe="Vídeo-aulas disponíveis" valor={formatarNumero(metricas.aulas_publicadas)} icone={<FaPlayCircle />} />
                                    <CardMetricaProfessor titulo="Cursos privados" detalhe="Aguardando publicação" valor={formatarNumero(metricas.cursos_privados)} icone={<FaFolderOpen />} />
                                </div>
                                {/* Fim item 7 */}
                            </section>

                            <section className={`${css.secaoAcessos} ${css.secaoPainel}`}>
                                <div className={css.topoSecao}>
                                    <div>
                                        <h3>Cursos atualizados recentemente</h3>
                                        <p>Continue organizando suas aulas e módulos.</p>
                                    </div>
                                </div>
                                <div className={css.carrosselCursos}>
                                    {recentes.length === 0 && <EstadoVazioProfessor texto="Nenhum curso criado ainda." />}
                                    {recentes.map((curso) => (
                                        <ItemCardProfessor key={curso.id} tipo="curso" item={curso} api={api} usuario={usuario} onAbrir={abrirAulas} />
                                    ))}
                                </div>
                            </section>
                        </>
                    )}

                    {visao === "cursos" && (
                        <section className={css.secaoCursos}>
                                                                                                                                                                                             
                            <div className={css.barraTitulo}>
                                <div>
                                    <h2>{tituloCursos}</h2>
                                    <p className={css.subtituloSecao}>Organize cursos, acompanhe as matrículas e mantenha o conteúdo atualizado.</p>
                                </div>
                                <button className={css.botaoPrimario} onClick={() => setModal({ tipo: "curso", item: null })}>
                                    <FaPlus /> Cadastrar Curso
                                </button>
                                <div className={css.filtros}>
                                    <span>Filtrar por cursos:</span>
                                    <button className={filtroCursos === "publicados" ? css.filtroAtivo : ""} onClick={() => setFiltroCursos("publicados")}>Publicados</button>
                                    <button className={filtroCursos === "privados" ? css.filtroAtivo : ""} onClick={() => setFiltroCursos("privados")}>Privados</button>
                                    <button className={filtroCursos === "arquivados" ? css.filtroAtivo : ""} onClick={() => setFiltroCursos("arquivados")}>Arquivados</button>
                                </div>
                            </div>

                            {carregando && <p className={css.textoApoio}>Carregando cursos...</p>}
                            {!carregando && cursos.length === 0 && <EstadoVazioProfessor texto="Nenhum curso encontrado nesse filtro." />}

                            <div className={css.gridCursos}>
                                {cursos.map((curso) => (
                                    <ItemCardProfessor
                                        key={curso.id}
                                        tipo="curso"
                                        item={curso}
                                        api={api}
                                        usuario={usuario}
                                        onAbrir={abrirAulas}
                                        onEditar={() => setModal({ tipo: "curso", item: curso })}
                                        onExcluir={() => setConfirmacao({ tipo: "curso", item: curso })}
                                        onAlunos={() => abrirAlunos(curso)}
                                        onStatus={(status) => alterarStatusCurso(curso, status)}
                                        gerenciavel
                                    />
                                ))}
                            </div>
                        </section>
                    )}

                    {visao === "aulas" && cursoSelecionado && (
                        <section className={css.secaoCursos}>
                            <div className={css.barraTitulo}>
                                <div className={css.resumoCursoAlunos}>
                                    <img
                                        src={cursoSelecionado.imagem ? resolverUrlMidia(api, cursoSelecionado.imagem) : PLACEHOLDER_CURSO}
                                        alt={cursoSelecionado.titulo}
                                        className={css.imagemResumoCurso}
                                    />
                                    <div>
                                    <button className={css.linkVoltar} onClick={() => navigate("/DashboardProfessor/cursos")}>Voltar para cursos</button>
                                    <h2>{cursoSelecionado.titulo}</h2>
                                                                                         
                                                                          
                                                                                                                                                       
                                            
                                           
                                        <p className={css.textoApoio}>{cursoSelecionado.descricao}</p>
                                    </div>
                                </div>
                            </div>

                                                                                                                                                                                                        
                            <div className={css.barraTitulo}>
                                <button className={abaGestaoCurso === "modulos" ? css.botaoPrimario : css.botaoSecundario} onClick={() => { setAbaGestaoCurso("modulos"); setIdModuloSelecionado(null); }}>Módulos</button>
                                <button className={abaGestaoCurso === "complementos" ? css.botaoPrimario : css.botaoSecundario} onClick={() => { setAbaGestaoCurso("complementos"); setIdModuloSelecionado(null); }}>Complementos</button>
                                <button className={abaGestaoCurso === "provas" ? css.botaoPrimario : css.botaoSecundario} onClick={() => { setAbaGestaoCurso("provas"); setIdModuloSelecionado(null); }}>Provas</button>
                            </div>

                            {abaGestaoCurso === "complementos" && /* Sprint item 21 - Permitir que o instrutor publique materiais do curso, como livros, apostilas e códigos - Publica, lista ou permite baixar os materiais complementares */ <MateriaisProfessor api={api} idCurso={cursoSelecionado.id} avisar={avisar} /> /* Fim item 21 */}
                            {abaGestaoCurso === "provas" && /* Sprint item 20 - Permitir que o instrutor cadastre provas para validar a conclusão do curso - Prepara as questões, as respostas e a correção da prova */ <ProvasProfessor key={cursoSelecionado.id} api={api} idCurso={cursoSelecionado.id} setMensagem={setMensagem} /> /* Fim item 20 */}
                            {abaGestaoCurso === "modulos" && !idModuloSelecionado && (
                                <>
                                    <div className={css.barraTitulo}>
                                        <h2>Módulos do curso</h2>
                                        <button className={css.botaoPrimario} onClick={() => setModal({ tipo: "modulo", item: null })}>
                                            <FaPlus /> Criar módulo
                                        </button>
                                    </div>
                                    {carregando && <p className={css.textoApoio}>Carregando módulos...</p>}
                                    {!carregando && modulos.length === 0 && <EstadoVazioProfessor texto="Este curso ainda não tem módulos. Crie o primeiro para organizar as aulas." />}
                                    <div className={css.gradeModulos}>
                                        {modulos.map(
(modulo) => (
                                            /* Sprint item 6 - Permitir que o instrutor divida o curso em módulos - Organiza os módulos e as aulas vinculadas ao curso */ <article className={css.cardCurso} key={modulo.id}>
                                                                                                                                                                       
                                                                                                                 
                                                <button type="button" className={css.areaCardClicavel} onClick={() => abrirModulo(modulo)} aria-label={`Abrir módulo ${modulo.titulo}`}>
                                                    <img src={modulo.imagem ? resolverUrlMidia(api, modulo.imagem) : PLACEHOLDER_CURSO} alt="" className={css.imagemCurso} />
                                                    <div className={css.infoCurso}>
                                                        <div>
                                                            <h3>{modulo.titulo}</h3>
                                                            <p>{modulo.descricao || "Sem descrição"}</p>
                                                            <span className={css.infoInscritos}><FaBookOpen /> {modulo.total_aulas || 0} {modulo.total_aulas === 1 ? "aula" : "aulas"}</span>
                                                        </div>
                                                        <span className={css.statusBadge}>{modulo.status_nome}</span>
                                                    </div>
                                                </button>
                                                <div className={css.acoesCard}>
                                                    <button type="button" title="Editar módulo" aria-label={`Editar módulo ${modulo.titulo}`} onClick={() => setModal({ tipo: "modulo", item: modulo })}><FaEdit /></button>
                                                    {modulo.status !== 1 && <button type="button" title="Publicar módulo" aria-label={`Publicar módulo ${modulo.titulo}`} onClick={() => alterarStatusModulo(modulo, 1)}><FaEye /></button>}
                                                    {modulo.status !== 0 && <button type="button" title="Privar módulo" aria-label={`Privar módulo ${modulo.titulo}`} onClick={() => alterarStatusModulo(modulo, 0)}><FaLock /></button>}
                                                    {modulo.status !== 2 && <button type="button" title="Arquivar módulo" aria-label={`Arquivar módulo ${modulo.titulo}`} onClick={() => alterarStatusModulo(modulo, 2)}><FaArchive /></button>}
                                                    <button type="button" className={css.botaoExcluir} disabled={modulo.total_aulas > 0} title={modulo.total_aulas > 0 ? "Exclua ou mova as aulas antes de excluir o módulo" : "Excluir módulo"} aria-label={`Excluir módulo ${modulo.titulo}`} onClick={() => setConfirmacao({ tipo: "modulo", item: modulo })}><FaTrash /></button>
                                                </div>
                                            </article> /* Fim item 6 */
                                        )
)}
                                    </div>
                                    {aulas.some((aula) => !aula.id_modulo) && (
                                        <div className={css.aulasSemModulo}>
                                            <h3>Aulas antigas sem módulo</h3>
                                            <div className={css.gridAulas}>
                                                {aulas.filter((aula) => !aula.id_modulo).map((aula) => (
                                                    <div className={css.aulaSemModuloItem} key={aula.id}>
                                                        <ItemCardProfessor tipo="aula" item={aula} api={api} usuario={usuario}
                                                            onEditar={() => setModal({ tipo: "aula", item: aula })}
                                                            onExcluir={() => setConfirmacao({ tipo: "aula", item: aula })}
                                                            onStatus={(status) => alterarStatusAula(aula, status)} />
                                                        {modulos.length > 0 && (
                                                            /* Sprint item 6 - Permitir que o instrutor divida o curso em módulos - Organiza os módulos e as aulas vinculadas ao curso */ <div className={css.moverAulaModulo}>
                                                                <select value={destinosModulo[aula.id] || ""} onChange={(evento) => setDestinosModulo((atual) => ({ ...atual, [aula.id]: evento.target.value }))}>
                                                                    <option value="">Escolher módulo</option>
                                                                    {modulos.map((modulo) => <option key={modulo.id} value={modulo.id}>{modulo.titulo}</option>)}
                                                                </select>
                                                                <button className={css.botaoSecundario} onClick={() => moverAulaParaModulo(aula)}>Mover aula</button>
                                                            </div> /* Fim item 6 */
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}

                            {abaGestaoCurso === "modulos" && idModuloSelecionado && moduloSelecionado && (
                                <>
                                    <div className={css.barraTitulo}>
                                        <div className={css.resumoModuloProfessor}>
                                            <button className={css.linkVoltar} onClick={() => navigate(`/DashboardProfessor/cursos/${cursoSelecionado.id}/aulas`)}>Voltar aos módulos</button>
                                            <h2>{moduloSelecionado.titulo}</h2>
                                            <p className={css.textoApoio}>{moduloSelecionado.descricao}</p>
                                        </div>
                                        <button className={css.botaoPrimario} onClick={() => setModal({ tipo: "aula", item: null })}>
                                            <FaPlus /> Adicionar aula
                                        </button>
                                        <div className={css.filtros}>
                                            <span>Aulas:</span>
                                            <button className={filtroAulas === "todos" ? css.filtroAtivo : ""} onClick={() => setFiltroAulas("todos")}>Todas</button>
                                            <button className={filtroAulas === "publicadas" ? css.filtroAtivo : ""} onClick={() => setFiltroAulas("publicadas")}>Publicadas</button>
                                            <button className={filtroAulas === "privadas" ? css.filtroAtivo : ""} onClick={() => setFiltroAulas("privadas")}>Privadas</button>
                                        </div>
                                    </div>
                                    {carregando && <p className={css.textoApoio}>Carregando aulas...</p>}
                                    {!carregando && aulas.length === 0 && <EstadoVazioProfessor texto="Nenhuma aula neste módulo ainda." />}
                                    <div className={css.gridAulas}>
                                        {aulas.map((aula) => (
                                            <ItemCardProfessor key={aula.id} tipo="aula" item={aula} api={api} usuario={usuario}
                                                onEditar={() => setModal({ tipo: "aula", item: aula })}
                                                onExcluir={() => setConfirmacao({ tipo: "aula", item: aula })}
                                                onStatus={(status) => alterarStatusAula(aula, status)} />
                                        ))}
                                    </div>
                                </>
                            )}
                            {abaGestaoCurso === "modulos" && idModuloSelecionado && !moduloSelecionado && !carregando && (
                                <EstadoVazioProfessor texto="Módulo não encontrado neste curso." />
                            )}
                        </section>
                    )}

                    {visao === "alunos" && cursoSelecionado && (
                        <section className={css.secaoCursos}>
                            <div className={css.barraTitulo}>
                                <div className={css.resumoCursoAlunos}>
                                    <img
                                        src={cursoSelecionado.imagem ? resolverUrlMidia(api, cursoSelecionado.imagem) : PLACEHOLDER_CURSO}
                                        alt={cursoSelecionado.titulo}
                                        className={css.imagemResumoCurso}
                                    />
                                    <div>
                                    <button className={css.linkVoltar} onClick={() => navigate("/DashboardProfessor/cursos")}>Voltar para cursos</button>
                                    <h2>Alunos de {cursoSelecionado.titulo}</h2>
                                                                                         
                                                                          
                                                                                                                                                       
                                            
                                           
                                        <p className={css.textoApoio}>Lista de alunos matriculados neste curso.</p>
                                    </div>
                                </div>
                            </div>

                            {carregando && <p className={css.textoApoio}>Carregando alunos...</p>}
                            {!carregando && alunos.length === 0 && <EstadoVazioProfessor texto="Nenhum aluno matriculado neste curso." />}

                            {!carregando && alunos.length > 0 && (
                                <div className={css.listaAlunosCurso}>
                                    <div className={css.cabecalhoListaAlunos}>
                                        <span>Nome</span>
                                        <span>E-mail</span>
                                        <span>Ação</span>
                                    </div>
                                    {alunos.map(
(aluno) => (
                                        <div key={aluno.id_usuario} className={css.linhaAlunoCurso}>
                                            <span>{aluno.nome}</span>
                                            <span>{aluno.email}</span>
                                                                                                                                                                                                                                         
                                            <button
                                                type="button"
                                                className={css.acaoChatAluno}
                                                onClick={() => navigate("/DashboardProfessor/chat", {
                                                    state: {
                                                        conversaInicial: {
                                                            id_curso: cursoSelecionado.id,
                                                            id_aluno: aluno.id_usuario,
                                                            nome: aluno.nome,
                                                            curso: cursoSelecionado.titulo
                                                        }
                                                    }
                                                })}
                                                aria-label={`Conversar com ${aluno.nome} sobre ${cursoSelecionado.titulo}`}
                                            >
                                                <FaCommentDots aria-hidden="true" /> Conversar
                                            </button>
                                        </div>
                                    )
)}
                                </div>
                            )}
                        </section>
                    )}

                    {visao === "perfil" && (
                        <section className={css.secaoPerfil}>
                            <PerfilUsuario api={api} setMensagem={setMensagem} onPerfilAtualizado={onPerfilAtualizado} />
                        </section>
                    )}

                    {visao === "financeiro" && (
                        <section className={`${css.secaoCursos} ${css.paginaFinanceiro}`}>
                                                                                                                                                                                  
                            <header className={css.cabecalhoPagina}>
                                <div>
                                    <span className={css.etiquetaPagina}>PAGAMENTOS</span>
                                    <h2>Financeiro</h2>
                                    <p>Consulte seus valores e solicite o pagamento ao administrador.</p>
                                </div>
                            </header>
                                                                                          
                            <section className={css.secaoPainel}>
                                <div className={css.cabecalhoBloco}>
                                    <div>
                                        <h3>Resumo financeiro</h3>
                                        <p>Valores estimados e atividade atual dos seus cursos.</p>
                                    </div>
                                </div>
                                <div className={css.gridMetricasFinanceiro}>
                                    {/* Sprint item 12 - Exibir valores recebidos, disponíveis para saque e já sacados pelo instrutor - Apresenta os valores recebidos, já sacados e disponíveis */}
                                    <CardMetricaProfessor titulo="Ganhos estimados" detalhe={`${Number(financeiro?.percentual_pool || 0).toFixed(2).replace(".", ",")}% do pool`} valor={formatarMoeda(financeiro?.recebido_estimado)} icone={<FaChartLine />} />
                                    {/* Fim item 12 */}
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  
                                    {/* Sprint item 15 - Exibir saldo disponível em caixa, assinatura de R$ 500 e desconto das comissões no saldo administrativo - Exibe o saldo líquido disponível ao instrutor após os pagamentos e pedidos pendentes */}
                                    <div className={css.cardSaldoDisponivel}>
                                        <CardMetricaProfessor titulo="Disponível para solicitar" detalhe="Após pagamentos e pedidos pendentes" valor={formatarMoeda(financeiro?.disponivel_saque)} icone={<FaWallet />} />
                                    </div>
                                    {/* Fim item 15 */}
                                    {/* Sprint item 12 - Exibir valores recebidos, disponíveis para saque e já sacados pelo instrutor - Apresenta os valores recebidos, já sacados e disponíveis */}
                                    <CardMetricaProfessor titulo="Pagamentos confirmados" detalhe="Registrados pelo administrador" valor={formatarMoeda(financeiro?.ja_sacado)} icone={<FaMoneyBillWave />} />
                                    {/* Fim item 12 */}
                                    {/* Sprint item 12 - Exibir valores recebidos, disponíveis para saque e já sacados pelo instrutor - Apresenta os valores recebidos, já sacados e disponíveis */}
                                    <CardMetricaProfessor titulo="Aguardando análise" detalhe="Pedidos enviados ao administrador" valor={formatarMoeda(financeiro?.em_analise)} icone={<FaClock />} />
                                    {/* Fim item 12 */}
                                    <CardMetricaProfessor titulo="Alunos ativos" detalhe="Matrículas nos seus cursos" valor={formatarNumero(financeiro?.alunos_ativos)} icone={<FaUsers />} />
                                                                                                                                                                                
                                    <CardMetricaProfessor
                                        titulo="Valor estimado por view"
                                        detalhe={financeiro?.valor_por_view == null ? "Aguardando aulas concluídas" : "Por aula concluída"}
                                        valor={financeiro?.valor_por_view == null ? "—" : formatarMoeda(financeiro.valor_por_view)}
                                        icone={<FaPlayCircle />}
                                    />
                                </div>
                            </section>

                            <section className={css.painelSolicitarSaque}>
                                {/* Sprint item 12 - Exibir valores recebidos, disponíveis para saque e já sacados pelo instrutor - Apresenta os valores recebidos, já sacados e disponíveis */}
                                <div className={css.introducaoSaque}>
                                    <span className={css.iconeSaque}><FaWallet /></span>
                                    <span className={css.etiquetaPagina}>SALDO DISPONÍVEL</span>
                                    <h3>Solicitar pagamento</h3>
                                    <p>Informe o valor e sua chave Pix. O administrador fará o pagamento fora do Cursando e registrará o resultado aqui.</p>
                                    <div className={css.valorDisponivelSaque}>
                                        <span>Disponível para solicitar</span>
                                        <strong>{formatarMoeda(financeiro?.disponivel_saque)}</strong>
                                    </div>
                                </div>
                                {/* Fim item 12 */}
                                <form className={`${css.formularioPerfil} ${css.formularioSaque}`} onSubmit={(evento) => { evento.preventDefault(); /* Sprint item 32 - Permitir solicitação de saque para a conta ARKHE - Envia ou acompanha solicitações de saque e sua análise manual */
                                solicitarSaque();
                                /* Fim item 32 */ }}>
                                    <label htmlFor="valor-saque">Valor solicitado</label>
                                    <div className={css.campoValorSaque}>
                                        <span>R$</span>
                                        <input
                                            id="valor-saque"
                                            value={valorSaque}
                                            onChange={(evento) => setValorSaque(evento.target.value)}
                                            type="number"
                                            min="0.01"
                                            max={Number(financeiro?.disponivel_saque || 0) || undefined}
                                            step="0.01"
                                            placeholder="0,00"
                                        />
                                    </div>
                                    <label htmlFor="chave-pix-saque">Chave Pix para receber</label>
                                    <input id="chave-pix-saque" type="text" value={chavePix} onChange={(evento) => setChavePix(evento.target.value)} minLength={5} maxLength={140} autoComplete="off" required placeholder="CPF, e-mail, telefone ou chave aleatória" />
                                    <p className={css.textoApoio}>O pedido fica em análise até o administrador confirmar ou recusar.</p>
                                    <button className={css.botaoPrimario} type="submit" disabled={solicitandoSaque || !saqueValido}>
                                        {solicitandoSaque ? "Enviando solicitação..." : "Enviar solicitação"}
                                    </button>
                                </form>
                            </section>

                            <section className={css.painelTabelaFinanceiro}>
                                <div className={css.cabecalhoBloco}><div><h3>Minhas solicitações</h3><p>Acompanhe o resultado registrado pelo administrador.</p></div></div>
                                <div className={css.containerTabelaFinanceira}><table className={css.tabelaFinanceira}>
                                    <thead><tr><th>Data</th><th>Valor</th><th>Situação</th><th>Detalhe</th></tr></thead>
                                    <tbody>
                                        {saques.map((saque) => <tr key={saque.id}>
                                            <td>{saque.criado_em ? new Date(saque.criado_em).toLocaleDateString("pt-BR") : "—"}</td>
                                            <td>{formatarMoeda(saque.valor)}</td>
                                            <td>{saque.status_nome}</td>
                                            <td>{saque.status === 1 ? `Referência: ${saque.comprovante}` : saque.status === 2 ? saque.motivo_recusa : "Aguardando pagamento e confirmação"}</td>
                                        </tr>)}
                                        {!saques.length && <tr><td className={css.celulaVazia} colSpan="4">Nenhuma solicitação enviada.</td></tr>}
                                    </tbody>
                                </table></div>
                            </section>

                            <section className={css.painelTabelaFinanceiro}>
                                                                                                                                                                                        
                                {/* Sprint item 31 - Exibir cursos que mais geraram receita para o instrutor - Apresenta os cursos ordenados pela receita estimada */}
                                <div className={css.cabecalhoBloco}>
                                    <div>
                                        <h3>Cursos que mais geraram receita</h3>
                                        <p>Cursos ordenados da maior para a menor receita estimada.</p>
                                    </div>
                                </div>
                                {/* Fim item 31 */}
                                <div className={css.containerTabelaFinanceira}>
                                    <table className={css.tabelaFinanceira}>
                                        <thead>
                                            <tr><th>Curso</th><th>Atividade</th><th>Receita estimada</th></tr>
                                        </thead>
                                        {/* Sprint item 31 - Exibir cursos que mais geraram receita para o instrutor - Apresenta os cursos ordenados pela receita estimada */}
                                        <tbody>
                                            {financeiro?.cursos_receita?.map((curso) => (
                                                <tr key={curso.id_curso}>
                                                    <td>{curso.curso}</td>
                                                    <td>{formatarNumero(curso.views)} aulas concluídas</td>
                                                    <td>{formatarMoeda(curso.receita_estimativa)}</td>
                                                </tr>
                                            ))}
                                            {!financeiro?.cursos_receita?.length && (
                                                <tr><td className={css.celulaVazia} colSpan="3">Ainda não há receita estimada para exibir.</td></tr>
                                            )}
                                        </tbody>
                                        {/* Fim item 31 */}
                                    </table>
                                </div>
                            </section>
                        </section>
                    )}

                    {visao === "chat" && (
                        /* Sprint item 19 - Implementar chat entre instrutor e aluno no aplicativo e no sistema web - Carrega, envia e apresenta as mensagens da conversa do curso */ <section className={css.secaoCursos}>
                                                                                                                                                                                               
                            <ChatCurso api={api} perfil="professor" setMensagem={setMensagem} conversaInicial={location.state?.conversaInicial} />
                        </section> /* Fim item 19 */
                    )}

                    {visao === "relatorios" && (
                        <section className={`${css.secaoCursos} ${css.paginaRelatorios}`}>
                                                                                                                                                                                           
                            <header className={css.cabecalhoPagina}>
                                <div>
                                    <span className={css.etiquetaPagina}>ACOMPANHAMENTO</span>
                                    <h2>Relatórios</h2>
                                    <p>Analise matrículas, conclusões e atividade dos seus cursos.</p>
                                </div>
                                <button className={css.botaoSecundario} type="button" onClick={baixarRelatorioPdf}>
                                    <FaFilePdf /> Baixar PDF
                                </button>
                            </header>

                            <section className={css.painelFiltrosRelatorio}>
                                <div className={css.cabecalhoBloco}>
                                    <div>
                                        <h3>Filtrar relatório</h3>
                                        <p>O período considera a data de criação do curso.</p>
                                    </div>
                                </div>
                                <form className={css.filtrosRelatorio} onSubmit={(evento) => { evento.preventDefault(); /* Sprint item 23 - Exibir relatórios de alunos, cursos, módulos e horas assistidas - Apresenta os dados consolidados de alunos, cursos, módulos e horas */
                                carregarRelatorio();
                                /* Fim item 23 */ }}>
                                    <label>
                                        Criado a partir de
                                        <input type="date" value={filtrosRelatorio.inicio} onChange={(e) => setFiltrosRelatorio({ ...filtrosRelatorio, inicio: e.target.value })} />
                                    </label>
                                    <label>
                                        Criado até
                                        <input type="date" value={filtrosRelatorio.fim} onChange={(e) => setFiltrosRelatorio({ ...filtrosRelatorio, fim: e.target.value })} />
                                    </label>
                                    <label>
                                        Curso
                                        <select value={filtrosRelatorio.id_curso} onChange={(e) => setFiltrosRelatorio({ ...filtrosRelatorio, id_curso: e.target.value })}>
                                            <option value="">Todos os cursos</option>
                                            {cursos.map((curso) => (
                                                <option key={curso.id} value={curso.id}>{curso.titulo}</option>
                                            ))}
                                        </select>
                                    </label>
                                    <button className={css.botaoPrimario} type="submit">Aplicar filtros</button>
                                </form>
                            </section>

                            <section className={css.secaoPainel}>
                                <div className={css.cabecalhoBloco}>
                                    <div>
                                        <h3>Resumo dos cursos filtrados</h3>
                                        <p>Indicadores calculados para os cursos que atendem aos filtros acima.</p>
                                    </div>
                                </div>
                                <div className={css.gridMetricasRelatorio}>
                                    <CardMetricaProfessor titulo="Matrículas" detalhe="Inscrições ativas nos cursos" valor={formatarNumero(relatorio?.resumo?.alunos)} icone={<FaUsers />} />
                                    <CardMetricaProfessor titulo="Cursos" detalhe="Cursos incluídos no filtro" valor={formatarNumero(relatorio?.resumo?.cursos)} icone={<FaGraduationCap />} />
                                    <CardMetricaProfessor titulo="Aulas concluídas" detalhe="Concluídas pelos alunos" valor={formatarNumero(relatorio?.resumo?.aulas_assistidas)} icone={<FaPlayCircle />} />
                                                                                                                                                                                                                       
                                    <CardMetricaProfessor titulo="Cursos concluídos" detalhe="Conclusões por aluno" valor={formatarNumero(relatorio?.resumo?.conclusoes)} icone={<FaCheckCircle />} />
                                    <CardMetricaProfessor titulo="Módulos concluídos" detalhe="Conclusões por aluno" valor={formatarNumero(relatorio?.resumo?.modulos)} icone={<FaListAlt />} />
                                    <CardMetricaProfessor titulo="Horas assistidas" detalhe="Tempo registrado pelo player" valor={`${Number(relatorio?.resumo?.horas_assistidas || 0).toFixed(2).replace(".", ",")}h`} icone={<FaClock />} />
                                </div>
                            </section>

                            <section className={css.painelTabelaRelatorio}>
                                <div className={css.cabecalhoBloco}>
                                    <div>
                                        <h3>Detalhamento por curso</h3>
                                        <p>Compare alunos, conclusões e horas entre os cursos.</p>
                                    </div>
                                </div>
                                <div className={css.containerTabelaRelatorio}>
                                    <table className={css.tabelaRelatorio}>
                                        <thead>
                                            <tr>
                                                <th>Curso</th><th>Matrículas</th><th>Cursos concluídos</th>
                                                <th>Módulos concluídos</th><th>Aulas concluídas</th><th>Horas</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {cursosRelatorio.map((curso) => (
                                                <tr key={curso.id_curso}>
                                                    <td>{curso.curso}</td>
                                                    <td>{formatarNumero(curso.alunos)}</td>
                                                    <td>{formatarNumero(curso.conclusoes)}</td>
                                                    <td>{formatarNumero(curso.modulos)}</td>
                                                <td>{formatarNumero(curso.aulas_assistidas)}</td>
                                                    <td>{Number(curso.horas_assistidas || 0).toFixed(2).replace(".", ",")}h</td>
                                                </tr>
                                            ))}
                                            {!cursosRelatorio.length && (
                                                <tr><td className={css.celulaVazia} colSpan="6">Nenhum curso encontrado com os filtros selecionados.</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </section>
                            <section className={css.painelTabelaRelatorio}>
                                                                                                                                                                                                 
                                <div className={css.cabecalhoBloco}><div><h3>Resumo mensal</h3><p>Alunos inscritos, cursos e módulos criados e horas assistidas em cada mês.</p><p>Horas antigas sem data mensal: {Number(relatorio?.horas_sem_competencia || 0).toFixed(2).replace(".", ",")}h.</p></div></div>
                                <div className={css.containerTabelaRelatorio}>
                                    <table className={css.tabelaRelatorio}>
                                        <thead><tr><th>Mês</th><th>Alunos inscritos</th><th>Cursos</th><th>Módulos</th><th>Horas assistidas</th></tr></thead>
                                        <tbody>
                                            {relatorioMensal.map((item) => <tr key={item.mes}><td>{new Date(`${item.mes}-01T00:00:00`).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}</td><td>{formatarNumero(item.alunos)}</td><td>{formatarNumero(item.cursos)}</td><td>{formatarNumero(item.modulos)}</td><td>{Number(item.horas_assistidas || 0).toFixed(2).replace(".", ",")}h</td></tr>)}
                                            {!relatorioMensal.length && <tr><td className={css.celulaVazia} colSpan="5">Nenhum dado mensal no período selecionado.</td></tr>}
                                        </tbody>
                                    </table>
                                </div>
                            </section>
                        </section>
                    )}
                </main>
            </div>
            <RodapeProfessor />

            {modal && (
                <FormularioModalProfessor
                    api={api}
                    tipo={modal.tipo}
                    item={modal.item}
                    salvando={salvando}
                    onFechar={() => setModal(null)}
                    onSalvar={salvarModal}
                />
            )}

            <ConfirmAlert
                aberto={Boolean(confirmacao)}
                titulo={
                    confirmacao?.tipo === "curso"
                        ? "Realmente deseja apagar esse curso?"
                        : confirmacao?.tipo === "modulo"
                            ? "Realmente deseja excluir este módulo?"
                            : "Realmente deseja apagar essa aula?"
                }
                descricao={
                    confirmacao?.tipo === "curso"
                        ? "As aulas desse curso também serão removidas da dashboard."
                        : confirmacao?.tipo === "modulo"
                            ? "Esta ação só é permitida quando o módulo não tem aulas cadastradas."
                            : "O vídeo dessa aula será removido da dashboard."
                }
                textoConfirmar={
                    confirmacao?.tipo === "curso"
                        ? "Sim, excluir curso"
                        : confirmacao?.tipo === "modulo"
                            ? "Sim, excluir módulo"
                            : "Sim, excluir aula"
                }
                aoCancelar={() => setConfirmacao(null)}
                aoConfirmar={() => {
                    if (confirmacao?.tipo === "curso") {
                        executarExclusaoCurso(confirmacao.item);
                        return;
                    }

                    if (confirmacao?.tipo === "aula") {
                        executarExclusaoAula(confirmacao.item);
                    }
                    if (confirmacao?.tipo === "modulo") {
                        executarExclusaoModulo(confirmacao.item);
                    }
                }}
            />
        </div>
    );
}
