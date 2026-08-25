import { Link } from 'react-router-dom';
import css from './Button.module.css';

export default function Button({
                                  rota,
                                  state,
                                  fundoCor,
                                  tamanho,
                                  texto,
                                  efeito,
                                  borda,
                                  classe,
                                  onClick,
                                  tipo
                              }) {

    if (rota) {

        return (

            <Link
                to={rota}
                state={state}
                className={css.botao}
            >

                <button
                    type={tipo}
                    className={
                        css.botao + " " +
                        css[fundoCor] + " " +
                        css[borda] + " " +
                        css[tamanho] + " " +
                        css[efeito] + " " +
                        css[classe]
                    }
                    onClick={onClick}
                >
                    {texto}
                </button>

            </Link>
        );
    }

    return (

        <div className={css.botao}>

            <button
                type={tipo}
                className={
                    css.botao + " " +
                    css[fundoCor] + " " +
                    css[borda] + " " +
                    css[tamanho] + " " +
                    css[efeito] + " " +
                    css[classe]
                }
                onClick={onClick}
            >
                {texto}
            </button>

        </div>
    );
}