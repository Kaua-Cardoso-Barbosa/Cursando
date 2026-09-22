import { useState } from "react";
import {
  ActivityIndicator,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View
} from "react-native";
import { apiRequest, salvarSessao } from "../api/client";
import BrandLogo from "../components/BrandLogo";
import Field from "../components/Field";
import { colors, globalStyles } from "../styles";

export default function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function entrar() {
    setErro("");
    setCarregando(true);
    try {
      const dados = await apiRequest("/login", {
        method: "POST",
        body: JSON.stringify({ email, senha })
      });

      const payload = lerPayloadToken(dados?.token);
      const tipo = Number(payload?.tipo);
      if (![1, 2].includes(tipo)) {
        throw new Error("Este aplicativo e exclusivo para professores e alunos.");
      }

      const usuario = { ...(dados.usuario || {}), tipo };
      await salvarSessao(dados.token, usuario);
      onLogin(dados.token, usuario);
    } catch (error) {
      setErro(error.message);
    } finally {
      setCarregando(false);
    }
  }

  return (
    <ImageBackground source={require("../../assets/bg.png")} resizeMode="cover" style={styles.bg}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboard}
      >
        <BrandLogo />
        <View style={styles.card}>
          <Field label="Email:" value={email} onChangeText={setEmail} keyboardType="email-address" />
          <Field label="Senha:" value={senha} onChangeText={setSenha} secureTextEntry />
          {erro ? <Text style={globalStyles.error}>{erro}</Text> : null}
          <Pressable style={globalStyles.primaryButton} onPress={entrar} disabled={carregando}>
            {carregando ? <ActivityIndicator color={colors.white} /> : <Text style={globalStyles.buttonText}>Entrar</Text>}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
}

function lerPayloadToken(token) {
  if (!token) return {};
  try {
    const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(decodeBase64(base64));
  } catch {
    return {};
  }
}

function decodeBase64(input) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
  let output = "";
  let buffer = 0;
  let bits = 0;

  for (const char of input.replace(/=+$/, "")) {
    const value = chars.indexOf(char);
    if (value < 0) continue;
    buffer = (buffer << 6) | value;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      output += String.fromCharCode((buffer >> bits) & 0xff);
    }
  }

  try {
    return decodeURIComponent(
      output.split("").map((char) => `%${char.charCodeAt(0).toString(16).padStart(2, "0")}`).join("")
    );
  } catch {
    return output;
  }
}

const styles = StyleSheet.create({
  bg: {
    flex: 1,
    backgroundColor: colors.green
  },
  keyboard: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 22,
    gap: 28
  },
  card: {
    width: "100%",
    borderWidth: 1.2,
    borderColor: colors.black,
    borderRadius: 9,
    backgroundColor: colors.white,
    paddingHorizontal: 23,
    paddingVertical: 36,
    alignItems: "center"
  }
});
