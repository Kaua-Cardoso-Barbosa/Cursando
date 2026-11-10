import Abas from '../components/Abas_39';
import BotaoVoltar from '../components/BotaoVoltar_39';
import AulaCard from '../components/AulaCard_39';
import { fonteImagemCurso } from '../imagens_padrao_39';
import { useEffect, useState } from "react";
import { Image, Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import { getApiBaseUrl } from "../api/client_3_17";
import EtapaModulo from "../components/EtapaModulo_6_39";
import AvaliacoesCurso from '../components/AvaliacoesCurso_39';
import { corAvaliacao } from '../components/CursoCard_39';
import { colors, globalStyles } from "../styles_39";


function ImagemComplemento({ material, token }) {
  const [visivel, setVisivel] = useState(false);
  const [uri, setUri] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");

  async function alternarImagem() {
    if (visivel) {
      setVisivel(false);
      return;
    }
    if (uri) {
      setVisivel(true);
      return;
    }

    setCarregando(true);
    setErro("");
    try {
      const extensao = (material.nome_arquivo || "").split(".").pop().toLowerCase();
      const destino = `${FileSystem.cacheDirectory}complemento-imagem-${material.id}.${extensao || "png"}`;
      const download = await FileSystem.downloadAsync(`${getApiBaseUrl()}${material.arquivo_url}`, destino, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (download.status < 200 || download.status >= 300) throw new Error("Não foi possível abrir a imagem.");
      setUri(download.uri);
      setVisivel(true);
    } catch (erroDownload) {
      setErro(erroDownload.message);
    } finally {
      setCarregando(false);
    }
  }

  return <View>
    <Pressable onPress={alternarImagem} disabled={carregando}><Text style={styles.openLink}>{carregando ? "Carregando imagem..." : visivel ? "Esconder imagem" : "Ver imagem"}</Text></Pressable>
    {visivel && uri ? <Image source={{ uri }} style={styles.imagemComplemento} resizeMode="contain" accessibilityLabel={material.titulo} /> : null}
    {erro ? <Text style={styles.erroImagem}>{erro}</Text> : null}
  </View>;
}

/* Sprint item 4 - Salvar o progresso das aulas para que o aluno continue de onde parou - Formata a posição salva para exibir o ponto de retomada */
/* Fim item 4 */

export default
function AulasAlunoScreen({ detalhe, token, carregando, onRefresh, onBack, onOpenLesson, onOpenMaterial, onEnroll, onOpenExam, onDownloadCertificate, onReview, onOpenProfile, moduloSelecionado, onModuloChange }) {

  const curso = detalhe?.curso;
  const aulas = detalhe?.aulas || [];

  /* Sprint item 6 - Permitir que o instrutor divida o curso em módulos - Mantém os dados do módulo e sua seleção */
  const modulos = detalhe?.modulos || [];
  const aulasSemModulo = aulas.filter((aula) => !aula.id_modulo);
  /* Fim item 6 */
  const materiais = detalhe?.materiais || [];
  const prova = detalhe?.prova;
  const podeAvaliar = Boolean(detalhe?.avaliacao?.pode_avaliar);
  const [avaliacao, setAvaliacao] = useState({ nota: 5, comentario: "" });
  const [enviandoAvaliacao, setEnviandoAvaliacao] = useState(false);
  const [avaliacaoEnviada, setAvaliacaoEnviada] = useState(false);
  useEffect(() => {
    setAvaliacao({ nota: 5, comentario: "" });
    setAvaliacaoEnviada(false);
  }, [curso?.id]);
  /* Sprint item 5 - Gerar certificado ao concluir o curso - Solicita ou apresenta o certificado de conclusão do curso */
  const [baixandoCertificado, setBaixandoCertificado] = useState(false);
  /* Fim item 5 */
  /* Sprint item 6 - Permitir que o instrutor divida o curso em módulos - Mantém os dados do módulo e sua seleção */
  const [moduloLocal, setModuloLocal] = useState(null);
  const moduloAberto = onModuloChange ? moduloSelecionado : moduloLocal;
  const setModuloAberto = onModuloChange || setModuloLocal;
  /* Fim item 6 */
  const [abaCurso, setAbaCurso] = useState("modulos");
  const moduloAtual = modulos.find(m => Number(m.id) === Number(moduloAberto));

  /* Sprint item 5 - Gerar certificado ao concluir o curso - Solicita o PDF e inicia o download do certificado */
  async function baixarCertificado() {
    setBaixandoCertificado(true);
    try {
      await onDownloadCertificate?.();
    } finally {
      setBaixandoCertificado(false);
    }
  }
  /* Fim item 5 */

  async function enviarAvaliacao() {
    if (!podeAvaliar || enviandoAvaliacao || avaliacaoEnviada) return;
    setEnviandoAvaliacao(true);
    try {
      const enviada = await onReview?.({ nota: Number(avaliacao.nota), comentario: avaliacao.comentario });
      if (enviada) setAvaliacaoEnviada(true);
    } finally {
      setEnviandoAvaliacao(false);
    }
  }

  return (
    <ScrollView
      contentContainerStyle={globalStyles.page}
      refreshControl={<RefreshControl refreshing={carregando} onRefresh={onRefresh} />}
    >
      <BotaoVoltar onPress={moduloAtual && abaCurso === "modulos" ? () => setModuloAberto(null) : onBack}>{moduloAtual && abaCurso === "modulos" ? "Voltar aos módulos" : "Voltar aos cursos"}</BotaoVoltar>

      {(!moduloAtual || abaCurso !== "modulos") && <View style={styles.courseHero}>
        <Image
          source={fonteImagemCurso(curso?.imagem)}
          style={styles.courseImage}
        />
        <View style={styles.courseInfo}>
          <Text style={styles.courseKicker}>{modulos.length ? "Modulos do curso" : "Video-aulas"}</Text>
          <Text style={styles.courseTitle}>{curso?.titulo || "Curso"}</Text>
          {curso?.professores?.length ? curso.professores.map(p => <Pressable key={p.id} onPress={() => onOpenProfile?.(p.identificador)} disabled={!p.identificador}><Text style={[styles.courseDescription, { color: colors.darkGreen, textDecorationLine: 'underline' }]}>Professor(a): {p.nome}</Text></Pressable>) : curso?.professor ? <Text style={styles.courseDescription}>Professor(a): {curso.professor}</Text> : null}
          {curso?.descricao ? <Text style={styles.courseDescription}>{curso.descricao}</Text> : null}
          {curso && !curso.matriculado ? (
            <Pressable style={styles.enrollButton} onPress={() => onEnroll?.(curso)} disabled={carregando}>
              <Text style={styles.enrollText}>{carregando ? "Inscrevendo..." : "Inscrever-se"}</Text>
            </Pressable>
          ) : null}
        </View>
      </View>}

      {/* Sprint item 20 - Permitir que o instrutor cadastre provas para validar a conclusão do curso - Prepara as questões, as respostas e a correção da prova */}
      <Abas valor={abaCurso} onChange={setAbaCurso} rotulo="Seções do curso" opcoes={[["modulos", "Módulos"], ["complementos", "Complementos"], ...(curso?.matriculado && prova ? [["prova", "Provas e histórico"]] : [])]} />
      {/* Fim item 20 */}

      {abaCurso === "modulos" && <View style={styles.list}>
        {moduloAtual ? <>
          <View style={{ gap: 8 }}><Text style={globalStyles.title}>Módulo {modulos.indexOf(moduloAtual) + 1} · {moduloAtual.titulo}</Text>{!!moduloAtual.descricao && <Text style={styles.courseDescription}>{moduloAtual.descricao}</Text>}<Text style={styles.courseDescription}>{moduloAtual.aulas?.length || 0} aulas · {(moduloAtual.aulas || []).filter(a => a.assistida).length} concluídas</Text></View>
          {(moduloAtual.aulas || []).map((aula, indice) => <AulaCard key={aula.id} aula={aula} compacto numero={indice + 1} onOpen={curso?.matriculado ? onOpenLesson : undefined} />)}
          {!moduloAtual.aulas?.length && <Text style={globalStyles.message}>Nenhuma aula publicada neste módulo.</Text>}
        </> : <>
          {modulos.map((modulo, indice) => <EtapaModulo key={modulo.id} modulo={modulo} numero={indice + 1} ultima={indice === modulos.length - 1} onAbrir={() => setModuloAberto(Number(modulo.id))} />)}
          {!!modulos.length && !!aulasSemModulo.length && <Text style={styles.sectionTitle}>Aulas sem módulo</Text>}
          {(modulos.length === 0 ? aulas : aulasSemModulo).map((aula, indice) => <AulaCard key={aula.id} aula={aula} compacto numero={indice + 1} onOpen={curso?.matriculado ? onOpenLesson : undefined} />)}
          {!carregando && !aulas.length && !modulos.length && <Text style={globalStyles.message}>Nenhuma aula publicada neste curso.</Text>}
        </>}
      </View>}

      {abaCurso === "complementos" && <View style={styles.materials}>
        <Text style={styles.sectionTitle}>Complementos</Text>
        {materiais.map((material) => (
          /* Sprint item 21 - Permitir que o instrutor publique materiais do curso, como livros, apostilas e códigos - Publica, lista ou permite baixar os materiais complementares */ <View key={material.id} style={[globalStyles.card, styles.materialCard]}>
            <Text style={styles.materialTitle}>{material.titulo}</Text>
            <Text style={styles.materialType}>{material.tipo}</Text>
            <Text style={styles.description}>{material.descricao}</Text>
            {material.bloqueado ? (
              <Text style={styles.locked}>Prévia: disponível após inscrição. Links e arquivos ficam bloqueados.</Text>
            ) : material.arquivo_url ? (
              <View>
                <Pressable onPress={() => onOpenMaterial?.(material)}><Text style={styles.openLink}>Baixar {material.nome_arquivo || "arquivo"}</Text></Pressable>
                {material.tipo === "imagem" ? <ImagemComplemento material={material} token={token} /> : null}
              </View>
            ) : material.url ? (
              <Pressable onPress={() => Linking.openURL(material.url)}>
                <Text style={styles.openLink}>Abrir material</Text>
              </Pressable>
            ) : (
              <Text style={styles.locked}>Material indisponível.</Text>
            )}
          </View> /* Fim item 21 */
        ))}
        {!carregando && materiais.length === 0 ? <Text style={globalStyles.message}>Nenhum complemento disponivel.</Text> : null}
      </View>}

      {abaCurso === "prova" && prova ? (
        <View style={styles.materials}>
          <Text style={styles.sectionTitle}>Provas e histórico</Text>
          {/* Sprint item 20 - Permitir que o instrutor cadastre provas para validar a conclusão do curso - Prepara as questões, as respostas e a correção da prova */}
          <Text style={styles.description}>{prova.prova ? `Versão ${prova.prova.versao} · mínimo ${prova.prova.nota_minima}% de acertos` : 'Nenhuma prova vigente.'}</Text>
          {/* Fim item 20 */}
          {prova.envio ? /* Sprint item 20 - Permitir que o instrutor cadastre provas para validar a conclusão do curso - Prepara as questões, as respostas e a correção da prova */ <Text style={styles.locked}>{prova.envio.status === 1 ? "Aprovado" : prova.envio.status === 2 ? "Reprovado" : "Aguardando correção"}{prova.envio.nota != null ? ` · ${prova.envio.nota} pontos · ${prova.envio.acertos} de ${prova.envio.total_questoes || prova.questoes?.length || 0} acertos` : ""}</Text> /* Fim item 20 */ : null}
          {/* Sprint item 20 - Permitir que o instrutor cadastre provas para validar a conclusão do curso - Prepara as questões, as respostas e a correção da prova */}
          <Pressable style={globalStyles.primaryButton} onPress={onOpenExam}><Text style={globalStyles.buttonText}>Prova vigente e meu histórico</Text></Pressable>
          {/* Fim item 20 */}
                                                                                                                                                                        
          {prova.aprovado_curso ? (
            <>
                                                                                                                                                
              {/* Sprint item 5 - Gerar certificado ao concluir o curso - Solicita ou apresenta o certificado de conclusão do curso */}
              <Pressable style={globalStyles.primaryButton} onPress={baixarCertificado} disabled={baixandoCertificado}>
                <Text style={globalStyles.buttonText}>{baixandoCertificado ? "Preparando certificado..." : "Baixar certificado PDF"}</Text>
              </Pressable>
              {/* Fim item 5 */}

            </>
          ) : null}
        </View>
      ) : null}

                                                                                                                                                                  
      {curso?.matriculado ? (
              <View style={[globalStyles.card, styles.materialCard, styles.ratingCard]}>
                                                                                                                                                                                                 
                {/* Sprint item 27 - Permitir que o aluno avalie o curso após a conclusão - Envia ou apresenta a nota e o comentário da avaliação do aluno */}
                <Text style={styles.materialTitle}>Avaliar curso</Text>
                <Text style={styles.description}>Assista e conclua pelo menos 75% das aulas para dar uma nota ao curso.</Text>
                <Text style={styles.description}>{detalhe?.avaliacao?.mensagem || "Carregando seu progresso de aulas..."}</Text>
                {/* Fim item 27 */}
                <View style={styles.ratingOptions} accessibilityRole="radiogroup" accessibilityLabel="Nota de 0 a 5 estrelas">
                  {/* Sprint item 27 - Permitir que o aluno avalie o curso após a conclusão - Envia ou apresenta a nota e o comentário da avaliação do aluno */}
                  <Pressable accessibilityRole="radio" accessibilityState={{ selected: avaliacao.nota === 0 }} accessibilityLabel="0 estrelas" onPress={() => { setAvaliacao({ ...avaliacao, nota: 0 }); setAvaliacaoEnviada(false); }} disabled={!podeAvaliar || enviandoAvaliacao} style={[styles.ratingChoice, avaliacao.nota === 0 && styles.ratingZeroSelected]}>
                    <Text style={[styles.ratingZero, avaliacao.nota === 0 && styles.ratingSelectedText]}>0</Text>
                  </Pressable>
                  {/* Fim item 27 */}
                  {[1, 2, 3, 4, 5].map((nota) => (
                    /* Sprint item 27 - Permitir que o aluno avalie o curso após a conclusão - Envia ou apresenta a nota e o comentário da avaliação do aluno */ <Pressable key={nota} accessibilityRole="radio" accessibilityState={{ selected: avaliacao.nota === nota }} accessibilityLabel={`${nota} ${nota === 1 ? "estrela" : "estrelas"}`} onPress={() => { setAvaliacao({ ...avaliacao, nota }); setAvaliacaoEnviada(false); }} disabled={!podeAvaliar || enviandoAvaliacao} style={styles.ratingChoice}>
                      <Text style={[styles.ratingStar, nota <= avaliacao.nota && { color: corAvaliacao(avaliacao.nota) }]}>★</Text>
                    </Pressable> /* Fim item 27 */
                  ))}
                  {/* Sprint item 27 - Permitir que o aluno avalie o curso após a conclusão - Envia ou apresenta a nota e o comentário da avaliação do aluno */}
                  <Text style={styles.ratingCount}>{avaliacao.nota} de 5</Text>
                  {/* Fim item 27 */}
                </View>
                {/* Sprint item 27 - Permitir que o aluno avalie o curso após a conclusão - Envia ou apresenta a nota e o comentário da avaliação do aluno */}
                <TextInput
                  value={avaliacao.comentario}
                  onChangeText={(comentario) => { setAvaliacao({ ...avaliacao, comentario }); setAvaliacaoEnviada(false); }}
                  placeholder="Escreva sua avaliacao (opcional)"
                  style={globalStyles.input}
                  multiline
                  textAlignVertical="top"
                  editable={podeAvaliar && !enviandoAvaliacao}
                />
                {/* Fim item 27 */}
                {/* Sprint item 27 - Permitir que o aluno avalie o curso após a conclusão - Envia ou apresenta a nota e o comentário da avaliação do aluno */}
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ disabled: !podeAvaliar || enviandoAvaliacao || avaliacaoEnviada, busy: enviandoAvaliacao }}
                  style={({ pressed }) => [globalStyles.primaryButton, pressed && styles.botaoAvaliacaoPressionado, avaliacaoEnviada && styles.botaoAvaliacaoEnviada]}
                  onPress={enviarAvaliacao}
                  disabled={!podeAvaliar || enviandoAvaliacao || avaliacaoEnviada}
                >
                  <Text style={globalStyles.buttonText}>{enviandoAvaliacao ? "Enviando avaliação..." : avaliacaoEnviada ? "✓ Avaliação salva" : "Enviar avaliação"}</Text>
                </Pressable>
                {/* Fim item 27 */}
              </View>
      ) : null}

      <View style={styles.reviewsSection}><AvaliacoesCurso itens={detalhe?.avaliacoes || []} onOpenProfile={onOpenProfile} /></View>
    </ScrollView>
  );
}

