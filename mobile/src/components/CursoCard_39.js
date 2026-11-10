import { Pressable, StyleSheet, Text, View } from 'react-native';
import CapaMidia from './CapaMidia_39';
import { fonteImagemCurso } from '../imagens_padrao_39';
import { colors } from '../styles_39';

export function corAvaliacao(valor) {
  const nota = Math.max(0, Math.min(5, Number(valor) || 0));
  return nota === 0 ? '#6b7280' : nota < 2 ? '#c0392b' : nota < 3 ? '#c66a16' : nota < 4 ? '#9a6b00' : nota < 5 ? '#299447' : '#087044';
}
export default function CursoCard({ curso, onOpen, acoes, style, progresso = false }) {
  return <View style={[s.card, style]}>
    <Pressable accessibilityRole="button" accessibilityLabel={`Abrir curso: ${curso.titulo}`} disabled={!onOpen} onPress={() => onOpen?.(curso)}>
      <CapaMidia source={fonteImagemCurso(curso.imagem)} label={curso.titulo} />
      <View style={s.content}>
        <Text style={s.title} numberOfLines={2}>{curso.titulo}</Text>
        {!!curso.descricao && <Text style={s.description} numberOfLines={2}>{curso.descricao}</Text>}
        {!!curso.professor && <Text style={s.description}>{curso.professor}</Text>}
        <View style={s.meta}>
          {!!curso.categoria && <Text style={s.category}>{curso.categoria}</Text>}
          {curso.avaliacao_media != null && <Text style={{ color: corAvaliacao(curso.avaliacao_media) }}>★ {Number(curso.avaliacao_media).toLocaleString('pt-BR')} / 5</Text>}
          {(curso.aulas_publicadas ?? curso.total_aulas) != null && <Text style={s.description}>{curso.aulas_publicadas ?? curso.total_aulas} aulas</Text>}
          {curso.total_inscritos != null && <Text style={s.description}>{curso.total_inscritos} inscritos</Text>}
          {!!curso.status_nome && <Text style={s.category}>{curso.status_nome}</Text>}
        </View>
        {progresso && <View style={{ gap: 6 }}><Text style={s.description}>{curso.progresso || 0}% concluído</Text><View style={s.track}><View style={[s.fill, { width: `${Math.max(0, Math.min(100, Number(curso.progresso) || 0))}%` }]} /></View></View>}
      </View>
    </Pressable>
    {!!acoes && <View style={s.actions}>{acoes}</View>}
  </View>;
}
const s = StyleSheet.create({
  card: { borderWidth: 1, borderColor: colors.border, borderRadius: 14, backgroundColor: colors.white, overflow: 'hidden' },
  image: { width: '100%', aspectRatio: 16 / 9, backgroundColor: colors.softGray },
  content: { padding: 16, gap: 10 }, title: { color: colors.ink, fontWeight: '700', fontSize: 17, lineHeight: 24 },
  description: { color: colors.textMuted, fontSize: 13, lineHeight: 20 }, meta: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, alignItems: 'center' },
  category: { color: colors.darkGreen, backgroundColor: colors.softGray, borderRadius: 6, padding: 5, fontSize: 12 },
  actions: { padding: 12, borderTopWidth: 1, borderColor: colors.border }, track: { height: 5, borderRadius: 3, backgroundColor: colors.softGray, overflow: 'hidden' }, fill: { height: '100%', backgroundColor: colors.green }
});
