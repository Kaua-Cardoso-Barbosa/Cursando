import { useEffect, useRef, useState } from "react";
import css from "./GoogleChart.module.css";

let carregadorGoogleCharts;

// Sprint item 8 - Criar dashboard com gráficos para administrador e instrutor. carrega uma única vez o Google Charts e compartilha a biblioteca entre os painéis.
function carregarGoogleCharts() {
    if (window.google?.visualization) return Promise.resolve(window.google);

    if (!carregadorGoogleCharts) {
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
    }

    return carregadorGoogleCharts;
}

export default function GoogleChart({ data, options, titulo }) {
    const elementoGrafico = useRef(null);
    const [erro, setErro] = useState(false);

    useEffect(() => {
        let ativo = true;
        let grafico;
        let googleCarregado;

        // Sprint item 8 - Criar dashboard com gráficos para administrador e instrutor. desenha o gráfico com a largura real do contêiner e o atualiza ao redimensionar a página web.
        const desenharGrafico = async () => {
            try {
                googleCarregado = googleCarregado || await carregarGoogleCharts();
                const google = googleCarregado;
                if (!ativo || !elementoGrafico.current) return;

                const tabela = google.visualization.arrayToDataTable(data);
                const largura = Math.floor(elementoGrafico.current.getBoundingClientRect().width);
                if (largura <= 0) return;

                const altura = largura < 480 ? Math.max(240, Math.round(largura * 0.72)) : options.height;
                grafico = new google.visualization.ColumnChart(elementoGrafico.current);
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

        desenharGrafico();
        // Sprint item 8 - Criar dashboard com gráficos para administrador e instrutor. observa a área do gráfico para acompanhar telas estreitas e mudanças de orientação no site mobile.
        const observadorTamanho = typeof ResizeObserver === "undefined"
            ? null
            : new ResizeObserver(desenharGrafico);
        if (observadorTamanho && elementoGrafico.current) observadorTamanho.observe(elementoGrafico.current);
        else window.addEventListener("resize", desenharGrafico);

        return () => {
            ativo = false;
            observadorTamanho?.disconnect();
            window.removeEventListener("resize", desenharGrafico);
            grafico?.clearChart();
        };
    }, [data, options]);

    return (
        <section className={css.graficoGoogle} aria-label={titulo}>
            <h3>{titulo}</h3>
            {erro ? <p role="status">Não foi possível carregar o gráfico.</p> : <div ref={elementoGrafico} className={css.graficoGoogleCanvas} />}
        </section>
    );
}
