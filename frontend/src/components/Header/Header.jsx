import css from "./Header.module.css";
import {Link} from "react-router-dom";
import Button from "../Button/Button.jsx";
import { useEffect, useState } from "react";

function dashboardPorTipo(tipo) {
    if (Number(tipo) === 0) return "/DashboardAdm";
    if (Number(tipo) === 1) return "/DashboardProfessor";
    return "/DashboardAluno";
}

export default function Header({ api }) {
  const [usuario, setUsuario] = useState(null);

  useEffect(() => {
    async function verificarSessao() {
      if (!api) {
        setUsuario(null);
        return;
      }

      try {
        const retorno = await fetch(`${api}/verificar_token`, {
          method: "GET",
          credentials: "include"
        });

        if (!retorno.ok) {
          setUsuario(null);
          return;
        }

        const dados = await retorno.json();
        setUsuario(dados.autenticado ? dados : null);
      } catch (erro) {
        console.error("Erro ao verificar sessao no header:", erro);
        setUsuario(null);
      }
    }

    verificarSessao();
  }, [api]);

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
