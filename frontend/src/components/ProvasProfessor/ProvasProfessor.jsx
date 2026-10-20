import { useCallback, useEffect, useState } from "react";
import css from "./ProvasProfessor.module.css";

const questaoVazia = () => ({ enunciado: "", tipo: "objetiva", alternativas: [""] });

// Sprint item 20: permite ao instrutor montar e publicar a prova do curso e corrigir respostas enviadas.
export default function ProvasProfessor({ api, idCurso, setMensagem }) {
    const [prova, setProva] = useState(null);
    const [titulo, setTitulo] = useState("");
    const [questoes, setQuestoes] = useState([questaoVazia()]);
    const [respostas, setRespostas] = useState([]);
    const [carregando, setCarregando] = useState(false);
    const [salvando, setSalvando] = useState(false);
    const [feedbacks, setFeedbacks] = useState({});

    const ler = useCallback(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data?.mensagem?.descricao || data?.mensagem || "Não foi possível concluir a operação.");
        return data;
    }, []);

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
        } catch (error) {
            setMensagem?.({ tipo: "erro", descricao: error.message });
        } finally {
            setCarregando(false);
        }
    }, [api, idCurso, ler, setMensagem]);

    useEffect(() => { carregar(); }, [carregar]);

    function alterarQuestao(index, campo, valor) {
        setQuestoes((atuais) => atuais.map((item, i) => i === index ? { ...item, [campo]: valor } : item));
    }

    async function salvarProva() {
        const questoesPreparadas = questoes.map((item) => ({
            ...item,
            alternativas: item.tipo === "objetiva" ? item.alternativas.map((opcao) => opcao.trim()).filter(Boolean) : []
        }));
        if (questoesPreparadas.some((item) => item.tipo === "objetiva" && item.alternativas.length < 2)) {
            setMensagem?.({ tipo: "erro", descricao: "Cada questão objetiva precisa ter ao menos duas alternativas preenchidas." });
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

    async function corrigir(item, aprovado) {
        try {
            const dados = await fetch(`${api}/professor/provas/respostas/${item.id}`, {
                method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ aprovado, feedback: feedbacks[item.id] || "" })
            }).then(ler);
            setMensagem?.({ tipo: "sucesso", descricao: dados.mensagem?.descricao || "Correção registrada." });
            await carregar();
        } catch (error) {
            setMensagem?.({ tipo: "erro", descricao: error.message });
        }
    }

    return (
        <section className={css.pagina}>
            <header><div><span>AVALIAÇÃO</span><h2>Provas do curso</h2><p>Publique uma prova antes de tornar o curso público e corrija as respostas dos alunos.</p></div>
            </header>
            {!idCurso ? <p className={css.vazio}>Selecione um curso para configurar uma prova.</p> : <>
                <section className={css.cartao}>
                    <h3>{prova?.publicada ? "Prova publicada" : "Cadastro da prova"}</h3>
                    <label>Título da prova<input value={titulo} onChange={(event) => setTitulo(event.target.value)} disabled={prova?.publicada} /></label>
                    {questoes.map((questao, index) => <article className={css.questao} key={questao.id || index}>
                        <div className={css.questaoTopo}><h4>Questão {index + 1}</h4>{!prova?.publicada && questoes.length > 1 && <button type="button" onClick={() => setQuestoes((atual) => atual.filter((_, i) => i !== index))}>Remover</button>}</div>
                        <label>Enunciado<textarea value={questao.enunciado} onChange={(event) => alterarQuestao(index, "enunciado", event.target.value)} disabled={prova?.publicada} /></label>
                        <label>Tipo<select value={questao.tipo} onChange={(event) => alterarQuestao(index, "tipo", event.target.value)} disabled={prova?.publicada}><option value="objetiva">Objetiva</option><option value="dissertativa">Dissertativa</option></select></label>
                        {questao.tipo === "objetiva" && <div className={css.alternativas}>
                            {questao.alternativas.map((alternativa, indiceAlternativa) => <div className={css.alternativa} key={indiceAlternativa}>
                                <label>Alternativa {indiceAlternativa + 1}
                                    <textarea
                                        value={alternativa}
                                        onChange={(event) => alterarQuestao(index, "alternativas", questao.alternativas.map((opcao, indice) => indice === indiceAlternativa ? event.target.value : opcao))}
                                        disabled={prova?.publicada}
                                        rows={3}
                                    />
                                </label>
                                {!prova?.publicada && questao.alternativas.length > 1 && <div className={css.questaoTopo}>
                                    <button type="button" aria-label={`Remover alternativa ${indiceAlternativa + 1} da questão ${index + 1}`} onClick={() => alterarQuestao(index, "alternativas", questao.alternativas.filter((_, indice) => indice !== indiceAlternativa))}>Remover alternativa</button>
                                </div>}
                            </div>)}
                            {!prova?.publicada && <div className={css.acoes}>
                                <button type="button" onClick={() => alterarQuestao(index, "alternativas", [...questao.alternativas, ""])}>Adicionar Alternativa</button>
                            </div>}
                        </div>}
                    </article>)}
                    {!prova?.publicada && <div className={css.acoes}><button type="button" onClick={() => setQuestoes((atual) => [...atual, questaoVazia()])}>Adicionar questão</button><button type="button" onClick={salvarProva} disabled={salvando}>{salvando ? "Salvando..." : "Salvar rascunho"}</button>{prova && <button type="button" onClick={publicarProva}>Publicar prova</button>}</div>}
                    {prova?.publicada && <p className={css.publicada}>A prova está publicada e já é exigida para novos certificados.</p>}
                </section>
                <section className={css.cartao}><h3>Respostas para corrigir</h3>
                    {carregando && <p>Carregando...</p>}
                    {!carregando && respostas.filter((item) => item.status === 0).length === 0 && <p className={css.vazio}>Nenhuma resposta aguardando correção neste curso.</p>}
                    {respostas.filter((item) => item.status === 0).map((item) => {
                        let respostasAluno = {};
                        try { respostasAluno = typeof item.respostas === "string" ? JSON.parse(item.respostas) : item.respostas || {}; } catch { respostasAluno = {}; }
                        return <article className={css.resposta} key={item.id}><h4>{item.aluno} · {item.prova}</h4><p>{item.criado_em ? new Date(item.criado_em).toLocaleString("pt-BR") : ""}</p>
                            {Object.entries(respostasAluno).map(([idQuestao, valor], index) => {
                                const questao = item.questoes?.find((pergunta) => String(pergunta.id) === idQuestao);
                                return <p key={idQuestao}><strong>{questao?.enunciado || `Questão ${index + 1}`}:</strong> {String(valor)}</p>;
                            })}
                            <textarea placeholder="Feedback para o aluno (opcional)" value={feedbacks[item.id] || ""} onChange={(event) => setFeedbacks((atual) => ({ ...atual, [item.id]: event.target.value }))} />
                            <div className={css.acoes}><button type="button" onClick={() => corrigir(item, true)}>Aprovar</button><button type="button" onClick={() => corrigir(item, false)}>Reprovar</button></div>
                        </article>;
                    })}
                </section>
            </>}
        </section>
    );
}
