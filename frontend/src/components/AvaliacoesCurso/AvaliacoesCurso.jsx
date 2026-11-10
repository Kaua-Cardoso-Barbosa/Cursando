import { FaStar, FaUserCircle } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import { urlPerfil } from '../../utils/perfil.js';
import { corAvaliacao } from '../../utils/avaliacao.js';
import css from './AvaliacoesCurso.module.css';

export default function AvaliacoesCurso({ api, avaliacoes = [], total = avaliacoes.length, media, pagina = 1, paginas = 1, onPagina }) {
    const notaMedia = media ?? (avaliacoes.length ? avaliacoes.reduce((soma, item) => soma + Number(item.nota), 0) / avaliacoes.length : 0);
    return <section className={css.secao} aria-label="Avaliações do curso">
        <header className={css.cabecalho}>
            <h2>Avaliações do curso</h2>
            <p className={css.resumo}>
                <FaStar style={{ color: corAvaliacao(notaMedia) }} aria-hidden="true" />
                <strong>{Number(notaMedia).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}/5</strong>
                <span>· {total} {total === 1 ? 'avaliação' : 'avaliações'}</span>
            </p>
        </header>
        {avaliacoes.length ? <div className={css.lista}>
            {avaliacoes.map((avaliacao) => {
                const nota = Math.round(Math.max(0, Math.min(5, Number(avaliacao.nota) || 0)));
                const foto = avaliacao.imagem_perfil;
                const url = foto && (/^https?:\/\//i.test(foto) || foto.startsWith('/imagens_') ? foto : `${api}${foto}`);
                return <article key={avaliacao.id} className={css.comentario}>
                    <header className={css.autor}>
                        {url ? <img className={css.foto} src={url} alt="" /> : <FaUserCircle className={css.foto} aria-hidden="true" />}
                        {avaliacao.identificador ? <Link className={css.linkPerfil} to={urlPerfil(avaliacao.identificador)}>{avaliacao.nome || 'Aluno'}</Link> : <strong>{avaliacao.nome || 'Aluno'}</strong>}
                        <span className={css.nota} style={{ color: corAvaliacao(nota) }} aria-label={`${nota} de 5 estrelas`}>
                            <span aria-hidden="true">{'★'.repeat(nota)}{'☆'.repeat(5 - nota)}</span> <small>{nota}/5</small>
                        </span>
                    </header>
                    {avaliacao.data && <time className={css.data} dateTime={avaliacao.data}>{new Date(avaliacao.data).toLocaleDateString('pt-BR')}</time>}
                    <p>{avaliacao.comentario || 'Sem comentário escrito.'}</p>
                </article>;
            })}
        </div> : <p className={css.vazio}>Este curso ainda não recebeu avaliações.</p>}
        {paginas > 1 && onPagina && <nav className={css.paginacao} aria-label="Páginas de avaliações">
            <button type="button" disabled={pagina <= 1} onClick={() => onPagina(pagina - 1)}>Anterior</button>
            <span>Página {pagina} de {paginas}</span>
            <button type="button" disabled={pagina >= paginas} onClick={() => onPagina(pagina + 1)}>Próxima</button>
        </nav>}
    </section>;
}
