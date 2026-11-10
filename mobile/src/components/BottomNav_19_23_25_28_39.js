import { useEffect, useState } from 'react';
import { Keyboard, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import AppIcon from './AppIcon_39';
import BrandLogo from './BrandLogo_39';
import { colors, systemNavigationInset } from '../styles_39';

const OPCOES = {
  0: [['home','Início','home-outline'],['users','Gerenciar usuários','people-outline'],['finance','Financeiro','wallet-outline'],['reports','Relatórios','bar-chart-outline'],['logs','Histórico de atividades','document-text-outline'],['profile','Perfil','person-circle-outline']],
  1: [['home','Início','home-outline'],['courses','Meus cursos','videocam-outline'],['finance','Financeiro','wallet-outline'],['chat','Chat','chatbubble-ellipses-outline'],['reports','Relatórios','bar-chart-outline'],['profile','Perfil','person-circle-outline']],
  2: [['home','Início','home-outline'],['courses','Meus cursos','videocam-outline'],['discover','Descobrir','search-outline'],['history','Provas','document-text-outline'],['chat','Chat','chatbubble-ellipses-outline'],['finance','Financeiro','wallet-outline'],['profile','Perfil','person-circle-outline']]
};
export default function BottomNav({ active, onChange, tipoUsuario = 1 }) {
  const [aberto, setAberto] = useState(false);
  const itens = OPCOES[Number(tipoUsuario)] || OPCOES[2];
  const principais = Number(tipoUsuario) === 0 ? itens.filter(([id]) => ['home','users','finance'].includes(id)) : itens.filter(([id]) => ['home','courses', Number(tipoUsuario) === 2 ? 'discover' : 'chat'].includes(id));
  const secundarioAtivo = !principais.some(([id]) => id === active);
  useEffect(() => { setAberto(false); }, [active]);
  function navegar(id) { setAberto(false); onChange(id); }
  return <>
    <View style={s.barra} accessibilityLabel="Navegação principal">
      {principais.map(([id, nome, icone]) => <Pressable key={id} accessibilityRole="tab" accessibilityState={{ selected: active === id }} style={[s.atalho, active === id && s.atalhoAtivo]} onPress={() => navegar(id)}>
        <View style={s.icone}><AppIcon name={icone} size={19} color={active === id ? colors.white : colors.darkGreen} /></View>
        <Text style={[s.rotulo, active === id && s.rotuloAtivo]} numberOfLines={1}>{nome}</Text>
      </Pressable>)}
      <Pressable accessibilityRole="button" accessibilityLabel="Abrir menu de navegação" accessibilityState={{ expanded: aberto }} style={[s.atalho, secundarioAtivo && s.atalhoAtivo]} onPress={() => { Keyboard.dismiss(); setAberto(true); }}>
        <View style={s.icone}><AppIcon name="bars" size={19} color={secundarioAtivo ? colors.white : colors.darkGreen} /></View><Text style={[s.rotulo, secundarioAtivo && s.rotuloAtivo]}>Menu</Text>
      </Pressable>
    </View>
    <Modal visible={aberto} transparent animationType="slide" onRequestClose={() => setAberto(false)}>
      <View style={s.fundo}><Pressable style={StyleSheet.absoluteFillObject} accessibilityLabel="Fechar menu" onPress={() => setAberto(false)} />
        <View style={s.menu} accessibilityViewIsModal>
          <View style={s.cabecalho}><BrandLogo compact pequeno /><Pressable accessibilityLabel="Fechar navegação" hitSlop={12} onPress={() => setAberto(false)}><AppIcon name="times" size={22} color="#fff" /></Pressable></View>
          <Text style={s.area}>{Number(tipoUsuario) === 0 ? 'ADMINISTRAÇÃO' : Number(tipoUsuario) === 1 ? 'ÁREA DO PROFESSOR' : 'ÁREA DO ALUNO'}</Text>
          <ScrollView contentContainerStyle={s.lista}>{itens.map(([id, nome, icone]) => <Pressable key={id} accessibilityRole="tab" accessibilityState={{ selected: active === id }} onPress={() => navegar(id)} style={[s.link, active === id && s.linkAtivo]}>
            <AppIcon name={icone} size={18} color="#fff" /><Text style={s.linkTexto}>{nome}</Text>{active === id && <AppIcon name="check" size={13} color="#fff" />}
          </Pressable>)}</ScrollView>
        </View>
      </View>
    </Modal>
  </>;
}
const s = StyleSheet.create({
  barra: { flexShrink: 0, width: '100%', minHeight: 70, flexDirection: 'row', paddingHorizontal: 8, paddingVertical: 6, gap: 6, borderTopWidth: 1, borderColor: colors.border, backgroundColor: '#fff' },
  atalho: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4, minHeight: 56, borderRadius: 10 }, atalhoAtivo: { backgroundColor: colors.darkGreen }, icone: { width: 40, height: 30, alignItems: 'center', justifyContent: 'center' },
  rotulo: { fontSize: 11, lineHeight: 15, color: colors.textMuted, fontWeight: '500' }, rotuloAtivo: { color: colors.white, fontWeight: '700' },
  fundo: { flex: 1, backgroundColor: '#0007', justifyContent: 'flex-end' }, menu: { backgroundColor: '#075132', maxHeight: '85%', borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingBottom: 22 + systemNavigationInset },
  cabecalho: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 22 }, area: { color: '#ffffffb3', fontSize: 11, fontWeight: '700', letterSpacing: 1, paddingHorizontal: 24, marginBottom: 12 },
  lista: { paddingHorizontal: 16, gap: 6 }, link: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, minHeight: 50, borderRadius: 10, borderWidth: 1, borderColor: 'transparent' }, linkAtivo: { backgroundColor: '#ffffff29', borderColor: '#ffffff25' }, linkTexto: { flex: 1, color: '#fff', fontSize: 15, fontWeight: '600' }
});
