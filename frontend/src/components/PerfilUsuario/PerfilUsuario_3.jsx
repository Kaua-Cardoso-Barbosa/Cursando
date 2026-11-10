import { useCallback, useEffect, useRef, useState } from "react";
import Input from "../Input/Input.jsx";
import Button from "../Button/Button.jsx";
import css from "./PerfilUsuario_38.module.css";
import validarNome from "../../utils/validarNome_1";
import CabecalhoPagina from '../CabecalhoPagina/CabecalhoPagina.jsx';
import { Link } from 'react-router-dom';
import { useSessao } from '../../context/useSessao.js';
import { urlPerfil } from '../../utils/perfil.js';

function resolverUrlMidia(api, caminho) {
    if (!caminho) return "";
    if (caminho.startsWith("http://") || caminho.startsWith("https://")) {
        return caminho;
    }
    return `${api}${caminho}`;
}

export default function PerfilUsuario({ api, setMensagem, onPerfilAtualizado, emModal = false, onCancelar, onSalvando }) {
    const { usuario } = useSessao();
    const [perfil, setPerfil] = useState({
        nome: "",
        email: "",
        cpf: "",
        imagem_perfil: "",
        arroba: "",
        senha: "",
        confirmar_senha: ""
    });
    const [imagemArquivo, setImagemArquivo] = useState(null);
    const [previewImagem, setPreviewImagem] = useState("");
    const previewLocal = useRef(null);
    useEffect(() => () => { if (previewLocal.current) URL.revokeObjectURL(previewLocal.current); }, []);
    const [carregando, setCarregando] = useState(true);
    const [salvando, setSalvando] = useState(false);
    const [alteradoLocalmente, setAlteradoLocalmente] = useState(false);
    const alteradoLocalmenteRef = useRef(false);
    const [erroLocal, setErroLocal] = useState("");
    useEffect(() => { onSalvando?.(salvando); }, [salvando, onSalvando]);

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

    /* Sprint item 3 - Sincronizar dados entre aplicativo e sistema web - Atualiza os dados da sessão compartilhados entre o site e o aplicativo */
    const carregarPerfil = useCallback(
async () => {
        try {
            const resposta = await fetch(`${api}/perfil`, {
                credentials: "include"
            });
            const dados = await lerResposta(resposta);


            if (alteradoLocalmenteRef.current) return;

            setPerfil({
                nome: dados.nome || "",
                email: dados.email || "",
                cpf: dados.cpf || "",
                imagem_perfil: dados.imagem_perfil || "",
                arroba: dados.arroba || "",
                identificador: dados.identificador,
                senha: "",
                confirmar_senha: ""
            });
            setPreviewImagem(dados.imagem_perfil ? resolverUrlMidia(api, dados.imagem_perfil) : "");
            setAlteradoLocalmente(false);
        } catch (erro) {
            console.error("Erro ao carregar perfil:", erro);
            avisar({ tipo: "erro", descricao: erro.message });
        } finally {
            setCarregando(false);
        }
    }
, [api, avisar, lerResposta]);
    /* Fim item 3 */

    useEffect(() => {
        carregarPerfil();
    }, [carregarPerfil]);

    useEffect(() => {
/* Sprint item 3 - Sincronizar dados entre aplicativo e sistema web - Atualiza o perfil ao retomar sem sobrescrever a edição local */
function sincronizarPerfil() {

            if (!document.hidden && !alteradoLocalmente && !salvando) carregarPerfil();
        }
/* Fim item 3 */

        /* Sprint item 3 - Sincronizar dados entre aplicativo e sistema web - Atualiza os dados da sessão compartilhados entre o site e o aplicativo */
        window.addEventListener("cursando:sincronizar", sincronizarPerfil);
        /* Fim item 3 */
        return () => window.removeEventListener("cursando:sincronizar", sincronizarPerfil);
    }, [alteradoLocalmente, carregarPerfil, salvando]);

    function selecionarImagem(evento) {
        const arquivo = evento.target.files?.[0];
        if (arquivo && (!['image/jpeg', 'image/png', 'image/webp'].includes(arquivo.type) || arquivo.size > 5 * 1024 * 1024)) {
            avisar({ tipo: 'erro', descricao: 'Escolha uma imagem JPG, PNG ou WebP de até 5 MB.' });
            evento.target.value = '';
            return;
        }
        if (previewLocal.current) URL.revokeObjectURL(previewLocal.current);
        previewLocal.current = arquivo ? URL.createObjectURL(arquivo) : null;
        setImagemArquivo(arquivo || null);
        alteradoLocalmenteRef.current = true;
        setAlteradoLocalmente(true);

        if (arquivo) {
            setPreviewImagem(previewLocal.current);
        } else {
            setPreviewImagem(perfil.imagem_perfil ? resolverUrlMidia(api, perfil.imagem_perfil) : "");
        }
    }

function atualizarCampoPerfil(campo, valor) {

        setPerfil((atual) => ({ ...atual, [campo]: valor }));
        alteradoLocalmenteRef.current = true;
        setAlteradoLocalmente(true);
    }

    /* Sprint item 3 - Sincronizar dados entre aplicativo e sistema web - Envia as alterações de perfil e atualiza os dados locais */
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
            if (Number(usuario?.tipo) === 1) formulario.append("arroba", perfil.arroba);

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
                arroba: usuarioAtualizado.arroba || "",
                identificador: usuarioAtualizado.identificador,
                senha: "",
                confirmar_senha: ""
            });
            setImagemArquivo(null);
            setPreviewImagem(usuarioAtualizado.imagem_perfil ? resolverUrlMidia(api, usuarioAtualizado.imagem_perfil) : "");
            alteradoLocalmenteRef.current = false;
            setAlteradoLocalmente(false);

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
    /* Fim item 3 */

    return (
        <section className={`${css.perfil} ${emModal ? css.emModal : ''}`}>
            {emModal ? <header className={css.tituloModal}><h2 id="editar-perfil-titulo">Editar perfil</h2><p>Atualize seus dados, sua foto e a senha da conta.</p></header> : <CabecalhoPagina etiqueta="CONTA" titulo="Editar perfil" descricao="Atualize seus dados, sua foto e a senha da conta."
                acoes={usuario && Number(usuario.tipo) !== 0 && <Link to={perfil.identificador ? urlPerfil(perfil.identificador) : '/perfil'}>Ver meu perfil</Link>} />}
            <div className={css.formulario}>

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
                            funcao={(evento) => atualizarCampoPerfil("nome", evento.target.value)}
                        />

                        <Input
                            tipoInp="email"
                            label="Email:"
                            htmlFor="perfil_email"
                            placeholder="Digite seu email"
                            value={perfil.email}
                            funcao={(evento) => atualizarCampoPerfil("email", evento.target.value)}
                        />

                        {Number(usuario?.tipo) === 1 && <div>
                            <Input tipoInp="text" label="@ do perfil (opcional):" htmlFor="perfil_arroba"
                                placeholder="Ex.: mariana.duarte" maxlength={41} value={perfil.arroba}
                                funcao={(evento) => atualizarCampoPerfil("arroba", evento.target.value)} />
                            <small>Use de 3 a 40 caracteres: letras sem acento, números, ponto ou sublinhado. Comece com uma letra. Deixe vazio para usar o identificador aleatório.</small>
                        </div>}

                        <Input
                            tipoInp="text"
                            label="CPF:"
                            htmlFor="perfil_cpf"
                            placeholder="Digite seu CPF"
                            value={perfil.cpf}
                            funcao={(evento) => atualizarCampoPerfil("cpf", evento.target.value)}
                            mask="cpf"
                        />

                        <Input
                            tipoInp="password"
                            label="Senha:"
                            htmlFor="perfil_senha"
                            placeholder="Digite uma nova senha"
                            value={perfil.senha}
                            funcao={(evento) => atualizarCampoPerfil("senha", evento.target.value)}
                        />

                        <Input
                            tipoInp="password"
                            label="Confirmar Senha:"
                            htmlFor="perfil_confirmar_senha"
                            placeholder="Confirme a nova senha"
                            value={perfil.confirmar_senha}
                            funcao={(evento) => atualizarCampoPerfil("confirmar_senha", evento.target.value)}
                            obrigatorio={perfil.senha ? "Sim" : "Nao"}
                            required={Boolean(perfil.senha)}
                        />

                        {perfil.senha && (
                            <p className={css.campoObrigatorio}>
                                * Confirmar senha e obrigatorio para alterar a senha
                            </p>
                        )}

                        <div className={css.botoes}>
                            {emModal && <Button tipo="button" texto="Cancelar" className={css.botaoCancelar} onClick={onCancelar} disabled={salvando} />}
                            <Button
                                tipo="submit"
                                texto={salvando ? "Salvando..." : "Salvar dados"}
                                fundoCor="verde"
                                tamanho="medio"
                                className={css.botaoSalvar}
                                disabled={salvando}
                            />
                        </div>
                    </form>
                )}
            </div>
        </section>
    );
}
