import AutoTextarea from '../AutoTextarea/AutoTextarea.jsx';
import { useEffect, useState } from 'react';
import HistoricoProvas, { resultadoProva } from './HistoricoProvas';
import css from './Provas.module.css';

export default function ProvaCursoAluno({ api, idCurso, dados, onAtualizar }) {
    const [respostas, setRespostas] = useState({});
    const [enviando, setEnviando] = useState(false);
    const [erro, setErro] = useState('');
    const [revisao, setRevisao] = useState(0);
    const prova = dados?.prova;
    useEffect(() => { setRespostas({}); setErro(''); }, [prova?.id, idCurso]);
    async function enviar(evento) {
        evento.preventDefault(); setEnviando(true); setErro('');
        try {
            const response = await fetch(`${api}/aluno/cursos/${idCurso}/prova`, {
                method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id_prova: prova.id, respostas }),
            });
            const resultado = await response.json();
            if (!response.ok) throw new Error(resultado.mensagem?.descricao || 'Não foi possível enviar a prova.');
            setRespostas({}); setRevisao((n) => n + 1);
        } catch (error) { setErro(error.message); }
        finally {
            try {
                const response = await fetch(`${api}/aluno/cursos/${idCurso}/prova`, { credentials: 'include' });
                if (response.ok) onAtualizar(await response.json());
            } catch (error) {
                setErro((anterior) => anterior || error.message);
            } finally { setEnviando(false); }
        }
    }
    return <div className={css.pagina}>
        <section className={css.cartao}>
            <h2>{prova?.titulo || 'Prova do curso'}</h2>
            {prova && <p>Versão {prova.versao} · mínimo para aprovação: {prova.nota_minima}% de acertos.</p>}
            {dados?.envio && <p>{resultadoProva(dados.envio.status)}{dados.envio.status !== 0 && dados.envio.nota != null ? ` · ${dados.envio.nota}%` : ''}</p>}
            {dados?.motivo && <p className={css.aviso}>{dados.motivo}</p>}
            {erro && <p role="alert" className={css.erro}>{erro}</p>}
            {dados?.pode_responder && prova && <form className={css.pagina} onSubmit={enviar}>
                {dados.questoes.map((q, i) => <fieldset className={css.questao} key={q.id}>
                    <legend>Questão {i + 1}</legend><p>{q.enunciado}</p>
                    {q.tipo === 'objetiva' ? q.alternativas.map((a, j) => <label className={css.alternativa} key={j}>
                        <input type="radio" required name={`resposta-${q.id}`} value={a} checked={respostas[q.id] === a} onChange={() => setRespostas((r) => ({ ...r, [q.id]: a }))} />{a}
                    </label>) : <AutoTextarea required aria-label={`Resposta da questão ${i + 1}`} value={respostas[q.id] || ''} onChange={(e) => setRespostas((r) => ({ ...r, [q.id]: e.target.value }))} />}
                </fieldset>)}
                <button className={css.primario} disabled={enviando || !dados.questoes.length || dados.questoes.some((q) => !String(respostas[q.id] || '').trim())}>{enviando ? 'Enviando...' : 'Enviar prova'}</button>
            </form>}
        </section>
        <HistoricoProvas api={api} idCurso={idCurso} atualizar={revisao} />
    </div>;
}
