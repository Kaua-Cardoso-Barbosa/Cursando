import { Ionicons } from "@expo/vector-icons";
import { Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { resolverUrlMidia } from "../api/client";
import { colors, globalStyles } from "../styles";

const fallbackThumb = "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=900";

export default function AulasAlunoScreen({ detalhe, carregando, onRefresh, onBack, onOpenLesson }) {
  const curso = detalhe?.curso;
  const aulas = detalhe?.aulas || [];

  return (
    <ScrollView
      contentContainerStyle={globalStyles.page}
      refreshControl={<RefreshControl refreshing={carregando} onRefresh={onRefresh} />}
    >
      <Text style={styles.title}>Todas video-aulas{"\n"}do curso: {curso?.titulo || "Curso"}</Text>

      <View style={styles.list}>
        {aulas.map((aula) => (
          <Pressable key={aula.id} style={styles.card} onPress={() => onOpenLesson(aula)}>
            <View style={styles.preview}>
              <Image source={{ uri: aula.thumb ? resolverUrlMidia(aula.thumb) : fallbackThumb }} style={styles.image} />
              <Ionicons name="play" size={78} color={colors.black} style={styles.play} />
              {aula.assistida ? <Ionicons name="checkmark" size={38} color={colors.green} style={styles.check} /> : null}
            </View>
            <View style={styles.info}>
              <Text style={styles.lessonTitle} numberOfLines={1}>{aula.titulo}</Text>
              <Text style={styles.description} numberOfLines={2}>{aula.descricao}</Text>
            </View>
          </Pressable>
        ))}
        {!carregando && aulas.length === 0 ? <Text style={globalStyles.message}>Nenhuma aula publicada neste curso.</Text> : null}
      </View>

      <Pressable style={styles.back} onPress={onBack}>
        <Ionicons name="arrow-back" size={22} color={colors.black} />
        <Text style={styles.backText}>Voltar</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  title: {
    color: colors.black,
    fontSize: 35,
    lineHeight: 49,
    marginBottom: 28
  },
  list: {
    gap: 26,
    paddingHorizontal: 16
  },
  card: {
    overflow: "hidden",
    borderWidth: 1.2,
    borderColor: colors.black,
    borderRadius: 16,
    backgroundColor: colors.white
  },
  preview: {
    height: 154,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#dddddd"
  },
  image: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%"
  },
  play: {
    opacity: 0.94
  },
  check: {
    position: "absolute",
    top: 7,
    right: 10
  },
  info: {
    minHeight: 66,
    paddingHorizontal: 14,
    paddingVertical: 6
  },
  lessonTitle: {
    color: colors.black,
    fontSize: 22,
    lineHeight: 26
  },
  description: {
    color: colors.black,
    fontSize: 13
  },
  back: {
    position: "absolute",
    top: 12,
    left: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderColor: colors.black,
    borderRadius: 7,
    backgroundColor: colors.white,
    paddingHorizontal: 8,
    paddingVertical: 3
  },
  backText: {
    color: colors.black,
    fontSize: 20
  }
});
