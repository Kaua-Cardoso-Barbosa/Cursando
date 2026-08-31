import React from 'react';
import css from '../../pages/Home/Home.module.css';

const Botao = ({ texto, tipo, estiloAdicional }) => {
    const classeBotao = tipo === 'secundario' ? css['botao-secundario'] : css['botao-primario'];
    const classeExtra = estiloAdicional ? css[estiloAdicional] : '';

    return (
        <button className={`${css.botao} ${classeBotao} ${classeExtra}`}>
            {texto}
        </button>
    );
};

export default Botao;