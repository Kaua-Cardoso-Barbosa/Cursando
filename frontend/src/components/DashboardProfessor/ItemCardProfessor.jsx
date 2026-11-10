import {
    FaArchive,
    FaEdit,
    FaEye,
    FaLock,
    FaTrash,
    FaUsers
} from "react-icons/fa";
import css from "../../pages/DashboardProfessor/DashboardProfessor_38.module.css";
import CursoCardBase from "../CursoCard/CursoCard.jsx";

const STATUS_PRIVADO = 0;
const STATUS_PUBLICADO = 1;
const STATUS_ARQUIVADO = 2;
const PLACEHOLDER_CURSO = "/imagens_banner_curso/Placholder.png";
const PLACEHOLDER_AULA = "/imagens_thumb_video/Placeholder.png";

function resolverUrlMidia(api, caminho) {
    if (!caminho) {
        return "";
    }

    if (caminho.startsWith("http://") || caminho.startsWith("https://") || caminho.startsWith("/imagens_")) {
        return caminho;
    }

    return `${api}${caminho}`;
}

export default
function ItemCardProfessor({
    tipo = "curso",
    item,
    api,
    usuario,
    onAbrir,
    onEditar,
    onExcluir,
    onAlunos,
    onStatus,
    gerenciavel = false
}) {
    const usuarioTipo = Number(usuario?.tipo ?? 1);
    const podeGerenciar = usuarioTipo === 0 || usuarioTipo === 1;

    const thumbDaAula = tipo === "aula"
        ? item?.thumb || item?.imagem || item?.capa || item?.thumbnail || item?.thumb_url || item?.imagem_thumb || item?.miniatura || ""
        : "";

    const imagem = tipo === "curso"
        ? (item.imagem ? resolverUrlMidia(api, item.imagem) : PLACEHOLDER_CURSO)
        : (thumbDaAula ? resolverUrlMidia(api, thumbDaAula) : PLACEHOLDER_AULA);

    if (tipo === "curso") {
        return <CursoCardBase imagem={imagem} titulo={item.titulo} descricao={item.descricao}
            categoria={item.categoria} avaliacao={item.avaliacao_media} totalAulas={item.aulas_publicadas}
            onAbrir={() => onAbrir?.(item)} status={item.status_nome}
            metadados={<span><FaUsers aria-hidden="true" /> {item.total_inscritos || 0} {Number(item.total_inscritos) === 1 ? 'inscrito' : 'inscritos'}</span>}
            acoes={podeGerenciar && gerenciavel && <div>
                <button type="button" title="Editar curso" onClick={onEditar}><FaEdit /></button>
                {item.status !== STATUS_PUBLICADO && <button type="button" title="Publicar curso" onClick={() => onStatus?.(STATUS_PUBLICADO)}><FaEye /></button>}
                {item.status !== STATUS_PRIVADO && <button type="button" title="Privar curso" onClick={() => onStatus?.(STATUS_PRIVADO)}><FaLock /></button>}
                {item.status !== STATUS_ARQUIVADO && <button type="button" title="Arquivar curso" onClick={() => onStatus?.(STATUS_ARQUIVADO)}><FaArchive /></button>}
                <button type="button" title="Ver alunos do curso" onClick={onAlunos}><FaUsers /></button>
                <button type="button" title="Excluir curso" onClick={onExcluir}><FaTrash /></button>
            </div>} />;
    }

    return (
        <article className={css.cardAula}>
            <div className={css.videoPreview}>
                <img src={imagem} alt={item.titulo} className={css.imagemAula} />
            </div>
            <div className={css.infoAula}>
                <div>
                    <h3>{item.titulo}</h3>
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
