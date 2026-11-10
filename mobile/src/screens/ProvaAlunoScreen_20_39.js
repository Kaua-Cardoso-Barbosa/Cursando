import BotaoVoltar from '../components/BotaoVoltar_39';
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useFeedback } from "../components/FeedbackProvider_39";
import { colors, globalStyles } from "../styles_39";
import HistoricoProvas, { corResultado } from '../components/HistoricoProvas_20_39';

export default
function ProvaAlunoScreen({ curso, prova, token, onBack, onSubmit }) {
  const { mostrarAlerta } = useFeedback();
  /* Sprint item 20 - Permitir que o instrutor cadastre provas para validar a conclusão do curso - Prepara os dados e o estado da avaliação */
  const [respostas, setRespostas] = useState({});
  /* Fim item 20 */
  const [enviando, setEnviando] = useState(false);
  useEffect(() => { setRespostas({}); }, [prova?.prova?.id]);
  /* Sprint item 20 - Permitir que o instrutor cadastre provas para validar a conclusão do curso - Prepara as questões, as respostas e a correção da prova */
  const envio = prova?.envio;
  const questoes = prova?.questoes || [];
  /* Fim item 20 */
  const podeRefazer = envio?.status === 2 && (!envio.pode_tentar_em || Date.now() >= new Date(envio.pode_tentar_em).getTime());
  const podeResponder = Boolean(prova?.pode_responder && prova?.prova);
  /* Sprint item 20 - Permitir que o instrutor cadastre provas para validar a conclusão do curso - Prepara as questões, as respostas e a correção da prova */
  const respondidas = questoes.filter((questao) => String(respostas[questao.id] || "").trim()).length;
  /* Fim item 20 */

  async function enviar() {
    /* Sprint item 20 - Permitir que o instrutor cadastre provas para validar a conclusão do curso - Prepara as questões, as respostas e a correção da prova */
    if (respondidas !== questoes.length || !questoes.length || enviando) return;
    /* Fim item 20 */
    setEnviando(true);
    try {
      const resultado = await onSubmit?.(respostas, prova.prova.id);
      setRespostas({});
      mostrarAlerta("Prova enviada", resultado?.mensagem?.descricao || "Suas respostas foram registradas.", "sucesso");
    } catch (error) {
      mostrarAlerta("Não foi possível enviar", error.message, "erro");
    } finally {
      setEnviando(false);
    }
  }

  return <ScrollView contentContainerStyle={globalStyles.page}>
    <BotaoVoltar onPress={onBack}>Voltar ao curso</BotaoVoltar>
    {/* Sprint item 20 - Permitir que o instrutor cadastre provas para validar a conclusão do curso - Prepara as questões, as respostas e a correção da prova */}
    <View style={styles.hero}>
      <Text style={styles.eyebrow}>AVALIAÇÃO FINAL · {curso?.titulo || "Curso"}</Text>
      <Text style={styles.title}>{prova?.prova?.titulo || "Provas do curso"}</Text>
      {prova?.prova ? <Text style={styles.subtitle}>Versão {prova.prova.versao} · {questoes.length} questões · mínimo {prova.prova.nota_minima}% de acertos</Text> : <Text style={styles.subtitle}>Nenhuma prova vigente. Seu histórico continua disponível.</Text>}
      {podeResponder ? <Text style={styles.progress}>{respondidas} de {questoes.length} respondidas</Text> : null}
    </View>
    {prova?.motivo ? <Text style={styles.feedback}>{prova.motivo}</Text> : null}
    {/* Fim item 20 */}
    {envio ? /* Sprint item 20 - Permitir que o instrutor cadastre provas para validar a conclusão do curso - Prepara as questões, as respostas e a correção da prova */ <View style={styles.result}>
      <Text style={[styles.resultTitle, { color: corResultado(envio.status) }]}>{envio.status === 1 ? "Aprovado" : envio.status === 2 ? "Reprovado" : "Aguardando correção das dissertativas"}</Text>
      {envio.status === 0 ? <Text style={styles.resultDetail}>A nota e o resultado serão disponibilizados ao concluir a correção.</Text> : envio.nota != null ? <><Text style={[styles.score, { color: corResultado(envio.status) }]}>{envio.nota}% <Text style={styles.scoreUnit}>de acertos</Text></Text>
      <Text style={styles.resultDetail}>{envio.acertos ?? 0} acertos de {envio.total_questoes || questoes.length} questões</Text></> : <Text style={styles.resultDetail}>Esta tentativa antiga não tem pontuação registrada.</Text>}
      {envio.feedback ? <Text style={styles.feedback}>{envio.feedback}</Text> : null}
      {envio.status === 2 && !podeRefazer ? <Text style={styles.feedback}>Nova tentativa após {envio.pode_tentar_em ? new Date(envio.pode_tentar_em).toLocaleString("pt-BR") : "24 horas"}.</Text> : null}
    </View> /* Fim item 20 */ : null}
    {podeResponder ? <>
      {questoes.map((questao, index) => <View key={questao.id} style={styles.question}>
        <Text style={styles.number}>QUESTÃO {index + 1} DE {questoes.length}</Text>
        <Text style={styles.statement}>{questao.enunciado}</Text>
        {questao.tipo === "objetiva" ? (questao.alternativas || []).map((opcao, opcaoIndex) => {
          /* Sprint item 20 - Permitir que o instrutor cadastre provas para validar a conclusão do curso - Prepara as questões, as respostas e a correção da prova */
          const selecionada = respostas[questao.id] === opcao;
          /* Fim item 20 */
          return <Pressable key={`${questao.id}-${opcaoIndex}`} accessibilityRole="radio" accessibilityState={{ selected: selecionada }} onPress={() => setRespostas((atuais) => ({ ...atuais, [questao.id]: opcao }))} style={[styles.option, selecionada && styles.optionSelected]}>
            <View style={[styles.radio, selecionada && styles.radioSelected]} />
            <Text style={[styles.optionText, selecionada && styles.optionTextSelected]}>{opcao}</Text>
          </Pressable>;
        }) : <TextInput value={respostas[questao.id] || ""} onChangeText={(valor) => setRespostas((atuais) => ({ ...atuais, [questao.id]: valor }))} placeholder="Escreva sua resposta" placeholderTextColor={colors.textMuted} multiline textAlignVertical="top" style={styles.essay} />}
      </View>)}
      {/* Sprint item 20 - Permitir que o instrutor cadastre provas para validar a conclusão do curso - Prepara as questões, as respostas e a correção da prova */}
      <Pressable style={[globalStyles.primaryButton, (respondidas !== questoes.length || enviando) && styles.disabled]} disabled={respondidas !== questoes.length || enviando || !questoes.length} onPress={enviar}><Text style={globalStyles.buttonText}>{enviando ? "Enviando..." : "Enviar prova"}</Text></Pressable>
      {/* Fim item 20 */}
      <Text style={styles.hint}>Confira as respostas antes de enviar.</Text>
    </> : null}
    <HistoricoProvas token={token} idCurso={curso.id} atualizar={envio?.id || 0} />
  </ScrollView>;
}

