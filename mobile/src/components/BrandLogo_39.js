import { Image, StyleSheet, Text, View } from "react-native";
import { colors } from "../styles_39";

export default
function BrandLogo({ compact = false }) {
  return (
    <View style={[styles.logo, compact && styles.logoCompact]}>
      <Image
        source={require("../../assets/logo.png")}
        resizeMode="contain"
        style={[styles.mark, compact && styles.markCompact]}
        accessibilityLabel="Logo Cursando"
      />
      <Text style={[styles.text, compact && styles.textCompact]}>Cursando</Text>
    </View>
  );
}

/* Sprint item 39 - Desenvolver todas as telas do aplicativo - Define os estilos dos componentes nativos desta tela */
const styles = StyleSheet.create({
  logo: {
    alignItems: "center",
    gap: 8
  },
  logoCompact: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10
  },
  mark: {
    width: 112,
    height: 85
  },
  markCompact: {
    width: 82,
    height: 62
  },
  text: {
    color: colors.white,
    fontSize: 34,
    fontWeight: "800"
  },
  textCompact: {
    fontSize: 26
  }
});
/* Fim item 39 */
