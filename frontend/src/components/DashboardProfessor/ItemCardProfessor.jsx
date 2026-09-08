import {
    FaArchive,
    FaEdit,
    FaEye,
    FaLock,
    FaPlay,
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

export default function ItemCardProfessor({
    tipo = "curso",
    item,
    api,
    usuario,
    onAbrir,
    onEditar,
    onExcluir,
    onStatus,
    gerenciavel = false
}) {
    const usuarioTipo = Number(usuario?.tipo ?? 1);
    const podeGerenciar = usuarioTipo === 0 || usuarioTipo === 1;

    const thumbDaAula = tipo === "aula"
        ? item?.thumb || item?.imagem || item?.capa || item?.thumbnail || item?.thumb_url || item?.imagem_thumb || item?.miniatura || ""
        : "";

    const imagem = tipo === "curso"
        ? (item.imagem ? resolverUrlMidia(api, item.imagem) : "/imagens_banner_curso/design.png")
        : (thumbDaAula ? resolverUrlMidia(api, thumbDaAula) : "");

    if (tipo === "curso") {
        return (
            <article className={css.cardCurso}>
                <button className={css.areaCardClicavel} onClick={() => onAbrir?.(item)}>
                    <img src={imagem} alt={item.titulo} className={css.imagemCurso} />
                    <div className={css.infoCurso}>
                        <div>
                            <h3>{item.titulo}</h3>
                            <p>{item.descricao}</p>
                        </div>
                        <span className={css.statusBadge}>{item.status_nome}</span>
                    </div>
                </button>

                {(podeGerenciar && gerenciavel) && (
                    <div className={css.acoesCard}>
                        <button title="Editar curso" onClick={onEditar}><FaEdit /></button>
                        {item.status !== STATUS_PUBLICADO && <button title="Publicar curso" onClick={() => onStatus?.(STATUS_PUBLICADO)}><FaEye /></button>}
                        {item.status !== STATUS_PRIVADO && <button title="Privar curso" onClick={() => onStatus?.(STATUS_PRIVADO)}><FaLock /></button>}
                        {item.status !== STATUS_ARQUIVADO && <button title="Arquivar curso" onClick={() => onStatus?.(STATUS_ARQUIVADO)}><FaArchive /></button>}
                        <button title="Excluir curso" className={css.botaoExcluir} onClick={onExcluir}><FaTrash /></button>
                    </div>
                )}
            </article>
        );
    }

    return (
        <article className={css.cardAula}>
            <div className={css.videoPreview}>
                {imagem ? (
                    <img src={imagem} alt={item.titulo} className={css.imagemAula} />
                ) : (
                    <FaPlay />
                )}
            </div>
            <div className={css.infoAula}>
                <div>
                    <h3>{item.titulo}</h3>
                    <p>{item.descricao}</p>
                    <span className={css.statusBadge}>{item.status_nome}</span>
                </div>
                {(podeGerenciar) && (
                    <div className={css.acoesCard}>
                        <button title="Editar aula" onClick={onEditar}><FaEdit /></button>
                        {item.status !== STATUS_PUBLICADO && <button title="Publicar aula" onClick={() => onStatus?.(STATUS_PUBLICADO)}><FaEye /></button>}
                        {item.status !== STATUS_PRIVADO && <button title="Privar aula" onClick={() => onStatus?.(STATUS_PRIVADO)}><FaLock /></button>}
                        <button title="Excluir aula" className={css.botaoExcluir} onClick={onExcluir}><FaTrash /></button>
                    </div>
                )}
            </div>
        </article>
    );
}
