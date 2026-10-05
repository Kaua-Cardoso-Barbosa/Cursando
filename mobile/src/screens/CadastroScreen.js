import { useState } from "react";
import {
  ActivityIndicator,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { apiRequest } from "../api/client";
import BrandLogo from "../components/BrandLogo";
import Field from "../components/Field";
import { colors, globalStyles } from "../styles";

export default function CadastroScreen({ onBack }) {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [cpf, setCpf] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function cadastrar() {
    if (carregando) return;

    if (!nome.trim() || !email.trim() || !cpf.trim() || !senha || !confirmarSenha) {
      setErro("Preencha todos os campos para criar sua conta.");
      return;
    }

    setErro("");
    setSucesso("");
    setCarregando(true);

    try {
      // Sprint item 1: cadastro de aluno no aplicativo usando o mesmo endpoint do site.
      await apiRequest("/cadastrar", {
        method: "POST",
        body: JSON.stringify({
          nome: nome.trim(),
          email: email.trim().toLowerCase(),
          cpf,
          senha,
          confirmar_senha: confirmarSenha
        })
      });

      setSucesso("Cadastro realizado. Entre com seu email e senha.");
      setTimeout(onBack, 1200);
    } catch (error) {
      setErro(error?.message || "Nao foi possivel realizar o cadastro.");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <ImageBackground source={require("../../assets/bg.png")} resizeMode="cover" style={styles.bg}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.keyboard}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <BrandLogo />
          <Text style={styles.title}>Cadastro</Text>

          <View style={styles.card}>
            <Field label="Nome:" value={nome} onChangeText={setNome} />
            <Field label="Email:" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
            <Field label="CPF:" value={cpf} onChangeText={setCpf} keyboardType="number-pad" />
            <Field label="Senha:" value={senha} onChangeText={setSenha} secureTextEntry />
            <Field label="Confirmar senha:" value={confirmarSenha} onChangeText={setConfirmarSenha} secureTextEntry />

            {erro ? <Text style={globalStyles.error}>{erro}</Text> : null}
            {sucesso ? <Text style={styles.success}>{sucesso}</Text> : null}

            <Pressable style={globalStyles.primaryButton} onPress={cadastrar} disabled={carregando}>
              {carregando ? <ActivityIndicator color={colors.white} /> : <Text style={globalStyles.buttonText}>Cadastrar</Text>}
            </Pressable>

            <Pressable style={styles.backButton} onPress={onBack}>
              <Text style={styles.backText}>Ja tenho cadastro</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: {
    flex: 1,
    backgroundColor: colors.green
  },
  keyboard: {
    flex: 1
  },
  content: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 22,
    paddingVertical: 24,
    gap: 18
  },
  title: {
    color: colors.black,
    fontSize: 34,
    lineHeight: 40,
    fontWeight: "700",
    textAlign: "center"
  },
  card: {
    width: "100%",
    maxWidth: 440,
    borderWidth: 1.5,
    borderColor: colors.black,
    borderRadius: 8,
    backgroundColor: colors.white,
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 22,
    alignItems: "stretch"
  },
  backButton: {
    alignItems: "center",
    paddingTop: 16
  },
  backText: {
    color: colors.darkGreen,
    fontSize: 15,
    textDecorationLine: "underline"
  },
  success: {
    color: colors.darkGreen,
    fontSize: 14,
    lineHeight: 19,
    marginBottom: 10
  }
});
