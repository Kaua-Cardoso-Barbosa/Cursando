import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    FaBookOpen,
    FaChartLine,
    FaCheckCircle,
    FaClock,
    FaFileInvoiceDollar,
    FaGooglePlay,
    FaLinux,
    FaPlus,
    FaSearch,
    FaWallet,
    FaWindows
} from "react-icons/fa";
import Button from "../../components/Button/Button.jsx";
import CadastroColaborador from "../../components/CadastroColaborador/CadastroColaborador.jsx";
import ConfirmAlert from "../../components/ConfirmAlert/ConfirmAlert.jsx";
import Input from "../../components/Input/Input.jsx";
import MenuLateralAdm from "../../components/MenuLateral/MenuLateralAdm_22.jsx";
import css from "./GerenciamentoUsuarios_38.module.css";

const TIPOS = {
    ALUNO: 2,
    PROFESSOR: 1,
    ADMIN: 0
};

function nomeTipoUsuario(tipo) {
    if (Number(tipo) === TIPOS.ADMIN) return "Administrador";
    if (Number(tipo) === TIPOS.PROFESSOR) return "Professor";
    if (Number(tipo) === TIPOS.ALUNO) return "Aluno";
    return "Usuario";
}

function normalizar(texto) {
    return String(texto || "").toLowerCase();
}

function moeda(valor) {
    return `R$ ${Number(valor || 0).toFixed(2).replace(".", ",")}`;
}

function dataBrasileira(valor) {
    if (!valor) return "—";
    const data = new Date(valor);
    return Number.isNaN(data.getTime()) ? "—" : data.toLocaleDateString("pt-BR");
}

