import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { Alert, Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { apiRequest, resolverUrlMidia } from "../api/client";
import { colors, globalStyles } from "../styles";

const fallbackImage = "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=900";

export default function DescobrirCursosScreen({ token, carregando, onOpen }) {
  const [cursos, setCursos] = useState([]);
  const [busca, setBusca] = useState("");
  const [ordem, setOrdem] = useState("recentes");
  const [apenasNovos, setApenasNovos] = useState(false);
  const [loading, setLoading] = useState(false);

  async function carregar(termo = busca) {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (termo.trim()) params.set("busca", termo.trim());
      params.set("ordem", ordem);
      if (apenasNovos) params.set("apenas_novos", "1");
      const dados = await apiRequest(`/aluno/descobrir?${params.toString()}`, {}, token);
      setCursos(Array.isArray(dados) ? dados : []);
    } catch (error) {
      Alert.alert("Erro", error.message);
      setCursos([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregar("");
  }, [ordem, apenasNovos, token]);

  return (
    <ScrollView
      contentContainerStyle={globalStyles.page}
      refreshControl={<RefreshControl refreshing={carregando || loading} onRefresh={() => carregar()} />}
    >
      <View style={styles.header}>
        <Text style={globalStyles.title}>Descobrir cursos</Text>
        <Text style={globalStyles.eyebrow}>Encontre novos cursos publicos</Text>
        <View style={globalStyles.divider} />
      </View>

      <View style={styles.filters}>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={20} color={colors.darkGreen} />
          <TextInput
            value={busca}
            onChangeText={setBusca}
            onSubmitEditing={() => carregar()}
            placeholder="Pesquisar cursos"
            placeholderTextColor={colors.muted}
            style={styles.searchInput}
            returnKeyType="search"
          />
        </View>
        <View style={styles.filterRow}>
          <Pressable style={[styles.filterButton, ordem === "recentes" && styles.filterActive]} onPress={() => setOrdem("recentes")}>
            <Text style={[styles.filterText, ordem === "recentes" && styles.filterTextActive]}>Recentes</Text>
          </Pressable>
          <Pressable style={[styles.filterButton, ordem === "populares" && styles.filterActive]} onPress={() => setOrdem("populares")}>
            <Text style={[styles.filterText, ordem === "populares" && styles.filterTextActive]}>Populares</Text>
          </Pressable>
          <Pressable style={[styles.filterButton, apenasNovos && styles.filterActive]} onPress={() => setApenasNovos(!apenasNovos)}>
            <Text style={[styles.filterText, apenasNovos && styles.filterTextActive]}>Nao inscritos</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.list}>
        {cursos.map((curso) => {
          const imagem = curso.imagem ? resolverUrlMidia(curso.imagem) : fallbackImage;
          return (
            <Pressable key={curso.id} style={[globalStyles.card, styles.card]} onPress={() => onOpen?.(curso)}>
              <Image source={{ uri: imagem }} style={styles.image} />
              <View style={styles.info}>
                <Text style={styles.title} numberOfLines={1}>{curso.titulo}</Text>
                <Text style={styles.description} numberOfLines={2}>{curso.descricao}</Text>
                <Text style={styles.meta}>{curso.professor || "Professor(a)"}</Text>
              </View>
            </Pressable>
          );
        })}
        {!loading && cursos.length === 0 ? <Text style={globalStyles.message}>Nenhum curso publico encontrado.</Text> : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: { marginBottom: 22 },
  filters: { gap: 12, marginBottom: 18 },
  searchBox: {
    minHeight: 48,
    borderWidth: 1.4,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.white,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    gap: 8
  },
  searchInput: { flex: 1, color: colors.black, fontSize: 16 },
  filterRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  filterButton: {
    minHeight: 38,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.white,
    justifyContent: "center",
    paddingHorizontal: 12
  },
  filterActive: { backgroundColor: colors.darkGreen, borderColor: colors.darkGreen },
  filterText: { color: colors.darkGreen, fontWeight: "700" },
  filterTextActive: { color: colors.white },
  list: { gap: 18 },
  card: { padding: 0 },
  image: { width: "100%", aspectRatio: 16 / 9, backgroundColor: "#dddddd" },
  info: { padding: 14, gap: 5 },
  title: { color: colors.black, fontSize: 21, lineHeight: 25, fontWeight: "700" },
  description: { color: colors.textMuted, fontSize: 14, lineHeight: 19 },
  meta: { color: colors.darkGreen, fontSize: 13, fontWeight: "700", marginTop: 4 }
});
