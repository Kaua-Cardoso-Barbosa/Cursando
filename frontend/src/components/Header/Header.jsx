import css from "./Header.module.css";
import {Link} from "react-router-dom";

export default function Header() {
  return (
    <header className={css.header}>
      <a className={css.brand} href="/">
        <img className={css.logo} src="/imagens_assets/logo.png" alt="Logo Cursando" />
        <span>Cursando</span>
      </a>
      <nav className={css.actions}>
          <Link className={css.register} to={'/cadastro'}>Cadastrar</Link>
          <Link className={css.login} to={'/login'}>Login</Link>
      </nav>
    </header>
  );
}
