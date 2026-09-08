import {
    FaEdit,
    FaEye,
    FaLock,
    FaPlay,
    FaTrash
} from "react-icons/fa";
import css from "../../pages/DashboardProfessor/DashboardProfessor.module.css";

const STATUS_PRIVADO = 0;
const STATUS_PUBLICADO = 1;

function resolverUrlMidia(api, caminho) {
    if (!caminho) {
        return "";
    }

    if (caminho.startsWith("http://") || caminho.startsWith("https://") || caminho.startsWith("/imagens_")) {
        return caminho;
    }

    return `${api}${caminho}`;
}

export default function AulaCardProfessor({ aula, api, onEditar, onExcluir, onStatus }) {
    const imagemThumb = aula.thumb ? resolverUrlMidia(api, aula.thumb) : "";

    return (
        <article className={css.cardAula}>
            <div className={css.videoPreview}>
                {imagemThumb ? (
                    <img src={imagemThumb} alt={aula.titulo} className={css.imagemAula} />
                ) : (
                    <FaPlay />
                )}
            </div>
            <div className={css.infoAula}>
                <div>
                    <h3>{aula.titulo}</h3>
                    <p>{aula.descricao}</p>
                    <span className={css.statusBadge}>{aula.status_nome}</span>
                </div>
                <div className={css.acoesCard}>
                    <button title="Editar aula" onClick={onEditar}><FaEdit /></button>
                    {aula.status !== STATUS_PUBLICADO && <button title="Publicar aula" onClick={() => onStatus(STATUS_PUBLICADO)}><FaEye /></button>}
                    {aula.status !== STATUS_PRIVADO && <button title="Privar aula" onClick={() => onStatus(STATUS_PRIVADO)}><FaLock /></button>}
                    <button title="Excluir aula" className={css.botaoExcluir} onClick={onExcluir}><FaTrash /></button>
                </div>
            </div>
        </article>
    );
}
