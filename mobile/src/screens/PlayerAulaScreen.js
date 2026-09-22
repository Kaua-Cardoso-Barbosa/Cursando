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
        <Ionicons name="arrow-back" size={22} color={colors.black} />
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

          <Text style={styles.nextTitle}>Proximas video-aulas:</Text>
          <View style={styles.list}>
            {proximas.map((proxima) => (
              <Pressable key={proxima.id} style={styles.card} onPress={() => onOpenLesson(proxima)}>
                <View style={styles.preview}>
                  <Image source={{ uri: proxima.thumb ? resolverUrlMidia(proxima.thumb) : fallbackThumb }} style={styles.image} />
                  <Ionicons name="play" size={72} color={colors.black} />
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
    gap: 4,
    borderWidth: 1,
    borderColor: colors.black,
    borderRadius: 7,
    backgroundColor: colors.white,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 8
  },
  backText: {
    color: colors.black,
    fontSize: 20
  },
  playerWrap: {
    width: "100%",
    aspectRatio: 16 / 9,
    overflow: "hidden",
    borderRadius: 14,
    backgroundColor: colors.black,
    marginBottom: 16
  },
  player: {
    width: "100%",
    height: "100%"
  },
  overlayTitle: {
    position: "absolute",
    top: 8,
    left: 14,
    right: 14
  },
  videoTitle: {
    color: colors.white,
    fontSize: 18
  },
  videoDescription: {
    color: colors.white,
    fontSize: 12
  },
  nextTitle: {
    color: colors.black,
    fontSize: 25,
    marginBottom: 22,
    marginLeft: 18
  },
  list: {
    gap: 22,
    paddingHorizontal: 18
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
  }
});
