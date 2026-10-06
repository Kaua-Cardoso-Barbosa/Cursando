import css from "./Cadastro.module.css";
import { useState } from "react";
import Input from "../../components/Input/Input";
import Button from "../../components/Button/Button";
import {Link, useNavigate} from "react-router-dom";
import validarNome from "../../utils/validarNome";

export default function Cadastro({api, setMensagem}) {
    const [nome, setNome] = useState("");
    const [email, setEmail] = useState("");
    const [senha, setSenha] = useState("");
    const [confirmar_senha, setConfirmar_Senha] = useState("");
    const [cpf, setCpf] = useState("");

    const navigate = useNavigate();

    async function cadastrar(e) {
        e.preventDefault();

        if (!validarNome(nome)) {
            setMensagem({
                tipo: "erro",
                descricao: "Informe um nome valido, usando apenas letras, espacos, hifens ou apostrofos."
            });
            return;
        }

        if (!validarCpf(cpf)) {
            setMensagem({ tipo: "erro", descricao: "Informe um CPF valido." });
            return;
        }

        try {
            const retorno = await fetch(`${api}/cadastrar`, {
                method: "POST",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    nome,
                    email,
                    senha,
                    confirmar_senha,
                    cpf
                })
            });

            const dados = await retorno.json();

            if (!retorno.ok) {
                console.log("Erro do servidor:", dados);

                setMensagem(
                    dados.mensagem || "Erro ao realizar o cadastro."
                );

                return;
            }

            const emailConfirmacao = (dados.email || email).trim().toLowerCase().replace(/\.+$/, "");
            sessionStorage.setItem("cursando_email_pendente", emailConfirmacao);
            setMensagem(dados.mensagem || "Enviamos um codigo de verificacao para seu e-mail.");
            navigate("/verificar-email", { state: { email: emailConfirmacao, codigo_enviado: dados.codigo_enviado } });

        } catch (erro) {
            console.error("Erro ao conectar com o servidor:", erro);

            setMensagem(
                "Não foi possível conectar ao servidor."
            );
        }
    }

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

                    <p className={"campoObrigatorio"}>* Obrigatório</p>

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

function validarCpf(valor) {
    const cpf = (valor || "").replace(/\D/g, "");
    if (!/^\d{11}$/.test(cpf) || /^([0-9])\1+$/.test(cpf)) return false;
    const calcularDigito = (base, pesos) => {
        const resto = [...base].reduce((soma, numero, indice) => soma + Number(numero) * pesos[indice], 0) % 11;
        return resto < 2 ? 0 : 11 - resto;
    };
    const primeiro = calcularDigito(cpf.slice(0, 9), [10, 9, 8, 7, 6, 5, 4, 3, 2]);
    const segundo = calcularDigito(`${cpf.slice(0, 9)}${primeiro}`, [11, 10, 9, 8, 7, 6, 5, 4, 3, 2]);
    return cpf.endsWith(`${primeiro}${segundo}`);
}
