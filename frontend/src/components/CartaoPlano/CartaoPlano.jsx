import React from 'react';
import { useNavigate } from 'react-router-dom';
import css from '../../pages/Home/Home.module.css';

const CartaoPlano = ({ titulo, popular, precoAntigo, precoAtual, descricao, beneficios }) => {
    const navigate = useNavigate();

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
            <div className={css['lista-beneficios']}>
                {beneficios.map((beneficio, index) => (
                    <li key={index}>{beneficio}</li>
                ))}
            </div>
            <div style={{ textAlign: 'center' }}>
                <button
                    className={`${css.botao} ${css['botao-primario']} ${css['botao-largo']}`}
                    type="button"
                    onClick={() => navigate('/assinatura')}
                >
                    Assinar Plano
                </button>
            </div>
        </div>
    );
};

export default CartaoPlano;