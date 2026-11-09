import React from 'react';
import css from '../../pages/Home/Home_38.module.css';
import CapaCurso from '../CapaCurso/CapaCurso.jsx';

const CartaoCurso = ({ imagem, alt, titulo, descricao }) => {
    return (
        <div className={css['cartao-curso']}>
            <CapaCurso imagem={imagem} titulo={alt || titulo} />
            <div className={css['conteudo-cartao']}>
                <h4>{titulo}</h4>
                <p>{descricao}</p>
            </div>
        </div>
    );
};

export default CartaoCurso;
