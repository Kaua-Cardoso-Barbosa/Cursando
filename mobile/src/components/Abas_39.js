import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';

export default function Abas({ opcoes, valor, onChange, rotulo = 'Seções' }) {
  return <ScrollView horizontal showsHorizontalScrollIndicator={false} accessibilityLabel={rotulo}
    style={s.container} contentContainerStyle={s.lista}>
    {opcoes.map(([id, texto]) => <Pressable key={id} accessibilityRole="tab" accessibilityState={{ selected: valor === id }}
      onPress={() => onChange(id)} style={[s.aba, valor === id && s.ativa]}>
      <Text numberOfLines={1} style={[s.texto, valor === id && s.textoAtivo]}>{texto}</Text>
    </Pressable>)}
  </ScrollView>;
}
const s = StyleSheet.create({
  // ScrollViews horizontais não devem absorver o espaço vertical que sobra na página.
  container: { flexGrow: 0, flexShrink: 0, maxHeight: 56, marginBottom: 18 },
  lista: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingBottom: 10, paddingRight: 8 },
  aba: { flexGrow: 0, flexShrink: 0, alignSelf: 'center', justifyContent: 'center', minHeight: 42, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: '#d5e3da', borderRadius: 8, backgroundColor: '#fff' },
  ativa: { backgroundColor: '#087044', borderColor: '#087044' },
  texto: { color: '#087044', fontSize: 14, lineHeight: 20, fontWeight: '600' }, textoAtivo: { color: '#fff' }
});
