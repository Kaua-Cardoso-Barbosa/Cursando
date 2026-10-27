import React from "react";
import { Link } from "react-router-dom";
import css from "./MenuLateralAluno_38.module.css";

export default
function MenuLateralAluno({ itemAtivo = "inicio" }) {
    return (
        <aside className={css.menuLateral}>
            <div className={css.menuTopo}>
                <nav className={css.linksNavegacao}>
                    <Link
                        to="/DashboardAluno"
                        className={`${css.linkItem} ${itemAtivo === "inicio" ? css.ativo : ""}`}
                    >
                        Início
                    </Link>
                    <Link
                        to="/DashboardAluno/cursos"
                        className={`${css.linkItem} ${itemAtivo === "meus-cursos" ? css.ativo : ""}`}
                    >
                        Meus cursos
                    </Link>
                    <Link
                        to="/DashboardAluno/descobrir"
                        className={`${css.linkItem} ${itemAtivo === "descobrir" ? css.ativo : ""}`}
                    >
                        Descobrir
                    </Link>
                                                                                                                               
                    <Link
                        to="/DashboardAluno/assinatura"
                        className={`${css.linkItem} ${itemAtivo === "assinatura" ? css.ativo : ""}`}
                    >
                        Assinatura
                    </Link>
                    <Link
                        to="/DashboardAluno/financeiro"
                        className={`${css.linkItem} ${itemAtivo === "financeiro" ? css.ativo : ""}`}
                    >
                        Financeiro
                    </Link>
                    <Link
                        to="/DashboardAluno/chat"
                        className={`${css.linkItem} ${itemAtivo === "chat" ? css.ativo : ""}`}
                    >
                        Chat
                    </Link>
                    {/* Sprint item 3 - Sincronizar dados entre aplicativo e sistema web - Conecta a navegação ao componente responsável por este item */}
                    <Link
                        to="/DashboardAluno/perfil"
                        className={`${css.linkItem} ${itemAtivo === "perfil" ? css.ativo : ""}`}
                    >
                        Perfil
                    </Link>
                    {/* Fim item 3 */}
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
