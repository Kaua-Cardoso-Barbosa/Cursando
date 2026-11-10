import React from 'react';
import CartaoCurso from '../CartaoCurso/CartaoCurso';
import css from '../../pages/Home/Home_38.module.css';
import {Link} from "react-router-dom";

const SecaoCursos = ({ id, tituloPrincipal, subtitulo, descricao, cursos, mensagemVazia }) => {
    return (
        <section id={id} className={css['secao-cursos']}>
            <div className={css['cabecalho-secao-cursos']}>
                <div><span className={css.span}>{subtitulo}</span><h2>{tituloPrincipal}</h2>{descricao && <p className={css.descricaoSecao}>{descricao}</p>}</div>
                <Link to="/DashboardAluno/descobrir" className={css['link-ver-mais']}>Explorar catálogo <span aria-hidden="true">→</span></Link>
            </div>
            <div className={css['grid-cursos']}>
                {cursos.length === 0 ? (
                    <p className={css.estadoCursos} role="status">{mensagemVazia}</p>
                ) : cursos.map((curso, index) => (
                    <CartaoCurso
                        key={curso.id ?? index}
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
