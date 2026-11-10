import { useEffect, useState } from 'react';
import { BackHandler, Pressable, ScrollView, Text, View } from 'react-native';
import AppIcon from '../AppIcon_39';

export const paginasAdmin = [['home', 'Início'], ['users', 'Gerenciar usuários'], ['finance', 'Financeiro'], ['reports', 'Relatórios'], ['logs', 'Histórico de atividades'], ['profile', 'Perfil']];
export default function AdminNavegacao({ ativo, onChange }) {
  const [aberto, setAberto] = useState(false);
  useEffect(() => setAberto(false), [ativo]);
  useEffect(() => { if (!aberto) return; const evento = BackHandler.addEventListener('hardwareBackPress', () => { setAberto(false); return true; }); return () => evento.remove(); }, [aberto]);
  return <View style={{ paddingVertical: 10, paddingHorizontal: 12, backgroundColor: '#075132' }}>
    <Pressable accessibilityRole="button" accessibilityLabel={aberto ? 'Fechar menu da dashboard' : 'Abrir menu da dashboard'} accessibilityState={{ expanded: aberto }} onPress={() => setAberto(v => !v)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44, paddingVertical: 9, paddingHorizontal: 12, borderWidth: 1, borderColor: '#ffffff3d', borderRadius: 10, backgroundColor: '#ffffff1a' }}>
      <AppIcon name={aberto ? 'times' : 'bars'} size={17} color="#fff" /><Text numberOfLines={1} style={{ flex: 1, fontWeight: '700', color: '#fff', fontSize: 16 }}>{paginasAdmin.find(([id]) => id === ativo)?.[1] || 'Perfil'}</Text><Text style={{ color: '#ffffffc2', fontSize: 13.6 }}>Menu</Text>
    </Pressable>
    {aberto && <ScrollView style={{ maxHeight: 440, flexGrow: 0, marginTop: 8 }} contentContainerStyle={{ gap: 4 }}>{paginasAdmin.map(([id, nome]) => <Pressable accessibilityRole="tab" accessibilityState={{ selected: id === ativo }} key={id} onPress={() => { setAberto(false); onChange(id); }} style={{ minHeight: 44, paddingVertical: 10, paddingHorizontal: 12, borderWidth: 1, borderColor: id === ativo ? '#ffffff21' : 'transparent', borderRadius: 12, backgroundColor: id === ativo ? '#ffffff29' : 'transparent' }}><Text style={{ color: '#fff', fontSize: 15.2, fontWeight: id === ativo ? '700' : '500' }}>{nome}</Text></Pressable>)}</ScrollView>}
  </View>;
}