/* Sprint item 39 - Desenvolver todas as telas do aplicativo - Define os estilos dos componentes nativos desta tela */
const styles = StyleSheet.create({
  back: { flexDirection: "row", alignItems: "center", gap: 7, marginBottom: 16 }, backText: { color: colors.darkGreen, fontWeight: "700" },
  hero: { padding: 18, borderRadius: 16, backgroundColor: colors.darkGreen, gap: 8, marginBottom: 16 },
  eyebrow: { color: "#CDE7D8", fontSize: 11, fontWeight: "800" }, title: { color: colors.white, fontSize: 25, fontWeight: "800" },
  subtitle: { color: colors.white, fontSize: 14 }, progress: { color: "#CDE7D8", fontWeight: "700", marginTop: 4 },
  result: { padding: 18, borderRadius: 14, backgroundColor: colors.softGray, borderWidth: 1, borderColor: colors.border, gap: 7, marginBottom: 16 },
  resultTitle: { color: colors.darkGreen, fontSize: 18, fontWeight: "800" }, score: { color: colors.darkGreen, fontSize: 32, fontWeight: "800" },
  scoreUnit: { fontSize: 14, fontWeight: "600" }, resultDetail: { color: colors.ink }, feedback: { color: colors.textMuted, lineHeight: 20 },
  question: { backgroundColor: colors.white, borderColor: colors.border, borderWidth: 1, borderRadius: 14, padding: 16, gap: 12, marginBottom: 14 },
  number: { color: colors.green, fontSize: 12, fontWeight: "800" }, statement: { color: colors.ink, fontSize: 17, lineHeight: 24, fontWeight: "700" },
  option: { flexDirection: "row", alignItems: "center", gap: 10, padding: 13, borderWidth: 1, borderColor: colors.border, borderRadius: 10 },
  optionSelected: { backgroundColor: colors.softGray, borderColor: colors.darkGreen }, optionText: { flex: 1, color: colors.ink, lineHeight: 20 }, optionTextSelected: { color: colors.darkGreen, fontWeight: "700" },
  radio: { width: 18, height: 18, borderWidth: 2, borderColor: colors.border, borderRadius: 9 }, radioSelected: { borderColor: colors.darkGreen, backgroundColor: colors.darkGreen },
  essay: { minHeight: 130, padding: 12, borderWidth: 1, borderColor: colors.border, borderRadius: 10, color: colors.ink },
  disabled: { opacity: 0.5 }, hint: { color: colors.textMuted, textAlign: "center", marginTop: 10, marginBottom: 20 }
});
/* Fim item 39 */
