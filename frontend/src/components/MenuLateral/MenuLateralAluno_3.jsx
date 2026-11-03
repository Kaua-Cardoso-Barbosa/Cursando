import MenuLateralDashboard from "./MenuLateralDashboard.jsx";

const itens = [
    { id: "inicio", rota: "/DashboardAluno", texto: "Início" },
    { id: "meus-cursos", rota: "/DashboardAluno/cursos", texto: "Meus cursos" },
    { id: "descobrir", rota: "/DashboardAluno/descobrir", texto: "Descobrir" },
    { id: "financeiro", rota: "/DashboardAluno/financeiro", texto: "Assinatura e financeiro" },
    { id: "chat", rota: "/DashboardAluno/chat", texto: "Chat" },
    { id: "perfil", rota: "/DashboardAluno/perfil", texto: "Perfil" },
];

export default function MenuLateralAluno({ itemAtivo = "inicio" }) {
    return <MenuLateralDashboard itens={itens} itemAtivo={itemAtivo} />;
}
