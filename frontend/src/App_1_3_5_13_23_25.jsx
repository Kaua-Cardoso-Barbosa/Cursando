import { SessaoProvider } from "./context/Sessao.jsx";
import { API, useSessao } from "./context/useSessao.js";
import { urlPerfil } from './utils/perfil.js';
import { BrowserRouter, Navigate, Routes, Route, useNavigate, useLocation } from "react-router-dom";
import Header from "./components/Header/Header_3.jsx";
import Home from "./pages/Home/Home.jsx";
import Pagina404 from "./pages/Pagina404/Pagina404.jsx";
import Login from "./pages/Login/Login_3.jsx";
import Cadastro from "./pages/Cadastro/Cadastro_1.jsx";
const DashboardAluno = lazy(() => import("./pages/DashboardAluno/DashboardAluno_2_3_4_5_6_10_19_20_21_26_27_28_29_33_34.jsx"));
const DashboardAdm = lazy(() => import("./pages/DashboardAdm/DashboardAdm_3_8_13_14_15_16_22_23_25_32_35_36.jsx"));
const GerenciamentoUsuarios = lazy(() => import("./pages/DashboardAdm/GerenciamentoUsuarios_33_35.jsx"));
const DashboardProfessor = lazy(() => import("./pages/DashboardProfessor/DashboardProfessor_3_6_7_8_9_12_15_19_20_21_22_23_28_30_31_32.jsx"));
import Alerts from "./components/Alerts/Alerts.jsx";
import ConfirmAlert from "./components/ConfirmAlert/ConfirmAlert.jsx";
import {lazy, Suspense, useEffect, useState} from "react";
import RotaRestrita from "./components/RotaRestrita/RotaRestrita_3_34.jsx";
import VerificarEmail from "./pages/VerificarEmail/VerificarEmail_1.jsx";
const VerificarCertificado = lazy(() => import("./pages/VerificarCertificado/VerificarCertificado_5.jsx"));
const Perfil = lazy(() => import("./pages/Perfil/Perfil.jsx"));

export default function App() {
    return (
        <BrowserRouter>
            <SessaoProvider><AppConteudo /></SessaoProvider>
        </BrowserRouter>
    );
}

