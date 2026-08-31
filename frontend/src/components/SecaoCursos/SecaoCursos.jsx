import React from 'react';
import CartaoCurso from '../CartaoCurso/CartaoCurso';
import css from '../../pages/Home/Home.module.css';

const SecaoCursos = ({ tituloPrincipal, subtitulo, cursos }) => {
    return (
        <section className={css['secao-cursos']}>
            <h2>{tituloPrincipal}</h2>
            <div className={css['cabecalho-secao-cursos']}>
                <h3>{subtitulo}</h3>
                <a href="#" className={css['link-ver-mais']}>Ver mais</a>
            </div>
            <div className={css['grid-cursos']}>
                {cursos.map((curso, index) => (
                    <CartaoCurso
                        key={index}
                        imagem={curso.imagem}
                        alt={curso.alt}
                        titulo={curso.titulo}
                        descricao={curso.descricao}
                    />
                ))}
            </div>
        </section>
    );
};

export default SecaoCursos;