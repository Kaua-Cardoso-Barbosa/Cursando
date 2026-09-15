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
import css from "./DashboardProfessor.module.css";

export default function DashboardProfessor({
                                               api,
                                               sair,
                                               setMensagem,
                                               usuario = { nome: "Professor", tipo: 1 }
                                           }) {
    const [visao, setVisao] = useState("inicio");
    const [filtroCursos, setFiltroCursos] = useState("publicados");
    const [filtroAulas, setFiltroAulas] = useState("todos");
    const [dashboard, setDashboard] = useState(null);
    const [cursos, setCursos] = useState([]);
    const [aulas, setAulas] = useState([]);
    const [alunos, setAlunos] = useState([]);
    const [cursoSelecionado, setCursoSelecionado] = useState(null);
    const [modal, setModal] = useState(null);
    const [confirmacao, setConfirmacao] = useState(null);
    const [carregando, setCarregando] = useState(false);
    const [salvando, setSalvando] = useState(false);
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
            const resposta = await fetch(`${api}/professor/cursos/${idCurso}/aulas?status=${status}`, {
                credentials: "include"
            });
            const dados = await lerResposta(resposta);
            setAulas(Array.isArray(dados) ? dados : []);
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
            <MenuLateralProf itemAtivo={visao === "inicio" ? "inicio" : visao === "perfil" ? "perfil" : "meus-cursos"} />

            <div className={css.conteudoPrincipal}>
                <main className={css.areaConteudo}>
                    <CabecalhoProfessor usuario={usuario} sair={sair} />

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
                                <div>
                                    <button className={css.linkVoltar} onClick={() => navigate("/DashboardProfessor/cursos")}>Voltar para cursos</button>
                                    <h2>{cursoSelecionado.titulo}</h2>
                                    <p className={css.textoApoio}>{cursoSelecionado.descricao}</p>
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
                                <div>
                                    <button className={css.linkVoltar} onClick={() => navigate("/DashboardProfessor/cursos")}>Voltar para cursos</button>
                                    <h2>Alunos de {cursoSelecionado.titulo}</h2>
                                    <p className={css.textoApoio}>Lista de alunos matriculados neste curso.</p>
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
                            <PerfilUsuario api={api} setMensagem={setMensagem} />
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
