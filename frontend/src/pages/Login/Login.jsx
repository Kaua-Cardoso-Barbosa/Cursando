import css from "./Login.module.css";
import { useState } from "react";
import Input from "../../components/Input/Input";
import Button from "../../components/Button/Button";

export default function Login() {
    const [email, setEmail] = useState("");
    const [senha, setSenha] = useState("");

    const handleSubmit = (e) => {
        e.preventDefault();
        // Lógica de login aqui
    };

    return (
        <main className={css.fundo}>
            <section className={css.loginBox}>
                <h1>Login</h1>

                <form className={css.form} onSubmit={handleSubmit}>
                    <Input
                        tipoInp="email"
                        label="Email:"
                        htmlFor="email"
                        placeholder="Digite seu email"
                        value={email}
                        funcao={(evento) => setEmail(evento.target.value)}
                    />

                    <Input
                        tipoInp="password"
                        label="Senha:"
                        htmlFor="senha"
                        placeholder="Digite sua senha"
                        value={senha}
                        funcao={(evento) => setSenha(evento.target.value)}
                    />

                    <Button
                        tipo="submit"
                        texto="Entrar"
                        fundoCor="azul"
                        tamanho="grande"
                    />

                    <p className={css.cadastroTexto}>
                        Não tem cadastro ?{" "}
                        <a href="/cadastro">Cadastre-se já</a>
                    </p>
                </form>
            </section>
        </main>
    );
}