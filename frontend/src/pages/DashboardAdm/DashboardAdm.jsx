import React from 'react';
import {
    FaGraduationCap,
    FaUser,
    FaPlay,
    FaFolder,
    FaGooglePlay,
    FaLinux,
    FaWindows
} from 'react-icons/fa';
import MenuLateralAdm from '/src/components/MenuLateral/MenuLateralAdm.jsx';
import css from './DashboardAdm.module.css';

export default function DashboardAdm({
                                         usuario = { nome: "Diogo Lopes", tipo: "Administrador" },
                                         metricas = [
                                             { id: 1, titulo: "Total de professores", textoMes: "+6 cadastros nesse mês", quantidade: 15, icone: <FaGraduationCap /> },
                                             { id: 2, titulo: "Total de alunos", textoMes: "+18 cadastros esse mês", quantidade: 38, icone: <FaUser /> },
                                             { id: 3, titulo: "Aulas publicadas", textoMes: "10 vídeo-aulas esse mês", quantidade: 16, icone: <FaPlay /> },
                                             { id: 4, titulo: "Cursos", textoMes: "+6 cursos criados esse mês", quantidade: 10, icone: <FaFolder /> }
                                         ]
                                     }) {
    return (
        <div className={css.painelAdm}>
            <MenuLateralAdm itemAtivo="inicio" />

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
                        {metricas.map((metrica) => (
                            <div key={metrica.id} className={css.cardMetrica}>
                                <div className={css.metricaTopo}>
                                    <h2>{metrica.titulo}</h2>
                                    <div className={css.iconeBadge}>{metrica.icone}</div>
                                </div>
                                <span className={css.metricaVariacao}>{metrica.textoMes}</span>
                                <div className={css.metricaNumero}>{metrica.quantidade}</div>
                            </div>
                        ))}
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