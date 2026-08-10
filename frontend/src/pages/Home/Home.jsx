import css from "./Home.module.css";

export default function Home() {
return <main>
  <section className={css.banner}>
    <div className={css.bannerTextos}>
      <p className={css.span}>Sua jornada começa aqui</p>
      <h1 id="home-title">Um espaço para aprender e evoluir.</h1>
      <p>Encontre conteúdos e ferramentas para deixar seus estudos mais simples.</p>
      <a className={css.cta} href="#sobre">Conheça o site</a>
    </div>
  </section>
  <section className={css.about}>
    <div>
      <p className={css.span}>Sobre o Cursando</p>
      <h2>Feito para acompanhar o seu ritmo.</h2>
    </div>
    <p>Esta seção está pronta para você apresentar a proposta do site, seus recursos e como ele pode ajudar estudantes no dia a dia.</p>
  </section>
</main>;
}
