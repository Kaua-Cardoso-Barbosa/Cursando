import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
    FaBookOpen,
    FaCheckCircle,
    FaClock,
    FaFilePdf,
    FaFolderOpen,
    FaGraduationCap,
    FaListAlt,
    FaPlayCircle,
    FaPlus,
    FaWallet,
    FaUsers
} from "react-icons/fa";
import MenuLateralProf from "../../components/MenuLateral/MenuLateralProf.jsx";
import ConfirmAlert from "../../components/ConfirmAlert/ConfirmAlert.jsx";
import CabecalhoProfessor from "../../components/DashboardProfessor/CabecalhoProfessor.jsx";
import CardMetricaProfessor from "../../components/DashboardProfessor/CardMetricaProfessor.jsx";
import ItemCardProfessor from "../../components/DashboardProfessor/ItemCardProfessor.jsx";
import FormularioModalProfessor from "../../components/DashboardProfessor/FormularioModalProfessor.jsx";
import EstadoVazioProfessor from "../../components/DashboardProfessor/EstadoVazioProfessor.jsx";
import RodapeProfessor from "../../components/DashboardProfessor/RodapeProfessor.jsx";
import PerfilUsuario from "../../components/PerfilUsuario/PerfilUsuario.jsx";
import ChatCurso from "../../components/ChatCurso/ChatCurso.jsx";
import css from "./DashboardProfessor.module.css";

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

