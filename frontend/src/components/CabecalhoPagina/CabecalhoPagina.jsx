import css from './CabecalhoPagina.module.css';

export default function CabecalhoPagina({ etiqueta, titulo, descricao, acoes }) {
    return <header className={css.cabecalho}>
        <div>{etiqueta && <span className={css.etiqueta}>{etiqueta}</span>}
            <h2>{titulo}</h2>{descricao && <p>{descricao}</p>}
        </div>
        {acoes && <div className={css.acoes}>{acoes}</div>}
    </header>;
}
