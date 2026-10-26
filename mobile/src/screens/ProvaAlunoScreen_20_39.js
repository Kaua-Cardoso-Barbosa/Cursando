import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import AppIcon from "../components/AppIcon_39";
import { useFeedback } from "../components/FeedbackProvider_39";
import { colors, globalStyles } from "../styles";

export default /* Sprint item 20 - Permitir que o instrutor cadastre provas para validar a conclusão do curso */
/* Sprint item 39 - Desenvolver todas as telas do aplicativo */
function ProvaAlunoScreen({ curso, prova, onBack, onSubmit }) {
  const { mostrarAlerta } = useFeedback();
  const [respostas, setRespostas] = useState({});
  const [enviando, setEnviando] = useState(false);
  const envio = prova?.envio;
  const questoes = prova?.questoes || [];
  const podeRefazer = envio?.status === 2 && (!envio.pode_tentar_em || Date.now() >= new Date(envio.pode_tentar_em).getTime());
  const podeResponder = !envio || podeRefazer;
  const respondidas = questoes.filter((questao) => String(respostas[questao.id] || "").trim()).length;

  async function enviar() {
    if (respondidas !== questoes.length || !questoes.length || enviando) return;
    setEnviando(true);
    try {
      const resultado = await onSubmit?.(respostas);
      setRespostas({});
      mostrarAlerta("Prova enviada", resultado?.mensagem?.descricao || "Suas respostas foram registradas.", "sucesso");
    } catch (error) {
      mostrarAlerta("Não foi possível enviar", error.message, "erro");
    } finally {
      setEnviando(false);
    }
  }

  return <ScrollView contentContainerStyle={globalStyles.page}>
    <Pressable style={styles.back} onPress={onBack}><AppIcon name="arrow-back" size={19} color={colors.darkGreen} /><Text style={styles.backText}>Voltar ao curso</Text></Pressable>
    <View style={styles.hero}>
      <Text style={styles.eyebrow}>AVALIAÇÃO FINAL · {curso?.titulo || "Curso"}</Text>
      <Text style={styles.title}>{prova?.prova?.titulo || "Prova final"}</Text>
      <Text style={styles.subtitle}>{questoes.length} {questoes.length === 1 ? "questão" : "questões"} · Nota de 0 a 100 · Aprovação com {prova?.prova?.nota_minima ?? 70} pontos</Text>
      {podeResponder ? <Text style={styles.progress}>{respondidas} de {questoes.length} respondidas</Text> : null}
    </View>
    {envio ? <View style={styles.result}>
      <Text style={styles.resultTitle}>{envio.status === 1 ? "Aprovado" : envio.status === 2 ? "Reprovado" : "Aguardando correção das dissertativas"}</Text>
      {envio.nota != null ? <><Text style={styles.score}>{envio.nota} <Text style={styles.scoreUnit}>/ 100 pontos{envio.status === 0 ? " até agora" : ""}</Text></Text>
      <Text style={styles.resultDetail}>{envio.acertos ?? 0} acertos de {envio.total_questoes || questoes.length} questões{envio.status === 0 ? " · resultado parcial" : ""}</Text></> : <Text style={styles.resultDetail}>Esta tentativa antiga não tem pontuação registrada.</Text>}
      {envio.feedback ? <Text style={styles.feedback}>{envio.feedback}</Text> : null}
      {envio.status === 2 && !podeRefazer ? <Text style={styles.feedback}>Nova tentativa após {envio.pode_tentar_em ? new Date(envio.pode_tentar_em).toLocaleString("pt-BR") : "24 horas"}.</Text> : null}
    </View> : null}
    {podeResponder ? <>
      {questoes.map((questao, index) => <View key={questao.id} style={styles.question}>
        <Text style={styles.number}>QUESTÃO {index + 1} DE {questoes.length}</Text>
        <Text style={styles.statement}>{questao.enunciado}</Text>
        {questao.tipo === "objetiva" ? (questao.alternativas || []).map((opcao, opcaoIndex) => {
          const selecionada = respostas[questao.id] === opcao;
          return <Pressable key={`${questao.id}-${opcaoIndex}`} accessibilityRole="radio" accessibilityState={{ selected: selecionada }} onPress={() => setRespostas((atuais) => ({ ...atuais, [questao.id]: opcao }))} style={[styles.option, selecionada && styles.optionSelected]}>
            <View style={[styles.radio, selecionada && styles.radioSelected]} />
            <Text style={[styles.optionText, selecionada && styles.optionTextSelected]}>{opcao}</Text>
          </Pressable>;
        }) : <TextInput value={respostas[questao.id] || ""} onChangeText={(valor) => setRespostas((atuais) => ({ ...atuais, [questao.id]: valor }))} placeholder="Escreva sua resposta" placeholderTextColor={colors.textMuted} multiline textAlignVertical="top" style={styles.essay} />}
      </View>)}
      <Pressable style={[globalStyles.primaryButton, (respondidas !== questoes.length || enviando) && styles.disabled]} disabled={respondidas !== questoes.length || enviando || !questoes.length} onPress={enviar}><Text style={globalStyles.buttonText}>{enviando ? "Enviando..." : "Enviar prova"}</Text></Pressable>
      <Text style={styles.hint}>Confira as respostas antes de enviar.</Text>
    </> : null}
  </ScrollView>;
}
/* Fim item 39 */
/* Fim item 20 */

