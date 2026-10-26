import { useCallback, useEffect, useRef, useState } from "react";
import { FaPaperPlane, FaUserCircle } from "react-icons/fa";
import css from "./ChatCurso_38.module.css";

export default /* Sprint item 19 - Implementar chat entre instrutor e aluno no aplicativo e no sistema web */
function ChatCurso({ api, perfil = "aluno", setMensagem, conversaInicial = null }) {
    const [conversas, setConversas] = useState([]);
    const [selecionada, setSelecionada] = useState(conversaInicial);
    const [mensagens, setMensagens] = useState([]);
    const [texto, setTexto] = useState("");
    const [carregando, setCarregando] = useState(false);
    const [enviando, setEnviando] = useState(false);
    const mensagensRef = useRef(null);
    const textoRef = useRef(null);
    const enviandoRef = useRef(false);
                                                                                                                                                        
                                                               
    const conversasVisiveis = selecionada && !conversas.some((conversa) =>
        Number(conversa.id_curso) === Number(selecionada.id_curso) &&
        Number(conversa.id_aluno) === Number(selecionada.id_aluno)
    ) ? [selecionada, ...conversas] : conversas;

                                                                                                                                                                   
    function urlImagem(caminho) {
        if (!caminho) return "";
        if (caminho.startsWith("http://") || caminho.startsWith("https://") || caminho.startsWith("/imagens_")) return caminho;
        return `${api}${caminho}`;
    }

    const lerResposta = useCallback(async (resposta) => {
        const dados = await resposta.json().catch(() => ({}));
        if (dados.mensagem && typeof dados.mensagem === "object") setMensagem?.(dados.mensagem);
        if (!resposta.ok) {
            throw new Error(
                typeof dados?.mensagem === "string"
                    ? dados.mensagem
                    : dados?.mensagem?.descricao || "Erro ao conectar com a API."
            );
        }
        return dados;
    }, [setMensagem]);

    const carregarConversas = useCallback(async ({ silencioso = false } = {}) => {
        if (!silencioso) setCarregando(true);
        try {
            if (perfil === "aluno") {
                const resposta = await fetch(`${api}/chat/conversas`, { credentials: "include" });
                const dados = await lerResposta(resposta);
                setConversas(Array.isArray(dados) ? dados : []);
                return;
            }

            const resposta = await fetch(`${api}/chat/conversas`, { credentials: "include" });
            const dados = await lerResposta(resposta);
            setConversas(Array.isArray(dados) ? dados : []);
        } catch (erro) {
            console.error("Erro ao carregar conversas:", erro);
            setMensagem?.({ tipo: "erro", descricao: erro.message });
            setConversas([]);
        } finally {
            if (!silencioso) setCarregando(false);
        }
    }, [api, lerResposta, perfil, setMensagem]);

    const carregarMensagens = useCallback(async (conversa) => {
        if (!conversa) return;
        const query = perfil === "professor" ? `?id_aluno=${conversa.id_aluno}` : "";
        const resposta = await fetch(`${api}/chat/cursos/${conversa.id_curso}/mensagens${query}`, {
            credentials: "include"
        });
        const dados = await lerResposta(resposta);
        setMensagens(Array.isArray(dados) ? dados : []);
    }, [api, lerResposta, perfil]);

    useEffect(() => {
        carregarConversas();
    }, [carregarConversas]);

    useEffect(() => {
        carregarMensagens(selecionada).catch((erro) => {
            console.error("Erro ao carregar mensagens:", erro);
            setMensagem?.({ tipo: "erro", descricao: erro.message });
        });
    }, [carregarMensagens, selecionada, setMensagem]);

    useEffect(() => {
        const intervalo = window.setInterval(() => {
            carregarConversas({ silencioso: true });
            if (selecionada) {
                carregarMensagens(selecionada).catch((erro) => {
                    console.error("Erro ao atualizar mensagens:", erro);
                });
            }
        }, 3000);

        return () => window.clearInterval(intervalo);
    }, [carregarConversas, carregarMensagens, selecionada]);

    useEffect(() => {
        if (!mensagensRef.current) return;
        mensagensRef.current.scrollTop = mensagensRef.current.scrollHeight;
    }, [mensagens]);

    useEffect(() => {
        if (!textoRef.current) return;
        textoRef.current.style.height = "auto";
        textoRef.current.style.height = `${textoRef.current.scrollHeight}px`;
    }, [texto]);

    async function enviarMensagem() {
        const textoMensagem = texto.trim();
        if (!selecionada || !textoMensagem || enviandoRef.current) return;

        enviandoRef.current = true;
        setEnviando(true);
        try {
            const resposta = await fetch(`${api}/chat/cursos/${selecionada.id_curso}/mensagens`, {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    id_aluno: selecionada.id_aluno,
                    texto: textoMensagem
                })
            });
            await lerResposta(resposta);
            setTexto("");
            await carregarMensagens(selecionada);
            await carregarConversas({ silencioso: true });
        } catch (erro) {
            console.error("Erro ao enviar mensagem:", erro);
            setMensagem?.({ tipo: "erro", descricao: erro.message });
        } finally {
            enviandoRef.current = false;
            setEnviando(false);
        }
    }

    function aoTeclarMensagem(evento) {
        if (evento.key !== "Enter" || evento.shiftKey) return;
        evento.preventDefault();
        enviarMensagem();
    }

    return (
        <section className={css.chat}>
            <div className={css.layout}>
                <aside className={css.listaConversas}>
                    {carregando && <p className={css.estado}>Carregando conversas...</p>}
                    {!carregando && conversasVisiveis.length === 0 && <p className={css.estado}>{perfil === "professor" ? "Nenhuma conversa ainda. Abra os alunos de um curso para iniciar." : "Nenhuma conversa disponível."}</p>}
                    {conversasVisiveis.map((conversa) => {
                        const ativo = selecionada?.id_curso === conversa.id_curso && selecionada?.id_aluno === conversa.id_aluno;
                        return (
                            <button
                                key={`${conversa.id_curso}-${conversa.id_aluno || "aluno"}`}
                                type="button"
                                className={`${css.itemConversa} ${ativo ? css.itemAtivo : ""}`}
                                onClick={() => setSelecionada(conversa)}
                            >
                                <span className={css.avatar}>
                                    {conversa.imagem_perfil
                                        ? <img src={urlImagem(conversa.imagem_perfil)} alt="" />
                                        : <FaUserCircle />}
                                </span>
                                <span className={css.resumoConversa}>
                                    <strong>{conversa.nome}</strong>
                                    <small>{conversa.curso}</small>
                                </span>
                                {conversa.nao_lidas > 0 && <span className={css.badge}>{conversa.nao_lidas}</span>}
                            </button>
                        );
                    })}
                </aside>

                <div className={css.painelMensagens}>
                    <div className={css.cabecalhoConversa}>
                        <div className={css.identidadeConversa}>
                            {selecionada?.imagem_perfil
                                ? <img className={css.fotoCabecalho} src={urlImagem(selecionada.imagem_perfil)} alt="" />
                                : selecionada ? <FaUserCircle className={css.fotoCabecalhoFallback} /> : null}
                            <strong>{selecionada ? selecionada.nome : "Selecione uma conversa"}</strong>
                        </div>
                        {selecionada && <small>{selecionada.curso}</small>}
                    </div>

                    <div className={css.mensagens} ref={mensagensRef}>
                        {!selecionada && <p className={css.estado}>Escolha uma conversa para começar.</p>}
                        {selecionada && mensagens.length === 0 && <p className={css.estado}>Nenhuma mensagem enviada ainda.</p>}
                        {mensagens.map((mensagem) => (
                            <article
                                key={mensagem.id}
                                className={`${css.balao} ${mensagem.minha ? css.meuBalao : ""}`}
                            >
                                <div className={css.identidadeMensagem}>
                                    {mensagem.imagem_perfil
                                        ? <img src={urlImagem(mensagem.imagem_perfil)} alt="" />
                                        : <FaUserCircle />}
                                    <strong>{mensagem.nome}</strong>
                                </div>
                                <p>{mensagem.texto}</p>
                                <small>{mensagem.criado_em ? new Date(mensagem.criado_em).toLocaleString("pt-BR") : ""}</small>
                            </article>
                        ))}
                    </div>

                    <div className={css.compositor}>
                        <textarea
                            ref={textoRef}
                            value={texto}
                            onChange={(evento) => setTexto(evento.target.value)}
                            onKeyDown={aoTeclarMensagem}
                            placeholder={selecionada ? "Digite sua mensagem" : "Selecione uma conversa"}
                            disabled={!selecionada || enviando}
                        />
                        <button type="button" onClick={enviarMensagem} disabled={!selecionada || !texto.trim() || enviando} title="Enviar mensagem">
                            <FaPaperPlane />
                        </button>
                    </div>
                </div>
            </div>
        </section>
    );
}
/* Fim item 19 */
