import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
    FaArchive,
    FaBookOpen,
    FaBoxOpen,
    FaEdit,
    FaFolderOpen,
    FaGooglePlay,
    FaGraduationCap,
    FaLinux,
    FaLock,
    FaPlay,
    FaPlayCircle,
    FaPlus,
    FaTrash,
    FaUnlock,
    FaUpload,
    FaUser,
    FaUsers,
    FaWindows
} from "react-icons/fa";
import MenuLateralProf from "../../components/MenuLateral/MenuLateralProf.jsx";
import Button from "../../components/Button/Button.jsx";
import ConfirmAlert from "../../components/ConfirmAlert/ConfirmAlert.jsx";
import css from "./DashboardProfessor.module.css";

const STATUS_PRIVADO = 0;
const STATUS_PUBLICADO = 1;
const STATUS_ARQUIVADO = 2;

const cursoVazio = {
    titulo: "",
    descricao: "",
    arquivo: null
};

const aulaVazia = {
    titulo: "",
    descricao: "",
    arquivo: null
};

function resolverUrlMidia(api, caminho) {
    if (!caminho) {
        return "";
    }

    if (caminho.startsWith("http://") || caminho.startsWith("https://") || caminho.startsWith("/imagens_")) {
        return caminho;
    }

    return `${api}${caminho}`;
}

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

    useEffect(() => {
        const matchAulas = location.pathname.match(/\/DashboardProfessor\/cursos\/(\d+)\/aulas$/);

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

    function montarFormData(form) {
        const dados = new FormData();
        dados.append("titulo", form.titulo);
        dados.append("descricao", form.descricao);

        if (form.arquivo) {
            dados.append(modal.tipo === "curso" ? "imagem" : "video", form.arquivo);
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

    const metricas = dashboard?.metricas || {};
    const recentes = dashboard?.recentes || [];
    const tituloCursos = useMemo(() => {
        if (filtroCursos === "arquivados") return "Cursos Arquivados";
        if (filtroCursos === "privados") return "Cursos Privados";
        return "Cursos Publicados";
    }, [filtroCursos]);

    return (
        <div className={css.painelProfessor}>
            <MenuLateralProf itemAtivo={visao === "inicio" ? "inicio" : "meus-cursos"} />

            <div className={css.conteudoPrincipal}>
                <main className={css.areaConteudo}>
                    <Cabecalho usuario={usuario} sair={sair} />

                    {visao === "inicio" && (
                        <>
                            <section className={css.gridMetricas}>
                                <CardMetrica titulo="Cursos cadastrados" detalhe="Total criado por você" valor={metricas.cursos_cadastrados || 0} icone={<FaGraduationCap />} />
                                <CardMetrica titulo="Total de alunos" detalhe="Matrículas em seus cursos" valor={metricas.total_alunos || 0} icone={<FaUsers />} />
                                <CardMetrica titulo="Aulas publicadas" detalhe="Vídeo-aulas disponíveis" valor={metricas.aulas_publicadas || 0} icone={<FaPlayCircle />} />
                                <CardMetrica titulo="Cursos privados" detalhe="Aguardando publicação" valor={metricas.cursos_privados || 0} icone={<FaFolderOpen />} />
                            </section>

                            <section className={css.secaoAcessos}>
                                <div className={css.topoSecao}>
                                    <h2>Acessos Recentes</h2>
                                    <button className={css.botaoPrimario} onClick={() => navigate("/DashboardProfessor/cursos")}>
                                        <FaBookOpen /> Meus cursos
                                    </button>
                                </div>
                                <div className={css.carrosselCursos}>
                                    {recentes.length === 0 && <EstadoVazio texto="Nenhum curso criado ainda." />}
                                    {recentes.map((curso) => (
                                        <CursoCard key={curso.id} curso={curso} api={api} onAbrir={abrirAulas} />
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
                            {!carregando && cursos.length === 0 && <EstadoVazio texto="Nenhum curso encontrado nesse filtro." />}

                            <div className={css.gridCursos}>
                                {cursos.map((curso) => (
                                    <CursoCard
                                        key={curso.id}
                                        curso={curso}
                                        api={api}
                                        onAbrir={abrirAulas}
                                        onEditar={() => setModal({ tipo: "curso", item: curso })}
                                        onExcluir={() => setConfirmacao({ tipo: "curso", item: curso })}
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
                            {!carregando && aulas.length === 0 && <EstadoVazio texto="Nenhuma aula criada para este curso." />}

                            <div className={css.gridAulas}>
                                {aulas.map((aula) => (
                                    <AulaCard
                                        key={aula.id}
                                        aula={aula}
                                        api={api}
                                        onEditar={() => setModal({ tipo: "aula", item: aula })}
                                        onExcluir={() => setConfirmacao({ tipo: "aula", item: aula })}
                                        onStatus={(status) => alterarStatusAula(aula, status)}
                                    />
                                ))}
                            </div>
                        </section>
                    )}
                </main>

                <Rodape />
            </div>

            {modal && (
                <FormularioModal
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

function Cabecalho({ usuario, sair }) {
    return (
        <header className={css.cabecalhoUsuario}>
            <div className={css.dadosUsuario}>
                <h1>Olá {usuario.nome}</h1>
                <span className={css.cargoUsuario}>Professor(a)</span>
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

function CardMetrica({ titulo, detalhe, valor, icone }) {
    return (
        <article className={css.cardMetrica}>
            <div className={css.metricaTopo}>
                <h2>{titulo}</h2>
                <div className={css.iconeBadge}>{icone}</div>
            </div>
            <span className={css.metricaVariacao}>{detalhe}</span>
            <strong className={css.metricaNumero}>{valor}</strong>
        </article>
    );
}

function CursoCard({ curso, api, onAbrir, onEditar, onExcluir, onStatus, gerenciavel = false }) {
    const imagem = curso.imagem ? resolverUrlMidia(api, curso.imagem) : "/imagens_banner_curso/design.png";

    return (
        <article className={css.cardCurso}>
            <button className={css.areaCardClicavel} onClick={() => onAbrir(curso)}>
                <img src={imagem} alt={curso.titulo} className={css.imagemCurso} />
                <div className={css.infoCurso}>
                    <div>
                        <h3>{curso.titulo}</h3>
                        <p>{curso.descricao}</p>
                    </div>
                    <span className={css.statusBadge}>{curso.status_nome}</span>
                </div>
            </button>

            {gerenciavel && (
                <div className={css.acoesCard}>
                    <button title="Editar curso" onClick={onEditar}><FaEdit /></button>
                    {curso.status !== STATUS_PUBLICADO && <button title="Publicar curso" onClick={() => onStatus(STATUS_PUBLICADO)}><FaUnlock /></button>}
                    {curso.status !== STATUS_PRIVADO && <button title="Privar curso" onClick={() => onStatus(STATUS_PRIVADO)}><FaLock /></button>}
                    {curso.status !== STATUS_ARQUIVADO && <button title="Arquivar curso" onClick={() => onStatus(STATUS_ARQUIVADO)}><FaArchive /></button>}
                    <button title="Excluir curso" className={css.botaoExcluir} onClick={onExcluir}><FaTrash /></button>
                </div>
            )}
        </article>
    );
}

function AulaCard({ aula, api, onEditar, onExcluir, onStatus }) {
    return (
        <article className={css.cardAula}>
            <div className={css.videoPreview}>
                {aula.video ? (
                    <video src={resolverUrlMidia(api, aula.video)} controls />
                ) : (
                    <FaPlay />
                )}
            </div>
            <div className={css.infoAula}>
                <div>
                    <h3>{aula.titulo}</h3>
                    <p>{aula.descricao}</p>
                    <span className={css.statusBadge}>{aula.status_nome}</span>
                </div>
                <div className={css.acoesCard}>
                    <button title="Editar aula" onClick={onEditar}><FaEdit /></button>
                    {aula.status !== STATUS_PUBLICADO && <button title="Publicar aula" onClick={() => onStatus(STATUS_PUBLICADO)}><FaUnlock /></button>}
                    {aula.status !== STATUS_PRIVADO && <button title="Privar aula" onClick={() => onStatus(STATUS_PRIVADO)}><FaLock /></button>}
                    <button title="Excluir aula" className={css.botaoExcluir} onClick={onExcluir}><FaTrash /></button>
                </div>
            </div>
        </article>
    );
}

function FormularioModal({ tipo, item, salvando, onFechar, onSalvar }) {
    const editando = Boolean(item);
    const [form, setForm] = useState({
        ...(tipo === "curso" ? cursoVazio : aulaVazia),
        titulo: item?.titulo || "",
        descricao: item?.descricao || ""
    });

    function enviar(evento) {
        evento.preventDefault();
        onSalvar(form);
    }

    const titulo = `${editando ? "Editar" : "Adicionar"} ${tipo}`;
    const arquivoLabel = tipo === "curso" ? "Enviar imagem" : "Enviar vídeo";
    const accept = tipo === "curso" ? "image/png,image/jpeg,image/webp" : "video/mp4,video/webm,video/ogg,video/quicktime";

    return (
        <div className={css.overlayModal}>
            <form className={css.modalFormulario} onSubmit={enviar}>
                <h2>{titulo}</h2>

                <label>
                    Título:
                    <input value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} required />
                </label>

                <label>
                    Descrição:
                    <textarea value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} required />
                </label>

                <label className={css.uploadBox}>
                    <FaUpload />
                    <span>{form.arquivo?.name || arquivoLabel}</span>
                    <input type="file" accept={accept} onChange={(e) => setForm({ ...form, arquivo: e.target.files[0] || null })} />
                </label>

                <div className={css.acoesModal}>
                    <button type="button" className={css.botaoSecundario} onClick={onFechar}>Cancelar</button>
                    <button type="submit" className={css.botaoPrimario} disabled={salvando}>
                        {salvando ? "Salvando..." : editando ? "Salvar" : "Adicionar"}
                    </button>
                </div>

                {tipo === "curso" && !editando && (
                    <p className={css.avisoModal}>Os cursos são cadastrados como privados. Publique quando estiver pronto.</p>
                )}
            </form>
        </div>
    );
}

function EstadoVazio({ texto }) {
    return (
        <div className={css.estadoVazio}>
            <FaBoxOpen />
            <p>{texto}</p>
        </div>
    );
}

function Rodape() {
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
                <ul className={css.listaApps}>
                    <li><FaGooglePlay /> Playstore</li>
                    <li><FaLinux /> Linux</li>
                    <li><FaWindows /> Windows</li>
                </ul>
            </div>
        </footer>
    );
}
