import css from "./CursoCard_38.module.css";
import CapaCurso from "../CapaCurso/CapaCurso.jsx";

const PLACEHOLDER_CURSO = "/imagens_banner_curso/Placholder.png";

export default function CursoCard({ imagem, alt, titulo, descricao }) {
    const imagemCurso = imagem || PLACEHOLDER_CURSO;

    return (
        <div className={css.cardAula}>
            <CapaCurso imagem={imagemCurso} titulo={alt || titulo} />

            <div className={css.infoAula}>
                <p className={css.titulo}>{titulo}</p>
                <p className={css.descricao}>{descricao}</p>
            </div>
        </div>
    );
}
