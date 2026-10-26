import { BrowserRouter, Navigate, Routes, Route, useNavigate, useLocation } from "react-router-dom";
import Header from "./components/Header/Header.jsx";
import Home from "./pages/Home/Home.jsx";
import Pagina404 from "./pages/Pagina404/Pagina404.jsx";
import Login from "./pages/Login/Login.jsx";
import Cadastro from "./pages/Cadastro/Cadastro.jsx";
import DashboardAluno from "./pages/DashboardAluno/DashboardAluno_3_4_5_6_8_9_10_19_20_21_26_27_28_29_33_34.jsx";
import DashboardAdm from "./pages/DashboardAdm/DashboardAdm_8_13_14_15_16_22_23_24_25_35_36_37.jsx";
import GerenciamentoUsuarios from "./pages/DashboardAdm/GerenciamentoUsuarios_9_35.jsx";
import DashboardProfessor from "./pages/DashboardProfessor/DashboardProfessor_3_6_7_8_9_15_19_20_21_22_23_28_30_31_32.jsx";
import Alerts from "./components/Alerts/Alerts.jsx";
import ConfirmAlert from "./components/ConfirmAlert/ConfirmAlert.jsx";
import {useCallback, useEffect, useState} from "react";
import RotaRestrita from "./components/RotaRestrita/RotaRestrita_3_34.jsx";
import VerificarEmail from "./pages/VerificarEmail/VerificarEmail_34.jsx";
import VerificarCertificado from "./pages/VerificarCertificado/VerificarCertificado_5.jsx";

export default function App() {
    return (
        <BrowserRouter>
            <AppConteudo />
        </BrowserRouter>
    );
}

