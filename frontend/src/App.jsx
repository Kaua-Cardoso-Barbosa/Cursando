import { BrowserRouter, Routes, Route, useNavigate, useLocation } from "react-router-dom";
import Header from "./components/Header/Header.jsx";
import Home from "./pages/Home/Home.jsx";
import Pagina404 from "./pages/Pagina404/Pagina404.jsx";
import Login from "./pages/Login/Login.jsx";
import Cadastro from "./pages/Cadastro/Cadastro.jsx";
import DashboardAluno from "./pages/DashboardAluno/DashboardAluno.jsx";
import DashboardAdm from "./pages/DashboardAdm/DashboardAdm.jsx";
import GerenciamentoUsuarios from "./pages/DashboardAdm/GerenciamentoUsuarios.jsx";
import DashboardProfessor from "./pages/DashboardProfessor/DashboardProfessor.jsx";
import Alerts from "./components/Alerts/Alerts.jsx";
import ConfirmAlert from "./components/ConfirmAlert/ConfirmAlert.jsx";
import {useCallback, useEffect, useState} from "react";
import RotaRestrita from "./components/RotaRestrita/RotaRestrita.jsx";
import Assinatura from "./pages/Assinatura/Assinatura.jsx";
import VerificarEmail from "./pages/VerificarEmail/VerificarEmail.jsx";

export default function App() {
    return (
        <BrowserRouter>
            <AppConteudo />
        </BrowserRouter>
    );
}

function AppConteudo() {

    const api = import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:5000`;

    const navigate = useNavigate();

    const [mensagem, setMensagem] = useState('');
    const [confirmarLogout, setConfirmarLogout] = useState(false);
    const [usuario, setUsuario] = useState(null);

    const atualizarSessao = useCallback(async () => {
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
            console.error("Erro ao verificar sessao:", erro);
            setUsuario(null);
        }
    }, [api]);

    useEffect(() => {
        atualizarSessao();
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

    useEffect(() => {
        const titulos = {
            "/": "Início - Cursando",
            "/login": "Login - Cursando",
            "/cadastro": "Cadastro - Cursando",

            "/DashboardAluno": "Dashboard Usuário - Cursando",
            "/DashboardAluno/cursos": "Meus Cursos - Cursando",
            "/DashboardAluno/descobrir": "Descobrir Cursos - Cursando",
            "/DashboardAluno/perfil": "Meu Perfil - Cursando",

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

        document.title = titulo || "Cursando";
    }, [location.pathname]);

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

                <Route path="/assinatura" element={
                    <RotaRestrita api={api} tipoPermitido={2}>
                        <Assinatura api={api} sair={sair}/>
                    </RotaRestrita>
                }/>

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
