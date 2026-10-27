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
import { apiRequest, salvarSessao } from "../api/client_3_17";
import BrandLogo from "../components/BrandLogo_39";
import Field from "../components/Field_39";
import { colors, globalStyles } from "../styles_39";

export default
function LoginScreen({ onLogin, onSignup, onVerifyEmail }) {

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function entrar() {

    if (carregando) return;


    const emailTratado = email.trim().toLowerCase();


    if (!emailTratado || !senha) {
      setErro("Informe email e senha para entrar.");
      return;
    }

    setErro("");

    setCarregando(true);

    try {

      const dados = await apiRequest("/login", {
        method: "POST",
        body: JSON.stringify({
          email: emailTratado,
          senha
        })
      });

      if (!dados?.token) {
        throw new Error("A API n\u00e3o retornou um token de acesso.");
      }


      const payload = lerPayloadToken(dados.token);

      const tipo = Number(
        dados?.usuario?.tipo ??
        dados?.usuario?.tipo_usuario ??
        payload?.tipo
      );

      if (![1, 2].includes(tipo)) {
        throw new Error("Este aplicativo \u00e9 exclusivo para professores e alunos.");
      }

      const usuario = {
        ...(dados.usuario || {}),
        tipo
      };


      /* Sprint item 3 - Sincronizar dados entre aplicativo e sistema web - Atualiza os dados da sessão compartilhados entre o site e o aplicativo */
      await salvarSessao(dados.token, usuario);
      /* Fim item 3 */


      onLogin(dados.token, usuario);
    } catch (error) {


      if (error?.message?.includes("Verifique seu e-mail")) {
        setErro("");
        onVerifyEmail(emailTratado);
        return;
      }


      setErro(error?.message || "N\u00e3o foi poss\u00edvel realizar o login.");
    } finally {

      setCarregando(false);
    }
  }

  return (
    <ImageBackground
      source={require("../../assets/bg.png")}
      resizeMode="cover"
      style={styles.bg}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboard}
      >
        <ScrollView
          contentContainerStyle={styles.keyboardContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <BrandLogo />
          <Text style={styles.title}>Entrar</Text>

          <View style={styles.card}>
                                                                                       
            <Field
              label="Email:"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Field
              label="Senha:"
              value={senha}
              onChangeText={setSenha}
              secureTextEntry
            />

            {erro ? <Text style={globalStyles.error}>{erro}</Text> : null}

            <Pressable
              style={globalStyles.primaryButton}
              onPress={entrar}
              disabled={carregando}
            >
              {carregando ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={globalStyles.buttonText}>Entrar</Text>
              )}
            </Pressable>

                                                                                                                                                         
            <Pressable
              style={styles.signupButton}
              onPress={onSignup}
              disabled={carregando}
              accessibilityRole="button"
              accessibilityLabel="Criar cadastro de aluno"
            >
              <Text style={styles.signupText}>Não tem cadastro? Cadastre-se já</Text>
            </Pressable>
            <Pressable style={styles.verifyEmailButton} onPress={() => {
              const emailTratado = email.trim().toLowerCase();
              if (!emailTratado) {
                setErro("Informe seu e-mail para verificar o cadastro.");
                return;
              }
              onVerifyEmail(emailTratado);
            }}>
              <Text style={styles.verifyEmailText}>Verificar e-mail do cadastro</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
}

function lerPayloadToken(token) {
  if (!token) return {};

  try {

    const partePayload = token.split(".")[1];

    if (!partePayload) return {};

    const base64 = partePayload
      .replace(/-/g, "+")
      .replace(/_/g, "/");


    return JSON.parse(decodeBase64(base64));
  } catch {
    return {};
  }
}

function decodeBase64(input) {

  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";

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
      output
        .split("")
        .map(
          (char) =>
            `%${char.charCodeAt(0)
              .toString(16)
              .padStart(2, "0")}`
        )
        .join("")
    );
  } catch {
    return output;
  }
}

/* Sprint item 39 - Desenvolver todas as telas do aplicativo - Define os estilos dos componentes nativos desta tela */
const styles = StyleSheet.create({
  bg: {
    flex: 1,
    backgroundColor: colors.darkGreen
  },
  keyboard: {
    flex: 1,
  },
  keyboardContent: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 22,
    paddingVertical: 24,
    gap: 18
  },
  title: {
    color: colors.white,
    fontSize: 34,
    lineHeight: 40,
    fontWeight: "800",
    textAlign: "center"
  },
  card: {
    width: "100%",
    maxWidth: 440,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.45)",
    borderRadius: 8,
    backgroundColor: colors.white,
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 22,
    alignItems: "stretch",
    shadowColor: colors.black,
    shadowOpacity: 0.18,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 12 },
    elevation: 4
  },
  signupButton: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
    marginTop: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.softGray
  },
  signupText: {
    color: colors.darkGreen,
    fontSize: 15,
    fontWeight: "700"
  },
  verifyEmailButton: {
    alignItems: "center",
    paddingTop: 16
  },
  verifyEmailText: {
    color: colors.darkGreen,
    fontSize: 14,
    textDecorationLine: "underline"
  }
});
/* Fim item 39 */
