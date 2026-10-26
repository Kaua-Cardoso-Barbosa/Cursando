import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { FaCertificate, FaCheckCircle, FaExclamationCircle, FaSearch } from "react-icons/fa";
import css from "./VerificarCertificado_38.module.css";

export default /* Sprint item 5 - Gerar certificado ao concluir o curso */
function VerificarCertificado({ api }) {
    const { codigo } = useParams();
    const navigate = useNavigate();
    const [consulta, setConsulta] = useState(codigo || "");
    const [resultado, setResultado] = useState(null);
    const [erro, setErro] = useState("");
    const [carregando, setCarregando] = useState(false);

    useEffect(() => {
        setConsulta(codigo || "");
        if (!codigo) return;
        const controle = new AbortController();
        setCarregando(true);
        setErro("");
        setResultado(null);
        fetch(`${api}/certificados/${encodeURIComponent(codigo)}/verificar`, {
            headers: { Accept: "application/json" },
            signal: controle.signal
        })
            .then(async (resposta) => {
                const dados = await resposta.json();
                if (!resposta.ok) throw new Error(resposta.status === 404
                    ? "Não encontramos um certificado com este código. Confira o código e tente novamente."
                    : dados?.mensagem?.descricao || "Não foi possível verificar o certificado agora.");
                setResultado(dados.certificado);
            })
            .catch((falha) => {
                if (falha.name !== "AbortError") setErro(falha.message || "Não foi possível verificar o certificado agora.");
            })
            .finally(() => {
                if (!controle.signal.aborted) setCarregando(false);
            });
        return () => controle.abort();
    }, [api, codigo]);

    function consultar(evento) {
        evento.preventDefault();
        const valor = consulta.trim().toUpperCase();
        if (valor) navigate(`/certificados/${encodeURIComponent(valor)}/verificar`);
    }

    const dataEmissao = resultado?.emitido_em
        ? new Date(resultado.emitido_em).toLocaleDateString("pt-BR", { timeZone: "UTC" })
        : "—";

    return (
        <main className={css.pagina}>
            <section className={css.painel} aria-labelledby="titulo-verificacao">
                <div className={css.icone}><FaCertificate /></div>
                <p className={css.sobretitulo}>Autenticidade de certificados</p>
                <h1 id="titulo-verificacao">Verifique um certificado</h1>
                <p className={css.introducao}>Digite o código impresso no certificado para confirmar se ele foi emitido pelo Cursando.</p>
                <form className={css.formulario} onSubmit={consultar}>
                    <label htmlFor="codigo-certificado">Código do certificado</label>
                    <div className={css.linhaBusca}>
                        <input id="codigo-certificado" value={consulta} onChange={(evento) => setConsulta(evento.target.value)} placeholder="CURSANDO-XXXXXXXXXXXX" required autoComplete="off" />
                        <button type="submit"><FaSearch /> Verificar</button>
                    </div>
                </form>
                <div className={css.resultado} aria-live="polite">
                    {carregando && <p>Consultando o certificado...</p>}
                    {!carregando && erro && <div className={css.invalido}><FaExclamationCircle /><div><h2>Não foi possível confirmar o certificado</h2><p>{erro}</p></div></div>}
                    {!carregando && resultado && <div className={css.valido}>
                        <div className={css.cabecalhoResultado}><FaCheckCircle /><div><h2>Certificado válido</h2><p>Este certificado foi emitido pelo Cursando.</p></div></div>
                        <dl>
                            <div><dt>Aluno</dt><dd>{resultado.aluno}</dd></div>
                            <div><dt>Curso</dt><dd>{resultado.curso}</dd></div>
                            <div><dt>Professor</dt><dd>{resultado.professor}</dd></div>
                            <div><dt>Data de emissão</dt><dd>{dataEmissao}</dd></div>
                            <div><dt>Código</dt><dd>{resultado.codigo}</dd></div>
                        </dl>
                    </div>}
                </div>
                <Link className={css.voltar} to="/">Voltar para a página inicial</Link>
            </section>
        </main>
    );
}
/* Fim item 5 */
