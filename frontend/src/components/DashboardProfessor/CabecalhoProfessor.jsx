import { FaUser } from "react-icons/fa";
import Button from "../Button/Button.jsx";
import css from "../../pages/DashboardProfessor/DashboardProfessor.module.css";

export default function CabecalhoProfessor({ usuario, sair }) {
    return (
        <header className={css.cabecalhoUsuario}>
            <div className={css.dadosUsuario}>
                <h1>Olá {usuario.nome}</h1>
                <span className={css.cargoUsuario}>Professor(a)</span>
            </div>

            <div className={css.acoesUsuario}>
                <Button texto="Sair" fundoCor="vermelho" tamanho="pequeno" onClick={sair} />
                <div className={css.fotoPerfil}>
                    <FaUser />
                </div>
            </div>
        </header>
    );
}
