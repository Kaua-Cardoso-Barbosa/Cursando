import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { globalStyles } from "../styles";

const professorMetrics = [
  ["Cursos cadastrados", "Total criado por voce", "cursos_cadastrados"],
  ["Total de alunos", "Matriculas em seus cursos", "total_alunos"],
  ["Aulas publicadas", "Video-aulas disponiveis", "aulas_publicadas"],
  ["Cursos em Rascunho", "Aguardando publicacao", "cursos_privados"]
];

const alunoMetrics = [
  ["Cursos inscritos", "+1 nesse mes", "inscritos"],
  ["Cursos finalizados", "+2 nesse mes", "finalizados"],
  ["Cursos iniciados", "+1 nesse mes", "iniciados"]
];

export default function InicioScreen({ usuario, dashboard, carregando, onRefresh, tipoUsuario = 1 }) {
  const metricas = dashboard?.metricas || {};
  const metrics = Number(tipoUsuario) === 2 ? alunoMetrics : professorMetrics;

  return (
    <ScrollView
      contentContainerStyle={globalStyles.page}
      refreshControl={<RefreshControl refreshing={carregando} onRefresh={onRefresh} />}
    >
      <View>
        <Text style={globalStyles.title}>Ola {usuario?.nome || (Number(tipoUsuario) === 2 ? "Aluno" : "Professor")}</Text>
        <Text style={styles.role}>{Number(tipoUsuario) === 2 ? "Aluno(a)" : "Professor(a)"}</Text>
        <View style={globalStyles.divider} />
      </View>

      <View style={styles.cards}>
        {metrics.map(([titulo, detalhe, chave]) => (
          <View key={chave} style={styles.card}>
            <Text style={styles.cardTitle}>{titulo}</Text>
            <Text style={styles.cardDetail}>{detalhe}</Text>
            <Text style={styles.number}>{metricas[chave] || 0}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  role: {
    color: "#02693e",
    fontSize: 16,
    marginTop: 3
  },
  cards: {
    gap: 12,
    marginTop: 18
  },
  card: {
    minHeight: 165,
    borderWidth: 1.2,
    borderColor: "#111111",
    borderRadius: 13,
    backgroundColor: "#fafafa",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 10
  },
  cardTitle: {
    color: "#000000",
    fontSize: 31,
    textAlign: "center"
  },
  cardDetail: {
    color: "#56c991",
    fontSize: 24,
    textAlign: "center"
  },
  number: {
    color: "#000000",
    fontSize: 48,
    lineHeight: 54
  }
});
