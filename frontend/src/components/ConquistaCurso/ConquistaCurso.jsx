import { FaBookOpen, FaSeedling, FaLayerGroup, FaStar, FaTrophy } from 'react-icons/fa';
import css from './ConquistaCurso.module.css';

export default function ConquistaCurso({ curso, imagem, onAbrir }) {
    const progresso = Math.max(0, Math.min(100, Number(curso.progresso) || 0));
    const todasAulasConcluidas = curso.total_aulas != null && curso.aulas_concluidas != null
        ? Number(curso.total_aulas) > 0 && Number(curso.aulas_concluidas) >= Number(curso.total_aulas)
        : progresso === 100;
    const concluido = todasAulasConcluidas && Boolean(curso.aprovado);
    const nivel = concluido ? 'concluido' : progresso >= 67 ? 'avancado' : progresso >= 34 ? 'intermediario' : progresso > 0 ? 'iniciante' : 'naoIniciado';
    const niveis = {
        naoIniciado: { texto: 'Não iniciado', Icone: FaBookOpen },
        iniciante: { texto: 'Iniciante', Icone: FaSeedling },
        intermediario: { texto: 'Intermediário', Icone: FaLayerGroup },
        avancado: { texto: 'Avançado', Icone: FaStar },
        concluido: { texto: 'Curso concluído', Icone: FaTrophy }
    };
    const { texto, Icone } = niveis[nivel];
    const conteudo = <>
        <span className={`${css.medalha} ${css[nivel]}`} style={{ '--progresso': `${progresso}%` }}>
            <img src={imagem || '/imagens_banner_curso/Placholder.png'} alt="" />
            <span className={css.selo}><Icone aria-hidden="true" /></span>
        </span>
        <strong className={css.nome}>{curso.titulo}</strong>
        <span className={css.estado}>{texto}</span>
        <span className={css.percentual}>{progresso}% das aulas concluídas</span>
        {progresso === 100 && !concluido && <small className={css.pendente}>{curso.aprovado ? 'Complete todas as aulas' : 'Aprovação na prova pendente'}</small>}
    </>;
    return <article className={css.conquista}>
        {onAbrir ? <button type="button" className={css.conteudo} aria-label={`Abrir curso: ${curso.titulo}`} onClick={onAbrir}>{conteudo}</button>
            : <div className={css.conteudo}>{conteudo}</div>}
    </article>;
}
