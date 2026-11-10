import Select from '../components/Select_39';
import AppIcon from "../components/AppIcon_39";
import * as ImagePicker from "expo-image-picker";
import { useEffect, useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { apiRequest, resolverUrlMidia } from "../api/client_3_17";
import BotaoVoltar from "../components/BotaoVoltar_39";
import Field from "../components/Field_39";
import { useFeedback } from "../components/FeedbackProvider_39";
import { colors, globalStyles } from "../styles_39";

export default
function EditarCursoScreen({ curso, token, onCancel, onSave, salvando }) {
  const { mostrarAlerta } = useFeedback();
  const [titulo, setTitulo] = useState(curso?.titulo || "");
  const [descricao, setDescricao] = useState(curso?.descricao || "");
  const [imagem, setImagem] = useState(null);

  const [categorias, setCategorias] = useState([]);
  const [temas, setTemas] = useState([]);
  /* Sprint item 28 - Permitir filtro de cursos por tema, categoria e avaliação - Aplica os filtros de busca, tema, categoria e avaliação */
  const [carregandoTaxonomias, setCarregandoTaxonomias] = useState(true);
  /* Fim item 28 */
  const [idCategoria, setIdCategoria] = useState("");
  const [idTema, setIdTema] = useState("");
  /* Sprint item 28 - Permitir filtro de cursos por tema, categoria e avaliação - Aplica os filtros de busca, tema, categoria e avaliação */
  const [novaCategoria, setNovaCategoria] = useState(false);
  const [novoTema, setNovoTema] = useState(false);
  /* Fim item 28 */
  const [nomeNovaCategoria, setNomeNovaCategoria] = useState("");
  const [nomeNovoTema, setNomeNovoTema] = useState("");
  const preview = imagem?.uri || resolverUrlMidia(curso?.imagem);

  /* Sprint item 28 - Permitir filtro de cursos por tema, categoria e avaliação - Aplica os filtros de busca, tema, categoria e avaliação */
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
    }).catch((error) => {
      if (ativo) mostrarAlerta("Erro", error.message, "erro");
    }).finally(() => {
      if (ativo) setCarregandoTaxonomias(false);
    });
    return () => { ativo = false; };
  }, [curso.id, token, mostrarAlerta]);
  /* Fim item 28 */

  /* Sprint item 18 - Integrar recursos nativos: biometria, câmera, vibração e notificações - Abre a galeria nativa para selecionar uma imagem */
  /* Aqui a capa vem da galeria; a função seguinte permite capturá-la pela câmera. */
  async function escolherImagem() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85
    });

    if (!result.canceled) {
      setImagem(result.assets[0]);
    }
  }
  /* Fim item 18 */


  /* Sprint item 18 - Integrar recursos nativos: biometria, câmera, vibração e notificações - Solicita acesso à câmera e captura a imagem de capa */
  async function tirarFoto() {
    const permissao = await ImagePicker.requestCameraPermissionsAsync();
    if (!permissao.granted) {
      mostrarAlerta("Permissão da câmera", "Permita o acesso à câmera nas configurações do aparelho para tirar uma foto.");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85
    });
    if (!result.canceled) setImagem(result.assets[0]);
  }
  /* Fim item 18 */

  return (
    <View style={styles.bg}>
      <ScrollView contentContainerStyle={styles.page}>
        <BotaoVoltar onPress={onCancel} disabled={salvando}>Voltar aos cursos</BotaoVoltar>
        <View style={styles.titleBlock}>
          <Text style={styles.heading}>Editar curso</Text>
          <Text style={styles.subheading}>Atualize as informacoes do curso</Text>
        </View>
        <View style={styles.card}>
          <Pressable style={styles.upload} onPress={escolherImagem}>
            <Image source={preview ? { uri: preview } : imagemPadraoCurso} style={styles.image} />
            <View style={styles.uploadIcon}>
              <AppIcon name="cloud-upload-outline" size={42} color={colors.white} />
            </View>
          </Pressable>
          {/* Sprint item 18 - Integrar recursos nativos: biometria, câmera, vibração e notificações - Aciona os recursos nativos e trata as permissões do dispositivo */}
          <Pressable style={styles.cameraButton} onPress={tirarFoto}>
            <Text style={styles.cameraButtonText}>Tirar foto da capa</Text>
          </Pressable>
          {/* Fim item 18 */}

          <Field label="Titulo:" value={titulo} onChangeText={setTitulo} />
          <Field label="Descricao:" value={descricao} onChangeText={setDescricao} multiline />

                                                                                                                                                                    
          <Select titulo="Categoria do curso" valor={novaCategoria ? '__novo__' : idCategoria} disabled={salvando || carregandoTaxonomias}
            opcoes={[['', 'Nenhuma'], ...categorias.map(item => [String(item.id), item.nome]), ['__novo__', 'Criar nova']]}
            onChange={v => { setIdCategoria(v === '__novo__' ? '' : v); setNovaCategoria(v === '__novo__'); }} />
          {novaCategoria && <TextInput style={styles.taxonomyInput} value={nomeNovaCategoria} onChangeText={setNomeNovaCategoria} placeholder="Nome da nova categoria" />}

          <Select titulo="Tema do curso" valor={novoTema ? '__novo__' : idTema} disabled={salvando || carregandoTaxonomias}
            opcoes={[['', 'Nenhum'], ...temas.map(item => [String(item.id), item.nome]), ['__novo__', 'Criar novo']]}
            onChange={v => { setIdTema(v === '__novo__' ? '' : v); setNovoTema(v === '__novo__'); }} />
          {novoTema && <TextInput style={styles.taxonomyInput} value={nomeNovoTema} onChangeText={setNomeNovoTema} placeholder="Nome do novo tema" />}

          {/* Sprint item 28 - Permitir filtro de cursos por tema, categoria e avaliação - Aplica os filtros de busca, tema, categoria e avaliação */}
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
          {/* Fim item 28 */}
        </View>
      </ScrollView>
    </View>
  );
}

/* Sprint item 39 - Desenvolver todas as telas do aplicativo - Define os estilos dos componentes nativos desta tela */
const styles = StyleSheet.create({
  bg: {
    flex: 1,
    backgroundColor: colors.gray
  },
  page: {
    flexGrow: 1,
    paddingBottom: 24,
    paddingTop: 20,
    paddingHorizontal: 20
  },
  header: {
    height: 92,
    backgroundColor: colors.darkGreen,
    alignItems: "center",
    justifyContent: "center"
  },
  titleBlock: {
    marginTop: 8,
    marginBottom: 22
  },
  heading: {
    color: colors.ink,
    fontSize: 26,
    lineHeight: 34,
    fontWeight: "800",
    marginBottom: 3
  },
  subheading: {
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 19
  },
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    backgroundColor: colors.white,
    padding: 16
  },
  upload: {
    height: 152,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
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
  taxonomyOption: { borderWidth: 1, borderColor: colors.border, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 8 },
  taxonomyOptionActive: { backgroundColor: colors.darkGreen, borderColor: colors.darkGreen },
  taxonomyOptionText: { color: colors.darkGreen, fontWeight: "600" },
  taxonomyOptionTextActive: { color: colors.white },
  taxonomyInput: { minHeight: 44, borderWidth: 1, borderColor: colors.border, borderRadius: 14, paddingHorizontal: 10, marginBottom: 8, color: colors.ink },
  buttons: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12
  }
});
/* Fim item 39 */
import { imagemPadraoCurso } from '../imagens_padrao_39';
