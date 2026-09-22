import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";
import { colors } from "../styles";

export default function BrandLogo({ compact = false }) {
  return (
    <View style={[styles.logo, compact && styles.logoCompact]}>
      <View style={styles.mark}>
        <Ionicons name="school" size={compact ? 42 : 62} color={colors.white} />
        <View style={styles.play}>
          <Ionicons name="play" size={compact ? 18 : 25} color={colors.white} />
        </View>
      </View>
      <Text style={[styles.text, compact && styles.textCompact]}>Cursando</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  logo: {
    alignItems: "center",
    gap: 8
  },
  logoCompact: {
    flexDirection: "row",
    justifyContent: "center"
  },
  mark: {
    position: "relative",
    width: 90,
    height: 74,
    alignItems: "center",
    justifyContent: "center"
  },
  play: {
    position: "absolute",
    bottom: 9,
    right: 17,
    width: 40,
    height: 31,
    borderRadius: 8,
    backgroundColor: colors.green,
    alignItems: "center",
    justifyContent: "center"
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
