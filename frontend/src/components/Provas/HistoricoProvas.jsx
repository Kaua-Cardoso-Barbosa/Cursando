import { useEffect, useState } from 'react';
import css from './Provas.module.css';

export const resultadoProva = (status) => ['Aguardando correção', 'Aprovado', 'Reprovado'][status] || 'Resultado indisponível';
const data = (valor) => valor ? new Date(valor).toLocaleString('pt-BR') : '—';

export default function HistoricoProvas({ api, idCurso, professor = false, atualizar = 0 }) {
    const perfil = professor ? 'professor' : 'aluno';
    const [filtros, setFiltros] = useState({ busca: '', ordem: 'recentes', estado: 'todas', resultado: 'todos' });
    const [pagina, setPagina] = useState(1);
    const [historico, setHistorico] = useState({ itens: [], total: 0, paginas: 1 });
    const [detalhe, setDetalhe] = useState(null);
    const [feedback, setFeedback] = useState('');
    const [erro, setErro] = useState('');
    const [carregando, setCarregando] = useState(false);
    const [corrigindo, setCorrigindo] = useState(false);
    const [revisao, setRevisao] = useState(0);

    async function ler(response) {
        const dados = await response.json();
        if (!response.ok) throw new Error(dados.mensagem?.descricao || 'Não foi possível carregar o histórico.');
        return dados;
    }

    useEffect(() => {
        const controle = new AbortController();
        setCarregando(true); setErro('');
        const timer = setTimeout(() => {
            const params = new URLSearchParams({ ...filtros, pagina });
            fetch(`${api}/${perfil}/cursos/${idCurso}/provas/historico?${params}`, { credentials: 'include', signal: controle.signal })
                .then(ler).then(setHistorico).catch((error) => { if (error.name !== 'AbortError') setErro(error.message); })
                .finally(() => { if (!controle.signal.aborted) setCarregando(false); });
        }, 200);
        return () => { clearTimeout(timer); controle.abort(); };
    }, [api, idCurso, perfil, filtros, pagina, atualizar, revisao]);

    useEffect(() => { setDetalhe(null); setPagina(1); setHistorico({ itens: [], total: 0, paginas: 1 }); }, [idCurso]);

    async function abrir(id) {
        setErro('');
        try {
            const registro = await fetch(`${api}/${perfil}/provas/tentativas/${id}`, { credentials: 'include' }).then(ler);
            setDetalhe(registro); setFeedback(registro.feedback || '');
        } catch (error) { setErro(error.message); }
    }

    async function corrigir(questao, correta) {
        setCorrigindo(true); setErro('');
        try {
            await fetch(`${api}/professor/provas/respostas/${detalhe.id}/questoes/${questao.id}`, {
                method: 'PATCH', credentials: 'include', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ correta, feedback }),
            }).then(ler);
            await abrir(detalhe.id); setRevisao((n) => n + 1);
        } catch (error) { setErro(error.message); }
        finally { setCorrigindo(false); }
    }

    const filtro = (campo, valor) => { setFiltros((f) => ({ ...f, [campo]: valor })); setPagina(1); };
    return <section className={css.cartao}>
        <h3>{professor ? 'Histórico de respostas do curso' : 'Meu histórico de provas'}</h3>
        <div className={css.filtros}>
            {professor && <label>Nome do aluno<input type="search" value={filtros.busca} onChange={(e) => filtro('busca', e.target.value)} placeholder="Pesquisar aluno" /></label>}
            <label>Ordenar<select value={filtros.ordem} onChange={(e) => filtro('ordem', e.target.value)}><option value="recentes">Mais recentes</option><option value="nota_asc">Menor nota primeiro</option><option value="nota_desc">Maior nota primeiro</option></select></label>
            <label>Situação da prova<select value={filtros.estado} onChange={(e) => filtro('estado', e.target.value)}><option value="todas">Todas</option><option value="vigente">Vigentes</option><option value="arquivada">Arquivadas</option></select></label>
            <label>Resultado<select value={filtros.resultado} onChange={(e) => filtro('resultado', e.target.value)}><option value="todos">Todos</option><option value="1">Aprovados</option><option value="2">Reprovados</option><option value="0">Aguardando correção</option></select></label>
        </div>
        {erro && <p role="alert" className={css.erro}>{erro}</p>}
        {carregando ? <p role="status">Carregando histórico...</p> : <>
            <p>{historico.total} tentativa(s) encontrada(s).</p>
            {historico.itens.map((item) => <article key={item.id} className={`${css.registro} ${css[item.status === 1 ? 'aprovado' : item.status === 2 ? 'reprovado' : 'pendente']}`}>
                <h4>{professor ? `${item.aluno} · ` : ''}{item.prova} · v{item.versao}<span className={css.situacao}>Prova {item.estado_prova}</span></h4>
                <p>Tentativa {item.tentativa} · {resultadoProva(item.status)}{item.status !== 0 && item.nota != null ? ` · ${item.nota}%` : ''} · mínimo {item.nota_minima}%</p>
                <p>Enviada: {data(item.criado_em)} · Corrigida: {data(item.corrigido_em)}</p>
                <div><button type="button" onClick={() => detalhe?.id === item.id ? setDetalhe(null) : abrir(item.id)}>{detalhe?.id === item.id ? 'Fechar detalhes' : 'Ver respostas'}</button></div>
                {detalhe?.id === item.id && <div className={css.detalhes}>
                    {detalhe.questoes.map((q, i) => <div key={q.id} className={css.questao}>
                        <strong>{i + 1}. {q.enunciado}</strong>
                        {q.alternativas?.length > 0 && <p>Alternativas: {q.alternativas.join(' · ')}</p>}
                        <p>Resposta: {detalhe.respostas[String(q.id)]}</p>
                        {professor && q.tipo === 'objetiva' && <p>Gabarito: {q.resposta_esperada}</p>}
                        {q.tipo === 'dissertativa' && <p>{detalhe.correcoes_dissertativas[String(q.id)] === undefined ? 'Aguardando correção' : detalhe.correcoes_dissertativas[String(q.id)] ? 'Resposta correta' : 'Resposta incorreta'}</p>}
                        {professor && detalhe.status === 0 && q.tipo === 'dissertativa' && <div className={css.acoes}><button disabled={corrigindo} onClick={() => corrigir(q, true)}>Correta</button><button disabled={corrigindo} onClick={() => corrigir(q, false)}>Incorreta</button></div>}
                    </div>)}
                    {professor && detalhe.status === 0 ? <label>Feedback<textarea value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder="Feedback enviado com a correção" /></label> : <p>Feedback: {detalhe.feedback || 'Não informado.'}</p>}
                </div>}
            </article>)}
            <div className={css.paginacao}><button disabled={pagina <= 1} onClick={() => setPagina((n) => n - 1)}>Anterior</button><span>Página {pagina} de {historico.paginas}</span><button disabled={pagina >= historico.paginas} onClick={() => setPagina((n) => n + 1)}>Próxima</button></div>
        </>}
    </section>;
}
