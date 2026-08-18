import { useState, useEffect } from "react";
import css from './Alerts.module.css';

export default function Alerts({
                                   titulo,
                                   descricao,
                                   imagem,
                                   tipo,
                                   duracao,
                                   fechar
                               }) {
    const [visivel, setVisivel] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => {
            setVisivel(false);
            fechar();
        }, duracao);

        return () => clearTimeout(timer);
    }, [duracao, fechar]);

    if (!visivel) return null;

    function fecharAlerta() {
        setVisivel(false);
        fechar();
    }

    return (
        <div className={`${css.alert} ${css[tipo]}`}>
            <img src={imagem} alt="icone alerta" />

            <div className={css.conteudo}>
                <h4>{titulo}</h4>
                <p>{descricao}</p>
            </div>

            <button
                className={`${css.fechar} ${css[`fechar_${tipo}`]} d-flex h-100 align-items-center`}
                onClick={fecharAlerta}
            >
                ✕
            </button>
        </div>
    );
}