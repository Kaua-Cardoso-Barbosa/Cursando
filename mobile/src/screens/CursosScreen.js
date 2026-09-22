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
      <Text style={globalStyles.title}>Meus cursos</Text>
      <View style={globalStyles.divider} />

      <View style={styles.list}>
        {cursos.map((curso, index) => {
          const imagem = curso.imagem ? resolverUrlMidia(curso.imagem) : placeholders[index % placeholders.length];
          return (
            <View key={curso.id} style={styles.card}>
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
                    <Pressable onPress={() => onEdit(curso)} hitSlop={10}>
                      <Ionicons name="pencil-outline" size={32} color={colors.black} />
                    </Pressable>
                    <Pressable onPress={() => confirmarExclusao(curso)} hitSlop={10}>
                      <Ionicons name="trash-outline" size={32} color={colors.red} />
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
  list: {
    gap: 18,
    marginTop: 42,
    paddingHorizontal: 16
  },
  card: {
    overflow: "hidden",
    borderWidth: 1.2,
    borderColor: colors.black,
    borderRadius: 16,
    backgroundColor: colors.white
  },
  image: {
    width: "100%",
    height: 153,
    backgroundColor: "#dddddd"
  },
  info: {
    minHeight: 68,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingLeft: 13,
    paddingRight: 12,
    gap: 12
  },
  texts: {
    flex: 1
  },
  courseTitle: {
    color: colors.black,
    fontSize: 25,
    lineHeight: 28
  },
  description: {
    color: colors.black,
    fontSize: 13,
    lineHeight: 16
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 18
  },
  progressBox: {
    width: 84,
    alignItems: "center",
    alignSelf: "flex-end",
    marginBottom: 6
  },
  progressLabel: {
    color: colors.black,
    fontSize: 12
  },
  progressTrack: {
    width: 76,
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
