import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { apiRequest } from "../api/client_3_17";
import { colors } from "../styles_39";

const perfis = [
  { id: "0", nome: "Administradores" },
  { id: "1", nome: "Professores" },
  { id: "2", nome: "Alunos" }
];

const eventosPorPerfil = {
  "0": [["", "Todas as acoes"], ["cadastro_professor", "Cadastro de professor"], ["cadastro_aluno", "Cadastro de aluno"], ["alterar_usuario", "Alterou usuario"], ["registrar_custo", "Registrou custo"], ["alterar_configuracao", "Alterou configuracao financeira"], ["aprovar_saque", "Atualizou saque"]],
  "1": [["", "Todas as acoes"], ["criar_curso", "Criou curso"], ["editar_curso", "Alterou curso"], ["excluir_curso", "Excluiu curso"], ["criar_aula", "Criou aula"], ["editar_aula", "Alterou aula"], ["excluir_aula", "Excluiu aula"], ["criar_modulo", "Criou modulo"], ["criar_material", "Criou material"], ["criar_prova", "Criou prova"], ["corrigir_prova", "Corrigiu prova"], ["solicitar_saque", "Solicitou saque"], ["mensagem_chat", "Enviou mensagem"]],
  "2": [["", "Todas as acoes"], ["inscricao_curso", "Inscricao em curso"], ["assinar", "Criou assinatura"], ["assistir_aula", "Assistiu aula"], ["avaliar_curso", "Avaliou curso"], ["enviar_prova", "Enviou prova"], ["mensagem_chat", "Enviou mensagem"]]
};

function formatarData(valor) {
  return valor ? new Date(valor).toLocaleString("pt-BR") : "Data nao disponivel";
}

function formatarJson(valor) {
  if (!valor) return "Sem dados registrados";
  try {
    return JSON.stringify(JSON.parse(valor), null, 2);
  } catch {
    return valor;
  }
}


export default
function LogsAdminScreen({ token, onError }) {
  const onErrorRef = useRef(onError);
  const [perfil, setPerfil] = useState("0");
  const [evento, setEvento] = useState("");
  const [busca, setBusca] = useState("");
  const [inicio, setInicio] = useState("");
  const [fim, setFim] = useState("");
  const [logs, setLogs] = useState([]);
  const [aberto, setAberto] = useState(null);
  const [carregando, setCarregando] = useState(false);
  const [temMais, setTemMais] = useState(false);

  useEffect(() => { onErrorRef.current = onError; }, [onError]);

  /* Sprint item 25 - Permitir acesso e relatórios dos logs somente para o administrador por data e usuário - Restringe a consulta dos logs ao administrador e aplica os filtros */
  const carregar = useCallback(
async (offset = 0, anexar = false) => {
    setCarregando(true);
    try {
      const params = new URLSearchParams({ tipo: perfil, limite: "100", offset: String(offset) });
      if (evento) params.set("evento", evento);
      if (busca.trim()) params.set("busca", busca.trim());

      if (inicio) params.set("inicio", inicio);
      if (fim) params.set("fim", fim);
      const dados = await apiRequest(`/admin/logs-gravacao?${params.toString()}`, {}, token);
      const registros = Array.isArray(dados) ? dados : [];
      setLogs((atuais) => anexar ? [...atuais, ...registros.slice(0, 100)] : registros.slice(0, 100));
      setTemMais(registros.length > 100);
    } catch (error) {
      onErrorRef.current?.(error);
    } finally {
      setCarregando(false);
    }
  }
, [busca, evento, fim, inicio, perfil, token]);
  /* Fim item 25 */

  useEffect(() => { carregar(0, false); }, [carregar]);

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={carregando} onRefresh={carregar} />}>
      <Text style={styles.title}>Atividade do sistema</Text>
      <Text style={styles.subtitle}>Consulte as acoes registradas por perfil.</Text>
      {/* Sprint item 25 - Permitir acesso e relatórios dos logs somente para o administrador por data e usuário - Restringe a consulta dos logs ao administrador e aplica os filtros */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.choices}>
        {perfis.map((item) => (
          <Pressable key={item.id} onPress={() => { setPerfil(item.id); setEvento(""); setAberto(null); }} style={[styles.choice, perfil === item.id && styles.choiceActive]}>
            <Text style={[styles.choiceText, perfil === item.id && styles.choiceTextActive]}>{item.nome}</Text>
          </Pressable>
        ))}
      </ScrollView>
      {/* Fim item 25 */}
                                                                                                                                                                                       
      <TextInput value={busca} onChangeText={setBusca} placeholder="Buscar nome, email ou acao" placeholderTextColor={colors.textMuted} style={styles.search} />
                                                                                                                                                                                      
      {/* Sprint item 25 - Permitir acesso e relatórios dos logs somente para o administrador por data e usuário - Restringe a consulta dos logs ao administrador e aplica os filtros */}
      <View style={styles.dateFilters}>
        <TextInput value={inicio} onChangeText={setInicio} placeholder="Data inicial (AAAA-MM-DD)" placeholderTextColor={colors.textMuted} style={[styles.search, styles.dateInput]} />
        <TextInput value={fim} onChangeText={setFim} placeholder="Data final (AAAA-MM-DD)" placeholderTextColor={colors.textMuted} style={[styles.search, styles.dateInput]} />
      </View>
      {/* Fim item 25 */}
      {/* Sprint item 25 - Permitir acesso e relatórios dos logs somente para o administrador por data e usuário - Restringe a consulta dos logs ao administrador e aplica os filtros */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.choices}>
        {(eventosPorPerfil[perfil] || eventosPorPerfil["0"]).map(([id, nome]) => (
          <Pressable key={id || "todos"} onPress={() => setEvento(id)} style={[styles.choice, evento === id && styles.choiceActive]}>
            <Text style={[styles.choiceText, evento === id && styles.choiceTextActive]}>{nome}</Text>
          </Pressable>
        ))}
      </ScrollView>
      {/* Fim item 25 */}
      {carregando && !logs.length ? <ActivityIndicator color={colors.green} style={styles.loading} /> : null}
      {!carregando && !logs.length ? <Text style={styles.empty}>Nenhum registro encontrado para esses filtros.</Text> : null}
      {logs.map((log) => {
        const expandido = aberto === log.id;
        return (
          <Pressable key={log.id} onPress={() => setAberto(expandido ? null : log.id)} style={styles.card}>
            {/* Sprint item 25 - Permitir acesso e relatórios dos logs somente para o administrador por data e usuário - Restringe a consulta dos logs ao administrador e aplica os filtros */}
            <View style={styles.cardTop}>
              <Text style={styles.action}>{log.acao === "INSERT" ? "Cadastro" : log.acao === "UPDATE" ? "Alteracao" : "Exclusao"} - {log.tabela}</Text>
              <Text style={styles.date}>{formatarData(log.criado_em)}</Text>
            </View>
            {/* Fim item 25 */}
            <Text style={styles.actor}>{log.nome || `Usuario ${log.id_usuario || "desconhecido"}`}</Text>
            <Text style={styles.email}>{log.email || "Email nao disponivel"}</Text>
            <Text style={styles.summary}>{log.resumo || `${log.metodo || ""} ${log.rota || ""}`}</Text>
            {expandido ? (
              /* Sprint item 25 - Permitir acesso e relatórios dos logs somente para o administrador por data e usuário - Restringe a consulta dos logs ao administrador e aplica os filtros */ <View style={styles.detail}>
                <Text style={styles.detailLabel}>Registro {log.id_registro || ""} - {log.metodo || ""} {log.rota || ""}</Text>
                {log.contexto?.usuario_afetado ? <Text style={styles.summary}>Usuario cadastrado: {log.contexto.usuario_afetado.nome} - {log.contexto.usuario_afetado.email} - tipo {log.contexto.usuario_afetado.tipo}</Text> : null}
                {log.contexto?.curso ? <Text style={styles.summary}>Curso: {log.contexto.curso}</Text> : null}
                {log.contexto?.professor ? <Text style={styles.summary}>Professor: {log.contexto.professor.nome} - {log.contexto.professor.email}</Text> : null}
                {log.contexto?.aula ? <Text style={styles.summary}>Aula: {log.contexto.aula}</Text> : null}
                <Text style={styles.detailLabel}>Campos alterados</Text>
                <Text selectable style={styles.json}>{log.campos_alterados || "Nao informado"}</Text>
                <Text style={styles.detailLabel}>Antes</Text>
                <Text selectable style={styles.json}>{formatarJson(log.valores_antes)}</Text>
                <Text style={styles.detailLabel}>Depois</Text>
                <Text selectable style={styles.json}>{formatarJson(log.valores_depois)}</Text>
              </View> /* Fim item 25 */
            ) : <Text style={styles.tap}>Toque para ver detalhes</Text>}
          </Pressable>
        );
      })}
      {temMais ? <Pressable onPress={() => carregar(logs.length, true)} style={styles.choiceActive}><Text style={styles.choiceTextActive}>{carregando ? "Carregando..." : "Carregar mais registros"}</Text></Pressable> : null}
    </ScrollView>
  );
}

