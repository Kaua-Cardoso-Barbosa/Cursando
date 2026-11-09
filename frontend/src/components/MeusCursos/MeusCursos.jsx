import { FaGraduationCap } from 'react-icons/fa';
import css from './MeusCursos.module.css';
import CabecalhoPagina from '../CabecalhoPagina/CabecalhoPagina.jsx';

export default function MeusCursos({ descricao, acoes, filtros, carregando, vazio, mensagemVazia, children }) {
    return <section className={css.pagina}>
        <CabecalhoPagina etiqueta="MEUS CURSOS" titulo="Meus cursos" descricao={descricao} acoes={acoes} />
        {filtros && <div className={css.filtros}>{filtros}</div>}
        {carregando && <p className={css.mensagem} role="status">Carregando cursos...</p>}
        {!carregando && vazio && <div className={css.vazio}><FaGraduationCap aria-hidden="true" /><p>{mensagemVazia}</p></div>}
        <div className={css.grade}>{children}</div>
    </section>;
}
