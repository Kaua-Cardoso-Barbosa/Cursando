import { cloneElement, useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";

export default function RotaProtegida({
                                          api,
                                          tipoPermitido,
                                          exigirAssinatura = false,
                                          children
                                      }) {
    const [carregando, setCarregando] = useState(true);
    const [usuario, setUsuario] = useState(null);
    const [assinaturaValida, setAssinaturaValida] = useState(!exigirAssinatura);
    const location = useLocation();

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
                    const dadosAssinatura = await assinatura.json().catch(() => ({}));
                    setAssinaturaValida(assinatura.ok && dadosAssinatura?.assinatura === true);
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

    useEffect(() => {
        async function sincronizarSessao() {
            if (document.hidden) return;

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

                if (dados.autenticado && exigirAssinatura && Number(dados.tipo) === 2) {
                    const assinatura = await fetch(`${api}/assinaturas/verificar`, {
                        credentials: "include"
                    });

                    if (assinatura.ok) {
                        setAssinaturaValida(true);
                    } else if (assinatura.status === 403) {
                        // Sprint item 3 - Sincronizar dados entre aplicativo e sistema web. sincroniza a permissao de acesso se o pagamento mudou no outro cliente.
                        setAssinaturaValida(false);
                    }
                }
            } catch (erro) {
                // Sprint item 3 - Sincronizar dados entre aplicativo e sistema web. conserva a sessao carregada quando a verificacao falha por falta de rede.
                console.error("Erro ao sincronizar sessao:", erro);
            }
        }

        window.addEventListener("cursando:sincronizar", sincronizarSessao);
        return () => window.removeEventListener("cursando:sincronizar", sincronizarSessao);
    }, [api, exigirAssinatura]);

    if (carregando) {
        return <p>Verificando sessao...</p>;
    }

    if (!usuario) {
        return <Navigate to="/login" replace />;
    }

    // Sprint item 34 - Exibir faturas em aberto. ignora o redirecionamento antigo para permitir navegar pelo painel com fatura aberta.
    const destinoSessao = Number(usuario.tipo) === 2 && usuario.redirecionar === "/assinatura"
        ? null
        : usuario.redirecionar;
    if (destinoSessao && location.pathname !== destinoSessao) {
        return <Navigate to={destinoSessao} replace />;
    }

    if (exigirAssinatura && !assinaturaValida) {
        return <Navigate to="/DashboardAluno/assinatura" replace />;
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
