import { useEffect, useId, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { FaBars, FaTimes } from "react-icons/fa";
import css from "./MenuLateralDashboard.module.css";

export default function MenuLateralDashboard({ itens, itemAtivo = "inicio" }) {
    const [aberto, setAberto] = useState(false);
    const idNavegacao = useId();
    const location = useLocation();
    const paginaAtual = itens.find((item) => item.id === itemAtivo)?.texto || "Navegação";

    useEffect(() => {
        setAberto(false);
    }, [location.pathname]);

    useEffect(() => {
        if (!aberto) return undefined;
        function fecharComEscape(evento) {
            if (evento.key === "Escape") setAberto(false);
        }
        window.addEventListener("keydown", fecharComEscape);
        return () => window.removeEventListener("keydown", fecharComEscape);
    }, [aberto]);

    return (
        <aside className={css.menuLateral}>
            <div className={css.menuTopo}>
                <button
                    className={css.botaoMenu}
                    type="button"
                    aria-label={aberto ? "Fechar menu da dashboard" : "Abrir menu da dashboard"}
                    aria-expanded={aberto}
                    aria-controls={idNavegacao}
                    onClick={() => setAberto((valor) => !valor)}
                >
                    <span className={css.iconeMenu} aria-hidden="true">{aberto ? <FaTimes /> : <FaBars />}</span>
                    <span className={css.textoMenu}>{paginaAtual}</span>
                    <span className={css.indicacaoMenu}>Menu</span>
                </button>
                <nav id={idNavegacao} className={`${css.linksNavegacao} ${aberto ? css.linksAbertos : ""}`} aria-label="Menu da dashboard">
                    {itens.map((item) => (
                        <Link
                            key={item.id}
                            to={item.rota}
                            className={`${css.linkItem} ${itemAtivo === item.id ? css.ativo : ""}`}
                            aria-current={itemAtivo === item.id ? "page" : undefined}
                            onClick={() => setAberto(false)}
                        >
                            {item.texto}
                        </Link>
                    ))}
                </nav>
            </div>

            <div className={css.menuRodape}>
                <div className={css.logoBox}>
                    <img className={css.logoIcone} src="/imagens_assets/logo.png" alt="" />
                    <span className={css.logoTexto}>Cursando</span>
                </div>
            </div>
        </aside>
    );
}
