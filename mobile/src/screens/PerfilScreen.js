import { Ionicons } from "@expo/vector-icons";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Field from "../components/Field";
import { colors, globalStyles } from "../styles";

export default function PerfilScreen({ perfil, onEdit, onLogout }) {
  return (
    <ScrollView contentContainerStyle={[globalStyles.page, styles.page]}>
      <View style={styles.header}>
        <Ionicons name="person-circle-outline" size={96} color={colors.black} style={styles.avatar} />
        <View style={styles.headerText}>
          <Text style={globalStyles.title}>Perfil</Text>
          <Text style={globalStyles.eyebrow}>{perfil?.nome || "Usuario"}</Text>
          <View style={globalStyles.divider} />
        </View>
      </View>

      <View style={styles.card}>
        <Field label="Nome" value={perfil?.nome || ""} onChangeText={() => {}} editable={false} />
        <Field label="Email" value={perfil?.email || ""} onChangeText={() => {}} editable={false} />
        <Field label="Cpf" value={perfil?.cpf || ""} onChangeText={() => {}} editable={false} />
        <Field label="Senha" value="********" onChangeText={() => {}} secureTextEntry editable={false} />
      </View>

      <View style={styles.actions}>
        <Pressable style={globalStyles.primaryButton} onPress={onEdit}>
          <Text style={globalStyles.buttonText}>Editar</Text>
        </Pressable>
        <Pressable style={globalStyles.dangerButton} onPress={onLogout}>
          <Text style={globalStyles.buttonText}>Sair</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: {
    paddingTop: 28
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginBottom: 26
  },
  headerText: {
    flex: 1
  },
  avatar: {
    alignSelf: "center"
  },
  card: {
    borderWidth: 1.5,
    borderColor: colors.black,
    borderRadius: 8,
    backgroundColor: colors.white,
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 2
  },
  actions: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 14,
    marginTop: 22
  }
});
