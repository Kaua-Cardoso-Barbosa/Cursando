import { cloneElement, useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";

export default
function RotaProtegida({
                                          api,
                                          tipoPermitido,
                                          exigirAssinatura = false,
                                          children
                                      }) {
    const [carregando, setCarregando] = useState(true);
    const [usuario, setUsuario] = useState(null);
    /* Sprint item 34 - Exibir faturas em aberto - Identifica as faturas pendentes e a situação do acesso ao conteúdo */
    const [assinaturaValida, setAssinaturaValida] = useState(!exigirAssinatura);
    /* Fim item 34 */
    const location = useLocation();

    /* Sprint item 34 - Exibir faturas em aberto - Identifica as faturas pendentes e a situação do acesso ao conteúdo */
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
    /* Fim item 34 */

    useEffect(() => {
async function sincronizarSessao() {
            if (document.hidden) return;

            try {
                /* Sprint item 3 - Sincronizar dados entre aplicativo e sistema web - Atualiza os dados da sessão compartilhados entre o site e o aplicativo */
                const retorno = await fetch(`${api}/verificar_token`, {
                    method: "GET",
                    credentials: "include"
                });
                /* Fim item 3 */

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

                        setAssinaturaValida(false);
                    }
                }
            } catch (erro) {

                console.error("Erro ao sincronizar sessao:", erro);
            }
        }

        /* Sprint item 3 - Sincronizar dados entre aplicativo e sistema web - Atualiza os dados da sessão compartilhados entre o site e o aplicativo */
        window.addEventListener("cursando:sincronizar", sincronizarSessao);
        /* Fim item 3 */
        return () => window.removeEventListener("cursando:sincronizar", sincronizarSessao);
    }, [api, exigirAssinatura]);

    if (carregando) {
        return <p>Verificando sessao...</p>;
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

    /* Sprint item 34 - Exibir faturas em aberto - Identifica as faturas pendentes e a situação do acesso ao conteúdo */
    if (exigirAssinatura && !assinaturaValida) {
        return <Navigate to="/DashboardAluno/assinatura" replace />;
    }
    /* Fim item 34 */

    if (
        tipoPermitido !== undefined &&
        Number(usuario.tipo) !== Number(tipoPermitido)
    ) {
        return <Navigate to="/login" replace />;
    }

    /* Sprint item 3 - Sincronizar dados entre aplicativo e sistema web - Aplica os dados de perfil recebidos à sessão atual */
    function atualizarUsuario(dadosAtualizados) {
        setUsuario((usuarioAtual) => ({
            ...usuarioAtual,
            ...dadosAtualizados
        }));

        children.props.onPerfilAtualizado?.(dadosAtualizados);
    }
    /* Fim item 3 */

    return cloneElement(children, {
        usuario,
        onPerfilAtualizado: atualizarUsuario
    });
}
