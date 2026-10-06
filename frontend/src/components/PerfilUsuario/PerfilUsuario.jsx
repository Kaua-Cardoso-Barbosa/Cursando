import { useCallback, useEffect, useState } from "react";
import Input from "../Input/Input.jsx";
import Button from "../Button/Button.jsx";
import css from "./PerfilUsuario.module.css";
import validarNome from "../../utils/validarNome";

function resolverUrlMidia(api, caminho) {
    if (!caminho) return "";
    if (caminho.startsWith("http://") || caminho.startsWith("https://")) {
        return caminho;
    }
    return `${api}${caminho}`;
}

export default function PerfilUsuario({ api, setMensagem, onPerfilAtualizado }) {
    const [perfil, setPerfil] = useState({
        nome: "",
        email: "",
        cpf: "",
        imagem_perfil: "",
        senha: "",
        confirmar_senha: ""
    });
    const [imagemArquivo, setImagemArquivo] = useState(null);
    const [previewImagem, setPreviewImagem] = useState("");
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
                    imagem_perfil: dados.imagem_perfil || "",
                    senha: "",
                    confirmar_senha: ""
                });
                setPreviewImagem(dados.imagem_perfil ? resolverUrlMidia(api, dados.imagem_perfil) : "");
            } catch (erro) {
                console.error("Erro ao carregar perfil:", erro);
                avisar({ tipo: "erro", descricao: erro.message });
            } finally {
                setCarregando(false);
            }
        }

        carregarPerfil();
    }, [api, avisar, lerResposta]);

    function selecionarImagem(evento) {
        const arquivo = evento.target.files?.[0];
        setImagemArquivo(arquivo || null);

        if (arquivo) {
            setPreviewImagem(URL.createObjectURL(arquivo));
        } else {
            setPreviewImagem(perfil.imagem_perfil ? resolverUrlMidia(api, perfil.imagem_perfil) : "");
        }
    }

    async function salvarPerfil(evento) {
        evento.preventDefault();
        setSalvando(true);
        setErroLocal("");

        if (!validarNome(perfil.nome)) {
            avisar({
                tipo: "erro",
                descricao: "Informe um nome valido, usando apenas letras, espacos, hifens ou apostrofos."
            });
            setSalvando(false);
            return;
        }

        try {
            const formulario = new FormData();
            formulario.append("nome", perfil.nome);
            formulario.append("email", perfil.email);
            formulario.append("cpf", perfil.cpf);
            formulario.append("senha", perfil.senha);
            formulario.append("confirmar_senha", perfil.confirmar_senha);

            if (imagemArquivo) {
                formulario.append("imagem_perfil", imagemArquivo);
            }

            const resposta = await fetch(`${api}/perfil`, {
                method: "PUT",
                credentials: "include",
                body: formulario
            });
            const dados = await lerResposta(resposta);
            const usuarioAtualizado = dados.usuario || perfil;

            setPerfil({
                nome: usuarioAtualizado.nome || perfil.nome,
                email: usuarioAtualizado.email || perfil.email,
                cpf: usuarioAtualizado.cpf || perfil.cpf,
                imagem_perfil: usuarioAtualizado.imagem_perfil || perfil.imagem_perfil,
                senha: "",
                confirmar_senha: ""
            });
            setImagemArquivo(null);
            setPreviewImagem(usuarioAtualizado.imagem_perfil ? resolverUrlMidia(api, usuarioAtualizado.imagem_perfil) : "");

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
                        <div className={css.areaImagemPerfil}>
                            <div className={css.previewPerfil}>
                                {previewImagem ? (
                                    <img src={previewImagem} alt="Imagem de perfil" />
                                ) : (
                                    <span>{(perfil.nome || "U").slice(0, 1).toUpperCase()}</span>
                                )}
                            </div>
                            <label className={css.campoUpload}>
                                Imagem de perfil
                                <input
                                    type="file"
                                    accept="image/png,image/jpeg,image/webp"
                                    onChange={selecionarImagem}
                                />
                            </label>
                        </div>

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
