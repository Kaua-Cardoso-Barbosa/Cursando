import { KeyboardAvoidingView, Modal, Platform, Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import EditarPerfilScreen from '../screens/EditarPerfilScreen_39';
import { colors } from '../styles_39';
import FeedbackProvider from './FeedbackProvider_39';
export default function EditarPerfilModal({ aberto, perfil, onClose, onSave, salvando, titulo, permitirImagem = true, administrativo = false }) {
  return <Modal visible={aberto} transparent animationType="fade" onRequestClose={() => { if (!salvando) onClose(); }}>
    <SafeAreaView style={s.overlay}><KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.keyboard}>
      <View style={s.card}><FeedbackProvider><Pressable accessibilityLabel="Fechar edição do perfil" disabled={salvando} onPress={onClose} style={s.close}><Text style={{ fontSize: 28 }}>×</Text></Pressable>
        {aberto && <EditarPerfilScreen perfil={perfil} onCancel={onClose} onSave={onSave} salvando={salvando} titulo={titulo} permitirImagem={permitirImagem} administrativo={administrativo} />}
      </FeedbackProvider></View>
    </KeyboardAvoidingView></SafeAreaView>
  </Modal>;
}
const s = StyleSheet.create({ overlay: { flex: 1, backgroundColor: '#0008', justifyContent: 'center', alignItems: 'center', padding: 16 }, keyboard: { width: '100%', maxWidth: 620, height: '94%' }, card: { flex: 1, backgroundColor: colors.gray, borderRadius: 18, overflow: 'hidden', paddingTop: 22 }, close: { position: 'absolute', right: 12, top: 2, zIndex: 2, padding: 6 } });
