import { useSessao } from "../../context/useSessao.js";
import { cloneElement, useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";

export default
function RotaProtegida({
                                          api,
                                          tipoPermitido,
                                          exigirAssinatura = false,
                                          children
                                      }) {
    const { usuario, carregando, erro, atualizarSessao, atualizarUsuario } = useSessao();
    const [assinaturaValida, setAssinaturaValida] = useState(exigirAssinatura ? null : true);
    const [erroAssinatura, setErroAssinatura] = useState("");
    const [consultaAssinatura, setConsultaAssinatura] = useState(0);
    const location = useLocation();

    useEffect(() => {
        if (!exigirAssinatura || Number(usuario?.tipo) !== 2) return;
        let ativo = true;
        const consultar = async () => {
            setErroAssinatura("");
            try {
                const resposta = await fetch(`${api}/assinaturas/verificar`, { credentials: "include" });
                const dados = await resposta.json();
                if (ativo && (resposta.ok || resposta.status === 403)) setAssinaturaValida(dados.assinatura === true);
                else if (ativo) setErroAssinatura("Não foi possível consultar sua assinatura.");
            } catch { if (ativo) setErroAssinatura("Não foi possível consultar sua assinatura."); }
        };
        consultar();
        window.addEventListener("cursando:sincronizar", consultar);
        return () => { ativo = false; window.removeEventListener("cursando:sincronizar", consultar); };
    }, [api, exigirAssinatura, usuario?.id_usuario, usuario?.tipo, consultaAssinatura]);

    if (carregando) {
        return <p>Verificando sessao...</p>;
    }

    if (!usuario && erro) {
        return <div role="alert"><p>{erro}</p><button onClick={() => atualizarSessao()}>Tentar novamente</button></div>;
    }

    if (!usuario) {
        return <Navigate to="/login" replace />;
    }


    const destinoSessao = Number(usuario.tipo) === 2 && usuario.redirecionar === "/assinatura"
        ? null
        : usuario.redirecionar;
    if (destinoSessao && location.pathname !== destinoSessao) {
        return <Navigate to={destinoSessao} replace />;
    }

    if (tipoPermitido !== undefined && Number(usuario.tipo) !== Number(tipoPermitido)) {
        return <Navigate to="/login" replace />;
    }
    if (exigirAssinatura && Number(usuario.tipo) === 2 && assinaturaValida === null) {
        return erroAssinatura
            ? <div role="alert"><p>{erroAssinatura}</p><button onClick={() => setConsultaAssinatura(n => n + 1)}>Tentar novamente</button></div>
            : <p>Verificando assinatura...</p>;
    }
    if (exigirAssinatura && Number(usuario.tipo) === 2 && assinaturaValida === false) {
        return <Navigate to="/DashboardAluno/financeiro" replace />;
    }

    return cloneElement(children, { usuario, onPerfilAtualizado: atualizarUsuario });
}
