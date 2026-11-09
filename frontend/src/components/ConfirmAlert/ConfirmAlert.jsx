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
    const [segundosRestantes, setSegundosRestantes] = useState(3);
    const liberarEm = useRef(Date.now() + 3000);

    useEffect(() => {
        const timer = setInterval(() => {
            const segundos = Math.max(0, Math.ceil((liberarEm.current - Date.now()) / 1000));
            setSegundosRestantes(segundos);
            if (segundos === 0) clearInterval(timer);
        }, 100);
        return () => clearInterval(timer);
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
                        disabled={carregando || segundosRestantes > 0}
                    >
                        {carregando ? "Aguarde..." : segundosRestantes > 0 ? `${textoConfirmar} (${segundosRestantes}s)` : textoConfirmar}
                    </button>
                </div>
            </section>
        </div>
    );
}
