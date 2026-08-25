import { Link } from "react-router-dom";
import styles from "./Pagina404.module.css";

export default function Pagina404() {
  return (
    <main className={styles.page}>
      <h1>Erro 404</h1>
      <p>Pagina não encontrada.</p>
      <Link className={styles.link} to="/">
        Voltar para a home
      </Link>
    </main>
  );
}
