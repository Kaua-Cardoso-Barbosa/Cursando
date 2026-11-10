import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { resolverUrlMidia } from '../api/client_3_17';
import { corAvaliacao } from './CursoCard_39';
import { colors, globalStyles } from '../styles_39';

export default function AvaliacoesCurso({ itens = [], total = itens.length, media, pagina = 1, paginas = 1, onPagina, onOpenProfile }) {
  const notaMedia = media ?? (itens.length ? itens.reduce((s, a) => s + Number(a.nota), 0) / itens.length : 0);
  return <View style={{ gap: 14 }}>
    <Text style={globalStyles.title}>Avaliações do curso</Text>
    <Text style={{ color: corAvaliacao(notaMedia) }}>★ {Number(notaMedia).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}/5 · {total} avaliações</Text>
    {itens.map(a => {
      const nota = Math.round(Math.max(0, Math.min(5, Number(a.nota) || 0)));
      return <View key={a.id} style={s.card}>
        <View style={s.author}>
          {!!a.imagem_perfil && <Image source={{ uri: resolverUrlMidia(a.imagem_perfil) }} style={s.avatar} />}
          <Pressable disabled={!a.identificador || !onOpenProfile} accessibilityRole="link" accessibilityLabel={`Ver perfil de ${a.nome}`} onPress={() => onOpenProfile(a.identificador)}><Text style={s.name}>{a.nome || 'Aluno'}</Text></Pressable>
        </View>
        <Text accessibilityLabel={`${nota} de 5 estrelas`} style={{ color: corAvaliacao(nota) }}>{'★'.repeat(nota)}{'☆'.repeat(5 - nota)} {nota}/5</Text>
        {!!a.data && <Text style={s.date}>{new Date(a.data).toLocaleDateString('pt-BR')}</Text>}
        <Text style={s.comment}>{a.comentario || 'Sem comentário escrito.'}</Text>
      </View>;
    })}
    {!itens.length && <Text style={s.comment}>Este curso ainda não recebeu avaliações.</Text>}
    {paginas > 1 && <View style={s.pagination}>
      <Pressable disabled={pagina <= 1} style={[globalStyles.secondaryButton, pagina <= 1 && { opacity: .4 }]} onPress={() => onPagina(pagina - 1)}><Text style={globalStyles.secondaryText}>Anterior</Text></Pressable>
      <Text>{pagina} / {paginas}</Text>
      <Pressable disabled={pagina >= paginas} style={[globalStyles.secondaryButton, pagina >= paginas && { opacity: .4 }]} onPress={() => onPagina(pagina + 1)}><Text style={globalStyles.secondaryText}>Próxima</Text></Pressable>
    </View>}
  </View>;
}
const s = StyleSheet.create({ card: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 16, gap: 9 }, author: { flexDirection: 'row', alignItems: 'center', gap: 10 }, avatar: { width: 40, height: 40, borderRadius: 20 }, name: { color: colors.darkGreen, fontSize: 15, fontWeight: '700', textDecorationLine: 'underline' }, date: { color: colors.textMuted, fontSize: 12 }, comment: { color: colors.textMuted, fontSize: 14, lineHeight: 21 }, pagination: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, alignItems: 'center', justifyContent: 'center' } });
