import { cloneElement, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";

export default function RotaProtegida({
                                          api,
                                          tipoPermitido,
                                          children
                                      }) {
    const [carregando, setCarregando] = useState(true);
    const [usuario, setUsuario] = useState(null);

    useEffect(() => {
        async function verificarSessao() {
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

                if (!dados.autenticado) {
                    setUsuario(null);
                    return;
                }

                setUsuario(dados);
            } catch (erro) {
                console.error("Erro ao verificar sessao:", erro);
                setUsuario(null);
            } finally {
                setCarregando(false);
            }
        }

        verificarSessao();
    }, [api]);

    if (carregando) {
        return <p>Verificando sessao...</p>;
    }

    if (!usuario) {
        return <Navigate to="/login" replace />;
    }

    if (
        tipoPermitido !== undefined &&
        Number(usuario.tipo) !== Number(tipoPermitido)
    ) {
        return <Navigate to="/login" replace />;
    }

    return cloneElement(children, {
        usuario
    });
}
