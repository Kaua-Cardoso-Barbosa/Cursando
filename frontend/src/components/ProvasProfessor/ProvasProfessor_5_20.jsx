import AutoTextarea from '../AutoTextarea/AutoTextarea.jsx';
import { useEffect, useState } from 'react';
import HistoricoProvas from '../Provas/HistoricoProvas';
import ConfirmAlert from '../ConfirmAlert/ConfirmAlert';
import css from '../Provas/Provas.module.css';

const vazia = () => ({ enunciado: '', tipo: 'objetiva', alternativas: ['', ''], resposta_esperada: '' });
export default function ProvasProfessor({ api, idCurso, setMensagem }) {
    const [provas, setProvas] = useState([]);
    const [prova, setProva] = useState(null);
    const [titulo, setTitulo] = useState('');
    const [minimo, setMinimo] = useState(70);
    const [questoes, setQuestoes] = useState([vazia()]);
    const [ocupado, setOcupado] = useState(false);
    const [revisao, setRevisao] = useState(0);
    const [salvo, setSalvo] = useState('');
    const [confirmacao, setConfirmacao] = useState(null);
    const editavel = !prova || prova.estado === 'rascunho';
    const alterado = JSON.stringify({ titulo, nota_minima: Number(minimo), questoes }) !== salvo;

    async function requisicao(caminho, metodo = 'GET', dados) {
        const response = await fetch(`${api}${caminho}`, { method: metodo, credentials: 'include',
            headers: { 'Content-Type': 'application/json' }, body: dados ? JSON.stringify(dados) : undefined });
        const result = await response.json();
        if (!response.ok) throw new Error(result.mensagem?.descricao || 'Não foi possível concluir a operação.');
        return result;
    }
    const erro = (error) => setMensagem?.({ tipo: 'erro', descricao: error.message });
    function novo() { setProva(null); setTitulo(''); setMinimo(70); setQuestoes([vazia()]); }
    async function abrir(id) {
        if (!id) { novo(); return; }
        const dados = await requisicao(`/professor/provas/${id}`);
        setProva(dados.prova); setTitulo(dados.prova.titulo); setMinimo(dados.prova.nota_minima); setQuestoes(dados.questoes);
        setSalvo(JSON.stringify({ titulo: dados.prova.titulo, nota_minima: dados.prova.nota_minima, questoes: dados.questoes }));
    }
    async function carregar(preferido) {
        const dados = await requisicao(`/professor/cursos/${idCurso}/provas`);
        setProvas(dados.provas);
        await abrir(preferido === undefined ? (dados.provas.find((p) => p.estado === 'rascunho') || dados.provas.find((p) => p.estado === 'vigente') || dados.provas[0])?.id : preferido);
    }
    useEffect(() => { carregar().catch(erro); }, [api, idCurso]);

    async function acao(executar) {
        setOcupado(true);
        try { await executar(); setRevisao((n) => n + 1); }
        catch (error) { erro(error); }
        finally { setOcupado(false); }
    }
    function alterar(i, campo, valor) { setQuestoes((qs) => qs.map((q, j) => i === j ? { ...q, [campo]: valor } : q)); }
    function salvar() {
        return acao(async () => {
            const dados = await requisicao(prova ? `/professor/provas/${prova.id}` : `/professor/cursos/${idCurso}/provas`, prova ? 'PUT' : 'POST', { titulo, nota_minima: Number(minimo), questoes });
            await carregar(prova?.id || dados.id_prova);
            setMensagem?.({ tipo: 'sucesso', descricao: 'Rascunho salvo.' });
        });
    }
    function mudarEstado(tipo) {
        setConfirmacao({ tipo, id: prova.id });
    }
    async function confirmarAcao() {
        if (!confirmacao || ocupado) return;
        const { tipo, id } = confirmacao;
        await acao(async () => {
            if (tipo === 'excluir') {
                await requisicao(`/professor/provas/${id}`, 'DELETE');
                await carregar(null);
            } else {
                await requisicao(`/professor/provas/${id}/${tipo}`, 'PATCH');
                await carregar(id);
            }
        });
        setConfirmacao(null);
    }

    return <section className={css.pagina}>
        <section className={css.cartao}>
            <h2>Provas do curso</h2><p>Provas publicadas são permanentes. Crie outra versão para alterar conteúdo ou percentual de aprovação.</p>
            <div className={css.acoes}><button disabled={ocupado} onClick={novo}>Novo rascunho</button></div>
            <label>Prova<select value={prova?.id || ''} disabled={ocupado} onChange={(e) => acao(() => abrir(e.target.value))}>
                <option value="">Novo rascunho</option>{provas.map((p) => <option value={p.id} key={p.id}>{p.titulo} · v{p.versao} · {p.estado} · mínimo {p.nota_minima}%</option>)}
            </select></label>
            {prova && <p>Versão {prova.versao} · {prova.estado}</p>}
            <label>Título<input value={titulo} maxLength={150} disabled={!editavel || ocupado} onChange={(e) => setTitulo(e.target.value)} /></label>
            <label>Percentual mínimo para aprovação (%)<input type="number" min="50" max="100" step="1" value={minimo} disabled={!editavel || ocupado} onChange={(e) => setMinimo(e.target.value)} /></label>
            <p>Escolha um percentual inteiro entre 50% e 100%. Ele será preservado nas tentativas desta versão.</p>
            {questoes.map((q, i) => <article className={css.questao} key={i}>
                <h3>Questão {i + 1}</h3>
                <label>Enunciado<AutoTextarea value={q.enunciado} disabled={!editavel || ocupado} onChange={(e) => alterar(i, 'enunciado', e.target.value)} /></label>
                <label>Tipo<select disabled={!editavel || ocupado} value={q.tipo} onChange={(e) => alterar(i, 'tipo', e.target.value)}><option value="objetiva">Objetiva</option><option value="dissertativa">Dissertativa</option></select></label>
                {q.tipo === 'objetiva' && <>
                    <p>Marque a alternativa correta.</p>
                    {q.alternativas.map((a, j) => <label className={css.alternativa} key={j}>
                        <input type="radio" aria-label={`Alternativa correta ${j + 1}`} name={`gabarito-${i}`} checked={!!a && q.resposta_esperada === a} disabled={!editavel || ocupado} onChange={() => alterar(i, 'resposta_esperada', a)} />
                        <input aria-label={`Alternativa ${j + 1}`} value={a} disabled={!editavel || ocupado} onChange={(e) => {
                            const alternativas = q.alternativas.map((op, k) => k === j ? e.target.value : op);
                            setQuestoes((qs) => qs.map((op, k) => k === i ? { ...op, alternativas, resposta_esperada: q.resposta_esperada === a ? e.target.value : q.resposta_esperada } : op));
                        }} />
                        {editavel && q.alternativas.length > 2 && <button onClick={() => alterar(i, 'alternativas', q.alternativas.filter((_, k) => j !== k))}>Remover</button>}
                    </label>)}
                    {editavel && <button disabled={ocupado} onClick={() => alterar(i, 'alternativas', [...q.alternativas, ''])}>Adicionar alternativa</button>}
                </>}
                {editavel && questoes.length > 1 && <button disabled={ocupado} className={css.perigo} onClick={() => setQuestoes((qs) => qs.filter((_, j) => i !== j))}>Remover questão</button>}
            </article>)}
            <div className={css.acoes}>
                {editavel ? <><button disabled={ocupado} onClick={() => setQuestoes((qs) => [...qs, vazia()])}>Adicionar questão</button><button className={css.primario} disabled={ocupado || minimo === '' || Number(minimo) < 50 || Number(minimo) > 100 || !Number.isInteger(Number(minimo))} onClick={salvar}>Salvar rascunho</button></> : <button disabled={ocupado} onClick={() => { setProva(null); setQuestoes((qs) => qs.map((q) => ({ ...q, id: undefined }))); }}>Criar versão a partir desta</button>}
                {prova?.estado === 'rascunho' && <><button disabled={ocupado || alterado} onClick={() => mudarEstado('publicar')}>{alterado ? 'Salve as alterações antes de publicar' : 'Publicar versão salva'}</button><button disabled={ocupado} className={css.perigo} onClick={() => setConfirmacao({ tipo: 'excluir', id: prova.id })}>Excluir rascunho</button></>}
                {prova?.estado === 'vigente' && <button disabled={ocupado} onClick={() => mudarEstado('arquivar')}>Arquivar prova</button>}
            </div>
        </section>
        <HistoricoProvas api={api} idCurso={idCurso} professor atualizar={revisao} />
        <ConfirmAlert
            aberto={Boolean(confirmacao)}
            titulo={confirmacao?.tipo === 'publicar' ? 'Publicar esta prova?' : confirmacao?.tipo === 'arquivar' ? 'Arquivar esta prova?' : 'Excluir este rascunho?'}
            descricao={confirmacao?.tipo === 'publicar' ? 'A prova vigente será arquivada e seu histórico será preservado.' : confirmacao?.tipo === 'arquivar' ? 'Esta prova deixará de aceitar respostas; o histórico será preservado.' : 'O rascunho e suas questões serão excluídos.'}
            textoConfirmar={confirmacao?.tipo === 'publicar' ? 'Publicar' : confirmacao?.tipo === 'arquivar' ? 'Arquivar' : 'Excluir rascunho'}
            variante={confirmacao?.tipo === 'publicar' ? 'primario' : 'perigo'}
            carregando={ocupado}
            aoCancelar={() => { if (!ocupado) setConfirmacao(null); }}
            aoConfirmar={confirmarAcao}
        />
    </section>;
}
