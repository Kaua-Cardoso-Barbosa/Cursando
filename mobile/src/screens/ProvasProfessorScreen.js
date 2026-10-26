import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { apiRequest } from "../api/client";
import AppIcon from "../components/AppIcon";
import { useFeedback } from "../components/FeedbackProvider";
import { colors, globalStyles } from "../styles";

const questaoVazia = () => ({ enunciado: "", tipo: "objetiva", alternativas: "", resposta_esperada: "" });

// Sprint item 20: no app o professor cadastra, edita, publica e exclui a prova.
// A API apaga tentativas antigas quando as questões mudam, para que o gabarito
// mostrado ao aluno e ao professor corresponda sempre à versão atual.
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
      setFeedbacks((atual) => ({ ...Object.fromEntries((Array.isArray(dadosRespostas) ? dadosRespostas : []).map((item) => [item.id, item.feedback || ""])), ...atual }));
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
    if (questoes.some((item) => item.tipo === "objetiva" && (() => {
      const opcoes = item.alternativas.split("\n").map((opcao) => opcao.trim()).filter(Boolean);
      return opcoes.length < 2 || !item.resposta_esperada?.trim() || !opcoes.includes(item.resposta_esperada.trim());
    })())) {
      mostrarAlerta("Provas", "Preencha duas alternativas ou mais e selecione a correta em cada questão objetiva.", "erro");
      return;
    }
    setSalvando(true);
    try {
      await apiRequest(`/professor/cursos/${idCurso}/prova`, {
        method: "POST",
        body: JSON.stringify({ titulo, questoes: questoes.map((item) => ({
          ...item,
          alternativas: item.tipo === "objetiva" ? item.alternativas.split("\n").map((opcao) => opcao.trim()).filter(Boolean) : []
        })) })
      }, token);
      mostrarAlerta("Provas", prova?.publicada ? "Alterações salvas. As tentativas anteriores foram removidas." : "Rascunho salvo. Publique a prova para liberar a publicação do curso.", "sucesso");
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

  async function excluirProva() {
    const confirmado = await confirmar({
      titulo: "Excluir prova",
      descricao: "A prova, suas questões e todas as respostas dos alunos serão removidas.",
      textoCancelar: "Voltar",
      textoConfirmar: "Excluir"
    });
    if (!confirmado) return;
    try {
      await apiRequest(`/professor/cursos/${idCurso}/prova`, { method: "DELETE" }, token);
      await carregar();
      mostrarAlerta("Provas", "Prova removida. Agora você pode criar outra.", "sucesso");
    } catch (error) {
      mostrarAlerta("Provas", error.message, "erro");
    }
  }

  async function corrigirQuestao(item, questao, correta) {
    try {
      const dados = await apiRequest(`/professor/provas/respostas/${item.id}/questoes/${questao.id}`, {
        method: "PATCH", body: JSON.stringify({ correta, feedback: feedbacks[item.id] || "" })
      }, token);
      await carregar();
      mostrarAlerta("Provas", dados.resultado?.status ? `Prova concluída: ${dados.resultado.nota} pontos, ${dados.resultado.acertos} de ${dados.resultado.total_questoes} acertos.` : "Questão corrigida.", "sucesso");
    } catch (error) {
      mostrarAlerta("Provas", error.message, "erro");
    }
  }

  return (
    <ScrollView contentContainerStyle={globalStyles.page}>
      <Pressable style={styles.back} onPress={onBack}><AppIcon name="arrow-back" size={18} color={colors.darkGreen} /><Text style={styles.backText}>Voltar aos cursos</Text></Pressable>
      <Text style={globalStyles.title}>Provas dos cursos</Text>
      <Text style={globalStyles.eyebrow}>Objetivas corrigidas automaticamente · dissertativas corrigidas por questão · aprovação com {prova?.nota_minima ?? 70} pontos.</Text>
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
          <Text style={styles.sectionTitle}>{prova?.publicada ? "Editar prova publicada" : "Cadastro da prova"}</Text>
          {prova?.publicada ? <Text style={styles.courseLabel}>Salvar mudanças remove as respostas da versão anterior.</Text> : null}
          <Text style={styles.label}>Título</Text>
          <TextInput value={titulo} onChangeText={setTitulo} style={globalStyles.input} />
          {questoes.map((questao, index) => <View style={styles.question} key={questao.id || index}>
            <Text style={styles.questionTitle}>Questão {index + 1}</Text>
            <TextInput value={questao.enunciado} onChangeText={(value) => alterarQuestao(index, "enunciado", value)} placeholder="Enunciado" multiline style={[globalStyles.input, styles.multiline]} />
            <View style={styles.types}>
              {[["objetiva", "Objetiva"], ["dissertativa", "Dissertativa"]].map(([value, label]) => <Pressable key={value} onPress={() => alterarQuestao(index, "tipo", value)} style={[styles.type, questao.tipo === value && styles.typeActive]}><Text style={questao.tipo === value && styles.typeActiveText}>{label}</Text></Pressable>)}
            </View>
            {questao.tipo === "objetiva" ? <>
              <TextInput value={questao.alternativas} onChangeText={(value) => {
                alterarQuestao(index, "alternativas", value);
                if (!value.split("\n").map((opcao) => opcao.trim()).includes(questao.resposta_esperada)) alterarQuestao(index, "resposta_esperada", "");
              }} placeholder="Alternativas, uma por linha" multiline style={[globalStyles.input, styles.multiline]} />
              <Text style={styles.label}>Toque na alternativa correta</Text>
              {questao.alternativas.split("\n").map((opcao) => opcao.trim()).filter(Boolean).map((opcao, opcaoIndice) => <Pressable key={`${opcaoIndice}-${opcao}`} onPress={() => alterarQuestao(index, "resposta_esperada", opcao)} style={[styles.correctOption, questao.resposta_esperada === opcao && styles.correctOptionSelected]}><Text style={questao.resposta_esperada === opcao && styles.selectedCourseText}>{questao.resposta_esperada === opcao ? "✓ " : "○ "}{opcao}</Text></Pressable>)}
            </> : null}
            {questoes.length > 1 ? <Pressable onPress={() => setQuestoes((atual) => atual.filter((_, i) => i !== index))}><Text style={styles.remove}>Remover questão</Text></Pressable> : null}
          </View>)}
          <>
            <Pressable style={globalStyles.secondaryButton} onPress={() => setQuestoes((atual) => [...atual, questaoVazia()])}><Text style={globalStyles.secondaryText}>Adicionar questão</Text></Pressable>
            <Pressable style={globalStyles.primaryButton} onPress={salvarProva} disabled={salvando}><Text style={globalStyles.buttonText}>{salvando ? "Salvando..." : prova?.publicada ? "Salvar alterações" : "Salvar rascunho"}</Text></Pressable>
            {prova && !prova.publicada ? <Pressable style={globalStyles.primaryButton} onPress={publicarProva}><Text style={globalStyles.buttonText}>Publicar prova</Text></Pressable> : null}
            {prova ? <Pressable style={styles.deleteButton} onPress={excluirProva}><Text style={globalStyles.buttonText}>Excluir prova</Text></Pressable> : null}
          </>
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
                const corrigida = item.correcoes_dissertativas?.[idQuestao];
                return <View key={idQuestao} style={styles.answerBlock}><Text style={styles.answer}>{pergunta?.enunciado || `Questão ${index + 1}`}: {String(valor)}</Text>
                  {pergunta?.tipo === "objetiva" ? <Text style={styles.courseLabel}>{String(valor) === pergunta.resposta_esperada ? "Resposta correta" : `Incorreta · Correta: ${pergunta.resposta_esperada}`}</Text> : null}
                  {pergunta?.tipo === "dissertativa" ? <><Text style={styles.courseLabel}>{corrigida === undefined ? "Aguardando correção" : corrigida ? "Correta" : "Incorreta"}</Text><View style={styles.actions}><Pressable style={styles.approve} onPress={() => corrigirQuestao(item, pergunta, true)}><Text style={styles.actionText}>Correta</Text></Pressable><Pressable style={styles.reject} onPress={() => corrigirQuestao(item, pergunta, false)}><Text style={styles.actionText}>Incorreta</Text></Pressable></View></> : null}
                </View>;
              })}
              <Text style={styles.courseLabel}>{item.nota ?? 0} pontos · {item.acertos ?? 0} de {item.total_questoes || item.questoes?.length || 0} acertos até agora</Text>
              <TextInput value={feedbacks[item.id] || ""} onChangeText={(value) => setFeedbacks((atual) => ({ ...atual, [item.id]: value }))} placeholder="Feedback (opcional)" multiline style={[globalStyles.input, styles.multiline]} />
            </View>;
          })}
        </View>
        <View style={[globalStyles.card, styles.card]}>
          <Text style={styles.sectionTitle}>Resultados corrigidos</Text>
          {respostas.filter((item) => item.status !== 0).length === 0 ? <Text style={globalStyles.message}>Nenhuma prova corrigida neste curso.</Text> : null}
          {respostas.filter((item) => item.status !== 0).map((item) => <View key={item.id} style={styles.submission}><Text style={styles.questionTitle}>{item.aluno}</Text><Text style={styles.courseLabel}>{item.prova} · {item.status === 1 ? "Aprovado" : "Reprovado"}</Text><Text style={styles.answer}>{item.nota ?? 0} pontos · {item.acertos ?? 0} de {item.total_questoes || item.questoes?.length || 0} acertos</Text></View>)}
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
  correctOption: { padding: 11, borderWidth: 1, borderColor: colors.border, borderRadius: 9 }, correctOptionSelected: { backgroundColor: colors.darkGreen, borderColor: colors.darkGreen }, answerBlock: { gap: 7, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  actions: { flexDirection: "row", gap: 10 }, approve: { flex: 1, alignItems: "center", padding: 12, backgroundColor: colors.darkGreen, borderRadius: 8 }, reject: { flex: 1, alignItems: "center", padding: 12, backgroundColor: colors.red, borderRadius: 8 }, actionText: { color: colors.white, fontWeight: "800" },
  deleteButton: { alignItems: "center", padding: 12, backgroundColor: colors.red, borderRadius: 8 }
});
