import * as Clipboard from "expo-clipboard";
import { useEffect, useRef, useState } from "react";
import { AppState, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { apiRequest, PAYMENT_REQUEST_TIMEOUT_MS } from "../api/client_3_17";
import AppIcon from "../components/AppIcon_39";
import HistoricoFaturasAluno from "../components/HistoricoFaturasAluno_33_39";
import { useFeedback } from "../components/FeedbackProvider_39";
import { colors, globalStyles } from "../styles_39";

function moeda(valor) {
  return `R$ ${Number(valor || 0).toFixed(2).replace(".", ",")}`;
}



const cards = [
  /* Sprint item 12 - Exibir valores recebidos, disponíveis para saque e já sacados pelo instrutor - Prepara o indicador de ganhos estimados para apresentação */ ["Ganhos estimados", "Sua parte do pool de receita", "recebido_estimado", "cash-outline", "money"] /* Fim item 12 */,
  /* Sprint item 15 - Exibir saldo disponível em caixa, assinatura de R$ 500 e desconto das comissões no saldo administrativo - Prepara o indicador de disponível para saque para apresentação */ ["Disponível para saque", "Saldo bruto", "disponivel_saque", "wallet-outline", "money"] /* Fim item 15 */,
  /* Sprint item 12 - Exibir valores recebidos, disponíveis para saque e já sacados pelo instrutor - Prepara o indicador de já sacado para apresentação */ ["Já sacado", "Solicitações registradas", "ja_sacado", "card-outline", "money"] /* Fim item 12 */,
  ["Alunos ativos", "Matrículas nos seus cursos", "alunos_ativos", "people-outline", "number"]
];

export default
function FinanceiroScreen({ financeiro, carregando, onRefresh, token, tipoUsuario }) {
  const { mostrarAlerta } = useFeedback();
  /* Sprint item 33 - Exibir total gasto e histórico de faturas do aluno - Mantém as faturas e o histórico financeiro do aluno */
  const [faturas, setFaturas] = useState([]);
  /* Fim item 33 */
  const [atualizandoFaturas, setAtualizandoFaturas] = useState(false);
  const [pagamento, setPagamento] = useState(null);
  const [verificando, setVerificando] = useState(false);
  /* Sprint item 2 - Integrar pagamentos pelo ARKHE - Solicita ou confere a cobrança Pix pela API de pagamentos */
  const [pixCopiado, setPixCopiado] = useState(false);
  /* Fim item 2 */
  /* Sprint item 32 - Permitir solicitação de saque para a conta ARKHE - Envia ou acompanha solicitações de saque e sua análise manual */
  const [valorSaque, setValorSaque] = useState("");
  /* Fim item 32 */
  const [solicitandoSaque, setSolicitandoSaque] = useState(false);
  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;
  const aluno = Number(tipoUsuario) === 2;
  /* Sprint item 12 - Exibir valores recebidos, disponíveis para saque e já sacados pelo instrutor - Apresenta os valores recebidos, já sacados e disponíveis */
  const disponivelSaque = Number(financeiro?.disponivel_saque || 0);
  /* Fim item 12 */
  /* Sprint item 32 - Permitir solicitação de saque para a conta ARKHE - Envia ou acompanha solicitações de saque e sua análise manual */
  const valorSaqueNumero = Number(valorSaque);
  const saqueValido = Number.isFinite(valorSaqueNumero) && valorSaqueNumero > 0 && valorSaqueNumero <= disponivelSaque;
  /* Fim item 32 */
  /* Sprint item 34 - Exibir faturas em aberto - Seleciona as faturas ainda pendentes de pagamento */
  const faturasAbertas = faturas.filter((fatura) => fatura.aberta);
  /* Fim item 34 */
  const cardsAtivos = aluno
    ? [
      /* Sprint item 33 - Exibir total gasto e histórico de faturas do aluno - Prepara o indicador de total gasto para apresentação */ ["Total gasto", "Mensalidades pagas", "total_gasto", "cash-outline", "money"] /* Fim item 33 */,
      /* Sprint item 34 - Exibir faturas em aberto - Prepara o indicador de em aberto para apresentação */ ["Em aberto", "Faturas pendentes", "total_aberto", "wallet-outline", "money"] /* Fim item 34 */,
      /* Sprint item 33 - Exibir total gasto e histórico de faturas do aluno - Prepara o indicador de faturas pagas para apresentação */ ["Faturas pagas", "Histórico de mensalidades", "faturas", "receipt-outline", "number"] /* Fim item 33 */,
      /* Sprint item 34 - Exibir faturas em aberto - Prepara o indicador de faturas abertas para apresentação */ ["Faturas abertas", "Bloqueiam cursos", "faturas_abertas", "alert-circle-outline", "number"] /* Fim item 34 */
    ]
    : cards;

  /* Sprint item 33 - Exibir total gasto e histórico de faturas do aluno - Consulta as faturas e atualiza os totais gastos e pendentes */
  async function carregarFaturas() {
    if (!aluno || !token) return;
    setAtualizandoFaturas(true);
    try {
      const dados = await apiRequest("/financeiro/faturas", {}, token);
      setFaturas(dados.faturas || []);
    } catch (error) {
      mostrarAlerta("Erro", error.message, "erro");
    } finally {
      setAtualizandoFaturas(false);
    }
  }
  /* Fim item 33 */

  /* Sprint item 3 - Sincronizar dados entre aplicativo e sistema web - Atualiza os dados da sessão compartilhados entre o site e o aplicativo */
  useEffect(() => {
    carregarFaturas();
    const inscricao = AppState.addEventListener("change",
(estado) => {
      if (estado === "active") {

        carregarFaturas();

        if (aluno) onRefreshRef.current?.();
      }
    }
);

    return () => inscricao.remove();
  }, [aluno, token]);
  /* Fim item 3 */

async function atualizarFinanceiro() {

    await Promise.all([onRefresh?.(), carregarFaturas()]);
  }

/* Sprint item 2 - Integrar pagamentos pelo ARKHE - Cria a cobrança da próxima mensalidade e apresenta o Pix */
async function pagarProxima(idAssinatura = null) {
    try {


      const dados = await apiRequest("/financeiro/faturas", {
        method: "POST",
        body: JSON.stringify({ meses: 1, ...(idAssinatura ? { id_assinatura: idAssinatura } : {}) })
      }, token, PAYMENT_REQUEST_TIMEOUT_MS, false);
      if (dados.pagamento_confirmado) {
        await confirmarPagamento(dados.id_assinatura);
        return;
      }
      setPagamento(dados);
      await carregarFaturas();
      await onRefresh?.();
    } catch (error) {
      mostrarAlerta("Erro", error.message, "erro");
    }
  }
/* Fim item 2 */

/* Sprint item 2 - Integrar pagamentos pelo ARKHE - Confirma a fatura na API e atualiza os dados financeiros */
async function confirmarPagamento(idAssinatura) {

    await apiRequest(`/financeiro/faturas/${idAssinatura}/verificar`, {
      method: "POST"
    }, token, PAYMENT_REQUEST_TIMEOUT_MS);
    setPagamento(null);
    await carregarFaturas();
    await onRefresh?.();
  }
/* Fim item 2 */

/* Sprint item 2 - Integrar pagamentos pelo ARKHE - Consulta a situação do pagamento Pix e atualiza o acesso */
async function verificarPagamento() {
    if (!pagamento?.id_assinatura) return;
    try {
      setVerificando(true);

      await confirmarPagamento(pagamento.id_assinatura);
    } catch (error) {
      mostrarAlerta("Pagamento", error.message, "erro");
    } finally {
      setVerificando(false);
    }
  }
/* Fim item 2 */

  /* Sprint item 2 - Integrar pagamentos pelo ARKHE - Copia o código Pix da fatura para a área de transferência */
  async function copiarPix() {
    if (!pagamento?.codigo_pagamento) return;
    await Clipboard.setStringAsync(pagamento.codigo_pagamento);
    setPixCopiado(true);
    setTimeout(() => setPixCopiado(false), 2500);
  }
  /* Fim item 2 */

/* Sprint item 32 - Permitir solicitação de saque para a conta ARKHE - Valida o valor disponível e envia o pedido de saque */
async function solicitarSaque() {
    if (solicitandoSaque) return;
    if (!saqueValido) {
      mostrarAlerta("Saque", "Informe um valor válido dentro do saldo disponível.", "erro");
      return;
    }

    setSolicitandoSaque(true);
    try {

      await apiRequest("/professor/saques", {
        method: "POST",
        body: JSON.stringify({ valor: valorSaqueNumero })
      }, token);
      setValorSaque("");
      await onRefresh?.();
      mostrarAlerta("Saque", "Solicitação enviada.", "sucesso");
    } catch (error) {
      mostrarAlerta("Erro", error.message, "erro");
    } finally {
      setSolicitandoSaque(false);
    }
  }
/* Fim item 32 */

  return (
    <ScrollView
      contentContainerStyle={globalStyles.page}
      refreshControl={/* Sprint item 30 - Criar gestão financeira do instrutor - Carrega e apresenta o resumo financeiro do instrutor */ <RefreshControl refreshing={carregando || atualizandoFaturas} onRefresh={atualizarFinanceiro} /> /* Fim item 30 */}
    >
      <View style={styles.header}>
        <Text style={globalStyles.title}>Financeiro</Text>
        <Text style={globalStyles.eyebrow}>Revenue Pool</Text>
        <View style={globalStyles.divider} />
      </View>

      <View style={styles.cards}>
        {cardsAtivos.map(([titulo, detalhe, chave, icon, tipo]) => (
          <View key={chave} style={[globalStyles.metricCard, styles.card]}>
            <View style={styles.cardTop}>
              <Text style={styles.cardTitle}>{titulo}</Text>
              <View style={styles.iconBadge}>
                <AppIcon name={icon} size={20} color={colors.black} />
              </View>
            </View>
            <Text style={styles.cardDetail}>{detalhe}</Text>
            <Text style={styles.number}>
              {tipo === "money" ? moeda(financeiro?.[chave]) : Number(financeiro?.[chave] || 0)}
            </Text>
          </View>
        ))}
      </View>

      <Text style={styles.poolText}>
        {aluno
          ? "Mensalidades futuras podem ficar em aberto sem interromper uma assinatura ativa."
          : `Percentual do pool: ${Number(financeiro?.percentual_pool || 0).toFixed(2).replace(".", ",")}%`}
      </Text>

      {!aluno && (
        <View style={styles.viewValueCard}>
                                                                                                                                       
          <Text style={styles.viewValueLabel}>Valor estimado por view concluída</Text>
          <Text style={styles.viewValue}>{financeiro?.valor_por_view === null || financeiro?.valor_por_view === undefined ? "Aguardando aulas concluídas" : moeda(financeiro.valor_por_view)}</Text>
          <Text style={styles.viewValueHint}>Estimativa por aula concluída, usada para calcular a receita de cada curso.</Text>
        </View>
      )}

      {aluno && (
        <View style={styles.invoiceSection}>
          <View style={styles.invoiceBlock}>
            <Text style={styles.sectionTitle}>Pagamento de novas mensalidades</Text>
            <Text style={styles.invoiceText}>Gere uma nova cobrança sem interromper a mensalidade atual.</Text>
            {/* Sprint item 2 - Integrar pagamentos pelo ARKHE - Solicita ou confere a cobrança Pix pela API de pagamentos */}
            <Pressable style={styles.payButton} onPress={() => pagarProxima()}>
              <Text style={styles.payButtonText}>Pagar nova mensalidade</Text>
            </Pressable>
            {/* Fim item 2 */}
            {pagamento?.codigo_pagamento && (
              /* Sprint item 2 - Integrar pagamentos pelo ARKHE - Solicita ou confere a cobrança Pix pela API de pagamentos */ <View style={styles.invoiceCard}>
                <Text style={styles.invoiceTitle}>PIX gerado</Text>
                <Text style={styles.invoiceText}>{pagamento.codigo_pagamento}</Text>
                <Pressable style={styles.confirmButton} onPress={copiarPix}>
                  <Text style={styles.payButtonText}>{pixCopiado ? "PIX copiado" : "Copiar pix"}</Text>
                </Pressable>
                <Pressable style={styles.confirmButton} onPress={verificarPagamento} disabled={verificando}>
                  <Text style={styles.payButtonText}>{verificando ? "Verificando..." : "Já paguei"}</Text>
                </Pressable>
              </View> /* Fim item 2 */
            )}
            {faturasAbertas.map(
(fatura) => (
              /* Sprint item 2 - Integrar pagamentos pelo ARKHE - Solicita ou confere a cobrança Pix pela API de pagamentos */ <View key={fatura.id} style={styles.invoiceCard}>
                <Text style={styles.invoiceTitle}>Mensalidade #{fatura.numero || fatura.id} - {fatura.status_label}</Text>
                <Text style={styles.invoiceText}>{moeda(fatura.valor)}</Text>
                {fatura.data_vencimento && (
                  <Text style={styles.invoiceText}>
                    Vencimento: {String(fatura.data_vencimento).slice(0, 10).split("-").reverse().join("/")}
                  </Text>
                )}
                                                                                                                     
                <Pressable style={styles.confirmButton} onPress={() => pagarProxima(fatura.id)}>
                  <Text style={styles.payButtonText}>Pagar esta fatura</Text>
                </Pressable>
              </View> /* Fim item 2 */
            )
)}
            {faturasAbertas.length === 0 && <Text style={styles.invoiceText}>Nenhuma mensalidade em aberto.</Text>}
          </View>

          {/* Sprint item 33 - Exibir total gasto e histórico de faturas do aluno - Consulta e apresenta o total gasto e o histórico de faturas pagas */}
          <View style={styles.invoiceBlock}>
                                                                                                                                                  
            <HistoricoFaturasAluno faturas={faturas} />
          </View>
          {/* Fim item 33 */}
        </View>
      )}

      {!aluno && (
        <View style={styles.invoiceSection}>
          {/* Sprint item 32 - Permitir solicitação de saque para a conta ARKHE - Envia ou acompanha solicitações de saque e sua análise manual */}
          <View style={styles.invoiceBlock}>
            <Text style={styles.sectionTitle}>Solicitar saque</Text>
            <Text style={styles.invoiceText}>Disponível para saque: {moeda(disponivelSaque)}</Text>
            <TextInput
              value={valorSaque}
              onChangeText={setValorSaque}
              keyboardType="decimal-pad"
              placeholder="0,00"
              placeholderTextColor={colors.muted}
              style={globalStyles.input}
            />
            <Pressable style={[styles.payButton, !saqueValido && styles.disabledButton]} onPress={solicitarSaque} disabled={!saqueValido || solicitandoSaque}>
              <Text style={styles.payButtonText}>{solicitandoSaque ? "Enviando..." : "Solicitar saque"}</Text>
            </Pressable>
          </View>
          {/* Fim item 32 */}

          {/* Sprint item 31 - Exibir cursos que mais geraram receita para o instrutor - Apresenta os cursos ordenados pela receita estimada */}
          <View style={styles.invoiceBlock}>
                                                                                                                                                                    
            <Text style={styles.sectionTitle}>Cursos que mais geraram receita</Text>
            <Text style={styles.invoiceText}>Cursos ordenados da maior para a menor receita estimada.</Text>
            {(financeiro?.cursos_receita || []).map((curso) => (
              <View key={curso.id_curso} style={styles.invoiceCard}>
                <Text style={styles.invoiceTitle}>{curso.curso}</Text>
                <Text style={styles.invoiceText}>Atividade: {Number(curso.views || 0)} aulas concluidas</Text>
                <Text style={styles.invoiceText}>Receita estimada: {moeda(curso.receita_estimativa)}</Text>
              </View>
            ))}
            {!financeiro?.cursos_receita?.length && (
              <Text style={styles.invoiceText}>Ainda nao ha receita estimada para exibir.</Text>
            )}
          </View>
          {/* Fim item 31 */}
        </View>
      )}
    </ScrollView>
  );
}

/* Sprint item 39 - Desenvolver todas as telas do aplicativo - Define os estilos dos componentes nativos desta tela */
const styles = StyleSheet.create({
  header: {
    marginBottom: 28
  },
  cards: {
    gap: 18
  },
  card: {
    justifyContent: "space-between"
  },
  cardTop: {
    width: "100%",
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "center",
    gap: 14
  },
  cardTitle: {
    color: colors.black,
    flex: 1,
    fontSize: 23,
    lineHeight: 28,
    textAlign: "center"
  },
  iconBadge: {
    width: 48,
    height: 44,
    borderRadius: 8,
    backgroundColor: colors.mint,
    alignItems: "center",
    justifyContent: "center"
  },
  cardDetail: {
    color: "#56c991",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center"
  },
  number: {
    color: colors.black,
    fontSize: 34,
    lineHeight: 40,
    textAlign: "center",
    marginTop: 10
  },
  poolText: {
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    marginTop: 18
  },
  viewValueCard: { marginTop: 14, marginBottom: 18, padding: 14, borderWidth: 1, borderColor: colors.border, borderRadius: 10, backgroundColor: colors.softGray, gap: 5 },
  viewValueLabel: { color: colors.darkGreen, fontSize: 15, fontWeight: "700" },
  viewValue: { color: colors.darkGreen, fontSize: 24, fontWeight: "800" },
  viewValueHint: { color: colors.textMuted, fontSize: 12, lineHeight: 17 },
  invoiceSection: {
    gap: 12,
    marginTop: 18
  },
  invoiceBlock: {
    gap: 12,
    borderTopWidth: 1.5,
    borderTopColor: colors.darkGreen,
    paddingTop: 16
  },
  sectionTitle: {
    color: colors.black,
    fontSize: 21,
    lineHeight: 26,
    fontWeight: "700"
  },
  payButton: {
    minHeight: 48,
    borderRadius: 8,
    backgroundColor: colors.darkGreen,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14
  },
  payButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "700"
  },
  invoiceCard: {
    borderWidth: 1.5,
    borderColor: colors.black,
    borderRadius: 8,
    padding: 14,
    backgroundColor: colors.white
  },
  invoiceTitle: {
    color: colors.black,
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4
  },
  invoiceText: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20
  },
  confirmButton: {
    minHeight: 42,
    borderRadius: 8,
    backgroundColor: colors.darkGreen,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
    marginTop: 12
  },
  disabledButton: {
    opacity: 0.55
  }
});
/* Fim item 39 */
