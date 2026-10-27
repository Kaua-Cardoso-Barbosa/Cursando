import { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { apiRequest } from "../api/client_3_17";
import AppIcon from "../components/AppIcon_39";
import { colors, globalStyles } from "../styles_39";


export default
function MateriaisProfessorScreen({ curso, token, onBack }) {
  const [materiais, setMateriais] = useState([]);
  const [titulo, setTitulo] = useState("");
  const [tipo, setTipo] = useState("link");
  const [descricao, setDescricao] = useState("");
  const [url, setUrl] = useState("");
  const [arquivo, setArquivo] = useState(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");

  /* Sprint item 21 - Permitir que o instrutor publique materiais do curso, como livros, apostilas e códigos - Publica, lista ou permite baixar os materiais complementares */
  const carregar = useCallback(async () => {
    setCarregando(true);
    try { setMateriais(await apiRequest(`/professor/cursos/${curso.id}/materiais`, {}, token)); }
    catch (error) { setErro(error.message); }
    finally { setCarregando(false); }
  }, [curso.id, token]);
  /* Fim item 21 */
  useEffect(() => { carregar(); }, [carregar]);

  async function escolherArquivo() {
    const resultado = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true, multiple: false });
    if (!resultado.canceled) { setArquivo(resultado.assets[0]); setTipo("arquivo"); setUrl(""); }
  }

  /* Sprint item 21 - Permitir que o instrutor publique materiais do curso, como livros, apostilas e códigos - Valida os dados e publica o material complementar do curso */
  async function cadastrar() {
    setErro("");
    try {
      const form = new FormData();
      form.append("titulo", titulo);
      form.append("tipo", tipo);
      form.append("descricao", descricao);
      if (arquivo) form.append("arquivo", { uri: arquivo.uri, name: arquivo.name, type: arquivo.mimeType || "application/octet-stream" });
      else form.append("url", url);
      await apiRequest(`/professor/cursos/${curso.id}/materiais`, { method: "POST", body: form }, token);
      setTitulo(""); setDescricao(""); setUrl(""); setArquivo(null);
      await carregar();
    } catch (error) { setErro(error.message); }
  }
  /* Fim item 21 */

  async function excluir(item) {
    try { /* Sprint item 21 - Permitir que o instrutor publique materiais do curso, como livros, apostilas e códigos - Publica, lista ou permite baixar os materiais complementares */
    await apiRequest(`/professor/cursos/${curso.id}/materiais/${item.id}`, { method: "DELETE" }, token);
    /* Fim item 21 */ await carregar(); }
    catch (error) { setErro(error.message); }
  }

  return <ScrollView contentContainerStyle={globalStyles.page}>
    <Pressable style={styles.back} onPress={onBack}><Text style={styles.backText}>‹  Voltar aos cursos</Text></Pressable>
    <Text style={globalStyles.title}>Complementos</Text><Text style={globalStyles.eyebrow}>{curso.titulo}</Text>
    {/* Sprint item 21 - Permitir que o instrutor publique materiais do curso, como livros, apostilas e códigos - Publica, lista ou permite baixar os materiais complementares */}
    <View style={[globalStyles.card, styles.form]}>
      <TextInput style={styles.input} placeholder="Título" value={titulo} onChangeText={setTitulo} />
      <TextInput style={styles.input} placeholder="Tipo (link, pdf, livro, apostila, código...)" value={tipo} onChangeText={setTipo} />
      <TextInput style={[styles.input, styles.multiline]} placeholder="Descrição e instruções para os alunos" value={descricao} onChangeText={setDescricao} multiline />
      <TextInput style={styles.input} placeholder="Link externo https://..." value={url} onChangeText={setUrl} editable={!arquivo} autoCapitalize="none" />
      <Pressable style={styles.secondary} onPress={escolherArquivo}><AppIcon name="attach-outline" size={18} color={colors.darkGreen} /><Text style={styles.secondaryText}>{arquivo?.name || "Escolher arquivo"}</Text></Pressable>
      {arquivo ? <Pressable onPress={() => setArquivo(null)}><Text style={styles.removeFile}>Remover arquivo escolhido</Text></Pressable> : null}
      <Pressable style={styles.primary} onPress={cadastrar} disabled={!titulo.trim() || (!arquivo && !url.trim())}><Text style={styles.primaryText}>Adicionar complemento</Text></Pressable>
      {erro ? <Text style={styles.error}>{erro}</Text> : null}
    </View>
    {/* Fim item 21 */}
    <Text style={styles.heading}>Materiais cadastrados</Text>
    {carregando ? <Text>Carregando...</Text> : null}
    {materiais.map(item => /* Sprint item 21 - Permitir que o instrutor publique materiais do curso, como livros, apostilas e códigos - Publica, lista ou permite baixar os materiais complementares */ <View key={item.id} style={[globalStyles.card, styles.item]}><View style={styles.itemInfo}><Text style={styles.itemTitle}>{item.titulo}</Text><Text style={styles.meta}>{item.tipo}{item.nome_arquivo ? ` · ${item.nome_arquivo}` : ""}</Text>{item.descricao ? <Text>{item.descricao}</Text> : null}</View><Pressable onPress={() => excluir(item)} accessibilityLabel={`Remover ${item.titulo}`}><AppIcon name="trash-outline" size={21} color={colors.red} /></Pressable></View> /* Fim item 21 */)}
    {!carregando && materiais.length === 0 ? <Text style={globalStyles.message}>Nenhum complemento cadastrado.</Text> : null}
  </ScrollView>;
}

/* Sprint item 39 - Desenvolver todas as telas do aplicativo - Define os estilos dos componentes nativos desta tela */
const styles = StyleSheet.create({
  back: { marginBottom: 12 }, backText: { color: colors.darkGreen, fontWeight: "700" },
  form: { gap: 12, marginVertical: 20 }, input: { borderWidth: 1, borderColor: "#d5dfda", borderRadius: 10, padding: 12, backgroundColor: "white" }, multiline: { minHeight: 80, textAlignVertical: "top" },
  secondary: { borderWidth: 1, borderColor: colors.darkGreen, borderRadius: 10, padding: 12, flexDirection: "row", gap: 8, alignItems: "center" }, secondaryText: { color: colors.darkGreen, fontWeight: "600" },
  removeFile: { color: colors.red }, primary: { backgroundColor: colors.darkGreen, padding: 14, borderRadius: 10, alignItems: "center" }, primaryText: { color: "white", fontWeight: "700" },
  heading: { fontSize: 20, fontWeight: "700", marginBottom: 12 }, item: { flexDirection: "row", gap: 12, alignItems: "center", marginBottom: 10 }, itemInfo: { flex: 1, gap: 5 }, itemTitle: { fontWeight: "700", fontSize: 16 }, meta: { color: colors.darkGreen }, error: { color: colors.red }
});
/* Fim item 39 */
