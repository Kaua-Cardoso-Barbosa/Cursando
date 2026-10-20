import AppIcon from "../components/AppIcon";
import * as ImagePicker from "expo-image-picker";
import { useEffect, useState } from "react";
import { Alert, Image, ImageBackground, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { apiRequest, resolverUrlMidia } from "../api/client";
import BrandLogo from "../components/BrandLogo";
import Field from "../components/Field";
import { colors, globalStyles } from "../styles";

export default function EditarCursoScreen({ curso, token, onCancel, onSave, salvando }) {
  const [titulo, setTitulo] = useState(curso?.titulo || "");
  const [descricao, setDescricao] = useState(curso?.descricao || "");
  const [imagem, setImagem] = useState(null);
  // Sprint item 28: loads taxonomy options and the current course selections in the app.
  const [categorias, setCategorias] = useState([]);
  const [temas, setTemas] = useState([]);
  const [carregandoTaxonomias, setCarregandoTaxonomias] = useState(true);
  const [idCategoria, setIdCategoria] = useState("");
  const [idTema, setIdTema] = useState("");
  const [novaCategoria, setNovaCategoria] = useState(false);
  const [novoTema, setNovoTema] = useState(false);
  const [nomeNovaCategoria, setNomeNovaCategoria] = useState("");
  const [nomeNovoTema, setNomeNovoTema] = useState("");
  const preview = imagem?.uri || resolverUrlMidia(curso?.imagem);

  useEffect(() => {
    let ativo = true;
    Promise.all([
      apiRequest("/taxonomias/categorias", {}, token),
      apiRequest("/taxonomias/temas", {}, token),
      apiRequest(`/professor/cursos/${curso.id}/taxonomia`, {}, token)
    ]).then(([listaCategorias, listaTemas, taxonomiaCurso]) => {
      if (!ativo) return;
      setCategorias(Array.isArray(listaCategorias) ? listaCategorias : []);
      setTemas(Array.isArray(listaTemas) ? listaTemas : []);
      setIdCategoria(taxonomiaCurso.id_categoria ? String(taxonomiaCurso.id_categoria) : "");
      setIdTema(taxonomiaCurso.id_tema ? String(taxonomiaCurso.id_tema) : "");
    }).catch((error) => Alert.alert("Erro", error.message)).finally(() => {
      if (ativo) setCarregandoTaxonomias(false);
    });
    return () => { ativo = false; };
  }, [curso.id, token]);

  async function escolherImagem() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85
    });

    if (!result.canceled) {
      setImagem(result.assets[0]);
    }
  }

  // Sprint item 18: solicita acesso à câmera e usa a foto capturada como capa do curso.
  async function tirarFoto() {
    const permissao = await ImagePicker.requestCameraPermissionsAsync();
    if (!permissao.granted) {
      Alert.alert("Permissão da câmera", "Permita o acesso à câmera nas configurações do aparelho para tirar uma foto.");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85
    });
    if (!result.canceled) setImagem(result.assets[0]);
  }

  return (
    <ImageBackground source={require("../../assets/bg.png")} resizeMode="cover" style={styles.bg}>
      <ScrollView contentContainerStyle={styles.page}>
        <View style={styles.header}>
          <BrandLogo compact />
        </View>
        <View style={styles.titleBlock}>
          <Text style={styles.heading}>Editar curso</Text>
          <Text style={styles.subheading}>Atualize as informacoes do curso</Text>
        </View>
        <View style={styles.card}>
          <Pressable style={styles.upload} onPress={escolherImagem}>
            {preview ? <Image source={{ uri: preview }} style={styles.image} /> : null}
            <View style={styles.uploadIcon}>
              <AppIcon name="cloud-upload-outline" size={42} color={colors.white} />
            </View>
          </Pressable>
          <Pressable style={styles.cameraButton} onPress={tirarFoto}>
            <Text style={styles.cameraButtonText}>Tirar foto da capa</Text>
          </Pressable>

          <Field label="Titulo:" value={titulo} onChangeText={setTitulo} />
          <Field label="Descricao:" value={descricao} onChangeText={setDescricao} multiline />

          {/* Sprint item 28: lets instructors select existing taxonomy or submit a new name. */}
          <Text style={styles.taxonomyLabel}>Categoria do curso</Text>
          <View style={styles.taxonomyOptions}>
            <Pressable style={[styles.taxonomyOption, !idCategoria && !novaCategoria && styles.taxonomyOptionActive]} onPress={() => { setIdCategoria(""); setNovaCategoria(false); }}><Text style={[styles.taxonomyOptionText, !idCategoria && !novaCategoria && styles.taxonomyOptionTextActive]}>Nenhuma</Text></Pressable>
            {categorias.map((item) => <Pressable key={item.id} style={[styles.taxonomyOption, idCategoria === String(item.id) && styles.taxonomyOptionActive]} onPress={() => { setIdCategoria(String(item.id)); setNovaCategoria(false); }}><Text style={[styles.taxonomyOptionText, idCategoria === String(item.id) && styles.taxonomyOptionTextActive]}>{item.nome}</Text></Pressable>)}
            <Pressable style={[styles.taxonomyOption, novaCategoria && styles.taxonomyOptionActive]} onPress={() => { setIdCategoria(""); setNovaCategoria(true); }}><Text style={[styles.taxonomyOptionText, novaCategoria && styles.taxonomyOptionTextActive]}>Criar nova</Text></Pressable>
          </View>
          {novaCategoria && <TextInput style={styles.taxonomyInput} value={nomeNovaCategoria} onChangeText={setNomeNovaCategoria} placeholder="Nome da nova categoria" />}

          <Text style={styles.taxonomyLabel}>Tema do curso</Text>
          <View style={styles.taxonomyOptions}>
            <Pressable style={[styles.taxonomyOption, !idTema && !novoTema && styles.taxonomyOptionActive]} onPress={() => { setIdTema(""); setNovoTema(false); }}><Text style={[styles.taxonomyOptionText, !idTema && !novoTema && styles.taxonomyOptionTextActive]}>Nenhum</Text></Pressable>
            {temas.map((item) => <Pressable key={item.id} style={[styles.taxonomyOption, idTema === String(item.id) && styles.taxonomyOptionActive]} onPress={() => { setIdTema(String(item.id)); setNovoTema(false); }}><Text style={[styles.taxonomyOptionText, idTema === String(item.id) && styles.taxonomyOptionTextActive]}>{item.nome}</Text></Pressable>)}
            <Pressable style={[styles.taxonomyOption, novoTema && styles.taxonomyOptionActive]} onPress={() => { setIdTema(""); setNovoTema(true); }}><Text style={[styles.taxonomyOptionText, novoTema && styles.taxonomyOptionTextActive]}>Criar novo</Text></Pressable>
          </View>
          {novoTema && <TextInput style={styles.taxonomyInput} value={nomeNovoTema} onChangeText={setNomeNovoTema} placeholder="Nome do novo tema" />}

          <View style={styles.buttons}>
            <Pressable style={globalStyles.secondaryButton} onPress={onCancel}>
              <Text style={globalStyles.secondaryText}>Cancelar</Text>
            </Pressable>
            <Pressable
              style={globalStyles.primaryButton}
              onPress={() => onSave({ titulo, descricao, imagem, idCategoria, idTema, novaCategoria, novoTema, nomeNovaCategoria, nomeNovoTema })}
              disabled={salvando || carregandoTaxonomias}
            >
              <Text style={globalStyles.buttonText}>{carregandoTaxonomias ? "Carregando..." : salvando ? "Salvando..." : "Salvar"}</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: {
    flex: 1,
    backgroundColor: colors.green
  },
  page: {
    flexGrow: 1,
    paddingBottom: 32
  },
  header: {
    height: 92,
    backgroundColor: colors.darkGreen,
    alignItems: "center",
    justifyContent: "center"
  },
  titleBlock: {
    paddingHorizontal: 24,
    marginTop: 28,
    marginBottom: 22
  },
  heading: {
    color: colors.white,
    fontSize: 36,
    lineHeight: 42,
    fontWeight: "800",
    marginBottom: 3
  },
  subheading: {
    color: colors.white,
    fontSize: 15,
    lineHeight: 19
  },
  card: {
    marginHorizontal: 18,
    borderWidth: 1.5,
    borderColor: colors.black,
    borderRadius: 8,
    backgroundColor: colors.white,
    padding: 16
  },
  upload: {
    height: 152,
    borderWidth: 1.5,
    borderColor: colors.black,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#d6d6d6",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 28
  },
  image: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%"
  },
  uploadIcon: {
    alignItems: "center",
    justifyContent: "center"
  },
  cameraButton: {
    alignSelf: "flex-start",
    marginTop: -18,
    marginBottom: 24,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: colors.darkGreen
  },
  cameraButtonText: { color: colors.white, fontWeight: "700" },
  taxonomyLabel: { color: colors.darkGreen, fontWeight: "700", marginTop: 16, marginBottom: 8 },
  taxonomyOptions: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 },
  taxonomyOption: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8 },
  taxonomyOptionActive: { backgroundColor: colors.darkGreen, borderColor: colors.darkGreen },
  taxonomyOptionText: { color: colors.darkGreen, fontWeight: "600" },
  taxonomyOptionTextActive: { color: colors.white },
  taxonomyInput: { minHeight: 44, borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 10, marginBottom: 8, color: colors.black },
  buttons: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12
  }
});
