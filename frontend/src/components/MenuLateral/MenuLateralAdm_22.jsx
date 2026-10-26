import React from "react";
import { Link } from "react-router-dom";
import css from "./MenuLateralAdm_38.module.css";

export default /* Sprint item 22 - Criar relatórios com filtros por período, instrutor e curso */
function MenuLateralAdm({ itemAtivo = "inicio" }) {
    return (
        <aside className={css.menuLateral}>
            <div className={css.menuTopo}>
                <nav className={css.linksNavegacao}>
                    <Link
                        to="/DashboardAdm"
                        className={`${css.linkItem} ${itemAtivo === "inicio" ? css.ativo : ""}`}
                    >
                        Inicio
                    </Link>
                    <Link
                        to="/DashboardAdm/GerenciamentoUsuarios"
                        className={`${css.linkItem} ${itemAtivo === "usuarios" ? css.ativo : ""}`}
                    >
                        Gerenciar Usuarios
                    </Link>
                    <Link
                        to="/DashboardAdm/Financeiro"
                        className={`${css.linkItem} ${itemAtivo === "financeiro" ? css.ativo : ""}`}
                    >
                        Financeiro
                    </Link>
                                                                                                                                                                              
                    <Link
                        to="/DashboardAdm/Relatorios"
                        className={`${css.linkItem} ${itemAtivo === "relatorios" ? css.ativo : ""}`}
                    >
                        Relatórios
                    </Link>
                    <Link
                        to="/DashboardAdm/Logs"
                        className={`${css.linkItem} ${itemAtivo === "logs" ? css.ativo : ""}`}
                    >
                        Histórico de atividades
                    </Link>
                    <Link
                        to="/DashboardAdm/perfil"
                        className={`${css.linkItem} ${itemAtivo === "perfil" ? css.ativo : ""}`}
                    >
                        Perfil
                    </Link>
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
/* Fim item 22 */
