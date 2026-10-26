import { useEffect, useState } from "react";
import { Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { apiRequest, resolverUrlMidia } from "../api/client_2_3_5_17_39";
import AppIcon from "../components/AppIcon_39";
import { useFeedback } from "../components/FeedbackProvider_39";
import { colors, globalStyles } from "../styles";

const fallbackImage = "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=900";

export default /* Sprint item 28 - Permitir filtro de cursos por tema, categoria e avaliação */
/* Sprint item 29 - Criar recomendação inteligente de cursos com base nas buscas e compras recentes do aluno */
/* Sprint item 39 - Desenvolver todas as telas do aplicativo */
function DescobrirCursosScreen({ token, carregando, onOpen }) {
  const { mostrarAlerta } = useFeedback();
  const [cursos, setCursos] = useState([]);
  const [busca, setBusca] = useState("");
  const [ordem, setOrdem] = useState("recentes");
  const [apenasNovos, setApenasNovos] = useState(false);
                                                                                                                                                             
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
      if (ordem === "recomendados") params.set("recomendados", "1");
      if (apenasNovos) params.set("apenas_novos", "1");
      if (categoria) params.set("categoria", categoria);
      if (tema) params.set("tema", tema);
      if (avaliacaoMinima) params.set("avaliacao_min", avaliacaoMinima);
      const dados = await apiRequest(`/aluno/descobrir?${params.toString()}`, {}, token);
      setCursos(Array.isArray(dados) ? dados : []);
    } catch (error) {
      mostrarAlerta("Erro", error.message, "erro");
      setCursos([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregar();
  }, [ordem, apenasNovos, categoria, tema, avaliacaoMinima, token]);

                                                                                                                                                          
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
        <Text style={globalStyles.eyebrow}>Pesquise o catálogo e escolha um curso para conhecer seus módulos e aulas.</Text>
        <View style={globalStyles.divider} />
      </View>

      <View style={styles.filters}>
        <Text style={styles.filtersTitle}>Filtrar cursos</Text>
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
        <Text style={styles.filterLabel}>Ordenar por</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          <Pressable style={[styles.filterButton, ordem === "recentes" && styles.filterActive]} onPress={() => setOrdem("recentes")}>
            <Text style={[styles.filterText, ordem === "recentes" && styles.filterTextActive]}>Recentes</Text>
          </Pressable>
          <Pressable style={[styles.filterButton, ordem === "populares" && styles.filterActive]} onPress={() => setOrdem("populares")}>
            <Text style={[styles.filterText, ordem === "populares" && styles.filterTextActive]}>Populares</Text>
          </Pressable>
          <Pressable style={[styles.filterButton, ordem === "recomendados" && styles.filterActive]} onPress={() => setOrdem("recomendados")}>
            <Text style={[styles.filterText, ordem === "recomendados" && styles.filterTextActive]}>Recomendados</Text>
          </Pressable>
        </ScrollView>
        <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: apenasNovos }} style={[styles.filterButton, styles.newFilter, apenasNovos && styles.filterActive]} onPress={() => setApenasNovos(!apenasNovos)}><Text style={[styles.filterText, apenasNovos && styles.filterTextActive]}>{apenasNovos ? "✓ " : "□ "}Somente não inscritos</Text></Pressable>
                                                                                                                                                              
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
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {["", "1", "2", "3", "4", "5"].map((nota) => <Pressable key={nota || "todas"} style={[styles.filterButton, avaliacaoMinima === nota && styles.filterActive]} onPress={() => setAvaliacaoMinima(nota)}>
            <Text style={[styles.filterText, avaliacaoMinima === nota && styles.filterTextActive]}>{nota ? `${nota} ★` : "Todas"}</Text>
          </Pressable>)}
        </ScrollView>
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
        {!loading && cursos.length === 0 ? <Text style={globalStyles.message}>{ordem === "recomendados" ? "Ainda não há cursos relacionados às suas inscrições. Escolha outra ordenação." : "Nenhum curso público encontrado."}</Text> : null}
      </View>
    </ScrollView>
  );
}
/* Fim item 39 */
/* Fim item 29 */
/* Fim item 28 */

const styles = StyleSheet.create({
  header: { marginBottom: 18 },
  filters: { gap: 10, marginBottom: 18, padding: 14, backgroundColor: colors.softGray, borderWidth: 1, borderColor: colors.border, borderRadius: 12 },
  filtersTitle: { color: colors.darkGreen, fontSize: 18, fontWeight: "800" },
  newFilter: { alignSelf: "flex-start" },
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
  filterRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingRight: 8 },
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
