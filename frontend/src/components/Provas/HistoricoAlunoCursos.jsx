import { useEffect, useState } from 'react';
import HistoricoProvas from './HistoricoProvas';
import css from './Provas.module.css';

export default function HistoricoAlunoCursos({ api }) {
    const [cursos, setCursos] = useState([]);
    const [selecionado, setSelecionado] = useState('');
    const [erro, setErro] = useState('');
    useEffect(() => {
        const controle = new AbortController();
        fetch(`${api}/aluno/provas/cursos`, { credentials: 'include', signal: controle.signal })
            .then(async (r) => { const d = await r.json(); if (!r.ok) throw new Error(d.mensagem?.descricao || 'Não foi possível carregar os cursos.'); return d; })
            .then((d) => { setCursos(d.cursos); setSelecionado(String(d.cursos[0]?.id || '')); })
            .catch((e) => { if (e.name !== 'AbortError') setErro(e.message); });
        return () => controle.abort();
    }, [api]);
    return <section className={css.pagina}>
        <div className={css.cartao}><h2>Meu histórico de provas</h2><p>Consulte suas tentativas por curso, incluindo provas arquivadas. A consulta permanece disponível com a assinatura vencida.</p>
            {erro && <p role="alert" className={css.erro}>{erro}</p>}
            <label>Curso<select value={selecionado} onChange={(e) => setSelecionado(e.target.value)}>{cursos.map((c) => <option value={c.id} key={c.id}>{c.titulo}</option>)}</select></label>
            {!cursos.length && !erro && <p>Nenhum curso vinculado à sua conta.</p>}
        </div>
        {selecionado && <HistoricoProvas key={selecionado} api={api} idCurso={selecionado} />}
    </section>;
}
