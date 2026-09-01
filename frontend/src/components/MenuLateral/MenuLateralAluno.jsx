import React from "react";
import { Link } from "react-router-dom";
import { FaGraduationCap } from "react-icons/fa";
import css from "./MenuLateralAluno.module.css";

export default function MenuLateralAluno({ itemAtivo = "inicio" }) {
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
