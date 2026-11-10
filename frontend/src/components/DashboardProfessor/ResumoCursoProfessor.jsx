import { useEffect, useState } from 'react';
import { FaStar } from 'react-icons/fa';
import { corAvaliacao } from '../../utils/avaliacao.js';
import css from '../../pages/DashboardProfessor/DashboardProfessor_38.module.css';

export default function ResumoCursoProfessor({ api, curso, onAlunos, onEditar }) {
    const [estado, setEstado] = useState({ carregando: true });
    const [tentativa, setTentativa] = useState(0);
    useEffect(() => {
        const controller = new AbortController();
        setEstado({ carregando: true });
        async function carregar() {
            try {
                const resposta = await fetch(`${api}/professor/cursos/${curso.id}`, { credentials: 'include', signal: controller.signal });
                const dados = await resposta.json();
                if (!resposta.ok) throw new Error(dados.mensagem?.descricao || 'Não foi possível carregar o resumo do curso.');
                if (!controller.signal.aborted) setEstado({ dados });
            } catch (erro) {
                if (!controller.signal.aborted) setEstado({ erro: erro.message });
            }
        }
        carregar();
        return () => controller.abort();
    }, [api, curso, tentativa]);
    if (estado.carregando) return <p className={css.textoApoio} role="status">Carregando resumo do curso...</p>;
    if (estado.erro) return <div className={css.resumoInformacoesCurso} role="status"><p>{estado.erro}</p><button type="button" className={css.botaoSecundario} onClick={() => setTentativa((n) => n + 1)}>Tentar novamente</button></div>;
    const info = estado.dados;
    return <div className={css.resumoInformacoesCurso}>
        <dl className={css.informacoesCurso}>
            <div><dt>Professores</dt><dd>{info.professores.join(', ') || 'Não informado'}</dd></div>
            <div><dt>Categoria</dt><dd>{info.categoria || 'Não definida'}</dd></div>
            <div><dt>Tema</dt><dd>{info.tema || 'Não definido'}</dd></div>
            <div><dt>Situação</dt><dd>{info.status_nome}</dd></div>
            <div><dt>Módulos publicados</dt><dd>{info.modulos_publicados} de {info.total_modulos}</dd></div>
            <div><dt>Aulas publicadas</dt><dd>{info.aulas_publicadas} de {info.total_aulas}</dd></div>
            <div><dt>Inscritos ativos</dt><dd>{info.total_inscritos}</dd></div>
            <div><dt>Avaliação média</dt><dd><FaStar style={{ color: corAvaliacao(info.avaliacao_media) }} aria-hidden="true" /> {info.avaliacao_media.toLocaleString('pt-BR')}/5 · {info.total_avaliacoes} {info.total_avaliacoes === 1 ? 'avaliação' : 'avaliações'}</dd></div>
        </dl>
        <div className={css.acoesResumoCurso}>
            <button type="button" className={css.botaoSecundario} onClick={onAlunos}>Ver alunos</button>
            <button type="button" className={css.botaoSecundario} onClick={onEditar}>Editar curso</button>
        </div>
    </div>;
}
