import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
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
import {useState} from "react";
import RotaRestrita from "./components/RotaRestrita/RotaRestrita.jsx";

export default function App() {
    return (
        <BrowserRouter>
            <AppConteudo />
        </BrowserRouter>
    );
}

function AppConteudo() {

    const api = "http://10.92.11.58:5000"

    const navigate = useNavigate();

    const [mensagem, setMensagem] = useState('');

    async function sair() {
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

            navigate("/login", { replace: true });

        } catch (erro) {
            console.error("Erro ao fazer logout:", erro);
        }
    }

    return (
        <>
            <Header/>
            {mensagem && <Alerts key={mensagem.id} tipo={mensagem.tipo} imagem={`./public/imagens_assets/${mensagem.tipo}.png`} duracao={'8000'} descricao={mensagem.descricao} fechar={() => setMensagem(null)} />}
            <Routes>
                <Route path="/" element={<Home/>}/>
                <Route path="/login" element={<Login api={api} setMensagem={setMensagem}/>}/>
                <Route path="*" element={<Pagina404/>}/>
                <Route path="/cadastro" element={<Cadastro api={api} setMensagem={setMensagem}/>}/>

                <Route path="/DashboardAluno" element={
                    <RotaRestrita api={api} tipoPermitido={2}>
                        <DashboardAluno api={api} sair={sair}/>
                    </RotaRestrita>
                }/>

                <Route path="/DashboardProfessor" element={
                    <RotaRestrita api={api} tipoPermitido={1}>
                        <DashboardProfessor api={api} sair={sair}/>
                    </RotaRestrita>
                }/>

                <Route path="/DashboardAdm" element={
                    <RotaRestrita api={api} tipoPermitido={0}>
                        <DashboardAdm api={api} sair={sair}/>
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
