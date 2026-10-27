import { useEffect, useRef, useState } from "react";
import css from "./GoogleChart_38.module.css";

/* Sprint item 8 - Criar dashboard com gráficos para administrador e instrutor - Monta os gráficos e os indicadores do painel */
let carregadorGoogleCharts;
/* Fim item 8 */


function carregarGoogleCharts() {
    if (window.google?.visualization) return Promise.resolve(window.google);

    if (!carregadorGoogleCharts) {
        /* Sprint item 8 - Criar dashboard com gráficos para administrador e instrutor - Monta os gráficos e os indicadores do painel */
        carregadorGoogleCharts = new Promise((resolve, reject) => {
            const iniciarBiblioteca = () => {
                window.google.charts.load("current", { packages: ["corechart"] });
                window.google.charts.setOnLoadCallback(() => resolve(window.google));
            };

            if (window.google?.charts) {
                iniciarBiblioteca();
                return;
            }

            const scriptExistente = document.querySelector('script[src="https://www.gstatic.com/charts/loader.js"]');
            const script = scriptExistente || document.createElement("script");
            script.src = "https://www.gstatic.com/charts/loader.js";
            script.onload = iniciarBiblioteca;
            script.onerror = () => reject(new Error("Não foi possível carregar o Google Charts."));
            if (!scriptExistente) document.head.appendChild(script);
        }).catch((erro) => {
            carregadorGoogleCharts = null;
            throw erro;
        });
        /* Fim item 8 */
    }

    return carregadorGoogleCharts;
}

export default function GoogleChart({ data, options, titulo }) {
    const elementoGrafico = useRef(null);
    const [erro, setErro] = useState(false);

    useEffect(
() => {
        let ativo = true;
        let grafico;
        let googleCarregado;


        const desenharGrafico = async () => {
            try {
                /* Sprint item 8 - Criar dashboard com gráficos para administrador e instrutor - Monta os gráficos e os indicadores do painel */
                googleCarregado = googleCarregado || await carregarGoogleCharts();
                /* Fim item 8 */
                const google = googleCarregado;
                if (!ativo || !elementoGrafico.current) return;

                /* Sprint item 8 - Criar dashboard com gráficos para administrador e instrutor - Monta os gráficos e os indicadores do painel */
                const tabela = google.visualization.arrayToDataTable(data);
                /* Fim item 8 */
                const largura = Math.floor(elementoGrafico.current.getBoundingClientRect().width);
                if (largura <= 0) return;

                const altura = largura < 480 ? Math.max(240, Math.round(largura * 0.72)) : options.height;
                /* Sprint item 8 - Criar dashboard com gráficos para administrador e instrutor - Monta os gráficos e os indicadores do painel */
                grafico = new google.visualization.ColumnChart(elementoGrafico.current);
                /* Fim item 8 */
                grafico.draw(tabela, {
                    ...options,
                    width: largura,
                    height: altura,
                    hAxis: { ...options.hAxis, slantedText: largura < 480, slantedTextAngle: 35 }
                });
                setErro(false);
            } catch {
                if (ativo) setErro(true);
            }
        };

        /* Sprint item 8 - Criar dashboard com gráficos para administrador e instrutor - Monta os gráficos e os indicadores do painel */
        desenharGrafico();
        /* Fim item 8 */

        /* Sprint item 8 - Criar dashboard com gráficos para administrador e instrutor - Monta os gráficos e os indicadores do painel */
        const observadorTamanho = typeof ResizeObserver === "undefined"
            ? null
            : new ResizeObserver(desenharGrafico);
        /* Fim item 8 */
        /* Sprint item 8 - Criar dashboard com gráficos para administrador e instrutor - Monta os gráficos e os indicadores do painel */
        if (observadorTamanho && elementoGrafico.current) observadorTamanho.observe(elementoGrafico.current);
        else window.addEventListener("resize", desenharGrafico);
        /* Fim item 8 */

        return () => {
            ativo = false;
            /* Sprint item 8 - Criar dashboard com gráficos para administrador e instrutor - Monta os gráficos e os indicadores do painel */
            observadorTamanho?.disconnect();
            /* Fim item 8 */
            /* Sprint item 8 - Criar dashboard com gráficos para administrador e instrutor - Monta os gráficos e os indicadores do painel */
            window.removeEventListener("resize", desenharGrafico);
            /* Fim item 8 */
            grafico?.clearChart();
        };
    }
, [data, options]);

    return (
        <section className={css.graficoGoogle} aria-label={titulo}>
            <h3>{titulo}</h3>
            {erro ? <p role="status">Não foi possível carregar o gráfico.</p> : <div ref={elementoGrafico} className={css.graficoGoogleCanvas} />}
        </section>
    );
}
