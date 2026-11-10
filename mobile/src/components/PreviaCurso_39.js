import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import CapaMidia from './CapaMidia_39';
import { fonteImagemCurso } from '../imagens_padrao_39';
import { globalStyles as g } from '../styles_39';
export function PreviaCurso({ curso, onClose, onEntrar }) {
  return <Modal visible={!!curso} transparent animationType="fade" onRequestClose={onClose}><View style={{ flex: 1, justifyContent: 'center', padding: 20, backgroundColor: '#0008' }}><View style={{ backgroundColor: 'white', maxHeight: '90%', borderRadius: 16, overflow: 'hidden' }}><ScrollView>{curso && <><CapaMidia source={fonteImagemCurso(curso.imagem)} label={curso.titulo} /><View style={{ padding: 20, gap: 16 }}><Text style={g.title}>{curso.titulo}</Text><Text>{curso.descricao || 'Conheça este curso no catálogo da Cursando.'}</Text>{onEntrar && <Pressable style={g.primaryButton} onPress={onEntrar}><Text style={g.buttonText}>Entrar para conhecer o curso</Text></Pressable>}<Pressable style={g.secondaryButton} onPress={onClose}><Text style={g.secondaryText}>Fechar</Text></Pressable></View></>}</ScrollView></View></View></Modal>;
}
