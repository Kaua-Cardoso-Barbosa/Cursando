import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useState } from "react";
import Field from "../components/Field";
import { colors, globalStyles } from "../styles";

export default function EditarPerfilScreen({ perfil, onCancel, onSave, salvando }) {
  const [nome, setNome] = useState(perfil?.nome || "");
  const [email, setEmail] = useState(perfil?.email || "");
  const [cpf, setCpf] = useState(perfil?.cpf || "");
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");

  async function enviarFoto() {
    await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85
    });
  }

  return (
    <ScrollView contentContainerStyle={[globalStyles.page, styles.page]}>
      <View style={styles.header}>
        <Ionicons name="person-circle-outline" size={96} color={colors.black} style={styles.avatar} />
        <View style={styles.headerText}>
          <Text style={globalStyles.title}>Editar perfil</Text>
          <Text style={globalStyles.eyebrow}>Atualize seus dados</Text>
          <View style={globalStyles.divider} />
        </View>
      </View>

      <View style={styles.photoActions}>
        <Pressable style={globalStyles.secondaryButton}>
          <Text style={globalStyles.secondaryText}>Remover</Text>
        </Pressable>
        <Pressable style={styles.uploadButton} onPress={enviarFoto}>
          <Ionicons name="cloud-upload-outline" size={18} color={colors.green} />
          <Text style={styles.uploadText}>Enviar foto</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Field label="Nome" value={nome} onChangeText={setNome} />
        <Field label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" />
        <Field label="Cpf" value={cpf} onChangeText={setCpf} />
        <Field label="Senha" value={senha} onChangeText={setSenha} secureTextEntry />
        <Field label="Confirmar senha" value={confirmarSenha} onChangeText={setConfirmarSenha} secureTextEntry />
      </View>

      <View style={styles.buttons}>
        <Pressable style={globalStyles.secondaryButton} onPress={onCancel}>
          <Text style={globalStyles.secondaryText}>Cancelar</Text>
        </Pressable>
        <Pressable
          style={globalStyles.primaryButton}
          onPress={() => onSave({ nome, email, cpf, senha, confirmar_senha: confirmarSenha || senha })}
          disabled={salvando}
        >
          <Text style={globalStyles.buttonText}>{salvando ? "Salvando..." : "Salvar"}</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
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
  photoActions: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
    marginBottom: 22
  },
  card: {
    borderWidth: 1.5,
    borderColor: colors.black,
    borderRadius: 8,
    backgroundColor: colors.white,
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 2
  },
  uploadButton: {
    minHeight: 42,
    borderWidth: 1,
    borderColor: colors.green,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 14
  },
  uploadText: {
    color: colors.green,
    fontSize: 18,
    lineHeight: 22
  },
  buttons: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 14,
    marginTop: 22
  }
});
