import css from "./Home.module.css";
import Button from "../../components/Button/Button.jsx";
import CursoCard from "../../components/CursoCard/CursoCard.jsx";
import {Link} from "react-router-dom";

const cursosDestaque = [
    {
        imagem: "/imagens_banner_curso/fotografia.png",
        alt: "Fotografia digital",
        titulo: "Fotografia digital",
        descricao: "Domine técnicas de luz e composição",
    },
    {
        imagem: "/imagens_banner_curso/marketing.png",
        alt: "Marketing de Conteúdo",
        titulo: "Marketing de Conteúdo",
        descricao: "Estratégias para engajar seu público",
    },
    {
        imagem: "/imagens_banner_curso/design.png",
        alt: "Design",
        titulo: "Design",
        descricao: "Crie experiências visuais marcantes",
    },
];

const cursosAssinados = [
    {
        imagem: "/imagens_banner_curso/inteligenciaartificial.png",
        alt: "Inteligência Artificial",
        titulo: "Inteligência Artificial",
        descricao: "Aprenda fundamentos de IA aplicada",
    },
    {
        imagem: "/imagens_banner_curso/ingles.png",
        alt: "Inglês Avançado",
        titulo: "Inglês Avançado",
        descricao: "Fluência para o mercado global",
    },
    {
        imagem: "/imagens_banner_curso/fotografia.png",
        alt: "Fotografia digital",
        titulo: "Fotografia digital",
        descricao: "Domine técnicas de luz e composição",
    },
];

export default function Home() {
  return (
      <main>
          <section className={css.banner}>
            <div className={css.bannerTextos}>
                    <span className={css.span}>Sua jornada começa aqui</span>
                    <h1>Um espaço para aprender e evoluir.</h1>
                    <p>Encontre conteúdos que deixam seus estudos mais simples.</p>
            </div>
            <Button tamanho={"grande"} fundoCor={"verde"} texto={"Comece hoje"} rota={"/cadastro"} />
          </section>

          <section className={css.destaques}>

              <p className={css.tituloSecao}>Os Cursos que Estão Transformando Carreiras</p>

              <div className={css.subtituloContainer}>
                  <p className={css.subtituloSecao}>Destaques</p>
                  <Link className={css.verMais}>Ver mais</Link>
              </div>

              <div className={css.cursos}>
                  {cursosDestaque.map((curso) => (
                      <CursoCard
                          key={curso.titulo}
                          {...curso}
                      />
                  ))}
              </div>

          </section>

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

          <section className={css.assinados}>

              <p className={css.tituloSecao}>Seu futuro começa agora. Assine!</p>

              <div className={css.subtituloSecao}>
                  <span>Mais Assinados</span>
              </div>

              <div className={css.cursos}>
                  {cursosAssinados.map((curso) => (
                      <CursoCard key={curso.titulo} {...curso} />
                  ))}
              </div>

          </section>

      </main>
  )
}
