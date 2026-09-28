import React from 'react';
import CartaoPlano from '../CartaoPlano/CartaoPlano';
import css from '../../pages/Home/Home.module.css';

const SecaoPlanos = () => {
    const beneficiosMensal = [
        'Acesso a dezenas de cursos.',
        'Certificados de conclusão (se houver).'
    ];

    return (
        <section className={css['secao-planos']}>
            <h2>Experimente o Plus gratuitamente por 1 mês</h2>
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