import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "../styles";

const items = [
  { key: "home", label: "Início", icon: "home-outline" },
  { key: "courses", label: "Meus Cursos", icon: "videocam-outline" },
  { key: "profile", label: "Perfil", icon: "person-circle-outline" }
];

export default function BottomNav({ active, onChange }) {
  return (
    <View style={styles.nav}>
      {items.map((item) => {
        const selected = active === item.key;
        return (
          <Pressable
            key={item.key}
            style={[styles.item, selected && styles.active]}
            onPress={() => onChange(item.key)}
          >
            <Ionicons name={item.icon} size={38} color={selected ? colors.white : colors.black} />
            <Text style={[styles.label, selected && styles.labelActive]}>{item.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  nav: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 78,
    flexDirection: "row",
    backgroundColor: colors.tabGreen
  },
  item: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 2
  },
  active: {
    backgroundColor: colors.darkGreen
  },
  label: {
    color: colors.black,
    fontSize: 16
  },
  labelActive: {
    color: colors.white
  }
});
