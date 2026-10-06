import { useEffect, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { apiRequest } from "../api/client";
import { useFeedback } from "../components/FeedbackProvider";
import { colors, globalStyles } from "../styles";

function numero(valor) {
  return Number(valor || 0);
}

export default function RelatoriosProfessorScreen({ token, cursos = [], carregando }) {
  const { mostrarAlerta } = useFeedback();
  const [relatorio, setRelatorio] = useState(null);
  const [inicio, setInicio] = useState("");
  const [fim, setFim] = useState("");
  const [idCurso, setIdCurso] = useState("");
  const [loading, setLoading] = useState(false);

  async function carregar() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (inicio) params.set("inicio", inicio);
      if (fim) params.set("fim", fim);
      if (idCurso) params.set("id_curso", idCurso);
      const dados = await apiRequest(`/relatorios/professor?${params.toString()}`, {}, token);
      setRelatorio(dados);
    } catch (error) {
      mostrarAlerta("Erro", error.message, "erro");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregar();
  }, [token]);

  const resumo = relatorio?.resumo || {};
  const linhas = relatorio?.cursos || [];

  return (
    <ScrollView
      contentContainerStyle={globalStyles.page}
      refreshControl={<RefreshControl refreshing={carregando || loading} onRefresh={carregar} />}
    >
      <View style={styles.header}>
        <Text style={globalStyles.title}>Relatorios</Text>
        <Text style={globalStyles.eyebrow}>Matriculas, conclusoes e atividade</Text>
        <View style={globalStyles.divider} />
      </View>

      <View style={[globalStyles.card, styles.filters]}>
        <TextInput value={inicio} onChangeText={setInicio} placeholder="Inicio: AAAA-MM-DD" placeholderTextColor={colors.muted} style={globalStyles.input} />
        <TextInput value={fim} onChangeText={setFim} placeholder="Fim: AAAA-MM-DD" placeholderTextColor={colors.muted} style={globalStyles.input} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.courseFilters}>
          <Pressable style={[styles.filterButton, !idCurso && styles.filterActive]} onPress={() => setIdCurso("")}>
            <Text style={[styles.filterText, !idCurso && styles.filterTextActive]}>Todos</Text>
          </Pressable>
          {cursos.map((curso) => (
            <Pressable key={curso.id} style={[styles.filterButton, String(curso.id) === idCurso && styles.filterActive]} onPress={() => setIdCurso(String(curso.id))}>
              <Text style={[styles.filterText, String(curso.id) === idCurso && styles.filterTextActive]} numberOfLines={1}>{curso.titulo}</Text>
            </Pressable>
          ))}
        </ScrollView>
        <Pressable style={globalStyles.primaryButton} onPress={carregar}>
          <Text style={globalStyles.buttonText}>Filtrar</Text>
        </Pressable>
      </View>

      <View style={styles.cards}>
        {[
          ["Matriculas", resumo.alunos],
          ["Cursos", resumo.cursos],
          ["Aulas concluidas", resumo.aulas_assistidas],
          ["Cursos concluidos", resumo.conclusoes],
          ["Modulos concluidos", resumo.modulos],
          ["Horas assistidas", `${numero(resumo.horas_assistidas).toFixed(2).replace(".", ",")}h`]
        ].map(([titulo, valor]) => (
          <View key={titulo} style={[globalStyles.metricCard, styles.metric]}>
            <Text style={styles.metricTitle}>{titulo}</Text>
            <Text style={styles.metricValue}>{valor}</Text>
          </View>
        ))}
      </View>

      <View style={styles.table}>
        <Text style={styles.sectionTitle}>Detalhamento por curso</Text>
        {linhas.map((curso) => (
          <View key={curso.id_curso} style={[globalStyles.card, styles.courseRow]}>
            <Text style={styles.courseTitle}>{curso.curso}</Text>
            <Text style={styles.courseText}>Matriculas: {numero(curso.alunos)}</Text>
            <Text style={styles.courseText}>Cursos concluidos: {numero(curso.conclusoes)}</Text>
            <Text style={styles.courseText}>Modulos concluidos: {numero(curso.modulos)}</Text>
            <Text style={styles.courseText}>Aulas concluidas: {numero(curso.aulas_assistidas)}</Text>
            <Text style={styles.courseText}>Horas: {numero(curso.horas_assistidas).toFixed(2).replace(".", ",")}h</Text>
          </View>
        ))}
        {!loading && linhas.length === 0 ? <Text style={globalStyles.message}>Nenhum curso encontrado com os filtros selecionados.</Text> : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: { marginBottom: 22 },
  filters: { padding: 14, gap: 12, marginBottom: 18 },
  courseFilters: { gap: 8 },
  filterButton: { maxWidth: 180, minHeight: 38, borderWidth: 1, borderColor: colors.border, borderRadius: 8, backgroundColor: colors.white, justifyContent: "center", paddingHorizontal: 12 },
  filterActive: { backgroundColor: colors.darkGreen, borderColor: colors.darkGreen },
  filterText: { color: colors.darkGreen, fontWeight: "700" },
  filterTextActive: { color: colors.white },
  cards: { gap: 12 },
  metric: { minHeight: 110 },
  metricTitle: { color: colors.textMuted, fontSize: 15, fontWeight: "700" },
  metricValue: { color: colors.darkGreen, fontSize: 30, lineHeight: 36, fontWeight: "800", marginTop: 8 },
  table: { gap: 12, marginTop: 22 },
  sectionTitle: { color: colors.black, fontSize: 22, fontWeight: "700" },
  courseRow: { padding: 14 },
  courseTitle: { color: colors.black, fontSize: 18, fontWeight: "700", marginBottom: 8 },
  courseText: { color: colors.textMuted, fontSize: 14, lineHeight: 20 }
});
