import { useCallback, useEffect, useRef, useState } from "react";

import { API, SessaoContext } from "./useSessao.js";
const VALIDADE_CACHE = 30000;

export function SessaoProvider({ children }) {
    const [usuario, setUsuario] = useState(null);
    const [carregando, setCarregando] = useState(true);
    const [erro, setErro] = useState("");
    const controle = useRef({ versao: 0, consultadaEm: 0, pendente: null, usuario: null });

    const limparSessao = useCallback(() => {
        Object.assign(controle.current, { versao: controle.current.versao + 1, consultadaEm: 0, pendente: null, usuario: null });
        setUsuario(null);
        setCarregando(false);
        setErro("");
    }, []);

    const atualizarSessao = useCallback(({ forcar = true } = {}) => {
        const estado = controle.current;
        if (!forcar && estado.pendente) return estado.pendente;
        if (!forcar && Date.now() - estado.consultadaEm < VALIDADE_CACHE) return Promise.resolve(estado.usuario);
        const versao = ++estado.versao;
        const consulta = (async () => {
            const abort = new AbortController();
            const timeout = window.setTimeout(() => abort.abort(), 10000);
            try {
                const retorno = await fetch(`${API}/verificar_token`, { credentials: "include", signal: abort.signal });
                if (estado.versao !== versao) return estado.usuario;
                if (retorno.status === 401) {
                    limparSessao();
                    estado.consultadaEm = Date.now();
                    return null;
                }
                if (!retorno.ok) throw new Error("Nao foi possivel consultar sua sessao. Tente novamente.");
                const dados = await retorno.json();
                if (estado.versao !== versao) return estado.usuario;
                estado.usuario = dados.autenticado ? dados : null;
                estado.consultadaEm = Date.now();
                setUsuario(estado.usuario);
                setErro("");
                return estado.usuario;
            } catch (falha) {
                if (estado.versao === versao) setErro(falha.name === "AbortError" ? "A consulta da sessao demorou. Tente novamente." : falha.message);
                return estado.usuario;
            } finally {
                window.clearTimeout(timeout);
                if (estado.versao === versao) {
                    estado.pendente = null;
                    setCarregando(false);
                }
            }
        })();
        estado.pendente = consulta;
        return consulta;
    }, [limparSessao]);

    const atualizarUsuario = useCallback((dados) => {
        if (!controle.current.usuario) return;
        controle.current.usuario = { ...controle.current.usuario, ...dados };
        setUsuario(controle.current.usuario);
    }, []);

    useEffect(() => {
        atualizarSessao({ forcar: false });
        const retomar = () => {
            if (document.hidden) return;
            atualizarSessao({ forcar: false });
            window.dispatchEvent(new Event("cursando:sincronizar"));
        };
        const invalidar = () => limparSessao();
        document.addEventListener("visibilitychange", retomar);
        window.addEventListener("cursando:sessao-invalida", invalidar);
        return () => {
            document.removeEventListener("visibilitychange", retomar);
            window.removeEventListener("cursando:sessao-invalida", invalidar);
        };
    }, [atualizarSessao, limparSessao]);

    useEffect(() => {
        if (!usuario?.expira_em) return;
        const restante = usuario.expira_em * 1000 - Date.now();
        if (restante <= 0) { limparSessao(); return; }
        const timer = window.setTimeout(limparSessao, Math.min(restante, 2147483647));
        return () => window.clearTimeout(timer);
    }, [usuario?.expira_em, limparSessao]);

    return <SessaoContext.Provider value={{ usuario, carregando, erro, atualizarSessao, atualizarUsuario, limparSessao }}>{children}</SessaoContext.Provider>;
}

