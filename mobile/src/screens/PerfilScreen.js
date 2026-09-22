import { Ionicons } from "@expo/vector-icons";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Field from "../components/Field";
import { colors, globalStyles } from "../styles";

export default function PerfilScreen({ perfil, onEdit, onLogout }) {
  return (
    <ScrollView contentContainerStyle={[globalStyles.page, styles.page]}>
      <Ionicons name="person-circle-outline" size={178} color={colors.black} style={styles.avatar} />

      <Field label="Nome" value={perfil?.nome || ""} onChangeText={() => {}} editable={false} />
      <Field label="Email" value={perfil?.email || ""} onChangeText={() => {}} editable={false} />
      <Field label="Cpf" value={perfil?.cpf || ""} onChangeText={() => {}} editable={false} />
      <Field label="Senha" value="********" onChangeText={() => {}} secureTextEntry editable={false} />

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
    paddingTop: 45
  },
  avatar: {
    alignSelf: "center",
    marginBottom: 24
  },
  actions: {
    alignItems: "center",
    gap: 18,
    marginTop: 10
  }
});
