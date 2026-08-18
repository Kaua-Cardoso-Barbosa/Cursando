import { BrowserRouter, Routes, Route } from "react-router-dom";
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

export default function App() {

    const api = "http://10.92.11.30:5000"

    const [mensagem, setMensagem] = useState('');

    return (
        <BrowserRouter>
            <Header/>
            {mensagem && <Alerts key={mensagem.id} tipo={mensagem.tipo} imagem={`./public/imagens_assets/${mensagem.tipo}.png`} duracao={'8000'} descricao={mensagem.descricao} fechar={() => setMensagem(null)} />}
            <Routes>
                <Route path="/" element={<Home/>}/>
                <Route path="/login" element={<Login api={api} setMensagem={setMensagem}/>}/>
                <Route path="*" element={<Pagina404/>}/>
                <Route path="/cadastro" element={<Cadastro api={api} setMensagem={setMensagem}/>}/>
                <Route path="/DashboardAluno" element={<DashboardAluno/>}/>
                <Route path="/DashboardAdm" element={<DashboardAdm/>}/>
                <Route path="/DashboardProfessor" element={<DashboardProfessor/>}/>
                <Route path="/GerenciamentoUsuarios" element={<GerenciamentoUsuarios />}/>
            </Routes>
        </BrowserRouter>
    );
}
