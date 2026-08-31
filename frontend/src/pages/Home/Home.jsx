import React from 'react';
import Hero from '../../components/Hero/Hero';
import SecaoCursos from '../../components/SecaoCursos/SecaoCursos';
import SecaoSobre from '../../components/SecaoSobre/SecaoSobre';
import SecaoPlanos from '../../components/SecaoPlanos/SecaoPlanos';
import Rodape from '../../components/Rodape/Rodape';
import css from './Home.module.css';

const Home = () => {
    const cursosDestaque = [
        {
            imagem: "/imagens_banner_curso/fotografia.png",
            alt: "Fotografia digital",
            titulo: "Fotografia digital",
            descricao: "Domine técnicas de luz e composição",
        },
        {
            imagem: "/imagens_banner_curso/marketing.png",
            alt: "Marketing de Conteúdo",
            titulo: "Marketing de Conteúdo",
            descricao: "Estratégias para engajar seu público",
        },
        {
            imagem: "/imagens_banner_curso/design.png",
            alt: "Design",
            titulo: "Design",
            descricao: "Crie experiências visuais marcantes",
        },
    ];

    const cursosAssinados = [
        {
            imagem: "/imagens_banner_curso/inteligenciaartificial.png",
            alt: "Inteligência Artificial",
            titulo: "Inteligência Artificial",
            descricao: "Aprenda fundamentos de IA aplicada",
        },
        {
            imagem: "/imagens_banner_curso/ingles.png",
            alt: "Inglês Avançado",
            titulo: "Inglês Avançado",
            descricao: "Fluência para o mercado global",
        },
        {
            imagem: "/imagens_banner_curso/fotografia.png",
            alt: "Fotografia digital",
            titulo: "Fotografia digital",
            descricao: "Domine técnicas de luz e composição",
        },
    ];

    return (
        <div className={css['container-principal']}>
            <Hero />
            <main className={css['conteudo-principal']}>
                <SecaoCursos
                    tituloPrincipal="Os Cursos que Estão Transformando Carreiras"
                    subtitulo="Destaques"
                    cursos={cursosDestaque}
                />
                <SecaoSobre />
                <SecaoCursos
                    tituloPrincipal="Seu futuro começa agora. Assine!"
                    subtitulo="Mais Assinados"
                    cursos={cursosAssinados}
                />
            </main>
            <SecaoPlanos />
            <Rodape />
        </div>
    );
};

export default Home;