import BotaoVoltar from '../components/BotaoVoltar_39';
import AulaCard from '../components/AulaCard_39';
import { fonteImagemAula } from '../imagens_padrao_39';
import AppIcon from "../components/AppIcon_39";
import { ResizeMode, Video } from "expo-av";
import { useEffect, useRef, useState } from "react";
/* Sprint item 26 - Bloquear gravação de tela durante o curso - Carrega o recurso nativo usado também para proteger contra gravação da tela */
import * as ScreenCapture from "expo-screen-capture";
/* Fim item 26 */
import { ActivityIndicator, AppState, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { getApiBaseUrl } from "../api/client_3_17";
import { colors, globalStyles } from "../styles_39";


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
function PlayerAulaScreen({ detalhe, token, onBack, onOpenLesson, onFinish, onSaveProgress }) {


  /* Sprint item 10 - Bloquear captura de tela durante o curso - Ativa a proteção nativa contra captura de tela durante a aula */
  const [protecaoPronta, setProtecaoPronta] = useState(false);
  const [erroProtecao, setErroProtecao] = useState("");
  const [tentativaProtecao, setTentativaProtecao] = useState(0);
  const [appAtivo, setAppAtivo] = useState(AppState.currentState === "active");
  const [expandido, setExpandido] = useState(false);
  const [statusVideo, setStatusVideo] = useState({});
  /* Fim item 10 */

  const aula = detalhe?.aula;
  const playlist = detalhe?.playlist || [];
  const videoRef = useRef(null);
  const larguraBarraRef = useRef(0);
  const [videoProntoId, setVideoProntoId] = useState(null);
  const [erroVideo, setErroVideo] = useState("");
  const [tentativaVideo, setTentativaVideo] = useState(0);
  const urlVideo = aula?.id ? `${getApiBaseUrl()}/aluno/aulas/${aula.id}/mobile.mp4` : "";
  const videoPronto = videoProntoId === aula?.id;
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

  // A aula só é exibida depois que o sistema confirma o bloqueio de captura.
  useEffect(() => {
    let ativo = true;
    let bloqueioSolicitado = false;
    let privacidadeAtiva = false;
    const chave = `aula-protegida-${Date.now()}-${Math.random()}`;
    setProtecaoPronta(false);
    setErroProtecao("");

    const configuracao = (async () => {
      try {
        if (!await ScreenCapture.isAvailableAsync()) {
          throw new Error("Abra a aula no aplicativo Android ou iOS para assistir com proteção de tela.");
        }
        bloqueioSolicitado = true;
        await ScreenCapture.preventScreenCaptureAsync(chave);
        if (ativo && Platform.OS === "ios") {
          await ScreenCapture.enableAppSwitcherProtectionAsync(1);
          privacidadeAtiva = true;
        }
        if (ativo) setProtecaoPronta(true);
      } catch (error) {
        console.error("Erro ao proteger a aula:", error);
        if (ativo) setErroProtecao("Não foi possível ativar a proteção da aula. Tente novamente no aplicativo.");
      }
    })();

    return () => {
      ativo = false;
      // Espera a ativação terminar antes de liberar; evita deixar a tela bloqueada ao sair rapidamente.
      configuracao.then(async () => {
        try {
          if (privacidadeAtiva) await ScreenCapture.disableAppSwitcherProtectionAsync();
        } catch (error) {
          console.error("Erro ao liberar a privacidade da aula:", error);
        } finally {
          if (bloqueioSolicitado) {
            try {
              await ScreenCapture.allowScreenCaptureAsync(chave);
            } catch (error) {
              console.error("Erro ao liberar a proteção da aula:", error);
            }
          }
        }
      });
    };
  }, [tentativaProtecao]);

  // O MP4 é preparado a partir dos arquivos das aulas já cadastradas.
  useEffect(() => {
    let ativo = true;
    let controlador = null;

    async function prepararVideo() {
      setVideoProntoId(null);
      setErroVideo("");
      if (!aula?.id || !token) {
        if (ativo) setErroVideo("Não foi possível autenticar a reprodução desta aula.");
        return;
      }

      while (ativo) {
        try {
          controlador = new AbortController();
          const limite = setTimeout(() => controlador.abort(), 12000);
          let resposta;
          try {
            resposta = await fetch(urlVideo, {
              method: "HEAD",
              headers: { Authorization: `Bearer ${token}` },
              signal: controlador.signal,
            });
          } finally {
            clearTimeout(limite);
          }
          if (!ativo) return;
          if (resposta.status === 202) {
            await new Promise((resolver) => setTimeout(resolver, 2000));
            continue;
          }
          if (!resposta.ok) {
            throw new Error(resposta.status === 402
              ? "Sua assinatura precisa estar ativa para assistir à aula."
              : "Não foi possível preparar este vídeo.");
          }
          setVideoProntoId(aula.id);
          return;
        } catch (error) {
          if (ativo) setErroVideo(error.name === "AbortError"
            ? "A conexão demorou para responder. Tente novamente."
            : error.message || "Não foi possível carregar o vídeo.");
          return;
        }
      }
    }

    prepararVideo();
    return () => {
      ativo = false;
      controlador?.abort();
    };
  }, [aula?.id, token, urlVideo, tentativaVideo]);

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
    function atualizarFoco(ativo) {
      setAppAtivo(ativo);
      if (!ativo) {
        salvarPosicaoAtual(true, true);
        videoRef.current?.pauseAsync().catch((error) => console.error("Erro ao pausar a aula:", error));
      }
    }
    const inscricao = AppState.addEventListener("change", (estado) => atualizarFoco(estado === "active"));
    const aoPerderFoco = Platform.OS === "android" ? AppState.addEventListener("blur", () => atualizarFoco(false)) : null;
    const aoGanharFoco = Platform.OS === "android" ? AppState.addEventListener("focus", () => atualizarFoco(AppState.currentState === "active")) : null;

    return () => {
      inscricao.remove();
      aoPerderFoco?.remove();
      aoGanharFoco?.remove();
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
    setStatusVideo(status);
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

  async function controlarVideo(acao) {
    if (!protecaoPronta || !appAtivo || !statusVideo.isLoaded) return;
    try {
      await acao(videoRef.current);
    } catch (error) {
      console.error("Erro no controle da aula:", error);
    }
  }

  function buscarPosicao(posicao) {
    const limite = Number(statusVideo.durationMillis || 0);
    return controlarVideo((video) => video?.setPositionAsync(Math.min(limite, Math.max(0, posicao))));
  }

  return (
    <ScrollView contentContainerStyle={[globalStyles.page, expandido && styles.paginaExpandida]} scrollEnabled={!expandido}>
      {!expandido && <BotaoVoltar onPress={onBack}>Voltar</BotaoVoltar>}

      {aula ? (
        <>
          {!expandido && Number(aula.progresso_segundos) > 0 ? (
            /* Sprint item 4 - Salvar o progresso das aulas para que o aluno continue de onde parou - Consulta, salva ou retoma a posição e a conclusão da aula */ <Text style={styles.resumeHint}>
              Retomando de {formatarPosicaoAula(Number(aula.progresso_segundos) * 1000)}
            </Text> /* Fim item 4 */
          ) : null}
          {/* Sprint item 4 - Salvar o progresso das aulas para que o aluno continue de onde parou - Consulta, salva ou retoma a posição e a conclusão da aula */}
          <View style={[styles.playerWrap, expandido && styles.playerExpandido]}>
            <View style={[styles.playerSurface, expandido && styles.superficieExpandida]}>
            {videoPronto && protecaoPronta ? <Video
              key={aula.id}
              ref={videoRef}
              source={{ uri: urlVideo, headers: { Authorization: `Bearer ${token}` } }}
              posterSource={fonteImagemAula(aula.thumb)}
              usePoster
              style={styles.player}
              useNativeControls={false}
              resizeMode={ResizeMode.CONTAIN}
              positionMillis={Math.max(0, Number(aula.progresso_segundos || 0) * 1000)}
              progressUpdateIntervalMillis={1000}
              onLoad={carregarVideo}
              onPlaybackStatusUpdate={atualizarReproducao}
              onError={() => {
                setVideoProntoId(null);
                setErroVideo("Não foi possível reproduzir este vídeo. Tente novamente.");
              }}
            /> : (
              <View style={styles.videoEspera}>
                {erroProtecao || erroVideo ? (
                  <>
                    <Text style={styles.videoEsperaTexto}>{erroProtecao || erroVideo}</Text>
                    <Pressable style={styles.botaoTentar} onPress={() => erroProtecao
                      ? setTentativaProtecao((valor) => valor + 1)
                      : setTentativaVideo((valor) => valor + 1)}>
                      <Text style={styles.botaoTentarTexto}>Tentar novamente</Text>
                    </Pressable>
                  </>
                ) : (
                  <>
                    <ActivityIndicator color={colors.white} />
                    <Text style={styles.videoEsperaTexto}>{protecaoPronta ? "Preparando vídeo para reprodução..." : "Ativando proteção da aula..."}</Text>
                  </>
                )}
              </View>
            )}
            {videoPronto && protecaoPronta && <View style={styles.overlayTitle} pointerEvents="none">
              <Text style={styles.videoTitle} numberOfLines={1}>{aula.titulo}</Text>
              <Text style={styles.videoDescription} numberOfLines={1}>{aula.descricao}</Text>
            </View>}
            {!appAtivo && <View style={styles.coberturaPrivacidade}><Text style={styles.videoEsperaTexto}>Aula pausada</Text></View>}
            </View>
            {videoPronto && protecaoPronta && <View style={styles.controles}>
              <View style={styles.linhaControles}>
                <Pressable accessibilityRole="button" accessibilityLabel="Voltar dez segundos" style={styles.controleBotao} onPress={() => buscarPosicao(Number(statusVideo.positionMillis || 0) - 10000)}>
                  <Text style={styles.controleTexto}>−10s</Text>
                </Pressable>
                <Pressable accessibilityRole="button" accessibilityLabel={statusVideo.isPlaying ? "Pausar aula" : "Reproduzir aula"} style={styles.controleBotao} onPress={() => controlarVideo((video) => statusVideo.isPlaying ? video?.pauseAsync() : video?.playAsync())}>
                  <AppIcon name={statusVideo.isPlaying ? "pause" : "play"} size={22} color={colors.white} />
                </Pressable>
                <Pressable accessibilityRole="button" accessibilityLabel="Avançar dez segundos" style={styles.controleBotao} onPress={() => buscarPosicao(Number(statusVideo.positionMillis || 0) + 10000)}>
                  <Text style={styles.controleTexto}>+10s</Text>
                </Pressable>
                <Text style={styles.tempoVideo}>{formatarPosicaoAula(statusVideo.positionMillis)} / {formatarPosicaoAula(statusVideo.durationMillis)}</Text>
              </View>
              <View style={styles.linhaControles}>
                <Pressable accessibilityRole="button" accessibilityLabel="Ir para posição na aula" style={styles.barraBusca} onLayout={(evento) => { larguraBarraRef.current = evento.nativeEvent.layout.width; }} onPress={(evento) => {
                  if (larguraBarraRef.current > 0) buscarPosicao(evento.nativeEvent.locationX / larguraBarraRef.current * Number(statusVideo.durationMillis || 0));
                }}>
                  <View style={styles.trilho}><View style={[styles.progressoVideo, { width: `${Math.min(100, Number(statusVideo.positionMillis || 0) / Math.max(1, Number(statusVideo.durationMillis || 0)) * 100)}%` }]} /></View>
                </Pressable>
                <Pressable accessibilityRole="button" accessibilityLabel={expandido ? "Recolher vídeo" : "Ampliar vídeo"} style={styles.controleBotao} onPress={() => setExpandido((valor) => !valor)}>
                  <AppIcon name={expandido ? "compress" : "expand"} size={18} color={colors.white} />
                </Pressable>
              </View>
            </View>}
          </View>
          {/* Fim item 4 */}

          {/* Sprint item 4 - Salvar o progresso das aulas para que o aluno continue de onde parou - Consulta, salva ou retoma a posição e a conclusão da aula */}
          <View style={[styles.sectionHeader, expandido && styles.oculto]}>
            <Text style={styles.nextTitle}>Aulas do curso</Text>
            <View style={globalStyles.divider} />
          </View>
          {/* Fim item 4 */}
          {/* Sprint item 4 - Salvar o progresso das aulas para que o aluno continue de onde parou - Consulta, salva ou retoma a posição e a conclusão da aula */}
          <View style={[styles.list, expandido && styles.oculto]}>
            {playlist.map((grupo) => (
              <View key={grupo.id ?? 'sem-modulo'} style={styles.moduloPlaylist}>
                <Text style={styles.tituloModuloPlaylist}>{grupo.numero ? `Módulo ${grupo.numero} · ${grupo.titulo}` : grupo.titulo}</Text>
                {grupo.aulas.map((proxima) => {
                  const atual = Number(proxima.id) === Number(aula?.id);
                  return <AulaCard key={proxima.id} aula={proxima} atual={atual} onOpen={atual ? undefined : onOpenLesson} />;
                })}
              </View>
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
  moduloPlaylist: { gap: 12 },
  tituloModuloPlaylist: { color: colors.darkGreen, fontSize: 16, fontWeight: "700", lineHeight: 23, paddingVertical: 10 },
  aulaAtual: { backgroundColor: "#def2e4", borderWidth: 1, borderColor: "#8dc6a1" },
  indicadorAtual: { color: "#075132", fontSize: 13, fontWeight: "700", marginTop: 6 },
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
    overflow: "hidden",
    borderWidth: 1.5,
    borderColor: colors.black,
    borderRadius: 8,
    backgroundColor: colors.black,
    marginBottom: 24
  },
  playerSurface: {
    width: "100%",
    aspectRatio: 16 / 9,
    position: "relative"
  },
  paginaExpandida: {
    flex: 1,
    paddingHorizontal: 0,
    paddingTop: 0,
    paddingBottom: 0,
    backgroundColor: colors.black
  },
  playerExpandido: {
    flex: 1,
    marginBottom: 0,
    borderRadius: 0
  },
  superficieExpandida: {
    flex: 1,
    aspectRatio: undefined
  },
  oculto: { display: "none" },
  coberturaPrivacidade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.black,
    alignItems: "center",
    justifyContent: "center"
  },
  controles: { paddingHorizontal: 10, paddingVertical: 6, backgroundColor: "#161616" },
  linhaControles: { flexDirection: "row", alignItems: "center", gap: 6 },
  controleBotao: { minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" },
  controleTexto: { color: colors.white, fontSize: 14, fontWeight: "700" },
  tempoVideo: { flex: 1, color: colors.white, fontSize: 12, textAlign: "right" },
  barraBusca: { flex: 1, minHeight: 40, justifyContent: "center" },
  trilho: { height: 5, backgroundColor: "#666666", borderRadius: 3, overflow: "hidden" },
  progressoVideo: { height: "100%", backgroundColor: colors.green },
  player: {
    width: "100%",
    height: "100%"
  },
  videoEspera: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 20
  },
  videoEsperaTexto: {
    color: colors.white,
    textAlign: "center",
    fontSize: 14
  },
  botaoTentar: {
    borderRadius: 6,
    backgroundColor: colors.darkGreen,
    paddingHorizontal: 16,
    paddingVertical: 9
  },
  botaoTentarTexto: {
    color: colors.white,
    fontWeight: "700"
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
    color: colors.ink,
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
    color: colors.ink,
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