export default /* Sprint item 9 - Exibir acessos aos cursos, compras realizadas e taxa de conversão */
/* Sprint item 35 - Calcular ticket médio por aluno */
function GerenciamentoUsuarios({
                                                  api,
                                                  usuario,
                                                  setMensagem
                                              }) {
    const [usuarios, setUsuarios] = useState([]);
    const [loading, setLoading] = useState(true);
    const [erro, setErro] = useState("");
    const [buscas, setBuscas] = useState({
        alunos: "",
        professores: "",
        administradores: ""
    });
    const [popupCadastro, setPopupCadastro] = useState(null);
    const [usuarioEditando, setUsuarioEditando] = useState(null);
    const [formEdicao, setFormEdicao] = useState({
        nome: "",
        email: "",
        cpf: "",
        senha: "",
        confirmar_senha: ""
    });
    const [salvandoEdicao, setSalvandoEdicao] = useState(false);
    const [confirmacao, setConfirmacao] = useState(null);
    const [perfilFinanceiroAluno, setPerfilFinanceiroAluno] = useState(null);

    const avisar = useCallback((mensagem) => {
        if (mensagem && setMensagem) {
            setMensagem(mensagem);
        }
    }, [setMensagem]);

    const lerResposta = useCallback(async (resposta) => {
        const dados = await resposta.json().catch(() => ({}));

        if (dados.mensagem) {
            avisar(dados.mensagem);
        }

        if (!resposta.ok) {
            throw new Error(dados?.mensagem?.descricao || "Erro ao conectar com a API.");
        }

        return dados;
    }, [avisar]);

    const carregarUsuarios = useCallback(async () => {
        setLoading(true);
        setErro("");

        try {
            const resposta = await fetch(`${api}/usuarios`, {
                credentials: "include"
            });
            const dados = await lerResposta(resposta);
            setUsuarios(Array.isArray(dados) ? dados : []);
        } catch (err) {
            console.error("Erro ao carregar usuarios:", err);
            setErro(err.message || "Erro ao carregar usuarios.");
            setUsuarios([]);
        } finally {
            setLoading(false);
        }
    }, [api, lerResposta]);

    useEffect(() => {
        carregarUsuarios();
    }, [carregarUsuarios]);

                                                                                     
                                                                                                 
    const grupos = useMemo(() => {
        const porTipo = {
            alunos: usuarios.filter((item) => Number(item.tipo) === TIPOS.ALUNO),
            professores: usuarios.filter((item) => Number(item.tipo) === TIPOS.PROFESSOR),
            administradores: usuarios.filter((item) => Number(item.tipo) === TIPOS.ADMIN)
        };

        return {
            alunos: porTipo.alunos.filter((item) => normalizar(item.nome).includes(normalizar(buscas.alunos))),
            professores: porTipo.professores.filter((item) => normalizar(item.nome).includes(normalizar(buscas.professores))),
            administradores: porTipo.administradores.filter((item) => normalizar(item.nome).includes(normalizar(buscas.administradores)))
        };
    }, [buscas, usuarios]);

                                                                                     
    async function alternarStatus(item) {
        try {
            const resposta = await fetch(`${api}/usuarios/${item.id}/status`, {
                method: "PATCH",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    bloqueado: !item.bloqueado
                })
            });

            await lerResposta(resposta);
            await carregarUsuarios();
        } catch (err) {
            console.error("Erro ao atualizar status:", err);
            avisar({ tipo: "erro", descricao: err.message });
        }
    }

    function abrirEdicao(item) {
        setUsuarioEditando(item);
        setFormEdicao({
            nome: item.nome || "",
            email: item.email || "",
            cpf: item.cpf || "",
            senha: "",
            confirmar_senha: ""
        });
    }

                                                                                                                                        
    async function abrirPerfilFinanceiroAluno(item) {
        setPerfilFinanceiroAluno({ carregando: true, aluno: { nome: item.nome, email: item.email } });
        try {
            const resposta = await fetch(`${api}/admin/alunos/${item.id}/financeiro`, { credentials: "include", cache: "no-store" });
            setPerfilFinanceiroAluno(await lerResposta(resposta));
        } catch (error) {
            setPerfilFinanceiroAluno({ erro: error.message, aluno: { nome: item.nome, email: item.email } });
        }
    }

    function fecharEdicao() {
        setUsuarioEditando(null);
        setFormEdicao({
            nome: "",
            email: "",
            cpf: "",
            senha: "",
            confirmar_senha: ""
        });
    }

                                                                          
    async function salvarEdicao(evento) {
        evento.preventDefault();
        setSalvandoEdicao(true);

        try {
            const resposta = await fetch(`${api}/usuarios/${usuarioEditando.id}`, {
                method: "PUT",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(formEdicao)
            });

            await lerResposta(resposta);
            fecharEdicao();
            await carregarUsuarios();
        } catch (err) {
            console.error("Erro ao editar usuario:", err);
            avisar({ tipo: "erro", descricao: err.message });
        } finally {
            setSalvandoEdicao(false);
        }
    }

    function abrirCadastro(tipo) {
        setPopupCadastro(tipo);
    }

    function atualizarBusca(chave, valor) {
        setBuscas((atual) => ({
            ...atual,
            [chave]: valor
        }));
    }

    function renderLista({ chave, titulo, placeholder, itens, podeAdicionar, tipoCadastro }) {
        return (
            <section className={css.secaoLista}>
                <div className={css.topoSecao}>
                    <div className={css.tituloComAdd}>
                        <h2>{titulo}</h2>
                        {podeAdicionar && (
                            <button
                                type="button"
                                onClick={() => abrirCadastro(tipoCadastro)}
                                className={css.btnIconeAdicionar}
                                title={`Adicionar ${tipoCadastro === TIPOS.ADMIN ? "Administrador" : "Professor"}`}
                            >
                                <FaPlus />
                            </button>
                        )}
                    </div>

                    <div className={css.campoBusca}>
                        <FaSearch className={css.iconeBusca} />
                        <input
                            type="text"
                            placeholder={placeholder}
                            value={buscas[chave]}
                            onChange={(e) => atualizarBusca(chave, e.target.value)}
                        />
                    </div>
                </div>

                <div className={css.caixaTabela}>
                    {itens.length === 0 && (
                        <p className={css.estadoVazio}>Nenhum usuario encontrado.</p>
                    )}

                    {itens.map((item) => (
                        <div key={item.id} className={css.linhaUsuario}>
                            <div className={css.dadosLinhaUsuario}>
                                <span className={css.nomeUsuario}>{item.nome}</span>
                                <span className={css.emailUsuario}>{item.email}</span>
                            </div>

                            {Number(item.id) === Number(usuario.id_usuario) ? (
                                <span className={css.avisoPropriaConta}>Use o Perfil para editar sua conta</span>
                            ) : (
                                <div className={css.grupoBotoes}>
                                    {chave === "alunos" && (
                                        <button type="button" className={css.btnPerfilAluno} onClick={() => abrirPerfilFinanceiroAluno(item)}>
                                            Ver perfil
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => alternarStatus(item)}
                                        className={item.bloqueado ? css.btnDesbloquear : css.btnBloquear}
                                    >
                                        {item.bloqueado ? "Desbloquear" : "Bloquear"}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => abrirEdicao(item)}
                                        className={css.btnEditar}
                                    >
                                        Editar
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </section>
        );
    }

    return (
        <div className={css.painelAdmin}>
            {perfilFinanceiroAluno && (
                <div className={css.overlayModal} onClick={() => setPerfilFinanceiroAluno(null)}>
                    <section className={`${css.modalEdicao} ${css.modalFinanceiroAluno}`} role="dialog" aria-modal="true" aria-labelledby="titulo-perfil-aluno" onClick={(evento) => evento.stopPropagation()}>
                        <button type="button" className={css.fecharModal} onClick={() => setPerfilFinanceiroAluno(null)} aria-label="Fechar perfil">×</button>
                        <header className={css.cabecalhoPerfilAluno}>
                            <span className={css.sobretituloPerfilAluno}>Visão administrativa</span>
                            <h2 id="titulo-perfil-aluno">Perfil do aluno</h2>
                            <p className={css.identificacaoAluno}>{perfilFinanceiroAluno.aluno?.nome} · {perfilFinanceiroAluno.aluno?.email}</p>
                        </header>
                        {perfilFinanceiroAluno.carregando ? <p>Carregando dados do aluno...</p> : null}
                        {perfilFinanceiroAluno.erro ? <p className={css.erro}>{perfilFinanceiroAluno.erro}</p> : null}
                        {!perfilFinanceiroAluno.carregando && !perfilFinanceiroAluno.erro && (
                            <>
                                <div className={css.estadosPerfilAluno}>
                                    <span className={perfilFinanceiroAluno.aluno?.bloqueado ? css.estadoAtencao : css.estadoRegular}>
                                        Conta {perfilFinanceiroAluno.aluno?.bloqueado ? "bloqueada" : "ativa"}
                                    </span>
                                    <span className={perfilFinanceiroAluno.acesso_atual === "Ativo" ? css.estadoRegular : css.estadoAtencao}>
                                        Acesso: {perfilFinanceiroAluno.acesso_atual || "Não informado"}
                                    </span>
                                </div>
                                <section className={css.secaoPerfilAluno}>
                                    <h3>Dados da conta</h3>
                                    <dl className={css.dadosContaAluno}>
                                        <div><dt>ID do aluno</dt><dd>#{perfilFinanceiroAluno.aluno?.id}</dd></div>
                                        <div><dt>CPF</dt><dd>{perfilFinanceiroAluno.aluno?.cpf || "Não informado"}</dd></div>
                                        <div><dt>E-mail confirmado</dt><dd>{perfilFinanceiroAluno.aluno?.email_verificado == null ? "Não informado" : perfilFinanceiroAluno.aluno.email_verificado ? "Sim" : "Não"}</dd></div>
                                        <div><dt>Cadastro</dt><dd>{perfilFinanceiroAluno.aluno?.criado_em ? dataBrasileira(perfilFinanceiroAluno.aluno.criado_em) : "Data não registrada"}</dd></div>
                                    </dl>
                                </section>
                                <div className={css.metricasPerfilAluno}>
                                    <article><div className={css.topoMetricaAluno}><span>Total pago em mensalidades</span><FaWallet /></div><strong>{moeda(perfilFinanceiroAluno.total_pago)}</strong></article>
                                    <article><div className={css.topoMetricaAluno}><span>Ticket médio mensal</span><FaChartLine /></div><strong>{moeda(perfilFinanceiroAluno.ticket_medio)}</strong></article>
                                    <article><div className={css.topoMetricaAluno}><span>Faturas pagas</span><FaCheckCircle /></div><strong>{perfilFinanceiroAluno.faturas_pagas || 0}</strong></article>
                                    <article><div className={css.topoMetricaAluno}><span>Em aberto</span><FaFileInvoiceDollar /></div><strong>{moeda(perfilFinanceiroAluno.total_aberto)}</strong></article>
                                    <article><div className={css.topoMetricaAluno}><span>Aulas concluídas</span><FaClock /></div><strong>{perfilFinanceiroAluno.aulas_concluidas || 0}</strong></article>
                                </div>
                                <section className={css.secaoPerfilAluno}>
                                    <h3><FaBookOpen /> Cursos inscritos</h3>
                                    {(perfilFinanceiroAluno.cursos || []).map((curso) => (
                                        <div className={css.linhaPerfilAluno} key={curso.id}>
                                            <span>{curso.titulo}<small>Inscrição: {dataBrasileira(curso.data_inscricao)}</small></span><strong>{curso.progresso}% concluído</strong>
                                        </div>
                                    ))}
                                    {!(perfilFinanceiroAluno.cursos || []).length && <p>Nenhum curso inscrito.</p>}
                                </section>
                                <section className={css.secaoPerfilAluno}>
                                    <h3><FaFileInvoiceDollar /> Histórico de mensalidades</h3>
                                    {(perfilFinanceiroAluno.faturas || []).map((fatura) => (
                                        <div className={css.linhaPerfilAluno} key={fatura.id}>
                                            <span>Mensalidade #{fatura.id} · {fatura.status_label}<small>{fatura.data_pagamento ? `Pagamento: ${dataBrasileira(fatura.data_pagamento)}` : `Vencimento: ${dataBrasileira(fatura.data_vencimento || fatura.criado_em)}`}</small>{fatura.acesso_label && <small>{fatura.acesso_label}{fatura.data_expiracao ? ` ${fatura.acesso_label === "Acesso válido" ? "até" : "em"} ${dataBrasileira(fatura.data_expiracao)}` : ""}</small>}</span>
                                            <strong>{moeda(fatura.valor)}</strong>
                                        </div>
                                    ))}
                                    {!(perfilFinanceiroAluno.faturas || []).length && <p>Nenhuma mensalidade registrada.</p>}
                                </section>
                            </>
                        )}
                    </section>
                </div>
            )}
            {popupCadastro !== null && (
                <CadastroColaborador
                    api={api}
                    tipo={popupCadastro}
                    fechar={() => setPopupCadastro(null)}
                    setMensagem={setMensagem}
                    aoCadastrar={carregarUsuarios}
                />
            )}

            {usuarioEditando && (
                <div className={css.overlayModal} onClick={fecharEdicao}>
                    <section className={css.modalEdicao} onClick={(e) => e.stopPropagation()}>
                        <button type="button" className={css.fecharModal} onClick={fecharEdicao}>
                            x
                        </button>
                        <h2>Editar {nomeTipoUsuario(usuarioEditando.tipo)}</h2>

                        <form onSubmit={salvarEdicao}>
                            <Input
                                tipoInp="text"
                                label="Nome:"
                                htmlFor="editar_nome"
                                placeholder="Digite o nome"
                                value={formEdicao.nome}
                                funcao={(e) => setFormEdicao({ ...formEdicao, nome: e.target.value })}
                            />

                            <Input
                                tipoInp="email"
                                label="Email:"
                                htmlFor="editar_email"
                                placeholder="Digite o email"
                                value={formEdicao.email}
                                funcao={(e) => setFormEdicao({ ...formEdicao, email: e.target.value })}
                            />

                            <Input
                                tipoInp="text"
                                label="CPF:"
                                htmlFor="editar_cpf"
                                placeholder="Digite o CPF"
                                value={formEdicao.cpf}
                                funcao={(e) => setFormEdicao({ ...formEdicao, cpf: e.target.value })}
                                mask="cpf"
                            />

                            <Input
                                tipoInp="password"
                                label="Senha:"
                                htmlFor="editar_senha"
                                placeholder="Digite uma nova senha"
                                value={formEdicao.senha}
                                funcao={(e) => setFormEdicao({ ...formEdicao, senha: e.target.value })}
                            />

                            <Input
                                tipoInp="password"
                                label="Confirmar Senha:"
                                htmlFor="editar_confirmar_senha"
                                placeholder="Confirme a nova senha"
                                value={formEdicao.confirmar_senha}
                                funcao={(e) => setFormEdicao({ ...formEdicao, confirmar_senha: e.target.value })}
                                obrigatorio={formEdicao.senha ? "Sim" : "Nao"}
                                required={Boolean(formEdicao.senha)}
                            />

                            {formEdicao.senha && (
                                <p className={css.avisoSenha}>* Confirmar senha e obrigatorio para alterar a senha</p>
                            )}

                            <div className={css.botoesModal}>
                                <Button
                                    tipo="button"
                                    texto="Cancelar"
                                    fundoCor="vermelho"
                                    tamanho="medio"
                                    onClick={fecharEdicao}
                                />
                                <Button
                                    tipo="submit"
                                    texto={salvandoEdicao ? "Salvando..." : "Salvar"}
                                    fundoCor="verde"
                                    tamanho="medio"
                                />
                            </div>
                        </form>
                    </section>
                </div>
            )}

            <MenuLateralAdm itemAtivo="usuarios" />

            <div className={css.conteudoPrincipal}>
                <main className={css.areaConteudo}>
                                                                                                                                                                                   
                    <section className={css.cabecalhoPagina}>
                        <span className={css.etiquetaPagina}>ADMINISTRAÇÃO</span>
                        <h2>Gerenciar usuários</h2>
                        <p>Pesquise alunos, professores e administradores, atualize cadastros e controle o acesso.</p>
                    </section>

                    {erro && <div className={css.erro}>{erro}</div>}
                    {loading && <div className={css.carregando}>Carregando usuarios...</div>}

                    {renderLista({
                        chave: "alunos",
                        titulo: "Lista de Alunos:",
                        placeholder: "Pesquisar em Alunos",
                        itens: grupos.alunos,
                        podeAdicionar: false
                    })}

                    {renderLista({
                        chave: "professores",
                        titulo: "Lista de Professores:",
                        placeholder: "Pesquisar em Professores",
                        itens: grupos.professores,
                        podeAdicionar: true,
                        tipoCadastro: TIPOS.PROFESSOR
                    })}

                    {renderLista({
                        chave: "administradores",
                        titulo: "Lista de Administradores:",
                        placeholder: "Pesquisar em Administradores",
                        itens: grupos.administradores,
                        podeAdicionar: true,
                        tipoCadastro: TIPOS.ADMIN
                    })}
                </main>
            </div>

            <footer className={css.rodapePagina}>
                <div className={css.colunaRodape}>
                    <h4>Contato</h4>
                    <p>Birigui - SP</p>
                    <p>(18)98131-3801</p>
                    <p>cursando@gmail.com</p>
                </div>

                <div className={css.colunaRodape}>
                    <h4>Navegacao</h4>
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
    );
}
/* Fim item 35 */
/* Fim item 9 */
