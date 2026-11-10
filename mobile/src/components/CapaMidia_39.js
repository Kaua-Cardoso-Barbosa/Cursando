import { Image, StyleSheet, View } from 'react-native';

// A moldura define a proporção, independentemente do tamanho original da imagem.
export default function CapaMidia({ source, label, children, style }) {
  return <View style={[s.capa, style]}>
    <Image source={source} accessibilityLabel={label} resizeMode="cover" style={s.imagem} />
    {children}
  </View>;
}
const s = StyleSheet.create({
  capa: { width: '100%', aspectRatio: 16 / 9, flexShrink: 0, position: 'relative', overflow: 'hidden', backgroundColor: '#e8f1eb' },
  imagem: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' }
});
