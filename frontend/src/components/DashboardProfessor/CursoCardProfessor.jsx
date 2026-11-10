import {
    FaArchive,
    FaEdit,
    FaEye,
    FaLock,
    FaTrash
} from "react-icons/fa";
import CursoCard from "../CursoCard/CursoCard.jsx";

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

    return <CursoCard imagem={imagem} titulo={curso.titulo} descricao={curso.descricao}
        categoria={curso.categoria} avaliacao={curso.avaliacao_media} totalAulas={curso.aulas_publicadas}
        status={curso.status_nome} onAbrir={() => onAbrir(curso)}
        acoes={gerenciavel && <div>
            <button type="button" title="Editar curso" onClick={onEditar}><FaEdit /></button>
            {curso.status !== STATUS_PUBLICADO && <button type="button" title="Publicar curso" onClick={() => onStatus(STATUS_PUBLICADO)}><FaEye /></button>}
            {curso.status !== STATUS_PRIVADO && <button type="button" title="Privar curso" onClick={() => onStatus(STATUS_PRIVADO)}><FaLock /></button>}
            {curso.status !== STATUS_ARQUIVADO && <button type="button" title="Arquivar curso" onClick={() => onStatus(STATUS_ARQUIVADO)}><FaArchive /></button>}
            <button type="button" title="Excluir curso" onClick={onExcluir}><FaTrash /></button>
        </div>} />;
}
