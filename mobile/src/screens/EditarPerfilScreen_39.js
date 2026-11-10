import { AdminCabecalho, AdminCampo } from '../components/Admin/AdminUI_39';
import AppIcon from "../components/AppIcon_39";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import * as ImagePicker from 'expo-image-picker';
import { resolverUrlMidia } from '../api/client_3_17';
import { useFeedback } from '../components/FeedbackProvider_39';
import { useState } from "react";
import Field from "../components/Field_39";
import { colors, globalStyles } from "../styles_39";

export default
function EditarPerfilScreen({ perfil, onCancel, onSave, salvando, titulo = 'Editar perfil', permitirImagem = true, administrativo = false, semCancelar = false, onLogout }) {
  const [nome, setNome] = useState(perfil?.nome || "");
  const [email, setEmail] = useState(perfil?.email || "");
  const [cpf, setCpf] = useState(perfil?.cpf || "");
  const [arroba, setArroba] = useState(perfil?.arroba || "");
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [imagem, setImagem] = useState(null);
  const [erroSalvar, setErroSalvar] = useState(false);
  const { mostrarAlerta } = useFeedback();
  async function escolherImagem() {
    try {
      const permissao = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissao.granted) { mostrarAlerta('Imagem de perfil', 'Permita o acesso às fotos para escolher sua imagem.'); return; }
      const resultado = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: .85 });
      if (!resultado.canceled) {
        const arquivo = resultado.assets[0];
        const tipo = arquivo.mimeType || 'image/jpeg';
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(tipo)) { mostrarAlerta('Imagem de perfil', 'Escolha uma imagem JPG, PNG ou WebP.', 'erro'); return; }
        if (arquivo.fileSize > 5 * 1024 * 1024) { mostrarAlerta('Imagem de perfil', 'A imagem deve ter até 5 MB.', 'erro'); return; }
        setImagem({ uri: arquivo.uri, type: tipo, name: `perfil.${tipo === 'image/png' ? 'png' : tipo === 'image/webp' ? 'webp' : 'jpg'}` });
      }
    } catch (erro) { mostrarAlerta('Imagem de perfil', erro.message, 'erro'); }
  }
  const Campo = administrativo ? AdminCampo : Field;
  const preview = imagem?.uri || (perfil?.imagem_perfil ? resolverUrlMidia(perfil.imagem_perfil) : null);

  return (
    <ScrollView contentContainerStyle={[globalStyles.page, styles.page, administrativo && { paddingHorizontal: 18, paddingTop: 22, gap: 20 }]}>
      <View style={[styles.header, administrativo && { display: "none" }]}>
        {preview ? <Image source={{ uri: preview }} style={{ width: 84, height: 84, borderRadius: 42 }} /> : <AppIcon name="person-circle-outline" size={84} color={colors.black} style={styles.avatar} />}
        <View style={styles.headerText}>
          <Text style={globalStyles.title}>{titulo}</Text>
          <Text style={globalStyles.eyebrow}>Atualize seus dados</Text>
          <View style={globalStyles.divider} />
        </View>
      </View>

      {administrativo && <AdminCabecalho etiqueta="CONTA" titulo={titulo} descricao="Atualize seus dados, sua foto e a senha da conta." />}
      <View style={[styles.card, administrativo && { padding: 20, gap: 16, borderRadius: 16 }]}>
        {administrativo && (preview ? <Image source={{ uri: preview }} style={{ width: 86, height: 86, borderRadius: 43, borderWidth: 3, borderColor: "#e5f5ec" }} /> : <Text style={{ color: "#087044", fontSize: 40 }}>{(nome || "U").slice(0, 1).toUpperCase()}</Text>)}
        {permitirImagem && <Pressable style={[globalStyles.secondaryButton, { marginBottom: 16 }]} disabled={salvando} onPress={escolherImagem}><Text style={globalStyles.secondaryText}>Escolher imagem de perfil</Text></Pressable>}
        <Campo label="Nome" value={nome} onChangeText={setNome} />
        {Number(perfil?.tipo) === 1 && <View>
          <Campo label="@ do perfil (opcional)" value={arroba} onChangeText={setArroba}
            autoCapitalize="none" autoCorrect={false} maxLength={41} placeholder="Ex.: mariana.duarte" />
          <Text style={styles.ajudaArroba}>Use de 3 a 40 caracteres: letras sem acento, números, ponto ou sublinhado. Comece com uma letra. Deixe vazio para usar o identificador aleatório.</Text>
        </View>}
        <Campo label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" />
        <Campo label="Cpf" value={cpf} onChangeText={setCpf} />
        <Campo label="Senha" value={senha} onChangeText={setSenha} secureTextEntry />
        <Campo label="Confirmar senha" value={confirmarSenha} onChangeText={setConfirmarSenha} secureTextEntry />
      </View>

      <View style={[styles.buttons, administrativo && { flexDirection: "column", marginTop: 0 }]}>
        {!semCancelar && <Pressable style={globalStyles.secondaryButton} disabled={salvando} onPress={onCancel}>
          <Text style={globalStyles.secondaryText}>Cancelar</Text>
        </Pressable>}
        <Pressable
          style={globalStyles.primaryButton}
          onPress={async () => { setErroSalvar(false); const salvo = await onSave({ nome, email, cpf, senha, confirmar_senha: confirmarSenha,
            ...(imagem ? { imagem_perfil: imagem } : {}), ...(Number(perfil?.tipo) === 1 ? { arroba } : {}) }); if (salvo === false) setErroSalvar(true); }}
          disabled={salvando}
        >
          <Text style={globalStyles.buttonText}>{salvando ? "Salvando..." : "Salvar"}</Text>
        </Pressable>
      </View>
      {erroSalvar && <Text accessibilityRole="alert" style={{ color: colors.red, marginTop: 16 }}>Não foi possível salvar. Confira os dados e tente novamente.</Text>}
      {administrativo && onLogout && <Pressable style={globalStyles.dangerButton} onPress={onLogout}><Text style={globalStyles.buttonText}>Sair</Text></Pressable>}
    </ScrollView>
  );
}

/* Sprint item 39 - Desenvolver todas as telas do aplicativo - Define os estilos dos componentes nativos desta tela */
const styles = StyleSheet.create({
  ajudaArroba: { color: colors.textMuted, fontSize: 13, lineHeight: 19, marginBottom: 14 },
  page: {
    paddingTop: 28
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginBottom: 22
  },
  headerText: {
    flex: 1
  },
  avatar: {
    alignSelf: "center"
  },
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    backgroundColor: colors.white,
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 2
  },
  buttons: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 14,
    marginTop: 22
  }
});
/* Fim item 39 */
