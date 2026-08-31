import css from "./CursoCard.module.css";

export default function CursoCard({ imagem, alt, titulo, descricao }) {
    return (
        <div className={css.cardAula}>
            <div className={css.containerImagem}>
                {imagem ? (
                    <img
                        src={imagem}
                        alt={alt}
                        className={css.imagemAula}
                    />
                ) : (
                    <div className={css.placeholderImagem} />
                )}
            </div>

            <div className={css.infoAula}>
                <p className={css.titulo}>{titulo}</p>
                <p className={css.descricao}>{descricao}</p>
            </div>
        </div>
    );
}