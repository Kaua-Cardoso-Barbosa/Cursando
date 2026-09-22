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
      <Pressable style={styles.back} onPress={onBack}>
        <Ionicons name="arrow-back" size={19} color={colors.darkGreen} />
        <Text style={styles.backText}>Voltar</Text>
      </Pressable>

      <View style={styles.header}>
        <Text style={globalStyles.title}>Todas video-aulas</Text>
        <Text style={globalStyles.eyebrow} numberOfLines={2}>
          {curso?.titulo || "Curso"}
        </Text>
        <View style={globalStyles.divider} />
      </View>

      <View style={styles.list}>
        {aulas.map((aula) => (
          <Pressable key={aula.id} style={[globalStyles.card, styles.card]} onPress={() => onOpenLesson(aula)}>
            <View style={styles.preview}>
              <Image source={{ uri: aula.thumb ? resolverUrlMidia(aula.thumb) : fallbackThumb }} style={styles.image} />
              <View style={styles.playBadge}>
                <Ionicons name="play" size={48} color={colors.black} style={styles.play} />
              </View>
              {aula.assistida ? <Ionicons name="checkmark-circle" size={34} color={colors.green} style={styles.check} /> : null}
            </View>
            <View style={styles.info}>
              <Text style={styles.lessonTitle} numberOfLines={1}>{aula.titulo}</Text>
              <Text style={styles.description} numberOfLines={2}>{aula.descricao}</Text>
            </View>
          </Pressable>
        ))}
        {!carregando && aulas.length === 0 ? <Text style={globalStyles.message}>Nenhuma aula publicada neste curso.</Text> : null}
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
  playBadge: {
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: "rgba(255, 255, 255, 0.7)",
    alignItems: "center",
    justifyContent: "center"
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
    minHeight: 72,
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  lessonTitle: {
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
  back: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: colors.darkGreen,
    borderRadius: 4,
    backgroundColor: "transparent",
    paddingHorizontal: 9,
    paddingVertical: 5,
    marginBottom: 16
  },
  backText: {
    color: colors.darkGreen,
    fontSize: 16
  }
});