export default function DashboardProfessor({
                                               api,
                                               setMensagem,
                                               onPerfilAtualizado,
                                               usuario = { nome: "Professor", tipo: 1 }
                                           }) {
    const [visao, setVisao] = useState("inicio");
    const [filtroCursos, setFiltroCursos] = useState("publicados");
    const [filtroAulas, setFiltroAulas] = useState("todos");
    const [dashboard, setDashboard] = useState(null);
    const [cursos, setCursos] = useState([]);
    const [aulas, setAulas] = useState([]);
    // Sprint item 6: mantém módulos do curso e o módulo aberto no painel do professor.
    const [modulos, setModulos] = useState([]);
    const [idModuloSelecionado, setIdModuloSelecionado] = useState(null);
    const [destinosModulo, setDestinosModulo] = useState({});
    const [alunos, setAlunos] = useState([]);
    const [financeiro, setFinanceiro] = useState(null);
    const [relatorio, setRelatorio] = useState(null);
    const [filtrosRelatorio, setFiltrosRelatorio] = useState({ inicio: "", fim: "", id_curso: "" });
    const [valorSaque, setValorSaque] = useState("");
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
            throw new Error(dados?.mensagem?.descricao || "Erro ao conectar com a API.");
        }

        return dados;
    }, [avisar]);

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
        const matchModulo = location.pathname.match(/\/DashboardProfessor\/cursos\/(\d+)\/modulos\/(\d+)$/);
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

        if (location.pathname.endsWith("/perfil")) {
            setVisao("perfil");
            setCursoSelecionado(null);
            return;
        }

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

        if (location.pathname.endsWith("/relatorios")) {
            setVisao("relatorios");
            setCursoSelecionado(null);
            return;
        }

        setVisao("inicio");
        setCursoSelecionado(null);
        setIdModuloSelecionado(null);
    }, [carregarCursos, cursos, cursoSelecionado, location.pathname]);

    useEffect(() => {
        carregarDashboard();
    }, [carregarDashboard]);

    useEffect(() => {
        if (visao === "cursos") {
            carregarCursos(filtroCursos);
        }
    }, [carregarCursos, filtroCursos, visao]);

    useEffect(() => {
        if (visao === "aulas" && cursoSelecionado) {
            carregarModulos(cursoSelecionado.id);
            carregarAulas(cursoSelecionado.id, filtroAulas, idModuloSelecionado);
        }
    }, [carregarAulas, carregarModulos, filtroAulas, visao, cursoSelecionado, idModuloSelecionado]);

    useEffect(() => {
        if (visao === "alunos" && cursoSelecionado) {
            carregarAlunos(cursoSelecionado.id);
        }
    }, [carregarAlunos, visao, cursoSelecionado]);

    useEffect(() => {
        if (visao !== "financeiro") return;

        async function carregarFinanceiro() {
            try {
                const resposta = await fetch(`${api}/financeiro/resumo`, {
                    credentials: "include"
                });
                setFinanceiro(await lerResposta(resposta));
            } catch (erro) {
                console.error("Erro ao carregar financeiro:", erro);
                avisar({ tipo: "erro", descricao: erro.message });
            }
        }

        carregarFinanceiro();
    }, [api, avisar, lerResposta, visao]);

    useEffect(() => {
        let sincronizando = false;

        async function sincronizarVisaoAtiva() {
            if (document.hidden || sincronizando) return;
            sincronizando = true;

            try {
                const tarefas = [carregarDashboard()];
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

                // Sprint item 3: sincroniza dashboard, cursos, aulas e financeiro ao retornar do aplicativo.
                await Promise.allSettled(tarefas);
            } finally {
                sincronizando = false;
            }
        }

        window.addEventListener("cursando:sincronizar", sincronizarVisaoAtiva);
        return () => window.removeEventListener("cursando:sincronizar", sincronizarVisaoAtiva);
    }, [
        api,
        carregarAlunos,
        carregarAulas,
        carregarCursos,
        carregarDashboard,
        cursoSelecionado,
        idModuloSelecionado,
        filtroAulas,
        filtroCursos,
        lerResposta,
        visao
    ]);

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

    useEffect(() => {
        if (visao === "relatorios") {
            if (cursos.length === 0) {
                carregarCursos("todos");
            }
            carregarRelatorio();
        }
    }, [carregarCursos, carregarRelatorio, cursos.length, visao]);

    useEffect(() => {
        function sincronizarRelatorio() {
            if (!document.hidden && visao === "relatorios") {
                // Sprint item 3: atualiza indicadores de atividade e aulas assistidas modificados no aplicativo.
                carregarRelatorio();
            }
        }

        window.addEventListener("cursando:sincronizar", sincronizarRelatorio);
        return () => window.removeEventListener("cursando:sincronizar", sincronizarRelatorio);
    }, [carregarRelatorio, visao]);

    function baixarRelatorioPdf() {
        const params = new URLSearchParams({ formato: "pdf" });
        if (filtrosRelatorio.inicio) params.set("inicio", filtrosRelatorio.inicio);
        if (filtrosRelatorio.fim) params.set("fim", filtrosRelatorio.fim);
        if (filtrosRelatorio.id_curso) params.set("id_curso", filtrosRelatorio.id_curso);
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
            if (!modal.item && idModuloSelecionado) {
                dados.append("id_modulo", String(idModuloSelecionado));
            }
        }

        return dados;
    }

    async function salvarModal(form) {
        setSalvando(true);

        try {
            const editando = Boolean(modal.item);
            const url = modal.tipo === "curso"
                ? `${api}/professor/cursos${editando ? `/${modal.item.id}` : ""}`
                : modal.tipo === "modulo"
                    ? `${api}/professor/cursos/${cursoSelecionado.id}/modulos${editando ? `/${modal.item.id}` : ""}`
                : editando
                    ? `${api}/professor/aulas/${modal.item.id}`
                    : `${api}/professor/cursos/${cursoSelecionado.id}/aulas`;

            const resposta = await fetch(url, {
                method: editando ? "PUT" : "POST",
                credentials: "include",
                body: montarFormData(form)
            });

            const dados = await lerResposta(resposta);
            setModal(null);
            await carregarDashboard();

            if (modal.tipo === "curso") {
                const proximoFiltro = editando ? filtroCursos : "privados";
                if (!editando) {
                    setFiltroCursos(proximoFiltro);
                }
                await carregarCursos(proximoFiltro);
            } else if (modal.tipo === "modulo") {
                await carregarModulos(cursoSelecionado.id);
                if (!editando && dados.id_modulo) {
                    setIdModuloSelecionado(Number(dados.id_modulo));
                    navigate(`/DashboardProfessor/cursos/${cursoSelecionado.id}/modulos/${dados.id_modulo}`);
                }
            } else if (cursoSelecionado) {
                await carregarAulas(cursoSelecionado.id, filtroAulas, idModuloSelecionado);
            }
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
            await carregarDashboard();
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
            await carregarDashboard();
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
            await carregarDashboard();
            await carregarAulas(cursoSelecionado.id, filtroAulas, idModuloSelecionado);
        } catch (erro) {
            console.error("Erro ao alterar status da aula:", erro);
        }
    }

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

    async function executarExclusaoAula(aula) {
        try {
            const resposta = await fetch(`${api}/professor/aulas/${aula.id}`, {
                method: "DELETE",
                credentials: "include"
            });

            await lerResposta(resposta);
            await carregarDashboard();
            await carregarAulas(cursoSelecionado.id, filtroAulas, idModuloSelecionado);
        } catch (erro) {
            console.error("Erro ao excluir aula:", erro);
        } finally {
            setConfirmacao(null);
        }
    }

    async function solicitarSaque() {
        // Sprint item 1: evita enviar duas solicitações de saque por toques repetidos.
        if (solicitandoSaque) return;
        if (!saqueValido) {
            avisar({ tipo: "erro", descricao: "Informe um valor de saque valido dentro do saldo disponivel." });
            return;
        }
        setSolicitandoSaque(true);
        try {
            const resposta = await fetch(`${api}/professor/saques`, {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ valor: Number(valorSaque) })
            });
            await lerResposta(resposta);
            setValorSaque("");
            const resumo = await fetch(`${api}/financeiro/resumo`, { credentials: "include" });
            setFinanceiro(await lerResposta(resumo));
        } catch (erro) {
            console.error("Erro ao solicitar saque:", erro);
            avisar({ tipo: "erro", descricao: erro.message });
        } finally {
            setSolicitandoSaque(false);
        }
    }

    function abrirAulas(curso) {
        setCursoSelecionado(curso);
        setFiltroAulas("todos");
        setIdModuloSelecionado(null);
        navigate(`/DashboardProfessor/cursos/${curso.id}/aulas`);
    }

    function abrirModulo(modulo) {
        if (!cursoSelecionado) return;
        setIdModuloSelecionado(Number(modulo.id));
        setFiltroAulas("todos");
        navigate(`/DashboardProfessor/cursos/${cursoSelecionado.id}/modulos/${modulo.id}`);
    }

    function abrirAlunos(curso) {
        setCursoSelecionado(curso);
        navigate(`/DashboardProfessor/cursos/${curso.id}/alunos`);
    }

    const metricas = dashboard?.metricas || {};
    const recentes = dashboard?.recentes || [];
    const cursosRelatorio = relatorio?.cursos || [];
    const moduloSelecionado = modulos.find((modulo) => Number(modulo.id) === Number(idModuloSelecionado));
    const valorSaqueNumero = Number(valorSaque);
    const saqueValido = Number.isFinite(valorSaqueNumero)
        && valorSaqueNumero > 0
        && valorSaqueNumero <= Number(financeiro?.disponivel_saque || 0);
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
                    <CabecalhoProfessor usuario={usuario} />

                    {visao === "inicio" && (
                        <>
                            {/* Sprint item 8: organiza a abertura do painel em desempenho, conteúdo e atalhos claros. */}
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
                                    <CardMetricaProfessor titulo="Total de alunos" detalhe="Alunos matriculados nos seus cursos" valor={formatarNumero(metricas.total_alunos)} icone={<FaUsers />} />
                                    {/* Sprint item 7: exibe conclusões e horas registradas pelo player no painel do instrutor. */}
                                    <CardMetricaProfessor titulo="Cursos concluídos" detalhe="Conclusões por aluno" valor={formatarNumero(metricas.cursos_concluidos)} icone={<FaCheckCircle />} />
                                    <CardMetricaProfessor titulo="Módulos concluídos" detalhe="Conclusões por aluno" valor={formatarNumero(metricas.modulos_concluidos)} icone={<FaListAlt />} />
                                    <CardMetricaProfessor titulo="Horas assistidas" detalhe="Tempo registrado pelo player" valor={`${Number(metricas.horas_assistidas || 0).toFixed(2).replace(".", ",")}h`} icone={<FaClock />} />
                                </div>
                            </section>

                            <section className={css.secaoPainel}>
                                <div className={css.cabecalhoBloco}>
                                    <div>
                                        <h3>Seus cursos</h3>
                                        <p>Resumo do conteúdo que você criou e mantém disponível.</p>
                                    </div>
                                </div>
                                <div className={css.gridMetricasSecundarias}>
                                    <CardMetricaProfessor titulo="Cursos cadastrados" detalhe="Total criado por você" valor={formatarNumero(metricas.cursos_cadastrados)} icone={<FaGraduationCap />} />
                                    <CardMetricaProfessor titulo="Aulas publicadas" detalhe="Vídeo-aulas disponíveis" valor={formatarNumero(metricas.aulas_publicadas)} icone={<FaPlayCircle />} />
                                    <CardMetricaProfessor titulo="Cursos privados" detalhe="Aguardando publicação" valor={formatarNumero(metricas.cursos_privados)} icone={<FaFolderOpen />} />
                                </div>
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
                            {/* Sprint item 9: deixa a gestão de cursos com hierarquia clara entre ação, filtro e listagem. */}
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
                                        {/* Contador de inscritos oculto temporariamente.
                                        <p className={css.inscritosCurso}>
                                            {cursoSelecionado.total_inscritos || 0} {cursoSelecionado.total_inscritos === 1 ? "inscrito" : "inscritos"}
                                        </p>
                                        */}
                                        <p className={css.textoApoio}>{cursoSelecionado.descricao}</p>
                                    </div>
                                </div>
                            </div>

                            {!idModuloSelecionado && (
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
                                        {modulos.map((modulo) => (
                                            <article className={css.cardModuloProfessor} key={modulo.id}>
                                                <img src={modulo.imagem ? resolverUrlMidia(api, modulo.imagem) : PLACEHOLDER_CURSO} alt="" />
                                                <div className={css.infoModuloProfessor}>
                                                    <h3>{modulo.titulo}</h3>
                                                    <p>{modulo.descricao || "Sem descrição"}</p>
                                                    <small>{modulo.total_aulas || 0} aulas</small>
                                                    <div className={css.acoesModuloProfessor}>
                                                        <button className={css.botaoPrimario} onClick={() => abrirModulo(modulo)}>Entrar no módulo</button>
                                                        <button className={css.botaoSecundario} onClick={() => setModal({ tipo: "modulo", item: modulo })}>Editar</button>
                                                    </div>
                                                </div>
                                            </article>
                                        ))}
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
                                                            <div className={css.moverAulaModulo}>
                                                                <select value={destinosModulo[aula.id] || ""} onChange={(evento) => setDestinosModulo((atual) => ({ ...atual, [aula.id]: evento.target.value }))}>
                                                                    <option value="">Escolher módulo</option>
                                                                    {modulos.map((modulo) => <option key={modulo.id} value={modulo.id}>{modulo.titulo}</option>)}
                                                                </select>
                                                                <button className={css.botaoSecundario} onClick={() => moverAulaParaModulo(aula)}>Mover aula</button>
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}

                            {idModuloSelecionado && moduloSelecionado && (
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
                            {idModuloSelecionado && !moduloSelecionado && !carregando && (
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
                                        {/* Contador de inscritos oculto temporariamente.
                                        <p className={css.inscritosCurso}>
                                            {cursoSelecionado.total_inscritos || 0} {cursoSelecionado.total_inscritos === 1 ? "inscrito" : "inscritos"}
                                        </p>
                                        */}
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
                                    </div>
                                    {alunos.map((aluno) => (
                                        <div key={aluno.id_usuario} className={css.linhaAlunoCurso}>
                                            <span>{aluno.nome}</span>
                                            <span>{aluno.email}</span>
                                        </div>
                                    ))}
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
                            {/* Sprint item 8: separa resumo financeiro, ação de saque e detalhamento por curso. */}
                            <header className={css.cabecalhoPagina}>
                                <div>
                                    <span className={css.etiquetaPagina}>PAGAMENTOS</span>
                                    <h2>Financeiro</h2>
                                    <p>Consulte seus valores e solicite um saque do saldo disponível.</p>
                                </div>
                            </header>
                            {/* Sprint itens 12, 30, 31 e 32: cards financeiros e solicitacao de saque do instrutor. */}
                            <section className={css.secaoPainel}>
                                <div className={css.cabecalhoBloco}>
                                    <div>
                                        <h3>Resumo financeiro</h3>
                                        <p>Valores estimados e atividade atual dos seus cursos.</p>
                                    </div>
                                </div>
                                <div className={css.gridMetricasFinanceiro}>
                                    <CardMetricaProfessor titulo="Recebido estimado" detalhe={`${Number(financeiro?.percentual_pool || 0).toFixed(2).replace(".", ",")}% do pool`} valor={formatarMoeda(financeiro?.recebido_estimado)} />
                                    <div className={css.cardSaldoDisponivel}>
                                        <CardMetricaProfessor titulo="Disponível para saque" detalhe="Saldo após solicitações" valor={formatarMoeda(financeiro?.disponivel_saque)} />
                                    </div>
                                    <CardMetricaProfessor titulo="Já sacado" detalhe="Solicitações registradas" valor={formatarMoeda(financeiro?.ja_sacado)} />
                                    <CardMetricaProfessor titulo="Alunos ativos" detalhe="Matrículas nos seus cursos" valor={formatarNumero(financeiro?.alunos_ativos)} />
                                </div>
                            </section>

                            <section className={css.painelSolicitarSaque}>
                                <div className={css.introducaoSaque}>
                                    <span className={css.iconeSaque}><FaWallet /></span>
                                    <span className={css.etiquetaPagina}>SALDO DISPONÍVEL</span>
                                    <h3>Solicitar saque</h3>
                                    <p>Informe quanto deseja transferir. O valor não pode ultrapassar seu saldo disponível.</p>
                                    <div className={css.valorDisponivelSaque}>
                                        <span>Disponível para saque</span>
                                        <strong>{formatarMoeda(financeiro?.disponivel_saque)}</strong>
                                    </div>
                                </div>
                                <form className={`${css.formularioPerfil} ${css.formularioSaque}`} onSubmit={(evento) => { evento.preventDefault(); solicitarSaque(); }}>
                                    <label htmlFor="valor-saque">Valor do saque</label>
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
                                    <p className={css.textoApoio}>Você poderá solicitar até {formatarMoeda(financeiro?.disponivel_saque)}.</p>
                                    <button className={css.botaoPrimario} type="submit" disabled={solicitandoSaque || !saqueValido}>
                                        {solicitandoSaque ? "Enviando solicitação..." : "Solicitar saque"}
                                    </button>
                                </form>
                            </section>

                            <section className={css.painelTabelaFinanceiro}>
                                <div className={css.cabecalhoBloco}>
                                    <div>
                                        <h3>Receita estimada por curso</h3>
                                        <p>Consulte a atividade e o valor associado a cada curso.</p>
                                    </div>
                                </div>
                                <div className={css.containerTabelaFinanceira}>
                                    <table className={css.tabelaFinanceira}>
                                        <thead>
                                            <tr><th>Curso</th><th>Atividade</th><th>Receita estimada</th></tr>
                                        </thead>
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
                                    </table>
                                </div>
                            </section>
                        </section>
                    )}

                    {visao === "chat" && (
                        <section className={css.secaoCursos}>
                            {/* Sprint item 9: contextualiza o chat compartilhado dentro do painel do professor. */}
                            <header className={css.cabecalhoPagina}>
                                <div>
                                    <span className={css.etiquetaPagina}>COMUNICAÇÃO</span>
                                    <h2>Conversas dos cursos</h2>
                                    <p>Responda aos alunos e acompanhe as conversas relacionadas às suas turmas.</p>
                                </div>
                            </header>
                            <ChatCurso api={api} perfil="professor" setMensagem={setMensagem} />
                        </section>
                    )}

                    {visao === "relatorios" && (
                        <section className={`${css.secaoCursos} ${css.paginaRelatorios}`}>
                            {/* Sprint item 8: agrupa filtros, indicadores e tabela em uma leitura contínua do relatório. */}
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
                                        <p>As datas consideram quando os cursos foram criados.</p>
                                    </div>
                                </div>
                                <form className={css.filtrosRelatorio} onSubmit={(evento) => { evento.preventDefault(); carregarRelatorio(); }}>
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
                                    <CardMetricaProfessor titulo="Matrículas" detalhe="Inscrições ativas nos cursos" valor={formatarNumero(relatorio?.resumo?.alunos)} />
                                    <CardMetricaProfessor titulo="Cursos" detalhe="Cursos incluídos no filtro" valor={formatarNumero(relatorio?.resumo?.cursos)} />
                                    <CardMetricaProfessor titulo="Aulas concluídas" detalhe="Concluídas pelos alunos" valor={formatarNumero(relatorio?.resumo?.aulas_assistidas)} />
                                    {/* Sprint item 7: mantém visíveis as conclusões e o tempo registrado pelo player. */}
                                    <CardMetricaProfessor titulo="Cursos concluídos" detalhe="Conclusões por aluno" valor={formatarNumero(relatorio?.resumo?.conclusoes)} />
                                    <CardMetricaProfessor titulo="Módulos concluídos" detalhe="Conclusões por aluno" valor={formatarNumero(relatorio?.resumo?.modulos)} />
                                    <CardMetricaProfessor titulo="Horas assistidas" detalhe="Tempo registrado pelo player" valor={`${Number(relatorio?.resumo?.horas_assistidas || 0).toFixed(2).replace(".", ",")}h`} />
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
                        </section>
                    )}
                </main>

                <RodapeProfessor />
            </div>

            {modal && (
                <FormularioModalProfessor
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
                        : "Realmente deseja apagar essa aula?"
                }
                descricao={
                    confirmacao?.tipo === "curso"
                        ? "As aulas desse curso também serão removidas da dashboard."
                        : "O vídeo dessa aula será removido da dashboard."
                }
                textoConfirmar={
                    confirmacao?.tipo === "curso"
                        ? "Sim, excluir curso"
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
                }}
            />
        </div>
    );
}
