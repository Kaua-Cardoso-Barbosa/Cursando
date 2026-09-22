import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "../styles";

const items = [
  { key: "home", label: "In\u00edcio", icon: "home-outline" },
  { key: "courses", label: "Meus Cursos", icon: "videocam-outline" },
  { key: "profile", label: "Perfil", icon: "person-circle-outline" }
];

export default function BottomNav({ active, onChange }) {
  return (
    <View style={styles.nav}>
      {items.map((item, index) => {
        const selected = active === item.key;

        return (
          <Pressable
            key={item.key}
            style={[
              styles.item,
              index === items.length - 1 && styles.lastItem,
              selected && styles.active
            ]}
            onPress={() => onChange(item.key)}
          >
            <Ionicons name={item.icon} size={28} color={selected ? colors.white : colors.black} />
            <Text style={[styles.label, selected && styles.labelActive]} numberOfLines={1}>
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  nav: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 12,
    height: 70,
    flexDirection: "row",
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.black,
    borderRadius: 8,
    overflow: "hidden",
    shadowColor: colors.black,
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5
  },
  item: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    borderRightWidth: 1,
    borderRightColor: "#d9d9d9",
    paddingHorizontal: 4
  },
  lastItem: {
    borderRightWidth: 0
  },
  active: {
    backgroundColor: colors.darkGreen,
    borderRightColor: colors.darkGreen
  },
  label: {
    color: colors.black,
    fontSize: 13,
    lineHeight: 16
  },
  labelActive: {
    color: colors.white
  }
});
