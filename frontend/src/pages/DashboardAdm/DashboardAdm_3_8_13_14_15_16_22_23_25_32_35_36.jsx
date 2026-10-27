import React, { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import {
    FaGraduationCap,
    FaUser,
    FaPlay,
    FaFolder,
    FaUsers,
    FaCheckCircle,
    FaClock,
    FaGooglePlay,
    FaLinux,
    FaWindows
} from "react-icons/fa";
import MenuLateralAdm from "../../components/MenuLateral/MenuLateralAdm_3_23_25.jsx";
import css from "./DashboardAdm_38.module.css";
import PerfilUsuario from "../../components/PerfilUsuario/PerfilUsuario_3.jsx";
import GoogleChart from "../../components/GoogleChart/GoogleChart_8.jsx";

/* Sprint item 25 - Permitir acesso e relatórios dos logs somente para o administrador por data e usuário - Define os rótulos usados na consulta administrativa de logs */
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

/* Sprint item 25 - Permitir acesso e relatórios dos logs somente para o administrador por data e usuário - Converte o snapshot para apresentar os detalhes do log */
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
function formatarValorCampoLog(campo, valor, tabela) {
    if (valor === null || valor === undefined || valor === "") return "não informado";
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
            ? formatarValorCampoLog(campo, antes[campo], log.tabela) : "Valor não registrado",
        depois: log.acao === "DELETE" ? "—" : Object.hasOwn(depois, campo)
            ? formatarValorCampoLog(campo, depois[campo], log.tabela) : "Valor não registrado"
    }));
}
/* Fim item 25 */

