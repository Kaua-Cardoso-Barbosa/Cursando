import AutoTextarea from '../AutoTextarea/AutoTextarea.jsx';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { FaPaperPlane, FaUserCircle } from "react-icons/fa";
import useChat from "../../hooks/useChat.js";
import css from "./ChatCurso_38.module.css";

export default function ChatCurso({ api, perfil = "aluno", conversaInicial = null }) {
    const [texto, setTexto] = useState("");
    const [ativo, setAtivo] = useState(!document.hidden);
    const mensagensRef = useRef(null);
    const textoRef = useRef(null);
    const noFim = useRef(true);
    const posicaoAnterior = useRef(null);
    const request = useCallback(async (path, options = {}) => {
        const abort = new AbortController();
        const timeout = window.setTimeout(() => abort.abort(), 10000);
        try {
            const resposta = await fetch(`${api}${path}`, { credentials: "include", ...options,
                ...(options.body ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(options.body) } : {}),
                signal: abort.signal });
            const dados = await resposta.json().catch(() => ({}));
            if (resposta.status === 401) window.dispatchEvent(new Event("cursando:sessao-invalida"));
            if (!resposta.ok) throw new Error(dados?.mensagem?.descricao || dados?.mensagem || "Nao foi possivel atualizar o chat.");
            return dados;
        } finally { window.clearTimeout(timeout); }
    }, [api]);
    const { conversas, selecionada, setSelecionada, mensagens, carregando, enviando, erro,
        carregarAnteriores, carregandoAnteriores, temAnteriores, confirmarLeitura, enviarTexto } =
        useChat({ request, professor: perfil === "professor", conversaInicial, ativo });
    const conversasVisiveis = selecionada && !conversas.some(c =>
        Number(c.id_curso) === Number(selecionada.id_curso) && Number(c.id_aluno) === Number(selecionada.id_aluno)
    ) ? [selecionada, ...conversas] : conversas;

    function urlImagem(caminho) {
        if (!caminho) return "";
        if (caminho.startsWith("http://") || caminho.startsWith("https://") || caminho.startsWith("/imagens_")) return caminho;
        return `${api}${caminho}`;
    }
    useEffect(() => {
        const visibilidade = () => setAtivo(!document.hidden);
        document.addEventListener("visibilitychange", visibilidade);
        return () => document.removeEventListener("visibilitychange", visibilidade);
    }, []);
    useEffect(() => { noFim.current = true; posicaoAnterior.current = null; setTexto(""); }, [selecionada?.id_curso, selecionada?.id_aluno]);
    useLayoutEffect(() => {
        const elemento = mensagensRef.current;
        if (!elemento || !ativo) return;
        if (posicaoAnterior.current) {
            elemento.scrollTop = posicaoAnterior.current.top + elemento.scrollHeight - posicaoAnterior.current.altura;
            posicaoAnterior.current = null;
        } else if (noFim.current) {
            elemento.scrollTop = elemento.scrollHeight;
            confirmarLeitura();
        }
    }, [mensagens, ativo, confirmarLeitura]);
    function aoRolar() {
        const elemento = mensagensRef.current;
        noFim.current = elemento.scrollHeight - elemento.scrollTop - elemento.clientHeight < 60;
        if (noFim.current) confirmarLeitura();
    }
    async function verAnteriores() {
        const elemento = mensagensRef.current;
        posicaoAnterior.current = { altura: elemento.scrollHeight, top: elemento.scrollTop };
        const carregou = await carregarAnteriores();
        if (!carregou) posicaoAnterior.current = null;
    }
    useEffect(() => {
        if (!textoRef.current) return;
        textoRef.current.style.height = "auto";
        textoRef.current.style.height = `${textoRef.current.scrollHeight}px`;
    }, [texto]);
    async function enviarMensagem() {
        const enviado = texto.trim();
        if (await enviarTexto(enviado)) {
            setTexto(atual => atual.trim() === enviado ? "" : atual);
            noFim.current = true;
            const elemento = mensagensRef.current;
            if (elemento) elemento.scrollTop = elemento.scrollHeight;
            confirmarLeitura();
        }
    }
    function aoTeclarMensagem(evento) {
        if (evento.key !== "Enter" || evento.shiftKey) return;
        evento.preventDefault();
        enviarMensagem();
    }

    return (
        <section className={css.chat}>
            {erro && <p role="alert" className={css.estado}>{erro}</p>}
            <div className={css.layout}>
                <aside className={css.listaConversas}>
                    {carregando && /* Sprint item 19 - Implementar chat entre instrutor e aluno no aplicativo e no sistema web - Carrega, envia e apresenta as mensagens da conversa do curso */ <p className={css.estado}>Carregando conversas...</p> /* Fim item 19 */}
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
                    {/* Sprint item 19 - Implementar chat entre instrutor e aluno no aplicativo e no sistema web - Carrega, envia e apresenta as mensagens da conversa do curso */}
                    <div className={css.cabecalhoConversa}>
                        <div className={css.identidadeConversa}>
                            {selecionada?.imagem_perfil
                                ? <img className={css.fotoCabecalho} src={urlImagem(selecionada.imagem_perfil)} alt="" />
                                : selecionada ? <FaUserCircle className={css.fotoCabecalhoFallback} /> : null}
                            <strong>{selecionada ? selecionada.nome : "Selecione uma conversa"}</strong>
                        </div>
                        {selecionada && <small>{selecionada.curso}</small>}
                    </div>
                    {/* Fim item 19 */}

                    {/* Sprint item 19 - Implementar chat entre instrutor e aluno no aplicativo e no sistema web - Carrega, envia e apresenta as mensagens da conversa do curso */}
                    <div className={css.mensagens} ref={mensagensRef} onScroll={aoRolar}>
                        {temAnteriores && <button type="button" onClick={verAnteriores} disabled={carregandoAnteriores}>{carregandoAnteriores ? "Carregando..." : "Carregar mensagens anteriores"}</button>}
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
                    {/* Fim item 19 */}

                    {/* Sprint item 19 - Implementar chat entre instrutor e aluno no aplicativo e no sistema web - Carrega, envia e apresenta as mensagens da conversa do curso */}
                    <div className={css.compositor}>
                        <AutoTextarea
                            ref={textoRef}
                            maxLength={10000}
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
                    {/* Fim item 19 */}
                </div>
            </div>
        </section>
    );
}
