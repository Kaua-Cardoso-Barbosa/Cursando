import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Modal, Platform, Pressable, StatusBar, StyleSheet, Text, View } from "react-native";
import AppIcon from "./AppIcon";
import { colors } from "../styles";

const FeedbackContext = createContext(null);

export function useFeedback() {
  const feedback = useContext(FeedbackContext);
  if (!feedback) {
    throw new Error("useFeedback deve ser usado dentro de FeedbackProvider.");
  }
  return feedback;
}

export default function FeedbackProvider({ children }) {
  const [toast, setToast] = useState(null);
  const [confirmacao, setConfirmacao] = useState(null);
  const resolverConfirmacao = useRef(null);

  const mostrarAlerta = useCallback((titulo, descricao, tipo = "info") => {
    setToast({ titulo, descricao, tipo });
  }, []);

  const confirmar = useCallback((opcoes) => new Promise((resolve) => {
    resolverConfirmacao.current?.(false);
    resolverConfirmacao.current = resolve;
    setConfirmacao(opcoes);
  }), []);

  const concluirConfirmacao = useCallback((resultado) => {
    resolverConfirmacao.current?.(resultado);
    resolverConfirmacao.current = null;
    setConfirmacao(null);
  }, []);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(timer);
  }, [toast]);

  const contexto = useMemo(() => ({ mostrarAlerta, confirmar }), [mostrarAlerta, confirmar]);
  const tipo = toast?.tipo || "info";
  const cor = tipo === "erro" ? "#d93030" : tipo === "sucesso" ? "#5cb85c" : "#777777";
  const fundo = tipo === "erro" ? "#ffcfcd" : tipo === "sucesso" ? "#c9f7c9" : "#e7e7e7";
  const icone = tipo === "erro" ? "close-circle" : tipo === "sucesso" ? "checkmark-circle" : "information-circle";

  return (
    <FeedbackContext.Provider value={contexto}>
      <View style={styles.container}>
        {children}
        {toast ? (
          <View pointerEvents="box-none" style={styles.toastLayer}>
            <View accessibilityRole="alert" style={[styles.toast, { backgroundColor: fundo, borderLeftColor: cor }]}>
              <AppIcon name={icone} size={26} color={cor} />
              <View style={styles.toastContent}>
                <Text style={styles.toastTitle}>{toast.titulo}</Text>
                <Text style={styles.toastDescription}>{toast.descricao}</Text>
              </View>
              <Pressable
                onPress={() => setToast(null)}
                accessibilityRole="button"
                accessibilityLabel="Fechar alerta"
                hitSlop={8}
                style={styles.closeButton}
              >
                <Text style={styles.closeText}>×</Text>
              </Pressable>
            </View>
          </View>
        ) : null}
        <Modal
          visible={Boolean(confirmacao)}
          transparent
          animationType="fade"
          statusBarTranslucent
          onRequestClose={() => concluirConfirmacao(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.confirmCard} accessibilityRole="alert">
              <AppIcon name="warning" size={64} color={colors.black} style={styles.warningIcon} />
              <Text style={styles.confirmTitle}>{confirmacao?.titulo || "Confirmar ação"}</Text>
              {confirmacao?.descricao ? (
                <Text style={styles.confirmDescription}>{confirmacao.descricao}</Text>
              ) : null}
              <View style={styles.actions}>
                <Pressable
                  onPress={() => concluirConfirmacao(false)}
                  style={[styles.actionButton, styles.cancelButton]}
                  accessibilityRole="button"
                >
                  <Text style={styles.cancelText}>{confirmacao?.textoCancelar || "Cancelar"}</Text>
                </Pressable>
                <Pressable
                  onPress={() => concluirConfirmacao(true)}
                  style={[styles.actionButton, styles.confirmButton]}
                  accessibilityRole="button"
                >
                  <Text style={styles.confirmText}>{confirmacao?.textoConfirmar || "Confirmar"}</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </FeedbackContext.Provider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  toastLayer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    zIndex: 999
  },
  toast: {
    position: "absolute",
    top: (Platform.OS === "android" ? StatusBar.currentHeight || 0 : 48) + 12,
    width: "92%",
    maxWidth: 480,
    minHeight: 68,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderLeftWidth: 5,
    borderRadius: 10,
    shadowColor: "#000000",
    shadowOpacity: 0.18,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 5 },
    elevation: 8
  },
  toastContent: { flex: 1 },
  toastTitle: { color: colors.black, fontSize: 16, lineHeight: 21, fontWeight: "700" },
  toastDescription: { color: "#333333", fontSize: 14, lineHeight: 19, marginTop: 2 },
  closeButton: { width: 30, height: 30, alignItems: "center", justifyContent: "center" },
  closeText: { color: colors.textMuted, fontSize: 26, lineHeight: 30 },
  modalOverlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    backgroundColor: "rgba(0, 0, 0, 0.34)"
  },
  confirmCard: {
    width: "100%",
    maxWidth: 530,
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 26,
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.black,
    borderRadius: 24,
    shadowColor: colors.black,
    shadowOpacity: 0.22,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12
  },
  warningIcon: { marginBottom: 14 },
  confirmTitle: { color: colors.black, fontSize: 23, lineHeight: 29, fontWeight: "600", textAlign: "center" },
  confirmDescription: { color: "#333333", fontSize: 16, lineHeight: 21, textAlign: "center", marginTop: 10 },
  actions: { width: "100%", flexDirection: "row", justifyContent: "center", gap: 12, marginTop: 26 },
  actionButton: { flex: 1, minHeight: 44, alignItems: "center", justifyContent: "center", paddingHorizontal: 12, borderRadius: 7, borderWidth: 1.5 },
  cancelButton: { backgroundColor: colors.white, borderColor: colors.black },
  confirmButton: { backgroundColor: "#b90000", borderColor: "#b90000" },
  cancelText: { color: colors.black, fontSize: 16, fontWeight: "600" },
  confirmText: { color: colors.white, fontSize: 16, fontWeight: "600" }
});