/* Sprint item 39 - Desenvolver todas as telas do aplicativo - Define os estilos dos componentes nativos desta tela */
const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.gray },
  content: { padding: 20, paddingBottom: 112, gap: 12 },
  title: { color: colors.black, fontSize: 24, fontWeight: "800" },
  subtitle: { color: colors.textMuted, fontSize: 14 },
  choices: { gap: 8, paddingVertical: 4 },
  choice: { borderWidth: 1, borderColor: colors.border, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 9, backgroundColor: colors.white },
  choiceActive: { borderColor: colors.darkGreen, backgroundColor: colors.darkGreen },
  choiceText: { color: colors.black, fontSize: 12, fontWeight: "700" },
  choiceTextActive: { color: colors.white },
  search: { backgroundColor: colors.white, color: colors.black, borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12 },
  dateFilters: { flexDirection: "row", gap: 8 },
  dateInput: { flex: 1, minWidth: 0, fontSize: 12 },
  loading: { padding: 20 },
  empty: { color: colors.textMuted, textAlign: "center", padding: 24 },
  card: { backgroundColor: colors.white, borderColor: colors.border, borderWidth: 1, borderRadius: 12, padding: 14, gap: 6 },
  cardTop: { gap: 5 },
  action: { color: colors.darkGreen, fontSize: 14, fontWeight: "800" },
  date: { color: colors.textMuted, fontSize: 11 },
  actor: { color: colors.black, fontSize: 15, fontWeight: "700" },
  email: { color: colors.textMuted, fontSize: 12 },
  summary: { color: colors.black, fontSize: 13, marginTop: 3 },
  tap: { color: colors.darkGreen, fontSize: 11, fontWeight: "700", marginTop: 4 },
  detail: { borderTopWidth: 1, borderTopColor: colors.border, marginTop: 8, paddingTop: 10, gap: 5 },
  detailLabel: { color: colors.textMuted, fontSize: 11, fontWeight: "700", marginTop: 4 },
  json: { color: colors.black, fontSize: 11, fontFamily: "monospace" }
});
/* Fim item 39 */
