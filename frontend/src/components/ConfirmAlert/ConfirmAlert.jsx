import { useEffect, useRef, useState } from "react";
import { FaExclamationTriangle } from "react-icons/fa";
import css from "./ConfirmAlert_38.module.css";

export default function ConfirmAlert(props) {
    // Montar novamente reinicia a espera a cada abertura do diálogo.
    return props.aberto ? <DialogoConfirmacao {...props} /> : null;
}

function DialogoConfirmacao({
                                         titulo = "Confirmar ação",
                                         descricao,
                                         textoCancelar = "Cancelar",
                                         textoConfirmar = "Confirmar",
                                         variante = "perigo",
                                         carregando = false,
                                         aoCancelar,
                                         aoConfirmar
                                     }) {
    const [confirmacaoLiberada, setConfirmacaoLiberada] = useState(false);
    const liberarEm = useRef(Date.now() + 1500);

    useEffect(() => {
        const timer = setTimeout(() => setConfirmacaoLiberada(true), Math.max(0, liberarEm.current - Date.now()));
        return () => clearTimeout(timer);
    }, []);

    function confirmar() {
        if (carregando || Date.now() < liberarEm.current) return;
        aoConfirmar?.();
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
                        onClick={confirmar}
                        disabled={carregando || !confirmacaoLiberada}
                    >
                        {carregando ? "Aguarde..." : textoConfirmar}
                    </button>
                </div>
            </section>
        </div>
    );
}
