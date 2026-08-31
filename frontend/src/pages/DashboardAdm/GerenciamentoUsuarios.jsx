import React, { useState, useEffect } from 'react';
import {
    FaUser,
    FaGooglePlay,
    FaLinux,
    FaWindows,
    FaSearch,
    FaPlus
} from 'react-icons/fa';
import MenuLateralAdm from "../../components/MenuLateral/MenuLateralAdm.jsx";
import css from './GerenciamentoUsuarios.module.css';
import Button from "../../components/Button/Button.jsx";
import CadastroColaborador from "../../components/CadastroColaborador/CadastroColaborador.jsx";

export default function GerenciamentoUsuarios({
                                                  api,
                                                  sair,
                                                  usuario,
                                                  setMensagem
                                              }) {

    const [alunos, setAlunos] = useState([]);
    const [professores, setProfessores] = useState([]);
    const [administradores, setAdministradores] = useState([]);

    const [loading, setLoading] = useState(true);
    const [erro, setErro] = useState(null);

    const [buscaAluno, setBuscaAluno] = useState('');
    const [buscaProfessor, setBuscaProfessor] = useState('');
    const [buscaAdmin, setBuscaAdmin] = useState('');

    const [popupCadastro, setPopupCadastro] = useState(null);

    useEffect(() => {
        carregarTodosUsuarios();
    }, []);

    function nomeTipoUsuario(tipo) {
        switch (Number(tipo)) {
            case 0:
                return "Administrador";

            case 1:
                return "Professor";

            case 2:
                return "Aluno";

            default:
                return "Usuário";
        }
    }

    const carregarTodosUsuarios = async () => {
        setLoading(true);
        setErro(null);

        try {
            const [resAlunos, resProfessores, resAdmins] = await Promise.all([
                fetch(`${api}/alunos`),
                fetch(`${api}/professores`),
                fetch(`${api}/administradores`)
            ]);

            if (!resAlunos.ok || !resProfessores.ok || !resAdmins.ok) {
                throw new Error('Falha ao carregar dados dos usuários.');
            }

            const dataAlunos = await resAlunos.json();
            const dataProfessores = await resProfessores.json();
            const dataAdmins = await resAdmins.json();

            setAlunos(dataAlunos);
            setProfessores(dataProfessores);
            setAdministradores(dataAdmins);
        } catch (err) {
            console.error(err);
            setErro('Erro ao conectar com o servidor. Exibindo dados locais.');

            setAlunos([
                { id: 1, nome: "Gabriel Belinelo da Silva", bloqueado: false },
                { id: 2, nome: "Cauã Barbosa", bloqueado: false },
                { id: 3, nome: "Rafael Melin", bloqueado: true },
                { id: 4, nome: "Henrique Figueiredo", bloqueado: false },
                { id: 5, nome: "Alicia Buzelli Costa", bloqueado: false },
            ]);
            setProfessores([
                { id: 1, nome: "Gabriel Belinelo da Silva Pops", bloqueado: false },
                { id: 2, nome: "Kauã Babosa Divo Pop Pops", bloqueado: false },
                { id: 3, nome: "Alicia Buzeli Costa Iconica Pops", bloqueado: false },
                { id: 4, nome: "Enrique Figueiredo Kirk Pops", bloqueado: false },
            ]);
            setAdministradores([
                { id: 1, nome: "Gabriel Belinelo Divo", bloqueado: false },
                { id: 2, nome: "Kauã Barbosa Pop", bloqueado: true },
                { id: 3, nome: "Diogo Lopes Nunes Iconico", bloqueado: false },
            ]);
        } finally {
            setLoading(false);
        }
    };

    const handleAlternarStatus = async (id, tipo, statusAtual) => {
        try {
            const response = await fetch(`${api}/${tipo}/${id}/status`, {
                method: 'PATCH',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    bloqueado: !statusAtual
                }),
            });

            if (!response.ok) throw new Error('Erro ao atualizar status');

            const atualizarLista = (lista) =>
                lista.map((u) => (u.id === id ? { ...u, bloqueado: !statusAtual } : u));

            if (tipo === 'alunos') setAlunos(atualizarLista);
            if (tipo === 'professores') setProfessores(atualizarLista);
            if (tipo === 'administradores') setAdministradores(atualizarLista);
        } catch (err) {
            console.error(`Erro ao alternar status em ${tipo}:`, err);
            const atualizarListaLocal = (lista) =>
                lista.map((u) => (u.id === id ? { ...u, bloqueado: !statusAtual } : u));
            if (tipo === 'alunos') setAlunos(atualizarListaLocal);
            if (tipo === 'professores') setProfessores(atualizarListaLocal);
            if (tipo === 'administradores') setAdministradores(atualizarListaLocal);
        }
    };

    const handleExcluir = async (id, tipo) => {
        if (!window.confirm('Tem certeza que deseja excluir este usuário?')) return;

        try {
            const response = await fetch(`${api}/${tipo}/${id}`, {
                method: 'DELETE',
                credentials: 'include'
            });

            if (!response.ok) throw new Error('Erro ao excluir usuário');

            const removerDaLista = (lista) => lista.filter((u) => u.id !== id);

            if (tipo === 'alunos') setAlunos(removerDaLista);
            if (tipo === 'professores') setProfessores(removerDaLista);
            if (tipo === 'administradores') setAdministradores(removerDaLista);
        } catch (err) {
            console.error(`Erro ao excluir de ${tipo}:`, err);
            const removerDaListaLocal = (lista) => lista.filter((u) => u.id !== id);
            if (tipo === 'alunos') setAlunos(removerDaListaLocal);
            if (tipo === 'professores') setProfessores(removerDaListaLocal);
            if (tipo === 'administradores') setAdministradores(removerDaListaLocal);
        }
    };

    const handleEditar = (id, tipo) => {
        console.log(`Editar ${tipo} - ID: ${id}`);
    };

    const handleAdicionar = (tipo) => {
        if (tipo === "professores") {
            setPopupCadastro(1);
        }

        if (tipo === "administradores") {
            setPopupCadastro(0);
        }
    };

    const alunosFiltrados = alunos.filter((u) =>
        u.nome.toLowerCase().includes(buscaAluno.toLowerCase())
    );
    const professoresFiltrados = professores.filter((u) =>
        u.nome.toLowerCase().includes(buscaProfessor.toLowerCase())
    );
    const adminsFiltrados = administradores.filter((u) =>
        u.nome.toLowerCase().includes(buscaAdmin.toLowerCase())
    );

    return (
        <div className={css.painelAdmin}>
            {popupCadastro !== null && (
                <CadastroColaborador
                    api={api}
                    tipo={popupCadastro}
                    fechar={() => setPopupCadastro(null)}
                    setMensagem={setMensagem}
                    aoCadastrar={carregarTodosUsuarios}
                />
            )}
            <MenuLateralAdm itemAtivo="usuarios" />

            <div className={css.conteudoPrincipal}>
                <main className={css.areaConteudo}>

                    <header className={css.cabecalhoUsuario}>
                        <div className={css.dadosUsuario}>
                            <h1>Olá {usuario.nome}</h1>

                            <span className={css.cargoUsuario}>
                                {nomeTipoUsuario(usuario.tipo)}
                            </span>
                        </div>

                        <div className={css.acoesUsuario}>
                            <Button
                                texto="Sair"
                                fundoCor="vermelho"
                                tamanho="pequeno"
                                onClick={sair}
                            />

                            <div className={css.fotoPerfil}>
                                <FaUser />
                            </div>
                        </div>
                    </header>

                    {erro && <div style={{ color: '#c90000', marginBottom: '16px' }}>{erro}</div>}
                    {loading && <div style={{ marginBottom: '16px' }}>Carregando dados...</div>}

                    <section className={css.secaoLista}>
                        <div className={css.topoSecao}>
                            <h2>Lista de Alunos:</h2>
                            <div className={css.campoBusca}>
                                <FaSearch className={css.iconeBusca} />
                                <input
                                    type="text"
                                    placeholder="Pesquisar em Alunos"
                                    value={buscaAluno}
                                    onChange={(e) => setBuscaAluno(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className={css.caixaTabela}>
                            {alunosFiltrados.map((item) => (
                                <div key={item.id} className={css.linhaUsuario}>
                                    <span className={css.nomeUsuario}>{item.nome}</span>
                                    <div className={css.grupoBotoes}>
                                        <button
                                            onClick={() => handleAlternarStatus(item.id, 'alunos', item.bloqueado)}
                                            className={item.bloqueado ? css.btnDesbloquear : css.btnBloquear}
                                        >
                                            {item.bloqueado ? 'Desbloquear' : 'Bloquear'}
                                        </button>
                                        <button
                                            onClick={() => handleExcluir(item.id, 'alunos')}
                                            className={css.btnExcluir}
                                        >
                                            Excluir
                                        </button>
                                        <button
                                            onClick={() => handleEditar(item.id, 'alunos')}
                                            className={css.btnEditar}
                                        >
                                            Editar
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                    <section className={css.secaoLista}>
                        <div className={css.topoSecao}>
                            <div className={css.tituloComAdd}>
                                <h2>Lista de Professores:</h2>
                                <button
                                    onClick={() => handleAdicionar('professores')}
                                    className={css.btnIconeAdicionar}
                                    title="Adicionar Professor"
                                >
                                    <FaPlus />
                                </button>
                            </div>
                            <div className={css.campoBusca}>
                                <FaSearch className={css.iconeBusca} />
                                <input
                                    type="text"
                                    placeholder="Pesquisar em Professores"
                                    value={buscaProfessor}
                                    onChange={(e) => setBuscaProfessor(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className={css.caixaTabela}>
                            {professoresFiltrados.map((item) => (
                                <div key={item.id} className={css.linhaUsuario}>
                                    <span className={css.nomeUsuario}>{item.nome}</span>
                                    <div className={css.grupoBotoes}>
                                        <button
                                            onClick={() => handleAlternarStatus(item.id, 'professores', item.bloqueado)}
                                            className={item.bloqueado ? css.btnDesbloquear : css.btnBloquear}
                                        >
                                            {item.bloqueado ? 'Desbloquear' : 'Bloquear'}
                                        </button>
                                        <button
                                            onClick={() => handleExcluir(item.id, 'professores')}
                                            className={css.btnExcluir}
                                        >
                                            Excluir
                                        </button>
                                        <button
                                            onClick={() => handleEditar(item.id, 'professores')}
                                            className={css.btnEditar}
                                        >
                                            Editar
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                    <section className={css.secaoLista}>
                        <div className={css.topoSecao}>
                            <div className={css.tituloComAdd}>
                                <h2>Lista de Administradores:</h2>
                                <button
                                    onClick={() => handleAdicionar('administradores')}
                                    className={css.btnIconeAdicionar}
                                    title="Adicionar Administrador"
                                >
                                    <FaPlus />
                                </button>
                            </div>
                            <div className={css.campoBusca}>
                                <FaSearch className={css.iconeBusca} />
                                <input
                                    type="text"
                                    placeholder="Pesquisar em Administradores"
                                    value={buscaAdmin}
                                    onChange={(e) => setBuscaAdmin(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className={css.caixaTabela}>
                            {adminsFiltrados.map((item) => (
                                <div key={item.id} className={css.linhaUsuario}>
                                    <span className={css.nomeUsuario}>{item.nome}</span>
                                    <div className={css.grupoBotoes}>
                                        <button
                                            onClick={() => handleAlternarStatus(item.id, 'administradores', item.bloqueado)}
                                            className={item.bloqueado ? css.btnDesbloquear : css.btnBloquear}
                                        >
                                            {item.bloqueado ? 'Desbloquear' : 'Bloquear'}
                                        </button>
                                        <button
                                            onClick={() => handleExcluir(item.id, 'administradores')}
                                            className={css.btnExcluir}
                                        >
                                            Excluir
                                        </button>
                                        <button
                                            onClick={() => handleEditar(item.id, 'administradores')}
                                            className={css.btnEditar}
                                        >
                                            Editar
                                        </button>
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