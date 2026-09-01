import { FaExclamationTriangle } from "react-icons/fa";
import css from "./ConfirmAlert.module.css";

export default function ConfirmAlert({
                                         aberto,
                                         titulo = "Confirmar ação",
                                         descricao,
                                         textoCancelar = "Cancelar",
                                         textoConfirmar = "Confirmar",
                                         variante = "perigo",
                                         carregando = false,
                                         aoCancelar,
                                         aoConfirmar
                                     }) {
    if (!aberto) {
        return null;
    }

    return (
        <div className={css.overlay} role="presentation" onMouseDown={aoCancelar}>
            <section
                className={css.alerta}
                role="dialog"
                aria-modal="true"
                aria-labelledby="confirm-alert-title"
                onMouseDown={(evento) => evento.stopPropagation()}
            >
                <FaExclamationTriangle className={css.icone} aria-hidden="true" />

                <h2 id="confirm-alert-title">{titulo}</h2>
                {descricao && <p>{descricao}</p>}

                <div className={css.acoes}>
                    <button
                        type="button"
                        className={css.cancelar}
                        onClick={aoCancelar}
                        disabled={carregando}
                    >
                        {textoCancelar}
                    </button>
                    <button
                        type="button"
                        className={`${css.confirmar} ${css[variante]}`}
                        onClick={aoConfirmar}
                        disabled={carregando}
                    >
                        {carregando ? "Aguarde..." : textoConfirmar}
                    </button>
                </div>
            </section>
        </div>
    );
}
