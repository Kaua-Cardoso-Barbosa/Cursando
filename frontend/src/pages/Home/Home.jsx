import React, { useEffect, useState } from 'react';
import Hero from '../../components/Hero/Hero';
import SecaoCursos from '../../components/SecaoCursos/SecaoCursos';
import SecaoSobre from '../../components/SecaoSobre/SecaoSobre';
import SecaoPlanos from '../../components/SecaoPlanos/SecaoPlanos';
import Rodape from '../../components/Rodape/Rodape';
import css from './Home.module.css';

const Home = () => {
    const api = import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:5000`;
    const [cursos, setCursos] = useState({ destaques: [], maisAssinados: [] });
    const [carregando, setCarregando] = useState(true);
    const [erro, setErro] = useState(false);

    useEffect(() => {
        async function carregarCursos() {
            try {
                const resposta = await fetch(`${api}/cursos/home`);
                if (!resposta.ok) {
                    throw new Error('Não foi possível carregar os cursos da home.');
                }

                const dados = await resposta.json();
                const prepararCurso = (curso) => ({
                    ...curso,
                    imagem: curso.imagem
                        ? `${api.replace(/\/$/, '')}${curso.imagem}`
                        : '/imagens_assets/vale-a-pena-fazer-um-curso-online 1.png',
                    alt: curso.titulo,
                });

                setCursos({
                    destaques: (dados.destaques || []).map(prepararCurso),
                    maisAssinados: (dados.mais_assinados || []).map(prepararCurso),
                });
            } catch (erro) {
                console.error('Erro ao carregar cursos da home:', erro);
                setErro(true);
            } finally {
                setCarregando(false);
            }
        }

        carregarCursos();
    }, [api]);

    const mensagemCursos = carregando
        ? 'Carregando cursos...'
        : erro
            ? 'Não foi possível carregar os cursos.'
            : 'Nenhum curso disponível no momento.';

    return (
        <div className={css['container-principal']}>
            <Hero />
            <main className={css['conteudo-principal']}>
                <SecaoCursos
                    tituloPrincipal="Os Cursos que Estão Transformando Carreiras"
                    subtitulo="Destaques"
                    cursos={cursos.destaques}
                    mensagemVazia={mensagemCursos}
                />
                <SecaoSobre />
                <SecaoCursos
                    tituloPrincipal="Seu futuro começa agora. Assine!"
                    subtitulo="Mais Assinados"
                    cursos={cursos.maisAssinados}
                    mensagemVazia={mensagemCursos}
                />
            </main>
            <SecaoPlanos />
            <Rodape />
        </div>
    );
};

export default Home;