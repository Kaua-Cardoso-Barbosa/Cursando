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
import { apiRequest } from "../api/client_3_17";
import BrandLogo from "../components/BrandLogo_39";
import Field from "../components/Field_39";
import { colors, globalStyles } from "../styles_39";

export default
function CadastroScreen({ onBack, onRegistered }) {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [cpf, setCpf] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");
  const [carregando, setCarregando] = useState(false);

/* Sprint item 1 - Implementar cadastro de alunos pelo aplicativo - Valida o formulário e envia o cadastro de aluno */
async function cadastrar() {
    if (carregando) return;

    const nomeTratado = nome.trim();
    const emailTratado = email.trim().toLowerCase();
    const cpfTratado = cpf.replace(/\D/g, "");

    if (!nomeTratado || !emailTratado || !cpfTratado || !senha || !confirmarSenha) {
      setErro("Preencha todos os campos para criar sua conta.");
      return;
    }

    if (!validarNome(nomeTratado)) {
      setErro("Informe um nome valido, usando apenas letras, espacos, hifens ou apostrofos.");
      return;
    }

    if (!validarEmail(emailTratado)) {
      setErro("Informe um e-mail valido.");
      return;
    }

    if (!validarCpf(cpfTratado)) {
      setErro("Informe um CPF valido.");
      return;
    }

    if (senha !== confirmarSenha) {
      setErro("As senhas nao coincidem.");
      return;
    }

    if (!validarSenha(senha)) {
      setErro("A senha deve ter no minimo 8 caracteres, com letra maiuscula, letra minuscula, numero e caractere especial.");
      return;
    }

    setErro("");
    setSucesso("");
    setCarregando(true);

    try {

      const dadosCadastro = await apiRequest("/cadastrar", {
        method: "POST",
        body: JSON.stringify({
          nome: nomeTratado,
          email: emailTratado,
          cpf: cpfTratado,
          senha,
          confirmar_senha: confirmarSenha
        })
      });

      onRegistered(
        (dadosCadastro.email || emailTratado).trim().toLowerCase().replace(/\.+$/, ""),
        dadosCadastro.codigo_enviado === true
      );
    } catch (error) {
      setErro(error?.message || "Nao foi possivel realizar o cadastro.");
    } finally {
      setCarregando(false);
    }
  }
/* Fim item 1 */

  return (
    <ImageBackground source={require("../../assets/bg.png")} resizeMode="cover" style={styles.bg}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.keyboard}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <BrandLogo />
          <Text style={styles.title}>Cadastro</Text>

          {/* Sprint item 1 - Implementar cadastro de alunos pelo aplicativo - Valida e envia os dados para o cadastro e a confirmação do e-mail */}
          <View style={styles.card}>
            <Field
              label="Nome:"
              value={nome}
              onChangeText={setNome}
              autoCapitalize="words"
            />
            <Field
              label="Email:"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Field
              label="CPF:"
              value={cpf}
              onChangeText={setCpf}
              keyboardType="number-pad"
              maxLength={14}
            />
            <Field
              label="Senha:"
              value={senha}
              onChangeText={setSenha}
              secureTextEntry
            />
            <Field
              label="Confirmar senha:"
              value={confirmarSenha}
              onChangeText={setConfirmarSenha}
              secureTextEntry
            />

            {erro ? <Text style={globalStyles.error}>{erro}</Text> : null}
            {sucesso ? <Text style={styles.success}>{sucesso}</Text> : null}

            <Pressable
              style={[globalStyles.primaryButton, carregando && styles.disabledButton]}
              onPress={cadastrar}
              disabled={carregando}
            >
              {carregando ? <ActivityIndicator color={colors.white} /> : <Text style={globalStyles.buttonText}>Cadastrar</Text>}
            </Pressable>

            <Pressable style={styles.backButton} onPress={onBack} disabled={carregando}>
              <Text style={styles.backText}>Ja tenho cadastro</Text>
            </Pressable>
          </View>
          {/* Fim item 1 */}
        </ScrollView>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
}

/* Sprint item 39 - Desenvolver todas as telas do aplicativo - Define os estilos dos componentes nativos desta tela */
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
  },
  disabledButton: {
    opacity: 0.72
  }
});
/* Fim item 39 */

const nomesInvalidos = new Set(["teste", "test", "nome", "asdf", "abc"]);

/* Sprint item 1 - Implementar cadastro de alunos pelo aplicativo - Valida o nome informado no cadastro */
function validarNome(valor) {
  const nomeNormalizado = (valor || "").trim().normalize("NFC");
  const partes = nomeNormalizado.split(/\s+/);
  const padraoNome = /^\p{L}+(?:[ '-]\p{L}+)*$/u;
  const letras = Array.from(nomeNormalizado).filter(
    (caractere) => caractere.toLocaleUpperCase() !== caractere.toLocaleLowerCase()
  );

  if (nomeNormalizado.length < 2 || nomeNormalizado.length > 100) {
    return false;
  }

  if (nomesInvalidos.has(nomeNormalizado.toLocaleLowerCase())) {
    return false;
  }

  return partes.every((parte) => parte.length > 0)
    && padraoNome.test(nomeNormalizado)
    && new Set(letras.map((letra) => letra.toLocaleLowerCase())).size > 1;
}
/* Fim item 1 */

/* Sprint item 1 - Implementar cadastro de alunos pelo aplicativo - Valida o formato do e-mail informado no cadastro */
function validarEmail(valor) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor || "");
}
/* Fim item 1 */

/* Sprint item 1 - Implementar cadastro de alunos pelo aplicativo - Confere os requisitos da senha do cadastro */
function validarSenha(valor) {
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/.test(valor || "");
}
/* Fim item 1 */

/* Sprint item 1 - Implementar cadastro de alunos pelo aplicativo - Confere os dígitos verificadores do CPF informado */
function validarCpf(valor) {
  if (!/^\d{11}$/.test(valor) || /^([0-9])\1+$/.test(valor)) return false;
  const calcularDigito = (base, pesos) => {
    const resto = [...base].reduce((soma, numero, indice) => soma + Number(numero) * pesos[indice], 0) % 11;
    return resto < 2 ? 0 : 11 - resto;
  };
  const primeiro = calcularDigito(valor.slice(0, 9), [10, 9, 8, 7, 6, 5, 4, 3, 2]);
  const segundo = calcularDigito(`${valor.slice(0, 9)}${primeiro}`, [11, 10, 9, 8, 7, 6, 5, 4, 3, 2]);
  return valor.endsWith(`${primeiro}${segundo}`);
}
/* Fim item 1 */
