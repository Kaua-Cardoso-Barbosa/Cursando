// Mesmas traducoes e comparacoes utilizadas no historico administrativo do site.
const ROTULOS_TABELAS_LOG = {
    USUARIOS: "conta de usuário",
    CURSOS: "curso",
    PROFESSORES_CURSO: "vínculo de instrutor ao curso",
    VIDEOS: "aula",
    MATRICULAS: "matrícula",
    MODULOS_CURSO: "módulo",
    MATERIAIS_CURSO: "material do curso",
    PROVAS_CURSO: "prova",
    AVALIACOES_CURSO: "avaliação do curso",
    RESPOSTAS_PROVA: "resposta da prova",
    QUESTOES_PROVA: "questão da prova",
    CERTIFICADOS: "certificado",
    SAQUES_INSTRUTOR: "pagamento ao professor",
    ASSINATURAS: "assinatura",
    MENSAGENS_CHAT: "mensagem do curso",
    CUSTOS_PLATAFORMA: "despesa da plataforma",
    FINANCEIRO_CONFIG: "configuração financeira",
    PROGRESSO_AULAS: "progresso de aula",
    CATEGORIAS_CUSTO: "categoria de despesa",
    CATEGORIAS_CURSO: "categoria de curso",
    TEMAS_CURSO: "tema de curso",
    CURSO_TAXONOMIA: "classificação do curso"
};

/* Nomes legíveis dos campos incluídos nos snapshots da auditoria. */
const ROTULOS_CAMPOS_LOG = {
    NOME: "nome",
    TITULO: "título",
    DESCRICAO: "descrição",
    STATUS: "situação",
    EXCLUIDO: "exclusão",
    PUBLICADA: "publicação da prova",
    TIPO_USUARIO: "tipo de conta",
    SITUACAO: "situação da conta",
    EMAIL_VERIFICADO: "confirmação do e-mail",
    VALOR: "valor",
    DATA_CUSTO: "data da despesa",
    CATEGORIA: "categoria",
    TIPO_CUSTO: "tipo de despesa",
    DATA_INICIO: "data de início",
    DATA_FIM: "data de término",
    STATUS_MATRICULA: "situação da matrícula",
    NOTA: "nota",
    ORDEM: "ordem",
    TIPO: "tipo",
    PERCENTUAL_INSTRUTORES: "percentual dos instrutores",
    DATA_VENCIMENTO: "vencimento",
    DATA_PAGAMENTO: "pagamento",
    DATA_EXPIRACAO: "expiração",
    CORRIGIDO_EM: "data da correção",
    ID_CURSO: "curso associado",
    ID_MODULO: "módulo associado",
    ID_PROVA: "prova associada",
    ID_VIDEO: "aula associada",
    ID_USUARIO: "usuário associado",
    ID_ALUNO: "aluno associado",
    ID_REMETENTE: "remetente",
    ID_DESTINATARIO: "destinatário",
    ID_CATEGORIA: "categoria associada",
    ID_TEMA: "tema associado",
    ID_GRUPO_MENSAL: "grupo de mensalidades",
    TENTATIVAS: "tentativas de acesso",
    ASSISTIDO_EM: "data em que a aula foi assistida",
    CRIADO_EM: "data de criação"
};
/* Fim item 25 */

const formatarMoeda = (valor) => new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
}).format(Number(valor || 0));

/* Sprint item 25 - Permitir acesso e relatórios dos logs somente para o administrador por data e usuário - Converte o snapshot para apresentar os detalhes do log */
/* Um snapshot ausente ou inválido vira objeto vazio para manter o relatório utilizável. */
function lerSnapshotLog(valor) {
    if (!valor) return {};
    try { return JSON.parse(valor); }
    catch { return {}; }
}
/* Fim item 25 */

/* Sprint item 25 - Permitir acesso e relatórios dos logs somente para o administrador por data e usuário - Traduz o campo auditado para o relatório administrativo */
function rotuloCampoLog(campo) {
    return ROTULOS_CAMPOS_LOG[campo] || null;
}
/* Fim item 25 */

