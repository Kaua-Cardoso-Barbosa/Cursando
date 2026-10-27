import AppIcon from "../components/AppIcon_39";
import { ResizeMode, Video } from "expo-av";
import { useEffect, useRef } from "react";
/* Sprint item 26 - Bloquear gravação de tela durante o curso - Carrega o recurso nativo usado também para proteger contra gravação da tela */
import { usePreventScreenCapture } from "expo-screen-capture";
/* Fim item 26 */
import { AppState, Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { resolverUrlMidia } from "../api/client_3_17";
import { colors, globalStyles } from "../styles_39";

const fallbackThumb = "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=900";

/* Sprint item 4 - Salvar o progresso das aulas para que o aluno continue de onde parou - Formata a posição salva para exibir o ponto de retomada */
function formatarPosicaoAula(milissegundos) {
  const total = Math.max(0, Math.floor(Number(milissegundos || 0) / 1000));
  const horas = Math.floor(total / 3600);
  const minutos = Math.floor((total % 3600) / 60);
  const segundos = total % 60;
  return horas > 0
    ? `${horas}:${String(minutos).padStart(2, "0")}:${String(segundos).padStart(2, "0")}`
    : `${minutos}:${String(segundos).padStart(2, "0")}`;
}
/* Fim item 4 */

export default
function PlayerAulaScreen({ detalhe, onBack, onOpenLesson, onFinish, onSaveProgress }) {


  /* Sprint item 10 - Bloquear captura de tela durante o curso - Ativa a proteção nativa contra captura de tela durante a aula */
  usePreventScreenCapture("aula-protegida");
  /* Fim item 10 */

  const aula = detalhe?.aula;
  const proximas = detalhe?.proximas || [];
  const videoRef = useRef(null);
  /* Sprint item 4 - Salvar o progresso das aulas para que o aluno continue de onde parou - Consulta, salva ou retoma a posição e a conclusão da aula */
  const onSaveProgressRef = useRef(onSaveProgress);
  const onFinishRef = useRef(onFinish);
  /* Fim item 4 */
  const aulaIdRef = useRef(aula?.id);
  /* Sprint item 4 - Salvar o progresso das aulas para que o aluno continue de onde parou - Consulta, salva ou retoma a posição e a conclusão da aula */
  const progressoAtualRef = useRef({ idAula: aula?.id, posicaoMillis: Number(aula?.progresso_segundos || 0) * 1000, carregado: false, concluido: false, inicioRegistrado: false });
  const ultimaPosicaoEnviadaRef = useRef(Number(aula?.progresso_segundos || 0));
  /* Fim item 4 */
  const filaSalvamentosRef = useRef(Promise.resolve());
  /* Sprint item 4 - Salvar o progresso das aulas para que o aluno continue de onde parou - Consulta, salva ou retoma a posição e a conclusão da aula */
  onSaveProgressRef.current = onSaveProgress;
  /* Fim item 4 */
  /* Sprint item 4 - Salvar o progresso das aulas para que o aluno continue de onde parou - Consulta, salva ou retoma a posição e a conclusão da aula */
  onFinishRef.current = onFinish;
  /* Fim item 4 */

/* Sprint item 4 - Salvar o progresso das aulas para que o aluno continue de onde parou - Ordena os salvamentos para preservar a última posição do vídeo */
function enfileirarProgresso(idAula, posicaoMillis, forcar = false) {
    const posicaoSegundos = Math.max(0, Number(posicaoMillis || 0) / 1000);
    if (!idAula || !Number.isFinite(posicaoSegundos)) return filaSalvamentosRef.current;

    if (!forcar && Math.abs(posicaoSegundos - ultimaPosicaoEnviadaRef.current) < 0.5) return filaSalvamentosRef.current;

    ultimaPosicaoEnviadaRef.current = posicaoSegundos;

    filaSalvamentosRef.current = filaSalvamentosRef.current
      .then(() => onSaveProgressRef.current?.(idAula, posicaoSegundos))
      .catch((error) => console.error("Erro ao salvar posicao da aula:", error));
    return filaSalvamentosRef.current;
  }
/* Fim item 4 */

/* Sprint item 4 - Salvar o progresso das aulas para que o aluno continue de onde parou - Salva a posição do vídeo antes de pausar ou sair */
function salvarPosicaoAtual(forcar = false, registrarMesmoPonto = false) {
    const atual = progressoAtualRef.current;
    if (!atual.idAula || !atual.carregado || atual.concluido) return filaSalvamentosRef.current;

    const diferenca = Math.abs(atual.posicaoMillis / 1000 - ultimaPosicaoEnviadaRef.current);



    if ((!forcar && diferenca < 1) || (diferenca < 0.5 && !registrarMesmoPonto)) return filaSalvamentosRef.current;
    return enfileirarProgresso(atual.idAula, atual.posicaoMillis, registrarMesmoPonto);
  }
/* Fim item 4 */

  /* Sprint item 4 - Salvar o progresso das aulas para que o aluno continue de onde parou - Consulta, salva ou retoma a posição e a conclusão da aula */
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
  /* Fim item 4 */

  /* Sprint item 4 - Salvar o progresso das aulas para que o aluno continue de onde parou - Consulta, salva ou retoma a posição e a conclusão da aula */
  useEffect(() => {
    const inscricao = AppState.addEventListener("change", (estado) => {
      if (estado !== "active") salvarPosicaoAtual(true, true);
    });

    return () => {
      inscricao.remove();
      salvarPosicaoAtual(true, true);
    };
  }, []);
  /* Fim item 4 */

  /* Sprint item 4 - Salvar o progresso das aulas para que o aluno continue de onde parou - Retoma a reprodução na posição anteriormente salva */
  function carregarVideo(status) {
    const atual = progressoAtualRef.current;
    if (!status?.isLoaded || atual.idAula !== aula?.id) return;

    const retomarEm = Math.max(0, Number(aula?.progresso_segundos || 0) * 1000);
    const posicaoAtual = Number(status.positionMillis || 0);
    const duracao = Number(status.durationMillis || 0);

    if (retomarEm > posicaoAtual + 250 && (!duracao || retomarEm < duracao) && videoRef.current) {
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
  /* Fim item 4 */

/* Sprint item 4 - Salvar o progresso das aulas para que o aluno continue de onde parou - Acompanha a reprodução e persiste a posição ou a conclusão */
function atualizarReproducao(status) {
    const atual = progressoAtualRef.current;
    if (!status?.isLoaded || atual.idAula !== aula?.id || !atual.carregado) return;

    atual.posicaoMillis = Number(status.positionMillis || 0);
    const estavaReproduzindo = Boolean(atual.estavaReproduzindo);
    atual.estavaReproduzindo = Boolean(status.isPlaying);

    if (status.isPlaying && !atual.inicioRegistrado) {
      atual.inicioRegistrado = true;
      ultimaPosicaoEnviadaRef.current = atual.posicaoMillis / 1000 - 0.5;
      enfileirarProgresso(atual.idAula, atual.posicaoMillis, true);
    }
    if (status.didJustFinish) {
      if (atual.concluido) return;

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


    salvarPosicaoAtual(!status.isPlaying);
  }
/* Fim item 4 */

  return (
    <ScrollView contentContainerStyle={globalStyles.page}>
      <Pressable style={styles.back} onPress={onBack}>
        <AppIcon name="arrow-back" size={18} color={colors.darkGreen} />
        <Text style={styles.backText}>Voltar</Text>
      </Pressable>

      {aula ? (
        <>
          {Number(aula.progresso_segundos) > 0 ? (
            /* Sprint item 4 - Salvar o progresso das aulas para que o aluno continue de onde parou - Consulta, salva ou retoma a posição e a conclusão da aula */ <Text style={styles.resumeHint}>
              Retomando de {formatarPosicaoAula(Number(aula.progresso_segundos) * 1000)}
            </Text> /* Fim item 4 */
          ) : null}
          {/* Sprint item 4 - Salvar o progresso das aulas para que o aluno continue de onde parou - Consulta, salva ou retoma a posição e a conclusão da aula */}
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
              progressUpdateIntervalMillis={1000}
              onLoad={carregarVideo}
              onPlaybackStatusUpdate={atualizarReproducao}
            />
            <View style={styles.overlayTitle} pointerEvents="none">
              <Text style={styles.videoTitle} numberOfLines={1}>{aula.titulo}</Text>
              <Text style={styles.videoDescription} numberOfLines={1}>{aula.descricao}</Text>
            </View>
          </View>
          {/* Fim item 4 */}

          {/* Sprint item 4 - Salvar o progresso das aulas para que o aluno continue de onde parou - Consulta, salva ou retoma a posição e a conclusão da aula */}
          <View style={styles.sectionHeader}>
            <Text style={styles.nextTitle}>Proximas video-aulas</Text>
            <View style={globalStyles.divider} />
          </View>
          {/* Fim item 4 */}
          {/* Sprint item 4 - Salvar o progresso das aulas para que o aluno continue de onde parou - Consulta, salva ou retoma a posição e a conclusão da aula */}
          <View style={styles.list}>
            {proximas.map((proxima) => (
              <Pressable key={proxima.id} style={[globalStyles.card, styles.card]} onPress={() => onOpenLesson(proxima)}>
                <View style={styles.preview}>
                  <Image source={{ uri: proxima.thumb ? resolverUrlMidia(proxima.thumb) : fallbackThumb }} style={styles.image} />
                  <View style={styles.playBadge}>
                    <AppIcon name="play" size={40} color={colors.black} />
                  </View>
                </View>
                <View style={styles.info}>
                  <Text style={styles.lessonTitle} numberOfLines={1}>{proxima.titulo}</Text>
                  <Text style={styles.description} numberOfLines={2}>{proxima.descricao}</Text>
                </View>
              </Pressable>
            ))}
          </View>
          {/* Fim item 4 */}
        </>
      ) : (
        <Text style={globalStyles.message}>Aula nao encontrada.</Text>
      )}
    </ScrollView>
  );
}

/* Sprint item 39 - Desenvolver todas as telas do aplicativo - Define os estilos dos componentes nativos desta tela */
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
/* Fim item 39 */
