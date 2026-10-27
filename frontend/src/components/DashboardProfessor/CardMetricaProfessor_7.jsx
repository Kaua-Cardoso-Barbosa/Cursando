import css from "../../pages/DashboardProfessor/DashboardProfessor_38.module.css";

export default function CardMetricaProfessor({ titulo, detalhe, valor, icone }) {
    /* Sprint item 7 - Criar métricas para o instrutor: alunos, conclusões, módulos concluídos e horas assistidas - Apresenta o título, o valor e a descrição de uma métrica do instrutor */
    return (
        <article className={css.cardMetrica}>
            <div className={css.metricaTopo}>
                <h2>{titulo}</h2>
                {icone && <div className={css.iconeBadge} aria-hidden="true">{icone}</div>}
            </div>
            <span className={css.metricaVariacao}>{detalhe}</span>
            <strong className={css.metricaNumero}>{valor}</strong>
        </article>
    );
    /* Fim item 7 */
}