/* Sprint item 22 - Criar relatórios com filtros por período, instrutor e curso */
/* Sprint item 25 - Permitir acesso e relatórios dos logs somente para o administrador por data e usuário */
/* Sprint item 34 - Exibir faturas em aberto */
function AppConteudo() {

    const api = import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:5000`;

    const navigate = useNavigate();

    const [mensagem, setMensagem] = useState('');
    const [confirmarLogout, setConfirmarLogout] = useState(false);
    const [usuario, setUsuario] = useState(null);

    const atualizarSessao = useCallback(/* Sprint item 3 - Sincronizar dados entre aplicativo e sistema web */
async () => {
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
            return dados;
        } catch (erro) {
            console.error("Erro ao verificar sessao:", erro);
                                                                                                                                                                  
            return null;
        }
    }
/* Fim item 3 */, [api]);

    useEffect(() => {
        atualizarSessao();
    }, [atualizarSessao]);

    useEffect(() => {
        /* Sprint item 3 - Sincronizar dados entre aplicativo e sistema web */
function sincronizarAoRetomar() {
            if (document.hidden) return;

                                                                                                                                                                  
            atualizarSessao();
            window.dispatchEvent(new Event("cursando:sincronizar"));
        }
/* Fim item 3 */

        document.addEventListener("visibilitychange", sincronizarAoRetomar);
        return () => document.removeEventListener("visibilitychange", sincronizarAoRetomar);
    }, [atualizarSessao]);

    function atualizarUsuario(dadosAtualizados) {
        setUsuario((usuarioAtual) => ({
            ...usuarioAtual,
            ...dadosAtualizados
        }));
    }

    function sair() {
        setConfirmarLogout(true);
    }

    async function confirmarSaida() {
        try {
            const retorno = await fetch(`${api}/logout`, {
                method: "POST",
                credentials: "include"
            });

            const dados = await retorno.json();

            if (!retorno.ok) {
                console.error("Erro ao fazer logout:", dados);
                return;
            }

            setConfirmarLogout(false);
            setUsuario(null);
            navigate("/login", { replace: true });

        } catch (erro) {
            console.error("Erro ao fazer logout:", erro);
        } finally {
            setConfirmarLogout(false);
        }
    }

    const location = useLocation();

    useEffect(/* Sprint item 34 - Exibir faturas em aberto */
() => {
        const titulos = {
            "/": "Início - Cursando",
            "/login": "Login - Cursando",
            "/cadastro": "Cadastro - Cursando",

            "/DashboardAluno": "Dashboard Usuário - Cursando",
            "/DashboardAluno/cursos": "Meus Cursos - Cursando",
            "/DashboardAluno/descobrir": "Descobrir Cursos - Cursando",
            "/DashboardAluno/perfil": "Meu Perfil - Cursando",
                                                                                                                
            "/DashboardAluno/assinatura": "Assinatura - Cursando",

            "/DashboardProfessor": "Dashboard Professor - Cursando",
            "/DashboardAdm": "Dashboard Administrador - Cursando",
            "/gerenciamento-usuarios": "Gerenciamento de Usuários - Cursando",
        };

        let titulo = titulos[location.pathname];

        if (!titulo && location.pathname.match(/^\/dashboardaluno\/cursos\/\d+$/)) {
            titulo = "Curso - Cursando";
        }

        if (!titulo && location.pathname.match(/^\/dashboardaluno\/descobrir\/\d+$/)) {
            titulo = "Curso - Cursando";
        }

        if (!titulo && location.pathname.match(/^\/dashboardaluno\/aulas\/\d+$/)) {
            titulo = "Aula - Cursando";
        }

        if (location.pathname.startsWith("/certificados/")) {
            titulo = "Verificar certificado - Cursando";
        }

        document.title = titulo || "Cursando";
    }
/* Fim item 34 */, [location.pathname]);

    return (
        <>
            <Header usuario={usuario} sair={sair}/>
            {mensagem && <Alerts key={mensagem.id} tipo={mensagem.tipo} imagem={`/imagens_assets/${mensagem.tipo}.png`} duracao={'8000'} descricao={mensagem.descricao} fechar={() => setMensagem(null)} />}
            <ConfirmAlert
                aberto={confirmarLogout}
                titulo="Realmente deseja sair da conta?"
                textoConfirmar="Sim, sair"
                aoCancelar={() => setConfirmarLogout(false)}
                aoConfirmar={confirmarSaida}
            />
            <Routes>
                <Route path="/" element={<Home/>}/>
                <Route path="/login" element={<Login api={api} setMensagem={setMensagem} atualizarSessao={atualizarSessao}/>}/>
                <Route path="*" element={<Pagina404/>}/>
                <Route path="/cadastro" element={<Cadastro api={api} setMensagem={setMensagem}/>}/>
                <Route path="/verificar-email" element={<VerificarEmail api={api} atualizarSessao={atualizarSessao}/>}/>
                <Route path="/certificados/:codigo/verificar" element={<VerificarCertificado api={api}/>}/>
                <Route path="/certificados/verificar" element={<VerificarCertificado api={api}/>}/>

                                                                                                                                       
                <Route path="/assinatura" element={<Navigate to="/DashboardAluno/assinatura" replace />}/>

                <Route path="/DashboardAluno/*" element={
                    <RotaRestrita api={api} tipoPermitido={2}>
                        <DashboardAluno api={api} sair={sair} setMensagem={setMensagem} onPerfilAtualizado={atualizarUsuario}/>
                    </RotaRestrita>
                }/>

                <Route path="/DashboardProfessor/*" element={
                    <RotaRestrita api={api} tipoPermitido={1}>
                        <DashboardProfessor api={api} sair={sair} setMensagem={setMensagem} onPerfilAtualizado={atualizarUsuario}/>
                    </RotaRestrita>
                }/>

                <Route path="/DashboardAdm" element={
                    <RotaRestrita api={api} tipoPermitido={0}>
                        <DashboardAdm api={api} sair={sair} setMensagem={setMensagem} onPerfilAtualizado={atualizarUsuario}/>
                    </RotaRestrita>
                }/>

                <Route path="/DashboardAdm/perfil" element={
                    <RotaRestrita api={api} tipoPermitido={0}>
                        <DashboardAdm api={api} sair={sair} setMensagem={setMensagem} onPerfilAtualizado={atualizarUsuario}/>
                    </RotaRestrita>
                }/>

                <Route path="/DashboardAdm/Financeiro" element={
                    <RotaRestrita api={api} tipoPermitido={0}>
                        <DashboardAdm api={api} sair={sair} setMensagem={setMensagem} onPerfilAtualizado={atualizarUsuario}/>
                    </RotaRestrita>
                }/>

                                                                                                                                                                                     
                <Route path="/DashboardAdm/Relatorios" element={
                    <RotaRestrita api={api} tipoPermitido={0}>
                        <DashboardAdm api={api} sair={sair} setMensagem={setMensagem} onPerfilAtualizado={atualizarUsuario}/>
                    </RotaRestrita>
                }/>

                                                                                                                                                                                                   
                <Route path="/DashboardAdm/Logs" element={
                    <RotaRestrita api={api} tipoPermitido={0}>
                        <DashboardAdm api={api} sair={sair} setMensagem={setMensagem} onPerfilAtualizado={atualizarUsuario}/>
                    </RotaRestrita>
                }/>

                <Route path="/DashboardAdm/GerenciamentoUsuarios" element={
                    <RotaRestrita api={api} tipoPermitido={0}>
                        <GerenciamentoUsuarios api={api} sair={sair} setMensagem={setMensagem} />
                    </RotaRestrita>
                }/>
            </Routes>
        </>
    );
}
/* Fim item 34 */
/* Fim item 25 */
/* Fim item 22 */
