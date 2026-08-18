import React from 'react';
import {
    FaGraduationCap,
    FaUser,
    FaGooglePlay,
    FaLinux,
    FaWindows
} from 'react-icons/fa';
import MenuLateralAluno from '/src/components/MenuLateral/MenuLateralAluno.jsx';
import css from './DashboardAluno.module.css';

export default function DashboardAluno({
                                           usuario = { nome: "Gabriel Belinelo", tipo: "Aluno" },
                                           metricas = {
                                               inscritos: { quantidade: 6, textoMes: "+1 nesse mês" },
                                               finalizados: { quantidade: 2, textoMes: "+2 nesse mês" },
                                               iniciados: { quantidade: 1, textoMes: "+1 nesse mês" }
                                           },
                                           aulasRecentes = [
                                               {
                                                   id: 1,
                                                   titulo: "Texto 1",
                                                   descricao: "Descrição do card 1",
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
                                               },
                                               {
                                                   id: 4,
                                                   titulo: "Texto",
                                                   descricao: "Descrição Diferente",
                                                   imagem: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?q=80&w=600&auto=format&fit=crop"
                                               }
                                           ]
                                       }) {
    return (
        <div className={css.painelAluno}>
            <MenuLateralAluno itemAtivo="inicio" />

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
                        <div className={css.linhaMetricas}>
                            <div className={css.cardMetrica}>
                                <div className={css.metricaTopo}>
                                    <h2>Cursos inscritos</h2>
                                    <div className={css.iconeBadge}>
                                        <FaGraduationCap />
                                    </div>
                                </div>
                                <span className={css.metricaVariacao}>{metricas.inscritos.textoMes}</span>
                                <div className={css.metricaNumero}>{metricas.inscritos.quantidade}</div>
                            </div>

                            <div className={css.cardMetrica}>
                                <div className={css.metricaTopo}>
                                    <h2>Cursos finalizados</h2>
                                    <div className={css.iconeBadge}>
                                        <FaGraduationCap />
                                    </div>
                                </div>
                                <span className={css.metricaVariacao}>{metricas.finalizados.textoMes}</span>
                                <div className={css.metricaNumero}>{metricas.finalizados.quantidade}</div>
                            </div>
                        </div>

                        <div className={`${css.linhaMetricas} ${css.centralizado}`}>
                            <div className={css.cardMetrica}>
                                <div className={css.metricaTopo}>
                                    <h2>Cursos iniciados</h2>
                                    <div className={css.iconeBadge}>
                                        <FaGraduationCap />
                                    </div>
                                </div>
                                <span className={css.metricaVariacao}>{metricas.iniciados.textoMes}</span>
                                <div className={css.metricaNumero}>{metricas.iniciados.quantidade}</div>
                            </div>
                        </div>
                    </section>

                    <section className={css.secaoAulas}>
                        <h2>Últimas aulas vistas:</h2>
                        <div className={css.carrosselAulas}>
                            {aulasRecentes.map((aula) => (
                                <div key={aula.id} className={css.cardAula}>
                                    <div className={css.containerImagem}>
                                        {aula.imagem ? (
                                            <img src={aula.imagem} alt={aula.titulo} className={css.imagemAula} />
                                        ) : (
                                            <div className={css.placeholderImagem} />
                                        )}
                                    </div>
                                    <div className={css.infoAula}>
                                        <h3>{aula.titulo}</h3>
                                        <p>{aula.descricao}</p>
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