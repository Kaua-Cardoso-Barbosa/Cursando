import { cloneElement, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";

export default function RotaProtegida({
                                          api,
                                          tipoPermitido,
                                          exigirAssinatura = false,
                                          children
                                      }) {
    const [carregando, setCarregando] = useState(true);
    const [usuario, setUsuario] = useState(null);
    const [assinaturaValida, setAssinaturaValida] = useState(!exigirAssinatura);

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

                if (exigirAssinatura && Number(dados.tipo) === 2) {
                    const assinatura = await fetch(`${api}/assinaturas/verificar`, {
                        credentials: "include"
                    });
                    setAssinaturaValida(assinatura.ok);
                }
            } catch (erro) {
                console.error("Erro ao verificar sessao:", erro);
                setUsuario(null);
            } finally {
                setCarregando(false);
            }
        }

        verificarSessao();
    }, [api, exigirAssinatura]);

    if (carregando) {
        return <p>Verificando sessao...</p>;
    }

    if (!usuario) {
        return <Navigate to="/login" replace />;
    }

    if (exigirAssinatura && !assinaturaValida) {
        return <Navigate to="/assinatura" replace />;
    }

    if (
        tipoPermitido !== undefined &&
        Number(usuario.tipo) !== Number(tipoPermitido)
    ) {
        return <Navigate to="/login" replace />;
    }

    function atualizarUsuario(dadosAtualizados) {
        setUsuario((usuarioAtual) => ({
            ...usuarioAtual,
            ...dadosAtualizados
        }));

        children.props.onPerfilAtualizado?.(dadosAtualizados);
    }

    return cloneElement(children, {
        usuario,
        onPerfilAtualizado: atualizarUsuario
    });
}
