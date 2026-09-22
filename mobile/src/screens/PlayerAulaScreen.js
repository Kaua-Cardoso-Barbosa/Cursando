import { Ionicons } from "@expo/vector-icons";
import { ResizeMode, Video } from "expo-av";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { resolverUrlMidia } from "../api/client";
import { colors, globalStyles } from "../styles";

const fallbackThumb = "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=900";

export default function PlayerAulaScreen({ detalhe, onBack, onOpenLesson, onFinish }) {
  const aula = detalhe?.aula;
  const proximas = detalhe?.proximas || [];

  return (
    <ScrollView contentContainerStyle={globalStyles.page}>
      <Pressable style={styles.back} onPress={onBack}>
        <Ionicons name="arrow-back" size={19} color={colors.darkGreen} />
        <Text style={styles.backText}>Voltar</Text>
      </Pressable>

      {aula ? (
        <>
          <View style={styles.playerWrap}>
            <Video
              source={{ uri: resolverUrlMidia(aula.video) }}
              posterSource={aula.thumb ? { uri: resolverUrlMidia(aula.thumb) } : undefined}
              usePoster={Boolean(aula.thumb)}
              style={styles.player}
              useNativeControls
              resizeMode={ResizeMode.CONTAIN}
              onPlaybackStatusUpdate={(status) => {
                if (status?.didJustFinish) onFinish?.(aula);
              }}
            />
            <View style={styles.overlayTitle} pointerEvents="none">
              <Text style={styles.videoTitle} numberOfLines={1}>{aula.titulo}</Text>
              <Text style={styles.videoDescription} numberOfLines={1}>{aula.descricao}</Text>
            </View>
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.nextTitle}>Proximas video-aulas</Text>
            <View style={globalStyles.divider} />
          </View>
          <View style={styles.list}>
            {proximas.map((proxima) => (
              <Pressable key={proxima.id} style={[globalStyles.card, styles.card]} onPress={() => onOpenLesson(proxima)}>
                <View style={styles.preview}>
                  <Image source={{ uri: proxima.thumb ? resolverUrlMidia(proxima.thumb) : fallbackThumb }} style={styles.image} />
                  <View style={styles.playBadge}>
                    <Ionicons name="play" size={44} color={colors.black} />
                  </View>
                </View>
                <View style={styles.info}>
                  <Text style={styles.lessonTitle} numberOfLines={1}>{proxima.titulo}</Text>
                  <Text style={styles.description} numberOfLines={2}>{proxima.descricao}</Text>
                </View>
              </Pressable>
            ))}
          </View>
        </>
      ) : (
        <Text style={globalStyles.message}>Aula nao encontrada.</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
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
  },
  playerWrap: {
    width: "100%",
    aspectRatio: 16 / 9,
    overflow: "hidden",
    borderWidth: 1.5,
    borderColor: colors.black,
    borderRadius: 8,
    backgroundColor: colors.black,
    marginBottom: 24
  },
  player: {
    width: "100%",
    height: "100%"
  },
  overlayTitle: {
    position: "absolute",
    top: 12,
    left: 14,
    right: 14,
    paddingVertical: 4
  },
  videoTitle: {
    color: colors.white,
    fontSize: 18,
    lineHeight: 22
  },
  videoDescription: {
    color: colors.white,
    fontSize: 12,
    lineHeight: 16
  },
  sectionHeader: {
    marginBottom: 22
  },
  nextTitle: {
    color: colors.black,
    fontSize: 25,
    lineHeight: 30
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
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: "rgba(255, 255, 255, 0.7)",
    alignItems: "center",
    justifyContent: "center"
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
  }
});
