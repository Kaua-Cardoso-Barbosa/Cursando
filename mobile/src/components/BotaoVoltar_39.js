import { Pressable, StyleSheet, Text } from 'react-native';
import AppIcon from './AppIcon_39';

export default function BotaoVoltar({ onPress, children = 'Voltar', disabled = false, emLinha = false }) {
  return <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} hitSlop={4}
    style={({ pressed }) => [s.botao, emLinha && { marginBottom: 0 }, pressed && s.pressionado, disabled && s.desabilitado]}>
    <AppIcon name="arrow-back" size={14} color="#087044" /><Text style={s.texto}>{children}</Text>
  </Pressable>;
}
const s = StyleSheet.create({
  botao: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 40, paddingVertical: 6, paddingHorizontal: 4, borderRadius: 6, marginBottom: 12 },
  texto: { color: '#087044', fontSize: 14, lineHeight: 20, fontWeight: '600', flexShrink: 1 },
  pressionado: { backgroundColor: '#eaf5ee' }, desabilitado: { opacity: .5 }
});
