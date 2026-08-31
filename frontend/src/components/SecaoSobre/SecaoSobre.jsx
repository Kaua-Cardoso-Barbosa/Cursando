import React from 'react';
import css from '../../pages/Home/Home.module.css';

const SecaoSobre = () => {
    return (
        <section className={css['secao-sobre']}>
            <div className={css['sobre-texto']}>
                <h2>Por que escolher a Cursando?</h2>
                <p>
                    Na Cursando, aprender é simples, prático e acessível.
                    Oferecemos cursos online de qualidade para quem deseja
                    desenvolver novas habilidades, crescer profissionalmente
                    ou conquistar novos objetivos. Com conteúdos
                    atualizados, professores qualificados e uma plataforma
                    intuitiva, você tem a liberdade de estudar no seu ritmo, de
                    onde estiver e quando quiser.
                </p>
            </div>
            <div className={css['sobre-imagem']}>
                <img src="/imagens_assets/vale-a-pena-fazer-um-curso-online%201.png" alt="Aluna estudando" />
            </div>
        </section>
    );
};

export default SecaoSobre;