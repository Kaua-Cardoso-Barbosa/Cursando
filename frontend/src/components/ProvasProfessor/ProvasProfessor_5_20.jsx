import { useCallback, useEffect, useState } from "react";
import css from "./ProvasProfessor_38.module.css";

/* Sprint item 20 - Permitir que o instrutor cadastre provas para validar a conclusão do curso - Prepara os campos de uma nova questão da prova */
const questaoVazia = () => ({ enunciado: "", tipo: "objetiva", alternativas: ["", ""], resposta_esperada: "" });
/* Fim item 20 */


export default
function ProvasProfessor({ api, idCurso, setMensagem }) {
    /* Sprint item 20 - Permitir que o instrutor cadastre provas para validar a conclusão do curso - Prepara os dados e o estado da avaliação */
    const [prova, setProva] = useState(null);
    /* Fim item 20 */
    const [titulo, setTitulo] = useState("");
    /* Sprint item 20 - Permitir que o instrutor cadastre provas para validar a conclusão do curso - Prepara os dados e o estado da avaliação */
    const [questoes, setQuestoes] = useState([questaoVazia()]);
    const [respostas, setRespostas] = useState([]);
    /* Fim item 20 */
    const [carregando, setCarregando] = useState(false);
    const [salvando, setSalvando] = useState(false);
    /* Sprint item 20 - Permitir que o instrutor cadastre provas para validar a conclusão do curso - Prepara os dados e o estado da avaliação */
    const [feedbacks, setFeedbacks] = useState({});
    /* Fim item 20 */

    const ler = useCallback(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data?.mensagem?.descricao || data?.mensagem || "Não foi possível concluir a operação.");
        return data;
    }, []);

    /* Sprint item 20 - Permitir que o instrutor cadastre provas para validar a conclusão do curso - Prepara as questões, as respostas e a correção da prova */
    const carregar = useCallback(async () => {
        if (!idCurso) return;
        setCarregando(true);
        try {
            const [exam, submissions] = await Promise.all([
                fetch(`${api}/professor/cursos/${idCurso}/prova`, { credentials: "include" }).then(ler),
                fetch(`${api}/professor/provas/respostas`, { credentials: "include" }).then(ler)
            ]);
            setProva(exam.prova);
            setTitulo(exam.prova?.titulo || "");
            setQuestoes(exam.questoes?.length ? exam.questoes.map((item) => ({
                ...item,
                alternativas: Array.isArray(item.alternativas) && item.alternativas.length ? item.alternativas : [""]
            })) : [questaoVazia()]);
            setRespostas(Array.isArray(submissions) ? submissions.filter((item) => String(item.id_curso) === String(idCurso)) : []);
            setFeedbacks((atual) => ({ ...Object.fromEntries((Array.isArray(submissions) ? submissions : []).map((item) => [item.id, item.feedback || ""])), ...atual }));
        } catch (error) {
            setMensagem?.({ tipo: "erro", descricao: error.message });
        } finally {
            setCarregando(false);
        }
    }, [api, idCurso, ler, setMensagem]);
    /* Fim item 20 */

    useEffect(() => { carregar(); }, [carregar]);

    /* Sprint item 20 - Permitir que o instrutor cadastre provas para validar a conclusão do curso - Atualiza os campos da questão em edição */
    function alterarQuestao(index, campo, valor) {
        setQuestoes((atuais) => atuais.map((item, i) => i === index ? { ...item, [campo]: valor } : item));
    }
    /* Fim item 20 */

    /* Sprint item 20 - Permitir que o instrutor cadastre provas para validar a conclusão do curso - Atualiza uma alternativa da questão objetiva */
    function alterarAlternativa(index, indice, valor) {
        setQuestoes((atuais) => atuais.map((item, i) => i === index ? {
            ...item,
            alternativas: item.alternativas.map((opcao, j) => j === indice ? valor : opcao),
            resposta_esperada: item.resposta_esperada && item.resposta_esperada === item.alternativas[indice] ? valor : item.resposta_esperada
        } : item));
    }
    /* Fim item 20 */

    /* Sprint item 20 - Permitir que o instrutor cadastre provas para validar a conclusão do curso - Valida e grava as questões e os critérios da prova */
    async function salvarProva() {
        const questoesPreparadas = questoes.map((item) => ({
            ...item,
            alternativas: item.tipo === "objetiva" ? item.alternativas.map((opcao) => opcao.trim()).filter(Boolean) : []
        }));
        if (questoesPreparadas.some((item) => item.tipo === "objetiva" && (item.alternativas.length < 2 || !item.alternativas.includes(item.resposta_esperada?.trim())))) {
            setMensagem?.({ tipo: "erro", descricao: "Preencha pelo menos duas alternativas e selecione a correta em cada questão objetiva." });
            return;
        }
        setSalvando(true);
        try {
            const dados = await fetch(`${api}/professor/cursos/${idCurso}/prova`, {
                method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ titulo, questoes: questoesPreparadas })
            }).then(ler);
            setMensagem?.({ tipo: "sucesso", descricao: dados.mensagem?.descricao || "Prova salva como rascunho." });
            await carregar();
        } catch (error) {
            setMensagem?.({ tipo: "erro", descricao: error.message });
        } finally {
            setSalvando(false);
        }
    }
    /* Fim item 20 */

    /* Sprint item 20 - Permitir que o instrutor cadastre provas para validar a conclusão do curso - Publica a prova cadastrada para os alunos do curso */
    async function publicarProva() {
        if (!prova?.id) return;
        try {
            const dados = await fetch(`${api}/professor/provas/${prova.id}/publicar`, { method: "PATCH", credentials: "include" }).then(ler);
            setMensagem?.({ tipo: "sucesso", descricao: dados.mensagem?.descricao || "Prova publicada." });
            await carregar();
        } catch (error) {
            setMensagem?.({ tipo: "erro", descricao: error.message });
        }
    }
    /* Fim item 20 */


    /* Sprint item 20 - Permitir que o instrutor cadastre provas para validar a conclusão do curso - Confirma e solicita a exclusão da prova e suas respostas */
    async function excluirProva() {
        if (!prova?.id || !window.confirm("Excluir a prova e todas as respostas dos alunos?")) return;
        setSalvando(true);
        try {
            await fetch(`${api}/professor/cursos/${idCurso}/prova`, { method: "DELETE", credentials: "include" }).then(ler);
            setMensagem?.({ tipo: "sucesso", descricao: "Prova excluída. Crie uma nova quando quiser." });
            await carregar();
        } catch (error) {
            setMensagem?.({ tipo: "erro", descricao: error.message });
        } finally {
            setSalvando(false);
        }
    }
    /* Fim item 20 */

    /* Sprint item 20 - Permitir que o instrutor cadastre provas para validar a conclusão do curso - Envia a nota e o feedback da questão dissertativa */
    async function corrigirQuestao(item, questao, correta) {
        try {
            const dados = await fetch(`${api}/professor/provas/respostas/${item.id}/questoes/${questao.id}`, {
                method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ correta, feedback: feedbacks[item.id] || "" })
            }).then(ler);
            setMensagem?.({ tipo: "sucesso", descricao: dados.resultado?.status ? `Prova concluída: ${dados.resultado.nota} pontos, ${dados.resultado.acertos} de ${dados.resultado.total_questoes} acertos.` : "Questão corrigida." });
            await carregar();
        } catch (error) {
            setMensagem?.({ tipo: "erro", descricao: error.message });
        }
    }
    /* Fim item 20 */

    return (
        <section className={css.pagina}>
            {/* Sprint item 20 - Permitir que o instrutor cadastre provas para validar a conclusão do curso - Prepara as questões, as respostas e a correção da prova */}
            <header><div><span>AVALIAÇÃO</span><h2>Provas do curso</h2><p>As alternativas são corrigidas automaticamente. Corrija cada dissertativa; a aprovação exige {prova?.nota_minima ?? 70} pontos de 100.</p></div>
            </header>
            {/* Fim item 20 */}
            {!idCurso ? /* Sprint item 20 - Permitir que o instrutor cadastre provas para validar a conclusão do curso - Prepara as questões, as respostas e a correção da prova */ <p className={css.vazio}>Selecione um curso para configurar uma prova.</p> /* Fim item 20 */ : <>
                <section className={css.cartao}>
                    {/* Sprint item 20 - Permitir que o instrutor cadastre provas para validar a conclusão do curso - Prepara as questões, as respostas e a correção da prova */}
                    <h3>{prova?.publicada ? "Editar prova publicada" : "Cadastro da prova"}</h3>
                    {/* Fim item 20 */}
                    {prova?.publicada && <p className={css.avisoEdicao}>Ao salvar alterações, as respostas anteriores desta prova serão removidas para que os alunos respondam à versão atual.</p>}
                    <label>Título da prova<input value={titulo} onChange={(event) => setTitulo(event.target.value)} /></label>
                    {questoes.map((questao, index) => /* Sprint item 20 - Permitir que o instrutor cadastre provas para validar a conclusão do curso - Prepara as questões, as respostas e a correção da prova */ <article className={css.questao} key={questao.id || index}>
                        <div className={css.questaoTopo}><h4>Questão {index + 1}</h4>{questoes.length > 1 && <button type="button" onClick={() => setQuestoes((atual) => atual.filter((_, i) => i !== index))}>Remover</button>}</div>
                        <label>Enunciado<textarea value={questao.enunciado} onChange={(event) => alterarQuestao(index, "enunciado", event.target.value)} /></label>
                        <label>Tipo<select value={questao.tipo} onChange={(event) => alterarQuestao(index, "tipo", event.target.value)}><option value="objetiva">Objetiva</option><option value="dissertativa">Dissertativa</option></select></label>
                        {questao.tipo === "objetiva" && <div className={css.alternativas}>
                            {questao.alternativas.map((alternativa, indiceAlternativa) => <div className={css.alternativa} key={indiceAlternativa}>
                                <label>Alternativa {indiceAlternativa + 1}
                                    <textarea
                                        value={alternativa}
                                        onChange={(event) => alterarAlternativa(index, indiceAlternativa, event.target.value)}
                                        rows={3}
                                    />
                                </label>
                                <label className={css.gabarito}><input type="radio" name={`gabarito-${index}`} checked={questao.resposta_esperada === alternativa && !!alternativa.trim()} onChange={() => alterarQuestao(index, "resposta_esperada", alternativa)} disabled={!alternativa.trim()} /> Resposta correta</label>
                                {questao.alternativas.length > 2 && <div className={css.questaoTopo}>
                                    <button type="button" aria-label={`Remover alternativa ${indiceAlternativa + 1} da questão ${index + 1}`} onClick={() => setQuestoes((atuais) => atuais.map((item, i) => i === index ? { ...item, alternativas: item.alternativas.filter((_, indice) => indice !== indiceAlternativa), resposta_esperada: item.resposta_esperada === alternativa ? "" : item.resposta_esperada } : item))}>Remover alternativa</button>
                                </div>}
                            </div>)}
                            <div className={css.acoes}>
                                <button type="button" onClick={() => alterarQuestao(index, "alternativas", [...questao.alternativas, ""])}>Adicionar Alternativa</button>
                            </div>
                        </div>}
                    </article> /* Fim item 20 */)}
                    {/* Sprint item 20 - Permitir que o instrutor cadastre provas para validar a conclusão do curso - Prepara as questões, as respostas e a correção da prova */}
                    <div className={css.acoes}><button type="button" onClick={() => setQuestoes((atual) => [...atual, questaoVazia()])}>Adicionar questão</button><button type="button" onClick={salvarProva} disabled={salvando}>{salvando ? "Salvando..." : prova?.publicada ? "Salvar alterações" : "Salvar rascunho"}</button>{prova && !prova.publicada && <button type="button" onClick={publicarProva}>Publicar prova</button>}{prova && <button type="button" className={css.botaoExcluir} onClick={excluirProva} disabled={salvando}>Excluir prova</button>}</div>
                    {/* Fim item 20 */}
                    {prova?.publicada && /* Sprint item 5 - Gerar certificado ao concluir o curso - Solicita ou apresenta o certificado de conclusão do curso */ <p className={css.publicada}>A prova está publicada e é exigida para novos certificados.</p> /* Fim item 5 */}
                </section>
                <section className={css.cartao}><h3>Respostas para corrigir</h3>
                    {carregando && <p>Carregando...</p>}
                    {!carregando && respostas.filter((item) => item.status === 0).length === 0 && <p className={css.vazio}>Nenhuma resposta aguardando correção neste curso.</p>}
                    {respostas.filter((item) => item.status === 0).map((item) => {
                        /* Sprint item 20 - Permitir que o instrutor cadastre provas para validar a conclusão do curso - Prepara os dados e o estado da avaliação */
                        let respostasAluno = {};
                        /* Fim item 20 */
                        try { respostasAluno = typeof item.respostas === "string" ? JSON.parse(item.respostas) : item.respostas || {}; } catch { respostasAluno = {}; }
                        return <article className={css.resposta} key={item.id}><h4>{item.aluno} · {item.prova}</h4><p>{item.criado_em ? new Date(item.criado_em).toLocaleString("pt-BR") : ""}</p>
                            {Object.entries(respostasAluno).map(([idQuestao, valor], index) => {
                                /* Sprint item 20 - Permitir que o instrutor cadastre provas para validar a conclusão do curso - Prepara as questões, as respostas e a correção da prova */
                                const questao = item.questoes?.find((pergunta) => String(pergunta.id) === idQuestao);
                                const corrigida = item.correcoes_dissertativas?.[idQuestao];
                                /* Fim item 20 */
                                return <div key={idQuestao}><p><strong>{questao?.enunciado || `Questão ${index + 1}`}:</strong> {String(valor)}</p>
                                    {questao?.tipo === "objetiva" && <p>{String(valor) === questao.resposta_esperada ? "Resposta correta." : `Resposta incorreta. Gabarito: ${questao.resposta_esperada}.`}</p>}
                                    {questao?.tipo === "dissertativa" && <div className={css.acoes}><span>{corrigida === undefined ? "Aguardando sua correção" : corrigida ? "Correta" : "Incorreta"}</span><button type="button" onClick={() => corrigirQuestao(item, questao, true)}>Correta</button><button type="button" onClick={() => corrigirQuestao(item, questao, false)}>Incorreta</button></div>}
                                </div>;
                            })}
                            <p>{item.nota ?? 0} pontos · {item.acertos ?? 0} de {item.total_questoes || item.questoes?.length || 0} acertos até agora</p>
                            <textarea placeholder="Feedback para o aluno (opcional)" value={feedbacks[item.id] || ""} onChange={(event) => setFeedbacks((atual) => ({ ...atual, [item.id]: event.target.value }))} />
                        </article>;
                    })}
                </section>
                {/* Sprint item 20 - Permitir que o instrutor cadastre provas para validar a conclusão do curso - Prepara as questões, as respostas e a correção da prova */}
                <section className={css.cartao}><h3>Resultados corrigidos</h3>
                    {respostas.filter((item) => item.status !== 0).length === 0 && <p className={css.vazio}>Nenhuma prova corrigida neste curso.</p>}
                    {respostas.filter((item) => item.status !== 0).map((item) => <article className={css.resposta} key={item.id}>
                        <h4>{item.aluno} · {item.prova}</h4>
                        <p>{item.status === 1 ? "Aprovado" : "Reprovado"} · {item.nota ?? 0} pontos · {item.acertos ?? 0} de {item.total_questoes || item.questoes?.length || 0} acertos</p>
                    </article>)}
                </section>
                {/* Fim item 20 */}
            </>}
        </section>
    );
}
