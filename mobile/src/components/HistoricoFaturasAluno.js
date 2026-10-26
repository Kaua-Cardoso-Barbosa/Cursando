import { StyleSheet, Text, View } from "react-native";
import { colors } from "../styles";

function moeda(valor) {
  return `R$ ${Number(valor || 0).toFixed(2).replace(".", ",")}`;
}

function dataBrasileira(valor) {
  const partes = String(valor || "").slice(0, 10).split("-");
  return partes.length === 3 ? partes.reverse().join("/") : "";
}

export default function HistoricoFaturasAluno({ faturas = [], totalGasto, mostrarTotal = false }) {
  // Sprint item 33 - Exibir total gasto e histórico de faturas do aluno. preserva no histórico mensalidades pagas mesmo depois de a assinatura expirar.
  const pagas = faturas.filter((fatura) => [1, 3].includes(Number(fatura.status)));

  return (
    <View style={styles.container}>
      {mostrarTotal && (
        <View style={styles.total}>
          <Text style={styles.rotulo}>Total gasto em mensalidades</Text>
          <Text style={styles.valor}>{moeda(totalGasto)}</Text>
        </View>
      )}
      <Text style={styles.titulo}>Histórico de mensalidades</Text>
      {pagas.map((fatura) => {
        const data = fatura.data_pagamento || fatura.criado_em;
        return (
          <View key={fatura.id} style={styles.fatura}>
            <Text style={styles.nome}>Mensalidade #{fatura.numero || fatura.id} · paga</Text>
            <Text style={styles.detalhe}>{moeda(fatura.valor)}</Text>
            {data && (
              <Text style={styles.detalhe}>
                {fatura.data_pagamento ? "Pagamento" : "Registro"}: {dataBrasileira(data)}
              </Text>
            )}
          </View>
        );
      })}
      {pagas.length === 0 && <Text style={styles.detalhe}>Nenhuma mensalidade paga registrada.</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 12 },
  total: { padding: 16, borderRadius: 10, backgroundColor: "#e8f6ee" },
  rotulo: { color: colors.darkGreen, fontSize: 14 },
  valor: { color: colors.ink, fontSize: 24, fontWeight: "700", marginTop: 4 },
  titulo: { color: colors.ink, fontSize: 19, fontWeight: "700" },
  fatura: { padding: 14, borderRadius: 10, backgroundColor: "#f3f8f5", gap: 4 },
  nome: { color: colors.ink, fontSize: 15, fontWeight: "600" },
  detalhe: { color: colors.textMuted, fontSize: 14 }
});
