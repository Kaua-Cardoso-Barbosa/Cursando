import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  AppState,
  Keyboard,
  KeyboardAvoidingView,
  Image,
  Pressable,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { apiRequest, resolverUrlMidia } from "../api/client";
import AppIcon from "../components/AppIcon";
import { colors, globalStyles } from "../styles";

export default function ChatScreen({ token, tipoUsuario, cursos = [], carregando, onRefresh }) {
  const [conversas, setConversas] = useState([]);
  const [selecionada, setSelecionada] = useState(null);
  const [mensagens, setMensagens] = useState([]);
  const [texto, setTexto] = useState("");
  const [loading, setLoading] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [tecladoAberto, setTecladoAberto] = useState(false);
  const enviandoRef = useRef(false);
  const aluno = Number(tipoUsuario) === 2;

  // Sprint item 19: apresenta a foto cadastrada do participante e usa um ícone quando não há foto.
  function Avatar({ imagem, tamanho = 38 }) {
    return imagem
      ? <Image source={{ uri: resolverUrlMidia(imagem) }} style={{ width: tamanho, height: tamanho, borderRadius: tamanho / 2 }} />
      : <AppIcon name="person-circle-outline" size={tamanho} color={colors.darkGreen} />;
  }

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const showSubscription = Keyboard.addListener(showEvent, () => setTecladoAberto(true));
    const hideSubscription = Keyboard.addListener(hideEvent, () => setTecladoAberto(false));
    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  async function carregarConversas({ silencioso = false } = {}) {
    if (!silencioso) setLoading(true);
    try {
      if (aluno) {
        const existentes = await apiRequest("/chat/conversas", {}, token);
        setConversas(Array.isArray(existentes) ? existentes : []);
        return;
      }

      const dados = await apiRequest("/chat/conversas", {}, token);
      setConversas(Array.isArray(dados) ? dados : []);
    } catch {
      setConversas([]);
    } finally {
      if (!silencioso) setLoading(false);
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

  // Sprint item 19: atualiza a caixa de entrada e a conversa aberta periodicamente no app.
  useEffect(() => {
    const intervalo = setInterval(() => {
      if (AppState.currentState !== "active") return;
      carregarConversas({ silencioso: true });
      if (selecionada) carregarMensagens(selecionada).catch(() => setMensagens([]));
    }, 5000);
    return () => clearInterval(intervalo);
  }, [token, tipoUsuario, cursos, selecionada]);

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
    <KeyboardAvoidingView
      style={styles.keyboardArea}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[globalStyles.page, styles.page, tecladoAberto && styles.keyboardPage]}
        keyboardShouldPersistTaps="handled"
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
                <Avatar imagem={conversa.imagem_perfil} tamanho={38} />
                <View style={styles.conversationText}>
                  <Text style={styles.name}>{conversa.nome}</Text>
                  <Text style={styles.course}>{conversa.curso}</Text>
                </View>
                {conversa.nao_lidas > 0 ? <Text style={styles.badge}>{conversa.nao_lidas}</Text> : null}
              </Pressable>
            );
          })}
        </View>

        <View style={[styles.messages, tecladoAberto && styles.keyboardMessages]}>
          {selecionada ? (
            <View style={styles.chatIdentity}>
              <Avatar imagem={selecionada.imagem_perfil} tamanho={32} />
              <View>
                <Text style={styles.name}>{selecionada.nome}</Text>
                <Text style={styles.course}>{selecionada.curso}</Text>
              </View>
            </View>
          ) : null}
          {!selecionada ? <Text style={styles.empty}>Selecione uma conversa.</Text> : null}
          {selecionada && mensagens.length === 0 ? <Text style={styles.empty}>Nenhuma mensagem enviada ainda.</Text> : null}
          {mensagens.map((mensagem) => (
            <View key={mensagem.id} style={[styles.bubble, mensagem.minha && styles.mine]}>
              <View style={styles.senderRow}>
                <Avatar imagem={mensagem.imagem_perfil} tamanho={24} />
                <Text style={styles.sender}>{mensagem.nome}</Text>
              </View>
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
            <AppIcon name="send-outline" size={20} color={colors.white} />
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardArea: { flex: 1 },
  scroll: { flex: 1 },
  page: { flexGrow: 1, paddingBottom: 112 },
  keyboardPage: { paddingBottom: 20 },
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
    flex: 1,
    minHeight: 180,
    borderWidth: 1.4,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.gray,
    padding: 12,
    gap: 10
  },
  keyboardMessages: { minHeight: 100 },
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
  chatIdentity: { flexDirection: "row", alignItems: "center", gap: 8, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  senderRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 },
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
