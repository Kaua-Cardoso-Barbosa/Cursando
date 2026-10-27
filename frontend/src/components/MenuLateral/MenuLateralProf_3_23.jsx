import React from "react";
import { Link } from "react-router-dom";
import css from "./MenuLateralProf_38.module.css";

export default function MenuLateralProf({ itemAtivo = "inicio" }) {
    return (
        <aside className={css.menuLateral}>
            <div className={css.menuTopo}>
                <nav className={css.linksNavegacao}>
                    <Link
                        to="/DashboardProfessor"
                        className={`${css.linkItem} ${itemAtivo === "inicio" ? css.ativo : ""}`}
                    >
                        Início
                    </Link>
                    <Link
                        to="/DashboardProfessor/cursos"
                        className={`${css.linkItem} ${itemAtivo === "meus-cursos" ? css.ativo : ""}`}
                    >
                        Meus cursos
                    </Link>
                    <Link
                        to="/DashboardProfessor/financeiro"
                        className={`${css.linkItem} ${itemAtivo === "financeiro" ? css.ativo : ""}`}
                    >
                        Financeiro
                    </Link>
                    <Link
                        to="/DashboardProfessor/chat"
                        className={`${css.linkItem} ${itemAtivo === "chat" ? css.ativo : ""}`}
                    >
                        Chat
                    </Link>
                    {/* Sprint item 23 - Exibir relatórios de alunos, cursos, módulos e horas assistidas - Conecta a navegação ao componente responsável por este item */}
                    <Link
                        to="/DashboardProfessor/relatorios"
                        className={`${css.linkItem} ${itemAtivo === "relatorios" ? css.ativo : ""}`}
                    >
                        Relatórios
                    </Link>
                    {/* Fim item 23 */}
                    {/* Sprint item 3 - Sincronizar dados entre aplicativo e sistema web - Conecta a navegação ao componente responsável por este item */}
                    <Link
                        to="/DashboardProfessor/perfil"
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
