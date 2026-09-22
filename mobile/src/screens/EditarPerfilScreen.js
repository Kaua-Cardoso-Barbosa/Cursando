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
      <Ionicons name="person-circle-outline" size={178} color={colors.black} style={styles.avatar} />
      <View style={styles.photoActions}>
        <Pressable style={globalStyles.secondaryButton}>
          <Text style={globalStyles.secondaryText}>Remover</Text>
        </Pressable>
        <Pressable style={styles.uploadButton} onPress={enviarFoto}>
          <Text style={styles.uploadText}>Enviar foto</Text>
        </Pressable>
      </View>

      <Field label="Nome" value={nome} onChangeText={setNome} />
      <Field label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" />
      <Field label="Cpf" value={cpf} onChangeText={setCpf} />
      <Field label="Senha" value={senha} onChangeText={setSenha} secureTextEntry />

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
    paddingTop: 45
  },
  avatar: {
    alignSelf: "center",
    marginBottom: 24
  },
  photoActions: {
    alignItems: "center",
    gap: 25,
    marginBottom: 34
  },
  uploadButton: {
    minHeight: 34,
    borderWidth: 1,
    borderColor: colors.green,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12
  },
  uploadText: {
    color: colors.green,
    fontSize: 23
  },
  buttons: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 18,
    marginTop: 12
  }
});
