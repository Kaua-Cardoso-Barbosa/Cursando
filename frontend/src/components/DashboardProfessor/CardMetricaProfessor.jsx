import css from "../../pages/DashboardProfessor/DashboardProfessor.module.css";

export default function CardMetricaProfessor({ titulo, detalhe, valor, icone }) {
    return (
        <article className={css.cardMetrica}>
            <div className={css.metricaTopo}>
                <h2>{titulo}</h2>
                <div className={css.iconeBadge}>{icone}</div>
            </div>
            <span className={css.metricaVariacao}>{detalhe}</span>
            <strong className={css.metricaNumero}>{valor}</strong>
        </article>
    );
}
