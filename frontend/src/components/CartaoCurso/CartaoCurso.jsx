import React from 'react';
import CursoCard from '../CursoCard/CursoCard.jsx';

const CartaoCurso = ({ imagem, alt, titulo, descricao }) => {
    return (
        <CursoCard imagem={imagem} alt={alt} titulo={titulo} descricao={descricao} />
    );
};

export default CartaoCurso;
