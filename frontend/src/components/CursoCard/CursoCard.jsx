import css from "./CursoCard.module.css";

const PLACEHOLDER_CURSO = "/imagens_banner_curso/Placholder.png";

export default function CursoCard({ imagem, alt, titulo, descricao }) {
    const imagemCurso = imagem || PLACEHOLDER_CURSO;

    return (
        <div className={css.cardAula}>
            <div className={css.containerImagem}>
                <img
                    src={imagemCurso}
                    alt={alt || titulo}
                    className={css.imagemAula}
                />
            </div>

            <div className={css.infoAula}>
                <p className={css.titulo}>{titulo}</p>
                <p className={css.descricao}>{descricao}</p>
            </div>
        </div>
    );
}
