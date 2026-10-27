import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import css from "./VerificarEmail_38.module.css";

const emailInicial = (locationEmail, emailPendente) =>
    (locationEmail || emailPendente || "").trim().toLowerCase().replace(/\.+$/, "");

export default function VerificarEmail({ api, atualizarSessao }) {
    const location = useLocation();
    const navigate = useNavigate();
    const [email, setEmail] = useState(() =>
        emailInicial(location.state?.email, sessionStorage.getItem("cursando_email_pendente"))
    );
    const [campoEmailInicial, setCampoEmailInicial] = useState(() =>
        !emailInicial(location.state?.email, sessionStorage.getItem("cursando_email_pendente"))
    );
    const [novoEmail, setNovoEmail] = useState(() =>
        emailInicial(location.state?.email, sessionStorage.getItem("cursando_email_pendente"))
    );
    const [codigo, setCodigo] = useState("");
    const [senha, setSenha] = useState("");
    const [corrigindoEmail, setCorrigindoEmail] = useState(false);
    const [salvandoEmail, setSalvandoEmail] = useState(false);
    const [reenviando, setReenviando] = useState(false);
    const [erro, setErro] = useState("");
    const [mensagem, setMensagem] = useState(location.state?.codigo_enviado === false
        ? "Seu cadastro foi criado, mas não conseguimos enviar o código. Tente reenviá-lo."
        : "");
    const [carregando, setCarregando] = useState(false);

/* Sprint item 1 - Implementar cadastro de alunos pelo aplicativo - Envia o código para confirmar o e-mail do cadastro */
async function verificar(evento) {
        evento.preventDefault();
        setCarregando(true);
        setErro("");
        try {
            const resposta = await fetch(api + "/verificar_email_cadastro", {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, codigo: codigo.trim() })
            });
            const dados = await resposta.json();
            if (!resposta.ok) throw new Error(dados?.mensagem?.descricao || "Código inválido. Confira os números e tente novamente.");
            sessionStorage.removeItem("cursando_email_pendente");
            await atualizarSessao();

            navigate("/DashboardAluno/assinatura", { replace: true });
        } catch (error) {
            setErro(error.message || "Não foi possível verificar o e-mail.");
        } finally {
            setCarregando(false);
        }
    }
