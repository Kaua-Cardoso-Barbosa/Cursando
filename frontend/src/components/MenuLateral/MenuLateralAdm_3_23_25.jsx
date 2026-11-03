import MenuLateralDashboard from "./MenuLateralDashboard.jsx";

const itens = [
    { id: "inicio", rota: "/DashboardAdm", texto: "Início" },
    { id: "usuarios", rota: "/DashboardAdm/GerenciamentoUsuarios", texto: "Gerenciar usuários" },
    { id: "financeiro", rota: "/DashboardAdm/Financeiro", texto: "Financeiro" },
    { id: "relatorios", rota: "/DashboardAdm/Relatorios", texto: "Relatórios" },
    { id: "logs", rota: "/DashboardAdm/Logs", texto: "Histórico de atividades" },
    { id: "perfil", rota: "/DashboardAdm/perfil", texto: "Perfil" },
];

export default function MenuLateralAdm({ itemAtivo = "inicio" }) {
    return <MenuLateralDashboard itens={itens} itemAtivo={itemAtivo} />;
}
