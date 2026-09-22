import { Ionicons } from "@expo/vector-icons";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { colors, globalStyles } from "../styles";

const professorMetrics = [
  ["Cursos cadastrados", "Total criado por voce", "cursos_cadastrados", "albums-outline"],
  ["Total de alunos", "Matriculas em seus cursos", "total_alunos", "people-outline"],
  ["Aulas publicadas", "Video-aulas disponiveis", "aulas_publicadas", "play-circle-outline"],
  ["Cursos em rascunho", "Aguardando publicacao", "cursos_privados", "document-text-outline"]
];

const alunoMetrics = [
  ["Cursos inscritos", "+1 nesse mes", "inscritos", "library-outline"],
  ["Cursos finalizados", "+2 nesse mes", "finalizados", "checkmark-circle-outline"],
  ["Cursos iniciados", "+1 nesse mes", "iniciados", "time-outline"]
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
        <Text style={globalStyles.title}>Ola {usuario?.nome || (Number(tipoUsuario) === 2 ? "Aluno" : "Professor")}</Text>
        <Text style={globalStyles.eyebrow}>{Number(tipoUsuario) === 2 ? "Aluno(a)" : "Professor(a)"}</Text>
        <View style={globalStyles.divider} />
      </View>

      <View style={styles.cards}>
        {metrics.map(([titulo, detalhe, chave, icon]) => (
          <View key={chave} style={[globalStyles.metricCard, styles.card]}>
            <View style={styles.cardTop}>
              <Text style={styles.cardTitle}>{titulo}</Text>
              <View style={styles.iconBadge}>
                <Ionicons name={icon} size={24} color={colors.black} />
              </View>
            </View>
            <Text style={styles.cardDetail}>{detalhe}</Text>
            <Text style={styles.number}>{metricas[chave] || 0}</Text>
          </View>
        ))}
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
    marginTop: 18
  },
  number: {
    color: colors.black,
    fontSize: 44,
    lineHeight: 50,
    textAlign: "center",
    marginTop: 10
  }
});
