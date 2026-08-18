import React from 'react';
import { FaGraduationCap } from 'react-icons/fa';
import css from './MenuLateralAdm.module.css';

export default function MenuLateralAdm({ itemAtivo = 'inicio' }) {
    return (
        <aside className={css.menuLateral}>
            <div className={css.menuTopo}>
                <nav className={css.linksNavegacao}>
                    <a
                        href="#inicio"
                        className={`${css.linkItem} ${itemAtivo === 'inicio' ? css.ativo : ''}`}
                    >
                        Início
                    </a>
                    <a
                        href="#usuarios"
                        className={`${css.linkItem} ${itemAtivo === 'usuarios' ? css.ativo : ''}`}
                    >
                        Lista de Usuários
                    </a>
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