import css from "./CursoCard_38.module.css";
import CapaCurso from "../CapaCurso/CapaCurso.jsx";

const PLACEHOLDER_CURSO = "/imagens_banner_curso/Placholder.png";

export default function CursoCard({ imagem, alt, titulo, descricao, onAbrir, capaExtra, status, metadados, acoes }) {
    const imagemCurso = imagem || PLACEHOLDER_CURSO;

    return (
        <article className={css.cardAula}>
            {onAbrir ? <button type="button" className={css.abrir} onClick={onAbrir} aria-label={`Abrir curso: ${titulo}`}>
                <CapaCurso imagem={imagemCurso} titulo={alt || titulo}>{capaExtra}</CapaCurso>
                <div className={css.infoAula}><h3 className={css.titulo}>{titulo}</h3><p className={css.descricao}>{descricao}</p></div>
            </button> : <><CapaCurso imagem={imagemCurso} titulo={alt || titulo}>{capaExtra}</CapaCurso>
                <div className={css.infoAula}><h3 className={css.titulo}>{titulo}</h3><p className={css.descricao}>{descricao}</p></div></>}
            {(status || metadados) && <div className={css.metadados}>{metadados}{status && <span className={css.status}>{status}</span>}</div>}
            {acoes && <div className={css.acoes}>{acoes}</div>}
        </article>
    );
}
