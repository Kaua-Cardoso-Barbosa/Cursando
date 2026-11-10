import { Pressable, StyleSheet, Text, View } from 'react-native';
import CapaMidia from './CapaMidia_39';
import { fonteImagemAula } from '../imagens_padrao_39';
import { colors } from '../styles_39';
export function progressoAula(aula) {
  const duracao = Number(aula.duracao_segundos) || 0;
  return aula.assistida ? 100 : duracao > 0 ? Math.max(0, Math.min(100, (Number(aula.progresso_segundos) || 0) / duracao * 100)) : 0;
}
export default function AulaCard({ aula, onOpen, atual = false, compacto = false, numero, exibirStatus = false }) {
  const posicao = Math.max(0, Math.floor(Number(aula.progresso_segundos) || 0));
  const tempo = `${Math.floor(posicao / 60)}:${String(posicao % 60).padStart(2, '0')}`;
  return <Pressable accessibilityRole="button" accessibilityState={{ selected: atual, disabled: !onOpen }} disabled={!onOpen} onPress={() => onOpen?.(aula)} style={[s.card, compacto && { flexDirection: 'row', alignItems: 'center' }, atual && s.atual]}>
    <CapaMidia source={fonteImagemAula(aula.thumb)} label={aula.titulo} style={compacto ? { width: 112 } : undefined}>{aula.assistida && !compacto && <Text style={s.concluido}>✓ Concluída</Text>}
      <View style={s.track}><View style={{ height: '100%', width: `${progressoAula(aula)}%`, backgroundColor: colors.green }} /></View>
    </CapaMidia><View style={[{ padding: 14, gap: 8 }, compacto && { flex: 1, padding: 10 }]}>{numero != null && <Text style={s.tempo}>Aula {numero}</Text>}<Text numberOfLines={2} style={s.title}>{aula.titulo}</Text>{atual && <Text style={s.title}>Assistindo agora</Text>}{aula.assistida && compacto && <Text style={s.tempo}>✓ Concluída</Text>}{posicao > 0 && <Text style={s.tempo}>Assistido até {tempo}</Text>}{exibirStatus && <Text style={s.tempo}>{aula.status_nome || 'privada'}</Text>}</View>
  </Pressable>;
}
const s = StyleSheet.create({ card: { borderWidth: 1, borderColor: colors.border, borderRadius: 12, overflow: 'hidden', backgroundColor: colors.white }, atual: { borderColor: '#8dc6a1', backgroundColor: '#def2e4' }, image: { width: '100%', aspectRatio: 16 / 9 }, title: { color: colors.darkGreen, fontWeight: '700', lineHeight: 21 }, tempo: { color: colors.textMuted, fontSize: 12 }, track: { height: 4, width: '100%', position: 'absolute', bottom: 0, backgroundColor: '#dce8df' }, concluido: { position: 'absolute', top: 8, right: 8, color: 'white', backgroundColor: colors.darkGreen, padding: 6, borderRadius: 6, overflow: 'hidden', fontSize: 12 } });
