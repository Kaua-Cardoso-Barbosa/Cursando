import { Platform, StyleSheet } from "react-native";

export const colors = {
  green: "#06a663",
  darkGreen: "#087044",
  deepGreen: "#075132",
  tabGreen: "#087044",
  black: "#090909",
  ink: "#173e2c",
  white: "#ffffff",
  gray: "#f5f8f6",
  softGray: "#eef5f1",
  border: "#dfe9e3",
  muted: "#6c7f76",
  textMuted: "#607468",
  red: "#b90000",
  amber: "#f6b72f",
  mint: "#c7f0df"
};

export const systemNavigationInset = Platform.OS === "android" ? 24 : 0;

export /* Sprint item 39 - Desenvolver todas as telas do aplicativo - Define os estilos dos componentes nativos desta tela */
const globalStyles = StyleSheet.create({
  app: {
    flex: 1,
    backgroundColor: colors.white,
    paddingBottom: systemNavigationInset
  },
  page: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 24,
    backgroundColor: colors.gray
  },
  title: {
    color: colors.ink,
    fontSize: 24,
    lineHeight: 32,
    fontWeight: "700"
  },
  eyebrow: {
    color: colors.darkGreen,
    fontSize: 15,
    lineHeight: 19,
    marginTop: 3
  },
  divider: {
    height: 3,
    backgroundColor: colors.green,
    marginTop: 10,
    width: 82,
    borderRadius: 999
  },
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    backgroundColor: colors.white,
    overflow: "hidden",
    shadowColor: colors.black,
    shadowOpacity: 0.045,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2
  },
  metricGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 12
  },
  metricCard: {
    width: "48%",
    minHeight: 138,
    padding: 12,
    gap: 6,
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    backgroundColor: colors.white,
    shadowColor: colors.black,
    shadowOpacity: 0.045,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2
  },
  metricTop: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 6 },
  metricTitle: { flex: 1, color: colors.ink, fontSize: 14, lineHeight: 20, fontWeight: "700" },
  metricDetail: { color: colors.textMuted, fontSize: 12, lineHeight: 16, fontWeight: "400" },
  metricValue: { color: colors.darkGreen, fontSize: 28, lineHeight: 34, fontWeight: "700" },
  metricMoney: { color: colors.darkGreen, fontSize: 20, lineHeight: 26, fontWeight: "700" },
  metricDate: { color: colors.darkGreen, fontSize: 18, lineHeight: 24, fontWeight: "700" },
  metricIcon: { width: 28, height: 28, flexShrink: 0, borderRadius: 8, backgroundColor: colors.mint, alignItems: "center", justifyContent: "center" },
  label: {
    color: colors.muted,
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8
  },
  input: {
    width: "100%",
    minHeight: 46,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.white,
    color: colors.ink,
    fontSize: 15,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  field: {
    width: "100%",
    marginBottom: 16
  },
  primaryButton: {
    minHeight: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.darkGreen,
    backgroundColor: colors.darkGreen,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    shadowColor: colors.black,
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2
  },
  secondaryButton: {
    minHeight: 42,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18
  },
  dangerButton: {
    minHeight: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.red,
    backgroundColor: colors.red,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20
  },
  buttonText: {
    color: colors.white,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "600"
  },
  secondaryText: {
    color: colors.darkGreen,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "600"
  },
  message: {
    color: colors.darkGreen,
    textAlign: "center",
    fontSize: 16,
    marginVertical: 10
  },
  error: {
    color: colors.red,
    textAlign: "center",
    fontSize: 16,
    marginVertical: 10
  }
});
/* Fim item 39 */
