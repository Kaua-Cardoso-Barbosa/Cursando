import React from 'react';
import { FaGraduationCap } from 'react-icons/fa';
import css from './MenuLateralAdm.module.css';
import {Link} from "react-router-dom";

export default function MenuLateralAdm({ itemAtivo = 'inicio' }) {
    return (
        <aside className={css.menuLateral}>
            <div className={css.menuTopo}>
                <nav className={css.linksNavegacao}>
                    <Link to={"/DashboardAdm/"} className={`${css.linkItem} ${itemAtivo === 'inicio' ? css.ativo : ''}`}>Início</Link>
                    <Link to={"/DashboardAdm/GerenciamentoUsuarios"} className={`${css.linkItem} ${itemAtivo === 'usuarios' ? css.ativo : ''}`}>Gerenciar Usuários</Link>
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