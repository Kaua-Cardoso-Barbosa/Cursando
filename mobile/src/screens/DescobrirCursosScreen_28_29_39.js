import CursoCard from '../components/CursoCard_39';
import Select from '../components/Select_39';
import { useEffect, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { apiRequest } from "../api/client_3_17";
import AppIcon from "../components/AppIcon_39";
import { useFeedback } from "../components/FeedbackProvider_39";
import { colors, globalStyles } from "../styles_39";


export default
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
  /* Sprint item 28 - Permitir filtro de cursos por tema, categoria e avaliação - Aplica os filtros de busca, tema, categoria e avaliação */
  const [avaliacaoMinima, setAvaliacaoMinima] = useState("");
  /* Fim item 28 */
  const [loading, setLoading] = useState(false);

  async function carregar(termo = busca) {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (termo.trim()) params.set("busca", termo.trim());
      params.set("ordem", ordem);
      /* Sprint item 29 - Criar recomendação inteligente de cursos com base nas buscas e compras recentes do aluno - Apresenta a ordenação de cursos recomendados pela API */
      if (ordem === "recomendados") params.set("recomendados", "1");
      /* Fim item 29 */
      if (apenasNovos) params.set("apenas_novos", "1");
      if (categoria) params.set("categoria", categoria);
      if (tema) params.set("tema", tema);
      /* Sprint item 28 - Permitir filtro de cursos por tema, categoria e avaliação - Aplica os filtros de busca, tema, categoria e avaliação */
      if (avaliacaoMinima) params.set("avaliacao_min", avaliacaoMinima);
      /* Fim item 28 */
      const dados = await apiRequest(`/aluno/descobrir?${params.toString()}`, {}, token);
      setCursos(Array.isArray(dados) ? dados : []);
    } catch (error) {
      mostrarAlerta("Erro", error.message, "erro");
      setCursos([]);
    } finally {
      setLoading(false);
    }
  }

  /* Sprint item 28 - Permitir filtro de cursos por tema, categoria e avaliação - Aplica os filtros de busca, tema, categoria e avaliação */
  useEffect(() => {
    carregar();
  }, [ordem, apenasNovos, categoria, tema, avaliacaoMinima, token]);
  /* Fim item 28 */


  /* Sprint item 28 - Permitir filtro de cursos por tema, categoria e avaliação - Aplica os filtros de busca, tema, categoria e avaliação */
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
  /* Fim item 28 */

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
        {/* Sprint item 29 - Criar recomendação inteligente de cursos com base nas buscas e compras recentes do aluno - Apresenta a ordenação de cursos recomendados pela API */}
        <Select titulo="Ordenar por" valor={ordem} onChange={setOrdem} opcoes={[["recentes", "Recentes"], ["populares", "Populares"], ["recomendados", "Recomendados"]]} />
        {/* Fim item 29 */}
        <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: apenasNovos }} style={[styles.filterButton, styles.newFilter, apenasNovos && styles.filterActive]} onPress={() => setApenasNovos(!apenasNovos)}><Text style={[styles.filterText, apenasNovos && styles.filterTextActive]}>{apenasNovos ? "✓ " : "□ "}Somente não inscritos</Text></Pressable>
                                                                                                                                                              
        <Select titulo="Categoria" valor={categoria} onChange={setCategoria} opcoes={[["", "Todas"], ...categorias.map((item) => [item.nome, item.nome])]} />
        <Select titulo="Tema" valor={tema} onChange={setTema} opcoes={[["", "Todos"], ...temas.map((item) => [item.nome, item.nome])]} />
        {/* Sprint item 28 - Permitir filtro de cursos por tema, categoria e avaliação - Aplica os filtros de busca, tema, categoria e avaliação */}
        <Select titulo="Avaliação mínima" valor={avaliacaoMinima} onChange={setAvaliacaoMinima} opcoes={[["", "Todas"], ...["1", "2", "3", "4", "5"].map((nota) => [nota, `${nota} ★ ou mais`])]} />
        {/* Fim item 28 */}
      </View>

      <View style={styles.list}>
        {cursos.map(curso => <CursoCard key={curso.id} curso={curso} onOpen={onOpen} />)}
        {!loading && cursos.length === 0 ? /* Sprint item 29 - Criar recomendação inteligente de cursos com base nas buscas e compras recentes do aluno - Apresenta a ordenação de cursos recomendados pela API */ <Text style={globalStyles.message}>{ordem === "recomendados" ? "Ainda não há cursos relacionados às suas inscrições. Escolha outra ordenação." : "Nenhum curso público encontrado."}</Text> /* Fim item 29 */ : null}
      </View>
    </ScrollView>
  );
}

/* Sprint item 39 - Desenvolver todas as telas do aplicativo - Define os estilos dos componentes nativos desta tela */
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
  searchInput: { flex: 1, color: colors.ink, fontSize: 16 },
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
  title: { color: colors.ink, fontSize: 21, lineHeight: 25, fontWeight: "700" },
  description: { color: colors.textMuted, fontSize: 14, lineHeight: 19 },
  meta: { color: colors.darkGreen, fontSize: 13, fontWeight: "700", marginTop: 4 }
});
/* Fim item 39 */
