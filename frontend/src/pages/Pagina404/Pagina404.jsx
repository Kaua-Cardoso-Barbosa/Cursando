import BotaoVoltar from '../../components/BotaoVoltar/BotaoVoltar.jsx';
import styles from "./Pagina404_38.module.css";

export default function Pagina404() {
  return (
    <main className={styles.page}>
      <h1>Erro 404</h1>
      <p>Pagina não encontrada.</p>
      <BotaoVoltar  to="/">
        Voltar para a home
      </BotaoVoltar>
    </main>
  );
}
