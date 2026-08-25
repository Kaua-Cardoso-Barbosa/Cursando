import css from "./Home.module.css";
import Button from "../../components/Button/Button.jsx";

export default function Home() {
  return (
      <main>
          <section className={css.banner}>
            <div className={css.bannerTextos}>
                    <span className={css.span}>Sua jornada começa aqui</span>
                    <h1>Um espaço para aprender e evoluir.</h1>
                    <p>Encontre conteúdos que deixam seus estudos mais simples.</p>
            </div>
            <Button tamanho={"grande"} fundoCor={"verde"} texto={"Começe hoje"} rota={"/cadastro"} />  {/* Botão */}
          </section>
          <section className={css.about}>
              <div>
                  <span className={css.span}>Sobre o Cursando</span>
                  <h2>Feito para acompanhar o seu ritmo.</h2>
              </div>
          </section>

          {/* DESTAQUES */}
          <section className={css.destaques}>

              <h1>Os Cursos que Estão Transformando Carreiras</h1>

              <div className={css.tituloSecao}>
                  <span>Destaques</span>
                  <a href="#">Ver mais</a>
              </div>

              <div className={css.cursos}>

                  <div className={css.card}>
                      <img
                          src="./public/imagens_banner_curso/fotografia.png"
                          alt="Fotografia digital"
                      />

                      <div className={css.cardTexto}>
                          <h3>Fotografia digital</h3>
                          <p>Domine técnicas de luz e composição</p>
                      </div>
                  </div>

                  <div className={css.card}>
                      <img
                          src="/imagens/marketing.jpg"
                          alt="Marketing de Conteúdo"
                      />

                      <div className={css.cardTexto}>
                          <h3>Marketing de Conteúdo</h3>
                          <p>Estratégias para engajar seu público</p>
                      </div>
                  </div>

                  <div className={css.card}>
                      <img
                          src="/imagens/design.jpg"
                          alt="Fotografia digital"
                      />

                      <div className={css.cardTexto}>
                          <h3>Fotografia digital</h3>
                          <p>Domine técnicas de luz e composição</p>
                      </div>
                  </div>

              </div>

          </section>


          {/* POR QUE ESCOLHER A CURSANDO */}
          <section className={css.porque}>

              <div className={css.porqueTexto}>

                  <h2>Por que escolher a Cursando?</h2>

                  <p>
                      Na Cursando, aprender é simples, prático e acessível.
                      Oferecemos cursos online de qualidade para quem deseja
                      desenvolver novas habilidades, crescer profissionalmente
                      ou conquistar novos objetivos. Com conteúdos
                      atualizados, professores qualificados e uma plataforma
                      intuitiva, você tem a liberdade de estudar no seu ritmo,
                      de onde estiver e quando quiser.
                  </p>

              </div>

              <div className={css.porqueImagem}>
                  <img
                      src="/imagens/aluna.jpg"
                      alt="Aluna estudando"
                  />
              </div>

          </section>


          {/* MAIS ASSINADOS */}
          <section className={css.assinados}>

              <h2>Seu futuro começa agora. Assine!</h2>

              <div className={css.tituloSecao}>
                  <span>Mais Assinados</span>
                  <a href="#">Ver mais</a>
              </div>

              <div className={css.cursos}>

                  <div className={css.card}>
                      <img
                          src="/imagens/cerebro.jpg"
                          alt="Fotografia digital"
                      />

                      <div className={css.cardTexto}>
                          <h3>Fotografia digital</h3>
                          <p>Domine técnicas de luz e composição</p>
                      </div>
                  </div>

                  <div className={css.card}>
                      <img
                          src="/imagens/ingles.jpg"
                          alt="Inglês Avançado"
                      />

                      <div className={css.cardTexto}>
                          <h3>Inglês Avançado</h3>
                          <p>Fluência para o mercado global</p>
                      </div>
                  </div>

                  <div className={css.card}>
                      <img
                          src="/imagens/fotografia.jpg"
                          alt="Fotografia digital"
                      />

                      <div className={css.cardTexto}>
                          <h3>Fotografia digital</h3>
                          <p>Domine técnicas de luz e composição</p>
                      </div>
                  </div>

              </div>

          </section>

      </main>
  )
}
