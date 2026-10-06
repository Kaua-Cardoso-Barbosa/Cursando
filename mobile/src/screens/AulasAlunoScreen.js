import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Image, Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { resolverUrlMidia } from "../api/client";
import { colors, globalStyles } from "../styles";

const fallbackThumb = "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=900";

function formatarPosicaoAula(segundos) {
  const total = Math.max(0, Math.floor(Number(segundos) || 0));
  const horas = Math.floor(total / 3600);
  const minutos = Math.floor((total % 3600) / 60);
  const restante = total % 60;
  return horas > 0
    ? `${horas}:${String(minutos).padStart(2, "0")}:${String(restante).padStart(2, "0")}`
    : `${minutos}:${String(restante).padStart(2, "0")}`;
}

export default function AulasAlunoScreen({ detalhe, carregando, onRefresh, onBack, onOpenLesson, onSubmitExam, onDownloadCertificate, onReview }) {
  // Exibe apenas as aulas disponibilizadas pelo detalhe do curso retornado pela API.
  const curso = detalhe?.curso;
  const aulas = detalhe?.aulas || [];
  const materiais = detalhe?.materiais || [];
  const prova = detalhe?.prova;
  const [respostas, setRespostas] = useState({});
  const [avaliacao, setAvaliacao] = useState({ nota: "5", comentario: "" });
  const [baixandoCertificado, setBaixandoCertificado] = useState(false);

  async function baixarCertificado() {
    setBaixandoCertificado(true);
    try {
      await onDownloadCertificate?.();
    } finally {
      setBaixandoCertificado(false);
    }
  }

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
              {/* Sprint item 4: indica a posicao salva antes de reabrir esta aula. */}
              {Number(aula.progresso_segundos) > 0 ? (
                <Text style={styles.resumeLabel}>
                  Continuar de {formatarPosicaoAula(aula.progresso_segundos)}
                </Text>
              ) : null}
            </View>
          </Pressable>
        ))}
        {!carregando && aulas.length === 0 ? <Text style={globalStyles.message}>Nenhuma aula publicada neste curso.</Text> : null}
      </View>

      <View style={styles.materials}>
        <Text style={styles.sectionTitle}>Complementos</Text>
        {materiais.map((material) => (
          <View key={material.id} style={[globalStyles.card, styles.materialCard]}>
            <Text style={styles.materialTitle}>{material.titulo}</Text>
            <Text style={styles.materialType}>{material.tipo}</Text>
            <Text style={styles.description}>{material.descricao}</Text>
            {material.bloqueado ? (
              <Text style={styles.locked}>Disponivel apos inscricao no curso.</Text>
            ) : (
              <Pressable onPress={() => Linking.openURL(material.url)}>
                <Text style={styles.openLink}>Abrir material</Text>
              </Pressable>
            )}
          </View>
        ))}
        {!carregando && materiais.length === 0 ? <Text style={globalStyles.message}>Nenhum complemento disponivel.</Text> : null}
      </View>

      {Number(curso?.progresso || 0) >= 100 && prova?.prova ? (
        <View style={styles.materials}>
          <Text style={styles.sectionTitle}>Prova final</Text>
          {prova.envio ? (
            <Text style={styles.locked}>
              Status: {prova.envio.status === 1 ? "Aprovado" : prova.envio.status === 2 ? "Reprovado" : "Aguardando correcao"}
            </Text>
          ) : null}
          {prova.questoes?.map((questao) => (
            <View key={questao.id} style={[globalStyles.card, styles.materialCard]}>
              <Text style={styles.materialTitle}>{questao.enunciado}</Text>
              <TextInput
                value={respostas[questao.id] || ""}
                onChangeText={(valor) => setRespostas({ ...respostas, [questao.id]: valor })}
                style={globalStyles.input}
                multiline
              />
            </View>
          ))}
          <Pressable style={globalStyles.primaryButton} onPress={() => onSubmitExam?.(respostas)}>
            <Text style={globalStyles.buttonText}>Enviar prova</Text>
          </Pressable>
          {prova.envio?.status === 1 ? (
            <>
              {/* Sprint item 5: libera o PDF no app depois da conclusao e aprovacao na prova final. */}
              <Pressable style={globalStyles.primaryButton} onPress={baixarCertificado} disabled={baixandoCertificado}>
                <Text style={globalStyles.buttonText}>{baixandoCertificado ? "Preparando certificado..." : "Baixar certificado PDF"}</Text>
              </Pressable>
              <View style={[globalStyles.card, styles.materialCard]}>
                <Text style={styles.materialTitle}>Avaliar curso</Text>
                <TextInput
                  value={avaliacao.nota}
                  onChangeText={(nota) => setAvaliacao({ ...avaliacao, nota })}
                  keyboardType="number-pad"
                  style={globalStyles.input}
                />
                <TextInput
                  value={avaliacao.comentario}
                  onChangeText={(comentario) => setAvaliacao({ ...avaliacao, comentario })}
                  placeholder="Comentario"
                  style={globalStyles.input}
                />
                <Pressable style={globalStyles.primaryButton} onPress={() => onReview?.({ nota: Number(avaliacao.nota), comentario: avaliacao.comentario })}>
                  <Text style={globalStyles.buttonText}>Enviar avaliacao</Text>
                </Pressable>
              </View>
            </>
          ) : null}
        </View>
      ) : null}
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
  resumeLabel: {
    color: colors.darkGreen,
    fontSize: 13,
    fontWeight: "700",
    marginTop: 6
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
  },
  materials: {
    gap: 12,
    marginTop: 26
  },
  sectionTitle: {
    color: colors.black,
    fontSize: 24,
    lineHeight: 30
  },
  materialCard: {
    padding: 14
  },
  materialTitle: {
    color: colors.black,
    fontSize: 18,
    fontWeight: "700"
  },
  materialType: {
    color: colors.darkGreen,
    fontSize: 13,
    fontWeight: "700",
    marginTop: 3
  },
  locked: {
    color: colors.textMuted,
    fontSize: 14,
    marginTop: 8
  },
  openLink: {
    color: colors.darkGreen,
    fontSize: 15,
    fontWeight: "700",
    marginTop: 8,
    textDecorationLine: "underline"
  }
});
