import { Ionicons } from "@expo/vector-icons";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { colors, globalStyles } from "../styles";

function formatarData(data) {
  if (!data) return "Não disponível";

  const [ano, mes, dia] = String(data).slice(0, 10).split("-").map(Number);
  if (![ano, mes, dia].every(Number.isInteger)) return "Não disponível";

  return `${String(dia).padStart(2, "0")}/${String(mes).padStart(2, "0")}/${ano}`;
}

const professorMetrics = [
  ["Cursos cadastrados", "Total criado por voce", "cursos_cadastrados", "albums-outline"],
  ["Total de alunos", "Matriculas em seus cursos", "total_alunos", "people-outline"],
  ["Aulas publicadas", "Video-aulas disponiveis", "aulas_publicadas", "play-circle-outline"],
  ["Cursos em rascunho", "Aguardando publicacao", "cursos_privados", "document-text-outline"]
];

const alunoMetrics = [
  ["Iniciada em", "Data de início da assinatura", "data_inicio", "calendar-outline", "data"],
  ["Válida até", "Data de término da assinatura", "data_expiracao", "calendar-outline", "data"],
  ["Cursos inscritos", "+1 nesse mes", "inscritos", "library-outline"],
  ["Cursos finalizados", "+2 nesse mes", "finalizados", "checkmark-circle-outline"]
];

export default function InicioScreen({ usuario, dashboard, carregando, onRefresh, tipoUsuario = 1 }) {
  const metricas = dashboard?.metricas || {};
  const metrics = Number(tipoUsuario) === 2 ? alunoMetrics : professorMetrics;

  return (
    <ScrollView
      contentContainerStyle={globalStyles.page}
      refreshControl={<RefreshControl refreshing={carregando} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <Text style={globalStyles.title}>Olá {usuario?.nome || (Number(tipoUsuario) === 2 ? "Aluno" : "Professor")}</Text>
        <Text style={globalStyles.eyebrow}>{Number(tipoUsuario) === 2 ? "Aluno(a)" : "Professor(a)"}</Text>
        <View style={globalStyles.divider} />
      </View>

      <View style={styles.cards}>
        {metrics.map(([titulo, detalhe, chave, icon, tipoValor]) => {
          const valor = tipoValor === "data"
            ? formatarData(dashboard?.assinatura?.[chave])
            : metricas[chave] || 0;

          return (
            <View key={chave} style={[globalStyles.metricCard, styles.card]}>
              <View style={styles.cardTop}>
                <Text style={styles.cardTitle}>{titulo}</Text>
                <View style={styles.iconBadge}>
                  <Ionicons name={icon} size={24} color={colors.black} />
                </View>
              </View>
              <Text style={styles.cardDetail}>{detalhe}</Text>
              <Text style={tipoValor === "data" ? styles.dateValue : styles.number}>{valor}</Text>
            </View>
          );
        })}
      </View>
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
    fontSize: 24,
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
    textAlign: "center",
    marginTop: 0
  },
  number: {
    color: colors.black,
    fontSize: 44,
    lineHeight: 50,
    textAlign: "center",
    marginTop: 10
  },
  dateValue: {
    color: colors.black,
    fontSize: 32,
    lineHeight: 38,
    textAlign: "center",
    marginTop: 10
  }
});
