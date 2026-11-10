import useChat from "../hooks/useChat";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  AppState,
  BackHandler,
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
import BotaoVoltar from '../components/BotaoVoltar_39';
import AppIcon from "../components/AppIcon_39";
import { colors, globalStyles } from "../styles_39";

export default
function ChatScreen({ token, tipoUsuario, conversaInicial = null, carregando, onBack }) {
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

  function voltarContatos() { Keyboard.dismiss(); setSelecionada(null); setTexto(''); }
  useEffect(() => {
    const evento = BackHandler.addEventListener('hardwareBackPress', () => {
      if (selecionada) { Keyboard.dismiss(); setSelecionada(null); return true; }
      if (onBack) { onBack(); return true; }
      return false;
    });
    return () => evento.remove();
  }, [selecionada, onBack]);
  const horario = data => data && !Number.isNaN(new Date(data).getTime()) ? new Date(data).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '';

  if (!selecionada) return <ScrollView contentContainerStyle={[globalStyles.page, styles.contatos]} refreshControl={<RefreshControl refreshing={Boolean(carregando || loading)} onRefresh={atualizarChat} />}>
    <Text style={globalStyles.title}>Chat</Text>
    {!!erro && <Text accessibilityRole="alert" style={globalStyles.error}>{erro}</Text>}
    {loading && !conversasVisiveis.length && <ActivityIndicator color={colors.darkGreen} />}
    {!loading && !conversasVisiveis.length && <Text style={styles.empty}>{aluno ? 'Nenhuma conversa disponível.' : 'Nenhuma conversa ainda. Abra os alunos de um curso para iniciar.'}</Text>}
    <View style={styles.listaContatos}>{conversasVisiveis.map(conversa => <Pressable key={`${conversa.id_curso}-${conversa.id_aluno || 'aluno'}`} accessibilityRole="button" accessibilityLabel={`Conversar com ${conversa.nome}, ${conversa.curso}`} style={styles.contato} onPress={() => setSelecionada(conversa)}>
      <Avatar imagem={conversa.imagem_perfil} tamanho={46} />
      <View style={styles.contatoInfo}><Text style={styles.name} numberOfLines={1}>{conversa.nome}</Text><Text style={styles.course} numberOfLines={2}>{conversa.curso}</Text></View>
      <View style={styles.contatoResumo}><Text style={styles.horario}>{horario(conversa.ultima_mensagem_em)}</Text>{conversa.nao_lidas > 0 && <Text style={styles.badge}>{conversa.nao_lidas}</Text>}</View>
    </Pressable>)}</View>
  </ScrollView>;

  return <KeyboardAvoidingView style={styles.keyboardArea} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <View style={styles.cabecalhoConversa}><BotaoVoltar emLinha onPress={voltarContatos}>Voltar</BotaoVoltar><Avatar imagem={selecionada.imagem_perfil} tamanho={40} /><View style={styles.contatoInfo}><Text style={styles.name} numberOfLines={1}>{selecionada.nome}</Text><Text style={styles.course} numberOfLines={1}>{selecionada.curso}</Text></View></View>
    {!!erro && <Text accessibilityRole="alert" style={styles.erro}>{erro}</Text>}
    <ScrollView ref={scrollRef} style={styles.scroll} contentContainerStyle={styles.messages} keyboardShouldPersistTaps="handled" scrollEventThrottle={100}
      refreshControl={<RefreshControl refreshing={Boolean(carregando || loading)} onRefresh={atualizarChat} />}
      onScroll={({ nativeEvent }) => { const { contentOffset, layoutMeasurement, contentSize } = nativeEvent; noFim.current = contentSize.height - contentOffset.y - layoutMeasurement.height < 80; if (noFim.current) confirmarLeitura(); }}
      onContentSizeChange={() => { if (noFim.current) scrollRef.current?.scrollToEnd({ animated: false }); }}>
      {temAnteriores && <Pressable disabled={carregandoAnteriores} style={styles.anteriores} onPress={() => { noFim.current = false; carregarAnteriores(); }}><Text style={styles.course}>{carregandoAnteriores ? 'Carregando...' : 'Carregar mensagens anteriores'}</Text></Pressable>}
      {!mensagens.length && <Text style={styles.empty}>{loading ? 'Carregando mensagens...' : 'Nenhuma mensagem enviada ainda.'}</Text>}
      {mensagens.map(mensagem => <View key={mensagem.id} style={[styles.bubble, mensagem.minha && styles.mine]}>
        {!mensagem.minha && <Text style={styles.sender}>{mensagem.nome}</Text>}
        <Text style={styles.messageText}>{mensagem.texto}</Text>
        {!!mensagem.criado_em && <Text style={styles.horarioMensagem}>{horario(mensagem.criado_em)}</Text>}
      </View>)}
    </ScrollView>
    <View style={[styles.composer, tecladoAberto && { paddingBottom: 8 }]}>
      <TextInput accessibilityLabel="Mensagem" maxLength={10000} value={texto} onChangeText={setTexto} editable={!enviando} placeholder="Digite sua mensagem" placeholderTextColor={colors.muted} style={styles.input} />
      <Pressable accessibilityRole="button" accessibilityLabel="Enviar mensagem" style={[styles.send, (!texto.trim() || enviando) && { opacity: .5 }]} onPress={enviarMensagem} disabled={!texto.trim() || enviando}>{enviando ? <ActivityIndicator color="#fff" /> : <AppIcon name="send-outline" size={18} color="#fff" />}</Pressable>
    </View>
  </KeyboardAvoidingView>;
}
const styles = StyleSheet.create({
  keyboardArea: { flex: 1, backgroundColor: '#edf2ee' }, contatos: { gap: 20 }, listaContatos: { backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border, borderRadius: 14, overflow: 'hidden' },
  contato: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, minHeight: 86, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }, contatoInfo: { flex: 1, minWidth: 0, gap: 4 }, contatoResumo: { alignItems: 'flex-end', gap: 8 },
  name: { color: colors.ink, fontSize: 16, lineHeight: 22, fontWeight: '700' }, course: { color: colors.textMuted, fontSize: 12, lineHeight: 18 }, horario: { color: colors.textMuted, fontSize: 11 }, badge: { minWidth: 22, height: 22, paddingHorizontal: 6, borderRadius: 11, backgroundColor: colors.darkGreen, color: '#fff', textAlign: 'center', lineHeight: 22, overflow: 'hidden', fontSize: 11, fontWeight: '700' },
  cabecalhoConversa: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: colors.border },
  scroll: { flex: 1 }, messages: { flexGrow: 1, padding: 16, gap: 10 }, empty: { color: colors.textMuted, textAlign: 'center', paddingVertical: 24, fontSize: 14, lineHeight: 21 }, erro: { color: colors.red, padding: 12, backgroundColor: '#fff6f6' }, anteriores: { alignSelf: 'center', padding: 10, backgroundColor: '#fff', borderRadius: 16, marginBottom: 8 },
  bubble: { maxWidth: '85%', alignSelf: 'flex-start', borderRadius: 14, borderBottomLeftRadius: 3, backgroundColor: '#fff', padding: 12, gap: 4, borderWidth: 1, borderColor: '#e0e8e2' }, mine: { alignSelf: 'flex-end', borderBottomLeftRadius: 14, borderBottomRightRadius: 3, backgroundColor: '#dcf4e5', borderColor: '#cee7d7' }, sender: { color: colors.darkGreen, fontSize: 12, fontWeight: '700' }, messageText: { color: colors.ink, fontSize: 15, lineHeight: 22 }, horarioMensagem: { color: colors.textMuted, fontSize: 10, textAlign: 'right' },
  composer: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, backgroundColor: '#f5f8f6', borderTopWidth: 1, borderTopColor: colors.border }, input: { flex: 1, minHeight: 46, paddingHorizontal: 16, borderWidth: 1, borderColor: colors.border, borderRadius: 24, backgroundColor: '#fff', color: colors.ink, fontSize: 15 }, send: { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.darkGreen, alignItems: 'center', justifyContent: 'center' }
});
