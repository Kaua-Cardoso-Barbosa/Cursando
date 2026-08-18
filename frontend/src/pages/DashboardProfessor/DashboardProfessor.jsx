import React from 'react';
import {
    FaGraduationCap,
    FaUsers,
    FaPlayCircle,
    FaFolderOpen,
    FaUser,
    FaGooglePlay,
    FaLinux,
    FaWindows
} from 'react-icons/fa';
import MenuLateralProf from '/src/components/MenuLateral/MenuLateralProf.jsx';
import css from './DashboardProfessor.module.css';

export default function DashboardProfessor({
                                               usuario = { nome: "Alicia Buzeli", tipo: "Professor(a)" },
                                               metricas = {
                                                   cursosCadastrados: { quantidade: 4, textoMes: "+1 nesse mês" },
                                                   totalAlunos: { quantidade: 38, textoMes: "+18 matrículas esse mês" },
                                                   aulasPublicadas: { quantidade: 16, textoMes: "10 vídeo-aulas esse mês" },
                                                   cursosRascunho: { quantidade: 2, textoMes: "Aguardando publicação" }
                                               },
                                               acessosRecentes = [
                                                   {
                                                       id: 1,
                                                       titulo: "Fotografia digital",
                                                       descricao: "Domine técnicas de luz e composição",
                                                       imagem: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?q=80&w=600&auto=format&fit=crop"
                                                   },
                                                   {
                                                       id: 2,
                                                       titulo: "Texto",
                                                       descricao: "Descrição Diferente",
                                                       imagem: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?q=80&w=600&auto=format&fit=crop"
                                                   },
                                                   {
                                                       id: 3,
                                                       titulo: "Texto",
                                                       descricao: "Descrição Diferente",
                                                       imagem: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?q=80&w=600&auto=format&fit=crop"
                                                   }
                                               ]
                                           }) {
    return (
        <div className={css.painelProfessor}>
            <MenuLateralProf itemAtivo="inicio" />

            <div className={css.conteudoPrincipal}>
                <main className={css.areaConteudo}>

                    <header className={css.cabecalhoUsuario}>
                        <div className={css.dadosUsuario}>
                            <h1>Olá {usuario.nome}</h1>
                            <span className={css.cargoUsuario}>{usuario.tipo}</span>
                        </div>

                        <div className={css.acoesUsuario}>
                            <button className={css.botaoSair}>Sair</button>
                            <div className={css.fotoPerfil}>
                                <FaUser />
                            </div>
                        </div>
                    </header>

                    <section className={css.secaoMetricas}>
                        <div className={css.gridMetricas}>
                            <div className={css.cardMetrica}>
                                <div className={css.metricaTopo}>
                                    <h2>Cursos cadastrados</h2>
                                    <div className={css.iconeBadge}>
                                        <FaGraduationCap />
                                    </div>
                                </div>
                                <span className={css.metricaVariacao}>{metricas.cursosCadastrados.textoMes}</span>
                                <div className={css.metricaNumero}>{metricas.cursosCadastrados.quantidade}</div>
                            </div>

                            <div className={css.cardMetrica}>
                                <div className={css.metricaTopo}>
                                    <h2>Total de alunos</h2>
                                    <div className={css.iconeBadge}>
                                        <FaUsers />
                                    </div>
                                </div>
                                <span className={css.metricaVariacao}>{metricas.totalAlunos.textoMes}</span>
                                <div className={css.metricaNumero}>{metricas.totalAlunos.quantidade}</div>
                            </div>

                            <div className={css.cardMetrica}>
                                <div className={css.metricaTopo}>
                                    <h2>Aulas publicadas</h2>
                                    <div className={css.iconeBadge}>
                                        <FaPlayCircle />
                                    </div>
                                </div>
                                <span className={css.metricaVariacao}>{metricas.aulasPublicadas.textoMes}</span>
                                <div className={css.metricaNumero}>{metricas.aulasPublicadas.quantidade}</div>
                            </div>

                            <div className={css.cardMetrica}>
                                <div className={css.metricaTopo}>
                                    <h2>Cursos em Rascunho</h2>
                                    <div className={css.iconeBadge}>
                                        <FaFolderOpen />
                                    </div>
                                </div>
                                <span className={css.metricaVariacao}>{metricas.cursosRascunho.textoMes}</span>
                                <div className={css.metricaNumero}>{metricas.cursosRascunho.quantidade}</div>
                            </div>
                        </div>
                    </section>

                    <section className={css.secaoAcessos}>
                        <h2>Acessos Recentes:</h2>
                        <div className={css.carrosselCursos}>
                            {acessosRecentes.map((curso) => (
                                <div key={curso.id} className={css.cardCurso}>
                                    <div className={css.containerImagem}>
                                        {curso.imagem ? (
                                            <img src={curso.imagem} alt={curso.titulo} className={css.imagemCurso} />
                                        ) : (
                                            <div className={css.placeholderImagem} />
                                        )}
                                    </div>
                                    <div className={css.infoCurso}>
                                        <h3>{curso.titulo}</h3>
                                        <p>{curso.descricao}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                </main>

                <footer className={css.rodapePagina}>
                    <div className={css.colunaRodape}>
                        <h4>Contato</h4>
                        <p>Birigui - SP</p>
                        <p>(18)98131-3801</p>
                        <p>cursando@gmail.com</p>
                    </div>

                    <div className={css.colunaRodape}>
                        <h4>Navegação</h4>
                        <a href="#home">Home</a>
                        <a href="#login">Login</a>
                        <a href="#cadastro">Cadastro</a>
                    </div>

                    <div className={css.colunaRodape}>
                        <h4>Baixe nosso aplicativo</h4>
                        <ul className={css.listaApps}>
                            <li><FaGooglePlay /> Playstore</li>
                            <li><FaLinux /> Linux</li>
                            <li><FaWindows /> Windows</li>
                        </ul>
                    </div>
                </footer>
            </div>
        </div>
    );
}