/* Sprint item 25 - Permitir acesso e relatórios dos logs somente para o administrador por data e usuário - Formata o valor de um campo no relatório de logs */
/* Formata status, valores, datas e identificadores conforme o campo e a tabela. */
function formatarValorCampoLog(campo, valor, tabela) {
    if (valor === null || valor === undefined) return "Sem valor (NULL)";
    if (valor === "") return "Texto vazio";
    if (typeof valor === "object" && Object.hasOwn(valor, "__auditoria_truncado")) {
        return `${valor.__auditoria_valor} (conteúdo truncado: limite de ${valor.__auditoria_truncado} caracteres no histórico)`;
    }
    if (typeof valor === "object" && Object.hasOwn(valor, "__auditoria_omissao")) {
        return ({
            conteudo_sensivel: "Conteúdo sensível omitido",
            conteudo_blob: "Conteúdo BLOB omitido (texto extenso ou arquivo)",
            fora_da_configuracao: "Valor omitido: campo fora da configuração de auditoria"
        })[valor.__auditoria_omissao] || "Valor omitido: motivo não reconhecido";
    }
    if (campo.startsWith("ID_")) return `#${valor}`;
    if (campo === "PUBLICADA") return Number(valor) === 1 ? "publicada" : "rascunho";
    if (campo === "EXCLUIDO") return Number(valor) === 1 ? "sim" : "não";
    if (campo === "EMAIL_VERIFICADO") return Number(valor) === 1 ? "sim" : "não";
    if (campo === "SITUACAO") return Number(valor) === 1 ? "bloqueada" : "ativa";
    if (campo === "STATUS_MATRICULA") return Number(valor) === 1 ? "ativa" : "inativa";
    if (campo === "STATUS" && ["CURSOS", "VIDEOS", "MODULOS_CURSO"].includes(tabela)) return ({ 0: "privado", 1: "publicado", 2: "arquivado" })[valor] || String(valor);
    if (campo === "STATUS" && tabela === "RESPOSTAS_PROVA") return ({ 0: "aguardando correção", 1: "aprovada", 2: "reprovada" })[valor] || String(valor);
    if (campo === "STATUS" && tabela === "ASSINATURAS") return ({ 0: "pendente", 1: "paga", 3: "paga; ciclo encerrado" })[valor] || String(valor);
    if (campo === "STATUS" && tabela === "SAQUES_INSTRUTOR") return ({ 0: "solicitado", 1: "pago", 2: "recusado" })[valor] || String(valor);
    if (campo === "TIPO_USUARIO") return ({ 0: "administrador", 1: "professor", 2: "aluno" })[valor] || String(valor);
    if (campo === "VALOR") {
        const numero = Number(valor);
        return Number.isFinite(numero) ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(numero) : String(valor);
    }
    if (campo === "PERCENTUAL_INSTRUTORES") return `${String(valor).replace(".", ",")}%`;
    if (campo.startsWith("DATA_") || campo.endsWith("_EM")) {
        const data = new Date(valor);
        if (!Number.isNaN(data.getTime())) return new Intl.DateTimeFormat("pt-BR").format(data);
    }
    return String(valor);
}
/* Fim item 25 */



/* Sprint item 25 - Permitir acesso e relatórios dos logs somente para o administrador por data e usuário - Traduz o tipo da ação registrada no log */
function tipoAcaoLog(acao) {
    return ({ INSERT: "Criação", CRIACAO: "Criação", UPDATE: "Alteração", ALTERACAO: "Alteração", PATCH: "Alteração", PUT: "Alteração", DELETE: "Exclusão", EXCLUSAO: "Exclusão", POST: "Registro" })[acao] || "Atividade";
}
/* Fim item 25 */

/* Sprint item 25 - Permitir acesso e relatórios dos logs somente para o administrador por data e usuário - Identifica o registro afetado para a consulta administrativa */
function objetoLog(log) {
    const tipo = ROTULOS_TABELAS_LOG[log.tabela] || "registro do sistema";

    return `${tipo}${log.id_registro ? ` #${log.id_registro}` : ""}`;
}
/* Fim item 25 */

/* Sprint item 25 - Permitir acesso e relatórios dos logs somente para o administrador por data e usuário - Compara os valores anteriores e posteriores da alteração */
/* Compara estados anterior e posterior e indica valores que não foram registrados. */
function alteracoesLog(log) {
    const antes = lerSnapshotLog(log.valores_antes);
    const depois = lerSnapshotLog(log.valores_depois);
    const campos = ["UPDATE", "ALTERACAO", "PATCH", "PUT"].includes(log.acao)
        ? String(log.campos_alterados || "").split(",").map((campo) => campo.trim()).filter((campo) => campo && !campo.startsWith("["))
        : [...new Set([...Object.keys(antes), ...Object.keys(depois)])];

    return campos.map((campo) => ({
        campo,
        rotulo: rotuloCampoLog(campo) || campo.toLowerCase().replaceAll("_", " "),
        antes: log.acao === "INSERT" ? "—" : Object.hasOwn(antes, campo)
            ? formatarValorCampoLog(campo, antes[campo], log.tabela) : "Valor não registrado no histórico (motivo desconhecido)",
        depois: log.acao === "DELETE" ? "—" : Object.hasOwn(depois, campo)
            ? formatarValorCampoLog(campo, depois[campo], log.tabela) : "Valor não registrado no histórico (motivo desconhecido)"
    }));
}
/* Fim item 25 */

export { alteracoesLog, tipoAcaoLog, objetoLog };
