import React from 'react';
import { FaGraduationCap } from 'react-icons/fa';
import css from './MenuLateralProf.module.css';

export default function MenuLateralProf({ itemAtivo = 'inicio' }) {
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
                        href="#meus-cursos"
                        className={`${css.linkItem} ${itemAtivo === 'meus-cursos' ? css.ativo : ''}`}
                    >
                        Meus cursos
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