import * as Clipboard from "expo-clipboard";
import { useEffect, useRef, useState } from "react";
import { AppState, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { apiRequest, PAYMENT_REQUEST_TIMEOUT_MS } from "../api/client";
import AppIcon from "../components/AppIcon";
import HistoricoFaturasAluno from "../components/HistoricoFaturasAluno";
import { useFeedback } from "../components/FeedbackProvider";
import { colors, globalStyles } from "../styles";

function moeda(valor) {
  return `R$ ${Number(valor || 0).toFixed(2).replace(".", ",")}`;
}

// Sprint item 12 - Exibir valores recebidos, disponíveis para saque e já sacados pelo instrutor. define os cartões de receita do instrutor no app com base no resumo do fundo de receita compartilhado.
// Sprint item 15 - Exibir saldo disponível em caixa. (Esse é tanto para adm e instrutor, para o instrutor ele vai apenas mostrar o saldo bruto que ele pode sacar, para o adm, como o professor recebe uma comissão em porcentagem para cada aula que o aluno viu do curso dele, altere o valor da assinatura para 500 e para mostrar o saldo do adm, deve descontar as comissão e ai mostrar quanto vai sobrar para saque) inclui o saldo do instrutor que pode ser solicitado para saque.
const cards = [
  ["Ganhos estimados", "Sua parte do pool de receita", "recebido_estimado", "cash-outline", "money"],
  ["Disponível para saque", "Saldo bruto", "disponivel_saque", "wallet-outline", "money"],
  ["Já sacado", "Solicitações registradas", "ja_sacado", "card-outline", "money"],
  ["Alunos ativos", "Matrículas nos seus cursos", "alunos_ativos", "people-outline", "number"]
];

export default function FinanceiroScreen({ financeiro, carregando, onRefresh, token, tipoUsuario }) {
  const { mostrarAlerta } = useFeedback();
  const [faturas, setFaturas] = useState([]);
  const [atualizandoFaturas, setAtualizandoFaturas] = useState(false);
  const [pagamento, setPagamento] = useState(null);
  const [verificando, setVerificando] = useState(false);
  const [pixCopiado, setPixCopiado] = useState(false);
  const [valorSaque, setValorSaque] = useState("");
  const [solicitandoSaque, setSolicitandoSaque] = useState(false);
  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;
  const aluno = Number(tipoUsuario) === 2;
  const disponivelSaque = Number(financeiro?.disponivel_saque || 0);
  const valorSaqueNumero = Number(valorSaque);
  const saqueValido = Number.isFinite(valorSaqueNumero) && valorSaqueNumero > 0 && valorSaqueNumero <= disponivelSaque;
  const faturasAbertas = faturas.filter((fatura) => fatura.aberta);
  const cardsAtivos = aluno
    ? [
      ["Total gasto", "Mensalidades pagas", "total_gasto", "cash-outline", "money"],
      ["Em aberto", "Faturas pendentes", "total_aberto", "wallet-outline", "money"],
      ["Faturas pagas", "Histórico de mensalidades", "faturas", "receipt-outline", "number"],
      ["Faturas abertas", "Bloqueiam cursos", "faturas_abertas", "alert-circle-outline", "number"]
    ]
    : cards;

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

  useEffect(() => {
    carregarFaturas();
    const inscricao = AppState.addEventListener("change", (estado) => {
      if (estado === "active") {
        // Sprint item 3 - Sincronizar dados entre aplicativo e sistema web. atualiza faturas criadas ou pagas no site ao retornar ao financeiro do app.
        carregarFaturas();
        // Sprint item 33 - Exibir total gasto e histórico de faturas do aluno. atualiza também o total gasto, apresentado pelo resumo financeiro.
        if (aluno) onRefreshRef.current?.();
      }
    });

    return () => inscricao.remove();
  }, [aluno, token]);

  async function atualizarFinanceiro() {
    // Sprint item 3 - Sincronizar dados entre aplicativo e sistema web. o gesto de atualizar busca resumo e faturas na mesma fonte usada pelo site.
    await Promise.all([onRefresh?.(), carregarFaturas()]);
  }

  async function pagarProxima(idAssinatura = null) {
    try {
      // Sprint item 2 - Integrar pagamentos pelo ARKHE. aguarda a resposta da Arkhé ao gerar uma cobrança de mensalidade.
      // Sprint item 34 - Exibir faturas em aberto. permite escolher a fatura aberta ou criar uma mensalidade futura.
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

  async function confirmarPagamento(idAssinatura) {
    // Sprint item 34 - Exibir faturas em aberto. confirma somente a cobrança escolhida e atualiza o resumo financeiro.
    await apiRequest(`/financeiro/faturas/${idAssinatura}/verificar`, {
      method: "POST"
    }, token, PAYMENT_REQUEST_TIMEOUT_MS);
    setPagamento(null);
    await carregarFaturas();
    await onRefresh?.();
  }

  async function verificarPagamento() {
    if (!pagamento?.id_assinatura) return;
    try {
      setVerificando(true);
      // Sprint item 34 - Exibir faturas em aberto. baixa apenas a fatura selecionada após a confirmação da Arkhé.
      await confirmarPagamento(pagamento.id_assinatura);
    } catch (error) {
      mostrarAlerta("Pagamento", error.message, "erro");
    } finally {
      setVerificando(false);
    }
  }

  async function copiarPix() {
    if (!pagamento?.codigo_pagamento) return;
    await Clipboard.setStringAsync(pagamento.codigo_pagamento);
    setPixCopiado(true);
    setTimeout(() => setPixCopiado(false), 2500);
  }

  async function solicitarSaque() {
    if (solicitandoSaque) return;
    if (!saqueValido) {
      mostrarAlerta("Saque", "Informe um valor válido dentro do saldo disponível.", "erro");
      return;
    }

    setSolicitandoSaque(true);
    try {
      // Sprint item 32 - Permitir solicitação de saque para a conta ARKHE. envia a solicitação ao backend para validação do saldo e encaminhamento à Arkhé.
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

  return (
    <ScrollView
      contentContainerStyle={globalStyles.page}
      refreshControl={<RefreshControl refreshing={carregando || atualizandoFaturas} onRefresh={atualizarFinanceiro} />}
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
          {/* Sprint item 30 - Criar gestão financeira do instrutor. exibe o valor estimado do fundo de receita por aula concluída. */}
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
            <Pressable style={styles.payButton} onPress={() => pagarProxima()}>
              <Text style={styles.payButtonText}>Pagar nova mensalidade</Text>
            </Pressable>
            {pagamento?.codigo_pagamento && (
              <View style={styles.invoiceCard}>
                <Text style={styles.invoiceTitle}>PIX gerado</Text>
                <Text style={styles.invoiceText}>{pagamento.codigo_pagamento}</Text>
                <Pressable style={styles.confirmButton} onPress={copiarPix}>
                  <Text style={styles.payButtonText}>{pixCopiado ? "PIX copiado" : "Copiar pix"}</Text>
                </Pressable>
                <Pressable style={styles.confirmButton} onPress={verificarPagamento} disabled={verificando}>
                  <Text style={styles.payButtonText}>{verificando ? "Verificando..." : "Já paguei"}</Text>
                </Pressable>
              </View>
            )}
            {faturasAbertas.map((fatura) => (
              <View key={fatura.id} style={styles.invoiceCard}>
                <Text style={styles.invoiceTitle}>Mensalidade #{fatura.numero || fatura.id} - {fatura.status_label}</Text>
                <Text style={styles.invoiceText}>{moeda(fatura.valor)}</Text>
                {fatura.data_vencimento && (
                  <Text style={styles.invoiceText}>
                    Vencimento: {String(fatura.data_vencimento).slice(0, 10).split("-").reverse().join("/")}
                  </Text>
                )}
                {/* Sprint item 34 - Exibir faturas em aberto. recupera ou renova o Pix de cada fatura em aberto. */}
                <Pressable style={styles.confirmButton} onPress={() => pagarProxima(fatura.id)}>
                  <Text style={styles.payButtonText}>Pagar esta fatura</Text>
                </Pressable>
              </View>
            ))}
            {faturasAbertas.length === 0 && <Text style={styles.invoiceText}>Nenhuma mensalidade em aberto.</Text>}
          </View>

          <View style={styles.invoiceBlock}>
            {/* Sprint item 33 - Exibir total gasto e histórico de faturas do aluno. exibe o histórico de mensalidades pagas com valor e data. */}
            <HistoricoFaturasAluno faturas={faturas} />
          </View>
        </View>
      )}

      {!aluno && (
        <View style={styles.invoiceSection}>
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

          <View style={styles.invoiceBlock}>
            {/* Sprint item 31 - Exibir cursos que mais geraram receita para o instrutor. exibe os cursos do instrutor em ordem decrescente de receita estimada. */}
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
        </View>
      )}
    </ScrollView>
  );
}

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
