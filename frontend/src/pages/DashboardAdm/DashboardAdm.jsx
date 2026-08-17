import React from 'react';
import css from './DashboardAdm.module.css';   // ← linha 2: nome do CSS corrigido

export default function DashboardAdm({          // ← nome da função também ajustado
                                         usuario = { nome: "Diogo Lopes", tipo: "Administrador" },
                                         metricas = [
                                             { id: 1, titulo: "Total de professores", textoMes: "+6 cadastros nesse mês", quantidade: 15, icone: "🎓" },
                                             { id: 2, titulo: "Total de alunos", textoMes: "+18  cadastros esse mês", quantidade: 38, icone: "👤" },
                                             { id: 3, titulo: "Aulas publicadas", textoMes: "10 vídeo-aulas esse mês", quantidade: 16, icone: "▶" },
                                             { id: 4, titulo: "Cursos", textoMes: "+6 cursos criados esse mês", quantidade: 10, icone: "📁" }
                                         ]
                                     }) {

    return (
        <div className={css.painelAdm}>
            {/* Menu Lateral */}
            <aside className={css.menuLateral}>
                <div className={css.menuTopo}>
                    <div className={css.logoBox}>
                        <div className={css.logoIcone}>🎓</div>
                        <span className={css.logoTexto}>Cursando</span>
                    </div>

                    <nav className={css.linksNavegacao}>
                        <a href="#inicio" className={`${css.linkItem} ${css.ativo}`}>Início</a>
                        <a href="#usuarios" className={css.linkItem}>Lista de Usuários</a>
                    </nav>
                </div>

                <div className={css.menuRodape}>
                    <div className={css.logoBox}>
                        <div className={css.logoIcone}>🎓</div>
                        <span className={css.logoTexto}>Cursando</span>
                    </div>
                </div>
            </aside>

            {/* Conteúdo Principal */}
            <div className={css.conteudoPrincipal}>
                <main className={css.areaConteudo}>

                    {/* Cabeçalho */}
                    <header className={css.cabecalhoUsuario}>
                        <div className={css.dadosUsuario}>
                            <h1>Olá {usuario.nome}</h1>
                            <span className={css.cargoUsuario}>{usuario.tipo}</span>
                        </div>

                        <div className={css.acoesUsuario}>
                            <button className={css.botaoSair}>Sair</button>
                            <div className={css.fotoPerfil}>
                                <span>👤</span>
                            </div>
                        </div>
                    </header>

                    {/* Métricas (Grid 2x2 igual a imagem) */}
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

                {/* Rodapé */}
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
                            <li>▶ Playstore</li>
                            <li>🐧 Linux</li>
                            <li>🪟 Windows</li>
                        </ul>
                    </div>
                </footer>
            </div>
        </div>
    );
}