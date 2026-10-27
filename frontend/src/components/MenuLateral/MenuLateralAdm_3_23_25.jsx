import React from "react";
import { Link } from "react-router-dom";
import css from "./MenuLateralAdm_38.module.css";

export default
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
                                                                                                                                                                              
                    {/* Sprint item 23 - Exibir relatórios de alunos, cursos, módulos e horas assistidas - Conecta a navegação ao componente responsável por este item */}
                    <Link
                        to="/DashboardAdm/Relatorios"
                        className={`${css.linkItem} ${itemAtivo === "relatorios" ? css.ativo : ""}`}
                    >
                        Relatórios
                    </Link>
                    {/* Fim item 23 */}
                    {/* Sprint item 25 - Permitir acesso e relatórios dos logs somente para o administrador por data e usuário - Disponibiliza a consulta administrativa das ações registradas */}
                    <Link
                        to="/DashboardAdm/Logs"
                        className={`${css.linkItem} ${itemAtivo === "logs" ? css.ativo : ""}`}
                    >
                        Histórico de atividades
                    </Link>
                    {/* Fim item 25 */}
                    {/* Sprint item 3 - Sincronizar dados entre aplicativo e sistema web - Conecta a navegação ao componente responsável por este item */}
                    <Link
                        to="/DashboardAdm/perfil"
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
