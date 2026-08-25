import { useState } from "react";
import Input from "../Input/Input";
import Button from "../Button/Button";
import css from "./CadastroColaborador.module.css";

export default function CadastroColaborador({
                                                     api,
                                                     tipo,
                                                     fechar,
                                                     setMensagem,
                                                     aoCadastrar
                                                 }) {
    const [nome, setNome] = useState("");
    const [email, setEmail] = useState("");
    const [senha, setSenha] = useState("");
    const [confirmar_Senha, setConfirmar_Senha] = useState("");
    const [cpf, setCpf] = useState("");
    const [carregando, setCarregando] = useState(false);

    const nomeTipo = tipo === 1 ? "Professor" : "Administrador";

    async function cadastrar(e) {
        e.preventDefault();

        try {
            setCarregando(true);

            console.log("nome:", nome);
            console.log("email:", email);
            console.log("senha:", senha);
            console.log("confirmar_senha:", confirmar_Senha);
            console.log("cpf:", cpf);
            console.log("tipo:", tipo);

            console.log("Cookies:", document.cookie);

            const retorno = await fetch(`${api}/cadastrar_colaborador`, {
                method: "POST",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    nome: nome,
                    email: email,
                    senha: senha,
                    confirmar_senha: confirmar_Senha,
                    cpf: cpf,
                    tipo: tipo
                })
            });

            const dados = await retorno.json();

            if (dados.mensagem) {
                setMensagem(dados.mensagem);
            }

            if (!retorno.ok) {
                return;
            }

            if (aoCadastrar) {
                aoCadastrar();
            }

            setNome("");
            setEmail("");
            setSenha("");
            setConfirmar_Senha("");
            setCpf("");

            fechar();

        } catch (erro) {
            console.error("Erro ao cadastrar colaborador:", erro);

            setMensagem({
                tipo: "erro",
                descricao: "Não foi possível conectar com a API."
            });

        } finally {
            setCarregando(false);
        }
    }

    return (
        <div className={css.overlay} onClick={fechar}>

            <section
                className={css.popup}
                onClick={(e) => e.stopPropagation()}
            >

                <button
                    type="button"
                    className={css.fechar}
                    onClick={fechar}
                >
                    ×
                </button>

                <h2>Cadastrar {nomeTipo}</h2>

                <form onSubmit={cadastrar}>

                    <Input
                        tipoInp="text"
                        label="Nome:"
                        htmlFor="nome"
                        placeholder="Digite o nome"
                        value={nome}
                        funcao={(e) => setNome(e.target.value)}
                        required
                    />

                    <Input
                        tipoInp="email"
                        label="Email:"
                        htmlFor="email"
                        placeholder="Digite o email"
                        value={email}
                        funcao={(e) => setEmail(e.target.value)}
                        required
                    />

                    <Input
                        tipoInp="password"
                        label="Senha:"
                        htmlFor="senha"
                        placeholder="Digite a senha"
                        value={senha}
                        funcao={(e) => setSenha(e.target.value)}
                        required
                    />

                    <Input
                        tipoInp="password"
                        label="Confirmar Senha:"
                        htmlFor="confirmar_senha"
                        placeholder="Confirme a senha"
                        value={confirmar_Senha}
                        funcao={(e) => setConfirmar_Senha(e.target.value)}
                        required
                    />

                    <Input
                        tipoInp="text"
                        label="CPF:"
                        htmlFor="cpf"
                        placeholder="Digite o CPF"
                        value={cpf}
                        funcao={(e) => setCpf(e.target.value)}
                        mask="cpf"
                        required
                    />

                    <div className={css.botoes}>

                        <Button
                            tipo="button"
                            texto="Cancelar"
                            fundoCor="vermelho"
                            tamanho="medio"
                            onClick={fechar}
                        />

                        <Button
                            tipo="submit"
                            texto={carregando ? "Cadastrando..." : "Cadastrar"}
                            fundoCor="verde"
                            tamanho="medio"
                        />

                    </div>

                </form>

            </section>

        </div>
    );
}