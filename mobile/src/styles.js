import { Platform, StyleSheet } from "react-native";

export const colors = {
  green: "#2fbf83",
  darkGreen: "#0c4d36",
  deepGreen: "#073525",
  tabGreen: "#159b66",
  black: "#090909",
  ink: "#123126",
  white: "#ffffff",
  gray: "#f5f8f6",
  softGray: "#eef5f1",
  border: "#cfe0d7",
  muted: "#6c7f76",
  textMuted: "#53645c",
  red: "#e21d0b",
  amber: "#f6b72f",
  mint: "#c7f0df"
};

export const systemNavigationInset = Platform.OS === "android" ? 24 : 0;

export const globalStyles = StyleSheet.create({
  app: {
    flex: 1,
    backgroundColor: colors.gray,
    paddingBottom: systemNavigationInset
  },
  page: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 26,
    paddingBottom: 112,
    backgroundColor: colors.gray
  },
  title: {
    color: colors.ink,
    fontSize: 30,
    lineHeight: 36,
    fontWeight: "800"
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
    borderRadius: 8,
    backgroundColor: colors.white,
    overflow: "hidden",
    shadowColor: colors.black,
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2
  },
  metricCard: {
    minHeight: 150,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.white,
    paddingHorizontal: 18,
    paddingVertical: 20,
    shadowColor: colors.black,
    shadowOpacity: 0.07,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2
  },
  label: {
    color: colors.muted,
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8
  },
  input: {
    width: "100%",
    minHeight: 46,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 7,
    backgroundColor: colors.white,
    color: colors.black,
    fontSize: 17,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  field: {
    width: "100%",
    marginBottom: 16
  },
  primaryButton: {
    minHeight: 44,
    minWidth: 124,
    borderRadius: 7,
    borderWidth: 1.4,
    borderColor: colors.green,
    backgroundColor: colors.darkGreen,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    shadowColor: colors.black,
    shadowOpacity: 0.18,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2
  },
  secondaryButton: {
    minHeight: 42,
    borderRadius: 7,
    borderWidth: 1.4,
    borderColor: colors.border,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18
  },
  dangerButton: {
    minHeight: 44,
    minWidth: 124,
    borderRadius: 7,
    borderWidth: 1.4,
    borderColor: colors.red,
    backgroundColor: colors.red,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20
  },
  buttonText: {
    color: colors.white,
    fontSize: 20,
    lineHeight: 24
  },
  secondaryText: {
    color: colors.black,
    fontSize: 18,
    lineHeight: 22
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
