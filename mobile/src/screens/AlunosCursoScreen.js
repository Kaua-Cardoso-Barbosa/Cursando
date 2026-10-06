import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { apiRequest } from "../api/client";
import { colors, globalStyles } from "../styles";

export default function AlunosCursoScreen({ curso, token, onBack }) {
  const [alunos, setAlunos] = useState([]);
  const [loading, setLoading] = useState(false);

  async function carregar() {
    if (!curso?.id) return;
    setLoading(true);
    try {
      const dados = await apiRequest(`/professor/cursos/${curso.id}/alunos`, {}, token);
      setAlunos(Array.isArray(dados) ? dados : []);
    } catch (error) {
      Alert.alert("Erro", error.message);
      setAlunos([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregar();
  }, [curso?.id, token]);

  return (
    <ScrollView
      contentContainerStyle={globalStyles.page}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={carregar} />}
    >
      <Pressable style={styles.back} onPress={onBack}>
        <Ionicons name="arrow-back" size={19} color={colors.darkGreen} />
        <Text style={styles.backText}>Voltar</Text>
      </Pressable>
      <View style={styles.header}>
        <Text style={globalStyles.title}>Alunos</Text>
        <Text style={globalStyles.eyebrow} numberOfLines={2}>{curso?.titulo || "Curso"}</Text>
        <View style={globalStyles.divider} />
      </View>
      <View style={styles.list}>
        {alunos.map((aluno) => (
          <View key={aluno.id_usuario} style={[globalStyles.card, styles.row]}>
            <View style={styles.avatar}>
              <Ionicons name="person-outline" size={22} color={colors.darkGreen} />
            </View>
            <View style={styles.info}>
              <Text style={styles.name}>{aluno.nome}</Text>
              <Text style={styles.email}>{aluno.email}</Text>
            </View>
          </View>
        ))}
        {!loading && alunos.length === 0 ? <Text style={globalStyles.message}>Nenhum aluno matriculado neste curso.</Text> : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  back: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderColor: colors.darkGreen, borderRadius: 4, paddingHorizontal: 9, paddingVertical: 5, marginBottom: 16 },
  backText: { color: colors.darkGreen, fontSize: 16 },
  header: { marginBottom: 24 },
  list: { gap: 12 },
  row: { padding: 14, flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.softGray, alignItems: "center", justifyContent: "center" },
  info: { flex: 1 },
  name: { color: colors.black, fontSize: 17, fontWeight: "700" },
  email: { color: colors.textMuted, fontSize: 14, marginTop: 2 }
});
