import { useEffect, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { apiRequest, getApiBaseUrl } from "../api/client_2_3_5_17_39";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { useFeedback } from "../components/FeedbackProvider_39";
import { colors, globalStyles } from "../styles";

/* Sprint item 7 - Criar métricas para o instrutor: alunos, conclusões, módulos concluídos e horas assistidas */
/* Sprint item 22 - Criar relatórios com filtros por período, instrutor e curso */
/* Sprint item 23 - Exibir relatórios de alunos, cursos, módulos e horas assistidas */
/* Sprint item 39 - Desenvolver todas as telas do aplicativo */
function numero(valor) {
  return Number(valor || 0);
}
/* Fim item 39 */
/* Fim item 23 */
/* Fim item 22 */
/* Fim item 7 */

                                                                                                                                                                                   
export default /* Sprint item 7 - Criar métricas para o instrutor: alunos, conclusões, módulos concluídos e horas assistidas */
/* Sprint item 22 - Criar relatórios com filtros por período, instrutor e curso */
/* Sprint item 23 - Exibir relatórios de alunos, cursos, módulos e horas assistidas */
/* Sprint item 39 - Desenvolver todas as telas do aplicativo */
function RelatoriosProfessorScreen({ token, cursos = [], carregando }) {
  const { mostrarAlerta } = useFeedback();
  const [relatorio, setRelatorio] = useState(null);
  const [inicio, setInicio] = useState("");
  const [fim, setFim] = useState("");
  const [idCurso, setIdCurso] = useState("");
  const [loading, setLoading] = useState(false);
  const [baixandoPdf, setBaixandoPdf] = useState(false);

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
  const mensal = relatorio?.mensal || [];

                                                                                                                                                                          
  async function baixarPdf() {
    setBaixandoPdf(true);
    try {
      const params = new URLSearchParams({ formato: "pdf" });
      if (inicio) params.set("inicio", inicio);
      if (fim) params.set("fim", fim);
      if (idCurso) params.set("id_curso", idCurso);
      const uri = `${FileSystem.documentDirectory}relatorio-professor-${Date.now()}.pdf`;
      const download = await FileSystem.downloadAsync(`${getApiBaseUrl()}/relatorios/professor?${params.toString()}`, uri, { headers: { Authorization: `Bearer ${token}` } });
      if (download.status < 200 || download.status >= 300) throw new Error("Não foi possível baixar o relatório PDF.");
      if (!(await Sharing.isAvailableAsync())) throw new Error("O compartilhamento de arquivos não está disponível neste aparelho.");
      await Sharing.shareAsync(download.uri, { mimeType: "application/pdf", dialogTitle: "Relatório mensal do professor", UTI: "com.adobe.pdf" });
    } catch (error) { mostrarAlerta("Relatório", error.message, "erro"); }
    finally { setBaixandoPdf(false); }
  }

  return (
    <ScrollView
      contentContainerStyle={globalStyles.page}
      refreshControl={<RefreshControl refreshing={carregando || loading} onRefresh={carregar} />}
    >
      <View style={styles.header}>
        <Text style={globalStyles.title}>Relatorios</Text>
        <Pressable style={globalStyles.primaryButton} onPress={baixarPdf} disabled={baixandoPdf}><Text style={globalStyles.buttonText}>{baixandoPdf ? "Preparando PDF..." : "Baixar relatório PDF"}</Text></Pressable>
        <Text style={globalStyles.eyebrow}>Matrículas, conclusões e atividade por período e curso</Text>
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
      <View style={styles.table}>
                                                                                                                                                                                        
        <Text style={styles.sectionTitle}>Resumo mensal</Text>
        <Text style={styles.periodHint}>Horas acumuladas antigas sem competência mensal: {numero(relatorio?.horas_sem_competencia).toFixed(2).replace(".", ",")}h.</Text>
        {mensal.map((item) => (
          <View key={item.mes} style={[globalStyles.card, styles.courseRow]}>
            <Text style={styles.courseTitle}>{new Date(`${item.mes}-01T00:00:00`).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}</Text>
            <Text style={styles.courseText}>Alunos inscritos: {numero(item.alunos)}</Text>
            <Text style={styles.courseText}>Cursos criados: {numero(item.cursos)}</Text>
            <Text style={styles.courseText}>Módulos criados: {numero(item.modulos)}</Text>
            <Text style={styles.courseText}>Horas assistidas: {numero(item.horas_assistidas).toFixed(2).replace(".", ",")}h</Text>
          </View>
        ))}
        {!loading && mensal.length === 0 ? <Text style={globalStyles.message}>Nenhum dado mensal no período selecionado.</Text> : null}
      </View>
    </ScrollView>
  );
}
/* Fim item 39 */
/* Fim item 23 */
/* Fim item 22 */
/* Fim item 7 */

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
