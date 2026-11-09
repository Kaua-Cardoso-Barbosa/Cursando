import css from './CapaCurso.module.css';

export default function CapaCurso({ imagem, titulo = '', children }) {
    return <div className={css.capa}>
        <img className={css.imagem} src={imagem || '/imagens_banner_curso/Placholder.png'} alt={titulo} />
        {children}
    </div>;
}
