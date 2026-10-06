import css from "../../pages/DashboardProfessor/DashboardProfessor.module.css";

export default function CabecalhoProfessor({ usuario }) {
    return (
        <header className={css.cabecalhoUsuario}>
            <div className={css.dadosUsuario}>
                <h1>Olá {usuario.nome}</h1>
                <span className={css.cargoUsuario}>Professor(a)</span>
            </div>

        </header>
    );
}
