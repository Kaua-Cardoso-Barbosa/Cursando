import { useCallback, useEffect, useState } from "react";
import { FaExternalLinkAlt, FaFileAlt, FaPlus, FaTrash } from "react-icons/fa";
import css from "./MateriaisProfessor.module.css";

const tipos = ["link", "pdf", "livro", "apostila", "codigo", "arquivo", "outro"];

// Sprint item 21: cadastra links e arquivos privados como materiais complementares do curso.
export default function MateriaisProfessor({ api, idCurso, avisar }) {
    const [materiais, setMateriais] = useState([]);
    const [titulo, setTitulo] = useState("");
    const [tipo, setTipo] = useState("link");
    const [url, setUrl] = useState("");
    const [descricao, setDescricao] = useState("");
    const [arquivo, setArquivo] = useState(null);
    const [carregando, setCarregando] = useState(false);
    const [salvando, setSalvando] = useState(false);

    const ler = useCallback(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data?.mensagem?.descricao || data?.mensagem || "Não foi possível concluir a operação.");
        return data;
    }, []);

    const carregar = useCallback(async () => {
        if (!idCurso) return;
        setCarregando(true);
        try {
            const dados = await fetch(`${api}/professor/cursos/${idCurso}/materiais`, { credentials: "include" }).then(ler);
            setMateriais(Array.isArray(dados) ? dados : []);
        } catch (error) {
            avisar?.({ tipo: "erro", descricao: error.message });
        } finally {
            setCarregando(false);
        }
    }, [api, avisar, idCurso, ler]);

    useEffect(() => { carregar(); }, [carregar]);

    async function cadastrar(event) {
        event.preventDefault();
        const formElement = event.currentTarget;
        setSalvando(true);
        try {
            const form = new FormData();
            form.append("titulo", titulo);
            form.append("tipo", tipo);
            form.append("descricao", descricao);
            if (arquivo) form.append("arquivo", arquivo);
            else form.append("url", url);
            const data = await fetch(`${api}/professor/cursos/${idCurso}/materiais`, { method: "POST", credentials: "include", body: form }).then(ler);
            avisar?.({ tipo: "sucesso", descricao: data?.mensagem?.descricao || "Complemento cadastrado." });
            setTitulo(""); setUrl(""); setDescricao(""); setArquivo(null);
            formElement.reset();
            await carregar();
        } catch (error) {
            avisar?.({ tipo: "erro", descricao: error.message });
        } finally {
            setSalvando(false);
        }
    }

    async function excluir(item) {
        try {
            await fetch(`${api}/professor/cursos/${idCurso}/materiais/${item.id}`, { method: "DELETE", credentials: "include" }).then(ler);
            await carregar();
        } catch (error) {
            avisar?.({ tipo: "erro", descricao: error.message });
        }
    }

    return (
        <div className={css.area}>
            <header><div><h2>Complementos do curso</h2><p>Adicione links, livros, apostilas, códigos e arquivos para os alunos matriculados.</p></div></header>
            <form className={css.formulario} onSubmit={cadastrar}>
                <label>Título<input value={titulo} onChange={(event) => setTitulo(event.target.value)} required maxLength={150} /></label>
                <label>Tipo<select value={tipo} onChange={(event) => setTipo(event.target.value)}>{tipos.map((opcao) => <option key={opcao} value={opcao}>{opcao === "codigo" ? "Código" : opcao[0].toUpperCase() + opcao.slice(1)}</option>)}</select></label>
                <label>Descrição<textarea value={descricao} onChange={(event) => setDescricao(event.target.value)} maxLength={3000} /></label>
                <label>Link externo (HTTP/HTTPS)<input type="url" value={url} onChange={(event) => setUrl(event.target.value)} disabled={Boolean(arquivo)} required={!arquivo} placeholder="https://..." /></label>
                <label>Ou envie um arquivo<input type="file" accept=".pdf,.epub,.mobi,.doc,.docx,.odt,.txt,.rtf,.zip,.rar,.7z,.py,.js,.java,.html,.css,.csv,.xlsx,.pptx" onChange={(event) => setArquivo(event.target.files?.[0] || null)} /></label>
                {arquivo && <p className={css.selecionado}>Arquivo selecionado: {arquivo.name}</p>}
                <button type="submit" disabled={salvando}><FaPlus /> {salvando ? "Salvando..." : "Adicionar complemento"}</button>
            </form>
            <div className={css.lista}>
                {carregando && <p>Carregando complementos...</p>}
                {!carregando && materiais.length === 0 && <p>Nenhum complemento cadastrado.</p>}
                {materiais.map((item) => <article key={item.id} className={css.item}>
                    <div className={css.icone}><FaFileAlt /></div><div className={css.detalhe}><strong>{item.titulo}</strong><span>{item.tipo}{item.nome_arquivo ? ` · ${item.nome_arquivo}` : ""}</span>{item.descricao && <p>{item.descricao}</p>}{item.url && !item.arquivo && <a href={item.url} target="_blank" rel="noreferrer">Abrir link <FaExternalLinkAlt /></a>}</div>
                    <button type="button" className={css.excluir} onClick={() => excluir(item)} aria-label={`Remover ${item.titulo}`}><FaTrash /></button>
                </article>)}
            </div>
        </div>
    );
}