/* Sprint item 39 - Desenvolver todas as telas do aplicativo - Define os estilos dos componentes nativos desta tela */
const styles = StyleSheet.create({
  botaoAvaliacaoPressionado: { backgroundColor: colors.deepGreen, transform: [{ scale: 0.97 }], elevation: 0 },
  botaoAvaliacaoEnviada: { backgroundColor: colors.darkGreen, borderColor: colors.darkGreen },
  tabs: { gap: 8, marginBottom: 18, paddingRight: 12 },
  tab: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, backgroundColor: colors.softGray },
  tabActive: { backgroundColor: colors.darkGreen },
  tabText: { color: colors.darkGreen, fontWeight: "700" }, tabTextActive: { color: colors.white },
  header: {
    marginBottom: 26
  },
  courseHero: {
    borderWidth: 1.4,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.white,
    overflow: "hidden",
    marginBottom: 24
  },
  courseImage: {
    width: "100%",
    aspectRatio: 16 / 9,
    backgroundColor: "#dddddd"
  },
  courseInfo: {
    padding: 16,
    gap: 7
  },
  courseKicker: {
    color: colors.darkGreen,
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase"
  },
  courseTitle: {
    color: colors.ink,
    fontSize: 25,
    lineHeight: 30,
    fontWeight: "700"
  },
  courseDescription: {
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 21
  },
  enrollButton: {
    minHeight: 46,
    borderRadius: 8,
    backgroundColor: colors.green,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    paddingHorizontal: 18
  },
  enrollText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "700"
  },
  list: {
    gap: 20
  },
  moduleCard: {
    overflow: "hidden",
    padding: 0
  },
  moduleHeader: {
    minHeight: 76,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12
  },
  moduleImage: {
    width: 72,
    height: 58,
    borderRadius: 6,
    backgroundColor: "#dddddd"
  },
  moduleInfo: {
    flex: 1
  },
  moduleLessons: {
    gap: 14,
    padding: 12,
    paddingTop: 0
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
    color: colors.ink,
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

  ratingCard: { marginTop: 24, gap: 12 },
  reviewsSection: { gap: 12, marginTop: 28 },
  reviewCard: { padding: 14, gap: 10 },
  reviewHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  reviewAvatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.softGray },
  reviewAvatarFallback: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.softGray, alignItems: "center", justifyContent: "center" },
  reviewAuthor: { flex: 1, gap: 2 },
  reviewName: { color: colors.ink, fontSize: 15, fontWeight: "800" },
  reviewStars: { color: "#e5a400", fontSize: 17 },
  reviewEmptyStars: { color: colors.border, fontSize: 17 },
  reviewScore: { color: colors.textMuted, fontSize: 12 },
  reviewComment: { color: colors.ink, fontSize: 14, lineHeight: 20 },
  sectionTitle: {
    color: colors.ink,
    fontSize: 24,
    lineHeight: 30
  },
  materialCard: {
    padding: 14
  },

  ratingOptions: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 5 },
  ratingChoice: { minWidth: 36, minHeight: 36, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.border, borderRadius: 7, backgroundColor: colors.white },
  ratingZeroSelected: { borderColor: colors.darkGreen, backgroundColor: colors.darkGreen },
  ratingZero: { color: colors.darkGreen, fontSize: 14, fontWeight: "800" },
  ratingSelectedText: { color: colors.white },
  ratingStar: { color: colors.textMuted, fontSize: 24 },
  ratingStarSelected: { color: "#e5a400" },
  ratingCount: { color: colors.textMuted, fontSize: 13, marginLeft: 5 },
  materialTitle: {
    color: colors.ink,
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
  },
  imagemComplemento: { width: "100%", height: 260, marginTop: 10, borderRadius: 8, backgroundColor: colors.softGray },
  erroImagem: { color: colors.red, marginTop: 8 }
});
/* Fim item 39 */
