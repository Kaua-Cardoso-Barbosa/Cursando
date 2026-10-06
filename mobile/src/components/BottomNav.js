import { useEffect, useState } from "react";
import { Keyboard, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import AppIcon from "./AppIcon";
import { colors, systemNavigationInset } from "../styles";

const baseItems = [
  { key: "home", label: "In\u00edcio", icon: "home-outline" },
  { key: "courses", label: "Meus Cursos", icon: "videocam-outline" },
  { key: "chat", label: "Chat", icon: "chatbubble-ellipses-outline" },
  { key: "profile", label: "Perfil", icon: "person-circle-outline" }
];

export default function BottomNav({ active, onChange, tipoUsuario = 1 }) {
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const items = Number(tipoUsuario) === 1
    ? [
      baseItems[0],
      baseItems[1],
      { key: "reports", label: "Relatorios", icon: "bar-chart-outline" },
      baseItems[2],
      { key: "finance", label: "Financeiro", icon: "wallet-outline" },
      baseItems[3]
    ]
    : [
      baseItems[0],
      baseItems[1],
      { key: "discover", label: "Descobrir", icon: "search-outline" },
      baseItems[2],
      { key: "finance", label: "Financeiro", icon: "wallet-outline" },
      baseItems[3]
    ];

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const showSubscription = Keyboard.addListener(showEvent, (event) => {
      setKeyboardHeight(event.endCoordinates.height);
    });
    const hideSubscription = Keyboard.addListener(hideEvent, () => setKeyboardHeight(0));
    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  return (
    <View style={[styles.nav, Platform.OS === "android" && keyboardHeight > 0 && { transform: [{ translateY: keyboardHeight }] }]}>
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
            <AppIcon name={item.icon} size={20} color={selected ? colors.white : colors.black} />
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
    left: 14,
    right: 14,
    bottom: 12 + systemNavigationInset,
    height: 74,
    flexDirection: "row",
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    overflow: "hidden",
    shadowColor: colors.black,
    shadowOpacity: 0.16,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 5
  },
  item: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    borderRightWidth: 1,
    borderRightColor: colors.border,
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
    color: colors.textMuted,
    fontSize: 10,
    lineHeight: 13,
    fontWeight: "700"
  },
  labelActive: {
    color: colors.white
  }
});
