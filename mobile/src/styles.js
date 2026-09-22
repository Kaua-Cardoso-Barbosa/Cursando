import { StyleSheet } from "react-native";

export const colors = {
  green: "#06a663",
  darkGreen: "#02693e",
  tabGreen: "#08ad6a",
  black: "#090909",
  ink: "#111111",
  white: "#ffffff",
  gray: "#f8f8f8",
  softGray: "#eeeeee",
  border: "#111111",
  muted: "#7b7b7b",
  textMuted: "#555555",
  red: "#e21d0b",
  amber: "#f6b72f",
  mint: "#9fe0c3"
};

export const globalStyles = StyleSheet.create({
  app: {
    flex: 1,
    backgroundColor: colors.white
  },
  page: {
    flexGrow: 1,
    paddingHorizontal: 18,
    paddingTop: 24,
    paddingBottom: 112,
    backgroundColor: colors.white
  },
  title: {
    color: colors.ink,
    fontSize: 31,
    lineHeight: 36,
    fontWeight: "400"
  },
  eyebrow: {
    color: colors.darkGreen,
    fontSize: 15,
    lineHeight: 19,
    marginTop: 3
  },
  divider: {
    height: 4,
    backgroundColor: colors.green,
    marginTop: 10,
    width: "100%"
  },
  card: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.white,
    overflow: "hidden"
  },
  metricCard: {
    minHeight: 150,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.gray,
    paddingHorizontal: 18,
    paddingVertical: 20
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
    borderColor: colors.green,
    borderRadius: 7,
    backgroundColor: colors.softGray,
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
    backgroundColor: colors.green,
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
    borderColor: colors.black,
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
