import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  AppState,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { apiRequest } from "../api/client";
import { colors, globalStyles } from "../styles";

export default function ChatScreen({ token, tipoUsuario, cursos = [], carregando, onRefresh }) {
  const [conversas, setConversas] = useState([]);
  const [selecionada, setSelecionada] = useState(null);
  const [mensagens, setMensagens] = useState([]);
  const [texto, setTexto] = useState("");
  const [loading, setLoading] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const enviandoRef = useRef(false);
  const aluno = Number(tipoUsuario) === 2;

  async function carregarConversas() {
    setLoading(true);
    try {
      if (aluno) {
        const existentes = await apiRequest("/chat/conversas", {}, token);
        const porCurso = new Map();

        for (const curso of cursos) {
          porCurso.set(Number(curso.id), {
            id_curso: curso.id,
            id_aluno: null,
            curso: curso.titulo,
            nome: "Instrutor",
            nao_lidas: 0
          });
        }

        for (const conversa of Array.isArray(existentes) ? existentes : []) {
          porCurso.set(Number(conversa.id_curso), conversa);
        }

        setConversas([...porCurso.values()]);
        return;
      }

      const dados = await apiRequest("/chat/conversas", {}, token);
      setConversas(Array.isArray(dados) ? dados : []);
    } catch {
      setConversas([]);
    } finally {
      setLoading(false);
    }
  }

  async function carregarMensagens(conversa) {
    if (!conversa) return;

    const query = !aluno ? `?id_aluno=${conversa.id_aluno}` : "";
    const dados = await apiRequest(`/chat/cursos/${conversa.id_curso}/mensagens${query}`, {}, token);
    setMensagens(Array.isArray(dados) ? dados : []);
  }

  async function enviarMensagem() {
    const textoMensagem = texto.trim();
    if (!selecionada || !textoMensagem || enviandoRef.current) return;

    enviandoRef.current = true;
    setEnviando(true);
    try {
      await apiRequest(`/chat/cursos/${selecionada.id_curso}/mensagens`, {
        method: "POST",
        body: JSON.stringify({
          id_aluno: selecionada.id_aluno,
          texto: textoMensagem
        })
      }, token);
      setTexto("");
      await carregarMensagens(selecionada);
      await carregarConversas();
    } finally {
      enviandoRef.current = false;
      setEnviando(false);
    }
  }

  useEffect(() => {
    carregarConversas();
  }, [token, tipoUsuario, cursos]);

  useEffect(() => {
    carregarMensagens(selecionada).catch(() => setMensagens([]));
  }, [selecionada]);

  useEffect(() => {
    const inscricao = AppState.addEventListener("change", (estado) => {
      if (estado !== "active") return;

      // Sprint item 3: sincroniza conversas e mensagens recebidas no site quando o app volta ao primeiro plano.
      carregarConversas();
      if (selecionada) {
        carregarMensagens(selecionada).catch(() => setMensagens([]));
      }
    });

    return () => inscricao.remove();
  }, [token, tipoUsuario, cursos, selecionada]);

  async function atualizarChat() {
    await onRefresh?.();
    await carregarConversas();
    if (selecionada) {
      await carregarMensagens(selecionada).catch(() => setMensagens([]));
    }
  }

  return (
    <ScrollView
      contentContainerStyle={globalStyles.page}
      refreshControl={<RefreshControl refreshing={carregando || loading} onRefresh={atualizarChat} />}
    >
      <View style={styles.header}>
        <Text style={globalStyles.title}>Chat</Text>
        <Text style={globalStyles.eyebrow}>{aluno ? "Tire duvidas com o instrutor" : "Mensagens dos alunos"}</Text>
        <View style={globalStyles.divider} />
      </View>

      <View style={styles.conversations}>
        {loading ? <ActivityIndicator color={colors.green} /> : null}
        {!loading && conversas.length === 0 ? <Text style={globalStyles.message}>Nenhuma conversa disponivel.</Text> : null}
        {conversas.map((conversa) => {
          const active = selecionada?.id_curso === conversa.id_curso && selecionada?.id_aluno === conversa.id_aluno;
          return (
            <Pressable
              key={`${conversa.id_curso}-${conversa.id_aluno || "aluno"}`}
              style={[styles.conversation, active && styles.conversationActive]}
              onPress={() => setSelecionada(conversa)}
            >
              <Ionicons name="person-circle-outline" size={34} color={colors.darkGreen} />
              <View style={styles.conversationText}>
                <Text style={styles.name}>{conversa.nome}</Text>
                <Text style={styles.course}>{conversa.curso}</Text>
              </View>
              {conversa.nao_lidas > 0 ? <Text style={styles.badge}>{conversa.nao_lidas}</Text> : null}
            </Pressable>
          );
        })}
      </View>

      <View style={styles.messages}>
        {!selecionada ? <Text style={styles.empty}>Selecione uma conversa.</Text> : null}
        {selecionada && mensagens.length === 0 ? <Text style={styles.empty}>Nenhuma mensagem enviada ainda.</Text> : null}
        {mensagens.map((mensagem) => (
          <View key={mensagem.id} style={[styles.bubble, mensagem.minha && styles.mine]}>
            <Text style={styles.sender}>{mensagem.nome}</Text>
            <Text style={styles.messageText}>{mensagem.texto}</Text>
          </View>
        ))}
      </View>

      <View style={styles.composer}>
        <TextInput
          value={texto}
          onChangeText={setTexto}
          editable={Boolean(selecionada) && !enviando}
          placeholder={selecionada ? "Digite sua mensagem" : "Selecione uma conversa"}
          placeholderTextColor={colors.muted}
          style={styles.input}
        />
        <Pressable style={styles.send} onPress={enviarMensagem} disabled={!selecionada || !texto.trim() || enviando}>
          <Ionicons name="send-outline" size={22} color={colors.white} />
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: 24
  },
  conversations: {
    gap: 10,
    marginBottom: 18
  },
  conversation: {
    minHeight: 66,
    borderWidth: 1.4,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.white,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10
  },
  conversationActive: {
    backgroundColor: "#e8f7ef",
    borderColor: colors.green
  },
  conversationText: {
    flex: 1
  },
  name: {
    color: colors.black,
    fontSize: 16,
    fontWeight: "700"
  },
  course: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 2
  },
  badge: {
    minWidth: 24,
    minHeight: 24,
    borderRadius: 12,
    backgroundColor: colors.green,
    color: colors.white,
    textAlign: "center",
    paddingTop: 2
  },
  messages: {
    minHeight: 260,
    borderWidth: 1.4,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.gray,
    padding: 12,
    gap: 10
  },
  empty: {
    color: colors.textMuted,
    textAlign: "center",
    marginTop: 20
  },
  bubble: {
    maxWidth: "82%",
    alignSelf: "flex-start",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#dddddd",
    backgroundColor: colors.white,
    padding: 10
  },
  mine: {
    alignSelf: "flex-end",
    borderColor: colors.green,
    backgroundColor: "#e8f7ef"
  },
  sender: {
    color: colors.darkGreen,
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 4
  },
  messageText: {
    color: colors.black,
    fontSize: 15,
    lineHeight: 20
  },
  composer: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12
  },
  input: {
    flex: 1,
    minHeight: 46,
    borderWidth: 1.4,
    borderColor: colors.green,
    borderRadius: 8,
    backgroundColor: colors.white,
    color: colors.black,
    paddingHorizontal: 12
  },
  send: {
    width: 48,
    height: 46,
    borderRadius: 8,
    backgroundColor: colors.green,
    alignItems: "center",
    justifyContent: "center"
  }
});
