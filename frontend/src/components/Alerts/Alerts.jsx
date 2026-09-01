import { useCallback, useEffect, useState } from "react";
import css from "./Alerts.module.css";

export default function Alerts({
                                   titulo = "Aviso",
                                   descricao = "",
                                   imagem,
                                   tipo = "info",
                                   duracao = 5000,
                                   fechar
                               }) {
    const [visivel, setVisivel] = useState(true);
    const [saindo, setSaindo] = useState(false);

    const fecharAlerta = useCallback(() => {
        setSaindo(true);

        // Espera a animação terminar
        setTimeout(() => {
            setVisivel(false);

            if (fechar) {
                fechar();
            }
        }, 250);
    }, [fechar]);

    useEffect(() => {
        if (!duracao) return;

        const timer = setTimeout(() => {
            fecharAlerta();
        }, duracao);

        return () => clearTimeout(timer);
    }, [duracao, fecharAlerta]);

    if (!visivel) {
        return null;
    }

    return (
        <div
            className={`${css.alert} ${css[tipo]} ${saindo ? css.saindo : ""}`}
            role="alert"
        >
            {imagem && (
                <img
                    src={imagem}
                    alt=""
                    className={css.imagem}
                />
            )}

            <div className={css.conteudo}>
                <h4>{titulo}</h4>
                <p>{descricao}</p>
            </div>

            <button
                type="button"
                className={`${css.fechar} ${css[`fechar_${tipo}`] || ""}`}
                onClick={fecharAlerta}
                aria-label="Fechar alerta"
            >
                ×
            </button>
        </div>
    );
}
