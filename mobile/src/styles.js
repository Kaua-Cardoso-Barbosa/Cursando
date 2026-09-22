import { StyleSheet } from "react-native";

export const colors = {
  green: "#06a663",
  darkGreen: "#02693e",
  tabGreen: "#08ad6a",
  black: "#090909",
  white: "#ffffff",
  gray: "#efefef",
  muted: "#7b7b7b",
  red: "#e21d0b",
  amber: "#f6b72f"
};

export const globalStyles = StyleSheet.create({
  app: {
    flex: 1,
    backgroundColor: colors.white
  },
  page: {
    flexGrow: 1,
    paddingHorizontal: 14,
    paddingTop: 18,
    paddingBottom: 96,
    backgroundColor: colors.white
  },
  title: {
    color: colors.black,
    fontSize: 30,
    lineHeight: 36,
    fontWeight: "400"
  },
  divider: {
    height: 2,
    backgroundColor: colors.green,
    marginTop: 16,
    marginHorizontal: -14
  },
  label: {
    color: colors.muted,
    fontSize: 22,
    marginBottom: 6
  },
  input: {
    width: "100%",
    minHeight: 44,
    borderWidth: 2,
    borderColor: colors.green,
    borderRadius: 7,
    backgroundColor: "#eeeeee",
    color: colors.black,
    fontSize: 20,
    paddingHorizontal: 10
  },
  field: {
    width: "100%",
    marginBottom: 18
  },
  primaryButton: {
    minHeight: 38,
    minWidth: 120,
    borderRadius: 7,
    backgroundColor: colors.green,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20
  },
  secondaryButton: {
    minHeight: 36,
    borderRadius: 7,
    borderWidth: 1.2,
    borderColor: colors.black,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18
  },
  dangerButton: {
    minHeight: 38,
    minWidth: 120,
    borderRadius: 7,
    backgroundColor: colors.red,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20
  },
  buttonText: {
    color: colors.white,
    fontSize: 24
  },
  secondaryText: {
    color: colors.black,
    fontSize: 22
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
