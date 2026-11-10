import React from 'react';
import CartaoPlano from "../CartaoPlano/CartaoPlano";
import css from '../../pages/Home/Home_38.module.css';

const SecaoPlanos = () => {
    const beneficiosMensal = [
        'Acesso a dezenas de cursos.',
        'Certificados de conclusão (se houver).'
    ] ;

    return (
        <section className={css['secao-planos']} aria-labelledby="planos-home">
            <div className={css.introPlano}><span className={css.span}>CONTINUE EVOLUINDO</span>
            <h2 id="planos-home">Mais espaço para o que você quer aprender.</h2>
            <p>Conheça a assinatura e encontre seu próximo curso. Seu desenvolvimento começa com o primeiro passo.</p></div>
            <div className={css['grid-planos']}>
                <CartaoPlano
                    titulo="Plano Mensal"
                    precoAtual="Assinatura mensal"
                    descricao="Acesso completo à plataforma com renovação mensal."
                    beneficios={beneficiosMensal}
                />
            </div>
        </section>
    );
};

export default SecaoPlanos;
