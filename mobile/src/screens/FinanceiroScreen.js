import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { useEffect, useState } from "react";
import { Alert, AppState, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { apiRequest, PAYMENT_REQUEST_TIMEOUT_MS } from "../api/client";
import { colors, globalStyles } from "../styles";

function moeda(valor) {
  return `R$ ${Number(valor || 0).toFixed(2).replace(".", ",")}`;
}

const cards = [
  ["Recebido estimado", "Pool de receita", "recebido_estimado", "cash-outline", "money"],
  ["Disponivel para saque", "Saldo bruto", "disponivel_saque", "wallet-outline", "money"],
  ["Ja sacado", "Solicitacoes registradas", "ja_sacado", "card-outline", "money"],
  ["Alunos ativos", "Matriculas nos seus cursos", "alunos_ativos", "people-outline", "number"]
];

export default function FinanceiroScreen({ financeiro, carregando, onRefresh, token, tipoUsuario }) {
  const [faturas, setFaturas] = useState([]);
  const [atualizandoFaturas, setAtualizandoFaturas] = useState(false);
  const [pagamento, setPagamento] = useState(null);
  const [verificando, setVerificando] = useState(false);
  const [pixCopiado, setPixCopiado] = useState(false);
  const aluno = Number(tipoUsuario) === 2;
  const faturasAbertas = faturas.filter((fatura) => fatura.aberta);
  const faturasPagas = faturas.filter((fatura) => !fatura.aberta);
  const cardsAtivos = aluno
    ? [
      ["Total gasto", "Mensalidades pagas", "total_gasto", "cash-outline", "money"],
      ["Em aberto", "Faturas pendentes", "total_aberto", "wallet-outline", "money"],
      ["Faturas pagas", "Historico de mensalidades", "faturas", "receipt-outline", "number"],
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
      Alert.alert("Erro", error.message);
    } finally {
      setAtualizandoFaturas(false);
    }
  }

  useEffect(() => {
    carregarFaturas();
    const inscricao = AppState.addEventListener("change", (estado) => {
      if (estado === "active") {
        // Sprint item 3: atualiza faturas criadas ou pagas no site ao retornar ao financeiro do app.
        carregarFaturas();
      }
    });

    return () => inscricao.remove();
  }, [aluno, token]);

  async function atualizarFinanceiro() {
    // Sprint item 3: o gesto de atualizar busca resumo e faturas na mesma fonte usada pelo site.
    await Promise.all([onRefresh?.(), carregarFaturas()]);
  }

  async function pagarProxima() {
    try {
      // Sprint item 1: aguarda a resposta da Arkhé ao gerar uma cobrança de mensalidade.
      // Sprint item 3: gera PIX de fatura futura pelo financeiro mobile do aluno.
      const dados = await apiRequest("/financeiro/faturas", {
        method: "POST",
        body: JSON.stringify({ meses: 1 })
      }, token, PAYMENT_REQUEST_TIMEOUT_MS, false);
      setPagamento(dados);
      await carregarFaturas();
      await onRefresh?.();
    } catch (error) {
      Alert.alert("Erro", error.message);
    }
  }

  async function verificarPagamento() {
    if (!pagamento?.id_assinatura) return;
    try {
      setVerificando(true);
      // Sprint item 1: confere com a Arkhé se a cobrança de mensalidade foi paga.
      await apiRequest(`/financeiro/faturas/${pagamento.id_assinatura}/verificar`, {
        method: "POST"
      }, token, PAYMENT_REQUEST_TIMEOUT_MS);
      setPagamento(null);
      await carregarFaturas();
      await onRefresh?.();
    } catch (error) {
      Alert.alert("Pagamento", error.message);
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
                <Ionicons name={icon} size={24} color={colors.black} />
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

      {aluno && (
        <View style={styles.invoiceSection}>
          <View style={styles.invoiceBlock}>
            <Text style={styles.sectionTitle}>Pagamento de novas mensalidades</Text>
            <Text style={styles.invoiceText}>Gere uma nova cobranca sem interromper a mensalidade atual.</Text>
            <Pressable style={styles.payButton} onPress={pagarProxima}>
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
                  <Text style={styles.payButtonText}>{verificando ? "Verificando..." : "Ja paguei"}</Text>
                </Pressable>
              </View>
            )}
            {faturasAbertas.map((fatura) => (
              <View key={fatura.id} style={styles.invoiceCard}>
                <Text style={styles.invoiceTitle}>Mensalidade #{fatura.numero || fatura.id} - {fatura.status_label}</Text>
                <Text style={styles.invoiceText}>{moeda(fatura.valor)}</Text>
              </View>
            ))}
          </View>

          <View style={styles.invoiceBlock}>
            <Text style={styles.sectionTitle}>Historico de mensalidades</Text>
            {faturasPagas.map((fatura) => (
              <View key={fatura.id} style={styles.invoiceCard}>
                <Text style={styles.invoiceTitle}>Mensalidade #{fatura.numero || fatura.id} - {fatura.status_label}</Text>
                <Text style={styles.invoiceText}>{moeda(fatura.valor)}</Text>
              </View>
            ))}
            {faturasPagas.length === 0 && (
              <Text style={styles.invoiceText}>Nenhuma mensalidade paga registrada.</Text>
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
  }
});