const styles = StyleSheet.create({
  back: { flexDirection: "row", alignItems: "center", gap: 7, marginBottom: 16 }, backText: { color: colors.darkGreen, fontWeight: "700" },
  hero: { padding: 18, borderRadius: 16, backgroundColor: colors.darkGreen, gap: 8, marginBottom: 16 },
  eyebrow: { color: "#CDE7D8", fontSize: 11, fontWeight: "800" }, title: { color: colors.white, fontSize: 25, fontWeight: "800" },
  subtitle: { color: colors.white, fontSize: 14 }, progress: { color: "#CDE7D8", fontWeight: "700", marginTop: 4 },
  result: { padding: 18, borderRadius: 14, backgroundColor: colors.softGray, borderWidth: 1, borderColor: colors.border, gap: 7, marginBottom: 16 },
  resultTitle: { color: colors.darkGreen, fontSize: 18, fontWeight: "800" }, score: { color: colors.darkGreen, fontSize: 32, fontWeight: "800" },
  scoreUnit: { fontSize: 14, fontWeight: "600" }, resultDetail: { color: colors.black }, feedback: { color: colors.textMuted, lineHeight: 20 },
  question: { backgroundColor: colors.white, borderColor: colors.border, borderWidth: 1, borderRadius: 14, padding: 16, gap: 12, marginBottom: 14 },
  number: { color: colors.green, fontSize: 12, fontWeight: "800" }, statement: { color: colors.black, fontSize: 17, lineHeight: 24, fontWeight: "700" },
  option: { flexDirection: "row", alignItems: "center", gap: 10, padding: 13, borderWidth: 1, borderColor: colors.border, borderRadius: 10 },
  optionSelected: { backgroundColor: colors.softGray, borderColor: colors.darkGreen }, optionText: { flex: 1, color: colors.black, lineHeight: 20 }, optionTextSelected: { color: colors.darkGreen, fontWeight: "700" },
  radio: { width: 18, height: 18, borderWidth: 2, borderColor: colors.border, borderRadius: 9 }, radioSelected: { borderColor: colors.darkGreen, backgroundColor: colors.darkGreen },
  essay: { minHeight: 130, padding: 12, borderWidth: 1, borderColor: colors.border, borderRadius: 10, color: colors.black },
  disabled: { opacity: 0.5 }, hint: { color: colors.textMuted, textAlign: "center", marginTop: 10, marginBottom: 20 }
});
