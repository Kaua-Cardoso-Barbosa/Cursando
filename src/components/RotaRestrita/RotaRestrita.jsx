import { Navigate } from "react-router-dom";
import { useEffect, useState, cloneElement } from "react";

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

                setUsuario(dados);
            } catch (erro) {
                console.error("Erro ao verificar sessão:", erro);
                setUsuario(null);
            } finally {
                setCarregando(false);
            }
        }

        verificarSessao();
    }, [api]);

    if (carregando) {
        return <p>Verificando sessão...</p>;
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
        usuario: usuario
    });
}