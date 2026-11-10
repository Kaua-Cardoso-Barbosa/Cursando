import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { urlPerfil } from '../../utils/perfil.js';
import { corAvaliacao } from '../../utils/avaliacao.js';
import { FaUserCircle, FaPlayCircle } from 'react-icons/fa';
import { useSessao } from '../../context/useSessao.js';
import BotaoVoltar from '../../components/BotaoVoltar/BotaoVoltar.jsx';
import Button from '../../components/Button/Button.jsx';
import Input from '../../components/Input/Input.jsx';
import CabecalhoPagina from '../../components/CabecalhoPagina/CabecalhoPagina.jsx';
import CursoCard from '../../components/CursoCard/CursoCard.jsx';
import PaginaIndisponivel from '../PaginaIndisponivel/PaginaIndisponivel.jsx';
import css from './Perfil.module.css';
import EditarPerfilModal from '../../components/PerfilUsuario/EditarPerfilModal.jsx';
import ConquistaCurso from '../../components/ConquistaCurso/ConquistaCurso.jsx';

const FILTROS = { busca: '', categoria: '', tema: '', avaliacao_min: '', ordem: 'recentes' };
const midia = (api, caminho) => !caminho ? '' : /^https?:\/\//i.test(caminho) ? caminho : `${api.replace(/\/$/, '')}/${caminho.replace(/^\//, '')}`;
const dataTexto = (data) => data ? new Date(data).toLocaleDateString('pt-BR') : '';

