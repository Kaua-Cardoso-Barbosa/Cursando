import React from 'react';
import css from '../../pages/Home/Home_38.module.css';

const SecaoSobre = () => {
    return (
        <section className={css['secao-sobre']} aria-labelledby="sobre-home">
            <div className={css['sobre-texto']}>
                <span className={css.span}>DO SEU JEITO</span>
                <h2 id="sobre-home">Aprender pode fazer parte do seu dia.</h2>
                <p>Você escolhe o que quer descobrir. A Cursando organiza o caminho para você continuar, uma aula de cada vez.</p>
            </div>
            <ol className={css.etapas}>
                <li><span>01</span><div><h3>Encontre seu próximo interesse</h3><p>Explore os cursos e escolha o que faz sentido para seus objetivos.</p></div></li>
                <li><span>02</span><div><h3>Estude no seu ritmo</h3><p>Acompanhe as aulas e retome de onde parou, pelo site ou aplicativo.</p></div></li>
                <li><span>03</span><div><h3>Transforme estudo em conquista</h3><p>Pratique o que aprendeu e conquiste seu certificado após a aprovação na prova.</p></div></li>
            </ol>
        </section>
    );
};

export default SecaoSobre;
