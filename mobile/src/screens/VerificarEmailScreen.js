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

export default function VerificarEmailScreen({ email, codigoEnviado, onVerified }) {
  const emailNormalizado = (email || "").trim().toLowerCase().replace(/\.+$/, "");
  const [emailAtual, setEmailAtual] = useState(emailNormalizado);
  const [novoEmail, setNovoEmail] = useState(emailNormalizado);
  const [codigo, setCodigo] = useState("");
  const [senha, setSenha] = useState("");
  const [corrigindoEmail, setCorrigindoEmail] = useState(false);
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState(codigoEnviado === false
    ? "O cadastro foi criado, mas nao conseguimos enviar o codigo. Toque em Reenviar codigo."
    : "");
  const [carregando, setCarregando] = useState(false);

  async function verificar() {
    setCarregando(true);
    setErro("");
    try {
      // Sprint item 1: confirma no app o código do cadastro criado pelo mesmo endpoint usado no site.
      const dados = await apiRequest("/verificar_email_cadastro", {
        method: "POST",
        body: JSON.stringify({ email: emailAtual, codigo: codigo.trim() })
      });
      if (!dados?.token || !dados?.usuario) throw new Error("A API nao retornou a sessao verificada.");
      await onVerified(dados.token, dados.usuario);
    } catch (error) {
      setErro(error?.message || "Nao foi possivel verificar o e-mail.");
    } finally {
      setCarregando(false);
    }
  }

  async function reenviar() {
    setErro("");
    setMensagem("");
    try {
      // Sprint item 1: solicita outro código no fluxo de verificação do cadastro móvel.
      const dados = await apiRequest("/reenviar_codigo_cadastro", {
        method: "POST",
        body: JSON.stringify({ email: emailAtual })
      });
      setMensagem(dados?.mensagem?.descricao || "Enviamos um novo codigo para seu e-mail.");
    } catch (error) {
      setErro(error?.message || "Nao foi possivel reenviar o codigo.");
    }
  }

  async function corrigirEmail() {
    setErro("");
    setMensagem("");
    try {
      const dados = await apiRequest("/corrigir_email_cadastro", {
        method: "POST",
        // Sprint item 1: normaliza o novo endereço como no site e remove ponto acidental ao final.
        body: JSON.stringify({ email_atual: emailAtual, novo_email: novoEmail.trim().toLowerCase().replace(/\.+$/, ""), senha })
      });
      setEmailAtual(dados.email);
      setNovoEmail(dados.email);
      setCodigo("");
      setSenha("");
      setCorrigindoEmail(false);
      setMensagem(dados.codigo_enviado
        ? "E-mail corrigido. Enviamos um novo codigo para o endereco informado."
        : "E-mail corrigido. Nao foi possivel enviar o codigo; use Reenviar codigo.");
    } catch (error) {
      setErro(error?.message || "Nao foi possivel corrigir o e-mail.");
    }
  }

  return (
    <ImageBackground source={require("../../assets/bg.png")} resizeMode="cover" style={styles.bg}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.keyboard}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <BrandLogo />
          <View style={styles.card}>
            <Text style={styles.title}>Verifique seu e-mail</Text>
            <Text style={styles.description}>Digite o codigo de 6 digitos enviado para {emailAtual || "o e-mail informado"}. Se ele nao chegou, use Reenviar codigo.</Text>
            {corrigindoEmail ? (
              <>
                <Field label="Corrigir email:" value={novoEmail} onChangeText={setNovoEmail} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} />
                <Field label="Senha usada no cadastro:" value={senha} onChangeText={setSenha} secureTextEntry />
                <Pressable style={globalStyles.primaryButton} onPress={corrigirEmail}>
                  <Text style={globalStyles.buttonText}>Salvar novo email</Text>
                </Pressable>
              </>
            ) : emailAtual ? (
              <Pressable style={styles.resendButton} onPress={() => { setNovoEmail(emailAtual); setCorrigindoEmail(true); }}>
                <Text style={styles.resendText}>Corrigir email</Text>
              </Pressable>
            ) : (
              <Field label="E-mail do cadastro:" value={emailAtual} onChangeText={(valor) => setEmailAtual(valor.trim().toLowerCase().replace(/\.+$/, ""))} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} />
            )}
            <Field label="Codigo de verificacao:" value={codigo} onChangeText={(valor) => setCodigo(valor.replace(/\D/g, "").slice(0, 6))} keyboardType="number-pad" maxLength={6} />
            {erro ? <Text style={globalStyles.error}>{erro}</Text> : null}
            {mensagem ? <Text style={styles.success}>{mensagem}</Text> : null}
            <Pressable style={globalStyles.primaryButton} onPress={verificar} disabled={carregando || codigo.length !== 6}>
              {carregando ? <ActivityIndicator color={colors.white} /> : <Text style={globalStyles.buttonText}>Verificar e continuar</Text>}
            </Pressable>
            <Pressable style={styles.resendButton} onPress={reenviar}>
              <Text style={styles.resendText}>Reenviar codigo</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: colors.green },
  keyboard: { flex: 1 },
  content: { flexGrow: 1, alignItems: "center", justifyContent: "center", padding: 22, gap: 20 },
  card: { width: "100%", maxWidth: 440, borderWidth: 1.5, borderColor: colors.black, borderRadius: 8, backgroundColor: colors.white, padding: 22 },
  title: { color: colors.black, fontSize: 27, fontWeight: "700", marginBottom: 8 },
  description: { color: colors.textMuted, fontSize: 15, lineHeight: 22, marginBottom: 18 },
  success: { color: colors.darkGreen, fontSize: 14, marginBottom: 10 },
  resendButton: { alignItems: "center", padding: 16 },
  resendText: { color: colors.darkGreen, fontSize: 15, textDecorationLine: "underline" }
});