export default
function DashboardAdm({
                                         api,
                                         setMensagem,
                                         onPerfilAtualizado,
                                         usuario
                                     }) {
    const location = useLocation();
    const exibindoInicio = location.pathname === "/DashboardAdm";
    /* Sprint item 3 - Sincronizar dados entre aplicativo e sistema web - Atualiza os dados da sessão compartilhados entre o site e o aplicativo */
    const exibindoPerfil = location.pathname.endsWith("/perfil");
    /* Fim item 3 */
    const exibindoFinanceiro = location.pathname.endsWith("/Financeiro");
    const exibindoLogs = location.pathname.endsWith("/Logs");

    /* Sprint item 23 - Exibir relatórios de alunos, cursos, módulos e horas assistidas - Apresenta os dados consolidados de alunos, cursos, módulos e horas */
    const exibindoRelatorios = location.pathname.endsWith("/Relatorios");
    /* Fim item 23 */
    const [dashboard, setDashboard] = useState(null);
    const [financeiro, setFinanceiro] = useState(null);
    /* Sprint item 15 - Exibir saldo disponível em caixa, assinatura de R$ 500 e desconto das comissões no saldo administrativo - Apresenta o saldo disponível e a reserva de comissões */
    const [percentualInstrutores, setPercentualInstrutores] = useState("");
    /* Fim item 15 */
    /* Sprint item 36 - Permitir cadastro e acompanhamento dos custos da plataforma - Cadastra e acompanha os custos e suas categorias */
    const [categoriasCusto, setCategoriasCusto] = useState([]);
    /* Fim item 36 */
    const [transacoes, setTransacoes] = useState([]);
    const [saques, setSaques] = useState([]);
    /* Sprint item 32 - Permitir solicitação de saque para a conta ARKHE - Envia ou acompanha solicitações de saque e sua análise manual */
    const [dadosAnaliseSaque, setDadosAnaliseSaque] = useState({});
    /* Fim item 32 */
    const [processandoSaque, setProcessandoSaque] = useState(null);
    /* Sprint item 36 - Permitir cadastro e acompanhamento dos custos da plataforma - Cadastra e acompanha os custos e suas categorias */
    const [novoCustoUnico, setNovoCustoUnico] = useState({ descricao: "", id_categoria: "", valor: "", data_custo: "" });
    const [novoCustoMensal, setNovoCustoMensal] = useState({ descricao: "", id_categoria: "", valor: "", data_inicio: "", data_fim: "" });
    const [novaCategoriaCusto, setNovaCategoriaCusto] = useState("");
    /* Fim item 36 */
    const [filtrosTransacoes, setFiltrosTransacoes] = useState({ tipo: "", categoria: "", inicio: "", fim: "", status: "" });
    const [logsGravacao, setLogsGravacao] = useState([]);

    /* Sprint item 25 - Permitir acesso e relatórios dos logs somente para o administrador por data e usuário - Restringe a consulta dos logs ao administrador e aplica os filtros */
    const [filtrosLogs, setFiltrosLogs] = useState({ busca: "", tipo: "0", evento: "", acao: "", inicio: "", fim: "" });
    const [logExpandido, setLogExpandido] = useState(null);
    /* Fim item 25 */
    const [temMaisLogs, setTemMaisLogs] = useState(false);
    const [carregandoMaisLogs, setCarregandoMaisLogs] = useState(false);
    /* Sprint item 23 - Exibir relatórios de alunos, cursos, módulos e horas assistidas - Apresenta os dados consolidados de alunos, cursos, módulos e horas */
    const [relatorio, setRelatorio] = useState(null);
    const [cursosRelatorio, setCursosRelatorio] = useState([]);
    const [instrutoresRelatorio, setInstrutoresRelatorio] = useState([]);
    /* Fim item 23 */
    /* Sprint item 22 - Criar relatórios com filtros por período, instrutor e curso - Aplica os filtros de período e curso à consulta do relatório */
    const [filtrosRelatorio, setFiltrosRelatorio] = useState({ inicio: "", fim: "", id_instrutor: "", id_curso: "" });
    /* Fim item 22 */
    /* Sprint item 23 - Exibir relatórios de alunos, cursos, módulos e horas assistidas - Apresenta os dados consolidados de alunos, cursos, módulos e horas */
    const [carregandoRelatorio, setCarregandoRelatorio] = useState(false);
    /* Fim item 23 */

    function descricaoErroApi(erro) {
        if (erro instanceof TypeError && erro.message === "Failed to fetch") {
            return `Não foi possível conectar à API (${api}). Verifique se o backend está ativo e acessível pelo navegador.`;
        }
        return erro?.message || "Ocorreu um erro ao comunicar com o servidor.";
    }

    /* Sprint item 25 - Permitir acesso e relatórios dos logs somente para o administrador por data e usuário - Formata a data exibida no relatório de auditoria */
    function formatarDataLog(valor) {
        if (!valor) return "";
        return new Date(valor).toLocaleString("pt-BR");
    }
    /* Fim item 25 */


    /* Sprint item 23 - Exibir relatórios de alunos, cursos, módulos e horas assistidas - Apresenta os dados consolidados de alunos, cursos, módulos e horas */
    useEffect(() => {
        if (exibindoPerfil || exibindoFinanceiro || exibindoLogs || exibindoRelatorios) {
            return;
        }

        async function carregarDashboard() {
            try {
                const resposta = await fetch(`${api}/admin/dashboard`, {
                    credentials: "include"
                });
                const dados = await resposta.json().catch(() => ({}));

                if (dados.mensagem && setMensagem) {
                    setMensagem(dados.mensagem);
                }

                if (!resposta.ok) {
                    throw new Error(dados?.mensagem?.descricao || "Erro ao carregar dashboard.");
                }

                setDashboard(dados.metricas || {});
            } catch (erro) {
                console.error("Erro ao carregar dashboard do administrador:", erro);
                if (setMensagem) {
                    setMensagem({
                        tipo: "erro",
                        descricao: erro.message
                    });
                }
            }
        }

        carregarDashboard();
    }, [api, exibindoFinanceiro, exibindoLogs, exibindoPerfil, exibindoRelatorios, setMensagem]);
    /* Fim item 23 */


    /* Sprint item 23 - Exibir relatórios de alunos, cursos, módulos e horas assistidas - Apresenta os dados consolidados de alunos, cursos, módulos e horas */
    useEffect(() => {
        if (!exibindoRelatorios) return;
        let ativo = true;
        async function carregarOpcoes() {
            try {
                const [respostaUsuarios, respostaRelatorio] = await Promise.all([
                    fetch(`${api}/usuarios`, { credentials: "include" }),
                    fetch(`${api}/relatorios/professor`, { credentials: "include" })
                ]);
                const [usuarios, dadosRelatorio] = await Promise.all([
                    respostaUsuarios.json().catch(() => []),
                    respostaRelatorio.json().catch(() => ({}))
                ]);
                if (!respostaUsuarios.ok) throw new Error(usuarios?.mensagem?.descricao || "Não foi possível carregar instrutores.");
                if (!respostaRelatorio.ok) throw new Error(dadosRelatorio?.mensagem?.descricao || "Não foi possível carregar os cursos.");
                if (!ativo) return;
                setInstrutoresRelatorio((Array.isArray(usuarios) ? usuarios : []).filter((item) => Number(item.tipo_usuario ?? item.tipo) === 1));
                setCursosRelatorio(dadosRelatorio.cursos || []);
                setRelatorio(dadosRelatorio);
            } catch (erro) { setMensagem?.({ tipo: "erro", descricao: erro.message }); }
        }
        carregarOpcoes();
        return () => { ativo = false; };
    }, [api, exibindoRelatorios, setMensagem]);
    /* Fim item 23 */

    /* Sprint item 22 - Criar relatórios com filtros por período, instrutor e curso - Envia os filtros e atualiza o resultado do relatório */
    async function carregarRelatorio() {
        setCarregandoRelatorio(true);
        try {
            const params = new URLSearchParams();
            Object.entries(filtrosRelatorio).forEach(([chave, valor]) => { if (valor) params.set(chave, valor); });
            const resposta = await fetch(`${api}/relatorios/professor?${params.toString()}`, { credentials: "include" });
            const dados = await resposta.json().catch(() => ({}));
            if (!resposta.ok) throw new Error(dados?.mensagem?.descricao || "Não foi possível gerar o relatório.");
            setRelatorio(dados);
        } catch (erro) { setMensagem?.({ tipo: "erro", descricao: erro.message }); }
        finally { setCarregandoRelatorio(false); }
    }
    /* Fim item 22 */

    useEffect(() => {
        if (!exibindoFinanceiro) return;

        async function carregarFinanceiro() {

            /* Sprint item 36 - Permitir cadastro e acompanhamento dos custos da plataforma - Cadastra e acompanha os custos e suas categorias */
            const resultados = await Promise.allSettled([
                fetch(`${api}/financeiro/resumo`, { credentials: "include", cache: "no-store" }),
                fetch(`${api}/admin/categorias-custo`, { credentials: "include", cache: "no-store" }),
                fetch(`${api}/admin/financeiro/transacoes`, { credentials: "include", cache: "no-store" }),
                fetch(`${api}/admin/saques`, { credentials: "include", cache: "no-store" }),
            ]);
            /* Fim item 36 */
            const erros = [];

            const [resumo, categorias, transacoesAtuais, saquesAtuais] = resultados.map((resultado) => {
                if (resultado.status === "rejected") {
                    erros.push(resultado.reason);
                    return null;
                }
                return resultado.value;
            });

            /* Sprint item 15 - Exibir saldo disponível em caixa, assinatura de R$ 500 e desconto das comissões no saldo administrativo - Apresenta o saldo disponível e a reserva de comissões */
            if (resumo) {
                const dados = await resumo.json().catch(() => ({}));
                if (resumo.ok) {
                    setFinanceiro(dados);
                    setPercentualInstrutores(String(dados.percentual_instrutores ?? 50));
                } else {
                    erros.push(new Error(dados?.mensagem?.descricao || "Erro ao carregar o resumo financeiro."));
                }
            }
            /* Fim item 15 */

            if (categorias) {
                const dadosCategorias = await categorias.json().catch(() => ([]));
                if (categorias.ok) setCategoriasCusto(Array.isArray(dadosCategorias) ? dadosCategorias : []);
                else erros.push(new Error(dadosCategorias?.mensagem?.descricao || "Erro ao carregar categorias de custo."));
            }

            if (transacoesAtuais) {
                const dadosTransacoes = await transacoesAtuais.json().catch(() => ([]));
                if (transacoesAtuais.ok) setTransacoes(Array.isArray(dadosTransacoes) ? dadosTransacoes : []);
                else erros.push(new Error(dadosTransacoes?.mensagem?.descricao || "Erro ao carregar transações financeiras."));
            }

            if (saquesAtuais) {
                const dadosSaques = await saquesAtuais.json().catch(() => ([]));
                if (saquesAtuais.ok) setSaques(Array.isArray(dadosSaques) ? dadosSaques : []);
                else erros.push(new Error(dadosSaques?.mensagem?.descricao || "Erro ao carregar pagamentos dos professores."));
            }

            if (erros.length) {
                console.error("Erros ao carregar áreas do financeiro:", erros);
                setMensagem?.({ tipo: "erro", descricao: descricaoErroApi(erros[0]) });
            }
        }

        /* Sprint item 13 - Criar gestão financeira do sistema - Consulta e apresenta as entradas e saídas financeiras do sistema */
        carregarFinanceiro();
        /* Fim item 13 */
        /* Sprint item 3 - Sincronizar dados entre aplicativo e sistema web - Atualiza os dados da sessão compartilhados entre o site e o aplicativo */
        window.addEventListener("cursando:sincronizar", carregarFinanceiro);
        /* Fim item 3 */
        return () => window.removeEventListener("cursando:sincronizar", carregarFinanceiro);
    }, [api, exibindoFinanceiro, setMensagem]);

    /* Sprint item 15 - Exibir saldo disponível em caixa, assinatura de R$ 500 e desconto das comissões no saldo administrativo - Grava o percentual reservado às comissões dos instrutores */
    async function salvarPercentualInstrutores() {
        try {
            const resposta = await fetch(`${api}/admin/financeiro/config`, {
                method: "PATCH",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    percentual_instrutores: Number(percentualInstrutores)
                })
            });
            const dados = await resposta.json().catch(() => ({}));

            if (dados.mensagem && setMensagem) {
                setMensagem(dados.mensagem);
            }

            if (!resposta.ok) {
                throw new Error(dados?.mensagem?.descricao || "Erro ao atualizar percentual.");
            }

            const resumo = await fetch(`${api}/financeiro/resumo`, { credentials: "include" });
            const financeiroAtualizado = await resumo.json().catch(() => ({}));
            if (!resumo.ok) throw new Error(financeiroAtualizado?.mensagem?.descricao || "Erro ao recarregar financeiro.");
            setFinanceiro(financeiroAtualizado);
            setPercentualInstrutores(String(financeiroAtualizado.percentual_instrutores ?? percentualInstrutores));
        } catch (erro) {
            console.error("Erro ao salvar percentual:", erro);
            setMensagem?.({ tipo: "erro", descricao: erro.message });
        }
    }
    /* Fim item 15 */

    /* Sprint item 13 - Criar gestão financeira do sistema - Recarrega as entradas e saídas financeiras do sistema */
    async function atualizarTransacoesFinanceiras() {
        const respostaTransacoes = await fetch(`${api}/admin/financeiro/transacoes`, { credentials: "include", cache: "no-store" });
        const dadosTransacoes = await respostaTransacoes.json().catch(() => ([]));
        if (respostaTransacoes.ok) setTransacoes(Array.isArray(dadosTransacoes) ? dadosTransacoes : []);
    }
    /* Fim item 13 */

    /* Sprint item 32 - Permitir solicitação de saque para a conta ARKHE - Registra a recusa ou a confirmação manual do pagamento */
    async function analisarSaque(evento, saque, acao) {
        evento.preventDefault();
        if (processandoSaque !== null) return;
        const dadosFormulario = dadosAnaliseSaque[saque.id] || {};
        const campo = acao === "pago" ? "comprovante" : "motivo";
        const texto = String(dadosFormulario[campo] || "").trim();
        if (texto.length < 5) {
            setMensagem?.({ tipo: "erro", descricao: acao === "pago" ? "Informe a referência ou número do comprovante do pagamento." : "Informe o motivo da recusa." });
            return;
        }
        setProcessandoSaque(saque.id);
        try {
            const resposta = await fetch(`${api}/admin/saques/${saque.id}`, {
                method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ acao, [campo]: texto })
            });
            const dados = await resposta.json().catch(() => ({}));
            if (!resposta.ok) throw new Error(dados?.mensagem?.descricao || "Não foi possível analisar a solicitação.");
            if (dados.mensagem) setMensagem?.(dados.mensagem);
            const [lista, resumo] = await Promise.all([
                fetch(`${api}/admin/saques`, { credentials: "include", cache: "no-store" }),
                fetch(`${api}/financeiro/resumo`, { credentials: "include", cache: "no-store" })
            ]);
            if (lista.ok) setSaques(await lista.json());
            if (resumo.ok) setFinanceiro(await resumo.json());
            await atualizarTransacoesFinanceiras();
        } catch (erro) {
            setMensagem?.({ tipo: "erro", descricao: descricaoErroApi(erro) });
        } finally {
            setProcessandoSaque(null);
        }
    }
    /* Fim item 32 */

    /* Sprint item 36 - Permitir cadastro e acompanhamento dos custos da plataforma - Envia o custo único ou recorrente e atualiza a listagem */
    async function cadastrarCusto(evento, tipoCusto) {
        evento.preventDefault();
        const dadosCusto = tipoCusto === "MENSAL" ? novoCustoMensal : novoCustoUnico;
        try {
            const resposta = await fetch(`${api}/admin/custos-plataforma`, {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...dadosCusto, tipo_custo: tipoCusto })
            });
            const dados = await resposta.json().catch(() => ({}));
            if (dados.mensagem) setMensagem?.(dados.mensagem);
            if (!resposta.ok) throw new Error(dados?.mensagem?.descricao || "Erro ao cadastrar custo.");
            if (tipoCusto === "MENSAL") setNovoCustoMensal({ descricao: "", id_categoria: "", valor: "", data_inicio: "", data_fim: "" });
            else setNovoCustoUnico({ descricao: "", id_categoria: "", valor: "", data_custo: "" });
            await atualizarTransacoesFinanceiras();
            const resumo = await fetch(`${api}/financeiro/resumo`, { credentials: "include", cache: "no-store" });
            if (resumo.ok) setFinanceiro(await resumo.json());
        } catch (erro) {
            setMensagem?.({ tipo: "erro", descricao: descricaoErroApi(erro) });
        }
    }
    /* Fim item 36 */

    /* Sprint item 36 - Permitir cadastro e acompanhamento dos custos da plataforma - Cadastra a categoria usada para organizar os custos */
    async function cadastrarCategoriaCusto(evento) {
        evento.preventDefault();
        try {
            const resposta = await fetch(`${api}/admin/categorias-custo`, {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ nome: novaCategoriaCusto })
            });
            const dados = await resposta.json().catch(() => ({}));
            if (dados.mensagem) setMensagem?.(dados.mensagem);
            if (!resposta.ok) throw new Error(dados?.mensagem?.descricao || "Erro ao cadastrar categoria.");
            setNovaCategoriaCusto("");
            const lista = await fetch(`${api}/admin/categorias-custo`, { credentials: "include", cache: "no-store" });
            const categorias = await lista.json().catch(() => ([]));
            if (lista.ok) setCategoriasCusto(Array.isArray(categorias) ? categorias : []);
        } catch (erro) {
            setMensagem?.({ tipo: "erro", descricao: descricaoErroApi(erro) });
        }
    }
    /* Fim item 36 */

    useEffect(() => {
        if (!exibindoLogs) return;

        /* Sprint item 25 - Permitir acesso e relatórios dos logs somente para o administrador por data e usuário - Consulta os logs aplicando filtros por período, ação e usuário */
        async function carregarLogs() {
            try {
                const params = new URLSearchParams();
                Object.entries(filtrosLogs).forEach(([chave, valor]) => {
                    if (valor) params.set(chave, valor);
                });
                const respostaGravacao = await fetch(`${api}/admin/logs-gravacao?${params.toString()}`, { credentials: "include" });
                const dadosGravacao = await respostaGravacao.json().catch(() => ({}));
                if (!respostaGravacao.ok) throw new Error(dadosGravacao?.mensagem?.descricao || "Erro ao carregar logs.");
                const registros = Array.isArray(dadosGravacao) ? dadosGravacao : [];
                setLogsGravacao(registros.slice(0, 100));
                setTemMaisLogs(registros.length > 100);
            } catch (erro) {
                console.error("Erro ao carregar logs:", erro);
                setMensagem?.({ tipo: "erro", descricao: erro.message });
            }
        }
        /* Fim item 25 */

        /* Sprint item 25 - Permitir acesso e relatórios dos logs somente para o administrador por data e usuário - Restringe a consulta dos logs ao administrador e aplica os filtros */
        carregarLogs();
        /* Fim item 25 */
    }, [api, exibindoLogs, filtrosLogs, setMensagem]);


    /* Sprint item 25 - Permitir acesso e relatórios dos logs somente para o administrador por data e usuário - Carrega a próxima página preservando os filtros dos logs */
    async function carregarMaisLogs() {
        setCarregandoMaisLogs(true);
        try {
            const params = new URLSearchParams();
            Object.entries(filtrosLogs).forEach(([chave, valor]) => { if (valor) params.set(chave, valor); });
            params.set("offset", String(logsGravacao.length));
            const resposta = await fetch(`${api}/admin/logs-gravacao?${params.toString()}`, { credentials: "include" });
            const dados = await resposta.json().catch(() => ([]));
            if (!resposta.ok) throw new Error(dados?.mensagem?.descricao || "Erro ao carregar mais logs.");
            const registros = Array.isArray(dados) ? dados : [];
            setLogsGravacao((atuais) => [...atuais, ...registros.slice(0, 100)]);
            setTemMaisLogs(registros.length > 100);
        } catch (erro) { setMensagem?.({ tipo: "erro", descricao: erro.message }); }
        finally { setCarregandoMaisLogs(false); }
    }
    /* Fim item 25 */


    const metricas = useMemo(() => {
        const dados = dashboard || {};

        return [
            {
                id: 1,
                titulo: "Total de professores",
                textoMes: "Total real cadastrado",
                quantidade: dados.total_professores ?? 0,
                icone: <FaGraduationCap />
            },
            {
                id: 2,
                titulo: "Total de alunos",
                textoMes: "Total real cadastrado",
                quantidade: dados.total_alunos ?? 0,
                icone: <FaUser />
            },
            {
                id: 3,
                titulo: "Aulas publicadas",
                textoMes: `${dados.aulas_mes ?? 0} video-aulas esse mes`,
                quantidade: dados.aulas_publicadas ?? 0,
                icone: <FaPlay />
            },
            {
                id: 4,
                titulo: "Cursos",
                textoMes: `+${dados.cursos_mes ?? 0} cursos criados esse mes`,
                quantidade: dados.cursos ?? 0,
                icone: <FaFolder />
            }
        ];
    }, [dashboard]);


    /* Sprint item 8 - Criar dashboard com gráficos para administrador e instrutor - Monta os gráficos e os indicadores do painel */
    const dadosGraficoAdmin = useMemo(() => [
        ["Indicador", "Quantidade"],
        ["Professores", Number(dashboard?.total_professores || 0)],
        ["Alunos", Number(dashboard?.total_alunos || 0)],
        ["Aulas publicadas", Number(dashboard?.aulas_publicadas || 0)],
        ["Cursos", Number(dashboard?.cursos || 0)]
    ], [dashboard]);
    const opcoesGraficoAdmin = useMemo(() => ({
        legend: { position: "none" },
        colors: ["#139a58"],
        chartArea: { left: 55, top: 12, width: "86%", height: "76%" },
        height: 300,
        vAxis: { minValue: 0, format: "0", textStyle: { color: "#4c5b53" } },
        hAxis: { textStyle: { color: "#4c5b53" } },
        backgroundColor: "transparent"
    }), []);
    /* Fim item 8 */

    const transacoesFiltradas = useMemo(() => transacoes.filter((transacao) => {
        const data = (transacao.data || "").slice(0, 10);
        return (!filtrosTransacoes.tipo || transacao.tipo === filtrosTransacoes.tipo)
            && (!filtrosTransacoes.categoria || transacao.categoria === filtrosTransacoes.categoria)
            && (!filtrosTransacoes.inicio || data >= filtrosTransacoes.inicio)
            && (!filtrosTransacoes.fim || data <= filtrosTransacoes.fim)
            && (!filtrosTransacoes.status || transacao.status === filtrosTransacoes.status);
    }), [transacoes, filtrosTransacoes]);

    return (
        <div className={css.painelAdm}>
            {/* Sprint item 23 - Exibir relatórios de alunos, cursos, módulos e horas assistidas - Apresenta os dados consolidados de alunos, cursos, módulos e horas */}
            <MenuLateralAdm itemAtivo={exibindoPerfil ? "perfil" : exibindoFinanceiro ? "financeiro" : exibindoLogs ? "logs" : exibindoRelatorios ? "relatorios" : "inicio"} />
            {/* Fim item 23 */}

            <div className={css.conteudoPrincipal}>
                <main className={css.areaConteudo}>
                    {exibindoInicio && (
                        <header className={css.cabecalhoUsuario}>
                            <div className={css.dadosUsuario}>
                                <h1>Olá {usuario.nome}</h1>
                                <span className={css.cargoUsuario}>
                                    {Number(usuario.tipo) === 0 && "Administrador"}
                                    {Number(usuario.tipo) === 1 && "Professor"}
                                    {Number(usuario.tipo) === 2 && "Aluno"}
                                </span>
                            </div>
                        </header>
                    )}

                                                                                                                                                                              
                    <section className={css.cabecalhoPagina}>
                        <div>
                            {/* Sprint item 23 - Exibir relatórios de alunos, cursos, módulos e horas assistidas - Apresenta os dados consolidados de alunos, cursos, módulos e horas */}
                            <span className={css.etiquetaPagina}>
                                {exibindoPerfil ? "CONTA" : exibindoFinanceiro ? "FINANCEIRO" : exibindoLogs ? "AUDITORIA" : exibindoRelatorios ? "RELATÓRIOS" : "ADMINISTRAÇÃO"}
                            </span>
                            {/* Fim item 23 */}
                            {/* Sprint item 23 - Exibir relatórios de alunos, cursos, módulos e horas assistidas - Apresenta os dados consolidados de alunos, cursos, módulos e horas */}
                            <h2>{exibindoPerfil ? "Perfil do administrador" : exibindoFinanceiro ? "Visão financeira" : exibindoLogs ? "Atividade do sistema" : exibindoRelatorios ? "Relatórios da plataforma" : "Visão geral"}</h2>
                            {/* Fim item 23 */}
                            {/* Sprint item 23 - Exibir relatórios de alunos, cursos, módulos e horas assistidas - Apresenta os dados consolidados de alunos, cursos, módulos e horas */}
                            <p>{exibindoPerfil
                                ? "Atualize seus dados e mantenha as informações da conta em dia."
                                : exibindoFinanceiro
                                    ? "Acompanhe arrecadação, repasses, custos e saldo da plataforma."
                                    : exibindoLogs
                                        ? "Consulte eventos e filtre registros para acompanhar as operações da plataforma."
                                        : exibindoRelatorios
                                            ? "Analise matrículas, conclusões e atividade por período, instrutor e curso."
                                        : "Acompanhe os principais indicadores de cursos e usuários da plataforma."}</p>
                            {/* Fim item 23 */}
                        </div>
                    </section>

                    {exibindoPerfil ? (
                        <PerfilUsuario api={api} setMensagem={setMensagem} onPerfilAtualizado={onPerfilAtualizado} />
                    ) : exibindoFinanceiro ? (
                        <section className={`${css.secaoMetricas} ${css.paginaFinanceiro}`}>
                                                                              
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       
                            {[
                                /* Sprint item 14 - Exibir total arrecadado e total repassado aos instrutores - Prepara o indicador de assinaturas pagas (total) para apresentação */ ["Assinaturas pagas (total)", financeiro?.total_arrecadado, "Soma das mensalidades confirmadas"] /* Fim item 14 */,
                                /* Sprint item 14 - Exibir total arrecadado e total repassado aos instrutores - Prepara o indicador de professores pagos para apresentação */ ["Professores pagos", financeiro?.total_repassado, "Pagamentos confirmados pelo administrador"] /* Fim item 14 */,
                                /* Sprint item 14 - Exibir total arrecadado e total repassado aos instrutores - Prepara o indicador de total do revenue pool (estimado) para apresentação */ ["Total do Revenue Pool (estimado)", financeiro?.total_repassado_estimado, "Percentual aplicado sobre mensalidades pagas"] /* Fim item 14 */,
                                ["Despesas cadastradas", financeiro?.custos, "Total de despesas registradas"],
                                /* Sprint item 15 - Exibir saldo disponível em caixa, assinatura de R$ 500 e desconto das comissões no saldo administrativo - Prepara o indicador de disponível para saque (admin) para apresentação */ ["Disponível para saque (admin)", financeiro?.disponivel_saque_admin, "Receita paga menos comissão dos instrutores e despesas"] /* Fim item 15 */
                            ].map(([titulo, valor, detalhe]) => (
                                <div key={titulo} className={css.cardMetrica}>
                                    <div className={css.metricaTopo}>
                                        <h2>{titulo}</h2>
                                        <div className={css.iconeBadge}><FaFolder /></div>
                                    </div>
                                    <span className={css.metricaVariacao}>{detalhe}</span>
                                    <div className={css.metricaNumero}>R$ {Number(valor || 0).toFixed(2).replace(".", ",")}</div>
                                </div>
                            ))}
                            {/* Sprint item 35 - Calcular ticket médio por aluno - Apresenta os totais pagos e o ticket médio por aluno */}
                            <div className={css.cardMetrica}>
                                <div className={css.metricaTopo}>
                                    <h2>Ticket médio por aluno</h2>
                                    <div className={css.iconeBadge}><FaUser /></div>
                                </div>
                                <span className={css.metricaVariacao}>{financeiro?.alunos_pagantes || 0} alunos com mensalidade paga</span>
                                <div className={css.metricaNumero}>R$ {Number(financeiro?.ticket_medio_aluno || 0).toFixed(2).replace(".", ",")}</div>
                            </div>
                            {/* Fim item 35 */}
                                                                                                                                                                                                      
                            {/* Sprint item 16 - Exibir indicadores da saúde financeira da empresa - Apresenta os indicadores de receita e margem financeira */}
                            <div className={css.cardMetrica}>
                                <div className={css.metricaTopo}>
                                    <h2>Saude financeira</h2>
                                    <div className={css.iconeBadge}><FaFolder /></div>
                                </div>
                                <span className={css.metricaVariacao}>Margem histórica estimada após pool e custos</span>
                                <div className={css.metricaNumero}>{Number(financeiro?.margem_caixa_percentual || 0).toFixed(2).replace(".", ",")}%</div>
                                <p className={css.textoFinanceiro}>
                                    {financeiro?.faturas_pagas || 0} mensalidades pagas, ticket base de R$ {Number(financeiro?.receita_media_assinatura || 0).toFixed(2).replace(".", ",")}.
                                </p>
                            </div>
                            {/* Fim item 16 */}
                            <div className={css.cardMetrica}>
                                <div className={css.metricaTopo}>
                                    <h2>Pool dos instrutores</h2>
                                    <div className={css.iconeBadge}><FaGraduationCap /></div>
                                </div>
                                <span className={css.metricaVariacao}>Percentual da receita</span>
                                {/* Sprint item 15 - Exibir saldo disponível em caixa, assinatura de R$ 500 e desconto das comissões no saldo administrativo - Apresenta o saldo disponível e a reserva de comissões */}
                                <div className={css.metricaNumero}>{Number(financeiro?.percentual_instrutores || 0).toFixed(2).replace(".", ",")}%</div>
                                {/* Fim item 15 */}
                                {/* Sprint item 15 - Exibir saldo disponível em caixa, assinatura de R$ 500 e desconto das comissões no saldo administrativo - Apresenta o saldo disponível e a reserva de comissões */}
                                <label className={css.campoFinanceiro}>
                                    Ajustar percentual
                                    <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        step="0.01"
                                        value={percentualInstrutores}
                                        onChange={(evento) => setPercentualInstrutores(evento.target.value)}
                                    />
                                </label>
                                {/* Fim item 15 */}
                                <button className={css.botaoFinanceiro} type="button" onClick={salvarPercentualInstrutores}>
                                    Salvar percentual
                                </button>
                            </div>
                            {/* Sprint item 32 - Permitir solicitação de saque para a conta ARKHE - Envia ou acompanha solicitações de saque e sua análise manual */}
                            <section className={css.listaTransacoes}>
                                <h2>Pagamentos aos professores</h2>
                                <p className={css.textoFinanceiro}>Confira a chave Pix e o valor. Faça o pagamento fora do Cursando e registre a referência somente depois de confirmar a transferência.</p>
                                <div className={css.listaSaquesAdmin}>
                                    {saques.map((saque) => <article className={css.cardSaqueAdmin} key={saque.id}>
                                        <div className={css.cabecalhoSaqueAdmin}>
                                            <div><strong>{saque.professor}</strong><small>Pedido #{saque.id} · {saque.criado_em ? new Date(saque.criado_em).toLocaleDateString("pt-BR") : "—"}</small></div>
                                            <strong>R$ {Number(saque.valor).toFixed(2).replace(".", ",")}</strong>
                                        </div>
                                        <p><b>Situação:</b> {saque.status_nome}</p>
                                        <p><b>Chave Pix:</b> {saque.chave_pix || "Não informada"}</p>
                                        {saque.status === 1 && <p><b>Referência do pagamento:</b> {saque.comprovante}</p>}
                                        {saque.status === 2 && <p><b>Motivo da recusa:</b> {saque.motivo_recusa}</p>}
                                        {saque.status === 0 && <div className={css.acoesSaqueAdmin}>
                                            <form onSubmit={(evento) => analisarSaque(evento, saque, "pago")}>
                                                <label>Referência ou número do comprovante<input required minLength={5} maxLength={500} value={dadosAnaliseSaque[saque.id]?.comprovante || ""} onChange={(evento) => setDadosAnaliseSaque((atual) => ({ ...atual, [saque.id]: { ...atual[saque.id], comprovante: evento.target.value } }))} placeholder="Informe após realizar o pagamento" /></label>
                                                <button className={css.botaoFinanceiro} type="submit" disabled={processandoSaque !== null || !saque.chave_pix}>Confirmar como pago</button>
                                            </form>
                                            <form onSubmit={(evento) => analisarSaque(evento, saque, "recusado")}>
                                                <label>Motivo da recusa<input required minLength={5} maxLength={500} value={dadosAnaliseSaque[saque.id]?.motivo || ""} onChange={(evento) => setDadosAnaliseSaque((atual) => ({ ...atual, [saque.id]: { ...atual[saque.id], motivo: evento.target.value } }))} placeholder="Explique ao professor" /></label>
                                                <button className={css.botaoRecusarSaque} type="submit" disabled={processandoSaque !== null}>Recusar solicitação</button>
                                            </form>
                                        </div>}
                                    </article>)}
                                    {!saques.length && <p>Nenhuma solicitação de pagamento registrada.</p>}
                                </div>
                            </section>
                            {/* Fim item 32 */}
                                                                                                                                                      
                            {/* Sprint item 35 - Calcular ticket médio por aluno - Apresenta os totais pagos e o ticket médio por aluno */}
                            <section className={css.listaTransacoes}>
                                <h2>Ticket por aluno</h2>
                                <div className={css.tabelaTransacoes}>
                                    <table>
                                        <thead>
                                            <tr><th>Aluno</th><th>Mensalidades pagas</th><th>Total pago</th><th>Média por mensalidade</th></tr>
                                        </thead>
                                        <tbody>
                                            {(financeiro?.ticket_alunos || []).map((aluno) => (
                                                <tr key={aluno.id_usuario}>
                                                    <td>{aluno.nome}<br /><small>{aluno.email}</small></td>
                                                    <td>{aluno.faturas_pagas}</td>
                                                    <td>R$ {Number(aluno.total_pago || 0).toFixed(2).replace(".", ",")}</td>
                                                    <td>R$ {Number(aluno.ticket_medio || 0).toFixed(2).replace(".", ",")}</td>
                                                </tr>
                                            ))}
                                            {!(financeiro?.ticket_alunos || []).length && <tr><td colSpan="4">{financeiro?.total_alunos ? "Nenhuma mensalidade paga encontrada para os alunos." : "Nenhum aluno cadastrado."}</td></tr>}
                                        </tbody>
                                    </table>
                                </div>
                            </section>
                            {/* Fim item 35 */}
                                                                                                                                                                                      
                            <div className={`${css.cardMetrica} ${css.cardCadastroCusto}`}>
                                {/* Sprint item 36 - Permitir cadastro e acompanhamento dos custos da plataforma - Cadastra e acompanha os custos e suas categorias */}
                                <div className={css.metricaTopo}>
                                    <h2>Pagamento Único</h2>
                                    <div className={css.iconeBadge}><FaFolder /></div>
                                </div>
                                {/* Fim item 36 */}
                                {/* Sprint item 36 - Permitir cadastro e acompanhamento dos custos da plataforma - Cadastra e acompanha os custos e suas categorias */}
                                <form className={css.formFinanceiro} onSubmit={(evento) => cadastrarCusto(evento, "UNICO")}>
                                    <label>Descrição<input required maxLength="200" value={novoCustoUnico.descricao} onChange={(evento) => setNovoCustoUnico({ ...novoCustoUnico, descricao: evento.target.value })} /></label>
                                    <label>Categoria<select required value={novoCustoUnico.id_categoria} onChange={(evento) => setNovoCustoUnico({ ...novoCustoUnico, id_categoria: evento.target.value })}><option value="">Selecione</option>{categoriasCusto.map((categoria) => <option key={categoria.id} value={categoria.id}>{categoria.nome}</option>)}</select></label>
                                    <label>Valor<input required type="number" min="0.01" step="0.01" value={novoCustoUnico.valor} onChange={(evento) => setNovoCustoUnico({ ...novoCustoUnico, valor: evento.target.value })} /></label>
                                    <label>Data do pagamento<input required type="date" value={novoCustoUnico.data_custo} onChange={(evento) => setNovoCustoUnico({ ...novoCustoUnico, data_custo: evento.target.value })} /></label>
                                    <button className={css.botaoFinanceiro} type="submit">Cadastrar pagamento único</button>
                                </form>
                                {/* Fim item 36 */}
                            </div>
                            <div className={`${css.cardMetrica} ${css.cardCadastroCusto}`}>
                                {/* Sprint item 36 - Permitir cadastro e acompanhamento dos custos da plataforma - Cadastra e acompanha os custos e suas categorias */}
                                <div className={css.metricaTopo}>
                                    <h2>Pagamento mensal</h2>
                                    <div className={css.iconeBadge}><FaFolder /></div>
                                </div>
                                {/* Fim item 36 */}
                                <p className={css.textoFinanceiro}>O valor será lançado em cada mês entre as datas escolhidas.</p>
                                {/* Sprint item 36 - Permitir cadastro e acompanhamento dos custos da plataforma - Cadastra e acompanha os custos e suas categorias */}
                                <form className={css.formFinanceiro} onSubmit={(evento) => cadastrarCusto(evento, "MENSAL")}>
                                    <label>Descrição<input required maxLength="200" value={novoCustoMensal.descricao} onChange={(evento) => setNovoCustoMensal({ ...novoCustoMensal, descricao: evento.target.value })} /></label>
                                    <label>Categoria<select required value={novoCustoMensal.id_categoria} onChange={(evento) => setNovoCustoMensal({ ...novoCustoMensal, id_categoria: evento.target.value })}><option value="">Selecione</option>{categoriasCusto.map((categoria) => <option key={categoria.id} value={categoria.id}>{categoria.nome}</option>)}</select></label>
                                    <label>Valor mensal<input required type="number" min="0.01" step="0.01" value={novoCustoMensal.valor} onChange={(evento) => setNovoCustoMensal({ ...novoCustoMensal, valor: evento.target.value })} /></label>
                                    <label>Data de início<input required type="date" value={novoCustoMensal.data_inicio} onChange={(evento) => setNovoCustoMensal({ ...novoCustoMensal, data_inicio: evento.target.value })} /></label>
                                    <label>Data de fim<input required type="date" value={novoCustoMensal.data_fim} onChange={(evento) => setNovoCustoMensal({ ...novoCustoMensal, data_fim: evento.target.value })} /></label>
                                    <button className={css.botaoFinanceiro} type="submit">Cadastrar custo mensal</button>
                                </form>
                                {/* Fim item 36 */}
                            </div>
                            <div className={`${css.cardMetrica} ${css.cardCadastroCusto}`}>
                                <div className={css.metricaTopo}>
                                    <h2>Cadastrar categoria de custo</h2>
                                    <div className={css.iconeBadge}><FaFolder /></div>
                                </div>
                                {/* Sprint item 36 - Permitir cadastro e acompanhamento dos custos da plataforma - Cadastra e acompanha os custos e suas categorias */}
                                <form className={`${css.formFinanceiro} ${css.formCategoriaCusto}`} onSubmit={cadastrarCategoriaCusto}>
                                    <label>Nome da categoria<input required maxLength="80" value={novaCategoriaCusto} onChange={(evento) => setNovaCategoriaCusto(evento.target.value)} /></label>
                                    <button className={css.botaoFinanceiro} type="submit">Cadastrar categoria</button>
                                </form>
                                {/* Fim item 36 */}
                                {/* Sprint item 36 - Permitir cadastro e acompanhamento dos custos da plataforma - Cadastra e acompanha os custos e suas categorias */}
                                <p className={css.textoFinanceiro}>{categoriasCusto.length} categorias disponíveis para selecionar.</p>
                                {/* Fim item 36 */}
                            </div>
                            <section className={css.listaTransacoes}>
                                                                                                                                                                                  
                                <h2>Transações financeiras</h2>
                                <form className={css.formFinanceiro + " " + css.filtrosTransacoes}>
                                    {/* Sprint item 36 - Permitir cadastro e acompanhamento dos custos da plataforma - Cadastra e acompanha os custos e suas categorias */}
                                    <label>Tipo<select value={filtrosTransacoes.tipo} onChange={(evento) => setFiltrosTransacoes({ ...filtrosTransacoes, tipo: evento.target.value })}><option value="">Todos</option><option>Assinatura</option><option>Despesa mensal</option><option>Pagamento Único</option><option>Pagamento ao professor</option></select></label>
                                    {/* Fim item 36 */}
                                    {/* Sprint item 36 - Permitir cadastro e acompanhamento dos custos da plataforma - Cadastra e acompanha os custos e suas categorias */}
                                    <label>Categoria<select value={filtrosTransacoes.categoria} onChange={(evento) => setFiltrosTransacoes({ ...filtrosTransacoes, categoria: evento.target.value })}><option value="">Todas</option>{categoriasCusto.map((categoria) => <option key={categoria.id} value={categoria.nome}>{categoria.nome}</option>)}</select></label>
                                    {/* Fim item 36 */}
                                    <label>Data inicial<input type="date" value={filtrosTransacoes.inicio} onChange={(evento) => setFiltrosTransacoes({ ...filtrosTransacoes, inicio: evento.target.value })} /></label>
                                    <label>Data final<input type="date" value={filtrosTransacoes.fim} onChange={(evento) => setFiltrosTransacoes({ ...filtrosTransacoes, fim: evento.target.value })} /></label>
                                    <label>Status<select value={filtrosTransacoes.status} onChange={(evento) => setFiltrosTransacoes({ ...filtrosTransacoes, status: evento.target.value })}><option value="">Todos</option><option>Paga</option><option>Pendente</option><option>Registrada</option><option>Programada</option><option>Concluído</option><option>Solicitado</option><option>Recusado</option></select></label>
                                    <button className={css.botaoLimparFiltros} type="button" onClick={() => setFiltrosTransacoes({ tipo: "", categoria: "", inicio: "", fim: "", status: "" })}>Limpar filtros</button>
                                </form>
                                <div className={css.tabelaTransacoes}>
                                    <table>
                                        <thead>
                                            <tr><th>Data</th><th>Tipo</th><th>Categoria</th><th>Descrição</th><th>Status</th><th>Valor</th></tr>
                                        </thead>
                                        <tbody>
                                            {transacoesFiltradas.map((transacao) => (
                                                <tr key={transacao.id}>
                                                    <td>{transacao.data ? new Date(transacao.data).toLocaleDateString("pt-BR") : "—"}</td>
                                                    <td>{transacao.tipo}</td>
                                                    <td>{transacao.categoria || "—"}</td>
                                                    <td>{transacao.descricao}</td>
                                                    <td>{transacao.status}</td>
                                                    <td className={transacao.direcao === "saida" ? css.valorSaida : transacao.direcao === "entrada" ? css.valorEntrada : ""}>
                                                        {transacao.direcao === "saida" ? "− " : transacao.direcao === "entrada" ? "+ " : ""}R$ {Number(transacao.valor || 0).toFixed(2).replace(".", ",")}
                                                    </td>
                                                </tr>
                                            ))}
                                            {!transacoesFiltradas.length && <tr><td colSpan="6">Nenhuma transação encontrada para os filtros selecionados.</td></tr>}
                                        </tbody>
                                    </table>
                                </div>
                            </section>
                        </section>
                    ) : exibindoRelatorios ? (
                        <section className={css.listaTransacoes}>
                                                                                                                                                                                                   
                            <h2>Filtros do relatório</h2>
                            <p>O período considera a data de criação dos cursos.</p>
                            <form className={`${css.formFinanceiro} ${css.filtrosRelatorio}`} onSubmit={(evento) => { evento.preventDefault(); /* Sprint item 23 - Exibir relatórios de alunos, cursos, módulos e horas assistidas - Apresenta os dados consolidados de alunos, cursos, módulos e horas */
                            carregarRelatorio();
                            /* Fim item 23 */ }}>
                                <label>Início do período<input type="date" value={filtrosRelatorio.inicio} onChange={(evento) => setFiltrosRelatorio({ ...filtrosRelatorio, inicio: evento.target.value })} /></label>
                                <label>Fim do período<input type="date" value={filtrosRelatorio.fim} onChange={(evento) => setFiltrosRelatorio({ ...filtrosRelatorio, fim: evento.target.value })} /></label>
                                <label>Instrutor<select value={filtrosRelatorio.id_instrutor} onChange={(evento) => setFiltrosRelatorio({ ...filtrosRelatorio, id_instrutor: evento.target.value })}><option value="">Todos</option>{instrutoresRelatorio.map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}</select></label>
                                <label>Curso<select value={filtrosRelatorio.id_curso} onChange={(evento) => setFiltrosRelatorio({ ...filtrosRelatorio, id_curso: evento.target.value })}><option value="">Todos</option>{cursosRelatorio.map((item) => <option key={item.id_curso} value={item.id_curso}>{item.curso} — {item.instrutor}</option>)}</select></label>
                                <button className={css.botaoFinanceiro} type="submit" disabled={carregandoRelatorio}>{carregandoRelatorio ? "Gerando..." : "Aplicar filtros"}</button>
                            </form>
                            <div className={css.secaoMetricas}>
                                                                                                                                                                                                       
                                {[
                                    /* Sprint item 23 - Exibir relatórios de alunos, cursos, módulos e horas assistidas - Prepara o indicador de matrículas para apresentação */ ["Matrículas", relatorio?.resumo?.alunos, <FaUsers />] /* Fim item 23 */,
                                    /* Sprint item 23 - Exibir relatórios de alunos, cursos, módulos e horas assistidas - Prepara o indicador de cursos para apresentação */ ["Cursos", relatorio?.resumo?.cursos, <FaGraduationCap />] /* Fim item 23 */,
                                    /* Sprint item 23 - Exibir relatórios de alunos, cursos, módulos e horas assistidas - Prepara o indicador de aulas concluídas para apresentação */ ["Aulas concluídas", relatorio?.resumo?.aulas_assistidas, <FaPlay />] /* Fim item 23 */,
                                    /* Sprint item 23 - Exibir relatórios de alunos, cursos, módulos e horas assistidas - Prepara o indicador de cursos concluídos para apresentação */ ["Cursos concluídos", relatorio?.resumo?.conclusoes, <FaCheckCircle />] /* Fim item 23 */,
                                    /* Sprint item 23 - Exibir relatórios de alunos, cursos, módulos e horas assistidas - Prepara o indicador de módulos concluídos para apresentação */ ["Módulos concluídos", relatorio?.resumo?.modulos, <FaFolder />] /* Fim item 23 */,
                                    /* Sprint item 23 - Exibir relatórios de alunos, cursos, módulos e horas assistidas - Prepara o indicador de horas assistidas para apresentação */ ["Horas assistidas", `${Number(relatorio?.resumo?.horas_assistidas || 0).toFixed(2).replace(".", ",")}h`, <FaClock />] /* Fim item 23 */
                                ].map(([titulo, valor, icone]) => (
                                    <article className={css.cardMetrica} key={titulo}>
                                        <div className={css.metricaTopo}>
                                            <h2>{titulo}</h2>
                                            <div className={css.iconeBadge} aria-hidden="true">{icone}</div>
                                        </div>
                                        <strong className={css.metricaNumero}>{valor ?? 0}</strong>
                                    </article>
                                ))}
                            </div>
                            <h2>Detalhamento por curso</h2>
                            {/* Sprint item 23 - Exibir relatórios de alunos, cursos, módulos e horas assistidas - Apresenta os dados consolidados de alunos, cursos, módulos e horas */}
                            <div className={css.tabelaTransacoes}><table><thead><tr><th>Curso</th><th>Instrutor</th><th>Matrículas</th><th>Aulas concluídas</th><th>Conclusões</th><th>Horas</th><th>Avaliação</th></tr></thead><tbody>
                                {(relatorio?.cursos || []).map((curso) => <tr key={curso.id_curso}><td>{curso.curso}</td><td>{curso.instrutor}</td><td>{curso.alunos}</td><td>{curso.aulas_assistidas}</td><td>{curso.conclusoes}</td><td>{Number(curso.horas_assistidas || 0).toFixed(2).replace(".", ",")}</td><td>{Number(curso.avaliacao_media || 0).toFixed(2)}</td></tr>)}
                                {!relatorio?.cursos?.length && <tr><td colSpan="7">Nenhum resultado para os filtros selecionados.</td></tr>}
                            </tbody></table></div>
                            {/* Fim item 23 */}
                        </section>
                    ) : exibindoLogs ? (
                        <section className={css.listaLogs}>
                            {/* Sprint item 25 - Permitir acesso e relatórios dos logs somente para o administrador por data e usuário - Disponibiliza a consulta administrativa das ações registradas */}
                            <h2>Histórico de atividades</h2>
                            {/* Fim item 25 */}
                                                                                                                                                                                                                 
                            <div className={css.abasLogs}>
                                {[["0", "Administradores"], ["1", "Professores"], ["2", "Alunos"]].map(([tipo, label]) => (
                                    <button key={tipo} className={filtrosLogs.tipo === tipo ? css.abaAtiva : css.abaLog} onClick={() => { /* Sprint item 25 - Permitir acesso e relatórios dos logs somente para o administrador por data e usuário - Restringe a consulta dos logs ao administrador e aplica os filtros */
                                    setFiltrosLogs({ ...filtrosLogs, tipo, evento: "", acao: "" });
                                    /* Fim item 25 */ setLogExpandido(null); }} type="button">{label}</button>
                                ))}
                            </div>
                            <div className={css.filtrosLogs}>
                                {/* Sprint item 25 - Permitir acesso e relatórios dos logs somente para o administrador por data e usuário - Restringe a consulta dos logs ao administrador e aplica os filtros */}
                                <input placeholder="Buscar por nome ou e-mail" value={filtrosLogs.busca} onChange={(e) => setFiltrosLogs({ ...filtrosLogs, busca: e.target.value })} />
                                {/* Fim item 25 */}
                                {/* Sprint item 25 - Permitir acesso e relatórios dos logs somente para o administrador por data e usuário - Restringe a consulta dos logs ao administrador e aplica os filtros */}
                                <select value={filtrosLogs.evento} onChange={(e) => setFiltrosLogs({ ...filtrosLogs, evento: e.target.value })}>
                                    <option value="">Todas as atividades</option>
                                    {filtrosLogs.tipo === "0" && <><option value="cadastro_professor">Cadastro de professor</option><option value="cadastro_aluno">Cadastro de aluno</option><option value="alterar_usuario">Alteração de conta</option><option value="registrar_custo">Registro de despesa</option><option value="alterar_configuracao">Alteração financeira</option><option value="aprovar_saque">Análise de saque</option></>}
                                    {filtrosLogs.tipo === "1" && <><option value="criar_curso">Criação de curso</option><option value="editar_curso">Alteração de curso</option><option value="excluir_curso">Exclusão de curso</option><option value="criar_aula">Criação de aula</option><option value="editar_aula">Alteração de aula</option><option value="excluir_aula">Exclusão de aula</option><option value="criar_modulo">Criação de módulo</option><option value="criar_material">Inclusão de material</option><option value="criar_prova">Criação de prova</option><option value="corrigir_prova">Correção de prova</option><option value="solicitar_saque">Solicitação de saque</option><option value="mensagem_chat">Envio de mensagem</option></>}
                                    {filtrosLogs.tipo === "2" && <><option value="inscricao_curso">Matrícula em curso</option><option value="assinar">Assinatura</option><option value="assistir_aula">Aula assistida</option><option value="avaliar_curso">Avaliação de curso</option><option value="enviar_prova">Envio de prova</option><option value="mensagem_chat">Envio de mensagem</option></>}
                                </select>
                                {/* Fim item 25 */}
                                {/* Sprint item 25 - Permitir acesso e relatórios dos logs somente para o administrador por data e usuário - Restringe a consulta dos logs ao administrador e aplica os filtros */}
                                <input type="date" value={filtrosLogs.inicio} onChange={(e) => setFiltrosLogs({ ...filtrosLogs, inicio: e.target.value })} />
                                {/* Fim item 25 */}
                                {/* Sprint item 25 - Permitir acesso e relatórios dos logs somente para o administrador por data e usuário - Restringe a consulta dos logs ao administrador e aplica os filtros */}
                                <input type="date" value={filtrosLogs.fim} onChange={(e) => setFiltrosLogs({ ...filtrosLogs, fim: e.target.value })} />
                                {/* Fim item 25 */}
                            </div>
                                                                                                                                                                                                                                   
                            {logsGravacao.length === 0 && <p>Nenhuma atividade registrada.</p>}
                            {logsGravacao.map((log) => {
                                /* Sprint item 25 - Permitir acesso e relatórios dos logs somente para o administrador por data e usuário - Restringe a consulta dos logs ao administrador e aplica os filtros */
                                const expandido = logExpandido === log.id;
                                /* Fim item 25 */
                                const perfilUsuario = { 0: "Administrador", 1: "Professor", 2: "Aluno" }[log.tipo_usuario];
                                /* Sprint item 25 - Permitir acesso e relatórios dos logs somente para o administrador por data e usuário - Restringe a consulta dos logs ao administrador e aplica os filtros */
                                const alteracoes = alteracoesLog(log);
                                /* Fim item 25 */
                                const ator = log.nome
                                    ? `${log.nome}${log.id_usuario ? ` (#${log.id_usuario})` : ""}`
                                    : log.id_usuario ? `Usuário #${log.id_usuario}`
                                        : log.origem === "BANCO" ? "Operação direta no banco" : "Não identificado";
                                return (
                                    <article key={log.id} className={css.logItem}>
                                        <button className={css.logResumo} type="button" aria-expanded={expandido} onClick={() => setLogExpandido(expandido ? null : log.id)}>
                                            {/* Sprint item 25 - Permitir acesso e relatórios dos logs somente para o administrador por data e usuário - Restringe a consulta dos logs ao administrador e aplica os filtros */}
                                            <div className={css.logTopo}>
                                                <strong>{tipoAcaoLog(log.acao)} · {objetoLog(log)}</strong>
                                                <small>{formatarDataLog(log.criado_em)}</small>
                                            </div>
                                            {/* Fim item 25 */}
                                            <span>{ator}{perfilUsuario ? ` · ${perfilUsuario}` : ""}</span>
                                            {alteracoes.length > 0 && <span className={css.logPrevia}>Campo: {alteracoes[0].rotulo} · Antes: {alteracoes[0].antes} · Depois: {alteracoes[0].depois}{alteracoes.length > 1 ? ` · mais ${alteracoes.length - 1} ${alteracoes.length === 2 ? "campo" : "campos"}` : ""}</span>}
                                            <small>{expandido ? "Ocultar detalhes" : "Ver detalhes e valores alterados"}</small>
                                        </button>
                                        {expandido && <div className={css.logDetalhes}>
                                            <dl className={css.logInformacoes}>
                                                <div><dt>Quem alterou:</dt><dd>{ator}</dd></div>
                                                <div><dt>Quando alterou:</dt><dd>{formatarDataLog(log.criado_em) || "Não informado"}</dd></div>
                                                <div><dt>Tipo de usuário:</dt><dd>{perfilUsuario || "Não identificado"}</dd></div>
                                                <div><dt>Registro afetado:</dt><dd>{objetoLog(log)}</dd></div>
                                                {/* Sprint item 25 - Permitir acesso e relatórios dos logs somente para o administrador por data e usuário - Restringe a consulta dos logs ao administrador e aplica os filtros */}
                                                <div><dt>Ação realizada:</dt><dd>{tipoAcaoLog(log.acao)}</dd></div>
                                                {/* Fim item 25 */}
                                                <div><dt>O que foi alterado:</dt><dd>{alteracoes.length ? alteracoes.map((item) => item.rotulo).join(", ") : "Campos não registrados"}</dd></div>
                                                {log.email && <div><dt>Conta utilizada:</dt><dd>{log.email}</dd></div>}
                                                {log.contexto?.curso && <div><dt>Curso relacionado:</dt><dd>{log.contexto.curso}</dd></div>}
                                                {log.contexto?.prova && <div><dt>Prova relacionada:</dt><dd>{log.contexto.prova}</dd></div>}
                                                {log.contexto?.professor?.nome && <div><dt>Professor relacionado:</dt><dd>{log.contexto.professor.nome}</dd></div>}
                                            </dl>
                                            <div className={css.logAlteracoes}>
                                                <h3>Antes e depois de cada campo</h3>
                                                {alteracoes.length ? (
                                                    <div className={css.tabelaTransacoes}>
                                                        <table>
                                                            <thead><tr><th>Campo alterado</th><th>Valor anterior</th><th>Novo valor</th></tr></thead>
                                                            <tbody>{alteracoes.map((item) => (
                                                                <tr key={item.campo}><td>{item.rotulo}</td><td>{item.antes}</td><td>{item.depois}</td></tr>
                                                            ))}</tbody>
                                                        </table>
                                                    </div>
                                                ) : <p>Valores não registrados para esta atividade.</p>}
                                                {alteracoes.some((item) => item.antes === "Valor não registrado" || item.depois === "Valor não registrado") && (
                                                    <p className={css.avisoLog}>Alguns valores foram omitidos pelo trigger por conter dados sensíveis ou conteúdo extenso.</p>
                                                )}
                                            </div>
                                            <details className={css.detalhesTecnicos}>
                                                <summary>Dados técnicos do registro</summary>
                                                <dl className={css.logInformacoes}>
                                                    <div><dt>Origem:</dt><dd>{log.origem || "Não informada"}</dd></div>
                                                    <div><dt>Registro:</dt><dd>{log.id_registro || "Não informado"}</dd></div>
                                                    {log.rota && <div><dt>Rota:</dt><dd>{log.metodo} {log.rota}</dd></div>}
                                                    {log.ip && <div><dt>IP:</dt><dd>{log.ip}</dd></div>}
                                                    {log.request_id && <div><dt>ID da requisição:</dt><dd>{log.request_id}</dd></div>}
                                                </dl>
                                            </details>
                                        </div>}
                                    </article>
                                );
                            })}
                            {temMaisLogs && <button className={css.botaoFinanceiro} type="button" onClick={carregarMaisLogs} disabled={carregandoMaisLogs}>{carregandoMaisLogs ? "Carregando..." : "Carregar mais registros"}</button>}
                        </section>
                    ) : (
                        <>
                                                                                                                                                                                                      
                            {/* Sprint item 8 - Criar dashboard com gráficos para administrador e instrutor - Monta os gráficos e os indicadores do painel */}
                            <GoogleChart titulo="Indicadores da plataforma" data={dadosGraficoAdmin} options={opcoesGraficoAdmin} />
                            {/* Fim item 8 */}
                            <section className={css.secaoMetricas}>
                                {metricas.map((metrica) => (
                                    <div key={metrica.id} className={css.cardMetrica}>
                                        <div className={css.metricaTopo}>
                                            <h2>{metrica.titulo}</h2>
                                            <div className={css.iconeBadge}>{metrica.icone}</div>
                                        </div>
                                        <span className={css.metricaVariacao}>{metrica.textoMes}</span>
                                        <div className={css.metricaNumero}>{metrica.quantidade}</div>
                                    </div>
                                ))}
                            </section>
                        </>
                    )}
                </main>
            </div>

            <footer className={css.rodapePagina}>
                <div className={css.colunaRodape}>
                    <h4>Contato</h4>
                    <p>Birigui - SP</p>
                    <p>(18)98131-3801</p>
                    <p>cursando@gmail.com</p>
                </div>

                <div className={css.colunaRodape}>
                    <h4>Navegacao</h4>
                    <a href="#home">Home</a>
                    <a href="#login">Login</a>
                    <a href="#cadastro">Cadastro</a>
                </div>

                <div className={css.colunaRodape}>
                    <h4>Baixe nosso aplicativo</h4>
                    <ul className={css.listaApps}>
                        <li><FaGooglePlay /> Playstore</li>
                        <li><FaLinux /> Linux</li>
                        <li><FaWindows /> Windows</li>
                    </ul>
                </div>
            </footer>
        </div>
    );
}