function AppConteudo() {

    const api = API;

    const navigate = useNavigate();

    const [mensagem, setMensagem] = useState('');
    const [confirmarLogout, setConfirmarLogout] = useState(false);
    const { usuario, carregando: carregandoSessao, erro: erroSessao, atualizarSessao, atualizarUsuario, limparSessao } = useSessao();

    /* Sprint item 3 - Sincronizar dados entre aplicativo e sistema web - Solicita a confirmação de saída da sessão */
    function sair() {
        setConfirmarLogout(true);
    }
    /* Fim item 3 */

    /* Sprint item 3 - Sincronizar dados entre aplicativo e sistema web - Encerra a sessão no servidor e atualiza a navegação */
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
            limparSessao();
            navigate("/login", { replace: true });

        } catch (erro) {
            console.error("Erro ao fazer logout:", erro);
        } finally {
            setConfirmarLogout(false);
        }
    }
    /* Fim item 3 */

    const location = useLocation();

    useEffect(
() => {

        const titulos = {
            "/": "Início - Cursando",
            "/login": "Login - Cursando",
            "/cadastro": "Cadastro - Cursando",

            "/DashboardAluno": "Dashboard Usuário - Cursando",
            "/DashboardAluno/cursos": "Meus Cursos - Cursando",
            "/DashboardAluno/provas": "Histórico de provas - Cursando",
            "/DashboardAluno/descobrir": "Descobrir Cursos - Cursando",
            "/DashboardAluno/perfil": "Meu Perfil - Cursando",

            "/DashboardAluno/financeiro": "Assinatura e Financeiro - Cursando",

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

        /* Sprint item 5 - Gerar certificado ao concluir o curso - Define o título da página de verificação do certificado */
        if (location.pathname.startsWith("/certificados/")) {
            titulo = "Verificar certificado - Cursando";
        }
        /* Fim item 5 */

        if (location.pathname.startsWith('/perfil')) titulo = 'Perfil - Cursando';
        document.title = titulo || "Cursando";
    }
, [location.pathname]);

    return (
        <>
            <Header usuario={usuario} sair={sair}/>
            {usuario && erroSessao && <p role="alert">{erroSessao}</p>}
            {mensagem && <Alerts key={mensagem.id} tipo={mensagem.tipo} imagem={`/imagens_assets/${mensagem.tipo}.png`} duracao={'8000'} descricao={mensagem.descricao} fechar={() => setMensagem(null)} />}
            <ConfirmAlert
                aberto={confirmarLogout}
                titulo="Realmente deseja sair da conta?"
                textoConfirmar="Sim, sair"
                aoCancelar={() => setConfirmarLogout(false)}
                aoConfirmar={confirmarSaida}
            />
            <Suspense fallback={<p role="status">Carregando pagina...</p>}>
            <Routes>
                <Route path="/" element={<Home/>}/>
                <Route path="/home" element={<Navigate to="/" replace />}/>
                <Route path="/perfil/:idUsuario" element={<Perfil api={api} setMensagem={setMensagem} />} />
                <Route path="/perfil" element={carregandoSessao ? <p role="status">Carregando perfil...</p>
                    : <Navigate to={usuario ? Number(usuario.tipo) === 0 ? '/DashboardAdm/perfil'
                        : usuario.identificador ? urlPerfil(usuario.identificador)
                        : Number(usuario.tipo) === 1 ? '/DashboardProfessor/perfil' : '/DashboardAluno/perfil' : '/login'} replace />} />
                {/* Sprint item 3 - Sincronizar dados entre aplicativo e sistema web - Conecta a navegação ao componente responsável por este item */}
                <Route path="/login" element={<Login api={api} setMensagem={setMensagem} atualizarSessao={atualizarSessao}/>}/>
                {/* Fim item 3 */}
                <Route path="*" element={<Pagina404/>}/>
                {/* Sprint item 1 - Implementar cadastro de alunos pelo aplicativo - Disponibiliza o formulário web do cadastro compartilhado com o aplicativo */}
                <Route path="/cadastro" element={<Cadastro api={api} setMensagem={setMensagem}/>}/>
                {/* Fim item 1 */}
                {/* Sprint item 1 - Implementar cadastro de alunos pelo aplicativo - Conecta a navegação à confirmação do e-mail de cadastro */}
                <Route path="/verificar-email" element={<VerificarEmail api={api} atualizarSessao={atualizarSessao}/>}/>
                {/* Fim item 1 */}
                {/* Sprint item 5 - Gerar certificado ao concluir o curso - Conecta a navegação ao componente responsável por este item */}
                <Route path="/certificados/:codigo/verificar" element={<VerificarCertificado api={api}/>}/>
                {/* Fim item 5 */}
                {/* Sprint item 5 - Gerar certificado ao concluir o curso - Conecta a navegação ao componente responsável por este item */}
                <Route path="/certificados/verificar" element={<VerificarCertificado api={api}/>}/>
                {/* Fim item 5 */}

                                                                                                                                       
                <Route path="/assinatura" element={<Navigate to="/DashboardAluno/financeiro" replace />}/>
                <Route path="/DashboardAluno/assinatura" element={<Navigate to="/DashboardAluno/financeiro" replace />}/>

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

                {/* Sprint item 3 - Sincronizar dados entre aplicativo e sistema web - Conecta a navegação ao componente responsável por este item */}
                <Route path="/DashboardAdm/perfil" element={
                    <RotaRestrita api={api} tipoPermitido={0}>
                        <DashboardAdm api={api} sair={sair} setMensagem={setMensagem} onPerfilAtualizado={atualizarUsuario}/>
                    </RotaRestrita>
                }/>
                {/* Fim item 3 */}

                {/* Sprint item 13 - Criar gestão financeira do sistema - Disponibiliza a gestão financeira para o perfil de administrador */}
                <Route path="/DashboardAdm/Financeiro" element={
                    <RotaRestrita api={api} tipoPermitido={0}>
                        <DashboardAdm api={api} sair={sair} setMensagem={setMensagem} onPerfilAtualizado={atualizarUsuario}/>
                    </RotaRestrita>
                }/>
                {/* Fim item 13 */}

                                                                                                                                                                                     
                {/* Sprint item 23 - Exibir relatórios de alunos, cursos, módulos e horas assistidas - Conecta a navegação ao componente responsável por este item */}
                <Route path="/DashboardAdm/Relatorios" element={
                    <RotaRestrita api={api} tipoPermitido={0}>
                        <DashboardAdm api={api} sair={sair} setMensagem={setMensagem} onPerfilAtualizado={atualizarUsuario}/>
                    </RotaRestrita>
                }/>
                {/* Fim item 23 */}

                                                                                                                                                                                                   
                {/* Sprint item 25 - Permitir acesso e relatórios dos logs somente para o administrador por data e usuário - Restringe a navegação aos logs ao perfil de administrador */}
                {/* A rota de logs usa a mesma proteção de perfil do painel administrativo. */}
                <Route path="/DashboardAdm/Logs" element={
                    <RotaRestrita api={api} tipoPermitido={0}>
                        <DashboardAdm api={api} sair={sair} setMensagem={setMensagem} onPerfilAtualizado={atualizarUsuario}/>
                    </RotaRestrita>
                }/>
                {/* Fim item 25 */}

                <Route path="/DashboardAdm/GerenciamentoUsuarios" element={
                    <RotaRestrita api={api} tipoPermitido={0}>
                        <GerenciamentoUsuarios api={api} sair={sair} setMensagem={setMensagem} />
                    </RotaRestrita>
                }/>
            </Routes>
            </Suspense>
        </>
    );
}
