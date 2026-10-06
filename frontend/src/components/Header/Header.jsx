import css from "./Header.module.css";
import {Link} from "react-router-dom";
import { FaUser } from "react-icons/fa";
import Button from "../Button/Button.jsx";

function dashboardPorTipo(tipo) {
    if (Number(tipo) === 0) return "/DashboardAdm";
    if (Number(tipo) === 1) return "/DashboardProfessor";
    return "/DashboardAluno";
}

function perfilPorTipo(tipo) {
    if (Number(tipo) === 0) return "/DashboardAdm/perfil";
    if (Number(tipo) === 1) return "/DashboardProfessor/perfil";
    return "/DashboardAluno/perfil";
}

function resolverUrlMidia(caminho) {
    const api = import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:5000`;
    if (!caminho) return "";
    if (caminho.startsWith("http://") || caminho.startsWith("https://")) {
        return caminho;
    }
    return `${api}${caminho}`;
}

export default function Header({ usuario, sair }) {
  const imagemPerfil = usuario?.imagem_perfil ? resolverUrlMidia(usuario.imagem_perfil) : "";

  return (
    <header className={css.header}>
      <Link className={css.logoLink} to={"/"}>
        <img className={css.logo} src="/imagens_assets/logo.png" alt="Logo Cursando" />
        <span>Cursando</span>
      </Link>
      <nav className={css.actions}>
        {usuario ? (
          <>
            <Button rota={dashboardPorTipo(usuario.tipo)} tamanho={"pequeno"} fundoCor={"verde"} borda={"redondo"} texto={"Dashboard"} />
            <Link className={css.perfilLink} to={perfilPorTipo(usuario.tipo)} title="Perfil" aria-label="Perfil">
              <span className={css.nomePerfil}>{usuario.nome}</span>
              <span className={css.avatarPerfil}>
                {imagemPerfil ? (
                  <img src={imagemPerfil} alt="" />
                ) : (
                  <FaUser />
                )}
              </span>
            </Link>
            <Button tamanho={"pequeno"} fundoCor={"vermelho"} borda={"redondo"} texto={"Sair"} onClick={sair} />
          </>
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
