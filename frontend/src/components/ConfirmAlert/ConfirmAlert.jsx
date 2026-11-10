import { useEffect, useRef, useState } from "react";
import { FaExclamationTriangle } from "react-icons/fa";
import css from "./ConfirmAlert_38.module.css";

const ESPERA_CONFIRMACAO_MS = 1500;

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
                                         confirmarDesabilitado = false,
                                         children,
                                         aoCancelar,
                                         aoConfirmar
                                     }) {
    const [confirmacaoLiberada, setConfirmacaoLiberada] = useState(false);
    const liberarEm = useRef(Date.now() + ESPERA_CONFIRMACAO_MS);

    useEffect(() => {
        const timer = setTimeout(() => setConfirmacaoLiberada(true), Math.max(0, liberarEm.current - Date.now()));
        return () => clearTimeout(timer);
    }, []);

    function confirmar() {
        if (carregando || confirmarDesabilitado || Date.now() < liberarEm.current) return;
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
                {children}

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
                        className={`${css.confirmar} ${css[variante]} ${confirmacaoLiberada ? css.liberada : css.esperando}`}
                        style={{ '--espera-confirmacao': `${ESPERA_CONFIRMACAO_MS}ms` }}
                        onClick={confirmar}
                        disabled={carregando || confirmarDesabilitado || !confirmacaoLiberada}
                    >
                        <span className={css.textoConfirmar}>{carregando ? "Aguarde..." : textoConfirmar}</span>
                    </button>
                </div>
            </section>
        </div>
    );
}
