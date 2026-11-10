import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import AppIcon from "../components/AppIcon_39";
import { colors, globalStyles } from "../styles_39";
import CursoCard from '../components/CursoCard_39';
import AulaCard from '../components/AulaCard_39';

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
  /* Sprint item 7 - Criar métricas para o instrutor: alunos, conclusões, módulos concluídos e horas assistidas - Prepara o indicador de cursos concluidos para apresentação */ ["Cursos concluidos", "Conclusoes por aluno", "cursos_concluidos", "checkmark-circle-outline"] /* Fim item 7 */,
  /* Sprint item 7 - Criar métricas para o instrutor: alunos, conclusões, módulos concluídos e horas assistidas - Prepara o indicador de modulos concluidos para apresentação */ ["Modulos concluidos", "Conclusoes por aluno", "modulos_concluidos", "layers-outline"] /* Fim item 7 */,
  /* Sprint item 7 - Criar métricas para o instrutor: alunos, conclusões, módulos concluídos e horas assistidas - Prepara o indicador de horas assistidas para apresentação */ ["Horas assistidas", "Tempo registrado pelo player", "horas_assistidas", "time-outline", "horas"] /* Fim item 7 */
];

const alunoMetrics = [
  ["Iniciada em", "Data de inicio da assinatura", "data_inicio", "calendar-outline", "data"],
  ["Valida ate", "Data de termino da assinatura", "data_expiracao", "calendar-outline", "data"],
  ["Cursos inscritos", "Matrículas ativas", "inscritos", "library-outline"],
  ["Cursos finalizados", "Conclusões registradas", "finalizados", "albums-outline"]
];

export default
function InicioScreen({ usuario, dashboard, carregando, onRefresh, tipoUsuario = 1, onOpenCourse, onOpenLesson }) {
  const aluno = Number(tipoUsuario) === 2;
  const metricas = dashboard?.metricas || {};
  /* Sprint item 7 - Criar métricas para o instrutor: alunos, conclusões, módulos concluídos e horas assistidas - Define as métricas do instrutor exibidas no início do aplicativo */
  const metrics = Number(tipoUsuario) === 2 ? alunoMetrics : professorMetrics;
  /* Fim item 7 */

  return (
    <ScrollView
      contentContainerStyle={globalStyles.page}
      refreshControl={<RefreshControl refreshing={carregando} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <View style={styles.headerTextos}>
          <Text style={styles.headerTitle}>
            Ola {usuario?.nome || (Number(tipoUsuario) === 2 ? "Aluno" : "Professor")}
          </Text>
          <Text style={styles.cargoUsuario}>{Number(tipoUsuario) === 2 ? "Aluno" : "Professor(a)"}</Text>
        </View>
      </View>

      <View style={globalStyles.metricGrid}>
        {metrics.map(([titulo, detalhe, chave, icon, tipoValor]) => {
          const valor = tipoValor === "data"
            ? formatarData(dashboard?.assinatura?.[chave])
            : tipoValor === "horas"
              ? `${Number(metricas[chave] || 0).toFixed(2).replace(".", ",")} h`
              : metricas[chave] || 0;

          return (
            <View key={chave} style={globalStyles.metricCard}>
              <View style={globalStyles.metricTop}>
                <Text style={globalStyles.metricTitle}>{titulo}</Text>
                <View style={globalStyles.metricIcon}>
                  <AppIcon name={icon} size={14} color={colors.darkGreen} />
                </View>
              </View>
              <Text style={globalStyles.metricDetail}>{detalhe}</Text>
              <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.65} style={tipoValor === "data" ? globalStyles.metricDate : globalStyles.metricValue}>{valor}</Text>
            </View>
          );
        })}
      </View>
      {aluno && <View style={{ gap: 16, marginTop: 28 }}><Text style={globalStyles.title}>Últimas aulas assistidas</Text>{(dashboard?.recentes || []).map(aula => <AulaCard key={aula.id} aula={aula} onOpen={onOpenLesson} />)}{!dashboard?.recentes?.length && <Text>Comece um curso para acompanhar suas aulas aqui.</Text>}</View>}
      {!aluno && <View style={{ gap: 16, marginTop: 28 }}><Text style={globalStyles.title}>Cursos atualizados recentemente</Text><Text style={{ color: colors.textMuted }}>Continue organizando suas aulas e módulos.</Text>
        <ScrollView horizontal style={{ flexGrow: 0, flexShrink: 0 }} showsHorizontalScrollIndicator contentContainerStyle={{ gap: 16, paddingBottom: 12 }}>{(dashboard?.recentes || []).map(c => <CursoCard key={c.id} curso={c} onOpen={onOpenCourse} style={{ width: 280 }} />)}</ScrollView>
        {!dashboard?.recentes?.length && <Text>Nenhum curso criado ainda.</Text>}
      </View>}
    </ScrollView>
  );
}

/* Sprint item 39 - Desenvolver todas as telas do aplicativo - Define os estilos dos componentes nativos desta tela */
const styles = StyleSheet.create({
  header: {
    marginBottom: 24,
    flexDirection: "row",
    alignItems: "flex-start"
  },
  headerTextos: {
    minWidth: "78%",
    borderLeftWidth: 4,
    borderLeftColor: colors.green,
    paddingLeft: 14,
    paddingVertical: 2
  },
  headerTitle: {
    color: colors.ink,
    fontSize: 26,
    lineHeight: 34,
    fontWeight: "700"
  },
  cargoUsuario: {
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 18,
    marginTop: 5
  },

});
/* Fim item 39 */
