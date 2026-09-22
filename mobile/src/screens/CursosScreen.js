import { Ionicons } from "@expo/vector-icons";
import { Alert, Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { resolverUrlMidia } from "../api/client";
import { colors, globalStyles } from "../styles";

const placeholders = [
  "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=900",
  "https://images.unsplash.com/photo-1507146426996-ef05306b995a?w=900",
  "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=900"
];

export default function CursosScreen({ cursos, carregando, onRefresh, onEdit, onDelete, onOpen, tipoUsuario = 1 }) {
  const aluno = Number(tipoUsuario) === 2;

  function confirmarExclusao(curso) {
    Alert.alert("Excluir curso", `Deseja excluir ${curso.titulo}?`, [
      { text: "Cancelar", style: "cancel" },
      { text: "Excluir", style: "destructive", onPress: () => onDelete(curso) }
    ]);
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
        {cursos.map((curso, index) => {
          const imagem = curso.imagem ? resolverUrlMidia(curso.imagem) : placeholders[index % placeholders.length];
          return (
            <View key={curso.id} style={[globalStyles.card, styles.card]}>
              <Pressable disabled={!onOpen} onPress={() => onOpen?.(curso)}>
                <Image source={{ uri: imagem }} style={styles.image} />
              </Pressable>
              <View style={styles.info}>
                <Pressable style={styles.texts} disabled={!onOpen} onPress={() => onOpen?.(curso)}>
                  <Text style={styles.courseTitle} numberOfLines={1}>{curso.titulo}</Text>
                  <Text style={styles.description} numberOfLines={2}>{curso.descricao}</Text>
                </Pressable>
                {aluno ? (
                  <View style={styles.progressBox}>
                    <Text style={styles.progressLabel}>{Number(curso.progresso || 0)}%</Text>
                    <View style={styles.progressTrack}>
                      <View style={[styles.progressFill, { width: `${Number(curso.progresso || 0)}%` }]} />
                    </View>
                  </View>
                ) : (
                  <View style={styles.actions}>
                    <Pressable style={styles.iconButton} onPress={() => onEdit(curso)} hitSlop={10}>
                      <Ionicons name="pencil-outline" size={22} color={colors.black} />
                    </Pressable>
                    <Pressable style={styles.iconButton} onPress={() => confirmarExclusao(curso)} hitSlop={10}>
                      <Ionicons name="trash-outline" size={22} color={colors.red} />
                    </Pressable>
                  </View>
                )}
              </View>
            </View>
          );
        })}
        {!carregando && cursos.length === 0 ? <Text style={globalStyles.message}>Nenhum curso encontrado.</Text> : null}
      </View>
    </ScrollView>
  );
}

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
    height: 154,
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
    color: colors.black,
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
    color: colors.black,
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
