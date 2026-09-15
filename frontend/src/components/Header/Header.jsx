import css from "./Header.module.css";
import {Link} from "react-router-dom";
import Button from "../Button/Button.jsx";

function dashboardPorTipo(tipo) {
    if (Number(tipo) === 0) return "/DashboardAdm";
    if (Number(tipo) === 1) return "/DashboardProfessor";
    return "/DashboardAluno";
}

export default function Header({ usuario }) {
  return (
    <header className={css.header}>
      <Link className={css.logoLink} to={"/"}>
        <img className={css.logo} src="/imagens_assets/logo.png" alt="Logo Cursando" />
        <span>Cursando</span>
      </Link>
      <nav className={css.actions}>
        {usuario ? (
          <Button rota={dashboardPorTipo(usuario.tipo)} tamanho={"pequeno"} fundoCor={"verde"} borda={"redondo"} texto={"Dashboard"} />
        ) : (
          <>
          <Button rota={"/cadastro"} tamanho={"pequeno"} fundoCor={"branco"} borda={"redondo"} texto={"Cadastro"} />
          <Button rota={"/login"} tamanho={"pequeno"} fundoCor={"verde"} borda={"redondo"} texto={"Login"} />
          </>
        )}
      </nav>
    </header>
  );
}
