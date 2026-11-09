import { FaChevronRight } from 'react-icons/fa';
import css from './EtapaModulo.module.css';

export function ListaEtapasModulo({ children }) {
    return <ol className={css.lista} aria-label="Etapas do curso">{children}</ol>;
}

export default function EtapaModulo({ modulo, numero, onAbrir, status, children }) {
    const total = modulo.total_aulas ?? modulo.aulas?.length ?? 0;
    return <li className={css.etapa}>
        <span className={css.numero} aria-hidden="true">{numero}</span>
        <div className={css.cartao}>
            <button type="button" className={css.abrir} onClick={onAbrir} aria-label={`Abrir módulo ${numero}: ${modulo.titulo}`}>
                <span className={css.conteudo}>
                    <span className={css.rotulo}>Módulo {numero}</span>
                    <strong className={css.titulo}>{modulo.titulo}</strong>
                    {modulo.descricao && <span className={css.descricao}>{modulo.descricao}</span>}
                    <span className={css.detalhes}>{total} {Number(total) === 1 ? 'aula' : 'aulas'}{status ? ` · ${status}` : ''}</span>
                </span>
                <FaChevronRight className={css.seta} aria-hidden="true" />
            </button>
            {children}
        </div>
    </li>;
}
