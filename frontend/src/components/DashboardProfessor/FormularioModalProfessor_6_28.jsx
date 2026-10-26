import { useEffect, useState } from "react";
import { FaUpload } from "react-icons/fa";
import Input from "../Input/Input.jsx";
import Button from "../Button/Button.jsx";
import css from "../../pages/DashboardProfessor/DashboardProfessor_38.module.css";

const cursoVazio = {
    titulo: "",
    descricao: "",
    arquivo: null,
    thumb: null,
    id_categoria: "",
    id_tema: "",
    nova_categoria: "",
    novo_tema: ""
};

const aulaVazia = {
    titulo: "",
    descricao: "",
    arquivo: null,
    thumb: null
};

const moduloVazio = {
    titulo: "",
    descricao: "",
    arquivo: null,
    thumb: null
};

export default /* Sprint item 6 - Permitir que o instrutor divida o curso em módulos */
/* Sprint item 28 - Permitir filtro de cursos por tema, categoria e avaliação */
function FormularioModalProfessor({ api, tipo, item, salvando, onFechar, onSalvar }) {
    const editando = Boolean(item);
    const [form, setForm] = useState({
        ...(tipo === "curso" ? cursoVazio : tipo === "modulo" ? moduloVazio : aulaVazia),
        titulo: item?.titulo || "",
        descricao: item?.descricao || "",
        thumb: item?.thumb || null
    });
    const [categorias, setCategorias] = useState([]);
    const [temas, setTemas] = useState([]);

    useEffect(() => {
        if (tipo !== "curso") return undefined;
        let ativo = true;

        async function carregarTaxonomias() {
            try {
                const respostas = await Promise.all([
                    fetch(`${api}/taxonomias/categorias`, { credentials: "include" }),
                    fetch(`${api}/taxonomias/temas`, { credentials: "include" })
                ]);
                const [listaCategorias, listaTemas] = await Promise.all(respostas.map((resposta) => resposta.json()));
                if (!respostas.every((resposta) => resposta.ok)) throw new Error("Não foi possível carregar categorias e temas.");
                if (ativo) {
                    setCategorias(Array.isArray(listaCategorias) ? listaCategorias : []);
                    setTemas(Array.isArray(listaTemas) ? listaTemas : []);
                }

                if (item?.id) {
                    const resposta = await fetch(`${api}/professor/cursos/${item.id}/taxonomia`, { credentials: "include" });
                    const dados = await resposta.json();
                    if (!resposta.ok) throw new Error("Não foi possível carregar a categoria e o tema do curso.");
                    if (ativo) setForm((atual) => ({ ...atual, id_categoria: dados.id_categoria ? String(dados.id_categoria) : "", id_tema: dados.id_tema ? String(dados.id_tema) : "" }));
                }
            } catch (erro) {
                console.error("Erro ao carregar taxonomias do curso:", erro);
            }
        }

        carregarTaxonomias();
        return () => { ativo = false; };
    }, [api, item?.id, tipo]);

    function enviar(evento) {
        evento.preventDefault();
        onSalvar(form);
    }

                                                                                                                        
    const titulo = `${editando ? "Editar" : "Adicionar"} ${tipo === "curso" ? "Curso" : tipo === "modulo" ? "Módulo" : "Aula"}`;
    const arquivoLabel = tipo === "aula" ? "Enviar vídeo" : tipo === "modulo" ? "Enviar imagem do módulo" : "Enviar imagem";
    const thumbLabel = "Enviar thumb";
    const accept = tipo === "aula" ? "video/mp4,video/webm,video/ogg,video/quicktime" : "image/png,image/jpeg,image/webp";
    const thumbAccept = "image/png,image/jpeg,image/webp";

    return (
        <main className={css.overlayModal}>
            <section className={css.formularioModal}>
                <h1>{titulo}</h1>

                <form className={css.modalFormulario} onSubmit={enviar}>
                    <Input
                        tipoInp="text"
                        label="Título:"
                        htmlFor="titulo"
                        placeholder="Digite o título"
                        value={form.titulo}
                        funcao={(e) => setForm({ ...form, titulo: e.target.value })}
                        required
                        obrigatorio="Sim"
                    />

                    <Input
                        tipoInp="textarea"
                        label="Descrição:"
                        htmlFor="descricao"
                        placeholder="Digite a descrição"
                        value={form.descricao}
                        funcao={(e) => setForm({ ...form, descricao: e.target.value })}
                        required
                        obrigatorio="Sim"
                    />

                    {tipo === "curso" && (
                        <div className={css.taxonomiasCurso}>
                                                                                                                                                                                                
                            <label>
                                Categoria
                                <select value={form.id_categoria} onChange={(e) => setForm({ ...form, id_categoria: e.target.value, nova_categoria: "" })}>
                                    <option value="">Selecione uma categoria</option>
                                    {categorias.map((categoria) => <option key={categoria.id} value={String(categoria.id)}>{categoria.nome}</option>)}
                                    <option value="__nova__">Criar nova categoria...</option>
                                </select>
                            </label>
                            {form.id_categoria === "__nova__" && <Input tipoInp="text" label="Nova categoria:" htmlFor="nova-categoria-curso" placeholder="Digite o nome da categoria" value={form.nova_categoria} funcao={(e) => setForm({ ...form, nova_categoria: e.target.value })} />}

                            <label>
                                Tema
                                <select value={form.id_tema} onChange={(e) => setForm({ ...form, id_tema: e.target.value, novo_tema: "" })}>
                                    <option value="">Selecione um tema</option>
                                    {temas.map((tema) => <option key={tema.id} value={String(tema.id)}>{tema.nome}</option>)}
                                    <option value="__novo__">Criar novo tema...</option>
                                </select>
                            </label>
                            {form.id_tema === "__novo__" && <Input tipoInp="text" label="Novo tema:" htmlFor="novo-tema-curso" placeholder="Digite o nome do tema" value={form.novo_tema} funcao={(e) => setForm({ ...form, novo_tema: e.target.value })} />}
                        </div>
                    )}

                    {tipo === "aula" && (
                        <label className={css.uploadBox}>
                            <FaUpload />
                            <span>{form.thumb?.name || thumbLabel}</span>
                            <input type="file" accept={thumbAccept} onChange={(e) => setForm({ ...form, thumb: e.target.files[0] || null })} />
                        </label>
                    )}

                    <label className={css.uploadBox}>
                        <FaUpload />
                        <span>{form.arquivo?.name || arquivoLabel}</span>
                        <input type="file" accept={accept} onChange={(e) => setForm({ ...form, arquivo: e.target.files[0] || null })} />
                    </label>

                    <div className={css.acoesModal}>
                        <Button
                            tipo="button"
                            texto="Cancelar"
                            fundoCor="vermelho"
                            tamanho="medio"
                            onClick={onFechar}
                        />
                        <Button
                            tipo="submit"
                            texto={salvando ? "Salvando..." : editando ? "Salvar" : "Adicionar"}
                            fundoCor="verde"
                            tamanho="medio"
                        />
                    </div>

                    {tipo === "curso" && !editando && (
                        <p className={css.avisoModal}>Os cursos são cadastrados como privados. Publique quando estiver pronto.</p>
                    )}
                </form>
            </section>
        </main>
    );
}
/* Fim item 28 */
/* Fim item 6 */
