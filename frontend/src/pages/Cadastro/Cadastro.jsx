import css from "./Cadastro.module.css";
import { useState } from "react";
import Input from "../../components/Input/Input";
import Button from "../../components/Button/Button";
import {Link} from "react-router-dom";

export default function Cadastro() {
    const [nome, setNome] = useState("");
    const [email, setEmail] = useState("");
    const [senha, setSenha] = useState("");
    const [confirmarSenha, setConfirmarSenha] = useState("");
    const [cpf, setCpf] = useState("");

    const handleSubmit = (e) => {
        e.preventDefault();
        // Lógica de cadastro aqui
    };

    return (
        <main className={css.cadastro}>

            <section className={css.formulario}>

                <h1>Cadastro</h1>

                <form onSubmit={handleSubmit}>
                    <Input
                        tipoInp="text"
                        label="Nome:"
                        htmlFor="nome"
                        placeholder="Digite seu nome"
                        value={nome}
                        funcao={(evento) => setNome(evento.target.value)}
                    />

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

                    <Input
                        tipoInp="password"
                        label="Confirmar Senha:"
                        htmlFor="confirmarSenha"
                        placeholder="Confirme sua senha"
                        value={confirmarSenha}
                        funcao={(evento) => setConfirmarSenha(evento.target.value)}
                    />

                    <Input
                        tipoInp="text"
                        label="CPF:"
                        htmlFor="cpf"
                        placeholder="Digite seu CPF"
                        value={cpf}
                        funcao={(evento) => setCpf(evento.target.value)}
                        mask="cpf"
                    />

                    <Button
                        tipo="submit"
                        texto="Cadastrar-se"
                        fundoCor="verde"
                        tamanho="medio"
                    />
                </form>

                <p className={css.login}>
                    Já tem cadastro?<Link to={`/login`}> Faça Login</Link>
                </p>

            </section>

        </main>
    );
}