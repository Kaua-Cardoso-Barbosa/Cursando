import useChat from "../hooks/useChat";
import { useCallback, useEffect, useRef, useState } from "react";
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
import { apiRequest, resolverUrlMidia } from "../api/client_3_17";
import AppIcon from "../components/AppIcon_39";
import { colors, globalStyles } from "../styles_39";

export default
function ChatScreen({ token, tipoUsuario, conversaInicial = null, carregando }) {
  const aluno = Number(tipoUsuario) === 2;
  const [texto, setTexto] = useState("");
  const [tecladoAberto, setTecladoAberto] = useState(false);
  const [ativo, setAtivo] = useState(AppState.currentState === "active");
  const scrollRef = useRef(null);
  const noFim = useRef(true);
  const request = useCallback((path, options = {}) => apiRequest(path, {
    ...options, ...(options.body ? { body: JSON.stringify(options.body) } : {})
  }, token, 10000, false), [token]);
  const { conversas, selecionada, setSelecionada, mensagens, carregando: loading, enviando, erro,
    carregarAnteriores, carregandoAnteriores, temAnteriores, confirmarLeitura, enviarTexto, atualizar } =
    useChat({ request, professor: Number(tipoUsuario) === 1, conversaInicial, ativo });
  const conversasVisiveis = selecionada && !conversas.some(c =>
    Number(c.id_curso) === Number(selecionada.id_curso) && Number(c.id_aluno) === Number(selecionada.id_aluno)
  ) ? [selecionada, ...conversas] : conversas;
  useEffect(() => { noFim.current = true; setTexto(""); }, [selecionada?.id_curso, selecionada?.id_aluno]);
  useEffect(() => {
    const inscricao = AppState.addEventListener("change", estado => setAtivo(estado === "active"));
    return () => inscricao.remove();
  }, []);
  useEffect(() => { if (ativo && noFim.current) confirmarLeitura(); }, [ativo, mensagens, confirmarLeitura]);
  async function enviarMensagem() {
    const enviado = texto.trim();
    if (await enviarTexto(enviado)) {
      setTexto(atual => atual.trim() === enviado ? "" : atual);
      noFim.current = true;
      scrollRef.current?.scrollToEnd({ animated: true });
      confirmarLeitura();
    }
  }
  async function atualizarChat() { await atualizar(); }

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

  return (
    <KeyboardAvoidingView
      style={styles.keyboardArea}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        ref={scrollRef}
        scrollEventThrottle={100}
        onScroll={({ nativeEvent }) => {
          const { contentOffset, layoutMeasurement, contentSize } = nativeEvent;
          noFim.current = contentSize.height - contentOffset.y - layoutMeasurement.height < 80;
          if (noFim.current) confirmarLeitura();
        }}
        onContentSizeChange={() => { if (noFim.current) scrollRef.current?.scrollToEnd({ animated: false }); }}
        style={styles.scroll}
        contentContainerStyle={[globalStyles.page, styles.page, tecladoAberto && styles.keyboardPage]}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={carregando || loading} onRefresh={atualizarChat} />}
      >
        {/* Sprint item 19 - Implementar chat entre instrutor e aluno no aplicativo e no sistema web - Carrega, envia e apresenta as mensagens da conversa do curso */}
        <View style={styles.header}>
          <Text style={globalStyles.title}>Chat</Text>
          <Text style={globalStyles.eyebrow}>{aluno ? "Tire duvidas com o instrutor" : "Converse com os alunos dos seus cursos"}</Text>
          <View style={globalStyles.divider} />
        </View>
        {/* Fim item 19 */}

        {/* Sprint item 19 - Implementar chat entre instrutor e aluno no aplicativo e no sistema web - Carrega, envia e apresenta as mensagens da conversa do curso */}
        {erro ? <Text accessibilityRole="alert" style={styles.empty}>{erro}</Text> : null}
        <View style={styles.conversations}>
          {loading ? <ActivityIndicator color={colors.green} /> : null}
          {!loading && conversasVisiveis.length === 0 ? <Text style={globalStyles.message}>{aluno ? "Nenhuma conversa disponivel." : "Nenhuma conversa ainda. Abra os alunos de um curso para iniciar."}</Text> : null}
          {conversasVisiveis.map((conversa) => {
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
        {/* Fim item 19 */}

        {/* Sprint item 19 - Implementar chat entre instrutor e aluno no aplicativo e no sistema web - Carrega, envia e apresenta as mensagens da conversa do curso */}
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
          {temAnteriores ? <Pressable disabled={carregandoAnteriores} onPress={() => { noFim.current = false; carregarAnteriores(); }}><Text style={styles.empty}>{carregandoAnteriores ? "Carregando..." : "Carregar mensagens anteriores"}</Text></Pressable> : null}
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
        {/* Fim item 19 */}

        {/* Sprint item 19 - Implementar chat entre instrutor e aluno no aplicativo e no sistema web - Carrega, envia e apresenta as mensagens da conversa do curso */}
        <View style={styles.composer}>
          <TextInput
            maxLength={10000}
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
        {/* Fim item 19 */}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/* Sprint item 39 - Desenvolver todas as telas do aplicativo - Define os estilos dos componentes nativos desta tela */
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
/* Fim item 39 */
