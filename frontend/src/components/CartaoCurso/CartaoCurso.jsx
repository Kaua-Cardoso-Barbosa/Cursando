import React from 'react';
import css from '../../pages/Home/Home.module.css';

const CartaoCurso = ({ imagem, alt, titulo, descricao }) => {
    return (
        <div className={css['cartao-curso']}>
            <img src={imagem} alt={alt} />
            <div className={css['conteudo-cartao']}>
                <h4>{titulo}</h4>
                <p>{descricao}</p>
            </div>
        </div>
    );
};

export default CartaoCurso;