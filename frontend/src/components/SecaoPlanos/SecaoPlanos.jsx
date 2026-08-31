import React from 'react';
import CartaoPlano from '../CartaoPlano/CartaoPlano';
import css from '../../pages/Home/Home.module.css';

const SecaoPlanos = () => {
    const beneficiosMensal = [
        'Acesso a dezenas de cursos.',
        'Certificados de conclusão (se houver).'
    ];

    const beneficiosAnual = [
        'Acesso a dezenas de cursos.',
        'Certificados de conclusão (se houver).',
        'Economia em relação ao plano mensal.',
        'Prioridade em novos conteúdos.',
        'Assistir Offline'
    ];

    return (
        <section className={css['secao-planos']}>
            <h2>Experimente o Plus gratuitamente por 1 mês</h2>
            <div className={css['grid-planos']}>
                <CartaoPlano
                    titulo="Plano Mensal"
                    precoAtual="R$ 14,99 /mês"
                    descricao="A melhor opção para quem deseja economizar e estudar o ano inteiro."
                    beneficios={beneficiosMensal}
                />
                <CartaoPlano
                    titulo="Plano Anual"
                    popular={true}
                    precoAntigo="R$ 179,88 /ano"
                    precoAtual=" R$ 149,99 /ano"
                    descricao="A melhor opção para quem deseja economizar e estudar o ano inteiro."
                    beneficios={beneficiosAnual}
                />
            </div>
        </section>
    );
};

export default SecaoPlanos;