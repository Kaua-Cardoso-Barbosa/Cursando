import { useState } from "react";
import { FaUpload } from "react-icons/fa";
import Input from "../Input/Input.jsx";
import Button from "../Button/Button.jsx";
import css from "../../pages/DashboardProfessor/DashboardProfessor.module.css";

const cursoVazio = {
    titulo: "",
    descricao: "",
    arquivo: null,
    thumb: null
};

const aulaVazia = {
    titulo: "",
    descricao: "",
    arquivo: null,
    thumb: null
};

export default function FormularioModalProfessor({ tipo, item, salvando, onFechar, onSalvar }) {
    const editando = Boolean(item);
    const [form, setForm] = useState({
        ...(tipo === "curso" ? cursoVazio : aulaVazia),
        titulo: item?.titulo || "",
        descricao: item?.descricao || "",
        thumb: item?.thumb || null
    });

    function enviar(evento) {
        evento.preventDefault();
        onSalvar(form);
    }

    const titulo = `${editando ? "Editar" : "Adicionar"} ${tipo === "curso" ? "Curso" : "Aula"}`;
    const arquivoLabel = tipo === "curso" ? "Enviar imagem" : "Enviar vídeo";
    const thumbLabel = "Enviar thumb";
    const accept = tipo === "curso" ? "image/png,image/jpeg,image/webp" : "video/mp4,video/webm,video/ogg,video/quicktime";
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
