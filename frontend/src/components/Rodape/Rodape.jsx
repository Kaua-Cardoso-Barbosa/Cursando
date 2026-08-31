import React from 'react';
import css from './Rodape.module.css'

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
                <a href="#">Home</a>
                <a href="#">Login</a>
                <a href="#">Cadastro</a>
            </div>

            <div className={css['coluna-rodape']}>
                <h4>Baixe nosso aplicativo</h4>
                <a href="#">Playstore</a>
                <a href="#">Linux</a>
                <a href="#">Windows</a>
            </div>
        </footer>
    );
};

export default Rodape;