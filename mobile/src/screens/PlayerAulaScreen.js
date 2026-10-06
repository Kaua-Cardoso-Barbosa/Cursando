import { Ionicons } from "@expo/vector-icons";
import { ResizeMode, Video } from "expo-av";
import { useEffect, useRef } from "react";
import * as ScreenCapture from "expo-screen-capture";
import { AppState, Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { resolverUrlMidia } from "../api/client";
import { colors, globalStyles } from "../styles";

const fallbackThumb = "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=900";

function formatarPosicaoAula(milissegundos) {
  const total = Math.max(0, Math.floor(Number(milissegundos || 0) / 1000));
  const horas = Math.floor(total / 3600);
  const minutos = Math.floor((total % 3600) / 60);
  const segundos = total % 60;
  return horas > 0
    ? `${horas}:${String(minutos).padStart(2, "0")}:${String(segundos).padStart(2, "0")}`
    : `${minutos}:${String(segundos).padStart(2, "0")}`;
}

export default function PlayerAulaScreen({ detalhe, onBack, onOpenLesson, onFinish, onSaveProgress }) {
  // Reproduz a URL de mídia autenticada e registra a conclusão enviada pelo player nativo.
  const aula = detalhe?.aula;
  const proximas = detalhe?.proximas || [];
  const videoRef = useRef(null);
  const onSaveProgressRef = useRef(onSaveProgress);
  const onFinishRef = useRef(onFinish);
  const aulaIdRef = useRef(aula?.id);
  const progressoAtualRef = useRef({ idAula: aula?.id, posicaoMillis: Number(aula?.progresso_segundos || 0) * 1000, carregado: false, concluido: false, inicioRegistrado: false });
  const ultimaPosicaoEnviadaRef = useRef(Number(aula?.progresso_segundos || 0));
  const filaSalvamentosRef = useRef(Promise.resolve());
  onSaveProgressRef.current = onSaveProgress;
  onFinishRef.current = onFinish;

  function enfileirarProgresso(idAula, posicaoMillis, forcar = false) {
    const posicaoSegundos = Math.max(0, Number(posicaoMillis || 0) / 1000);
    if (!idAula || !Number.isFinite(posicaoSegundos)) return filaSalvamentosRef.current;
    // Sprint item 7: deixa passar heartbeats de pausa e início mesmo sem alteração na posição.
    if (!forcar && Math.abs(posicaoSegundos - ultimaPosicaoEnviadaRef.current) < 0.5) return filaSalvamentosRef.current;

    ultimaPosicaoEnviadaRef.current = posicaoSegundos;
    // Sprint item 4: serializa os salvamentos para que uma resposta lenta nao sobrescreva uma posicao mais recente.
    filaSalvamentosRef.current = filaSalvamentosRef.current
      .then(() => onSaveProgressRef.current?.(idAula, posicaoSegundos))
      .catch((error) => console.error("Erro ao salvar posicao da aula:", error));
    return filaSalvamentosRef.current;
  }

  function salvarPosicaoAtual(forcar = false, registrarMesmoPonto = false) {
    const atual = progressoAtualRef.current;
    if (!atual.idAula || !atual.carregado || atual.concluido) return filaSalvamentosRef.current;

    const diferenca = Math.abs(atual.posicaoMillis / 1000 - ultimaPosicaoEnviadaRef.current);
    // Sprint item 7: renova o relógio ao pausar, mesmo quando o ponto de reprodução não mudou.
    if ((!forcar && diferenca < 10) || (diferenca < 0.5 && !registrarMesmoPonto)) return filaSalvamentosRef.current;
    return enfileirarProgresso(atual.idAula, atual.posicaoMillis, registrarMesmoPonto);
  }

  useEffect(() => {
    if (aulaIdRef.current !== aula?.id) {
      const posicaoInicial = Math.max(0, Number(aula?.progresso_segundos || 0));
      aulaIdRef.current = aula?.id;
      progressoAtualRef.current = {
        idAula: aula?.id,
        posicaoMillis: posicaoInicial * 1000,
        carregado: false,
        concluido: false,
        inicioRegistrado: false
      };
      ultimaPosicaoEnviadaRef.current = posicaoInicial;
    }

    return () => salvarPosicaoAtual(true, true);
  }, [aula?.id]);

  useEffect(() => {
    // Sprint item 10/26: bloqueia captura e gravacao de tela enquanto o aluno assiste aula no app.
    ScreenCapture.preventScreenCaptureAsync("aula-protegida").catch(() => {});

    return () => {
      ScreenCapture.allowScreenCaptureAsync("aula-protegida").catch(() => {});
    };
  }, []);

  useEffect(() => {
    const inscricao = AppState.addEventListener("change", (estado) => {
      if (estado !== "active") salvarPosicaoAtual(true, true);
    });

    return () => {
      inscricao.remove();
      salvarPosicaoAtual(true, true);
    };
  }, []);

  function carregarVideo(status) {
    const atual = progressoAtualRef.current;
    if (!status?.isLoaded || atual.idAula !== aula?.id) return;

    const retomarEm = Math.max(0, Number(aula?.progresso_segundos || 0) * 1000);
    const posicaoAtual = Number(status.positionMillis || 0);
    const duracao = Number(status.durationMillis || 0);

    if (retomarEm > posicaoAtual + 1000 && (!duracao || retomarEm < duracao) && videoRef.current) {
      atual.carregado = false;
      videoRef.current.setPositionAsync(retomarEm)
        .then((resultado) => {
          atual.posicaoMillis = Number(resultado?.positionMillis || retomarEm);
        })
        .catch((error) => console.error("Erro ao retomar a aula:", error))
        .finally(() => {
          atual.carregado = true;
        });
      return;
    }

    atual.posicaoMillis = posicaoAtual;
    atual.carregado = true;
  }

  function atualizarReproducao(status) {
    const atual = progressoAtualRef.current;
    if (!status?.isLoaded || atual.idAula !== aula?.id || !atual.carregado) return;

    atual.posicaoMillis = Number(status.positionMillis || 0);
    const estavaReproduzindo = Boolean(atual.estavaReproduzindo);
    atual.estavaReproduzindo = Boolean(status.isPlaying);
    // Sprint item 7: grava o ponto inicial ao começar a reprodução para contar desde os primeiros segundos.
    if (status.isPlaying && !atual.inicioRegistrado) {
      atual.inicioRegistrado = true;
      ultimaPosicaoEnviadaRef.current = atual.posicaoMillis / 1000 - 0.5;
      enfileirarProgresso(atual.idAula, atual.posicaoMillis, true);
    }
    if (status.didJustFinish) {
      if (atual.concluido) return;
      // Sprint item 7: registra o último intervalo assistido antes de encerrar a aula.
      salvarPosicaoAtual(true, true);
      atual.concluido = true;
      const aulaConcluida = aula;
      filaSalvamentosRef.current.then(() => onFinishRef.current?.(aulaConcluida));
      return;
    }

    if (estavaReproduzindo && !status.isPlaying) {
      salvarPosicaoAtual(true, true);
      return;
    }

    // Sprint item 4: salva durante a reproducao e imediatamente quando o aluno pausa.
    salvarPosicaoAtual(!status.isPlaying);
  }

  return (
    <ScrollView contentContainerStyle={globalStyles.page}>
      <Pressable style={styles.back} onPress={onBack}>
        <Ionicons name="arrow-back" size={19} color={colors.darkGreen} />
        <Text style={styles.backText}>Voltar</Text>
      </Pressable>

      {aula ? (
        <>
          {Number(aula.progresso_segundos) > 0 ? (
            <Text style={styles.resumeHint}>
              Retomando de {formatarPosicaoAula(Number(aula.progresso_segundos) * 1000)}
            </Text>
          ) : null}
          <View style={styles.playerWrap}>
            <Video
              ref={videoRef}
              source={{ uri: resolverUrlMidia(aula.video) }}
              posterSource={aula.thumb ? { uri: resolverUrlMidia(aula.thumb) } : undefined}
              usePoster={Boolean(aula.thumb)}
              style={styles.player}
              useNativeControls
              resizeMode={ResizeMode.CONTAIN}
              positionMillis={Math.max(0, Number(aula.progresso_segundos || 0) * 1000)}
              progressUpdateIntervalMillis={5000}
              onLoad={carregarVideo}
              onPlaybackStatusUpdate={atualizarReproducao}
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
  resumeHint: {
    color: colors.darkGreen,
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 10
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
    aspectRatio: 16 / 9,
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
