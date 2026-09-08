import {
    FaGooglePlay,
    FaLinux,
    FaWindows
} from "react-icons/fa";
import css from "../../pages/DashboardProfessor/DashboardProfessor.module.css";

export default function RodapeProfessor() {
    return (
        <footer className={css.rodapePagina}>
            <div className={css.colunaRodape}>
                <h4>Contato</h4>
                <p>Birigui - SP</p>
                <p>(18)98131-3801</p>
                <p>cursando@gmail.com</p>
            </div>

            <div className={css.colunaRodape}>
                <h4>Navegação</h4>
                <a href="/">Home</a>
                <a href="/login">Login</a>
                <a href="/cadastro">Cadastro</a>
            </div>

            <div className={css.colunaRodape}>
                <h4>Baixe nosso aplicativo</h4>
                <ul className={css.listaApps}>
                    <li><FaGooglePlay /> Playstore</li>
                    <li><FaLinux /> Linux</li>
                    <li><FaWindows /> Windows</li>
                </ul>
            </div>
        </footer>
    );
}
