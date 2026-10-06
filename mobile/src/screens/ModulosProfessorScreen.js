import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useEffect, useState } from "react";
import { Alert, Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { apiRequest, resolverUrlMidia } from "../api/client";
import Field from "../components/Field";
import { colors, globalStyles } from "../styles";

export default function ModulosProfessorScreen({ curso, token, onBack }) {
  // Sprint item 6: organiza módulos, capas e videoaulas do curso no aplicativo do instrutor.
  const [modulos, setModulos] = useState([]);
  const [modulo, setModulo] = useState(null);
  const [aulas, setAulas] = useState([]);
  const [tituloModulo, setTituloModulo] = useState("");
  const [descricaoModulo, setDescricaoModulo] = useState("");
  const [imagemModulo, setImagemModulo] = useState(null);
  const [tituloAula, setTituloAula] = useState("");
  const [descricaoAula, setDescricaoAula] = useState("");
  const [videoAula, setVideoAula] = useState(null);
  const [carregando, setCarregando] = useState(false);
  const [salvando, setSalvando] = useState(false);

  async function carregarModulos() {
    setCarregando(true);
    try {
      const dados = await apiRequest(`/professor/cursos/${curso.id}/modulos`, {}, token);
      setModulos(Array.isArray(dados) ? dados : []);
    } catch (error) {
      Alert.alert("Módulos", error.message);
    } finally {
      setCarregando(false);
    }
  }

  async function carregarAulas(idModulo) {
    setCarregando(true);
    try {
      const dados = await apiRequest(`/professor/cursos/${curso.id}/aulas?id_modulo=${idModulo}`, {}, token);
      setAulas(Array.isArray(dados) ? dados : []);
    } catch (error) {
      Alert.alert("Aulas", error.message);
      setAulas([]);
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregarModulos();
  }, [curso.id]);

  async function escolherImagem() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85
    });
    if (!result.canceled) setImagemModulo(result.assets[0]);
  }

  async function criarModulo() {
    if (!tituloModulo.trim()) {
      Alert.alert("Módulo", "Informe o nome do módulo.");
      return;
    }
    setSalvando(true);
    try {
      const form = new FormData();
      form.append("titulo", tituloModulo.trim());
      form.append("descricao", descricaoModulo.trim());
      if (imagemModulo?.uri) {
        form.append("imagem", {
          uri: imagemModulo.uri,
          name: imagemModulo.fileName || "modulo.jpg",
          type: imagemModulo.mimeType || "image/jpeg"
        });
      }
      const criado = await apiRequest(`/professor/cursos/${curso.id}/modulos`, { method: "POST", body: form }, token);
      setTituloModulo("");
      setDescricaoModulo("");
      setImagemModulo(null);
      await carregarModulos();
      if (criado.id_modulo) {
        const novoModulo = { id: criado.id_modulo, titulo: tituloModulo.trim(), descricao: descricaoModulo.trim() };
        setModulo(novoModulo);
        setAulas([]);
      }
    } catch (error) {
      Alert.alert("Erro ao criar módulo", error.message);
    } finally {
      setSalvando(false);
    }
  }

  async function abrirModulo(item) {
    setModulo(item);
    setTituloAula("");
    setDescricaoAula("");
    setVideoAula(null);
    await carregarAulas(item.id);
  }

  async function escolherVideo() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      quality: 1
    });
    if (!result.canceled) setVideoAula(result.assets[0]);
  }

  async function criarAula() {
    if (!tituloAula.trim() || !descricaoAula.trim() || !videoAula?.uri) {
      Alert.alert("Aula", "Preencha título, descrição e selecione o vídeo.");
      return;
    }
    setSalvando(true);
    try {
      const form = new FormData();
      form.append("titulo", tituloAula.trim());
      form.append("descricao", descricaoAula.trim());
      form.append("id_modulo", String(modulo.id));
      form.append("video", {
        uri: videoAula.uri,
        name: videoAula.fileName || "aula.mp4",
        type: videoAula.mimeType || "video/mp4"
      });
      await apiRequest(`/professor/cursos/${curso.id}/aulas`, { method: "POST", body: form }, token, 120000);
      setTituloAula("");
      setDescricaoAula("");
      setVideoAula(null);
      await carregarAulas(modulo.id);
      await carregarModulos();
    } catch (error) {
      Alert.alert("Erro ao criar aula", error.message);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <ScrollView
      contentContainerStyle={globalStyles.page}
      refreshControl={<RefreshControl refreshing={carregando} onRefresh={modulo ? () => carregarAulas(modulo.id) : carregarModulos} />}
    >
      <Pressable style={styles.back} onPress={modulo ? () => setModulo(null) : onBack}>
        <Ionicons name="arrow-back" size={20} color={colors.darkGreen} />
        <Text style={styles.backText}>{modulo ? "Voltar aos módulos" : "Voltar aos cursos"}</Text>
      </Pressable>
      <Text style={globalStyles.title}>{modulo?.titulo || `Módulos de ${curso.titulo}`}</Text>
      <View style={globalStyles.divider} />

      {!modulo ? (
        <>
          <View style={[globalStyles.card, styles.formCard]}>
            <Text style={styles.sectionTitle}>Criar módulo</Text>
            <Field label="Nome do módulo" value={tituloModulo} onChangeText={setTituloModulo} />
            <Field label="Descrição" value={descricaoModulo} onChangeText={setDescricaoModulo} multiline />
            <Pressable style={styles.imagePicker} onPress={escolherImagem}>
              {imagemModulo?.uri ? <Image source={{ uri: imagemModulo.uri }} style={styles.moduleImage} /> : null}
              <Ionicons name="image-outline" size={22} color={colors.darkGreen} />
              <Text style={styles.actionText}>{imagemModulo?.fileName || "Selecionar imagem do módulo"}</Text>
            </Pressable>
            <Pressable style={globalStyles.primaryButton} onPress={criarModulo} disabled={salvando}>
              <Text style={globalStyles.buttonText}>{salvando ? "Salvando..." : "Criar módulo"}</Text>
            </Pressable>
          </View>
          <View style={styles.list}>
            {modulos.map((item) => (
              <Pressable key={item.id} style={[globalStyles.card, styles.moduleCard]} onPress={() => abrirModulo(item)}>
                {item.imagem ? <Image source={{ uri: resolverUrlMidia(item.imagem) }} style={styles.moduleImage} /> : null}
                <View style={styles.moduleInfo}>
                  <Text style={styles.moduleTitle}>{item.titulo}</Text>
                  <Text style={styles.moduleDescription}>{item.descricao || "Sem descrição"}</Text>
                  <Text style={styles.actionText}>{item.total_aulas || 0} aulas · Entrar no módulo</Text>
                </View>
              </Pressable>
            ))}
            {!carregando && modulos.length === 0 ? <Text style={globalStyles.message}>Este curso ainda não tem módulos.</Text> : null}
          </View>
        </>
      ) : (
        <>
          <View style={[globalStyles.card, styles.formCard]}>
            <Text style={styles.sectionTitle}>Adicionar aula a este módulo</Text>
            <Field label="Título da aula" value={tituloAula} onChangeText={setTituloAula} />
            <Field label="Descrição" value={descricaoAula} onChangeText={setDescricaoAula} multiline />
            <Pressable style={styles.imagePicker} onPress={escolherVideo}>
              <Ionicons name="videocam-outline" size={22} color={colors.darkGreen} />
              <Text style={styles.actionText}>{videoAula?.fileName || "Selecionar vídeo"}</Text>
            </Pressable>
            <Pressable style={globalStyles.primaryButton} onPress={criarAula} disabled={salvando}>
              <Text style={globalStyles.buttonText}>{salvando ? "Enviando vídeo..." : "Adicionar aula"}</Text>
            </Pressable>
          </View>
          <View style={styles.list}>
            {aulas.map((aula) => (
              <View key={aula.id} style={[globalStyles.card, styles.lessonCard]}>
                <Ionicons name="play-circle-outline" size={24} color={colors.darkGreen} />
                <View style={styles.moduleInfo}>
                  <Text style={styles.moduleTitle}>{aula.titulo}</Text>
                  <Text style={styles.moduleDescription}>{aula.descricao}</Text>
                  <Text style={styles.actionText}>{aula.status_nome || "privada"}</Text>
                </View>
              </View>
            ))}
            {!carregando && aulas.length === 0 ? <Text style={globalStyles.message}>Nenhuma aula neste módulo.</Text> : null}
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  back: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 12 },
  backText: { color: colors.darkGreen, fontSize: 15, fontWeight: "700" },
  formCard: { gap: 12, marginBottom: 20 },
  sectionTitle: { color: colors.black, fontSize: 20, fontWeight: "800" },
  imagePicker: { minHeight: 48, borderWidth: 1, borderColor: colors.darkGreen, borderRadius: 8, padding: 10, flexDirection: "row", alignItems: "center", gap: 9, overflow: "hidden" },
  moduleImage: { width: "100%", height: 150, backgroundColor: "#e7ede9" },
  list: { gap: 14 },
  moduleCard: { overflow: "hidden", padding: 0 },
  moduleInfo: { flex: 1, padding: 13, gap: 5 },
  moduleTitle: { color: colors.black, fontSize: 18, fontWeight: "800" },
  moduleDescription: { color: colors.textMuted, fontSize: 14 },
  actionText: { color: colors.darkGreen, fontWeight: "700" },
  lessonCard: { flexDirection: "row", alignItems: "center", padding: 12 }
});
