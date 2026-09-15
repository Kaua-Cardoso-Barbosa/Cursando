import { useCallback, useEffect, useState } from "react";
import Input from "../Input/Input.jsx";
import Button from "../Button/Button.jsx";
import css from "./PerfilUsuario.module.css";

export default function PerfilUsuario({ api, setMensagem, onPerfilAtualizado }) {
    const [perfil, setPerfil] = useState({
        nome: "",
        email: "",
        cpf: "",
        senha: "",
        confirmar_senha: ""
    });
    const [carregando, setCarregando] = useState(true);
    const [salvando, setSalvando] = useState(false);
    const [erroLocal, setErroLocal] = useState("");

    const avisar = useCallback((mensagem) => {
        if (mensagem && setMensagem) {
            setMensagem(mensagem);
            return;
        }

        if (mensagem?.descricao) {
            setErroLocal(mensagem.descricao);
        }
    }, [setMensagem]);

    const lerResposta = useCallback(async (resposta) => {
        const dados = await resposta.json().catch(() => ({}));

        if (dados.mensagem) {
            avisar(dados.mensagem);
        }

        if (!resposta.ok) {
            if (resposta.status === 401) {
                throw new Error("Sessao expirada. Faca login novamente.");
            }

            throw new Error(dados?.mensagem?.descricao || "Erro ao conectar com a API.");
        }

        return dados;
    }, [avisar]);

    useEffect(() => {
        async function carregarPerfil() {
            try {
                const resposta = await fetch(`${api}/perfil`, {
                    credentials: "include"
                });
                const dados = await lerResposta(resposta);

                setPerfil({
                    nome: dados.nome || "",
                    email: dados.email || "",
                    cpf: dados.cpf || "",
                    senha: "",
                    confirmar_senha: ""
                });
            } catch (erro) {
                console.error("Erro ao carregar perfil:", erro);
                avisar({ tipo: "erro", descricao: erro.message });
            } finally {
                setCarregando(false);
            }
        }

        carregarPerfil();
    }, [api, avisar, lerResposta]);

    async function salvarPerfil(evento) {
        evento.preventDefault();
        setSalvando(true);
        setErroLocal("");

        try {
            const resposta = await fetch(`${api}/perfil`, {
                method: "PUT",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(perfil)
            });
            const dados = await lerResposta(resposta);
            const usuarioAtualizado = dados.usuario || perfil;

            setPerfil({
                nome: usuarioAtualizado.nome || perfil.nome,
                email: usuarioAtualizado.email || perfil.email,
                cpf: usuarioAtualizado.cpf || perfil.cpf,
                senha: "",
                confirmar_senha: ""
            });

            if (onPerfilAtualizado) {
                onPerfilAtualizado(usuarioAtualizado);
            }
        } catch (erro) {
            console.error("Erro ao salvar perfil:", erro);
            avisar({ tipo: "erro", descricao: erro.message });
        } finally {
            setSalvando(false);
        }
    }

    return (
        <section className={css.perfil}>
            <div className={css.formulario}>
                <h1>Perfil</h1>

                {carregando && <p className={css.textoApoio}>Carregando dados...</p>}
                {erroLocal && <p className={css.erro}>{erroLocal}</p>}

                {!carregando && (
                    <form onSubmit={salvarPerfil}>
                        <Input
                            tipoInp="text"
                            label="Nome:"
                            htmlFor="perfil_nome"
                            placeholder="Digite seu nome"
                            value={perfil.nome}
                            funcao={(evento) => setPerfil({ ...perfil, nome: evento.target.value })}
                        />

                        <Input
                            tipoInp="email"
                            label="Email:"
                            htmlFor="perfil_email"
                            placeholder="Digite seu email"
                            value={perfil.email}
                            funcao={(evento) => setPerfil({ ...perfil, email: evento.target.value })}
                        />

                        <Input
                            tipoInp="text"
                            label="CPF:"
                            htmlFor="perfil_cpf"
                            placeholder="Digite seu CPF"
                            value={perfil.cpf}
                            funcao={(evento) => setPerfil({ ...perfil, cpf: evento.target.value })}
                            mask="cpf"
                        />

                        <Input
                            tipoInp="password"
                            label="Senha:"
                            htmlFor="perfil_senha"
                            placeholder="Digite uma nova senha"
                            value={perfil.senha}
                            funcao={(evento) => setPerfil({ ...perfil, senha: evento.target.value })}
                        />

                        <Input
                            tipoInp="password"
                            label="Confirmar Senha:"
                            htmlFor="perfil_confirmar_senha"
                            placeholder="Confirme a nova senha"
                            value={perfil.confirmar_senha}
                            funcao={(evento) => setPerfil({ ...perfil, confirmar_senha: evento.target.value })}
                            obrigatorio={perfil.senha ? "Sim" : "Nao"}
                            required={Boolean(perfil.senha)}
                        />

                        {perfil.senha && (
                            <p className={css.campoObrigatorio}>
                                * Confirmar senha e obrigatorio para alterar a senha
                            </p>
                        )}

                        <div className={css.botoes}>
                            <Button
                                tipo="submit"
                                texto={salvando ? "Salvando..." : "Salvar dados"}
                                fundoCor="verde"
                                tamanho="medio"
                            />
                        </div>
                    </form>
                )}
            </div>
        </section>
    );
}
