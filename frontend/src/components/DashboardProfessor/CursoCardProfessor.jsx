import {
    FaArchive,
    FaEdit,
    FaEye,
    FaLock,
    FaTrash
} from "react-icons/fa";
import css from "../../pages/DashboardProfessor/DashboardProfessor.module.css";

const STATUS_PRIVADO = 0;
const STATUS_PUBLICADO = 1;
const STATUS_ARQUIVADO = 2;

function resolverUrlMidia(api, caminho) {
    if (!caminho) {
        return "";
    }

    if (caminho.startsWith("http://") || caminho.startsWith("https://") || caminho.startsWith("/imagens_")) {
        return caminho;
    }

    return `${api}${caminho}`;
}

export default function CursoCardProfessor({ curso, api, onAbrir, onEditar, onExcluir, onStatus, gerenciavel = false }) {
    const imagem = curso.imagem ? resolverUrlMidia(api, curso.imagem) : "/imagens_banner_curso/Placholder.png";

    return (
        <article className={css.cardCurso}>
            <button className={css.areaCardClicavel} onClick={() => onAbrir(curso)}>
                <img src={imagem} alt={curso.titulo} className={css.imagemCurso} />
                <div className={css.infoCurso}>
                    <div>
                        <h3>{curso.titulo}</h3>
                        <p>{curso.descricao}</p>
                    </div>
                    <span className={css.statusBadge}>{curso.status_nome}</span>
                </div>
            </button>

            {gerenciavel && (
                <div className={css.acoesCard}>
                    <button title="Editar curso" onClick={onEditar}><FaEdit /></button>
                    {curso.status !== STATUS_PUBLICADO && <button title="Publicar curso" onClick={() => onStatus(STATUS_PUBLICADO)}><FaEye /></button>}
                    {curso.status !== STATUS_PRIVADO && <button title="Privar curso" onClick={() => onStatus(STATUS_PRIVADO)}><FaLock /></button>}
                    {curso.status !== STATUS_ARQUIVADO && <button title="Arquivar curso" onClick={() => onStatus(STATUS_ARQUIVADO)}><FaArchive /></button>}
                    <button title="Excluir curso" className={css.botaoExcluir} onClick={onExcluir}><FaTrash /></button>
                </div>
            )}
        </article>
    );
}
