import { useCallback, useEffect, useRef, useState } from "react";

// A mesma logica de sincronizacao e usada no web e no aplicativo.
// Cada conversa possui fila e geracao proprias: respostas antigas sao descartadas.
export default function useChat({ request, professor, conversaInicial, ativo = true }) {
    const [conversas, setConversas] = useState([]);
    const [selecionada, setSelecionada] = useState(conversaInicial);
    const [mensagens, setMensagens] = useState([]);
    const [carregando, setCarregando] = useState(true);
    const [carregandoAnteriores, setCarregandoAnteriores] = useState(false);
    const [temAnteriores, setTemAnteriores] = useState(false);
    const [erro, setErro] = useState("");
    const [enviando, setEnviando] = useState(false);
    const atual = useRef(null);
    const emEnvio = useRef(false);
    const tentativa = useRef(null);
    const lista = useRef({ atualizada: 0, pendente: null });
    const idCurso = selecionada?.id_curso;
    const idAluno = selecionada?.id_aluno;
    const chave = selecionada ? `${selecionada.id_curso}:${selecionada.id_aluno}` : "";

    const carregarConversas = useCallback(async (forcar = false) => {
        const estado = lista.current;
        if (estado.pendente) return estado.pendente;
        if (!forcar && Date.now() - estado.atualizada < 15000) return;
        estado.pendente = (async () => {
            try {
                const dados = await request("/chat/conversas");
                if (lista.current !== estado) return;
                setConversas(anterior => JSON.stringify(anterior) === JSON.stringify(dados) ? anterior : dados);
                estado.atualizada = Date.now();
            } finally { estado.pendente = null; }
        })();
        return estado.pendente;
    }, [request]);

    const mesclar = useCallback((estado, novas) => {
        if (atual.current !== estado || estado.cancelado || !novas.length) return;
        const mapa = new Map(estado.mensagens.map(m => [m.id, m]));
        novas.forEach(m => mapa.set(m.id, m));
        estado.mensagens = [...mapa.values()].sort((a, b) => a.id - b.id);
        setMensagens(estado.mensagens);
    }, []);

    const executar = useCallback((estado, acao) => {
        const tarefa = estado.fila.catch(() => {}).then(() => {
            if (estado.cancelado || atual.current !== estado) return;
            return acao();
        });
        estado.fila = tarefa;
        return tarefa;
    }, []);

    const buscar = useCallback(async (estado, anteriores = false) => {
        const cursor = anteriores ? `&antes_id=${estado.primeiro}` : estado.iniciado ? `&depois_id=${estado.ultimo}` : "";
        const dados = await request(`${estado.url}&paginado=1&limite=50${cursor}`);
        if (estado.cancelado || atual.current !== estado) return 0;
        mesclar(estado, dados.mensagens);
        if (anteriores || !estado.iniciado) {
            estado.primeiro = dados.primeiro_id || estado.primeiro;
            setTemAnteriores(dados.tem_mais);
        }
        if (!anteriores) {
            estado.ultimo = dados.ultimo_id || estado.ultimo;
            estado.iniciado = true;
        }
        // Esvazia os lotes de novidades sem saltar mensagens durante uma reconexao.
        estado.maisNovas = !anteriores && dados.tem_mais;
        return dados.mensagens.length;
    }, [request, mesclar]);

    useEffect(() => {
        lista.current = { atualizada: 0, pendente: null };
        setConversas([]);
    }, [request]);

    useEffect(() => {
        const estado = { url: idCurso ? `/chat/cursos/${idCurso}/mensagens?id_aluno=${professor ? idAluno : ""}` : "",
            mensagens: [], primeiro: 0, ultimo: 0, lidas: 0, iniciado: false, cancelado: false, fila: Promise.resolve() };
        atual.current = estado;
        setMensagens([]);
        setTemAnteriores(false);
        setCarregandoAnteriores(false);
        setErro("");
        return () => { estado.cancelado = true; };
    }, [idCurso, idAluno, request, professor]);

    useEffect(() => {
        if (!ativo) return;
        let cancelado = false;
        let timer;
        let intervalo = 3000;
        const estado = atual.current;
        async function atualizar() {
            try {
                await carregarConversas();
                const quantidade = chave ? await executar(estado, () => buscar(estado)) : 0;
                if (cancelado) return;
                setErro("");
                intervalo = quantidade ? 3000 : Math.min(intervalo * 1.5, 15000);
            } catch (falha) {
                if (cancelado) return;
                setErro(falha.message || "Nao foi possivel atualizar o chat.");
                intervalo = Math.min(intervalo * 2, 30000);
            } finally {
                if (!cancelado) {
                    setCarregando(false);
                    timer = setTimeout(atualizar, estado.maisNovas ? 100 : intervalo);
                }
            }
        }
        atualizar();
        return () => { cancelado = true; clearTimeout(timer); };
    }, [ativo, chave, request, carregarConversas, buscar, executar]);

    const carregarAnteriores = useCallback(async () => {
        const estado = atual.current;
        if (!estado?.primeiro || estado.carregandoAnteriores) return;
        estado.carregandoAnteriores = true;
        setCarregandoAnteriores(true);
        try { await executar(estado, () => buscar(estado, true)); return true; }
        catch (falha) { if (atual.current === estado) setErro(falha.message); return false; }
        finally {
            estado.carregandoAnteriores = false;
            if (atual.current === estado) setCarregandoAnteriores(false);
        }
    }, [buscar, executar]);

    const confirmarLeitura = useCallback(() => {
        const estado = atual.current;
        if (!ativo || !estado?.iniciado || estado.cancelado) return;
        const ate = estado.ultimo;
        if (!ate || ate <= estado.lidas || estado.confirmando) return;
        estado.confirmando = true;
        executar(estado, async () => {
            await request(estado.url, { method: "PATCH", body: { ate_id: ate } });
            if (atual.current === estado && !estado.cancelado) {
                estado.lidas = ate;
                // Atualiza apenas o contador da conversa aberta, sem uma consulta extra.
                setConversas(lista => lista.map(c => `${c.id_curso}:${c.id_aluno}` === chave ? { ...c, nao_lidas: 0 } : c));
            }
        }).catch(falha => { if (atual.current === estado) setErro(falha.message); })
            .finally(() => { estado.confirmando = false; });
    }, [ativo, request, executar, chave]);

    const enviarTexto = useCallback(async texto => {
        texto = texto.trim();
        const estado = atual.current;
        if (!texto || !chave || emEnvio.current || !estado) return false;
        emEnvio.current = true;
        setEnviando(true);
        if (tentativa.current?.chave !== chave || tentativa.current?.texto !== texto) {
            tentativa.current = { chave, texto, id: `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}` };
        }
        try {
            await executar(estado, async () => {
                const dados = await request(estado.url, { method: "POST", body: { texto, chave_envio: tentativa.current.id } });
                mesclar(estado, [dados.mensagem]);
            });
            tentativa.current = null;
            if (atual.current !== estado || estado.cancelado) return false;
            setErro("");
            return true;
        } catch (falha) {
            if (atual.current === estado) setErro(falha.message);
            return false;
        } finally { emEnvio.current = false; setEnviando(false); }
    }, [chave, request, executar, mesclar]);

    const atualizar = useCallback(async () => {
        const estado = atual.current;
        try {
            await carregarConversas(true);
            if (estado?.url) await executar(estado, () => buscar(estado));
            setErro("");
        } catch (falha) { setErro(falha.message); }
    }, [carregarConversas, buscar, executar]);

    return { conversas, selecionada, setSelecionada, mensagens, carregando, carregandoAnteriores,
        temAnteriores, erro, enviando, enviarTexto, carregarAnteriores, confirmarLeitura, atualizar };
}
