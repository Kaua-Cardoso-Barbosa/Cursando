import { Image, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Svg, { Circle, Polygon, Rect } from 'react-native-svg';
import { fonteImagemCurso } from '../imagens_padrao_39';
import AppIcon from './AppIcon_39';

const NIVEIS = [
  { nome: 'Não iniciado', cor: '#9aa9a1', icone: 'book-open' },
  { nome: 'Iniciante', cor: '#ad754c', icone: 'seedling' },
  { nome: 'Intermediário', cor: '#6d8394', icone: 'layer-group' },
  { nome: 'Avançado', cor: '#16804e', icone: 'star' },
  { nome: 'Curso concluído', cor: '#bc8d20', icone: 'trophy' }
];

// Mesmos polígonos e medidas dos pseudo-elementos em ConquistaCurso.module.css.
const ROSETA = [[50,0],[61,8],[75,7],[81,20],[94,25],[92,40],[100,50],[92,61],[94,75],[81,81],[75,94],[61,92],[50,100],[39,92],[25,94],[19,81],[6,75],[8,61],[0,50],[8,40],[6,25],[19,20],[25,7],[39,8]]
  .map(([x, y]) => `${-11 + x * 1.42},${-11 + y * 1.42}`).join(' ');
const FITA = [[5,0],[95,0],[100,100],[72,82],[50,100],[28,82],[0,100]]
  .map(([x, y]) => `${26 + x * .68},${103 + y * .4}`).join(' ');

export function DecoracaoConquista({ nivel, progresso }) {
  const cor = NIVEIS[nivel].cor;
  const circunferencia = 2 * Math.PI * 57;
  return <Svg width={180} height={180} viewBox="-30 -30 180 180" style={s.decoracao} pointerEvents="none" accessible={false}>
    {nivel === 4 && <Polygon points={FITA} fill="#b48620" />}
    <Circle cx={60} cy={60} r={60} fill={nivel === 4 ? '#d2a642' : '#dce8df'} />
    {nivel !== 4 && progresso > 0 && <Circle cx={60} cy={60} r={57} fill="none" stroke={cor} strokeWidth={6}
      strokeDasharray={`${circunferencia * progresso / 100} ${circunferencia}`} rotation={-90} origin="60,60" />}
    {nivel === 0 && <Circle cx={60} cy={60} r={64} fill="none" stroke={cor} strokeWidth={2} strokeDasharray="6 4" opacity={.45} />}
    {nivel === 1 && <Circle cx={60} cy={60} r={64} fill="#fbf1e9" stroke={cor} strokeWidth={2} strokeDasharray="6 4" />}
    {nivel === 2 && <>
      <Circle cx={60} cy={60} r={65} fill="#eef3f6" />
      <Circle cx={60} cy={60} r={64 + 1 / 6} fill="none" stroke="#8196a6" strokeWidth={5 / 3} />
      <Circle cx={60} cy={60} r={60 + 5 / 6} fill="none" stroke="#8196a6" strokeWidth={5 / 3} />
    </>}
    {nivel === 3 && <Rect x={-3} y={-3} width={126} height={126} rx={21} fill="#e9f5ed" stroke={cor} strokeWidth={2} rotation={45} origin="60,60" />}
    {nivel === 4 && <Polygon points={ROSETA} fill="#e7c76c" />}
  </Svg>;
}

export default function ConquistaCurso({ curso, onOpen }) {
  const { width } = useWindowDimensions();
  const progresso = Math.max(0, Math.min(100, Number(curso.progresso) || 0));
  const todasAulas = curso.total_aulas != null && curso.aulas_concluidas != null
    ? Number(curso.total_aulas) > 0 && Number(curso.aulas_concluidas) >= Number(curso.total_aulas)
    : progresso === 100;
  const concluido = todasAulas && Boolean(curso.aprovado);
  const nivel = concluido ? 4 : progresso >= 67 ? 3 : progresso >= 34 ? 2 : progresso > 0 ? 1 : 0;
  const { nome, cor, icone } = NIVEIS[nivel];
  return <Pressable accessibilityRole={onOpen ? 'button' : undefined} disabled={!onOpen}
    onPress={() => onOpen?.(curso)} accessibilityLabel={`${curso.titulo}: ${nome}, ${progresso}% das aulas`}
    style={({ pressed }) => [s.item, { width: width <= 380 ? '100%' : '48%' }, pressed && s.pressionado]}>
    <View style={s.medalha}>
      <DecoracaoConquista nivel={nivel} progresso={progresso} />
      <Image source={fonteImagemCurso(curso.imagem)} resizeMode="cover" style={s.imagem} />
      <View style={[s.selo, { backgroundColor: cor }]}><AppIcon name={icone} size={16} color="#fff" /></View>
    </View>
    <Text style={s.nome} numberOfLines={2}>{curso.titulo}</Text>
    <Text style={s.estado}>{nome}</Text>
    <Text style={s.percentual}>{progresso}% das aulas concluídas</Text>
    {progresso === 100 && !concluido && <Text style={s.pendente}>{curso.aprovado ? 'Complete todas as aulas' : 'Aprovação na prova pendente'}</Text>}
  </Pressable>;
}

const s = StyleSheet.create({
  item: { alignItems: 'center', gap: 8, paddingVertical: 18, paddingHorizontal: 10, borderRadius: 12 },
  pressionado: { backgroundColor: '#f0f7f2' },
  medalha: { width: 120, height: 120, marginTop: 12, marginBottom: 18, position: 'relative', overflow: 'visible' },
  decoracao: { position: 'absolute', left: -30, top: -30 },
  imagem: { position: 'absolute', top: 6, left: 6, width: 108, height: 108, borderWidth: 4, borderColor: '#fff', borderRadius: 54 },
  selo: { position: 'absolute', top: 94, left: 44, width: 32, height: 32, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#fff', borderRadius: 16 },
  nome: { minHeight: 42, maxWidth: 230, color: '#173e2c', fontSize: 15, lineHeight: 21, fontWeight: '700', textAlign: 'center' },
  estado: { color: '#446452', fontSize: 12, lineHeight: 18, textAlign: 'center' },
  percentual: { color: '#6a7b70', fontSize: 12, lineHeight: 18, textAlign: 'center' },
  pendente: { color: '#7d693c', fontSize: 11, lineHeight: 16.5, textAlign: 'center' }
});
