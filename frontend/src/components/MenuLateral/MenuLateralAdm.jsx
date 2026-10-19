import React from "react";
import { Link } from "react-router-dom";
import { FaGraduationCap } from "react-icons/fa";
import css from "./MenuLateralAdm.module.css";

export default function MenuLateralAdm({ itemAtivo = "inicio" }) {
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
                    {/* Sprint item 22: abre os relatórios gerais com filtros de período, instrutor e curso. */}
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
                        Logs
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
                    <FaGraduationCap className={css.logoIcone} />
                    <span className={css.logoTexto}>Cursando</span>
                </div>
            </div>
        </aside>
    );
}
