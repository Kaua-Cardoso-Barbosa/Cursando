import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Field from '../Field_39';
import Select from '../Select_39';
import AppIcon from '../AppIcon_39';

export const dinheiro = valor => `R$ ${Number(valor || 0).toFixed(2).replace('.', ',')}`;
export const dataBR = valor => {
  if (!valor) return '—';
  const data = new Date(/^\d{4}-\d{2}-\d{2}$/.test(String(valor)) ? `${valor}T12:00:00` : valor);
  return Number.isNaN(data.getTime()) ? '—' : data.toLocaleDateString('pt-BR');
};
export function AdminCabecalho({ etiqueta = 'ADMINISTRAÇÃO', titulo, descricao }) {
  return <View style={a.cabecalho}><Text style={a.etiqueta}>{etiqueta}</Text><Text accessibilityRole="header" style={a.titulo}>{titulo}</Text>{!!descricao && <Text style={a.descricao}>{descricao}</Text>}</View>;
}
export function AdminPagina({ children, carregando = false, onRefresh, ...cabecalho }) {
  return <ScrollView style={a.fundo} contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled" refreshControl={onRefresh && <RefreshControl refreshing={!!carregando} onRefresh={onRefresh} />}>
    <View style={a.pagina}>{cabecalho.titulo && <AdminCabecalho {...cabecalho} />}{children}</View><AdminRodape />
  </ScrollView>;
}
export function AdminRodape() {
  return <View style={a.rodape}><View style={{ gap: 6 }}><Text style={a.rodapeTitulo}>Contato</Text>{['Birigui - SP', '(18)98131-3801', 'cursando@gmail.com'].map(t => <Text key={t} style={a.rodapeTexto}>{t}</Text>)}</View><View style={{ gap: 6 }}><Text style={a.rodapeTitulo}>Cursando</Text><Text style={a.rodapeTexto}>Aprendizado e conhecimento</Text></View></View>;
}
export function AdminSecao({ titulo, children, style }) {
  return <View style={[a.secao, style]}>{!!titulo && <Text accessibilityRole="header" style={a.secaoTitulo}>{titulo}</Text>}{children}</View>;
}
export function AdminBotao({ children, onPress, disabled, variante = 'primario', style, accessibilityLabel }) {
  const secundario = variante !== 'primario';
  return <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel} disabled={disabled} onPress={onPress} style={[a.botao, secundario && a.botaoSecundario, variante === 'perigo' && a.botaoPerigo, style, disabled && { opacity: .5 }]}><Text style={[a.botaoTexto, secundario && { color: '#244338' }, variante === 'perigo' && { color: '#923737' }]}>{children}</Text></Pressable>;
}
export function AdminCampo(props) { return <Field {...props} containerStyle={[{ marginBottom: 0 }, props.containerStyle]} labelStyle={a.label} style={[a.input, props.style]} />; }
export function AdminSelect(props) { return <Select {...props} containerStyle={{ marginBottom: 0 }} labelStyle={a.label} style={a.input} />; }
export function AdminMetricas({ itens }) {
  const { width } = useWindowDimensions();
  return <View style={a.grade}>{itens.map(({ titulo, valor, detalhe, icone = 'folder', children }) => <View key={titulo} style={[a.metrica, { width: width > 560 ? '48%' : '100%' }]}>
    <View style={a.metricaTopo}><Text style={a.metricaTitulo}>{titulo}</Text><View style={a.badge}><AppIcon name={icone} size={19} color="#087044" /></View></View>
    {!!detalhe && <Text style={a.metricaDetalhe}>{detalhe}</Text>}<Text style={a.metricaValor}>{valor ?? 0}</Text>{children}
  </View>)}</View>;
}
// As tabelas mantêm a rolagem horizontal da versão responsiva do site.
export function AdminTabela({ colunas, linhas, vazio = 'Nenhum resultado encontrado.' }) {
  return <ScrollView horizontal style={{ flexGrow: 0 }} showsHorizontalScrollIndicator>
    <View style={{ minWidth: colunas.reduce((n, c) => n + (c.largura || 150), 0) }}>
      <View style={[a.linhaTabela, a.tabelaCabecalho]}>{colunas.map(c => <Text key={c.titulo} style={[a.celula, a.label, { width: c.largura || 150 }]}>{c.titulo}</Text>)}</View>
      {!linhas.length && <Text style={[a.texto, { padding: 14 }]}>{vazio}</Text>}
      {linhas.map((linha, i) => <View key={linha.id ?? i} style={a.linhaTabela}>{colunas.map((c, j) => <View key={c.titulo} style={[a.celula, { width: c.largura || 150 }]}>{typeof linha.valores[j] === 'object' ? linha.valores[j] : <Text selectable style={a.texto}>{String(linha.valores[j] ?? '—')}</Text>}</View>)}</View>)}
    </View>
  </ScrollView>;
}
export const a = StyleSheet.create({
  fundo: { flex: 1, backgroundColor: '#f5f8f6' }, pagina: { paddingTop: 22, paddingHorizontal: 18, paddingBottom: 30, gap: 24 },
  cabecalho: { padding: 20, borderWidth: 1, borderColor: '#dfe9e3', borderRadius: 16, backgroundColor: '#fff', gap: 7 }, etiqueta: { color: '#087044', fontSize: 12, letterSpacing: .96, fontWeight: '700' }, titulo: { fontSize: 25.6, lineHeight: 31, color: '#173e2c', fontWeight: '600' }, descricao: { fontSize: 15.2, lineHeight: 23, color: '#607468' },
  secao: { padding: 20, borderWidth: 1, borderColor: '#dfe9e3', borderRadius: 18, backgroundColor: '#fff', gap: 16 }, secaoTitulo: { color: '#173e2c', fontSize: 19, fontWeight: '600', lineHeight: 25 }, texto: { color: '#233c2f', fontSize: 14, lineHeight: 21 }, apoio: { color: '#607468', fontSize: 13, lineHeight: 19 }, erro: { color: '#923737', padding: 14, backgroundColor: '#fff2f2', borderRadius: 10 },
  botao: { minHeight: 42, borderWidth: 1, borderColor: '#087044', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#087044' }, botaoTexto: { color: '#fff', fontSize: 14, lineHeight: 20, fontWeight: '600', textAlign: 'center' }, botaoSecundario: { backgroundColor: '#f4f8f6', borderColor: '#cbd9d0' }, botaoPerigo: { borderColor: '#b75151', backgroundColor: '#fff' },
  label: { color: '#354a3d', fontSize: 14, fontWeight: '600', marginBottom: 6 }, input: { minHeight: 44, borderWidth: 1, borderColor: '#cbd9d0', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, backgroundColor: '#fff', color: '#21372a', fontSize: 15 },
  grade: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 16 }, metrica: { minHeight: 148, paddingVertical: 22, paddingHorizontal: 23, borderWidth: 1, borderColor: '#dfe9e3', borderRadius: 18, backgroundColor: '#fff', shadowColor: '#0f3f28', shadowOpacity: .055, shadowRadius: 11, shadowOffset: { width: 0, height: 8 }, elevation: 1, gap: 10 }, metricaTopo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }, metricaTitulo: { flex: 1, fontSize: 16, lineHeight: 22, fontWeight: '600', color: '#244338' }, badge: { width: 42, height: 42, borderRadius: 13, backgroundColor: '#e5f5ec', alignItems: 'center', justifyContent: 'center' }, metricaDetalhe: { color: '#507363', fontSize: 13.12, lineHeight: 19 }, metricaValor: { color: '#123c2a', fontSize: 25, lineHeight: 30, fontWeight: '600' },
  linhaTabela: { flexDirection: 'row', borderBottomWidth: 1, borderColor: '#e1eae4' }, tabelaCabecalho: { backgroundColor: '#edf6f0' }, celula: { padding: 12, justifyContent: 'center' }, rodape: { backgroundColor: '#075132', paddingVertical: 24, paddingHorizontal: 18, gap: 18 }, rodapeTitulo: { color: '#fff', fontSize: 17, fontWeight: '700' }, rodapeTexto: { color: '#e0e0e0', fontSize: 13.6 },
  linha: { gap: 8, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#e1eae4' }, acoes: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, overlay: { flex: 1, backgroundColor: '#0008', justifyContent: 'center', padding: 16 }, modal: { maxHeight: '92%', backgroundColor: '#f5f8f6', borderRadius: 18, padding: 16 },
});
