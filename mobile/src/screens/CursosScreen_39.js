import CursoCard from '../components/CursoCard_39';
import { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";

import AppIcon from "../components/AppIcon_39";
import { useFeedback } from "../components/FeedbackProvider_39";
import { colors, globalStyles } from "../styles_39";


export default
function CursosScreen({ cursos, carregando, onRefresh, onEdit, onDelete, onOpen, onManage, onExams, onComplements, onStudents, onHistory, tipoUsuario = 1 }) {

  const [filtro, setFiltro] = useState(1);
  const aluno = Number(tipoUsuario) === 2;
  const { confirmar } = useFeedback();

  async function confirmarExclusao(curso) {
    const confirmado = await confirmar({
      titulo: "Excluir curso",
      descricao: `Deseja excluir ${curso.titulo}?`,
      textoCancelar: "Cancelar",
      textoConfirmar: "Excluir"
    });
    if (confirmado) onDelete(curso);
  }

  return (
    <ScrollView
      contentContainerStyle={globalStyles.page}
      refreshControl={<RefreshControl refreshing={carregando} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <Text style={globalStyles.title}>Meus cursos</Text>
        <Text style={globalStyles.eyebrow}>
          {aluno ? "Cursos em andamento" : "Cursos publicados e rascunhos"}
        </Text>
        <View style={globalStyles.divider} />
      </View>

      <View style={styles.list}>
        {aluno && onHistory && <Pressable style={globalStyles.secondaryButton} onPress={onHistory}><Text style={globalStyles.secondaryText}>Meu histórico de provas</Text></Pressable>}
        {!aluno && <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{[[1, 'Publicados'], [0, 'Privados'], [2, 'Arquivados']].map(([id, titulo]) => <Pressable key={id} accessibilityState={{ selected: filtro === id }} style={filtro === id ? globalStyles.primaryButton : globalStyles.secondaryButton} onPress={() => setFiltro(id)}><Text style={filtro === id ? globalStyles.buttonText : globalStyles.secondaryText}>{titulo}</Text></Pressable>)}</View>}
        {cursos.filter(c => aluno || Number(c.status) === filtro).map(curso => <CursoCard key={curso.id} curso={curso} onOpen={onOpen || onManage} progresso={aluno} acoes={!aluno && (
                  <View style={styles.actions}>
                    {onExams ? (
                      <Pressable style={styles.iconButton} onPress={() => onExams(curso)} hitSlop={10} accessibilityLabel="Gerenciar prova do curso">
                        <AppIcon name="document-text-outline" size={20} color={colors.darkGreen} />
                      </Pressable>
                    ) : null}
                                                                                                                                                                                               
                    {onComplements ? (
                      <Pressable style={styles.iconButton} onPress={() => onComplements(curso)} hitSlop={10} accessibilityLabel="Gerenciar complementos do curso">
                        <AppIcon name="attach-outline" size={20} color={colors.darkGreen} />
                      </Pressable>
                    ) : null}
                    {onManage ? (
                      <Pressable style={styles.iconButton} onPress={() => onManage(curso)} hitSlop={10} accessibilityLabel="Gerenciar módulos">
                        <AppIcon name="folder-open-outline" size={20} color={colors.darkGreen} />
                      </Pressable>
                    ) : null}
                    {onStudents ? (
                      <Pressable style={styles.iconButton} onPress={() => onStudents(curso)} hitSlop={10} accessibilityLabel="Ver alunos">
                        <AppIcon name="people-outline" size={20} color={colors.darkGreen} />
                      </Pressable>
                    ) : null}
                    <Pressable style={styles.iconButton} onPress={() => onEdit(curso)} hitSlop={10}>
                      <AppIcon name="pencil-outline" size={20} color={colors.black} />
                    </Pressable>
                    <Pressable style={styles.iconButton} onPress={() => confirmarExclusao(curso)} hitSlop={10}>
                      <AppIcon name="trash-outline" size={20} color={colors.red} />
                    </Pressable>
                  </View>        )} />)}
        {!carregando && !cursos.some(c => aluno || Number(c.status) === filtro) ? <Text style={globalStyles.message}>Nenhum curso encontrado.</Text> : null}
      </View>
    </ScrollView>
  );
}

/* Sprint item 39 - Desenvolver todas as telas do aplicativo - Define os estilos dos componentes nativos desta tela */
/* Os estilos desta tela organizam a lista de cursos no aplicativo. */
const styles = StyleSheet.create({
  header: {
    marginBottom: 26
  },
  list: {
    gap: 22
  },
  card: {
    shadowColor: colors.black,
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2
  },
  image: {
    width: "100%",
    aspectRatio: 16 / 9,
    backgroundColor: "#dddddd"
  },
  info: {
    minHeight: 78,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: 13,
    paddingVertical: 11,
    gap: 12
  },
  texts: {
    flex: 1
  },
  courseTitle: {
    color: colors.ink,
    fontSize: 21,
    lineHeight: 25
  },
  description: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 18,
    marginTop: 2
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
    paddingTop: 4
  },
  iconButton: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 7,
    backgroundColor: colors.gray
  },
  progressBox: {
    width: 88,
    alignItems: "center",
    alignSelf: "flex-end",
    marginBottom: 2
  },
  progressLabel: {
    color: colors.ink,
    fontSize: 12,
    marginBottom: 3
  },
  progressTrack: {
    width: 84,
    height: 9,
    borderWidth: 1,
    borderColor: colors.black,
    borderRadius: 999,
    overflow: "hidden",
    backgroundColor: colors.white
  },
  progressFill: {
    height: "100%",
    backgroundColor: colors.green
  }
});
/* Fim item 39 */
