import React from 'react';
import Botao from '../Botao/Botao';
import css from '../../pages/Home/Home.module.css';

const CartaoPlano = ({ titulo, popular, precoAntigo, precoAtual, descricao, beneficios }) => {
    return (
        <div className={css['cartao-plano']}>
            <h3>
                {titulo}
                {popular && <span className={css['tag-popular']}>(Mais Popular)</span>}
            </h3>
            <div className={css.precos}>
                {precoAntigo && <span className={css['preco-antigo']}>{precoAntigo}</span>}
                <p className={css['preco-atual']}>{precoAtual}</p>
            </div>
            <p className={css['descricao-plano']}>{descricao}</p>
            <ul className={css['lista-beneficios']}>
                {beneficios.map((beneficio, index) => (
                    <li key={index}>{beneficio}</li>
                ))}
            </ul>
            <div style={{ textAlign: 'center' }}>
                <Botao texto="Assinar Plano" tipo="primario" estiloAdicional="botao-largo" />
            </div>
        </div>
    );
};

export default CartaoPlano;