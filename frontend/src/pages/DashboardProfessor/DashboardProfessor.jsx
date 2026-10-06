import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
    FaBookOpen,
    FaFolderOpen,
    FaGraduationCap,
    FaPlayCircle,
    FaPlus,
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
    const [alunos, setAlunos] = useState([]);
    const [financeiro, setFinanceiro] = useState(null);
    const [relatorio, setRelatorio] = useState(null);
    const [filtrosRelatorio, setFiltrosRelatorio] = useState({ inicio: "", fim: "", id_curso: "" });
    const [materiais, setMateriais] = useState([]);
    const [materialForm, setMaterialForm] = useState({ titulo: "", tipo: "link", url: "", descricao: "" });
    const [prova, setProva] = useState(null);
    const [provaForm, setProvaForm] = useState({ titulo: "", enunciado: "", tipo: "objetiva", alternativas: "", resposta_esperada: "" });
    const [respostasProva, setRespostasProva] = useState([]);
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
                    cursos_privados: 0
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

    const carregarAulas = useCallback(async (idCurso, status = filtroAulas) => {
        setCarregando(true);

        try {
            const [resposta, respostaMateriais, respostaProva, respostaCorrecoes] = await Promise.all([
                fetch(`${api}/professor/cursos/${idCurso}/aulas?status=${status}`, { credentials: "include" }),
                fetch(`${api}/professor/cursos/${idCurso}/materiais`, { credentials: "include" }),
                fetch(`${api}/professor/cursos/${idCurso}/prova`, { credentials: "include" }),
                fetch(`${api}/professor/provas/respostas`, { credentials: "include" })
            ]);
            const dados = await lerResposta(resposta);
            setAulas(Array.isArray(dados) ? dados : []);
            setMateriais(await lerResposta(respostaMateriais));
            setProva(await lerResposta(respostaProva));
            setRespostasProva(await lerResposta(respostaCorrecoes));
        } catch (erro) {
            console.error("Erro ao carregar aulas:", erro);
            setAulas([]);
        } finally {
            setCarregando(false);
        }
    }, [api, filtroAulas, lerResposta]);

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

        if (location.pathname.endsWith("/cursos")) {
            setVisao("cursos");
            setCursoSelecionado(null);
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
            carregarAulas(cursoSelecionado.id, filtroAulas);
        }
    }, [carregarAulas, filtroAulas, visao, cursoSelecionado]);

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
                    tarefas.push(carregarAulas(cursoSelecionado.id, filtroAulas));
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
            carregarRelatorio();
        }
    }, [carregarRelatorio, visao]);

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

        if (modal.tipo === "curso") {
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
        }

        return dados;
    }

    async function salvarModal(form) {
        setSalvando(true);

        try {
            const editando = Boolean(modal.item);
            const url = modal.tipo === "curso"
                ? `${api}/professor/cursos${editando ? `/${modal.item.id}` : ""}`
                : editando
                    ? `${api}/professor/aulas/${modal.item.id}`
                    : `${api}/professor/cursos/${cursoSelecionado.id}/aulas`;

            const resposta = await fetch(url, {
                method: editando ? "PUT" : "POST",
                credentials: "include",
                body: montarFormData(form)
            });

            await lerResposta(resposta);
            setModal(null);
            await carregarDashboard();

            if (modal.tipo === "curso") {
                const proximoFiltro = editando ? filtroCursos : "privados";
                if (!editando) {
                    setFiltroCursos(proximoFiltro);
                }
                await carregarCursos(proximoFiltro);
            } else if (cursoSelecionado) {
                await carregarAulas(cursoSelecionado.id, filtroAulas);
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
            await carregarAulas(cursoSelecionado.id, filtroAulas);
        } catch (erro) {
            console.error("Erro ao alterar status da aula:", erro);
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
            await carregarAulas(cursoSelecionado.id, filtroAulas);
        } catch (erro) {
            console.error("Erro ao excluir aula:", erro);
        } finally {
            setConfirmacao(null);
        }
    }

    async function solicitarSaque() {
        // Sprint item 1: evita enviar duas solicitações de saque por toques repetidos.
        if (solicitandoSaque) return;
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

    async function salvarMaterial() {
        try {
            const resposta = await fetch(`${api}/professor/cursos/${cursoSelecionado.id}/materiais`, {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(materialForm)
            });
            await lerResposta(resposta);
            setMaterialForm({ titulo: "", tipo: "link", url: "", descricao: "" });
            await carregarAulas(cursoSelecionado.id, filtroAulas);
        } catch (erro) {
            avisar({ tipo: "erro", descricao: erro.message });
        }
    }

    async function salvarProva() {
        try {
            const resposta = await fetch(`${api}/professor/cursos/${cursoSelecionado.id}/prova`, {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    titulo: provaForm.titulo,
                    questoes: [{
                        enunciado: provaForm.enunciado,
                        tipo: provaForm.tipo,
                        alternativas: provaForm.alternativas,
                        resposta_esperada: provaForm.resposta_esperada
                    }]
                })
            });
            await lerResposta(resposta);
            setProvaForm({ titulo: "", enunciado: "", tipo: "objetiva", alternativas: "", resposta_esperada: "" });
            await carregarAulas(cursoSelecionado.id, filtroAulas);
        } catch (erro) {
            avisar({ tipo: "erro", descricao: erro.message });
        }
    }

    async function publicarProvaAtual() {
        if (!prova?.prova?.id) return;
        const resposta = await fetch(`${api}/professor/provas/${prova.prova.id}/publicar`, {
            method: "PATCH",
            credentials: "include"
        });
        await lerResposta(resposta);
        await carregarAulas(cursoSelecionado.id, filtroAulas);
    }

    async function corrigirResposta(idResposta, aprovado) {
        const feedback = window.prompt("Feedback para o aluno") || "";
        const resposta = await fetch(`${api}/professor/provas/respostas/${idResposta}`, {
            method: "PATCH",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ aprovado, feedback })
        });
        await lerResposta(resposta);
        await carregarAulas(cursoSelecionado.id, filtroAulas);
    }

    function abrirAulas(curso) {
        setCursoSelecionado(curso);
        setFiltroAulas("todos");
        navigate(`/DashboardProfessor/cursos/${curso.id}/aulas`);
    }

    function abrirAlunos(curso) {
        setCursoSelecionado(curso);
        navigate(`/DashboardProfessor/cursos/${curso.id}/alunos`);
    }

    const metricas = dashboard?.metricas || {};
    const recentes = dashboard?.recentes || [];
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
                            <section className={css.gridMetricas}>
                                <CardMetricaProfessor titulo="Cursos cadastrados" detalhe="Total criado por você" valor={metricas.cursos_cadastrados || 0} icone={<FaGraduationCap />} />
                                <CardMetricaProfessor titulo="Total de alunos" detalhe="Matrículas em seus cursos" valor={metricas.total_alunos || 0} icone={<FaUsers />} />
                                <CardMetricaProfessor titulo="Aulas publicadas" detalhe="Vídeo-aulas disponíveis" valor={metricas.aulas_publicadas || 0} icone={<FaPlayCircle />} />
                                <CardMetricaProfessor titulo="Cursos privados" detalhe="Aguardando publicação" valor={metricas.cursos_privados || 0} icone={<FaFolderOpen />} />
                            </section>

                            <section className={css.secaoAcessos}>
                                <div className={css.topoSecao}>
                                    <h2>Acessos Recentes</h2>
                                    <button className={css.botaoPrimario} onClick={() => navigate("/DashboardProfessor/cursos")}>
                                        <FaBookOpen /> Meus cursos
                                    </button>
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
                                <h2>{tituloCursos}</h2>
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
                            {!carregando && aulas.length === 0 && <EstadoVazioProfessor texto="Nenhuma aula criada para este curso." />}

                            <div className={css.gridAulas}>
                                {aulas.map((aula) => (
                                    <ItemCardProfessor
                                        key={aula.id}
                                        tipo="aula"
                                        item={aula}
                                        api={api}
                                        usuario={usuario}
                                        onEditar={() => setModal({ tipo: "aula", item: aula })}
                                        onExcluir={() => setConfirmacao({ tipo: "aula", item: aula })}
                                        onStatus={(status) => alterarStatusAula(aula, status)}
                                    />
                                ))}
                            </div>
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
                        <section className={css.secaoCursos}>
                            <div className={css.barraTitulo}>
                                <h2>Financeiro</h2>
                            </div>
                            {/* Sprint itens 12, 30, 31 e 32: cards financeiros e solicitacao de saque do instrutor. */}
                            <div className={css.gridMetricas}>
                                <CardMetricaProfessor titulo="Recebido estimado" detalhe="Pool de receita" valor={`R$ ${Number(financeiro?.recebido_estimado || 0).toFixed(2).replace(".", ",")}`} />
                                <CardMetricaProfessor titulo="Disponivel para saque" detalhe="Saldo bruto" valor={`R$ ${Number(financeiro?.disponivel_saque || 0).toFixed(2).replace(".", ",")}`} />
                                <CardMetricaProfessor titulo="Ja sacado" detalhe="Solicitacoes registradas" valor={`R$ ${Number(financeiro?.ja_sacado || 0).toFixed(2).replace(".", ",")}`} />
                                <CardMetricaProfessor titulo="Alunos ativos" detalhe="Matriculas nos seus cursos" valor={financeiro?.alunos_ativos || 0} />
                            </div>
                            <div className={css.formularioPerfil}>
                                <label>
                                    Valor do saque
                                    <input
                                        value={valorSaque}
                                        onChange={(evento) => setValorSaque(evento.target.value)}
                                        type="number"
                                        min="1"
                                        step="0.01"
                                        placeholder="0,00"
                                    />
                                </label>
                                <button className={css.botaoPrimario} onClick={solicitarSaque} disabled={solicitandoSaque}>
                                    {solicitandoSaque ? "Enviando solicitação..." : "Solicitar saque"}
                                </button>
                            </div>
                            {financeiro?.cursos_receita?.length > 0 && (
                                <div className={css.listaAlunosCurso}>
                                    <div className={css.cabecalhoListaAlunos}>
                                        <span>Curso</span>
                                        <span>Receita estimada</span>
                                    </div>
                                    {financeiro.cursos_receita.map((curso) => (
                                        <div key={curso.id_curso} className={css.linhaAlunoCurso}>
                                            <span>{curso.curso} ({curso.views} views)</span>
                                            <span>R$ {Number(curso.receita_estimativa || 0).toFixed(2).replace(".", ",")}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </section>
                    )}

                    {visao === "chat" && (
                        <section className={css.secaoCursos}>
                            <ChatCurso api={api} perfil="professor" setMensagem={setMensagem} />
                        </section>
                    )}

                    {visao === "relatorios" && (
                        <section className={css.secaoCursos}>
                            <div className={css.barraTitulo}>
                                <h2>Relatorios</h2>
                                <button className={css.botaoPrimario} onClick={baixarRelatorioPdf}>Baixar PDF</button>
                            </div>
                            <div className={css.formularioPerfil}>
                                <label>
                                    Inicio
                                    <input type="date" value={filtrosRelatorio.inicio} onChange={(e) => setFiltrosRelatorio({ ...filtrosRelatorio, inicio: e.target.value })} />
                                </label>
                                <label>
                                    Fim
                                    <input type="date" value={filtrosRelatorio.fim} onChange={(e) => setFiltrosRelatorio({ ...filtrosRelatorio, fim: e.target.value })} />
                                </label>
                                <label>
                                    ID do curso
                                    <input value={filtrosRelatorio.id_curso} onChange={(e) => setFiltrosRelatorio({ ...filtrosRelatorio, id_curso: e.target.value })} placeholder="Opcional" />
                                </label>
                                <button className={css.botaoPrimario} onClick={carregarRelatorio}>Filtrar</button>
                            </div>
                            <div className={css.gridMetricas}>
                                <CardMetricaProfessor titulo="Alunos" valor={relatorio?.resumo?.alunos || 0} />
                                <CardMetricaProfessor titulo="Cursos" valor={relatorio?.resumo?.cursos || 0} />
                                <CardMetricaProfessor titulo="Aulas assistidas" valor={relatorio?.resumo?.aulas_assistidas || 0} />
                                <CardMetricaProfessor titulo="Horas assistidas" valor={relatorio?.resumo?.horas_assistidas || 0} />
                            </div>

                            <section className={css.formularioPerfil}>
                                <h2>Complementos</h2>
                                <label>Titulo<input value={materialForm.titulo} onChange={(e) => setMaterialForm({ ...materialForm, titulo: e.target.value })} /></label>
                                <label>Tipo<input value={materialForm.tipo} onChange={(e) => setMaterialForm({ ...materialForm, tipo: e.target.value })} /></label>
                                <label>URL<input value={materialForm.url} onChange={(e) => setMaterialForm({ ...materialForm, url: e.target.value })} /></label>
                                <label>Descricao<input value={materialForm.descricao} onChange={(e) => setMaterialForm({ ...materialForm, descricao: e.target.value })} /></label>
                                <button className={css.botaoPrimario} onClick={salvarMaterial}>Cadastrar complemento</button>
                                {materiais.map((material) => <p key={material.id}>{material.titulo} - {material.tipo}</p>)}
                            </section>

                            <section className={css.formularioPerfil}>
                                <h2>Prova do curso</h2>
                                {prova?.prova && <p>Atual: {prova.prova.titulo} ({prova.prova.publicada ? "publicada" : "rascunho"})</p>}
                                <label>Titulo<input value={provaForm.titulo} onChange={(e) => setProvaForm({ ...provaForm, titulo: e.target.value })} /></label>
                                <label>Enunciado<input value={provaForm.enunciado} onChange={(e) => setProvaForm({ ...provaForm, enunciado: e.target.value })} /></label>
                                <label>Tipo<input value={provaForm.tipo} onChange={(e) => setProvaForm({ ...provaForm, tipo: e.target.value })} /></label>
                                <label>Alternativas<input value={provaForm.alternativas} onChange={(e) => setProvaForm({ ...provaForm, alternativas: e.target.value })} /></label>
                                <label>Resposta esperada<input value={provaForm.resposta_esperada} onChange={(e) => setProvaForm({ ...provaForm, resposta_esperada: e.target.value })} /></label>
                                <button className={css.botaoPrimario} onClick={salvarProva}>Cadastrar prova</button>
                                {prova?.prova && !prova.prova.publicada && <button className={css.botaoSecundario} onClick={publicarProvaAtual}>Publicar prova</button>}
                                {respostasProva.filter((item) => item.curso === cursoSelecionado.titulo).map((resposta) => (
                                    <article key={resposta.id}>
                                        <strong>{resposta.aluno}</strong>
                                        <p>{resposta.respostas}</p>
                                        <button className={css.botaoPrimario} onClick={() => corrigirResposta(resposta.id, true)}>Aprovar</button>
                                        <button className={css.botaoSecundario} onClick={() => corrigirResposta(resposta.id, false)}>Reprovar</button>
                                    </article>
                                ))}
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
