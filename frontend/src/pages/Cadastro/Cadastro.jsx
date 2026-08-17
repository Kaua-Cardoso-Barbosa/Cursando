import css from "./Cadastro.module.css";

export default function Cadastro() {
    return (
        <main className={css.cadastro}>

            <section className={css.formulario}>

                <h1>Cadastro</h1>

                <div className={css.campo}>
                    <label>Nome:</label>
                    <input type="text" />
                </div>

                <div className={css.campo}>
                    <label>Email:</label>
                    <input type="email" />
                </div>

                <div className={css.linha}>

                    <div className={css.campo}>
                        <label>Senha:</label>
                        <input type="password" />
                    </div>

                    <div className={css.campo}>
                        <label>Confirmar Senha:</label>
                        <input type="password" />
                    </div>

                </div>

                <div className={css.campo}>
                    <label>CPF:</label>
                    <input type="text" />
                </div>

                <button className={css.botao}>
                    Assinar
                </button>

                <p className={css.login}>
                    Já tem cadastro?{" "}
                    <a href="/login">Faça login</a>
                </p>

            </section>

        </main>
    );
}