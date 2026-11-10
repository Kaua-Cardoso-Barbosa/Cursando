import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { colors, globalStyles } from '../styles_39';
export default function EstadoConsulta({ consulta }) {
  return <View style={[globalStyles.page, { alignItems: 'center', justifyContent: 'center', gap: 16 }]}>
    {consulta.carregando ? <><ActivityIndicator color={colors.darkGreen} /><Text>Carregando...</Text></> : <>
      <Text style={globalStyles.title}>Não foi possível carregar</Text><Text style={globalStyles.message}>{consulta.erro || 'Informações indisponíveis.'}</Text>
      <Pressable style={globalStyles.secondaryButton} onPress={consulta.atualizar}><Text style={globalStyles.secondaryText}>Tentar novamente</Text></Pressable>
    </>}
  </View>;
}
