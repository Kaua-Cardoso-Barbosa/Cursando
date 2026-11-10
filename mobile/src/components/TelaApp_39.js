import { Platform, SafeAreaView, StatusBar, View } from 'react-native';
import BottomNav from './BottomNav_19_23_25_28_39';
import { globalStyles } from '../styles_39';

export default function TelaApp({ children, mostrarMenu = true, ativo, tipoUsuario, onChange }) {
  // SafeAreaView já protege o notch no iOS; no Android a reserva é explícita.
  const admin = Number(tipoUsuario) === 0;
  const topoChat = (ativo === 'chat' || admin) && Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 0;
  return <SafeAreaView style={[globalStyles.app, topoChat > 0 && { paddingTop: topoChat }]}>
    <View style={{ flex: 1 }}>{children}</View>
    {mostrarMenu && <BottomNav active={ativo} tipoUsuario={tipoUsuario} onChange={onChange} />}
  </SafeAreaView>;
}
