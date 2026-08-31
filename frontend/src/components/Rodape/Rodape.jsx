import React from 'react';
import css from '../../pages/Home/Home.module.css';

const Rodape = () => {
    return (
        <footer className={css['rodape-container']}>
            <div className={css['marca-rodape']}>
                <img src="" alt="Logo Cursando" />
                <span>Cursando</span>
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
                <a href="#">► Playstore</a>
                <a href="#">Δ Linux</a>
                <a href="#">■ Windows</a>
            </div>
        </footer>
    );
};

export default Rodape;