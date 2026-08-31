import React from 'react';
import css from '../../pages/Home/Home.module.css';

const Hero = () => {
    return (
        <section className={css.banner}>
            <img
                src="/imagens_assets/banner-garota.png"
                alt="Banner Assine Hoje"
                className={css['banner-imagem']}
            />
        </section>
    );
};

export default Hero;