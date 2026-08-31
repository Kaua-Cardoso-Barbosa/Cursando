import css from "./Cadastro.module.css";
import { useState } from "react";
import Input from "../../components/Input/Input";
import Button from "../../components/Button/Button";
import {Link} from "react-router-dom";

export default function Cadastro({api, setMensagem}) {
    const [nome, setNome] = useState("");
    const [email, setEmail] = useState("");
    const [senha, setSenha] = useState("");
    const [confirmar_senha, setConfirmar_Senha] = useState("");
    const [cpf, setCpf] = useState("");

    async function cadastrar(e) {
        e.preventDefault();

        const retorno = await fetch(`${api}/cadastrar`, {
            method: "POST",
            credentials: "include",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                nome: nome,
                email: email,
                senha: senha,
                confirmar_senha: confirmar_senha,
                cpf: cpf
            })
        });

        const dados = await retorno.json();

        if (!retorno) {
            console.log("Erro do servidor:", dados);
            alert("DEU RUIM DE MAIIIISSSS!!! APAGA, SOCORRO DEUS")
        }
        if (dados.mensagem){
            setMensagem(dados.mensagem);
        }
    };

    return (
        <main className={css.cadastro}>
            <section className={css.formulario}>

                <h1>Cadastro</h1>

                <form onSubmit={cadastrar}>
                    <Input
                        tipoInp="text"
                        label="Nome:"
                        htmlFor="nome"
                        placeholder="Digite seu nome"
                        value={nome}
                        funcao={(evento) => setNome(evento.target.value)}
                        obrigatorio={"Sim"}
                    />

                    <Input
                        tipoInp="email"
                        label="Email:"
                        htmlFor="email"
                        placeholder="Digite seu email"
                        value={email}
                        funcao={(evento) => setEmail(evento.target.value)}
                        obrigatorio={"Sim"}
                    />

                    <Input
                        tipoInp="password"
                        label="Senha:"
                        htmlFor="senha"
                        placeholder="Digite sua senha"
                        value={senha}
                        funcao={(evento) => setSenha(evento.target.value)}
                        obrigatorio={"Sim"}
                    />

                    <Input
                        tipoInp="password"
                        label="Confirmar Senha:"
                        htmlFor="confirmar_senha"
                        placeholder="Confirme sua senha"
                        value={confirmar_senha}
                        funcao={(evento) => setConfirmar_Senha(evento.target.value)}
                        obrigatorio={"Sim"}
                    />

                    <Input
                        tipoInp="text"
                        label="CPF:"
                        htmlFor="cpf"
                        placeholder="Digite seu CPF"
                        value={cpf}
                        funcao={(evento) => setCpf(evento.target.value)}
                        mask="cpf"
                        obrigatorio={"Sim"}
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