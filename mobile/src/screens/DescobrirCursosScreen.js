import { useEffect, useState } from "react";
import { Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { apiRequest, resolverUrlMidia } from "../api/client";
import AppIcon from "../components/AppIcon";
import { useFeedback } from "../components/FeedbackProvider";
import { colors, globalStyles } from "../styles";

const fallbackImage = "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=900";

export default function DescobrirCursosScreen({ token, carregando, onOpen }) {
  const { mostrarAlerta } = useFeedback();
  const [cursos, setCursos] = useState([]);
  // Sprint item 29: stores personalized suggestions from enrolled course categories and themes.
  const [cursosRecomendados, setCursosRecomendados] = useState([]);
  const [busca, setBusca] = useState("");
  const [ordem, setOrdem] = useState("recentes");
  const [apenasNovos, setApenasNovos] = useState(false);
  // Sprint item 28: stores discovery filters and taxonomy options for the Android catalog.
  const [categorias, setCategorias] = useState([]);
  const [temas, setTemas] = useState([]);
  const [categoria, setCategoria] = useState("");
  const [tema, setTema] = useState("");
  const [avaliacaoMinima, setAvaliacaoMinima] = useState("");
  const [loading, setLoading] = useState(false);

  async function carregar(termo = busca) {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (termo.trim()) params.set("busca", termo.trim());
      params.set("ordem", ordem);
      if (apenasNovos) params.set("apenas_novos", "1");
      if (categoria) params.set("categoria", categoria);
      if (tema) params.set("tema", tema);
      if (avaliacaoMinima) params.set("avaliacao_min", avaliacaoMinima);
      const dados = await apiRequest(`/aluno/descobrir?${params.toString()}`, {}, token);
      setCursos(Array.isArray(dados) ? dados : []);
      try {
        // Sprint item 29: requests ranked matches against the student's active enrollments.
        const recomendacoes = await apiRequest("/aluno/descobrir?recomendados=1&ordem=recomendados", {}, token);
        setCursosRecomendados(Array.isArray(recomendacoes) ? recomendacoes : []);
      } catch (recommendationError) {
        console.warn("Erro ao carregar recomendações:", recommendationError.message);
        setCursosRecomendados([]);
      }
    } catch (error) {
      mostrarAlerta("Erro", error.message, "erro");
      setCursos([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregar("");
  }, [ordem, apenasNovos, categoria, tema, avaliacaoMinima, token]);

  // Sprint item 28: loads shared categories and themes for the app's discovery filters.
  useEffect(() => {
    let ativo = true;
    Promise.all([
      apiRequest("/taxonomias/categorias", {}, token),
      apiRequest("/taxonomias/temas", {}, token)
    ]).then(([listaCategorias, listaTemas]) => {
      if (!ativo) return;
      setCategorias(Array.isArray(listaCategorias) ? listaCategorias : []);
      setTemas(Array.isArray(listaTemas) ? listaTemas : []);
    }).catch((error) => mostrarAlerta("Erro", error.message, "erro"));
    return () => { ativo = false; };
  }, [token]);

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

      <View style={styles.recommendations}>
        {/* Sprint item 29: presents courses related to categories and themes from enrolled courses. */}
        <Text style={styles.recommendationsTitle}>Recomendados para você</Text>
        <Text style={styles.recommendationsDescription}>Sugestões baseadas nas categorias e nos temas dos cursos em que você está inscrito.</Text>
        {cursosRecomendados.length > 0 ? (
          <View style={styles.list}>
            {cursosRecomendados.slice(0, 6).map((curso) => (
              <Pressable key={`recomendado-${curso.id}`} style={[globalStyles.card, styles.card]} onPress={() => onOpen?.(curso)}>
                <Image source={{ uri: curso.imagem ? resolverUrlMidia(curso.imagem) : fallbackImage }} style={styles.image} />
                <View style={styles.info}>
                  <Text style={styles.title} numberOfLines={1}>{curso.titulo}</Text>
                  <Text style={styles.description} numberOfLines={2}>{curso.descricao}</Text>
                  <Text style={styles.meta}>{curso.professor || "Professor(a)"}</Text>
                </View>
              </Pressable>
            ))}
          </View>
        ) : <Text style={styles.recommendationsEmpty}>Quando houver cursos relacionados às suas inscrições, eles aparecerão aqui.</Text>}
      </View>

      <View style={styles.filters}>
        <View style={styles.searchBox}>
          <AppIcon name="search-outline" size={18} color={colors.darkGreen} />
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
        {/* Sprint item 28: category, theme and rating selectors filter courses on Android. */}
        <Text style={styles.filterLabel}>Categoria</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          <Pressable style={[styles.filterButton, !categoria && styles.filterActive]} onPress={() => setCategoria("")}>
            <Text style={[styles.filterText, !categoria && styles.filterTextActive]}>Todas</Text>
          </Pressable>
          {categorias.map((item) => <Pressable key={item.id} style={[styles.filterButton, categoria === item.nome && styles.filterActive]} onPress={() => setCategoria(item.nome)}>
            <Text style={[styles.filterText, categoria === item.nome && styles.filterTextActive]}>{item.nome}</Text>
          </Pressable>)}
        </ScrollView>
        <Text style={styles.filterLabel}>Tema</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          <Pressable style={[styles.filterButton, !tema && styles.filterActive]} onPress={() => setTema("")}>
            <Text style={[styles.filterText, !tema && styles.filterTextActive]}>Todos</Text>
          </Pressable>
          {temas.map((item) => <Pressable key={item.id} style={[styles.filterButton, tema === item.nome && styles.filterActive]} onPress={() => setTema(item.nome)}>
            <Text style={[styles.filterText, tema === item.nome && styles.filterTextActive]}>{item.nome}</Text>
          </Pressable>)}
        </ScrollView>
        <Text style={styles.filterLabel}>Avaliação mínima</Text>
        <View style={styles.filterRow}>
          {["", "1", "2", "3", "4", "5"].map((nota) => <Pressable key={nota || "todas"} style={[styles.filterButton, avaliacaoMinima === nota && styles.filterActive]} onPress={() => setAvaliacaoMinima(nota)}>
            <Text style={[styles.filterText, avaliacaoMinima === nota && styles.filterTextActive]}>{nota ? `${nota} ★` : "Todas"}</Text>
          </Pressable>)}
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
  recommendations: { gap: 10, padding: 14, marginBottom: 18, borderWidth: 1, borderColor: colors.border, borderRadius: 12, backgroundColor: colors.softGray },
  recommendationsTitle: { color: colors.darkGreen, fontSize: 20, fontWeight: "800" },
  recommendationsDescription: { color: colors.textMuted, fontSize: 13, lineHeight: 18 },
  recommendationsEmpty: { color: colors.textMuted, fontSize: 13, lineHeight: 18 },
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
  filterLabel: { color: colors.darkGreen, fontSize: 13, fontWeight: "700", marginTop: 2 },
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
