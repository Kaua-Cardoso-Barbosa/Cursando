import { useCallback, useEffect, useState } from "react";
import { FaPaperPlane, FaUserCircle } from "react-icons/fa";

const styles = {
    layout: {
        display: "grid",
        gridTemplateColumns: "minmax(240px, 320px) 1fr",
        gap: 18,
        minHeight: 520
    },
    panel: {
        border: "1.5px solid #666666",
        borderRadius: 8,
        background: "#ffffff",
        overflow: "hidden"
    },
    title: {
        fontSize: "1.8rem",
        fontWeight: 400,
        color: "#111111",
        marginBottom: 18
    },
    listButton: {
        width: "100%",
        border: "none",
        borderBottom: "1px solid #dddddd",
        background: "#ffffff",
        padding: "14px 16px",
        textAlign: "left",
        display: "grid",
        gap: 4,
        cursor: "pointer"
    },
    listButtonActive: {
        background: "#e8f7ef"
    },
    person: {
        display: "flex",
        alignItems: "center",
        gap: 10,
        color: "#111111",
        fontWeight: 700
    },
    muted: {
        color: "#666666",
        fontSize: ".9rem"
    },
    messages: {
        height: 390,
        overflowY: "auto",
        padding: 18,
        display: "flex",
        flexDirection: "column",
        gap: 10,
        background: "#fafafa"
    },
    bubble: {
        maxWidth: "78%",
        border: "1px solid #dddddd",
        borderRadius: 8,
        padding: "10px 12px",
        background: "#ffffff",
        color: "#111111"
    },
    mine: {
        alignSelf: "flex-end",
        borderColor: "#139a58",
        background: "#e8f7ef"
    },
    composer: {
        display: "flex",
        gap: 10,
        padding: 14,
        borderTop: "1px solid #dddddd"
    },
    input: {
        flex: 1,
        minHeight: 44,
        border: "1.5px solid #139a58",
        borderRadius: 8,
        padding: "8px 10px",
        font: "inherit"
    },
    send: {
        minWidth: 48,
        border: "none",
        borderRadius: 8,
        background: "#139a58",
        color: "#ffffff",
        cursor: "pointer"
    }
};

export default function ChatCurso({ api, perfil = "aluno", setMensagem }) {
    const [conversas, setConversas] = useState([]);
    const [selecionada, setSelecionada] = useState(null);
    const [mensagens, setMensagens] = useState([]);
    const [texto, setTexto] = useState("");
    const [carregando, setCarregando] = useState(false);

    const lerResposta = useCallback(async (resposta) => {
        const dados = await resposta.json().catch(() => ({}));
        if (dados.mensagem && setMensagem) setMensagem(dados.mensagem);
        if (!resposta.ok) throw new Error(dados?.mensagem?.descricao || "Erro ao conectar com a API.");
        return dados;
    }, [setMensagem]);

    const carregarConversas = useCallback(async () => {
        setCarregando(true);
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
            setCarregando(false);
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
            await carregarConversas();
        } catch (erro) {
            console.error("Erro ao enviar mensagem:", erro);
            setMensagem?.({ tipo: "erro", descricao: erro.message });
        }
    }

    return (
        <section>
            <h2 style={styles.title}>Chat</h2>
            <div style={styles.layout}>
                <aside style={styles.panel}>
                    {carregando && <p style={{ padding: 16 }}>Carregando conversas...</p>}
                    {!carregando && conversas.length === 0 && <p style={{ padding: 16 }}>Nenhuma conversa disponivel.</p>}
                    {conversas.map((conversa) => {
                        const ativo = selecionada?.id_curso === conversa.id_curso && selecionada?.id_aluno === conversa.id_aluno;
                        return (
                            <button
                                key={`${conversa.id_curso}-${conversa.id_aluno || "aluno"}`}
                                type="button"
                                style={{ ...styles.listButton, ...(ativo ? styles.listButtonActive : {}) }}
                                onClick={() => setSelecionada(conversa)}
                            >
                                <span style={styles.person}><FaUserCircle /> {conversa.nome}</span>
                                <span style={styles.muted}>{conversa.curso}</span>
                                {conversa.nao_lidas > 0 && <strong>{conversa.nao_lidas} nova(s)</strong>}
                            </button>
                        );
                    })}
                </aside>

                <div style={styles.panel}>
                    <div style={styles.messages}>
                        {!selecionada && <p>Selecione uma conversa.</p>}
                        {selecionada && mensagens.length === 0 && <p>Nenhuma mensagem enviada ainda.</p>}
                        {mensagens.map((mensagem) => (
                            <article
                                key={mensagem.id}
                                style={{ ...styles.bubble, ...(mensagem.minha ? styles.mine : {}) }}
                            >
                                <strong>{mensagem.nome}</strong>
                                <p>{mensagem.texto}</p>
                                <small style={styles.muted}>{mensagem.criado_em ? new Date(mensagem.criado_em).toLocaleString("pt-BR") : ""}</small>
                            </article>
                        ))}
                    </div>
                    <div style={styles.composer}>
                        <input
                            style={styles.input}
                            value={texto}
                            onChange={(evento) => setTexto(evento.target.value)}
                            placeholder={selecionada ? "Digite sua mensagem" : "Selecione uma conversa"}
                            disabled={!selecionada}
                        />
                        <button style={styles.send} type="button" onClick={enviarMensagem} disabled={!selecionada}>
                            <FaPaperPlane />
                        </button>
                    </div>
                </div>
            </div>
        </section>
    );
}
