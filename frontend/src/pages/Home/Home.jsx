import css from "./Home.module.css";
import Button from "../../components/Button/Button.jsx";

export default function Home() {
return <main>
  <section className={css.banner}>
    <div className={css.bannerTextos}>
      <span className={css.span}>Sua jornada começa aqui</span>
      <h1>Um espaço para aprender e evoluir.</h1>
      <p>Encontre conteúdos e ferramentas para deixar seus estudos mais simples.</p>
      <Button tamanho={"grande"} texto={"Começe hoje"} />
    </div>
  </section>
  <section className={css.about}>
    <div>
      <span className={css.span}>Sobre o Cursando</span>
      <h2>Feito para acompanhar o seu ritmo.</h2>
    </div>
  </section>
</main>;
}
