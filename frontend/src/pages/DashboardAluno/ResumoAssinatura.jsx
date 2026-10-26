import css from "./ResumoAssinatura.module.css";

function formatarData(data) {
    if (!data) return "Não disponível";
    const valor = new Date(data);
    if (Number.isNaN(valor.getTime())) return "Não disponível";
    return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(valor);
}

// Sprint item 34 - Exibir faturas em aberto. mostra a situação da assinatura no painel, inclusive com faturas em aberto.
export default function ResumoAssinatura({ assinatura, acessoBloqueado, faturasAbertas, carregando, erro }) {
    const pendente = faturasAbertas > 0;
    // Sprint item 34 - Exibir faturas em aberto. usa a validade quando a API traz datas sem o indicador de bloqueio.
    const expiracao = assinatura?.data_expiracao ? new Date(assinatura.data_expiracao) : null;
    const validadeConhecida = expiracao && !Number.isNaN(expiracao.getTime());
    const bloqueado = typeof acessoBloqueado === "boolean"
        ? acessoBloqueado
        : validadeConhecida ? expiracao < new Date() : true;
    const consultando = carregando && !pendente;
    const indisponivel = erro && !pendente;

    const titulo = pendente ? "Você tem uma fatura em aberto"
        : consultando ? "Consultando assinatura..."
            : indisponivel ? "Não foi possível consultar a assinatura"
                : bloqueado ? "Assinatura pendente" : "Assinatura ativa";
    const descricao = pendente
        ? "Você pode usar o painel enquanto regulariza a mensalidade. Pague a fatura abaixo para voltar a acessar os cursos."
        : consultando ? "Aguarde enquanto consultamos a situação da sua assinatura."
            : indisponivel ? "Atualize a página para tentar novamente ou consulte suas faturas abaixo."
                : bloqueado ? "Pague a mensalidade abaixo para acessar os cursos."
                    : "Seu acesso aos cursos está liberado. Você também pode antecipar mensalidades abaixo.";

    return (
        <section className={css.resumo} aria-label="Situação da assinatura">
            <div>
                <span className={css.rotulo}>Plano mensal</span>
                <h3>{titulo}</h3>
                <p>{descricao}</p>
            </div>
            <div className={css.datas}>
                <span>Início: <strong>{formatarData(assinatura?.data_inicio)}</strong></span>
                <span>Válida até: <strong>{formatarData(assinatura?.data_expiracao)}</strong></span>
            </div>
        </section>
    );
}
