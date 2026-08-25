import css from "./CursoCard.module.css";

export default function CursoCard({ imagem, alt, titulo, descricao }) {
  return (
    <article className={css.card}>
      <img className={css.imagem} src={imagem} alt={alt || titulo} />

      <div className={css.texto}>
        <h3>{titulo}</h3>
        <p>{descricao}</p>
      </div>
    </article>
  );
}
