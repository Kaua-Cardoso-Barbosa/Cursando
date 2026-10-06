import { Ionicons } from "@expo/vector-icons";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { colors, globalStyles } from "../styles";

function formatarData(data) {
  if (!data) return "Nao disponivel";

  const [ano, mes, dia] = String(data).slice(0, 10).split("-").map(Number);
  if (![ano, mes, dia].every(Number.isInteger)) return "Nao disponivel";

  return `${String(dia).padStart(2, "0")}/${String(mes).padStart(2, "0")}/${ano}`;
}

const professorMetrics = [
  ["Cursos cadastrados", "Total criado por voce", "cursos_cadastrados", "albums-outline"],
  ["Total de alunos", "Matriculas em seus cursos", "total_alunos", "people-outline"],
  ["Aulas publicadas", "Video-aulas disponiveis", "aulas_publicadas", "play-circle-outline"],
  ["Cursos em rascunho", "Aguardando publicacao", "cursos_privados", "document-text-outline"],
  ["Cursos concluidos", "Conclusoes por aluno", "cursos_concluidos", "checkmark-done-outline"],
  ["Modulos concluidos", "Conclusoes por aluno", "modulos_concluidos", "layers-outline"],
  ["Horas assistidas", "Tempo registrado pelo player", "horas_assistidas", "time-outline", "horas"]
];

const alunoMetrics = [
  ["Iniciada em", "Data de inicio da assinatura", "data_inicio", "calendar-outline", "data"],
  ["Valida ate", "Data de termino da assinatura", "data_expiracao", "calendar-outline", "data"],
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
        <View style={styles.headerTextos}>
          <Text style={styles.kicker}>{Number(tipoUsuario) === 2 ? "Aluno(a)" : "Professor(a)"}</Text>
          <Text style={[globalStyles.title, styles.headerTitle]}>
            Ola {usuario?.nome || (Number(tipoUsuario) === 2 ? "Aluno" : "Professor")}
          </Text>
        </View>
        <View style={styles.headerBadge}>
          <Ionicons name="sparkles-outline" size={24} color={colors.white} />
        </View>
      </View>

      <View style={styles.cards}>
        {metrics.map(([titulo, detalhe, chave, icon, tipoValor]) => {
          const valor = tipoValor === "data"
            ? formatarData(dashboard?.assinatura?.[chave])
            : tipoValor === "horas"
              ? `${Number(metricas[chave] || 0).toFixed(2).replace(".", ",")} h`
              : metricas[chave] || 0;

          return (
            <View key={chave} style={[globalStyles.metricCard, styles.card]}>
              <View style={styles.cardTop}>
                <Text style={styles.cardTitle}>{titulo}</Text>
                <View style={styles.iconBadge}>
                  <Ionicons name={icon} size={24} color={colors.darkGreen} />
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
    minHeight: 150,
    marginBottom: 22,
    borderRadius: 8,
    backgroundColor: colors.darkGreen,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16
  },
  headerTextos: {
    flex: 1
  },
  headerTitle: {
    color: colors.white
  },
  kicker: {
    color: colors.mint,
    fontSize: 13,
    fontWeight: "800",
    textTransform: "uppercase",
    marginBottom: 8
  },
  headerBadge: {
    width: 52,
    height: 52,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.14)",
    alignItems: "center",
    justifyContent: "center"
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
    justifyContent: "space-between",
    gap: 14
  },
  cardTitle: {
    color: colors.ink,
    flex: 1,
    fontSize: 22,
    lineHeight: 27,
    fontWeight: "800"
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
    color: colors.textMuted,
    fontSize: 16,
    fontWeight: "600",
    marginTop: 10
  },
  number: {
    color: colors.darkGreen,
    fontSize: 44,
    lineHeight: 50,
    fontWeight: "800",
    marginTop: 10
  },
  dateValue: {
    color: colors.darkGreen,
    fontSize: 30,
    lineHeight: 38,
    fontWeight: "800",
    marginTop: 10
  }
});
