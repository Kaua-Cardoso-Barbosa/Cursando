import css from "./CursoCard_38.module.css";
import CapaCurso from "../CapaCurso/CapaCurso.jsx";
import { FaBookOpen, FaStar } from 'react-icons/fa';
import { corAvaliacao } from '../../utils/avaliacao.js';

const PLACEHOLDER_CURSO = "/imagens_banner_curso/Placholder.png";

export default function CursoCard({ imagem, alt, titulo, descricao, onAbrir, capaExtra, status, metadados, acoes, rotuloAbrir, categoria, avaliacao, professor, totalAulas }) {
    const imagemCurso = imagem || PLACEHOLDER_CURSO;

    return (
        <article className={css.cardAula}>
            {onAbrir ? <button type="button" className={css.abrir} onClick={onAbrir} aria-label={rotuloAbrir || `Abrir curso: ${titulo}`}>
                <CapaCurso imagem={imagemCurso} titulo={alt || titulo}>{capaExtra}</CapaCurso>
                <div className={css.infoAula}><h3 className={css.titulo}>{titulo}</h3>{descricao && <p className={css.descricao}>{descricao}</p>}</div>
            </button> : <div className={css.abrir}><CapaCurso imagem={imagemCurso} titulo={alt || titulo}>{capaExtra}</CapaCurso>
                <div className={css.infoAula}><h3 className={css.titulo}>{titulo}</h3>{descricao && <p className={css.descricao}>{descricao}</p>}</div></div>}
            {professor && <p className={css.professor}>{professor}</p>}
            {(categoria || avaliacao != null || totalAulas != null) && <div className={css.detalhes}>
                {categoria && <span className={css.categoria}>{categoria}</span>}
                {avaliacao != null && <span className={css.avaliacao} style={{ '--cor-avaliacao': corAvaliacao(avaliacao) }} aria-label={`Avaliação: ${Number(avaliacao).toLocaleString('pt-BR')} de 5`}><FaStar aria-hidden="true" /> {Number(avaliacao).toLocaleString('pt-BR')} <small>/ 5</small></span>}
                {totalAulas != null && <span><FaBookOpen aria-hidden="true" /> {totalAulas} {Number(totalAulas) === 1 ? 'aula' : 'aulas'}</span>}
            </div>}
            {(status || metadados) && <div className={css.metadados}>{metadados}{status && <span className={css.status}>{status}</span>}</div>}
            {acoes && <div className={css.acoes}>{acoes}</div>}
        </article>
    );
}
