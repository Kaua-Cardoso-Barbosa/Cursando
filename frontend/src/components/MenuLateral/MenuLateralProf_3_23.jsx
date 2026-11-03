import MenuLateralDashboard from "./MenuLateralDashboard.jsx";

const itens = [
    { id: "inicio", rota: "/DashboardProfessor", texto: "Início" },
    { id: "meus-cursos", rota: "/DashboardProfessor/cursos", texto: "Meus cursos" },
    { id: "financeiro", rota: "/DashboardProfessor/financeiro", texto: "Financeiro" },
    { id: "chat", rota: "/DashboardProfessor/chat", texto: "Chat" },
    { id: "relatorios", rota: "/DashboardProfessor/relatorios", texto: "Relatórios" },
    { id: "perfil", rota: "/DashboardProfessor/perfil", texto: "Perfil" },
];

export default function MenuLateralProf({ itemAtivo = "inicio" }) {
    return <MenuLateralDashboard itens={itens} itemAtivo={itemAtivo} />;
}