/* Fim item 1 */

    /* Sprint item 1 - Implementar cadastro de alunos pelo aplicativo - Solicita um novo código de confirmação do e-mail */
    async function reenviar() {
        setErro("");
        setMensagem("");
        setReenviando(true);
        try {
            const resposta = await fetch(api + "/reenviar_codigo_cadastro", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email })
            });
            const dados = await resposta.json();
            if (!resposta.ok) throw new Error(dados?.mensagem?.descricao || "Não foi possível reenviar o código.");
            setMensagem("Enviamos um novo código para o seu e-mail.");
        } catch (error) {
            setErro(error.message || "Não foi possível reenviar o código.");
        } finally {
            setReenviando(false);
        }
    }
    /* Fim item 1 */

    /* Sprint item 1 - Implementar cadastro de alunos pelo aplicativo - Atualiza o e-mail pendente e solicita nova confirmação */
    async function corrigirEmail() {
        setErro("");
        setMensagem("");
        setSalvandoEmail(true);
        try {
            const resposta = await fetch(api + "/corrigir_email_cadastro", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email_atual: email,
                    novo_email: novoEmail.trim().toLowerCase().replace(/\.+$/, ""),
                    senha
                })
            });
            const dados = await resposta.json();
            if (!resposta.ok) throw new Error(dados?.mensagem?.descricao || "Não foi possível corrigir o e-mail.");
            setEmail(dados.email);
            setNovoEmail(dados.email);
            setCampoEmailInicial(false);
            sessionStorage.setItem("cursando_email_pendente", dados.email);
            setCodigo("");
            setSenha("");
            setCorrigindoEmail(false);
            setMensagem(dados.codigo_enviado
                ? "E-mail atualizado. Enviamos um novo código para o endereço informado."
                : "E-mail atualizado, mas não foi possível enviar o código. Tente reenviá-lo.");
        } catch (error) {
            setErro(error.message || "Não foi possível corrigir o e-mail.");
        } finally {
            setSalvandoEmail(false);
        }
    }
    /* Fim item 1 */

    return (
        <main className={css.pagina}>
            <div className={css.cartao}>
                <aside className={css.painelInfo} aria-label="Etapas do cadastro">
                    {/* Sprint item 1 - Implementar cadastro de alunos pelo aplicativo - Valida e envia os dados para o cadastro e a confirmação do e-mail */}
                    <div className={css.marca}>
                        <img className={css.marcaIcone} src="/imagens_assets/logo.png" alt="" />
                        <span>Cursando</span>
                    </div>
                    {/* Fim item 1 */}

                    {/* Sprint item 1 - Implementar cadastro de alunos pelo aplicativo - Valida e envia os dados para o cadastro e a confirmação do e-mail */}
                    <div className={css.iconeEnvelope} aria-hidden="true">
                        <svg viewBox="0 0 48 48" fill="none">
                            <rect x="5" y="10" width="38" height="28" rx="6" stroke="currentColor" strokeWidth="2.5" />
                            <path d="m8 14 16 13 16-13" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M34 5h8M38 1v8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                        </svg>
                    </div>
                    {/* Fim item 1 */}

                    <p className={css.chamada}>SUA CONTA, COM SEGURANÇA</p>
                    <h2>Falta pouco para começar.</h2>
                    <p className={css.textoPainel}>Confirme seu endereço de e-mail para seguir para o pagamento e concluir seu acesso.</p>

                    <ol className={css.passos}>
                        <li className={css.concluido}>
                            <span className={css.numero} aria-hidden="true">✓</span>
                            <span><strong>Cadastro</strong><small>Dados enviados</small></span>
                        </li>
                        <li className={css.ativo} aria-current="step">
                            <span className={css.numero} aria-hidden="true">2</span>
                            <span><strong>Verificação</strong><small>Confirme seu e-mail</small></span>
                        </li>
                        <li>
                            <span className={css.numero} aria-hidden="true">3</span>
                            <span><strong>Pagamento</strong><small>Escolha como pagar</small></span>
                        </li>
                    </ol>
                </aside>

                <section className={css.conteudo}>
                    {/* Sprint item 1 - Implementar cadastro de alunos pelo aplicativo - Valida e envia os dados para o cadastro e a confirmação do e-mail */}
                    <div className={css.cabecalho}>
                        <span className={css.etapa}>ETAPA 2 DE 3</span>
                        <span className={css.selo}><span aria-hidden="true">●</span> Verificação de e-mail</span>
                    </div>
                    {/* Fim item 1 */}
                    <h1>Confirme seu e-mail</h1>
                    <p className={css.introducao}>
                        Digite o código de 6 dígitos enviado para{" "}
                        <strong>{email || "o e-mail informado no cadastro"}</strong>.
                    </p>

                    {erro && <p className={css.erro} role="alert">{erro}</p>}
                    {mensagem && <p className={css.sucesso} role="status" aria-live="polite">{mensagem}</p>}

                    {corrigindoEmail && (
                        <form
                            className={css.corrigir}
                            onSubmit={(evento) => {
                                evento.preventDefault();
                                corrigirEmail();
                            }}
                        >
                            {/* Sprint item 1 - Implementar cadastro de alunos pelo aplicativo - Valida e envia os dados para o cadastro e a confirmação do e-mail */}
                            <div>
                                <h2>Corrija o endereço</h2>
                                <p>Informe o e-mail correto e a senha usada no cadastro.</p>
                            </div>
                            {/* Fim item 1 */}
                            <label htmlFor="novo-email">Novo e-mail</label>
                            <input
                                className={css.campo}
                                id="novo-email"
                                type="email"
                                value={novoEmail}
                                onChange={(evento) => setNovoEmail(evento.target.value)}
                                autoComplete="email"
                                required
                            />
                            <label htmlFor="senha-cadastro">Senha do cadastro</label>
                            <input
                                className={css.campo}
                                id="senha-cadastro"
                                type="password"
                                value={senha}
                                onChange={(evento) => setSenha(evento.target.value)}
                                autoComplete="current-password"
                                required
                            />
                            {/* Sprint item 1 - Implementar cadastro de alunos pelo aplicativo - Valida e envia os dados para o cadastro e a confirmação do e-mail */}
                            <div className={css.acoesCorrecao}>
                                <button
                                    type="button"
                                    className={css.botaoSecundario}
                                    onClick={() => setCorrigindoEmail(false)}
                                    disabled={salvandoEmail}
                                >
                                    Voltar
                                </button>
                                <button type="submit" disabled={salvandoEmail}>
                                    {salvandoEmail ? "Salvando..." : "Salvar novo e-mail"}
                                </button>
                            </div>
                            {/* Fim item 1 */}
                        </form>
                    )}

                    {!corrigindoEmail && !campoEmailInicial && email && (
                        <button
                            type="button"
                            className={css.linkCorrecao}
                            onClick={() => {
                                setNovoEmail(email);
                                setCorrigindoEmail(true);
                            }}
                        >
                            O endereço está incorreto? <strong>Corrigir e-mail</strong>
                        </button>
                    )}

                    {!corrigindoEmail && (
                        <>
                            <form className={css.formulario} onSubmit={verificar}>
                                {campoEmailInicial && (
                                    <>
                                        <label htmlFor="email-pendente">E-mail do cadastro</label>
                                        <input
                                            className={css.campo}
                                            id="email-pendente"
                                            type="email"
                                            value={email}
                                            onChange={(evento) => setEmail(evento.target.value.trim().toLowerCase().replace(/\.+$/, ""))}
                                            autoComplete="email"
                                            required
                                        />
                                    </>
                                )}
                                <label htmlFor="codigo-email">Código de verificação</label>
                                <p id="codigo-dica" className={css.dica}>Confira sua caixa de entrada e a pasta de spam.</p>
                                <input
                                    className={css.codigo}
                                    id="codigo-email"
                                    type="text"
                                    value={codigo}
                                    onChange={(evento) => setCodigo(evento.target.value.replace(/\D/g, "").slice(0, 6))}
                                    inputMode="numeric"
                                    autoComplete="one-time-code"
                                    pattern="[0-9]{6}"
                                    maxLength={6}
                                    placeholder="000000"
                                    aria-describedby="codigo-dica"
                                    required
                                />
                                <button className={css.botaoPrincipal} type="submit" disabled={carregando || !email}>
                                    {carregando ? "Verificando..." : "Verificar e continuar"}
                                    {!carregando && <span aria-hidden="true">→</span>}
                                </button>
                            </form>

                            {/* Sprint item 1 - Implementar cadastro de alunos pelo aplicativo - Valida e envia os dados para o cadastro e a confirmação do e-mail */}
                            <div className={css.reenvio}>
                                <span>Não recebeu o código?</span>
                                <button type="button" onClick={reenviar} disabled={!email || reenviando || carregando}>
                                    {reenviando ? "Enviando..." : "Reenviar código"}
                                </button>
                            </div>
                            {/* Fim item 1 */}
                        </>
                    )}
                    <p className={css.privacidade}>
                        Usamos seu e-mail para proteger o acesso à sua conta.
                    </p>
                </section>
            </div>
        </main>
    );
}
