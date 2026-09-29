import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { apiRequest } from "../api/client";
import { colors, globalStyles } from "../styles";

export default function AssinaturaScreen({ token, onLogout, onAssinaturaAtiva }) {
  const [pagamento, setPagamento] = useState(null);
  const [carregando, setCarregando] = useState(false);
  const [verificando, setVerificando] = useState(false);
  const [codigoCopiado, setCodigoCopiado] = useState(false);
  const [erro, setErro] = useState("");

  // Cria a cobrança PIX da assinatura usando o endpoint autenticado do backend.
  async function iniciarPagamento() {
    setCarregando(true);
    setErro("");

    try {
      const dados = await apiRequest("/assinaturas/pix", {
        method: "POST",
        body: JSON.stringify({})
      }, token);
      setPagamento(dados);
    } catch (error) {
      setErro(error?.message || "Não foi possível iniciar o pagamento.");
    } finally {
      setCarregando(false);
    }
  }

  // Confere o pagamento sob demanda; a tela não consulta o status em segundo plano.
  async function verificarPagamento() {
    setVerificando(true);
    setErro("");

    try {
      const dados = await apiRequest("/assinaturas/verificar", {}, token);
      if (dados?.assinatura === true) {
        await onAssinaturaAtiva();
      } else {
        setErro("O pagamento ainda não foi confirmado.");
      }
    } catch (error) {
      setErro(error?.message || "Não foi possível verificar o pagamento.");
    } finally {
      setVerificando(false);
    }
  }

  async function copiarCodigo() {
    if (!pagamento?.codigo_pagamento) return;

    await Clipboard.setStringAsync(pagamento.codigo_pagamento);
    setCodigoCopiado(true);
    setTimeout(() => setCodigoCopiado(false), 2500);
  }

  const valor = Number(pagamento?.valor);

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <View style={styles.header}>
        <View style={styles.iconBadge}>
          <Ionicons name="sparkles-outline" size={28} color={colors.darkGreen} />
        </View>
        <Text style={styles.eyebrow}>Cursando</Text>
        <Text style={globalStyles.title}>Sua próxima etapa começa aqui.</Text>
        <Text style={styles.description}>
          Ative sua assinatura mensal para acessar os cursos e começar sua jornada.
        </Text>
      </View>

      <View style={styles.plan}>
        <Text style={styles.planLabel}>PLANO DISPONÍVEL</Text>
        <Text style={styles.planTitle}>Assinatura mensal</Text>
        <View style={styles.benefit}>
          <Ionicons name="checkmark-circle-outline" size={20} color={colors.green} />
          <Text style={styles.benefitText}>Acesso aos cursos para alunos</Text>
        </View>
        <View style={styles.benefit}>
          <Ionicons name="checkmark-circle-outline" size={20} color={colors.green} />
          <Text style={styles.benefitText}>30 dias de acesso após a confirmação</Text>
        </View>

        {!pagamento ? (
          <><Pressable
                      style={[globalStyles.primaryButton, styles.actionButton]}
                      onPress={iniciarPagamento}
                      disabled={carregando}
                  >
                      {carregando ? (
                          <ActivityIndicator color={colors.white} />
                      ) : (
                          <Text style={globalStyles.buttonText}>Gerar pagamento PIX</Text>
                      )}
                  </Pressable><Pressable
                      style={[globalStyles.secondaryButton, styles.actionButton]}
                      onPress={verificarPagamento}
                      disabled={verificando}
                  >
                          {verificando ? (
                              <ActivityIndicator color={colors.black} />
                          ) : (
                              <Text style={globalStyles.secondaryText}>Já tenho assinatura</Text>
                          )}
                      </Pressable></>
        ) : (
          <View style={styles.payment}>
            {Number.isFinite(valor) && (
              <Text style={styles.price}>R$ {valor.toFixed(2).replace(".", ",")} / mês</Text>
            )}
            <Text style={styles.instructions}>
              Copie o código PIX, pague no aplicativo do seu banco e confira o status.
            </Text>
            <ScrollView horizontal style={styles.codeBox}>
              <Text selectable style={styles.code}>{pagamento.codigo_pagamento}</Text>
            </ScrollView>
            <Pressable style={[globalStyles.secondaryButton, styles.actionButton]} onPress={copiarCodigo}>
              <Text style={globalStyles.secondaryText}>
                {codigoCopiado ? "Código copiado" : "Copiar código PIX"}
              </Text>
            </Pressable>
            <Pressable
              style={[globalStyles.primaryButton, styles.actionButton]}
              onPress={verificarPagamento}
              disabled={verificando}
            >
              {verificando ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={globalStyles.buttonText}>Já paguei</Text>
              )}
            </Pressable>
          </View>
        )}

        {erro ? <Text accessibilityRole="alert" style={globalStyles.error}>{erro}</Text> : null}
      </View>

      <Pressable style={styles.logout} onPress={onLogout}>
        <Text style={styles.logoutText}>Sair da conta</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: {
    flexGrow: 1,
    paddingHorizontal: 22,
    paddingTop: 38,
    paddingBottom: 30,
    backgroundColor: "#f3faf6"
  },
  header: {
    marginBottom: 28
  },
  iconBadge: {
    width: 52,
    height: 52,
    borderRadius: 8,
    backgroundColor: "#d9f3e5",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18
  },
  eyebrow: {
    color: colors.darkGreen,
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 8
  },
  description: {
    color: colors.textMuted,
    fontSize: 16,
    lineHeight: 23,
    marginTop: 12
  },
  plan: {
    padding: 22,
    borderWidth: 1,
    borderColor: "#c6dfd0",
    borderRadius: 8,
    backgroundColor: colors.white
  },
  planLabel: {
    color: colors.darkGreen,
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 8
  },
  planTitle: {
    color: colors.ink,
    fontSize: 23,
    fontWeight: "700",
    marginBottom: 18
  },
  benefit: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    marginBottom: 12
  },
  benefitText: {
    flex: 1,
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 21
  },
  actionButton: {
    width: "100%",
    marginTop: 16
  },
  payment: {
    marginTop: 12
  },
  price: {
    color: colors.darkGreen,
    fontSize: 23,
    fontWeight: "700",
    marginBottom: 10
  },
  instructions: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12
  },
  codeBox: {
    maxHeight: 94,
    padding: 12,
    borderRadius: 7,
    backgroundColor: "#f1f5f2"
  },
  code: {
    color: colors.ink,
    fontSize: 13,
    lineHeight: 20
  },
  logout: {
    alignSelf: "center",
    padding: 16,
    marginTop: 12
  },
  logoutText: {
    color: colors.textMuted,
    fontSize: 15,
    textDecorationLine: "underline"
  }
});