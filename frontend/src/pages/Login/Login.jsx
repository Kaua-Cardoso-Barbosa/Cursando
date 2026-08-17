import css from "./Login.module.css";
import { useState } from "react";

export default function Login() {
    const [email, setEmail] = useState("");
    const [senha, setSenha] = useState("");

    function handleLogin(evento) {
        evento.preventDefault();
        console.log("Email digitado:", email);
        console.log("Senha digitada:", senha);
        // Aqui depois vai entrar a chamada pro backend (fetch/axios)
    }

    return (
        <main className={css.fundo}>
            <section className={css.loginBox}>
                <h1>Login</h1>

                <form className={css.form} onSubmit={handleLogin}>
                    <div className={css.campo}>
                        <label htmlFor="email">Email:</label>
                        <input
                            type="email"
                            id="email"
                            value={email}
                            onChange={(evento) => setEmail(evento.target.value)}
                        />
                    </div>

                    <div className={css.campo}>
                        <label htmlFor="senha">Senha:</label>
                        <input
                            type="password"
                            id="senha"
                            value={senha}
                            onChange={(evento) => setSenha(evento.target.value)}
                        />
                    </div>

                    <button type="submit" className={css.botaoEntrar}>
                        Entrar
                    </button>

                    <p className={css.cadastroTexto}>
                        Não tem cadastro ?{" "}
                        <a href="/cadastro">Cadastre-se já</a>
                    </p>
                </form>
            </section>
        </main>
    );
}