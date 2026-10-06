import { useCallback, useEffect, useRef, useState } from "react";
import { FaPaperPlane, FaUserCircle } from "react-icons/fa";
import css from "./ChatCurso.module.css";

export default function ChatCurso({ api, perfil = "aluno", setMensagem }) {
    const [conversas, setConversas] = useState([]);
    const [selecionada, setSelecionada] = useState(null);
    const [mensagens, setMensagens] = useState([]);
    const [texto, setTexto] = useState("");
    const [carregando, setCarregando] = useState(false);
    const mensagensRef = useRef(null);
    const textoRef = useRef(null);

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
                const [cursosResposta, conversasResposta] = await Promise.all([
                    fetch(`${api}/aluno/cursos`, { credentials: "include" }),
                    fetch(`${api}/chat/conversas`, { credentials: "include" })
                ]);
                const cursos = await lerResposta(cursosResposta);
                const conversasExistentes = await lerResposta(conversasResposta);
                const porCurso = new Map();

                for (const curso of Array.isArray(cursos) ? cursos : []) {
                    porCurso.set(Number(curso.id), {
                        id_curso: curso.id,
                        id_aluno: null,
                        curso: curso.titulo,
                        nome: "Instrutor",
                        email: "",
                        nao_lidas: 0
                    });
                }

                for (const conversa of Array.isArray(conversasExistentes) ? conversasExistentes : []) {
                    porCurso.set(Number(conversa.id_curso), conversa);
                }

                setConversas([...porCurso.values()]);
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
        if (!selecionada || !texto.trim()) return;

        try {
            const resposta = await fetch(`${api}/chat/cursos/${selecionada.id_curso}/mensagens`, {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    id_aluno: selecionada.id_aluno,
                    texto: texto.trim()
                })
            });
            await lerResposta(resposta);
            setTexto("");
            await carregarMensagens(selecionada);
            await carregarConversas({ silencioso: true });
        } catch (erro) {
            console.error("Erro ao enviar mensagem:", erro);
            setMensagem?.({ tipo: "erro", descricao: erro.message });
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
                    {!carregando && conversas.length === 0 && <p className={css.estado}>Nenhuma conversa disponível.</p>}
                    {conversas.map((conversa) => {
                        const ativo = selecionada?.id_curso === conversa.id_curso && selecionada?.id_aluno === conversa.id_aluno;
                        return (
                            <button
                                key={`${conversa.id_curso}-${conversa.id_aluno || "aluno"}`}
                                type="button"
                                className={`${css.itemConversa} ${ativo ? css.itemAtivo : ""}`}
                                onClick={() => setSelecionada(conversa)}
                            >
                                <span className={css.avatar}><FaUserCircle /></span>
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
                        <strong>{selecionada ? selecionada.nome : "Selecione uma conversa"}</strong>
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
                                <strong>{mensagem.nome}</strong>
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
                            disabled={!selecionada}
                        />
                        <button type="button" onClick={enviarMensagem} disabled={!selecionada || !texto.trim()} title="Enviar mensagem">
                            <FaPaperPlane />
                        </button>
                    </div>
                </div>
            </div>
        </section>
    );
}
