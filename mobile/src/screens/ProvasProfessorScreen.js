import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { apiRequest } from "../api/client";
import AppIcon from "../components/AppIcon";
import { useFeedback } from "../components/FeedbackProvider";
import { colors, globalStyles } from "../styles";

const questaoVazia = () => ({ enunciado: "", tipo: "objetiva", alternativas: "" });

// Sprint item 20: oferece no app cadastro/publicação de provas e correção das respostas dos alunos.
export default function ProvasProfessorScreen({ curso, cursos = [], token, onBack }) {
  const { mostrarAlerta, confirmar } = useFeedback();
  const [idCurso, setIdCurso] = useState(String(curso?.id || cursos[0]?.id || ""));
  const cursoAtual = cursos.find((item) => String(item.id) === idCurso) || curso;
  const [prova, setProva] = useState(null);
  const [titulo, setTitulo] = useState("");
  const [questoes, setQuestoes] = useState([questaoVazia()]);
  const [respostas, setRespostas] = useState([]);
  const [feedbacks, setFeedbacks] = useState({});
  const [carregando, setCarregando] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const carregar = useCallback(async () => {
    if (!idCurso) return;
    setCarregando(true);
    try {
      const [dadosProva, dadosRespostas] = await Promise.all([
        apiRequest(`/professor/cursos/${idCurso}/prova`, {}, token),
        apiRequest("/professor/provas/respostas", {}, token)
      ]);
      setProva(dadosProva.prova);
      setTitulo(dadosProva.prova?.titulo || "");
      setQuestoes(dadosProva.questoes?.length ? dadosProva.questoes.map((item) => ({
        ...item,
        alternativas: Array.isArray(item.alternativas) ? item.alternativas.join("\n") : item.alternativas || ""
      })) : [questaoVazia()]);
      setRespostas(Array.isArray(dadosRespostas) ? dadosRespostas.filter((item) => String(item.id_curso) === idCurso) : []);
    } catch (error) {
      mostrarAlerta("Provas", error.message, "erro");
    } finally {
      setCarregando(false);
    }
  }, [idCurso, mostrarAlerta, token]);

  useEffect(() => { carregar(); }, [carregar]);

  function alterarQuestao(index, campo, valor) {
    setQuestoes((atuais) => atuais.map((item, i) => i === index ? { ...item, [campo]: valor } : item));
  }

  async function salvarProva() {
    setSalvando(true);
    try {
      await apiRequest(`/professor/cursos/${idCurso}/prova`, {
        method: "POST",
        body: JSON.stringify({ titulo, questoes: questoes.map((item) => ({
          ...item,
          alternativas: item.tipo === "objetiva" ? item.alternativas.split("\n").map((opcao) => opcao.trim()).filter(Boolean) : []
        })) })
      }, token);
      mostrarAlerta("Provas", "Rascunho salvo. Publique a prova para liberar a publicação do curso.", "sucesso");
      await carregar();
    } catch (error) {
      mostrarAlerta("Provas", error.message, "erro");
    } finally {
      setSalvando(false);
    }
  }

  async function publicarProva() {
    if (!prova?.id) return;
    try {
      await apiRequest(`/professor/provas/${prova.id}/publicar`, { method: "PATCH" }, token);
      await carregar();
      mostrarAlerta("Provas", "Prova publicada.", "sucesso");
    } catch (error) {
      mostrarAlerta("Provas", error.message, "erro");
    }
  }

  async function corrigir(item, aprovado) {
    const confirmado = await confirmar({
      titulo: aprovado ? "Aprovar prova" : "Reprovar prova",
      descricao: `Confirmar a correção de ${item.aluno}?`,
      textoCancelar: "Voltar",
      textoConfirmar: aprovado ? "Aprovar" : "Reprovar"
    });
    if (!confirmado) return;
    try {
      await apiRequest(`/professor/provas/respostas/${item.id}`, {
        method: "PATCH",
        body: JSON.stringify({ aprovado, feedback: feedbacks[item.id] || "" })
      }, token);
      await carregar();
      mostrarAlerta("Provas", aprovado ? "Prova aprovada." : "Prova reprovada. O aluno poderá tentar novamente após 1 dia.", "sucesso");
    } catch (error) {
      mostrarAlerta("Provas", error.message, "erro");
    }
  }

  return (
    <ScrollView contentContainerStyle={globalStyles.page}>
      <Pressable style={styles.back} onPress={onBack}><AppIcon name="arrow-back" size={18} color={colors.darkGreen} /><Text style={styles.backText}>Voltar aos cursos</Text></Pressable>
      <Text style={globalStyles.title}>Provas dos cursos</Text>
      <Text style={globalStyles.eyebrow}>Publique uma prova antes de tornar o curso público.</Text>
      <View style={globalStyles.divider} />
      <View style={styles.coursePicker}>
        <Text style={styles.label}>Curso</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.courseOptions}>
          {cursos.map((item) => <Pressable key={item.id} onPress={() => setIdCurso(String(item.id))} style={[styles.courseOption, String(item.id) === idCurso && styles.selectedCourse]}><Text style={[styles.courseOptionText, String(item.id) === idCurso && styles.selectedCourseText]}>{item.titulo}</Text></Pressable>)}
        </ScrollView>
      </View>
      {!cursoAtual ? <Text style={globalStyles.message}>Nenhum curso disponível.</Text> : <>
        {carregando ? <ActivityIndicator color={colors.green} /> : null}
        <View style={[globalStyles.card, styles.card]}>
          <Text style={styles.sectionTitle}>{prova?.publicada ? "Prova publicada" : "Cadastro da prova"}</Text>
          <Text style={styles.label}>Título</Text>
          <TextInput value={titulo} onChangeText={setTitulo} editable={!prova?.publicada} style={globalStyles.input} />
          {questoes.map((questao, index) => <View style={styles.question} key={questao.id || index}>
            <Text style={styles.questionTitle}>Questão {index + 1}</Text>
            <TextInput value={questao.enunciado} onChangeText={(value) => alterarQuestao(index, "enunciado", value)} editable={!prova?.publicada} placeholder="Enunciado" multiline style={[globalStyles.input, styles.multiline]} />
            <View style={styles.types}>
              {[["objetiva", "Objetiva"], ["dissertativa", "Dissertativa"]].map(([value, label]) => <Pressable key={value} onPress={() => alterarQuestao(index, "tipo", value)} disabled={prova?.publicada} style={[styles.type, questao.tipo === value && styles.typeActive]}><Text style={questao.tipo === value && styles.typeActiveText}>{label}</Text></Pressable>)}
            </View>
            {questao.tipo === "objetiva" ? <TextInput value={questao.alternativas} onChangeText={(value) => alterarQuestao(index, "alternativas", value)} editable={!prova?.publicada} placeholder="Alternativas, uma por linha" multiline style={[globalStyles.input, styles.multiline]} /> : null}
            {!prova?.publicada && questoes.length > 1 ? <Pressable onPress={() => setQuestoes((atual) => atual.filter((_, i) => i !== index))}><Text style={styles.remove}>Remover questão</Text></Pressable> : null}
          </View>)}
          {!prova?.publicada ? <>
            <Pressable style={globalStyles.secondaryButton} onPress={() => setQuestoes((atual) => [...atual, questaoVazia()])}><Text style={globalStyles.secondaryText}>Adicionar questão</Text></Pressable>
            <Pressable style={globalStyles.primaryButton} onPress={salvarProva} disabled={salvando}><Text style={globalStyles.buttonText}>{salvando ? "Salvando..." : "Salvar rascunho"}</Text></Pressable>
            {prova ? <Pressable style={globalStyles.primaryButton} onPress={publicarProva}><Text style={globalStyles.buttonText}>Publicar prova</Text></Pressable> : null}
          </> : <Text style={styles.published}>Prova publicada e vinculada ao curso.</Text>}
        </View>
        <View style={[globalStyles.card, styles.card]}>
          <Text style={styles.sectionTitle}>Respostas aguardando correção</Text>
          {respostas.filter((item) => item.status === 0).length === 0 ? <Text style={globalStyles.message}>Nenhuma resposta pendente neste curso.</Text> : null}
          {respostas.filter((item) => item.status === 0).map((item) => {
            const respostasAluno = item.respostas && typeof item.respostas === "object" ? item.respostas : {};
            return <View style={styles.submission} key={item.id}>
              <Text style={styles.questionTitle}>{item.aluno}</Text><Text style={styles.courseLabel}>{item.curso} · {item.criado_em ? new Date(item.criado_em).toLocaleString("pt-BR") : ""}</Text>
              {Object.entries(respostasAluno).map(([idQuestao, valor], index) => {
                const pergunta = item.questoes?.find((questao) => String(questao.id) === idQuestao);
                return <Text style={styles.answer} key={idQuestao}>{pergunta?.enunciado || `Questão ${index + 1}`}: {String(valor)}</Text>;
              })}
              <TextInput value={feedbacks[item.id] || ""} onChangeText={(value) => setFeedbacks((atual) => ({ ...atual, [item.id]: value }))} placeholder="Feedback (opcional)" multiline style={[globalStyles.input, styles.multiline]} />
              <View style={styles.actions}><Pressable style={styles.approve} onPress={() => corrigir(item, true)}><Text style={styles.actionText}>Aprovar</Text></Pressable><Pressable style={styles.reject} onPress={() => corrigir(item, false)}><Text style={styles.actionText}>Reprovar</Text></Pressable></View>
            </View>;
          })}
        </View>
      </>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  back: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 12 }, backText: { color: colors.darkGreen, fontWeight: "700" },
  coursePicker: { marginVertical: 14, gap: 8 }, label: { color: colors.darkGreen, fontWeight: "700" }, courseOptions: { gap: 8 },
  courseOption: { padding: 10, borderWidth: 1, borderColor: colors.border, borderRadius: 8, backgroundColor: colors.white }, selectedCourse: { backgroundColor: colors.darkGreen },
  courseOptionText: { color: colors.black }, selectedCourseText: { color: colors.white, fontWeight: "700" },
  card: { padding: 16, gap: 12, marginBottom: 16 }, sectionTitle: { color: colors.darkGreen, fontSize: 21, fontWeight: "800" },
  question: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 12, gap: 10 }, questionTitle: { color: colors.black, fontSize: 16, fontWeight: "800" },
  multiline: { minHeight: 82, textAlignVertical: "top" }, types: { flexDirection: "row", gap: 8 }, type: { padding: 8, borderWidth: 1, borderColor: colors.border, borderRadius: 7 },
  typeActive: { backgroundColor: colors.darkGreen }, typeActiveText: { color: colors.white, fontWeight: "700" }, remove: { color: colors.red, fontWeight: "700" }, published: { color: colors.darkGreen, fontWeight: "700" },
  submission: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 14, gap: 8 }, courseLabel: { color: colors.textMuted }, answer: { color: colors.black, lineHeight: 20 },
  actions: { flexDirection: "row", gap: 10 }, approve: { flex: 1, alignItems: "center", padding: 12, backgroundColor: colors.darkGreen, borderRadius: 8 }, reject: { flex: 1, alignItems: "center", padding: 12, backgroundColor: colors.red, borderRadius: 8 }, actionText: { color: colors.white, fontWeight: "800" }
});
