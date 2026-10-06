import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import css from "./VerificarEmail.module.css";

export default function VerificarEmail({ api, atualizarSessao }) {
    const location = useLocation();
    const navigate = useNavigate();
    const [email, setEmail] = useState(location.state?.email || sessionStorage.getItem("cursando_email_pendente") || "");
    const [codigo, setCodigo] = useState("");
    const [erro, setErro] = useState("");
    const [mensagem, setMensagem] = useState("");
    const [carregando, setCarregando] = useState(false);

    async function verificar(evento) {
        evento.preventDefault();
        setCarregando(true);
        setErro("");
        try {
            const resposta = await fetch(`${api}/verificar_email_cadastro`, {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, codigo: codigo.trim() })
            });
            const dados = await resposta.json();
            if (!resposta.ok) throw new Error(dados?.mensagem?.descricao || "Codigo invalido.");
            sessionStorage.removeItem("cursando_email_pendente");
            await atualizarSessao();
            navigate("/assinatura", { replace: true });
        } catch (error) {
            setErro(error.message || "Nao foi possivel verificar o e-mail.");
        } finally {
            setCarregando(false);
        }
    }

    async function reenviar() {
        setErro("");
        setMensagem("");
        try {
            const resposta = await fetch(`${api}/reenviar_codigo_cadastro`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email })
            });
            const dados = await resposta.json();
            if (!resposta.ok) throw new Error(dados?.mensagem?.descricao || "Nao foi possivel reenviar o codigo.");
            setMensagem("Enviamos um novo codigo para seu e-mail.");
        } catch (error) {
            setErro(error.message);
        }
    }

    return (
        <main className={css.pagina}>
            <section className={css.cartao}>
                <p className={css.etapa}>Verificacao de e-mail</p>
                <h1>Confirme seu e-mail</h1>
                <p>Enviamos um codigo de 6 digitos para <strong>{email || "o e-mail informado"}</strong>.</p>
                <form onSubmit={verificar}>
                    {!email && <><label htmlFor="email-pendente">E-mail do cadastro</label><input id="email-pendente" type="email" value={email} onChange={(evento) => setEmail(evento.target.value.trim().toLowerCase())} autoComplete="email" required /></>}
                    <label htmlFor="codigo-email">Codigo de verificacao</label>
                    <input id="codigo-email" value={codigo} onChange={(evento) => setCodigo(evento.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" required />
                    {erro && <p className={css.erro} role="alert">{erro}</p>}
                    {mensagem && <p className={css.sucesso} role="status">{mensagem}</p>}
                    <button type="submit" disabled={carregando || !email}>{carregando ? "Verificando..." : "Verificar e continuar"}</button>
                </form>
                <button type="button" className={css.reenviar} onClick={reenviar} disabled={!email}>Reenviar codigo</button>
            </section>
        </main>
    );
}
