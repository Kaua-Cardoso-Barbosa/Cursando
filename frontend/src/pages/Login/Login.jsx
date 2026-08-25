import css from "./Login.module.css";
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import Input from "../../components/Input/Input";
import Button from "../../components/Button/Button";

export default function Login({ api, setMensagem }) {
    const [email, setEmail] = useState("");
    const [senha, setSenha] = useState("");
    const [carregando, setCarregando] = useState(false);
    const navigate = useNavigate();

    function getPayloadToken(token) {
        if (!token) {
            return {};
        }

        try {
            const payloadBase64 = token
                .split(".")[1]
                .replace(/-/g, "+")
                .replace(/_/g, "/");
            const payload = JSON.parse(atob(payloadBase64));

            return payload;
        } catch (erro) {
            console.error("Erro ao ler token de login:", erro);
            return {};
        }
    }

    function getRotaDashboard(dados) {
        const payloadToken = getPayloadToken(dados?.token);
        const tipoUsuario = (
            dados?.usuario?.tipo ??
            dados?.usuario?.tipo_usuario ??
            dados?.usuario?.perfil ??
            dados?.tipo ??
            dados?.perfil ??
            payloadToken?.tipo ??
            ""
        ).toString().toLowerCase();

        if (tipoUsuario === "0") {
            return "/DashboardAdm";
        }

        if (tipoUsuario === "1") {
            return "/DashboardProfessor";
        }

        if (tipoUsuario === "2") {
            return "/DashboardAluno";
        }

        return "/DashboardAluno";
    }


    async function logar(e) {
        e.preventDefault();

        try {
            setCarregando(true);

            const retorno = await fetch(`${api}/login`, {
                method: "POST",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    email: email,
                    senha: senha
                })
            });

            const dados = await retorno.json();

            if (dados.mensagem) {
                setMensagem(dados.mensagem);
            }

            if (!retorno.ok) {
                return;
            }

            navigate(getRotaDashboard(dados));
        } catch (erro) {
            console.error("Erro ao fazer login:", erro);
            setMensagem({
                tipo: "erro",
                descricao: "Não foi possível conectar com a API."
            });
        } finally {
            setCarregando(false);
        }
    }


    return (
        <main className={css.login}>
            <section className={css.formulario}>
                <h1>Login</h1>

                <form onSubmit={logar}>
                    <Input
                        tipoInp="email"
                        label="Email:"
                        htmlFor="email"
                        placeholder="Digite seu email"
                        value={email}
                        funcao={(evento) => setEmail(evento.target.value)}
                        required
                    />

                    <Input
                        tipoInp="password"
                        label="Senha:"
                        htmlFor="senha"
                        placeholder="Digite sua senha"
                        value={senha}
                        funcao={(evento) => setSenha(evento.target.value)}
                        required
                    />

                    <Button
                        tipo="submit"
                        texto={carregando ? "Entrando..." : "Entrar"}
                        fundoCor="verde"
                        tamanho="medio"
                    />
                </form>

                <p className={css.cadastro}>
                    Não tem cadastro?<Link to={`/cadastro`}> Cadastre-se já</Link>
                </p>
            </section>
        </main>
    );
}
