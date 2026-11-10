import React from 'react';
import css from './Rodape_38.module.css'
import { Link } from 'react-router-dom';

const Rodape = () => {
    return (
        <footer className={css['rodape-container']}>
            <div className={css['marca-rodape']}>
                <img
                    src="/imagens_assets/logo.png"
                    alt="Logo Cursando"
                    className={css['logo-rodape']}
                />
                <span className={css.logoRodapeTexto}>Cursando</span>
            </div>

            <div className={css['coluna-rodape']}>
                <h4>Contato</h4>
                <p>Birigui - SP</p>
                <p>(18)98131-3801</p>
                <p>cursando@gmail.com</p>
            </div>

            <div className={css['coluna-rodape']}>
                <h4>Navegação</h4>
                <Link to="/">Home</Link>
                <Link to="/login">Login</Link>
                <Link to="/cadastro">Cadastro</Link>
            </div>

            <div className={css['coluna-rodape']}>
                <h4>Aprenda com a Cursando</h4>
                <p>Conhecimento para seus próximos passos.</p>
                <a href="#cursos">Explore os cursos</a>
            </div>
        </footer>
    );
};

export default Rodape;
