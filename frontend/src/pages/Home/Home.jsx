import React, { useEffect, useState } from 'react';
import Hero from '../../components/Hero/Hero';
import SecaoCursos from '../../components/SecaoCursos/SecaoCursos';
import SecaoSobre from '../../components/SecaoSobre/SecaoSobre';
import SecaoPlanos from "../../components/SecaoPlanos/SecaoPlanos";
import Rodape from '../../components/Rodape/Rodape';
import css from './Home_38.module.css';
import { FiBookOpen, FiPlayCircle, FiAward } from 'react-icons/fi';

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
                        ? (/^https?:\/\//i.test(curso.imagem) ? curso.imagem : `${api.replace(/\/$/, '')}/${curso.imagem.replace(/^\//, '')}`)
                        : '/imagens_banner_curso/Placholder.png',
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
            <main className={css['conteudo-principal']}>
                <Hero />
                <div className={css.beneficios} aria-label="Como você aprende na Cursando">
                    <div><FiBookOpen aria-hidden="true" /><span><strong>Conhecimento para explorar</strong><small>Cursos para seus próximos objetivos</small></span></div>
                    <div><FiPlayCircle aria-hidden="true" /><span><strong>Sua rotina, seu ritmo</strong><small>Continue de onde parou</small></span></div>
                    <div><FiAward aria-hidden="true" /><span><strong>Aprendizado que se reconhece</strong><small>Certificado após aprovação na prova</small></span></div>
                </div>
                <SecaoCursos
                    id="cursos"
                    tituloPrincipal="O que você quer aprender hoje?"
                    subtitulo="CURSOS EM DESTAQUE"
                    descricao="Os cursos com mais inscrições nos últimos 7 dias."
                    cursos={cursos.destaques}
                    mensagemVazia={mensagemCursos}
                />
                <SecaoSobre />
                <SecaoCursos
                    tituloPrincipal="Encontre seu próximo passo"
                    subtitulo="MAIS ASSINADOS"
                    descricao="Os cursos com mais alunos inscritos de todos os tempos."
                    cursos={cursos.maisAssinados}
                    mensagemVazia={mensagemCursos}
                />
                <SecaoPlanos />
            </main>
            <Rodape />
        </div>
    );
};

export default Home;