export default function Perfil({ api, embutido = false, setMensagem, onPerfilAtualizado }) {
    const { idUsuario: identificadorRota } = useParams();
    const { usuario: sessao, carregando: carregandoSessao, atualizarUsuario } = useSessao();
    const idUsuario = embutido ? sessao?.identificador : identificadorRota;
    const Container = embutido ? 'section' : 'main';
    const navigate = useNavigate();
    const location = useLocation();
    const [dados, setDados] = useState(null);
    const [form, setForm] = useState(FILTROS);
    const [filtros, setFiltros] = useState(FILTROS);
    const [pagina, setPagina] = useState(1);
    const [paginaAvaliacoes, setPaginaAvaliacoes] = useState(1);
    const [carregando, setCarregando] = useState(true);
    const [erro, setErro] = useState(null);
    const [tentativa, setTentativa] = useState(0);
    const [fotoFalhou, setFotoFalhou] = useState(false);
    const [editando, setEditando] = useState(false);
    const [filtrosAbertos, setFiltrosAbertos] = useState(null);
    const [todasAulas, setTodasAulas] = useState(false);
    const perfil = dados?.consulta === idUsuario ? dados.usuario : null;
    const professor = perfil?.tipo === 1;
    const mostrarFiltros = filtrosAbertos ?? professor;

    function voltar() {
        // O índice do React Router identifica páginas anteriores dentro do site,
        // sem confundir histórico de outro site com uma página de retorno válida.
        if (Number(window.history.state?.idx) > 0) {
            navigate(-1);
            return;
        }
        navigate(sessao ? Number(sessao.tipo) === 1 ? '/DashboardProfessor'
            : Number(sessao.tipo) === 0 ? '/DashboardAdm' : '/DashboardAluno' : '/', { replace: true });
    }

    useEffect(() => {
        if (/^\/perfil\/%40/i.test(location.pathname)) {
            navigate(urlPerfil(idUsuario) + location.search + location.hash, { replace: true, state: location.state });
        }
    }, [idUsuario, location.pathname, location.search, location.hash, location.state, navigate]);

    useEffect(() => {
        setForm(FILTROS); setFiltros(FILTROS); setPagina(1); setPaginaAvaliacoes(1); setFotoFalhou(false);
        setFiltrosAbertos(null); setTodasAulas(false);
    }, [idUsuario]);

    useEffect(() => {
        if (carregandoSessao || !idUsuario) return undefined;
        const controle = new AbortController();
        const timeout = window.setTimeout(() => controle.abort('timeout'), 15000);
        setCarregando(true); setErro(null);
        const params = new URLSearchParams({ ...filtros, pagina, pagina_avaliacoes: paginaAvaliacoes });
        async function carregar() {
            try {
                const resposta = await fetch(`${api}/perfis/${encodeURIComponent(idUsuario)}?${params}`, { credentials: 'include', signal: controle.signal });
                const retorno = await resposta.json().catch(() => ({}));
                if (!resposta.ok) {
                    const falha = new Error(retorno.mensagem?.descricao || retorno.mensagem || 'Não foi possível carregar este perfil.');
                    falha.status = resposta.status; throw falha;
                }
                if (!controle.signal.aborted) setDados(retorno);
            } catch (falha) {
                if (!controle.signal.aborted || controle.signal.reason === 'timeout') {
                    setDados(null); setErro({ status: falha.status || 0, mensagem: falha.message });
                }
            } finally {
                window.clearTimeout(timeout);
                if (!controle.signal.aborted || controle.signal.reason === 'timeout') setCarregando(false);
            }
        }
        carregar();
        return () => { window.clearTimeout(timeout); controle.abort(); };
    }, [api, idUsuario, filtros, pagina, paginaAvaliacoes, tentativa, carregandoSessao, sessao?.id_usuario]);

    if (erro?.status === 0 || erro?.status >= 500) return <PaginaIndisponivel aoTentarNovamente={() => setTentativa((n) => n + 1)} aoVoltar={voltar} />;
    if (erro) return <Container className={`${css.pagina} ${embutido ? css.embutido : ""}`}>{!embutido && <BotaoVoltar onClick={voltar} />}<section className={css.vazio}>
        <h1>{erro.status === 403 ? 'Perfil reservado' : erro.status === 401 ? 'Entre na sua conta' : erro.status === 404 ? 'Perfil não encontrado' : 'Não foi possível carregar o perfil'}</h1>
        <p>{erro.mensagem}</p>{!sessao && <Link className={css.link} to="/login">Entrar na conta</Link>}
    </section></Container>;
    if (!perfil) return <Container className={`${css.pagina} ${embutido ? css.embutido : ""}`}>{!embutido && <BotaoVoltar onClick={voltar} />}<p role="status">Carregando perfil...</p></Container>;

    const podeAbrir = !sessao || Number(sessao.tipo) === 2 || (Number(sessao.tipo) === 1 && perfil.proprio);
    const abrirCurso = (id) => navigate(Number(sessao?.tipo) === 1 ? `/DashboardProfessor/cursos/${id}/aulas` : `/DashboardAluno/descobrir/${id}`);
    const mudarCampo = (campo, valor) => setForm((anterior) => ({ ...anterior, [campo]: valor }));
    const limpar = () => { setForm(FILTROS); setFiltros(FILTROS); setPagina(1); };
    const paginar = (lista, mudar) => lista.paginas > 1 && <nav className={css.paginacao} aria-label="Paginação">
        <Button tipo="button" fundoCor="verde_escuro" disabled={carregando || lista.pagina <= 1} onClick={() => mudar(lista.pagina - 1)} texto="Anterior" />
        <span>Página {lista.pagina} de {lista.paginas}</span>
        <Button tipo="button" fundoCor="verde_escuro" disabled={carregando || lista.pagina >= lista.paginas} onClick={() => mudar(lista.pagina + 1)} texto="Próxima" />
    </nav>;

    return <Container className={`${css.pagina} ${embutido ? css.embutido : ""}`}>
        {!embutido && <BotaoVoltar onClick={voltar} />}
        <header className={`${css.apresentacao} ${professor ? css.apresentacaoProfessor : ""}`}>
            {perfil.imagem_perfil && !fotoFalhou ? <img className={css.avatar} src={midia(api, perfil.imagem_perfil)} alt={`Foto de ${perfil.nome}`} onError={() => setFotoFalhou(true)} /> : <FaUserCircle className={css.avatarVazio} aria-hidden="true" />}
            <div className={css.identidade}><span className={css.etiqueta}>{professor ? 'PROFESSOR' : 'ALUNO'}</span><h1>{perfil.nome}</h1>
                {perfil.arroba && <p className={css.arroba}>@{perfil.arroba}</p>}
                <p>{professor ? 'Conheça os cursos e acompanhe as aulas publicadas.' : 'Cursos, progresso de estudo e avaliações publicadas.'}</p>
                <div className={css.resumo}><span><strong>{dados.resumo.cursos}</strong> {professor ? 'cursos publicados' : 'cursos inscritos disponíveis'}</span>
                    {!professor && <span><strong>{dados.resumo.avaliacoes}</strong> avaliações publicadas</span>}</div>
            </div>
            {perfil.proprio && <button type="button" className={css.editar} onClick={() => setEditando(true)}>Editar perfil</button>}
        </header>
        {professor && dados.categorias.length > 0 && <div className={css.areas}><span>Áreas dos cursos</span>{dados.categorias.map((categoria) => <span key={categoria.id} className={css.area}>{categoria.nome}</span>)}</div>}
        <nav className={css.navegacao} aria-label="Seções do perfil">
            <a href="#cursos-perfil">{professor ? 'Cursos publicados' : 'Minha jornada'}</a>
            <a href={professor ? '#aulas-perfil' : '#avaliacoes-perfil'}>{professor ? 'Aulas recentes' : 'Avaliações publicadas'}</a>
        </nav>
        {!professor && <p className={css.nota}>O histórico de estudos é reservado ao próprio aluno e à administração. O percentual indica aulas concluídas; a conclusão do curso exige aprovação na prova.</p>}

        <section id="cursos-perfil" className={css.secao} aria-busy={carregando}>
            <CabecalhoPagina etiqueta={professor ? 'CATÁLOGO' : 'MEUS ESTUDOS'} titulo={professor ? 'Cursos publicados' : 'Sua jornada de aprendizado'} descricao={!professor ? 'Suas conquistas evoluem com as aulas. Complete 100% e passe na prova para conquistar a medalha final.' : 'Explore o catálogo e encontre o próximo assunto para aprender.'}
                acoes={<button type="button" aria-expanded={mostrarFiltros} aria-controls="filtros-perfil" onClick={() => setFiltrosAbertos(!mostrarFiltros)}>{mostrarFiltros ? 'Ocultar filtros' : 'Mostrar filtros'}</button>} />
            <form id="filtros-perfil" hidden={!mostrarFiltros} className={css.filtros} onSubmit={(e) => { e.preventDefault(); setPagina(1); setFiltros({ ...form }); }}>
                <Input tipoInp="search" htmlFor="busca-perfil" label="Buscar curso" placeholder="Título do curso" value={form.busca} funcao={(e) => mudarCampo('busca', e.target.value)} />
                <label>Categoria<select value={form.categoria} onChange={(e) => mudarCampo('categoria', e.target.value)}><option value="">Todas</option>{dados.categorias.map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}</select></label>
                <label>Tema<select value={form.tema} onChange={(e) => mudarCampo('tema', e.target.value)}><option value="">Todos</option>{dados.temas.map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}</select></label>
                <label>Avaliação mínima<select value={form.avaliacao_min} onChange={(e) => mudarCampo('avaliacao_min', e.target.value)}><option value="">Todas</option>{[1,2,3,4,5].map((n) => <option key={n} value={n}>{n} {n === 1 ? 'estrela' : 'estrelas'}</option>)}</select></label>
                <label>Ordenar por<select value={form.ordem} onChange={(e) => mudarCampo('ordem', e.target.value)}><option value="recentes">Mais recentes</option><option value="titulo">Título</option><option value="avaliacao">Melhor avaliação</option><option value="inscritos">Mais inscritos</option></select></label>
                <div className={css.acoesFiltros}><Button tipo="submit" fundoCor="verde_escuro" texto="Aplicar filtros" disabled={carregando} /><button type="button" className={css.limpar} onClick={limpar}>Limpar</button></div>
            </form>
            <p className={css.contagem} role="status">{carregando ? 'Atualizando cursos...' : `${dados.cursos.total} cursos encontrados`}</p>
            <div className={professor ? css.grade : css.gradeConquistas}>{dados.cursos.itens.map((curso) => professor
                ? <CursoCard key={curso.id} titulo={curso.titulo} descricao={curso.descricao}
                    imagem={midia(api, curso.imagem)} onAbrir={podeAbrir ? () => abrirCurso(curso.id) : undefined}
                    categoria={curso.categoria} avaliacao={curso.avaliacao_media} totalAulas={curso.total_aulas} />
                : <ConquistaCurso key={curso.id} curso={curso} imagem={midia(api, curso.imagem)}
                    onAbrir={podeAbrir ? () => abrirCurso(curso.id) : undefined} />)}</div>
            {!dados.cursos.itens.length && <p className={css.vazio}>Nenhum curso corresponde aos filtros selecionados.</p>}
            {paginar(dados.cursos, setPagina)}
        </section>

        {professor && <section id="aulas-perfil" className={css.secao}>
            <CabecalhoPagina etiqueta="NOVIDADES" titulo="Aulas publicadas mais recentes" descricao="O acesso às aulas depende da matrícula e da assinatura do aluno." />
            <div className={css.gradeAulas}>{(todasAulas ? dados.aulas_recentes : dados.aulas_recentes.slice(0,3)).map((aula) => <CursoCard key={aula.id}
                imagem={midia(api, aula.thumb) || '/imagens_banner_curso/Placholder.png'} titulo={aula.titulo}
                capaExtra={<span className={css.playAula}><FaPlayCircle aria-hidden="true" /></span>}
                metadados={<div className={css.metadadosAula}><strong>{aula.curso}</strong>{aula.modulo && <span>{aula.modulo}</span>}
                    {aula.data && <time dateTime={aula.data}>Adicionada em {dataTexto(aula.data)}</time>}</div>}
                rotuloAbrir={`Assistir aula: ${aula.titulo}`} onAbrir={!sessao || Number(sessao.tipo) === 2
                    ? () => navigate(`/DashboardAluno/aulas/${aula.id}`) : perfil.proprio ? () => abrirCurso(aula.id_curso) : undefined} />)}</div>
            {!dados.aulas_recentes.length && <p className={css.vazio}>Nenhuma aula publicada no momento.</p>}
            {dados.aulas_recentes.length > 3 && <div className={css.maisAulas}><Button tipo="button" fundoCor="verde_escuro"
                texto={todasAulas ? 'Mostrar menos aulas' : 'Ver mais aulas'} onClick={() => setTodasAulas(!todasAulas)} /></div>}
        </section>}

        {!professor && <section id="avaliacoes-perfil" className={css.secao} aria-busy={carregando}>
            <CabecalhoPagina etiqueta="OPINIÕES" titulo="Avaliações publicadas" />
            <div className={css.avaliacoes}>{dados.avaliacoes.itens.map((avaliacao) => <article className={css.avaliacao} key={avaliacao.id}>
                <div><h3>{avaliacao.curso}</h3><time dateTime={avaliacao.data}>{dataTexto(avaliacao.data)}</time></div>
                <span className={css.estrelas} style={{ color: corAvaliacao(avaliacao.nota) }} aria-label={`${avaliacao.nota} de 5 estrelas`}>{'★'.repeat(avaliacao.nota)}{'☆'.repeat(5-avaliacao.nota)} <small>{avaliacao.nota}/5</small></span>
                <p>{avaliacao.comentario || 'Avaliação sem comentário.'}</p>
            </article>)}</div>
            {!dados.avaliacoes.itens.length && <p className={css.vazio}>Nenhuma avaliação publicada ainda.</p>}
            {paginar(dados.avaliacoes, setPaginaAvaliacoes)}
        </section>}
        {editando && <EditarPerfilModal api={api} aoFechar={() => setEditando(false)} setMensagem={setMensagem}
            aoSalvar={(novoPerfil) => {
                atualizarUsuario(novoPerfil);
                onPerfilAtualizado?.(novoPerfil);
                setEditando(false);
                if (!embutido && novoPerfil.identificador && novoPerfil.identificador !== idUsuario) {
                    navigate(urlPerfil(novoPerfil.identificador), { replace: true });
                } else setTentativa((n) => n + 1);
            }} />}
    </Container>;
}
