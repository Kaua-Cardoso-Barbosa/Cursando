import { useEffect, useState } from 'react';
import AvaliacoesCurso from '../AvaliacoesCurso/AvaliacoesCurso.jsx';
import css from '../../pages/DashboardProfessor/DashboardProfessor_38.module.css';

export default function AvaliacoesProfessor({ api, idCurso }) {
    const [pagina, setPagina] = useState(1);
    const [tentativa, setTentativa] = useState(0);
    const [estado, setEstado] = useState({ carregando: true });
    useEffect(() => {
        const controller = new AbortController();
        setEstado({ carregando: true });
        async function carregar() {
            try {
                const resposta = await fetch(`${api}/professor/cursos/${idCurso}/avaliacoes?pagina=${pagina}`, { credentials: 'include', signal: controller.signal });
                const dados = await resposta.json();
                if (!resposta.ok) throw new Error(dados.mensagem?.descricao || 'Não foi possível carregar as avaliações.');
                if (!controller.signal.aborted) setEstado({ dados });
            } catch (erro) {
                if (!controller.signal.aborted) setEstado({ erro: erro.message });
            }
        }
        carregar();
        return () => controller.abort();
    }, [api, idCurso, pagina, tentativa]);
    if (estado.carregando) return <p className={css.textoApoio} role="status">Carregando avaliações...</p>;
    if (estado.erro) return <div className={css.estadoVazio} role="status"><p>{estado.erro}</p><button type="button" className={css.botaoSecundario} onClick={() => setTentativa((n) => n + 1)}>Tentar novamente</button></div>;
    return <AvaliacoesCurso api={api} avaliacoes={estado.dados.itens} {...estado.dados} onPagina={setPagina} />;
}
