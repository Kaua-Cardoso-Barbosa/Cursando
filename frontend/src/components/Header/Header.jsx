import css from "./Header.module.css";
import {Link} from "react-router-dom";
import Button from "../Button/Button.jsx";

export default function Header() {
  return (
    <header className={css.header}>
      <Link className={css.logoLink} to={"/"}>
        <img className={css.logo} src="/imagens_assets/logo.png" alt="Logo Cursando" />
        <span>Cursando</span>
      </Link>
      <nav className={css.actions}>
          <Button rota={"/cadastro"} tamanho={"medio"} fundoCor={"branco"} borda={"redondo"} texto={"Cadastro"} />
          <Link className={css.login} to={'/login'}>Login</Link>
      </nav>
    </header>
  );
}
