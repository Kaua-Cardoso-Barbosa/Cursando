import React from 'react';
import css from '../../pages/Home/Home_38.module.css';
import Button from "../Button/Button.jsx";
import { FiArrowDown, FiCheck } from 'react-icons/fi';

const Hero = () => {
    return (
        <section className={css.banner} aria-labelledby="titulo-home">
            <div className={css.bannerTextos}>
                <span className={css.span}>APRENDA. PRATIQUE. EVOLUA.</span>
                <h1 id="titulo-home">Seu próximo passo começa <em>aprendendo.</em></h1>
                <p>Descubra novos interesses, desenvolva habilidades e faça do conhecimento parte da sua rotina. No seu tempo, de onde estiver.</p>
                <div className={css.heroAcoes}>
                    <Button fundoCor="verde_escuro" texto="Começar a aprender" rota="/cadastro" className={css.heroBotao} />
                    <a className={css.heroLink} href="#cursos">Explorar os cursos <FiArrowDown aria-hidden="true" /></a>
                </div>
                <div className={css.heroNota}><FiCheck aria-hidden="true" /> Aulas online para acompanhar no seu ritmo</div>
            </div>
            <figure className={css.heroVisual}>
                <img src="/imagens_assets/vale-a-pena-fazer-um-curso-online%201.png" alt="Aluna de fones de ouvido fazendo anotações enquanto estuda pelo notebook" width="640" height="456" fetchPriority="high" />
                <figcaption><span>UM TEMPO PARA VOCÊ</span><strong>Novas possibilidades, uma aula de cada vez.</strong></figcaption>
            </figure>
        </section>
    );
};

export default Hero;
