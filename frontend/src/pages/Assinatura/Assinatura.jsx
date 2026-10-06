import { useEffect, useRef, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import Button from "../../components/Button/Button.jsx";
import css from "./Assinatura.module.css";

export default function Assinatura({ api, sair }) {
    const [pagamento, setPagamento] = useState(null);
    const [carregando, setCarregando] = useState(false);
    const [verificando, setVerificando] = useState(false);
    const [codigoCopiado, setCodigoCopiado] = useState(false);
    const [erro, setErro] = useState("");
    const redirecionando = useRef(false);

    // Consulta o backend, que confirma o estado da cobrança junto à Arkhé.
    async function consultarAssinatura() {
        const resposta = await fetch(`${api}/assinaturas/verificar`, {
            method: "GET",
            credentials: "include"
        });
        const dados = await resposta.json();

        if (resposta.ok && dados?.assinatura === true) {
            if (!redirecionando.current) {
                redirecionando.current = true;
                // Recarrega a área autenticada para atualizar o perfil e remover
                // o estado antigo da página de assinatura.
                window.location.replace("/DashboardAluno");
            }
            return true;
        }

        // Sprint item 1: só trata ausência/pendência como não pago; falha da Arkhe não inicia outra cobrança.
        if ((resposta.status === 403 || resposta.ok) && dados?.assinatura === false) {
            return false;
        }

        throw new Error(getMensagemErro(dados, "Não foi possível verificar a assinatura."));
    }

    useEffect(() => {
        consultarAssinatura().catch(() => {});
    }, [api]);

    // Sprint item 1: cria ou recupera o PIX pelo backend, que mantém o preço e a cobrança no servidor.
    async function iniciarPagamento() {
        setCarregando(true);
        setErro("");

        try {
            const assinaturaAtiva = await consultarAssinatura();

            if (assinaturaAtiva) {
                return;
            }

            const resposta = await fetch(`${api}/assinaturas/pix`, {
                method: "POST",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({})
            });
            const dados = await resposta.json();

            if (!resposta.ok) {
                throw new Error(getMensagemErro(dados, "Nao foi possivel iniciar o pagamento."));
            }

            setPagamento(dados);
        } catch (error) {
            setErro(error.message);
        } finally {
            setCarregando(false);
        }
    }

    // Sprint item 1: confirma a assinatura pelo status consultado na Arkhé.
    // A confirmação é manual pelo botão "Já paguei", sem consulta automática periódica.
    // A consulta é iniciada pelo usuário; esta tela não faz polling automático.
    async function verificarPagamento() {
        setVerificando(true);
        setErro("");

        try {
            const assinaturaAtiva = await consultarAssinatura();

            if (assinaturaAtiva) {
                return;
            }

            setErro("O pagamento ainda não foi confirmado.");
        } catch (error) {
            setErro(error.message);
        } finally {
            setVerificando(false);
        }
    }

    async function copiarCodigo() {
        if (pagamento?.codigo_pagamento) {
            await navigator.clipboard.writeText(pagamento.codigo_pagamento);
            setCodigoCopiado(true);
            setTimeout(() => setCodigoCopiado(false), 2500);
        }
    }

    return (
        <main className={css.pagina}>
            <div className={css.acoesTopo}>
                <Button texto="Sair" fundoCor="vermelho" tamanho="pequeno" onClick={sair} />
            </div>
            <section className={css.introducao}>
                <span className={css.eyebrow}>Seu próximo passo</span>
                <h1>Aprenda no seu ritmo com o Plus.</h1>
                <p>Ative sua assinatura mensal para acessar os cursos e continuar sua jornada na Cursando.</p>
            </section>

            <section className={css.plano} aria-labelledby="titulo-plano">
                <div>
                    <p className={css.rotulo}>Plano disponível</p>
                    <h2 id="titulo-plano">Plano Mensal</h2>
                    <strong>
                        {pagamento ? `R$ ${Number(pagamento.valor).toFixed(2).replace(".", ",")}` : "Valor mensal"}
                        <small> /mês</small>
                    </strong>
                    <ul>
                        <li>Acesso a dezenas de cursos</li>
                        <li>Certificados de conclusão, quando disponíveis</li>
                        <li>30 dias de acesso após a confirmação</li>
                    </ul>
                </div>

                {!pagamento ? (
                    <button className={css.botao} type="button" onClick={iniciarPagamento} disabled={carregando}>
                        {carregando ? "Gerando PIX..." : "Assinar com PIX"}
                    </button>
                ) : (
                    <div className={css.pagamento}>
                        <div className={css.pagamentoTopo}>
                            <span>PIX gerado</span>
                            <strong>R$ {Number(pagamento.valor || 0).toFixed(2).replace(".", ",")}</strong>
                        </div>
                        <p className={css.instrucao}>Copie o código PIX, conclua o pagamento no seu banco e depois confirme por aqui.</p>
                        <div className={css.qrCodeArea}>
                            <QRCodeCanvas value={pagamento.codigo_pagamento || ""} size={210} includeMargin />
                            <span>Escaneie este QR Code no aplicativo do seu banco.</span>
                        </div>
                        <div className={css.areaCodigoPix} aria-label="Codigo PIX copia e cola">
                            <span className={css.rotuloCodigoPix}>Pix copia e cola</span>
                            <p className={css.codigoPix}>{pagamento.codigo_pagamento}</p>
                        </div>
                        <div className={css.acoes}>
                            <button
                                className={`${css.botaoSecundario} ${codigoCopiado ? css.codigoCopiado : ""}`}
                                type="button"
                                onClick={copiarCodigo}
                                aria-live="polite"
                            >
                                {codigoCopiado ? "Código Copiado" : "Copiar código"}
                            </button>
                            <button className={css.botao} type="button" onClick={verificarPagamento} disabled={verificando}>
                                {verificando ? "Verificando..." : "Já paguei"}
                            </button>
                        </div>
                    </div>
                )}

                {erro && <p className={css.erro} role="alert">{erro}</p>}
            </section>
        </main>
    );
}

function getMensagemErro(dados, padrao) {
    if (typeof dados?.mensagem === "string") {
        return dados.mensagem;
    }

    if (typeof dados?.mensagem?.descricao === "string") {
        return dados.mensagem.descricao;
    }

    if (typeof dados?.erro === "string") {
        return dados.erro;
    }

    return padrao;
}
