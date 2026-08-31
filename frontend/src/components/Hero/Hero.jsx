import React from 'react';
import css from '../../pages/Home/Home.module.css';
import Button from "../Button/Button.jsx";

const Hero = () => {
    return (
        <section className={css.banner}>
            <div className={css.bannerTextos}>
                <span className={css.span}>Sua jornada começa aqui</span>
                <h1>Um espaço para aprender e evoluir.</h1>
                <p>Encontre conteúdos que deixam seus estudos mais simples.</p>
            </div>
            <Button tamanho={"grande"} fundoCor={"verde"} texto={"Comece hoje"} rota={"/cadastro"} />
        </section>
    );
};

export default Hero;